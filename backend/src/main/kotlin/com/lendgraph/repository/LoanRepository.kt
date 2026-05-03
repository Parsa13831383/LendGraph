package com.lendgraph.repository

import com.lendgraph.entity.Loan
import com.lendgraph.entity.LoanStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.UUID

interface LoanRepository : JpaRepository<Loan, UUID> {

    fun findByStatus(status: LoanStatus): List<Loan>

    fun findByBorrowerId(borrowerId: UUID): List<Loan>

    fun findByReference(reference: String): Loan?

    @Query("SELECT l FROM Loan l WHERE l.status IN ('LIVE', 'DEFAULTED')")
    fun findAllActive(): List<Loan>

    @Query("""
        SELECT l FROM Loan l
        JOIN FETCH l.borrower
        LEFT JOIN FETCH l.repayments
    """)
    fun findAllWithDetails(): List<Loan>
}
