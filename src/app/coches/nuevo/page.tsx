// Alta de un vehículo. Server Component que hidrata el VehicleWizard con
// las marcas recientes del garaje (chips de "marcas recientes" del wizard,
// mockup 1).

import { getRecentBrands } from "@/lib/db/cars";
import VehicleWizard from "./VehicleWizard";

export const dynamic = "force-dynamic";

export default function NewCarPage() {
  const recentBrands = getRecentBrands(4);
  return <VehicleWizard mode="create" recentBrands={recentBrands} />;
}
