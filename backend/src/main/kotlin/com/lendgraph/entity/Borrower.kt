package com.lendgraph.entity

import jakarta.persistence.*
import java.util.UUID

@Entity
@Table(name = "borrowers")
data class Borrower(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    val companyName: String,

    @Column(nullable = false, unique = true, length = 8)
    val companyRegNumber: String,

    val contactName: String? = null,

    val contactEmail: String? = null,

    @OneToMany(mappedBy = "borrower", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val loans: List<Loan> = emptyList()
)
