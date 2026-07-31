"use client";

// Cabecera visual del resumen (mockup 2): foto del vehículo con degradado y,
// solapado sobre su borde inferior, el anillo de puntuación.
//
// El anillo se superpone a la foto en lugar de ir debajo para que "94/100" y
// el coche se lean como una sola unidad, tal y como está en el mockup. El
// degradado garantiza que el anillo tenga contraste sobre cualquier foto.

import { useState } from "react";
import { Car } from "@/design/tokens/icons";
import {
  colors, hexToRgba, strokeWidth, accents, type AccentToken,
} from "@/design/tokens";
import { AppProgressRing } from "@/components/ui";

export interface CarHeroProps {
  photoUrl: string | null;
  name: string;
  score: number;
  scoreAccent: AccentToken;
  /** "Excelente estado" */
  conditionLabel: string;
  /** "¡Todo en orden!" */
  summary: string;
}

export default function CarHero({
  photoUrl, name, score, scoreAccent, conditionLabel, summary,
}: CarHeroProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showPhoto = photoUrl && !failed;

  return (
    <div className="relative">
      <div className="relative aspect-video w-full overflow-hidden rounded-image bg-surface-elevated">
        {showPhoto ? (
          <>
            {!loaded && <div className="skeleton absolute inset-0" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={name}
              loading="eager"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={`size-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            />
          </>
        ) : (
          <div
            className="flex size-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(colors.primary, 0.18)}, ${colors.surfaceElevated})`,
            }}
          >
            <Car size={48} strokeWidth={strokeWidth.default} className="text-text-muted" aria-hidden="true" />
          </div>
        )}
        <div className="photo-overlay pointer-events-none absolute inset-0" />
      </div>

      {/* El anillo monta sobre la foto: el margen negativo (48px de los 112
          que mide el anillo) lo sube sin sacarlo del flujo, así el texto de
          debajo se reacomoda en lugar de solaparse. */}
      <div className="relative -mt-12 flex flex-col items-center">
        <div className="rounded-pill bg-background p-1">
          <AppProgressRing score={score} accent={scoreAccent} />
        </div>
        <p className="mt-2 text-title font-semibold" style={{ color: accents[scoreAccent] }}>
          {conditionLabel}
        </p>
        <p className="mt-0.5 text-caption text-text-secondary">{summary}</p>
      </div>
    </div>
  );
}
