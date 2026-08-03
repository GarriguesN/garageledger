// audit:B-5 / B-6 / B-7 / B-10 — Qué hace la API cuando lo que le llega no es
// lo que esperaba.
//
// El patrón que se fija: entrada mala → 400 con un motivo, y NADA escrito.
// Lo que había antes era `parseInt("12abc")` → 12 (se operaba sobre el coche
// equivocado) y `parseInt("abc")` → NaN camino de SQLite.

import "./lib/test-db";  // primera línea: fija DB_PATH antes de cargar src/lib/db

import { GET as expensesGET, POST as expensesPOST, PUT as expensesPUT, DELETE as expensesDELETE } from "../src/app/api/expenses/route";
import { GET as carsGET, PUT as carsPUT, DELETE as carsDELETE } from "../src/app/api/cars/route";
import { GET as notesGET, POST as notesPOST } from "../src/app/api/notes/route";
import { GET as maintGET, POST as maintPOST, PUT as maintPUT, DELETE as maintDELETE } from "../src/app/api/maintenance/route";
import { createCar, getCar } from "../src/lib/db/cars";
import { getExpenses } from "../src/lib/db/expenses";
import { createMaintenanceTask, getMaintenanceTask, updateMaintenanceTask } from "../src/lib/db/maintenance";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${hint}`); }
}

const get = (h: any, url: string) => h(new Request(url) as never);
const json = (h: any, url: string, method: string, body: unknown) =>
  h(new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as never);

async function main() {
  const car = createCar({ marca: "Honda", modelo: "Civic" });

  console.log("\n=== IDs que no son IDs (audit:B-6) ===");
  {
    // `parseInt("12abc")` daba 12: la petición se ejecutaba contra OTRO coche.
    const r = await get(carsGET, "http://localhost/api/cars?id=12abc");
    expect("GET /cars?id=12abc → 400, no el coche 12", r.status === 400, `(${r.status})`);

    for (const bad of ["abc", "", "-1", "0", "1.5.2", "NaN", "12abc", "1e3", " 1; DROP TABLE cars"]) {
      const res = await get(expensesGET, `http://localhost/api/expenses?car_id=${encodeURIComponent(bad)}`);
      expect(`GET /expenses?car_id=${JSON.stringify(bad)} → 400`, res.status === 400, `(${res.status})`);
    }

    expect("GET /notes sin car_id → 400", (await get(notesGET, "http://localhost/api/notes")).status === 400);
    expect("GET /maintenance?car_id=abc → 400",
      (await get(maintGET, "http://localhost/api/maintenance?car_id=abc")).status === 400);
    expect("DELETE /cars?id=abc → 400",
      (await get(carsDELETE, "http://localhost/api/cars?id=abc")).status === 400);
    expect("DELETE /expenses?id=abc → 400",
      (await get(expensesDELETE, "http://localhost/api/expenses?id=abc")).status === 400);
    expect("DELETE /maintenance?id=abc → 400",
      (await get(maintDELETE, "http://localhost/api/maintenance?id=abc")).status === 400);

    // Y el camino bueno sigue funcionando.
    expect("GET /expenses con car_id válido → 200",
      (await get(expensesGET, `http://localhost/api/expenses?car_id=${car.id}`)).status === 200);
  }

  console.log("\n=== Gastos con datos imposibles (audit:B-7) ===");
  {
    const before = getExpenses(car.id).length;

    const casos: [string, Record<string, unknown>][] = [
      ["fecha basura", { carId: car.id, tipo: "Otros", importe: 10, date: "garbage" }],
      ["fecha medio válida", { carId: car.id, tipo: "Otros", importe: 10, date: "2026-13-45x" }],
      ["km no numérico", { carId: car.id, tipo: "Carburante", importe: 10, km: "abc" }],
      // `parseInt("120000 km")` daba 120000 y se guardaba como si fuera bueno.
      ["km con unidades pegadas", { carId: car.id, tipo: "Carburante", importe: 10, km: "120000 km" }],
      ["litros con unidades pegadas", { carId: car.id, tipo: "Carburante", importe: 10, litros: "40 litros" }],
      ["fecha que no existe en el calendario", { carId: car.id, tipo: "Otros", importe: 10, date: "2026-02-31" }],
      ["mes 13", { carId: car.id, tipo: "Otros", importe: 10, date: "2026-13-01" }],
      ["km negativo", { carId: car.id, tipo: "Carburante", importe: 10, km: -5 }],
      ["litros no numérico", { carId: car.id, tipo: "Carburante", importe: 10, litros: "muchos" }],
      ["importe no numérico", { carId: car.id, tipo: "Otros", importe: "gratis" }],
      ["importe negativo", { carId: car.id, tipo: "Otros", importe: -10 }],
      ["costeTaller basura", { carId: car.id, tipo: "Otros", importe: 10, costeTaller: "x" }],
      ["sin carId", { tipo: "Otros", importe: 10 }],
    ];
    for (const [label, body] of casos) {
      const res = await json(expensesPOST, "http://localhost/api/expenses", "POST", body);
      expect(`POST gasto con ${label} → 400`, res.status === 400, `(${res.status})`);
    }
    expect("ninguno de esos gastos se guardó", getExpenses(car.id).length === before,
      `(${getExpenses(car.id).length} vs ${before})`);

    // El gasto correcto entra, y entra con los tipos correctos.
    const ok = await json(expensesPOST, "http://localhost/api/expenses", "POST",
      { carId: car.id, tipo: "Carburante", importe: "65.50", date: "2026-03-10", litros: "40.5", km: "120000" });
    expect("POST gasto válido → 201", ok.status === 201, `(${ok.status})`);
    const creado = await ok.json();
    expect("el importe se guarda como número", typeof creado.importe === "number" && creado.importe === 65.5,
      `(${typeof creado.importe} ${creado.importe})`);
    expect("los km se guardan como número", typeof creado.km === "number" && creado.km === 120000,
      `(${typeof creado.km} ${creado.km})`);
    expect("los litros se guardan como número", typeof creado.litros === "number", `(${typeof creado.litros})`);

    // Y un PUT con fecha basura tampoco pasa.
    const putMal = await json(expensesPUT, "http://localhost/api/expenses", "PUT",
      { id: creado.id, date: "no-es-fecha" });
    expect("PUT gasto con fecha basura → 400", putMal.status === 400, `(${putMal.status})`);
  }

  console.log("\n=== Cuerpos JSON malformados (audit:B-5) ===");
  {
    // Esta era la única ruta sin try/catch: daba un 500 genérico.
    const res = await json(maintPUT, "http://localhost/api/maintenance", "PUT", "{roto");
    expect("PUT /maintenance con JSON roto → 400, no 500", res.status === 400, `(${res.status})`);

    for (const [name, h, url] of [
      ["/expenses", expensesPOST, "http://localhost/api/expenses"],
      ["/cars", carsPUT, "http://localhost/api/cars"],
      ["/notes", notesPOST, "http://localhost/api/notes"],
      ["/maintenance", maintPOST, "http://localhost/api/maintenance"],
    ] as [string, any, string][]) {
      const r = await json(h, url, "POST", "{{{");
      expect(`${name} con JSON roto → 400`, r.status === 400, `(${r.status})`);
    }
  }

  console.log("\n=== Vaciar un campo de mantenimiento (audit:B-10) ===");
  {
    const task = createMaintenanceTask(car.id, "Aceite y filtro", {
      next_date: "2027-01-15", reminder_days: 30, interval_km: 10000,
    });
    expect("la tarea nace con fecha y recordatorio",
      task.next_date === "2027-01-15" && task.reminder_days === 30);

    // Poner un campo a null es una operación legítima: quitarle la fecha a la
    // tarea o desactivar su aviso. Antes se filtraba junto con `undefined` y
    // la API decía que sí sin hacer nada.
    updateMaintenanceTask(task.id, { next_date: null, reminder_days: null });
    const limpia = getMaintenanceTask(task.id)!;
    expect("next_date se puede vaciar", limpia.next_date === null, `(${limpia.next_date})`);
    expect("reminder_days se puede vaciar", limpia.reminder_days === null, `(${limpia.reminder_days})`);
    expect("y lo que no se toca no cambia", limpia.interval_km === 10000, `(${limpia.interval_km})`);

    // `undefined` sigue significando "este campo no viene en la petición".
    updateMaintenanceTask(task.id, { next_date: "2028-02-02", part_name: undefined });
    const otra = getMaintenanceTask(task.id)!;
    expect("undefined se sigue ignorando", otra.part_name === "Aceite y filtro", `(${otra.part_name})`);
    expect("y el campo que sí venía se aplica", otra.next_date === "2028-02-02");
  }

  console.log("\n=== El coche de prueba sigue intacto ===");
  expect("el coche no se ha tocado con las peticiones inválidas", !!getCar(car.id));

  console.log(`\nValidación de entrada: Passed ${pass} / ${pass + fail}`);
  if (fail) process.exit(1);
}

void main();
