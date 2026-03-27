import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Shopify OAuth callback.
 * Exchanges authorization code for permanent access token.
 * Stores token in Supabase only (no file writes for Vercel compatibility).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const shop = searchParams.get("shop");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  // Use shop from callback, then from cookie, then from env
  const shopUrl = shop
    || request.cookies.get("shopify_oauth_shop")?.value
    || process.env.SHOPIFY_STORE_URL;

  if (!clientId || !clientSecret || !shopUrl) {
    return NextResponse.json(
      { error: "Missing Shopify configuration" },
      { status: 500 }
    );
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
    try {
      const supabase = createAdminClient();
      if (supabase) {
        // Get or create organization
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .limit(1)
          .single();

        if (org) {
          // Save access token
          const { error: tokenError } = await supabase.from("api_credentials").upsert(
            {
              organization_id: org.id,
              platform: "shopify",
              credential_name: "access_token",
              credential_value: tokenData.access_token,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "organization_id,platform,credential_name", ignoreDuplicates: false }
          );

          if (!tokenError) tokenPersisted = true;

          // Save shop URL
          await supabase.from("api_credentials").upsert(
            {
              organization_id: org.id,
              platform: "shopify",
              credential_name: "store_url",
              credential_value: shopUrl,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "organization_id,platform,credential_name", ignoreDuplicates: false }
          );

          // Save scope
          await supabase.from("api_credentials").upsert(
            {
              organization_id: org.id,
              platform: "shopify",
              credential_name: "scope",
              credential_value: tokenData.scope,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "organization_id,platform,credential_name", ignoreDuplicates: false }
          );
        }
      }
    } catch (supabaseErr) {
      console.error("Failed to save Shopify credential to Supabase:", supabaseErr);
    }

    // Clear OAuth cookies and redirect to settings
    const redirectParam = tokenPersisted ? "shopify=connected" : "shopify=connected&warning=token_not_persisted";
    const redirectUrl = new URL(`/dashboard/settings?${redirectParam}`, appUrl);
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete("shopify_oauth_state");
    response.cookies.delete("shopify_oauth_shop");

    // Set token as HTTP-only cookie (Vercel-compatible persistence)
    response.cookies.set("shopify_access_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year (Shopify tokens don't expire)
    });

    return response;
  } catch (error) {
    console.error("Shopify OAuth callback error:", error);
    return NextResponse.json(
      { error: "Internal server error during OAuth callback" },
      { status: 500 }
    );
  }
}
