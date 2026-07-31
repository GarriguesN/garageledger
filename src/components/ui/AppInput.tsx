"use client";

// Campo de texto del mockup 4: etiqueta pequeña encima, caja de superficie
// elevada con radio 16 debajo. El foco se marca con el borde de marca (el
// anillo global de :focus-visible se desactiva aquí porque duplicaría la
// señal).

import { forwardRef, useId } from "react";
import { cn } from "./cn";

export interface AppInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  /** Texto fijo a la derecha dentro de la caja: "€", "L", "km". */
  suffix?: React.ReactNode;
  /** Mensaje de error; pinta el borde en rojo y lo anuncia. */
  error?: string;
  /** Ayuda bajo el campo cuando no hay error. */
  hint?: React.ReactNode;
  /** Solo lectura calculada (precio por litro): mismo aspecto, sin edición. */
  computed?: boolean;
}

const fieldBase =
  "w-full rounded-input border bg-surface-elevated px-4 text-body text-text " +
  "placeholder:text-text-muted outline-none transition-colors min-h-12 " +
  "focus:border-primary focus-visible:outline-none";

const AppInput = forwardRef<HTMLInputElement, AppInputProps>(function AppInput(
  { label, suffix, error, hint, computed = false, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-caption font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          readOnly={computed || props.readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            fieldBase,
            "tabular",
            error ? "border-danger" : "border-border",
            computed && "text-text-secondary",
            suffix && "pr-12",
          )}
          {...props}
        />
        {suffix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-body text-text-secondary"
          >
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-caption text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-caption text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default AppInput;

/** Área de texto con el mismo aspecto (campo "Notas" del mockup 4). */
export const AppTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }
>(function AppTextarea({ label, className, id, rows = 3, ...props }, ref) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={textareaId} className="mb-2 block text-caption font-medium text-text-secondary">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={cn(fieldBase, "resize-none border-border py-3 leading-normal")}
        {...props}
      />
    </div>
  );
});
