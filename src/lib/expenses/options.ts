// Opciones de los pasos de gasto y de repostaje del asistente.
//
// Se guardan como texto tal cual se muestran: son etiquetas para el usuario,
// no claves de negocio (nada las consulta para calcular nada), así que un
// valor nuevo no obliga a migrar filas antiguas.

export const PAYMENT_METHODS = ["Tarjeta", "Efectivo", "Transferencia", "Domiciliado"] as const;
