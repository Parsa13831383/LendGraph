package com.lendgraph.repository

import com.lendgraph.entity.Repayment
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.time.LocalDate
import java.util.UUID

interface RepaymentRepository : JpaRepository<Repayment, UUID> {

    fun findByLoanId(loanId: UUID): List<Repayment>

    @Query("SELECT r FROM Repayment r WHERE r.paymentDate BETWEEN :from AND :to ORDER BY r.paymentDate")
    fun findByDateRange(from: LocalDate, to: LocalDate): List<Repayment>
}
