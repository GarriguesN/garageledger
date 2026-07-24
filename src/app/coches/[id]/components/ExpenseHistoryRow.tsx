"use client";

// Fila independiente con acordeón + swipe para el modal "Ver todos".
// Cada fila tiene su propio expandedId local, así cada entrada se
// puede expandir/colapsar individualmente.

import { useState } from "react";
import { TIPO_COLOR } from "../lib/format";
import type { TimelineEntry } from "../lib/types";
import SwipeableRow from "./SwipeableRow";
import { ReadOnlyFields } from "./ExpenseHistory";

interface ExpenseHistoryRowProps {
  entry: TimelineEntry;
  onStartEdit: (entry: TimelineEntry) => void;
  onDelete: () => void;
}

export default function ExpenseHistoryRow({
  entry,
  onStartEdit,
  onDelete,
}: ExpenseHistoryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const color = (TIPO_COLOR as Record<string, string>)[entry.tipo] || "#6b7280";

  return (
    <SwipeableRow
      onEdit={() => onStartEdit(entry)}
      onDelete={onDelete}
    >
      <div className="card !p-0 overflow-hidden">
        <ReadOnlyFields
          entry={entry}
          color={color}
          isExpanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
          onStartEdit={() => onStartEdit(entry)}
          onDelete={() => onDelete()}
        />
      </div>
    </SwipeableRow>
  );
}
