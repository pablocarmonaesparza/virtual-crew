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

  // Demo mode: skip auth when SUPABASE_SERVICE_ROLE_KEY is not set
  // This means Supabase is partially configured (URL + anon key exist)
  // but auth is not fully operational yet
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.next();
  }

  // Create a response we can modify (to set refreshed cookies)
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Forward cookie writes to the outgoing response
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse = NextResponse.next({ request });
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session — this call also refreshes the auth token if needed
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // For API routes, return 401 instead of redirecting
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Redirect unauthenticated users to login
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    // If auth check fails (e.g., Supabase unreachable), deny access
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
