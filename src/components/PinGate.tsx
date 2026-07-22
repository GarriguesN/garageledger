'use client';

import { useEffect, useState, useRef } from 'react';
import { Lock, KeyRound } from 'lucide-react';

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null);
  const [pinLength, setPinLength] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [settingPin, setSettingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem('garageledger_unlocked')) {
      setUnlocked(true);
      return;
    }
    fetch('/api/pin')
      .then(r => r.json())
      .then(data => {
        setPinConfigured(data.configured);
        setPinLength(data.pinLength || 0);
        if (!data.configured) {
          setUnlocked(true);
          sessionStorage.setItem('garageledger_unlocked', 'true');
        }
      })
      .catch(() => {
        setPinConfigured(false);
        setUnlocked(true);
      });
  }, []);

  // Auto-verify when pin length matches
  useEffect(() => {
    if (pinConfigured && pin.length === pinLength && pinLength > 0 && !verifying) {
      setVerifying(true);
      fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', pin }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.valid) {
            setUnlocked(true);
            sessionStorage.setItem('garageledger_unlocked', 'true');
          } else {
            setError('PIN incorrecto');
            setPin('');
            setTimeout(() => setError(''), 800);
          }
        })
        .catch(() => setError('Error al verificar PIN'))
        .finally(() => setVerifying(false));
    }
  }, [pin, pinConfigured, pinLength]);

  useEffect(() => {
    if (!unlocked && inputRef.current) inputRef.current.focus();
  }, [unlocked, pinConfigured]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', pin }),
      });
      const data = await res.json();
      if (data.valid) {
        setUnlocked(true);
        sessionStorage.setItem('garageledger_unlocked', 'true');
      } else {
        setError('PIN incorrecto');
        setPin('');
      }
    } catch {
      setError('Error al verificar PIN');
    }
  }

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPin.length < 4 || newPin.length > 10) {
      setError('El PIN debe tener entre 4 y 10 dígitos');
      return;
    }
    if (newPin !== confirmPin) {
      setError('Los PINs no coinciden');
      return;
    }

    try {
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', pin: newPin }),
      });
      if (res.ok) {
        setSettingPin(false);
        setNewPin('');
        setConfirmPin('');
        setPinConfigured(true);
        setUnlocked(true);
        sessionStorage.setItem('garageledger_unlocked', 'true');
      } else {
        const data = await res.json();
        setError(data.error || 'Error al guardar PIN');
      }
    } catch {
      setError('Error al guardar PIN');
    }
  }

  if (unlocked) return <>{children}</>;

  if (pinConfigured === null) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--bg-primary)]">
        <Lock size={32} className="text-[var(--text-muted)] animate-pulse" />
      </div>
    );
  }

  if (!pinConfigured && !settingPin) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[var(--bg-primary)]">
        <KeyRound size={40} className="text-[var(--accent)] mb-4" />
        <h1 className="text-lg font-bold mb-2">GarageLedger</h1>
        <p className="text-sm text-[var(--text-secondary)] text-center mb-6">
          Protege tus gastos con un PIN
        </p>
        <button
          onClick={() => setSettingPin(true)}
          className="btn btn-primary"
        >
          Establecer PIN
        </button>
        <button
          onClick={() => {
            setUnlocked(true);
            sessionStorage.setItem('garageledger_unlocked', 'true');
          }}
          className="text-sm text-[var(--text-muted)] mt-4 hover:text-[var(--accent)]"
        >
          Saltar — no proteger
        </button>
      </div>
    );
  }

  if (settingPin) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[var(--bg-primary)]">
        <Lock size={40} className="text-[var(--accent)] mb-4" />
        <h1 className="text-lg font-bold mb-4">Configurar PIN</h1>

        <form onSubmit={handleSetPin} className="w-full max-w-xs space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Nuevo PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={newPin}
              onChange={e => setNewPin(e.target.value)}
              className="input text-center tracking-widest"
              placeholder="• • • •"
              maxLength={10}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Confirmar PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value)}
              className="input text-center tracking-widest"
              placeholder="• • • •"
              maxLength={10}
            />
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={newPin.length < 4} className="btn btn-primary flex-1">
              Guardar
            </button>
            <button type="button" onClick={() => setSettingPin(false)} className="btn btn-secondary">
              Volver
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[var(--bg-primary)]">
      <Lock size={40} className="text-[var(--accent)] mb-4" />
      <h1 className="text-lg font-bold mb-1">GarageLedger</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">Introduce tu PIN</p>

      <form onSubmit={handleVerify} className="w-full max-w-xs">
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pin}
          onChange={e => setPin(e.target.value)}
          className="input text-center text-2xl tracking-widest mb-4"
          placeholder="• • • •"
          maxLength={10}
          autoFocus
        />
        {error && (
          <p className="text-sm text-red-500 text-center mb-4">{error}</p>
        )}
        <button
          type="submit"
          disabled={pin.length < 4}
          className="btn btn-primary w-full"
        >
          Desbloquear
        </button>
      </form>

      <button
        onClick={() => window.location.href = '/settings'}
        className="text-xs text-[var(--text-muted)] mt-6 hover:text-[var(--accent)]"
      >
        Gestionar PIN en Ajustes
      </button>
    </div>
  );
}
