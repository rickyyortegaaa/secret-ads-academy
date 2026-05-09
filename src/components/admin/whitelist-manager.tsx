"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addToWhitelistAction,
  removeFromWhitelistAction,
  type WhitelistEntry,
} from "@/app/actions/admin/whitelist";

type Props = {
  initialEntries: WhitelistEntry[];
};

export function WhitelistManager({ initialEntries }: Props) {
  const [entries, setEntries] = useState<WhitelistEntry[]>(initialEntries);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, startAdding] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<WhitelistEntry | null>(
    null
  );
  const [deleting, startDeleting] = useTransition();

  const handleAdd = () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    startAdding(async () => {
      const result = await addToWhitelistAction({ email: trimmed, notes });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEntries((prev) => [result.entry, ...prev]);
      setEmail("");
      setNotes("");
      toast.success("Email añadido a la whitelist");
    });
  };

  const handleDelete = (entry: WhitelistEntry) => {
    startDeleting(async () => {
      const result = await removeFromWhitelistAction(entry.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      setConfirmDelete(null);
      toast.success("Email eliminado");
    });
  };

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd();
        }}
        className="rounded-xl border bg-card p-4 shadow-sm sm:p-6"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="wl-email">Email</Label>
            <Input
              id="wl-email"
              type="email"
              placeholder="alumno@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wl-notes" className="text-muted-foreground">
              Notas (opcional)
            </Label>
            <Input
              id="wl-notes"
              placeholder="ej: Promoción Marzo 2026"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={280}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={adding}
              className="brand-gradient w-full text-white sm:w-auto"
            >
              {adding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Añadir
            </Button>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Whitelist actual</h2>
              <p className="text-xs text-muted-foreground">
                {entries.length}{" "}
                {entries.length === 1 ? "email autorizado" : "emails autorizados"}
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead className="hidden sm:table-cell">Notas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    <Mail className="mx-auto mb-2 size-8 opacity-40" />
                    Aún no hay emails autorizados. Añade el primero arriba.
                  </TableCell>
                </TableRow>
              ) : null}
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.email}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {entry.notes || (
                      <span className="italic opacity-60">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.has_attempted ? (
                      <Badge className="bg-green-600">
                        <CheckCircle2 className="size-3" />
                        Ha entrado
                      </Badge>
                    ) : (
                      <Badge variant="outline">Sin entrar</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => setConfirmDelete(entry)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
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
            <DialogTitle>¿Eliminar email de la whitelist?</DialogTitle>
            <DialogDescription>
              <span className="font-mono font-semibold text-foreground">
                {confirmDelete?.email}
              </span>{" "}
              ya no podrá iniciar sesión para hacer el examen. Si ya hizo un
              intento, el intento se mantiene guardado.
            </DialogDescription>
          </DialogHeader>
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
                "Sí, eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
