"use server";

import { redirect } from "next/navigation";
import { timingSafeEqual } from "crypto";

import {
  clearAdminSession,
  getAdminSession,
  setAdminSession,
} from "@/lib/session";
import { adminLoginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/passwords";
import { createServiceClient } from "@/lib/supabase/server";

export type AdminLoginState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
};

function safeStringEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
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

  // 1) Buscar en BD primero (multi-admin team)
  const supabase = createServiceClient();
  const { data: admin } = await supabase
    .from("admins")
    .select("id, email, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (admin) {
    if (!verifyPassword(password, admin.password_hash)) {
      return { error: "Email o contraseña incorrectos." };
    }
    // Update last_login_at (fire & forget)
    void supabase
      .from("admins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", admin.id);
    await setAdminSession(email);
    redirect("/admin");
  }

  // 2) Fallback al env-var admin (root, nunca se queda fuera)
  const expectedEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!expectedEmail || !expectedPassword) {
    return { error: "Email o contraseña incorrectos." };
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
