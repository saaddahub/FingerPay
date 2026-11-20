// Fail closed: unlike PNLF, a missing Supabase URL or key throws instead of using a placeholder.
export function supabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set");
  return { url, anonKey };
}

// All auth runs on the server, so the session cookies never need to be readable by page scripts.
// There is deliberately no browser client (PNLF's client.ts) and no service-role client.
export const COOKIE_OPTIONS = { sameSite: "strict", secure: true, httpOnly: true, path: "/" } as const;
