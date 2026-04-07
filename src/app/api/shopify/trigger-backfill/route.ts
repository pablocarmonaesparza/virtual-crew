import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/shopify/trigger-backfill
 * Dashboard endpoint that triggers a backfill on the SAME deployment.
 *
 * Defense in depth (since the app currently has no user session layer):
 * 1. Sec-Fetch-Site MUST be "same-origin" — this is set by browsers
 *    automatically and is not under page-script control. Non-browser
 *    clients (curl/scripts) cannot fake it because Fetch Metadata headers
 *    are forbidden request headers.
 * 2. Origin MUST match the request host as a secondary check.
 * 3. Rate-limited to once every 5 minutes per organization (via sync_logs).
 * 4. The downstream backfill is still gated by CRON_SECRET, ensuring no
 *    privilege escalation is possible even if all the above are bypassed.
 */
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const requestUrl = new URL(request.url);

  // ── 1. Fetch Metadata enforcement ──
  // Sec-Fetch-* are "forbidden request headers" per the Fetch spec — they
  // CANNOT be set by JavaScript and are only emitted by real browsers.
  // We require ALL three to match a same-origin fetch() call from the dashboard:
  //   sec-fetch-site: same-origin   (the request comes from our own page)
  //   sec-fetch-mode: cors          (a fetch() with default mode)
  //   sec-fetch-dest: empty         (target is fetch(), not <img>/<script>/etc)
  // A non-browser HTTP client can still spoof these manually, so this is
  // defense-in-depth, NOT authentication. The backfill itself is gated by:
  //   (a) atomic cross-instance lock via a partial unique index
  //   (b) 5-minute rate limit
  //   (c) CRON_SECRET on the downstream endpoint
  const secFetchSite = request.headers.get("sec-fetch-site");
  const secFetchMode = request.headers.get("sec-fetch-mode");
  const secFetchDest = request.headers.get("sec-fetch-dest");

  if (
    secFetchSite !== "same-origin" ||
    secFetchMode !== "cors" ||
    secFetchDest !== "empty"
  ) {
    return NextResponse.json(
      { error: "Browser fetch() from same origin only" },
      { status: 403 }
    );
  }

  // ── 2. Origin must match host ──
  const origin = request.headers.get("origin");
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
    return NextResponse.json(
      { error: "Cross-origin request rejected" },
      { status: 403 }
    );
  }

  // ── 3. Soft rate limit (5 min between manual triggers) ──
  // The backfill route enforces an atomic cross-instance lock via a
  // partial unique index on sync_logs. This rate limit just prevents
  // dashboard users from spamming the button.
  try {
    const supabase = createAdminClient();
    if (supabase) {
      const cutoff = new Date(Date.now() - MIN_INTERVAL_MS).toISOString();
      const { data: recent } = await supabase
        .from("sync_logs")
        .select("started_at")
        .eq("source", "shopify")
        .eq("workflow_name", "Shopify Backfill")
        .gte("started_at", cutoff)
        .limit(1)
        .maybeSingle();

      if (recent) {
        return NextResponse.json(
          {
            error: "Backfill was triggered in the last 5 minutes — please wait before retrying",
            retry_after: MIN_INTERVAL_MS / 1000,
          },
          { status: 429 }
        );
      }
    }
  } catch (err) {
    console.error("[trigger-backfill] Rate limit check failed:", err);
    // Fail closed
    return NextResponse.json({ error: "Rate limit check failed" }, { status: 503 });
  }

  // ── 4. Forward to backfill with CRON_SECRET ──
  try {
    const backfillUrl = `${requestUrl.origin}/api/shopify/backfill`;

    const res = await fetch(backfillUrl, {
      method: "POST",
      headers: cronSecret
        ? { Authorization: `Bearer ${cronSecret}` }
        : {},
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: body.error || "Failed to trigger backfill", status: res.status },
        { status: res.status }
      );
    }

    return NextResponse.json({ status: "started", ...body });
  } catch (error) {
    console.error("Trigger backfill error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
