-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enum for Campaign Statuses
CREATE TYPE campaign_status AS ENUM ('draft', 'verified', 'active', 'completed', 'cancelled');

-- =================================================================
-- 1. CUSTOMERS TABLE
-- =================================================================
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(32),
    last_order_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast dormant customer queries (WHERE last_order_timestamp < threshold)
CREATE INDEX idx_customers_last_order ON customers(last_order_timestamp);

-- =================================================================
-- 2. TRANSACTIONS TABLE
-- =================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for analytical time-window queries (e.g. Evening Sales Drops)
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);

-- =================================================================
-- 3. CAMPAIGN PROPOSALS TABLE
-- =================================================================
CREATE TABLE IF NOT EXISTS campaign_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    discount_amount NUMERIC(10, 2) NOT NULL CHECK (discount_amount > 0),
    min_order_value NUMERIC(10, 2) NOT NULL CHECK (min_order_value >= 0),
    duration_days INT NOT NULL CHECK (duration_days > 0),
    target_cohort_size INT NOT NULL DEFAULT 0,
    status campaign_status NOT NULL DEFAULT 'draft',
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_status ON campaign_proposals(status);

-- =================================================================
-- 4. AUTOMATED UPDATED_AT TRIGGER
-- =================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaign_proposals
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();