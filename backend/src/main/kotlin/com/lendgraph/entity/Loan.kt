package com.lendgraph.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

enum class LoanStatus { ORIGINATION, UNDERWRITING, LIVE, DEFAULTED }
enum class CovenantStatus { COMPLIANT, BREACH }

@Entity
@Table(name = "loans")
data class Loan(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    /** Human-readable reference, e.g. "L001" */
    @Column(nullable = false, unique = true, length = 20)
    val reference: String,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "borrower_id", nullable = false)
    val borrower: Borrower,

    /** Net loan amount disbursed to the borrower */
    @Column(nullable = false, precision = 19, scale = 2)
    val principalAmount: BigDecimal,

    /** Annual interest rate as a percentage, e.g. 10.0 for 10% */
    @Column(nullable = false, precision = 6, scale = 4)
    val interestRate: BigDecimal,

    /** RICS / independent valuation of the security property */
    @Column(nullable = false, precision = 19, scale = 2)
    val valuation: BigDecimal,

    /** Senior / existing debt ranking ahead of this loan */
    @Column(nullable = false, precision = 19, scale = 2)
    val existingDebt: BigDecimal = BigDecimal.ZERO,

    /** Full property address used as security */
    val propertyAddress: String? = null,

    /** Free-text purpose, e.g. "Acquisition", "Refinance" */
    val loanPurpose: String? = null,

    /** Annual Net Operating Income of the underlying asset */
    @Column(precision = 19, scale = 2)
    val netOperatingIncome: BigDecimal? = null,

    @Column(nullable = false)
    val startDate: LocalDate,

    @Column(nullable = false)
    val maturityDate: LocalDate,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    val status: LoanStatus = LoanStatus.ORIGINATION,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    val covenantStatus: CovenantStatus = CovenantStatus.COMPLIANT,

    @OneToMany(mappedBy = "loan", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val repayments: List<Repayment> = emptyList(),

    @OneToMany(mappedBy = "loan", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val investorAllocations: List<InvestorAllocation> = emptyList()
) {
    /** Loan-to-Value = (existingDebt + principalAmount) / valuation */
    val ltv: BigDecimal
        get() = if (valuation.signum() == 0) BigDecimal.ZERO
                else (existingDebt + principalAmount)
                    .divide(valuation, 6, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal("100"))

    /** Interest Coverage Ratio = NOI / annualInterestCharge */
    val icr: BigDecimal?
        get() {
            val noi = netOperatingIncome ?: return null
            val annualInterest = principalAmount
                .multiply(interestRate)
                .divide(BigDecimal("100"), 6, java.math.RoundingMode.HALF_UP)
            return if (annualInterest.signum() == 0) null
                   else noi.divide(annualInterest, 4, java.math.RoundingMode.HALF_UP)
        }

    val totalInterestCharge: BigDecimal
        get() {
            val months = startDate.until(maturityDate).toTotalMonths()
            return principalAmount
                .multiply(interestRate)
                .divide(BigDecimal("100"), 6, java.math.RoundingMode.HALF_UP)
                .divide(BigDecimal("12"), 6, java.math.RoundingMode.HALF_UP)
                .multiply(BigDecimal(months))
        }
}
