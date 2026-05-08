"use server";

import { redirect } from "next/navigation";

import { createServiceClient } from "@/lib/supabase/server";
import { setStudentSession } from "@/lib/session";
import { studentLoginSchema } from "@/lib/validation";

export type StudentLoginState = {
  error?: string;
  fieldErrors?: Partial<Record<"firstName" | "lastName" | "email", string>>;
};

export async function studentLoginAction(
  _prev: StudentLoginState,
  formData: FormData
): Promise<StudentLoginState> {
  const parsed = studentLoginSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const fieldErrors: StudentLoginState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (path === "firstName" || path === "lastName" || path === "email") {
        fieldErrors[path] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const { firstName, lastName, email } = parsed.data;
  const supabase = createServiceClient();

  // 1. Verificar whitelist
  const { data: whitelisted, error: whitelistError } = await supabase
    .from("whitelist")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (whitelistError) {
    return { error: "Error verificando el acceso. Inténtalo de nuevo." };
  }

  if (!whitelisted) {
    return {
      error:
        "Este email no está autorizado para realizar el examen. Contacta con la academia.",
    };
  }

  // 2. Crear o encontrar el student
  const { data: existing } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .eq("email", email)
    .maybeSingle();

  let studentId: string;

  if (existing) {
    studentId = existing.id;
    // Actualizar nombres si cambiaron
    if (
      existing.first_name !== firstName ||
      existing.last_name !== lastName
    ) {
      await supabase
        .from("students")
        .update({ first_name: firstName, last_name: lastName })
        .eq("id", existing.id);
    }
  } else {
    const { data: created, error: insertError } = await supabase
      .from("students")
      .insert({ email, first_name: firstName, last_name: lastName })
      .select("id")
      .single();

    if (insertError || !created) {
      return { error: "No se pudo crear el registro. Inténtalo de nuevo." };
    }
    studentId = created.id;
  }

  // 3. Crear sesión y redirigir
  await setStudentSession(studentId);
  redirect("/exam");
}
