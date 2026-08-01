# GarageLedger — Premium UI Rebuild Plan

> **Estado: ejecutado.** Las 13 pantallas están construidas y verificadas.
> Lo que cambió respecto a este plan durante la ejecución:
>
> - **Iconos por nombre, no por componente.** React no serializa funciones de
>   Server a Client Component, así que los iconos viajan como `IconName` y se
>   resuelven en `<AppIcon>`. El registro cierra además la familia de iconos.
> - **`cars.foto_attachment_id` ya existía**: la migración §1.1 no hizo falta.
> - **Sin `/dev/ui`**: la verificación se hizo midiendo geometría y estilos
>   computados en iframes a cada breakpoint, que es más preciso que comparar
>   capturas a ojo (y las capturas no funcionaban en este entorno).
> - **Contraste**: el gate destapó que el gris atenuado no llegaba a AA; se
>   corrigió el token.
> - **Pendiente**: `/coches/[id]/insights` no está enlazada desde la barra
>   inferior (se llega desde la tarjeta de consumo del resumen), y las notas
>   del vehículo (`/api/notes`) se quedaron sin pantalla en la nueva UI.

Source of truth: the two mockup boards (12 screens, dark automotive theme). No
interpretation — every spacing, hierarchy, component and interaction is
replicated unless technically impossible. Deviations must be logged in
`docs/UI_REBUILD_DEVIATIONS.md` with a reason.

---

## 0. Current state (what we build on)

Stack already matches the target — **no new dependencies needed**:

| Need | Already in repo |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind v4 (`@theme` CSS-first tokens) |
| Icons | `lucide-react` (single family — keep, no Phosphor) |
| Animations | `framer-motion` |
| Charts | `chart.js` + `react-chartjs-2` |
| Data | `better-sqlite3` behind `src/lib/db/*` + API routes |

**Keep (untouched or lightly extended):**
- `src/lib/db/*` — cars, expenses, maintenance, notes, attachments, metrics
  (`getCarMetrics`, `getMonthlyHistory`, `getTimeline`, `getKmStats` already
  power screens 5, 6, 12).
- All `src/app/api/*` routes.
- Business hooks: `useExpenseForm`, `useMaintenanceForm`, `useDocuments`,
  `useCompleteTask`, `useToast` (re-skinned, logic reused).
- `src/lib/maintenance/presets.ts`, `src/lib/documents/catalog.ts` (extended).
- PinGate flow (re-skinned in Phase 6).

**Rebuilt from scratch (UI layer):**
- `globals.css` (current light theme → dark token system).
- All presentational components (`VehicleCard`, `NavBar`, `TopBar`, `Modal`,
  `CarHeader`, `CarStatsGrid`, `ExpenseHistory`, `MaintenanceSchedule`,
  `AddExpenseFormFields`, etc.).
- Route/layout structure inside `/coches/[id]` (tab state → nested routes).

**Deleted at the end:** `TopBar.tsx`, `TopBarContext.tsx`, `CarViewContext.tsx`
(pub-sub tab switching replaced by real routes), `.card/.btn/.input` CSS
classes, `grid-layout`, `nav-link`.

---

## 1. Data-model gaps (must land before their screens)

The mockup shows data the DB doesn't have yet. Small migrations in
`src/lib/db/core.ts`:

1. **Vehicle photo** — hero images on Garaje/Detalle/Lista. Decided:
   **user-uploaded per car** (for now — could later add stock-photo lookup).
   Add `cars.photo_attachment_id` (nullable FK to attachments) + upload in the
   car create/edit form, stored through the existing attachments pipeline.
   Fallback: gradient placeholder with car icon (counts as the "no
   placeholder UI" exception — mockup has no empty-photo state, so this is a
   logged deviation).
2. **Health score 0–100** — mockup shows `94/100` + score trend (screen 12).
   Extend `computeCarEstado` → `computeCarScore(carId): { score, estado }`
   derived from: overdue maintenance (weight −), upcoming windows, ITV/seguro
   vigency, km since last service. Persist monthly snapshots in new table
   `car_score_history (car_id, month, score)` to draw the screen-12 trend.
3. **Fuel fields** — form (screen 4) needs `estación de servicio`. Map to
   existing `expenses.referencia` (no migration). `precio/litro` is computed
   (importe/litros), never stored.
4. **Expense categories** — mockup grid (screen 3): `combustible`,
   `mantenimiento`, `gasto_reparacion`, `neumaticos`, `seguro`,
   `peaje_parking`, `documento`, `pieza_accesorio` (+ `impuestos` kept for
   legacy rows). Create `src/lib/expenses/categories.ts` catalog (id, label,
   lucide icon, accent color) and a mapping from legacy `tipo_id` values so
   old rows render in the new timeline/pie without migration.
5. **Document types** — extend `src/lib/documents/catalog.ts` with
   `ficha_tecnica` and `manual`; restyle catalog colors to token refs
   (current `bg: "#fde7e6"` hardcodes die).
6. **Monthly km** — screen 12 bar chart "Kilómetros este mes". `getKmStats`
   exists; add `getMonthlyKm(carId, months)` from km-stamped expenses.

---

## 2. Phase 1 — Design tokens & theme (foundation, nothing visible yet)

**Canonical store: `src/design/tokens/*.ts`** (spec-mandated files). CSS
consumes them via `globals.css` `@theme` — the TS files are the single source;
a unit test in `scripts/` asserts the CSS variables match the TS values so the
two can never drift (repo already has a test runner: `npm test`).

```
src/design/tokens/
  colors.ts       spacing.ts    radius.ts
  shadows.ts      typography.ts animations.ts
  icons.ts        index.ts
```

### colors.ts
```ts
primary   #D63E3E   background #111214   surface #191B1F
surface2  #1F2228 (elevated rows/inputs — sampled from mockup)
border    #2A2D33   green #39D353   orange #F5A524
blue      #4DA3FF   purple #9B6BFF   danger #FF5A5A
cyan      #2DD4BF (Pieza/Accesorio tile — sampled from mockup)
text      #FFFFFF / #A0A5AD (secondary) / #6B7280 (muted)
```
Each accent also gets a `*Dim` 12–15% alpha variant for icon chips
(`bg-green/12` squares behind every list icon in the mockup).

### typography.ts — exactly 5 sizes, 4 weights
| Token | Size/line | Use in mockup |
|---|---|---|
| display | 28/34 | "182 €", "94", "92/100" |
| heading | 22/28 | Screen titles ("Gastos", "Actividad") |
| title | 17/24 | Card titles, vehicle names |
| body | 15/22 | Rows, values, buttons |
| caption | 12/16 | Metadata, nav labels, badges |

Weights: 700 / 600 / 500 / 400. Font stays Inter (system fallback).

### spacing.ts — 8px grid: `4 8 12 16 24 32 40 48`. Nothing else; Tailwind
arbitrary spacing values are lint-banned (see Phase 6 QA).

### radius.ts — card 24 · button 18 · input 16 · image 20 · pill 999.

### shadows.ts — two levels only: `card` (subtle ambient) and `floating`
(FAB / modals). Dark theme = shadows are mostly borders + slight glow; sample
from mockup, don't invent.

### animations.ts
```ts
pressScale: 0.97 / 150ms          fabSpring: { type: "spring", ... }
cardElevate: 150ms ease-out        chartEnter: 400ms ease-out
progressRing: 1200ms ease-in-out   pageFade: 200ms
```

### icons.ts
Re-export the ~30 lucide icons the app uses (Fuel, Wrench, Shield, FileText,
CircleParking, Disc3, Euro, Package, Home, Activity, Bell, …) so every screen
imports from one place and the family can never fragment.

### globals.css rewrite
- `@theme` block generated from tokens (colors, radii, spacing scale).
- Dark background on `body`, `color-scheme: dark`.
- Safe-area utilities kept.
- Skeleton shimmer kept (retuned to dark surfaces).
- **Everything else deleted** (`.card`, `.btn`, `.input`, `.select`,
  `.nav-link`, `.grid-layout` — replaced by components in Phase 2).

---

## 3. Phase 2 — Base components (`src/components/ui/`)

Every one: token-only styling, `forwardRef`, no data fetching, Storybook-less
but with a `/dev/ui` playground route (dev-only) to eyeball against mockups.

| Component | Mockup reference | Notes |
|---|---|---|
| `AppLayout` | all | max-width shell, safe areas, bottom-nav padding |
| `AppHeader` | all | title + left slot (back/burger) + right slot (bell/filter/⋯); variants: `home`, `back`, `modal` (X close) |
| `AppBottomNavigation` | 2,5–8,11,12 | 5 slots: Resumen · Actividad · FAB · Mantenimiento · Documentos; active = primary red; center FAB raised −16px |
| `AppCard` | all | radius 24, surface bg, press elevation animation |
| `AppButton` | 4,11 | primary (red, radius 18), secondary, ghost; scale 0.97/150ms |
| `AppFloatingButton` | 1,2 | 999 radius, floating shadow, expand/fade-menu spring |
| `AppSection` | 2,5 | section title row + optional trailing action |
| `AppBadge` | 1,7,8 | dot + label pill: Excelente/Regular/Bueno, Vigente/OK/Próximo/Vencido |
| `AppMetric` | 1,2 | icon chip + value + label (Salud 94/100, Gasto/mes…) |
| `AppProgress` | 2 | linear bar + `AppProgressRing` (94/100 circle, 1200ms) |
| `AppInput` | 4 | radius 16, surface2 bg, label above, suffix slot (€, L, km) |
| `AppSelect` | 4 | same skin, chevron |
| `AppDatePicker` | 4 | input skin + calendar icon (native input under the hood) |
| `AppVehicleCard` | 1 | 16:9 photo, gradient overlay, status badge, name, subtitle, quick metrics row; compact variant for screen 9 |
| `AppTimeline` | 6 | day-grouped, dot spine, entry rows |
| `AppChart` | 5,12 | lazy-wrapped chart.js: donut, line, bar; animate on load; token colors |
| `AppStatCard` | 12 | big value + delta arrow + caption |
| `AppEmptyState` | — | icon + text + CTA (used where lists are empty) |
| `AppDocumentCard` | 8 | icon chip, name, expiry line, right badge |
| `AppMaintenanceCard` | 7 | icon chip, title, frequency, remaining (km/días), status color, chevron |
| `AppExpenseCard` | 6 | icon chip, title, description, price, km/date |
| `AppListTile` | 10 | icon, label, value/chevron (Perfil rows) |
| `AppModal` | 3,4 | full-screen sheet (mobile) with header variant `modal`; replaces current `Modal.tsx` |
| `AppDivider` | 10 | 1px border token |
| `AppTypeTile` | 3 | grid tile: colored icon + label (expense wizard) |
| `AppSkeleton` | all | shimmer blocks for every card shape |
| `AppTabs` | 5,7 | underline segmented tabs (Resumen/Historial, Próximos/Historial/Programados) |

Rule enforced from here on: **no JSX outside `ui/` may use raw colors,
px values, radii or shadows** — only components and token utilities.

---

## 4. Navigation & route restructure

Tab-switching via `CarViewContext` pub-sub dies; each mockup screen becomes a
real route sharing a layout (deep-linkable, back-button correct):

```
/                          Garaje (screen 1) — hamburger, bell, FAB; NO bottom nav
/vehiculos                 Lista compacta (screen 9)
/perfil                    Perfil/Ajustes (screen 10) — absorbs current /settings
/notificaciones            Bell target (alerts API exists)
/coches/nuevo              re-skinned form

/coches/[id]/              layout.tsx → AppBottomNavigation (5 items) persists
  page.tsx                 Resumen (screen 2)
  actividad/               Timeline (screen 6)
  gastos/                  Gastos resumen+historial (screen 5) — entered from
                           "Gasto" quick-action & monthly summary card
  mantenimiento/           3 tabs (screen 7)
  mantenimiento/[taskId]/  Detalle mantenimiento (screen 11)
  documentos/              Documentos (screen 8)
  insights/                Insights (screen 12) — entered from score ring/metrics
  editar/                  re-skinned form
```

- The **[+] FAB** in the car context opens the Add-Expense wizard: full-screen
  `AppModal` step 1 = 8-tile type grid (screen 3) → step 2 = per-type form
  (screen 4 for fuel). Modal, not route: mid-flow state doesn't survive
  refresh, matches mockup X-to-close.
- Outside the car: no bottom nav (mockup screen 1 has none); hamburger opens
  the drawer with Garaje / Vehículos / Perfil / Notificaciones.
- `NavBar.tsx`'s `main.classList` padding hack dies — layout owns spacing.

---

## 5. Phase-by-phase build order

### Phase 1 — Tokens (½ day)
Tokens + globals rewrite + token-sync test. App will look broken (dark bg,
old components) — acceptable, this branch is `new-ui`.

### Phase 2 — Base components (2–3 days)
All of §3 + `/dev/ui` playground. DoD: every component demoed side-by-side
with its mockup crop at 390px width.

### Phase 3 — Shell screens (2 days)
1. **Garaje** (screen 1): rewrite `page.tsx` + `AppVehicleCard`; needs photo
   migration (§1.1) and score (§1.2).
2. **Resumen** (screen 2): route split; hero, `AppProgressRing`, next-maintenance
   card, quick-action grid (Combustible/Gasto/Mantenimiento/Kilometraje/
   Documento/Más), monthly summary strip.
3. **Perfil** (screen 10) + **Lista vehículos** (screen 9).
4. New `AppBottomNavigation` wired to routes.

### Phase 4 — Data-entry flows (2–3 days)
1. Add-Expense wizard (screens 3+4): reuse `useExpenseForm`; fuel form fields
   exactly: Fecha, Litros, Importe, Precio/L (computed, read-only), Km,
   Estación (select w/ recent stations from `referencia`), Notas. Per-type
   forms for the other 7 tiles reuse current `AddExpenseFormFields` logic
   split per category.
2. Maintenance list (screen 7: Próximos/Historial/Programados) + detail
   (screen 11) with history table and "Marcar como realizado" →
   `useCompleteTask`.
3. Documentos (screen 8): re-skin `DocumentsSection`/`DocumentRow`/upload &
   preview modals onto `AppDocumentCard`; extend catalog (§1.5).

### Phase 5 — Analytics (2 days)
1. **Actividad** (screen 6): day-grouped reverse-chrono timeline over
   `getTimeline` (offset param already exists → infinite scroll,
   virtualize past ~100 rows).
2. **Gastos** (screen 5): donut by category, "Este mes" header with % delta,
   6-month line chart (`getMonthlyHistory`), filters, Historial tab.
3. **Insights** (screen 12): score trend (needs §1.2 history table), consumo
   medio, coste/km (`getCarMetrics`), monthly-km bars (§1.6).
4. Charts lazy-loaded (`next/dynamic`), skeletons while loading.

### Phase 6 — Polish & QA (2 days)
- Micro-animations pass: press states, FAB spring, chart/ring entrance,
  page fades.
- Re-skin PinGate, toasts, error/loading routes.
- Performance: image lazy-loading + cache headers on attachment photos,
  skeletons everywhere spinners were, `React.memo` on list rows,
  optimistic updates audit (expense/doc/task add-edit-delete already
  optimistic in hooks — verify after re-skin).
- Accessibility: 44×44 targets (nav labels, icon buttons), AA contrast check
  on all token pairs (muted-on-surface is the risky one), focus-visible
  rings, dynamic font (rem-based sizes — enforced by typography tokens).
- Delete dead files (TopBar, CarViewContext, old Modal, old CSS classes).
- Lint guard: ESLint rule (`no-restricted-syntax` on hex colors in JSX/
  className arbitrary values) so hardcoded values can't come back.

---

## 6. Verification protocol (Definition of Done per screen)

1. Screenshot at **360 / 390 / 414 / 768** via headless Chrome, overlay
   against the mockup crop, ±2px tolerance on spacing/hierarchy.
2. Zero raw values: grep gate for `#[0-9a-f]{3,6}`, `px]`, `rounded-[`,
   `shadow-[` outside `src/design/` and `ui/`.
3. Only `App*` components in screen files.
4. `npm run lint && npm run typecheck && npm test` green (token-sync test
   included).
5. Interactions at 60fps (transform/opacity only; no layout-animating
   properties).
6. Skeleton state + empty state exist and use tokens.

## 7. Logged deviations (pre-approved candidates — anything else gets added here explicitly)

- Empty-photo vehicle placeholder (mockup never shows a car without a photo).
- Mockup screen 2 appears twice with different quick-action footers
  (image 2 adds "Gasto este mes / Consumo medio" strip) — **image 2 wins**
  (more complete).
- Perfil shows "Alex Martínez" + avatar; single-user app → editable display
  name stored in settings, avatar optional upload, no fake data.
- "Copia de seguridad" row → wires to existing `/api/car/[id]/export` (JSON
  export), labelled honestly.
