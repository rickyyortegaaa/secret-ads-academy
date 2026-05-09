import "server-only";

import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

/**
 * Password hashing con scrypt — algoritmo recomendado por NIST, parte
 * del módulo crypto built-in de Node 18+. Sin dependencias externas.
 *
 * Formato del hash almacenado: "salt:hash" (ambos hex).
 * - salt: 16 bytes random (32 chars hex)
 * - hash: 64 bytes (128 chars hex)
 */

const SALT_BYTES = 16;
const HASH_BYTES = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(password, salt, HASH_BYTES).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;

  let expected: Buffer;
  let actual: Buffer;
  try {
    expected = Buffer.from(expectedHex, "hex");
    actual = scryptSync(password, salt, expected.length);
  } catch {
    return false;
  }

  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * Token aleatorio para invitaciones. URL-safe, ~256 bits de entropía.
 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}
