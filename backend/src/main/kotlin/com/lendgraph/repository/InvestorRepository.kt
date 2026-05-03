package com.lendgraph.repository

import com.lendgraph.entity.Investor
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.UUID

interface InvestorRepository : JpaRepository<Investor, UUID> {

    @Query("""
        SELECT i FROM Investor i
        LEFT JOIN FETCH i.allocations a
        LEFT JOIN FETCH a.loan
        LEFT JOIN FETCH i.drawdownEvents
    """)
    fun findAllWithDetails(): List<Investor>
}
