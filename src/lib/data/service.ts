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
    return applyForecastFilters(MOCK_FORECAST_TABLE, filters);
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
    console.error("Error fetching Shopify forecast data, falling back to mock:", error);
    return applyForecastFilters(MOCK_FORECAST_TABLE, filters);
  }
}

function applyForecastFilters(
  data: ForecastTableRow[],
  filters?: Partial<DashboardFilters>
): ForecastTableRow[] {
  if (!filters?.selectedMonth) return data;
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
    return applySKUFilters(MOCK_SKU_TABLE, filters);
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
    console.error("Error fetching Shopify SKU data, falling back to mock:", error);
    return applySKUFilters(MOCK_SKU_TABLE, filters);
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
    kpi = { ...MOCK_KPI_DATA };
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
      console.error("Error fetching Shopify KPI data, falling back to mock:", error);
      kpi = { ...MOCK_KPI_DATA };
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

  // 2. Try Meta Ads API for real data
  const metaInsights = await getMetaInsightsForFilters(filters);
  if (metaInsights && metaInsights.length > 0) {
    const metaRows = transformMetaToAdSpendRows(metaInsights);

    // Keep Amazon mock rows for now (until Amazon Ads API is connected)
    const amazonMockRows = MOCK_AD_SPEND_TABLE.filter(
      (r) => r.platform === "Amazon Ads"
    );
    const allData = mergeAdSpendData(metaRows, amazonMockRows);

    // Apply platform filter
    if (filters?.adsPlatform && filters.adsPlatform !== "all") {
      const platformMap: Record<string, string> = {
        meta: "Meta Ads",
        amazon_ads: "Amazon Ads",
      };
      const platformName = platformMap[filters.adsPlatform];
      if (platformName) {
        return allData.filter((row) => row.platform === platformName);
      }
    }

    return allData;
  }

  // 3. Fallback to mock
  let data = MOCK_AD_SPEND_TABLE;

  if (filters?.adsPlatform && filters.adsPlatform !== "all") {
    const platformMap: Record<string, string> = {
      meta: "Meta Ads",
      amazon_ads: "Amazon Ads",
    };
    const platformName = platformMap[filters.adsPlatform];
    if (platformName) {
      data = data.filter((row) => row.platform === platformName);
    }
  }

  return data;
}

// ── CAC data ──

export async function getCACData(
  filters?: Partial<DashboardFilters>
): Promise<CACTableRow[]> {
  // CAC data currently comes from Shopify + mock — Supabase doesn't have a
  // dedicated CAC table yet, so we keep existing logic but could derive from
  // sales_daily + ad_daily_spend in the future.

  const connected = await isShopifyConnected();

  if (!connected) {
    return applyCACFilters(MOCK_CAC_TABLE, filters);
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

    const cacData = transformCustomersToCAC(filteredOrders, rawCustomers);

    // Only append Amazon mock rows when the channel filter allows it
    if (!filters?.channel || filters.channel === "all" || filters.channel === "amazon") {
      const amazonMockData = MOCK_CAC_TABLE.filter(
        (r) => r.channel === "Amazon"
      );
      return [...cacData, ...amazonMockData];
    }

    return cacData;
  } catch (error) {
    console.error("Error fetching Shopify CAC data, falling back to mock:", error);
    return applyCACFilters(MOCK_CAC_TABLE, filters);
  }
}

function applyCACFilters(
  data: CACTableRow[],
  filters?: Partial<DashboardFilters>
): CACTableRow[] {
  let result = data;
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
