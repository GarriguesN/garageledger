#!/bin/bash
# GarageLedger — Deploy a produccion
# Uso: ./deploy.sh [host]
# Si no se especifica host, solo construye.
set -euo pipefail

HOST="${1:-}"
BRANCH="re-styling"
REMOTE_DIR="/opt/garageledger"

echo "🔨 Construyendo..."
npm run build

if [ -z "$HOST" ]; then
  echo ""
  echo "✅ Build completado. Para desplegar, ejecuta:"
  echo "   ./deploy.sh usuario@servidor"
  exit 0
fi

echo ""
echo "📦 Empaquetando .next/standalone + public/ + data/"
tar czf /tmp/garageledger-deploy.tar.gz \
  .next/standalone/ \
  public/ \
  data/garageledger.db 2>/dev/null || true

echo "🚀 Subiendo a $HOST..."
scp /tmp/garageledger-deploy.tar.gz "$HOST:$REMOTE_DIR/"

echo "🔁 Reiniciando servicio..."
ssh "$HOST" "cd $REMOTE_DIR && tar xzf garageledger-deploy.tar.gz && \
  cp -r public/* .next/standalone/public/ 2>/dev/null || true && \
  pm2 restart garageledger || node .next/standalone/server.js &"

echo ""
echo "✅ Desplegado en $HOST (GarageLedger v1.5.0)"
rm -f /tmp/garageledger-deploy.tar.gz
