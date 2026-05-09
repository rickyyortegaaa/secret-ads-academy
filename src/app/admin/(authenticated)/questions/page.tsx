import { QuestionsTable } from "@/components/admin/questions-table";
import { listQuestionsAction } from "@/app/actions/admin/questions";

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage() {
  const { questions } = await listQuestionsAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Preguntas
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestiona el banco de preguntas del examen.
        </p>
      </div>
      <QuestionsTable initial={questions} />
    </div>
  );
}
