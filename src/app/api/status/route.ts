import { NextResponse } from "next/server";
import { isShopifyConnected } from "@/lib/shopify/client";
import { getTableCounts, getApiCredentialsFromDB } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const result: Record<string, unknown> = {};

  // ── Supabase status ──
  try {
    const admin = createAdminClient();
    if (admin) {
      const counts = await getTableCounts();
      result.supabase = {
        connected: true,
        region: "EU West 2 (London)",
        tables: counts,
      };
    } else {
      // Try with anon key — if env vars are set it should work
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      result.supabase = {
        connected: !!url,
        region: url ? "EU West 2 (London)" : null,
        tables: {},
      };
    }
  } catch {
    result.supabase = { connected: false, region: null, tables: {} };
  }

  // ── Shopify status ──
  try {
    const connected = await isShopifyConnected();
    result.shopify = { connected };
  } catch {
    result.shopify = { connected: false };
  }

  // ── N8N status ──
  const n8nUrl = process.env.N8N_WEBHOOK_URL || "https://pblcrmn.app.n8n.cloud";
  result.n8n = {
    configured: true,
    url: n8nUrl,
  };

  // ── Anthropic ──
  result.anthropic = {
    configured: !!process.env.ANTHROPIC_API_KEY,
  };

  // ── API credentials from Supabase ──
  try {
    const credentials = await getApiCredentialsFromDB();
    const platforms = new Set(credentials.filter((c) => c.is_active).map((c) => c.platform));

    result.amazon_sp = {
      configured: platforms.has("amazon_sp"),
    };
    result.amazon_ads = {
      configured: platforms.has("amazon_ads"),
    };
    result.meta_ads = {
      configured: platforms.has("meta"),
    };
  } catch {
    result.amazon_sp = { configured: false };
    result.amazon_ads = { configured: false };
    result.meta_ads = { configured: false };
  }

  return NextResponse.json(result);
}
