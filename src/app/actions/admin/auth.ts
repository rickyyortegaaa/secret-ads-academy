"use server";

import { redirect } from "next/navigation";
import { timingSafeEqual } from "crypto";

import {
  clearAdminSession,
  getAdminSession,
  setAdminSession,
} from "@/lib/session";
import { adminLoginSchema } from "@/lib/validation";

export type AdminLoginState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
};

function safeStringEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Run the comparison anyway against a same-length placeholder to keep
    // the timing constant.
    timingSafeEqual(Buffer.from(a), Buffer.alloc(a.length));
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function adminLoginAction(
  _prev: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: AdminLoginState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (path === "email" || path === "password") {
        fieldErrors[path] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const { email, password } = parsed.data;
  const expectedEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!expectedEmail || !expectedPassword) {
    return { error: "Login admin no está configurado en el servidor." };
  }

  const emailOk = safeStringEquals(email, expectedEmail);
  const passwordOk = safeStringEquals(password, expectedPassword);

  if (!emailOk || !passwordOk) {
    return { error: "Email o contraseña incorrectos." };
  }

  await setAdminSession(email);
  redirect("/admin");
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function requireAdminEmail(): Promise<string> {
  const email = await getAdminSession();
  if (!email) {
    redirect("/admin/login");
  }
  return email;
}
