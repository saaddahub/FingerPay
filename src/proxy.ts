import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_OPTIONS, supabaseConfig } from "@/lib/supabase/config";

// SPEC §4.6: a per-request nonce CSP on every page; the static headers live in next.config.ts.
function contentSecurityPolicy(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,  // React dev tooling needs eval
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  // Rebuilt after a session refresh so pages see the refreshed cookies (PNLF's updateSession pattern).
  const forward = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("content-security-policy", csp);
    return NextResponse.next({ request: { headers } });
  };
  let response = forward();

  const { pathname, search } = request.nextUrl;
  const isConsole = pathname === "/console" || pathname.startsWith("/console/");
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (hasSession || isConsole) {
    const { url, anonKey } = supabaseConfig();
    const supabase = createServerClient(url, anonKey, {
      cookieOptions: COOKIE_OPTIONS,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, cacheHeaders) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = forward();
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, { ...options, ...COOKIE_OPTIONS });
          for (const [k, v] of Object.entries(cacheHeaders ?? {})) response.headers.set(k, v);  // never cache auth cookies
        },
      },
    });
    // Do not add logic between createServerClient and this call (Supabase SSR requirement).
    const { data } = await supabase.auth.getClaims();
    if (isConsole && !data?.claims) {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      login.search = "";
      login.searchParams.set("redirect", pathname + search);
      response = NextResponse.redirect(login);
    }
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)"],
};
