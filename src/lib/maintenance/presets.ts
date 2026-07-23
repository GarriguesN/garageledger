// Catálogo de mantenimientos predefinidos del coche.
//
// El usuario puede elegir uno de estos presets al pulsar "Programar
// mantenimiento" para auto-rellenar parte de la tarea (nombre, marca
// por defecto, intervalo en km, intervalo en meses, icono). Después
// puede sobrescribir cualquier campo.
//
// Iconos: se usa lucide-react. El icono se mapea por `icon_key`. Si la
// clave no existe en `getIconForKey()`, el caller usa Wrench como
// fallback genérico.

import {
  Wrench, Droplet, Disc3, Square, Battery, Lightbulb, Snowflake, Wind,
  Cog, Settings2, RotateCw, CircleDot, Thermometer,
  type LucideIcon,
} from "lucide-react";

export interface MaintenancePreset {
  /** Identificador estable, se persiste en BD como `icon_key`. */
  key: string;
  /** Bloque padre para agrupar en el <optgroup>. */
  category: string;
  /** Nombre de la pieza, va a `maintenance_tasks.part_name`. */
  part_name: string;
  /** Descripción corta, va a `maintenance_tasks.notes` por defecto. */
  description: string;
  /** Intervalo sugerido en km, va a `maintenance_tasks.interval_km`. */
  interval_km: number;
  /** Intervalo sugerido en meses, va a `maintenance_tasks.interval_months`. */
  interval_months: number;
  /** Clave para resolver el icono. */
  icon_key: string;
}

/** Catálogo completo. Mantenemos el orden de la lista que pasaste. */
export const MAINTENANCE_PRESETS: MaintenancePreset[] = [
  // ── Motor y Lubricación ───────────────────────────────────────
  { key: "engine_oil_filter", category: "Motor y Lubricación",
    part_name: "Aceite de motor y filtro",
    description: "Cambio periódico según kilometraje o tiempo.",
    interval_km: 10000, interval_months: 12, icon_key: "engine_oil" },
  { key: "engine_air_filter", category: "Motor y Lubricación",
    part_name: "Filtro de aire del motor",
    description: "Sustitución para garantizar una buena combustión.",
    interval_km: 20000, interval_months: 24, icon_key: "engine_air_filter" },
  { key: "fuel_filter", category: "Motor y Lubricación",
    part_name: "Filtro de combustible",
    description: "Sustitución para evitar impurezas en el sistema de inyección.",
    interval_km: 30000, interval_months: 24, icon_key: "droplet" },
  { key: "spark_plugs", category: "Motor y Lubricación",
    part_name: "Bujías",
    description: "Revisión de la distancia de los electrodos y sustitución.",
    interval_km: 30000, interval_months: 36, icon_key: "spark" },
  { key: "ignition_coils", category: "Motor y Lubricación",
    part_name: "Bobinas de encendido",
    description: "Comprobación, limpieza de contactos y sustitución si fallan.",
    interval_km: 60000, interval_months: 60, icon_key: "coil" },
  { key: "valve_clearance", category: "Motor y Lubricación",
    part_name: "Reglaje de válvulas",
    description: "Comprobación y ajuste de las holguras (especialmente importante en motores donde no son hidráulicas).",
    interval_km: 40000, interval_months: 48, icon_key: "wrench" },
  { key: "coolant", category: "Motor y Lubricación",
    part_name: "Líquido refrigerante (anticongelante)",
    description: "Vaciado, limpieza del circuito y llenado.",
    interval_km: 40000, interval_months: 24, icon_key: "droplet" },
  { key: "timing_belt_water_pump", category: "Motor y Lubricación",
    part_name: "Correa de distribución y bomba de agua",
    description: "En motores que no llevan cadena.",
    interval_km: 80000, interval_months: 60, icon_key: "belt" },
  { key: "accessory_belt", category: "Motor y Lubricación",
    part_name: "Correa de accesorios / servicio",
    description: "Inspección de grietas y sustitución, junto con sus tensores.",
    interval_km: 60000, interval_months: 48, icon_key: "belt" },
  { key: "egr_throttle", category: "Motor y Lubricación",
    part_name: "Limpieza de la válvula EGR y cuerpo de mariposa",
    description: "Para evitar tirones y problemas de ralentí.",
    interval_km: 50000, interval_months: 60, icon_key: "cog" },
  { key: "engine_mounts", category: "Motor y Lubricación",
    part_name: "Tacos (soportes) de motor",
    description: "Inspección y cambio si transmiten demasiadas vibraciones.",
    interval_km: 80000, interval_months: 96, icon_key: "wrench" },

  // ── Sistema de Frenado ────────────────────────────────────────
  { key: "brake_pads", category: "Sistema de Frenado",
    part_name: "Pastillas de freno",
    description: "Inspección de desgaste y sustitución (delanteras y traseras).",
    interval_km: 30000, interval_months: 36, icon_key: "brake_pads" },
  { key: "brake_discs", category: "Sistema de Frenado",
    part_name: "Discos de freno",
    description: "Medición de grosor, comprobación de alabeo y sustitución.",
    interval_km: 60000, interval_months: 60, icon_key: "disc" },
  { key: "brake_fluid", category: "Sistema de Frenado",
    part_name: "Líquido de frenos",
    description: "Purga completa y sustitución (absorbe humedad con el tiempo).",
    interval_km: 40000, interval_months: 24, icon_key: "droplet" },
  { key: "brake_hoses", category: "Sistema de Frenado",
    part_name: "Latiguillos de freno",
    description: "Comprobación visual para detectar grietas o fugas.",
    interval_km: 60000, interval_months: 48, icon_key: "brake_hoses" },
  { key: "brake_calipers", category: "Sistema de Frenado",
    part_name: "Pinzas de freno",
    description: "Limpieza, engrase de los bulones guía y revisión de los guardapolvos.",
    interval_km: 60000, interval_months: 60, icon_key: "brake_calipers" },

  // ── Transmisión y Dirección ───────────────────────────────────
  { key: "gearbox_oil", category: "Transmisión y Dirección",
    part_name: "Valvulina (aceite de la caja de cambios)",
    description: "Sustitución en cajas manuales o mantenimiento completo (con filtro) en automáticas.",
    interval_km: 60000, interval_months: 48, icon_key: "cog" },
  { key: "power_steering_fluid", category: "Transmisión y Dirección",
    part_name: "Líquido de dirección asistida",
    description: "Nivel y sustitución (en sistemas hidráulicos o electrohidráulicos).",
    interval_km: 80000, interval_months: 60, icon_key: "droplet" },
  { key: "clutch_kit", category: "Transmisión y Dirección",
    part_name: "Embrague",
    description: "Comprobación del recorrido del pedal y sustitución del kit (disco, maza y cojinete) cuando patine.",
    interval_km: 100000, interval_months: 96, icon_key: "settings" },
  { key: "clutch_fluid", category: "Transmisión y Dirección",
    part_name: "Líquido de embrague",
    description: "Purga y sustitución (suele compartir depósito con el líquido de frenos).",
    interval_km: 40000, interval_months: 24, icon_key: "droplet" },
  { key: "alignment", category: "Transmisión y Dirección",
    part_name: "Alineación y paralelo",
    description: "Para evitar el desgaste irregular de los neumáticos y desvíos en la dirección.",
    interval_km: 20000, interval_months: 12, icon_key: "wrench" },

  // ── Suspensión, Ruedas y Rodaje ────────────────────────────────
  { key: "tyres", category: "Suspensión, Ruedas y Rodaje",
    part_name: "Neumáticos",
    description: "Revisión de presiones, desgaste de la banda de rodadura, equilibrado y permutación (rotación).",
    interval_km: 15000, interval_months: 12, icon_key: "tire" },
  { key: "shock_absorbers", category: "Suspensión, Ruedas y Rodaje",
    part_name: "Amortiguadores y muelles",
    description: "Comprobación de fugas de aceite y rebotes excesivos.",
    interval_km: 60000, interval_months: 60, icon_key: "wrench" },
  { key: "wheel_bearings", category: "Suspensión, Ruedas y Rodaje",
    part_name: "Cojinetes / rodamientos de rueda",
    description: "Comprobación de ruidos o zumbidos en marcha.",
    interval_km: 80000, interval_months: 96, icon_key: "circle_dot" },
  { key: "ball_joints", category: "Suspensión, Ruedas y Rodaje",
    part_name: "Rótulas y guardapolvos (palieres, dirección, suspensión)",
    description: "Revisión de roturas y fugas de grasa.",
    interval_km: 40000, interval_months: 48, icon_key: "wrench" },
  { key: "silentblocks", category: "Suspensión, Ruedas y Rodaje",
    part_name: "Silentblocks",
    description: "Comprobación de las gomas de los trapecios y barra estabilizadora.",
    interval_km: 80000, interval_months: 96, icon_key: "wrench" },

  // ── Sistema Eléctrico y Climatización ──────────────────────────
  { key: "battery", category: "Sistema Eléctrico y Climatización",
    part_name: "Batería",
    description: "Medición de voltaje en reposo y en carga, y limpieza de bornes.",
    interval_km: 30000, interval_months: 24, icon_key: "battery" },
  { key: "cabin_filter", category: "Sistema Eléctrico y Climatización",
    part_name: "Filtro de habitáculo (polen)",
    description: "Sustitución para mantener limpio el aire interior.",
    interval_km: 15000, interval_months: 12, icon_key: "wind" },
  { key: "ac_recharge", category: "Sistema Eléctrico y Climatización",
    part_name: "Aire acondicionado",
    description: "Carga de gas refrigerante y comprobación de fugas o rendimiento del compresor.",
    interval_km: 30000, interval_months: 24, icon_key: "snowflake" },
  { key: "bulbs", category: "Sistema Eléctrico y Climatización",
    part_name: "Iluminación",
    description: "Revisión y sustitución de bombillas (faros, posición, intermitentes, freno, interior).",
    interval_km: 20000, interval_months: 24, icon_key: "bulb" },
  { key: "fuses_relays", category: "Sistema Eléctrico y Climatización",
    part_name: "Fusibles y relés",
    description: "Limpieza de contactos en la caja de fusibles si hay fallos eléctricos esporádicos.",
    interval_km: 0, interval_months: 12, icon_key: "settings" },

  // ── Carrocería, Visibilidad y Otros ───────────────────────────
  { key: "wipers", category: "Carrocería, Visibilidad y Otros",
    part_name: "Escobillas limpiaparabrisas",
    description: "Sustitución cuando dejan marcas o hacen ruido.",
    interval_km: 15000, interval_months: 12, icon_key: "wiper" },
  { key: "washer_fluid", category: "Carrocería, Visibilidad y Otros",
    part_name: "Líquido limpiaparabrisas",
    description: "Rellenado.",
    interval_km: 0, interval_months: 6, icon_key: "spray" },
  { key: "body_repair", category: "Carrocería, Visibilidad y Otros",
    part_name: "Reparación de plásticos y anclajes",
    description: "Reconstrucción de pestañas rotas (calandra, paragolpes, pasos de rueda) usando masilla epoxi, arandelas o grapas nuevas.",
    interval_km: 0, interval_months: 0, icon_key: "wrench" },
  { key: "general_lubrication", category: "Carrocería, Visibilidad y Otros",
    part_name: "Engrase general",
    description: "Bisagras de puertas, capó, maletero y cerraduras.",
    interval_km: 0, interval_months: 12, icon_key: "spray" },
  { key: "exhaust", category: "Carrocería, Visibilidad y Otros",
    part_name: "Sistema de escape",
    description: "Comprobación de fugas, óxido y estado de los soportes de goma del silencioso.",
    interval_km: 40000, interval_months: 36, icon_key: "wrench" },
];

/** Agrupa los presets por categoría, preservando el orden del catálogo. */
export function groupPresetsByCategory(
  presets: MaintenancePreset[] = MAINTENANCE_PRESETS,
): Array<{ category: string; presets: MaintenancePreset[] }> {
  const groups = new Map<string, MaintenancePreset[]>();
  for (const p of presets) {
    const arr = groups.get(p.category) ?? [];
    arr.push(p);
    groups.set(p.category, arr);
  }
  return Array.from(groups.entries()).map(([category, presets]) => ({ category, presets }));
}

/** Resuelve un LucideIcon a partir de la clave. Wrench como fallback. */
export function getIconForKey(iconKey: string | null | undefined): LucideIcon {
  switch (iconKey) {
    // Lubricación / fluidos
    case "engine_oil":      return Droplet;
    case "engine_air_filter": return Wind;
    case "droplet":         return Droplet;
    case "coolant":         return Thermometer;
    case "spark":           return Lightbulb;
    case "coil":            return Settings2;
    case "belt":            return Cog;
    // Frenos
    case "brake_pads":      return Square;
    case "disc":            return Disc3;
    case "brake_hoses":     return Wrench;
    case "brake_calipers":  return Settings2;
    // Transmisión
    case "cog":             return Cog;
    case "settings":        return Settings2;
    // Ruedas / suspensión
    case "tire":            return CircleDot;
    case "circle_dot":      return CircleDot;
    // Eléctrico / climatización
    case "battery":         return Battery;
    case "wind":            return Wind;
    case "snowflake":       return Snowflake;
    case "bulb":            return Lightbulb;
    // Carrocería
    case "wiper":           return RotateCw;     // limpiaparabrisas: rotación
    case "spray":           return Droplet;      // líquido: gota
    // Genéricos
    case "wrench":          return Wrench;
    default:                return Wrench;
  }
}

/** Busca un preset por su key. Útil para rellenar el modal al
 *  pulsar un preset concreto. */
export function findPresetByKey(key: string): MaintenancePreset | undefined {
  return MAINTENANCE_PRESETS.find((p) => p.key === key);
}
