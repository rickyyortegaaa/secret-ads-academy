import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const STUDENT_COOKIE = "saa_student";
const ADMIN_COOKIE = "saa_admin";
const COOKIE_MAX_AGE = 60 * 60 * 4; // 4 hours

const ADMIN_SESSION_MAX_AGE_MS = COOKIE_MAX_AGE * 1000;

type SessionOptions = {
  secure?: boolean;
};

const baseCookieOptions = (opts: SessionOptions = {}) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: opts.secure ?? process.env.NODE_ENV === "production",
  path: "/",
  maxAge: COOKIE_MAX_AGE,
});

/* ------------------------------------------------------------------ */
/*  STUDENT SESSION — plain cookie with student id                    */
/*  (low risk; not signed because exam access is gated by whitelist   */
/*  and the worst-case is a student spoofing another student in dev)  */
/* ------------------------------------------------------------------ */

export async function setStudentSession(studentId: string) {
  const store = await cookies();
  store.set(STUDENT_COOKIE, studentId, baseCookieOptions());
}

export async function getStudentSession(): Promise<string | null> {
  const store = await cookies();
  return store.get(STUDENT_COOKIE)?.value ?? null;
}

export async function clearStudentSession() {
  const store = await cookies();
  store.delete(STUDENT_COOKIE);
}

/* ------------------------------------------------------------------ */
/*  ADMIN SESSION — HMAC-signed token                                 */
/*  Format: <email>:<timestamp_ms>:<hmac>                             */
/*  Verified with timing-safe comparison against ADMIN_SESSION_SECRET */
/* ------------------------------------------------------------------ */

function getAdminSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET no está configurado");
  }
  return secret;
}

function signAdminToken(email: string): string {
  const secret = getAdminSecret();
  const ts = Date.now().toString();
  const payload = `${email}:${ts}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

function verifyAdminToken(token: string): string | null {
  try {
    const secret = getAdminSecret();
    const parts = token.split(":");
    if (parts.length !== 3) return null;
    const [email, ts, sig] = parts;
    if (!email || !ts || !sig) return null;

    const payload = `${email}:${ts}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");

    if (sig.length !== expected.length) return null;
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum)) return null;
    if (Date.now() - tsNum > ADMIN_SESSION_MAX_AGE_MS) return null;

    return email;
  } catch {
    return null;
  }
}

export async function setAdminSession(email: string) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, signAdminToken(email), baseCookieOptions());
}

/** Returns the verified admin email or null if no/invalid session. */
export async function getAdminSession(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
