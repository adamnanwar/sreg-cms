# Deploy server dev (VPS)

Stack: Node 22 + pnpm, PostgreSQL 17 di Docker (hanya `127.0.0.1`), PM2 (satu proses), Nginx reverse proxy, HTTPS via certbot.

## Persiapan
1. **DNS**: A record `admin.locavps.my.id` (atau subdomain yang dipakai) mengarah ke IP VPS. Port 80 dan 443 terbuka.
2. **Kirim kode ke VPS** (pilih satu):
   - Git: `git clone <url-repo> ~/sreg-cms`
   - rsync dari komputer Anda:
     ```
     rsync -av --exclude node_modules --exclude .next --exclude .env --exclude media --exclude .git ./ user@IP-VPS:~/sreg-cms/
     rsync -av media/images/ user@IP-VPS:~/sreg-cms/media/images/     # foto untuk seed
     ```
3. Bila file `.sh` dari Windows berujung CRLF dan error `bad interpreter`: `sed -i 's/\r$//' deploy/*.sh`.

## Pemasangan pertama
```
cd ~/sreg-cms
DOMAIN=admin.locavps.my.id EMAIL=anda@email.com SEED=1 bash deploy/setup-vps.sh
```
Tambahan opsional: `FRONTEND_ORIGIN=https://locavps.my.id` (default: domain tanpa `admin.`), `EXTRA_ORIGINS=http://localhost:4321,https://lp.locavps.my.id`, `APP_PORT`, `PG_PORT`.

Lalu buka `https://admin.locavps.my.id/admin` dan buat user admin pertama. Isi kunci (Loyverse, Biteship, Xendit, SMTP) di `.env`, kemudian `pm2 restart sreg-cms --update-env`.

## Update berikutnya
```
bash deploy/update.sh
```

## Catatan
- `ALLOW_MOCK_SIMULATE=1` di `.env` membuka `/api/payments/mock/simulate` agar tim LP bisa menguji tanpa gateway. Hapus saat memakai Xendit/produksi.
- Webhook Xendit: `https://<domain>/api/payments/webhook/xendit`.
- Cookie login pelanggan memakai `SameSite=Lax` dan `Secure`: situs LP sebaiknya di subdomain yang sama (`*.locavps.my.id`), bukan `localhost`, agar login pelanggan jalan. Checkout tamu tidak terpengaruh.
- Backup database: `sudo docker exec sreg-postgres pg_dump -U sreg sreg-cms > backup.sql`. Foto ada di folder `media/` (ikut dibackup).
