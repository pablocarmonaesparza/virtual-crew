/**
 * Transform Meta Ads API data into dashboard-compatible formats.
 */

import type { AdSpendTableRow, CACTableRow } from "@/types";
import type { MetaMonthlyInsight } from "./client";

/**
 * Transform Meta monthly insights into AdSpendTableRow[] for the Ad Spend table.
 * Uses real Meta API metrics: spend, impressions, clicks, CTR, CPC, CPM, purchases, ROAS.
 */
export function transformMetaToAdSpendRows(
  insights: MetaMonthlyInsight[]
): AdSpendTableRow[] {
  const sorted = [...insights].sort((a, b) => a.month.localeCompare(b.month));

  return sorted.map((row, idx) => {
    const prevSpend = idx > 0 ? sorted[idx - 1].spend : row.spend;
    const momTrend = prevSpend > 0
      ? ((row.spend - prevSpend) / prevSpend) * 100
      : 0;

    return {
      month: row.month,
      platform: "Meta Ads",
      spend: Math.round(row.spend * 100) / 100,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: Math.round(row.ctr * 100) / 100,
      cpc: Math.round(row.cpc * 100) / 100,
      cpm: Math.round(row.cpm * 100) / 100,
      purchases: row.purchases,
      roas: Math.round(row.roas * 100) / 100,
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
 * Build chart-compatible data from Meta insights for the Ad Spend chart.
 * Returns spend + ROAS per month for trend visualization.
 */
export function transformMetaToChartData(
  insights: MetaMonthlyInsight[]
): { month: string; meta_spend: number; meta_roas: number; meta_ctr: number; meta_purchases: number }[] {
  return insights
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => {
      const [year, monthNum] = row.month.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const label = `${monthNames[parseInt(monthNum) - 1]} ${year.slice(2)}`;

      return {
        month: label,
        meta_spend: Math.round(row.spend),
        meta_roas: Math.round(row.roas * 100) / 100,
        meta_ctr: Math.round(row.ctr * 100) / 100,
        meta_purchases: row.purchases,
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
  spend_mom_change: number;
  cac_mom_change: number;
} {
  if (insights.length === 0) {
    return { total_spend: 0, total_purchases: 0, avg_cac: 0, avg_roas: 0, latest_month_spend: 0, spend_mom_change: 0, cac_mom_change: 0 };
  }

  const sorted = [...insights].sort((a, b) => a.month.localeCompare(b.month));

  // Use latest month only (matches Shopify/mock KPI semantics)
  const latest = sorted[sorted.length - 1];
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  const spendMomChange = prev && prev.spend > 0
    ? ((latest.spend - prev.spend) / prev.spend) * 100
    : 0;

  // CAC MoM is derived from CAC values, not spend
  const cacMomChange = prev && prev.cac > 0
    ? ((latest.cac - prev.cac) / prev.cac) * 100
    : 0;

  return {
    total_spend: latest.spend, // Latest month only
    total_purchases: latest.purchases,
    avg_cac: latest.cac, // Latest month CAC
    avg_roas: latest.roas,
    latest_month_spend: latest.spend,
    spend_mom_change: spendMomChange,
    cac_mom_change: cacMomChange,
  };
}
