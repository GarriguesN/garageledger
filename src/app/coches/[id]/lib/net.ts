// Helpers compartidos para llamadas fetch en el cliente.
//
// Ticket 1.4: cada mutación debe cubrir tres escenarios:
//
//   1. La red falla (fetch rechaza) → toast "No se pudo conectar con el servidor…".
//   2. El servidor devuelve status no-2xx (res.ok === false) y, opcionalmente,
//      un JSON `{ error: string }` → usamos ESE mensaje; si no hay `error`,
//      caemos al mensaje genérico `fallback`.
//   3. Todo va bien → no se muestra toast (lo muestra `fetchJsonWithToast` solo
//      si falla; el llamador se encarga del toast de éxito si quiere).
//
// Estos helpers viven en `lib/` porque otros screens (configuración, etc.) los
// necesitarán cuando se les añada el mismo patrón.

export interface ToastFn {
  (t: { msg: string; type: "success" | "error" }): void;
}

export interface FetchJsonOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: BodyInit | null;
  // Mensaje genérico cuando el servidor no devuelve `{ error }` legible.
  fallback: string;
  // Etiqueta humana del recurso (para mensajes tipo "No se pudo guardar el gasto").
  action?: string;
}

/**
 * Realiza un fetch, lee el body como JSON, y verifica `res.ok`. Si algo
 * falla, dispara toast `error` con el mensaje más específico posible y
 * devuelve `null` (o el body crudo si el llamador quiere inspeccionarlo en
 * el caso de éxito).
 *
 * Devuelve `{ ok: true, data }` en éxito o `{ ok: false }` en cualquier
 * fallo (red, status no-2xx, JSON inválido). El toast SIEMPRE se dispara
 * dentro de este helper — el llamador no debe añadir otro toast para la
 * misma petición.
 */
export async function fetchJsonWithToast(
  url: string,
  opts: FetchJsonOptions,
  setToast: ToastFn,
): Promise<{ ok: true; data: unknown } | { ok: false }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: opts.headers,
      body: opts.body,
    });
  } catch {
    // Network / DNS / CORS / servidor caído — fetch rechaza.
    setToast({ msg: "No se pudo conectar con el servidor. Inténtalo de nuevo.", type: "error" });
    return { ok: false };
  }

  // Parseamos el cuerpo SIEMPRE que sea JSON válido. El parseo puede fallar
  // (HTML 500, respuesta vacía, proxy que devuelve text/html) — lo tratamos
  // como cuerpo ilegible, pero NO abortamos la lectura de `res.ok`.
  let data: unknown = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    // Buscar mensaje de error en el body. Aceptamos `{ error: string }` (forma
    // canónica de GarageLedger; ver `src/app/api/*/route.ts`) y `{ message }`
    // como fallback de cortesía.
    const apiError =
      (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : null) ??
      (data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : null);

    setToast({
      msg: apiError || opts.fallback,
      type: "error",
    });
    return { ok: false };
  }

  return { ok: true, data };
}

/**
 * Shortcut para errores de red en mutaciones: si `res` falló, lanza el toast
 * y devuelve `true` para que el llamador aborte la parte optimista (no cerrar
 * formularios, no vaciar inputs, no mostrar toast de éxito). Pensado para
 * mutaciones donde ya hay toast configurado por el llamador en éxito.
 */
export function toastOnError(
  res: { ok: boolean } | null,
  fallbackMsg: string,
  setToast: ToastFn,
  action?: string,
): void {
  // Éxito: nada que hacer.
  if (res && res.ok) return;
  // Falla sin `res` (no se llegó a llamar fetchJsonWithToast) — confiamos
  // en `fetchJsonWithToast` para redes caídas. Aquí solo cubrimos el caso
  // defensivo en que un llamador construye su propio flujo.
  if (!res) {
    setToast({ msg: action ? `No se pudo ${action}. ${fallbackMsg}` : fallbackMsg, type: "error" });
    return;
  }
  setToast({ msg: fallbackMsg, type: "error" });
}
