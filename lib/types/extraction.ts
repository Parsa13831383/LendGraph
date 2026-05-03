import { z } from "zod";

// ── Schema ────────────────────────────────────────────────────────────────────
// Every field is nullable so the LLM can return null for data it didn't find
// rather than inventing values.

export const ExtractionResultSchema = z.object({
  borrower_name: z.string().nullable(),
  company_reg_number: z
    .string()
    .regex(/^\d{8}$/)
    .nullable()
    .describe("UK Companies House number, exactly 8 digits"),

  // ── Financial terms ──────────────────────────────────────────────────────
  principal_amount: z
    .number()
    .positive()
    .nullable()
    .describe("Loan amount in GBP as a plain number"),
  property_valuation: z
    .number()
    .positive()
    .nullable()
    .describe("RICS/independent property valuation in GBP"),
  existing_debt: z
    .number()
    .min(0)
    .nullable()
    .describe("Senior debt ranking ahead of this loan in GBP"),

  // Rate stored as an annual percentage (e.g. 10.5 means 10.5% p.a.)
  interest_rate: z
    .number()
    .min(0)
    .max(100)
    .nullable()
    .describe("Annual interest rate as a percentage"),
  interest_rate_type: z
    .enum(["fixed", "floating"])
    .nullable()
    .describe("Whether the rate is fixed or floating (e.g. SONIA-linked)"),
  interest_rate_description: z
    .string()
    .nullable()
    .describe("Verbatim rate description from the document, e.g. 'SONIA + 4.5%'"),

  // ── Covenant thresholds ───────────────────────────────────────────────────
  ltv_covenant_threshold: z
    .number()
    .min(0)
    .max(100)
    .nullable()
    .describe("Maximum LTV covenant as a percentage (e.g. 70 means 70%)"),
  icr_covenant_threshold: z
    .number()
    .min(0)
    .nullable()
    .describe("Minimum Interest Coverage Ratio covenant (e.g. 1.25)"),

  // ── Dates ────────────────────────────────────────────────────────────────
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .describe("Loan start / drawdown date in ISO 8601 format"),
  maturity_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .describe("Loan maturity / repayment date in ISO 8601 format"),

  // ── Property details ──────────────────────────────────────────────────────
  property_address: z.string().nullable(),
  loan_purpose: z
    .string()
    .nullable()
    .describe(
      "Purpose of the loan, e.g. 'Acquisition', 'Refinance', 'Development'"
    ),

  // ── Quality indicators ────────────────────────────────────────────────────
  confidence: z
    .enum(["high", "medium", "low"])
    .describe(
      "Overall extraction confidence: high = all key terms clearly stated, " +
        "medium = some ambiguity, low = key terms missing or unclear"
    ),
  warnings: z
    .array(z.string())
    .describe(
      "Any ambiguities, approximations, or missing data the caller should know about"
    ),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

// Subset of ExtractionResult fields that map directly to form inputs
export interface ExtractionFormData {
  // Step 1 — Borrower
  companyName: string;
  companyRegNumber: string;

  // Step 2 — Security / financial
  propertyValuation: string;   // stored as numeric string for the form input
  existingDebt: string;
  requestedLoanAmount: string;
  propertyAddress: string;
  loanPurpose: string;

  // Extracted-only (shown in step 3, sent to backend)
  interestRate: string;
  interestRateDescription: string | null;
  startDate: string;
  maturityDate: string;
  ltvCovenantThreshold: string;
  icrCovenantThreshold: string;
}

/** Maps a raw ExtractionResult onto the form's data shape. */
export function toFormData(result: ExtractionResult): Partial<ExtractionFormData> {
  return {
    companyName: result.borrower_name ?? undefined,
    companyRegNumber: result.company_reg_number ?? undefined,
    propertyValuation: result.property_valuation?.toString() ?? undefined,
    existingDebt: result.existing_debt?.toString() ?? undefined,
    requestedLoanAmount: result.principal_amount?.toString() ?? undefined,
    propertyAddress: result.property_address ?? undefined,
    loanPurpose: result.loan_purpose ?? undefined,
    interestRate: result.interest_rate?.toString() ?? undefined,
    interestRateDescription: result.interest_rate_description ?? null,
    startDate: result.start_date ?? undefined,
    maturityDate: result.maturity_date ?? undefined,
    ltvCovenantThreshold: result.ltv_covenant_threshold?.toString() ?? undefined,
    icrCovenantThreshold: result.icr_covenant_threshold?.toString() ?? undefined,
  };
}
