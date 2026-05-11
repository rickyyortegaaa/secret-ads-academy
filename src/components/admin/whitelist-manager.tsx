"use client";

import { useState, useTransition } from "react";
import {
  Trash2,
  Plus,
  Loader2,
  Mail,
  CheckCircle2,
  Send,
  MailCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  resendInvitationAction,
  type WhitelistEntry,
} from "@/app/actions/admin/whitelist";

type Props = {
  initialEntries: WhitelistEntry[];
};

export function WhitelistManager({ initialEntries }: Props) {
  const [entries, setEntries] = useState<WhitelistEntry[]>(initialEntries);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [sendInvitation, setSendInvitation] = useState(true);
  const [adding, startAdding] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<WhitelistEntry | null>(
    null
  );
  const [deleting, startDeleting] = useTransition();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    if (!trimmedEmail || !trimmedName) return;

    startAdding(async () => {
      const result = await addToWhitelistAction({
        email: trimmedEmail,
        name: trimmedName,
        notes,
        send_invitation: sendInvitation,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEntries((prev) => [result.entry, ...prev]);
      setName("");
      setEmail("");
      setNotes("");
      if (sendInvitation) {
        if (result.invitationSent) {
          toast.success(
            `${result.entry.email} añadido + invitación enviada por email`
          );
        } else {
          toast.warning(
            `${result.entry.email} añadido, pero el email NO se envió: ${result.invitationError}`
          );
        }
      } else {
        toast.success("Email añadido a la whitelist");
      }
    });
  };

  const handleResend = (entry: WhitelistEntry) => {
    setResendingId(entry.id);
    void (async () => {
      try {
        const result = await resendInvitationAction(entry.id);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(`Invitación reenviada a ${entry.email}`);
      } finally {
        setResendingId(null);
      }
    })();
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="wl-name">Nombre</Label>
            <Input
              id="wl-name"
              placeholder="Nombre y apellidos"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wl-email">Email</Label>
            <Input
              id="wl-email"
              type="email"
              placeholder="email@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="wl-notes" className="text-muted-foreground">
              Notas (opcional)
            </Label>
            <Input
              id="wl-notes"
              placeholder="ej: cohorte / referencia interna"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={280}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col items-stretch gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={sendInvitation}
              onCheckedChange={(checked) => setSendInvitation(!!checked)}
              id="wl-invite"
            />
            <span>
              Enviar email de invitación con el branding de la academia
            </span>
          </label>
          <Button
            type="submit"
            disabled={adding}
            className="brand-gradient text-white"
          >
            {adding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : sendInvitation ? (
              <Send className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {sendInvitation ? "Añadir y enviar invitación" : "Añadir"}
          </Button>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3 sm:px-6">
          <h2 className="font-semibold">Whitelist actual</h2>
          <p className="text-xs text-muted-foreground">
            {entries.length}{" "}
            {entries.length === 1 ? "email autorizado" : "emails autorizados"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden lg:table-cell">Notas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    <Mail className="mx-auto mb-2 size-8 opacity-40" />
                    Aún no hay emails autorizados. Añade el primero arriba.
                  </TableCell>
                </TableRow>
              ) : null}
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {entry.name ?? (
                      <span className="italic text-muted-foreground">
                        — sin nombre —
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.email}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
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
                    <div className="flex justify-end gap-1">
                      {!entry.has_attempted && entry.name ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={resendingId === entry.id}
                          onClick={() => handleResend(entry)}
                          title="Reenviar invitación por email"
                        >
                          {resendingId === entry.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <MailCheck className="size-3.5" />
                          )}
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setConfirmDelete(entry)}
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
            <DialogTitle>¿Eliminar de la whitelist?</DialogTitle>
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
