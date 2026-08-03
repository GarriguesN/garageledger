// Novedades visibles en la app (Perfil → "Novedades").
//
// Esta es la versión "humanizada" del CHANGELOG.md: el changelog del repo
// está escrito para desarrolladores (formato Keep a Changelog, categorías,
// tickets), pero aquí las entradas se redactan como release notes de una app
// móvil: lenguaje natural, sin jerga técnica, para el propietario único que
// usa la app cada día.
//
// REGLA (ver AGENTS.md §6): todo cambio de funcionalidad visible añade su
// entrada humanizada aquí, en el mismo commit que el cambio y que la entrada
// de CHANGELOG.md. La entrada más reciente va la primera.

export interface ReleaseNote {
  /** Versión SemVer, p. ej. "1.6.0". Debe coincidir con package.json. */
  version: string;
  /** Fecha ISO (YYYY-MM-DD) de la versión. */
  date: string;
  /** Frases en lenguaje natural; cada una es un bullet de la pantalla. */
  highlights: string[];
}

export const RELEASES: ReleaseNote[] = [
  {
    version: "1.6.0",
    date: "2026-08-03",
    highlights: [
      "Novedades en tu perfil: ahora puedes ver aquí qué cambia con cada versión de la app.",
      "La versión de la app ya no se queda atrás: se lee sola de donde vive de verdad.",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-08-03",
    highlights: [
      "Garaje rediseñado: cada coche en su tarjeta, con su salud, su gasto del mes y su consumo.",
      "Asistentes paso a paso para dar de alta un vehículo, registrar gastos y planificar mantenimientos.",
      "Los gastos se conectan con el mantenimiento: registra el aceite y la tarea se cierra sola, programando la siguiente.",
      "Tarjeta de kilometraje con media mensual y anual, calculada desde la matriculación o desde tu primer registro.",
      "Fechas automáticas: al registrar una ITV o un seguro, la app guarda su vencimiento y te avisa cuando toca.",
      "Documentos con recordatorio: sube la ITV, el seguro o el IVTM y avisamos antes de que caduque.",
      "Ficha completa del vehículo: potencia, cilindrada, peso, plazas y color.",
    ],
  },
];

/** Última versión publicada, para la fila "Novedades" del perfil. */
export function latestReleaseVersion(): string {
  return RELEASES[0]?.version ?? "—";
}
