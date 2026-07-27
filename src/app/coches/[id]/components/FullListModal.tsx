"use client";

// Modal de lista completa — delegado al Modal genérico para mantener
// consistencia visual y de comportamiento (mismo backdrop, Escape, X,
// aria-hidden, focus trap). Ticket 1.13: FullListModal pasa a consumir
// el mismo <Modal> que Añadir gasto y Programar mantenimiento.

import Modal from "@/components/Modal";

interface FullListModalProps {
  open: boolean;
  title: string;
  totalCount: number;
  onClose: () => void;
  children: React.ReactNode;
}

export default function FullListModal({
  open, title, totalCount, onClose, children,
}: FullListModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      totalCount={totalCount}
      mainId="page-main"
      className="sm:max-w-2xl"
    >
      {children}
    </Modal>
  );
}
