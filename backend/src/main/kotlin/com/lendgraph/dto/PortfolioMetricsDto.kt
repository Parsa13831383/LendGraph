package com.lendgraph.dto

import java.math.BigDecimal

data class LtvBucket(val range: String, val count: Int)

data class StatusBucket(val status: String, val count: Int, val amount: BigDecimal)

data class MonthlyDeployment(val month: String, val amount: BigDecimal)

data class PortfolioMetricsResponse(
    val totalCapitalDeployed: BigDecimal,
    val weightedAverageLtv: BigDecimal,
    val portfolioIrr: BigDecimal,
    val totalLoans: Int,
    val activeLoans: Int,
    val defaultRate: BigDecimal,
    val averageLoanSize: BigDecimal,
    val monthlyDeployment: List<MonthlyDeployment>,
    val ltvDistribution: List<LtvBucket>,
    val statusDistribution: List<StatusBucket>
)
