/**
 * Transform Meta Ads API data into dashboard-compatible formats.
 */

import type { AdSpendTableRow, CACTableRow } from "@/types";
import type { MetaMonthlyInsight } from "./client";

/**
 * Transform Meta monthly insights into AdSpendTableRow[] for the Ad Spend table.
 * Since we don't have "budgeted" data from the Meta API, we estimate
 * the budget as the previous month's actual spend (MoM comparison).
 */
export function transformMetaToAdSpendRows(
  insights: MetaMonthlyInsight[]
): AdSpendTableRow[] {
  // Sort by month ascending
  const sorted = [...insights].sort((a, b) => a.month.localeCompare(b.month));

  return sorted.map((row, idx) => {
    const prevSpend = idx > 0 ? sorted[idx - 1].spend : row.spend;
    const momTrend = prevSpend > 0
      ? ((row.spend - prevSpend) / prevSpend) * 100
      : 0;

    return {
      month: row.month,
      platform: "Meta Ads",
      spend_actual: Math.round(row.spend * 100) / 100,
      spend_budgeted: 0, // No budget data from Meta API
      variance: 0,
      variance_pct: 0,
      mom_trend: Math.round(momTrend * 10) / 10,
    };
  });
}

/**
 * Transform Meta insights into CAC contribution data.
 * This provides the Meta Ads portion of CAC calculations.
 */
export function transformMetaToCACContribution(
  insights: MetaMonthlyInsight[]
): { month: string; meta_spend: number; meta_purchases: number; meta_cac: number }[] {
  return insights.map((row) => ({
    month: row.month,
    meta_spend: row.spend,
    meta_purchases: row.purchases,
    meta_cac: row.cac,
  }));
}

/**
 * Merge Meta ad spend data with existing ad spend rows (e.g., Amazon Ads mock data).
 * Meta real data replaces any mock Meta data; Amazon mock data is preserved.
 */
export function mergeAdSpendData(
  metaRows: AdSpendTableRow[],
  existingRows: AdSpendTableRow[]
): AdSpendTableRow[] {
  // Filter out any existing Meta mock data
  const nonMetaRows = existingRows.filter(
    (r) => r.platform !== "Meta Ads"
  );

  // Combine real Meta + other platform data
  return [...metaRows, ...nonMetaRows].sort((a, b) => {
    const monthCmp = a.month.localeCompare(b.month);
    if (monthCmp !== 0) return monthCmp;
    return a.platform.localeCompare(b.platform);
  });
}

/**
 * Build chart-compatible data from Meta insights.
 * Returns data matching the AdSpendChart expected format.
 */
export function transformMetaToChartData(
  insights: MetaMonthlyInsight[]
): { month: string; meta_actual: number; meta_budget: number }[] {
  return insights
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => {
      // Format month label: "Oct 25", "Nov 25", etc.
      const [year, monthNum] = row.month.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const label = `${monthNames[parseInt(monthNum) - 1]} ${year.slice(2)}`;

      return {
        month: label,
        meta_actual: Math.round(row.spend),
        meta_budget: 0, // No budget data from API
      };
    });
}

/**
 * Build KPI ad spend summary from Meta insights.
 */
export function getMetaKPISummary(insights: MetaMonthlyInsight[]): {
  total_spend: number;
  total_purchases: number;
  avg_cac: number;
  avg_roas: number;
  latest_month_spend: number;
  mom_change: number;
} {
  if (insights.length === 0) {
    return { total_spend: 0, total_purchases: 0, avg_cac: 0, avg_roas: 0, latest_month_spend: 0, mom_change: 0 };
  }

  const sorted = [...insights].sort((a, b) => a.month.localeCompare(b.month));
  const totalSpend = sorted.reduce((sum, r) => sum + r.spend, 0);
  const totalPurchases = sorted.reduce((sum, r) => sum + r.purchases, 0);
  const totalRevenue = sorted.reduce((sum, r) => sum + r.purchase_value, 0);

  const latest = sorted[sorted.length - 1];
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  const momChange = prev && prev.spend > 0
    ? ((latest.spend - prev.spend) / prev.spend) * 100
    : 0;

  return {
    total_spend: totalSpend,
    total_purchases: totalPurchases,
    avg_cac: totalPurchases > 0 ? totalSpend / totalPurchases : 0,
    avg_roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    latest_month_spend: latest.spend,
    mom_change: momChange,
  };
}
