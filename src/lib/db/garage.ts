// Datos de la pantalla Garaje (mockup 1) y de la lista de vehículos
// (mockup 9). Reúne en un solo sitio lo que la tarjeta de vehículo necesita:
// gasto del mes, puntuación de salud y consumo medio.
//
// El gasto mensual ya venía resuelto en una sola consulta
// (getCarDashboardData); la puntuación y el consumo se calculan por coche,
// que en la práctica son unas pocas iteraciones —un garaje personal tiene
// entre uno y cinco vehículos, no cientos.

import { getCarDashboardData, type Car } from "./cars";
import { computeCarScore, type CarScore } from "./score";
import { getFuelConsumption } from "./metrics";

export interface GarageVehicle {
  car: Car & { gastoMensual: number };
  score: CarScore;
  /** Consumo medio en L/100km, o null si no hay dos repostajes con km. */
  consumption: number | null;
}

export function getGarageVehicles(opts: { includeArchived?: boolean } = {}): GarageVehicle[] {
  return getCarDashboardData(opts).map((car) => ({
    car,
    score: computeCarScore(car.id),
    consumption: getFuelConsumption(car.id).l100km,
  }));
}
