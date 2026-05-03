import { test, expect, type Page } from "@playwright/test";

// ── helpers ──────────────────────────────────────────────────────────────────

async function goToNewLoan(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /New Loan/i }).click();
  await expect(page.getByText("Bridge Loan Application")).toBeVisible();
}

async function fillStep1(
  page: Page,
  opts: { companyName: string; regNumber: string } = {
    companyName: "Thames Valley Properties Ltd",
    regNumber: "99001122",
  }
) {
  await page.getByLabel(/Company Name/i).fill(opts.companyName);
  await page.getByLabel(/Companies House Reg/i).fill(opts.regNumber);
}

async function fillStep2(
  page: Page,
  opts: {
    valuation?: string;
    loanAmount?: string;
    existingDebt?: string;
    noi?: string;
  } = {}
) {
  const {
    valuation = "5000000",
    loanAmount = "3000000",
    existingDebt,
    noi = "600000",
  } = opts;

  await page.getByLabel(/Property Valuation/i).fill(valuation);
  await page.getByLabel(/Requested Loan Amount/i).fill(loanAmount);
  if (existingDebt !== undefined) {
    await page.getByLabel(/Existing Debt/i).fill(existingDebt);
  }
  await page.getByLabel(/Net Operating Income/i).fill(noi);
}

// ── tests ─────────────────────────────────────────────────────────────────────

test.describe("Loan Origination Form", () => {
  test.beforeEach(async ({ page }) => {
    await goToNewLoan(page);
  });

  // ── Step navigation ────────────────────────────────────────────────────────

  test("renders Step 1 by default with borrower fields", async ({ page }) => {
    await expect(page.getByText("Borrower Information")).toBeVisible();
    await expect(page.getByLabel(/Company Name/i)).toBeVisible();
    await expect(page.getByLabel(/Companies House Reg/i)).toBeVisible();
    await expect(page.getByLabel(/Contact Name/i)).toBeVisible();
    await expect(page.getByLabel(/Contact Email/i)).toBeVisible();
  });

  test("Next button is disabled until required Step 1 fields are filled", async ({
    page,
  }) => {
    const nextButton = page.getByRole("button", { name: /^Next$/i });
    await expect(nextButton).toBeDisabled();

    // Filling only company name is not enough
    await page.getByLabel(/Company Name/i).fill("Thames Valley Ltd");
    await expect(nextButton).toBeDisabled();

    // Both required fields filled → enabled
    await page.getByLabel(/Companies House Reg/i).fill("99001122");
    await expect(nextButton).toBeEnabled();
  });

  test("advances to Step 2 — Security Details — after filling Step 1", async ({
    page,
  }) => {
    await fillStep1(page);
    await page.getByRole("button", { name: /^Next$/i }).click();

    await expect(page.getByText("Security Details")).toBeVisible();
    await expect(page.getByLabel(/Property Valuation/i)).toBeVisible();
    await expect(page.getByLabel(/Requested Loan Amount/i)).toBeVisible();
  });

  test("Next button is disabled until required Step 2 fields are filled", async ({
    page,
  }) => {
    await fillStep1(page);
    await page.getByRole("button", { name: /^Next$/i }).click();

    const nextButton = page.getByRole("button", { name: /^Next$/i });
    await expect(nextButton).toBeDisabled();

    await page.getByLabel(/Property Valuation/i).fill("5000000");
    await expect(nextButton).toBeDisabled();

    await page.getByLabel(/Requested Loan Amount/i).fill("3000000");
    await expect(nextButton).toBeEnabled();
  });

  test("Back button returns to Step 1 from Step 2", async ({ page }) => {
    await fillStep1(page);
    await page.getByRole("button", { name: /^Next$/i }).click();
    await expect(page.getByText("Security Details")).toBeVisible();

    await page.getByRole("button", { name: /^Back$/i }).click();
    await expect(page.getByText("Borrower Information")).toBeVisible();
  });

  // ── Step 3 — metrics calculations ─────────────────────────────────────────

  test("Step 3 displays correctly calculated LTV", async ({ page }) => {
    await fillStep1(page);
    await page.getByRole("button", { name: /^Next$/i }).click();

    // valuation = £5,000,000 | loan = £3,000,000 | existingDebt = 0
    // LTV = 3,000,000 / 5,000,000 * 100 = 60.0%
    await fillStep2(page, { valuation: "5000000", loanAmount: "3000000" });
    await page.getByRole("button", { name: /^Next$/i }).click();

    await expect(page.getByText("Auto-Calculated Metrics")).toBeVisible();
    await expect(page.getByText("60.0%")).toBeVisible();
    await expect(page.getByText(/Within acceptable range/i)).toBeVisible();
  });

  test("Step 3 shows LTV warning for a high-LTV loan", async ({ page }) => {
    await fillStep1(page);
    await page.getByRole("button", { name: /^Next$/i }).click();

    // LTV = 3,800,000 / 4,000,000 * 100 = 95.0% → above 65% threshold
    await fillStep2(page, { valuation: "4000000", loanAmount: "3800000" });
    await page.getByRole("button", { name: /^Next$/i }).click();

    await expect(page.getByText("95.0%")).toBeVisible();
    await expect(page.getByText(/Above typical threshold/i)).toBeVisible();
  });

  test("Step 3 displays correctly calculated ICR", async ({ page }) => {
    await fillStep1(page);
    await page.getByRole("button", { name: /^Next$/i }).click();

    // loan = £3,000,000; rate = 10% (hardcoded); NOI = £600,000
    // annualInterest = 300,000; ICR = 600,000 / 300,000 = 2.00
    await fillStep2(page, {
      valuation: "5000000",
      loanAmount: "3000000",
      noi: "600000",
    });
    await page.getByRole("button", { name: /^Next$/i }).click();

    await expect(page.getByText("2.00x")).toBeVisible();
    await expect(page.getByText(/Strong coverage/i)).toBeVisible();
  });

  test("Step 3 flags weak ICR when NOI is insufficient", async ({ page }) => {
    await fillStep1(page);
    await page.getByRole("button", { name: /^Next$/i }).click();

    // loan = £3,000,000; NOI = £100,000
    // ICR = 100,000 / 300,000 = 0.33 → below minimum
    await fillStep2(page, {
      valuation: "5000000",
      loanAmount: "3000000",
      noi: "100000",
    });
    await page.getByRole("button", { name: /^Next$/i }).click();

    await expect(page.getByText("0.33x")).toBeVisible();
    await expect(page.getByText(/Below typical minimum/i)).toBeVisible();
  });

  test("Step 3 Application Summary reflects the entered borrower name", async ({
    page,
  }) => {
    await fillStep1(page, {
      companyName: "Thames Valley Properties Ltd",
      regNumber: "99001122",
    });
    await page.getByRole("button", { name: /^Next$/i }).click();
    await fillStep2(page);
    await page.getByRole("button", { name: /^Next$/i }).click();

    await expect(page.getByText("Thames Valley Properties Ltd")).toBeVisible();
  });

  // ── Submission ─────────────────────────────────────────────────────────────

  test("successful submission shows confirmation with a reference number", async ({
    page,
  }) => {
    await fillStep1(page);
    await page.getByRole("button", { name: /^Next$/i }).click();
    await fillStep2(page);
    await page.getByRole("button", { name: /^Next$/i }).click();

    await page.getByRole("button", { name: /Submit Application/i }).click();

    await expect(page.getByText("Application Submitted")).toBeVisible();
    // Reference is formatted as BL-XXXXXXXX
    await expect(page.getByText(/BL-\d{8}/)).toBeVisible();
    await expect(
      page.getByText(/submitted for underwriting review/i)
    ).toBeVisible();
  });

  test("success screen names the borrower company in the confirmation text", async ({
    page,
  }) => {
    await fillStep1(page, {
      companyName: "Shard Capital Properties",
      regNumber: "11223344",
    });
    await page.getByRole("button", { name: /^Next$/i }).click();
    await fillStep2(page);
    await page.getByRole("button", { name: /^Next$/i }).click();
    await page.getByRole("button", { name: /Submit Application/i }).click();

    await expect(
      page.getByText(/Shard Capital Properties/i)
    ).toBeVisible();
  });

  test("'Submit Another Application' resets the form to Step 1", async ({
    page,
  }) => {
    await fillStep1(page);
    await page.getByRole("button", { name: /^Next$/i }).click();
    await fillStep2(page);
    await page.getByRole("button", { name: /^Next$/i }).click();
    await page.getByRole("button", { name: /Submit Application/i }).click();
    await expect(page.getByText("Application Submitted")).toBeVisible();

    await page.getByRole("button", { name: /Submit Another Application/i }).click();

    await expect(page.getByText("Borrower Information")).toBeVisible();
    await expect(page.getByLabel(/Company Name/i)).toHaveValue("");
  });

  // ── Optional fields do not block submission ────────────────────────────────

  test("form submits successfully without optional fields", async ({ page }) => {
    await fillStep1(page);
    await page.getByRole("button", { name: /^Next$/i }).click();

    // Only fill required fields; leave address, NOI, and purpose blank
    await page.getByLabel(/Property Valuation/i).fill("4000000");
    await page.getByLabel(/Requested Loan Amount/i).fill("2000000");
    await page.getByRole("button", { name: /^Next$/i }).click();

    await page.getByRole("button", { name: /Submit Application/i }).click();
    await expect(page.getByText("Application Submitted")).toBeVisible();
  });
});
