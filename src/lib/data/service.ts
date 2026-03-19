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

// ── Connection check ──

export async function isShopifyConnected(): Promise<boolean> {
  try {
    return await checkShopifyConnection();
  } catch {
    return false;
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
    // If a specific month is selected, determine the range around it
    const [year, month] = selectedMonth.split("-").map(Number);
    endDate = new Date(year, month, 0); // last day of month
    // Start from enough months back based on timeRange
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

    // Apply channel filter
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
  // The forecast table shows a range of months, so we return all rows
  // but could filter by time range if needed
  return data;
}

// ── SKU data ──

export async function getSKUData(
  filters?: Partial<DashboardFilters>
): Promise<SKUTableRow[]> {
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
  const connected = await isShopifyConnected();

  if (!connected) {
    return MOCK_KPI_DATA;
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

    return transformOrdersToKPI(filteredOrders);
  } catch (error) {
    console.error("Error fetching Shopify KPI data, falling back to mock:", error);
    return MOCK_KPI_DATA;
  }
}

// ── Ad Spend data (mock only — requires Amazon/Meta integration) ──

export async function getAdSpendData(
  filters?: Partial<DashboardFilters>
): Promise<AdSpendTableRow[]> {
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

    // Since Shopify data only covers the Shopify channel, merge with
    // mock Amazon data to keep the dashboard complete
    const amazonMockData = MOCK_CAC_TABLE.filter(
      (r) => r.channel === "Amazon"
    );

    return [...cacData, ...amazonMockData];
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
