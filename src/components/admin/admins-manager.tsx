"use client";

import { useState, useTransition } from "react";
import {
  Loader2,
  Mail,
  Plus,
  Send,
  Trash2,
  ShieldCheck,
  Clock,
  AlertTriangle,
  X,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  cancelInvitationAction,
  changeOwnPasswordAction,
  inviteAdminAction,
  revokeAdminAction,
  type AdminUser,
  type PendingInvitation,
} from "@/app/actions/admin/team";

function formatDate(iso: string | null | ""): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  currentEmail: string;
  rootEmail: string | null;
  initialAdmins: AdminUser[];
  initialInvitations: PendingInvitation[];
};

export function AdminsManager({
  currentEmail,
  rootEmail,
  initialAdmins,
  initialInvitations,
}: Props) {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);
  const [invitations, setInvitations] =
    useState<PendingInvitation[]>(initialInvitations);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inviting, startInviting] = useTransition();

  const [confirmRevoke, setConfirmRevoke] = useState<AdminUser | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<PendingInvitation | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);

  const handleInvite = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) return;

    startInviting(async () => {
      const result = await inviteAdminAction({
        email: trimmedEmail,
        name: trimmedName,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.emailSent) {
        toast.success(`Invitación enviada a ${trimmedEmail}`);
      } else {
        toast.warning(
          `Invitación creada, pero el email NO se envió: ${result.emailError}`
        );
      }
      // Usamos el ID REAL devuelto por el servidor (no un placeholder)
      // para que cancel/resend funcionen sobre esa fila.
      setInvitations((prev) => [
        result.invitation,
        ...prev.filter((p) => p.email !== trimmedEmail),
      ]);
      setName("");
      setEmail("");
    });
  };

  const handleRevoke = (admin: AdminUser) => {
    setBusyId(admin.id);
    void (async () => {
      try {
        const result = await revokeAdminAction(admin.id);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
        setConfirmRevoke(null);
        toast.success(`${admin.email} ya no es admin`);
      } finally {
        setBusyId(null);
      }
    })();
  };

  const handleCancelInvitation = (inv: PendingInvitation) => {
    setBusyId(inv.id);
    void (async () => {
      try {
        const result = await cancelInvitationAction(inv.id);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
        setConfirmCancel(null);
        toast.success("Invitación cancelada");
      } finally {
        setBusyId(null);
      }
    })();
  };

  const isCurrentUserRoot =
    rootEmail !== null && currentEmail.toLowerCase() === rootEmail;

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleInvite();
        }}
        className="rounded-xl border bg-card p-4 shadow-sm sm:p-6"
      >
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">
          Invitar a un nuevo admin
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="adm-name">Nombre</Label>
            <Input
              id="adm-name"
              placeholder="Nombre y apellidos"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adm-email">Email</Label>
            <Input
              id="adm-email"
              type="email"
              placeholder="email@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col items-stretch gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Recibirá un email de invitación con un enlace para elegir su
            contraseña. Caduca en 7 días.
          </p>
          <Button
            type="submit"
            disabled={inviting}
            className="brand-gradient text-white"
          >
            {inviting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Enviar invitación
          </Button>
        </div>
      </form>

      {/* Admins table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          <div>
            <h2 className="font-semibold">Admins activos</h2>
            <p className="text-xs text-muted-foreground">
              {admins.length} {admins.length === 1 ? "admin" : "admins"} con
              acceso al panel
            </p>
          </div>
          {!isCurrentUserRoot ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPwdDialogOpen(true)}
            >
              <KeyRound className="size-3.5" />
              Cambiar mi contraseña
            </Button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Último login
                </TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((a) => {
                const isMe = a.email.toLowerCase() === currentEmail.toLowerCase();
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.name}{" "}
                      {isMe ? (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          (tú)
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.email}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {formatDate(a.last_login_at)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {a.isRoot ? (
                        <Badge className="bg-amber-500">
                          <ShieldCheck className="size-3" />
                          Root (env)
                        </Badge>
                      ) : (
                        <Badge variant="outline">Equipo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {a.isRoot ? (
                        <span className="text-xs italic text-muted-foreground">
                          Protegido
                        </span>
                      ) : isMe ? (
                        <span className="text-xs italic text-muted-foreground">
                          No puedes revocarte a ti
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => setConfirmRevoke(a)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 ? (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-4 py-3 sm:px-6">
            <h2 className="font-semibold">Invitaciones pendientes</h2>
            <p className="text-xs text-muted-foreground">
              {invitations.length}{" "}
              {invitations.length === 1
                ? "invitación pendiente de aceptar"
                : "invitaciones pendientes de aceptar"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Caduca</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.email}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {inv.expired ? (
                        <Badge className="bg-rose-600">
                          <AlertTriangle className="size-3" />
                          Expirada
                        </Badge>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {formatDate(inv.expires_at)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setConfirmCancel(inv)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          <Mail className="mx-auto mb-2 size-6 opacity-50" />
          No hay invitaciones pendientes. <Plus className="inline size-3.5" />{" "}
          Invita a alguien arriba para añadirlo al equipo.
        </div>
      )}

      {/* Revoke confirmation */}
      <Dialog
        open={confirmRevoke !== null}
        onOpenChange={(o) => !o && setConfirmRevoke(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Revocar acceso?</DialogTitle>
            <DialogDescription>
              <strong>{confirmRevoke?.email}</strong> dejará de poder iniciar
              sesión en el panel admin. Esta acción no se puede deshacer (pero
              puedes volver a invitarle).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmRevoke(null)}
              disabled={busyId === confirmRevoke?.id}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busyId === confirmRevoke?.id}
              onClick={() => confirmRevoke && handleRevoke(confirmRevoke)}
            >
              {busyId === confirmRevoke?.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Sí, revocar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel invitation confirmation */}
      <Dialog
        open={confirmCancel !== null}
        onOpenChange={(o) => !o && setConfirmCancel(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar invitación?</DialogTitle>
            <DialogDescription>
              El enlace enviado a <strong>{confirmCancel?.email}</strong>{" "}
              dejará de funcionar. Si quieres re-invitar, vuelve a enviar la
              invitación desde el form.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmCancel(null)}
              disabled={busyId === confirmCancel?.id}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busyId === confirmCancel?.id}
              onClick={() =>
                confirmCancel && handleCancelInvitation(confirmCancel)
              }
            >
              {busyId === confirmCancel?.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Sí, cancelar invitación"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChangePasswordDialog
        open={pwdDialogOpen}
        onOpenChange={setPwdDialogOpen}
      />
    </div>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, startSubmitting] = useTransition();

  const handle = () => {
    if (!currentPassword || newPassword.length < 10) {
      toast.error("La nueva contraseña debe tener al menos 10 caracteres");
      return;
    }
    startSubmitting(async () => {
      const result = await changeOwnPasswordAction({
        currentPassword,
        newPassword,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Contraseña actualizada");
      setCurrentPassword("");
      setNewPassword("");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar mi contraseña</DialogTitle>
          <DialogDescription>
            Necesitarás volver a iniciar sesión la próxima vez con la nueva
            contraseña.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="current-pwd">Contraseña actual</Label>
            <Input
              id="current-pwd"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pwd">Contraseña nueva</Label>
            <Input
              id="new-pwd"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo 10 caracteres.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handle}
            disabled={submitting}
            className="brand-gradient text-white"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
