// Barrel — re-exporta todos los modulos de db/
// audit:M-1 — Consolidado: db/index.ts eliminado, todas las exports aquí.
export { getDb, getSetting, setSetting } from "./db/core";
export type { Car } from "./db/cars";
export { getCars, getCar, createCar, updateCar, deleteCar, getCarDashboardData } from "./db/cars";
export type { Expense } from "./db/expenses";
export { getExpenses, getExpense, createExpense, updateExpense, deleteExpense } from "./db/expenses";
export type { CarNote } from "./db/notes";
export { getCarNotes, createCarNote, deleteCarNote } from "./db/notes";
export type { Attachment } from "./db/attachments";
export { getAttachments, createAttachment, deleteAttachment } from "./db/attachments";
export { getMonthlySpend, getDiySavings, getFuelConsumption, getTotalCostPerKm, getCarMetrics, getTimeline, getMonthlyHistory, computeCarEstado } from "./db/metrics";
export { DEFAULT_MANTENIMIENTO, getMantenimientoConfig, saveMantenimientoConfig } from "./db/maintenance";
export type { MaintenanceTask } from "./db/maintenance";
export { getMaintenanceTasks, createMaintenanceTask, updateMaintenanceTask, completeMaintenanceTask, deleteMaintenanceTask, getOpenMaintenanceTasksByPreset } from "./db/maintenance";
// audit:M-1 — getKmStats exportado aquí (antes solo en db/index.ts que se eliminó)
export { getKmStats } from "./db/cars";
export type { KmStats } from "./db/cars";