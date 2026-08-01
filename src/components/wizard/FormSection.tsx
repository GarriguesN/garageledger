"use client";

// Bloque de campos dentro de un paso: un rótulo pequeño y, debajo, los
// campos separados por la misma medida en todos los asistentes.
//
// Existe para que ningún paso improvise su propio espaciado con un div
// suelto: el ritmo vertical del formulario es parte del diseño, no una
// decisión de cada pantalla.

import { cn } from "@/components/ui/cn";

export interface FormSectionProps {
  title?: string;
  /** Nota bajo los campos: la explicación de por qué se pide algo. */
  hint?: React.ReactNode;
  /** Dos columnas, como las rejillas de campos cortos del mockup. */
  columns?: 1 | 2;
  children: React.ReactNode;
  className?: string;
}

export default function FormSection({
  title, hint, columns = 1, children, className,
}: FormSectionProps) {
  return (
    <section className={cn("w-full", className)}>
      {title && (
        <h4 className="mb-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
          {title}
        </h4>
      )}
      <div className={cn(columns === 2 ? "grid grid-cols-2 gap-3" : "space-y-4")}>{children}</div>
      {hint && <p className="mt-3 text-caption text-text-muted">{hint}</p>}
    </section>
  );
}
