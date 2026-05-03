package com.lendgraph.controller

import com.lendgraph.dto.CreateLoanFromExtractionRequest
import com.lendgraph.dto.LoanApplicationResponse
import com.lendgraph.service.LoanApplicationService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/loans/applications")
class LoanApplicationController(
    private val loanApplicationService: LoanApplicationService
) {
    /**
     * Creates a loan application from data extracted by the Covenant Assistant.
     *
     * The request body mirrors the ExtractionResult JSON that Claude returns,
     * augmented with borrower fields so the backend can upsert the Borrower
     * entity and create the Loan in a single transaction.
     *
     * POST /api/loans/applications
     */
    @PostMapping
    fun createFromExtraction(
        @RequestBody request: CreateLoanFromExtractionRequest
    ): ResponseEntity<LoanApplicationResponse> {
        val response = loanApplicationService.createFromExtraction(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }
}
