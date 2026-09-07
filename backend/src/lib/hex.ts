/**
 * Byte/hex helpers.
 *
 * `@cloudflare/workers-types` declares a global `Buffer` whose `toString()`
 * takes no encoding argument, which shadows Node's. Rather than fight the
 * overload, these work on plain Uint8Array — the type both runtimes agree on.
 */

export const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** Cryptographically-random hex string of `byteLength` bytes (2 chars each). */
export const randomHex = (byteLength: number): string =>
  toHex(crypto.getRandomValues(new Uint8Array(byteLength)));

/** SHA-256 of a UTF-8 string, hex-encoded. */
export const sha256Hex = async (input: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return toHex(new Uint8Array(digest));
};
