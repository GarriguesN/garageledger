// Pantalla 5 del mockup: Gastos.

import { AppHeader } from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";
import { requireCar } from "../lib/loadCar";
import {
  getMonthlySpend, getMonthlyHistory, getTimeline, getAverageMonthlySpend,
} from "@/lib/db/metrics";
import { getExpenseThumbnails } from "@/lib/db/attachments";
import { spendByCategory, type TimelineRow } from "@/lib/ui/expenses";
import { percentChange } from "@/lib/format";
import ExpensesClient from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const car = await requireCar(params);

  const monthly = getMonthlySpend(car.id);
  const history = getMonthlyHistory(car.id, 12);
  const rows = getTimeline(car.id, 100, 0) as TimelineRow[];

  // El donut reparte el gasto DEL MES en curso, que es lo que encabeza la
  // tarjeta; mezclarlo con el histórico haría que los porcentajes no
  // cuadraran con la cifra grande de arriba.
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthRows = rows.filter((r) => r.date.slice(0, 7) === currentMonth);

  return (
    <>
      <AppHeader
        title="Gastos"
        actions={[
          { icon: "trendUp", label: "Ver insights", href: `/coches/${car.id}/insights` },
          { icon: "car", label: "Cambiar de vehículo", href: "/vehiculos" },
        ]}
      />
      <AppScreenMain hasBottomNav className="pt-2">
        <ExpensesClient
          carId={car.id}
          monthly={monthly}
          delta={percentChange(monthly.current, monthly.previous)}
          averageMonthly={getAverageMonthlySpend(car.id)}
          byCategory={spendByCategory(monthRows)}
          history={history}
          rows={rows}
          thumbnails={getExpenseThumbnails(car.id)}
        />
      </AppScreenMain>
    </>
  );
}
