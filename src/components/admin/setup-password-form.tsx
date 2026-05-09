"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { acceptInvitationAction } from "@/app/actions/admin/team";

type Props = {
  token: string;
  email: string;
  name: string;
};

export function SetupPasswordForm({ token, email, name }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmitting] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError("La contraseña debe tener al menos 10 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    startSubmitting(async () => {
      const result = await acceptInvitationAction({ token, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`¡Bienvenido al equipo, ${name}!`);
      router.push("/admin");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <p className="text-muted-foreground">Activando cuenta para</p>
        <p className="font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Elige una contraseña</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={10}
        />
        <p className="text-xs text-muted-foreground">
          Mínimo 10 caracteres. Te recomendamos al menos uno de cada: mayúscula,
          minúscula, número y símbolo.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Repite la contraseña</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          minLength={10}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        disabled={submitting}
        className="brand-gradient w-full text-base font-semibold text-white"
        size="lg"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <KeyRound className="size-4" />
        )}
        Activar mi cuenta
      </Button>
    </form>
  );
}
