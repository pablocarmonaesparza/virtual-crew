import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Meta (Facebook) Ads OAuth callback.
 * Exchanges authorization code for a short-lived token, then swaps for a
 * long-lived token (~60 days). Auto-discovers ad accounts and stores
 * credentials in Supabase.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Verify CSRF state
  const storedState = request.cookies.get("meta_oauth_state")?.value;
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

  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing Meta Ads API credentials" },
      { status: 500 }
    );
  }

  try {
    const redirectUri = `${appUrl}/api/auth/meta/callback`;

    // Step 1: Exchange authorization code for short-lived token
    const shortTokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    shortTokenUrl.searchParams.set("client_id", clientId);
    shortTokenUrl.searchParams.set("client_secret", clientSecret);
    shortTokenUrl.searchParams.set("redirect_uri", redirectUri);
    shortTokenUrl.searchParams.set("code", code);

    const shortTokenResponse = await fetch(shortTokenUrl.toString());
    if (!shortTokenResponse.ok) {
      const errorText = await shortTokenResponse.text();
      console.error("Meta short-lived token exchange failed:", errorText);
      return NextResponse.json(
        { error: "Failed to exchange authorization code" },
        { status: 500 }
      );
    }

    const shortTokenData = (await shortTokenResponse.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    // Step 2: Exchange short-lived token for long-lived token (~60 days)
    const longTokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    longTokenUrl.searchParams.set("grant_type", "fb_exchange_token");
    longTokenUrl.searchParams.set("client_id", clientId);
    longTokenUrl.searchParams.set("client_secret", clientSecret);
    longTokenUrl.searchParams.set("fb_exchange_token", shortTokenData.access_token);

    const longTokenResponse = await fetch(longTokenUrl.toString());
    if (!longTokenResponse.ok) {
      const errorText = await longTokenResponse.text();
      console.error("Meta long-lived token exchange failed:", errorText);
      return NextResponse.json(
        { error: "Failed to exchange for long-lived token" },
        { status: 500 }
      );
    }

    const longTokenData = (await longTokenResponse.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    // Step 3: Auto-discover ad accounts
    let adAccountId: string | null = null;
    try {
      const accountsUrl = new URL("https://graph.facebook.com/v21.0/me/adaccounts");
      accountsUrl.searchParams.set(
        "fields",
        "account_id,name,currency,timezone_name,account_status"
      );
      accountsUrl.searchParams.set("access_token", longTokenData.access_token);

      const accountsResponse = await fetch(accountsUrl.toString());
      if (accountsResponse.ok) {
        const accountsData = (await accountsResponse.json()) as {
          data: Array<{
            account_id: string;
            id: string;
            name: string;
            currency: string;
            timezone_name: string;
            account_status: number;
          }>;
        };
        // Pick the first ACTIVE ad account (account_status = 1)
        const activeAccount = accountsData.data?.find(
          (acc) => acc.account_status === 1
        );
        if (activeAccount) {
          // id comes back as "act_XXXXX", account_id is just the number
          adAccountId = activeAccount.id.startsWith("act_")
            ? activeAccount.id
            : `act_${activeAccount.account_id}`;
        }
      }
    } catch (accountErr) {
      console.warn("Could not discover Meta ad accounts:", accountErr);
    }

    // Step 4: Save credentials to Supabase
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
            { name: "access_token", value: longTokenData.access_token },
            ...(adAccountId
              ? [{ name: "ad_account_id", value: adAccountId }]
              : []),
          ];

          for (const cred of credentials) {
            const { error } = await supabase.from("api_credentials").upsert(
              {
                organization_id: org.id,
                platform: "meta_ads",
                credential_name: cred.name,
                credential_value: cred.value,
                is_active: true,
                updated_at: now,
              },
              {
                onConflict: "organization_id,platform,credential_name",
                ignoreDuplicates: false,
              }
            );
            if (!error && cred.name === "access_token") tokenPersisted = true;
          }
        }
      }
    } catch (supabaseErr) {
      console.error("Failed to save Meta Ads credentials to Supabase:", supabaseErr);
    }

    // Redirect to settings
    const redirectParam = tokenPersisted
      ? "meta=connected"
      : "meta=connected&warning=token_not_persisted";
    const redirectUrl = new URL(`/dashboard/settings?${redirectParam}`, appUrl);
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete("meta_oauth_state");

    // Cookie fallback
    response.cookies.set("meta_access_token", longTokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 60, // 60 days (matches long-lived token expiry)
    });

    return response;
  } catch (error) {
    console.error("Meta Ads OAuth callback error:", error);
    return NextResponse.json(
      { error: "Internal server error during OAuth callback" },
      { status: 500 }
    );
  }
}
