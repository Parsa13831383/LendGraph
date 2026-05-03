package com.lendgraph.controller

import com.lendgraph.dto.CreateInvestorRequest
import com.lendgraph.dto.InvestorResponse
import com.lendgraph.service.InvestorService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/investors")
class InvestorController(private val investorService: InvestorService) {

    @GetMapping
    fun getAll(): List<InvestorResponse> = investorService.findAll()

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): InvestorResponse =
        investorService.findById(id)

    @PostMapping
    fun create(@RequestBody request: CreateInvestorRequest): ResponseEntity<InvestorResponse> =
        ResponseEntity.status(HttpStatus.CREATED).body(investorService.create(request))
}
