"use client";

// Pantalla 10 del mockup: Perfil y ajustes.
//
// Desviación consciente respecto al mockup (docs/UI_REBUILD_PLAN.md §7): el
// mockup enseña "Alex Martínez" con avatar y correo. Esta app es de un solo
// usuario y no tiene cuentas, así que en vez de inventar un perfil se usa el
// nombre que el propio usuario ponga (guardado en `settings`) y las iniciales
// como avatar. Nada de datos ficticios.

import { useEffect, useState } from "react";
import {
  AppCard, AppSection, AppListTile, AppDivider, AppButton, AppToast,
} from "@/components/ui";
import { useToast } from "@/components/ui/AppToast";
import { NameWizard, PinWizard } from "@/components/wizards/ProfileWizards";
import { colors, hexToRgba } from "@/design/tokens";

export interface ProfileClientProps {
  vehicleCount: number;
  displayName: string;
  appVersion: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export default function ProfileClient({
  vehicleCount, displayName: initialName, appVersion,
}: ProfileClientProps) {
  const { toast, show, dismiss } = useToast();

  const [name, setName] = useState(initialName);
  const [nameOpen, setNameOpen] = useState(false);
  const [nameKey, setNameKey] = useState(0);

  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinKey, setPinKey] = useState(0);

  useEffect(() => {
    fetch("/api/pin")
      .then((r) => r.json())
      .then((d) => setPinConfigured(!!d.configured))
      .catch(() => setPinConfigured(null));
  }, []);

  return (
    <div className="space-y-6 pt-2">
      <AppCard>
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-pill text-title font-bold"
            style={{
              backgroundColor: hexToRgba(colors.primary, 0.16),
              color: colors.primary,
            }}
          >
            {initials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-title font-bold text-text">{name || "Sin nombre"}</p>
            <p className="mt-0.5 text-caption text-text-secondary">
              {vehicleCount} {vehicleCount === 1 ? "vehículo" : "vehículos"} en el garaje
            </p>
          </div>
          <AppButton
            variant="ghost"
            icon="edit"
            ariaLabel="Editar nombre"
            onClick={() => {
              setNameKey((k) => k + 1);
              setNameOpen(true);
            }}
          />
        </div>
      </AppCard>

      <AppSection title="Ajustes">
        <AppCard>
          <AppListTile icon="car" label="Mis vehículos" value={String(vehicleCount)} href="/vehiculos" />
          <AppDivider />
          <AppListTile
            icon="lock"
            label="PIN de acceso"
            value={pinConfigured === null ? "…" : pinConfigured ? "Activado" : "Sin configurar"}
            onClick={() => {
              setPinKey((k) => k + 1);
              setPinOpen(true);
            }}
          />
          <AppDivider />
          <AppListTile icon="bell" label="Notificaciones" href="/notificaciones" />
        </AppCard>
      </AppSection>

      <AppSection title="Datos">
        <AppCard>
          {/* "Copia de seguridad" del mockup: aquí es la exportación real que
              ya existía, no una sincronización en la nube que no tenemos. */}
          <AppListTile
            icon="backup"
            label="Exportar datos"
            description="Descarga un JSON con todos tus vehículos y gastos"
            href="/api/car/1/export"
          />
        </AppCard>
      </AppSection>

      <AppSection title="Acerca de">
        <AppCard>
          <AppListTile icon="info" label="Versión" value={appVersion} chevron={false} />
        </AppCard>
      </AppSection>

      <NameWizard
        key={`name-${nameKey}`}
        open={nameOpen}
        onClose={() => setNameOpen(false)}
        initialName={name}
        onSaved={(value) => {
          setName(value);
          show("Nombre actualizado");
        }}
      />

      <PinWizard
        key={`pin-${pinKey}`}
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        configured={!!pinConfigured}
        onSaved={() => {
          setPinConfigured(true);
          show("PIN actualizado");
        }}
      />

      <AppToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
