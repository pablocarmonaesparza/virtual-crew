import { NextRequest, NextResponse } from "next/server";
import { refreshLongLivedToken } from "@/lib/meta/token-refresh";

/**
 * Vercel Cron endpoint to refresh Meta long-lived token.
 * Runs weekly to prevent token expiry (60-day lifetime).
 *
 * Configure in vercel.json:
 *   { "crons": [{ "path": "/api/cron/meta-refresh", "schedule": "0 3 * * 1" }] }
 */
export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentToken = process.env.META_ACCESS_TOKEN;
  if (!currentToken) {
    return NextResponse.json({ error: "No META_ACCESS_TOKEN configured" }, { status: 400 });
  }

  try {
    const result = await refreshLongLivedToken(currentToken);

    // Log success (token itself is not logged for security)
    console.log(`Meta token refreshed successfully. Expires in: ${result.expires_in ?? "unknown"} seconds`);

    // Note: In a multi-tenant setup, the new token should be saved to Supabase.
    // For now, we rely on Vercel env var which must be updated manually or via API.
    // TODO: Save to Supabase api_credentials table when multi-tenant is implemented.

    return NextResponse.json({
      success: true,
      expires_in: result.expires_in,
      message: "Token refreshed. Update META_ACCESS_TOKEN env var with new token.",
      // Don't return the actual token in the response for security
    });
  } catch (error) {
    console.error("Meta token refresh failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Token refresh failed" },
      { status: 500 }
    );
  }
}
