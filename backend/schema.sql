-- =============================================================================
-- LendGraph — PostgreSQL Schema
-- =============================================================================
-- Apply to a fresh database:
--   createdb lendgraph
--   psql -U lendgraph -d lendgraph -f schema.sql
--
-- Table dependency order (safe for a clean run):
--   borrowers → loans → drawdowns
--                     → repayments
--                     → loan_investor_allocations → investors
--   investors → investor_capital_events
--   loans     → loan_status_history
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- =============================================================================
-- UTILITY: auto-set updated_at on any table that carries it
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =============================================================================
-- 1. BORROWERS
--    One borrower (legal entity) can have many loans.
-- =============================================================================
CREATE TABLE borrowers (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name       TEXT         NOT NULL,

    -- UK Companies House number; 8 chars, zero-padded
    company_reg_number VARCHAR(8)   NOT NULL
        CONSTRAINT uq_borrowers_reg_number UNIQUE,

    contact_name       TEXT,
    contact_email      TEXT,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  borrowers                    IS 'Legal entities that borrow money from the fund.';
COMMENT ON COLUMN borrowers.company_reg_number IS 'UK Companies House registration number (8 digits, zero-padded).';

CREATE TRIGGER trg_borrowers_updated_at
    BEFORE UPDATE ON borrowers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 2. LOANS
--    Many-to-one with borrowers (one borrower, many loans over time).
--
--    Key constraints enforced here:
--      • interest_rate  >= 0       (cannot be negative)
--      • LTV            <= 100 %   (total debt cannot exceed full property value)
--      • maturity_date  > start_date
--      • principal_amount > 0
-- =============================================================================
CREATE TABLE loans (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Human-readable reference used by the front end (e.g. "L001")
    reference            VARCHAR(20)   NOT NULL
        CONSTRAINT uq_loans_reference UNIQUE,

    -- ── Many-to-one: borrower ──────────────────────────────────────────────
    borrower_id          UUID          NOT NULL
        CONSTRAINT fk_loans_borrower
            REFERENCES borrowers(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,     -- prevent orphan deletion of a borrower with loans

    -- ── Core financial terms ───────────────────────────────────────────────
    principal_amount     NUMERIC(19,2) NOT NULL
        CONSTRAINT chk_loans_principal_positive
            CHECK (principal_amount > 0),

    -- Annual rate stored as a percentage (e.g. 10.0 = 10%).
    -- Enforced non-negative at the DB level.
    interest_rate        NUMERIC(7,4)  NOT NULL
        CONSTRAINT chk_loans_interest_rate_non_negative
            CHECK (interest_rate >= 0),

    -- RICS / independent market valuation of the security property
    valuation            NUMERIC(19,2) NOT NULL
        CONSTRAINT chk_loans_valuation_positive
            CHECK (valuation > 0),

    -- Senior debt ranking ahead of this loan (may be zero)
    existing_debt        NUMERIC(19,2) NOT NULL DEFAULT 0
        CONSTRAINT chk_loans_existing_debt_non_negative
            CHECK (existing_debt >= 0),

    -- ── LTV guard ─────────────────────────────────────────────────────────
    -- LTV = (existing_debt + principal_amount) / valuation
    -- Must not exceed 100 %. Stored valuation is used as the denominator.
    CONSTRAINT chk_loans_ltv_max_100_pct
        CHECK ((existing_debt + principal_amount) <= valuation),

    -- ── Supplementary fields ──────────────────────────────────────────────
    property_address     TEXT,
    loan_purpose         TEXT,

    -- Annual net operating income of the underlying asset (used for ICR)
    net_operating_income NUMERIC(19,2)
        CONSTRAINT chk_loans_noi_non_negative
            CHECK (net_operating_income IS NULL OR net_operating_income >= 0),

    -- ── Lifecycle dates ───────────────────────────────────────────────────
    start_date           DATE          NOT NULL,
    maturity_date        DATE          NOT NULL
        CONSTRAINT chk_loans_maturity_after_start
            CHECK (maturity_date > start_date),

    -- ── Status ────────────────────────────────────────────────────────────
    status               VARCHAR(20)   NOT NULL DEFAULT 'ORIGINATION'
        CONSTRAINT chk_loans_status
            CHECK (status IN ('ORIGINATION','UNDERWRITING','LIVE','DEFAULTED')),

    covenant_status      VARCHAR(20)   NOT NULL DEFAULT 'COMPLIANT'
        CONSTRAINT chk_loans_covenant_status
            CHECK (covenant_status IN ('COMPLIANT','BREACH')),

    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  loans                    IS 'Individual bridge-loan facilities originated by the fund.';
COMMENT ON COLUMN loans.interest_rate      IS 'Annual interest rate as a percentage (e.g. 10.0 = 10%). Must be >= 0.';
COMMENT ON COLUMN loans.valuation          IS 'RICS independent valuation of the security property at origination.';
COMMENT ON COLUMN loans.existing_debt      IS 'Senior debt ranking ahead of this loan. Included in LTV denominator.';
COMMENT ON COLUMN loans.principal_amount   IS 'Net amount disbursed / to be disbursed to the borrower. May be drawn in tranches — see drawdowns table.';

CREATE INDEX idx_loans_borrower_id ON loans(borrower_id);
CREATE INDEX idx_loans_status      ON loans(status);
CREATE INDEX idx_loans_start_date  ON loans(start_date);

CREATE TRIGGER trg_loans_updated_at
    BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 3. LOAN STATUS HISTORY  (audit trail)
--    Immutable record of every status change so we can reconstruct a loan's
--    lifecycle without relying on loans.status alone.
-- =============================================================================
CREATE TABLE loan_status_history (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id    UUID        NOT NULL
        CONSTRAINT fk_lsh_loan
            REFERENCES loans(id)
            ON DELETE CASCADE,
    old_status VARCHAR(20),                -- NULL on first insert
    new_status VARCHAR(20) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by TEXT                        -- application username / service account
);

COMMENT ON TABLE loan_status_history IS 'Immutable audit log of loan status transitions.';

CREATE INDEX idx_lsh_loan_id ON loan_status_history(loan_id);

-- =============================================================================
-- 4. DRAWDOWNS
--    Tracks each tranche of cash actually wired to the borrower against a loan.
--    A loan may be drawn in multiple tranches (e.g. development facilities).
--    The sum of all drawdown amounts should not exceed loans.principal_amount.
-- =============================================================================
CREATE TABLE drawdowns (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

    loan_id        UUID          NOT NULL
        CONSTRAINT fk_drawdowns_loan
            REFERENCES loans(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,   -- don't silently delete disbursement records

    -- Sequential tranche number within this loan, e.g. 1, 2, 3 …
    tranche_number SMALLINT      NOT NULL DEFAULT 1
        CONSTRAINT chk_drawdowns_tranche_positive
            CHECK (tranche_number > 0),

    drawdown_date  DATE          NOT NULL,

    amount         NUMERIC(19,2) NOT NULL
        CONSTRAINT chk_drawdowns_amount_positive
            CHECK (amount > 0),

    -- Bank / payment reference for reconciliation
    payment_reference TEXT,

    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_drawdowns_loan_tranche UNIQUE (loan_id, tranche_number)
);

COMMENT ON TABLE  drawdowns                IS 'Each row is a single cash disbursement (tranche) from the fund to the borrower.';
COMMENT ON COLUMN drawdowns.tranche_number IS 'Monotonically increasing tranche index per loan. Must be unique per loan.';
COMMENT ON COLUMN drawdowns.amount         IS 'GBP amount wired on this date. Sum across all tranches <= loans.principal_amount.';

CREATE INDEX idx_drawdowns_loan_id      ON drawdowns(loan_id);
CREATE INDEX idx_drawdowns_drawdown_date ON drawdowns(drawdown_date);

-- =============================================================================
-- 5. REPAYMENTS
--    Borrower repayments broken down into interest and principal components.
-- =============================================================================
CREATE TABLE repayments (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

    loan_id          UUID          NOT NULL
        CONSTRAINT fk_repayments_loan
            REFERENCES loans(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,

    payment_date     DATE          NOT NULL,

    interest_amount  NUMERIC(19,2) NOT NULL DEFAULT 0
        CONSTRAINT chk_repayments_interest_non_negative
            CHECK (interest_amount >= 0),

    principal_amount NUMERIC(19,2) NOT NULL DEFAULT 0
        CONSTRAINT chk_repayments_principal_non_negative
            CHECK (principal_amount >= 0),

    -- At least one of the two components must be > 0
    CONSTRAINT chk_repayments_non_zero
        CHECK (interest_amount > 0 OR principal_amount > 0),

    notes            TEXT,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE repayments IS 'Borrower cash repayments split into interest and principal components.';

CREATE INDEX idx_repayments_loan_id      ON repayments(loan_id);
CREATE INDEX idx_repayments_payment_date ON repayments(payment_date);

-- =============================================================================
-- 6. INVESTORS
--    Fund LPs / capital providers.
-- =============================================================================
CREATE TABLE investors (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT          NOT NULL,

    -- Maximum capital this investor has legally committed to the fund
    total_commitment NUMERIC(19,2) NOT NULL
        CONSTRAINT chk_investors_commitment_positive
            CHECK (total_commitment > 0),

    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  investors                IS 'Fund investors (LPs) who provide capital deployed into loans.';
COMMENT ON COLUMN investors.total_commitment IS 'Total capital committed by this investor, whether or not yet drawn.';

CREATE TRIGGER trg_investors_updated_at
    BEFORE UPDATE ON investors
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 7. LOAN_INVESTOR_ALLOCATIONS  (many-to-many: loans ↔ investors)
--    Records how each loan's principal is funded across one or more investors.
--    Many investors can co-fund a single loan; one investor can fund many loans.
-- =============================================================================
CREATE TABLE loan_investor_allocations (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── Many-to-many FKs ──────────────────────────────────────────────────
    loan_id     UUID          NOT NULL
        CONSTRAINT fk_lia_loan
            REFERENCES loans(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,

    investor_id UUID          NOT NULL
        CONSTRAINT fk_lia_investor
            REFERENCES investors(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,  -- block investor deletion if they have live allocations

    -- ── Allocation terms ──────────────────────────────────────────────────
    -- GBP amount this investor has committed to this specific loan
    amount      NUMERIC(19,2) NOT NULL
        CONSTRAINT chk_lia_amount_positive
            CHECK (amount > 0),

    -- Percentage share of the loan funded by this investor (0–100, exclusive)
    percentage  NUMERIC(6,3)  NOT NULL
        CONSTRAINT chk_lia_percentage_range
            CHECK (percentage > 0 AND percentage <= 100),

    allocated_at DATE         NOT NULL DEFAULT CURRENT_DATE,
    notes        TEXT,

    -- One investor may appear only once per loan
    CONSTRAINT uq_lia_investor_loan UNIQUE (investor_id, loan_id)
);

COMMENT ON TABLE  loan_investor_allocations IS 'Junction table implementing the many-to-many relationship between loans and investors. Each row records one investor''s capital allocation to one loan.';
COMMENT ON COLUMN loan_investor_allocations.percentage IS 'Investor''s percentage share of this loan (must be > 0 and <= 100). The sum of percentages across all investors for a given loan should equal 100.';

CREATE INDEX idx_lia_loan_id     ON loan_investor_allocations(loan_id);
CREATE INDEX idx_lia_investor_id ON loan_investor_allocations(investor_id);

-- =============================================================================
-- 8. INVESTOR_CAPITAL_EVENTS
--    Tracks when investors actually wire money into the fund (capital calls)
--    or receive money back (distributions / redemptions).
--    Distinct from drawdowns, which track money flowing out to borrowers.
-- =============================================================================
CREATE TABLE investor_capital_events (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

    investor_id UUID          NOT NULL
        CONSTRAINT fk_ice_investor
            REFERENCES investors(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,

    event_date  DATE          NOT NULL,

    amount      NUMERIC(19,2) NOT NULL
        CONSTRAINT chk_ice_amount_positive
            CHECK (amount > 0),

    -- CALL   = investor wires money into the fund
    -- DISTRIBUTION = fund returns money (interest / principal) to the investor
    event_type  VARCHAR(20)   NOT NULL
        CONSTRAINT chk_ice_event_type
            CHECK (event_type IN ('CALL','DISTRIBUTION')),

    -- Optional link to a specific allocation this event relates to
    allocation_id UUID
        CONSTRAINT fk_ice_allocation
            REFERENCES loan_investor_allocations(id)
            ON DELETE SET NULL,

    payment_reference TEXT,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  investor_capital_events          IS 'Capital calls (investor → fund) and distributions (fund → investor). Separate from drawdowns, which track fund → borrower flows.';
COMMENT ON COLUMN investor_capital_events.event_type IS 'CALL = investor wires capital into the fund. DISTRIBUTION = fund returns money to the investor.';

CREATE INDEX idx_ice_investor_id ON investor_capital_events(investor_id);
CREATE INDEX idx_ice_event_date  ON investor_capital_events(event_date);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Current LTV for every active loan (denominator is valuation at origination)
CREATE OR REPLACE VIEW v_loan_ltv AS
SELECT
    l.id                                                         AS loan_id,
    l.reference,
    b.company_name                                               AS borrower_name,
    l.principal_amount,
    l.existing_debt,
    l.valuation,
    ROUND(
        (l.existing_debt + l.principal_amount) / l.valuation * 100,
        2
    )                                                            AS ltv_pct,
    l.status
FROM loans l
JOIN borrowers b ON b.id = l.borrower_id;

COMMENT ON VIEW v_loan_ltv IS 'Convenience view: LTV percentage for every loan. LTV = (existing_debt + principal_amount) / valuation * 100.';

-- Weighted-average LTV across LIVE loans (used by the dashboard)
CREATE OR REPLACE VIEW v_portfolio_wa_ltv AS
SELECT
    ROUND(
        SUM(l.principal_amount * ((l.existing_debt + l.principal_amount) / l.valuation * 100))
        / NULLIF(SUM(l.principal_amount), 0),
        2
    ) AS weighted_average_ltv_pct,
    COUNT(*)            AS loan_count,
    SUM(l.principal_amount) AS total_principal
FROM loans l
WHERE l.status = 'LIVE';

COMMENT ON VIEW v_portfolio_wa_ltv IS 'Weighted-average LTV across all LIVE loans, weighted by principal amount.';

-- Per-loan capital allocation summary
CREATE OR REPLACE VIEW v_loan_allocation_summary AS
SELECT
    l.id           AS loan_id,
    l.reference,
    l.principal_amount,
    COUNT(lia.id)                    AS investor_count,
    SUM(lia.amount)                  AS total_allocated,
    ROUND(SUM(lia.percentage), 3)    AS total_pct_allocated,
    l.principal_amount - COALESCE(SUM(lia.amount), 0) AS unallocated_amount
FROM loans l
LEFT JOIN loan_investor_allocations lia ON lia.loan_id = l.id
GROUP BY l.id, l.reference, l.principal_amount;

COMMENT ON VIEW v_loan_allocation_summary IS 'Per-loan rollup of investor allocations, highlighting any unallocated principal.';

-- Cash sent to borrowers (drawdown progress per loan)
CREATE OR REPLACE VIEW v_loan_drawdown_progress AS
SELECT
    l.id                              AS loan_id,
    l.reference,
    l.principal_amount                AS facility_amount,
    COUNT(d.id)                       AS tranche_count,
    COALESCE(SUM(d.amount), 0)        AS total_drawn,
    l.principal_amount
        - COALESCE(SUM(d.amount), 0)  AS remaining_to_draw,
    ROUND(
        COALESCE(SUM(d.amount), 0)
        / l.principal_amount * 100,
        2
    )                                 AS draw_pct
FROM loans l
LEFT JOIN drawdowns d ON d.loan_id = l.id
GROUP BY l.id, l.reference, l.principal_amount;

COMMENT ON VIEW v_loan_drawdown_progress IS 'How much of each loan facility has been disbursed to the borrower across all tranches.';

COMMIT;
