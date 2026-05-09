import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { QuestionForm } from "@/components/admin/question-form";

export const dynamic = "force-dynamic";

export default function NewQuestionPage() {
  return (
    <div className="space-y-6 pb-16">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/questions">
            <ArrowLeft className="size-4" /> Volver a preguntas
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Nueva pregunta
          </h1>
          <p className="text-sm text-muted-foreground">
            Crea una pregunta nueva para añadirla al examen.
          </p>
        </div>
      </div>
      <QuestionForm mode={{ kind: "create" }} />
    </div>
  );
}
