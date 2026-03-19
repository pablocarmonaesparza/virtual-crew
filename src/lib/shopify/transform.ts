import type {
  ForecastTableRow,
  SKUTableRow,
  KPIData,
  CACTableRow,
  ShopifyOrder,
} from "@/types";
import type { ShopifyRawOrder, ShopifyRawCustomer } from "./client";
import { MOCK_SKUS } from "@/lib/mock-data";

// ── Helper: format month string ──

function toMonthString(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// ── Transform raw Shopify orders to our internal ShopifyOrder type ──

export function transformRawOrders(
  rawOrders: ShopifyRawOrder[]
): ShopifyOrder[] {
  const result: ShopifyOrder[] = [];

  for (const order of rawOrders) {
    const isReturning =
      order.customer !== null && order.customer.orders_count > 1;
    const isSubscription =
      order.tags?.toLowerCase().includes("subscription") ?? false;

    for (const item of order.line_items) {
      result.push({
        order_id: order.name || String(order.id),
        order_date: order.created_at,
        sku_id: item.sku || `UNKNOWN-${item.product_id}`,
        quantity: item.quantity,
        gross_revenue: parseFloat(item.price) * item.quantity,
        net_revenue:
          parseFloat(item.price) * item.quantity -
          parseFloat(item.total_discount || "0"),
        discount_amount: parseFloat(item.total_discount || "0"),
        customer_type: isReturning ? "returning" : "new",
        subscription_type: isSubscription ? "subscription" : "one-time",
        channel: "Shopify",
        synced_at: new Date().toISOString(),
      });
    }
  }

  return result;
}

// ── Group orders by month ──

interface MonthlyAggregation {
  month: string;
  total_units: number;
  gross_revenue: number;
  net_revenue: number;
  new_customers: Set<string>;
  returning_customers: Set<string>;
  subscription_orders: number;
  one_time_orders: number;
}

function aggregateByMonth(
  orders: ShopifyOrder[]
): Map<string, MonthlyAggregation> {
  const monthMap = new Map<string, MonthlyAggregation>();

  for (const order of orders) {
    const month = toMonthString(order.order_date);
    let agg = monthMap.get(month);
    if (!agg) {
      agg = {
        month,
        total_units: 0,
        gross_revenue: 0,
        net_revenue: 0,
        new_customers: new Set(),
        returning_customers: new Set(),
        subscription_orders: 0,
        one_time_orders: 0,
      };
      monthMap.set(month, agg);
    }

    agg.total_units += order.quantity;
    agg.gross_revenue += order.gross_revenue;
    agg.net_revenue += order.net_revenue;

    // Track unique customers by order_id as a proxy
    if (order.customer_type === "new") {
      agg.new_customers.add(order.order_id);
    } else {
      agg.returning_customers.add(order.order_id);
    }

    if (order.subscription_type === "subscription") {
      agg.subscription_orders += 1;
    } else {
      agg.one_time_orders += 1;
    }
  }

  return monthMap;
}

// ── Transform orders into ForecastTableRow[] ──

export function transformOrdersToForecast(
  orders: ShopifyOrder[]
): ForecastTableRow[] {
  const monthMap = aggregateByMonth(orders);
  const months = Array.from(monthMap.keys()).sort();

  const currentMonth = toMonthString(new Date().toISOString());
  const currentDay = new Date().getDate();
  const daysInCurrentMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();

  const rows: ForecastTableRow[] = [];
  let previousActual: number | null = null;

  for (const month of months) {
    const agg = monthMap.get(month)!;
    const actual = agg.total_units;
    const isCurrent = month === currentMonth;

    // We don't have forecast baselines from Shopify, so we calculate rough
    // estimates based on a moving average of past months.
    const pastMonths = months
      .filter((m) => m < month)
      .slice(-3);
    const pastActuals = pastMonths.map(
      (m) => monthMap.get(m)?.total_units ?? 0
    );
    const avgBaseline =
      pastActuals.length > 0
        ? Math.round(
            pastActuals.reduce((s, v) => s + v, 0) / pastActuals.length
          )
        : actual;
    const forecastBaseline = avgBaseline || actual;
    const forecastAmbitious = Math.round(forecastBaseline * 1.25);

    const accuracyPct =
      !isCurrent && forecastBaseline > 0
        ? Math.round((actual / forecastBaseline) * 1000) / 10
        : null;

    const mtdPerformance =
      isCurrent && forecastBaseline > 0
        ? Math.round((actual / forecastBaseline) * 1000) / 10
        : null;

    const gapBaseline = !isCurrent ? actual - forecastBaseline : null;
    const gapBaselinePct =
      gapBaseline !== null && forecastBaseline > 0
        ? Math.round((gapBaseline / forecastBaseline) * 1000) / 10
        : null;
    const gapAmbitious = !isCurrent ? actual - forecastAmbitious : null;
    const gapAmbitiousPct =
      gapAmbitious !== null && forecastAmbitious > 0
        ? Math.round((gapAmbitious / forecastAmbitious) * 1000) / 10
        : null;

    const momChange =
      previousActual !== null && previousActual > 0
        ? Math.round(((actual - previousActual) / previousActual) * 1000) / 10
        : null;

    rows.push({
      month,
      forecast_baseline: forecastBaseline,
      forecast_ambitious: forecastAmbitious,
      actual: isCurrent ? actual : actual,
      accuracy_pct: accuracyPct,
      mtd_performance: mtdPerformance,
      gap_baseline: gapBaseline,
      gap_baseline_pct: gapBaselinePct,
      gap_ambitious: gapAmbitious,
      gap_ambitious_pct: gapAmbitiousPct,
      mom_change: momChange,
    });

    previousActual = actual;
  }

  return rows;
}

// ── Transform orders into SKUTableRow[] ──

export function transformOrdersToSKUTable(
  orders: ShopifyOrder[]
): SKUTableRow[] {
  // Group by SKU then by month
  const skuMap = new Map<
    string,
    {
      sku_id: string;
      months: Map<string, { units: number; revenue: number }>;
    }
  >();

  for (const order of orders) {
    let entry = skuMap.get(order.sku_id);
    if (!entry) {
      entry = { sku_id: order.sku_id, months: new Map() };
      skuMap.set(order.sku_id, entry);
    }

    const month = toMonthString(order.order_date);
    let monthData = entry.months.get(month);
    if (!monthData) {
      monthData = { units: 0, revenue: 0 };
      entry.months.set(month, monthData);
    }

    monthData.units += order.quantity;
    monthData.revenue += order.net_revenue;
  }

  const currentMonth = toMonthString(new Date().toISOString());

  const rows: SKUTableRow[] = [];

  for (const [skuId, entry] of skuMap) {
    // Try to find this SKU in our known SKU catalog
    const knownSku = MOCK_SKUS.find((s) => s.sku_id === skuId);

    const allMonths = Array.from(entry.months.keys()).sort();
    const monthsRecord: SKUTableRow["months"] = {};

    let prevActual: number | null = null;
    for (const month of allMonths) {
      const data = entry.months.get(month)!;
      const actual = data.units;
      const isCurrent = month === currentMonth;

      // Calculate baseline from past months average
      const pastMonths = allMonths.filter((m) => m < month).slice(-3);
      const pastActuals = pastMonths.map(
        (m) => entry.months.get(m)?.units ?? 0
      );
      const avgBaseline =
        pastActuals.length > 0
          ? Math.round(
              pastActuals.reduce((s, v) => s + v, 0) / pastActuals.length
            )
          : actual;
      const forecastBaseline = avgBaseline || actual;
      const forecastAmbitious = Math.round(forecastBaseline * 1.25);

      const accuracyPct =
        !isCurrent && forecastBaseline > 0
          ? Math.round((actual / forecastBaseline) * 1000) / 10
          : null;

      const momChange =
        prevActual !== null && prevActual > 0
          ? Math.round(((actual - prevActual) / prevActual) * 1000) / 10
          : null;

      monthsRecord[month] = {
        forecast_baseline: forecastBaseline,
        forecast_ambitious: forecastAmbitious,
        actual,
        accuracy_pct: accuracyPct,
        mom_change: momChange,
      };

      prevActual = actual;
    }

    rows.push({
      sku_id: skuId,
      sku_title: knownSku?.sku_title ?? skuId,
      product_type: knownSku?.product_type ?? "Unknown",
      category: knownSku?.category ?? "drinks",
      months: monthsRecord,
    });
  }

  return rows;
}

// ── Transform orders into KPIData ──

export function transformOrdersToKPI(orders: ShopifyOrder[]): KPIData {
  const monthMap = aggregateByMonth(orders);
  const months = Array.from(monthMap.keys()).sort();

  if (months.length === 0) {
    return {
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
  }

  const currentMonthStr = toMonthString(new Date().toISOString());
  // Use most recent completed month or current month
  const latestMonth =
    months.find((m) => m === currentMonthStr) || months[months.length - 1];
  const latestAgg = monthMap.get(latestMonth)!;

  // Previous month for MoM
  const latestIdx = months.indexOf(latestMonth);
  const prevMonth = latestIdx > 0 ? months[latestIdx - 1] : null;
  const prevAgg = prevMonth ? monthMap.get(prevMonth) : null;

  const totalRevenue = Math.round(latestAgg.net_revenue * 100) / 100;
  const prevRevenue = prevAgg ? prevAgg.net_revenue : totalRevenue;
  const revenueMoMChange =
    prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 1000) / 10
      : 0;

  // Estimate forecast accuracy from available data
  const pastCompletedMonths = months.filter((m) => m < currentMonthStr);
  let avgAccuracy = 0;
  let accuracyCount = 0;
  for (const m of pastCompletedMonths.slice(-3)) {
    const agg = monthMap.get(m)!;
    // Use moving average as baseline proxy
    const pastOfM = pastCompletedMonths
      .filter((pm) => pm < m)
      .slice(-3);
    const pastUnits = pastOfM.map((pm) => monthMap.get(pm)?.total_units ?? 0);
    const baseline =
      pastUnits.length > 0
        ? pastUnits.reduce((s, v) => s + v, 0) / pastUnits.length
        : agg.total_units;
    if (baseline > 0) {
      avgAccuracy += (agg.total_units / baseline) * 100;
      accuracyCount++;
    }
  }
  const forecastAccuracy =
    accuracyCount > 0
      ? Math.round((avgAccuracy / accuracyCount) * 10) / 10
      : 100;

  // Gap calculations based on moving average forecasts
  const recentMonths = months.filter((m) => m < latestMonth).slice(-3);
  const recentUnits = recentMonths.map(
    (m) => monthMap.get(m)?.total_units ?? 0
  );
  const baseline =
    recentUnits.length > 0
      ? Math.round(recentUnits.reduce((s, v) => s + v, 0) / recentUnits.length)
      : latestAgg.total_units;
  const ambitious = Math.round(baseline * 1.25);

  const gapToBaseline =
    baseline > 0
      ? Math.round(
          ((latestAgg.total_units - baseline) / baseline) * 1000
        ) / 10
      : 0;
  const gapToAmbitious =
    ambitious > 0
      ? Math.round(
          ((latestAgg.total_units - ambitious) / ambitious) * 1000
        ) / 10
      : 0;

  return {
    total_revenue: totalRevenue,
    revenue_mom_change: revenueMoMChange,
    forecast_accuracy: forecastAccuracy,
    accuracy_mom_change: 0, // Would need historical accuracy data
    total_ad_spend: 0, // Ad spend comes from ad platforms, not Shopify
    ad_spend_mom_change: 0,
    average_cac: 0, // CAC requires ad spend data
    cac_mom_change: 0,
    gap_to_baseline: gapToBaseline,
    gap_to_ambitious: gapToAmbitious,
  };
}

// ── Transform customers into CACTableRow[] ──
// Note: True CAC calculation requires ad spend data from Meta/Amazon.
// This provides the customer counts needed for CAC once ad data is available.

export function transformCustomersToCAC(
  orders: ShopifyOrder[],
  _customers: ShopifyRawCustomer[]
): CACTableRow[] {
  const monthMap = aggregateByMonth(orders);
  const months = Array.from(monthMap.keys()).sort();

  const rows: CACTableRow[] = [];
  let prevTotalCac = 0;

  for (const month of months) {
    const agg = monthMap.get(month)!;
    const newCount = agg.new_customers.size;
    const returningCount = agg.returning_customers.size;
    const subscriptionCount = agg.subscription_orders;
    const oneTimeCount = agg.one_time_orders;

    // Without ad spend data, we can't calculate real CAC.
    // Estimate based on industry benchmarks as placeholder.
    const estimatedAdSpend = agg.net_revenue * 0.15; // assume 15% of revenue
    const totalCac =
      newCount + returningCount > 0
        ? Math.round((estimatedAdSpend / (newCount + returningCount)) * 100) /
          100
        : 0;
    const newCac =
      newCount > 0
        ? Math.round((estimatedAdSpend * 0.7 / newCount) * 100) / 100
        : 0;
    const returningCac =
      returningCount > 0
        ? Math.round(
            (estimatedAdSpend * 0.3 / returningCount) * 100
          ) / 100
        : 0;

    // Estimate subscription revenue
    const subscriptionRevenue = Math.round(
      agg.net_revenue * (subscriptionCount / Math.max(subscriptionCount + oneTimeCount, 1))
    );

    const cacMomChange =
      prevTotalCac > 0
        ? Math.round(((totalCac - prevTotalCac) / prevTotalCac) * 1000) / 10
        : 0;

    rows.push({
      month,
      channel: "Shopify",
      new_customers: newCount,
      new_cac: newCac,
      returning_customers: returningCount,
      returning_cac: returningCac,
      subscription_count: subscriptionCount,
      subscription_revenue: subscriptionRevenue,
      one_time_count: oneTimeCount,
      total_cac: totalCac,
      cac_mom_change: cacMomChange,
    });

    prevTotalCac = totalCac;
  }

  return rows;
}
