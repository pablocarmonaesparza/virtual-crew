create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.skus (
  sku_id text primary key,
  sku_title text not null,
  product_type text,
  pack_size integer,
  flavour text,
  product_title text not null,
  category text not null,
  channel_primary text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists skus_set_updated_at on public.skus;
create trigger skus_set_updated_at
before update on public.skus
for each row
execute function public.set_updated_at();

create table if not exists public.shopify_orders (
  order_line_id text primary key,
  order_id text not null,
  order_date timestamptz not null,
  sku_id text references public.skus (sku_id),
  quantity integer not null check (quantity >= 0),
  gross_revenue numeric(12, 2) not null default 0,
  net_revenue numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  customer_type text not null default 'unknown',
  subscription_type text not null default 'none',
  channel text not null default 'D2C/Shopify',
  synced_at timestamptz not null default now()
);

create table if not exists public.amazon_orders (
  order_line_id text primary key,
  order_id text not null,
  order_date timestamptz not null,
  sku_id text references public.skus (sku_id),
  asin text,
  quantity integer not null check (quantity >= 0),
  revenue numeric(12, 2) not null default 0,
  marketplace text not null,
  synced_at timestamptz not null default now()
);

create table if not exists public.shopify_inventory (
  inventory_snapshot_id bigint generated always as identity primary key,
  sku_id text references public.skus (sku_id),
  location_id text not null,
  available integer not null default 0,
  committed integer not null default 0,
  on_hand integer not null default 0,
  snapshot_date date not null
);

create table if not exists public.amazon_inventory (
  inventory_snapshot_id bigint generated always as identity primary key,
  sku_id text references public.skus (sku_id),
  asin text,
  fulfillable_quantity integer not null default 0,
  inbound_quantity integer not null default 0,
  snapshot_date date not null
);

create table if not exists public.meta_ads (
  meta_ads_id bigint generated always as identity primary key,
  campaign_id text not null,
  campaign_name text not null,
  date date not null,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  spend numeric(12, 2) not null default 0,
  conversions numeric(12, 2) not null default 0,
  ctr numeric(8, 4) not null default 0,
  cpc numeric(12, 4) not null default 0,
  synced_at timestamptz not null default now()
);

create table if not exists public.amazon_ads (
  amazon_ads_id bigint generated always as identity primary key,
  campaign_id text not null,
  ad_group_id text,
  sku_id text references public.skus (sku_id),
  asin text,
  date date not null,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  spend numeric(12, 2) not null default 0,
  sales numeric(12, 2) not null default 0,
  acos numeric(10, 4) not null default 0,
  roas numeric(10, 4) not null default 0,
  ad_type text not null,
  synced_at timestamptz not null default now()
);

create table if not exists public.forecasts (
  forecast_id bigint generated always as identity primary key,
  sku_id text references public.skus (sku_id),
  channel text not null,
  month date not null,
  forecast_baseline numeric(12, 2) not null,
  forecast_ambitious numeric(12, 2) not null,
  actual_units numeric(12, 2),
  forecast_accuracy_pct numeric(8, 2),
  ad_spend_planned numeric(12, 2),
  ad_spend_actual numeric(12, 2),
  cac_planned numeric(12, 2),
  cac_actual numeric(12, 2),
  generated_at timestamptz not null default now(),
  version text not null
);

create table if not exists public.forecast_parameters (
  parameter_id bigint generated always as identity primary key,
  sku_id text references public.skus (sku_id),
  channel text not null,
  baseline_method text not null,
  seasonality_index numeric(10, 4),
  marketing_uplift_factor numeric(10, 4),
  price_impact_factor numeric(10, 4),
  channel_effect_factor numeric(10, 4),
  valid_from date not null,
  valid_to date
);

create table if not exists public.customer_metrics (
  customer_metrics_id bigint generated always as identity primary key,
  month date not null,
  channel text not null,
  new_customers_count integer not null default 0,
  returning_customers_count integer not null default 0,
  subscription_customers_count integer not null default 0,
  one_time_customers_count integer not null default 0,
  total_cac numeric(12, 2),
  new_customer_cac numeric(12, 2),
  returning_customer_cac numeric(12, 2),
  total_ad_spend numeric(12, 2)
);

create table if not exists public.production_plans (
  plan_id bigint generated always as identity primary key,
  sku_id text references public.skus (sku_id),
  month date not null,
  units_to_produce integer not null default 0,
  lead_time_weeks integer,
  max_capacity integer,
  actual_produced integer,
  status text not null default 'planned'
);

create table if not exists public.llm_recommendations (
  recommendation_id bigint generated always as identity primary key,
  month date not null,
  generated_at timestamptz not null default now(),
  run_type text not null,
  summary_text jsonb not null,
  raw_prompt text,
  model_used text not null
);

create table if not exists public.ambitious_targets (
  target_id bigint generated always as identity primary key,
  sku_id text references public.skus (sku_id),
  month date not null,
  target_units numeric(12, 2) not null,
  target_revenue numeric(12, 2)
);

create unique index if not exists idx_shopify_orders_order_sku
  on public.shopify_orders (order_id, sku_id, order_line_id);

create unique index if not exists idx_amazon_orders_order_sku
  on public.amazon_orders (order_id, sku_id, order_line_id);

create unique index if not exists idx_shopify_inventory_snapshot
  on public.shopify_inventory (sku_id, location_id, snapshot_date);

create unique index if not exists idx_amazon_inventory_snapshot
  on public.amazon_inventory (coalesce(sku_id, ''), coalesce(asin, ''), snapshot_date);

create unique index if not exists idx_meta_ads_campaign_date
  on public.meta_ads (campaign_id, date);

create unique index if not exists idx_amazon_ads_campaign_date
  on public.amazon_ads (campaign_id, coalesce(ad_group_id, ''), coalesce(sku_id, ''), date);

create unique index if not exists idx_forecasts_sku_month_channel_version
  on public.forecasts (coalesce(sku_id, ''), month, channel, version);

create unique index if not exists idx_customer_metrics_month_channel
  on public.customer_metrics (month, channel);

create unique index if not exists idx_production_plans_sku_month
  on public.production_plans (coalesce(sku_id, ''), month);

create unique index if not exists idx_ambitious_targets_sku_month
  on public.ambitious_targets (coalesce(sku_id, ''), month);

create index if not exists idx_shopify_orders_order_date
  on public.shopify_orders (order_date);

create index if not exists idx_shopify_orders_sku_order_date
  on public.shopify_orders (sku_id, order_date);

create index if not exists idx_amazon_orders_order_date
  on public.amazon_orders (order_date);

create index if not exists idx_amazon_orders_sku_order_date
  on public.amazon_orders (sku_id, order_date);

create index if not exists idx_shopify_inventory_snapshot_date
  on public.shopify_inventory (snapshot_date);

create index if not exists idx_amazon_inventory_snapshot_date
  on public.amazon_inventory (snapshot_date);

create index if not exists idx_meta_ads_date
  on public.meta_ads (date);

create index if not exists idx_amazon_ads_date
  on public.amazon_ads (date);

create index if not exists idx_forecasts_month_channel
  on public.forecasts (month, channel);

create index if not exists idx_forecasts_sku_month_channel
  on public.forecasts (sku_id, month, channel);

create index if not exists idx_forecast_parameters_validity
  on public.forecast_parameters (sku_id, channel, valid_from, valid_to);

create index if not exists idx_customer_metrics_channel_month
  on public.customer_metrics (channel, month);

create index if not exists idx_production_plans_month
  on public.production_plans (month);

create index if not exists idx_llm_recommendations_month
  on public.llm_recommendations (month);

create index if not exists idx_ambitious_targets_month
  on public.ambitious_targets (month);
