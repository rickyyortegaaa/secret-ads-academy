import Link from "next/link";
import {
  Users,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAttemptsAction } from "@/app/actions/admin/attempts";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDashboardPage() {
  const { attempts } = await listAttemptsAction();

  const total = attempts.length;
  const finished = attempts.filter((a) => a.finished_at).length;
  const passed = attempts.filter((a) => a.passed === true).length;
  const failed = attempts.filter((a) => a.passed === false).length;
  const inProgress = total - finished;
  const uniqueStudents = new Set(attempts.map((a) => a.student_id)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Vista general de los intentos de examen.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Alumnos únicos"
          value={uniqueStudents}
          icon={Users}
          color="pink"
        />
        <StatCard
          label="Intentos totales"
          value={total}
          icon={ClipboardCheck}
          color="violet"
        />
        <StatCard
          label="Aprobados"
          value={passed}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          label="Suspensos"
          value={failed}
          icon={XCircle}
          color="rose"
        />
      </div>

      {inProgress > 0 ? (
        <p className="text-xs text-muted-foreground">
          {inProgress}{" "}
          {inProgress === 1 ? "intento en curso" : "intentos en curso"}
        </p>
      ) : null}

      {/* Attempts table */}
      <Card>
        <CardHeader>
          <CardTitle>Intentos recientes</CardTitle>
          <CardDescription>
            Últimos {Math.min(attempts.length, 500)} intentos. Click en cualquier
            fila para ver el detalle.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Nota</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Publicada
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      Aún no hay intentos. Cuando un alumno haga el examen,
                      aparecerá aquí.
                    </TableCell>
                  </TableRow>
                ) : null}
                {attempts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">{a.student_name}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">
                        {a.student_email}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      {a.student_email}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {formatDate(a.started_at)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge attempt={a} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.score == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span
                          className={`font-semibold ${
                            a.passed
                              ? "text-green-600"
                              : a.passed === false
                                ? "text-rose-600"
                                : ""
                          }`}
                        >
                          {a.score.toFixed(0)}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {a.results_published ? (
                        <Badge variant="default" className="bg-green-600">
                          Sí
                        </Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/attempts/${a.id}`}>
                          <Eye className="size-3.5" />
                          <span className="sr-only sm:not-sr-only sm:ml-1">
                            Ver
                          </span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: "pink" | "violet" | "green" | "rose";
}) {
  const colorClass = {
    pink: "bg-pink-100 text-pink-700",
    violet: "bg-violet-100 text-violet-700",
    green: "bg-green-100 text-green-700",
    rose: "bg-rose-100 text-rose-700",
  }[color];

  return (
    <Card>
      <CardContent className="flex items-center gap-3 px-4 py-4">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
        >
          <Icon className="size-5" />
        </span>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-bold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  attempt,
}: {
  attempt: { finished_at: string | null; passed: boolean | null };
}) {
  if (!attempt.finished_at) {
    return (
      <Badge variant="outline" className="border-amber-300 text-amber-700">
        En curso
      </Badge>
    );
  }
  if (attempt.passed === true) {
    return <Badge className="bg-green-600">Aprobado</Badge>;
  }
  if (attempt.passed === false) {
    return <Badge className="bg-rose-600">Suspenso</Badge>;
  }
  return <Badge variant="outline">Sin nota</Badge>;
}
