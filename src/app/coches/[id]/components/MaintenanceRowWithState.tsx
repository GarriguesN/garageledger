"use client";

// Wrapper para usar MaintenanceRow real (el mismo que la lista visible)
// dentro del modal "Ver todos", con su propio expandedId y swipe.

import { useState } from "react";
import type { Car, MaintenanceTask } from "../lib/types";
import SwipeableRow from "./SwipeableRow";
import { MaintenanceRow } from "./MaintenanceSchedule";

interface Props {
  task: MaintenanceTask;
  car: Car;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function MaintenanceRowWithState({
  task, car, onComplete, onEdit, onDelete,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <SwipeableRow onEdit={onEdit} onDelete={onDelete}>
      <MaintenanceRow
        task={task}
        car={car}
        onComplete={onComplete}
        isExpanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </SwipeableRow>
  );
}
