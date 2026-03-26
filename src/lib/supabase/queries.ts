/**
 * Supabase query functions that read from the database tables
 * and return data in the format the dashboard expects.
 *
 * Each function uses the authenticated server client (respects RLS)
 * and falls back gracefully if the query fails or returns no rows.
 */

import { createClient } from "./server";
import { createAdminClient } from "./admin";
import type {
  ForecastTableRow,
  SKUTableRow,
  KPIData,
  AdSpendTableRow,
  CACTableRow,
  DashboardFilters,
} from "@/types";

// ── Helpers ──

function monthKey(date: string): string {
  // date could be "2026-03-01" or a Date-compatible string
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getDateRange(filters?: Partial<DashboardFilters>): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const timeRange = filters?.timeRange || "6m";
  const selectedMonth = filters?.selectedMonth;

  let endDate = new Date(now);
  let startDate = new Date(now);

  if (selectedMonth) {
    const [year, month] = selectedMonth.split("-").map(Number);
    endDate = new Date(year, month, 0); // last day of the selected month
    // Subtract (monthsBack - 1) so the range is inclusive of both start and end months.
    // E.g. "6m" from March 2026 → Oct 2025..Mar 2026 = 6 months.
    const monthsBack =
      timeRange === "mtd"
        ? 0
        : timeRange === "ytd"
          ? month - 1
          : timeRange === "3m"
            ? 2
            : timeRange === "6m"
              ? 5
              : 11;
    startDate = new Date(year, month - 1 - monthsBack, 1);
  } else {
    const monthsBack =
      timeRange === "mtd"
        ? 0
        : timeRange === "ytd"
          ? now.getMonth()
          : timeRange === "3m"
            ? 2
            : timeRange === "6m"
              ? 5
              : 11;
    startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  }

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
  };
}

// ── Products ──

export async function getProductsFromDB(): Promise<
  { id: string; sku: string; name: string; product_line: string | null; category: string | null; is_active: boolean }[]
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, product_line, category, is_active")
      .eq("is_active", true)
      .order("sku");

    if (error) {
      console.error("getProductsFromDB error:", error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("getProductsFromDB unexpected error:", err);
    return [];
  }
}

// ── Sales Daily → ForecastTableRow[] ──

export async function getSalesDailyFromDB(
  filters?: Partial<DashboardFilters>
): Promise<ForecastTableRow[]> {
  try {
    const supabase = await createClient();
    const { startDate, endDate } = getDateRange(filters);

    let query = supabase
      .from("sales_daily")
      .select("sale_date, channel, units_sold, gross_revenue, net_revenue, discounts")
      .gte("sale_date", startDate)
      .lte("sale_date", endDate);

    if (filters?.channel && filters.channel !== "all") {
      query = query.eq("channel", filters.channel);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      if (error) console.error("getSalesDailyFromDB error:", error.message);
      return [];
    }

    // Aggregate by month
    const monthMap = new Map<
      string,
      { units: number; revenue: number }
    >();

    for (const row of data) {
      const mk = monthKey(row.sale_date);
      const existing = monthMap.get(mk) || { units: 0, revenue: 0 };
      existing.units += row.units_sold ?? 0;
      existing.revenue += Number(row.net_revenue ?? 0);
      monthMap.set(mk, existing);
    }

    // Also fetch demand forecasts for the same period
    const forecasts = await getDemandForecastsRaw(filters);
    const forecastByMonth = new Map<
      string,
      { baseline: number; ambitious: number }
    >();
    for (const f of forecasts) {
      const mk = monthKey(f.period_start);
      const existing = forecastByMonth.get(mk) || { baseline: 0, ambitious: 0 };
      existing.baseline += Number(f.baseline_units ?? 0);
      // Ambitious = baseline * marketing_uplift * seasonality_index
      const ambitious = Number(f.forecast_units ?? 0);
      existing.ambitious += ambitious > existing.baseline ? ambitious : Math.round(Number(f.baseline_units ?? 0) * 1.25);
      forecastByMonth.set(mk, existing);
    }

    // Build sorted month keys
    const allMonths = new Set([...monthMap.keys(), ...forecastByMonth.keys()]);
    const sortedMonths = Array.from(allMonths).sort();

    const rows: ForecastTableRow[] = [];
    let prevActual: number | null = null;

    for (const month of sortedMonths) {
      const sales = monthMap.get(month);
      const forecast = forecastByMonth.get(month);

      const actual = sales?.units ?? null;
      const baseline = forecast?.baseline ?? 0;
      const ambitious = forecast?.ambitious ?? 0;

      const now = new Date();
      const [my, mm] = month.split("-").map(Number);
      const isCurrent = my === now.getFullYear() && mm === now.getMonth() + 1;
      const isFuture = new Date(my, mm - 1, 1) > now;

      const accuracy =
        actual !== null && baseline > 0 && !isCurrent && !isFuture
          ? Math.round((actual / baseline) * 1000) / 10
          : null;

      const gapBaseline =
        actual !== null && !isCurrent && !isFuture ? actual - baseline : null;
      const gapBaselinePct =
        gapBaseline !== null && baseline > 0
          ? Math.round((gapBaseline / baseline) * 1000) / 10
          : null;

      const gapAmbitious =
        actual !== null && !isCurrent && !isFuture ? actual - ambitious : null;
      const gapAmbitiousPct =
        gapAmbitious !== null && ambitious > 0
          ? Math.round((gapAmbitious / ambitious) * 1000) / 10
          : null;

      const mtdPerformance =
        isCurrent && actual !== null && baseline > 0
          ? Math.round((actual / baseline) * 1000) / 10
          : null;

      const momChange =
        prevActual !== null && prevActual > 0 && actual !== null
          ? Math.round(((actual - prevActual) / prevActual) * 1000) / 10
          : null;

      rows.push({
        month,
        forecast_baseline: baseline,
        forecast_ambitious: ambitious,
        actual,
        accuracy_pct: accuracy,
        mtd_performance: mtdPerformance,
        gap_baseline: gapBaseline,
        gap_baseline_pct: gapBaselinePct,
        gap_ambitious: gapAmbitious,
        gap_ambitious_pct: gapAmbitiousPct,
        mom_change: momChange,
      });

      if (actual !== null) prevActual = actual;
    }

    return rows;
  } catch (err) {
    console.error("getSalesDailyFromDB unexpected error:", err);
    return [];
  }
}

// ── Raw demand forecasts (internal) ──

async function getDemandForecastsRaw(filters?: Partial<DashboardFilters>) {
  try {
    const supabase = await createClient();
    const { startDate, endDate } = getDateRange(filters);

    const { data, error } = await supabase
      .from("demand_forecasts")
      .select("period_start, period_end, baseline_units, forecast_units, seasonality_index, marketing_uplift, confidence_score, product_id")
      .gte("period_start", startDate)
      .lte("period_start", endDate)
      .order("period_start");

    if (error) {
      console.error("getDemandForecastsRaw error:", error.message);
      return [];
    }
    return data ?? [];
  } catch {
    return [];
  }
}

// ── Sales Daily → SKUTableRow[] ──

export async function getSKUDataFromDB(
  filters?: Partial<DashboardFilters>
): Promise<SKUTableRow[]> {
  try {
    const supabase = await createClient();
    const { startDate, endDate } = getDateRange(filters);

    // Fetch sales joined with product info
    let query = supabase
      .from("sales_daily")
      .select("sale_date, units_sold, product_id, products(id, sku, name, product_line, category)")
      .gte("sale_date", startDate)
      .lte("sale_date", endDate);

    if (filters?.channel && filters.channel !== "all") {
      query = query.eq("channel", filters.channel);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      if (error) console.error("getSKUDataFromDB error:", error.message);
      return [];
    }

    // Group by product, then by month
    const productMap = new Map<
      string,
      {
        sku: string;
        name: string;
        product_line: string;
        category: string;
        months: Map<string, { actual: number }>;
      }
    >();

    for (const row of data) {
      const product = row.products as unknown as {
        id: string;
        sku: string;
        name: string;
        product_line: string | null;
        category: string | null;
      } | null;
      if (!product) continue;

      const pid = product.id;
      if (!productMap.has(pid)) {
        productMap.set(pid, {
          sku: product.sku,
          name: product.name,
          product_line: product.product_line ?? "",
          category: product.category ?? "",
          months: new Map(),
        });
      }

      const mk = monthKey(row.sale_date);
      const entry = productMap.get(pid)!;
      const monthEntry = entry.months.get(mk) || { actual: 0 };
      monthEntry.actual += row.units_sold ?? 0;
      entry.months.set(mk, monthEntry);
    }

    // Filter by category if needed
    const skuRows: SKUTableRow[] = [];
    for (const [, prod] of productMap) {
      if (filters?.category && filters.category !== "all" && prod.category !== filters.category) {
        continue;
      }

      const months: SKUTableRow["months"] = {};
      let prevActual: number | null = null;

      const sortedMonths = Array.from(prod.months.keys()).sort();
      for (const m of sortedMonths) {
        const mData = prod.months.get(m)!;
        const momChange =
          prevActual !== null && prevActual > 0
            ? Math.round(((mData.actual - prevActual) / prevActual) * 1000) / 10
            : null;

        months[m] = {
          forecast_baseline: 0, // Will be filled from demand_forecasts if available
          forecast_ambitious: 0,
          actual: mData.actual,
          accuracy_pct: null,
          mom_change: momChange,
        };
        prevActual = mData.actual;
      }

      skuRows.push({
        sku_id: prod.sku,
        sku_title: prod.sku,
        product_type: prod.product_line,
        category: prod.category,
        months,
      });
    }

    return skuRows;
  } catch (err) {
    console.error("getSKUDataFromDB unexpected error:", err);
    return [];
  }
}

// ── Sales Daily → KPIData ──

export async function getKPIDataFromDB(
  filters?: Partial<DashboardFilters>
): Promise<KPIData | null> {
  try {
    const supabase = await createClient();
    const { startDate, endDate } = getDateRange(filters);

    // Current period sales
    let query = supabase
      .from("sales_daily")
      .select("sale_date, units_sold, gross_revenue, net_revenue, discounts")
      .gte("sale_date", startDate)
      .lte("sale_date", endDate);

    if (filters?.channel && filters.channel !== "all") {
      query = query.eq("channel", filters.channel);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return null;
    }

    const totalRevenue = data.reduce((sum, r) => sum + Number(r.net_revenue ?? 0), 0);

    // Ad spend for the period
    const { data: adData } = await supabase
      .from("ad_daily_spend")
      .select("spend")
      .gte("spend_date", startDate)
      .lte("spend_date", endDate);

    const totalAdSpend = (adData ?? []).reduce((sum, r) => sum + Number(r.spend ?? 0), 0);

    // Simple KPI computation (MoM changes require prior period data — use 0 as default)
    return {
      total_revenue: Math.round(totalRevenue),
      revenue_mom_change: 0,
      forecast_accuracy: 0,
      accuracy_mom_change: 0,
      total_ad_spend: Math.round(totalAdSpend),
      ad_spend_mom_change: 0,
      average_cac: totalAdSpend > 0 ? Math.round((totalAdSpend / Math.max(data.length, 1)) * 100) / 100 : 0,
      cac_mom_change: 0,
      gap_to_baseline: 0,
      gap_to_ambitious: 0,
    };
  } catch (err) {
    console.error("getKPIDataFromDB unexpected error:", err);
    return null;
  }
}

// ── Ad Daily Spend → AdSpendTableRow[] ──

export async function getAdSpendFromDB(
  filters?: Partial<DashboardFilters>
): Promise<AdSpendTableRow[]> {
  try {
    const supabase = await createClient();
    const { startDate, endDate } = getDateRange(filters);

    let query = supabase
      .from("ad_daily_spend")
      .select("spend_date, platform, spend, impressions, clicks, conversions, revenue_attributed, roas")
      .gte("spend_date", startDate)
      .lte("spend_date", endDate);

    if (filters?.adsPlatform && filters.adsPlatform !== "all") {
      query = query.eq("platform", filters.adsPlatform);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      if (error) console.error("getAdSpendFromDB error:", error.message);
      return [];
    }

    // Aggregate by month + platform
    const agg = new Map<string, { spend: number; impressions: number; clicks: number; conversions: number; revenue_attributed: number }>();

    for (const row of data) {
      const mk = monthKey(row.spend_date);
      const platformLabel = platformDisplayName(row.platform);
      const key = `${mk}|${platformLabel}`;
      const existing = agg.get(key) || { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue_attributed: 0 };
      existing.spend += Number(row.spend ?? 0);
      existing.impressions += row.impressions ?? 0;
      existing.clicks += row.clicks ?? 0;
      existing.conversions += row.conversions ?? 0;
      existing.revenue_attributed += Number(row.revenue_attributed ?? 0);
      agg.set(key, existing);
    }

    // Build rows sorted by month
    const rows: AdSpendTableRow[] = [];
    const sortedKeys = Array.from(agg.keys()).sort();
    const prevSpend = new Map<string, number>();

    for (const key of sortedKeys) {
      const [month, platform] = key.split("|");
      const vals = agg.get(key)!;
      const prev = prevSpend.get(platform) ?? 0;
      const momTrend = prev > 0 ? Math.round(((vals.spend - prev) / prev) * 1000) / 10 : 0;
      prevSpend.set(platform, vals.spend);

      rows.push({
        month,
        platform,
        spend: Math.round(vals.spend),
        impressions: vals.impressions ?? 0,
        clicks: vals.clicks ?? 0,
        ctr: vals.clicks && vals.impressions ? Math.round((vals.clicks / vals.impressions) * 10000) / 100 : 0,
        cpc: vals.clicks ? Math.round((vals.spend / vals.clicks) * 100) / 100 : 0,
        cpm: vals.impressions ? Math.round((vals.spend / vals.impressions * 1000) * 100) / 100 : 0,
        purchases: vals.conversions ?? 0,
        roas: vals.revenue_attributed && vals.spend ? Math.round((vals.revenue_attributed / vals.spend) * 100) / 100 : 0,
        mom_trend: momTrend,
      });
    }

    return rows;
  } catch (err) {
    console.error("getAdSpendFromDB unexpected error:", err);
    return [];
  }
}

function platformDisplayName(platform: string): string {
  const map: Record<string, string> = {
    meta: "Meta Ads",
    amazon_ads: "Amazon Ads",
    google_ads: "Google Ads",
    tiktok_ads: "TikTok Ads",
    other: "Other",
  };
  return map[platform] ?? platform;
}

// ── Inventory ──

export async function getInventoryFromDB(filters?: Partial<DashboardFilters>) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("inventory_levels")
      .select("snapshot_date, channel, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, days_of_supply, products(sku, name)")
      .order("snapshot_date", { ascending: false });

    if (filters?.channel && filters.channel !== "all") {
      query = query.eq("channel", filters.channel);
    }

    const { data, error } = await query;

    if (error) {
      console.error("getInventoryFromDB error:", error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("getInventoryFromDB unexpected error:", err);
    return [];
  }
}

// ── Demand Forecasts (public) ──

export async function getDemandForecastsFromDB(
  filters?: Partial<DashboardFilters>
): Promise<ForecastTableRow[]> {
  // Reuse the sales-based builder which incorporates demand forecasts
  return getSalesDailyFromDB(filters);
}

// ── Sync Logs ──

export async function getSyncLogsFromDB() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("getSyncLogsFromDB error:", error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("getSyncLogsFromDB unexpected error:", err);
    return [];
  }
}

// ── API Credentials ──

export async function getApiCredentialsFromDB() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("api_credentials")
      .select("id, platform, credential_name, is_active, last_used_at, expires_at, created_at")
      .order("platform");

    if (error) {
      console.error("getApiCredentialsFromDB error:", error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("getApiCredentialsFromDB unexpected error:", err);
    return [];
  }
}

export async function saveApiCredential(
  platform: string,
  credentialName: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Get the organization ID
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .limit(1)
      .single();

    if (!org) {
      console.error("saveApiCredential: no organization found");
      return false;
    }

    const { error } = await supabase.from("api_credentials").upsert(
      {
        organization_id: org.id,
        platform,
        credential_name: credentialName,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,platform,credential_name", ignoreDuplicates: false }
    );

    if (error) {
      console.error("saveApiCredential error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("saveApiCredential unexpected error:", err);
    return false;
  }
}

// ── Table row counts (for status endpoint) ──

export async function getTableCounts(): Promise<Record<string, number>> {
  try {
    const admin = createAdminClient();
    if (!admin) {
      // Fallback to authenticated client
      const supabase = await createClient();
      return await countTables(supabase);
    }
    return await countTables(admin);
  } catch (err) {
    console.error("getTableCounts unexpected error:", err);
    return {};
  }
}

async function countTables(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any
): Promise<Record<string, number>> {
  const tables = [
    "products",
    "sales_daily",
    "inventory_levels",
    "ad_daily_spend",
    "demand_forecasts",
    "api_credentials",
    "sync_logs",
    "sop_cycles",
    "anomalies",
    "seasonality_indices",
  ];

  const counts: Record<string, number> = {};

  for (const table of tables) {
    try {
      const { count, error } = await client
        .from(table)
        .select("*", { count: "exact", head: true });
      counts[table] = error ? 0 : (count ?? 0);
    } catch {
      counts[table] = 0;
    }
  }

  return counts;
}

// ── Check if Supabase has meaningful data ──

export async function hasSupabaseData(): Promise<{
  hasSalesData: boolean;
  hasProducts: boolean;
  salesCount: number;
  productsCount: number;
}> {
  try {
    const admin = createAdminClient();
    const client = admin ?? (await createClient());

    const [salesRes, productsRes] = await Promise.all([
      client.from("sales_daily").select("*", { count: "exact", head: true }),
      client.from("products").select("*", { count: "exact", head: true }),
    ]);

    const salesCount = salesRes.error ? 0 : (salesRes.count ?? 0);
    const productsCount = productsRes.error ? 0 : (productsRes.count ?? 0);

    return {
      hasSalesData: salesCount > 0,
      hasProducts: productsCount > 0,
      salesCount,
      productsCount,
    };
  } catch {
    return { hasSalesData: false, hasProducts: false, salesCount: 0, productsCount: 0 };
  }
}
