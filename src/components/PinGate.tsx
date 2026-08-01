"use client";

// Candado de la app. La lógica de sesión no cambia con el rebuild, solo la
// piel; se documenta aquí porque es la pieza de seguridad del cliente:
//
//   · La fuente de verdad es la cookie de sesión que emite el servidor, que
//     se comprueba siempre contra /api/session antes de dejar pasar.
//   · sessionStorage solo se usa como pista de UI para evitar el parpadeo en
//     recargas; NUNCA como permiso para desbloquear.
//   · Sin PIN configurado no se entra sola: se ofrece el asistente para
//     crearlo. (Antes se auto-desbloqueaba, que era un agujero.)

import { useEffect, useRef, useState } from "react";
import { AppButton, AppInput, AppSkeleton } from "@/components/ui";
import { Lock } from "@/design/tokens/icons";
import { colors, hexToRgba, strokeWidth, radius } from "@/design/tokens";

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null);
  const [pinLength, setPinLength] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [settingPin, setSettingPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1. ¿Hay una sesión válida ya emitida?
        const sess = await fetch("/api/session", { cache: "no-store" });
        if (cancelled) return;
        if (sess.ok) {
          const j = await sess.json();
          if (j.unlocked) {
            setUnlocked(true);
            setAuthChecked(true);
            sessionStorage.setItem("garageledger_unlocked", "true");
            return;
          }
        }

        // 2. Sin sesión: averiguar si hay PIN configurado.
        const cfg = await fetch("/api/pin", { cache: "no-store" });
        if (cancelled) return;
        const cfgData = await cfg.json();
        setPinConfigured(!!cfgData.configured);
        setPinLength(cfgData.pinLength || 0);
      } catch {
        if (!cancelled) setError("No se ha podido verificar la sesión");
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /** Comprueba el PIN contra el servidor. Compartido por el envío manual y
   *  por la verificación automática al completar la longitud. */
  async function verifyPin(value: string) {
    if (verifying) return;
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "verify", pin: value }),
      });
      const data = await res.json().catch(() => ({ valid: false }));
      if (data.valid) {
        setUnlocked(true);
        sessionStorage.setItem("garageledger_unlocked", "true");
      } else if (res.status === 429) {
        setError("Demasiados intentos. Espera un minuto.");
        setPin("");
      } else {
        setError("PIN incorrecto");
        setPin("");
      }
    } catch {
      setError("No se ha podido verificar el PIN");
    } finally {
      setVerifying(false);
    }
  }

  /** Al alcanzar la longitud conocida del PIN se verifica solo: con un teclado
   *  numérico en el móvil, pulsar además "Desbloquear" es un paso de más.
   *
   *  Va en el manejador del cambio y no en un efecto a propósito: escribir es
   *  el evento que dispara la comprobación, y hacerlo en un efecto encadenaba
   *  un render extra por cada tecla. */
  function handlePinChange(value: string) {
    setPin(value);
    setError("");
    if (pinConfigured && pinLength > 0 && value.length === pinLength) {
      void verifyPin(value);
    }
  }

  useEffect(() => {
    if (!unlocked && inputRef.current) inputRef.current.focus();
  }, [unlocked, pinConfigured]);

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    void verifyPin(pin);
  }

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPin.length < 4 || newPin.length > 10) {
      setError("El PIN debe tener entre 4 y 10 dígitos");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Los PIN no coinciden");
      return;
    }

    try {
      const res = await fetch("/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "set", pin: newPin }),
      });
      if (res.ok) {
        setSettingPin(false);
        setNewPin("");
        setConfirmPin("");
        setPinConfigured(true);
        setUnlocked(true);
        sessionStorage.setItem("garageledger_unlocked", "true");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se ha podido guardar el PIN");
      }
    } catch {
      setError("No se ha podido guardar el PIN");
    }
  }

  // Mientras no sepamos si hay sesión no se enseña ni la app ni el candado:
  // enseñar el candado a alguien que ya tiene sesión sería un parpadeo feo.
  if (!authChecked || (!unlocked && pinConfigured === null)) {
    return (
      <Screen>
        <AppSkeleton width="64px" height={64} rounded="pill" />
        <AppSkeleton width="140px" height={18} className="mt-4" />
      </Screen>
    );
  }

  if (unlocked) return <>{children}</>;

  if (!pinConfigured && !settingPin) {
    return (
      <Screen>
        <LockBadge />
        <h1 className="mt-4 text-heading font-bold text-text">GarageLedger</h1>
        <p className="mt-2 max-w-xs text-center text-body text-text-secondary">
          Protege los datos de tus vehículos con un PIN.
        </p>
        <AppButton className="mt-6" onClick={() => setSettingPin(true)}>
          Establecer PIN
        </AppButton>
      </Screen>
    );
  }

  if (settingPin) {
    return (
      <Screen>
        <LockBadge />
        <h1 className="mt-4 text-heading font-bold text-text">Configurar PIN</h1>

        <form onSubmit={handleSetPin} className="mt-6 w-full max-w-xs space-y-4">
          <AppInput
            label="Nuevo PIN"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            autoFocus
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            className="text-center"
            hint="Entre 4 y 10 dígitos"
          />
          <AppInput
            label="Repite el PIN"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            error={error || undefined}
          />
          <AppButton type="submit" size="lg" disabled={newPin.length < 4}>
            Guardar
          </AppButton>
          <AppButton variant="ghost" size="lg" onClick={() => setSettingPin(false)}>
            Volver
          </AppButton>
        </form>
      </Screen>
    );
  }

  return (
    <Screen>
      <LockBadge />
      <h1 className="mt-4 text-heading font-bold text-text">GarageLedger</h1>
      <p className="mt-1 text-body text-text-secondary">Introduce tu PIN</p>

      <form onSubmit={handleVerify} className="mt-6 w-full max-w-xs space-y-4">
        <AppInput
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          autoFocus
          aria-label="PIN"
          placeholder="••••"
          value={pin}
          onChange={(e) => handlePinChange(e.target.value)}
          className="text-center"
          error={error || undefined}
        />
        <AppButton type="submit" size="lg" disabled={pin.length < 4} loading={verifying}>
          Desbloquear
        </AppButton>
      </form>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="safe-x flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      {children}
    </div>
  );
}

function LockBadge() {
  return (
    <span
      aria-hidden="true"
      className="flex size-16 items-center justify-center"
      style={{
        borderRadius: radius.pill,
        backgroundColor: hexToRgba(colors.primary, 0.14),
      }}
    >
      <Lock size={28} strokeWidth={strokeWidth.default} color={colors.primary} />
    </span>
  );
}
