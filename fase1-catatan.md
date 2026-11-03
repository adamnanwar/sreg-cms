# Catatan Fase 0 + 1 (konten dan katalog)

Status: **Fase 0 dan Fase 1 selesai di sisi kode dan lulus tes** terhadap Postgres sementara. Fase 2 dan 3 belum dimulai.
Dokumen ini berisi hal-hal yang perlu Anda putuskan atau kerjakan sendiri, urut dari yang paling penting.

## Yang sudah dibuat

- **Collections:** `users` (role admin/editor/ops), `media`, `product-categories`, `products`, `articles`, `pages`, `faqs`.
- **Globals:** `site-settings`, `announcement`, `navigation`, `footer`, `home`, `about`, `gallery`, `news-page`, `faq-page`, `contact-page`, `integrations` (admin saja).
- **Publikasi:** hook rebuild dengan debounce 45 detik (`REBUILD_HOOK_URL`), Live Preview ke `/preview?path=…&secret=…`, draft + versi.
- **Loyverse (baca-saja):** klien, sinkron penuh, webhook, tombol sinkron manual, dan job terjadwal tiap 5 menit.
- **Seed:** `pnpm seed` (idempotent).
- **Migrasi awal:** `src/migrations/20261101_041734_initial.*`.
- **Tes:** `tests/int/catalog.int.spec.ts` (6 tes lulus), mencakup akses publik vs staf, sinkron Loyverse dengan API tiruan, idempotensi, dan tanda tangan webhook.

## Yang perlu Anda kerjakan / putuskan

### 1. Integrasi Loyverse belum diuji dengan akun sungguhan (penting)
Saya tidak punya token Loyverse. Kodenya ditulis dari ingatan akan dokumentasi publik dan diuji hanya dengan API tiruan. **Periksa ini begitu ada token:**
- Bentuk respons `/items`, `/inventory`, `/taxes` (nama field `variant_id`, `default_price`, `stores[]`, `in_stock`, `tax_ids`, `track_stock`).
- Header dan algoritma tanda tangan webhook. Saya mengasumsikan `X-Loyverse-Signature` berisi HMAC-SHA1 base64 dari body mentah. Kalau berbeda, ubah [src/endpoints/loyverse.ts](src/endpoints/loyverse.ts).
- Apakah paket Loyverse Anda mengizinkan API dan webhook (pertanyaan 15 di `cms.md`).
- Isi env `LOYVERSE_ACCESS_TOKEN`, `LOYVERSE_STORE_ID` (atau di admin: Integrations), `LOYVERSE_WEBHOOK_SECRET`.
- Tanpa token, job terjadwal melewati sinkron tanpa error.

### 2. Cache Loyverse ditulis langsung ke database
Sinkron memakai `payload.db.updateOne`, bukan `payload.update`. Alasannya: koleksi berdraft akan membuat versi baru tiap 5 menit, atau gagal validasi untuk produk draft yang belum punya gambar.
Konsekuensinya: **bila editor menerbitkan draft lama, nilai Loyverse di versi itu menimpa cache sampai sinkron berikutnya (maksimal 5 menit).** Dampaknya hanya jeda harga/stok sebentar. Kalau tidak bisa diterima, pindahkan cache ke collection terpisah tanpa versi (perubahan besar, tanyakan dulu).

### 3. Data seed belum lengkap
- **Produk:** hanya 4 yang di-seed (Ethiopia lengkap; Kenya, Colombia, Toraja hanya nama). Tiga belas produk lengkap ada di `src/data/products.ts` milik repo frontend, yang tidak ada di sini. Kirim ekspor JSON-nya, nanti saya buatkan seed lengkap.
- **Semua produk seed berstatus draft** dengan `loyverse.itemId` placeholder `PENDING-<slug>`. Ganti dengan ID item Loyverse asli, unggah gambar, lalu terbitkan.
- **Gambar tidak di-seed** (ada di `public/images/` repo frontend). Karena itu global `about` dibiarkan draft: ia butuh tepat 4 foto.
- **Artikel** hanya 1 placeholder (draft), bukan 7 seperti di `cms.md`. Teks lorem ipsum belum diganti.

### 4. Keputusan yang saya ambil sendiri (ubah bila tidak cocok)
- **Gallery opsi B:** jumlah foto bebas, ukuran per foto `small/wide/tall/large`.
- **Beranda, kolom sektor:** `home.sector.columns` berupa array `{category, badge}` supaya badge bisa ditimpa per kolom. Spesifikasi menyebut `sectors` (relasi biasa), jadi nama field berbeda dari `cms.md`.
- **SEO:** field dari plugin bernama `meta` (bukan `seo` seperti di `cms.md`), dengan judul dan deskripsi yang dilokalisasi.
- **Peran:** akun pertama otomatis admin. Setelah itu, admin yang login bebas menentukan peran; pembuatan oleh non-admin dipaksa `editor`.
- **Produk publik:** tampil hanya jika terbit, `hidden` tidak dicentang, dan `loyverse.active` bukan false. Stok mentah per varian hanya terbaca staf; publik hanya melihat `soldOut`/`lowStock`.
- **Rute halaman bebas:** preview diarahkan ke `/p/<slug>` (pertanyaan 12 di `cms.md` masih terbuka).

### 5. Sebelum deploy
- `.env` Anda memakai `DATABASE_URL`. Kode membaca `DATABASE_URI` dulu, lalu `DATABASE_URL`, jadi tidak perlu diubah. Pastikan isinya Postgres, bukan Mongo.
- Jalankan `pnpm payload migrate` di produksi (`push` mati saat `NODE_ENV=production`). Migrasi di repo dibuat dari skema saat ini; buat migrasi baru setiap skema berubah.
- Isi `FRONTEND_ORIGIN`, `PREVIEW_SECRET`, `REBUILD_HOOK_URL`, `MEDIA_DIR` (volume persisten, ikut di-backup).
- Job terjadwal (`jobs.autoRun`) berjalan di dalam proses Next.js. Itu cocok di VPS, tapi **tidak jalan di platform serverless**. Kalau `next start` dijalankan lebih dari satu instance, sinkron akan berjalan di tiap instance.
- Debounce rebuild ada di memori satu proses; multi-instance berarti beberapa build.
- Hook rebuild berjalan juga saat draft disimpan di atas dokumen terbit (autosave). Debounce meredamnya, tetapi build bisa jalan tanpa perubahan publik.

### 6. Masalah yang sudah ada sebelumnya (tidak saya ubah)
- `pnpm lint` gagal: paket `@eslint/eslintrc` tidak terpasang. Tambahkan `pnpm add -D @eslint/eslintrc` bila ingin lint jalan.
- Peringatan pnpm 11: `pnpm.onlyBuiltDependencies` di `package.json` tidak dibaca lagi; pindahkan ke `pnpm-workspace.yaml`.
- Node lokal 24.16 sedikit di bawah `engines` (`>=24.22.1`); hanya peringatan.
- `cms.md` merujuk `techdebt.md` yang tidak ada.

### 7. Belum dikerjakan dari Fase 1
- **Tombol "Sync sekarang" di admin:** endpoint `POST /api/integrations/loyverse/sync` sudah ada, tetapi belum ada tombol UI. Perlu komponen admin kustom.
- **Pengisian otomatis `name/size/unit` dari Loyverse** saat profil dibuat (cms.md 5.3): belum. Saat ini diisi manual.
- **Pemilihan item Loyverse dari daftar** saat mengisi `loyverse.itemId`: belum; daftar item tanpa profil hanya tampil (baca-saja) di Integrations.
- **`isNew` otomatis 30 hari**, `GET /sitemap`, endpoint pencarian: belum (semuanya berstatus usulan).
- `payload-types.ts` sudah di-generate; OpenAPI belum.
- Backup harian dan staging adalah urusan infrastruktur, bukan kode.

## Cara menjalankan lokal

```bash
# Postgres (Docker): docker compose up postgres -d
# .env: DATABASE_URI=postgres://postgres:postgres@127.0.0.1:5432/sreg-cms
pnpm dev
pnpm seed
pnpm test:int          # butuh DATABASE_URI yang menunjuk database uji (tes ini membuat dan menghapus data)
```

Tes integrasi menulis data ke database yang dituju (dan membersihkan data miliknya sendiri). Jangan arahkan ke database produksi.
