DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaign_proposals;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS campaign_proposals;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS customers;

DROP TYPE IF EXISTS campaign_status;