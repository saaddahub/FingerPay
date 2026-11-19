import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify } from 'jose';

let remoteJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

export function getSupabaseJwks(jwksUrl?: string) {
  const url = jwksUrl ?? process.env.SUPABASE_JWKS_URL;
  if (!url) return null;
  if (!remoteJWKS) {
    remoteJWKS = createRemoteJWKSet(new URL(url));
  }
  return remoteJWKS;
}

export interface SupabaseAuthUser {
  id: string;
  email?: string | undefined;
  role?: string | undefined;
  aal?: 'aal1' | 'aal2' | undefined;
}

export async function verifySupabaseToken(token: string, jwksUrl?: string): Promise<SupabaseAuthUser | null> {
  const jwks = getSupabaseJwks(jwksUrl);
  if (!jwks) return null;

  try {
    const verifyOpts = process.env.SUPABASE_URL
      ? { issuer: `${process.env.SUPABASE_URL}/auth/v1` }
      : {};
    const { payload } = await jwtVerify(token, jwks, verifyOpts);

    return {
      id: payload.sub!,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      role: (payload.role as string) ?? 'authenticated',
      aal: (payload.aal as 'aal1' | 'aal2') ?? 'aal1',
    };
  } catch {
    return null;
  }
}

export function createSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return null;

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
