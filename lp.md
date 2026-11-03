# Panduan API untuk tim Landing Page (LP)

Dokumen ini untuk tim yang membangun situs sregcoffee (Astro + React) dan mengambil data dari CMS (Payload). Isinya hanya yang **sudah jadi dan sudah diuji**; yang belum ada ada di bagian 11.

## 1. Dasar

| Hal | Nilai |
|---|---|
| Base URL | `https://<domain-cms>/api` (dev: `http://localhost:3000/api`) |
| Format | JSON, UTF-8 |
| Uang | Bilangan bulat Rupiah (`195000`), tanpa desimal |
| Waktu | ISO 8601 UTC |
| Bahasa | Tambahkan `?locale=id` atau `?locale=en`. Bila terjemahan kosong, otomatis jatuh ke `en`. |
| CORS | Hanya origin yang didaftarkan di `FRONTEND_ORIGIN` (dev: `http://localhost:4321`). Minta ke tim CMS untuk menambah domain. |
| Login pelanggan | Cookie `payload-token` (`HttpOnly`). Semua `fetch` yang butuh login harus memakai `credentials: 'include'`. |

**Harga, pajak, dan stok bukan data CMS.** Semuanya berasal dari Loyverse dan disalin CMS tiap 5 menit. Jangan menghitung total di frontend: selalu pakai `POST /checkout/quote` dan tampilkan angka dari server.

### Format error (semua endpoint kustom)
```json
{ "error": { "code": "out_of_stock", "message": "Stok tidak cukup.", "fields": { "items.0.qty": "Maksimal 3" } } }
```
`fields` hanya ada pada error validasi (HTTP 422). Kode umum: `validation_error`, `not_found` (404), `unauthorized` (401), `rate_limited` (429), `out_of_stock`, `option_required`, `invalid_option`, `variant_required`, `invalid_discount`, `product_unavailable`, `payment_unavailable` (503), `stock_unavailable` (503).

Endpoint kustom dibatasi laju per IP. Bila kena `429`, tunggu sebentar lalu coba lagi.

## 2. Katalog (baca saja, tanpa login)

Memakai REST bawaan Payload. Hanya produk yang **terbit, tidak disembunyikan, dan aktif** yang terlihat oleh publik.

| Endpoint | Fungsi |
|---|---|
| `GET /product-categories?locale=id` | Kategori (`slug`, `label`, `blurb`, `sectorImage`, `sectorBadge`, `order`) |
| `GET /products?locale=id&depth=1&limit=24&page=1` | Daftar produk |
| `GET /products?where[slug][equals]=ethiopia-suke-quto&depth=1&limit=1` | Satu produk menurut slug |
| `GET /products?where[category.slug][equals]=beans&sort=featuredRank` | Filter per kategori |
| `GET /search?q=guji&locale=id&limit=12` | Pencarian (nama, asal, notes, spec). Minimal 2 huruf. |

Balasan daftar berbentuk `{ docs: [...], totalDocs, page, totalPages, hasNextPage, ... }`.

Field penting satu produk:

```jsonc
{
  "slug": "ethiopia-suke-quto",
  "name": "ETHIOPIA SUKE QUTO",
  "eyebrow": "GUJI, ETHIOPIA // 2000 MASL",
  "category": { "slug": "beans", "label": "BEANS" },     // dengan depth=1
  "score": 88.5,
  "specs": [{ "label": "PROCESS:", "value": "Washed" }],
  "notes": [{ "note": "JASMINE" }],
  "size": "250G POUCH",
  "unit": "250 g",
  "image": { "url": "/api/media/file/...", "alt": "...", "sizes": { "card": { "url": "..." } } },
  "variantLabels": [{ "variantId": "…", "label": "250 g" }],
  "lineOptions": { "label": "Grind", "choices": [{ "label": "Whole beans" }] },
  "isNew": true,
  "featuredRank": 1,
  "ratingAvg": 4.8, "ratingCount": 12,
  "detail": { "summary": "…", "story": "…", "tagline": "…", "facts": [{ "label": "PRODUCER", "value": "…" }] },
  "loyverse": {                         // dari Loyverse, baca saja
    "price": 195000,                    // harga mulai (varian termurah)
    "soldOut": false, "lowStock": false,
    "taxIncluded": true, "taxRate": 0,
    "variants": [{ "variantId": "…", "sku": "…", "optionLabel": "250 g", "price": 195000, "soldOut": false }]
  }
}
```

Catatan:
- **Stok mentah tidak pernah dikirim ke publik.** Pakai `soldOut` dan `lowStock`.
- Tampilkan nama varian dari `variantLabels` bila ada; bila tidak, pakai `loyverse.variants[].optionLabel`.
- Untuk menampilkan harga per varian, gunakan `loyverse.variants[].price`.
- Gambar tersedia dalam beberapa ukuran: `thumb` 400, `card` 800, `hero` 1920, `full` 2560, `og` 1200×630. Pakai ukuran terkecil yang cukup.
- Produk yang barusan dicentang di admin berstatus draf dan **belum muncul** sampai tim konten menerbitkannya.

## 3. Konten halaman

| Endpoint | Isi |
|---|---|
| `GET /globals/home?locale=id&depth=2` | Beranda |
| `GET /globals/about`, `/globals/news-page`, `/globals/faq-page`, `/globals/contact-page`, `/globals/gallery` | Halaman statis |
| `GET /globals/navigation`, `/globals/footer`, `/globals/announcement`, `/globals/site-settings` | Elemen situs |
| `GET /globals/ui-strings?locale=id` | Teks antarmuka: daftar `{ key, value }` |
| `GET /articles?locale=id&sort=-publishedAt&limit=12` | Artikel (News); satu artikel: `where[slug][equals]=…` |
| `GET /pages?where[slug][equals]=privacy` | Halaman legal |
| `GET /faqs?locale=id&sort=order` | FAQ |
| `GET /reviews?where[product.slug][equals]=…&sort=-createdAt` | Ulasan yang sudah disetujui |

Teks rich text (artikel, halaman) berbentuk JSON **Lexical**; render dengan `@payloadcms/richtext-lexical` atau konverter HTML.

SEO: artikel, halaman, dan produk punya field `meta` (`title`, `description`, `image`) dari plugin SEO. Pengalihan URL ada di `GET /redirects`.

## 4. Akun pelanggan

Auth bawaan Payload pada koleksi `customers`. Semua memakai `credentials: 'include'`.

| Endpoint | Body | Catatan |
|---|---|---|
| `POST /customers` | `{ name, email, password, phone?, newsletter? }` | Daftar. Email verifikasi dikirim. Kata sandi minimal 8, ada huruf dan angka. |
| `POST /customers/verify/:token` | | Token dari tautan email (`<frontend>/verify?token=…`). |
| `POST /customers/login` | `{ email, password }` | **Ditolak sebelum email diverifikasi.** Terkunci 10 menit setelah 5 kali salah. |
| `POST /customers/logout` | | |
| `GET /customers/me` | | `{ user }` atau `user: null` bila belum login. |
| `PATCH /customers/:id` | `{ name, phone, addresses, newsletter }` | Hanya data sendiri. |
| `POST /customers/forgot-password` | `{ email }` | Selalu sukses; email berisi `<frontend>/reset-password?token=…`. |
| `POST /customers/reset-password` | `{ token, password }` | |
| `GET /customers/me/orders?page=1&per_page=10` | | Riwayat pesanan, `{ data, meta }`. |
| `POST /wishlist` | `{ productSlug, action? }` | `action`: `add`/`remove`; kosong = toggle. Wajib login. |

Alamat tersimpan: array `addresses` di data pelanggan (`label, firstName, lastName, phone, country, street, address2, province, city, district, postalCode, isDefault`).

## 5. Checkout

### 5.1 Data pendukung (baca saja)
- `GET /shipping-methods?sort=order` → `{ slug, name, etaText, price, … }` yang aktif
- `GET /payment-methods?sort=order` → `{ slug, name, detail, fee, … }` yang aktif (`card`, `bank-transfer`, `qris`)
- `GET /provinces`, `GET /cities?where[province][equals]=<id>`, `GET /districts?where[city][equals]=<id>` untuk dropdown alamat (data wilayah belum diisi, lihat bagian 11)

### 5.2 Hitung total: `POST /checkout/quote`
```json
{
  "items": [{ "slug": "ethiopia-suke-quto", "variantId": "…", "option": "Whole beans", "qty": 2 }],
  "shippingId": "jne-reg",
  "paymentId": "qris",
  "discountCode": "SREG10",
  "locale": "id"
}
```
- `variantId` wajib bila produk punya lebih dari satu varian.
- `option` wajib bila produk punya `lineOptions` (mis. Grind).

Balasan:
```json
{
  "items": [{ "slug": "…", "name": "…", "variantId": "…", "option": "Whole beans", "qty": 2, "unitPrice": 195000, "lineTotal": 390000, "inStock": true }],
  "subtotal": 390000, "discount": 39000, "shipping": 20000, "paymentFee": 0,
  "tax": 0, "taxIncluded": true, "total": 371000
}
```
Panggil ulang setiap keranjang, pengiriman, pembayaran, atau kode diskon berubah.

### 5.3 Buat pesanan: `POST /orders/create`
Header: `Idempotency-Key: <uuid>` (buat sekali per percobaan checkout; kirim ulang kunci yang sama saat retry agar tidak ada pesanan ganda).

```json
{
  "items": [{ "slug": "…", "variantId": "…", "option": "Whole beans", "qty": 1 }],
  "contact": { "email": "nadia@example.com", "newsletter": false },
  "address": {
    "firstName": "Nadia", "lastName": "Putri", "phone": "+62 812 3456 7890", "country": "Indonesia",
    "street": "Jl. Cipete Raya No. 18", "address2": "",
    "province": "DKI Jakarta", "city": "Jakarta Selatan", "district": "Cilandak", "postalCode": "12410"
  },
  "shippingId": "jne-reg",
  "paymentId": "qris",
  "discountCode": "SREG10",
  "note": "Tolong telepon dulu.",
  "saveAddress": true,
  "locale": "id"
}
```
Balasan `201` (atau `200` bila itu replay dari `Idempotency-Key` yang sama):
```jsonc
{
  "id": "SRG-261103-4821",           // nomor pesanan
  "status": "awaiting_payment",
  "items": [ … ], "subtotal": 195000, "discount": 0, "shipping": 20000, "paymentFee": 0, "tax": 0, "total": 215000,
  "contact": { … }, "address": { … },
  "payment": {
    "methodId": "qris",
    "expiresAt": "2026-11-04T10:00:00.000Z",
    "instructions": { "type": "qris", "qrString": "…", "expiresAt": "…" }
  },
  "guestToken": "…48 hex…"            // HANYA untuk pembeli tamu; simpan
}
```
`payment.instructions.type`:
- `redirect` → arahkan pembeli ke `url`
- `virtual_account` → tampilkan `bank`, `number`, `amount`
- `qris` → render `qrString` sebagai kode QR

Server mereservasi stok selama pesanan menunggu pembayaran (default 24 jam, lalu otomatis `expired`).

### 5.4 Lihat dan batalkan pesanan
- `GET /orders/lookup?number=SRG-261103-4821&token=<guestToken>` → pesanan. Pembeli yang login cukup memakai `number` (cookie). Nomor salah dan token salah sama-sama `404`.
- `POST /orders/SRG-261103-4821/cancel` dengan body `{ "token": "<guestToken>" }` (tamu). Boleh selama status `awaiting_payment` atau `paid`. Pesanan berbayar yang dibatalkan ditandai untuk refund manual oleh tim ops.

Status pesanan: `awaiting_payment → paid → processing → shipped → delivered`, atau `cancelled` / `expired` / `refunded`. Tampilkan `tracking` (`carrier`, `number`, `url`, `events`) bila ada.

> **Simpan `guestToken` di halaman konfirmasi dan di URL email** (`/order/<nomor>?token=…`). Tanpa token, pembeli tamu tidak bisa membuka pesanannya lagi.

### 5.5 Pembayaran
Status `paid` ditentukan **server** lewat webhook gateway; frontend tidak mengirimkannya. Setelah pembeli kembali dari halaman bayar, polling `GET /orders/lookup` tiap beberapa detik sampai `status` berubah.

Saat pengembangan (penyedia tiruan, bukan produksi): `POST /payments/mock/simulate` dengan `{ "orderNumber": "…", "token": "…", "status": "paid" }` (atau `"expired"`) untuk mensimulasikan hasil pembayaran.

## 6. Form publik (tanpa login)

Semua `POST`, balasan `202 { "ok": true }`. Sertakan field **honeypot** `website` di form tetapi **biarkan kosong dan sembunyikan dari pengguna** (bot yang mengisinya diabaikan diam-diam). Dibatasi laju.

| Endpoint | Body |
|---|---|
| `/forms/contact` | `{ name, email, subject?, message }` |
| `/forms/wholesale` | `{ company, contactName, email, phone?, volume?, message? }` |
| `/forms/newsletter` | `{ email, source? }` → email konfirmasi (double opt-in) |
| `GET /forms/newsletter/confirm?token=…` | konfirmasi dari tautan email |
| `/forms/stock-alert` | `{ email, slug, variantId? }` → email saat stok kembali |

## 7. Retur dan ulasan

- `POST /returns` `{ orderNumber, token?, items: [{ slug, qty }], reason, reasonText? }`. `reason`: `damaged`, `wrong_item`, `not_as_described`, `changed_mind`, `other`. Hanya untuk pesanan `shipped`/`delivered`.
- `GET /returns/lookup?order=…&token=…` → status retur.
- `POST /reviews` `{ productSlug, rating (1–5), title?, body? }`. Wajib login; satu ulasan per produk; tampil setelah dimoderasi.

## 8. Email
Email transaksional (pesanan dibuat, dibayar, dikirim, dibatalkan, verifikasi, reset kata sandi, dll.) dikirim CMS. Tautan di dalamnya menunjuk ke rute frontend berikut; **buat halaman-halaman ini**:

`/verify?token=` · `/reset-password?token=` · `/order/<nomor>?token=` · `/newsletter/confirm?token=` · `/products/<slug>` · `/mock-pay?order=` (hanya dev)

## 9. Live Preview dan rebuild
- Draf bisa dipratinjau dari admin lewat Live Preview ke situs LP (butuh rute pratinjau dengan `PREVIEW_SECRET`; koordinasikan dengan tim CMS).
- Konten editorial bisa dibuat statis. CMS memanggil `REBUILD_HOOK_URL` (ditunda 45 detik) setiap konten berubah. Harga, stok, dan `soldOut` **jangan** di-bake saat build; ambil saat runtime.

## 10. Contoh cepat
```ts
const API = import.meta.env.PUBLIC_CMS_URL + '/api'

// Daftar produk beans
const res = await fetch(`${API}/products?locale=id&depth=1&limit=24&where[category.slug][equals]=beans`)
const { docs } = await res.json()

// Quote + buat pesanan
const quote = await fetch(`${API}/checkout/quote`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ items: [{ slug: 'ethiopia-suke-quto', qty: 1 }], shippingId: 'jne-reg', paymentId: 'qris' }),
}).then((r) => r.json())

const order = await fetch(`${API}/orders/create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
  credentials: 'include',
  body: JSON.stringify({ /* lihat 5.3 */ }),
}).then(async (r) => (r.ok ? r.json() : Promise.reject((await r.json()).error)))
```

## 11. Belum tersedia (jangan dibangun dulu)
- **Pembayaran sungguhan.** Sekarang hanya penyedia tiruan; `instructions` dari gateway nyata menyusul dengan bentuk yang sama.
- **Ongkir dari API.** Harga pengiriman masih tetap per metode; `/api/shipping/rates` belum ada.
- **Data wilayah** (provinsi/kota/kecamatan) belum diisi; sementara pakai input teks.
- **Invoice** (`/orders/:id/invoice`) dan **langganan** belum ada.
- **Refund otomatis.** Pembatalan pesanan berbayar diproses manual oleh ops.
- **Unggah foto retur** dari pelanggan belum ada.
- **Pajak:** akun Loyverse saat ini tanpa pajak, jadi `tax` selalu `0`.
- Stok Loyverse bisa negatif; produk dengan stok ≤ 0 muncul sebagai `soldOut`.
