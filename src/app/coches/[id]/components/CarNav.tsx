"use client";

// Barra inferior contextual del vehículo + el asistente que abre su [+].
//
// Van juntos a propósito: el modal es dueño del botón que lo abre, así que
// cada pantalla del coche solo tiene que montar <CarNav/> y no repetir el
// estado del asistente.

import { useState } from "react";
import { AppBottomNavigation } from "@/components/ui";
import AddExpenseWizard from "./AddExpenseWizard";

export interface CarNavProps {
  carId: number;
  currentKm: number;
  stations: string[];
}

export default function CarNav({ carId, currentKm, stations }: CarNavProps) {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <>
      <AppBottomNavigation carId={carId} onAdd={() => setWizardOpen(true)} />
      <AddExpenseWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        carId={carId}
        currentKm={currentKm}
        stations={stations}
      />
    </>
  );
}
