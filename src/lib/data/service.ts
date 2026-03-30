import type {
  ForecastTableRow,
  SKUTableRow,
  KPIData,
  AdSpendTableRow,
  CACTableRow,
  DashboardFilters,
} from "@/types";
import {
  isShopifyConnected as checkShopifyConnection,
  getOrders,
  getCustomers,
} from "@/lib/shopify/client";
import {
  transformRawOrders,
  transformOrdersToForecast,
  transformOrdersToSKUTable,
  transformOrdersToKPI,
  transformCustomersToCAC,
} from "@/lib/shopify/transform";
import {
  MOCK_FORECAST_TABLE,
  MOCK_SKU_TABLE,
  MOCK_KPI_DATA,
  MOCK_AD_SPEND_TABLE,
  MOCK_CAC_TABLE,
} from "@/lib/mock-data";
import {
  getSalesDailyFromDB,
  getSKUDataFromDB,
  getKPIDataFromDB,
  getAdSpendFromDB,
  hasSupabaseData,
} from "@/lib/supabase/queries";
import {
  isMetaConnected,
  getMonthlyInsights,
} from "@/lib/meta/client";
import {
  transformMetaToAdSpendRows,
  mergeAdSpendData,
  transformMetaToCACContribution,
  getMetaKPISummary,
} from "@/lib/meta/transform";
import { calculateRealCAC } from "@/lib/cac/calculator";

// ── Connection checks ──

export async function isShopifyConnected(): Promise<boolean> {
  try {
    return await checkShopifyConnection();
  } catch {
    return false;
  }
}

/**
 * Check if Supabase has meaningful sales data.
 * Cached per request lifecycle (module-level, resets on each serverless invocation).
 */
let _supabaseCheckCache: { hasSalesData: boolean; checked: boolean } = {
  hasSalesData: false,
  checked: false,
};

async function checkSupabaseHasData(): Promise<boolean> {
  if (_supabaseCheckCache.checked) return _supabaseCheckCache.hasSalesData;
  try {
    const result = await hasSupabaseData();
    _supabaseCheckCache = { hasSalesData: result.hasSalesData, checked: true };
    return result.hasSalesData;
  } catch {
    _supabaseCheckCache = { hasSalesData: false, checked: true };
    return false;
  }
}

/**
 * Determine the active data source.
 * Priority: Supabase (if has data) > Shopify (if connected) > Mock
 */
export async function getActiveDataSource(): Promise<"supabase" | "shopify" | "mock"> {
  const supabaseHasData = await checkSupabaseHasData();
  if (supabaseHasData) return "supabase";

  const shopify = await isShopifyConnected();
  if (shopify) return "shopify";

  return "mock";
}

// ── Meta Ads connection check (cached) ──

let _metaCheckCache: { connected: boolean; checked: boolean } = {
  connected: false,
  checked: false,
};

async function checkMetaConnected(): Promise<boolean> {
  if (_metaCheckCache.checked) return _metaCheckCache.connected;
  try {
    const result = await isMetaConnected();
    _metaCheckCache = { connected: result, checked: true };
    return result;
  } catch {
    _metaCheckCache = { connected: false, checked: true };
    return false;
  }
}

/**
 * Fetch Meta Ads monthly insights for the given filter date range.
 * Returns null if Meta is not connected.
 */
async function getMetaInsightsForFilters(filters?: Partial<DashboardFilters>) {
  const connected = await checkMetaConnected();
  if (!connected) return null;

  try {
    const { created_at_min, created_at_max } = getDateRangeForFilters(filters);
    const since = created_at_min.split("T")[0];
    const until = created_at_max.split("T")[0];
    return await getMonthlyInsights(since, until);
  } catch (error) {
    console.error("Meta Ads fetch failed:", error);
    return null;
  }
}

// ── Month list helper (for filtering mock data) ──

function getMonthsForFilters(filters?: Partial<DashboardFilters>): string[] {
  const selectedMonth = filters?.selectedMonth || "2026-03";
  const timeRange = filters?.timeRange || "6m";
  const [year, month] = selectedMonth.split("-").map(Number);
  const endDate = new Date(year, month - 1, 1);

  let monthsBack: number;
  switch (timeRange) {
    case "mtd":
      return [selectedMonth];
    case "ytd":
      monthsBack = month - 1;
      break;
    case "3m":
      monthsBack = 2;
      break;
    case "6m":
      monthsBack = 5;
      break;
    case "12m":
      monthsBack = 11;
      break;
    default:
      return [selectedMonth];
  }

  const startDate = new Date(year, month - 1 - monthsBack, 1);
  const months: string[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

// ── Date range helpers ──

function getDateRangeForFilters(filters?: Partial<DashboardFilters>): {
  created_at_min: string;
  created_at_max: string;
} {
  const now = new Date();
  const selectedMonth = filters?.selectedMonth;
  const timeRange = filters?.timeRange || "6m";

  let endDate = new Date(now);
  let startDate = new Date(now);

  if (selectedMonth) {
    const [year, month] = selectedMonth.split("-").map(Number);
    endDate = new Date(year, month, 0); // last day of month
    const monthsBack = timeRange === "mtd" ? 0 : timeRange === "ytd" ? month - 1 : timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : 12;
    startDate = new Date(year, month - 1 - monthsBack, 1);
  } else {
    const monthsBack = timeRange === "mtd" ? 0 : timeRange === "ytd" ? now.getMonth() : timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : 12;
    startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  }

  return {
    created_at_min: startDate.toISOString(),
    created_at_max: endDate.toISOString(),
  };
}

// ── Forecast data ──

export async function getForecastData(
  filters?: Partial<DashboardFilters>
): Promise<ForecastTableRow[]> {
  // 1. Try Supabase first
  try {
    const supabaseData = await getSalesDailyFromDB(filters);
    if (supabaseData.length > 0) return supabaseData;
  } catch (err) {
    console.error("Supabase forecast fetch failed, trying Shopify:", err);
  }

  // 2. Try Shopify
  const connected = await isShopifyConnected();
  if (!connected) {
    return []; // No Shopify — return empty (no mock fallback)
  }

  try {
    const dateRange = getDateRangeForFilters(filters);
    const rawOrders = await getOrders({
      created_at_min: dateRange.created_at_min,
      created_at_max: dateRange.created_at_max,
      status: "any",
    });

    const internalOrders = transformRawOrders(rawOrders);

    const filteredOrders =
      filters?.channel && filters.channel !== "all"
        ? internalOrders.filter(
            (o) => o.channel.toLowerCase() === filters.channel
          )
        : internalOrders;

    const forecastData = transformOrdersToForecast(filteredOrders);
    return forecastData;
  } catch (error) {
    console.error("Error fetching Shopify forecast data:", error);
    return [];
  }
}

function applyForecastFilters(
  data: ForecastTableRow[],
  filters?: Partial<DashboardFilters>
): ForecastTableRow[] {
  if (!filters) return data;
  const months = getMonthsForFilters(filters);
  if (months.length > 0) {
    data = data.filter((row) => months.includes(row.month));
  }
  return data;
}

// ── SKU data ──

export async function getSKUData(
  filters?: Partial<DashboardFilters>
): Promise<SKUTableRow[]> {
  // 1. Try Supabase first
  try {
    const supabaseData = await getSKUDataFromDB(filters);
    if (supabaseData.length > 0) return supabaseData;
  } catch (err) {
    console.error("Supabase SKU fetch failed, trying Shopify:", err);
  }

  // 2. Try Shopify
  const connected = await isShopifyConnected();
  if (!connected) {
    return []; // No Shopify — return empty (no mock fallback)
  }

  try {
    const dateRange = getDateRangeForFilters(filters);
    const rawOrders = await getOrders({
      created_at_min: dateRange.created_at_min,
      created_at_max: dateRange.created_at_max,
      status: "any",
    });

    const internalOrders = transformRawOrders(rawOrders);

    const filteredOrders =
      filters?.channel && filters.channel !== "all"
        ? internalOrders.filter(
            (o) => o.channel.toLowerCase() === filters.channel
          )
        : internalOrders;

    let skuData = transformOrdersToSKUTable(filteredOrders);

    if (filters?.category && filters.category !== "all") {
      skuData = skuData.filter((s) => s.category === filters.category);
    }

    return skuData;
  } catch (error) {
    console.error("Error fetching Shopify SKU data:", error);
    return [];
  }
}

function applySKUFilters(
  data: SKUTableRow[],
  filters?: Partial<DashboardFilters>
): SKUTableRow[] {
  let result = data;
  if (filters?.category && filters.category !== "all") {
    result = result.filter((s) => s.category === filters.category);
  }
  // Filter monthly data within each SKU by time range
  if (filters) {
    const months = getMonthsForFilters(filters);
    if (months.length > 0) {
      result = result.map((sku) => ({
        ...sku,
        months: Object.fromEntries(
          Object.entries(sku.months).filter(([m]) => months.includes(m))
        ),
      }));
    }
  }
  return result;
}

// ── KPI data ──

export async function getKPIData(
  filters?: Partial<DashboardFilters>
): Promise<KPIData> {
  // 1. Try Supabase first
  try {
    const supabaseKPI = await getKPIDataFromDB(filters);
    if (supabaseKPI && supabaseKPI.total_revenue > 0) return supabaseKPI;
  } catch (err) {
    console.error("Supabase KPI fetch failed, trying Shopify:", err);
  }

  // 2. Try Shopify
  const connected = await isShopifyConnected();
  let kpi: KPIData;

  if (!connected) {
    // No Shopify — return empty base KPIs (no mock data).
    // Meta enrichment below will fill ad spend + CAC if connected.
    kpi = {
      total_revenue: 0,
      revenue_mom_change: 0,
      forecast_accuracy: 0,
      accuracy_mom_change: 0,
      total_ad_spend: 0,
      ad_spend_mom_change: 0,
      average_cac: 0,
      cac_mom_change: 0,
      gap_to_baseline: 0,
      gap_to_ambitious: 0,
    };
  } else {
    try {
      const dateRange = getDateRangeForFilters(filters);
      const rawOrders = await getOrders({
        created_at_min: dateRange.created_at_min,
        created_at_max: dateRange.created_at_max,
        status: "any",
      });

      const internalOrders = transformRawOrders(rawOrders);

      const filteredOrders =
        filters?.channel && filters.channel !== "all"
          ? internalOrders.filter(
              (o) => o.channel.toLowerCase() === filters.channel
            )
          : internalOrders;

      kpi = transformOrdersToKPI(filteredOrders);
    } catch (error) {
      console.error("Error fetching Shopify KPI data:", error);
      kpi = {
        total_revenue: 0, revenue_mom_change: 0,
        forecast_accuracy: 0, accuracy_mom_change: 0,
        total_ad_spend: 0, ad_spend_mom_change: 0,
        average_cac: 0, cac_mom_change: 0,
        gap_to_baseline: 0, gap_to_ambitious: 0,
      };
    }
  }

  // 3. Enrich KPI with real Meta Ads spend data
  const metaInsights = await getMetaInsightsForFilters(filters);
  if (metaInsights && metaInsights.length > 0) {
    const metaKPI = getMetaKPISummary(metaInsights);
    kpi.total_ad_spend = metaKPI.total_spend;
    kpi.ad_spend_mom_change = metaKPI.spend_mom_change;
    kpi.average_cac = metaKPI.avg_cac;
    kpi.cac_mom_change = metaKPI.cac_mom_change;
  }

  return kpi;
}

// ── Ad Spend data ──

export async function getAdSpendData(
  filters?: Partial<DashboardFilters>
): Promise<AdSpendTableRow[]> {
  // 1. Try Supabase first
  try {
    const supabaseData = await getAdSpendFromDB(filters);
    if (supabaseData.length > 0) return supabaseData;
  } catch (err) {
    console.error("Supabase ad spend fetch failed, trying Meta API:", err);
  }

  // 2. Try Meta Ads API for real data (no Amazon mock rows — only real data)
  const metaInsights = await getMetaInsightsForFilters(filters);
  if (metaInsights && metaInsights.length > 0) {
    const metaRows = transformMetaToAdSpendRows(metaInsights);

    // Apply platform filter
    if (filters?.adsPlatform && filters.adsPlatform !== "all") {
      const platformMap: Record<string, string> = {
        meta: "Meta Ads",
        amazon_ads: "Amazon Ads",
      };
      const platformName = platformMap[filters.adsPlatform];
      if (platformName) {
        return metaRows.filter((row) => row.platform === platformName);
      }
    }

    return metaRows;
  }

  // 3. No data available — return empty (no mock fallback)
  return [];
}

// ── CAC data ──

export async function getCACData(
  filters?: Partial<DashboardFilters>
): Promise<CACTableRow[]> {
  // Try real Meta-based CAC first
  const metaInsights = await getMetaInsightsForFilters(filters);
  if (metaInsights && metaInsights.length > 0) {
    const metaCACRows = calculateRealCAC(metaInsights);

    // If channel filter excludes Meta, return empty (no Amazon mock)
    if (filters?.channel === "amazon") {
      return []; // Amazon CAC not available until Amazon Ads connected
    }

    return metaCACRows;
  }

  // Fallback: Try Shopify
  const connected = await isShopifyConnected();

  if (!connected) {
    return []; // No Shopify — return empty (no mock fallback)
  }

  try {
    const dateRange = getDateRangeForFilters(filters);
    const rawOrders = await getOrders({
      created_at_min: dateRange.created_at_min,
      created_at_max: dateRange.created_at_max,
      status: "any",
    });
    const rawCustomers = await getCustomers({
      created_at_min: dateRange.created_at_min,
      created_at_max: dateRange.created_at_max,
    });

    const internalOrders = transformRawOrders(rawOrders);

    const filteredOrders =
      filters?.channel && filters.channel !== "all"
        ? internalOrders.filter(
            (o) => o.channel.toLowerCase() === filters.channel
          )
        : internalOrders;

    return transformCustomersToCAC(filteredOrders, rawCustomers);
  } catch (error) {
    console.error("Error fetching Shopify CAC data:", error);
    return [];
  }
}

function applyKPIFilters(
  _kpi: KPIData,
  filters?: Partial<DashboardFilters>
): KPIData {
  if (!filters) return { ..._kpi };

  // Derive KPIs from filtered mock forecast + ad spend data for consistency
  const months = getMonthsForFilters(filters);
  const forecastRows = MOCK_FORECAST_TABLE.filter((r) => months.includes(r.month));
  const adSpendRows = MOCK_AD_SPEND_TABLE.filter((r) => months.includes(r.month));
  const cacRows = MOCK_CAC_TABLE.filter((r) => months.includes(r.month));

  // Revenue: sum of actuals from filtered forecast rows
  const totalRevenue = forecastRows.reduce((sum, r) => sum + (r.actual ?? r.forecast_baseline), 0);

  // Ad spend: sum from filtered ad spend rows
  const totalAdSpend = adSpendRows.reduce((sum, r) => sum + r.spend, 0);

  // Forecast accuracy: average of rows that have actuals
  const accuracyRows = forecastRows.filter((r) => r.accuracy_pct !== null);
  const forecastAccuracy = accuracyRows.length > 0
    ? accuracyRows.reduce((sum, r) => sum + r.accuracy_pct!, 0) / accuracyRows.length
    : 0;

  // CAC: average total_cac from filtered CAC rows
  const avgCAC = cacRows.length > 0
    ? cacRows.reduce((sum, r) => sum + r.total_cac, 0) / cacRows.length
    : 0;

  // MoM: use last two months if available
  const sortedMonths = [...new Set(forecastRows.map((r) => r.month))].sort();
  let revenueMom = 0;
  if (sortedMonths.length >= 2) {
    const lastMonth = sortedMonths[sortedMonths.length - 1];
    const prevMonth = sortedMonths[sortedMonths.length - 2];
    const lastRow = forecastRows.find((r) => r.month === lastMonth);
    const prevRow = forecastRows.find((r) => r.month === prevMonth);
    const lastRev = lastRow?.actual ?? lastRow?.forecast_baseline ?? 0;
    const prevRev = prevRow?.actual ?? prevRow?.forecast_baseline ?? 0;
    revenueMom = prevRev > 0 ? +((lastRev - prevRev) / prevRev * 100).toFixed(1) : 0;
  }

  // Gap to baseline: last month in range
  const lastForecast = forecastRows[forecastRows.length - 1];
  const gapBaseline = lastForecast?.gap_baseline_pct ?? _kpi.gap_to_baseline;
  const gapAmbitious = lastForecast?.gap_ambitious_pct ?? _kpi.gap_to_ambitious;

  return {
    total_revenue: Math.round(totalRevenue),
    revenue_mom_change: revenueMom,
    forecast_accuracy: +forecastAccuracy.toFixed(1),
    accuracy_mom_change: _kpi.accuracy_mom_change,
    total_ad_spend: Math.round(totalAdSpend),
    ad_spend_mom_change: _kpi.ad_spend_mom_change,
    average_cac: +avgCAC.toFixed(2),
    cac_mom_change: _kpi.cac_mom_change,
    gap_to_baseline: gapBaseline,
    gap_to_ambitious: gapAmbitious,
  };
}

function applyCACFilters(
  data: CACTableRow[],
  filters?: Partial<DashboardFilters>
): CACTableRow[] {
  let result = data;
  // Filter by time range
  if (filters) {
    const months = getMonthsForFilters(filters);
    if (months.length > 0) {
      result = result.filter((r) => months.includes(r.month));
    }
  }
  if (filters?.channel && filters.channel !== "all") {
    const channelMap: Record<string, string> = {
      shopify: "Shopify",
      amazon: "Amazon",
    };
    const channelName = channelMap[filters.channel];
    if (channelName) {
      result = result.filter((r) => r.channel === channelName);
    }
  }
  return result;
}
