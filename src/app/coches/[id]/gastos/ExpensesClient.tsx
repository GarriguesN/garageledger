"use client";

// Pantalla 5: Gastos, con dos pestañas.
//
//   Resumen    lo gastado este mes, el reparto por categoría (donut) y la
//              evolución de los últimos meses.
//   Historial  la lista completa, de lo más reciente a lo más antiguo.
//
// Los gráficos se cargan de forma diferida (AppChart) para que chart.js no
// entre en el bundle de las pantallas que no lo necesitan.

import { useState } from "react";
import {
  AppTabs, AppCard, AppSection, AppChart, DonutChart, LineChart,
  AppExpenseCard, AppEmptyState, AppSelect,
} from "@/components/ui";
import { colors, accents } from "@/design/tokens";
import { formatCurrency, formatMonthLabel, formatDate } from "@/lib/format";
import { toExpenseView, type TimelineRow } from "@/lib/ui/expenses";

export interface ExpensesClientProps {
  monthly: { current: number; previous: number };
  delta: number | null;
  byCategory: { id: string; label: string; value: number; accent: string; share: number }[];
  history: { month: string; total: number }[];
  rows: TimelineRow[];
}

const TABS = [
  { id: "summary", label: "Resumen" },
  { id: "history", label: "Historial" },
];

export default function ExpensesClient({
  monthly, delta, byCategory, history, rows,
}: ExpensesClientProps) {
  const [active, setActive] = useState("summary");
  const [months, setMonths] = useState("6");

  const visibleHistory = history.slice(-Number(months));

  return (
    <>
      <AppTabs tabs={TABS} active={active} onChange={setActive} layoutGroup="expenses" />

      {active === "summary" ? (
        <div className="mt-4 space-y-4">
          <AppCard>
            <p className="text-caption text-text-secondary">Este mes</p>
            <p className="tabular mt-1 text-display font-bold text-text">
              {formatCurrency(monthly.current)}
            </p>
            <p className="mt-0.5 text-caption text-text-muted">Total gastado</p>
            {delta != null && (
              <p
                className="mt-2 text-caption"
                style={{ color: delta > 0 ? colors.danger : colors.green }}
              >
                {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}% vs mes anterior
              </p>
            )}

            {byCategory.length > 0 && (
              <div className="mt-4 flex items-center gap-4">
                {/* El ancho se fija en este contenedor y no pasándole una
                    clase a AppChart: AppChart ya lleva w-full, y dos
                    utilidades de ancho compitiendo se resuelven por el orden
                    de la hoja de estilos, no por el del atributo. */}
                <div className="w-28 shrink-0">
                  <AppChart height={112}>
                    <DonutChart
                      data={byCategory.map((c) => ({
                        label: c.label,
                        value: c.value,
                        accent: c.accent as keyof typeof accents,
                      }))}
                      formatValue={formatCurrency}
                    />
                  </AppChart>
                </div>

                <ul className="min-w-0 flex-1 space-y-1.5">
                  {byCategory.slice(0, 5).map((c) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: accents[c.accent as keyof typeof accents] }}
                      />
                      <span className="min-w-0 flex-1 truncate text-caption text-text-secondary">
                        {c.label}
                      </span>
                      <span className="tabular shrink-0 text-caption text-text-muted">
                        {c.share}%
                      </span>
                      <span className="tabular shrink-0 text-right text-caption font-semibold text-text">
                        {formatCurrency(c.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AppCard>

          <AppSection
            title="Evolución de gastos"
            action={
              <AppSelect
                aria-label="Rango de meses"
                className="w-28"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                options={[
                  { value: "3", label: "3 meses" },
                  { value: "6", label: "6 meses" },
                  { value: "12", label: "12 meses" },
                ]}
              />
            }
          >
            <AppCard>
              {visibleHistory.length === 0 ? (
                <p className="py-8 text-center text-body text-text-secondary">
                  Aún no hay suficientes datos para dibujar la evolución.
                </p>
              ) : (
                <AppChart height={160}>
                  <LineChart
                    labels={visibleHistory.map((h) => formatMonthLabel(h.month))}
                    values={visibleHistory.map((h) => Math.round(h.total))}
                    accent="primary"
                    formatValue={(v) => `${v} €`}
                  />
                </AppChart>
              )}
            </AppCard>
          </AppSection>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.length === 0 ? (
            <AppEmptyState
              icon="euro"
              title="Sin gastos registrados"
              description="Usa el botón [+] para añadir el primero."
            />
          ) : (
            rows.map((row) => {
              const view = toExpenseView(row);
              return (
                <AppExpenseCard
                  key={view.id}
                  icon={view.icon}
                  accent={view.accent}
                  title={view.title}
                  description={view.description}
                  amount={view.amount}
                  meta={formatDate(view.date)}
                />
              );
            })
          )}
        </div>
      )}
    </>
  );
}
