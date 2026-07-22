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
