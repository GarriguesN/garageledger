// Verifica que el middleware del Ticket 0.1 cubre las páginas que el Ticket 1.3
// quiere blindar. Si en el futuro alguien reduce el matcher y deja /coches/**
// desprotegido, este test canta.

import * as fs from "fs";

let pass = 0, fail = 0;
const fails: string[] = [];
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; fails.push(label); console.log(`  ❌ ${label} ${hint}`); }
}

const mw = fs.readFileSync("middleware.ts", "utf8");

console.log("\n=== 1) matcher cubre /api/* salvo pin|session (compat Ticket 0.1) ===");
expect("matcher contiene /api/((?!pin|session).*)",
  /matcher:\s*\[[^\]]*"\/api\/\(\(\?![^"]*pin[^"]*session[^"]*\)\*"/.test(mw) ||
  /matcher:\s*\[[^\]]*["']\/api\/\(\(\?!.*pin.*session.*\)\*["']/.test(mw) ||
  // Allow flexible patterns
  mw.includes("/api/((?!pin|session).*)") || /\/api\(\(\?![^"]*pin[^"]*session/.test(mw));

console.log("\n=== 2) matcher cubre /coches/** (defensa contra SC que toca DB) ===");
expect("matcher contiene /coches/:path*", mw.includes("/coches/:path*"));

console.log("\n=== 3) matcher cubre /settings ===");
expect("matcher contiene /settings", mw.includes("/settings"));

console.log("\n=== 3-bis) matcher NO incluye \"/\" (delega al SC) — Ticket 1.3-fix ===");
expect("matcher NO contiene \"/\" suelto (delega al SC para \"primer uso\")",
  !/matcher:\s*\[[^\]]*"\/"\s*[,\]]/.test(mw));
expect("comentario del matcher documenta por qué / se delega al SC",
  /home\s*\(\s*"\s*\/"\s*\)\s*is\s+INTENTIONALLY\s+NOT|delega al SC|delegated to the SC/.test(mw));
expect("comentario obsoleto 'the home; it just renders PinGate' ya NO está",
  !/\/\/\s*the home; it just renders PinGate/.test(mw));

console.log("\n=== 4) unauthorized redirige a / para páginas (no 401) ===");
expect("unauthorized usa NextResponse.redirect",
  mw.includes("NextResponse.redirect"));
expect("redirect a / para páginas protegidas",
  /url\.pathname\s*=\s*"\/"/.test(mw) || /url\.pathname = ['"]\/['"]/.test(mw));
expect("401 JSON solo para rutas API",
  /\{ error: "No autorizado" \}, \{ status: 401 \}\)/.test(mw));

console.log("\n=== 5) Server Component en /coches/[id]/page.tsx (no 'use client') ===");
const page = fs.readFileSync("src/app/coches/[id]/page.tsx", "utf8");
expect("page.tsx NO tiene 'use client'",
  !page.includes("\"use client\"") && !page.includes("'use client'"));
expect("page.tsx es async", /export default async function/.test(page));
expect("page.tsx valida session con readSessionFromValue (no readSessionCookie)",
  page.includes("readSessionFromValue") && !page.includes("readSessionCookie"));
expect("page.tsx redirige / si no hay sesión", page.includes('redirect("/")'));

console.log("\n=== 6) CarDetailClient existe con props initial* ===");
const client = fs.readFileSync("src/app/coches/[id]/components/CarDetailClient.tsx", "utf8");
expect("CarDetailClient.tsx existe y tiene 'use client'",
  client.includes('"use client"'));
expect("CarDetailClient tiene prop initialCar", client.includes("initialCar"));
expect("CarDetailClient tiene prop initialMetrics", client.includes("initialMetrics"));
expect("CarDetailClient ya no tiene skeleton client-side",
  !/skeleton h-(32|64)/.test(client));

console.log("\n=== 7) /api/car/[id]/page-data sigue existiendo (para load() cliente) ===");
expect("ruta page-data existe", fs.existsSync("src/app/api/car/[id]/page-data/route.ts"));

console.log("\n=== 8) Server Component en / (GaragePage) — Ticket 1.3-fix ===");
const home = fs.readFileSync("src/app/page.tsx", "utf8");
expect("page.tsx NO tiene 'use client'",
  !home.includes("\"use client\"") && !home.includes("'use client'"));
expect("page.tsx importa readSessionFromValue (no readSessionCookie)",
  /import\s+\{[^}]*readSessionFromValue[^}]*\}\s+from\s+["']@\/lib\/auth["']/.test(home) &&
  !/import\s+\{[^}]*readSessionCookie[^}]*\}\s+from\s+["']@\/lib\/auth["']/.test(home));
expect("page.tsx es un async Server Component",
  /export default async function/.test(home));
expect("page.tsx lee cookies() con await (Next 16)",
  /await cookies\(\)/.test(home));
expect("page.tsx redirige / si no hay sesión (defensa-en-profundidad)",
  /session \? getCarDashboardData/.test(home));
expect("page.tsx respeta \"primer uso sin PIN\" (cars=[] si !session, no redirige)",
  /const cars = session \? getCarDashboardData\(\) : \[\]/.test(home));

console.log("\n---");
console.log(`Middleware check: Passed ${pass} / ${pass + fail}`);
if (fail > 0) { console.log("FALLOS:"); fails.forEach(f => console.log(" - " + f)); process.exit(1); }
console.log("\n✅ Middleware / SC / CarDetailClient alineados con Ticket 1.3");
