import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { COOKIE_OPTIONS, supabaseConfig } from "./config";

// Copied from PNLF, hardened: fail-closed config and Strict/Secure/HttpOnly cookies.
export async function createClient() {
  const { url, anonKey } = supabaseConfig();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookieOptions: COOKIE_OPTIONS,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, { ...options, ...COOKIE_OPTIONS });
        } catch {
          // Called from a Server Component: src/proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
