-- ADM S&OP Platform — Initial Database Schema
-- Agua de Madre (ADM) Sales & Operations Planning
-- Created: March 2026

-- 1. SKU Master Table
CREATE TABLE IF NOT EXISTS skus (
  sku_id TEXT PRIMARY KEY,
  sku_title TEXT NOT NULL,
  product_type TEXT NOT NULL,
  pack_size INTEGER NOT NULL,
  flavour TEXT,
  product_title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('drinks', 'tea', 'health_products')),
  channel_primary TEXT NOT NULL CHECK (channel_primary IN ('Shopify', 'Amazon', 'Both')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Shopify Orders (one row per line item)
CREATE TABLE IF NOT EXISTS shopify_orders (
  order_id TEXT NOT NULL,
  line_item_id TEXT NOT NULL,
  order_date DATE NOT NULL,
  sku_id TEXT NOT NULL REFERENCES skus(sku_id),
  quantity INTEGER NOT NULL,
  gross_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('new', 'returning')),
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('one-time', 'subscription', 'none')),
  channel TEXT NOT NULL DEFAULT 'D2C/Shopify',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, line_item_id)
);

-- 3. Amazon Orders (one row per line item)
CREATE TABLE IF NOT EXISTS amazon_orders (
  order_id TEXT NOT NULL,
  line_item_id TEXT NOT NULL,
  order_date DATE NOT NULL,
  sku_id TEXT REFERENCES skus(sku_id),
  asin TEXT,
  quantity INTEGER NOT NULL,
  revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  marketplace TEXT NOT NULL CHECK (marketplace IN ('UK', 'US', 'EU')),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, line_item_id)
);

-- 4. Shopify Inventory
CREATE TABLE IF NOT EXISTS shopify_inventory (
  id BIGSERIAL PRIMARY KEY,
  sku_id TEXT NOT NULL REFERENCES skus(sku_id),
  location_id TEXT NOT NULL,
  available INTEGER NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL,
  UNIQUE (sku_id, location_id, snapshot_date)
);

-- 5. Amazon Inventory
CREATE TABLE IF NOT EXISTS amazon_inventory (
  id BIGSERIAL PRIMARY KEY,
  sku_id TEXT REFERENCES skus(sku_id),
  asin TEXT,
  fulfillable_quantity INTEGER NOT NULL DEFAULT 0,
  inbound_quantity INTEGER NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL,
  UNIQUE (COALESCE(sku_id, ''), COALESCE(asin, ''), snapshot_date)
);

-- 6. Meta Ads (by campaign, NOT by SKU)
CREATE TABLE IF NOT EXISTS meta_ads (
  id BIGSERIAL PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  spend DECIMAL(12,2) NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  ctr DECIMAL(8,4) NOT NULL DEFAULT 0,
  cpc DECIMAL(8,4) NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, date)
);

-- 7. Amazon Ads (by ASIN/SKU)
CREATE TABLE IF NOT EXISTS amazon_ads (
  id BIGSERIAL PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  ad_group_id TEXT,
  asin TEXT,
  sku_id TEXT REFERENCES skus(sku_id),
  date DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  spend DECIMAL(12,2) NOT NULL DEFAULT 0,
  sales DECIMAL(12,2) NOT NULL DEFAULT 0,
  acos DECIMAL(8,4) NOT NULL DEFAULT 0,
  roas DECIMAL(8,4) NOT NULL DEFAULT 0,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('Sponsored Products', 'Sponsored Brands', 'Sponsored Display')),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, COALESCE(ad_group_id, ''), date)
);

-- 8. Forecasts
CREATE TABLE IF NOT EXISTS forecasts (
  forecast_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  sku_id TEXT NOT NULL REFERENCES skus(sku_id),
  channel TEXT NOT NULL,
  month TEXT NOT NULL,
  forecast_baseline INTEGER NOT NULL DEFAULT 0,
  forecast_ambitious INTEGER NOT NULL DEFAULT 0,
  actual_units INTEGER,
  forecast_accuracy_pct DECIMAL(8,2),
  ad_spend_planned DECIMAL(12,2) NOT NULL DEFAULT 0,
  ad_spend_actual DECIMAL(12,2),
  cac_planned DECIMAL(8,2) NOT NULL DEFAULT 0,
  cac_actual DECIMAL(8,2),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1
);

-- 9. Forecast Parameters
CREATE TABLE IF NOT EXISTS forecast_parameters (
  parameter_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  sku_id TEXT NOT NULL REFERENCES skus(sku_id),
  channel TEXT NOT NULL,
  baseline_method TEXT NOT NULL CHECK (baseline_method IN ('moving_average_8w', 'exponential_smoothing')),
  seasonality_index DECIMAL(6,4) NOT NULL DEFAULT 1.0,
  marketing_uplift_factor DECIMAL(6,4) NOT NULL DEFAULT 1.0,
  price_impact_factor DECIMAL(6,4) NOT NULL DEFAULT 1.0,
  channel_effect_factor DECIMAL(6,4) NOT NULL DEFAULT 1.0,
  valid_from DATE NOT NULL,
  valid_to DATE
);

-- 10. Customer Metrics
CREATE TABLE IF NOT EXISTS customer_metrics (
  id BIGSERIAL PRIMARY KEY,
  month TEXT NOT NULL,
  channel TEXT NOT NULL,
  new_customers_count INTEGER NOT NULL DEFAULT 0,
  returning_customers_count INTEGER NOT NULL DEFAULT 0,
  subscription_customers_count INTEGER NOT NULL DEFAULT 0,
  one_time_customers_count INTEGER NOT NULL DEFAULT 0,
  total_cac DECIMAL(8,2) NOT NULL DEFAULT 0,
  new_customer_cac DECIMAL(8,2) NOT NULL DEFAULT 0,
  returning_customer_cac DECIMAL(8,2) NOT NULL DEFAULT 0,
  total_ad_spend DECIMAL(12,2) NOT NULL DEFAULT 0,
  UNIQUE (month, channel)
);

-- 11. Production Plans
CREATE TABLE IF NOT EXISTS production_plans (
  plan_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  sku_id TEXT NOT NULL REFERENCES skus(sku_id),
  month TEXT NOT NULL,
  units_to_produce INTEGER NOT NULL DEFAULT 0,
  lead_time_weeks INTEGER NOT NULL DEFAULT 8,
  max_capacity INTEGER,
  actual_produced INTEGER,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed')) DEFAULT 'planned'
);

-- 12. LLM Recommendations
CREATE TABLE IF NOT EXISTS llm_recommendations (
  recommendation_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  month TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_type TEXT NOT NULL CHECK (run_type IN ('daily', 'mid_month_adjustment')),
  summary_text JSONB NOT NULL,
  raw_prompt TEXT,
  model_used TEXT NOT NULL DEFAULT 'claude-sonnet-4-6'
);

-- 13. Ambitious Targets (top-down from VC/investor plan)
CREATE TABLE IF NOT EXISTS ambitious_targets (
  id BIGSERIAL PRIMARY KEY,
  sku_id TEXT NOT NULL REFERENCES skus(sku_id),
  month TEXT NOT NULL,
  target_units INTEGER NOT NULL DEFAULT 0,
  target_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  UNIQUE (sku_id, month)
);

-- INDEXES

CREATE INDEX IF NOT EXISTS idx_shopify_orders_date ON shopify_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_sku ON shopify_orders(sku_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_sku_date ON shopify_orders(sku_id, order_date);

CREATE INDEX IF NOT EXISTS idx_amazon_orders_date ON amazon_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_amazon_orders_sku ON amazon_orders(sku_id);
CREATE INDEX IF NOT EXISTS idx_amazon_orders_asin ON amazon_orders(asin);

CREATE INDEX IF NOT EXISTS idx_meta_ads_date ON meta_ads(date);
CREATE INDEX IF NOT EXISTS idx_meta_ads_campaign_date ON meta_ads(campaign_id, date);

CREATE INDEX IF NOT EXISTS idx_amazon_ads_date ON amazon_ads(date);
CREATE INDEX IF NOT EXISTS idx_amazon_ads_sku ON amazon_ads(sku_id);
CREATE INDEX IF NOT EXISTS idx_amazon_ads_asin_date ON amazon_ads(asin, date);

CREATE INDEX IF NOT EXISTS idx_forecasts_sku_month ON forecasts(sku_id, month);
CREATE INDEX IF NOT EXISTS idx_forecasts_channel_month ON forecasts(channel, month);
CREATE INDEX IF NOT EXISTS idx_forecasts_month ON forecasts(month);

CREATE INDEX IF NOT EXISTS idx_customer_metrics_month ON customer_metrics(month);

CREATE INDEX IF NOT EXISTS idx_production_plans_sku_month ON production_plans(sku_id, month);

CREATE INDEX IF NOT EXISTS idx_llm_recommendations_month ON llm_recommendations(month);
