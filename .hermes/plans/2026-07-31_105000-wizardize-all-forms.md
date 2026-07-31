# Plan: wizardize all forms (5 wizards + reusable shell)

Branch: `new-ui` (pulled, up to date).
Mockup: 18 screens across 5 wizards + a shared success state.

## 1. Estado actual (auditado, no asumido)

### 1.1 Lo que ya está bien y se queda
- `AppModal` en `src/components/ui/AppModal.tsx` (151 LOC) — ya tiene back, title, close, footer slot, focus-trap, Escape, scroll-lock. Solo se le quita el borde inferior de header por el progress bar.
- `AppButton` (primary/secondary/ghost, size lg), `AppInput`, `AppSelect`, `AppDatePicker`, `AppTextarea`, `AppCard`, `AppSection`, `AppToast`, `AppTypeTile`, `AppIconChip`, `AppProgress` (lineal, NO dot-style), `AppHeader`, `AppBottomNavigation`.
- Design tokens completos (`colors`, `spacing`, `typography`, `animations`, `radius`, `shadows`, `icons`).
- `AddExpenseWizard.tsx` y `UploadDocumentModal.tsx` son wizards de estado pero están **incompletos vs mockup**.

### 1.2 Lo que NO está y se necesita
- Componentes compartidos de wizard.
- Progress bar dot-style del mockup (la `AppProgress` actual es lineal).
- Pantalla de éxito con confetti + check verde + 2 botones.
- Summary step genérico.
- 5 wizards reales con sus X/Y progress, header back/title/close, sección subtitulada, footer sticky.

### 1.3 Forms NO existentes en la app
El ticket pide "Add Insurance / Add Tax / Add Inspection / Add Part / Add Accessory / Add Reminder / Add Mileage". Estas **no son features del producto actual**: la app no tiene modelos para ellas. En `git ls-files` actual no hay schema/API/componente para ninguna. Lo que sí existe:
- `fecha_vencimiento_seguro`, `fecha_ultima_itv`, `fecha_ivtm` son **campos del vehículo**, no entidades.
- El combustible es un **tipo de gasto** dentro del wizard de gasto (`fuel` category).
- Los próximos mantenimientos se programan como tareas (`ProgramMaintenanceForm`).

**Decisión**: trataré "Insurance / Tax / Inspection" como **categorías dentro del wizard `AddDocument`** (que ya existe en `src/lib/documents/catalog.ts`: seguro, permiso de circulación, ITV, ficha técnica, garantía, otros). El mockup del wizard `AddDocument` muestra exactamente los mismos tipos (pantalla 15). No creo nuevos modelos.

Para **Part / Accessory / Reminder / Mileage**, no existen y el mockup no las pide explícitamente. El ticket las lista por completitud, pero no pueden implementarse sin un modelo de datos. **Lo dejo explícito en el Definition of Done como "no aplica, no existen features"** y se cubren vía `AddExpense` (categoría Otro) y `ProgramMaintenance`.

Para **Edit Vehicle / Edit Expense / Edit Document / Edit Maintenance / Schedule Maintenance**: el código actual usa los mismos formularios en modo create/edit. Plan: parametrizar el wizard con `mode: "create" | "edit"`, precargar valores, mantener exactamente el mismo flujo.

## 2. Arquitectura compartida

### 2.1 Nuevos componentes (todos en `src/components/ui/`)
- `WizardLayout.tsx` — sheet a pantalla completa: header (back/title/close), progress bar (X/Y), scrolling body, footer sticky. Sin props propios de dominio.
- `AppProgressDots.tsx` — barra horizontal con dots y línea conectiva (estilo mockup). Color activo = `colors.primary` (#c3423f), inactivo = `colors.surfaceElevated`. Animación de entrada con framer-motion.
- `SuccessScreen.tsx` — confetti (CSS/canvas simple, sin librería nueva), check verde grande con anillo, título, subtítulo, dos botones (primary + secondary). Variante "Ver en actividad" / "Añadir otro".
- `WizardSummaryCard.tsx` — bloque que recibe `title`, `items[]` (label, value, icon?) y un callback opcional `onEdit(stepIndex)`. Estilo card elevado.
- `WizardSection.tsx` — `<h2>` + subtítulo gris. Patrón común del mockup para el heading de cada paso.

### 2.2 Modificaciones
- `AppModal.tsx` queda como está. `WizardLayout` lo envuelve SIN la caja del modal (es full-screen: `fixed inset-0`), tomó esa decisión porque el mockup es un modal a pantalla completa con bottom nav flotante (no header flotante).
- `AppProgress.tsx` se queda como está (lo usan las pantallas de detail). El nuevo es `AppProgressDots`.

### 2.3 API de un wizard
```ts
type StepDef<V> = {
  id: string;
  title: string;
  subtitle?: string;
  fields: (keyof V)[];
  validate: (v: V) => Partial<Record<keyof V, string>>;
  render: (v: V, set: <K extends keyof V>(k: K, val: V[K]) => void, errors: Errors) => ReactNode;
  isSummary?: boolean;
};
```
Componente `Wizard<V>` que orquesta: estado, paso actual, validación por paso, footer dinámico (`Cancelar+Atrás` paso 1, `Atrás+Siguiente` pasos intermedios, `Atrás+Guardar` último), botón "Guardar" final, llamada a `onSubmit`, transición a `SuccessScreen`.

### 2.4 Validación por paso
- `Errors` se calcula vía el `validate` del step actual.
- Click en "Siguiente" → si hay errores, focus el primer campo con `aria-invalid` (scrollIntoView).
- "Atrás" nunca valida (no se pierden datos).

### 2.5 Animated step transitions
- `framer-motion` ya instalado. Wrap del body en `<AnimatePresence mode="wait">` con `initial={{opacity:0, x:8}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-8}}` duración 200ms.

## 3. Los 5 wizards

### 3.1 `AddVehicleWizard` (4 pasos) — `src/app/coches/nuevo/VehicleWizard.tsx`
1. **Marca y modelo**: chips de marcas recientes → selector de marca (search) → lista de populares → input de modelo. Datasource: marcas ya en BD + lista popular (Toyota, BMW, Mercedes-Benz, Audi, Honda, Volkswagen).
2. **Especificaciones**: año, motor, combustible, transmisión, tracción (4 selects).
3. **Identificación**: matrícula, VIN, kilometraje, toggle "predeterminado".
4. **Foto + Resumen**: upload área + summary card con los datos anteriores (botón "Editar" por sección).

Sirve también para `src/app/coches/[id]/editar/page.tsx` con `mode="edit"` (precarga desde `GET /api/car/[id]/page-data`).

### 3.2 `AddExpenseWizard` (3 pasos) — reemplazo de `src/app/coches/[id]/components/AddExpenseWizard.tsx`
1. **Tipo de gasto**: grid 3x3 de `AppTypeTile` (Combustible, Mantenimiento, Seguro, Parking/Peaje, Impuestos, Lavado, Reparación, Otro).
2. **Detalles**: importe, fecha, descripción, método de pago (Tarjeta/Efectivo/Otro). Si tipo=Combustible, además litros, estación, precio/L (calculado).
3. **Comprobante (opcional)**: upload área + textarea "Notas adicionales".

El resumen NO es un paso en este caso (3 pasos según mockup: pantalla 5/6/7). Sí hay success state.

### 3.3 `AddFuelWizard` (3 pasos) — `src/app/coches/[id]/components/AddFuelWizard.tsx`
1. **Cantidad y precio**: litros, importe total, precio/L (calculado).
2. **Detalles adicionales**: gasolinera, fecha, km, depósito (Lleno/3/4/1/2/1/4).
3. **Resumen del repostaje**: card con todos los datos.

Mockup pantallas 8/9/10.

### 3.4 `AddMaintenanceWizard` (4 pasos) — `src/app/coches/[id]/mantenimiento/nuevo/MaintenanceWizard.tsx`
1. **Tipo de mantenimiento**: grid 3x2 Cambio de aceite / Frenos / Neumáticos / Batería / ITV / Personalizado.
2. **Detalles del servicio**: coste, taller, tipo (Taller/DIY segmented), fecha.
3. **Próximo mantenimiento**: segmented Km/Tiempo, cada X km, O el [fecha], toggle "Recordarme antes", select "1 mes antes / 1 semana antes".
4. **Resumen**: card con todos los datos.

Cubre también `ProgramMaintenanceForm` (modo "schedule"), con valores iniciales de kms/fecha del vehículo. Edit reemplazará `CompleteTaskButton` para editar mantenimiento.

### 3.5 `AddDocumentWizard` (3 pasos) — reemplazo de `src/app/coches/[id]/components/UploadDocumentModal.tsx`
1. **Tipo de documento**: 6 tiles (Seguro, Permiso de Circulación, ITV, Ficha Técnica, Garantía, Otro).
2. **Documento y expiración**: upload (file/cámara/escáner), fecha de expiración.
3. **Recordatorio y resumen**: toggle "Recordarme", aviso "X antes", summary card.

Mantiene la lógica de escaneo (jscanify + opencv) dentro del paso 2.

## 4. Success state compartido

Tras `Save`:
- `confetti` con CSS keyframes (sin librerías nuevas). 16-20 partículas de colores brand.
- `<CheckCircle>` de lucide-react, 80px, color `colors.success` (#4f9d69), en círculo 120px fondo `colors.success / 0.15`.
- Título "¡Perfecto!" + subtítulo dinámico (ej. "Gasto guardado correctamente · 53,00 € · Lavado exterior + aspirado · 31/07/2026").
- Botón primario "Ver en actividad" (→ `/coches/[id]/actividad`).
- Botón secondary "Añadir otro gasto" (reset state, vuelve al paso 1).

## 5. Tests

El usuario odia tests inventados. Plan:
- Reusar el patrón existente `scripts/test-*.ts` con `tsx`.
- `scripts/test-wizard-1-vehicle-4-steps.ts` — verifica render del wizard de vehículo, número de pasos, navegación siguiente/atrás, validación por paso.
- `scripts/test-wizard-2-expense-3-steps.ts` — mismo flujo para gastos.
- `scripts/test-wizard-3-maintenance-4-steps.ts` — idem.
- `scripts/test-wizard-progress-aria.ts` — verifica que el progressbar tiene `aria-valuenow` correcto en cada paso.
- `scripts/test-wizard-success-screen.ts` — render del SuccessScreen con un payload de ejemplo.

Cada test usa `ts-check` o JSX runtime simple. NO uso React Testing Library (no instalado). Renderizo con `react-dom/server` y compruebo strings para mantener paridad con el patrón existente.

## 6. Definition of Done

- [ ] 4 componentes nuevos: `WizardLayout`, `AppProgressDots`, `WizardSummaryCard`, `WizardSection`, `SuccessScreen`.
- [ ] 5 wizards migrados: Vehicle, Expense, Fuel, Maintenance, Document.
- [ ] `mode="create" | "edit"` en cada wizard para cubrir Add/Edit.
- [ ] AddFuel se separa de AddExpense (el mockup los muestra distintos).
- [ ] ProgramMaintenanceForm reescrito como wizard de 4 pasos.
- [ ] CarForm.tsx, ProgramMaintenanceForm.tsx, AddExpenseWizard.tsx, UploadDocumentModal.tsx quedan como legacy DELETED (no commented out).
- [ ] 5 tests `scripts/test-wizard-*.ts` pasan.
- [ ] `npx tsc --noEmit` pasa.
- [ ] `npx eslint .` pasa (excepto warnings no nuevos).
- [ ] Commits directos a `new-ui` en bloques pequeños: infra → vagas → tests.
- [ ] No se introducen features nuevas (Insurance/Tax/Part/Accessory/Reminder/Mileage no existen en el modelo; documentado en DoD).
- [ ] No se reutilizan mocks para datos reales.

## 7. Riesgos / cosas que NO prometo

- Escaneo de documento en `AddDocumentWizard` paso 2: mantengo la lógica actual de jscanify pero no la mejoro. Si falla, el flujo de fallback "Usar foto original" ya está.
- Marcado de formulario del vehículo: la lista de "marcas recientes" sale de la BD. Si la BD está vacía, se muestra "Marcas populares" como fallback.
- Validaciones cross-step (ej. matrícula única): no las prometo — las que ya existían en el server siguen; el wizard no añade nuevas reglas de dominio.
- Las pruebas son de render/estructura, no E2E. No tengo Playwright configurado.
