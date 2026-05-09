import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { QuestionForm } from "@/components/admin/question-form";
import { getQuestionAction } from "@/app/actions/admin/questions";

export const dynamic = "force-dynamic";

export default async function EditQuestionPage(
  props: PageProps<"/admin/questions/[id]">
) {
  const { id } = await props.params;
  const result = await getQuestionAction(id);

  if (!result.ok) {
    notFound();
  }

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
            Editar pregunta
          </h1>
          <p className="text-sm text-muted-foreground">
            Modifica el texto, las opciones, la imagen o el tiempo de esta
            pregunta.
          </p>
        </div>
      </div>
      <QuestionForm mode={{ kind: "edit", question: result.question }} />
    </div>
  );
}
