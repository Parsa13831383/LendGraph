package com.lendgraph.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "repayments")
data class Repayment(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "loan_id", nullable = false)
    val loan: Loan,

    @Column(nullable = false)
    val paymentDate: LocalDate,

    @Column(nullable = false, precision = 19, scale = 2)
    val interestAmount: BigDecimal = BigDecimal.ZERO,

    @Column(nullable = false, precision = 19, scale = 2)
    val principalAmount: BigDecimal = BigDecimal.ZERO,

    val notes: String? = null
) {
    val totalAmount: BigDecimal get() = interestAmount + principalAmount
}
