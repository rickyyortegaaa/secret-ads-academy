"use client";

import {
  CheckCircle2,
  Clock,
  Eye,
  PencilLine,
  Volume2,
  Trophy,
  PlayCircle,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type IntroScreenProps = {
  studentName: string;
  totalQuestions: number;
  passThreshold: number;
  onStart: () => void;
};

export function IntroScreen({
  studentName,
  totalQuestions,
  passThreshold,
  onStart,
}: IntroScreenProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="border-pink-100/80 shadow-xl shadow-pink-100/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <BrandLogo size={72} showWordmark={false} />
          </div>
          <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700">
            <CheckCircle2 className="size-3.5" />
            Sesión iniciada
          </div>
          <CardTitle className="text-2xl sm:text-3xl">
            ¡Hola, {studentName}!
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Bienvenido al examen de certificación de Secret Ads Academy.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Antes de empezar
            </h2>
            <ul className="space-y-3 text-sm">
              <InstructionItem
                icon={<Volume2 className="size-4" />}
                text="Busca un sitio tranquilo, sin distracciones. El examen requiere concentración."
              />
              <InstructionItem
                icon={<Clock className="size-4" />}
                text={
                  <>
                    Tienes <strong>60 segundos</strong> para cada pregunta tipo
                    test y <strong>3 minutos</strong> para cada pregunta de
                    respuesta abierta.
                  </>
                }
              />
              <InstructionItem
                icon={<PencilLine className="size-4" />}
                text={
                  <>
                    Son <strong>{totalQuestions} preguntas</strong> en total.
                    Las preguntas se mostrarán de una en una y avanzan
                    automáticamente cuando contestes o se acabe el tiempo.
                  </>
                }
              />
              <InstructionItem
                icon={<Eye className="size-4" />}
                text={
                  <>
                    No salgas de la pestaña del examen. Si lo haces queda
                    registrado y podría invalidar tu intento.
                  </>
                }
              />
              <InstructionItem
                icon={<Trophy className="size-4" />}
                text={
                  <>
                    Para aprobar necesitas un{" "}
                    <strong>{passThreshold}% o más</strong>. Al terminar podrás
                    revisar tus respuestas antes de enviar el examen
                    definitivamente.
                  </>
                }
              />
            </ul>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-900">
            ⚠️ Una vez pulses <strong>Empezar examen</strong>, el contador
            arrancará. Asegúrate de tener buena conexión y batería antes de
            continuar.
          </div>

          <Button
            onClick={onStart}
            size="lg"
            className="brand-gradient w-full text-base font-semibold text-white shadow-md transition-transform hover:scale-[1.01]"
          >
            <PlayCircle className="size-5" />
            Empezar examen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function InstructionItem({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="brand-gradient mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-white">
        {icon}
      </span>
      <span className="leading-snug text-foreground/90">{text}</span>
    </li>
  );
}
