// Biblioteca de componentes. Las pantallas importan siempre desde aquí:
//
//   import { AppCard, AppButton, AppBadge } from "@/components/ui";
//
// Si una pantalla necesita algo que no está en esta lista, la respuesta es
// añadirlo aquí —no escribir JSX suelto con estilos propios.

export { default as AppLayout } from "./AppLayout";
export { default as AppHeader } from "./AppHeader";
export type { HeaderAction } from "./AppHeader";
export { default as AppBottomNavigation } from "./AppBottomNavigation";
export { default as AppCard } from "./AppCard";
export { default as AppButton } from "./AppButton";
export { default as AppFloatingButton } from "./AppFloatingButton";
export type { FabAction } from "./AppFloatingButton";
export { default as AppSection } from "./AppSection";
export { default as AppBadge } from "./AppBadge";
export { default as AppMetric } from "./AppMetric";
export { default as AppProgress, AppProgressRing } from "./AppProgress";
export { default as AppInput, AppTextarea } from "./AppInput";
export { default as AppSelect } from "./AppSelect";
export type { AppSelectOption } from "./AppSelect";
export { default as AppDatePicker } from "./AppDatePicker";
export { default as AppVehicleCard } from "./AppVehicleCard";
export type { VehicleMetric } from "./AppVehicleCard";
export { default as AppTimeline } from "./AppTimeline";
export type { TimelineGroup, TimelineEntry } from "./AppTimeline";
export { default as AppChart, DonutChart, LineChart, BarChart } from "./AppChart";
export { default as AppStatCard } from "./AppStatCard";
export { default as AppEmptyState } from "./AppEmptyState";
export { default as AppDocumentCard } from "./AppDocumentCard";
export { default as AppMaintenanceCard } from "./AppMaintenanceCard";
export { default as AppExpenseCard } from "./AppExpenseCard";
export { default as AppListTile } from "./AppListTile";
export { default as AppModal } from "./AppModal";
export { default as AppDivider } from "./AppDivider";
export { default as AppIconChip } from "./AppIconChip";
export { default as AppTypeTile } from "./AppTypeTile";
export { default as AppTabs } from "./AppTabs";
export type { AppTab } from "./AppTabs";
export {
  default as AppSkeleton,
  AppRowSkeleton,
  AppVehicleCardSkeleton,
} from "./AppSkeleton";
export { cn } from "./cn";
