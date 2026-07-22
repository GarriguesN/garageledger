'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, ArrowLeft } from 'lucide-react';

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
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button className="btn p-2" onClick={() => router.push('/')}><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold">Nuevo vehículo</h1>
      </div>

      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Marca*" value={form.marca}
            onChange={e => setForm({...form, marca: e.target.value})} />
          <input className="input" placeholder="Modelo*" value={form.modelo}
            onChange={e => setForm({...form, modelo: e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Generación (ej. FK2)" value={form.generacion}
            onChange={e => setForm({...form, generacion: e.target.value})} />
          <input className="input" placeholder="Motor (ej. 1.8 i-VTEC)" value={form.motor}
            onChange={e => setForm({...form, motor: e.target.value})} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input className="input" placeholder="Año" type="number" value={form.ano}
            onChange={e => setForm({...form, ano: e.target.value})} />
          <input className="input" placeholder="Puertas" type="number" value={form.puertas}
            onChange={e => setForm({...form, puertas: e.target.value})} />
          <input className="input" placeholder="Km" type="number" value={form.km}
            onChange={e => setForm({...form, km: e.target.value})} />
        </div>
        <button className="btn btn-primary w-full" onClick={submit} disabled={saving || !form.marca || !form.modelo}>
          {saving ? 'Guardando...' : 'Guardar vehículo'}
        </button>
      </div>
    </div>
  );
}
