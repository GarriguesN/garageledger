// Alta de un vehículo. El formulario es el mismo que el de edición
// (src/app/coches/components/CarForm.tsx); aquí solo cambia la cabecera.

import { AppHeader } from "@/components/ui";
import { AppScreenFrame, AppScreenMain } from "@/components/ui/AppLayout";
import CarForm from "../components/CarForm";

export default function NewCarPage() {
  return (
    <AppScreenFrame>
      <AppHeader title="Añadir vehículo" align="center" back="/" />
      <AppScreenMain className="pt-2">
        <CarForm mode="create" />
      </AppScreenMain>
    </AppScreenFrame>
  );
}
