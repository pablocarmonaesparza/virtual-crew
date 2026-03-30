import { NextRequest, NextResponse } from "next/server";
import { MOCK_RECOMMENDATION } from "@/lib/mock-data";
import { getKPIData, getAdSpendData } from "@/lib/data/service";

export async function GET() {
  return NextResponse.json(MOCK_RECOMMENDATION);
}

/**
 * Build live context from connected data sources for recommendation prompts.
 * Returns whatever data is available (may be empty if nothing connected).
 */
async function buildLiveContext() {
  try {
    const [kpi, adSpend] = await Promise.all([
      getKPIData({}).catch(() => null),
      getAdSpendData({}).catch(() => null),
    ]);
    return {
      kpi: kpi || { note: "No KPI data — connect Shopify or Meta Ads" },
      ad_spend: adSpend && adSpend.length > 0 ? adSpend : { note: "No ad spend data — connect Meta Ads" },
    };
  } catch {
    return { note: "No live data sources connected" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(MOCK_RECOMMENDATION);
    }

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

    // Enrich with live data from connected sources (KPI, ad spend)
    const liveContext = await buildLiveContext();
    const enrichedData = { ...data, live_context: liveContext };

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
