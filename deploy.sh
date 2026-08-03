#!/bin/bash
# GarageLedger — Deploy a produccion
# Uso: ./deploy.sh [host]
# Si no se especifica host, solo construye.
#
# audit:B-11 — Este script metía `data/garageledger.db` en el tar y lo
# extraía en $REMOTE_DIR, que es exactamente donde vive la base de datos de
# producción. Es decir: cada despliegue sobreescribía los datos reales del
# servidor con la base de datos LOCAL de desarrollo. No era un snapshot
# inconsistente —que también, porque `tar` sobre un fichero WAL sin
# checkpoint puede coger la BD a medias—: era una pérdida de datos completa
# en cada deploy.
#
# Ahora:
#   · El despliegue lleva CÓDIGO. La base de datos del servidor no se toca.
#   · Antes de tocar nada se hace una copia de seguridad en el servidor, con
#     `.backup` de sqlite (seguro con WAL, a diferencia de copiar el fichero).
#   · Si la copia no se puede hacer, el despliegue se para. Un despliegue sin
#     red de seguridad no vale lo que puede costar.
set -euo pipefail

HOST="${1:-}"
REMOTE_DIR="/opt/garageledger"
REMOTE_DB="$REMOTE_DIR/data/garageledger.db"
REMOTE_BACKUPS="$REMOTE_DIR/data/pre-deploy"
# Escotilla de escape para el primer despliegue, cuando todavía no hay BD que
# salvar:  SKIP_DB_BACKUP=1 ./deploy.sh usuario@servidor
SKIP_DB_BACKUP="${SKIP_DB_BACKUP:-0}"

echo "🔨 Construyendo..."
npm run build

if [ -z "$HOST" ]; then
  echo ""
  echo "✅ Build completado. Para desplegar, ejecuta:"
  echo "   ./deploy.sh usuario@servidor"
  exit 0
fi

echo ""
echo "🛟 Copia de seguridad de la BD de producción..."
if [ "$SKIP_DB_BACKUP" = "1" ]; then
  echo "   ⚠️  Saltada por SKIP_DB_BACKUP=1"
else
  # `.backup` de sqlite hace una copia transaccionalmente consistente y con el
  # WAL ya aplicado. Copiar el .db a pelo puede dejar una BD corrupta o a
  # medias, que es justo lo que no quieres de un backup.
  ssh "$HOST" bash -s <<REMOTE
set -euo pipefail
if [ ! -f "$REMOTE_DB" ]; then
  echo "   ℹ️  No hay BD en $REMOTE_DB (¿primer despliegue?). Nada que salvar."
  exit 0
fi
if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "   ❌ sqlite3 no está instalado en el servidor: no se puede hacer una"
  echo "      copia consistente. Instálalo (apt install sqlite3) o usa"
  echo "      SKIP_DB_BACKUP=1 si de verdad quieres desplegar sin copia."
  exit 1
fi
mkdir -p "$REMOTE_BACKUPS"
DEST="$REMOTE_BACKUPS/garageledger-\$(date +%Y-%m-%d_%H%M%S).db"
sqlite3 "$REMOTE_DB" ".backup '\$DEST'"
echo "   ✅ \$DEST (\$(du -h "\$DEST" | cut -f1))"
# Se conservan las diez últimas: suficiente para volver atrás, sin llenar el disco.
ls -1t "$REMOTE_BACKUPS"/garageledger-*.db 2>/dev/null | tail -n +11 | xargs -r rm -f
REMOTE
fi

echo ""
echo "📦 Empaquetando .next/standalone + public/"
# `data/` NO entra: los datos del servidor son del servidor. Para llevarse una
# copia hacia el otro lado está scripts/backup.ts.
#
# Los --exclude no son decorativos. Quitar `data/garageledger.db` de la lista
# de arriba no bastaba: la BD de desarrollo aparece TAMBIÉN dentro de
# `.next/standalone/data/`, porque el servidor standalone resuelve la raíz del
# proyecto buscando el package.json más cercano y acaba creando ahí su propia
# BD. Esa copia viajaba dentro del bundle y se extraía en el servidor.
#
# Y va con los ficheros -wal y -shm: un .db sin su WAL es una BD a la que le
# faltan las últimas escrituras.
tar czf /tmp/garageledger-deploy.tar.gz \
  --exclude='data' \
  --exclude='*.db' \
  --exclude='*.db-wal' \
  --exclude='*.db-shm' \
  .next/standalone/ \
  public/

# Verificación, no confianza: si algo con pinta de base de datos se ha colado
# en el paquete, el despliegue se para antes de subir nada.
if tar tzf /tmp/garageledger-deploy.tar.gz | grep -qE '\.db(-wal|-shm)?$|(^|/)data/'; then
  echo "   ❌ El paquete contiene datos. Abortando para no pisar la BD del servidor:"
  tar tzf /tmp/garageledger-deploy.tar.gz | grep -E '\.db(-wal|-shm)?$|(^|/)data/' | head
  rm -f /tmp/garageledger-deploy.tar.gz
  exit 1
fi
echo "   ✅ Solo código: $(du -h /tmp/garageledger-deploy.tar.gz | cut -f1)"

echo "🚀 Subiendo a $HOST..."
scp /tmp/garageledger-deploy.tar.gz "$HOST:$REMOTE_DIR/"

echo "🔁 Reiniciando servicio..."
ssh "$HOST" "cd $REMOTE_DIR && tar xzf garageledger-deploy.tar.gz && \
  cp -r public/* .next/standalone/public/ 2>/dev/null || true && \
  rm -f garageledger-deploy.tar.gz && \
  (pm2 restart garageledger || node .next/standalone/server.js &)"

echo ""
echo "✅ Desplegado en $HOST (GarageLedger v$(node -p "require('./package.json').version"))"
rm -f /tmp/garageledger-deploy.tar.gz
