import { NextRequest, NextResponse } from "next/server";
import { MOCK_RECOMMENDATION, MOCK_FORECAST_TABLE, MOCK_KPI_DATA, MOCK_AD_SPEND_TABLE } from "@/lib/mock-data";
import {
  generateForecast,
  calculateAccuracy,
  calculateGap,
  type HistoricalDataPoint,
  type SeasonalityConfig,
} from "@/lib/forecast/engine";

/**
 * Build forecast context from mock data using the deterministic engine
 */
function buildForecastContext() {
  // Build historical data points from mock forecast table for the engine
  const historicalRows = MOCK_FORECAST_TABLE.filter((r) => r.actual !== null && r.month < "2026-03");

  const history: HistoricalDataPoint[] = historicalRows.map((r) => ({
    month: r.month,
    sku_id: "AGGREGATE",
    channel: "all",
    units_sold: r.actual as number,
    ad_spend: 0,
    price: 0,
  }));

  // Generate forecast for upcoming months using the engine
  const upcomingMonths = [3, 4, 5, 6]; // March through June
  const forecasts = upcomingMonths.map((targetMonth) => {
    const result = generateForecast({
      history,
      category: "drinks" as keyof SeasonalityConfig,
      targetMonth,
      plannedAdSpend: MOCK_KPI_DATA.total_ad_spend,
      historicalAvgAdSpend: MOCK_KPI_DATA.total_ad_spend * 1.03, // slightly above to model efficiency gain
      currentPrice: 12.99,
      baselinePrice: 12.99,
      channelShare: 1.0,
      conversionRate: 0.03,
    });

    const monthStr = `2026-${String(targetMonth).padStart(2, "0")}`;
    const mockRow = MOCK_FORECAST_TABLE.find((r) => r.month === monthStr);
    const actual = mockRow?.actual ?? null;

    return {
      month: monthStr,
      engine_baseline: result.baseline,
      engine_ambitious: result.ambitious,
      mock_baseline: mockRow?.forecast_baseline ?? null,
      actual,
      accuracy: actual !== null ? calculateAccuracy(result.baseline, actual) : null,
      gap: actual !== null ? calculateGap(result.baseline, actual) : null,
      components: result.components,
    };
  });

  // Compute ad spend summary
  const recentAdSpend = MOCK_AD_SPEND_TABLE.filter((r) => r.month >= "2026-01" && r.month <= "2026-03");
  const totalActualSpend = recentAdSpend.reduce((sum, r) => sum + r.spend_actual, 0);
  const totalBudgetSpend = recentAdSpend.reduce((sum, r) => sum + r.spend_budgeted, 0);

  return {
    kpi: {
      total_revenue: MOCK_KPI_DATA.total_revenue,
      revenue_mom_change: MOCK_KPI_DATA.revenue_mom_change,
      forecast_accuracy: MOCK_KPI_DATA.forecast_accuracy,
      average_cac: MOCK_KPI_DATA.average_cac,
      gap_to_baseline: MOCK_KPI_DATA.gap_to_baseline,
      gap_to_ambitious: MOCK_KPI_DATA.gap_to_ambitious,
    },
    engine_forecasts: forecasts,
    ad_spend_summary: {
      q1_actual: totalActualSpend,
      q1_budget: totalBudgetSpend,
      variance_pct: totalBudgetSpend > 0
        ? Math.round(((totalActualSpend - totalBudgetSpend) / totalBudgetSpend) * 100 * 10) / 10
        : 0,
    },
    historical_performance: historicalRows.map((r) => ({
      month: r.month,
      baseline: r.forecast_baseline,
      actual: r.actual,
      accuracy_pct: r.accuracy_pct,
      mom_change: r.mom_change,
    })),
  };
}

export async function GET() {
  return NextResponse.json(MOCK_RECOMMENDATION);
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(MOCK_RECOMMENDATION);
    }

    // Build data-driven context from the forecast engine
    const forecastContext = buildForecastContext();

    const systemPrompt = `You are an S&OP analyst for Agua de Madre (ADM), a UK-based health drinks company. Generate structured monthly recommendations based on the provided data.

The data includes:
- KPI summary (revenue, forecast accuracy, CAC, ad spend)
- Forecast engine outputs with seasonality, marketing uplift, and price impact components
- Historical performance data with accuracy tracking
- Ad spend vs budget variance

Output format (JSON):
{
  "executive_summary": "Brief overview of the month's performance",
  "trends": ["trend1", "trend2", ...],
  "anomalies": ["anomaly1", "anomaly2", ...],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "Ad Spend|Production|Channel Strategy|Pricing|Investor Relations",
      "action": "Specific actionable recommendation",
      "rationale": "Why this is recommended based on the forecast engine data",
      "expected_impact": "Quantified expected outcome"
    }
  ],
  "baseline_comparison": "How actuals compare to baseline forecast",
  "ambitious_comparison": "How actuals compare to ambitious targets"
}

Context: ADM sells Water Kefir, Romedio Infusion, Culture Shots, Fresco. Channels: Shopify (D2C) + Amazon. Ads: Meta (Shopify) + Amazon Ads. 80% revenue from Romedio/Teas. Currency: GBP.`;

    const { data } = await request.json();

    // Merge user-provided data with forecast engine context
    const enrichedData = {
      ...data,
      forecast_engine: forecastContext,
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Generate S&OP recommendations for March 2026 based on this data:\n\n${JSON.stringify(enrichedData, null, 2)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(MOCK_RECOMMENDATION);
    }

    const result = await response.json();
    const text = result.content[0]?.text || "";

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json({
        recommendation_id: `rec-${Date.now()}`,
        month: "2026-03",
        generated_at: new Date().toISOString(),
        run_type: "daily",
        summary_text: parsed,
        model_used: "claude-sonnet-4-6",
      });
    } catch {
      return NextResponse.json(MOCK_RECOMMENDATION);
    }
  } catch (error) {
    console.error("Recommendations API error:", error);
    return NextResponse.json(MOCK_RECOMMENDATION);
  }
}
