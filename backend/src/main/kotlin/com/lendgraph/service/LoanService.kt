package com.lendgraph.service

import com.lendgraph.dto.CreateLoanRequest
import com.lendgraph.dto.LoanResponse
import com.lendgraph.dto.UpdateLoanStatusRequest
import com.lendgraph.entity.CovenantStatus
import com.lendgraph.entity.Loan
import com.lendgraph.entity.LoanStatus
import com.lendgraph.repository.BorrowerRepository
import com.lendgraph.repository.LoanRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class LoanService(
    private val loanRepository: LoanRepository,
    private val borrowerRepository: BorrowerRepository
) {

    fun findAll(): List<LoanResponse> =
        loanRepository.findAllWithDetails().map { LoanResponse.from(it) }

    fun findById(id: UUID): LoanResponse =
        loanRepository.findById(id)
            .map { LoanResponse.from(it) }
            .orElseThrow { NoSuchElementException("Loan $id not found") }

    fun findByStatus(status: LoanStatus): List<LoanResponse> =
        loanRepository.findByStatus(status).map { LoanResponse.from(it) }

    @Transactional
    fun create(request: CreateLoanRequest): LoanResponse {
        val borrower = borrowerRepository.findById(request.borrowerId)
            .orElseThrow { NoSuchElementException("Borrower ${request.borrowerId} not found") }

        val loan = Loan(
            reference = request.reference,
            borrower = borrower,
            principalAmount = request.principalAmount,
            interestRate = request.interestRate,
            valuation = request.valuation,
            existingDebt = request.existingDebt,
            propertyAddress = request.propertyAddress,
            loanPurpose = request.loanPurpose,
            netOperatingIncome = request.netOperatingIncome,
            startDate = request.startDate,
            maturityDate = request.maturityDate
        )
        return LoanResponse.from(loanRepository.save(loan))
    }

    @Transactional
    fun updateStatus(id: UUID, request: UpdateLoanStatusRequest): LoanResponse {
        val loan = loanRepository.findById(id)
            .orElseThrow { NoSuchElementException("Loan $id not found") }

        val updated = loan.copy(
            status = request.status,
            covenantStatus = request.covenantStatus ?: loan.covenantStatus
        )
        return LoanResponse.from(loanRepository.save(updated))
    }
}
