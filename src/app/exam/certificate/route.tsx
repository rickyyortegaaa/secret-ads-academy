import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { getStudentSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import {
  CertificateDocument,
  type CertificateProps,
} from "@/lib/certificate-pdf";
import { slugifyForFilename } from "@/lib/csv-export";

export const dynamic = "force-dynamic";

export async function GET() {
  const studentId = await getStudentSession();
  if (!studentId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch the student's most recent finished + published + passed attempt
  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, finished_at, score, passed, results_published")
    .eq("student_id", studentId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!attempt || !attempt.finished_at) {
    return NextResponse.json(
      { error: "El examen aún no ha sido enviado" },
      { status: 400 }
    );
  }
  if (!attempt.results_published) {
    return NextResponse.json(
      { error: "Tus resultados aún no han sido publicados" },
      { status: 403 }
    );
  }
  if (!attempt.passed) {
    return NextResponse.json(
      { error: "No has aprobado el examen" },
      { status: 403 }
    );
  }

  const { data: student } = await supabase
    .from("students")
    .select("first_name, last_name")
    .eq("id", studentId)
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
