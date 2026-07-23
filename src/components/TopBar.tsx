'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Menu, X, Car, Settings } from 'lucide-react';

// Lee la matrícula actual desde el DOM, establecida por el Server Component
// de la página de coche mediante un <div data-page-matricula="...">. Si la
// ruta actual no es /coches/[id], devuelve null.
function readMatriculaFromDom() {
  if (typeof document === "undefined") return null;
  const path = window.location.pathname;
  if (!/^\/coches\/[^/]+$/.test(path)) return null;
  const el = document.querySelector("[data-page-matricula]");
  return el?.getAttribute("data-page-matricula") || null;
}

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const pathname = usePathname() || "/";
  const [matricula, setMatricula] = useState<string | null>(readMatriculaFromDom);

  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && (setOpen(false), setNotifications(false));
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);

  // Reactivo a navegaciones SPA: re-lee el atributo en cada cambio de ruta.
  useEffect(() => {
    setMatricula(readMatriculaFromDom());
  }, [pathname]);

  // Si estamos en /coches/[id] y el SC no inyectó data-page-matricula
  // (porque ya estábamos en cliente y Next.js no re-ejecuta el SC),
  // hacemos un fetch rápido a la API para obtener la matrícula.
  useEffect(() => {
    const m = /^\/coches\/([^/]+)$/.exec(pathname);
    if (!m) return;
    if (readMatriculaFromDom()) return;
    const carId = m[1];
    let cancelled = false;
    fetch(`/api/car/${carId}/page-data`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        const mat = j?.car?.matricula || null;
        if (mat) {
          let el = document.querySelector("[data-page-matricula]") as HTMLElement | null;
          if (!el) {
            el = document.createElement("div");
            el.setAttribute("data-page-matricula", mat);
            el.style.display = "none";
            document.body.prepend(el);
          } else {
            el.setAttribute("data-page-matricula", mat);
          }
          setMatricula(mat);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pathname]);

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
      <button aria-label="Notificaciones" onClick={() => setNotifications(true)}><Bell size={20}/></button>
    </header>
    {open && <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => setOpen(false)}><aside className="h-full w-72 bg-white p-5 space-y-4" onClick={e => e.stopPropagation()}><div className="flex justify-between"><b>Menú</b><button aria-label="Cerrar menú" onClick={() => setOpen(false)}><X/></button></div><Link className="flex gap-3 py-3" href="/" onClick={() => setOpen(false)}><Car/> Garaje</Link><Link className="flex gap-3 py-3" href="/settings" onClick={() => setOpen(false)}><Settings/> Ajustes</Link></aside></div>}
    {notifications && <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-5" onClick={() => setNotifications(false)}><div className="card w-full max-w-sm" onClick={e => e.stopPropagation()}><div className="flex justify-between"><b>Notificaciones</b><button aria-label="Cerrar notificaciones" onClick={() => setNotifications(false)}><X/></button></div><p className="text-sm text-[var(--text-muted)] mt-5">Sin notificaciones todavía</p></div></div>}
  </>;
}
