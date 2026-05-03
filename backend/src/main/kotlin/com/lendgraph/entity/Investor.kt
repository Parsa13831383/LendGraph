package com.lendgraph.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "investors")
data class Investor(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    val name: String,

    /** Maximum capital the investor has committed to the fund */
    @Column(nullable = false, precision = 19, scale = 2)
    val totalCommitment: BigDecimal,

    @OneToMany(mappedBy = "investor", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val allocations: List<InvestorAllocation> = emptyList(),

    @OneToMany(mappedBy = "investor", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val drawdownEvents: List<DrawdownEvent> = emptyList()
) {
    val drawnAmount: BigDecimal
        get() = allocations.fold(BigDecimal.ZERO) { acc, a -> acc + a.amount }

    val availableCapital: BigDecimal
        get() = totalCommitment - drawnAmount
}
