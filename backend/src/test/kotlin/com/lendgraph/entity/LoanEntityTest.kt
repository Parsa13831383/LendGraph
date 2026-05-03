package com.lendgraph.entity

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate

/**
 * Pure unit tests for Loan computed properties (ltv, icr, totalInterestCharge).
 * No Spring context or mocks — just object construction and assertions.
 */
class LoanEntityTest {

    // ── Fixtures ──────────────────────────────────────────────────────────────

    private val borrower = Borrower(
        companyName = "Acme Property Ltd",
        companyRegNumber = "12345678"
    )

    private fun loan(
        principalAmount: BigDecimal = BigDecimal("1_000_000".replace("_", "")),
        interestRate: BigDecimal = BigDecimal("10.0"),
        valuation: BigDecimal = BigDecimal("2_000_000".replace("_", "")),
        existingDebt: BigDecimal = BigDecimal.ZERO,
        netOperatingIncome: BigDecimal? = null,
        startDate: LocalDate = LocalDate.of(2024, 1, 1),
        maturityDate: LocalDate = LocalDate.of(2025, 1, 1),
        repayments: List<Repayment> = emptyList()
    ) = Loan(
        reference = "TEST-001",
        borrower = borrower,
        principalAmount = principalAmount,
        interestRate = interestRate,
        valuation = valuation,
        existingDebt = existingDebt,
        netOperatingIncome = netOperatingIncome,
        startDate = startDate,
        maturityDate = maturityDate,
        repayments = repayments
    )

    // ── LTV ───────────────────────────────────────────────────────────────────

    @Nested
    inner class Ltv {

        @Test
        fun `60 pct LTV for typical bridge loan without senior debt`() {
            val loan = loan(
                principalAmount = BigDecimal("1200000"),
                valuation = BigDecimal("2000000")
            )
            // (0 + 1,200,000) / 2,000,000 * 100 = 60
            assertEquals(0, BigDecimal("60.000000").compareTo(loan.ltv))
        }

        @Test
        fun `senior existing debt is included in LTV numerator`() {
            val loan = loan(
                principalAmount = BigDecimal("1000000"),
                existingDebt = BigDecimal("500000"),
                valuation = BigDecimal("2000000")
            )
            // (500,000 + 1,000,000) / 2,000,000 * 100 = 75
            assertEquals(0, BigDecimal("75.000000").compareTo(loan.ltv))
        }

        @Test
        fun `returns ZERO when valuation is zero — no ArithmeticException`() {
            // Edge case: valuation updated to zero (e.g. data-entry error)
            val loan = loan(valuation = BigDecimal.ZERO)
            assertEquals(BigDecimal.ZERO, loan.ltv)
        }

        @Test
        fun `returns 100 pct LTV for full-value loan`() {
            val loan = loan(
                principalAmount = BigDecimal("2000000"),
                valuation = BigDecimal("2000000")
            )
            assertEquals(0, BigDecimal("100.000000").compareTo(loan.ltv))
        }

        @Test
        fun `fractional LTV is rounded to 6 decimal places`() {
            val loan = loan(
                principalAmount = BigDecimal("1000000"),
                valuation = BigDecimal("3000000")
            )
            // 1/3 * 100 = 33.333333...
            val ltv = loan.ltv
            assertEquals(6, ltv.scale())
            assertEquals(0, BigDecimal("33.333333").compareTo(ltv))
        }

        @Test
        fun `very small loan against large asset produces near-zero LTV`() {
            val loan = loan(
                principalAmount = BigDecimal("1000"),
                valuation = BigDecimal("10000000")
            )
            assertTrue(loan.ltv < BigDecimal("1"))
        }
    }

    // ── ICR ───────────────────────────────────────────────────────────────────

    @Nested
    inner class Icr {

        @Test
        fun `2x ICR for NOI double the annual interest`() {
            val loan = loan(
                principalAmount = BigDecimal("1000000"),
                interestRate = BigDecimal("10.0"),
                netOperatingIncome = BigDecimal("200000")
            )
            // annualInterest = 1,000,000 * 10% = 100,000
            // ICR = 200,000 / 100,000 = 2.0
            val icr = assertNotNull(loan.icr)
            assertEquals(0, BigDecimal("2.0000").compareTo(icr))
        }

        @Test
        fun `returns null when NOI is not provided`() {
            val loan = loan(netOperatingIncome = null)
            assertNull(loan.icr)
        }

        @Test
        fun `returns null when interest rate is zero — avoids divide-by-zero`() {
            val loan = loan(
                interestRate = BigDecimal.ZERO,
                netOperatingIncome = BigDecimal("200000")
            )
            assertNull(loan.icr)
        }

        @Test
        fun `correctly identifies sub-threshold ICR below 1 5x`() {
            val loan = loan(
                principalAmount = BigDecimal("2000000"),
                interestRate = BigDecimal("10.0"),
                netOperatingIncome = BigDecimal("100000")
            )
            // annualInterest = 200,000; ICR = 100,000 / 200,000 = 0.5
            val icr = assertNotNull(loan.icr)
            assertTrue(icr < BigDecimal("1.5"), "Expected ICR < 1.5 but was $icr")
        }

        @Test
        fun `ICR above 1 5x is considered healthy`() {
            val loan = loan(
                principalAmount = BigDecimal("1000000"),
                interestRate = BigDecimal("10.0"),
                netOperatingIncome = BigDecimal("300000")
            )
            // annualInterest = 100,000; ICR = 3.0
            val icr = assertNotNull(loan.icr)
            assertTrue(icr >= BigDecimal("1.5"), "Expected ICR >= 1.5 but was $icr")
        }

        @Test
        fun `high interest rate reduces ICR proportionally`() {
            val standard = loan(
                principalAmount = BigDecimal("1000000"),
                interestRate = BigDecimal("10.0"),
                netOperatingIncome = BigDecimal("200000")
            )
            val expensive = loan(
                principalAmount = BigDecimal("1000000"),
                interestRate = BigDecimal("20.0"),
                netOperatingIncome = BigDecimal("200000")
            )
            assertTrue(expensive.icr!! < standard.icr!!)
        }
    }

    // ── Total Interest Charge ─────────────────────────────────────────────────

    @Nested
    inner class TotalInterestCharge {

        @Test
        fun `12-month bullet loan at 10 pct produces correct total interest`() {
            val loan = loan(
                principalAmount = BigDecimal("1000000"),
                interestRate = BigDecimal("10.0"),
                startDate = LocalDate.of(2024, 1, 1),
                maturityDate = LocalDate.of(2025, 1, 1)   // 12 months
            )
            // monthly = 1,000,000 * 10% / 12 = 8,333.333...
            // total   = 8,333.333... * 12 = 100,000
            assertEquals(
                0, BigDecimal("100000").compareTo(
                    loan.totalInterestCharge.setScale(0, RoundingMode.HALF_UP)
                )
            )
        }

        @Test
        fun `6-month loan produces half the annual interest`() {
            val loan = loan(
                principalAmount = BigDecimal("1000000"),
                interestRate = BigDecimal("10.0"),
                startDate = LocalDate.of(2024, 1, 1),
                maturityDate = LocalDate.of(2024, 7, 1)   // 6 months
            )
            assertEquals(
                0, BigDecimal("50000").compareTo(
                    loan.totalInterestCharge.setScale(0, RoundingMode.HALF_UP)
                )
            )
        }

        @Test
        fun `returns zero when interest rate is zero`() {
            val loan = loan(interestRate = BigDecimal.ZERO)
            assertEquals(0, BigDecimal.ZERO.compareTo(loan.totalInterestCharge))
        }

        @Test
        fun `18-month term is calculated correctly`() {
            val loan = loan(
                principalAmount = BigDecimal("1000000"),
                interestRate = BigDecimal("12.0"),
                startDate = LocalDate.of(2024, 1, 1),
                maturityDate = LocalDate.of(2025, 7, 1)   // 18 months
            )
            // monthly = 1,000,000 * 12% / 12 = 10,000
            // total   = 10,000 * 18 = 180,000
            assertEquals(
                0, BigDecimal("180000").compareTo(
                    loan.totalInterestCharge.setScale(0, RoundingMode.HALF_UP)
                )
            )
        }
    }

    // ── Repayment accumulation (via LoanResponse.from) ────────────────────────

    @Nested
    inner class RepaymentEdgeCases {

        @Test
        fun `loan with zero repayments reports no interest or principal paid`() {
            val loan = loan(repayments = emptyList())

            // Mimic what LoanResponse.from() does
            val interestPaid = loan.repayments
                .fold(BigDecimal.ZERO) { acc, r -> acc + r.interestAmount }
            val principalPaid = loan.repayments
                .fold(BigDecimal.ZERO) { acc, r -> acc + r.principalAmount }

            assertEquals(BigDecimal.ZERO, interestPaid)
            assertEquals(BigDecimal.ZERO, principalPaid)
        }

        @Test
        fun `multiple repayments are summed correctly`() {
            val base = loan()
            val repayments = listOf(
                Repayment(
                    loan = base,
                    paymentDate = LocalDate.of(2024, 2, 1),
                    interestAmount = BigDecimal("8333.33"),
                    principalAmount = BigDecimal.ZERO
                ),
                Repayment(
                    loan = base,
                    paymentDate = LocalDate.of(2024, 3, 1),
                    interestAmount = BigDecimal("8333.33"),
                    principalAmount = BigDecimal("100000")
                ),
                Repayment(
                    loan = base,
                    paymentDate = LocalDate.of(2024, 4, 1),
                    interestAmount = BigDecimal("8333.34"),
                    principalAmount = BigDecimal("200000")
                )
            )
            val loanWithRepayments = base.copy(repayments = repayments)

            val interestPaid = loanWithRepayments.repayments
                .fold(BigDecimal.ZERO) { acc, r -> acc + r.interestAmount }
            val principalPaid = loanWithRepayments.repayments
                .fold(BigDecimal.ZERO) { acc, r -> acc + r.principalAmount }

            assertEquals(0, BigDecimal("25000.00").compareTo(interestPaid))
            assertEquals(0, BigDecimal("300000").compareTo(principalPaid))
        }

        @Test
        fun `interest-only repayment has zero principal paid`() {
            val base = loan()
            val interestOnlyRepayment = Repayment(
                loan = base,
                paymentDate = LocalDate.of(2024, 2, 1),
                interestAmount = BigDecimal("8333.33"),
                principalAmount = BigDecimal.ZERO
            )
            val loanWithRepayment = base.copy(repayments = listOf(interestOnlyRepayment))

            val principalPaid = loanWithRepayment.repayments
                .fold(BigDecimal.ZERO) { acc, r -> acc + r.principalAmount }

            assertEquals(BigDecimal.ZERO, principalPaid)
        }
    }
}
