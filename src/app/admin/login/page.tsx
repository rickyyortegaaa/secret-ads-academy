import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const existing = await getAdminSession();
  if (existing) {
    redirect("/admin");
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col items-center justify-center">
        <Card className="w-full border-pink-100/80 shadow-xl shadow-pink-100/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <BrandLogo size={64} showWordmark={false} />
            </div>
            <CardTitle className="text-2xl">Panel de administración</CardTitle>
            <CardDescription>
              Acceso restringido al equipo de la academia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminLoginForm />
            <div className="border-t pt-3 text-center">
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
