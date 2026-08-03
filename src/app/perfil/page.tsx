// Pantalla 10 del mockup: Perfil y ajustes. Sustituye a /settings.

import { cookies } from "next/headers";
import GarageShell from "../components/GarageShell";
import ProfileClient from "./ProfileClient";
import { getCars } from "@/lib/db/cars";
import { getSetting } from "@/lib/db/core";
import { readSessionFromValue } from "@/lib/auth";
import { RELEASES } from "@/lib/changelog";
// Fuente de verdad de la versión: package.json (AGENTS.md §6.2). Importarla
// aquí evita que el "Acerca de" se quede desfasado como ocurría con la
// cadena hardcodeada "1.0.0".
import pkg from "../../../package.json";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const session = readSessionFromValue(cookieStore.get("gl_sess")?.value);

  const vehicleCount = session ? getCars().length : 0;
  const displayName = (session && getSetting("display_name")) || "Mi garaje";

  return (
    <GarageShell title="Perfil">
      <ProfileClient
        vehicleCount={vehicleCount}
        displayName={displayName}
        appVersion={pkg.version}
        releases={RELEASES}
      />
    </GarageShell>
  );
}
