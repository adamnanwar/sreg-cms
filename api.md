# Referensi API sregcoffee CMS

Daftar lengkap endpoint, request, response, error, dan aturan akses. Untuk alur dan saran implementasi (urutan checkout, popup Xendit, halaman yang harus dibuat) lihat [lp.md](lp.md). Bila dua dokumen berbeda, kode di `src/endpoints/`, `src/collections/Orders.ts`, dan `src/collections/Customers.ts` yang benar.

## Daftar isi
1. Dasar
2. Format error
3. Katalog dan konten (REST bawaan Payload)
4. Akun pelanggan
5. Checkout dan pesanan
6. Pembayaran (webhook dan simulasi)
7. Form publik
8. Pencarian, ulasan, wishlist, retur
9. Integrasi Loyverse (admin)
10. Aturan akses per koleksi
11. Konfigurasi server (environment)
12. Cek cepat dengan curl

---

## 1. Dasar

| Hal | Nilai |
|---|---|
| Base URL | `https://admin.locavps.my.id/api` (lokal: `http://localhost:3000/api`) |
| Format | JSON, UTF-8. Kirim `Content-Type: application/json` pada POST/PATCH |
| Uang | Bilangan bulat Rupiah (`195000`), tanpa desimal |
| Waktu | ISO 8601 UTC |
| Bahasa | `?locale=id` atau `?locale=en`. Bila terjemahan kosong jatuh ke `en` |
| Login pelanggan | Cookie `payload-token` (`HttpOnly`, `SameSite=Lax`, `Secure` di produksi, berlaku 7 hari). Semua `fetch` yang butuh login memakai `credentials: 'include'` |
| CORS | Hanya origin di `FRONTEND_ORIGIN`, `NEXT_PUBLIC_SERVER_URL`, `EXTRA_ORIGINS`, dan `http://localhost:4321`. Header kustom yang diizinkan: `Idempotency-Key` |
| Batas laju | Per IP, jendela tetap, di memori satu proses. Lewat batas: `429 rate_limited` |

**Catatan penting**
- Endpoint yang hanya menerima `POST` akan membalas `{"message":"Route not found \"/api/...\""}` bila dibuka dari browser (GET). Itu bukan error server, hanya metode yang salah. Contoh: `/api/integrations/loyverse/sync`.
- Harga, pajak, dan stok berasal dari Loyverse. Jangan hitung total di frontend; pakai `POST /checkout/quote`.
- Stok mentah tidak pernah dikirim ke publik; hanya `soldOut` dan `lowStock`.

## 2. Format error

### Endpoint kustom (checkout, form, pesanan, dll.)
```json
{ "error": { "code": "out_of_stock", "message": "Stok tidak cukup.", "fields": { "items.0.qty": "Maksimal 3" } } }
```
`fields` hanya ada pada error validasi.

| HTTP | `code` | Arti |
|---|---|---|
| 400 | `invalid_json` | Body bukan objek JSON |
| 401 | `unauthorized` | Perlu login |
| 401 | `invalid_webhook` | Tanda tangan/token webhook salah |
| 404 | `not_found` | Tidak ada, atau token salah (sengaja sama agar nomor tidak bisa ditebak) |
| 409 | `cannot_cancel` | Pesanan sudah dibayar, tidak bisa dibatalkan pelanggan |
| 409 | `not_returnable` | Retur hanya untuk pesanan `shipped`/`delivered` |
| 409 | `already_reviewed` | Sudah mengulas produk ini |
| 409 | `already_verified` | Email sudah terverifikasi (OTP) |
| 410 | `otp_expired` | Kode OTP kedaluwarsa (10 menit); minta kode baru |
| 429 | `otp_cooldown` / `otp_locked` | Minta kode terlalu cepat (60 detik) / salah 5 kali |
| 422 | `otp_invalid` | Kode salah atau belum diminta (`fields.attemptsLeft`) |
| 503 | `email_unavailable` | Email OTP gagal terkirim (SMTP bermasalah) |
| 422 | `validation_error` | Field tidak valid (lihat `fields`) |
| 422 | `invalid_shipping` | Tarif tidak berlaku lagi; ambil tarif ulang |
| 422/409 | `out_of_stock`, `option_required`, `invalid_option`, `variant_required`, `invalid_discount`, `product_unavailable` | Masalah isi keranjang atau kode diskon |
| 429 | `rate_limited` | Terlalu banyak permintaan |
| 500 | `internal_error` | Kesalahan tak terduga |
| 502 | `payment_failed` | Gateway menolak; pesanan otomatis dibatalkan, boleh coba lagi |
| 503 | `payment_unavailable`, `stock_unavailable`, `shipping_unavailable` | Layanan belum dikonfigurasi atau bermasalah |

### Endpoint bawaan Payload (koleksi, globals, auth)
```json
{ "errors": [{ "message": "You are not allowed to perform this action." }] }
```
Status: `401`/`403` akses, `404` tidak ada, `400`/`422` validasi.

---

## 3. Katalog dan konten (REST bawaan Payload, baca saja)

Parameter umum: `locale`, `depth` (0–2), `limit`, `page`, `sort` (`-field` menurun), `where[field][operator]=nilai`.
Balasan daftar:
```json
{ "docs": [ ... ], "totalDocs": 13, "limit": 24, "page": 1, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false, "nextPage": null, "prevPage": null, "pagingCounter": 1 }
```

| Endpoint | Akses | Isi |
|---|---|---|
| `GET /product-categories` | publik | Kategori: `slug, label, blurb, sectorImage, sectorBadge, order` |
| `GET /products` | publik, hanya terbit + tidak disembunyikan + aktif | Daftar produk |
| `GET /products/:id` | sama | Satu produk menurut id |
| `GET /articles` | publik, hanya terbit | Artikel |
| `GET /pages` | publik, hanya terbit | Halaman legal (`terms`, `privacy`, `shipping-returns`) |
| `GET /faqs?sort=order` | publik | FAQ |
| `GET /reviews?where[product.slug][equals]=...` | publik, hanya `approved` | Ulasan |
| `GET /shipping-methods?sort=order` | publik, aktif | Metode kirim tetap |
| `GET /payment-methods?sort=order` | publik, aktif | Metode bayar |
| `GET /provinces`, `/cities`, `/districts` | publik | Wilayah (belum diisi) |
| `GET /media/:id`, file di `/api/media/file/<nama>` | publik | Foto |
| `GET /redirects` | publik | Pengalihan URL |
| `GET /globals/<slug>` | publik | Lihat tabel di bawah |

Global: `home`, `about`, `gallery`, `news-page`, `faq-page`, `contact-page`, `navigation`, `footer`, `announcement`, `site-settings`, `ui-strings`. (`integrations` hanya staf.)

### Contoh produk
```
GET /products?locale=id&depth=1&where[slug][equals]=ethiopia-suke-quto&limit=1
```
```jsonc
{
  "id": 1,
  "slug": "ethiopia-suke-quto",
  "name": "ETHIOPIA SUKE QUTO",
  "eyebrow": "GUJI, ETHIOPIA // 2000 MASL",
  "category": { "id": 1, "slug": "beans", "label": "BEANS" },
  "score": 88.5,
  "specs": [{ "label": "PROCESS:", "value": "Washed" }],
  "notes": [{ "note": "JASMINE" }],
  "size": "250G POUCH",
  "unit": "250 g",
  "image": { "url": "/api/media/file/x.jpg", "alt": "...", "width": 1600, "height": 1200,
             "sizes": { "thumb": { "url": "..." }, "card": { "url": "..." }, "hero": { "url": "..." }, "full": { "url": "..." }, "og": { "url": "..." } } },
  "variantLabels": [{ "variantId": "...", "label": "250 g" }],
  "lineOptions": { "label": "Grind", "choices": [{ "label": "Whole beans" }] },
  "isNew": true, "featuredRank": 1,
  "ratingAvg": 4.5, "ratingCount": 2,
  "detail": { "summary": "...", "story": "...", "tagline": "...", "facts": [{ "label": "PRODUCER", "value": "..." }] },
  "meta": { "title": "...", "description": "...", "image": null },
  "loyverse": {
    "price": 195000, "soldOut": false, "lowStock": false, "taxIncluded": true, "taxRate": 0,
    "variants": [{ "variantId": "...", "sku": "...", "optionLabel": "250 g", "price": 195000, "soldOut": false }]
  }
}
```
Ukuran gambar: `thumb` 400, `card` 800, `hero` 1920, `full` 2560, `og` 1200×630. URL gambar relatif; awali dengan origin CMS.

### Contoh artikel
```
GET /articles?locale=id&depth=1&sort=-publishedAt&limit=12
```
Field: `slug`, `title`, `category` (label kecil, opsional), `excerpt`, `body` (Lexical JSON), `image`, `publishedAt`, `featured`, `tags`, `meta`. Tidak ada `author`. `body` berisi H2–H6, daftar, kutipan, tautan, gambar, garis.

### Contoh `ui-strings`
```json
{ "strings": [{ "key": "cart.empty", "value": "Your cart is empty" }] }
```

---

## 4. Akun pelanggan

Koleksi `customers` (auth bawaan Payload). Semua pakai `credentials: 'include'`.

| Endpoint | Body | Balasan sukses | Catatan |
|---|---|---|---|
| `POST /customers` | `{ name, email, password, phone?, newsletter? }` | `201 { doc, message }` | Daftar, tanpa verifikasi email. Tidak otomatis login: panggil `/customers/login` sesudahnya. Kata sandi ≥ 8 karakter, ada huruf dan angka |
| `POST /customers/login` | `{ email, password }` | `200 { message, user, token, exp }` + cookie | Langsung bisa login. Terkunci 10 menit setelah 5 kali salah |
| `POST /customers/otp/send` | – | `202 { ok, expiresInSeconds: 600, resendAfterSeconds: 60 }` | Wajib login. Kirim kode 6 angka ke email. Batas 10 / 10 menit per IP; `429 otp_cooldown` bila diminta lagi sebelum 60 detik; `409 already_verified`; `503 email_unavailable` |
| `POST /customers/otp/verify` | `{ code }` | `200 { ok, emailVerified: true }` | Wajib login. Batas 20 / 10 menit. Error: `422 otp_invalid` (`fields.attemptsLeft`), `410 otp_expired`, `429 otp_locked` |
| `POST /customers/logout` | – | `200 { message }` | Menghapus cookie |
| `GET /customers/me` | – | `200 { user, token?, exp? }` | `user: null` bila belum login. `user.emailVerified` (boolean) menunjukkan status verifikasi OTP |
| `POST /customers/refresh-token` | – | `200 { user, refreshedToken, exp }` | Perpanjang sesi |
| `PATCH /customers/:id` | `{ name?, phone?, addresses?, newsletter? }` | `200 { doc, message }` | Hanya data sendiri |
| `POST /customers/forgot-password` | `{ email }` | `200` selalu | Email berisi `<frontend>/reset-password?token=...` |
| `POST /customers/reset-password` | `{ token, password }` | `200 { user, token }` | |
| `GET /customers/me/orders?page=1&per_page=10` | – | lihat di bawah | Wajib login; `per_page` maks 50 |
| `POST /wishlist` | `{ productSlug, action? }` | `200 { wishlist, inWishlist }` | `action`: `add`/`remove`, kosong = toggle. Wajib login |

`GET /customers/me/orders`:
```json
{ "data": [ /* objek pesanan, bentuk sama dengan 5.4 tanpa guestToken */ ], "meta": { "page": 1, "per_page": 10, "total": 3 } }
```
Alamat tersimpan: array `addresses` pada data pelanggan, dengan `label, firstName, lastName, phone, country, street, address2, province, city, district, postalCode, isDefault`.

---

## 5. Checkout dan pesanan

Urutan: `shipping/rates` → `checkout/quote` → `orders/create` → bayar → `orders/lookup`.

### 5.1 `POST /shipping/rates`
Batas: 60 per 10 menit.
```json
{ "items": [{ "slug": "ethiopia-suke-quto", "variantId": "...", "qty": 2 }],
  "destination": { "country": "Indonesia", "postalCode": "12410", "areaId": "opsional" } }
```
`200`:
```json
{ "rates": [{ "id": "biteship:jne:reg", "provider": "biteship", "courier": "jne", "service": "reg", "name": "JNE Reguler", "price": 18500, "etaDays": [1, 2] }] }
```
Termurah dulu. `country`: nama atau kode ISO. Indonesia lewat Biteship; luar negeri lewat FedEx (belum aktif). Error: `503 shipping_unavailable` bila belum dikonfigurasi; pakai metode tetap dari `/shipping-methods`.

### 5.2 `GET /shipping/areas?q=cilandak`
Batas: 120 per 10 menit. `q` minimal 3 huruf, kurang dari itu `{ "areas": [] }`.
```json
{ "areas": [{ "id": "IDNP6IDNC148IDND836IDZ12410", "name": "Cilandak Barat, Cilandak, Jakarta Selatan, DKI Jakarta", "postalCode": "12430" }] }
```
Maks 20 hasil.

### 5.3 `POST /checkout/quote`
Batas: 120 per 10 menit.
```json
{
  "items": [{ "slug": "ethiopia-suke-quto", "variantId": "...", "option": "Whole beans", "qty": 2 }],
  "shippingId": "biteship:jne:reg",
  "destination": { "country": "Indonesia", "postalCode": "12410" },
  "paymentId": "qris",
  "discountCode": "SREG10",
  "locale": "id"
}
```
- `shippingId`: `slug` metode tetap, atau `id` tarif penyedia (`biteship:...`, wajib disertai `destination`).
- `variantId` wajib bila produk punya lebih dari satu varian; `option` wajib bila produk punya `lineOptions`.

`200`:
```json
{
  "items": [{ "slug": "ethiopia-suke-quto", "name": "ETHIOPIA SUKE QUTO", "variantId": "...", "option": "Whole beans",
              "qty": 2, "unitPrice": 195000, "lineTotal": 390000, "inStock": true }],
  "subtotal": 390000,
  "discount": { "code": "SREG10", "amount": 39000 },
  "shipping": { "id": "biteship:jne:reg", "name": "JNE Reguler", "price": 20000, "etaDays": [1, 2] },
  "paymentFee": 0, "tax": 0, "taxIncluded": true, "total": 371000
}
```
`discount` dan `shipping` bernilai `null` bila belum dipilih/diisi.

### 5.4 `POST /orders/create`
Header: `Idempotency-Key: <uuid>` (satu per percobaan checkout; pakai kunci yang sama saat retry). Batas: 20 per 10 menit. Boleh tamu atau login.
```json
{
  "items": [{ "slug": "ethiopia-suke-quto", "variantId": "...", "option": "Whole beans", "qty": 1 }],
  "contact": { "email": "nadia@example.com", "newsletter": false },
  "address": {
    "firstName": "Nadia", "lastName": "Putri", "phone": "+62 812 3456 7890", "country": "Indonesia",
    "street": "Jl. Cipete Raya No. 18", "address2": "",
    "province": "DKI Jakarta", "city": "Jakarta Selatan", "district": "Cilandak", "postalCode": "12410"
  },
  "shippingId": "biteship:jne:reg",
  "paymentId": "qris",
  "discountCode": "SREG10",
  "note": "Tolong telepon dulu.",
  "saveAddress": true,
  "locale": "id"
}
```
Validasi alamat: Indonesia butuh `province` dan `district`. Luar negeri cukup `firstName, phone, street, city, postalCode, country`.

`201` (atau `200` bila replay `Idempotency-Key` yang sama):
```jsonc
{
  "id": "SRG-261103-4821",
  "status": "awaiting_payment",
  "createdAt": "2026-11-03T09:00:00.000Z",
  "items": [{ "slug": "...", "name": "...", "variant": "Whole beans / 250 g", "image": "...", "unitPrice": 195000, "qty": 1 }],
  "subtotal": 195000, "discount": 0, "discountCode": null, "shipping": 20000, "shippingName": "JNE Reguler",
  "paymentFee": 0, "tax": 0, "taxIncluded": true, "total": 215000,
  "contact": { "email": "...", "newsletter": false },
  "address": { "...": "..." },
  "note": "Tolong telepon dulu.",
  "payment": {
    "methodId": "qris",
    "expiresAt": "2026-11-04T09:00:00.000Z",
    "instructions": { "type": "redirect", "url": "https://checkout.xendit.co/web/...", "provider": "xendit", "invoiceId": "...", "expiresAt": "..." }
  },
  "receiptEmailSent": false,
  "guestToken": "48 karakter hex"   // hanya untuk pembeli tamu; simpan
}
```
`payment.instructions.type`:

| `type` | Field | Tindakan frontend |
|---|---|---|
| `redirect` | `url`, `provider?`, `invoiceId?`, `expiresAt?` | Buka `url` (boleh sebagai popup) |
| `virtual_account` | `bank`, `number`, `amount` | Tampilkan nomor VA |
| `qris` | `qrString`, `expiresAt` | Render sebagai kode QR |

Stok direservasi selama menunggu bayar (default 24 jam, lalu otomatis `expired`).

### 5.5 `GET /orders/lookup?number=SRG-...&token=...`
Batas: 60 per 10 menit. Pembeli login cukup `number`; tamu butuh `token` (`guestToken`). Nomor salah dan token salah sama-sama `404 not_found`.
Balasan: objek pesanan yang sama dengan 5.4 tanpa `guestToken`, ditambah `payment.paidAt`, `payment.cardBrand`, `payment.cardLast4` bila ada, dan:
```json
"tracking": { "carrier": "JNE", "number": "JNE123", "url": "https://...", "events": [{ "at": "...", "description": "..." }] }
```
`tracking` hanya ada bila nomor resi sudah diisi.

### 5.6 `POST /orders/:nomor/cancel`
Batas: 20 per 10 menit. Body tamu: `{ "token": "..." }` (atau `?token=`); pembeli login tanpa body.
- Hanya saat `awaiting_payment`. Pembayaran yang belum dibayar ikut ditutup di gateway.
- `200`: objek pesanan dengan `status: "cancelled"`.
- Sudah dibayar: `409 cannot_cancel` ("…Hubungi kami bila sudah dibayar.").
- Pembatalan pesanan berbayar dilakukan admin di panel; admin menerima email notifikasi, refund dilakukan manual di dashboard Xendit, dan status berubah ke `refunded` otomatis lewat webhook.

### Status pesanan
```
awaiting_payment → paid → processing → shipped → delivered
awaiting_payment → cancelled | expired
paid/processing → cancelled → refunded
expired/cancelled (dibayar belakangan) → refunded
```
| Status | Arti |
|---|---|
| `awaiting_payment` | Menunggu bayar, stok direservasi |
| `paid` | Pembayaran dikonfirmasi gateway (hanya server yang mengubah) |
| `processing` | Sedang disiapkan |
| `shipped` / `delivered` | Dikirim / diterima |
| `cancelled` | Dibatalkan |
| `expired` | Lewat batas bayar |
| `refunded` | Dana sudah dikembalikan |

---

## 6. Pembayaran

### `POST /payments/webhook/:provider` (dipanggil gateway, bukan frontend)
`:provider` = `xendit` atau `mock`. Tanpa login; keamanan lewat token/tanda tangan.

| Provider | Verifikasi |
|---|---|
| `xendit` | Header `x-callback-token` harus sama dengan `XENDIT_CALLBACK_TOKEN` |
| `mock` | Header `x-mock-signature` = HMAC-SHA256 (hex) dari body dengan `MOCK_PAYMENT_SECRET` |

Event Xendit yang diproses:
- Invoice `PAID` / `SETTLED` → pesanan `paid`
- Invoice `EXPIRED` → pesanan `expired`
- `refund.succeeded` → pesanan `refunded` (refund penuh). Refund sebagian hanya mencatat catatan. Bentuk payload refund **belum diverifikasi** terhadap akun Xendit sungguhan.

Balasan: `200 { "ok": true, "result": "applied" | "ignored" | "not_found" }` (juga `200` untuk event yang diabaikan agar gateway tidak mengulang); `401 invalid_webhook` bila token salah; `404` bila provider tidak dikenal.

URL yang didaftarkan di dashboard Xendit: `https://admin.locavps.my.id/api/payments/webhook/xendit` (untuk invoice paid, invoice expired, dan refund).

### `POST /payments/mock/simulate` (hanya uji)
Aktif bila `PAYMENT_PROVIDER=mock` dan (bukan produksi, atau `ALLOW_MOCK_SIMULATE=1`). Selain itu `404`. Batas 30 per 10 menit.
```json
{ "orderNumber": "SRG-261103-4821", "token": "<guestToken>", "status": "paid" }
```
`status`: `paid` (default) atau `expired`. Balasan `200 { "result": "..." }`.

---

## 7. Form publik

Semua `POST`, tanpa login. Sukses: `202 { "ok": true }`. Sertakan field honeypot `website` (kosong, sembunyikan dari pengguna); bot yang mengisinya dapat `202` palsu dan datanya dibuang. Validasi gagal: `422 validation_error`.

| Endpoint | Body | Batas |
|---|---|---|
| `POST /forms/contact` | `{ name, email, subject?, message }` | 5 / 10 menit |
| `POST /forms/wholesale` | `{ company, contactName, email, phone?, volume?, message? }` | 5 / 10 menit |
| `POST /forms/newsletter` | `{ email, source? }` (double opt-in, email konfirmasi dikirim) | 5 / 10 menit |
| `GET /forms/newsletter/confirm?token=...` | – | 20 / 10 menit. `200 { ok: true }` atau `404` |
| `POST /forms/stock-alert` | `{ email, slug, variantId? }` | 10 / 10 menit. `404` bila produk tidak ada |

Panjang maksimal: `name` 120, `subject` 200, `message` 5000, `email` 254, `company` 160, `phone` 30.

---

## 8. Pencarian, ulasan, wishlist, retur

### `GET /search?q=guji&locale=id&limit=12`
Batas 120 / 10 menit. `q` minimal 2 huruf (kurang dari itu `{ "docs": [], "totalDocs": 0 }`). `limit` 1–24. Mencari nama, asal, notes, spec, dan fakta.
```json
{ "docs": [{ "id": 1, "slug": "...", "name": "...", "eyebrow": "...", "category": {}, "image": {}, "isNew": true,
             "loyverse": { "price": 195000, "soldOut": false } }], "totalDocs": 1 }
```

### `POST /reviews` (wajib login)
Batas 10 / jam. `{ "productSlug": "...", "rating": 5, "title"?: "...", "body"?: "..." }`
`201 { "id": 7, "status": "pending" }`. Tampil di `GET /reviews` setelah dimoderasi. `409 already_reviewed`. `verifiedPurchase` terisi otomatis bila pernah membeli (pesanan berstatus paid atau setelahnya).

### `POST /returns`
Batas 10 / jam. Pesanan harus `shipped`/`delivered`.
```json
{ "orderNumber": "SRG-...", "token": "<guestToken tamu>", "items": [{ "slug": "...", "qty": 1 }],
  "reason": "damaged", "reasonText": "..." }
```
`reason`: `damaged`, `wrong_item`, `not_as_described`, `changed_mind`, `other`. `201 { "id": 3, "status": "requested" }`. Error: `404`, `409 not_returnable`, `422`.

### `GET /returns/lookup?order=SRG-...&token=...`
Batas 60 / 10 menit.
```json
{ "docs": [{ "id": 3, "status": "requested", "reason": "damaged", "items": [{ "slug": "...", "name": "...", "qty": 1 }], "refundAmount": null, "createdAt": "..." }] }
```

---

## 9. Integrasi Loyverse (admin / Loyverse)

### `POST /integrations/loyverse/sync`
Sinkron penuh manual. Hanya admin yang login ke panel (cookie). Harus `POST`; dibuka dari browser (GET) akan `Route not found`.
- `200`: `{ "total": 42, "updated": 3, "deactivated": 0, "unprofiled": 1, "warnings": [] }`
- `403 { "error": "Forbidden" }` bila bukan admin
- `502 { "error": "<pesan>" }` bila sinkron gagal (mis. token atau `storeId` Loyverse kosong/salah)

Sinkron juga berjalan otomatis tiap 5 menit di dalam proses aplikasi, **hanya bila `LOYVERSE_ACCESS_TOKEN` terisi**. Ringkasan dan error terakhir ada di panel: Globals → Integrations → Loyverse (`lastFullSyncAt`, `lastSummary`, `lastError`).

### `POST /integrations/loyverse/webhook`
Dipanggil Loyverse. Header `X-Loyverse-Signature` = HMAC-SHA1 base64 dari body mentah dengan `LOYVERSE_WEBHOOK_SECRET`.
- `202 { "ok": true }` (memicu sinkron penuh di latar belakang)
- `401 { "error": "invalid signature" }`, `503 { "error": "webhook not configured" }`

Produk di CMS: item Loyverse yang dicentang "tampilkan di web" menjadi produk **draf**; produk baru tampil di API publik setelah diterbitkan editor. Produk contoh dari seed (`SEED-...`) tidak ikut sinkron.

---

## 10. Aturan akses per koleksi (pihak luar / publik)

| Koleksi / global | Baca publik | Tulis publik |
|---|---|---|
| `products` | terbit + tidak disembunyikan + aktif | tidak |
| `product-categories`, `faqs`, `media`, `shipping-methods`, `payment-methods`, `provinces`, `cities`, `districts` | ya (yang aktif) | tidak |
| `articles`, `pages` | hanya terbit | tidak |
| `reviews` | hanya `approved` | lewat `POST /reviews` |
| `customers` | diri sendiri | daftar (`POST /customers`) |
| `orders` | tidak langsung; lewat `/orders/lookup` dan `/customers/me/orders` | lewat `/orders/create` |
| `returns`, `stock-alerts`, `newsletter-subscribers`, `contact-messages`, `wholesale-inquiries` | tidak | lewat endpoint form/retur |
| `discount-codes`, `email-templates`, `stock-reservations`, `loyverse-items`, `loyverse-categories`, `users` | tidak (staf) | tidak |
| `globals/*` konten (home, about, dst.) | ya | tidak |
| `globals/integrations` | tidak (hanya admin) | tidak |

Peran staf: `admin`, `ops`, `editor`.

---

## 11. Konfigurasi server (environment)

Nilai rahasia diisi di `.env` server, tidak pernah di repositori.

| Variabel | Fungsi |
|---|---|
| `DATABASE_URI`, `PAYLOAD_SECRET` | Database dan kunci Payload |
| `NEXT_PUBLIC_SERVER_URL` | URL publik CMS (dipakai tautan email dan CORS) |
| `FRONTEND_ORIGIN`, `EXTRA_ORIGINS` | Origin LP yang boleh memanggil API (CORS/CSRF); `EXTRA_ORIGINS` dipisah koma |
| `LOYVERSE_ACCESS_TOKEN`, `LOYVERSE_STORE_ID`, `LOYVERSE_WEBHOOK_SECRET` | Sinkron produk, harga, stok |
| `PAYMENT_PROVIDER` | `mock` atau `xendit` |
| `XENDIT_SECRET_KEY`, `XENDIT_CALLBACK_TOKEN` | Xendit |
| `MOCK_PAYMENT_SECRET`, `ALLOW_MOCK_SIMULATE` | Penyedia tiruan untuk uji |
| `BITESHIP_API_KEY` | Ongkir Indonesia |
| `FEDEX_*` | Ongkir luar negeri (belum aktif) |
| `ORDER_EXPIRY_HOURS` | Batas bayar (default 24) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Email (kosong = email hanya dicatat di log) |
| `REBUILD_HOOK_URL`, `PREVIEW_SECRET` | Rebuild LP dan Live Preview |

Setelah mengubah `.env`: `pm2 restart sreg-cms --update-env`.

---

## 12. Cek cepat dengan curl

```bash
API=https://admin.locavps.my.id/api

curl -s "$API/products?limit=2&depth=0" | head -c 400                      # katalog
curl -s "$API/globals/home?locale=id&depth=1" | head -c 400               # beranda
curl -s "$API/search?q=guji"                                              # pencarian
curl -s "$API/shipping-methods"                                           # metode kirim

curl -s -X POST "$API/checkout/quote" -H 'Content-Type: application/json' \
  -d '{"items":[{"slug":"ethiopia-suke-quto","qty":1}],"shippingId":"jne-reg","paymentId":"qris"}'

# Cek CORS dari origin LP (harus ada access-control-allow-origin dan Idempotency-Key)
curl -si -X OPTIONS "$API/orders/create" -H 'Origin: https://locavps.my.id' \
  -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type,idempotency-key' | head -20
```
