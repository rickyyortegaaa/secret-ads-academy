import { cookies } from "next/headers";

const STUDENT_COOKIE = "saa_student";
const ADMIN_COOKIE = "saa_admin";
const COOKIE_MAX_AGE = 60 * 60 * 4; // 4 hours

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

export async function setAdminSession(token: string) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, baseCookieOptions());
}

export async function getAdminSession(): Promise<string | null> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value ?? null;
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
