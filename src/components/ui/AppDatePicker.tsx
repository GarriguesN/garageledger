"use client";

// Selector de fecha. Es un <input type="date"> nativo con el aspecto de
// AppInput: en móvil abre el calendario del sistema (mejor que cualquier
// calendario propio) y en escritorio se escribe directamente. El icono
// nativo se reestiliza en globals.css (invertido para el tema oscuro).

import { forwardRef, useId } from "react";
import { cn } from "./cn";

export interface AppDatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  hint?: React.ReactNode;
}

const AppDatePicker = forwardRef<HTMLInputElement, AppDatePickerProps>(function AppDatePicker(
  { label, error, hint, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-caption font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type="date"
        aria-invalid={error ? true : undefined}
        className={cn(
          "tabular min-h-12 w-full rounded-input border bg-surface-elevated px-4",
          "text-body text-text outline-none transition-colors focus:border-primary",
          error ? "border-danger" : "border-border",
        )}
        {...props}
      />
      {error ? (
        <p role="alert" className="mt-1.5 text-caption text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-caption text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
});

export default AppDatePicker;
