#!/usr/bin/env bash
# Setup server dev sreg-cms: Node + pnpm + PostgreSQL (Docker) + PM2 + Nginx (+ HTTPS lewat certbot).
# Target: Ubuntu/Debian, dijalankan sebagai user biasa (bukan root) yang punya sudo, dari dalam folder repo ini.
#
#   git clone <repo> ~/sreg-cms && cd ~/sreg-cms      # atau rsync folder proyek (lihat deploy/README.md)
#   DOMAIN=admin.locavps.my.id EMAIL=kamu@email.com bash deploy/setup-vps.sh
#
# Variabel (opsional):
#   DOMAIN           domain CMS                              (default: admin.locavps.my.id)
#   EMAIL            email untuk Let's Encrypt; kosong = lewati HTTPS (cookie login pelanggan butuh HTTPS!)
#   FRONTEND_ORIGIN  origin situs LP                         (default: domain tanpa awalan "admin.", mis. https://locavps.my.id)
#   EXTRA_ORIGINS    origin tambahan untuk CORS, pisah koma  (mis. http://localhost:4321,https://lp.locavps.my.id)
#   APP_PORT         port internal Next.js                   (default: 3000)
#   PG_PORT          port Postgres di localhost VPS          (default: 5432)
#   SEED=1           isi data contoh (pnpm seed) setelah migrasi
#
# Aman dijalankan ulang: .env yang sudah ada tidak ditimpa, container Postgres dipakai ulang.
set -euo pipefail

DOMAIN="${DOMAIN:-admin.locavps.my.id}"
EMAIL="${EMAIL:-}"
APP_PORT="${APP_PORT:-3000}"
PG_PORT="${PG_PORT:-5432}"
SEED="${SEED:-0}"
APP_NAME="sreg-cms"
PG_CONTAINER="sreg-postgres"
PG_VOLUME="sreg_pgdata"
PG_USER="sreg"
PG_DB="sreg-cms"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[!] %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m[x] %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -ne 0 ] || die "Jalankan sebagai user biasa yang punya sudo, bukan root (PM2 akan berjalan sebagai user ini)."
[ -f "$APP_DIR/package.json" ] || die "package.json tidak ditemukan di $APP_DIR"
grep -qiE 'ubuntu|debian' /etc/os-release || die "Script ini untuk Ubuntu/Debian."
sudo -v || die "Butuh sudo."
cd "$APP_DIR"

# ---------------------------------------------------------------- paket dasar
log "Paket dasar (curl, git, nginx, openssl)"
sudo apt-get update -y
sudo apt-get install -y curl git nginx openssl ca-certificates

# ---------------------------------------------------------------- swap untuk build di VPS kecil
mem_mb=$(awk '/MemTotal/ {printf "%d", $2/1024}' /proc/meminfo)
if [ "$mem_mb" -lt 2500 ] && [ "$(swapon --show --noheadings | wc -l)" -eq 0 ]; then
  log "RAM ${mem_mb} MB: membuat swap 2 GB agar build tidak kehabisan memori"
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# ---------------------------------------------------------------- Node.js (>= 22.23.4)
node_ok() {
  command -v node >/dev/null 2>&1 || return 1
  node -e 'const [a,b,c]=process.versions.node.split(".").map(Number);process.exit((a===22&&(b>23||(b===23&&c>=4)))||a>24||(a===24&&(b>22||(b===22&&c>=1)))?0:1)'
}
if ! node_ok; then
  log "Memasang Node.js 22 (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node_ok || warn "Versi Node $(node -v) belum memenuhi engines proyek (^22.23.4 atau >=24.22.1). Lanjut, tetapi perbarui Node bila ada error."

# ---------------------------------------------------------------- pnpm + pm2
command -v pnpm >/dev/null 2>&1 || { log "Memasang pnpm"; sudo npm install -g pnpm; }
command -v pm2  >/dev/null 2>&1 || { log "Memasang PM2";  sudo npm install -g pm2; }

# ---------------------------------------------------------------- Docker
if ! command -v docker >/dev/null 2>&1; then
  log "Memasang Docker"
  curl -fsSL https://get.docker.com | sudo sh
fi

# ---------------------------------------------------------------- .env
rand() { openssl rand -hex "${1:-24}"; }
if [ ! -f .env ]; then
  log "Membuat .env (rahasia dibuat acak, izin 600)"
  PG_PASSWORD="$(rand 16)"
  SCHEME="http"; [ -n "$EMAIL" ] && SCHEME="https"
  FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-$SCHEME://${DOMAIN#admin.}}"   # admin.locavps.my.id -> situs LP di locavps.my.id
  cat > .env <<EOF
DATABASE_URI=postgres://$PG_USER:$PG_PASSWORD@127.0.0.1:$PG_PORT/$PG_DB
PAYLOAD_SECRET=$(rand 32)
MEDIA_DIR=media

# URL publik CMS dan origin yang boleh memanggil API (CORS). EXTRA_ORIGINS: pisah koma.
NEXT_PUBLIC_SERVER_URL=$SCHEME://$DOMAIN
FRONTEND_ORIGIN=$FRONTEND_ORIGIN
EXTRA_ORIGINS=${EXTRA_ORIGINS:-}
REBUILD_HOOK_URL=
PREVIEW_SECRET=$(rand 16)

# Loyverse (isi, lalu: pm2 restart $APP_NAME --update-env)
LOYVERSE_ACCESS_TOKEN=
LOYVERSE_STORE_ID=
LOYVERSE_WEBHOOK_SECRET=

# Pengiriman
BITESHIP_API_KEY=
FEDEX_CLIENT_ID=
FEDEX_CLIENT_SECRET=
FEDEX_ACCOUNT_NUMBER=

# Pembayaran: 'mock' untuk uji tanpa gateway, ganti 'xendit' setelah kunci terisi.
# ALLOW_MOCK_SIMULATE=1 membuka POST /api/payments/mock/simulate di server ini (HAPUS di produksi sungguhan).
PAYMENT_PROVIDER=mock
MOCK_PAYMENT_SECRET=$(rand 16)
ALLOW_MOCK_SIMULATE=1
XENDIT_SECRET_KEY=
XENDIT_CALLBACK_TOKEN=
ORDER_EXPIRY_HOURS=24

# Email (kosong = hanya dicatat di log)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@sregcoffee.id
EOF
  chmod 600 .env
else
  log ".env sudah ada: tidak ditimpa"
  PG_PASSWORD="$(sed -n 's#^DATABASE_URI=postgres://[^:]*:\([^@]*\)@.*#\1#p' .env | head -1)"
  [ -n "$PG_PASSWORD" ] || die "Tidak bisa membaca password dari DATABASE_URI di .env"
  PG_PORT="$(sed -n 's#^DATABASE_URI=.*@[^:]*:\([0-9]*\)/.*#\1#p' .env | head -1)"
  PG_PORT="${PG_PORT:-5432}"
fi

# ---------------------------------------------------------------- PostgreSQL (Docker)
log "PostgreSQL 17 di Docker (hanya mendengarkan 127.0.0.1:$PG_PORT)"
if sudo docker ps -a --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  sudo docker start "$PG_CONTAINER" >/dev/null 2>&1 || true
else
  sudo docker run -d --name "$PG_CONTAINER" --restart unless-stopped \
    -e POSTGRES_USER="$PG_USER" -e POSTGRES_PASSWORD="$PG_PASSWORD" -e POSTGRES_DB="$PG_DB" \
    -v "$PG_VOLUME":/var/lib/postgresql/data \
    -p "127.0.0.1:$PG_PORT:5432" postgres:17 >/dev/null
fi
for i in $(seq 1 30); do
  sudo docker exec "$PG_CONTAINER" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1 && break
  [ "$i" -eq 30 ] && die "Postgres tidak siap. Cek: sudo docker logs $PG_CONTAINER"
  sleep 2
done

# ---------------------------------------------------------------- build + migrasi
log "Install dependensi dan build"
export NEXT_TELEMETRY_DISABLED=1
pnpm install --frozen-lockfile
pnpm generate:importmap
pnpm build

set -a; . ./.env; set +a
log "Migrasi database"
NODE_ENV=production pnpm payload migrate
if [ "$SEED" = "1" ]; then
  log "Data contoh (pnpm seed)"
  NODE_ENV=production pnpm seed
fi

# ---------------------------------------------------------------- PM2
log "PM2"
APP_PORT="$APP_PORT" pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save
sudo env PATH="$PATH" pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null || warn "pm2 startup gagal; jalankan manual: pm2 startup"

# ---------------------------------------------------------------- Nginx
nginx_conf() {
  local ssl="$1"
  local common="
    client_max_body_size 25m;
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }"
  if [ "$ssl" = "1" ]; then
    cat <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $DOMAIN;
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
$common
}
EOF
  else
    cat <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
$common
}
EOF
  fi
}

log "Nginx untuk $DOMAIN"
HAS_CERT=0; sudo test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" && HAS_CERT=1
nginx_conf "$HAS_CERT" | sudo tee "/etc/nginx/sites-available/$APP_NAME" >/dev/null
sudo ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/$APP_NAME"
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

if command -v ufw >/dev/null 2>&1 && sudo ufw status | grep -q "Status: active"; then
  sudo ufw allow 'Nginx Full' >/dev/null || true
fi

# ---------------------------------------------------------------- HTTPS
if [ "$HAS_CERT" = "0" ]; then
  if [ -n "$EMAIL" ]; then
    log "HTTPS (Let's Encrypt)"
    sudo apt-get install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect \
      || warn "certbot gagal. Pastikan DNS A record $DOMAIN mengarah ke IP VPS ini dan port 80 terbuka, lalu jalankan ulang script ini."
  else
    warn "EMAIL kosong: HTTPS dilewati. Login pelanggan (cookie secure) dan Xendit butuh HTTPS. Jalankan ulang dengan EMAIL=..."
  fi
fi

log "Selesai"
cat <<EOF

  Admin   : http(s)://$DOMAIN/admin   (buat user admin pertama di halaman itu)
  API     : http(s)://$DOMAIN/api/products
  Log     : pm2 logs $APP_NAME
  Env     : $APP_DIR/.env   (setelah diubah: pm2 restart $APP_NAME --update-env)
  Update  : bash deploy/update.sh
  Postgres: sudo docker exec -it $PG_CONTAINER psql -U $PG_USER $PG_DB

EOF
