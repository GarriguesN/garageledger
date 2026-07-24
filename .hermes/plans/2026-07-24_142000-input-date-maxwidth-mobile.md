# Input Calendar `max-width` para móvil (84.5% vs 67%)

> **Para Hermes:** aplica estos cambios archivo por archivo. Cada tarea es un archivo.

**Objetivo:** todos los `<input type="date">` en la app tengan `style={{maxWidth:"84.5%"}}` si están en una sola columna, o `style={{maxWidth:"67%"}}` si están en `grid grid-cols-2`.

**Regla:** solo se aplica a inputs `type="date"` que ya tienen `className="input"`. No tocar otros inputs.

---

## Inventario completo (14 inputs en 7 archivos)

### 📊 Resumen

| Archivo | Línea | Contexto (columna) | `max-width` requerido | Ya tiene? |
|---|---|---|---|---|
| `editar/page.tsx` | 314 | `grid-cols-2` (ITV) | `67%` | ❌ `84.5%` |
| `editar/page.tsx` | 321 | `grid-cols-2` (Seguro) | `67%` | ❌ `84.5%` |
| `editar/page.tsx` | 218 | solo (Matriculación) | `84.5%` | ❌ (sin nada) |
| `editar/page.tsx` | 333 | solo (IVTM) | `84.5%` | ✅ `84.5%` |
| `nuevo/page.tsx` | 265 | solo (ITV, `space-y-3`) | `84.5%` | ❌ (sin nada) |
| `nuevo/page.tsx` | 275 | solo (Seguro) | `84.5%` | ❌ (sin nada) |
| `nuevo/page.tsx` | 287 | solo (IVTM) | `84.5%` | ❌ (sin nada) |
| `nuevo/page.tsx` | 194 | solo (Matriculación) | `84.5%` | ✅ `84.5%` |
| `AddExpenseFormFields.tsx` | 120 | solo | `84.5%` | ❌ |
| `AddExpenseForm.tsx` | 64 | solo | `84.5%` | ❌ |
| `CompleteMaintenanceModal.tsx` | 87 | solo | `84.5%` | ❌ |
| `ExpenseHistory.tsx` | 207 | solo | `84.5%` | ❌ |
| `ProgramMaintenanceFormBody.tsx` | 190 | solo | `84.5%` | ❌ |
| `ProgramMaintenanceModal.tsx` | 173 | solo | `84.5%` | ❌ |

---

## Tasks

### Task 1: Corregir `editar/page.tsx` — ITV y Seguro (2 columnas → 67%)

**Líneas 314 y 321** están dentro de `<div className="grid grid-cols-2 gap-3">`. Cambia `maxWidth:"84.5%"` → `maxWidth:"67%"`.

```diff
- <input className="input" type="date" value={form.fecha_ultima_itv} style={{maxWidth:"84.5%"}} onChange={...} />
+ <input className="input" type="date" value={form.fecha_ultima_itv} style={{maxWidth:"67%"}} onChange={...} />

- <input className="input" type="date" value={form.fecha_vencimiento_seguro} style={{maxWidth:"84.5%"}} onChange={...} />
+ <input className="input" type="date" value={form.fecha_vencimiento_seguro} style={{maxWidth:"67%"}} onChange={...} />
```

### Task 2: Añadir `maxWidth` a `editar/page.tsx` — Matriculación (solo)

**Línea 218** está sola. No tiene `style`. Añadir `style={{maxWidth:"84.5%"}}`.

```diff
- <input className="input" type="date" value={form.fecha_matriculacion} onChange={...} />
+ <input className="input" type="date" value={form.fecha_matriculacion} style={{maxWidth:"84.5%"}} onChange={...} />
```

### Task 3: Añadir `maxWidth` a `nuevo/page.tsx` — ITV, Seguro, IVTM (solo, 84.5%)

**Líneas 265, 275, 287** están dentro de `<div className="space-y-3">` (columna única). No tienen `style`. Añadir `style={{maxWidth:"84.5%"}}`.

```diff
  <input className="input" type="date"
+   style={{maxWidth:"84.5%"}}
    value={form.fecha_ultima_itv}
```

(Aplica el mismo patrón a las 3 líneas.)

### Task 4: Añadir `maxWidth` a `AddExpenseFormFields.tsx` — Fecha (solo, 84.5%)

**Línea 120**, dentro de `<div>` solo. Sin `style`.

```diff
  <input className="input" type="date"
+   style={{maxWidth:"84.5%"}}
    value={form.date}
```

### Task 5: Añadir `maxWidth` a `AddExpenseForm.tsx` — Fecha (solo, 84.5%)

**Línea 64**, misma estructura que AddExpenseFormFields. Sin `style`.

```diff
  <input className="input" type="date"
+   style={{maxWidth:"84.5%"}}
    value={form.date}
```

### Task 6: Añadir `maxWidth` a `CompleteMaintenanceModal.tsx` — Fecha actual (solo, 84.5%)

**Línea 87**, dentro de `<div>` solo. Sin `style`.

```diff
  <input id="cm-date" className="input" type="date"
+   style={{maxWidth:"84.5%"}}
    value={date}
```

### Task 7: Añadir `maxWidth` a `ExpenseHistory.tsx` — Edición inline (solo, 84.5%)

**Línea 207**, dentro de `<div>` solo en `EditFormFields`. Sin `style`.

```diff
  <input className="input text-xs" type="date"
+   style={{maxWidth:"84.5%"}}
    value={editForm.date}
```

### Task 8: Añadir `maxWidth` a `ProgramMaintenanceFormBody.tsx` — Próxima fecha (solo, 84.5%)

**Línea 190**, dentro de `<div>` solo. Sin `style`.

```diff
  <input className="input" type="date"
+   style={{maxWidth:"84.5%"}}
    value={form.next_date}
```

### Task 9: Añadir `maxWidth` a `ProgramMaintenanceModal.tsx` — Próxima fecha (solo, 84.5%)

**Línea 173**, dentro de `<div>` solo. Sin `style`.

```diff
  <input className="input" type="date"
+   style={{maxWidth:"84.5%"}}
    value={form.next_date}
```

---

## Verificación

1. `npx tsc --noEmit` — sin errores
2. `npm run build` — OK
3. `for f in scripts/test-*.ts scripts/test-*.tsx; do npx tsx "$f" >/tmp/_t.log 2>&1 && echo OK || echo FAIL; done` — todos verde
4. Commit: `fix: max-width mobile en todos los inputs date (67% grid-2 / 84.5% solo)`

---

## Notas

- Los `AddExpenseForm.tsx` y `AddExpenseFormFields.tsx` son 2 archivos distintos con el mismo `<input type="date">` — ambos llevan `84.5%`.
- `ExpenseHistory.tsx` línea 207 está dentro de `EditFormFields` (edición inline del acordeón) — es columna única.
- No modificar ningún `<input type="number">` ni otros tipos. **Solo** `type="date"`.
