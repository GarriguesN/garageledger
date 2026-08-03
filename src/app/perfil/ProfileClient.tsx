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
  AppCard, AppSection, AppListTile, AppDivider, AppButton, AppModal, AppToast,
} from "@/components/ui";
import { useToast } from "@/components/ui/AppToast";
import { NameWizard, PinWizard } from "@/components/wizards/ProfileWizards";
import { colors, hexToRgba } from "@/design/tokens";
import type { ReleaseNote } from "@/lib/changelog";

export interface ProfileClientProps {
  vehicleCount: number;
  displayName: string;
  appVersion: string;
  /** Novedades por versión, de la más reciente a la más antigua. */
  releases: ReleaseNote[];
}

/** "2026-08-03" → "3 de agosto de 2026" (fecha humana, no ISO). */
function humanDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export default function ProfileClient({
  vehicleCount, displayName: initialName, appVersion, releases,
}: ProfileClientProps) {
  const { toast, show, dismiss } = useToast();

  const [name, setName] = useState(initialName);
  const [nameOpen, setNameOpen] = useState(false);
  const [nameKey, setNameKey] = useState(0);

  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinKey, setPinKey] = useState(0);

  const [newsOpen, setNewsOpen] = useState(false);

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
          <AppListTile
            icon="sparkles"
            label="Novedades"
            description="Qué hay de nuevo en cada versión"
            value={releases[0]?.version ?? undefined}
            onClick={() => setNewsOpen(true)}
          />
          <AppDivider />
          <AppListTile icon="info" label="Versión" value={appVersion} chevron={false} />
        </AppCard>
      </AppSection>

      <AppModal open={newsOpen} onClose={() => setNewsOpen(false)} title="Novedades">
        {releases.length === 0 ? (
          <p className="py-8 text-center text-body text-text-secondary">
            Todavía no hay novedades que contar.
          </p>
        ) : (
          <div className="space-y-6">
            {releases.map((release, i) => (
              <section key={release.version}>
                <header className="flex items-baseline gap-2">
                  <span
                    className="rounded-pill px-2 py-0.5 text-caption font-semibold text-primary"
                    style={{ backgroundColor: hexToRgba(colors.primary, 0.14) }}
                  >
                    v{release.version}
                  </span>
                  <span className="text-caption text-text-muted">
                    {humanDate(release.date)}
                  </span>
                </header>
                <ul className="mt-3 space-y-2.5">
                  {release.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex gap-2.5 text-body leading-snug text-text-secondary"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-[9px] size-1.5 shrink-0 rounded-pill"
                        style={{ backgroundColor: hexToRgba(colors.primary, 0.7) }}
                      />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
                {/* Separador entre versiones, excepto tras la más antigua. */}
                {i < releases.length - 1 && <AppDivider className="mt-6" />}
              </section>
            ))}
          </div>
        )}
      </AppModal>

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
