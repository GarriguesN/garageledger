export const CATEGORIES = [
  { id: "carburante", label: "Carburante", color: "#c3423f" },
  { id: "mantenimiento", label: "Mantenimiento (Taller)", color: "#d4956a" },
  { id: "mantenimiento_diy", label: "Mantenimiento (DIY)", color: "#4f9d69" },
  { id: "tuning", label: "Tuning", color: "#8b5cf6" },
  { id: "seguro", label: "Seguro", color: "#3b82f6" },
  { id: "itv", label: "ITV", color: "#211a1e" },
  { id: "impuestos", label: "Impuestos", color: "#8a8588" },
  { id: "parking", label: "Parking", color: "#b53a37" },
  { id: "peajes", label: "Peajes", color: "#3d8a55" },
  { id: "lavado", label: "Lavado", color: "#6a6568" },
  { id: "otros", label: "Otros", color: "#6b7280" },
] as const;

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<string, (typeof CATEGORIES)[number]>;

// audit:M-3 — tonos de texto compartidos por las cards del detalle de coche.
// Antes redeclarados como hex literal en CarStatsGrid, CarHeader,
// ExpenseHistory y MaintenanceSchedule; usar var(...) enlaza directamente
// con las custom properties de globals.css en vez de duplicar el hex.
export const TEXT_DARK = "var(--text-primary)";
export const TEXT_GRAY = "var(--text-muted)";

// audit:M-3 — paleta de severidad de alertas (ITV/seguro/mantenimiento).
// Antes duplicada byte a byte en AlertBanner.tsx y TopBar.tsx.
export const ALERT_SEVERITY_COLORS = {
  critical: { bg: "#fde7e6", iconBg: "#fff", fg: "var(--accent)", title: "var(--accent-hover)" },
  warning: { bg: "#fef3c7", iconBg: "#fef9c3", fg: "#f59e0b", title: "#92400e" },
} as const;
