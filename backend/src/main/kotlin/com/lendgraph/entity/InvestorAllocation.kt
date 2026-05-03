package com.lendgraph.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(
    name = "investor_allocations",
    uniqueConstraints = [UniqueConstraint(columnNames = ["investor_id", "loan_id"])]
)
data class InvestorAllocation(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "investor_id", nullable = false)
    val investor: Investor,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "loan_id", nullable = false)
    val loan: Loan,

    /** GBP amount this investor has committed to this specific loan */
    @Column(nullable = false, precision = 19, scale = 2)
    val amount: BigDecimal,

    /** Percentage of the loan covered by this investor (0-100) */
    @Column(nullable = false, precision = 6, scale = 4)
    val percentage: BigDecimal
)
