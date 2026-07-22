import Database from "better-sqlite3";
import path from "path";
import { hashPin, isPinHashed } from "@/lib/auth";

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
      marca TEXT NOT NULL,
      modelo TEXT NOT NULL,
      generacion TEXT NOT NULL DEFAULT '',
      motor TEXT NOT NULL DEFAULT '',
      ano INTEGER,
      puertas INTEGER DEFAULT 5,
      km_actuales INTEGER DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'Mantenimiento al dia',
      fecha_ultima_itv TEXT,
      mantenimiento_config TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      tipo TEXT NOT NULL DEFAULT 'Carburante',
      importe REAL NOT NULL,
      descripcion TEXT NOT NULL DEFAULT '',
      litros REAL,
      km INTEGER,
      coste_estimado_taller REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS car_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      expense_id INTEGER,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      file_size INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS maintenance_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      part_name TEXT NOT NULL,
      part_brand TEXT NOT NULL DEFAULT '',
      part_model TEXT NOT NULL DEFAULT '',
      current_km INTEGER,
      current_date TEXT,
      next_km INTEGER,
      next_date TEXT,
      interval_km INTEGER,
      interval_months INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function migrateSchema(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(cars)").all() as { name: string }[];
  const colNames = cols.map(c => c.name);
  if (!colNames.includes("fecha_ultima_itv")) db.exec("ALTER TABLE cars ADD COLUMN fecha_ultima_itv TEXT");
  if (!colNames.includes("mantenimiento_config")) db.exec("ALTER TABLE cars ADD COLUMN mantenimiento_config TEXT");

  // Migrate legacy plaintext PIN to scrypt hash in-place.
  // Idempotent: only fires when stored value is not already a scrypt blob.
  const pinRow = db.prepare("SELECT value FROM settings WHERE key = 'pin'").get() as { value: string } | undefined;
  if (pinRow && !isPinHashed(pinRow.value)) {
    db.prepare("UPDATE settings SET value = ? WHERE key = 'pin'").run(hashPin(pinRow.value));
  }
}

function seedIfEmpty(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) as c FROM cars").get() as { c: number };
  if (count.c > 0) return;

  const insCar = db.prepare("INSERT INTO cars (marca, modelo, generacion, motor, ano, puertas, km_actuales, estado, fecha_ultima_itv) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  insCar.run("Honda", "Civic", "FK2", "1.8 i-VTEC", 2009, 5, 145000, "Mantenimiento al dia", "2025-03-15");
  insCar.run("Toyota", "Corolla", "E120", "1.6 VVT-i", 2002, 5, 210000, "Revisar frenos", "2025-06-20");

  const insExp = db.prepare("INSERT INTO expenses (car_id, date, tipo, importe, descripcion, litros, km, coste_estimado_taller) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  insExp.run(1, "2026-07-15", "Carburante", 65.00, "Repostaje", 40, 145000, null);
  insExp.run(1, "2026-07-01", "Carburante", 60.00, "Repostaje", 37, 144500, null);
  insExp.run(1, "2026-06-10", "Mantenimiento (DIY)", 15.00, "Arreglo parrilla frontal", null, null, 80.00);
  insExp.run(1, "2026-06-05", "Carburante", 70.00, "Repostaje", 42, 144000, null);
  insExp.run(2, "2026-07-12", "Carburante", 45.00, "Repostaje", 28, 210000, null);
  insExp.run(2, "2026-05-20", "Mantenimiento (DIY)", 45.00, "Cambio pastillas de freno", null, null, 120.00);
  insExp.run(2, "2026-06-08", "Seguro", 35.00, "Seguro mensual", null, null, null);
}

export function getSetting(key: string): string | undefined {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  getDb().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}
