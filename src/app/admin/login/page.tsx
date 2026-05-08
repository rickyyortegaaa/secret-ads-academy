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

export default function AdminLoginPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col items-center justify-center">
        <Card className="w-full border-pink-100/80 shadow-xl shadow-pink-100/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <BrandLogo size={72} showWordmark={false} />
            </div>
            <CardTitle className="text-2xl">Panel de administración</CardTitle>
            <CardDescription>
              Acceso restringido al equipo de la academia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              El login de admin se construirá en la Fase 3 del proyecto.
            </p>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/">Volver al inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
