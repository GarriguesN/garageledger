"use client";

// Marco compartido por todas las pantallas del vehículo: barra inferior
// contextual, asistente de añadir gasto y el contexto que permite abrirlo
// desde cualquier punto de dentro.
//
// Vive en el layout de /coches/[id] para que la barra no se desmonte al
// cambiar de pestaña — de otro modo parpadearía en cada navegación.

import { createContext, useContext, useState } from "react";
import { AppBottomNavigation } from "@/components/ui";
import { AppScreenFrame } from "@/components/ui/AppLayout";
import AddExpenseWizard from "./AddExpenseWizard";

interface CarShellContextValue {
  /** Abre el asistente de gasto. Con `categoryId` salta directo al
   *  formulario de esa categoría (accesos rápidos del resumen). */
  openExpenseWizard: (categoryId?: string) => void;
}

const CarShellContext = createContext<CarShellContextValue | null>(null);

/** Disponible en cualquier componente cliente bajo /coches/[id]. */
export function useCarShell(): CarShellContextValue {
  const ctx = useContext(CarShellContext);
  if (!ctx) {
    throw new Error("useCarShell debe usarse dentro de <CarShell>");
  }
  return ctx;
}

export interface CarShellProps {
  carId: number;
  currentKm: number;
  stations: string[];
  children: React.ReactNode;
}

export default function CarShell({ carId, currentKm, stations, children }: CarShellProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [presetCategory, setPresetCategory] = useState<string | undefined>();
  // Cambia en cada apertura para remontar el asistente: así empieza limpio
  // (paso y campos) sin necesidad de un efecto que resetee su estado.
  const [wizardKey, setWizardKey] = useState(0);

  function openExpenseWizard(categoryId?: string) {
    setPresetCategory(categoryId);
    setWizardKey((k) => k + 1);
    setWizardOpen(true);
  }

  return (
    <CarShellContext.Provider value={{ openExpenseWizard }}>
      <AppScreenFrame>
        {children}
        <AppBottomNavigation carId={carId} onAdd={() => openExpenseWizard()} />
      </AppScreenFrame>

      <AddExpenseWizard
        key={wizardKey}
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        carId={carId}
        currentKm={currentKm}
        stations={stations}
        initialCategoryId={presetCategory}
      />
    </CarShellContext.Provider>
  );
}
