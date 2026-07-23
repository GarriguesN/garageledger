import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH || "/opt/garageledger/data/garageledger.db";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    const { mkdirSync } = require("fs");
    try { mkdirSync(dir, { recursive: true }); } catch {}
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
    migrateSchema(db);
    seedIfEmpty(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marca TEXT NOT NULL, modelo TEXT NOT NULL, generacion TEXT NOT NULL DEFAULT '',
      motor TEXT NOT NULL DEFAULT '', ano INTEGER, puertas INTEGER DEFAULT 5,
      km_actuales INTEGER DEFAULT 0, estado TEXT NOT NULL DEFAULT 'Mantenimiento al dia',
      fecha_ultima_itv TEXT, mantenimiento_config TEXT, fecha_vencimiento_seguro TEXT, notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT, car_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')), tipo TEXT NOT NULL DEFAULT 'Carburante',
      importe REAL NOT NULL, descripcion TEXT NOT NULL DEFAULT '',
      referencia TEXT NOT NULL DEFAULT '',
      litros REAL, km INTEGER, coste_estimado_taller REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS car_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, car_id INTEGER NOT NULL,
      content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, car_id INTEGER NOT NULL, expense_id INTEGER,
      filename TEXT NOT NULL, original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream', file_size INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS maintenance_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, car_id INTEGER NOT NULL,
      part_name TEXT NOT NULL, part_brand TEXT NOT NULL DEFAULT '', part_model TEXT NOT NULL DEFAULT '',
      current_km INTEGER, current_date TEXT, next_km INTEGER, next_date TEXT,
      interval_km INTEGER, interval_months INTEGER, notes TEXT NOT NULL DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
}

function migrateSchema(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(cars)").all() as { name: string }[];
  const colNames = cols.map(c => c.name);
  if (!colNames.includes("fecha_ultima_itv")) db.exec("ALTER TABLE cars ADD COLUMN fecha_ultima_itv TEXT");
  if (!colNames.includes("mantenimiento_config")) db.exec("ALTER TABLE cars ADD COLUMN mantenimiento_config TEXT");
  if (!colNames.includes("fecha_vencimiento_seguro")) db.exec("ALTER TABLE cars ADD COLUMN fecha_vencimiento_seguro TEXT");
  // Ticket 1.1 — enriquecimiento de tarjetas
  if (!colNames.includes("matricula")) db.exec("ALTER TABLE cars ADD COLUMN matricula TEXT NOT NULL DEFAULT ''");
  if (!colNames.includes("bastidor")) db.exec("ALTER TABLE cars ADD COLUMN bastidor TEXT NOT NULL DEFAULT ''");
  if (!colNames.includes("combustible")) db.exec("ALTER TABLE cars ADD COLUMN combustible TEXT NOT NULL DEFAULT 'Gasolina'");
  if (!colNames.includes("foto_attachment_id")) db.exec("ALTER TABLE cars ADD COLUMN foto_attachment_id INTEGER");
  if (!colNames.includes("archivado")) db.exec("ALTER TABLE cars ADD COLUMN archivado INTEGER NOT NULL DEFAULT 0");

  const expCols = db.prepare("PRAGMA table_info(expenses)").all() as { name: string }[];
  const expNames = expCols.map(c => c.name);
  if (!expNames.includes("referencia")) db.exec("ALTER TABLE expenses ADD COLUMN referencia TEXT NOT NULL DEFAULT ''");

  // Maintenance presets: icon_key stores the preset key selected when
  // creating a task (e.g. "engine_oil_filter"). Idempotent — only adds
  // the column if it doesn't already exist.
  const mtCols = db.prepare("PRAGMA table_info(maintenance_tasks)").all() as { name: string }[];
  const mtNames = mtCols.map(c => c.name);
  if (!mtNames.includes("icon_key")) db.exec("ALTER TABLE maintenance_tasks ADD COLUMN icon_key TEXT");
}

function seedIfEmpty(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) as c FROM cars").get() as { c: number };
  if (count.c > 0) return;
  const ic = db.prepare("INSERT INTO cars (marca, modelo, generacion, motor, ano, puertas, km_actuales, estado, fecha_ultima_itv, fecha_vencimiento_seguro) VALUES (?,?,?,?,?,?,?,?,?,?)");
  ic.run("Honda","Civic","FK2","1.8 i-VTEC",2009,5,294122,"Mantenimiento al dia","2025-03-15","2026-12-01");
  ic.run("Toyota","Corolla","E120","1.6 VVT-i",2002,5,210000,"Revisar frenos","2025-06-20","2026-08-15");
  const ie = db.prepare("INSERT INTO expenses (car_id, date, tipo, importe, descripcion, litros, km, coste_estimado_taller) VALUES (?,?,?,?,?,?,?,?)");
  ie.run(1,"2026-07-15","Carburante",65,"Repostaje",40,294122,null);
  ie.run(1,"2026-07-01","Carburante",60,"Repostaje",37,293800,null);
  ie.run(1,"2026-06-10","Mantenimiento (DIY)",15,"Arreglo parrilla frontal",null,null,80);
  ie.run(1,"2026-06-05","Carburante",70,"Repostaje",42,293500,null);
  ie.run(2,"2026-07-12","Carburante",45,"Repostaje",28,210000,null);
  ie.run(2,"2026-05-20","Mantenimiento (DIY)",45,"Cambio pastillas de freno",null,null,120);
  ie.run(2,"2026-06-08","Seguro",35,"Seguro mensual",null,null,null);

  // Seed maintenance tasks for Civic (car 1) based on user data
  const mt = db.prepare("SELECT COUNT(*) as c FROM maintenance_tasks").get() as { c: number };
  if (mt.c === 0) {
    const im = db.prepare(`INSERT INTO maintenance_tasks (car_id,part_name,part_brand,part_model,current_km,current_date,next_km,next_date,interval_km,interval_months,notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    // Civics real data: 294.122 km Feb 2026
    im.run(1,"Aceite y filtro","","",294122,"2026-02-15",304122,"2027-02-15",10000,12,"");
    im.run(1,"Filtro de habitaculo","","",294122,"2026-02-15",314122,"2027-02-15",20000,12,"");
    im.run(1,"Filtro de aire","","",294122,"2026-02-15",324122,"2028-02-15",30000,24,"Sacudir polvo a los 309.000 km");
    im.run(1,"Pastillas de freno","","Delanteras y Traseras",294122,"2026-02-15",334122,null,40000,null,"Revisar grosor o si suena testigo acustico");
    im.run(1,"Discos de freno","","Delanteros y Traseros",294122,"2026-02-15",374122,null,80000,null,"Suelen durar 2-3 juegos de pastillas");
    im.run(1,"Bujias de iridio","NGK","",294122,"2026-02-15",394122,null,100000,null,"");
  }
}

export function getSetting(key: string): string | undefined {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  getDb().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}
