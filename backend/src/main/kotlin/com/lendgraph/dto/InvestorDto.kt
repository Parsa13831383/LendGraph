package com.lendgraph.dto

import com.lendgraph.entity.DrawdownEvent
import com.lendgraph.entity.DrawdownType
import com.lendgraph.entity.Investor
import com.lendgraph.entity.InvestorAllocation
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class AllocationResponse(
    val id: UUID,
    val loanId: UUID,
    val loanReference: String,
    val borrowerName: String,
    val amount: BigDecimal,
    val percentage: BigDecimal
) {
    companion object {
        fun from(a: InvestorAllocation) = AllocationResponse(
            id = a.id,
            loanId = a.loan.id,
            loanReference = a.loan.reference,
            borrowerName = a.loan.borrower.companyName,
            amount = a.amount,
            percentage = a.percentage
        )
    }
}

data class DrawdownEventResponse(
    val id: UUID,
    val eventDate: LocalDate,
    val amount: BigDecimal,
    val type: DrawdownType,
    val notes: String?
) {
    companion object {
        fun from(e: DrawdownEvent) = DrawdownEventResponse(
            id = e.id,
            eventDate = e.eventDate,
            amount = e.amount,
            type = e.type,
            notes = e.notes
        )
    }
}

data class InvestorResponse(
    val id: UUID,
    val name: String,
    val totalCommitment: BigDecimal,
    val drawnAmount: BigDecimal,
    val availableCapital: BigDecimal,
    val allocations: List<AllocationResponse>,
    val drawdownHistory: List<DrawdownEventResponse>
) {
    companion object {
        fun from(investor: Investor) = InvestorResponse(
            id = investor.id,
            name = investor.name,
            totalCommitment = investor.totalCommitment,
            drawnAmount = investor.drawnAmount,
            availableCapital = investor.availableCapital,
            allocations = investor.allocations.map { AllocationResponse.from(it) },
            drawdownHistory = investor.drawdownEvents
                .sortedByDescending { it.eventDate }
                .map { DrawdownEventResponse.from(it) }
        )
    }
}

data class CreateInvestorRequest(
    val name: String,
    val totalCommitment: BigDecimal
)
