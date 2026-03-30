import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Amazon Ads API OAuth callback.
 * Exchanges authorization code for tokens via Login with Amazon.
 * Discovers UK ad profile and stores credentials in Supabase.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Verify CSRF state
  const storedState = request.cookies.get("amazon_ads_oauth_state")?.value;
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

  const clientId = process.env.AMAZON_ADS_CLIENT_ID;
  const clientSecret = process.env.AMAZON_ADS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing Amazon Ads API credentials" },
      { status: 500 }
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://api.amazon.co.uk/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${appUrl}/api/auth/amazon-ads/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Amazon Ads token exchange failed:", errorText);
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

    // Discover UK advertising profile
    let profileId: string | null = null;
    try {
      const profilesRes = await fetch("https://advertising-api-eu.amazon.com/v2/profiles", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Amazon-Advertising-API-ClientId": clientId,
        },
      });
      if (profilesRes.ok) {
        const profiles = (await profilesRes.json()) as Array<{
          profileId: number;
          countryCode: string;
          accountInfo: { id: string; type: string; name: string };
        }>;
        // Prefer UK profile, fall back to first available
        const ukProfile = profiles.find((p) => p.countryCode === "GB") || profiles[0];
        if (ukProfile) profileId = String(ukProfile.profileId);
      }
    } catch (profileErr) {
      console.warn("Could not discover Amazon Ads profiles:", profileErr);
    }

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
            ...(profileId ? [{ name: "profile_id", value: profileId }] : []),
          ];

          for (const cred of credentials) {
            const { error } = await supabase.from("api_credentials").upsert(
              {
                organization_id: org.id,
                platform: "amazon_ads",
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
      console.error("Failed to save Amazon Ads credentials to Supabase:", supabaseErr);
    }

    // Redirect to settings
    const redirectParam = tokenPersisted
      ? "amazon_ads=connected"
      : "amazon_ads=connected&warning=token_not_persisted";
    const redirectUrl = new URL(`/dashboard/settings?${redirectParam}`, appUrl);
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete("amazon_ads_oauth_state");

    // Cookie fallback
    response.cookies.set("amazon_ads_refresh_token", tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    console.error("Amazon Ads OAuth callback error:", error);
    return NextResponse.json(
      { error: "Internal server error during OAuth callback" },
      { status: 500 }
    );
  }
}
