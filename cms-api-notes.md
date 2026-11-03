# Catatan untuk tim CMS: API sregcoffee

> **Dokumen utama sekarang [`cms.md`](cms.md)** (spesifikasi Payload: model konten, akses, API, fase). Dokumen ini dipertahankan untuk **kontrak checkout, pesanan, dan pembayaran** (bagian 5 dan 6). Bila ada beda, `cms.md` yang berlaku.
>
> **Penting:** harga, pajak, dan stok **bukan** data CMS. Semuanya dari **Loyverse**, dan invoice dari **Xero** (lihat `cms.md` bagian 1.1 dan 15). Di dokumen ini, setiap kali "CMS menghitung harga/stok" dibaca sebagai "server (Payload) menghitung dari data Loyverse".

Dokumen ini merangkum apa yang dibutuhkan frontend (Astro + React, deploy di VPS) dari CMS / backend.
Bentuk data di bawah **diambil dari kode frontend saat ini**, jadi bisa dipakai sebagai kontrak awal.
Yang ditandai **(usulan)** belum ada di frontend dan boleh didiskusikan.

Sumber tipe di repo: `src/data/products.ts`, `src/data/checkout.ts`, `src/stores/orders.ts`, `src/stores/session.ts`, `src/stores/cart.ts`.

---

## 1. Gambaran

Sekarang semua data adalah mock di repo dan sesi / keranjang / pesanan di `localStorage`. Target:

| Hal | Sekarang | Target |
|---|---|---|
| Katalog produk, kategori | file `products.ts` | CMS (dapat diedit non-developer) |
| Konten halaman (About, News, FAQ, Gallery, legal) | tertulis di `.astro` | CMS |
| Akun & login | hash di browser | API auth |
| Keranjang | `localStorage` | tetap di browser untuk tamu; sinkron ke server untuk user login **(usulan)** |
| Pesanan & pembayaran | disimulasikan | API + payment gateway |
| Ongkir | 2 harga tetap | API ongkir (RajaOngkir/JNE atau sejenis) |

Frontend adalah situs **statis** yang disajikan dari VPS. Beri tahu kami cara konten dipublikasikan:
- **Opsi A**: build statis, CMS memanggil *rebuild hook* (skrip/webhook build di VPS) tiap konten berubah.
- **Opsi B**: frontend dipindah ke SSR/hybrid dan memanggil API tiap request (perlu cache).

Untuk **katalog, stok, harga**: sebaiknya selalu diambil saat runtime (stok & harga tidak boleh basi). Konten editorial (News, About, FAQ) cocok statis + rebuild.

## 2. Konvensi umum

- Base URL: `https://api.<domain>/v1` **(usulan)**. Format JSON, UTF-8.
- **Uang**: bilangan bulat dalam Rupiah (`195000`), tanpa desimal. Frontend yang memformat jadi `IDR 195.000`.
- **Waktu**: ISO 8601 UTC (`2026-10-10T09:30:00.000Z`).
- **ID**: produk dan artikel punya `slug` (huruf kecil, tanda hubung) yang stabil karena dipakai di URL. Pesanan punya `id` yang dibuat server.
- **Pagination**: `?page=1&per_page=24`, balasan menyertakan `meta: { page, per_page, total }`.
- **Error** (konsisten untuk semua endpoint):
  ```json
  { "error": { "code": "out_of_stock", "message": "Stok tidak cukup.", "fields": { "qty": "Maksimal 3" } } }
  ```
  `fields` hanya untuk error validasi; kunci = nama field di request.
- **CORS**: izinkan origin situs produksi dan domain staging (bila ada).
- **Auth**: cookie `HttpOnly; Secure; SameSite=Lax` (disarankan) atau bearer token. Mohon beri tahu mana yang dipilih karena memengaruhi cara frontend memanggil API.
- **Bahasa**: UI saat ini bahasa Inggris, ke depan Indonesia. Field teks yang tampil ke publik sebaiknya mendukung `en` dan `id` **(usulan)**, misal `{ "en": "...", "id": "..." }`.

## 3. Katalog

### 3.1 Kategori
Sekarang tiga: `beans`, `drinks`, `bakery`.

```json
{ "id": "beans", "label": "BEANS", "blurb": "Single origins, micro-lots, ..." }
```
`GET /categories`

### 3.2 Produk
`GET /products` (filter: `category`, `q`, `in_stock`, `sort`, pagination) dan `GET /products/{slug}`.

```json
{
  "slug": "ethiopia-suke-quto",
  "category": "beans",
  "name": "ETHIOPIA SUKE QUTO",
  "eyebrow": "GUJI, ETHIOPIA // 2000 MASL",
  "score": 88.5,
  "specs": [["PROCESS:", "Washed"], ["VARIETAL", "Kurume Welicho"]],
  "notes": ["JASMINE", "BERGAMOT", "WHITE PEACH"],
  "price": 195000,
  "size": "250G POUCH",
  "unit": "250 g",
  "image": "https://cdn.../ethiopia.png",
  "options": ["Whole beans", "Espresso", "Moka pot", "Filter"],
  "optionLabel": "Grind",
  "soldOut": false,
  "isNew": true,
  "detail": {
    "eyebrow": "GUJI, ETHIOPIA / CROP 2025",
    "summary": "Red Bourbon from Primrose, ...",
    "caption": "ROASTED FOR FILTER COFFEE",
    "tagline": "FROM GUJI,\nFOR YOUR FILTER.",
    "story": "Ethiopia Suke Quto brings together ...",
    "facts": [["PRODUCER", "Primrose"], ["LOCATION", "Uraga, Oromia, Guji, Ethiopia"], ["ALTITUDE", "2.020 MASL"], ["VARIETAL", "Red Bourbon"], ["PROCESS", "Mosto Fermentation"], ["CROP", "2025"], ["ROASTED FOR", "Filter Coffee"]]
  }
}
```

Catatan untuk model data:
- `specs`, `facts`: pasangan label–nilai berurutan; frontend menampilkannya apa adanya. Di CMS lebih nyaman sebagai *repeater* (label, nilai).
- `options` / `optionLabel`: varian yang dipilih pembeli (saat ini hanya "Grind" untuk biji kopi). Produk minuman dan roti tidak punya varian.
- **Stok** (usulan): tambah `stock` (angka) per produk **atau per varian**; `soldOut` diturunkan dari stok. Mohon konfirmasi apakah stok dihitung per varian (grind) atau per produk. Grind tidak mengubah stok biji yang dijual, tapi bisa memengaruhi waktu proses.
- **Ukuran / SKU** (usulan): bila nanti ada 250 g / 1 kg, perlu `variants[]` dengan `sku`, `price`, `stock`. Harap rancang dari awal agar tidak perlu ubah kontrak.
- **Gambar**: frontend memakai satu gambar produk (PNG transparan, bungkus saja) di atas pola logo sregcoffee. Mohon sediakan URL CDN, ukuran asli ≥ 1000 px, dan idealnya varian ukuran (`srcset`) **(usulan)**.
- `isNew`: boleh dihitung otomatis (mis. 30 hari sejak publikasi).
- Produk "unggulan" di beranda: field `featured` + urutan **(usulan)**. Sekarang tertulis di kode (4 slug).
- Pencarian **(usulan)**: `GET /products?q=...` mencari nama, asal, notes, proses.

### 3.3 Produk terkait (usulan)
`GET /products/{slug}/related?limit=5`. Sekarang logikanya: kategori sama dulu, lalu sisanya, tanpa produk habis.

## 4. Akun & sesi

Sekarang: nama, email, kata sandi. Demo: `demo@sregcoffee.id` / `demo1234`.

| Endpoint | Fungsi |
|---|---|
| `POST /auth/register` | `{ name, email, password }` |
| `POST /auth/login` | `{ email, password }` |
| `POST /auth/logout` | |
| `GET /me` | `{ name, email, phone? }` |
| `PATCH /me` | ubah profil |
| `POST /auth/forgot-password`, `POST /auth/reset-password` | **(usulan)** belum ada di frontend |
| `POST /auth/verify-email` | **(usulan)** |

Aturan kata sandi di frontend: minimal 8 karakter, mengandung huruf dan angka. Server tetap harus memvalidasi ulang. Email unik, tidak peka huruf besar-kecil. Simpan hash dengan argon2 atau bcrypt. **Jangan** pernah mengembalikan hash.

Alamat tersimpan **(usulan)**: `GET/POST/PATCH/DELETE /me/addresses`, bentuknya sama dengan `address` di pesanan (lihat 6.1).

## 5. Keranjang, checkout, ongkir

Pilihan desain (mohon didiskusikan):
- **Tamu**: keranjang tetap di browser. Frontend mengirim isi keranjang saat meminta harga dan saat membuat pesanan.
- **User login**: keranjang bisa disimpan di server **(usulan)** `GET/PUT /cart`.

Frontend **tidak boleh dipercaya** soal harga. Server harus menghitung ulang semuanya dari `slug` + `option` + `qty`.

### 5.1 Kuotasi (hitung total)
`POST /checkout/quote`

```json
{
  "items": [{ "slug": "ethiopia-suke-quto", "option": "Whole beans", "qty": 2 }],
  "shippingId": "jne-reg",
  "paymentId": "card",
  "discountCode": "SREG10",
  "destination": { "province": "DKI Jakarta", "city": "Jakarta Selatan", "district": "Cilandak", "postalCode": "12410" }
}
```
Balasan:
```json
{
  "items": [{ "slug": "...", "name": "...", "option": "Whole beans", "qty": 2, "unitPrice": 195000, "lineTotal": 390000, "inStock": true }],
  "subtotal": 390000,
  "discount": { "code": "SREG10", "amount": 39000 },
  "shipping": { "id": "jne-reg", "name": "JNE REG", "price": 20000, "etaDays": [2, 3] },
  "paymentFee": 0,
  "total": 371000
}
```
Kode diskon tidak valid → `422` dengan `error.code = "invalid_discount"`.

### 5.2 Metode pengiriman
`GET /shipping-methods?...tujuan...` mengembalikan daftar:
```json
{ "id": "jne-reg", "name": "JNE REG", "eta": "Estimated delivery: 2–3 business days", "days": "2-3 business days", "range": [2, 3], "price": 20000 }
```
`range` = hari kerja minimum dan maksimum; frontend memakainya untuk "Estimated arrival: 13-14 October 2026".
Saat ini hanya JNE REG (Rp20.000) dan JNE YES (Rp35.000) dengan harga tetap. Target: harga dari API ongkir berdasarkan berat (butuh `weight_grams` per produk **(usulan)**) dan tujuan. Pengiriman hanya hari kerja (Senin–Jumat).

### 5.3 Metode pembayaran
`GET /payment-methods`:
```json
{ "id": "card", "name": "Credit / debit card", "detail": "Visa, Mastercard and JCB", "fee": 0 }
```
Sekarang: `card`, `bank-transfer`, `qris`. Biaya semua 0. Tambahan e-wallet / cicilan **(usulan)**.

### 5.4 Wilayah
Dropdown bertingkat Provinsi → Kota/Kabupaten → Kecamatan. Sekarang contoh kecil di kode.
`GET /regions/provinces`, `GET /regions/provinces/{id}/cities`, `GET /regions/cities/{id}/districts` (sumber: data wilayah Kemendagri / API ongkir).

### 5.5 Kode diskon
Sekarang `SREG10` = 10% dari subtotal. Perlu model: `code`, tipe (`percent`/`fixed`), nilai, minimum belanja, kuota, periode berlaku, boleh digabung atau tidak. Validasi hanya di server.

## 6. Pesanan

### 6.1 Buat pesanan
`POST /orders`

```json
{
  "items": [{ "slug": "ethiopia-suke-quto", "option": "Whole beans", "qty": 1 }],
  "contact": { "email": "nadia.putri@gmail.com", "newsletter": false },
  "address": {
    "firstName": "Nadia", "lastName": "Putri", "phone": "+62 812 3456 7890",
    "country": "Indonesia", "street": "Jl. Cipete Raya No. 18", "address2": "Rumah 2, pagar hitam",
    "province": "DKI Jakarta", "city": "Jakarta Selatan", "district": "Cilandak", "postalCode": "12410"
  },
  "shippingId": "jne-reg",
  "note": "Please call when you arrive.",
  "paymentId": "bank-transfer",
  "discountCode": "SREG10",
  "saveAddress": true
}
```

Balasan `201`:
```json
{
  "id": "SRG-261010-0842",
  "status": "awaiting_payment",
  "createdAt": "2026-10-10T09:30:00.000Z",
  "items": [{ "slug": "...", "name": "...", "variant": "Whole beans / 250 g", "image": "...", "unitPrice": 195000, "qty": 1 }],
  "subtotal": 195000, "discount": 0, "shipping": 20000, "shippingName": "JNE REG", "paymentFee": 0, "total": 215000,
  "payment": { "methodId": "bank-transfer", "instructions": { "type": "virtual_account", "bank": "BCA", "number": "8808 1234 5678 9012", "amount": 215000, "expiresAt": "2026-10-11T09:30:00.000Z" } },
  "address": { "...": "..." }
}
```
- `id` dibuat **server**, format yang dipakai UI: `SRG-YYMMDD-XXXX`. Harus unik dan sulit ditebak (dipakai juga di URL konfirmasi).
- Snapshot nama, harga, dan varian produk **harus disimpan di pesanan** (jangan referensi ke produk yang bisa berubah).
- Stok dikurangi atau dicadangkan saat pesanan dibuat; dilepas bila kedaluwarsa (default: 24 jam untuk transfer / QRIS).
- Idempotensi: terima header `Idempotency-Key` agar klik ganda tidak membuat pesanan ganda **(usulan)**.

### 6.2 Status pesanan
Sekarang di frontend hanya: `awaiting_payment`, `paid`.
Usulan lengkap: `awaiting_payment` → `paid` → `processing` (di-roasting & dikemas) → `shipped` → `delivered`; cabang: `cancelled`, `expired`, `refunded`.
Mohon kabari nilai akhirnya; frontend akan menampilkan label dan langkah "What happens next" (Confirmed → Preparing → On the way) berdasarkan status ini.

### 6.3 Baca pesanan
- `GET /orders/{id}`: halaman konfirmasi. Untuk tamu, pesanan hanya boleh dibuka dengan token rahasia **(usulan)**, misal `?token=` yang ikut di URL konfirmasi, bukan hanya `id`.
- `GET /me/orders`: riwayat pesanan user login.
- `GET /orders/{id}/receipt.pdf` **(usulan)**: invoice. Sekarang frontend membuat file `.txt` sederhana.
- Lacak resi **(usulan)**: field `tracking: { carrier, number, url, events[] }`.
- Batalkan **(usulan)**: `POST /orders/{id}/cancel` selama belum `processing`.

### 6.4 Pembayaran
- Rekomendasi: gunakan payment gateway lokal (mis. Midtrans, Xendit, Doku) dan **jangan pernah** menerima / menyimpan nomor kartu di server kita. Kartu ditokenisasi di sisi gateway.
- Alur kartu: frontend mendapat token dari gateway, kirim token ke `POST /orders` atau `POST /orders/{id}/pay`; atau redirect ke halaman bayar gateway. Mohon pilih; frontend saat ini punya form kartu sendiri (nama, nomor, expiry, CVV) yang hanya demo.
- **Webhook** status pembayaran dari gateway → CMS mengubah `status` pesanan. Frontend tidak perlu tahu tentang webhook, hanya membaca `status` terbaru.
- Instruksi bayar (VA / QRIS) dikembalikan di `payment.instructions` (lihat 6.1). Untuk QRIS: `{ type: "qris", qrString | qrImageUrl, expiresAt }`.
- Hapus tombol "Simulate payment" dari frontend setelah webhook jalan.

## 7. Konten editorial

Semua teks berikut saat ini tertulis di kode / lorem ipsum.

| Konten | Endpoint (usulan) | Field penting |
|---|---|---|
| **News** | `GET /news`, `GET /news/{slug}` | `slug`, `title`, `excerpt`, `body` (rich text), `date`, `image`, `isHeadline` (1 artikel utama + 4 "related" kecil + grid) |
| **Gallery** | `GET /gallery` | daftar `{ image, alt, order }`. Frontend sekarang menyusun mosaik dengan posisi tetap dari desain (15 kotak); mohon beri tahu jumlah foto dan rasio gambar yang boleh diunggah, atau kami ubah tata letaknya jadi grid fleksibel |
| **FAQ** | `GET /faq` | `{ question, answer, category, order }` |
| **Halaman statis** | `GET /pages/{slug}` | `about`, `terms`, `privacy`, `shipping-returns`; `title`, `body` |
| **About** | `GET /pages/about` | heading, "Where we're from?", "Our story", "Our philosophy", 4 foto |
| **Info toko / kontak** | `GET /store` | alamat, jam buka, telepon, WhatsApp, email, link Instagram, koordinat peta |
| **Banner promo** | `GET /announcements/active` | teks bar atas ("FLASH SALE - 20% OFF ALL BEANS"), link "SHOP NOW", periode tayang |
| **Beranda** | `GET /pages/home` | statistik hero (88.5% / 100% / <7d), teks intro, ticker, blok "Our Roots" |

Untuk rich text: pilih format yang aman dirender (HTML terbatas atau Markdown). Kami hanya membutuhkan paragraf, judul, tebal / miring, link, gambar.

## 8. Formulir publik

| Endpoint | Isi | Catatan |
|---|---|---|
| `POST /contact` | `{ name, email, subject?, message }` | kirim ke inbox tim, balas 202 |
| `POST /newsletter` | `{ email }` | double opt-in disarankan |
| `POST /wholesale-inquiries` **(usulan)** | `{ company, contactName, email, phone, volume, message }` | untuk B2B |
| `POST /products/{slug}/notify` **(usulan)** | `{ email }` | notifikasi saat stok kembali |

Semua form: pasang proteksi spam (captcha / honeypot) dan *rate limit*.

## 9. Admin CMS (kebutuhan sisi tim internal)

Ringkasan fitur yang dibutuhkan editor / operasional:
- Kelola produk: tambah / edit / arsipkan, upload foto, atur stok, harga, label *new* / *featured*, urutan.
- Kelola konten: News, Gallery, FAQ, halaman statis, info toko, banner promo.
- Kelola kode diskon dan metode pengiriman.
- Daftar pesanan: filter status, ubah status (packing / dikirim), isi nomor resi, catat pembatalan / refund, ekspor.
- Daftar pelanggan dan permintaan form (kontak, wholesale, newsletter).
- Peran dan izin (admin, editor konten, operasional).
- Notifikasi email transaksional: pesanan dibuat, pembayaran diterima, pesanan dikirim (+ resi), pembatalan. Template bisa diedit.

## 10. Non-fungsional

- **Keamanan**: HTTPS; rate limit di login / form; validasi dan sanitasi input; log audit perubahan harga dan stok; semua perhitungan uang di server.
- **Privasi**: data pribadi pelanggan (nama, telepon, alamat); sediakan cara hapus akun / data sesuai UU PDP **(usulan)**.
- **Performa**: respons katalog ≤ 300 ms (p95) dan cache (CDN + `ETag`/`Cache-Control`); gambar lewat CDN dengan beberapa ukuran.
- **Kompatibilitas ke belakang**: versi API di URL (`/v1`). Beri tahu kami sebelum mengubah / menghapus field.
- **Lingkungan**: sediakan staging dengan data contoh dan akun uji; mode sandbox payment gateway.
- **Dokumentasi**: OpenAPI / Swagger yang selalu mutakhir, supaya kami bisa membuat tipe TypeScript otomatis.

## 11. Pertanyaan terbuka untuk tim CMS

1. CMS apa yang dipakai (headless seperti Strapi / Directus / Payload, atau backend custom)? Ini menentukan apakah endpoint di atas dibuat langsung atau lewat lapisan tipis.
2. Publikasi konten: *deploy hook* + build statis, atau SSR?
3. Auth: cookie atau token? Domain API sama (subdomain) dengan situs?
4. Stok per produk atau per varian?
5. Payment gateway dan API ongkir mana yang akan dipakai, dan siapa yang mendaftarkan akunnya?
6. Pesanan tamu: seberapa jauh boleh dilihat tanpa login (token di URL)?
7. Dukungan dua bahasa (en / id) di semua field konten?
8. Bagaimana alur retur dan refund (manual atau lewat API gateway)?
9. Siapa pemilik teks legal (Terms, Privacy, Shipping & Returns)?
10. Apakah pesanan wholesale diproses di sistem yang sama atau terpisah?

## 12. Urutan pengerjaan yang diusulkan (untuk tim CMS)

1. **Katalog** (kategori, produk, stok, gambar) dan **konten** (News, Gallery, FAQ, halaman statis, info toko). Frontend bisa langsung berhenti memakai data mock.
2. **Auth + profil + alamat**.
3. **Kuotasi + ongkir + kode diskon** dan **pembuatan pesanan** (dengan stok).
4. **Payment gateway + webhook** dan **email transaksional**.
5. **Riwayat pesanan, lacak resi, pembatalan**.
6. Formulir publik, wholesale, newsletter, notifikasi stok.
