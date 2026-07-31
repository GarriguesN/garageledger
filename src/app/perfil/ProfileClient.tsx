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
  AppCard, AppSection, AppListTile, AppDivider, AppModal, AppInput, AppButton, AppToast,
} from "@/components/ui";
import { useToast } from "@/components/ui/AppToast";
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
  const [draftName, setDraftName] = useState(initialName);

  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    fetch("/api/pin")
      .then((r) => r.json())
      .then((d) => setPinConfigured(!!d.configured))
      .catch(() => setPinConfigured(null));
  }, []);

  async function saveName() {
    const value = draftName.trim();
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "display_name", value }),
      });
      if (!res.ok) throw new Error();
      setName(value);
      setNameOpen(false);
      show("Nombre actualizado");
    } catch {
      show("No se pudo guardar el nombre", "error");
    }
  }

  async function savePin() {
    setPinError("");
    if (newPin.length < 4 || newPin.length > 10) {
      setPinError("El PIN debe tener entre 4 y 10 dígitos");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("Los PIN no coinciden");
      return;
    }
    try {
      const res = await fetch("/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", pin: newPin }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error);
      }
      setPinConfigured(true);
      setPinOpen(false);
      setNewPin("");
      setConfirmPin("");
      show("PIN actualizado");
    } catch (e) {
      setPinError(e instanceof Error && e.message ? e.message : "No se pudo guardar el PIN");
    }
  }

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
              setDraftName(name);
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
            onClick={() => setPinOpen(true)}
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

      <AppModal
        open={nameOpen}
        onClose={() => setNameOpen(false)}
        title="Tu nombre"
        footer={
          <AppButton size="lg" onClick={saveName}>
            Guardar
          </AppButton>
        }
      >
        <AppInput
          label="Nombre"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="Cómo quieres que te llamemos"
          maxLength={40}
        />
      </AppModal>

      <AppModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title={pinConfigured ? "Cambiar PIN" : "Establecer PIN"}
        footer={
          <AppButton size="lg" onClick={savePin}>
            Guardar PIN
          </AppButton>
        }
      >
        <div className="space-y-4">
          <AppInput
            label="Nuevo PIN"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            hint="Entre 4 y 10 dígitos"
          />
          <AppInput
            label="Repite el PIN"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            error={pinError || undefined}
          />
        </div>
      </AppModal>

      <AppToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
