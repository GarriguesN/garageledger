'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Car, Plus, Settings } from 'lucide-react';

const links = [
  { href: '/', label: 'Garaje', icon: Car },
  { href: '/coches/nuevo', label: 'Añadir', icon: Plus },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];

export default function NavBar() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  }

  return (
    <>
      {/* Top navbar — desktop only */}
      <nav className="hidden sm:block sticky top-12 z-20 bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-12">
          <Link href="/" className="font-bold text-lg tracking-tight flex items-center gap-2" style={{ color: 'var(--accent)' }}>
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
                  className={`nav-link flex items-center justify-center min-w-[44px] min-h-[44px] ${active ? 'active' : ''}`}
                >
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom navbar — mobile only */}
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
                  active
                    ? 'text-[var(--accent)] bg-[var(--accent)]/10'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <Icon size={24} />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
