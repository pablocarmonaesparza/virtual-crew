import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth-related API routes through without checking session
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow status API through (used by settings page)
  if (pathname === "/api/status" || pathname === "/api/sync-logs") {
    return NextResponse.next();
  }

  // Only protect /dashboard/* and /api/* routes
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/api");

  if (!isProtected) {
    return NextResponse.next();
  }

  // Auth disabled for now — enable when multi-tenancy is ready
  // TODO: Re-enable Supabase auth when user accounts are set up
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
