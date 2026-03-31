import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

/**
 * Shopify OAuth callback.
 * Exchanges authorization code for permanent access token.
 * Verifies HMAC + CSRF state.
 * Stores token in Supabase (requires SUPABASE_SERVICE_ROLE_KEY).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const hmac = searchParams.get("hmac");
  const shop = searchParams.get("shop");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();

  // HMAC is required — reject any callback that omits it
  if (!hmac) {
    console.error("Shopify callback missing hmac parameter");
    return NextResponse.json(
      { error: "Missing HMAC — request not from Shopify" },
      { status: 403 }
    );
  }

  // Verify CSRF state
  const storedState = request.cookies.get("shopify_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.json(
      { error: "Invalid state parameter — possible CSRF attack" },
      { status: 403 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 }
    );
  }

  // Validate shop hostname from callback param
  if (!shop || !shop.endsWith(".myshopify.com")) {
    return NextResponse.json(
      { error: "Invalid or missing shop parameter" },
      { status: 400 }
    );
  }

  // Server-side single-tenant enforcement: shop must match SHOPIFY_STORE_URL env var
  const configuredShop = process.env.SHOPIFY_STORE_URL?.trim();
  if (!configuredShop || shop !== configuredShop) {
    console.error("Shop does not match configured store: expected=", configuredShop, "callback=", shop);
    return NextResponse.json(
      { error: "Shop does not match configured store" },
      { status: 403 }
    );
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();
  // Use validated shop from callback param (matches configuredShop)
  const shopUrl = shop.trim();

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing Shopify configuration" },
      { status: 500 }
    );
  }

  // Verify HMAC from Shopify (authenticity check) — timing-safe compare
  {
    const params = new URLSearchParams(searchParams);
    params.delete("hmac");
    // Sort params alphabetically for HMAC computation
    const sortedParams = new URLSearchParams([...params.entries()].sort());
    const message = sortedParams.toString();
    const computedHmac = crypto
      .createHmac("sha256", clientSecret)
      .update(message)
      .digest("hex");
    // Use timing-safe comparison to prevent timing attacks
    const hmacBuffer = Buffer.from(hmac, "hex");
    const computedBuffer = Buffer.from(computedHmac, "hex");
    if (
      hmacBuffer.length !== computedBuffer.length ||
      !crypto.timingSafeEqual(hmacBuffer, computedBuffer)
    ) {
      console.error("Shopify HMAC verification failed");
      return NextResponse.json(
        { error: "HMAC verification failed — request may not be from Shopify" },
        { status: 403 }
      );
    }
  }

  try {
    // Exchange code for permanent access token
    const tokenResponse = await fetch(
      `https://${shopUrl}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Shopify token exchange failed:", errorText);
      return NextResponse.json(
        { error: "Failed to exchange authorization code" },
        { status: 500 }
      );
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      scope: string;
    };

    // Save credential to Supabase api_credentials table
    let tokenPersisted = false;
    const supabase = createAdminClient();

    if (!supabase) {
      console.error(
        "SUPABASE_SERVICE_ROLE_KEY is not set — Shopify token cannot be saved to database. " +
        "Set this environment variable in Vercel to enable token persistence."
      );
    } else {
      try {
        // Get or create organization
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .limit(1)
          .single();

        if (org) {
          const now = new Date().toISOString();
          const credentials = [
            { name: "access_token", value: tokenData.access_token },
            { name: "store_url", value: shopUrl },
            { name: "scope", value: tokenData.scope },
          ];

          for (const cred of credentials) {
            const { error } = await supabase.from("api_credentials").upsert(
              {
                organization_id: org.id,
                platform: "shopify",
                credential_name: cred.name,
                credential_value: cred.value,
                is_active: true,
                updated_at: now,
              },
              { onConflict: "organization_id,platform,credential_name", ignoreDuplicates: false }
            );
            if (!error && cred.name === "access_token") tokenPersisted = true;
          }
        } else {
          console.error("No organization found in Supabase — cannot save Shopify credentials");
        }
      } catch (supabaseErr) {
        console.error("Failed to save Shopify credential to Supabase:", supabaseErr);
      }
    }

    // Schedule backfill after redirect — uses after() so it runs post-response in serverless
    if (tokenPersisted) {
      const cronSecret = process.env.CRON_SECRET;
      const backfillUrl = new URL("/api/shopify/backfill", appUrl).toString();
      after(async () => {
        await fetch(backfillUrl, {
          method: "POST",
          headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
        }).catch((err) => {
          console.error("Backfill trigger failed:", err);
        });
      });
    }

    // Clear OAuth cookies and redirect to settings
    const redirectParam = tokenPersisted
      ? "shopify=connected"
      : "shopify=connected&warning=token_not_persisted";
    const redirectUrl = new URL(`/dashboard/settings?${redirectParam}`, appUrl);
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete("shopify_oauth_state");
    response.cookies.delete("shopify_oauth_shop");

    return response;
  } catch (error) {
    console.error("Shopify OAuth callback error:", error);
    return NextResponse.json(
      { error: "Internal server error during OAuth callback" },
      { status: 500 }
    );
  }
}
