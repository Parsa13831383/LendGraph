package com.lendgraph.service

import com.lendgraph.dto.CreateLoanRequest
import com.lendgraph.dto.UpdateLoanStatusRequest
import com.lendgraph.entity.*
import com.lendgraph.repository.BorrowerRepository
import com.lendgraph.repository.LoanRepository
import io.mockk.*
import io.mockk.impl.annotations.MockK
import io.mockk.junit5.MockKExtension
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.math.BigDecimal
import java.time.LocalDate
import java.util.Optional
import java.util.UUID

@ExtendWith(MockKExtension::class)
class LoanServiceTest {

    @MockK lateinit var loanRepository: LoanRepository
    @MockK lateinit var borrowerRepository: BorrowerRepository

    private lateinit var service: LoanService

    // ── Shared fixture IDs ────────────────────────────────────────────────────
    private val borrowerId = UUID.fromString("00000000-0000-0000-0000-000000000001")
    private val loanId     = UUID.fromString("00000000-0000-0000-0000-000000000002")
    private val unknownId  = UUID.fromString("00000000-0000-0000-0000-0000000000ff")

    @BeforeEach
    fun setUp() {
        service = LoanService(loanRepository, borrowerRepository)
    }

    // ── Fixture builders ──────────────────────────────────────────────────────

    private fun borrower(id: UUID = borrowerId) = Borrower(
        id = id,
        companyName = "Meridian Property Holdings",
        companyRegNumber = "12345678",
        contactName = "Alice Borrower",
        contactEmail = "alice@meridian.co.uk"
    )

    private fun loan(
        id: UUID = loanId,
        status: LoanStatus = LoanStatus.LIVE,
        covenantStatus: CovenantStatus = CovenantStatus.COMPLIANT,
        repayments: List<Repayment> = emptyList(),
        netOperatingIncome: BigDecimal? = BigDecimal("200000")
    ): Loan {
        val base = Loan(
            id = id,
            reference = "L001",
            borrower = borrower(),
            principalAmount = BigDecimal("1000000"),
            interestRate = BigDecimal("10.0"),
            valuation = BigDecimal("2000000"),
            existingDebt = BigDecimal("200000"),
            startDate = LocalDate.of(2024, 1, 1),
            maturityDate = LocalDate.of(2025, 1, 1),
            status = status,
            covenantStatus = covenantStatus,
            netOperatingIncome = netOperatingIncome,
            repayments = emptyList()
        )
        if (repayments.isEmpty()) return base

        // Repayment back-references this base loan (no circular construction problem)
        val attachedRepayments = repayments.map { it.copy(loan = base) }
        return base.copy(repayments = attachedRepayments)
    }

    private fun repayment(
        interestAmount: BigDecimal = BigDecimal("8333.33"),
        principalAmount: BigDecimal = BigDecimal.ZERO,
        paymentDate: LocalDate = LocalDate.of(2024, 2, 1)
    ) = Repayment(
        loan = loan(),   // placeholder; replaced in loan() builder above
        paymentDate = paymentDate,
        interestAmount = interestAmount,
        principalAmount = principalAmount
    )

    // =========================================================================
    // findAll
    // =========================================================================

    @Nested
    inner class FindAll {

        @Test
        fun `returns mapped responses for all loans`() {
            val loans = listOf(loan(), loan(id = UUID.randomUUID()))
            every { loanRepository.findAllWithDetails() } returns loans

            val result = service.findAll()

            assertEquals(2, result.size)
            assertEquals("L001", result[0].reference)
            verify(exactly = 1) { loanRepository.findAllWithDetails() }
        }

        @Test
        fun `returns empty list when no loans exist`() {
            every { loanRepository.findAllWithDetails() } returns emptyList()

            val result = service.findAll()

            assertTrue(result.isEmpty())
        }

        @Test
        fun `maps borrower fields onto response correctly`() {
            every { loanRepository.findAllWithDetails() } returns listOf(loan())

            val response = service.findAll().single()

            assertEquals("Meridian Property Holdings", response.borrowerName)
            assertEquals("12345678", response.companyRegNumber)
        }
    }

    // =========================================================================
    // findById
    // =========================================================================

    @Nested
    inner class FindById {

        @Test
        fun `returns response for known loan ID`() {
            every { loanRepository.findById(loanId) } returns Optional.of(loan())

            val response = service.findById(loanId)

            assertEquals(loanId, response.id)
            assertEquals("L001", response.reference)
        }

        @Test
        fun `throws NoSuchElementException for unknown loan ID`() {
            every { loanRepository.findById(unknownId) } returns Optional.empty()

            val ex = assertThrows<NoSuchElementException> {
                service.findById(unknownId)
            }
            assertTrue(ex.message!!.contains(unknownId.toString()))
        }

        @Test
        fun `LTV is correctly calculated in response`() {
            // principal = 1,000,000, existingDebt = 200,000, valuation = 2,000,000
            // LTV = (200,000 + 1,000,000) / 2,000,000 * 100 = 60.00
            every { loanRepository.findById(loanId) } returns Optional.of(loan())

            val response = service.findById(loanId)

            assertEquals(0, BigDecimal("60.00").compareTo(response.ltv))
        }

        @Test
        fun `loan with zero repayments reports zero interest and principal paid`() {
            every { loanRepository.findById(loanId) } returns Optional.of(loan(repayments = emptyList()))

            val response = service.findById(loanId)

            assertEquals(0, BigDecimal("0.00").compareTo(response.interestPaid))
            assertEquals(0, BigDecimal("0.00").compareTo(response.principalPaid))
        }

        @Test
        fun `multiple repayments are accumulated into response totals`() {
            val r1 = repayment(interestAmount = BigDecimal("8333.33"), principalAmount = BigDecimal.ZERO)
            val r2 = repayment(interestAmount = BigDecimal("8333.33"), principalAmount = BigDecimal("100000"))
            every { loanRepository.findById(loanId) } returns Optional.of(loan(repayments = listOf(r1, r2)))

            val response = service.findById(loanId)

            assertEquals(0, BigDecimal("16666.66").compareTo(response.interestPaid))
            assertEquals(0, BigDecimal("100000.00").compareTo(response.principalPaid))
        }
    }

    // =========================================================================
    // findByStatus
    // =========================================================================

    @Nested
    inner class FindByStatus {

        @Test
        fun `returns only loans matching the requested status`() {
            val liveLoans = listOf(loan(status = LoanStatus.LIVE))
            every { loanRepository.findByStatus(LoanStatus.LIVE) } returns liveLoans

            val result = service.findByStatus(LoanStatus.LIVE)

            assertEquals(1, result.size)
            assertEquals(LoanStatus.LIVE, result[0].status)
        }

        @Test
        fun `returns empty list when no loans match the status`() {
            every { loanRepository.findByStatus(LoanStatus.DEFAULTED) } returns emptyList()

            val result = service.findByStatus(LoanStatus.DEFAULTED)

            assertTrue(result.isEmpty())
        }
    }

    // =========================================================================
    // create
    // =========================================================================

    @Nested
    inner class Create {

        private val request = CreateLoanRequest(
            reference = "L099",
            borrowerId = borrowerId,
            principalAmount = BigDecimal("500000"),
            interestRate = BigDecimal("9.5"),
            valuation = BigDecimal("1000000"),
            existingDebt = BigDecimal.ZERO,
            startDate = LocalDate.of(2024, 6, 1),
            maturityDate = LocalDate.of(2025, 6, 1)
        )

        @Test
        fun `saves and returns the new loan`() {
            val savedLoan = loan().copy(reference = "L099")
            every { borrowerRepository.findById(borrowerId) } returns Optional.of(borrower())
            every { loanRepository.save(any()) } returns savedLoan

            val response = service.create(request)

            assertEquals("L099", response.reference)
            verify(exactly = 1) { loanRepository.save(any()) }
        }

        @Test
        fun `saved loan has ORIGINATION status by default`() {
            val loanSlot = slot<Loan>()
            every { borrowerRepository.findById(borrowerId) } returns Optional.of(borrower())
            every { loanRepository.save(capture(loanSlot)) } returns loan()

            service.create(request)

            assertEquals(LoanStatus.ORIGINATION, loanSlot.captured.status)
        }

        @Test
        fun `saved loan carries all fields from the request`() {
            val loanSlot = slot<Loan>()
            every { borrowerRepository.findById(borrowerId) } returns Optional.of(borrower())
            every { loanRepository.save(capture(loanSlot)) } returns loan()

            service.create(request)

            with(loanSlot.captured) {
                assertEquals("L099", reference)
                assertEquals(0, BigDecimal("500000").compareTo(principalAmount))
                assertEquals(0, BigDecimal("9.5").compareTo(interestRate))
                assertEquals(0, BigDecimal("1000000").compareTo(valuation))
                assertEquals(LocalDate.of(2024, 6, 1), startDate)
                assertEquals(LocalDate.of(2025, 6, 1), maturityDate)
            }
        }

        @Test
        fun `throws NoSuchElementException when borrower ID is unknown`() {
            every { borrowerRepository.findById(unknownId) } returns Optional.empty()

            val ex = assertThrows<NoSuchElementException> {
                service.create(request.copy(borrowerId = unknownId))
            }
            assertTrue(ex.message!!.contains(unknownId.toString()))
            verify(exactly = 0) { loanRepository.save(any()) }
        }

        @Test
        fun `optional fields are passed through when provided`() {
            val loanSlot = slot<Loan>()
            val fullRequest = request.copy(
                propertyAddress = "10 Downing Street, London",
                loanPurpose = "Acquisition",
                netOperatingIncome = BigDecimal("75000")
            )
            every { borrowerRepository.findById(borrowerId) } returns Optional.of(borrower())
            every { loanRepository.save(capture(loanSlot)) } returns loan()

            service.create(fullRequest)

            assertEquals("10 Downing Street, London", loanSlot.captured.propertyAddress)
            assertEquals("Acquisition", loanSlot.captured.loanPurpose)
            assertEquals(0, BigDecimal("75000").compareTo(loanSlot.captured.netOperatingIncome))
        }

        @Test
        fun `optional fields are null when not provided`() {
            val loanSlot = slot<Loan>()
            every { borrowerRepository.findById(borrowerId) } returns Optional.of(borrower())
            every { loanRepository.save(capture(loanSlot)) } returns loan()

            service.create(request)  // request has no optional fields

            assertNull(loanSlot.captured.propertyAddress)
            assertNull(loanSlot.captured.loanPurpose)
            assertNull(loanSlot.captured.netOperatingIncome)
        }
    }

    // =========================================================================
    // updateStatus
    // =========================================================================

    @Nested
    inner class UpdateStatus {

        @Test
        fun `transitions status to the requested value`() {
            val currentLoan = loan(status = LoanStatus.UNDERWRITING)
            val loanSlot = slot<Loan>()
            every { loanRepository.findById(loanId) } returns Optional.of(currentLoan)
            every { loanRepository.save(capture(loanSlot)) } returns currentLoan.copy(status = LoanStatus.LIVE)

            val response = service.updateStatus(loanId, UpdateLoanStatusRequest(LoanStatus.LIVE))

            assertEquals(LoanStatus.LIVE, loanSlot.captured.status)
            assertEquals(LoanStatus.LIVE, response.status)
        }

        @Test
        fun `preserves existing covenant when covenantStatus is null in request`() {
            val currentLoan = loan(
                status = LoanStatus.LIVE,
                covenantStatus = CovenantStatus.COMPLIANT
            )
            val loanSlot = slot<Loan>()
            every { loanRepository.findById(loanId) } returns Optional.of(currentLoan)
            every { loanRepository.save(capture(loanSlot)) } returns currentLoan

            // Request contains no covenantStatus
            service.updateStatus(loanId, UpdateLoanStatusRequest(status = LoanStatus.LIVE))

            assertEquals(CovenantStatus.COMPLIANT, loanSlot.captured.covenantStatus)
        }

        @Test
        fun `overrides covenant when covenantStatus is supplied in request`() {
            val currentLoan = loan(
                status = LoanStatus.LIVE,
                covenantStatus = CovenantStatus.COMPLIANT
            )
            val loanSlot = slot<Loan>()
            every { loanRepository.findById(loanId) } returns Optional.of(currentLoan)
            every { loanRepository.save(capture(loanSlot)) } returns currentLoan.copy(covenantStatus = CovenantStatus.BREACH)

            service.updateStatus(
                loanId,
                UpdateLoanStatusRequest(status = LoanStatus.LIVE, covenantStatus = CovenantStatus.BREACH)
            )

            assertEquals(CovenantStatus.BREACH, loanSlot.captured.covenantStatus)
        }

        @Test
        fun `throws NoSuchElementException when loan ID is unknown`() {
            every { loanRepository.findById(unknownId) } returns Optional.empty()

            val ex = assertThrows<NoSuchElementException> {
                service.updateStatus(unknownId, UpdateLoanStatusRequest(LoanStatus.DEFAULTED))
            }
            assertTrue(ex.message!!.contains(unknownId.toString()))
            verify(exactly = 0) { loanRepository.save(any()) }
        }

        @Test
        fun `ORIGINATION to UNDERWRITING is a valid transition`() {
            val loanSlot = slot<Loan>()
            val currentLoan = loan(status = LoanStatus.ORIGINATION)
            every { loanRepository.findById(loanId) } returns Optional.of(currentLoan)
            every { loanRepository.save(capture(loanSlot)) } returns currentLoan.copy(status = LoanStatus.UNDERWRITING)

            service.updateStatus(loanId, UpdateLoanStatusRequest(LoanStatus.UNDERWRITING))

            assertEquals(LoanStatus.UNDERWRITING, loanSlot.captured.status)
        }

        @Test
        fun `LIVE to DEFAULTED marks covenant as breach`() {
            val loanSlot = slot<Loan>()
            val currentLoan = loan(status = LoanStatus.LIVE, covenantStatus = CovenantStatus.COMPLIANT)
            every { loanRepository.findById(loanId) } returns Optional.of(currentLoan)
            every { loanRepository.save(capture(loanSlot)) } returns currentLoan

            service.updateStatus(
                loanId,
                UpdateLoanStatusRequest(
                    status = LoanStatus.DEFAULTED,
                    covenantStatus = CovenantStatus.BREACH
                )
            )

            assertEquals(LoanStatus.DEFAULTED, loanSlot.captured.status)
            assertEquals(CovenantStatus.BREACH, loanSlot.captured.covenantStatus)
        }
    }

    // =========================================================================
    // ICR edge cases surfaced through the response
    // =========================================================================

    @Nested
    inner class IcrInResponse {

        @Test
        fun `ICR is null in response when loan has no NOI`() {
            every { loanRepository.findById(loanId) } returns Optional.of(
                loan(netOperatingIncome = null)
            )

            val response = service.findById(loanId)

            assertNull(response.icr)
        }

        @Test
        fun `ICR is computed and present when NOI is set`() {
            every { loanRepository.findById(loanId) } returns Optional.of(
                loan(netOperatingIncome = BigDecimal("200000"))
            )

            val response = service.findById(loanId)

            assertNotNull(response.icr)
            // principal = 1,000,000; rate = 10%; annualInterest = 100,000
            // NOI = 200,000; ICR = 2.0
            assertEquals(0, BigDecimal("2.00").compareTo(response.icr))
        }
    }
}
