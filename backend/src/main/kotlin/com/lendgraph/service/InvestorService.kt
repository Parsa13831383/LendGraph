package com.lendgraph.service

import com.lendgraph.dto.CreateInvestorRequest
import com.lendgraph.dto.InvestorResponse
import com.lendgraph.entity.Investor
import com.lendgraph.repository.InvestorRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class InvestorService(
    private val investorRepository: InvestorRepository
) {

    fun findAll(): List<InvestorResponse> =
        investorRepository.findAllWithDetails().map { InvestorResponse.from(it) }

    fun findById(id: UUID): InvestorResponse =
        investorRepository.findById(id)
            .map { InvestorResponse.from(it) }
            .orElseThrow { NoSuchElementException("Investor $id not found") }

    @Transactional
    fun create(request: CreateInvestorRequest): InvestorResponse {
        val investor = Investor(
            name = request.name,
            totalCommitment = request.totalCommitment
        )
        return InvestorResponse.from(investorRepository.save(investor))
    }
}
