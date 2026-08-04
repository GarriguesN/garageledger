import { getDb } from "../src/lib/db/core";
process.env.DB_PATH = ':memory:';

// Get initialized database
const db = getDb();

// Seed massive amount of data to benchmark the update queries
function setupMassiveData() {
    db.prepare("DELETE FROM maintenance_tasks").run();
    db.prepare("DELETE FROM expenses").run();

    console.log("Seeding data...");

    // Insert 100k maintenance tasks
    db.exec("BEGIN TRANSACTION");
    const insertMT = db.prepare("INSERT INTO maintenance_tasks (car_id, part_name, preset_key, current_km, current_date, next_km) VALUES (1, 'Aceite de motor y filtro', NULL, 1000, '2023-01-01', 2000)");
    for(let i=0; i<100000; i++) {
        insertMT.run();
    }

    // Insert 100k expenses
    const insertExp = db.prepare("INSERT INTO expenses (car_id, tipo, tipo_id, referencia, date, importe) VALUES (1, 'Carburante', NULL, '', '2023-01-01', 50)");
    for(let i=0; i<100000; i++) {
        insertExp.run();
    }
    db.exec("COMMIT");
    console.log("Seeding complete.");
}

setupMassiveData();

console.log("Benchmarking maintenance_tasks loop...");
const startMT = performance.now();
// Simulating the N+1 loop from core.ts for presets
const presets = [
    ["Aceite de motor y filtro", "engine_oil_filter"],
    ["Aceite y filtro", "engine_oil_filter"],
    ["Filtro de aire del motor", "engine_air_filter"],
    ["Filtro de aire", "engine_air_filter"],
    ["Filtro de combustible", "fuel_filter"],
    ["Bujías", "spark_plugs"],
    ["Bujias", "spark_plugs"],
    ["Bobinas de encendido", "ignition_coils"],
    ["Reglaje de válvulas", "valve_clearance"],
    ["Reglaje de valvulas", "valve_clearance"],
    ["Pastillas de freno", "brake_pads"],
    ["Discos de freno", "brake_discs"],
    ["Filtro de habitáculo", "cabin_filter"],
    ["Filtro de habitaculo", "cabin_filter"],
    ["Aceite de cambio y filtro", "transmission_oil_filter"],
    ["Aceite de caja de cambios", "transmission_oil"],
    ["Líquido de frenos", "brake_fluid"],
    ["Liquido de frenos", "brake_fluid"],
    ["Anticongelante", "coolant"],
    ["Correa de distribución", "timing_belt"],
    ["Correa de accesorios", "accessory_belt"],
    ["Poleas de accesorios", "accessory_pulleys"],
    ["Tren de válvulas", "valve_train"],
    ["Amortiguadores delanteros", "front_shocks"],
    ["Amortiguadores traseros", "rear_shocks"],
    ["Kit de embrague", "clutch_kit"],
    ["Embrague", "clutch"],
    ["Batería", "battery"],
    ["Bateria", "battery"],
    ["Limpia parabrisas", "windshield_wipers"],
    ["Escobillas", "wiper_blades"],
    ["Rotación de neumáticos", "tire_rotation"],
    ["Rotación de neumaticos", "tire_rotation"],
    ["Alineación y equilibrado", "wheel_alignment"],
    ["Alineacion y equilibrado", "wheel_alignment"],
    ["Presión de neumáticos", "tire_pressure"],
    ["Presion de neumaticos", "tire_pressure"],
];

for (const [partName, presetKey] of presets) {
    db.prepare(
        "UPDATE maintenance_tasks SET preset_key=? WHERE part_name=? AND (preset_key IS NULL OR preset_key='')",
    ).run(presetKey, partName);
}
const endMT = performance.now();
console.log(`maintenance_tasks migration took ${endMT - startMT} ms`);


console.log("Benchmarking expenses loop...");
const startExp = performance.now();
const tipoIdMap: Record<string, string> = {
    "Carburante": "carburante",
    "Mantenimiento (Taller)": "mantenimiento",
    "Mantenimiento (DIY)": "mantenimiento_diy",
    "Tuning": "tuning",
    "Seguro": "seguro",
    "ITV": "itv",
    "Impuestos": "impuestos",
    "Parking": "parking",
    "Peajes": "peajes",
    "Lavado": "lavado",
    "Otros": "otros",
};
for (const [label, id] of Object.entries(tipoIdMap)) {
    db.prepare(
        "UPDATE expenses SET tipo_id=? WHERE tipo=? AND (tipo_id IS NULL OR tipo_id='')"
    ).run(id, label);
}
const endExp = performance.now();
console.log(`expenses migration took ${endExp - startExp} ms`);
