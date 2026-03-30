import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Amazon SP-API OAuth callback.
 * Exchanges authorization code for access + refresh tokens via LWA.
 * Stores tokens in Supabase api_credentials table.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("spapi_oauth_code");
  const state = searchParams.get("state");
  const sellingPartnerId = searchParams.get("selling_partner_id");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Verify CSRF state
  const storedState = request.cookies.get("amazon_sp_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.json(
      { error: "Invalid state parameter — possible CSRF attack" },
      { status: 403 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code (spapi_oauth_code)" },
      { status: 400 }
    );
  }

  const clientId = process.env.AMAZON_SP_LWA_CLIENT_ID;
  const clientSecret = process.env.AMAZON_SP_LWA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing Amazon SP-API credentials" },
      { status: 500 }
    );
  }

  try {
    // Exchange authorization code for tokens via LWA
    const tokenResponse = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${appUrl}/api/auth/amazon-sp/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Amazon SP-API token exchange failed:", errorText);
      return NextResponse.json(
        { error: "Failed to exchange authorization code" },
        { status: 500 }
      );
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    };

    // Save credentials to Supabase
    let tokenPersisted = false;
    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .limit(1)
          .single();

        if (org) {
          const now = new Date().toISOString();
          const credentials = [
            { name: "refresh_token", value: tokenData.refresh_token },
            { name: "access_token", value: tokenData.access_token },
            ...(sellingPartnerId
              ? [{ name: "selling_partner_id", value: sellingPartnerId }]
              : []),
          ];

          for (const cred of credentials) {
            const { error } = await supabase.from("api_credentials").upsert(
              {
                organization_id: org.id,
                platform: "amazon_sp",
                credential_name: cred.name,
                credential_value: cred.value,
                is_active: true,
                updated_at: now,
              },
              { onConflict: "organization_id,platform,credential_name", ignoreDuplicates: false }
            );
            if (!error && cred.name === "refresh_token") tokenPersisted = true;
          }
        }
      }
    } catch (supabaseErr) {
      console.error("Failed to save Amazon SP-API credentials to Supabase:", supabaseErr);
    }

    // Redirect to settings
    const redirectParam = tokenPersisted
      ? "amazon_sp=connected"
      : "amazon_sp=connected&warning=token_not_persisted";
    const redirectUrl = new URL(`/dashboard/settings?${redirectParam}`, appUrl);
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete("amazon_sp_oauth_state");

    // Cookie fallback for refresh token
    response.cookies.set("amazon_sp_refresh_token", tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    console.error("Amazon SP-API OAuth callback error:", error);
    return NextResponse.json(
      { error: "Internal server error during OAuth callback" },
      { status: 500 }
    );
  }
}
