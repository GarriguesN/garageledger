"use client";

// Alta de un mantenimiento programado.
//
// Elegir un preset del catálogo rellena nombre, intervalos e icono, y a
// partir de ahí todo es editable: el catálogo es un atajo, no una jaula.
// Los "próximos" (km y fecha) se calculan solos a partir del último
// realizado más el intervalo, pero también se pueden escribir a mano — hay
// coches que llegan con un historial que no cuadra con ninguna tabla.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppCard, AppInput, AppTextarea, AppSelect, AppDatePicker, AppButton, AppToast,
} from "@/components/ui";
import { useToast } from "@/components/ui/AppToast";
import { MAINTENANCE_PRESETS } from "@/lib/maintenance/presets";

export interface ProgramMaintenanceFormProps {
  carId: number;
  currentKm: number;
}

function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export default function ProgramMaintenanceForm({ carId, currentKm }: ProgramMaintenanceFormProps) {
  const router = useRouter();
  const { toast, show, dismiss } = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const [presetKey, setPresetKey] = useState("");
  const [partName, setPartName] = useState("");
  const [brand, setBrand] = useState("");
  const [intervalKm, setIntervalKm] = useState("");
  const [intervalMonths, setIntervalMonths] = useState("");
  const [lastKm, setLastKm] = useState(String(currentKm || ""));
  const [lastDate, setLastDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(key: string) {
    setPresetKey(key);
    const preset = MAINTENANCE_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    setPartName(preset.part_name);
    setIntervalKm(String(preset.interval_km));
    setIntervalMonths(String(preset.interval_months));
    setNotes(preset.description);
  }

  // Vista previa de cuándo tocará la próxima vez.
  const km = Number.parseInt(lastKm, 10);
  const ikm = Number.parseInt(intervalKm, 10);
  const imonths = Number.parseInt(intervalMonths, 10);
  const nextKm = Number.isFinite(km) && Number.isFinite(ikm) ? km + ikm : null;
  const nextDate = Number.isFinite(imonths) && lastDate ? addMonths(lastDate, imonths) : null;

  async function handleSave() {
    if (!partName.trim()) {
      setError("Ponle un nombre al mantenimiento");
      return;
    }
    if (nextKm == null && nextDate == null) {
      setError("Indica al menos un intervalo, en kilómetros o en meses");
      return;
    }

    setSaving(true);
    try {
      const preset = MAINTENANCE_PRESETS.find((p) => p.key === presetKey);
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          part_name: partName.trim(),
          part_brand: brand.trim(),
          current_km: Number.isFinite(km) ? km : null,
          current_date: lastDate || null,
          next_km: nextKm,
          next_date: nextDate,
          interval_km: Number.isFinite(ikm) ? ikm : null,
          interval_months: Number.isFinite(imonths) ? imonths : null,
          notes: notes.trim(),
          preset_key: presetKey || null,
          icon_key: preset?.icon_key ?? null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo programar el mantenimiento");
      }
      show("Mantenimiento programado");
      router.replace(`/coches/${carId}/mantenimiento`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo programar el mantenimiento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <AppCard>
        <div className="space-y-4">
          <AppSelect
            label="Tipo de mantenimiento"
            placeholder="Elige uno del catálogo (opcional)"
            value={presetKey}
            onChange={(e) => applyPreset(e.target.value)}
            options={MAINTENANCE_PRESETS.map((p) => ({
              value: p.key,
              label: p.part_name,
              group: p.category,
            }))}
          />
          <AppInput
            label="Nombre"
            placeholder="Cambio de aceite"
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
          />
          <AppInput
            label="Marca o referencia (opcional)"
            placeholder="NGK, Bosch…"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </div>
      </AppCard>

      <AppCard>
        <p className="mb-3 text-caption text-text-secondary">Cada cuánto se repite</p>
        <div className="grid grid-cols-2 gap-3">
          <AppInput
            label="Kilómetros"
            inputMode="numeric"
            placeholder="10000"
            suffix="km"
            value={intervalKm}
            onChange={(e) => setIntervalKm(e.target.value)}
          />
          <AppInput
            label="Meses"
            inputMode="numeric"
            placeholder="12"
            value={intervalMonths}
            onChange={(e) => setIntervalMonths(e.target.value)}
          />
        </div>
      </AppCard>

      <AppCard>
        <p className="mb-3 text-caption text-text-secondary">Última vez que se hizo</p>
        <div className="space-y-4">
          <AppDatePicker
            label="Fecha"
            value={lastDate}
            onChange={(e) => setLastDate(e.target.value)}
          />
          <AppInput
            label="Kilómetros"
            inputMode="numeric"
            suffix="km"
            value={lastKm}
            onChange={(e) => setLastKm(e.target.value)}
          />
        </div>

        {(nextKm != null || nextDate != null) && (
          <p className="mt-3 text-caption text-text-muted">
            Próximo:{" "}
            {[
              nextKm != null ? `${nextKm.toLocaleString("es-ES")} km` : null,
              nextDate,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </AppCard>

      <AppCard>
        <AppTextarea
          label="Notas (opcional)"
          placeholder="Cualquier detalle que quieras recordar"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </AppCard>

      {error && (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}

      <AppButton size="lg" onClick={handleSave} loading={saving} disabled={saving}>
        {saving ? "Guardando…" : "Programar mantenimiento"}
      </AppButton>

      <AppToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
