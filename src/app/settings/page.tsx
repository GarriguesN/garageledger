'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Lock, Trash2, Shield } from 'lucide-react';

export default function SettingsPage() {
  const [pinConfigured, setPinConfigured] = useState(false);
  const [showPinForm, setShowPinForm] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  useEffect(() => {
    fetch('/api/pin')
      .then(r => r.json())
      .then(data => setPinConfigured(data.configured))
      .catch(() => {});
  }, []);

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    if (newPin.length < 4 || newPin.length > 10) {
      setPinError('El PIN debe tener entre 4 y 10 dígitos');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('Los PINs no coinciden');
      return;
    }

    try {
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', pin: newPin }),
      });
      if (res.ok) {
        setPinConfigured(true);
        setPinSuccess('PIN actualizado correctamente');
        setShowPinForm(false);
        setNewPin('');
        setConfirmPin('');
      } else {
        const data = await res.json();
        setPinError(data.error || 'Error al guardar PIN');
      }
    } catch {
      setPinError('Error al guardar PIN');
    }
  }

  async function handleRemovePin() {
    if (!confirm('¿Eliminar la protección PIN?')) return;
    try {
      await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', pin: '' }),
      });
      setPinConfigured(false);
      setPinSuccess('PIN eliminado');
    } catch {
      setPinError('Error al eliminar PIN');
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="card">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Seguridad</h2>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {pinConfigured ? <Lock size={16} className="text-[var(--accent)]" /> : <KeyRound size={16} className="text-[var(--text-muted)]" />}
            <div>
              <p className="text-sm font-medium">Protección PIN</p>
              <p className="text-xs text-[var(--text-muted)]">{pinConfigured ? 'PIN configurado' : 'Sin PIN'}</p>
            </div>
          </div>
          <button
            onClick={() => { setShowPinForm(!showPinForm); setPinError(''); setPinSuccess(''); }}
            className="btn btn-secondary text-xs"
          >
            {pinConfigured ? 'Cambiar' : 'Establecer'}
          </button>
        </div>

        {pinSuccess && <p className="text-xs text-green-600 mb-3">{pinSuccess}</p>}
        {pinError && <p className="text-xs text-red-500 mb-3">{pinError}</p>}

        {showPinForm && (
          <form onSubmit={handleSetPin} className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={newPin}
              onChange={e => setNewPin(e.target.value)}
              className="input text-center text-lg tracking-widest"
              placeholder="Nuevo PIN"
              maxLength={10}
              autoFocus
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value)}
              className="input text-center text-lg tracking-widest"
              placeholder="Confirmar PIN"
              maxLength={10}
            />
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary flex-1">Guardar PIN</button>
              {pinConfigured && (
                <button type="button" onClick={handleRemovePin} className="btn btn-danger flex-1" title="Eliminar PIN">
                  <Trash2 size={14} /> Eliminar
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* About */}
      <div className="card">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Información</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">App</span>
            <span>GarageLedger</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Versión</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Framework</span>
            <span>Next.js</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Base de datos</span>
            <span>SQLite</span>
          </div>
        </div>
      </div>

      {/* Help */}
      <div className="card">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Ayuda</h2>
        <div className="text-sm text-[var(--text-secondary)] space-y-2">
          <p>GarageLedger te ayuda a controlar los gastos de tus coches. Añade gastos con categorías para ver patrones de gasto.</p>
          <p className="text-xs text-[var(--text-muted)]">Todos los datos se almacenan localmente en SQLite en el servidor.</p>
        </div>
      </div>
    </div>
  );
}
