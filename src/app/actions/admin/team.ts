"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";
import {
  generateInvitationToken,
  hashPassword,
  verifyPassword,
} from "@/lib/passwords";
import { sendAdminInvitationEmail } from "@/lib/email";
import { setAdminSession } from "@/lib/session";

import { requireAdminEmail } from "./auth";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "Nombre demasiado largo"),
});

const acceptSchema = z.object({
  token: z.string().trim().min(10, "Token inválido"),
  password: z
    .string()
    .min(10, "La contraseña debe tener al menos 10 caracteres")
    .max(128, "Contraseña demasiado larga"),
});

const setRootSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  newPassword: z
    .string()
    .min(10, "La contraseña debe tener al menos 10 caracteres")
    .max(128),
  currentPassword: z.string().min(1),
});

/* ------------------------------------------------------------------ */
/*  Listado de admins activos + invitaciones pendientes                */
/* ------------------------------------------------------------------ */

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  created_at: string;
  created_by_email: string | null;
  last_login_at: string | null;
  isRoot: boolean;
};

export type PendingInvitation = {
  id: string;
  email: string;
  name: string;
  invited_by_email: string | null;
  created_at: string;
  expires_at: string;
  expired: boolean;
};

export async function listAdminsAction(): Promise<{
  ok: true;
  currentEmail: string;
  rootEmail: string | null;
  admins: AdminUser[];
  invitations: PendingInvitation[];
}> {
  const currentEmail = await requireAdminEmail();
  const supabase = createServiceClient();

  const { data: rows } = await supabase
    .from("admins")
    .select("id, email, name, created_at, created_by_email, last_login_at")
    .order("created_at", { ascending: true });

  const rootEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim() || null;

  const admins: AdminUser[] = (rows ?? []).map((r) => ({
    ...r,
    isRoot: rootEmail !== null && r.email.toLowerCase() === rootEmail,
  }));

  // Si el root admin del env-var no existe en BD, lo añadimos como entry
  // virtual para que aparezca en la lista (no se puede revocar — protegido).
  if (rootEmail && !admins.some((a) => a.email.toLowerCase() === rootEmail)) {
    admins.unshift({
      id: "__root__",
      email: rootEmail,
      name: "Admin (root)",
      created_at: "",
      created_by_email: null,
      last_login_at: null,
      isRoot: true,
    });
  }

  const { data: invs } = await supabase
    .from("admin_invitations")
    .select(
      "id, email, name, invited_by_email, created_at, expires_at, accepted_at"
    )
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  const now = Date.now();
  const invitations: PendingInvitation[] = (invs ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    name: i.name,
    invited_by_email: i.invited_by_email,
    created_at: i.created_at,
    expires_at: i.expires_at,
    expired: new Date(i.expires_at).getTime() < now,
  }));

  return { ok: true, currentEmail, rootEmail, admins, invitations };
}

/* ------------------------------------------------------------------ */
/*  Invitar admin                                                      */
/* ------------------------------------------------------------------ */

export type InviteResult =
  | {
      ok: true;
      invitation: PendingInvitation;
      emailSent: boolean;
      emailError?: string;
    }
  | { ok: false; error: string };

export async function inviteAdminAction(input: {
  email: string;
  name: string;
}): Promise<InviteResult> {
  const inviterEmail = await requireAdminEmail();

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = createServiceClient();

  // ¿ya existe como admin activo?
  const { data: existingAdmin } = await supabase
    .from("admins")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (existingAdmin) {
    return { ok: false, error: "Ese email ya es admin del sistema" };
  }

  // ¿ya hay invitación pendiente? Si sí, regenerar token (re-enviar)
  const token = generateInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: row, error: upsertErr } = await supabase
    .from("admin_invitations")
    .upsert(
      {
        email: parsed.data.email,
        name: parsed.data.name,
        token,
        invited_by_email: inviterEmail,
        expires_at: expiresAt,
        accepted_at: null,
      },
      { onConflict: "email" }
    )
    .select("id, email, name, invited_by_email, created_at, expires_at")
    .single();

  if (upsertErr || !row) {
    console.error("inviteAdmin upsert error", upsertErr);
    return { ok: false, error: "No se pudo crear la invitación" };
  }

  const result = await sendAdminInvitationEmail({
    to: parsed.data.email,
    recipientName: parsed.data.name,
    inviterEmail,
    token,
  });

  revalidatePath("/admin/admins");
  return {
    ok: true,
    invitation: {
      id: row.id,
      email: row.email,
      name: row.name,
      invited_by_email: row.invited_by_email,
      created_at: row.created_at,
      expires_at: row.expires_at,
      expired: false,
    },
    emailSent: result.ok,
    emailError: result.ok ? undefined : result.error,
  };
}

/* ------------------------------------------------------------------ */
/*  Revocar admin / cancelar invitación                                */
/* ------------------------------------------------------------------ */

export async function revokeAdminAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminEmail();
  const supabase = createServiceClient();

  if (id === "__root__") {
    return {
      ok: false,
      error: "No puedes revocar el admin raíz (env var). Cámbialo en .env.local del servidor.",
    };
  }

  const { error } = await supabase.from("admins").delete().eq("id", id);
  if (error) {
    console.error("revokeAdmin error", error);
    return { ok: false, error: "No se pudo revocar el admin" };
  }
  revalidatePath("/admin/admins");
  return { ok: true };
}

export async function cancelInvitationAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminEmail();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("admin_invitations")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("cancelInvitation error", error);
    return { ok: false, error: "No se pudo cancelar la invitación" };
  }
  revalidatePath("/admin/admins");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Setup password — público con token (acepta invitación)             */
/* ------------------------------------------------------------------ */

export type GetInvitationResult =
  | { ok: true; email: string; name: string; expiresAt: string }
  | { ok: false; error: string };

export async function getInvitationByTokenAction(
  token: string
): Promise<GetInvitationResult> {
  if (!token || token.length < 10) {
    return { ok: false, error: "Token inválido" };
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("admin_invitations")
    .select("email, name, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (!data) return { ok: false, error: "Invitación no encontrada" };
  if (data.accepted_at)
    return { ok: false, error: "Esta invitación ya ha sido usada" };
  if (new Date(data.expires_at).getTime() < Date.now())
    return { ok: false, error: "Esta invitación ha expirado. Pide una nueva." };

  return {
    ok: true,
    email: data.email,
    name: data.name,
    expiresAt: data.expires_at,
  };
}

export type AcceptInvitationResult =
  | { ok: true }
  | { ok: false; error: string };

export async function acceptInvitationAction(input: {
  token: string;
  password: string;
}): Promise<AcceptInvitationResult> {
  const parsed = acceptSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = createServiceClient();

  const { data: inv } = await supabase
    .from("admin_invitations")
    .select("id, email, name, expires_at, accepted_at")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!inv) return { ok: false, error: "Invitación no encontrada" };
  if (inv.accepted_at)
    return { ok: false, error: "Esta invitación ya ha sido usada" };
  if (new Date(inv.expires_at).getTime() < Date.now())
    return { ok: false, error: "Esta invitación ha expirado" };

  // Crear el admin con password hash
  const password_hash = hashPassword(parsed.data.password);
  const { error: insertErr } = await supabase.from("admins").insert({
    email: inv.email,
    name: inv.name,
    password_hash,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      // ya existe — marca invitación como aceptada igual
      await supabase
        .from("admin_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", inv.id);
      return { ok: false, error: "Ese email ya tiene cuenta admin. Pide una nueva invitación o haz login normal." };
    }
    console.error("acceptInvitation insert error", insertErr);
    return { ok: false, error: "No se pudo crear la cuenta" };
  }

  // Marcar invitación como aceptada
  await supabase
    .from("admin_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inv.id);

  // Auto-login
  await setAdminSession(inv.email);

  revalidatePath("/admin/admins");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Cambiar la propia contraseña (admins de BD)                        */
/* ------------------------------------------------------------------ */

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: string };

export async function changeOwnPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ChangePasswordResult> {
  const myEmail = await requireAdminEmail();
  const parsed = setRootSchema
    .pick({ newPassword: true, currentPassword: true })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = createServiceClient();
  const { data: admin } = await supabase
    .from("admins")
    .select("id, password_hash")
    .eq("email", myEmail)
    .maybeSingle();

  if (!admin) {
    return {
      ok: false,
      error: "Estás conectado como root admin (env var). Cambia ADMIN_PASSWORD en el servidor.",
    };
  }

  if (!verifyPassword(parsed.data.currentPassword, admin.password_hash)) {
    return { ok: false, error: "La contraseña actual no es correcta" };
  }

  const new_hash = hashPassword(parsed.data.newPassword);
  const { error } = await supabase
    .from("admins")
    .update({ password_hash: new_hash })
    .eq("id", admin.id);

  if (error) {
    console.error("changeOwnPassword error", error);
    return { ok: false, error: "No se pudo actualizar la contraseña" };
  }
  return { ok: true };
}
