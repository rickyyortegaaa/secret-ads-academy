"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  studentLoginAction,
  type StudentLoginState,
} from "@/app/actions/student-login";

const initialState: StudentLoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="brand-gradient w-full text-base font-semibold text-white shadow-md transition-transform hover:scale-[1.01] hover:opacity-95 disabled:opacity-70"
      size="lg"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Validando...
        </>
      ) : (
        "Empezar examen"
      )}
    </Button>
  );
}

export function StudentLoginForm() {
  const [state, formAction] = useActionState(studentLoginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre</Label>
          <Input
            id="firstName"
            name="firstName"
            placeholder="Tu nombre"
            autoComplete="given-name"
            required
          />
          {state.fieldErrors?.firstName ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.firstName}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellidos</Label>
          <Input
            id="lastName"
            name="lastName"
            placeholder="Tus apellidos"
            autoComplete="family-name"
            required
          />
          {state.fieldErrors?.lastName ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.lastName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="tu@email.com"
          autoComplete="email"
          required
        />
        {state.fieldErrors?.email ? (
          <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <SubmitButton />

      <p className="text-center text-xs text-muted-foreground">
        Solo los emails autorizados por la academia pueden acceder al examen.
      </p>
    </form>
  );
}
