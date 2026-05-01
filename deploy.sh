#!/bin/bash
set -e

SERVER="root@62.238.3.136"
REMOTE_DIR="/root/gokids"
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Build frontend..."
cd "$ROOT/frontend"
npm run build

echo "==> Sync frontend dist..."
rsync -az --delete "$ROOT/frontend/dist/" "$SERVER:$REMOTE_DIR/frontend/dist/"

echo "==> Sync backend..."
rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='uploads/' \
  "$ROOT/backend/" "$SERVER:$REMOTE_DIR/backend/"

echo "==> Instalar dependencias backend..."
ssh "$SERVER" "cd $REMOTE_DIR/backend && npm install --omit=dev"

echo "==> Crear directorio uploads..."
ssh "$SERVER" "mkdir -p $REMOTE_DIR/backend/uploads"

echo "==> Reiniciar PM2..."
ssh "$SERVER" "
  if pm2 describe gokids-backend > /dev/null 2>&1; then
    pm2 reload gokids-backend
  else
    cd $REMOTE_DIR/backend && pm2 start src/index.js --name gokids-backend
    pm2 save
  fi
"

echo "==> Deploy completado."
