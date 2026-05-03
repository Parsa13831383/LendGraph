package com.lendgraph.controller

import com.lendgraph.dto.PortfolioMetricsResponse
import com.lendgraph.service.PortfolioMetricsService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/portfolio")
class PortfolioMetricsController(
    private val portfolioMetricsService: PortfolioMetricsService
) {

    /** Full dashboard metrics — call this on page load */
    @GetMapping("/metrics")
    fun getMetrics(): PortfolioMetricsResponse =
        portfolioMetricsService.computeMetrics()

    /** Lightweight LTV-only endpoint (useful for widgets that poll frequently) */
    @GetMapping("/ltv")
    fun getWeightedAverageLtv(): Map<String, Any> {
        val metrics = portfolioMetricsService.computeMetrics()
        return mapOf("weightedAverageLtv" to metrics.weightedAverageLtv)
    }

    /** IRR-only endpoint */
    @GetMapping("/irr")
    fun getPortfolioIrr(): Map<String, Any> {
        val metrics = portfolioMetricsService.computeMetrics()
        return mapOf("portfolioIrr" to metrics.portfolioIrr)
    }
}
