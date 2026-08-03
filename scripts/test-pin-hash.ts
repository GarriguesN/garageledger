// audit:S-3 / S-9 — Coste del hash del PIN y compatibilidad hacia atrás.
//
// Lo importante aquí no es que el hash "funcione" (eso lo cubre cualquier
// roundtrip), sino que subir el coste no haya dejado tirados a los PINs ya
// guardados: el formato lleva N/r/p dentro, y verificar tiene que usar los
// parámetros de CADA hash, no los de hoy.

import "./lib/test-db";  // primera línea: fija DB_PATH antes de cargar src/lib/db

import { scryptSync, randomBytes } from "node:crypto";
import { hashPin, verifyPin, isPinHashed } from "../src/lib/auth";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${hint}`); }
}

async function main() {
  console.log("\n=== Hash del PIN ===");

  // ── 1) Roundtrip y forma del hash.
  {
    const stored = await hashPin("1234");
    const [scheme, n, r, p] = stored.split("$");
    expect("el esquema va en el propio hash", scheme === "scrypt");
    expect("se guarda con N = 2^17", n === "131072", `(N=${n})`);
    expect("r y p quedan registrados", r === "8" && p === "1");
    expect("isPinHashed lo reconoce", isPinHashed(stored));
    expect("el PIN correcto verifica", await verifyPin("1234", stored));
    expect("un PIN incorrecto no verifica", !(await verifyPin("1235", stored)));
    expect("el PIN no aparece en claro", !stored.includes("1234"));

    const otro = await hashPin("1234");
    expect("dos hashes del mismo PIN son distintos (salt)", otro !== stored);
  }

  // ── 2) Compatibilidad: un PIN guardado con el coste viejo sigue entrando.
  //    Es el caso real de cualquier instalación anterior a este cambio.
  {
    const salt = randomBytes(16);
    const legacyHash = scryptSync("4321", salt, 64, { N: 16384, r: 8, p: 1 });
    const stored = `scrypt$16384$8$1$${salt.toString("hex")}$${legacyHash.toString("hex")}`;

    expect("un hash con N=2^14 sigue verificando", await verifyPin("4321", stored));
    expect("y sigue rechazando el PIN equivocado", !(await verifyPin("0000", stored)));
  }

  // ── 3) PIN legacy en claro: se acepta, pero sin filtrar la longitud.
  {
    expect("el PIN en claro legacy verifica", await verifyPin("9876", "9876"));
    expect("rechaza otro PIN de la misma longitud", !(await verifyPin("1111", "9876")));
    expect("rechaza un PIN de longitud distinta", !(await verifyPin("98765", "9876")));
    expect("rechaza el prefijo correcto", !(await verifyPin("987", "9876")));
  }

  // ── 4) Basura guardada: se rechaza sin reventar.
  //
  //    El caso "zz" no es teórico: `Buffer.from("zz", "hex")` no lanza,
  //    devuelve un buffer VACÍO, y `timingSafeEqual(vacío, vacío)` dice que
  //    son iguales. Con un hash corrupto en BD entraba cualquier PIN.
  const junkStored = [
    "",
    "scrypt$",
    "scrypt$a$b$c$d$e",
    "scrypt$16384$8$1$zz$zz",           // hex inválido → buffers vacíos
    "scrypt$16384$8$1$$",                // hex ausente
    "scrypt$16384$8$1$abc$abcd",         // longitud hex impar
    "no-es-un-hash",
  ];
  for (const junk of junkStored) {
    let threw = false;
    let result = true;
    try { result = await verifyPin("1234", junk); } catch { threw = true; }
    expect(`stored inválido (${JSON.stringify(junk)}) → false sin lanzar`, !threw && result === false);
  }

  console.log(`\nHash del PIN: Passed ${pass} / ${pass + fail}`);
  if (fail) process.exit(1);
}

void main();
