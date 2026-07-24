'use client';

import Link from "next/link";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from "next/navigation";
import { Car, ArrowLeft, Save, X, Gauge, Calendar, Euro, Hash, Wrench, Fuel } from "lucide-react";
import { publishMatricula } from "@/components/TopBarContext";

const COMBUSTIBLES = ["Gasolina", "Diésel", "Híbrido", "Eléctrico", "GLP"];

export default function EditarCoche() {
  const params = useParams();
  const router = useRouter();
  const carId = parseInt(params.id as string);
  const [form, setForm] = useState({
    marca: '', modelo: '', generacion: '', motor: '', ano: '',
    puertas: '5', km_actuales: '', fecha_ultima_itv: '', fecha_vencimiento_seguro: '',
    fecha_matriculacion: '', km_origen: 'matriculacion',
    matricula: '', bastidor: '', combustible: 'Gasolina',
    potencia_cv: '', cilindrada_cc: '', peso_kg: '', plazas: '', color: '',
  });
  const [existingFotoId, setExistingFotoId] = useState<number | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch(`/api/car/${carId}/page-data`)
      .then(r => r.json())
      .then(j => {
        const c = j.car;
        setForm({
          marca: c.marca, modelo: c.modelo, generacion: c.generacion || '', motor: c.motor || '',
          ano: c.ano?.toString() || '', puertas: c.puertas?.toString() || '5',
          km_actuales: c.km_actuales?.toString() || '',
          fecha_ultima_itv: c.fecha_ultima_itv || '',
          fecha_vencimiento_seguro: c.fecha_vencimiento_seguro || '',
          fecha_matriculacion: c.fecha_matriculacion || '',
          km_origen: c.km_origen || 'matriculacion',
          matricula: c.matricula || '',
          bastidor: c.bastidor || '',
          combustible: c.combustible || 'Gasolina',
          potencia_cv: c.potencia_cv?.toString() || '',
          cilindrada_cc: c.cilindrada_cc?.toString() || '',
          peso_kg: c.peso_kg?.toString() || '',
          plazas: c.plazas?.toString() || '',
          color: c.color || '',
        });
        setExistingFotoId(c.foto_attachment_id ?? null);
        if (c.foto_attachment_id) {
          setPhotoPreview(`/api/attachments/${c.foto_attachment_id}`);
        }
        publishMatricula(c.matricula || null);
        // Marca el DOM con la matrícula actual para que el TopBar la lea
        // sincrónicamente (tanto en SSR como en hidratación cliente).
        if (typeof document !== "undefined") {
          let el = document.querySelector("[data-page-matricula]") as HTMLElement | null;
          if (!el) {
            el = document.createElement("div");
            el.setAttribute("data-page-matricula", c.matricula || "");
            el.style.display = "none";
            document.body.prepend(el);
          } else {
            el.setAttribute("data-page-matricula", c.matricula || "");
          }
        }
      })
      .finally(() => setLoading(false));
  }, [carId]);

  useEffect(() => {
    return () => {
      publishMatricula(null);
      if (typeof document !== "undefined") {
        const el = document.querySelector("[data-page-matricula]");
        if (el && el.parentElement === document.body) el.remove();
      }
    };
  }, []);

  const onPhoto = (file: File | null) => {
    setPhoto(file);
    if (photoPreview && photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : (existingFotoId ? `/api/attachments/${existingFotoId}` : null));
  };

  const save = async () => {
    setSaving(true);
    try {
      // 1. Update car fields.
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
          fecha_matriculacion: form.fecha_matriculacion || null,
          km_origen: form.km_origen || 'matriculacion',
          potencia_cv: form.potencia_cv ? parseInt(form.potencia_cv) : null,
          cilindrada_cc: form.cilindrada_cc ? parseInt(form.cilindrada_cc) : null,
          peso_kg: form.peso_kg ? parseInt(form.peso_kg) : null,
          plazas: form.plazas ? parseInt(form.plazas) : null,
          color: form.color || null,
          matricula: form.matricula,
          bastidor: form.bastidor,
          combustible: form.combustible,
        }),
      });

      // 2. Upload new photo if present.
      if (photo) {
        setUploading(true);
        try {
          const fd = new FormData();
          fd.append("car_id", String(carId));
          fd.append("file", photo);
          const upRes = await fetch("/api/attachments", { method: "POST", body: fd });
          if (upRes.ok) {
            const j = await upRes.json();
            await fetch('/api/cars', {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: carId, foto_attachment_id: j.id }),
            });
          }
        } finally {
          setUploading(false);
        }
      }
      router.push(`/coches/${carId}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="space-y-3"><div className="skeleton h-96" /></div>;

  return (
    <div className="max-w-lg mx-auto space-y-6">
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
            <label className="block text-xs text-[var(--text-muted)] mb-1">Matrícula</label>
            <div className="input-wrapper">
              <span className="input-icon"><Hash size={16} /></span>
              <input className="input" value={form.matricula} onChange={e => setForm({...form, matricula: e.target.value})} placeholder="1234-ABC" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Bastidor (VIN)</label>
            <div className="input-wrapper">
              <span className="input-icon"><Hash size={16} /></span>
              <input className="input" value={form.bastidor} onChange={e => setForm({...form, bastidor: e.target.value})} placeholder="JHMFB4600CS123456" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Combustible</label>
          <div className="input-wrapper">
            <span className="input-icon"><Fuel size={16} /></span>
            <select className="input appearance-none" value={form.combustible}
              onChange={e => setForm({...form, combustible: e.target.value})}>
              {COMBUSTIBLES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
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

        {/* Datos técnicos del vehículo — Ticket 1.20 */}
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1.5 font-semibold">Datos técnicos</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Caballos (CV)</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.potencia_cv}
                onChange={e => setForm({...form, potencia_cv: e.target.value})}
                placeholder="Ej. 140"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Cilindrada (cc)</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.cilindrada_cc}
                onChange={e => setForm({...form, cilindrada_cc: e.target.value})}
                placeholder="Ej. 1800"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Peso (kg)</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.peso_kg}
                onChange={e => setForm({...form, peso_kg: e.target.value})}
                placeholder="Ej. 1320"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Plazas</label>
              <input
                className="input"
                type="number"
                min="1"
                max="9"
                value={form.plazas}
                onChange={e => setForm({...form, plazas: e.target.value})}
                placeholder="Ej. 5"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Color</label>
            <input
              className="input"
              value={form.color}
              onChange={e => setForm({...form, color: e.target.value})}
              placeholder="Ej. Negro metalizado"
            />
          </div>
        </div>

        {/* Foto */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Foto del vehículo</label>
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

        <div className="flex gap-2 pt-2">
          <button className="btn btn-primary flex-1" onClick={save} disabled={saving || uploading}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <Link href={`/coches/${carId}`} className="btn btn-secondary">
            <X size={16} /> Cancelar
          </Link>
        </div>
      </div>
    </div>
  );
}
