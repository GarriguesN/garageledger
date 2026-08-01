// Pantalla 6 del mockup: Actividad.

import { AppHeader } from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";
import { requireCar } from "../lib/loadCar";
import { getTimeline } from "@/lib/db/metrics";
import ActivityFeed from "./ActivityFeed";
import type { TimelineRow } from "@/lib/ui/expenses";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const car = await requireCar(params);
  const rows = getTimeline(car.id, PAGE_SIZE, 0) as TimelineRow[];

  return (
    <>
      <AppHeader title="Actividad" />
      <AppScreenMain hasBottomNav className="pt-2">
        <ActivityFeed
          carId={car.id}
          initialRows={rows}
          initialHasMore={rows.length === PAGE_SIZE}
        />
      </AppScreenMain>
    </>
  );
}
