import type {
  SKU,
  KPIData,
  ForecastTableRow,
  SKUTableRow,
  AdSpendTableRow,
  CACTableRow,
  CustomerMetrics,
  LLMRecommendation,
  ChatMessage,
} from "@/types";

export const MOCK_SKUS: SKU[] = [
  { sku_id: "ADMREMXC3", sku_title: "ADMREMXC3", product_type: "Romedio Infusion", pack_size: 3, flavour: "Lemon & Ginger", product_title: "Romedio Infusion Lemon & Ginger 3-Pack", category: "tea", channel_primary: "Both", is_active: true, created_at: "2024-01-01", updated_at: "2026-03-01" },
  { sku_id: "ADMREMXC6", sku_title: "ADMREMXC6", product_type: "Romedio Infusion", pack_size: 6, flavour: "Mixed", product_title: "Romedio Infusion Mixed 6-Pack", category: "tea", channel_primary: "Both", is_active: true, created_at: "2024-01-01", updated_at: "2026-03-01" },
  { sku_id: "ADMREMXC12", sku_title: "ADMREMXC12", product_type: "Romedio Infusion", pack_size: 12, flavour: "Turmeric", product_title: "Romedio Infusion Turmeric 12-Pack", category: "tea", channel_primary: "Shopify", is_active: true, created_at: "2024-01-01", updated_at: "2026-03-01" },
  { sku_id: "ADMWKBLK6", sku_title: "ADMWKBLK6", product_type: "Water Kefir", pack_size: 6, flavour: "Blackcurrant", product_title: "Water Kefir Blackcurrant 6-Pack", category: "drinks", channel_primary: "Both", is_active: true, created_at: "2024-01-01", updated_at: "2026-03-01" },
  { sku_id: "ADMWKLMG6", sku_title: "ADMWKLMG6", product_type: "Water Kefir", pack_size: 6, flavour: "Lemon & Ginger", product_title: "Water Kefir Lemon & Ginger 6-Pack", category: "drinks", channel_primary: "Both", is_active: true, created_at: "2024-01-01", updated_at: "2026-03-01" },
  { sku_id: "ADMWKMIX12", sku_title: "ADMWKMIX12", product_type: "Water Kefir", pack_size: 12, flavour: "Mixed", product_title: "Water Kefir Mixed 12-Pack", category: "drinks", channel_primary: "Amazon", is_active: true, created_at: "2024-01-01", updated_at: "2026-03-01" },
  { sku_id: "ADMCSTUR3", sku_title: "ADMCSTUR3", product_type: "Culture Shots", pack_size: 3, flavour: "Turmeric", product_title: "Culture Shots Turmeric 3-Pack", category: "health_products", channel_primary: "Shopify", is_active: true, created_at: "2024-06-01", updated_at: "2026-03-01" },
  { sku_id: "ADMCSLMG6", sku_title: "ADMCSLMG6", product_type: "Culture Shots", pack_size: 6, flavour: "Lemon & Ginger", product_title: "Culture Shots Lemon & Ginger 6-Pack", category: "health_products", channel_primary: "Both", is_active: true, created_at: "2024-06-01", updated_at: "2026-03-01" },
  { sku_id: "ADMFRMIX6", sku_title: "ADMFRMIX6", product_type: "Fresco", pack_size: 6, flavour: "Mixed", product_title: "Fresco Mixed 6-Pack", category: "drinks", channel_primary: "Shopify", is_active: true, created_at: "2025-01-01", updated_at: "2026-03-01" },
  { sku_id: "ADMFRLMG12", sku_title: "ADMFRLMG12", product_type: "Fresco", pack_size: 12, flavour: "Lemon & Ginger", product_title: "Fresco Lemon & Ginger 12-Pack", category: "drinks", channel_primary: "Amazon", is_active: true, created_at: "2025-01-01", updated_at: "2026-03-01" },
];

export const MOCK_KPI_DATA: KPIData = {
  total_revenue: 187450,
  revenue_mom_change: 8.3,
  forecast_accuracy: 92.4,
  accuracy_mom_change: 1.2,
  total_ad_spend: 24300,
  ad_spend_mom_change: -3.1,
  average_cac: 18.50,
  cac_mom_change: -5.2,
  gap_to_baseline: 3.8,
  gap_to_ambitious: -12.4,
};

export const MOCK_FORECAST_TABLE: ForecastTableRow[] = [
  { month: "2025-10", forecast_baseline: 8200, forecast_ambitious: 10500, actual: 8450, accuracy_pct: 103.0, mtd_performance: null, gap_baseline: 250, gap_baseline_pct: 3.0, gap_ambitious: -2050, gap_ambitious_pct: -19.5, mom_change: null },
  { month: "2025-11", forecast_baseline: 9100, forecast_ambitious: 11200, actual: 8780, accuracy_pct: 96.5, mtd_performance: null, gap_baseline: -320, gap_baseline_pct: -3.5, gap_ambitious: -2420, gap_ambitious_pct: -21.6, mom_change: 3.9 },
  { month: "2025-12", forecast_baseline: 10500, forecast_ambitious: 13000, actual: 10200, accuracy_pct: 97.1, mtd_performance: null, gap_baseline: -300, gap_baseline_pct: -2.9, gap_ambitious: -2800, gap_ambitious_pct: -21.5, mom_change: 16.2 },
  { month: "2026-01", forecast_baseline: 8800, forecast_ambitious: 11000, actual: 9100, accuracy_pct: 103.4, mtd_performance: null, gap_baseline: 300, gap_baseline_pct: 3.4, gap_ambitious: -1900, gap_ambitious_pct: -17.3, mom_change: -10.8 },
  { month: "2026-02", forecast_baseline: 8500, forecast_ambitious: 10800, actual: 8200, accuracy_pct: 96.5, mtd_performance: null, gap_baseline: -300, gap_baseline_pct: -3.5, gap_ambitious: -2600, gap_ambitious_pct: -24.1, mom_change: -9.9 },
  { month: "2026-03", forecast_baseline: 9200, forecast_ambitious: 11500, actual: 5800, accuracy_pct: null, mtd_performance: 63.0, gap_baseline: null, gap_baseline_pct: null, gap_ambitious: null, gap_ambitious_pct: null, mom_change: null },
  { month: "2026-04", forecast_baseline: 9800, forecast_ambitious: 12200, actual: null, accuracy_pct: null, mtd_performance: null, gap_baseline: null, gap_baseline_pct: null, gap_ambitious: null, gap_ambitious_pct: null, mom_change: null },
  { month: "2026-05", forecast_baseline: 10400, forecast_ambitious: 13100, actual: null, accuracy_pct: null, mtd_performance: null, gap_baseline: null, gap_baseline_pct: null, gap_ambitious: null, gap_ambitious_pct: null, mom_change: null },
  { month: "2026-06", forecast_baseline: 11200, forecast_ambitious: 14000, actual: null, accuracy_pct: null, mtd_performance: null, gap_baseline: null, gap_baseline_pct: null, gap_ambitious: null, gap_ambitious_pct: null, mom_change: null },
];

function generateSKUMonths() {
  const months = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
  const result: Record<string, { forecast_baseline: number; forecast_ambitious: number; actual: number | null; accuracy_pct: number | null; mom_change: number | null }> = {};
  let prev = 0;
  months.forEach((m, i) => {
    const base = 400 + Math.floor(Math.random() * 600);
    const ambitious = base + Math.floor(base * 0.25);
    const isFuture = m >= "2026-04";
    const isCurrent = m === "2026-03";
    const actual = isFuture ? null : isCurrent ? Math.floor(base * 0.6) : base + Math.floor((Math.random() - 0.5) * 200);
    const acc = actual !== null && !isCurrent ? Math.round((actual / base) * 1000) / 10 : null;
    const mom = i > 0 && actual !== null && prev > 0 ? Math.round(((actual - prev) / prev) * 1000) / 10 : null;
    result[m] = { forecast_baseline: base, forecast_ambitious: ambitious, actual, accuracy_pct: acc, mom_change: mom };
    if (actual !== null) prev = actual;
  });
  return result;
}

export const MOCK_SKU_TABLE: SKUTableRow[] = MOCK_SKUS.map((sku) => ({
  sku_id: sku.sku_id,
  sku_title: sku.sku_title,
  product_type: sku.product_type,
  category: sku.category,
  months: generateSKUMonths(),
}));

export const MOCK_AD_SPEND_TABLE: AdSpendTableRow[] = [
  { month: "2025-10", platform: "Meta Ads", spend_actual: 8200, spend_budgeted: 8000, variance: 200, variance_pct: 2.5, mom_trend: 0 },
  { month: "2025-10", platform: "Amazon Ads", spend_actual: 5100, spend_budgeted: 5500, variance: -400, variance_pct: -7.3, mom_trend: 0 },
  { month: "2025-11", platform: "Meta Ads", spend_actual: 8800, spend_budgeted: 8500, variance: 300, variance_pct: 3.5, mom_trend: 7.3 },
  { month: "2025-11", platform: "Amazon Ads", spend_actual: 5400, spend_budgeted: 5500, variance: -100, variance_pct: -1.8, mom_trend: 5.9 },
  { month: "2025-12", platform: "Meta Ads", spend_actual: 10200, spend_budgeted: 10000, variance: 200, variance_pct: 2.0, mom_trend: 15.9 },
  { month: "2025-12", platform: "Amazon Ads", spend_actual: 6800, spend_budgeted: 7000, variance: -200, variance_pct: -2.9, mom_trend: 25.9 },
  { month: "2026-01", platform: "Meta Ads", spend_actual: 9100, spend_budgeted: 9000, variance: 100, variance_pct: 1.1, mom_trend: -10.8 },
  { month: "2026-01", platform: "Amazon Ads", spend_actual: 5800, spend_budgeted: 6000, variance: -200, variance_pct: -3.3, mom_trend: -14.7 },
  { month: "2026-02", platform: "Meta Ads", spend_actual: 8600, spend_budgeted: 8500, variance: 100, variance_pct: 1.2, mom_trend: -5.5 },
  { month: "2026-02", platform: "Amazon Ads", spend_actual: 5500, spend_budgeted: 5800, variance: -300, variance_pct: -5.2, mom_trend: -5.2 },
  { month: "2026-03", platform: "Meta Ads", spend_actual: 5200, spend_budgeted: 9000, variance: -3800, variance_pct: -42.2, mom_trend: -39.5 },
  { month: "2026-03", platform: "Amazon Ads", spend_actual: 3400, spend_budgeted: 6000, variance: -2600, variance_pct: -43.3, mom_trend: -38.2 },
];

export const MOCK_CAC_TABLE: CACTableRow[] = [
  { month: "2025-10", channel: "Shopify", new_customers: 420, new_cac: 19.50, returning_customers: 680, returning_cac: 5.20, subscription_count: 310, subscription_revenue: 15200, one_time_count: 790, total_cac: 12.10, cac_mom_change: 0 },
  { month: "2025-10", channel: "Amazon", new_customers: 280, new_cac: 18.20, returning_customers: 190, returning_cac: 7.80, subscription_count: 0, subscription_revenue: 0, one_time_count: 470, total_cac: 10.85, cac_mom_change: 0 },
  { month: "2025-11", channel: "Shopify", new_customers: 480, new_cac: 18.30, returning_customers: 720, returning_cac: 4.90, subscription_count: 340, subscription_revenue: 16800, one_time_count: 860, total_cac: 11.30, cac_mom_change: -6.6 },
  { month: "2025-11", channel: "Amazon", new_customers: 310, new_cac: 17.40, returning_customers: 210, returning_cac: 7.20, subscription_count: 0, subscription_revenue: 0, one_time_count: 520, total_cac: 10.40, cac_mom_change: -4.1 },
  { month: "2025-12", channel: "Shopify", new_customers: 580, new_cac: 17.60, returning_customers: 850, returning_cac: 4.50, subscription_count: 380, subscription_revenue: 19400, one_time_count: 1050, total_cac: 11.90, cac_mom_change: 5.3 },
  { month: "2025-12", channel: "Amazon", new_customers: 390, new_cac: 17.40, returning_customers: 260, returning_cac: 6.80, subscription_count: 0, subscription_revenue: 0, one_time_count: 650, total_cac: 10.50, cac_mom_change: 1.0 },
  { month: "2026-01", channel: "Shopify", new_customers: 450, new_cac: 20.20, returning_customers: 780, returning_cac: 5.10, subscription_count: 350, subscription_revenue: 17100, one_time_count: 880, total_cac: 12.10, cac_mom_change: 1.7 },
  { month: "2026-01", channel: "Amazon", new_customers: 300, new_cac: 19.30, returning_customers: 200, returning_cac: 7.50, subscription_count: 0, subscription_revenue: 0, one_time_count: 500, total_cac: 11.60, cac_mom_change: 10.5 },
  { month: "2026-02", channel: "Shopify", new_customers: 410, new_cac: 20.90, returning_customers: 700, returning_cac: 5.30, subscription_count: 330, subscription_revenue: 16200, one_time_count: 780, total_cac: 12.70, cac_mom_change: 5.0 },
  { month: "2026-02", channel: "Amazon", new_customers: 270, new_cac: 20.40, returning_customers: 180, returning_cac: 8.10, subscription_count: 0, subscription_revenue: 0, one_time_count: 450, total_cac: 12.20, cac_mom_change: 5.2 },
  { month: "2026-03", channel: "Shopify", new_customers: 260, new_cac: 20.00, returning_customers: 440, returning_cac: 5.00, subscription_count: 210, subscription_revenue: 10300, one_time_count: 490, total_cac: 12.40, cac_mom_change: -2.4 },
  { month: "2026-03", channel: "Amazon", new_customers: 170, new_cac: 20.00, returning_customers: 110, returning_cac: 7.80, subscription_count: 0, subscription_revenue: 0, one_time_count: 280, total_cac: 12.20, cac_mom_change: 0 },
];

export const MOCK_CUSTOMER_METRICS: CustomerMetrics[] = [
  { month: "2025-07", channel: "all", new_customers_count: 620, returning_customers_count: 780, subscription_customers_count: 280, one_time_customers_count: 1120, total_cac: 14.20, new_customer_cac: 22.50, returning_customer_cac: 7.80, total_ad_spend: 11200 },
  { month: "2025-08", channel: "all", new_customers_count: 680, returning_customers_count: 820, subscription_customers_count: 300, one_time_customers_count: 1200, total_cac: 13.80, new_customer_cac: 21.80, returning_customer_cac: 7.40, total_ad_spend: 11800 },
  { month: "2025-09", channel: "all", new_customers_count: 650, returning_customers_count: 800, subscription_customers_count: 290, one_time_customers_count: 1160, total_cac: 14.50, new_customer_cac: 23.10, returning_customer_cac: 8.00, total_ad_spend: 12400 },
  { month: "2025-10", channel: "all", new_customers_count: 700, returning_customers_count: 870, subscription_customers_count: 310, one_time_customers_count: 1260, total_cac: 11.50, new_customer_cac: 19.00, returning_customer_cac: 6.30, total_ad_spend: 13300 },
  { month: "2025-11", channel: "all", new_customers_count: 790, returning_customers_count: 930, subscription_customers_count: 340, one_time_customers_count: 1380, total_cac: 10.90, new_customer_cac: 17.90, returning_customer_cac: 5.80, total_ad_spend: 14200 },
  { month: "2025-12", channel: "all", new_customers_count: 970, returning_customers_count: 1110, subscription_customers_count: 380, one_time_customers_count: 1700, total_cac: 11.30, new_customer_cac: 17.50, returning_customer_cac: 5.50, total_ad_spend: 17000 },
  { month: "2026-01", channel: "all", new_customers_count: 750, returning_customers_count: 980, subscription_customers_count: 350, one_time_customers_count: 1380, total_cac: 11.80, new_customer_cac: 19.80, returning_customer_cac: 6.10, total_ad_spend: 14900 },
  { month: "2026-02", channel: "all", new_customers_count: 680, returning_customers_count: 880, subscription_customers_count: 330, one_time_customers_count: 1230, total_cac: 12.50, new_customer_cac: 20.70, returning_customer_cac: 6.50, total_ad_spend: 14100 },
  { month: "2026-03", channel: "all", new_customers_count: 430, returning_customers_count: 550, subscription_customers_count: 210, one_time_customers_count: 770, total_cac: 12.30, new_customer_cac: 20.00, returning_customer_cac: 6.20, total_ad_spend: 8600 },
];

export const MOCK_RECOMMENDATION: LLMRecommendation = {
  recommendation_id: "rec-2026-03-001",
  month: "2026-03",
  generated_at: "2026-03-12T08:00:00Z",
  run_type: "daily",
  summary_text: {
    executive_summary: "March 2026 is tracking 63% to baseline forecast at mid-month. Romedio Infusion and Water Kefir lines are the primary drivers of the gap. Amazon channel is underperforming relative to Shopify. Ad spend is significantly under budget (-42% Meta, -43% Amazon), suggesting room for acceleration in the second half of the month.",
    trends: [
      "Romedio Infusion continues to account for ~45% of total revenue, consistent with historical patterns",
      "Water Kefir demand is showing early seasonal uptick as spring approaches — up 8% vs Feb baseline",
      "Subscription retention rate improved to 87% from 84% in February",
      "Amazon CAC has risen 5.2% MoM, driven by increased competition in the health drinks category",
      "Culture Shots emerging as fastest-growing category by percentage (+12% MoM)"
    ],
    anomalies: [
      "Amazon ad spend is 43% under budget — this is unusual and needs investigation",
      "Meta Ads CTR dropped from 2.1% to 1.7% this month — creative fatigue likely",
      "SKU ADMWKMIX12 (Water Kefir Mixed 12-Pack) showing 30% above forecast on Amazon — potential stockout risk",
      "New customer acquisition down 15% MoM — seasonal or a structural issue?"
    ],
    recommendations: [
      { priority: "high", category: "Ad Spend", action: "Increase Amazon Ads spend by 40% for remaining March days", rationale: "Currently 43% under budget with 18 days remaining. Amazon ROAS remains healthy at 3.2x. Reallocating budget could close the gap to baseline.", expected_impact: "Estimated +800-1,200 additional units sold" },
      { priority: "high", category: "Ad Spend", action: "Refresh Meta Ads creative assets — CTR has declined 19%", rationale: "Creative fatigue is reducing efficiency. New creatives typically restore CTR within 5-7 days.", expected_impact: "Restore CTR to 2.0%+, improving ROAS by ~15%" },
      { priority: "high", category: "Production", action: "Expedite production run for ADMWKMIX12 (Water Kefir Mixed 12-Pack)", rationale: "Tracking 30% above forecast on Amazon with current stock covering ~3 weeks. Spring demand increase makes stockout likely.", expected_impact: "Prevent estimated £8,200 in lost revenue from stockouts" },
      { priority: "medium", category: "Channel Strategy", action: "Shift 15% of Meta budget to Amazon Ads for Culture Shots", rationale: "Culture Shots are growing fastest on Amazon (+12% MoM) with better attribution. Meta cannot attribute to SKU level.", expected_impact: "Improved ROAS and better attribution visibility" },
      { priority: "medium", category: "Pricing", action: "Consider 10% discount promotion on Fresco line for spring launch push", rationale: "Fresco is the newest line with lowest brand recognition. Spring is the ideal season for cold drinks.", expected_impact: "Estimated 20-25% volume uplift during promotion period" },
      { priority: "low", category: "Investor Relations", action: "Prepare Q1 narrative: baseline met, ambitious target gap is 18%", rationale: "Q1 actuals will likely finish within 5% of baseline but 18-22% below ambitious targets. Need clear narrative for investor update.", expected_impact: "Aligned expectations with VCs" }
    ],
    baseline_comparison: "Q1 2026 is tracking to finish within 3-5% of baseline forecast. January exceeded baseline by 3.4%, February missed by 3.5%, and March is currently at 63% (mid-month). If the remaining 18 days maintain the current daily run rate, March will finish at approximately 96% of baseline.",
    ambitious_comparison: "The gap to ambitious targets remains significant at 18-22% across all months. This gap is structural — closing it requires either a step-change in ad spend efficiency, a new channel (retail/wholesale), or a viral demand event. Recommend treating ambitious targets as stretch goals and focusing team on consistently beating baseline."
  },
  model_used: "claude-sonnet-4-6",
};

export const MOCK_CHART_DATA = {
  forecastVsActual: [
    { month: "Oct 25", baseline: 8200, ambitious: 10500, actual: 8450 },
    { month: "Nov 25", baseline: 9100, ambitious: 11200, actual: 8780 },
    { month: "Dec 25", baseline: 10500, ambitious: 13000, actual: 10200 },
    { month: "Jan 26", baseline: 8800, ambitious: 11000, actual: 9100 },
    { month: "Feb 26", baseline: 8500, ambitious: 10800, actual: 8200 },
    { month: "Mar 26", baseline: 9200, ambitious: 11500, actual: 5800 },
    { month: "Apr 26", baseline: 9800, ambitious: 12200, actual: undefined },
    { month: "May 26", baseline: 10400, ambitious: 13100, actual: undefined },
    { month: "Jun 26", baseline: 11200, ambitious: 14000, actual: undefined },
  ],
  adSpend: [
    { month: "Oct 25", meta_actual: 8200, meta_budget: 8000, amazon_actual: 5100, amazon_budget: 5500 },
    { month: "Nov 25", meta_actual: 8800, meta_budget: 8500, amazon_actual: 5400, amazon_budget: 5500 },
    { month: "Dec 25", meta_actual: 10200, meta_budget: 10000, amazon_actual: 6800, amazon_budget: 7000 },
    { month: "Jan 26", meta_actual: 9100, meta_budget: 9000, amazon_actual: 5800, amazon_budget: 6000 },
    { month: "Feb 26", meta_actual: 8600, meta_budget: 8500, amazon_actual: 5500, amazon_budget: 5800 },
    { month: "Mar 26", meta_actual: 5200, meta_budget: 9000, amazon_actual: 3400, amazon_budget: 6000 },
  ],
  newVsRepeat: [
    { month: "Jul 25", new_customers: 620, returning_customers: 780 },
    { month: "Aug 25", new_customers: 680, returning_customers: 820 },
    { month: "Sep 25", new_customers: 650, returning_customers: 800 },
    { month: "Oct 25", new_customers: 700, returning_customers: 870 },
    { month: "Nov 25", new_customers: 790, returning_customers: 930 },
    { month: "Dec 25", new_customers: 970, returning_customers: 1110 },
    { month: "Jan 26", new_customers: 750, returning_customers: 980 },
    { month: "Feb 26", new_customers: 680, returning_customers: 880 },
    { month: "Mar 26", new_customers: 430, returning_customers: 550 },
  ],
  cacTrend: [
    { month: "Jul 25", cac: 14.20, new_customers: 620 },
    { month: "Aug 25", cac: 13.80, new_customers: 680 },
    { month: "Sep 25", cac: 14.50, new_customers: 650 },
    { month: "Oct 25", cac: 11.50, new_customers: 700 },
    { month: "Nov 25", cac: 10.90, new_customers: 790 },
    { month: "Dec 25", cac: 11.30, new_customers: 970 },
    { month: "Jan 26", cac: 11.80, new_customers: 750 },
    { month: "Feb 26", cac: 12.50, new_customers: 680 },
    { month: "Mar 26", cac: 12.30, new_customers: 430 },
  ],
};
