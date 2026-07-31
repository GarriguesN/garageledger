// La pantalla de ajustes pasó a ser /perfil (pantalla 10 del mockup). Se
// mantiene la ruta antigua redirigiendo: puede estar guardada como marcador
// o en la pantalla de inicio del móvil de alguien.

import { redirect } from "next/navigation";

export default function SettingsPage() {
  redirect("/perfil");
}
