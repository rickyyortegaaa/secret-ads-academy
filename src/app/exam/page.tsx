import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getStudentSession, clearStudentSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

async function logoutAction() {
  "use server";
  await clearStudentSession();
  redirect("/");
}

export default async function ExamPage() {
  const studentId = await getStudentSession();
  if (!studentId) {
    redirect("/");
  }

  const supabase = createServiceClient();
  const { data: student } = await supabase
    .from("students")
    .select("first_name, last_name, email")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) {
    await clearStudentSession();
    redirect("/");
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl flex-col items-center justify-center">
        <Card className="w-full border-pink-100/80 shadow-xl shadow-pink-100/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <BrandLogo size={80} showWordmark={false} />
            </div>
            <CardTitle className="text-2xl">
              ¡Hola, {student.first_name}!
            </CardTitle>
            <CardDescription>
              Tu acceso ha sido validado correctamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-muted-foreground">
              El examen aún no está disponible. En la siguiente fase del
              desarrollo verás aquí las preguntas tipo Kahoot con timer.
            </p>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" className="rounded-full">
                Cerrar sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
