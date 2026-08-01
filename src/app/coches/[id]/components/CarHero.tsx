"use client";

// La mitad superior del resumen (mockup 2), en el orden en que se mira:
// foto grande → anillo de puntuación flotando sobre su borde → tarjeta de
// estado. Nada más entra en la primera pantalla; el resto del resumen queda
// por debajo de la línea de flotación.
//
// El anillo no vive dentro de la foto ni dentro de la tarjeta: se posiciona
// absoluto sobre el borde donde se tocan, con un 60% por encima de él. Si
// perteneciera a una de las dos cajas, esa caja tendría que crecer para
// contenerlo y el solape dejaría de ser exacto.
//
// La foto tampoco se desplaza con el contenido: se queda fija arriba
// (position sticky) y lo de abajo pasa por encima, como en las fichas de las
// apps de Apple. Mientras queda atrás se atenúa y se acerca un poco; son
// solo opacidad y `scale`, que el navegador resuelve en el compositor sin
// recalcular layout, y con "reducir movimiento" no se anima nada.

import { useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Car } from "@/design/tokens/icons";
import {
  colors, hexToRgba, strokeWidth, accents, radius, duration, easing,
  type AccentToken,
} from "@/design/tokens";
import { AppBadge, AppProgressRing } from "@/components/ui";

export interface CarHeroProps {
  photoUrl: string | null;
  name: string;
  /** Distintivo de versión bajo el nombre: "Type S FK2". */
  trim?: string | null;
  /** "2009 • 1.8 i-VTEC • 0016GMP" */
  specLine?: string | null;
  score: number;
  scoreAccent: AccentToken;
  /** "Excelente estado" */
  conditionLabel: string;
  /** "¡Todo en orden!" */
  summary: string;
  /** El resto del resumen. Empieza bajo la tarjeta de estado, fuera de la
   *  primera pantalla, y es lo que se desplaza por encima de la foto. */
  children: React.ReactNode;
}

/** Recorrido de scroll, en píxeles, en el que la foto se apaga. */
const FADE_DISTANCE = 240;

/** Diámetro del anillo y cuánto de él queda por encima del borde de la foto.
 *  El 70/30 del mockup: siete décimas dentro de la imagen, tres fuera. */
const RING_SIZE = 104;
const RING_OVERLAP = "-70%";

export default function CarHero({
  photoUrl, name, trim, specLine, score, scoreAccent, conditionLabel, summary, children,
}: CarHeroProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showPhoto = photoUrl && !failed;

  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, FADE_DISTANCE], [1, 0.3]);
  const scale = useTransform(scrollY, [0, FADE_DISTANCE], [1, 1.12]);

  return (
    <div className="relative">
      {/* Identidad: la píldora de versión y la ficha en pequeño, centradas
          bajo el nombre que va en la barra. 24px hasta la foto. */}
      {(trim || specLine) && (
        <div className="flex flex-col items-center gap-2 pb-6">
          {trim && <AppBadge tone="neutral">{trim}</AppBadge>}
          {specLine && <span className="text-caption text-text-secondary">{specLine}</span>}
        </div>
      )}

      {/* Foto: el elemento dominante de la pantalla. Ocupa el 42% del alto
          de la ventana, de margen a margen, sin borde ni sombra. */}
      <div
        className="sticky top-0 overflow-hidden"
        style={{ height: "42vh", borderRadius: radius.card }}
      >
        <motion.div
          className="absolute inset-0"
          style={reduce ? undefined : { opacity, scale }}
        >
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
        </motion.div>
      </div>

      {/* Hoja de contenido: su fondo propio es lo que tapa la foto al subir. */}
      <div className="relative bg-background">
        {/* Estado. Arranca pegado a la foto —la separación la crea el
            anillo— y reserva arriba el hueco de la parte que sobresale. En el
            mockup no lleva superficie propia: el título verde y su frase van
            directamente sobre el fondo de la pantalla. */}
        <div className="relative px-8 pb-8 pt-12 text-center">
          {/* El desplazamiento del 60% va en un envoltorio sin animar: la
              animación de entrada escribe su propio `transform` y borraría
              cualquier translate puesto en el mismo elemento. */}
          <div
            className="absolute inset-x-0 top-0 flex justify-center"
            style={{ transform: `translateY(${RING_OVERLAP})` }}
          >
            <motion.div
              initial={reduce ? false : { scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: duration.page, ease: easing.out }}
            >
              <AppProgressRing
                score={score}
                accent={scoreAccent}
                size={RING_SIZE}
                stroke={8}
                glow
              />
            </motion.div>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.page, ease: easing.out, delay: 0.1 }}
          >
            <p className="text-heading font-bold" style={{ color: accents[scoreAccent] }}>
              {conditionLabel}
            </p>
            <p className="mt-1 text-body text-text-secondary">{summary}</p>
          </motion.div>
        </div>

        {/* 32px entre secciones: el aire es parte del diseño. */}
        <div className="space-y-8">{children}</div>
      </div>
    </div>
  );
}
