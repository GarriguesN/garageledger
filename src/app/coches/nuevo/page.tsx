'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Hash, Wrench, Calendar, Gauge, DoorOpen, Fuel } from "lucide-react";

const COMBUSTIBLES = ["Gasolina", "Diésel", "Híbrido", "Eléctrico", "GLP"];

export default function NuevoCoche() {
  const router = useRouter();
  const [form, setForm] = useState({
    marca: '', modelo: '', generacion: '', motor: '',
    ano: '', puertas: '5', km: '',
    matricula: '', bastidor: '', combustible: 'Gasolina',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onPhoto = (file: File | null) => {
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const submit = async () => {
    if (!form.marca || !form.modelo) return;
    setSaving(true);
    try {
      // 1. Create car first (foto_attachment_id left null).
      const carRes = await fetch('/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marca: form.marca, modelo: form.modelo,
          generacion: form.generacion, motor: form.motor,
          ano: form.ano ? parseInt(form.ano) : null,
          puertas: parseInt(form.puertas),
          km: form.km ? parseInt(form.km) : 0,
          matricula: form.matricula,
          bastidor: form.bastidor,
          combustible: form.combustible,
        }),
      });
      if (!carRes.ok) return;
      const car = await carRes.json();

      // 2. Upload photo (if any) bound to the now-existing car_id.
      let foto_attachment_id: number | null = null;
      if (photo) {
        setUploading(true);
        try {
          const fd = new FormData();
          fd.append("car_id", String(car.id));
          fd.append("file", photo);
          const upRes = await fetch("/api/attachments", { method: "POST", body: fd });
          if (upRes.ok) {
            const j = await upRes.json();
            foto_attachment_id = j.id as number;
          }
        } finally {
          setUploading(false);
        }
      }

      // 3. Patch the car with the photo id.
      if (foto_attachment_id != null) {
        await fetch('/api/cars', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: car.id, foto_attachment_id }),
        });
      }
      router.push('/');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
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

        {/* Matrícula + Bastidor */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Matrícula</label>
            <div className="input-wrapper">
              <span className="input-icon"><Hash size={16} /></span>
              <input className="input" placeholder="Ej. 1234-ABC" value={form.matricula}
                onChange={e => setForm({...form, matricula: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Bastidor (VIN)</label>
            <div className="input-wrapper">
              <span className="input-icon"><Hash size={16} /></span>
              <input className="input" placeholder="Ej. JHMFB4600CS123456" value={form.bastidor}
                onChange={e => setForm({...form, bastidor: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Combustible */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">Combustible</label>
          <div className="input-wrapper">
            <span className="input-icon"><Fuel size={16} /></span>
            <select className="input appearance-none" value={form.combustible}
              onChange={e => setForm({...form, combustible: e.target.value})}>
              {COMBUSTIBLES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Foto del coche */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">Foto del vehículo (opcional)</label>
          {photoPreview && (
            <div className="mb-2 relative rounded-xl overflow-hidden border border-[var(--border-color)] aspect-video bg-[var(--bg-secondary)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
              <button type="button"
                className="absolute top-2 right-2 btn btn-secondary !p-1.5 !min-h-0 text-xs"
                onClick={() => onPhoto(null)}>Quitar</button>
            </div>
          )}
          <input type="file" accept="image/jpeg,image/png,image/webp"
            className="input file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--bg-secondary)] file:text-[var(--text-primary)] hover:file:bg-[var(--accent)]/10"
            onChange={e => onPhoto(e.target.files?.[0] ?? null)} />
          {uploading && <p className="text-xs text-[var(--text-muted)] mt-1">Subiendo foto...</p>}
        </div>

        <button className="btn btn-primary w-full" onClick={submit}
          disabled={saving || uploading || !form.marca || !form.modelo}>
          {saving ? 'Guardando...' : 'Guardar vehículo'}
        </button>
      </div>
    </div>
  );
}
