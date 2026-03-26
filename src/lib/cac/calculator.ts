/**
 * Real CAC Calculator
 *
 * Combines Meta Ads spend data with customer acquisition counts
 * to compute actual Customer Acquisition Cost.
 *
 * Formula: CAC = Ad Spend / New Customers Acquired
 *
 * When Shopify customer data is unavailable, uses Meta purchases
 * as a proxy for new customer acquisitions.
 */

import type { CACTableRow } from "@/types";
import type { MetaMonthlyInsight } from "@/lib/meta/client";

interface CustomerCounts {
  month: string;
  new_customers: number;
  returning_customers: number;
  subscription_count: number;
  subscription_revenue: number;
  one_time_count: number;
}

/**
 * Calculate real CAC from Meta Ads spend + customer acquisition data.
 *
 * @param metaInsights Monthly Meta Ads data (real from API)
 * @param customerCounts Monthly customer counts (from Shopify or estimated)
 */
export function calculateRealCAC(
  metaInsights: MetaMonthlyInsight[],
  customerCounts?: CustomerCounts[]
): CACTableRow[] {
  const sorted = [...metaInsights].sort((a, b) => a.month.localeCompare(b.month));
  const rows: CACTableRow[] = [];

  let prevCAC = 0;

  for (const insight of sorted) {
    const customers = customerCounts?.find((c) => c.month === insight.month);

    // Use Shopify customer data if available, otherwise estimate from Meta purchases
    const newCustomers = customers?.new_customers ?? Math.round(insight.purchases * 0.65);
    const returningCustomers = customers?.returning_customers ?? Math.round(insight.purchases * 0.35);
    const subscriptionCount = customers?.subscription_count ?? 0;
    const subscriptionRevenue = customers?.subscription_revenue ?? 0;
    const oneTimeCount = customers?.one_time_count ?? newCustomers + returningCustomers;

    // Real CAC = Meta Ad Spend / New Customers
    const totalCustomers = newCustomers + returningCustomers;
    const newCAC = newCustomers > 0 ? insight.spend / newCustomers : 0;

    // Allocate 70% of spend to new customer acquisition, 30% to retention
    const retentionSpend = insight.spend * 0.3;
    const returningCAC = returningCustomers > 0 ? retentionSpend / returningCustomers : 0;

    const totalCAC = totalCustomers > 0 ? insight.spend / totalCustomers : 0;

    const cacMomChange = prevCAC > 0
      ? Math.round(((totalCAC - prevCAC) / prevCAC) * 1000) / 10
      : 0;

    prevCAC = totalCAC;

    rows.push({
      month: insight.month,
      channel: "Meta Ads",
      new_customers: newCustomers,
      new_cac: Math.round(newCAC * 100) / 100,
      returning_customers: returningCustomers,
      returning_cac: Math.round(returningCAC * 100) / 100,
      subscription_count: subscriptionCount,
      subscription_revenue: subscriptionRevenue,
      one_time_count: oneTimeCount,
      total_cac: Math.round(totalCAC * 100) / 100,
      cac_mom_change: cacMomChange,
    });
  }

  return rows;
}

/**
 * Estimate customer counts from Meta purchase data when Shopify isn't connected.
 * Assumes ~65% of purchases are new customers, ~35% are returning.
 */
export function estimateCustomerCountsFromMeta(
  metaInsights: MetaMonthlyInsight[]
): CustomerCounts[] {
  return metaInsights.map((insight) => ({
    month: insight.month,
    new_customers: Math.round(insight.purchases * 0.65),
    returning_customers: Math.round(insight.purchases * 0.35),
    subscription_count: 0,
    subscription_revenue: 0,
    one_time_count: insight.purchases,
  }));
}
