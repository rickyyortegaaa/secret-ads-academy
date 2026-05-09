import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SetupPasswordForm } from "@/components/admin/setup-password-form";
import { getInvitationByTokenAction } from "@/app/actions/admin/team";

export const dynamic = "force-dynamic";

export default async function AdminSetupPage(props: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const sp = await props.searchParams;
  const tokenRaw = sp.token;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col items-center justify-center">
        <Card className="w-full border-pink-100/80 shadow-xl shadow-pink-100/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <BrandLogo size={64} showWordmark={false} />
            </div>
            <CardTitle className="text-2xl">Activar cuenta admin</CardTitle>
            <CardDescription>
              Elige tu contraseña para empezar a gestionar el panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!token ? (
              <InvalidToken
                title="Falta el token"
                message="El enlace que has usado no incluye un token válido. Pídele al admin que te re-envíe la invitación."
              />
            ) : (
              <TokenContent token={token} />
            )}
            <div className="mt-4 border-t pt-3 text-center">
              <Link
                href="/"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← Volver al inicio
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function TokenContent({ token }: { token: string }) {
  const result = await getInvitationByTokenAction(token);
  if (!result.ok) {
    return <InvalidToken title="Invitación no válida" message={result.error} />;
  }
  return (
    <SetupPasswordForm
      token={token}
      email={result.email}
      name={result.name}
    />
  );
}

function InvalidToken({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="space-y-3 text-center">
      <p className="font-semibold text-destructive">{title}</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button asChild variant="outline" className="w-full">
        <Link href="/admin/login">Ir al login</Link>
      </Button>
    </div>
  );
}
