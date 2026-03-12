export interface SKU {
  sku_id: string;
  sku_title: string;
  product_type: string;
  pack_size: number;
  flavour: string;
  product_title: string;
  category: "drinks" | "tea" | "health_products";
  channel_primary: "Shopify" | "Amazon" | "Both";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopifyOrder {
  order_id: string;
  order_date: string;
  sku_id: string;
  quantity: number;
  gross_revenue: number;
  net_revenue: number;
  discount_amount: number;
  customer_type: "new" | "returning";
  subscription_type: "one-time" | "subscription" | "none";
  channel: string;
  synced_at: string;
}

export interface AmazonOrder {
  order_id: string;
  order_date: string;
  sku_id: string;
  asin: string;
  quantity: number;
  revenue: number;
  marketplace: "UK" | "US" | "EU";
  synced_at: string;
}

export interface MetaAd {
  campaign_id: string;
  campaign_name: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  synced_at: string;
}

export interface AmazonAd {
  campaign_id: string;
  ad_group_id: string;
  asin: string;
  sku_id: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  acos: number;
  roas: number;
  ad_type: "Sponsored Products" | "Sponsored Brands" | "Sponsored Display";
  synced_at: string;
}

export interface Forecast {
  forecast_id: string;
  sku_id: string;
  channel: string;
  month: string;
  forecast_baseline: number;
  forecast_ambitious: number;
  actual_units: number | null;
  forecast_accuracy_pct: number | null;
  ad_spend_planned: number;
  ad_spend_actual: number | null;
  cac_planned: number;
  cac_actual: number | null;
  generated_at: string;
  version: number;
}

export interface CustomerMetrics {
  month: string;
  channel: string;
  new_customers_count: number;
  returning_customers_count: number;
  subscription_customers_count: number;
  one_time_customers_count: number;
  total_cac: number;
  new_customer_cac: number;
  returning_customer_cac: number;
  total_ad_spend: number;
}

export interface LLMRecommendation {
  recommendation_id: string;
  month: string;
  generated_at: string;
  run_type: "daily" | "mid_month_adjustment";
  summary_text: RecommendationContent;
  model_used: string;
}

export interface RecommendationContent {
  executive_summary: string;
  trends: string[];
  anomalies: string[];
  recommendations: ActionableRecommendation[];
  baseline_comparison: string;
  ambitious_comparison: string;
}

export interface ActionableRecommendation {
  priority: "high" | "medium" | "low";
  category: string;
  action: string;
  rationale: string;
  expected_impact: string;
}

export interface ProductionPlan {
  plan_id: string;
  sku_id: string;
  month: string;
  units_to_produce: number;
  lead_time_weeks: number;
  max_capacity: number | null;
  actual_produced: number | null;
  status: "planned" | "in_progress" | "completed";
}

export interface ForecastParameters {
  parameter_id: string;
  sku_id: string;
  channel: string;
  baseline_method: "moving_average_8w" | "exponential_smoothing";
  seasonality_index: number;
  marketing_uplift_factor: number;
  price_impact_factor: number;
  channel_effect_factor: number;
  valid_from: string;
  valid_to: string | null;
}

export interface KPIData {
  total_revenue: number;
  revenue_mom_change: number;
  forecast_accuracy: number;
  accuracy_mom_change: number;
  total_ad_spend: number;
  ad_spend_mom_change: number;
  average_cac: number;
  cac_mom_change: number;
  gap_to_baseline: number;
  gap_to_ambitious: number;
}

export interface ForecastTableRow {
  month: string;
  forecast_baseline: number;
  forecast_ambitious: number;
  actual: number | null;
  accuracy_pct: number | null;
  mtd_performance: number | null;
  gap_baseline: number | null;
  gap_baseline_pct: number | null;
  gap_ambitious: number | null;
  gap_ambitious_pct: number | null;
  mom_change: number | null;
}

export interface SKUTableRow {
  sku_id: string;
  sku_title: string;
  product_type: string;
  category: string;
  months: Record<string, {
    forecast_baseline: number;
    forecast_ambitious: number;
    actual: number | null;
    accuracy_pct: number | null;
    mom_change: number | null;
  }>;
}

export interface AdSpendTableRow {
  month: string;
  platform: string;
  spend_actual: number;
  spend_budgeted: number;
  variance: number;
  variance_pct: number;
  mom_trend: number;
}

export interface CACTableRow {
  month: string;
  channel: string;
  new_customers: number;
  new_cac: number;
  returning_customers: number;
  returning_cac: number;
  subscription_count: number;
  subscription_revenue: number;
  one_time_count: number;
  total_cac: number;
  cac_mom_change: number;
}

export type Channel = "all" | "shopify" | "amazon";
export type ProductCategory = "all" | "drinks" | "tea" | "health_products";
export type CustomerType = "all" | "new" | "returning";
export type AdsPlatform = "all" | "meta" | "amazon_ads";
export type TimeRange = "mtd" | "ytd" | "3m" | "6m" | "12m";

export interface DashboardFilters {
  channel: Channel;
  category: ProductCategory;
  customerType: CustomerType;
  adsPlatform: AdsPlatform;
  selectedMonth: string;
  timeRange: TimeRange;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
