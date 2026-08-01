// Detalle de un gasto: todo lo que se guardó de él, el ticket si lo tiene, y
// las dos acciones que caben sobre un apunte ya hecho (corregirlo o
// borrarlo).
//
// Se llega desde el historial de gastos. Los datos se leen en el servidor,
// así que la pantalla llega pintada; solo son cliente los botones, que
// abren el asistente y piden confirmación.

import { notFound } from "next/navigation";
import { AppHeader, AppCard, AppIconChip, AppSection } from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";
import { requireCar } from "../../lib/loadCar";
import { getExpense } from "@/lib/db/expenses";
import { getAttachments } from "@/lib/db/attachments";
import { resolveCategory } from "@/lib/expenses/categories";
import { formatCurrencyPrecise, formatDate, formatKm, formatLiters } from "@/lib/format";
import ExpenseActions from "./ExpenseActions";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string; gastoId: string }>;
}) {
  const car = await requireCar(params as Promise<{ id: string }>);
  const { gastoId } = await params;

  const expense = getExpense(Number.parseInt(gastoId, 10));
  // Se comprueba también el coche: el id de un gasto de OTRO vehículo no debe
  // poder verse cambiando la URL.
  if (!expense || expense.car_id !== car.id) notFound();

  const category = resolveCategory(expense.tipo_id, expense.tipo);
  const attachments = getAttachments(car.id, expense.id);
  const receipt = attachments[0] ?? null;

  const pricePerLiter =
    expense.litros && expense.litros > 0 ? expense.importe / expense.litros : null;

  const rows: { label: string; value: string }[] = [
    { label: "Categoría", value: category.label },
    { label: "Fecha", value: formatDate(expense.date) },
    { label: "Kilometraje", value: expense.km != null ? formatKm(expense.km) : "—" },
    { label: "Litros", value: expense.litros != null ? formatLiters(expense.litros) : "—" },
    {
      label: "Precio por litro",
      value: pricePerLiter != null ? `${formatCurrencyPrecise(pricePerLiter, 3)}/L` : "—",
    },
    { label: "Método de pago", value: expense.metodo_pago || "—" },
    { label: "Referencia", value: expense.referencia || "—" },
  ].filter((row) => row.value !== "—");

  return (
    <>
      <AppHeader title="Gasto" align="center" back={`/coches/${car.id}/gastos`} />

      <AppScreenMain hasBottomNav className="space-y-4 pt-2">
        <AppCard>
          <div className="flex items-center gap-3">
            <AppIconChip icon={category.icon} accent={category.accent} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-semibold text-text">{category.label}</p>
              <p className="mt-0.5 text-caption text-text-secondary">{formatDate(expense.date)}</p>
            </div>
          </div>
          <p className="tabular mt-4 text-display font-bold text-text">
            {formatCurrencyPrecise(expense.importe)}
          </p>
          {expense.descripcion && (
            <p className="mt-1 text-body text-text-secondary">{expense.descripcion}</p>
          )}
        </AppCard>

        <AppSection title="Detalles">
          <AppCard>
            <dl className="space-y-3">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4">
                  <dt className="text-caption text-text-secondary">{row.label}</dt>
                  <dd className="tabular min-w-0 text-right text-body text-text">{row.value}</dd>
                </div>
              ))}
            </dl>
          </AppCard>
        </AppSection>

        {receipt && (
          <AppSection title="Comprobante">
            <AppCard>
              {receipt.mime_type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/attachments/${receipt.id}`}
                  alt={receipt.original_name}
                  className="w-full rounded-image border border-border"
                />
              ) : (
                <a
                  href={`/api/attachments/${receipt.id}`}
                  className="flex min-h-12 items-center text-body font-semibold text-primary"
                >
                  Abrir {receipt.original_name}
                </a>
              )}
            </AppCard>
          </AppSection>
        )}

        <ExpenseActions
          carId={car.id}
          currentKm={car.km_actuales}
          expense={{
            id: expense.id,
            tipoId: category.id,
            importe: expense.importe,
            litros: expense.litros,
            km: expense.km,
            referencia: expense.referencia,
            descripcion: expense.descripcion,
            metodoPago: expense.metodo_pago,
            date: expense.date.slice(0, 10),
          }}
        />
      </AppScreenMain>
    </>
  );
}
