"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  updateSettingsAction,
  type Settings,
} from "@/app/actions/admin/settings";

type Props = {
  initial: Settings;
};

export function SettingsForm({ initial }: Props) {
  const [passThreshold, setPassThreshold] = useState<number>(
    initial.pass_threshold
  );
  const [publishGlobally, setPublishGlobally] = useState(
    initial.publish_results_globally
  );
  const [allowRetries, setAllowRetries] = useState(initial.allow_retries);
  const [saving, startSaving] = useTransition();

  const dirty =
    passThreshold !== initial.pass_threshold ||
    publishGlobally !== initial.publish_results_globally ||
    allowRetries !== initial.allow_retries;

  const handleSave = () => {
    startSaving(async () => {
      const result = await updateSettingsAction({
        pass_threshold: passThreshold,
        publish_results_globally: publishGlobally,
        allow_retries: allowRetries,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Settings actualizados");
    });
  };

  return (
    <div className="space-y-6">
      <SettingRow
        title="Umbral de aprobado"
        description="Nota mínima sobre 100 para considerar el examen aprobado."
      >
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <Input
            type="number"
            min={0}
            max={100}
            value={passThreshold}
            onChange={(e) => setPassThreshold(Number(e.target.value) || 0)}
            className="w-24 text-right tabular-nums"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </SettingRow>

      <SettingRow
        title="Publicar resultados a todos los alumnos"
        description="Si está activo, los alumnos ven su nota y feedback automáticamente al terminar el examen. Si está desactivo, ven 'pendiente de revisión' hasta que tú publiques manualmente desde el detalle del intento."
      >
        <Switch
          checked={publishGlobally}
          onCheckedChange={setPublishGlobally}
        />
      </SettingRow>

      <SettingRow
        title="Permitir reintentos"
        description="Si está activo, el alumno puede repetir el examen tras finalizarlo (se borra su intento anterior). Recomendado: NO."
      >
        <Switch
          checked={allowRetries}
          onCheckedChange={setAllowRetries}
        />
      </SettingRow>

      <div className="flex justify-end border-t pt-4">
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="brand-gradient text-white"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b pb-6 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <Label className="text-base font-semibold">{title}</Label>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
