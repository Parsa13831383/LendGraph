package com.lendgraph.service

import com.lendgraph.dto.CreateLoanFromExtractionRequest
import com.lendgraph.dto.LoanApplicationResponse
import com.lendgraph.entity.Borrower
import com.lendgraph.entity.Loan
import com.lendgraph.entity.LoanStatus
import com.lendgraph.repository.BorrowerRepository
import com.lendgraph.repository.LoanRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Service
class LoanApplicationService(
    private val borrowerRepository: BorrowerRepository,
    private val loanRepository: LoanRepository
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * Creates a loan application from extraction data provided by the
     * Covenant Assistant.
     *
     * Borrower upsert strategy:
     *   - If a Borrower with the given company_reg_number already exists,
     *     reuse it (updating the name if it has changed).
     *   - Otherwise create a new Borrower record.
     *
     * The Loan is always created fresh in ORIGINATION status.
     */
    @Transactional
    fun createFromExtraction(request: CreateLoanFromExtractionRequest): LoanApplicationResponse {
        // ── 1. Upsert borrower ────────────────────────────────────────────────
        val borrower = borrowerRepository
            .findByCompanyRegNumber(request.companyRegNumber)
            ?.let { existing ->
                // Update name in case it was corrected in the document
                if (existing.companyName != request.companyName) {
                    borrowerRepository.save(existing.copy(companyName = request.companyName))
                } else existing
            }
            ?: borrowerRepository.save(
                Borrower(
                    companyName = request.companyName,
                    companyRegNumber = request.companyRegNumber,
                    contactName = request.contactName,
                    contactEmail = request.contactEmail
                )
            )

        log.info(
            "Borrower upsert: id={} name=\"{}\" reg={}",
            borrower.id, borrower.companyName, borrower.companyRegNumber
        )

        // ── 2. Derive a unique reference ──────────────────────────────────────
        val reference = generateReference()

        // ── 3. Resolve maturity date — use extraction result or default 12 months ──
        val maturityDate = request.maturityDate
            ?: request.startDate.plusMonths(12)

        // ── 4. Create loan ────────────────────────────────────────────────────
        val loan = loanRepository.save(
            Loan(
                reference = reference,
                borrower = borrower,
                principalAmount = request.principalAmount,
                interestRate = request.interestRate,
                valuation = request.valuation,
                existingDebt = request.existingDebt,
                propertyAddress = request.propertyAddress,
                loanPurpose = request.loanPurpose,
                netOperatingIncome = request.netOperatingIncome,
                startDate = request.startDate,
                maturityDate = maturityDate,
                status = LoanStatus.ORIGINATION
            )
        )

        log.info(
            "Loan created from extraction: ref={} principal={} borrower={}",
            loan.reference, loan.principalAmount, borrower.companyName
        )

        // ── 5. Log covenant thresholds if provided ────────────────────────────
        // These will be stored in a dedicated covenant_thresholds table in a
        // future sprint. For now we log them so they're not silently discarded.
        if (request.ltvCovenantThreshold != null || request.icrCovenantThreshold != null) {
            log.info(
                "Covenant thresholds for {}: LTV max={}% ICR min={}x",
                reference,
                request.ltvCovenantThreshold,
                request.icrCovenantThreshold
            )
        }

        return LoanApplicationResponse(
            loanId = loan.id,
            loanReference = loan.reference,
            borrowerId = borrower.id,
            borrowerName = borrower.companyName,
            message = "Loan application created in ORIGINATION status."
        )
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private val referenceFormatter = DateTimeFormatter.ofPattern("yyyyMM")

    private fun generateReference(): String {
        val prefix = "BL-${LocalDate.now().format(referenceFormatter)}-"
        // Find the highest existing reference with this prefix and increment
        val existing = loanRepository
            .findAll()
            .map { it.reference }
            .filter { it.startsWith(prefix) }
            .mapNotNull { it.removePrefix(prefix).toIntOrNull() }
            .maxOrNull() ?: 0
        return "$prefix${"%04d".format(existing + 1)}"
    }
}
