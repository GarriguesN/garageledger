"use client";

// Desplegable con el mismo aspecto que AppInput. Usa un <select> nativo:
// en móvil abre la rueda del sistema, que es lo que el usuario espera y sale
// gratis en accesibilidad. La flecha de lucide se dibuja encima y el
// indicador nativo se oculta con appearance-none.

import { forwardRef, useId } from "react";
import { ChevronDown } from "@/design/tokens/icons";
import { iconSize, strokeWidth } from "@/design/tokens";
import { cn } from "./cn";

export interface AppSelectOption {
  value: string;
  label: string;
  /** Agrupa opciones bajo un <optgroup> (catálogo de mantenimientos). */
  group?: string;
}

export interface AppSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  options: AppSelectOption[];
  placeholder?: string;
  error?: string;
}

const AppSelect = forwardRef<HTMLSelectElement, AppSelectProps>(function AppSelect(
  { label, options, placeholder, error, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;

  const groups = options.reduce<Record<string, AppSelectOption[]>>((acc, o) => {
    const key = o.group ?? "";
    (acc[key] ||= []).push(o);
    return acc;
  }, {});
  const grouped = Object.keys(groups).some((k) => k !== "");

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={selectId} className="mb-2 block text-caption font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          className={cn(
            "min-h-12 w-full appearance-none rounded-input border bg-surface-elevated",
            "px-4 pr-12 text-body text-text outline-none transition-colors focus:border-primary",
            error ? "border-danger" : "border-border",
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {grouped
            ? Object.entries(groups).map(([group, items]) =>
                group ? (
                  <optgroup key={group} label={group}>
                    {items.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  items.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))
                ),
              )
            : options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
        </select>
        <ChevronDown
          size={iconSize.md}
          strokeWidth={strokeWidth.default}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-4 my-auto text-text-secondary"
        />
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
});

export default AppSelect;
