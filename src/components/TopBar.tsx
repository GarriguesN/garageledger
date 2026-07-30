'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Menu, X, Car, Settings, AlertTriangle } from 'lucide-react';
import { useMatriculaFromEvents } from './TopBarContext';
import { parseTitleAndDate } from '@/app/coches/[id]/components/AlertBanner';
import { ALERT_SEVERITY_COLORS } from '@/lib/constants';

interface CarAlert {
  type: 'critical' | 'warning' | 'info';
  message: string;
  carId: number;
  carLabel: string;
}

// Lee la matrícula inicial desde el DOM, establecida por el Server Component
// de la página de coche mediante un <div data-page-matricula="...">. Solo se
// usa como valor de arranque (evita un flash "Vehículo" -> matrícula en la
// primera carga/hidratación); las actualizaciones posteriores llegan vía
// publishMatricula()/useMatriculaFromEvents (ver TopBarContext.tsx).
function readInitialMatriculaFromDom() {
  if (typeof document === "undefined") return null;
  const path = window.location.pathname;
  if (!/^\/coches\/[^/]+$/.test(path)) return null;
  const el = document.querySelector("[data-page-matricula]");
  return el?.getAttribute("data-page-matricula") || null;
}

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [alerts, setAlerts] = useState<CarAlert[]>([]);
  const pathname = usePathname() || "/";
  const [bootMatricula] = useState<string | null>(readInitialMatriculaFromDom);
  const publishedMatricula = useMatriculaFromEvents();
  const matricula = publishedMatricula ?? bootMatricula;

  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && (setOpen(false), setNotifications(false));
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/alerts')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j?.alerts) setAlerts(j.alerts); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const criticalCount = alerts.filter((a) => a.type === 'critical').length;

  let title = "Garaje";
  if (pathname === "/coches/nuevo") title = "Nuevo vehículo";
  else if (pathname === "/settings") title = "Ajustes";
  else if (/^\/coches\/[^/]+\/editar$/.test(pathname)) {
    // Para editar, la matrícula la publica la propia página cliente.
    title = matricula ? `Editando ${matricula}` : "Editando vehículo";
  } else if (/^\/coches\/[^/]+$/.test(pathname)) {
    title = matricula || "Vehículo";
  }

  return <>
    <header className="sticky top-0 z-40 h-12 flex items-center justify-between px-4 bg-[var(--bg-primary)]/90 backdrop-blur border-b border-[var(--border-color)]">
      <button aria-label="Abrir menú" onClick={() => setOpen(true)}><Menu size={22}/></button>
      {/* suppressHydrationWarning: el servidor no conoce la matrícula,
          así que el primer render del cliente puede diferir del SSR. */}
      <span className="text-sm font-semibold truncate px-2" suppressHydrationWarning data-testid="topbar-title">{title}</span>
      <button aria-label={`Notificaciones${alerts.length ? ` (${alerts.length})` : ""}`} className="relative" onClick={() => setNotifications(true)}>
        <Bell size={20}/>
        {alerts.length > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] leading-4 font-semibold text-white text-center"
            style={{ background: criticalCount > 0 ? ALERT_SEVERITY_COLORS.critical.fg : ALERT_SEVERITY_COLORS.warning.fg }}
          >
            {alerts.length}
          </span>
        )}
      </button>
    </header>
    {open && <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => setOpen(false)}><aside className="h-full w-72 bg-white p-5 space-y-4" onClick={e => e.stopPropagation()}><div className="flex justify-between"><b>Menú</b><button aria-label="Cerrar menú" onClick={() => setOpen(false)}><X/></button></div><Link className="flex gap-3 py-3" href="/" onClick={() => setOpen(false)}><Car/> Garaje</Link><Link className="flex gap-3 py-3" href="/settings" onClick={() => setOpen(false)}><Settings/> Ajustes</Link></aside></div>}
    {notifications && (
      <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-5" onClick={() => setNotifications(false)}>
        <div className="card w-full max-w-sm max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center">
            <b>Notificaciones</b>
            <button aria-label="Cerrar notificaciones" onClick={() => setNotifications(false)}><X/></button>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] mt-5">Sin notificaciones todavía</p>
          ) : (
            <div className="space-y-2 mt-4">
              {alerts.map((a, i) => {
                const colors = a.type === 'critical' ? ALERT_SEVERITY_COLORS.critical : ALERT_SEVERITY_COLORS.warning;
                const { title: msgTitle, subtitle } = parseTitleAndDate(a.message);
                return (
                  <Link
                    key={i}
                    href={`/coches/${a.carId}`}
                    onClick={() => setNotifications(false)}
                    className="flex items-center gap-3 w-full rounded-2xl px-3 py-2.5 text-left"
                    style={{ background: colors.bg }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: colors.iconBg, color: colors.fg }}
                      aria-hidden
                    >
                      <AlertTriangle size={16} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium leading-tight" style={{ color: "var(--text-muted)" }}>{a.carLabel}</p>
                      <p className="text-[13px] font-semibold leading-tight" style={{ color: colors.title }}>{msgTitle}</p>
                      {subtitle && <p className="text-[11px] leading-tight mt-0.5" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )}
  </>;
}
