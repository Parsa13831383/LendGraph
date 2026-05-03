package com.lendgraph.dto

import com.lendgraph.entity.CovenantStatus
import com.lendgraph.entity.Loan
import com.lendgraph.entity.LoanStatus
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class LoanResponse(
    val id: UUID,
    val reference: String,
    val borrowerName: String,
    val companyRegNumber: String,
    val principalAmount: BigDecimal,
    val interestRate: BigDecimal,
    val valuation: BigDecimal,
    val existingDebt: BigDecimal,
    val propertyAddress: String?,
    val loanPurpose: String?,
    val netOperatingIncome: BigDecimal?,
    val startDate: LocalDate,
    val maturityDate: LocalDate,
    val status: LoanStatus,
    val covenantStatus: CovenantStatus,
    val ltv: BigDecimal,
    val icr: BigDecimal?,
    val totalInterestCharge: BigDecimal,
    val interestPaid: BigDecimal,
    val principalPaid: BigDecimal
) {
    companion object {
        fun from(loan: Loan): LoanResponse = LoanResponse(
            id = loan.id,
            reference = loan.reference,
            borrowerName = loan.borrower.companyName,
            companyRegNumber = loan.borrower.companyRegNumber,
            principalAmount = loan.principalAmount,
            interestRate = loan.interestRate,
            valuation = loan.valuation,
            existingDebt = loan.existingDebt,
            propertyAddress = loan.propertyAddress,
            loanPurpose = loan.loanPurpose,
            netOperatingIncome = loan.netOperatingIncome,
            startDate = loan.startDate,
            maturityDate = loan.maturityDate,
            status = loan.status,
            covenantStatus = loan.covenantStatus,
            ltv = loan.ltv.setScale(2, java.math.RoundingMode.HALF_UP),
            icr = loan.icr?.setScale(2, java.math.RoundingMode.HALF_UP),
            totalInterestCharge = loan.totalInterestCharge.setScale(2, java.math.RoundingMode.HALF_UP),
            interestPaid = loan.repayments
                .fold(BigDecimal.ZERO) { acc, r -> acc + r.interestAmount }
                .setScale(2, java.math.RoundingMode.HALF_UP),
            principalPaid = loan.repayments
                .fold(BigDecimal.ZERO) { acc, r -> acc + r.principalAmount }
                .setScale(2, java.math.RoundingMode.HALF_UP)
        )
    }
}

data class CreateLoanRequest(
    val reference: String,
    val borrowerId: UUID,
    val principalAmount: BigDecimal,
    val interestRate: BigDecimal,
    val valuation: BigDecimal,
    val existingDebt: BigDecimal = BigDecimal.ZERO,
    val propertyAddress: String? = null,
    val loanPurpose: String? = null,
    val netOperatingIncome: BigDecimal? = null,
    val startDate: LocalDate,
    val maturityDate: LocalDate
)

data class UpdateLoanStatusRequest(
    val status: LoanStatus,
    val covenantStatus: CovenantStatus? = null
)
