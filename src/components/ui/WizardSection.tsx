// Cabecera de un paso del wizard: título + subtítulo (mockup pantallas 1–17).
//
//   ┌────────────────────────────────────────┐
//   │  Marca y modelo                        │  ← h1, display
//   │  Selecciona la marca y el modelo       │  ← p, body, muted
//   │  de tu vehículo.                       │
//   └────────────────────────────────────────┘
//
// No pinta tarjeta: va pegado al borde superior del contenido. El
// consumidor mete los campos en una `<AppCard>` aparte.

import { cn } from "./cn";

export interface WizardSectionProps {
  title: string;
  subtitle?: React.ReactNode;
  className?: string;
}

export default function WizardSection({ title, subtitle, className }: WizardSectionProps) {
  return (
    <header className={cn("space-y-1", className)}>
      <h2 className="text-heading font-bold leading-tight text-text">{title}</h2>
      {subtitle && (
        <p className="text-body text-text-secondary">{subtitle}</p>
      )}
    </header>
  );
}
