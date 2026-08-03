# AGENTS.md — Guía para agentes de IA

Este archivo permite a **cualquier agente** (Zed, Claude Code, Cursor, Codex, Windsurf…) trabajar en GarageLedger de forma segura y consistente. Léelo completo antes de tocar código, y respeta sus reglas como si fueran del propio usuario.

---

## 1. ¿Qué es GarageLedger?

PWA de uso personal (un solo propietario, multi-vehículo) para controlar gastos y mantenimientos del coche: repostajes, talleres, ITV, seguro, IVTM, documentos escaneados y avisos de vencimiento.

- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript ~5.7 + Tailwind CSS 4 + SQLite (`better-sqlite3`, WAL) + Chart.js.
- **Despliegue:** `output: "standalone"` en un servidor personal tras nginx (CT 119 → `https://garageledger.nglab.es`).
- **Idioma del código:** comentarios y mensajes de error **en español** (convención del proyecto, mantenerla).
- Los cambios se referencian por **tickets** (p. ej. "Ticket 1.16") en comentarios y mensajes de commit; mantener ese patrón.

## 2. Comandos

| Comando | Qué hace | Obligatorio antes de terminar |
|---|---|---|
| `npm run dev` | Servidor de desarrollo | — |
| `npm run typecheck` | `tsc --noEmit` | SIEMPRE (debe quedar en 0 errores) |
| `npm run lint` | ESLint | SIEMPRE (0 errores; no añadir warnings nuevos) |
| `npm test` | 21 scripts de test vía `scripts/run-tests.ts` | SIEMPRE cuando se toca lógica |
| `npm run build` | Build de producción | Cuando se toca config/despliegue |

## 3. Mapa del código

```
src/
  app/                    # Páginas (Server Components) y rutas API
    api/                  #   Route Handlers (pin, session, cars, expenses, …)
    coches/               #   Pantallas del detalle de vehículo
  components/             # Componentes cliente (ui/, wizard(s)/)
  lib/
    auth.ts               # PIN (scrypt), sesiones HMAC-SHA256, rate-limit
    validate.ts           # Helpers de validación (parseId, parseAmount, …)
    attachments.ts        # Reglas de subida/descarga de adjuntos
    db/                   # Capa de datos (better-sqlite3 síncrono, singleton)
      core.ts             #   Conexión, esquema, migraciones, seed
      cars.ts, expenses.ts, maintenance.ts, notes.ts, attachments.ts,
      metrics.ts, score.ts, garage.ts
    ui/                   # Traducciones dominio → presentación
  design/tokens/          # Tokens de diseño (colores, tipografía, iconos)
scripts/                  # backup + tests (test-*.ts)
middleware.ts             # Edge auth: valida la cookie de sesión
```

**Patrón de datos:** las páginas y las rutas API leen SQLite **directamente** (síncrono, sin ORM, sin capa HTTP intermedia). Toda query usa *prepared statements* con `?` — nunca concatenar input.

## 4. Convenciones

- **API:** handlers en `src/app/api/**/route.ts`; validar input con los helpers de `src/lib/validate.ts` (no `parseInt`/`parseFloat` crudos); devolver `{ error }` con el status adecuado (400/401/404/413/415/429).
- **BD:** whitelists de columnas para `UPDATE` dinámicos (ver `updateCar`); transacciones `db.transaction()` para operaciones multi-query (`completeMaintenanceTask`).
- **Migraciones:** idempotentes en `migrateSchema()` (comprobar columnas con `PRAGMA table_info` antes de `ALTER TABLE`); añadir columnas nunca borrarlas.
- **UI:** Server Components por defecto; `"use client"` solo para piezas interactivas; `dynamic = "force-dynamic"` en páginas que leen la BD.
- **Seguridad heredada (no romper):**
  - `POST /api/pin` con `set`/`unset` **exige sesión válida si ya hay PIN configurado** (el primer uso sin PIN sí está permitido). No reintroducir el bug de CWE-306.
  - Adjuntos: validar tamaño → MIME → coherencia extensión↔MIME **antes** de escribir a disco; servir siempre como `attachment` (nunca `inline`), con `X-Content-Type-Options: nosniff` y chequeo de path traversal.
  - `SESSION_SECRET` ≥ 32 chars; nunca commitear `.env`; la BD (`data/`) está en `.gitignore`.

## 5. Reglas no negociables

1. **No mutar `data/garageledger.db`** (BD de desarrollo). Los tests deben usar BD temporales (`process.env.DB_PATH` apuntando a `os.tmpdir()`) y limpiar después. Nunca hardcodear `/opt/garageledger/...` en código de test (rompe en cualquier máquina que no sea el servidor).
2. **No añadir warnings de lint ni errores de typecheck.** La deuda existente (`any`, código muerto) se puede limpiar, pero no crecer.
3. **No dejar ficheros huérfanos en disco** al borrar adjuntos (borrar fila + `unlink`).
4. **No dejar ficheros huérfanos en disco** al borrar adjuntos (borrar fila + `unlink`).
5. **Cero emojis en la app.** Ninguna cadena que el usuario pueda ver (UI, mensajes de error, toasts, empty states, novedades de `src/lib/changelog.ts`) puede contener emojis. Para iconos y estado visual se usa SIEMPRE el catálogo de `src/design/tokens/icons.ts` (lucide). Esto incluye los changelogs: `CHANGELOG.md` y las entradas de `src/lib/changelog.ts` se escriben sin emojis.
6. **No tocar la versión por libre** (ver sección siguiente): todo bump de versión va acompañado de su entrada en `CHANGELOG.md`.

## 6. Versionado y CHANGELOG (OBLIGATORIO)

> **Regla de oro: cualquier cambio en el proyecto (código, config, docs, tooling) actualiza la versión y añade su entrada en `CHANGELOG.md`, en el mismo commit que el cambio.**

### 6.1 SemVer (MAJOR.MINOR.PATCH)

| Bump | Cuándo | Ejemplo |
|---|---|---|
| **MAJOR** (`X.y.z`) | Cambios incompatibles: migraciones de BD destructivas, API breaking, stack nuevo | `2.0.0` |
| **MINOR** (`x.Y.z`) | Nueva funcionalidad visible (un ticket cerrado) | `1.6.0` |
| **PATCH** (`x.y.Z`) | Bugfixes, refactors internos, docs, tooling | `1.5.1` |

### 6.2 Dónde vive la versión

- **Fuente de verdad:** `package.json` → `version`.
- **`deploy.sh`** imprime la versión leyéndola de `package.json` automáticamente (no hardcodear la cifra ahí).
- **Novedades visibles en la app:** la pantalla Perfil → "Novedades" muestra `src/lib/changelog.ts` (release notes humanizadas, en lenguaje natural). Todo cambio de funcionalidad visible añade ahí su entrada — en el mismo commit que el cambio y que la de `CHANGELOG.md`. El `CHANGELOG.md` técnico (Keep a Changelog) sigue siendo para el repo; `changelog.ts` es lo que ve el usuario.

### 6.3 Cómo hacerlo (checklist por cambio)

1. Haz el cambio de código.
2. Sube `version` en `package.json` según la tabla de SemVer.
3. Añade la entrada en `CHANGELOG.md` bajo el formato *Keep a Changelog* (ver archivo):
   - Si hay trabajo en curso sin publicar: documenta bajo `## [Unreleased]`.
   - Si el cambio se publica/despliega: mueve el contenido de `Unreleased` a una sección `## [x.y.z] - YYYY-MM-DD` y deja `Unreleased` vacío para lo siguiente.
4. Si el cambio es visible para el usuario: añade su entrada humanizada en `src/lib/changelog.ts` (más reciente primero, `version` igual que en `package.json`).
5. Referencia el ticket si existe (p. ej. `- Fix: ... (Ticket 1.22)`).
6. Verifica: `npm run typecheck` + `npm run lint` + `npm test` (si aplica).

### 6.4 Categorías para el changelog

- `Añadido` — nueva funcionalidad
- `Corregido` — bugfixes
- `Seguridad` — parches de seguridad (¡se sube **siempre** PATCH como mínimo!)
- `Rendimiento` — optimizaciones
- `Refactor` — cambios internos sin comportamiento visible
- `Docs` / `Tooling` — documentación e infraestructura

### 6.5 Referencias

- `README.md` — env vars, backups y restauración.
- `AUDIT.md` — auditoría de código (hallazgos de seguridad y deuda técnica pendiente).
