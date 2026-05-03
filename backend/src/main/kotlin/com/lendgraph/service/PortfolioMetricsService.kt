package com.lendgraph.service

import com.lendgraph.dto.*
import com.lendgraph.entity.Loan
import com.lendgraph.entity.LoanStatus
import com.lendgraph.repository.LoanRepository
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.abs

@Service
class PortfolioMetricsService(
    private val loanRepository: LoanRepository
) {

    fun computeMetrics(): PortfolioMetricsResponse {
        val loans = loanRepository.findAllWithDetails()

        val totalCapitalDeployed = loans
            .filter { it.status in setOf(LoanStatus.LIVE, LoanStatus.DEFAULTED) }
            .fold(BigDecimal.ZERO) { acc, l -> acc + l.principalAmount }

        val weightedAverageLtv = calculateWeightedAverageLtv(loans)
        val portfolioIrr = calculatePortfolioIrr(loans)

        val activeLoans = loans.count { it.status == LoanStatus.LIVE }
        val defaultedLoans = loans.count { it.status == LoanStatus.DEFAULTED }
        val defaultRate = if (loans.isEmpty()) BigDecimal.ZERO
                         else BigDecimal(defaultedLoans)
                             .divide(BigDecimal(loans.size), 4, RoundingMode.HALF_UP)
                             .multiply(BigDecimal("100"))

        val averageLoanSize = if (loans.isEmpty()) BigDecimal.ZERO
                              else loans.fold(BigDecimal.ZERO) { acc, l -> acc + l.principalAmount }
                                  .divide(BigDecimal(loans.size), 2, RoundingMode.HALF_UP)

        return PortfolioMetricsResponse(
            totalCapitalDeployed = totalCapitalDeployed.setScale(2, RoundingMode.HALF_UP),
            weightedAverageLtv = weightedAverageLtv,
            portfolioIrr = portfolioIrr,
            totalLoans = loans.size,
            activeLoans = activeLoans,
            defaultRate = defaultRate.setScale(1, RoundingMode.HALF_UP),
            averageLoanSize = averageLoanSize,
            monthlyDeployment = buildMonthlyDeployment(loans),
            ltvDistribution = buildLtvDistribution(loans),
            statusDistribution = buildStatusDistribution(loans)
        )
    }

    /**
     * Weighted Average LTV = Σ(principalAmount_i × LTV_i) / Σ(principalAmount_i)
     *
     * Only LIVE loans are included because they represent the current risk exposure.
     */
    fun calculateWeightedAverageLtv(loans: List<Loan>): BigDecimal {
        val liveLoans = loans.filter { it.status == LoanStatus.LIVE }
        if (liveLoans.isEmpty()) return BigDecimal.ZERO

        val weightedSum = liveLoans.fold(BigDecimal.ZERO) { acc, loan ->
            acc + loan.principalAmount.multiply(loan.ltv)
        }
        val totalPrincipal = liveLoans.fold(BigDecimal.ZERO) { acc, loan -> acc + loan.principalAmount }

        return if (totalPrincipal.signum() == 0) BigDecimal.ZERO
               else weightedSum
                   .divide(totalPrincipal, 6, RoundingMode.HALF_UP)
                   .setScale(2, RoundingMode.HALF_UP)
    }

    /**
     * Portfolio IRR via Newton-Raphson on the monthly cash-flow series.
     *
     * Cash-flow model per loan (monthly periods, relative to earliest start date):
     *   - Disbursement month  : -principalAmount
     *   - Each interim month  : +monthlyInterest (= principal × rate / 12)
     *   - Maturity month      : +remainingPrincipal + last interest
     *
     * The resulting monthly rate r is annualised as:  IRR = ((1+r)^12 - 1) × 100
     */
    fun calculatePortfolioIrr(loans: List<Loan>): BigDecimal {
        val deployedLoans = loans.filter {
            it.status in setOf(LoanStatus.LIVE, LoanStatus.DEFAULTED)
        }
        if (deployedLoans.isEmpty()) return BigDecimal.ZERO

        val earliestStart = deployedLoans.minOf { it.startDate }
        val cashFlows = buildPortfolioCashFlows(deployedLoans, earliestStart)

        val monthlyRate = newtonRaphsonIrr(cashFlows) ?: return BigDecimal.ZERO

        // Annualise: (1 + r_monthly)^12 - 1
        val annualIrr = Math.pow(1.0 + monthlyRate, 12.0) - 1.0
        return BigDecimal(annualIrr * 100).setScale(2, RoundingMode.HALF_UP)
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private fun buildPortfolioCashFlows(
        loans: List<Loan>,
        referenceDate: LocalDate
    ): DoubleArray {
        val maxPeriods = loans.maxOf {
            referenceDate.until(it.maturityDate).toTotalMonths().toInt()
        } + 1

        val flows = DoubleArray(maxPeriods)

        for (loan in loans) {
            val startPeriod = referenceDate.until(loan.startDate).toTotalMonths().toInt()
            val endPeriod = referenceDate.until(loan.maturityDate).toTotalMonths().toInt()
            val principal = loan.principalAmount.toDouble()
            val monthlyInterest = principal * loan.interestRate.toDouble() / 100.0 / 12.0

            val principalRepaid = loan.repayments
                .fold(BigDecimal.ZERO) { acc, r -> acc + r.principalAmount }
                .toDouble()
            val remainingPrincipal = principal - principalRepaid

            flows[startPeriod] -= principal

            for (period in (startPeriod + 1) until endPeriod) {
                flows[period] += monthlyInterest
            }

            if (endPeriod < maxPeriods) {
                flows[endPeriod] += remainingPrincipal + monthlyInterest
            }
        }

        return flows
    }

    /**
     * Newton-Raphson root-finding for IRR.
     * Returns the per-period (monthly) rate, or null if it fails to converge.
     */
    private fun newtonRaphsonIrr(
        cashFlows: DoubleArray,
        initialGuess: Double = 0.01,
        maxIterations: Int = 1000,
        tolerance: Double = 1e-7
    ): Double? {
        var rate = initialGuess

        repeat(maxIterations) {
            val npv = npv(cashFlows, rate)
            val dnpv = npvDerivative(cashFlows, rate)

            if (abs(dnpv) < 1e-12) return null

            val newRate = rate - npv / dnpv
            if (abs(newRate - rate) < tolerance) return newRate
            rate = newRate
        }

        return if (abs(npv(cashFlows, rate)) < tolerance) rate else null
    }

    private fun npv(cashFlows: DoubleArray, rate: Double): Double =
        cashFlows.indices.sumOf { t -> cashFlows[t] / Math.pow(1.0 + rate, t.toDouble()) }

    private fun npvDerivative(cashFlows: DoubleArray, rate: Double): Double =
        cashFlows.indices.drop(1).sumOf { t ->
            -t * cashFlows[t] / Math.pow(1.0 + rate, t + 1.0)
        }

    private fun buildMonthlyDeployment(loans: List<Loan>): List<MonthlyDeployment> {
        val fmt = DateTimeFormatter.ofPattern("MMM")
        return loans
            .groupBy { it.startDate.format(fmt) }
            .map { (month, group) ->
                MonthlyDeployment(
                    month = month,
                    amount = group.fold(BigDecimal.ZERO) { acc, l -> acc + l.principalAmount }
                        .setScale(2, RoundingMode.HALF_UP)
                )
            }
    }

    private val ltvBuckets = listOf(
        "50-55%" to (50.0..55.0),
        "55-60%" to (55.0..60.0),
        "60-65%" to (60.0..65.0),
        "65-70%" to (65.0..70.0),
        "70-75%" to (70.0..75.0),
        "75%+"   to (75.0..Double.MAX_VALUE)
    )

    private fun buildLtvDistribution(loans: List<Loan>): List<LtvBucket> =
        ltvBuckets.map { (label, range) ->
            LtvBucket(
                range = label,
                count = loans.count { it.ltv.toDouble() in range }
            )
        }

    private fun buildStatusDistribution(loans: List<Loan>): List<StatusBucket> =
        LoanStatus.entries.map { status ->
            val group = loans.filter { it.status == status }
            StatusBucket(
                status = status.name.lowercase().replaceFirstChar { it.uppercase() },
                count = group.size,
                amount = group.fold(BigDecimal.ZERO) { acc, l -> acc + l.principalAmount }
                    .setScale(2, RoundingMode.HALF_UP)
            )
        }
}
