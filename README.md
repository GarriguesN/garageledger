# GarageLedger

PWA para llevar el control de gastos y mantenimientos del coche (multi-vehículo).
Stack: Next.js 16 + TypeScript + Tailwind + SQLite (better-sqlite3, WAL) + Chart.js.
Desplegada en CT 119, accesible en https://garageledger.nglab.es.

## Variables de entorno

Copia `.env.example` a `.env` y rellena los valores (`SESSION_SECRET` debe tener 32+ caracteres; `openssl rand -hex 32` te da uno):

```bash
cp .env.example .env
$EDITOR .env
```

| Variable | Requerida | Default | Descripción |
|---|---|---|---|
| `DB_PATH` | sí | `/opt/garageledger/data/garageledger.db` | Ruta al fichero SQLite principal |
| `UPLOAD_DIR` | sí | `/opt/garageledger/data/uploads` | Carpeta donde se guardan los adjuntos |
| `SESSION_SECRET` | sí | — | Clave HMAC para sesiones (≥32 chars random) |
| `BACKUP_DIR` | sí para backups | — | Carpeta destino de los `.tar.gz` |
| `BACKUP_RETENTION_DAYS` | no | `30` | Días que se conservan los backups antiguos |

## Backups

El script `scripts/backup.sh` genera un `.tar.gz` con un snapshot WAL-safe de SQLite
(usando `db.backup()` — nunca hace `cp` directo del `.db`) **más** la carpeta completa de
uploads. Después prune los backups más viejos de `BACKUP_RETENTION_DAYS`.

### Uso manual

```bash
# Tras asegurar BACKUP_DIR en .env (o exportar BACKUP_DIR=/var/backups/garageledger):
./scripts/backup.sh
```

Salida típica:

```
[backup] opening source db: /opt/garageledger/data/garageledger.db
[backup] db.backup() → /tmp/garage-backup-XYZ/db.sqlite
[backup] uploads mirrored: 4 files, 312.4 KB
[backup] archiving → /var/backups/garageledger/garageledger-backup-2026-07-22_093000.tar.gz
[backup] OK: ... (1.2 MB; db source was 940.0 KB)
[backup] pruned (older than 30d): garageledger-backup-2026-06-20_030000.tar.gz
[backup] done. tarball=... retention removed=1
```

### Programación con cron

Editar la crontab del usuario que ejecuta los backups (normalmente `root`):

```bash
crontab -e
```

Añadir una línea como esta — **diario a las 03:30**, redirigiendo salida a `logger` para
que aparezca en `journalctl -t garage-backup`:

```cron
30 3 * * * /opt/garageledger/scripts/backup.sh 2>&1 | /usr/bin/logger -t garage-backup
```

Notas:
- En deploys multiusuario, conviene crear un usuario dedicado `garage-backup` con permisos
  de lectura sobre `DB_PATH` + `UPLOAD_DIR` y de escritura sobre `BACKUP_DIR`.
- Si quieres notificación por email al fallar, sustituye el `logger` por algo como
  `mail -s "garage-backup FAILED" root < /dev/null` cuando el exit code sea ≠0.
- Verifica que `BACKUP_DIR` apunta a una ruta con espacio (no `/tmp`), idealmente con
  rotación de disco separada de la del servidor web.

### Restauración

```bash
# 1. Parar el servicio
ssh root@192.168.1.119 "systemctl stop garageledger"

# 2. Extraer el backup en un dir temporal
mkdir -p /tmp/restore && cd /tmp/restore
tar xzf /var/backups/garageledger/garageledger-backup-2026-07-22_093000.tar.gz

# 3. Restaurar la BD y los uploads (mejor mantener la BD en WAL → checkpoint antes)
sqlite3 /tmp/restore/db.sqlite "PRAGMA wal_checkpoint(TRUNCATE);"
# Para evitar errores de journal, restauramos directamente como nuevo .db:
sqlite3 /opt/garageledger/data/garageledger.db ".restore /tmp/restore/db.sqlite"

# 4. Restaurar uploads
rsync -a /tmp/restore/uploads/ /opt/garageledger/data/uploads/

# 5. Arrancar el servicio
ssh root@192.168.1.119 "systemctl start garageledger"
```
