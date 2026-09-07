import { SignJWT, jwtVerify } from 'jose';
import { getEnv } from './context';

/**
 * JWT signing/verification on the Workers runtime.
 *
 * `jsonwebtoken` depends on Node's crypto internals, so this uses `jose`, which
 * is built on WebCrypto. Tokens stay HS256 with the same claim shape, so
 * sessions issued by the previous Express build keep verifying.
 */

const ACCESS_TTL = '7d';

const secretKey = (): Uint8Array => new TextEncoder().encode(getEnv().JWT_SECRET);

export interface AccessClaims {
  userId: string;
  email: string;
  orgId: string;
  role: string;
}

export const signAccessToken = (claims: AccessClaims): Promise<string> =>
  new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(secretKey());

/** Returns the claims, or null when the token is missing/expired/tampered. */
export const verifyToken = async <T = Record<string, unknown>>(
  token: string
): Promise<T | null> => {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    return payload as T;
  } catch {
    return null;
  }
};
