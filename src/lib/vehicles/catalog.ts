// Listas cerradas del asistente de vehículo.
//
// El paso 1 del mockup enseña un buscador de marca con "recientes" y
// "populares": las recientes salen del propio garaje (las marcas que ya
// tienes), las populares de esta lista. No es un catálogo exhaustivo de la
// industria —eso pide una API externa—, es el atajo para no teclear en el
// 90% de los casos. Escribir una marca que no está sigue funcionando.

export const POPULAR_BRANDS = [
  "Toyota", "BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Seat", "Renault",
  "Peugeot", "Citroën", "Ford", "Opel", "Honda", "Hyundai", "Kia", "Mazda",
  "Nissan", "Skoda", "Volvo", "Fiat", "Dacia", "Mini", "Jeep", "Land Rover",
  "Porsche", "Tesla", "Alfa Romeo", "Suzuki", "Subaru", "Lexus", "Cupra",
] as const;

export const FUEL_TYPES = ["Gasolina", "Diésel", "Híbrido", "Eléctrico", "GLP"] as const;

export const TRANSMISSIONS = ["Manual", "Automático", "Semiautomático"] as const;

export const DRIVETRAINS = ["Delantera", "Trasera", "Total (4x4)"] as const;

/** Años seleccionables: del actual hacia atrás. 60 años cubre cualquier
 *  coche de uso normal y un clásico razonable sin convertir la rueda del
 *  selector en un scroll infinito. */
export function vehicleYears(count = 60): string[] {
  const current = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => String(current - i));
}
