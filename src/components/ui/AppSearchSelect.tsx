"use client";

// Buscador con sugerencias del paso "Marca y modelo" (mockup 1): campo de
// búsqueda, chips de uso reciente y lista de opciones populares.
//
// No es un <select>: la lista es larga y la mayoría de la gente sabe lo que
// busca, así que teclear dos letras y tocar la fila es más rápido que hacer
// scroll en la rueda del sistema. Y como es un catálogo abierto —siempre
// habrá una marca que falte—, lo que se escriba vale aunque no esté en la
// lista: la última fila ofrece usar el texto tal cual.

import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Check, ChevronRight } from "@/design/tokens/icons";
import { duration, easing, iconSize, strokeWidth } from "@/design/tokens";
import { cn } from "./cn";

export interface AppSearchSelectProps {
  label?: string;
  /** Valor elegido (texto libre: puede no estar en `options`). */
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  /** Sugerencias de arriba, en forma de chips. */
  recent?: readonly string[];
  recentLabel?: string;
  optionsLabel?: string;
  placeholder?: string;
  error?: string;
  /** Nodo del campo de búsqueda, para que un asistente pueda enfocarlo
   *  cuando su paso no valida. */
  inputRef?: React.Ref<HTMLInputElement>;
  className?: string;
}

export default function AppSearchSelect({
  label,
  value,
  onChange,
  options,
  recent = [],
  recentLabel = "Recientes",
  optionsLabel = "Populares",
  placeholder = "Buscar…",
  error,
  inputRef,
  className,
}: AppSearchSelectProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  // Solo se ofrece "usar lo escrito" si no coincide exactamente con una
  // opción — si no, saldrían dos filas para lo mismo.
  const typed = query.trim();
  const showCustom =
    typed.length > 0 && !options.some((o) => o.toLowerCase() === typed.toLowerCase());

  function choose(next: string) {
    onChange(next);
    setQuery("");
  }

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-caption font-medium text-text-secondary">
          {label}
        </label>
      )}

      <div className="relative">
        <Search
          size={iconSize.md}
          strokeWidth={strokeWidth.default}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-4 my-auto text-text-muted"
        />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          className={cn(
            "min-h-12 w-full rounded-input border bg-surface-elevated pl-12 pr-4",
            "text-body text-text placeholder:text-text-muted outline-none transition-colors",
            "focus:border-primary focus-visible:outline-none",
            error ? "border-danger" : "border-border",
          )}
        />
      </div>

      {value && (
        <p className="mt-2 flex items-center gap-2 text-caption text-text-secondary">
          <Check size={iconSize.sm} strokeWidth={strokeWidth.default} className="text-green" aria-hidden="true" />
          Seleccionado: <span className="font-semibold text-text">{value}</span>
        </p>
      )}

      {recent.length > 0 && !query && (
        <div className="mt-4">
          <p className="mb-2 text-caption font-medium text-text-secondary">{recentLabel}</p>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <motion.button
                key={r}
                type="button"
                whileTap={{ scale: 0.97 }}
                transition={{ duration: duration.press, ease: easing.out }}
                onClick={() => choose(r)}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-pill border px-4 text-body font-medium transition-colors",
                  r === value
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface-elevated text-text hover:border-text-muted",
                )}
              >
                {r}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-caption font-medium text-text-secondary">{optionsLabel}</p>
        <div className="overflow-hidden rounded-chip border border-border">
          {showCustom && (
            <Row label={`Usar «${typed}»`} selected={typed === value} onClick={() => choose(typed)} />
          )}
          {filtered.map((o) => (
            <Row key={o} label={o} selected={o === value} onClick={() => choose(o)} />
          ))}
          {filtered.length === 0 && !showCustom && (
            <p className="p-4 text-caption text-text-muted">Sin resultados.</p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Row({
  label, selected, onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.99 }}
      transition={{ duration: duration.press, ease: easing.out }}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-12 w-full items-center justify-between gap-3 border-b border-border px-4 text-left",
        "transition-colors last:border-b-0",
        selected ? "bg-surface-elevated" : "hover:bg-surface-elevated",
      )}
    >
      <span className={cn("text-body", selected ? "font-semibold text-text" : "text-text")}>
        {label}
      </span>
      {selected ? (
        <Check size={iconSize.md} strokeWidth={strokeWidth.default} className="shrink-0 text-primary" aria-hidden="true" />
      ) : (
        <ChevronRight size={iconSize.md} strokeWidth={strokeWidth.default} className="shrink-0 text-text-muted" aria-hidden="true" />
      )}
    </motion.button>
  );
}
