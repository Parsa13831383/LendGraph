package com.lendgraph.repository

import com.lendgraph.entity.Borrower
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface BorrowerRepository : JpaRepository<Borrower, UUID> {
    fun findByCompanyRegNumber(companyRegNumber: String): Borrower?
}
