"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ExamCompletedProps = {
  studentName: string;
  state: "submitting" | "submitted-hidden" | "submitted-published";
  result?: { score: number; passed: boolean | null } | null;
  onLogout: () => void;
};

export function ExamCompleted({
  studentName,
  state,
  result,
  onLogout,
}: ExamCompletedProps) {
  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-xl items-center justify-center px-4">
      <Card className="w-full border-pink-100/80 shadow-xl shadow-pink-100/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <BrandLogo size={64} showWordmark={false} />
          </div>
          {state === "submitting" ? (
            <>
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                <Loader2 className="size-5 animate-spin" />
                Enviando tu examen...
              </CardTitle>
              <CardDescription>
                Estamos guardando todas tus respuestas.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                <CheckCircle2 className="size-7 text-pink-500" />
                ¡Examen enviado!
              </CardTitle>
              <CardDescription>
                Gracias, {studentName}. Hemos recibido tus respuestas.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          {state === "submitted-published" && result ? (
            <div className="rounded-2xl border bg-pink-50/40 p-6">
              <p className="text-sm font-medium text-muted-foreground">
                Tu nota
              </p>
              <p className="brand-text-gradient text-5xl font-bold tabular-nums">
                {result.score.toFixed(0)}
                <span className="text-2xl">%</span>
              </p>
              {result.passed !== null ? (
                <p
                  className={`mt-2 text-sm font-semibold ${
                    result.passed ? "text-green-600" : "text-destructive"
                  }`}
                >
                  {result.passed ? "✅ APROBADO" : "❌ NO APROBADO"}
                </p>
              ) : null}
            </div>
          ) : null}

          {state === "submitted-hidden" ? (
            <p className="text-sm text-muted-foreground">
              Tus resultados serán revisados y publicados por la academia.
              Recibirás la nota cuando estén disponibles.
            </p>
          ) : null}

          {state !== "submitting" ? (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={onLogout}
            >
              Cerrar sesión
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
