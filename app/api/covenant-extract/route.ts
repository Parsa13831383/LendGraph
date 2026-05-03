import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { ExtractionResultSchema } from "@/lib/types/extraction";

// Force Node.js runtime — pdf-parse uses the `fs` module
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_TEXT_CHARS = 24_000; // ~6 k tokens — enough to cover most term sheets

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── Claude tool definition ────────────────────────────────────────────────────
// Using tool_use forces a structured JSON response and eliminates the need to
// parse free-form text. The schema mirrors ExtractionResultSchema exactly.

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "extract_loan_terms",
  description:
    "Extract structured loan terms from a UK bridge lending document. " +
    "Return null for any field not clearly stated in the document.",
  input_schema: {
    type: "object" as const,
    properties: {
      borrower_name: { type: "string", description: "Full legal name of the borrowing entity" },
      company_reg_number: {
        type: "string",
        description: "UK Companies House registration number (8 digits, zero-padded)",
      },
      principal_amount: {
        type: "number",
        description: "Loan facility amount in GBP (plain number, no currency symbols)",
      },
      property_valuation: {
        type: "number",
        description: "RICS / independent market valuation of the security property in GBP",
      },
      existing_debt: {
        type: "number",
        description: "Senior debt ranking ahead of this loan in GBP (0 if none)",
      },
      interest_rate: {
        type: "number",
        description:
          "Annual interest rate as a percentage. For floating rates, use the current " +
          "all-in rate if stated. If only the margin is stated, approximate using " +
          "SONIA ≈ 5.20% and note the approximation in warnings.",
      },
      interest_rate_type: {
        type: "string",
        enum: ["fixed", "floating"],
        description: "Whether the rate is fixed or floating",
      },
      interest_rate_description: {
        type: "string",
        description: "Verbatim rate description from the document, e.g. 'SONIA + 4.50% per annum'",
      },
      ltv_covenant_threshold: {
        type: "number",
        description: "Maximum Loan-to-Value covenant as a percentage (e.g. 70 for 70%)",
      },
      icr_covenant_threshold: {
        type: "number",
        description: "Minimum Interest Coverage Ratio covenant (e.g. 1.25)",
      },
      start_date: {
        type: "string",
        description: "Loan start or first drawdown date in ISO 8601 format (YYYY-MM-DD)",
      },
      maturity_date: {
        type: "string",
        description: "Loan maturity or final repayment date in ISO 8601 format (YYYY-MM-DD)",
      },
      property_address: {
        type: "string",
        description: "Full address of the security property",
      },
      loan_purpose: {
        type: "string",
        description: "Purpose of the loan, e.g. 'Acquisition', 'Refinance', 'Development'",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description:
          "high = all key financial terms clearly stated; " +
          "medium = some terms are implied or approximated; " +
          "low = document is unclear, incomplete, or not a loan agreement",
      },
      warnings: {
        type: "array",
        items: { type: "string" },
        description:
          "List of any approximations, ambiguities, or important caveats the caller should know about",
      },
    },
    required: ["confidence", "warnings"],
  },
};

const SYSTEM_PROMPT = `You are a specialist in UK commercial real estate bridge lending documentation.
Your task is to extract structured financial terms from loan facility agreements, term sheets, and credit committee papers.

Extraction rules:
1. Only extract data that is explicitly stated in the document — never invent or infer values not present.
2. Return null (omit the field) for any field not clearly found in the document.
3. Normalise all dates to ISO 8601 (YYYY-MM-DD). Convert formats like "15 September 2025" or "15/09/25" accordingly.
4. Express all GBP amounts as plain numbers without symbols, commas, or abbreviations (e.g. £4,250,000 → 4250000).
5. Express rates and percentages as numbers between 0 and 100 (e.g. 70% → 70, not 0.7).
6. For floating interest rates (SONIA, SOFR, LIBOR): use the all-in rate if stated; otherwise calculate as margin + SONIA (≈5.20%) and add a warning.
7. The LTV covenant is the *maximum* allowed LTV — look for phrases like "shall not exceed", "maximum LTV of".
8. The ICR/DSCR covenant is the *minimum* allowed ratio.
9. Set confidence to "low" if the document does not appear to be a loan agreement or term sheet.`;

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported." },
        { status: 415 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 10 MB size limit." },
        { status: 413 }
      );
    }

    // ── 1. Extract text from PDF ──────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Import pdf-parse at runtime (not build time) so Next.js doesn't attempt
    // to bundle it. The package is listed in serverExternalPackages so this
    // dynamic import is safe on the server.
    const { default: pdfParse } = await import("pdf-parse");

    let pdfData: { text: string; numpages: number };
    try {
      pdfData = await pdfParse(buffer);
    } catch {
      return NextResponse.json(
        {
          error:
            "Could not read the PDF. The file may be encrypted, corrupted, or " +
            "contain only scanned images (no text layer).",
        },
        { status: 422 }
      );
    }

    const rawText = pdfData.text.trim();
    if (!rawText) {
      return NextResponse.json(
        {
          error:
            "No text could be extracted. The PDF may be a scanned image. " +
            "Please upload a text-layer PDF.",
        },
        { status: 422 }
      );
    }

    // Truncate to keep the Claude request within a sensible token budget.
    // Key financial terms appear near the top of most term sheets.
    const documentText =
      rawText.length > MAX_TEXT_CHARS
        ? rawText.slice(0, MAX_TEXT_CHARS) +
          `\n\n[Document truncated at ${MAX_TEXT_CHARS} characters — ${pdfData.numpages} pages total]`
        : rawText;

    // ── 2. Call Claude with tool_use for structured extraction ────────────────
    // Use the prompt-caching beta so the system prompt is cached across
    // requests — the system prompt is identical for every PDF upload.
    const message = await anthropic.beta.promptCaching.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [EXTRACTION_TOOL],
      // Force use of our extraction tool so we always get structured JSON
      tool_choice: { type: "tool", name: "extract_loan_terms" },
      messages: [
        {
          role: "user",
          content:
            `Extract the loan terms from this document:\n\n` +
            `<document>\n${documentText}\n</document>`,
        },
      ],
    });

    // ── 3. Pull the tool input out of the response ────────────────────────────
    const toolUseBlock = message.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === "tool_use"
    ) as Anthropic.ToolUseBlock | undefined;

    if (!toolUseBlock) {
      return NextResponse.json(
        { error: "The AI did not return structured data. Please try again." },
        { status: 502 }
      );
    }

    // ── 4. Validate with Zod before trusting the LLM output ──────────────────
    const parsed = ExtractionResultSchema.safeParse(toolUseBlock.input);
    if (!parsed.success) {
      console.error("Zod validation failed:", parsed.error.flatten());
      return NextResponse.json(
        {
          error: "The AI returned data in an unexpected format.",
          detail: parsed.error.flatten(),
        },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed.data, { status: 200 });
  } catch (err) {
    // Surface Anthropic API errors clearly
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error:", err.status, err.message);
      return NextResponse.json(
        { error: `AI service error (${err.status}): ${err.message}` },
        { status: 502 }
      );
    }

    console.error("Unexpected error in /api/covenant-extract:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
