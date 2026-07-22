'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Car, ArrowLeft, Save, X, Gauge, Calendar, Euro, Hash, Wrench } from 'lucide-react';

export default function EditarCoche() {
  const params = useParams();
  const router = useRouter();
  const carId = parseInt(params.id as string);
  const [form, setForm] = useState({
    marca: '', modelo: '', generacion: '', motor: '', ano: '',
    puertas: '5', km_actuales: '', fecha_ultima_itv: '', fecha_vencimiento_seguro: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/car/${carId}/data`)
      .then(r => r.json())
      .then(c => {
        setForm({
          marca: c.marca, modelo: c.modelo, generacion: c.generacion || '', motor: c.motor || '',
          ano: c.ano?.toString() || '', puertas: c.puertas?.toString() || '5',
          km_actuales: c.km_actuales?.toString() || '',
          fecha_ultima_itv: c.fecha_ultima_itv || '',
          fecha_vencimiento_seguro: c.fecha_vencimiento_seguro || '',
        });
      })
      .finally(() => setLoading(false));
  }, [carId]);

  const save = async () => {
    setSaving(true);
    await fetch('/api/cars', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: carId, marca: form.marca, modelo: form.modelo,
        generacion: form.generacion, motor: form.motor,
        ano: form.ano ? parseInt(form.ano) : null,
        puertas: parseInt(form.puertas) || 5,
        km_actuales: parseInt(form.km_actuales) || 0,
        fecha_ultima_itv: form.fecha_ultima_itv || null,
        fecha_vencimiento_seguro: form.fecha_vencimiento_seguro || null,
      }),
    });
    setSaving(false);
    router.push(`/coches/${carId}`);
  };

  if (loading) return <div className="space-y-3"><div className="skeleton h-96" /></div>;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button className="btn p-2" onClick={() => router.back()}><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold">Editar vehículo</h1>
      </div>

      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Marca</label>
            <div className="input-wrapper">
              <span className="input-icon"><Car size={16} /></span>
              <input className="input" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Modelo</label>
            <div className="input-wrapper">
              <span className="input-icon"><Car size={16} /></span>
              <input className="input" value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Generación</label>
            <div className="input-wrapper">
              <span className="input-icon"><Hash size={16} /></span>
              <input className="input" value={form.generacion} onChange={e => setForm({...form, generacion: e.target.value})} placeholder="Ej. FK2" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Motor</label>
            <div className="input-wrapper">
              <span className="input-icon"><Wrench size={16} /></span>
              <input className="input" value={form.motor} onChange={e => setForm({...form, motor: e.target.value})} placeholder="Ej. 1.8 i-VTEC" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Año</label>
            <div className="input-wrapper">
              <span className="input-icon"><Calendar size={16} /></span>
              <input className="input" type="number" value={form.ano} onChange={e => setForm({...form, ano: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Puertas</label>
            <div className="input-wrapper">
              <span className="input-icon"><Car size={16} /></span>
              <input className="input" type="number" value={form.puertas} onChange={e => setForm({...form, puertas: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Km actuales</label>
            <div className="input-wrapper">
              <span className="input-icon"><Gauge size={16} /></span>
              <input className="input" type="number" value={form.km_actuales} onChange={e => setForm({...form, km_actuales: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Última ITV</label>
            <div className="input-wrapper">
              <span className="input-icon"><Calendar size={16} /></span>
              <input className="input" type="date" value={form.fecha_ultima_itv} onChange={e => setForm({...form, fecha_ultima_itv: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Vencimiento seguro</label>
            <div className="input-wrapper">
              <span className="input-icon"><Calendar size={16} /></span>
              <input className="input" type="date" value={form.fecha_vencimiento_seguro} onChange={e => setForm({...form, fecha_vencimiento_seguro: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button className="btn btn-primary flex-1" onClick={save} disabled={saving}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button className="btn btn-secondary" onClick={() => router.back()}>
            <X size={16} /> Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
