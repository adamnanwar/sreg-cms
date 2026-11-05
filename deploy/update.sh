#!/usr/bin/env bash
# Terapkan versi kode terbaru di server: tarik kode (bila repo git), install, build, migrasi, reload PM2.
#   bash deploy/update.sh
# Bila kode dikirim lewat rsync, jalankan rsync dulu lalu script ini (git pull dilewati otomatis).
set -euo pipefail
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"
[ -f .env ] || { echo "[x] .env tidak ada. Jalankan deploy/setup-vps.sh dulu." >&2; exit 1; }

if [ -d .git ]; then git pull --ff-only; fi

export NEXT_TELEMETRY_DISABLED=1
pnpm install --frozen-lockfile
pnpm generate:importmap
pnpm build

set -a; . ./.env; set +a
NODE_ENV=production pnpm payload migrate

pm2 reload sreg-cms --update-env
pm2 save
echo "Selesai. Log: pm2 logs sreg-cms"
