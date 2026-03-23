-- ADM S&OP Platform — Analytics Views & Tables
-- Bridges the gap between raw ingestion tables (001) and the dashboard queries.
-- Created: March 2026

-- 1. products — view over the skus table with column aliases expected by queries.ts
CREATE OR REPLACE VIEW products AS
SELECT
  sku_id        AS id,
  sku_id        AS sku,
  product_title AS name,
  product_type  AS product_line,
  category,
  is_active
FROM skus;

-- 2. sales_daily — aggregates line-item rows from shopify_orders + amazon_orders by date
CREATE OR REPLACE VIEW sales_daily AS
SELECT
  order_date                          AS sale_date,
  sku_id                              AS product_id,
  'shopify'                           AS channel,
  SUM(quantity)                       AS units_sold,
  SUM(gross_revenue)                  AS gross_revenue,
  SUM(net_revenue)                    AS net_revenue,
  SUM(discount_amount)                AS discounts
FROM shopify_orders
GROUP BY order_date, sku_id

UNION ALL

SELECT
  order_date                          AS sale_date,
  COALESCE(sku_id, asin)             AS product_id,
  'amazon'                            AS channel,
  SUM(quantity)                       AS units_sold,
  SUM(revenue)                        AS gross_revenue,
  SUM(revenue)                        AS net_revenue,
  0                                   AS discounts
FROM amazon_orders
GROUP BY order_date, COALESCE(sku_id, asin);

-- 3. ad_daily_spend — denormalised table for ads data across platforms
CREATE TABLE IF NOT EXISTS ad_daily_spend (
  id BIGSERIAL PRIMARY KEY,
  spend_date DATE NOT NULL,
  platform TEXT NOT NULL,
  spend DECIMAL(12,2) NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  revenue_attributed DECIMAL(12,2) NOT NULL DEFAULT 0,
  roas DECIMAL(8,4) NOT NULL DEFAULT 0,
  UNIQUE (spend_date, platform)
);

CREATE INDEX IF NOT EXISTS idx_ad_daily_spend_date ON ad_daily_spend(spend_date);
CREATE INDEX IF NOT EXISTS idx_ad_daily_spend_platform ON ad_daily_spend(platform);

-- 4. demand_forecasts — stores forecast outputs consumed by the dashboard
CREATE TABLE IF NOT EXISTS demand_forecasts (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  baseline_units INTEGER NOT NULL DEFAULT 0,
  forecast_units INTEGER NOT NULL DEFAULT 0,
  seasonality_index DECIMAL(6,4) NOT NULL DEFAULT 1.0,
  marketing_uplift DECIMAL(6,4) NOT NULL DEFAULT 1.0,
  confidence_score DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_demand_forecasts_period ON demand_forecasts(period_start);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_product ON demand_forecasts(product_id);

-- 5. inventory_levels — unified view across Shopify and Amazon inventory
CREATE OR REPLACE VIEW inventory_levels AS
SELECT
  si.id,
  si.snapshot_date,
  'shopify'                              AS channel,
  si.sku_id                              AS product_id,
  si.available                           AS quantity_on_hand,
  0                                      AS quantity_reserved,
  si.available                           AS quantity_available,
  0                                      AS reorder_point,
  0                                      AS days_of_supply
FROM shopify_inventory si

UNION ALL

SELECT
  ai.id,
  ai.snapshot_date,
  'amazon'                               AS channel,
  COALESCE(ai.sku_id, ai.asin)          AS product_id,
  ai.fulfillable_quantity                AS quantity_on_hand,
  ai.inbound_quantity                    AS quantity_reserved,
  ai.fulfillable_quantity                AS quantity_available,
  0                                      AS reorder_point,
  0                                      AS days_of_supply
FROM amazon_inventory ai;
