// Guarda de seguridad: ninguna pantalla que lea la base de datos puede
// servirse sin sesión válida.
//
// Hay dos barreras y este test comprueba las dos:
//   1. El middleware, que corta la petición antes de llegar a la página.
//   2. Cada Server Component, que revalida la cookie ANTES de tocar la BD.
//
// La segunda existe por si algún día el matcher del middleware se queda
// corto: aunque la petición llegue, el HTML no puede salir con la matrícula
// ni los gastos del usuario.
//
// Tras el rebuild de la UI esa revalidación está centralizada en requireCar()
// (src/app/coches/[id]/lib/loadCar.ts). En vez de repetir la comprobación
// pantalla a pantalla, el test recorre TODAS las rutas del vehículo y exige
// que pasen por ahí: añadir una ruta nueva sin auth hace fallar este test sin
// que nadie tenga que acordarse de actualizarlo.

import * as fs from "fs";
import * as path from "path";

let pass = 0, fail = 0;
const fails: string[] = [];
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; fails.push(label); console.log(`  ❌ ${label} ${hint}`); }
}

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

const mw = read("middleware.ts");

console.log("\n=== 1) El matcher cubre /api/* salvo pin y session ===");
expect("matcher contiene /api/((?!pin|session).*)",
  mw.includes("/api/((?!pin|session).*)") || /\/api\(\(\?![^"]*pin[^"]*session/.test(mw));

console.log("\n=== 2) El matcher cubre /coches/** ===");
expect("matcher contiene /coches/:path*", mw.includes("/coches/:path*"));

console.log("\n=== 3) El matcher cubre los ajustes ===");
expect("matcher contiene /settings o /perfil",
  mw.includes("/settings") || mw.includes("/perfil"));

console.log('\n=== 4) "/" NO está en el matcher (se delega al Server Component) ===');
// La home debe poder renderizarse sin sesión para el caso "primer uso, aún no
// hay PIN": enseña la lista vacía y la PinGate ofrece el asistente.
expect('matcher no contiene "/" suelto', !/matcher:\s*\[[^\]]*"\/"\s*[,\]]/.test(mw));

console.log("\n=== 5) unauthorized: redirect en páginas, 401 en API ===");
expect("usa NextResponse.redirect", mw.includes("NextResponse.redirect"));
expect("redirige a / las páginas protegidas", /url\.pathname\s*=\s*["']\/["']/.test(mw));
expect("401 JSON para rutas de API", /\{ status: 401 \}/.test(mw));

console.log("\n=== 6) requireCar valida la sesión ANTES de tocar la BD ===");
const loadCar = read("src/app/coches/[id]/lib/loadCar.ts");
expect("usa readSessionFromValue (no readSessionCookie)",
  loadCar.includes("readSessionFromValue") && !loadCar.includes("readSessionCookie"));
expect("lee la cookie con await cookies() (Next 16)", /await cookies\(\)/.test(loadCar));
expect("redirige a / cuando no hay sesión", /if \(!session\) redirect\("\/"\)/.test(loadCar));
// El orden importa: si getCar() se llamara antes del redirect, la consulta se
// ejecutaría igualmente aunque después no se mostrara nada.
expect("el redirect ocurre ANTES de leer el coche",
  loadCar.indexOf('redirect("/")') < loadCar.indexOf("getCar("));

const carDir = path.join(ROOT, "src/app/coches/[id]");
function findPages(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) findPages(full, out);
    else if (entry === "page.tsx" || entry === "layout.tsx") out.push(full);
  }
  return out;
}
const carPages = findPages(carDir);

console.log("\n=== 7) Toda ruta del vehículo que lea la BD pasa por requireCar ===");
for (const file of carPages) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, "utf8");
  const guarded = src.includes("requireCar");
  // Una pantalla puede delegar la comprobación en su layout, pero entonces no
  // debe leer la BD por su cuenta.
  const readsDb = /from "@\/lib\/db/.test(src);
  expect(`${rel} protegida`, guarded || !readsDb,
    guarded ? "" : "→ lee la BD sin llamar a requireCar()");
}

console.log("\n=== 8) Quien lee la BD lo hace desde el servidor ===");
// La invariante real no es "todo Server Component", sino que los datos
// sensibles no se lean desde el cliente: una pantalla cliente que pide los
// datos a la API es legítima, porque esa API sí la cubre el middleware. Lo
// que no puede pasar es importar @/lib/db en un componente cliente.
for (const file of carPages) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, "utf8");
  const isClient = /["']use client["']/.test(src);
  const readsDb = /from "@\/lib\/db/.test(src);
  expect(`${rel} no lee la BD desde el cliente`, !(isClient && readsDb));
}

console.log("\n=== 9) /api/car/[id]/page-data sigue existiendo ===");
expect("ruta page-data existe",
  fs.existsSync(path.join(ROOT, "src/app/api/car/[id]/page-data/route.ts")));

console.log("\n=== 10) El garaje (/) revalida la sesión antes de leer la BD ===");
const home = read("src/app/page.tsx");
expect('no tiene "use client"', !/["']use client["']/.test(home));
expect("es un async Server Component", /export default async function/.test(home));
expect("lee cookies() con await", /await cookies\(\)/.test(home));
expect("importa readSessionFromValue (no readSessionCookie)",
  /readSessionFromValue/.test(home) && !/readSessionCookie/.test(home));
// "Primer uso sin PIN": sin sesión la lista queda vacía en vez de redirigir,
// para que la PinGate pueda ofrecer el asistente de crear PIN.
expect("sin sesión la lista de vehículos queda vacía (no redirige)",
  /session \? getGarageVehicles\(\) : \[\]/.test(home));

console.log("\n---");
console.log(`Cobertura de auth: Passed ${pass} / ${pass + fail}`);
if (fail > 0) { console.log("FALLOS:"); fails.forEach((f) => console.log(" - " + f)); process.exit(1); }
console.log("\n✅ Middleware y Server Components alineados");
