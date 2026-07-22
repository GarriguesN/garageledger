// Backup script for GarageLedger.
//
// Usage:  npx tsx scripts/backup.ts
// Env:    DB_PATH (default /opt/garageledger/data/garageledger.db)
//         UPLOAD_DIR (default /opt/garageledger/data/uploads)
//         BACKUP_DIR (required, no default — refuse to run without it)
//         BACKUP_RETENTION_DAYS (default 30; cleanup happens inside this run)
//
// Output: ${BACKUP_DIR}/garageledger-backup-YYYY-MM-DD_HHMM.tar.gz
//         Contains:
//           db.sqlite          ← better-sqlite3 native backup() (WAL-safe)
//           uploads/           ← contents of UPLOAD_DIR (recursively)
//
// IMPORTANT: uses db.backup() — never `cp` the .db file — because with
// WAL mode a raw copy can be inconsistent. db.backup() writes a fully
// checkpointed, transactionally-consistent snapshot.

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

function env(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (fallback !== undefined) return fallback;
  console.error(`[backup] ERROR: env var ${name} is required`);
  process.exit(2);
}

function ts(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

// Run the backup; returns the absolute path to the tarball on success.
async function runBackup(): Promise<{ tarball: string; dbSize: number; uploadCount: number; uploadBytes: number }> {
  const dbPath = env("DB_PATH", "/opt/garageledger/data/garageledger.db");
  const uploadDir = env("UPLOAD_DIR", "/opt/garageledger/data/uploads");
  const backupDir = env("BACKUP_DIR"); // required, no default

  if (!fs.existsSync(dbPath)) {
    console.error(`[backup] ERROR: db not found at ${dbPath}`);
    process.exit(3);
  }
  ensureDir(backupDir);
  ensureDir(uploadDir); // tolerate missing upload dir — tar will be empty for it

  const stamp = ts();
  const stagingDir = fs.mkdtempSync(path.join(require("os").tmpdir(), "garage-backup-"));
  const dbOut = path.join(stagingDir, "db.sqlite");
  const uploadsOut = path.join(stagingDir, "uploads");

  // 1. SQLite native backup (WAL-safe, atomic snapshot).
  // better-sqlite3: db.backup(filename) where filename is the OUTPUT path.
  // This writes a fully checkpointed copy without needing to open a second handle.
  console.log(`[backup] opening source db: ${dbPath}`);
  const src = new Database(dbPath, { readonly: true });
  try {
    console.log(`[backup] db.backup() → ${dbOut}`);
    // Throws on connection-level errors; returns nothing useful to await.
    // The signature is backup(destinationPath: string, options?).
    // The method is async at the native level — but in this binding the
    // promise resolves when the backup completes.
    await new Promise<void>((resolve, reject) => {
      src.backup(dbOut)
        .then(() => resolve())
        .catch((e: unknown) => reject(e as Error));
    });
  } finally {
    src.close();
  }
  if (!fs.existsSync(dbOut)) {
    console.error(`[backup] ERROR: db.backup() did not produce ${dbOut}`);
    process.exit(6);
  }

  // 2. Mirror uploads tree.
  ensureDir(uploadsOut);
  let uploadCount = 0;
  let uploadBytes = 0;
  if (fs.existsSync(uploadDir)) {
    for (const entry of fs.readdirSync(uploadDir, { withFileTypes: true })) {
      const from = path.join(uploadDir, entry.name);
      const to = path.join(uploadsOut, entry.name);
      if (entry.isDirectory()) {
        // Recursive copySync for subdirs (defensive — current schema only writes files, not subdirs).
        fs.cpSync(from, to, { recursive: true });
      } else if (entry.isFile()) {
        fs.copyFileSync(from, to);
      }
      const stat = fs.statSync(to);
      if (stat.isFile()) { uploadCount++; uploadBytes += stat.size; }
    }
  }
  console.log(`[backup] uploads mirrored: ${uploadCount} files, ${humanBytes(uploadBytes)}`);

  // 3. Tar + gzip — preserves relative paths inside the archive
  //    so it's easy to inspect with `tar tzf`.
  const tarName = `garageledger-backup-${stamp}.tar.gz`;
  const tarball = path.join(backupDir, tarName);
  console.log(`[backup] archiving → ${tarball}`);
  const tarRes = spawnSync("tar", [
    "-czf", tarball,
    "-C", stagingDir,
    "db.sqlite",
    "uploads",
  ], { stdio: ["ignore", "pipe", "pipe"] });
  if (tarRes.status !== 0) {
    const stderr = tarRes.stderr?.toString() ?? "";
    console.error(`[backup] tar failed (status=${tarRes.status}): ${stderr}`);
    try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch {}
    process.exit(4);
  }

  // 4. Cleanup staging + return
  try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch {}
  const tarStat = fs.statSync(tarball);
  const dbSize = fs.statSync(dbPath).size;

  console.log(`[backup] OK: ${tarball} (${humanBytes(tarStat.size)}; db source was ${humanBytes(dbSize)})`);
  return { tarball, dbSize, uploadCount, uploadBytes };
}

function pruneOldBackups(): number {
  const backupDir = env("BACKUP_DIR");
  const retention = parseInt(env("BACKUP_RETENTION_DAYS", "30"), 10);
  if (!Number.isFinite(retention) || retention < 0) {
    console.error(`[backup] ERROR: BACKUP_RETENTION_DAYS must be a non-negative integer, got ${process.env.BACKUP_RETENTION_DAYS}`);
    process.exit(5);
  }

  if (!fs.existsSync(backupDir)) return 0;

  const cutoff = Date.now() - retention * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const entry of fs.readdirSync(backupDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!/^garageledger-backup-.*\.tar\.gz$/.test(entry.name)) continue;
    const full = path.join(backupDir, entry.name);
    const stat = fs.statSync(full);
    if (stat.mtimeMs < cutoff) {
      try {
        fs.unlinkSync(full);
        console.log(`[backup] pruned (older than ${retention}d): ${entry.name}`);
        removed++;
      } catch (e) {
        console.error(`[backup] failed to prune ${entry.name}:`, (e as Error).message);
      }
    }
  }
  return removed;
}

// Main
(async () => {
  try {
    const result = await runBackup();
    const pruned = pruneOldBackups();
    console.log(`[backup] done. tarball=${result.tarball} retention removed=${pruned}`);
  } catch (e) {
    console.error(`[backup] FAILED:`, (e as Error).message);
    console.error((e as Error).stack);
    process.exit(1);
  }
})();
