'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Hash, Wrench, Calendar, Gauge, DoorOpen } from 'lucide-react';

export default function NuevoCoche() {
  const router = useRouter();
  const [form, setForm] = useState({
    marca: '', modelo: '', generacion: '', motor: '',
    ano: '', puertas: '5', km: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.marca || !form.modelo) return;
    setSaving(true);
    await fetch('/api/cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marca: form.marca, modelo: form.modelo,
        generacion: form.generacion, motor: form.motor,
        ano: form.ano ? parseInt(form.ano) : null,
        puertas: parseInt(form.puertas),
        km: form.km ? parseInt(form.km) : 0,
      }),
    });
    router.push('/');
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Header — sin flecha atrás en creación */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Nuevo vehículo</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Añade los datos de tu vehículo
        </p>
      </div>

      <div className="card space-y-4">
        {/* Marca + Modelo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Marca *</label>
            <div className="input-wrapper">
              <span className="input-icon"><Car size={16} /></span>
              <input className="input" placeholder="Ej. Honda" value={form.marca}
                onChange={e => setForm({...form, marca: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Modelo *</label>
            <div className="input-wrapper">
              <span className="input-icon"><Car size={16} /></span>
              <input className="input" placeholder="Ej. Civic" value={form.modelo}
                onChange={e => setForm({...form, modelo: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Generación + Motor */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Generación</label>
            <div className="input-wrapper">
              <span className="input-icon"><Hash size={16} /></span>
              <input className="input" placeholder="Ej. FK2" value={form.generacion}
                onChange={e => setForm({...form, generacion: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Motor</label>
            <div className="input-wrapper">
              <span className="input-icon"><Wrench size={16} /></span>
              <input className="input" placeholder="Ej. 1.8 i-VTEC" value={form.motor}
                onChange={e => setForm({...form, motor: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Año + Puertas + Km */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Año</label>
            <div className="input-wrapper">
              <span className="input-icon"><Calendar size={16} /></span>
              <input className="input" placeholder="2009" type="number" value={form.ano}
                onChange={e => setForm({...form, ano: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Puertas</label>
            <div className="input-wrapper">
              <span className="input-icon"><DoorOpen size={16} /></span>
              <input className="input" type="number" value={form.puertas}
                onChange={e => setForm({...form, puertas: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Km</label>
            <div className="input-wrapper">
              <span className="input-icon"><Gauge size={16} /></span>
              <input className="input" placeholder="0" type="number" value={form.km}
                onChange={e => setForm({...form, km: e.target.value})} />
            </div>
          </div>
        </div>

        <button className="btn btn-primary w-full" onClick={submit}
          disabled={saving || !form.marca || !form.modelo}>
          {saving ? 'Guardando...' : 'Guardar vehículo'}
        </button>
      </div>
    </div>
  );
}
