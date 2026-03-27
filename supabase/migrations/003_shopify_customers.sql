-- Shopify customers table for CAC analysis and cohort tracking
CREATE TABLE IF NOT EXISTS shopify_customers (
  customer_id TEXT PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  orders_count INTEGER DEFAULT 0,
  total_spent NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ,
  tags TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cohort analysis
CREATE INDEX IF NOT EXISTS idx_shopify_customers_created_at
  ON shopify_customers (created_at);

-- Index for sync operations
CREATE INDEX IF NOT EXISTS idx_shopify_customers_synced_at
  ON shopify_customers (synced_at);

-- Enable RLS
ALTER TABLE shopify_customers ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage customers"
  ON shopify_customers
  FOR ALL
  USING (true)
  WITH CHECK (true);
