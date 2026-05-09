"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";
import { sendInvitationEmail } from "@/lib/email";

import { requireAdminEmail } from "./auth";

const addEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "Nombre demasiado largo"),
  notes: z.string().trim().max(280).optional(),
  send_invitation: z.boolean().optional(),
});

export type WhitelistEntry = {
  id: string;
  email: string;
  name: string | null;
  notes: string | null;
  created_at: string;
  has_attempted: boolean;
};

export async function listWhitelistAction(): Promise<{
  ok: true;
  entries: WhitelistEntry[];
}> {
  await requireAdminEmail();
  const supabase = createServiceClient();

  const { data: list, error } = await supabase
    .from("whitelist")
    .select("id, email, name, notes, created_at")
    .order("created_at", { ascending: false });

  if (error || !list) {
    return { ok: true, entries: [] };
  }

  // Mark which emails already have a student record (i.e. have logged in)
  const emails = list.map((w) => w.email);
  let attemptedEmails = new Set<string>();
  if (emails.length > 0) {
    const { data: students } = await supabase
      .from("students")
      .select("email")
      .in("email", emails);
    attemptedEmails = new Set((students ?? []).map((s) => s.email));
  }

  return {
    ok: true,
    entries: list.map((w) => ({
      ...w,
      has_attempted: attemptedEmails.has(w.email),
    })),
  };
}

export type AddWhitelistResult =
  | { ok: true; entry: WhitelistEntry; invitationSent: boolean; invitationError?: string }
  | { ok: false; error: string };

export async function addToWhitelistAction(input: {
  email: string;
  name: string;
  notes?: string;
  send_invitation?: boolean;
}): Promise<AddWhitelistResult> {
  await requireAdminEmail();

  const parsed = addEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("whitelist")
    .insert({
      email: parsed.data.email,
      name: parsed.data.name,
      notes: parsed.data.notes || null,
    })
    .select("id, email, name, notes, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ese email ya está en la whitelist" };
    }
    console.error("addToWhitelist error", error);
    return { ok: false, error: "No se pudo añadir el email" };
  }

  let invitationSent = false;
  let invitationError: string | undefined;

  if (parsed.data.send_invitation) {
    const result = await sendInvitationEmail({
      to: parsed.data.email,
      recipientName: parsed.data.name,
    });
    if (result.ok) {
      invitationSent = true;
    } else {
      invitationError = result.error;
    }
  }

  revalidatePath("/admin/whitelist");

  return {
    ok: true,
    entry: { ...data, has_attempted: false },
    invitationSent,
    invitationError,
  };
}

/**
 * Reenviar invitación a un email ya en la whitelist (botón manual del admin).
 */
export async function resendInvitationAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminEmail();
  const supabase = createServiceClient();

  const { data: entry } = await supabase
    .from("whitelist")
    .select("email, name")
    .eq("id", id)
    .maybeSingle();

  if (!entry) return { ok: false, error: "Entrada no encontrada" };
  if (!entry.name) {
    return {
      ok: false,
      error:
        "Esta entrada no tiene nombre — edita el registro para añadirle uno antes de enviar la invitación.",
    };
  }

  const result = await sendInvitationEmail({
    to: entry.email,
    recipientName: entry.name,
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function removeFromWhitelistAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminEmail();
  const supabase = createServiceClient();

  const { error } = await supabase.from("whitelist").delete().eq("id", id);
  if (error) {
    console.error("removeFromWhitelist error", error);
    return { ok: false, error: "No se pudo eliminar el email" };
  }

  revalidatePath("/admin/whitelist");
  return { ok: true };
}
