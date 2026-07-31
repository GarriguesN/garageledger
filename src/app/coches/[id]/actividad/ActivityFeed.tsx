"use client";

// Pantalla 6: actividad del vehículo en orden cronológico inverso, agrupada
// por día.
//
// Carga incremental en lugar de traerlo todo: la primera tanda llega desde el
// servidor y las siguientes se piden al llegar al final de la lista. Con el
// `content-visibility` de AppTimeline, el navegador se salta el pintado de lo
// que queda fuera de pantalla, así que la lista sigue yendo fina aunque
// acumule años de repostajes.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppTimeline, AppExpenseCard, AppEmptyState, AppRowSkeleton, AppSelect,
} from "@/components/ui";
import { EXPENSE_CATEGORIES } from "@/lib/expenses/categories";
import { toExpenseView, groupByDay, type TimelineRow } from "@/lib/ui/expenses";

const PAGE_SIZE = 40;

export interface ActivityFeedProps {
  carId: number;
  initialRows: TimelineRow[];
  /** Si la primera tanda ya trae menos de una página, no hay más que pedir. */
  initialHasMore: boolean;
}

export default function ActivityFeed({ carId, initialRows, initialHasMore }: ActivityFeedProps) {
  const [rows, setRows] = useState(initialRows);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/car/${carId}/timeline?limit=${PAGE_SIZE}&offset=${rows.length}`,
      );
      if (!res.ok) throw new Error();
      const next: TimelineRow[] = await res.json();
      setRows((r) => [...r, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } catch {
      // Sin más datos que mostrar, se deja de intentar: reintentar en bucle
      // contra un endpoint que falla solo gasta batería.
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [carId, rows.length, loading, hasMore]);

  // El centinela dispara la carga cuando entra en pantalla.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, hasMore]);

  const visible = filter ? rows.filter((r) => (r.tipo_id ?? "") === filter) : rows;
  const groups = groupByDay(visible.map(toExpenseView));

  if (rows.length === 0) {
    return (
      <AppEmptyState
        icon="activity"
        title="Sin actividad todavía"
        description="Cuando registres un repostaje, un mantenimiento o cualquier gasto, aparecerá aquí."
      />
    );
  }

  return (
    <div className="space-y-4">
      <AppSelect
        aria-label="Filtrar por categoría"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        options={[
          { value: "", label: "Todas las categorías" },
          ...EXPENSE_CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
        ]}
      />

      {groups.length === 0 ? (
        <AppEmptyState
          icon="filter"
          title="Nada en esta categoría"
          description="Prueba con otra categoría o quita el filtro."
        />
      ) : (
        <AppTimeline
          groups={groups.map((g) => ({
            label: g.label,
            entries: g.entries.map((e) => ({
              id: e.id,
              accent: e.accent,
              content: (
                <AppExpenseCard
                  icon={e.icon}
                  accent={e.accent}
                  title={e.title}
                  description={e.description}
                  amount={e.amount}
                  meta={e.meta}
                />
              ),
            })),
          }))}
          footer={
            <>
              {loading && <AppRowSkeleton count={2} />}
              {/* Sin filtro activo: si el usuario está filtrando, cargar más
                  páginas no añade nada visible y confunde. */}
              {hasMore && !filter && <div ref={sentinel} aria-hidden="true" className="h-4" />}
            </>
          }
        />
      )}
    </div>
  );
}
