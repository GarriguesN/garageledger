"use client";

// NavBar con dos variantes según la ruta:
//
//   - Fuera de /coches/[id] (Garaje, Ajustes, etc.): navbar de marca
//     arriba (escritorio) con "GarageLedger" + enlaces, y navbar inferior
//     (móvil) con los iconos Garaje / Añadir / Ajustes.
//
//   - Dentro de /coches/[id]: navbar contextual del coche, fijo abajo
//     (móvil y escritorio), con tres entradas:
//       · Resumen    → scroll al top de la página
//       · [+] rojo   → abre el formulario "Añadir gasto" del coche
//       · Documentos → scroll al bloque "Guantera" de la página
//
// Ambos coexisten: el global aparece fuera de /coches/[id], el contextual
// dentro. NO se elimina el global.
//
// El botón [+] del navbar contextual dispara un CustomEvent
// ("garageledger:car-nav-add-expense") que el padre (CarDetailClient)
// escucha para abrir el formulario de añadir gasto. Esto desacopla el
// navbar del componente cliente del coche sin necesidad de context.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Car, Plus, Settings, FileText } from "lucide-react";

const links = [
  { href: "/", label: "Garaje", icon: Car },
  { href: "/coches/nuevo", label: "Añadir", icon: Plus },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

const EVT_TOGGLE_EXPENSE = "garageledger:car-nav-add-expense";

/** El navbar contextual del coche dispara este evento para que el padre
 *  (CarDetailClient) abra el formulario de gasto. */
export function fireToggleAddExpense() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT_TOGGLE_EXPENSE));
}

function isCarDetailPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /^\/coches\/[^/]+$/.test(pathname);
}

function GlobalTopBar({ pathname }: { pathname: string }) {
  function isActive(href: string) {
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  }
  return (
    <nav className="hidden sm:block sticky top-12 z-20 bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-12">
        <Link href="/" className="font-bold text-lg tracking-tight flex items-center gap-2" style={{ color: "var(--accent)" }}>
          <Car size={18} />
          GarageLedger
        </Link>
        <div className="flex items-center gap-1">
          {links.map(link => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link flex items-center justify-center min-w-[44px] min-h-[44px] ${active ? "active" : ""}`}
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function GlobalBottomBar({ pathname }: { pathname: string }) {
  function isActive(href: string) {
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  }
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] bg-[var(--bg-primary)]/95 backdrop-blur-md border-t-2 border-[var(--accent)]">
      <div className="flex items-center justify-around h-12">
        {links.map(link => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                active ? "text-[var(--accent)] bg-[var(--accent)]/10" : "text-[var(--text-muted)]"
              }`}
            >
              <Icon size={24} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Navbar contextual del coche: Resumen / + rojo / Documentos.
 *  Aparece dentro de /coches/[id] en todas las vistas (móvil y escritorio),
 *  fijo abajo, para no romper el flujo del usuario en la pantalla de detalle. */
function CarContextBottomBar() {
  function scrollTo(selector: string) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSummary() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function handleAdd() {
    fireToggleAddExpense();
  }
  function handleDocs() {
    scrollTo("[data-glovebox-anchor]");
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] bg-[var(--bg-primary)]/95 backdrop-blur-md border-t border-[var(--border-color)]"
      aria-label="Navegación del coche"
    >
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-3 items-center h-16">
        <button
          type="button"
          onClick={handleSummary}
          className="flex flex-col items-center justify-center gap-0.5 text-[var(--accent)] min-h-[44px]"
          aria-label="Resumen"
        >
          <Car size={22} />
          <span className="text-[11px] font-semibold">Resumen</span>
        </button>

        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center justify-center self-center mx-auto rounded-full shadow-lg"
          style={{ background: "var(--accent)", color: "#fff", width: 56, height: 56, marginTop: -16 }}
          aria-label="Añadir gasto"
          data-car-nav-action="add"
        >
          <Plus size={26} strokeWidth={2.4} />
        </button>

        <button
          type="button"
          onClick={handleDocs}
          className="flex flex-col items-center justify-center gap-0.5 text-[var(--text-secondary)] min-h-[44px]"
          aria-label="Documentos"
        >
          <FileText size={22} />
          <span className="text-[11px] font-semibold">Documentos</span>
        </button>
      </div>
    </nav>
  );
}

export default function NavBar() {
  const pathname = usePathname() || "/";
  const carContext = isCarDetailPath(pathname);

  // El navbar contextual es más alto (h-16) que el global (h-12).
  // Ajustamos el padding-bottom del main para que el contenido no quede
  // oculto detrás del navbar.
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    if (carContext) {
      main.classList.add("!pb-[calc(4rem+env(safe-area-inset-bottom))]");
      main.classList.remove("pb-[calc(3rem+env(safe-area-inset-bottom))]");
    } else {
      main.classList.remove("!pb-[calc(4rem+env(safe-area-inset-bottom))]");
      main.classList.add("pb-[calc(3rem+env(safe-area-inset-bottom))]");
    }
  }, [carContext]);

  if (carContext) return <CarContextBottomBar />;
  return (
    <>
      <GlobalTopBar pathname={pathname} />
      <GlobalBottomBar pathname={pathname} />
    </>
  );
}
