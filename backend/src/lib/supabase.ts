import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getEnv } from './context';

/**
 * Supabase Auth token verification.
 *
 * Supabase is the identity provider: it owns signup, sign-in, password resets
 * and OAuth, so no password hash ever reaches this Worker. That matters for
 * more than tidiness — bcrypt at cost 12 burns ~1s of CPU, and the Workers
 * free plan allows 10ms per request.
 *
 * Projects sign with asymmetric keys (ECC P-256 by default), so verification
 * uses the project's public JWKS. Nothing secret is needed here at all, and a
 * key rotation in the Supabase dashboard is picked up without a redeploy.
 */

export interface SupabaseClaims {
  sub: string;
  email?: string;
  user_metadata?: { name?: string; full_name?: string; avatar_url?: string };
}

const baseUrl = (): string => {
  const url = getEnv().SUPABASE_URL;
  if (!url) throw new Error('SUPABASE_URL is not set');
  return url.replace(/\/$/, '');
};

// jose caches the fetched keys and re-fetches on an unknown key id. Holding the
// set at module scope keeps that cache alive for the life of the isolate, so
// the JWKS request happens once rather than on every sign-in.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksFor: string | null = null;

const keyStore = () => {
  const issuer = `${baseUrl()}/auth/v1`;
  if (!jwks || jwksFor !== issuer) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    jwksFor = issuer;
  }
  return jwks;
};

/** Returns the claims, or null when the token is missing/expired/tampered. */
export const verifySupabaseToken = async (token: string): Promise<SupabaseClaims | null> => {
  try {
    const { payload } = await jwtVerify(token, keyStore(), {
      // Only asymmetric algorithms: accepting HS256 here would let a leaked
      // shared secret forge tokens that the public key was meant to prevent.
      algorithms: ['ES256', 'RS256'],
      issuer: `${baseUrl()}/auth/v1`,
      audience: 'authenticated'
    });
    if (!payload.sub) return null;
    return payload as unknown as SupabaseClaims;
  } catch {
    return null;
  }
};

/** The display name Supabase carries, whichever field the provider filled in. */
export const claimsName = (claims: SupabaseClaims): string | undefined =>
  claims.user_metadata?.name ?? claims.user_metadata?.full_name;
