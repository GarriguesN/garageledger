'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Menu, X, Car, Settings } from 'lucide-react';

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  useEffect(() => { const close = (e: KeyboardEvent) => e.key === 'Escape' && (setOpen(false), setNotifications(false)); document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close); }, []);
  return <>
    <header className="sticky top-0 z-40 h-12 bg-white border-b border-[var(--border-color)] flex items-center justify-between px-4 sm:hidden">
      <button aria-label="Abrir menú" onClick={() => setOpen(true)}><Menu size={22}/></button>
      <span className="font-bold text-[var(--accent)]">GarageLedger</span>
      <button aria-label="Notificaciones" onClick={() => setNotifications(true)}><Bell size={20}/></button>
    </header>
    {open && <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => setOpen(false)}><aside className="h-full w-72 bg-white p-5 space-y-4" onClick={e => e.stopPropagation()}><div className="flex justify-between"><b>Menú</b><button aria-label="Cerrar menú" onClick={() => setOpen(false)}><X/></button></div><Link className="flex gap-3 py-3" href="/" onClick={() => setOpen(false)}><Car/> Garaje</Link><Link className="flex gap-3 py-3" href="/settings" onClick={() => setOpen(false)}><Settings/> Ajustes</Link></aside></div>}
    {notifications && <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-5" onClick={() => setNotifications(false)}><div className="card w-full max-w-sm" onClick={e => e.stopPropagation()}><div className="flex justify-between"><b>Notificaciones</b><button aria-label="Cerrar notificaciones" onClick={() => setNotifications(false)}><X/></button></div><p className="text-sm text-[var(--text-muted)] mt-5">Sin notificaciones todavía</p></div></div>}
  </>;
}
