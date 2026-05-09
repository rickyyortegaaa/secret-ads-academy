import { SettingsForm } from "@/components/admin/settings-form";
import { getSettingsAction } from "@/app/actions/admin/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const result = await getSettingsAction();

  if (!result.ok) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
        <p className="text-destructive">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Configuración global del examen.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <SettingsForm initial={result.settings} />
      </div>
    </div>
  );
}
