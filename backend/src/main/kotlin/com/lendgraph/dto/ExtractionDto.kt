package com.lendgraph.dto

import java.math.BigDecimal
import java.time.LocalDate

/**
 * Payload sent by the frontend after the Covenant Assistant extracts
 * structured terms from a PDF loan document.
 *
 * The service layer performs a borrower upsert (find-or-create by
 * company_reg_number) then creates a Loan in ORIGINATION status.
 */
data class CreateLoanFromExtractionRequest(

    // ── Borrower ──────────────────────────────────────────────────────────────
    val companyName: String,
    val companyRegNumber: String,
    val contactName: String? = null,
    val contactEmail: String? = null,

    // ── Core loan terms ───────────────────────────────────────────────────────
    val principalAmount: BigDecimal,
    val valuation: BigDecimal,
    val existingDebt: BigDecimal = BigDecimal.ZERO,
    val interestRate: BigDecimal = BigDecimal("10.0"),

    // ── Lifecycle dates ───────────────────────────────────────────────────────
    val startDate: LocalDate,
    val maturityDate: LocalDate?,   // null if not found in document

    // ── Optional metadata ─────────────────────────────────────────────────────
    val propertyAddress: String? = null,
    val loanPurpose: String? = null,
    val netOperatingIncome: BigDecimal? = null,

    // ── Covenant thresholds (stored for monitoring, not on the Loan entity) ───
    val ltvCovenantThreshold: BigDecimal? = null,
    val icrCovenantThreshold: BigDecimal? = null
)

data class LoanApplicationResponse(
    val loanId: java.util.UUID,
    val loanReference: String,
    val borrowerId: java.util.UUID,
    val borrowerName: String,
    val message: String
)
