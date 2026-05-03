package com.lendgraph.controller

import com.lendgraph.dto.CreateLoanRequest
import com.lendgraph.dto.LoanResponse
import com.lendgraph.dto.UpdateLoanStatusRequest
import com.lendgraph.entity.LoanStatus
import com.lendgraph.service.LoanService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/loans")
class LoanController(private val loanService: LoanService) {

    @GetMapping
    fun getAll(
        @RequestParam(required = false) status: LoanStatus?
    ): List<LoanResponse> =
        if (status != null) loanService.findByStatus(status)
        else loanService.findAll()

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): LoanResponse =
        loanService.findById(id)

    @PostMapping
    fun create(@RequestBody request: CreateLoanRequest): ResponseEntity<LoanResponse> =
        ResponseEntity.status(HttpStatus.CREATED).body(loanService.create(request))

    @PatchMapping("/{id}/status")
    fun updateStatus(
        @PathVariable id: UUID,
        @RequestBody request: UpdateLoanStatusRequest
    ): LoanResponse = loanService.updateStatus(id, request)
}
