import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/shopify/connect-token
 * Allows a merchant to connect Shopify by pasting their Admin API access token
 * directly. This bypasses the OAuth flow entirely — useful when the store is
 * NOT in the same Shopify Partner organization as the app creator (which is
 * required for Custom Distribution OAuth).
 *
 * Defense in depth (since middleware auth is disabled):
 *   1. Sec-Fetch-Site = same-origin (forbidden header — browser-only)
 *   2. Sec-Fetch-Mode = cors
 *   3. Origin host matches request host
 *   4. CONNECT_TOKEN_SECRET shared secret in body (Pablo configures on Vercel,
 *      shares with Yatin out-of-band via WhatsApp)
 *   5. Submitted shop MUST exactly match SHOPIFY_STORE_URL env var (single-tenant)
 *   6. Token is validated against the live Shopify Admin API
 *   7. Required Admin API scopes are verified via /admin/oauth/access_scopes.json
 *
 * Body: { shop: string, token: string, setup_secret: string }
 */
const SHOPIFY_API_VERSION = "2026-01";
const REQUIRED_SCOPES = [
  "read_orders",
  "read_products",
  "read_inventory",
  "read_customers",
] as const;

// ── Brute-force rate limit (per IP, sliding window, in-memory) ──
// Defense against scripted secret guessing. Combined with the 256-bit
// hex secret, this makes brute force impractical even across many instances.
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_FAILURES = 5;
const failureLog = new Map<string, number[]>();

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const failures = (failureLog.get(ip) || []).filter((t) => t > cutoff);
  failureLog.set(ip, failures);
  return failures.length >= RATE_LIMIT_MAX_FAILURES;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const failures = (failureLog.get(ip) || []).filter((t) => t > cutoff);
  failures.push(now);
  failureLog.set(ip, failures);
}

function clearFailures(ip: string): void {
  failureLog.delete(ip);
}

export async function POST(request: NextRequest) {
  // ── 1-3. Same-origin enforcement ──
  // Sec-Fetch-* headers are forbidden request headers that browsers set
  // automatically. WHEN PRESENT they must indicate same-origin cors.
  // We don't HARD-fail when absent (older Safari, embedded webviews) —
  // the Origin check below + the shared setup secret + the Shopify token
  // validation provide sufficient defense in those cases.
  const secFetchSite = request.headers.get("sec-fetch-site");
  const secFetchMode = request.headers.get("sec-fetch-mode");
  if (secFetchSite && secFetchSite !== "same-origin") {
    return NextResponse.json(
      { error: "Cross-origin requests not allowed" },
      { status: 403 }
    );
  }
  if (secFetchMode && secFetchMode !== "cors") {
    return NextResponse.json(
      { error: "Only cors fetch mode allowed" },
      { status: 403 }
    );
  }

  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  if (!origin) {
    return NextResponse.json({ error: "Missing Origin header" }, { status: 403 });
  }
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return NextResponse.json({ error: "Invalid Origin header" }, { status: 403 });
  }
  if (originUrl.host !== requestUrl.host) {
    return NextResponse.json({ error: "Cross-origin rejected" }, { status: 403 });
  }

  // ── Parse body ──
  let body: { shop?: unknown; token?: unknown; setup_secret?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.shop !== "string" ||
    typeof body.token !== "string" ||
    typeof body.setup_secret !== "string"
  ) {
    return NextResponse.json(
      { error: "Body must include 'shop', 'token', and 'setup_secret' as strings" },
      { status: 400 }
    );
  }

  // ── 4a. Rate-limit check (per IP, sliding window) ──
  const ip = clientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      {
        error: "Too many failed attempts. Wait 1 minute and try again.",
      },
      { status: 429 }
    );
  }

  // ── 4b. Shared-secret check (timing-safe) ──
  const expectedSecret = process.env.CONNECT_TOKEN_SECRET?.trim();
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Server misconfigured: CONNECT_TOKEN_SECRET not set" },
      { status: 503 }
    );
  }
  const submittedSecret = body.setup_secret.trim();

  // Length check first to avoid timing leaks via early-exit
  let secretMatch = submittedSecret.length === expectedSecret.length;
  if (secretMatch) {
    // Constant-time compare
    let mismatch = 0;
    for (let i = 0; i < expectedSecret.length; i++) {
      mismatch |= expectedSecret.charCodeAt(i) ^ submittedSecret.charCodeAt(i);
    }
    if (mismatch !== 0) secretMatch = false;
  }

  if (!secretMatch) {
    recordFailure(ip);
    return NextResponse.json({ error: "Invalid setup secret" }, { status: 401 });
  }

  // Successful secret check — clear any previous failures for this IP
  clearFailures(ip);

  // Normalize shop URL
  const rawShop = body.shop.trim().toLowerCase();
  const shopUrl = rawShop
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim();

  if (!shopUrl.endsWith(".myshopify.com")) {
    return NextResponse.json(
      { error: "Shop must be in format: yourstore.myshopify.com" },
      { status: 400 }
    );
  }

  // ── 4c. Refuse if SHOPIFY_ACCESS_TOKEN env var is set ──
  // The Shopify client uses env var as a higher priority than the saved
  // Supabase credential. If we let connect-token persist a new value while
  // the env var is set, the UI would report "connected" but the runtime
  // would keep using the env var. Refuse explicitly so operators don't get
  // a confusing partially-working state.
  if (process.env.SHOPIFY_ACCESS_TOKEN?.trim()) {
    return NextResponse.json(
      {
        error:
          "SHOPIFY_ACCESS_TOKEN env var is set on the server. Remove it (Vercel → Settings → Env Vars) before connecting via the token form, or use the env var directly.",
      },
      { status: 409 }
    );
  }

  // ── 5. Single-tenant pinning: shop MUST match SHOPIFY_STORE_URL ──
  const configuredShop = process.env.SHOPIFY_STORE_URL?.trim().toLowerCase();
  if (!configuredShop) {
    return NextResponse.json(
      { error: "Server misconfigured: SHOPIFY_STORE_URL not set" },
      { status: 503 }
    );
  }
  if (shopUrl !== configuredShop) {
    return NextResponse.json(
      {
        error: `This dashboard is pinned to ${configuredShop}. Submitted: ${shopUrl}`,
      },
      { status: 403 }
    );
  }

  const token = body.token.trim();
  if (token.length < 20) {
    return NextResponse.json(
      { error: "Token appears invalid (too short)" },
      { status: 400 }
    );
  }

  // ── 6. Validate token against live Shopify API ──
  let shopName: string | null = null;
  try {
    const validateUrl = `https://${shopUrl}/admin/api/${SHOPIFY_API_VERSION}/shop.json`;
    const res = await fetch(validateUrl, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[connect-token] Shopify validation failed ${res.status}:`, errBody.slice(0, 200));
      if (res.status === 401) {
        return NextResponse.json(
          { error: "Token rejected by Shopify. Make sure it's the Admin API access token, not the API key or secret." },
          { status: 401 }
        );
      }
      if (res.status === 404) {
        return NextResponse.json(
          { error: `Shop not found: ${shopUrl}. Double-check the URL.` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `Shopify API rejected the token (HTTP ${res.status})` },
        { status: 502 }
      );
    }

    const data = await res.json();
    shopName = data?.shop?.name ?? data?.shop?.myshopify_domain ?? shopUrl;
  } catch (err) {
    console.error("[connect-token] Validation error:", err);
    return NextResponse.json(
      { error: "Failed to reach Shopify. Check the shop URL." },
      { status: 502 }
    );
  }

  // ── 7. Verify required Admin API scopes ──
  // Shopify exposes /admin/oauth/access_scopes.json which returns the
  // scopes granted to the current token. Reject if any required scope is missing.
  try {
    const scopesRes = await fetch(`https://${shopUrl}/admin/oauth/access_scopes.json`, {
      method: "GET",
      headers: { "X-Shopify-Access-Token": token },
    });

    if (!scopesRes.ok) {
      console.error("[connect-token] Could not verify scopes:", scopesRes.status);
      return NextResponse.json(
        { error: "Could not verify token scopes" },
        { status: 502 }
      );
    }

    const scopesData = await scopesRes.json();
    const grantedScopes: string[] = (scopesData?.access_scopes || []).map(
      (s: { handle: string }) => s.handle
    );
    const missing = REQUIRED_SCOPES.filter((req) => !grantedScopes.includes(req));

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Token is missing required scopes: ${missing.join(", ")}. Edit the custom app in Shopify admin and enable all four: ${REQUIRED_SCOPES.join(", ")}.`,
          missing_scopes: missing,
          granted_scopes: grantedScopes,
        },
        { status: 403 }
      );
    }
  } catch (err) {
    console.error("[connect-token] Scope check error:", err);
    return NextResponse.json(
      { error: "Failed to verify token scopes" },
      { status: 502 }
    );
  }

  // ── Save to Supabase ──
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server not configured (Supabase admin client missing)" },
      { status: 503 }
    );
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .limit(1)
    .single();

  if (!org) {
    return NextResponse.json({ error: "No organization found" }, { status: 500 });
  }

  // Atomic upsert: BOTH credential rows in a single SQL statement.
  // This avoids the partial-write race where access_token persists but
  // store_url fails — leaving the app in an inconsistent "connected but
  // backfill never ran" state.
  const now = new Date().toISOString();
  const credentialRows = [
    {
      organization_id: org.id,
      platform: "shopify",
      credential_name: "access_token",
      credential_value: token,
      is_active: true,
      updated_at: now,
    },
    {
      organization_id: org.id,
      platform: "shopify",
      credential_name: "store_url",
      credential_value: shopUrl,
      is_active: true,
      updated_at: now,
    },
  ];

  const { error: upsertError } = await supabase
    .from("api_credentials")
    .upsert(credentialRows, {
      onConflict: "organization_id,platform,credential_name",
      ignoreDuplicates: false,
    });

  if (upsertError) {
    console.error("[connect-token] Supabase atomic upsert failed:", upsertError.message);
    return NextResponse.json(
      { error: "Token validated but failed to save. Check server logs." },
      { status: 500 }
    );
  }

  // Schedule a one-time historical backfill after the response is sent.
  // Mirrors the OAuth callback behavior so first-time token connections
  // get the full 50-day history populated automatically.
  // NOTE: We log success/failure inside after() but don't echo it back —
  // operators monitor real status via sync_logs (the dashboard polls it).
  // CRITICAL: Use the request origin (NOT NEXT_PUBLIC_APP_URL) so the
  // backfill runs on the SAME deployment that just persisted the token.
  // Otherwise preview/staging connects would trigger backfill on production.
  const cronSecret = process.env.CRON_SECRET;
  const backfillUrl = `${requestUrl.origin}/api/shopify/backfill`;
  after(async () => {
    try {
      const res = await fetch(backfillUrl, {
        method: "POST",
        headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error(
          `[connect-token] Backfill trigger returned ${res.status}: ${errBody.slice(0, 200)}`
        );
      } else {
        console.log("[connect-token] Backfill triggered successfully");
      }
    } catch (err) {
      console.error("[connect-token] Backfill trigger failed:", err);
    }
  });

  return NextResponse.json({
    success: true,
    shop: shopName,
    shop_url: shopUrl,
    // NOTE: We do not promise the backfill ran. The dashboard reads sync_logs
    // to surface the actual backfill status to operators.
    backfill_requested: true,
  });
}
