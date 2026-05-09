"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Pencil, Trash2, Loader2, Plus, ImageOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteQuestionAction,
  type AdminQuestion,
} from "@/app/actions/admin/questions";

type Props = {
  initial: AdminQuestion[];
};

export function QuestionsTable({ initial }: Props) {
  const [questions, setQuestions] = useState<AdminQuestion[]>(initial);
  const [confirmDelete, setConfirmDelete] = useState<AdminQuestion | null>(
    null
  );
  const [deleting, startDeleting] = useTransition();

  const handleDelete = (q: AdminQuestion) => {
    startDeleting(async () => {
      const result = await deleteQuestionAction(q.id);
      if (!result.ok) {
        toast.error(result.error);
        setConfirmDelete(null);
        return;
      }
      setQuestions((prev) => prev.filter((x) => x.id !== q.id));
      setConfirmDelete(null);
      toast.success("Pregunta eliminada");
    });
  };

  return (
    <>
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-semibold">Banco de preguntas</h2>
            <p className="text-xs text-muted-foreground">
              {questions.length}{" "}
              {questions.length === 1 ? "pregunta" : "preguntas"} configuradas
            </p>
          </div>
          <Button asChild className="brand-gradient text-white">
            <Link href="/admin/questions/new">
              <Plus className="size-4" />
              Nueva pregunta
            </Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-16">Imagen</TableHead>
                <TableHead>Pregunta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Tiempo
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Aún no hay preguntas. Crea la primera.
                  </TableCell>
                </TableRow>
              ) : null}
              {questions.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium tabular-nums">
                    {q.position}
                  </TableCell>
                  <TableCell>
                    {q.image_url ? (
                      <div className="relative size-10 overflow-hidden rounded-md border">
                        <Image
                          src={q.image_url}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-md border bg-muted/40">
                        <ImageOff className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="truncate text-sm" title={q.text}>
                      {q.text}
                    </p>
                  </TableCell>
                  <TableCell>
                    {q.type === "multiple_choice" ? (
                      <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-100">
                        Test
                      </Badge>
                    ) : (
                      <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
                        Abierta
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-right text-sm tabular-nums md:table-cell">
                    {q.time_seconds}s
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/questions/${q.id}`}>
                          <Pencil className="size-3.5" />
                          <span className="sr-only sm:not-sr-only sm:ml-1">
                            Editar
                          </span>
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setConfirmDelete(q)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Borrar pregunta?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Si la pregunta ya tiene
              respuestas guardadas de algún alumno, no se podrá borrar.
            </DialogDescription>
          </DialogHeader>
          {confirmDelete ? (
            <p className="rounded-lg border bg-muted/40 p-3 text-sm">
              {confirmDelete.text}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Sí, borrar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
