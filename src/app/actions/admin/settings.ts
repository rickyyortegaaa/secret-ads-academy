"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";

import { requireAdminEmail } from "./auth";

const settingsUpdateSchema = z.object({
  pass_threshold: z.coerce.number().min(0).max(100),
  publish_results_globally: z.coerce.boolean(),
  allow_retries: z.coerce.boolean(),
});

export type Settings = z.infer<typeof settingsUpdateSchema>;

export async function getSettingsAction(): Promise<{
  ok: true;
  settings: Settings & { id: string };
} | { ok: false; error: string }> {
  await requireAdminEmail();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("settings")
    .select("id, pass_threshold, publish_results_globally, allow_retries")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "No se pudieron cargar los settings" };
  }

  return {
    ok: true,
    settings: {
      id: data.id,
      pass_threshold: Number(data.pass_threshold),
      publish_results_globally: data.publish_results_globally,
      allow_retries: data.allow_retries,
    },
  };
}

export async function updateSettingsAction(
  input: Partial<Settings>
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminEmail();

  const parsed = settingsUpdateSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }

  const supabase = createServiceClient();

  // There should be exactly one row in settings
  const { data: row } = await supabase
    .from("settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!row) return { ok: false, error: "No hay fila de settings" };

  const { error } = await supabase
    .from("settings")
    .update({
      ...(parsed.data.pass_threshold !== undefined && {
        pass_threshold: parsed.data.pass_threshold,
      }),
      ...(parsed.data.publish_results_globally !== undefined && {
        publish_results_globally: parsed.data.publish_results_globally,
      }),
      ...(parsed.data.allow_retries !== undefined && {
        allow_retries: parsed.data.allow_retries,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (error) {
    console.error("updateSettings error", error);
    return { ok: false, error: "No se pudo actualizar" };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return { ok: true };
}
