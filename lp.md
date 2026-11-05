# Panduan API untuk tim Landing Page (LP)

Dokumen ini untuk tim yang membangun situs sregcoffee (Astro + React) dan mengambil data dari CMS (Payload). Isinya hanya yang **sudah jadi dan sudah diuji**; yang belum ada ada di bagian 11.

## 0. Data contoh (seed)

Agar ada isi untuk dikonsumsi, CMS punya data contoh (teks lorem ipsum, foto dari `media/images`). Tim CMS menjalankannya dengan `pnpm seed` (aman diulang). Isinya:

| Data | Jumlah / catatan |
|---|---|
| Kategori | 3: `beans`, `drinks`, `bakery` (dengan `sectorImage`) |
| Produk | 13, semuanya terbit: 6 biji kopi (2 varian: 250 g dan 1 kg, ada `lineOptions` Grind), 4 minuman, 3 roti. Slug contoh: `ethiopia-suke-quto`, `kenya-kiambu-aa`, `colombia-pink-bourbon`, `toraja-sapan-honey` |
| Harga & stok | **Palsu**, hanya agar tampil. Produk contoh memakai `loyverse.itemId` berawalan `SEED-` dan tidak ikut sinkron Loyverse. Akan diganti produk asli dari Loyverse sebelum rilis |
| Artikel | 6, terbit, ada `category` dan gambar; di dalam `body` ada judul H2/H3, daftar, kutipan, dan gambar |
| Halaman | `terms`, `privacy`, `shipping-returns` |
| FAQ | 8, kategori `ordering`, `shipping`, `payment`, `products`, `wholesale` |
| Ulasan | 4 ulasan yang disetujui; `ratingAvg`/`ratingCount` terisi pada 3 produk |
| Metode kirim / bayar | `jne-reg`, `jne-yes`; `card`, `bank-transfer`, `qris`. Kode diskon `SREG10` (10%) |
| Global | `home`, `about` (4 foto), `gallery` (12 foto), `navigation`, `footer`, `announcement`, `site-settings`, `news-page`, `faq-page`, `contact-page`, `ui-strings` (6 kunci contoh) terisi dan terbit |
| Akun uji | `demo@sregcoffee.test` / `Demo12345` (sudah terverifikasi) |

Semua teks berbahasa Inggris; `?locale=id` otomatis jatuh ke teks Inggris sampai terjemahan diisi. Pesanan tidak di-seed: buat lewat alur checkout.

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
`fields` hanya ada pada error validasi (HTTP 422). Kode umum: `validation_error`, `not_found` (404), `unauthorized` (401), `rate_limited` (429), `out_of_stock`, `option_required`, `invalid_option`, `variant_required`, `invalid_discount`, `product_unavailable`, `payment_unavailable` (503), `stock_unavailable` (503), `invalid_shipping` (422), `shipping_unavailable` (503/422).

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
| `GET /articles?locale=id&depth=1&sort=-publishedAt&limit=12` | Artikel (News); satu artikel: `where[slug][equals]=…`. Field: `slug`, `title`, `category` (label kecil, mis. `ROASTERY`, opsional), `excerpt`, `body` (Lexical), `image`, `publishedAt`, `featured`, `tags`, `meta`. Tidak ada field `author`. |
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

### 5.2 Ongkir: `POST /shipping/rates`
Tarif dihitung server dari berat isi keranjang dan tujuan. **Indonesia** lewat Biteship; **luar negeri** lewat FedEx (belum aktif, balasan `503 shipping_unavailable`).

```json
{ "items": [{ "slug": "…", "variantId": "…", "qty": 2 }], "destination": { "country": "Indonesia", "postalCode": "12410" } }
```
Balasan (termurah dulu):
```json
{ "rates": [{ "id": "biteship:jne:reg", "provider": "biteship", "courier": "jne", "service": "reg", "name": "JNE Reguler", "price": 18500, "etaDays": [1, 2] }] }
```
- `destination.country`: nama atau kode ISO (`Indonesia` atau `ID`). `postalCode` wajib untuk tujuan Indonesia; `areaId` (opsional) lebih akurat.
- Tampilkan `name`, `price`, `etaDays` (hari). Kirim `id` yang dipilih sebagai `shippingId` di quote dan `orders/create`. Server menghitung ulang tarifnya; angka dari frontend tidak dipercaya.
- Tarif bisa berubah antar-permintaan; bila `quote`/`create` membalas `invalid_shipping`, ambil tarif ulang dan minta pembeli memilih lagi.
- Bila `503 shipping_unavailable` (belum dikonfigurasi atau layanan bermasalah), pakai metode tetap dari `GET /shipping-methods` (`shippingId` = `slug`-nya), tanpa `destination`.
- `GET /shipping/areas?q=cilandak` (≥ 3 huruf) mencari area dalam negeri: `{ areas: [{ id, name, postalCode }] }`. Bisa dipakai untuk pengisian alamat dan mengirim `areaId`.

### 5.3 Hitung total: `POST /checkout/quote`
```json
{
  "items": [{ "slug": "ethiopia-suke-quto", "variantId": "…", "option": "Whole beans", "qty": 2 }],
  "shippingId": "biteship:jne:reg",
  "destination": { "country": "Indonesia", "postalCode": "12410" },
  "paymentId": "qris",
  "discountCode": "SREG10",
  "locale": "id"
}
```
- `destination` wajib bila `shippingId` berupa tarif penyedia (`biteship:…`); tidak perlu untuk metode tetap.
- `variantId` wajib bila produk punya lebih dari satu varian.
- `option` wajib bila produk punya `lineOptions` (mis. Grind).

Balasan:
```json
{
  "items": [{ "slug": "…", "name": "…", "variantId": "…", "option": "Whole beans", "qty": 2, "unitPrice": 195000, "lineTotal": 390000, "inStock": true }],
  "subtotal": 390000,
  "discount": { "code": "SREG10", "amount": 39000 },      // null bila tanpa kode
  "shipping": { "id": "biteship:jne:reg", "name": "JNE Reguler", "price": 20000, "etaDays": [1, 2] },  // null bila belum dipilih
  "paymentFee": 0, "tax": 0, "taxIncluded": true, "total": 371000
}
```
Panggil ulang setiap keranjang, pengiriman, pembayaran, atau kode diskon berubah.

### 5.4 Buat pesanan: `POST /orders/create`
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
  "shippingId": "biteship:jne:reg",
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

Alamat: untuk **Indonesia** `province` dan `district` wajib. Untuk **luar negeri** (`address.country` bukan Indonesia) cukup `firstName`, `phone`, `street`, `city`, `postalCode`, `country`.

Server mereservasi stok selama pesanan menunggu pembayaran (default 24 jam, lalu otomatis `expired`).

### 5.5 Lihat dan batalkan pesanan
- `GET /orders/lookup?number=SRG-261103-4821&token=<guestToken>` → pesanan. Pembeli yang login cukup memakai `number` (cookie). Nomor salah dan token salah sama-sama `404`.
- `POST /orders/SRG-261103-4821/cancel` dengan body `{ "token": "<guestToken>" }` (tamu). **Hanya selama `awaiting_payment`** (belum dibayar). Setelah dibayar membalas `409 cannot_cancel`; tampilkan pesan agar pembeli menghubungi toko. Pembatalan pesanan berbayar dilakukan admin, lalu refund manual dari dashboard Xendit; status pesanan berubah ke `refunded` otomatis setelah refund berhasil (pantau lewat `GET /orders/lookup`).

Status pesanan: `awaiting_payment → paid → processing → shipped → delivered`, atau `cancelled` / `expired` / `refunded`. Tampilkan `tracking` (`carrier`, `number`, `url`, `events`) bila ada.

> **Simpan `guestToken` di halaman konfirmasi dan di URL email** (`/order/<nomor>?token=…`). Tanpa token, pembeli tamu tidak bisa membuka pesanannya lagi.

### 5.6 Pembayaran
Status `paid` ditentukan **server** lewat webhook gateway; frontend tidak mengirimkannya. Setelah pembeli kembali dari halaman bayar, polling `GET /orders/lookup` tiap beberapa detik sampai `status` berubah.

**Xendit (popup).** Bila CMS memakai Xendit, `payment.instructions` berbentuk:
```json
{ "type": "redirect", "url": "https://checkout.xendit.co/web/…", "provider": "xendit", "invoiceId": "…", "expiresAt": "…" }
```
Bentuknya sama dengan `redirect` biasa, jadi `url` boleh dibuka sebagai **popup** (`window.open(url, 'xendit', 'width=480,height=720')`) alih-alih mengalihkan halaman. Halaman bayar Xendit memuat pilihan kartu, virtual account, QRIS, dan e-wallet sesuai metode yang dipilih pembeli; data kartu tidak pernah lewat frontend atau CMS.
- Setelah popup dibuka, polling `GET /orders/lookup` tiap 3–5 detik sampai `status` bukan `awaiting_payment`; jangan menganggap lunas hanya karena popup ditutup.
- Setelah bayar, Xendit mengarahkan popup ke `/order/<nomor>?token=…` di frontend; halaman itu boleh menutup dirinya sendiri (`window.close()`) dan memberi tahu jendela utama.
- Jika popup diblokir peramban, buka `url` di tab biasa.
- `instructions` dibuat saat `POST /orders/create`; simpan dan pakai ulang saat pembeli kembali ke pesanan (`GET /orders/lookup` ikut mengembalikan `payment.instructions`; tampilkan tombol "Bayar" hanya bila `status` = `awaiting_payment`).

Saat pengembangan (penyedia tiruan, bukan produksi): `POST /payments/mock/simulate` dengan `{ "orderNumber": "…", "token": "…", "status": "paid" }` (atau `"expired"`) untuk mensimulasikan hasil pembayaran.

### 5.7 Catatan implementasi checkout (untuk tim LP)

**Sudah bisa dikerjakan sekarang.** Seluruh alur ini sudah jalan dan diuji di sisi CMS: katalog → ongkir (`/shipping/rates`) → `/checkout/quote` → `/orders/create` → bayar → `/orders/lookup`. Selama kunci Xendit belum dipasang di CMS, pembayaran memakai penyedia tiruan (`type: "redirect"` ke `/mock-pay?order=…`, hasil disimulasikan lewat `/payments/mock/simulate`). Bentuk respons Xendit **sama persis** dengan penyedia tiruan, jadi bangun alurnya sekarang; saat tim CMS memasang kunci Xendit, kode Anda tidak perlu berubah.

**Yang belum bisa diuji end-to-end:** popup Xendit sungguhan (menunggu kunci Xendit) dan tarif Biteship sungguhan (menunggu kunci Biteship). Tim CMS akan memberi tahu bila sudah aktif. Sementara itu, bila `/shipping/rates` membalas `503 shipping_unavailable`, pakai metode tetap dari `/shipping-methods`.

**Urutan di halaman checkout**
1. Alamat → `POST /shipping/rates` → pembeli memilih tarif (`id` dikirim sebagai `shippingId`).
2. Pilih metode bayar → `POST /checkout/quote` → tampilkan angka dari server (jangan hitung sendiri).
3. Klik "Bayar": panggil `POST /orders/create` dengan `Idempotency-Key` baru per percobaan (pakai kunci yang sama saat retry jaringan, kunci baru bila pembeli mengubah isi keranjang).
4. Simpan `id` (nomor pesanan) dan `guestToken` (tamu) sebelum membuka halaman bayar.
5. Buka `payment.instructions.url`, lalu polling `GET /orders/lookup` (3–5 detik) sampai `status` bukan `awaiting_payment`.

**Popup tanpa diblokir peramban.** `window.open` hanya diizinkan langsung dari klik pengguna, padahal `url` baru ada setelah `orders/create` selesai. Buka jendela kosong **dulu** saat klik, lalu arahkan setelah respons datang:
```ts
const popup = window.open('', 'xendit', 'width=480,height=720')   // di handler klik, sebelum await
const order = await createOrder(...)
if (popup && order.payment.instructions.type === 'redirect') popup.location.href = order.payment.instructions.url
else location.href = order.payment.instructions.url               // popup diblokir → alihkan halaman
```
Bila `create` gagal, tutup popup (`popup?.close()`) dan tampilkan pesan error.

**Halaman `/order/<nomor>?token=…`** (wajib ada; dipakai email dan redirect Xendit). Tampilkan status berdasarkan `status`:
| `status` | Tampilan |
|---|---|
| `awaiting_payment` | Tombol "Bayar" (buka `payment.instructions.url` lagi), hitung mundur ke `payment.expiresAt`, tombol "Batalkan pesanan" |
| `paid` / `processing` | "Pembayaran diterima, pesanan diproses". **Tanpa** tombol batal |
| `shipped` / `delivered` | Nomor resi dan tautan pelacakan (`tracking`) |
| `expired` | "Waktu pembayaran habis", tawarkan pesan ulang |
| `cancelled` | "Pesanan dibatalkan". Bila sebelumnya sudah dibayar, dana dikembalikan oleh toko secara manual |
| `refunded` | "Dana sudah dikembalikan" |

**Pembatalan.** Pembeli hanya bisa membatalkan saat `awaiting_payment` (`409 cannot_cancel` setelahnya). Untuk pesanan yang sudah dibayar, tampilkan teks "Hubungi kami untuk pembatalan" dengan tautan kontak. Refund diproses toko dan status berubah ke `refunded` sendiri.

**Jangan**
- menghitung total, ongkir, atau diskon di frontend;
- menganggap pesanan lunas karena popup ditutup atau redirect sukses: hanya `status` dari `/orders/lookup` yang berlaku;
- menyimpan atau meminta data kartu (semuanya di halaman Xendit);
- menyimpan `guestToken` di tempat yang bisa dibaca pihak ketiga (cukup di URL konfirmasi dan memori halaman).

**Error yang perlu penanganan khusus:** `out_of_stock` (kembali ke keranjang), `invalid_shipping` (ambil tarif ulang dan minta pilih lagi), `invalid_discount`, `payment_failed` 502 (pesanan otomatis dibatalkan; izinkan coba lagi), `payment_unavailable` 503, `rate_limited` 429.

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
  body: JSON.stringify({ /* lihat 5.4 */ }),
}).then(async (r) => (r.ok ? r.json() : Promise.reject((await r.json()).error)))
```

## 11. Belum tersedia (jangan dibangun dulu)
- **Pembayaran sungguhan.** Xendit sudah dibuat (lihat 5.6) tetapi **belum diuji terhadap akun Xendit sungguhan**; sampai kunci terpasang, CMS memakai penyedia tiruan.
- **Ongkir:** tarif Biteship (Indonesia) sudah ada tetapi **belum diuji terhadap akun Biteship sungguhan**; FedEx (luar negeri) belum aktif. Booking kurir, resi, dan pelacakan otomatis belum ada.
- **Data wilayah** (provinsi/kota/kecamatan) belum diisi. Untuk alamat dalam negeri pakai `GET /shipping/areas`; sementara juga boleh input teks.
- **Invoice** (`/orders/:id/invoice`) dan **langganan** belum ada.
- **Refund otomatis.** Pembatalan pesanan berbayar diproses manual oleh ops.
- **Unggah foto retur** dari pelanggan belum ada.
- **Pajak:** akun Loyverse saat ini tanpa pajak, jadi `tax` selalu `0`.
- Stok Loyverse bisa negatif; produk dengan stok ≤ 0 muncul sebagai `soldOut`.
