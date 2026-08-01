// Alta de un vehículo. El asistente es el mismo que el de edición
// (src/components/wizards/VehicleWizard.tsx) y trae su propia cabecera, así
// que esta ruta solo le pasa los datos que necesita el primer paso.

import { getCars } from "@/lib/db";
import VehicleWizard from "@/components/wizards/VehicleWizard";

export const dynamic = "force-dynamic";

export default function NewCarPage() {
  // Las marcas que ya tienes en el garaje son las que más probablemente
  // repitas: van como chips de acceso directo en el paso 1.
  const recentBrands = [...new Set(getCars().map((c) => c.marca).filter(Boolean))].slice(0, 4);

  return <VehicleWizard mode="create" recentBrands={recentBrands} />;
}
