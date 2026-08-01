"use client";

// Rejilla de accesos rápidos del resumen (mockup 2): dos filas de tres
// casillas, siempre las mismas seis y en el mismo orden.
//
// Cuatro abren el asistente de gasto ya en su categoría, saltándose el paso
// "¿qué quieres añadir?"; kilometraje lleva a la ficha del coche, que es
// donde vive el cuentakilómetros; "Más" abre el asistente por el principio,
// con el catálogo completo.

import { useRouter } from "next/navigation";
import { AppTypeTile } from "@/components/ui";
import type { AccentToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import { useCarShell } from "./CarShell";

export default function QuickActions({ carId }: { carId: number }) {
  const router = useRouter();
  const { openExpenseWizard, openDocumentWizard } = useCarShell();

  const actions: {
    icon: IconName;
    label: string;
    accent: AccentToken;
    onClick: () => void;
  }[] = [
    { icon: "fuel", label: "Combustible", accent: "green", onClick: () => openExpenseWizard("carburante") },
    { icon: "euro", label: "Gasto", accent: "primary", onClick: () => openExpenseWizard("reparacion") },
    { icon: "wrench", label: "Mantenimiento", accent: "orange", onClick: () => openExpenseWizard("mantenimiento") },
    { icon: "gauge", label: "Kilometraje", accent: "blue", onClick: () => router.push(`/coches/${carId}/editar`) },
    { icon: "document", label: "Documento", accent: "purple", onClick: openDocumentWizard },
    { icon: "more", label: "Más", accent: "cyan", onClick: () => openExpenseWizard() },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map((action) => (
        <AppTypeTile
          key={action.label}
          icon={action.icon}
          label={action.label}
          accent={action.accent}
          onClick={action.onClick}
          compact
        />
      ))}
    </div>
  );
}
