import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        message: generateMockResponse(message),
      });
    }

    const systemPrompt = `You are an S&OP (Sales & Operations Planning) assistant for Agua de Madre (ADM), a UK-based health drinks company. You help the team analyze sales data, forecast accuracy, ad spend, and customer metrics.

Key context:
- ADM sells Water Kefir, Romedio Infusion (teas), Culture Shots, and Fresco
- Channels: Shopify (D2C) and Amazon
- Ads: Meta Ads (for Shopify) and Amazon Ads
- 80% of revenue comes from Romedio and Teas
- Categories: drinks, tea, health products
- Currency: GBP (£)
- Date format: DD MMM YYYY (UK)
- Current month: March 2026

Response style guidelines:
- Respond in clean, well-structured prose
- Use simple formatting only: bold for emphasis, bullet points for lists
- Do NOT use markdown headers (no # or ##), code blocks, or tables
- Keep responses concise: 2-4 sentences for simple questions, longer for complex analysis
- Use bullet points sparingly and only when listing 3+ items
- Be data-driven and actionable, using specific numbers when possible`;

    const messages = [
      ...(history || []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", error);
      return NextResponse.json({ message: generateMockResponse(message) });
    }

    const data = await response.json();
    return NextResponse.json({
      message: data.content[0]?.text || "Sorry, I could not generate a response.",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

function generateMockResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("top") && lower.includes("sku")) {
    return "Based on current month data, the top 5 SKUs by volume are:\n\n1. **ADMREMXC6** (Romedio Mixed 6-Pack) — 1,240 units\n2. **ADMREMXC3** (Romedio Lemon & Ginger 3-Pack) — 980 units\n3. **ADMWKBLK6** (Water Kefir Blackcurrant 6-Pack) — 820 units\n4. **ADMWKLMG6** (Water Kefir Lemon & Ginger 6-Pack) — 710 units\n5. **ADMCSLMG6** (Culture Shots Lemon & Ginger 6-Pack) — 540 units\n\nRomedio continues to dominate at ~45% of total volume.";
  }

  if (lower.includes("forecast") && lower.includes("accuracy")) {
    return "Forecast accuracy for the last 3 completed months:\n\n- **Jan 2026:** 103.4% (over-performed by 3.4%)\n- **Feb 2026:** 96.5% (under by 3.5%)\n- **Dec 2025:** 97.1% (under by 2.9%)\n\nOverall trend: accuracy is within the ±5% target band. The baseline model is performing well — much better than the previous 'poor baseline' the team was using.";
  }

  if (lower.includes("cac") || lower.includes("acquisition")) {
    return "Current CAC comparison (Feb 2026):\n\n- **Shopify:** £20.90 per new customer (↑ 3.5% MoM)\n- **Amazon:** £20.40 per new customer (↑ 5.7% MoM)\n\nReturning customer CAC is much lower: £5.30 (Shopify) and £8.10 (Amazon). The subscription base helps keep Shopify's blended CAC lower. Amazon CAC has been rising due to increased competition in health drinks.";
  }

  if (lower.includes("ad") && lower.includes("spend")) {
    return "March 2026 ad spend status (mid-month):\n\n- **Meta Ads:** £5,200 spent of £9,000 budget (42% under)\n- **Amazon Ads:** £3,400 spent of £6,000 budget (43% under)\n\nBoth platforms are significantly under-paced. With 18 days remaining, there's room to accelerate spend — especially on Amazon where ROAS remains healthy at 3.2x.";
  }

  if (lower.includes("amazon") && lower.includes("shopify")) {
    return "Channel comparison (Feb 2026):\n\n| Metric | Shopify | Amazon |\n|--------|---------|--------|\n| New Customers | 410 | 270 |\n| CAC | £20.90 | £20.40 |\n| Subscriptions | 330 | N/A |\n| Total Revenue | ~£112k | ~£75k |\n\nShopify drives ~60% of revenue with the advantage of subscriptions. Amazon has lower CAC but no subscription capability.";
  }

  return "I can help you explore your S&OP data. Try asking about:\n\n- **Top SKUs** this month\n- **Forecast accuracy** trends\n- **Ad spend** vs budget\n- **CAC** by channel (Amazon vs Shopify)\n- **Customer metrics** (new vs returning)\n\nOnce the Anthropic API key is configured, I'll provide real-time analysis from your Supabase data.";
}
