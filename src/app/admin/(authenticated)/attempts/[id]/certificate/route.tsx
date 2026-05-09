import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import {
  CertificateDocument,
  type CertificateProps,
} from "@/lib/certificate-pdf";
import { slugifyForFilename } from "@/lib/csv-export";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminEmail = await getAdminSession();
  if (!adminEmail) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, student_id, finished_at, score, passed")
    .eq("id", id)
    .maybeSingle();

  if (!attempt) {
    return NextResponse.json({ error: "Intento no encontrado" }, { status: 404 });
  }
  if (!attempt.finished_at) {
    return NextResponse.json(
      { error: "El examen no ha sido enviado" },
      { status: 400 }
    );
  }
  if (!attempt.passed) {
    return NextResponse.json(
      { error: "Este alumno no aprobó el examen — no se emite certificado" },
      { status: 400 }
    );
  }

  const { data: student } = await supabase
    .from("students")
    .select("first_name, last_name")
    .eq("id", attempt.student_id)
    .maybeSingle();

  if (!student) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  const props: CertificateProps = {
    studentName: `${student.first_name} ${student.last_name}`,
    score: Number(attempt.score ?? 0),
    finishedAt: attempt.finished_at,
    attemptId: attempt.id,
  };

  const buffer = await renderToBuffer(<CertificateDocument {...props} />);
  const filename = `certificado-${slugifyForFilename(props.studentName)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
