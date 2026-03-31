import { NextResponse } from "next/server";
import {
  generateForecast,
  computeSeasonalityIndices,
  extractSeasonalBucket,
  type SalesDataPoint,
} from "@/lib/forecast/engine";
import { getOrders, isShopifyConnected } from "@/lib/shopify/client";
import { getMonthlyInsights, isMetaConnected } from "@/lib/meta/client";
import type { RunAnalysisResult, SeasonalityMonth, ForecastDriver } from "@/types";

// UK health drink market seasonality benchmarks
// Based on ADM's actual data pattern (Feb trough, Aug-Nov peak) + UK FMCG benchmarks
// Used ONLY for the seasonal chart when no Shopify data is available — NOT as actuals
const UK_HEALTH_DRINK_SEASONALITY: Record<number, number> = {
  1: 1.15,  // January — NY health kick, subscription sign-ups peak
  2: 0.82,  // February — post-NY trough (ADM's actual lowest month)
  3: 0.88,  // March — still recovering
  4: 0.95,  // April — Easter, spring, slowly climbing
  5: 1.05,  // May — warmer weather, outdoor occasions
  6: 1.12,  // June — summer begins
  7: 1.18,  // July — summer peak
  8: 1.22,  // August — peak summer (ADM's highest one-time month)
  9: 1.08,  // September — back to routine, health reset
  10: 0.95, // October — quieter month
  11: 1.18, // November — gifting, Black Friday (Remedio gift sets)
  12: 1.08, // December — Christmas gifting
};

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function toMonthString(date: Date): string {
  // Use UTC to avoid server-timezone mismatches with Shopify's ISO timestamps
  return date.toISOString().substring(0, 7);
}

function buildSeasonalityOutput(
  computedIndices: Map<number, number>,
  useComputed: boolean
): SeasonalityMonth[] {
  const months: SeasonalityMonth[] = [];
  for (let m = 1; m <= 12; m++) {
    // Use computed indices from real Shopify data when available; fall back to benchmarks
    const index = useComputed && computedIndices.has(m)
      ? computedIndices.get(m)!
      : UK_HEALTH_DRINK_SEASONALITY[m];
    months.push({
      month: m,
      label: MONTH_LABELS[m - 1],
      index: Math.round(index * 100) / 100,
      isPeak: false,
      isTrough: false,
    });
  }
  const maxIdx = months.reduce((a, b) => (a.index > b.index ? a : b));
  const minIdx = months.reduce((a, b) => (a.index < b.index ? a : b));
  maxIdx.isPeak = true;
  minIdx.isTrough = true;
  return months;
}

export async function POST() {
  // Auth guard lives in middleware (disabled until multi-tenancy is ready — see src/middleware.ts)
  try {
    const shopifyConnected = await isShopifyConnected().catch(() => false);
    const metaConnected = await isMetaConnected().catch(() => false);

    let history: SalesDataPoint[] = [];
    let avgMetaSpend = 0;
    const metaInsightsByMonth: Map<string, number> = new Map();

    // --- Pull Meta Ads spend (before Shopify so we can enrich history) ---
    if (metaConnected) {
      try {
        const now = new Date();
        // Query full months only: from 14 months ago to end of last completed month
        const since = new Date(now.getFullYear(), now.getMonth() - 14, 1)
          .toISOString()
          .substring(0, 10);
        const until = new Date(now.getFullYear(), now.getMonth(), 0)
          .toISOString()
          .substring(0, 10);
        const insights = await getMonthlyInsights(since, until);
        if (insights && insights.length > 0) {
          avgMetaSpend = insights.reduce((s, i) => s + (i.spend ?? 0), 0) / insights.length;
          for (const insight of insights) {
            metaInsightsByMonth.set(insight.month, insight.spend);
          }
        }
      } catch {
        // Meta spend is optional — continue without it
      }
    }

    // --- Pull Shopify orders and aggregate to monthly ---
    if (shopifyConnected) {
      try {
        const now = new Date();
        // Snap to full months: first day 14 months ago → end of last completed month
        const createdAtMin = new Date(now.getFullYear(), now.getMonth() - 14, 1);
        // End of last completed month: start of current month minus 1ms
        const createdAtMax = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        const rawOrders = await getOrders({
          created_at_min: createdAtMin.toISOString(),
          created_at_max: createdAtMax.toISOString(),
          status: "any",
          limit: "250",
        });

        // Aggregate by month
        const monthly = new Map<string, { units: number; revenue: number }>();
        for (const order of rawOrders) {
          const period = toMonthString(new Date(order.created_at));
          const current = monthly.get(period) ?? { units: 0, revenue: 0 };
          for (const item of order.line_items) {
            current.units += item.quantity;
            current.revenue += parseFloat(item.price) * item.quantity;
          }
          monthly.set(period, current);
        }

        // Sort chronologically and enrich with Meta ad spend per month
        history = Array.from(monthly.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([period, { units, revenue }]) => ({
            period,
            units,
            revenue,
            adSpend: metaInsightsByMonth.get(period) ?? undefined,
          }));
      } catch (err) {
        console.error("Failed to fetch Shopify orders for run-analysis:", err);
      }
    }

    // --- Insufficient data: return seasonality benchmarks only, no actuals/forecast ---
    // We require 8+ months before running the engine so seasonality computation
    // and forecast generation use the same data window (consistent with seasonalityComputed).
    if (history.length < 8) {
      const seasonality = buildSeasonalityOutput(new Map(), false);
      const neutralDrivers: ForecastDriver[] = [
        { label: "Trend", value: 1.0, pctChange: 0, direction: "neutral" },
        { label: "Seasonality", value: 1.0, pctChange: 0, direction: "neutral" },
        { label: "Marketing", value: 1.0, pctChange: 0, direction: "neutral" },
      ];
      const result: RunAnalysisResult = {
        actuals: [],
        forecast: [],
        seasonality,
        seasonalityComputed: false,
        drivers: neutralDrivers,
        dataSource: "defaults",
        generatedAt: new Date().toISOString(),
      };
      return NextResponse.json(result);
    }

    // --- Run forecast engine on real Shopify history ---
    const AMBITIOUS_MULTIPLIER = 1.30; // +30% vs baseline
    const dataSource: RunAnalysisResult["dataSource"] = "shopify";

    const forecastResults = generateForecast(history, {
      alpha: 0.25,
      forecastPeriods: 6,
      plannedAdSpend: avgMetaSpend > 0 ? avgMetaSpend * 1.08 : undefined,
      marketingElasticity: 0.3,
    });

    // Compute seasonality from actual Shopify data
    const computedIndices = computeSeasonalityIndices(history);
    // Use computed indices when we have at least 8 months (enough to cover most seasonal buckets)
    const useComputedSeasonality = history.length >= 8;

    // Actuals: already sorted chronologically — take last 12 months
    const actuals = history
      .slice(-12)
      .map((dp) => ({ period: dp.period, units: dp.units, revenue: dp.revenue }));

    // Forecast: future 6 months
    const forecast = forecastResults.map((r) => {
      const bucket = extractSeasonalBucket(r.period);
      const seasonalIdx = useComputedSeasonality && computedIndices.has(bucket)
        ? computedIndices.get(bucket)!
        : (UK_HEALTH_DRINK_SEASONALITY[bucket] ?? 1.0);

      return {
        period: r.period,
        baseline: Math.round(r.forecast),
        ambitious: Math.round(r.forecast * AMBITIOUS_MULTIPLIER),
        forecast: Math.round(r.forecast),
        confidenceLower: Math.round(r.confidenceLower),
        confidenceUpper: Math.round(r.confidenceUpper),
        seasonalityIndex: seasonalIdx,
        marketingUplift: r.marketingUplift,
      };
    });

    // Seasonality: use computed indices from Shopify when sufficient
    const seasonality = buildSeasonalityOutput(computedIndices, useComputedSeasonality);

    // Driver attribution
    const avgForecastResult = forecastResults[0];
    const marketingUpliftPct = avgForecastResult
      ? Math.round((avgForecastResult.marketingUplift - 1) * 1000) / 10
      : 0;

    // Trend: compare last 3 months vs prior 3 months (from real Shopify data)
    let trendPct = 0;
    if (history.length >= 6) {
      const recent3 = history.slice(-3).reduce((s, d) => s + d.units, 0) / 3;
      const prev3 = history.slice(-6, -3).reduce((s, d) => s + d.units, 0) / 3;
      trendPct = prev3 > 0 ? Math.round(((recent3 - prev3) / prev3) * 1000) / 10 : 0;
    }

    // Seasonality driver: use the computed or benchmark index for the current month
    const currentMonth = new Date().getMonth() + 1;
    const currentSeasonalityIndex = useComputedSeasonality && computedIndices.has(currentMonth)
      ? computedIndices.get(currentMonth)!
      : (UK_HEALTH_DRINK_SEASONALITY[currentMonth] ?? 1.0);
    const seasonalityPct = Math.round((currentSeasonalityIndex - 1) * 1000) / 10;

    const drivers: ForecastDriver[] = [
      {
        label: "Trend",
        value: 1 + trendPct / 100,
        pctChange: trendPct,
        direction: trendPct > 0 ? "up" : trendPct < 0 ? "down" : "neutral",
      },
      {
        label: "Seasonality",
        value: currentSeasonalityIndex,
        pctChange: seasonalityPct,
        direction: seasonalityPct > 0 ? "up" : seasonalityPct < 0 ? "down" : "neutral",
      },
      {
        label: "Marketing",
        value: avgForecastResult?.marketingUplift ?? 1.0,
        pctChange: marketingUpliftPct,
        direction: marketingUpliftPct > 0 ? "up" : marketingUpliftPct < 0 ? "down" : "neutral",
      },
    ];

    const result: RunAnalysisResult = {
      actuals,
      forecast,
      seasonality,
      seasonalityComputed: useComputedSeasonality,
      drivers,
      dataSource,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Run analysis error:", error);
    return NextResponse.json(
      { error: "Failed to run analysis" },
      { status: 500 }
    );
  }
}
