// Una sola familia de iconos: lucide-react.
//
// Los componentes NO reciben el componente de icono, sino su nombre (`"fuel"`,
// `"wrench"`…) y lo resuelven contra este registro. Dos razones:
//
//   1. Serializable. Las pantallas son Server Components y las tarjetas son
//      Client Components; React no puede pasar una función a través de esa
//      frontera. Un string sí cruza.
//   2. Cerrado. El registro es la única puerta de entrada de iconos, así que
//      mezclar familias exige tocar este archivo — imposible que se cuele en
//      una pantalla sin que salte en la revisión.
//
// El tipo `IconName` es una unión de las claves, de modo que un nombre mal
// escrito es un error de compilación, no un icono que falta en runtime.

import {
  Menu, Bell, Plus, X, ArrowLeft, ChevronRight, ChevronDown, ChevronLeft,
  MoreHorizontal, SlidersHorizontal, Settings, Settings2, Info, Search,
  Check, Pencil, Trash2, Share2, Download, Upload, CloudUpload, Camera,
  Home, Activity, Wrench, FileText,
  Fuel, Euro, Disc3, Shield, CircleParking, Package, Droplet, Gauge,
  Battery, Lightbulb, Snowflake, Wind, Cog, RotateCw, CircleDot,
  Thermometer, Square, Sparkles, Receipt, Landmark,
  AlertTriangle, CircleAlert, CircleCheck, Clock, Calendar, CalendarDays,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, CircleHelp,
  Car, User, HardDrive, LogOut, Lock, Image as ImageIcon, FileImage,
  type LucideIcon,
} from "lucide-react";

export type { LucideIcon };

// Reexportación de los componentes en crudo. Sirve para el caso en que un
// componente dibuja un icono FIJO en su propio JSX (la X de cerrar del modal,
// el chevron de un desplegable): ahí no hay frontera servidor/cliente que
// cruzar y pasar por el registro solo añadiría ruido.
//
// Para un icono que llega COMO PROP hay que usar `IconName` — no estos.
export {
  Menu, Bell, Plus, X, ArrowLeft, ChevronRight, ChevronDown, ChevronLeft,
  MoreHorizontal, SlidersHorizontal, Settings, Settings2, Info, Search,
  Check, Pencil, Trash2, Share2, Download, Upload, CloudUpload, Camera,
  Home, Activity, Wrench, FileText,
  Fuel, Euro, Disc3, Shield, CircleParking, Package, Droplet, Gauge,
  Battery, Lightbulb, Snowflake, Wind, Cog, RotateCw, CircleDot,
  Thermometer, Square, Sparkles, Receipt, Landmark,
  AlertTriangle, CircleAlert, CircleCheck, Clock, Calendar, CalendarDays,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, CircleHelp,
  Car, User, HardDrive, LogOut, Lock, ImageIcon, FileImage,
};

export const ICONS = {
  // Navegación y chrome
  menu: Menu,
  bell: Bell,
  plus: Plus,
  close: X,
  back: ArrowLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  more: MoreHorizontal,
  filter: SlidersHorizontal,
  settings: Settings,
  preferences: Settings2,
  info: Info,
  search: Search,
  check: Check,
  edit: Pencil,
  delete: Trash2,
  share: Share2,
  download: Download,
  upload: Upload,
  cloudUpload: CloudUpload,
  camera: Camera,

  // Navbar contextual
  home: Home,
  activity: Activity,
  wrench: Wrench,
  document: FileText,

  // Categorías de gasto y piezas
  fuel: Fuel,
  euro: Euro,
  tire: Disc3,
  shield: Shield,
  parking: CircleParking,
  part: Package,
  droplet: Droplet,
  gauge: Gauge,
  battery: Battery,
  bulb: Lightbulb,
  snowflake: Snowflake,
  wind: Wind,
  cog: Cog,
  rotate: RotateCw,
  circleDot: CircleDot,
  thermometer: Thermometer,
  square: Square,
  sparkles: Sparkles,
  receipt: Receipt,
  tax: Landmark,

  // Estado y feedback
  warning: AlertTriangle,
  alert: CircleAlert,
  success: CircleCheck,
  clock: Clock,
  calendar: Calendar,
  calendarDays: CalendarDays,
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  arrowUpRight: ArrowUpRight,
  arrowDownRight: ArrowDownRight,
  help: CircleHelp,

  // Vehículo y perfil
  car: Car,
  user: User,
  backup: HardDrive,
  logout: LogOut,
  lock: Lock,
  image: ImageIcon,
  fileImage: FileImage,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Resuelve un nombre a su componente. Un nombre desconocido devuelve el
 *  icono genérico en lugar de romper el render: una fila sin icono es un
 *  defecto cosmético, una pantalla en blanco no. */
export function resolveIcon(name: IconName | undefined | null): LucideIcon {
  return (name && ICONS[name]) || ICONS.circleDot;
}

/** Tamaños de icono permitidos, ligados a la jerarquía tipográfica. */
export const iconSize = {
  /** Dentro de un badge o junto a un caption. */
  xs: 12,
  /** Metadatos, chevrons de fila. */
  sm: 16,
  /** Tamaño por defecto: chips de icono, acciones del header. */
  md: 20,
  /** Navbar inferior, acciones destacadas. */
  lg: 24,
  /** Icono del FAB y de los estados vacíos pequeños. */
  xl: 28,
} as const;

export type IconSizeToken = keyof typeof iconSize;

/** Grosor de trazo por defecto. El mockup usa un trazo algo más fino que el
 *  de lucide (2) salvo en el FAB, donde el "+" es más grueso. */
export const strokeWidth = {
  default: 1.75,
  bold: 2.4,
} as const;
