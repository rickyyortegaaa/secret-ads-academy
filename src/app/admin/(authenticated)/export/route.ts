import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/session";
import { listAttemptsAction } from "@/app/actions/admin/attempts";
import { buildCSV, todayDateStamp } from "@/lib/csv-export";

export const dynamic = "force-dynamic";

const formatDateOrEmpty = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export async function GET() {
  const adminEmail = await getAdminSession();
  if (!adminEmail) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await listAttemptsAction();

  type Row = {
    nombre: string;
    email: string;
    iniciado: string;
    finalizado: string;
    nota: string;
    estado: string;
    publicado: string;
    cambios_pestana: number;
  };

  const rows: Row[] = result.attempts.map((a) => ({
    nombre: a.student_name,
    email: a.student_email,
    iniciado: formatDateOrEmpty(a.started_at),
    finalizado: formatDateOrEmpty(a.finished_at),
    nota:
      a.score == null
        ? ""
        : `${a.score.toFixed(2).replace(".", ",")}%`,
    estado: !a.finished_at
      ? "En curso"
      : a.passed === true
        ? "Aprobado"
        : a.passed === false
          ? "Suspenso"
          : "Sin nota",
    publicado: a.results_published ? "Sí" : "No",
    cambios_pestana: a.tab_switches,
  }));

  const csv = buildCSV<Row>(rows, [
    { key: "nombre", header: "Nombre" },
    { key: "email", header: "Email" },
    { key: "iniciado", header: "Inicio" },
    { key: "finalizado", header: "Fin" },
    { key: "nota", header: "Nota" },
    { key: "estado", header: "Estado" },
    { key: "publicado", header: "Resultados publicados" },
    { key: "cambios_pestana", header: "Cambios de pestaña" },
  ]);

  const filename = `secret-ads-intentos-${todayDateStamp()}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
