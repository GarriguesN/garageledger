// Las seis casillas del paso "Tipo de mantenimiento" (mockup 11).
//
// Son los mantenimientos que se registran una y otra vez; el resto del
// catálogo sigue estando a un toque, dentro de "Personalizado". Cada casilla
// apunta a un preset real de MAINTENANCE_PRESETS cuando existe, para que la
// tarea creada conserve el `preset_key` con el que la app enlaza gastos y
// tareas.

import type { IconName } from "@/design/tokens/icons";
import type { AccentToken } from "@/design/tokens";
import { MAINTENANCE_PRESETS } from "./presets";

export interface MaintenanceQuickType {
  id: string;
  label: string;
  icon: IconName;
  accent: AccentToken;
  /** Preset del catálogo del que hereda nombre e intervalos. */
  presetKey?: string;
  /** Valores por defecto cuando no hay preset. */
  partName?: string;
  intervalKm?: number;
  intervalMonths?: number;
  /** Pide escribir el nombre (y ofrece el catálogo completo). */
  custom?: boolean;
}

export const MAINTENANCE_QUICK_TYPES: MaintenanceQuickType[] = [
  { id: "aceite", label: "Cambio de aceite", icon: "droplet", accent: "green", presetKey: "engine_oil_filter" },
  { id: "frenos", label: "Frenos", icon: "circleDot", accent: "primary", presetKey: "brake_pads" },
  { id: "neumaticos", label: "Neumáticos", icon: "tire", accent: "purple", presetKey: "tyres" },
  { id: "bateria", label: "Batería", icon: "battery", accent: "orange", presetKey: "battery" },
  {
    id: "itv", label: "Inspección (ITV)", icon: "success", accent: "blue",
    partName: "ITV", intervalMonths: 24,
  },
  { id: "personalizado", label: "Personalizado", icon: "more", accent: "cyan", custom: true },
];

export const MAINTENANCE_QUICK_TYPE_MAP: Record<string, MaintenanceQuickType> =
  Object.fromEntries(MAINTENANCE_QUICK_TYPES.map((t) => [t.id, t]));

/** Nombre e intervalos con los que arranca el paso de detalles al elegir
 *  una casilla. El usuario puede cambiarlo todo después: el catálogo es un
 *  atajo, no una jaula. */
export function quickTypeDefaults(id: string): {
  partName: string;
  intervalKm: string;
  intervalMonths: string;
  iconKey: string | null;
  presetKey: string | null;
} {
  const type = MAINTENANCE_QUICK_TYPE_MAP[id];
  const preset = type?.presetKey
    ? MAINTENANCE_PRESETS.find((p) => p.key === type.presetKey)
    : undefined;

  return {
    partName: preset?.part_name ?? type?.partName ?? "",
    intervalKm: preset ? String(preset.interval_km) : type?.intervalKm ? String(type.intervalKm) : "",
    intervalMonths: preset
      ? String(preset.interval_months)
      : type?.intervalMonths ? String(type.intervalMonths) : "",
    iconKey: preset?.icon_key ?? null,
    presetKey: preset?.key ?? null,
  };
}
