package com.lendgraph.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

enum class DrawdownType { DRAWDOWN, DISTRIBUTION }

@Entity
@Table(name = "drawdown_events")
data class DrawdownEvent(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "investor_id", nullable = false)
    val investor: Investor,

    @Column(nullable = false)
    val eventDate: LocalDate,

    @Column(nullable = false, precision = 19, scale = 2)
    val amount: BigDecimal,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    val type: DrawdownType,

    val notes: String? = null
)
