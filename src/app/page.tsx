import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { StudentLoginForm } from "@/components/student-login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-pink-50 via-white to-pink-50">
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[480px] rounded-full bg-pink-300/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 size-[480px] rounded-full bg-rose-300/40 blur-3xl"
      />

      {/* Header */}
      <header className="relative z-10 flex w-full items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tracking-wider uppercase text-muted-foreground">
            Plataforma de Certificación
          </span>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/admin/login">Admin</Link>
        </Button>
      </header>

      {/* Hero / login card */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-10 sm:py-16">
        <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-2 lg:items-center">
          {/* Left: brand pitch */}
          <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
            <BrandLogo size={120} />
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Tu examen de
                <br />
                <span className="brand-text-gradient">certificación oficial</span>
              </h1>
              <p className="max-w-md text-base text-muted-foreground sm:text-lg">
                Demuestra tus conocimientos y obtén tu acreditación de Secret
                Ads Academy. Solo necesitas unos minutos.
              </p>
            </div>
            <ul className="hidden flex-col gap-2 text-sm text-muted-foreground lg:flex">
              <li className="flex items-center gap-2">
                <span className="brand-gradient size-2 rounded-full" />
                Una pregunta por pantalla, formato dinámico
              </li>
              <li className="flex items-center gap-2">
                <span className="brand-gradient size-2 rounded-full" />
                Temporizador en cada pregunta
              </li>
              <li className="flex items-center gap-2">
                <span className="brand-gradient size-2 rounded-full" />
                Resultados oficiales tras la corrección
              </li>
            </ul>
          </div>

          {/* Right: login card */}
          <Card className="border-pink-100/80 shadow-xl shadow-pink-100/50 backdrop-blur-sm">
            <CardHeader className="space-y-1.5 text-center">
              <CardTitle className="text-2xl">Empieza tu examen</CardTitle>
              <CardDescription>
                Regístrate con tus datos para acceder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StudentLoginForm />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Secret Ads Academy. Todos los derechos
        reservados.
      </footer>
    </div>
  );
}
