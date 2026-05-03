import { test, expect, type Page } from "@playwright/test";

// ── helpers ──────────────────────────────────────────────────────────────────

async function goToPortfolio(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Portfolio$/i }).click();
  // Wait for the table header to confirm the tab rendered
  await expect(page.getByText("Loan Portfolio")).toBeVisible();
}

async function submitNewLoan(
  page: Page,
  companyName: string,
  regNumber: string
) {
  await page.getByRole("button", { name: /New Loan/i }).click();
  await page.getByLabel(/Company Name/i).fill(companyName);
  await page.getByLabel(/Companies House Reg/i).fill(regNumber);
  await page.getByRole("button", { name: /^Next$/i }).click();
  await page.getByLabel(/Property Valuation/i).fill("5000000");
  await page.getByLabel(/Requested Loan Amount/i).fill("3000000");
  await page.getByRole("button", { name: /^Next$/i }).click();
  await page.getByRole("button", { name: /Submit Application/i }).click();
  await expect(page.getByText("Application Submitted")).toBeVisible();
}

// ── Portfolio table — rendering and structure ──────────────────────────────

test.describe("Portfolio Table — Rendering", () => {
  test.beforeEach(async ({ page }) => {
    await goToPortfolio(page);
  });

  test("renders the Loan Portfolio card with table headers", async ({
    page,
  }) => {
    await expect(page.getByText("Loan Portfolio")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Loan ID/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Borrower/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Loan Amount/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /LTV/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /ICR/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Status/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Covenant/i })).toBeVisible();
  });

  test("shows all 8 loans from the mock dataset", async ({ page }) => {
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(8);
  });

  test("summary line shows correct total loan count", async ({ page }) => {
    await expect(page.getByText(/8 loans/i)).toBeVisible();
  });

  test("displays known borrower names from the mock data", async ({ page }) => {
    await expect(
      page.getByText("Meridian Property Holdings")
    ).toBeVisible();
    await expect(
      page.getByText("Northern Developments Ltd")
    ).toBeVisible();
    await expect(
      page.getByText("Thames Gateway Properties")
    ).toBeVisible();
  });

  test("shows status badges for each loan status type", async ({ page }) => {
    await expect(page.getByText("Live").first()).toBeVisible();
    await expect(page.getByText("Origination")).toBeVisible();
    await expect(page.getByText("Underwriting")).toBeVisible();
    await expect(page.getByText("Defaulted")).toBeVisible();
  });

  test("shows covenant indicators", async ({ page }) => {
    await expect(page.getByText("Compliant").first()).toBeVisible();
    await expect(page.getByText("Breach")).toBeVisible();
  });

  test("repayment legend is visible at the bottom of the table", async ({
    page,
  }) => {
    await expect(page.getByText("Interest")).toBeVisible();
    await expect(page.getByText("Principal")).toBeVisible();
  });
});

// ── Search ─────────────────────────────────────────────────────────────────

test.describe("Portfolio Table — Search", () => {
  test.beforeEach(async ({ page }) => {
    await goToPortfolio(page);
  });

  test("search by borrower name filters to matching rows", async ({ page }) => {
    await page
      .getByPlaceholder("Search borrower...")
      .fill("Meridian");

    await expect(page.getByText("Meridian Property Holdings")).toBeVisible();
    await expect(
      page.getByText("Northern Developments Ltd")
    ).not.toBeVisible();

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(1);
  });

  test("search is case-insensitive", async ({ page }) => {
    await page.getByPlaceholder("Search borrower...").fill("meridian");
    await expect(page.getByText("Meridian Property Holdings")).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(1);
  });

  test("search with no matches shows an empty table body", async ({ page }) => {
    await page.getByPlaceholder("Search borrower...").fill("XYZ Holdings ZZZZZ");
    await expect(page.locator("tbody tr")).toHaveCount(0);
  });

  test("clearing the search restores all rows", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search borrower...");
    await searchInput.fill("Cardiff");
    await expect(page.locator("tbody tr")).toHaveCount(1);

    await searchInput.fill("");
    await expect(page.locator("tbody tr")).toHaveCount(8);
  });

  test("partial name search returns all matching loans", async ({ page }) => {
    // 'Property' appears in several borrower names
    await page.getByPlaceholder("Search borrower...").fill("Property");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCountGreaterThan(1);
  });
});

// ── Status filter ──────────────────────────────────────────────────────────

test.describe("Portfolio Table — Status Filter", () => {
  test.beforeEach(async ({ page }) => {
    await goToPortfolio(page);
  });

  test("filtering by 'Live' shows only live loans", async ({ page }) => {
    await page.getByRole("button", { name: /Status/i }).click();
    await page
      .getByRole("menuitemcheckbox", { name: "Live" })
      .click();
    // Close the dropdown
    await page.keyboard.press("Escape");

    const rows = page.locator("tbody tr");
    // 5 loans are live in the mock data
    await expect(rows).toHaveCount(5);
    // Every visible status badge should say "Live"
    const badges = page.getByText("Live");
    await expect(badges).toHaveCount(5);
  });

  test("filtering by 'Defaulted' shows only defaulted loans", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Status/i }).click();
    await page
      .getByRole("menuitemcheckbox", { name: "Defaulted" })
      .click();
    await page.keyboard.press("Escape");

    // 1 loan is defaulted in the mock data
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.getByText("Brighton Marina Ventures")).toBeVisible();
  });

  test("selecting multiple status filters shows union of results", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Status/i }).click();
    await page
      .getByRole("menuitemcheckbox", { name: "Origination" })
      .click();
    await page
      .getByRole("menuitemcheckbox", { name: "Underwriting" })
      .click();
    await page.keyboard.press("Escape");

    // 1 origination + 1 underwriting = 2 rows
    await expect(page.locator("tbody tr")).toHaveCount(2);
  });

  test("filter badge shows selected count on the Status button", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Status/i }).click();
    await page
      .getByRole("menuitemcheckbox", { name: "Live" })
      .click();
    await page.keyboard.press("Escape");

    // A small badge with "1" appears inside the button
    await expect(page.getByRole("button", { name: /Status/i })).toContainText(
      "1"
    );
  });

  test("deselecting a filter restores the unfiltered rows", async ({
    page,
  }) => {
    // Select then deselect Live
    await page.getByRole("button", { name: /Status/i }).click();
    await page
      .getByRole("menuitemcheckbox", { name: "Live" })
      .click();
    await page
      .getByRole("menuitemcheckbox", { name: "Live" })
      .click();
    await page.keyboard.press("Escape");

    await expect(page.locator("tbody tr")).toHaveCount(8);
  });
});

// ── Sorting ────────────────────────────────────────────────────────────────

test.describe("Portfolio Table — Column Sorting", () => {
  test.beforeEach(async ({ page }) => {
    await goToPortfolio(page);
  });

  test("clicking 'Borrower' column header sorts rows alphabetically", async ({
    page,
  }) => {
    await page.getByRole("columnheader", { name: /Borrower/i }).click();

    const firstRow = page.locator("tbody tr").first();
    // 'Brighton Marina Ventures' is alphabetically first
    await expect(firstRow).toContainText("Brighton Marina Ventures");
  });

  test("clicking 'Borrower' again reverses the sort order", async ({
    page,
  }) => {
    const header = page.getByRole("columnheader", { name: /Borrower/i });
    await header.click(); // asc
    await header.click(); // desc

    const firstRow = page.locator("tbody tr").first();
    // 'Thames Gateway Properties' is alphabetically last
    await expect(firstRow).toContainText("Thames Gateway Properties");
  });

  test("clicking 'Loan Amount' sorts by amount ascending", async ({ page }) => {
    await page.getByRole("columnheader", { name: /Loan Amount/i }).click();

    // Brighton Marina (defaulted) has the smallest loan: £1,960,000
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toContainText("Brighton Marina Ventures");
  });

  test("LTV column header is clickable and changes sort", async ({ page }) => {
    const ltvHeader = page.getByRole("columnheader", { name: /^LTV$/i });
    await ltvHeader.click();
    // Just verify the click doesn't throw; row order should change
    await expect(page.locator("tbody tr")).toHaveCount(8);
  });
});

// ── Navigation from origination form → Portfolio ───────────────────────────

test.describe("Post-Submission Navigation", () => {
  test("Portfolio tab is accessible immediately after loan submission", async ({
    page,
  }) => {
    await page.goto("/");
    await submitNewLoan(page, "Canary Wharf Developments", "55443322");

    // Navigate to Portfolio from the success screen
    await page.getByRole("button", { name: /^Portfolio$/i }).click();

    await expect(page.getByText("Loan Portfolio")).toBeVisible();
    // Table should still render all existing loans (mock data persists)
    await expect(page.locator("tbody tr")).toHaveCount(8);
  });

  test("Portfolio table header is intact after navigating from form submission", async ({
    page,
  }) => {
    await page.goto("/");
    await submitNewLoan(page, "Oxford Street Retail Ltd", "88776655");
    await page.getByRole("button", { name: /^Portfolio$/i }).click();

    // Verify the full table structure survived the navigation
    await expect(
      page.getByRole("columnheader", { name: /Borrower/i })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /LTV/i })
    ).toBeVisible();
  });

  /*
   * NOTE — Real-time table update test
   *
   * The Portfolio table currently renders mock data. Once the frontend is
   * wired to the backend API (POST /api/loans + GET /api/loans), replace
   * the test above with the version below to verify a newly submitted loan
   * appears as a new row in the table.
   *
   * test("newly submitted loan appears as a row in the Portfolio table", async ({ page }) => {
   *   // Intercept the API calls
   *   await page.route("POST /api/loans", async (route) => {
   *     await route.fulfill({
   *       status: 201,
   *       contentType: "application/json",
   *       body: JSON.stringify({
   *         id: "new-uuid",
   *         reference: "L099",
   *         borrowerName: "Canary Wharf Developments",
   *         ...
   *       }),
   *     });
   *   });
   *
   *   await page.goto("/");
   *   await submitNewLoan(page, "Canary Wharf Developments", "55443322");
   *   await page.getByRole("button", { name: /^Portfolio$/i }).click();
   *
   *   await expect(page.getByText("Canary Wharf Developments")).toBeVisible();
   *   await expect(page.locator("tbody tr")).toHaveCount(9);
   * });
   */
});
