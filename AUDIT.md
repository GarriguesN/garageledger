# Auditoría Técnica — GarageLedger

**Rama**: `audit/tech-debt` (creada desde `re-styling`)
**Fecha**: 2026-07-23
**Auditor**: Arquitecto de Software Senior (Hermes Agent)
**Propósito**: Documentar todos los cambios aplicados para que el agente/modelo que trabaja en `re-styling` tenga contexto completo al hacer merge.

---

## Resumen Ejecutivo

Estado de salud: **Sólido (7/10)** con issues accionables.

GarageLedger es una PWA single-user bien construida sobre Next.js 16 App Router con TypeScript estricto, arquitectura estratificada (middleware → API routes → `lib/db/*` → SQLite), y seguridad base robusta. Se detectaron 2 issues críticos, 5 altos, 9 medios y 6 bajos.

---

## Cambios Aplicados en Esta Rama

### Convenciones para el Merge

- **Prefijo de commit**: `audit:` para todos los cambios de esta rama.
- **No se toca UI/UX**: Los cambios son de backend, seguridad, tipado y limpieza. La única excepción es `CompleteMaintenanceModal.tsx` (bug fix funcional) y `settings/page.tsx` (bug fix del botón Eliminar PIN).
- **No se añaden dependencias**: Todo se resuelve con código existente.
- **Compatibilidad**: Todos los cambios son retrocompatibles con la BD existente (no hay migraciones de schema).

---

### 🔴 C-1 — Fallback de `SESSION_SECRET` permite forjar sesiones en producción

**Archivos modificados**: `src/lib/auth.ts`, `middleware.ts`

**Problema**: Si `SESSION_SECRET` no está configurada (o tiene <32 chars), el código usa un secreto hardcoded visible en el código fuente. Un atacante puede firmar cookies válidas con ese secreto y bypassar el PIN.

**Cambio aplicado**: `getSecret()` ahora lanza un error en `NODE_ENV=production` si no hay secreto válido. El fallback débil solo funciona en dev.

```typescript
// ANTES
function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  return "garageledger-dev-secret-do-not-use-in-prod-min-32chars";
}

// DESPUÉS
function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET no configurada o demasiado corta...");
  }
  return "garageledger-dev-secret-do-not-use-in-prod-min-32chars";
}
```

**⚠️ Nota para merge**: Si tu código en `re-styling` añade nuevas llamadas a `getSecret()`, asegúrate de que no se llame en el scope del módulo (solo dentro de funciones), para que el throw no bloquee el build.

---

### 🔴 C-2 — Bug funcional: "Eliminar PIN" siempre falla en Settings

**Archivos modificados**: `src/app/api/pin/route.ts`, `src/app/settings/page.tsx`

**Problema**: El botón "Eliminar" envía `{ action: 'set', pin: '' }`, pero la validación del servidor rechaza cualquier PIN con `length < 4`. El usuario pulsa "Eliminar", no ve feedback de error (el catch no muestra el mensaje del 400), y el PIN persiste.

**Cambio aplicado**: Añadida acción `unset` explícita en la API que borra el PIN y limpia la cookie de sesión. El frontend actualizado para usar `action: 'unset'`.

```typescript
// api/pin/route.ts — nueva acción
if (action === "unset") {
  setSetting("pin", "");
  const res = NextResponse.json({ success: true });
  res.headers.append("Set-Cookie", clearSessionCookie());
  return res;
}
```

---

### 🟠 A-1 — Validación de input en API routes

**Archivos modificados**: `src/lib/validate.ts` (nuevo), todas las `route.ts`

**Problema**: Ninguna API route (excepto pin y attachments) valida tipos o presencia de campos del body. `body.carId` puede ser `undefined`, `body.importe` puede ser negativo, etc.

**Cambio aplicado**: Creado `src/lib/validate.ts` con helpers `parseCarId`, `parseAmount`, `parseString`, etc. Aplicado a todas las API routes.

**⚠️ Nota para merge**: Si añades nuevas API routes en `re-styling`, usa los helpers de `@/lib/validate` para validar el input. Los helpers devuelven `null` en lugar de lanzar, así que el patrón es:

```typescript
import { parseCarId, parseAmount } from "@/lib/validate";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const carId = parseCarId(body.carId);
  const importe = parseAmount(body.importe);
  if (!carId || importe === null) {
    return NextResponse.json({ error: "carId e importe son requeridos" }, { status: 400 });
  }
  // ...
}
```

---

### 🟠 A-2 — `getCarMetrics` ejecuta un UPDATE durante un GET

**Archivo modificado**: `src/lib/db/metrics.ts`

**Problema**: `getCarMetrics` hace `UPDATE cars SET estado=?` si el estado computado difiere del persisted. Un GET que muta rompe idempotencia, impide caching HTTP y puede causar race conditions.

**Cambio aplicado**: El estado ahora se computa en runtime y se devuelve como parte de la respuesta, sin persistirlo en el GET. Se añadió `refreshCarEstado(carId)` para llamarlo desde mutaciones explícitas (createExpense, updateCar, completeMaintenanceTask, etc.).

```typescript
// ANTES: getCarMetrics hacia UPDATE
const newEstado = computeCarEstado(car);
if (newEstado !== car.estado) {
  getDb().prepare("UPDATE cars SET estado=? WHERE id=?").run(newEstado, car.id);
}

// DESPUÉS: solo computa, no persiste
const estado = car ? computeCarEstado(car, tasks) : null;
return { ..., estado };
```

**⚠️ Nota para merge**: La propiedad `estado` ahora viene en `metrics.estado` (no en `car.estado`). Si tu código en `re-styling` lee `car.estado`, debe leer `metrics.estado` o llamar a `refreshCarEstado(carId)` después de mutaciones. La función `refreshCarEstado` está exportada desde `@/lib/db`.

---

### 🟠 A-4 — `X-Forwarded-For` spoofable para bypass de rate limiting

**Archivo modificado**: `src/app/api/pin/route.ts`

**Problema**: El rate limiting usa la primera IP de `X-Forwarded-For`, que el cliente puede enviar arbitrariamente para obtener un bucket fresco.

**Cambio aplicado**: Solo se confía en `x-real-ip` (establecido por nginx en CT 105). `X-Forwarded-For` ya no se usa para rate limiting.

```typescript
// ANTES
function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) { ... }
  const real = req.headers.get("x-real-ip");
  // ...
}

// DESPUÉS
function clientIp(req: NextRequest): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "local";
}
```

**⚠️ Nota para merge**: Asegúrate de que nginx (CT 105) está configurado con `proxy_set_header X-Real-IP $remote_addr;`. Si no, todas las requests se rate-limitarán como "local" (un solo bucket compartido).

---

### 🟠 A-5 — N+1 queries en `getCarDashboardData`

**Archivo modificado**: `src/lib/db/cars.ts`

**Problema**: Por cada coche en el dashboard, se ejecuta un SELECT separado para calcular el gasto mensual. Con N coches = N+1 queries.

**Cambio aplicado**: Una sola query con subconsulta correlacionada.

```sql
-- ANTES: N+1 queries
SELECT * FROM cars;
SELECT COALESCE(SUM(importe),0) FROM expenses WHERE car_id=? AND strftime('%Y-%m', date)=?; -- × N

-- DESPUÉS: 1 query
SELECT c.*, COALESCE(
  (SELECT SUM(importe) FROM expenses WHERE car_id = c.id AND strftime('%Y-%m', date) = ?), 0
) as gastoMensual
FROM cars c ORDER BY c.marca, c.modelo;
```

---

### 🟡 M-1 — Doble barrel innecesario (`lib/db.ts` + `lib/db/index.ts`)

**Archivos modificados**: `src/lib/db/index.ts` (eliminado), imports actualizados en todos los archivos que referenciaban `@/lib/db/index` o `@/lib/db/notes` etc.

**Problema**: Dos archivos barrel para los mismos módulos con exports ligeramente distintos. Algunos componentes importan de `@/lib/db`, otros de `@/lib/db/cars` directamente.

**Cambio aplicado**: `src/lib/db/index.ts` eliminado. `src/lib/db.ts` es ahora el barrel único. Todos los imports `@/lib/db/notes`, `@/lib/db/attachments` etc. ahora importan vía `@/lib/db` o directamente del módulo específico (`@/lib/db/notes` sigue funcionando porque el archivo existe).

**⚠️ Nota para merge**: Si tienes imports directos como `import { X } from "@/lib/db/notes"`, seguirán funcionando porque los archivos individuales siguen ahí. Solo se eliminó el barrel intermedio `index.ts`.

---

### 🟡 M-5 — `CompleteMaintenanceModal.tsx` — DOM queries dentro de React

**Archivo modificado**: `src/app/coches/[id]/components/CompleteMaintenanceModal.tsx`

**Problema**: El modal hace `document.querySelector("#cm-date")` dentro de handlers de React. Además, el input de fecha tiene `value={carKm ? "" : today}` que muestra vacío cuando `carKm > 0`.

**Cambio aplicado**: Estado local con `useState` para km y date. Eliminados los `document.querySelector`.

---

### 🟡 M-6 — Sin transacciones en operaciones multi-paso

**Archivo modificado**: `src/lib/db/maintenance.ts`

**Problema**: `completeMaintenanceTask` hace un UPDATE + INSERT sin transacción. Si el proceso muere entre las dos operaciones, la BD queda en estado inconsistente.

**Cambio aplicado**: Envuelto en `db.transaction()`.

---

### 🟡 M-7 — `computeCarEstado` hace queries redundantes

**Archivo modificado**: `src/lib/db/metrics.ts`

**Problema**: `computeCarEstado` ejecuta `SELECT * FROM maintenance_tasks` que ya se ejecutó en `getCarMetrics`.

**Cambio aplicado**: `computeCarEstado` ahora acepta `tasks` como parámetro opcional. Si no se pasan, carga las tareas (backward compatible).

---

### 🟡 M-8 — `ThemeProvider.tsx` es un no-op

**Archivos modificados**: `src/components/ThemeProvider.tsx` (eliminado), `src/app/layout.tsx`

**Problema**: Crea un context con `{ theme: 'light' }` hardcoded, sin mecanismo para cambiarlo, y `useTheme()` nunca se usa.

**Cambio aplicado**: Componente eliminado. Wrapper `<ThemeProvider>` eliminado de `layout.tsx`.

---

### 🟡 M-9 — Categorías duplicadas entre `constants.ts` y `format.tsx`

**Archivos modificados**: `src/app/coches/[id]/lib/format.tsx`

**Problema**: `CATEGORIES` en `lib/constants.ts` define id+label+color. `CATEGORIAS` en `format.tsx` define una lista de strings de los labels, y `TIPO_COLOR` define un color por label. Colores desincronizados (ej: ITV es `#211a1e` en constants pero `#8b5cf6` en format.tsx).

**Cambio aplicado**: `format.tsx` ahora deriva `CATEGORIAS` y `TIPO_COLOR` de `@/lib/constants`. El archivo `constants.ts` es el origen único de verdad.

**⚠️ Nota para merge**: Si añades categorías nuevas en `re-styling`, añádelas en `src/lib/constants.ts` únicamente. `format.tsx` las derivará automáticamente.

---

## Issues No Aplicados (Deferidos a `re-styling`)

Los siguientes issues se identificaron pero no se aplicaron en esta rama por ser cambios de arquitectura mayor que pueden conflictar con el trabajo en `re-styling`:

| ID | Issue | Razón para defer |
|---|---|---|
| A-3 | God Component `CarDetailClient.tsx` (533 líneas) | Requiere refactor masivo que puede conflictar con features en `re-styling` |
| M-2 | Tipos duplicados `Car` | Requiere alinear imports en muchos componentes |
| M-3 | Paletas de color duplicadas en 6+ componentes | Cambio estético que debe coordinarse con `re-styling` |
| M-4 | TopBar DOM scraping anti-patrón | Requiere rework del sistema de matrícula |
| B-1 | `Promise.all` para ops síncronas | Cosmético, sin impacto funcional |
| B-2 | Código muerto (`TrendIcon`, `toastOnError`, etc.) | Puede usarse en `re-styling` |
| B-3 | `dangerouslySetInnerHTML` para SW | Cosmético, no explotable |
| B-4 | `getTimeline` sin paginación | Requiere cambio de UX |
| B-5 | Sin framework de migraciones | Requiere evaluación de dependencias |
| B-6 | `strokeWidth` inconsistente | Cosmético |

---

## Cambios por Archivo (Resumen técnico)

```
src/lib/auth.ts                          | getSecret() ahora throw en prod
src/lib/validate.ts (NUEVO)              | Helpers de validación parseCarId, parseAmount...
src/lib/db.ts                            | Barrel único (index.ts eliminado)
src/lib/db/index.ts (ELIMINADO)          | Consolidado en db.ts
src/lib/db/cars.ts                       | N+1 fix en getCarDashboardData
src/lib/db/metrics.ts                    | GET no muta + computeCarEstado con tasks param
src/lib/db/maintenance.ts                | Transacción en completeMaintenanceTask
src/app/api/pin/route.ts                | Acción unset + XFF fix + validación
src/app/api/cars/route.ts               | Validación de input
src/app/api/expenses/route.ts           | Validación de input
src/app/api/maintenance/route.ts        | Validación de input
src/app/api/notes/route.ts              | Validación de input
src/app/api/attachments/route.ts        | Validación de input
src/app/api/car/[id]/page-data/route.ts | Validación de id
src/app/api/car/[id]/metrics/route.ts   | Validación de id
src/app/api/car/[id]/timeline/route.ts  | Validación de id
src/app/api/car/[id]/export/route.ts    | Validación de id
src/app/settings/page.tsx               | Botón eliminar PIN usa action: 'unset'
src/app/coches/[id]/components/CompleteMaintenanceModal.tsx | Fix DOM queries + estado local
src/app/coches/[id]/lib/format.tsx      | CATEGORIAS/TIPO_COLOR derivados de constants
src/app/layout.tsx                       | ThemeProvider eliminado
src/components/ThemeProvider.tsx (ELIMINADO) | No-op
middleware.ts                            | getSecret() consistencia con auth.ts
```

---

## Cómo Hacer el Merge

```bash
# Desde re-styling
git merge audit/tech-debt

# Si hay conflictos en:
# - src/app/settings/page.tsx: conserva la versión de audit/tech-debt para el botón Eliminar
# - src/lib/db/metrics.ts: conserva el cambio de no-mutar-en-GET
# - src/app/coches/[id]/components/CompleteMaintenanceModal.tsx: conserva la versión con useState
# - src/app/coches/[id]/lib/format.tsx: conserva la derivación desde constants
# - src/app/layout.tsx: fusiona (elimina ThemeProvider wrapper, conserva el resto)
```

---

## Testing Post-Merge

1. `cd /root/work/garageledger && npx tsx scripts/test-session-parse.ts` — verificar que el session parsing sigue funcionando
2. `npx tsx scripts/test-middleware-coverage.ts` — verificar middleware
3. Verificar que `SESSION_SECRET` está en `.env` del CT 119
4. Abrir Settings → Eliminar PIN → debe funcionar ahora
5. Verificar que nginx (CT 105) tiene `proxy_set_header X-Real-IP $remote_addr;`
6. `npm run build` — debe pasar sin errores