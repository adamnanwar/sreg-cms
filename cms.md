# CMS sregcoffee: spesifikasi Payload untuk tim CMS

Dokumen ini adalah brief untuk tim CMS yang membangun backend **Payload CMS** untuk sregcoffee.
Tujuannya: **semua konten di web (termasuk beranda) diatur dari CMS**, dan frontend (Astro + React, di VPS) hanya mengonsumsi API-nya.

- Semua nama field dan teks di dokumen ini **diambil dari kode frontend saat ini**, jadi bisa dipakai langsung sebagai skema awal.
- Kontrak checkout, pesanan, dan pembayaran yang lebih rinci ada di [`cms-api-notes.md`](cms-api-notes.md) (bagian 5 dan 6). Dokumen ini memetakannya ke Payload (bagian 8).
- Yang ditandai **(usulan)** boleh didiskusikan. Yang ditandai **(wajib)** dibutuhkan frontend.
- Daftar kekurangan frontend ada di [`techdebt.md`](techdebt.md).
- **Harga, pajak (PPN), stok, dan data dasar produk dikelola di Loyverse. Invoice dibuat di Xero.** CMS **tidak** menjadi sumber harga, pajak, atau stok; admin Payload tidak punya input untuk itu. Lihat 1.1 dan bagian 15.

Asumsi versi: **Payload 3.x** (berjalan di dalam aplikasi Next.js). Kalau tim memilih versi lain, kabari kami karena bentuk URL API dan konfigurasi akses bisa berbeda.

---

## 1. Keputusan arsitektur

| Hal | Keputusan | Alasan |
|---|---|---|
| Aplikasi CMS | Proyek Next.js + Payload **terpisah** dari frontend, domain `cms.<domain>` (API di `/api`) | Frontend tetap ringan; CMS di-deploy dan di-scale sendiri |
| Database | **PostgreSQL** (`@payloadcms/db-postgres`, dijalankan di VPS sendiri) | Pesanan dan stok butuh transaksi dan relasi |
| Media | **Disk lokal VPS** (storage bawaan Payload, folder `media/` di volume persisten, disajikan Nginx/Caddy). Opsi lanjut: MinIO / S3-compatible lewat `@payloadcms/storage-s3` | Tanpa layanan eksternal; wajib di-backup bersama database |
| Rich text | **Lexical** (`@payloadcms/richtext-lexical`) | Bawaan Payload 3 |
| Bahasa | **`en` dan `id`**, default `en`, `fallback: true` | UI sekarang Inggris; target pembeli Indonesia |
| Struktur halaman | **Global dengan bagian tetap** untuk Home, About, Gallery, News, FAQ, Contacts. **Collection `pages`** untuk halaman bebas (Terms, Privacy, dll.) | Desain berukuran tetap (1920 px); editor mengubah isi, bukan tata letak |
| Versi / draft | `versions.drafts` di produk, artikel, halaman, dan semua global | Editor bisa menyiapkan lalu menerbitkan |
| Konsumsi frontend | REST API Payload (`/api/...`). GraphQL tidak dipakai | Lebih sederhana, mudah di-cache |

### 1.1 Sumber kebenaran data

| Data | Sumber kebenaran | Di Payload |
|---|---|---|
| Item, SKU, varian, **harga**, **pajak (PPN)**, **stok** | **Loyverse** | cache baca-saja di `products.loyverse` (15.2) |
| Teks, foto, cerita, notes, SEO produk; semua konten editorial | **Payload** | sumber |
| Pesanan web, status pembayaran, resi, retur, ulasan | **Payload** | sumber |
| Catatan penjualan dan pengurangan stok | **Loyverse** (receipt dibuat server saat pesanan `paid`) | referensi di `orders.loyverse` |
| **Invoice**, kontak akuntansi, pembayaran, credit note | **Xero** | referensi di `orders.xero` |
| Ongkir | API ongkir + `shipping-methods` | sumber |
| Kode diskon web | Payload (usulan, lihat pertanyaan 16) | sumber |

Aturan: tidak ada field harga, pajak, atau stok yang bisa diisi editor di Payload. Frontend tidak pernah memanggil Loyverse atau Xero langsung; semuanya lewat API CMS (token tetap rahasia di server).

### 1.2 Cara frontend mengambil data (dua jenis)

1. **Konten editorial** (Home, About, News, FAQ, Gallery, halaman legal, info toko, menu, footer): diambil saat **build**, dan situs dibangun ulang otomatis ketika editor menerbitkan (hook Payload memanggil skrip/webhook build di VPS, hasilnya disajikan Nginx/Caddy).
2. **Data dinamis** (stok, harga, pajak, ketersediaan, kuotasi, akun, pesanan): diambil saat **runtime** dari browser atau server, tidak pernah di-bake ke HTML. Harga, pajak, dan stok berasal dari Loyverse lewat cache di CMS.

Kalau tim lebih suka SSR penuh, bilang saja; frontend bisa pindah ke mode server dengan adapter Node (`@astrojs/node`) yang dijalankan di VPS. Yang penting: **harga dan stok tidak boleh basi**.

---

## 2. Setup proyek Payload

### 2.1 Paket dan plugin

- Wajib: `payload`, `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, penyimpanan media (disk lokal; S3/MinIO opsional), `sharp` (ukuran gambar).
- Disarankan: `@payloadcms/plugin-seo` (judul, deskripsi, gambar share per halaman), `@payloadcms/plugin-redirects`, `@payloadcms/plugin-form-builder` *atau* collection kustom untuk form (lihat 5.12).
- Migrasi: pakai `payload migrate` di CI. **Jangan** `push: true` di produksi.

### 2.2 Variabel lingkungan

| Nama | Isi |
|---|---|
| `DATABASE_URI` | koneksi Postgres (pooling) |
| `PAYLOAD_SECRET` | secret Payload |
| `MEDIA_DIR` | folder penyimpanan upload di VPS (volume persisten) |
| `FRONTEND_ORIGIN` | origin situs, untuk CORS/CSRF dan tautan email |
| `REBUILD_HOOK_URL` | endpoint/skrip build frontend di VPS, dipanggil saat konten diterbitkan (lihat 9) |
| `PREVIEW_SECRET` | rahasia untuk mode preview draft |
| `PAYMENT_*`, `SHIPPING_*`, `SMTP_*` / `RESEND_API_KEY` | gateway, API ongkir, email (fase 2) |
| `LOYVERSE_ACCESS_TOKEN` (atau `LOYVERSE_CLIENT_ID/SECRET` bila OAuth), `LOYVERSE_WEBHOOK_SECRET` | akses API Loyverse dan verifikasi webhook (fase 1 untuk baca katalog) |
| `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI` | aplikasi OAuth2 Xero (fase 2) |
| `TOKEN_ENCRYPTION_KEY` | mengenkripsi token OAuth yang disimpan (Xero, dan Loyverse bila OAuth) |

Sediakan `.env.example` berisi nama saja, tanpa nilai.

### 2.3 CORS dan CSRF

Izinkan origin produksi, domain staging (bila ada), dan `localhost:4321` untuk pengembangan. Atur `cors` dan `csrf` Payload ke daftar yang sama. Cookie auth memakai `SameSite=Lax` bila API dan frontend berada di domain induk yang sama (mis. `api.` dan `www.`); kalau domain berbeda total, kabari kami karena butuh pendekatan token.

### 2.4 Media

- Koleksi `media` (lihat 5.1). **Alt text wajib** untuk semua gambar.
- Ukuran yang kami butuhkan (output **WebP**, dengan fallback asli):

| Nama | Lebar | Dipakai untuk |
|---|---|---|
| `thumb` | 400 | thumbnail keranjang, galeri kecil |
| `card` | 800 | kartu produk, kartu berita, kolom beranda |
| `hero` | 1920 | latar masthead dan hero |
| `full` | 2560 | foto lebar penuh |
| `og` | 1200 × 630 | gambar share (crop tengah) |

- **Focal point** diaktifkan: banyak foto di-crop (hero, galeri) dan titik fokus menentukan bagian yang terlihat.
- Batas unggah: gambar ≤ 5 MB, PNG/JPG/WebP/SVG. Aset desain seperti ikon, stempel "SOLD OUT", lencana "NEW", dan pola titik **tetap di repo frontend**, bukan di CMS.

### 2.5 Lokalisasi

`localization: { locales: ['en', 'id'], defaultLocale: 'en', fallback: true }`.
Field yang **`localized: true`**: semua teks yang tampil ke publik (judul, deskripsi, paragraf, label). **Tidak** dilokalisasi: `slug`, harga, stok, angka, gambar (kecuali `alt`), tautan, tanggal.

### 2.6 Peran admin

`admin` (semua), `editor` (konten: produk, berita, halaman, media), `ops` (pesanan, stok, form masuk, diskon). Detail di bagian 6.

---

## 3. Peta konten: apa yang diatur dari mana

Kolom "Sumber sekarang" adalah file di repo yang akan digantikan oleh data CMS.

| Halaman / blok | Sumber sekarang | Sumber di CMS |
|---|---|---|
| Bar promo atas ("FLASH SALE - 20% OFF ALL BEANS", "SHOP NOW") | `Promo.astro`, `Layout.astro` | Global **`announcement`** |
| Menu navigasi (HOME / ABOUT / PRODUCTS / CONTACTS) | `Navbar.astro` | Global **`navigation`** |
| Footer (link, slogan, marquee Instagram, logo) | `SiteFooter.astro` | Global **`footer`** + **`site-settings`** |
| Ticker hitam (Batam Roastery Est. 2020 …) | `Ticker.astro` | Global **`site-settings`** (`ticker`) |
| Blok info (alamat, kontak, catatan wholesale, kolom SHOP/INFORMATION, copyright) | `InfoSection.astro` | **`footer`** + **`site-settings`** |
| **Beranda**: hero, statistik, sector selection, produk unggulan, Our Roots, peta + foto toko | `index.astro`, `SectorSelection.astro`, `FeaturedProducts.astro`, `OurRoots.astro` | Global **`home`** |
| **About** | `about.astro` | Global **`about`** |
| **Gallery** | `gallery.astro` | Global **`gallery`** + collection **`media`** |
| **News** (daftar + artikel utama) | `news.astro` | Collection **`articles`** + global **`news-page`** |
| **FAQ** | belum ada | Collection **`faqs`** + global **`faq-page`** |
| **Contacts** | belum ada | Global **`contact-page`** + **`site-settings`** |
| Terms, Privacy, Shipping & Returns | belum ada | Collection **`pages`** |
| **Produk, kategori, detail produk** | `src/data/products.ts` | Konten editorial: **`products`** (profil) + **`product-categories`**. Harga, pajak, stok, SKU: **Loyverse** (cache baca-saja di `products`) |
| Pengiriman, pembayaran, kode diskon, wilayah | `src/data/checkout.ts` | Collections **`shipping-methods`**, **`payment-methods`**, **`discount-codes`**, data wilayah (5.9) |
| Akun, pesanan | `localStorage` (`stores/`) | Collections **`customers`**, **`orders`**. Receipt ke Loyverse, invoice ke Xero (bagian 15) |
| Teks UI kecil (judul keranjang, checkout, login, dll.) | tersebar di `.astro` / `.tsx` | Global **`ui-strings`** (fase 3, usulan) |
| Ulasan, retur, notifikasi stok, langganan, email transaksional | belum ada | Collections **`reviews`**, **`returns`**, **`stock-alerts`**, **`subscriptions`**, **`email-templates`** (5.14–5.17). Wishlist ada di `customers` |
| Koneksi Loyverse dan Xero (toko, jenis pembayaran, kode akun) | belum ada | Global **`integrations`** (5.18, admin saja) |

---

## 4. Globals

Semua global punya **draft + versi**. Kolom "Contoh isi sekarang" adalah teks asli di web hari ini; jadikan data awal (seed).

### 4.1 `site-settings`

| Field | Tipe | Lokal? | Contoh isi sekarang |
|---|---|---|---|
| `siteName` | text | – | `sregcoffee` |
| `logo` | upload (media) | – | logo hitam-putih (`logo.png`) |
| `favicon` | upload | – | |
| `tagline` | text | ✓ | `Made for everyday grind` |
| `ticker` | array (3 teks, `text` ✓) | ✓ | `Batam Roastery Est. 2020`, `Speciality Coffee Grade SCA 86+`, `#MadeForEveryGrind` |
| `instagramHandle` | text | – | `@sregcoffee` (dipakai marquee footer: "INSTAGRAM @SREGCOFFEE - …") |
| `socials` | array `{platform select, url}` | – | Instagram, WhatsApp, dll. |
| `contact` | group: `email`, `phone`, `whatsapp` | – | `sregcoffee@gmail.com` |
| `address` | textarea | ✓ | `Perumahan Mediterania, Jl. Mediterania No.7A Blok JJ 1, Baloi Permai, Batam Kota, Batam City, Riau Islands 29463` |
| `coordinates` | group `{lat, lng}` | – | untuk peta |
| `openingHours` | array `{days, hours}` + `summary` (text ✓) | ✓ | `07:30 - 22:00 WIB • Dine-in & Bean Refills`, `OPEN DAILY` |
| `wholesaleNote` | text | ✓ | `Roastery visits for wholesale accounts by appointment, please contact us first (:` |
| `copyright` | text | ✓ | `copyright © sregcoffee 2026` (usulan: simpan hanya `brandName` + tahun otomatis) |
| `seoDefaults` | group (plugin SEO): `title`, `description`, `image` | ✓ | judul situs berbentuk `{halaman} · sregcoffee` |
| `analytics` | group `{provider select, measurementId}` | – | ID analitik; frontend memuat skripnya hanya setelah cookie disetujui |
| `cookieBanner` | group `{enabled, text ✓, acceptLabel ✓, declineLabel ✓, policyLink}` | ✓ | teks banner persetujuan cookie |
| `freeShipping` | group `{enabled, threshold}` | – | batas subtotal untuk gratis ongkir. Subtotal dihitung server dari harga Loyverse; angka batas ini hanya aturan ongkir, bukan harga |
| `taxNote` | text | ✓ | teks saja, mis. `All prices include applicable taxes.` Angka dan tarif pajak **berasal dari Loyverse**, bukan dari sini |

### 4.2 `announcement` (bar promo)

| Field | Tipe | Lokal? | Catatan |
|---|---|---|---|
| `enabled` | checkbox | – | |
| `text` | text | ✓ | `FLASH SALE - 20% OFF ALL BEANS` |
| `ctaLabel` | text | ✓ | `SHOP NOW` |
| `ctaLink` | text (path atau URL) | – | `/products` |
| `tone` | select `dark` / `light` | – | halaman biasa gelap; halaman login/register terang |
| `startAt`, `endAt` | date | – | tayang terjadwal (usulan) |

Halaman login/register sekarang memakai teks lain (`INFORMATION HERE // DISCOUNT ETC`, nada terang). Pilih salah satu: **(a)** `announcement` yang sama dipakai di semua halaman, atau **(b)** array `variants` dengan `appliesTo` (default / auth). Kami condong ke (a).

### 4.3 `navigation`

| Field | Tipe |
|---|---|
| `main` | array `{label ✓, href}`. Sekarang: HOME `/`, ABOUT `/about`, PRODUCTS `/products`, CONTACTS `/contacts` |
| `footerLinks` | array `{label ✓, href}`. Sekarang: NEWS & UPDATE `/news`, GALLERY `/gallery`, FAQ `/faq`, CONTACT US `/contacts` |
| `infoColumns` | array `{heading ✓, links[]}`. Sekarang: SHOP (menu, products) dan INFORMATION (news & update, gallery, faq, contact us) |

### 4.4 `footer`

| Field | Tipe | Catatan |
|---|---|---|
| `logo` | upload | boleh kosong → pakai `site-settings.logo` |
| `slogan` | text ✓ | `Made for everyday grind` (atau ambil dari `site-settings.tagline`) |
| `marqueeText` | text ✓ | `instagram @sregcoffee - ` (diulang otomatis oleh frontend) |

### 4.5 `home` (beranda)

Semua bagian punya `enabled` (checkbox, default true) supaya editor bisa menyembunyikannya tanpa menghapus isinya.

**Hero**

| Field | Tipe | Lokal? | Sekarang |
|---|---|---|---|
| `hero.background` | upload | – | foto barista (`photo-bar.jpg`), difokuskan ke bagian bawah |
| `hero.mark` | upload | – | logo besar tengah (`logo.png`, blend `exclusion`) |
| `hero.intro` | textarea | ✓ | `Meticulously roasted single-origin coffees and ready-to-drink essentials crafted inside our flagship roastery in Batam, Indonesia. Engineered for clarity, dynamic acidity, and everyday ritual.` |
| `hero.stats` | array `{value, label ✓}` (maks. 3) | ✓ | `88.5%` / `AVG CUPPING SCORE`; `100%` / `DIRECT ETHNICAL SOURCING`; `<7d` / `ROAST TO DOOR` |
| `hero.chat` | group `{enabled, href, label}` | – | tombol bulat chat di kanan bawah (isi dengan link WhatsApp) |

**Sector selection**: judul `SECTOR SELECTION` (`sectorTitle` ✓). Tiga kolom diambil dari **`product-categories`** (5.2): label, foto, deskripsi, dan lencana. Editor mengatur urutan lewat `sectors` (relasi ke kategori, `hasMany`, urutan tersimpan) dan boleh menimpa `badge` per kolom (mis. `NEW MENU!` di kolom BAKE GOODS).

**Produk unggulan**

| Field | Tipe | Lokal? | Sekarang |
|---|---|---|---|
| `featured.title` | text | ✓ | `BEANS U NEED TO TRY` |
| `featured.subtitle` | text | ✓ | `//SALE NOW 20% OFF/BUY 3 GET 1` |
| `featured.cta` | group `{label ✓, href}` | ✓ | `ALL PRODUCTS` → `/products` |
| `featured.products` | relasi ke `products`, `hasMany`, maks. 4 | – | Ethiopia Suke Quto, Kenya Kiambu AA, Colombia Pink Bourbon, Toraja Sapan Honey |

**Our Roots**

| Field | Tipe | Lokal? | Sekarang |
|---|---|---|---|
| `roots.title` | text | ✓ | `Our Roots` |
| `roots.lead` | textarea | ✓ | paragraf besar (placeholder lorem ipsum) |
| `roots.body` | textarea | ✓ | paragraf kecil (placeholder) |
| `roots.photo` | upload | – | foto barista |
| `roots.visit` | group `{title ✓, address ✓, hours ✓, openLabel ✓}` | ✓ | `BAR VISIT?`, alamat, `07:30 - 22:00 WIB • Dine-in & Bean Refills`, `OPEN DAILY`. Usulan: default-nya diambil dari `site-settings`, di sini hanya penimpa |

**Lokasi** (di bawah blok info): `places.map` (upload, gambar peta) dan `places.shop` (upload, foto depan toko). Usulan: ganti gambar peta dengan embed interaktif memakai `site-settings.coordinates`.

### 4.6 `about`

| Field | Tipe | Lokal? | Sekarang |
|---|---|---|---|
| `masthead.title` | text | ✓ | `ABOUT` |
| `masthead.background` | upload | – | foto bar (boleh pakai default) |
| `intro.heading` | text | ✓ | `SREGCOFFEE WAS LOREM IPSUM DOLOR SIT AMET` |
| `intro.subheading` | text | ✓ | `Where we're from?` |
| `intro.body` | textarea | ✓ | placeholder lorem ipsum |
| `photos` | array upload, **tepat 4** | – | foto barista (saat ini satu gambar yang sama diulang 4 kali) |
| `story` | group `{title ✓, body ✓}` | ✓ | `OUR STORY` |
| `philosophy` | group `{title ✓, body ✓}` | ✓ | `OUR PHILOSOPHY` |
| `band.image` | upload | – | foto lebar penuh (espresso + cangkir) |
| `showFeatured` | checkbox | – | tampilkan "BEANS U NEED TO TRY" di bawah (memakai `home.featured`) |

### 4.7 `gallery` (halaman Gallery)

| Field | Tipe | Catatan |
|---|---|---|
| `title` | text ✓ | `GALLERY` |
| `items` | array `{image upload, alt ✓, order}` | lihat keputusan di bawah |

**Keputusan yang perlu dibuat bersama.** Desain Gallery adalah **kolase tetap dengan 15 kotak** yang posisi dan bentuknya digambar tangan (sebagian dipotong dari foto lebih besar). Dua opsi:
- **(A)** Tetap 15 foto. `items` wajib berisi tepat 15 foto, urutan = urutan kotak. Frontend memakai posisi tetap seperti sekarang. Kurang fleksibel.
- **(B)** Frontend diubah jadi grid/masonry yang menerima jumlah foto berapa pun, dengan `size` per foto (`small` / `wide` / `tall` / `large`). Lebih fleksibel, sedikit berbeda dari Figma.

**Rekomendasi kami: (B).** Dengan B, cukup kirim `items[]` dengan `size`.

### 4.8 `news-page`

| Field | Tipe | Lokal? | Catatan |
|---|---|---|---|
| `title` | text | ✓ | `NEWS` |
| `headline` | relasi ke `articles` (satu) | – | artikel utama (kotak besar). Kosong → artikel terbaru yang `featured` |
| `headlineRelated` | relasi ke `articles`, maks. 4 | – | 4 kotak abu-abu kecil di samping artikel utama. Kosong → 4 artikel terbaru berikutnya |
| `headlineBarText` | text | ✓ | `HEADLINE NEWS // NEW ROAST NEW TASTE` (usulan: dibuat otomatis dari judul artikel) |

### 4.9 `faq-page` dan `contact-page`

`faq-page`: `title` ✓, `intro` ✓. Daftar pertanyaan ada di collection `faqs` (5.7).
`contact-page` (belum didesain): `title` ✓, `intro` ✓, `showMap` (checkbox), `showForm` (checkbox), `formSuccessMessage` ✓. Alamat, jam, telepon, dan WhatsApp diambil dari `site-settings`.

### 4.10 `ui-strings` (fase 3, usulan)

Satu global bergrup untuk teks UI kecil yang sekarang tersebar di kode, semuanya `localized`: judul dan lead halaman checkout / payment / confirmation / cart / account / login / register, label tombol, pesan error, pesan keranjang kosong, teks "Demo store…". Daftar kunci lengkap kami kirim saat fase 3 dimulai.

---

## 5. Collections

Notasi: **✓** = `localized: true`. Setiap collection konten punya `createdAt`/`updatedAt` bawaan dan, bila disebut, draft + versi.

### 5.1 `media`
`alt` (text ✓, **wajib**), `caption` (text ✓, opsional), `credit` (text, opsional), ukuran di 2.4, focal point aktif. Nama file di-slug otomatis.

### 5.2 `product-categories`
Sekarang tiga: `beans`, `drinks`, `bakery`.

| Field | Tipe | Lokal? | Contoh sekarang |
|---|---|---|---|
| `slug` | text, unik | – | `beans` / `drinks` / `bakery` (dipakai di URL `/products#beans`; **jangan berubah**) |
| `label` | text | ✓ | `BEANS` / `COFFEE READY TO DRINK` / `BAKE GOODS` |
| `blurb` | textarea | ✓ | `Single origins, micro-lots, and proprietary espresso roasts sealed within 24 hours of roasting.` (dipakai di beranda dan halaman Products) |
| `sectorImage` | upload | – | foto kategori di kolom "Sector Selection" |
| `sectorBadge` | text ✓ | ✓ | mis. `NEW MENU!` (opsional) |
| `order` | number | – | urutan tab |

### 5.3 `products`  **(wajib)**
Dengan **draft + versi**, `useAsTitle: name`.

**Collection ini adalah *profil editorial* dari item Loyverse.** Item, harga, pajak, dan stok dibuat dan diatur di Loyverse. Di Payload, editor menambahkan teks, foto, cerita, dan SEO ke item itu. Produk baru muncul di web bila: (1) item ada di Loyverse, (2) profil Payload-nya ada dan **terbit**. Item Loyverse tanpa profil tidak tampil di web (muncul di daftar "belum punya profil" di admin). Field `loyverse.*` diisi job sinkron dan **baca-saja** untuk semua peran (15.2).

Pemetaan dari `src/data/products.ts`:

| Field | Tipe | Lokal? | Aturan / contoh |
|---|---|---|---|
| `slug` | text, unik, indeks | – | `ethiopia-suke-quto`. Stabil karena dipakai di URL |
| `category` | relasi ke `product-categories` | – | wajib |
| `name` | text | ✓ | `ETHIOPIA SUKE QUTO` |
| `eyebrow` | text | ✓ | `GUJI, ETHIOPIA // 2000 MASL` (baris kecil di atas nama di kartu) |
| `score` | number | – | `88.5`; hanya biji kopi; 0–100, langkah 0,5 |
| `specs` | array `{label ✓, value ✓}` | ✓ | kartu: `PROCESS:` Washed, `VARIETAL` Kurume Welicho (urutan dipertahankan; maks. 3 baris tampil) |
| `notes` | array `{note ✓}` | ✓ | `JASMINE`, `BERGAMOT`, `WHITE PEACH` (chip kecil) |
| `loyverse.itemId` | text, unik, indeks | – | **wajib**; kunci penaut ke item Loyverse. Satu-satunya field Loyverse yang diisi manual (atau dipilih dari daftar item hasil sinkron) |
| `loyverse.price` | number, **baca-saja** | – | harga dari Loyverse (rupiah bulat). Untuk produk bervarian: harga terendah, harga per varian ada di `loyverse.variants` |
| `loyverse.variants` | array, **baca-saja** | – | `{variantId, sku, optionLabel, price, stock, soldOut}` dari Loyverse |
| `loyverse.taxIncluded`, `loyverse.taxRate` | **baca-saja** | – | pajak item dari Loyverse. Dipakai server untuk kuotasi, tidak diisi editor |
| `loyverse.soldOut`, `loyverse.lowStock` | checkbox, **baca-saja** | – | dihitung dari stok toko online (15.2). Item yang stoknya tidak dilacak dianggap selalu tersedia |
| `loyverse.syncedAt` | date, **baca-saja** | – | kapan terakhir disinkronkan |
| `ratingAvg`, `ratingCount` | number, **baca-saja** | – | dihitung dari ulasan yang disetujui (5.14) |
| `size` | text | ✓ | `250G POUCH` (teks panjang) |
| `unit` | text | ✓ | `250 g` (dipakai di keranjang dan pesanan, mis. "Whole beans / 250 g") |
| `image` | upload | – | PNG **transparan**, bungkusnya saja (frontend menaruh pola logo di belakangnya). Min. 1000 px |
| `variantLabels` | array `{variantId, label ✓}` | ✓ | nama tampilan per varian Loyverse (mis. ukuran `250 g`, `1 kg`). Harga dan stok varian tetap dari Loyverse |
| `lineOptions.label` | text ✓ | ✓ | `Grind` (nama pilihan yang **tidak** mengubah harga atau stok) |
| `lineOptions.choices` | array `{label ✓}` | ✓ | `Whole beans`, `Espresso`, `Moka pot`, `Filter`. Disimpan di baris pesanan dan catatan receipt, bukan sebagai varian Loyverse (pertanyaan 4). Kosong untuk minuman dan roti |
| `weightGrams` | number | – | untuk ongkir (usulan, dibutuhkan fase 2) |
| `hidden` | checkbox | – | sembunyikan dari web walau profil terbit dan item aktif di Loyverse (mis. produk khusus kasir). Bukan pengaturan stok |
| `isNew` | checkbox | – | lencana "NEW". Usulan: otomatis 30 hari sejak terbit |
| `featuredRank` | number | – | opsional; beranda memakai `home.featured` |
| `related` | relasi ke `products`, `hasMany` | – | opsional. Kosong → frontend memilih kategori sama dulu, lalu yang lain, tanpa yang habis |
| `detail.eyebrow` | text | ✓ | `GUJI, ETHIOPIA / CROP 2025` |
| `detail.summary` | textarea | ✓ | paragraf di bawah judul halaman produk |
| `detail.caption` | text | ✓ | `ROASTED FOR FILTER COFFEE` (di bawah foto) |
| `detail.tagline` | text | ✓ | `FROM GUJI,\nFOR YOUR FILTER.` (dua baris; **baris baru dipertahankan**) |
| `detail.story` | textarea | ✓ | paragraf "About this coffee" |
| `detail.facts` | array `{label ✓, value ✓}` | ✓ | tabel spesifikasi, 2 kolom: `PRODUCER`, `LOCATION`, `ALTITUDE`, `VARIETAL`, `PROCESS`, `CROP`, `ROASTED FOR` |
| `seo` | group (plugin SEO) | ✓ | judul, deskripsi, gambar share |

Catatan:
- `detail.facts` tidak punya label tetap karena minuman dan roti memakai set label lain.
- Jumlah `specs`/`facts` harus fleksibel (1–10 baris).
- **Harga selalu angka bulat rupiah.** Frontend yang memformat `IDR 195.000`. Bila Loyverse berisi harga desimal, sinkron membulatkan dan mencatat peringatan.
- `name`, `size`, dan `unit` diisi awal dari Loyverse saat profil dibuat, lalu editor menyesuaikan teks tampilan dan terjemahannya. Perubahan nama di Loyverse **tidak** menimpa teks yang sudah diedit.
- Item Loyverse yang dinonaktifkan atau dihapus: profil otomatis disembunyikan dari API publik (tidak dihapus).
- Produk yang diarsipkan (`_status: draft`) tidak boleh muncul di API publik.

### 5.4 `articles` (News) **(wajib)**
Draft + versi.

| Field | Tipe | Lokal? | Catatan |
|---|---|---|---|
| `slug` | text, unik | – | untuk `/news/{slug}` (halaman detail akan dibuat) |
| `title` | text | ✓ | `NEW ROAST NEW TASTE` / `ETHIOPIA SUKE QUTO` |
| `excerpt` | textarea | ✓ | 1–2 kalimat (kartu dan "related") |
| `body` | rich text (Lexical) | ✓ | paragraf, judul, tebal/miring, link, gambar |
| `image` | upload | – | foto utama |
| `publishedAt` | date | – | tampil sebagai `YYYY/MM/DD` |
| `featured` | checkbox | – | calon artikel utama |
| `tags` | array text (usulan) | – | |
| `seo` | group | ✓ | |

### 5.5 `gallery` lewat `media`
Foto galeri diunggah ke `media` lalu dipilih di global `gallery` (4.7). Tidak perlu collection tersendiri.

### 5.6 `pages` (halaman bebas)
Untuk `terms`, `privacy`, `shipping-returns`, dan halaman baru ke depan.
`slug` (unik), `title` ✓, `body` (Lexical ✓), `seo`. Draft + versi. Frontend merender di `/{slug}` atau `/p/{slug}` (kami ikut keputusan tim).

### 5.7 `faqs`
`question` ✓, `answer` (Lexical ✓), `category` (select: ordering, shipping, payment, products, wholesale, lainnya), `order` (number). Draft tidak perlu.

### 5.8 `shipping-methods`
Sekarang dua: `jne-reg` dan `jne-yes`.

| Field | Contoh |
|---|---|
| `id` / `slug` | `jne-reg` (stabil) |
| `name` | `JNE REG` |
| `etaText` ✓ | `Estimated delivery: 2–3 business days` |
| `daysLabel` ✓ | `2-3 business days` |
| `minDays`, `maxDays` | `2`, `3` (hari kerja; frontend menghitung "13-14 October 2026") |
| `price` | `20000` (tetap; target: dari API ongkir). Ongkir bukan data Loyverse, jadi tetap diatur di sini |
| `active`, `order` | |

### 5.9 `payment-methods`, wilayah, `discount-codes`
- `payment-methods`: `slug` (`card`, `bank-transfer`, `qris`), `name` ✓, `detail` ✓, `fee` (Rp), `type` (select `card` / `virtual_account` / `qris` / `ewallet`), `active`, `order`.
- **Wilayah** (provinsi → kota → kecamatan): **jangan diketik manual di CMS.** Impor dataset resmi (mis. data wilayah Kemendagri) ke collection `provinces`, `cities`, `districts` dengan relasi, atau panggil API ongkir. Frontend sekarang memakai 5 provinsi contoh.
- `discount-codes`: `code` (unik, huruf besar), `type` (`percent`/`fixed`), `value`, `minSubtotal`, `maxUses`, `usedCount` (otomatis), `startAt`, `endAt`, `active`. Contoh: `SREG10` = 10 persen. **Validasi hanya di server** (4.5 dan 8). Kode promo web tidak punya padanan langsung di Loyverse; server menghitung potongannya dan mengirimnya ke Loyverse dan Xero sebagai diskon pada receipt/invoice (pertanyaan 16).

### 5.10 `customers` (collection auth)
Koleksi **terpisah** dari admin `users`.

| Field | Catatan |
|---|---|
| `name` (wajib), `email` (login, unik), `phone` | |
| `password` | dikelola Payload (hash di server) |
| `addresses` | array `{label, firstName, lastName, phone, country, street, address2, province, city, district, postalCode, isDefault}` |
| `newsletter` | checkbox |
| `wishlist` | relasi ke `products`, `hasMany` (disimpan produk yang diminati) |
| `xeroContactId` | text, **baca-saja**; diisi saat kontak dibuat di Xero (bagian 15.3) |
| `loyverseCustomerId` | text, opsional (usulan); bila toko ingin riwayat pembelian online muncul di Loyverse |
| Verifikasi email | aktifkan (`auth.verify`) |
| Lupa / ubah password | aktifkan (`forgotPassword`) |
| Kunci akun | `maxLoginAttempts`, `lockTime` |

Aturan kata sandi di frontend: minimal 8 karakter, mengandung huruf dan angka. Server memvalidasi ulang. Akun demo `demo@sregcoffee.id` / `demo1234` hanya untuk staging.

### 5.11 `orders` **(wajib)**
Bentuk snapshot-nya sama dengan yang disimpan frontend sekarang (`src/stores/orders.ts`).

| Field | Tipe | Catatan |
|---|---|---|
| `orderNumber` | text, unik | format `SRG-YYMMDD-XXXX`; dibuat **server**; acak dan sulit ditebak |
| `customer` | relasi ke `customers` | kosong untuk tamu |
| `guestToken` | text | rahasia untuk melihat pesanan tamu (dikirim di URL konfirmasi dan email) |
| `status` | select | `awaiting_payment`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `expired`, `refunded` (frontend sekarang hanya mengenal dua pertama) |
| `items` | array snapshot: `product` (relasi), `loyverseVariantId`, `sku`, `slug`, `name`, `variantLabel`, `variantOption`, `unit`, `image`, `unitPrice`, `qty` | **harga dan nama dibekukan** saat pesanan dibuat |
| `subtotal`, `discount`, `discountCode`, `shipping`, `shippingId`, `shippingName`, `paymentFee`, `tax`, `taxIncluded`, `total` | number/text | semua dihitung server dari harga dan pajak Loyverse |
| `contact` | `{email, newsletter}` | |
| `address` | group (sama seperti `customers.addresses`) | snapshot |
| `note` | text | catatan pengiriman |
| `payment` | group: `methodId`, `provider`, `providerRef`, `cardBrand`, `cardLast4`, `instructions` (json: VA / QRIS), `expiresAt`, `paidAt` | **jangan simpan nomor kartu penuh, CVV, atau expiry.** Hanya brand + 4 digit terakhir |
| `tracking` | group: `carrier`, `number`, `url`, `events` array | diisi tim operasional |
| `loyverse` | group, **baca-saja**: `receiptNumber`, `receiptId`, `syncStatus` (`pending`/`done`/`failed`), `lastError`, `reservedUntil` | receipt dibuat di Loyverse saat `paid` (15.2) |
| `xero` | group, **baca-saja**: `invoiceId`, `invoiceNumber`, `invoiceUrl`, `status`, `paymentId`, `creditNoteId`, `lastError` | invoice dari Xero (15.3). Pelanggan mengunduhnya lewat `GET /api/orders/:id/invoice` |
| `internalNotes` | textarea | hanya admin/ops |
| `createdAt` | date | |

### 5.12 `form-submissions` dan `newsletter-subscribers`
- `contact-messages`: `name`, `email`, `subject`, `message`, `status` (new/handled), `createdAt`.
- `wholesale-inquiries`: `company`, `contactName`, `email`, `phone`, `volume`, `message`, `status`.
- `newsletter-subscribers`: `email` (unik), `confirmedAt`, `source`.
- `stock-alerts`: `product`, `variantId`, `email`, `notifiedAt`. Email "kembali tersedia" dikirim otomatis saat sinkron Loyverse mengubah stok dari 0 menjadi lebih dari 0.

Boleh memakai `@payloadcms/plugin-form-builder` bila tim lebih suka form yang bisa dikonfigurasi editor. Semua endpoint publik: **`create` terbuka, `read/update/delete` tertutup**, dengan rate limit dan captcha/honeypot.

### 5.13 `users` (admin)
Auth collection bawaan untuk admin panel. Field `role` (select `admin` / `editor` / `ops`).

### 5.14 `reviews`
`product` (relasi), `customer` (relasi; wajib login), `rating` (1–5), `title`, `body`, `status` (`pending` / `approved` / `rejected`), `verifiedPurchase` (dihitung: customer punya pesanan `paid` berisi produk itu), `createdAt`. Publik hanya membaca yang `approved`. Satu ulasan per customer per produk. `ratingAvg` dan `ratingCount` di `products` dihitung ulang oleh hook. Moderasi oleh `ops`/`admin`; ada rate limit.

### 5.15 `returns`
`order` (relasi), `items` (subset baris + qty), `reason` (select + teks), `photos` (media, opsional), `status` (`requested` / `approved` / `rejected` / `received` / `refunded`), `refundAmount`, `internalNotes`, `xeroCreditNoteId`. Pelanggan mengajukan lewat endpoint bertoken (akun atau `guestToken`); `ops` memprosesnya. Refund lewat gateway dicatat sebagai credit note di Xero (15.3).

### 5.16 `email-templates`
`key` (select: `order-created`, `payment-received`, `shipped`, `cancelled`, `return-update`, `password-reset`, `verify-email`, `back-in-stock`, `newsletter-confirm`, `contact-received`), `subject` ✓, `body` (Lexical ✓), `active`. Placeholder yang didukung: `{{orderNumber}}`, `{{customerName}}`, `{{trackingUrl}}`, `{{invoiceUrl}}`, `{{productName}}`. Draft + versi. Pengiriman lewat SMTP/Resend. Teks "A receipt has been sent to …" di halaman konfirmasi hanya boleh tampil setelah email `order-created` benar-benar terkirim.

### 5.17 `subscriptions` (fase 3, usulan)
`customer`, `lines` (array `{product, loyverseVariantId, qty, lineOption}`), `interval` (select: 2 minggu / 4 minggu), `nextDeliveryAt`, `status` (`active` / `paused` / `cancelled`), `address` (snapshot), `paymentToken` (token gateway; tidak ada data kartu). **Harga tidak disimpan**: tiap siklus dihitung ulang dari Loyverse. Butuh dukungan pembayaran berulang di gateway (pertanyaan 5).

### 5.18 Global `integrations` (admin saja)
Pengaturan koneksi. **Token tidak disimpan di field biasa**: simpan di env atau di collection terenkripsi `integration-tokens` yang tidak punya akses API publik.

| Field | Isi |
|---|---|
| `loyverse.storeId` | toko Loyverse yang stoknya dipakai untuk penjualan online |
| `loyverse.paymentTypeId` | jenis pembayaran di Loyverse untuk receipt online (mis. "Online") |
| `loyverse.syncIntervalMinutes` | interval sinkron penuh (default 5) |
| `loyverse.lastFullSyncAt`, `lastError` | status, baca-saja |
| `xero.tenantId`, `xero.connectedAt`, `lastError` | status koneksi, baca-saja |
| `xero.accounts` | kode akun untuk penjualan, ongkir, dan biaya pembayaran |

Admin punya tombol **Sync sekarang** (Loyverse) dan **Hubungkan ulang** (Xero).

---

## 6. Akses dan peran

| Collection / global | Publik (tanpa login) | Customer | `editor` | `ops` | `admin` |
|---|---|---|---|---|---|
| Globals (semua) | baca (hanya versi terbit) | baca | baca/ubah | baca | semua |
| `media` | baca | baca | semua | baca | semua |
| `products`, `product-categories` | baca (terbit saja) | baca | semua (kecuali field `loyverse.*`, baca-saja untuk semua) | baca | semua |
| `articles`, `pages`, `faqs` | baca (terbit saja) | baca | semua | – | semua |
| `shipping-methods`, `payment-methods` | baca (yang `active`) | baca | – | baca | semua |
| `discount-codes` | **tidak bisa** dibaca (validasi hanya lewat endpoint kuotasi) | – | – | semua | semua |
| `customers` | buat (daftar) | baca/ubah **milik sendiri** | – | baca | semua |
| `orders` | **tidak ada** akses langsung; hanya via endpoint dengan `guestToken` | baca **milik sendiri** | – | baca/ubah status, tracking, catatan | semua |
| form masuk | buat saja | buat | – | baca/ubah status | semua |
| `reviews` | baca (yang `approved`) | buat; ubah **milik sendiri** | – | moderasi | semua |
| `returns` | **tidak ada** akses langsung; via endpoint bertoken | buat/baca **milik sendiri** | – | baca/ubah status | semua |
| `stock-alerts`, `subscriptions` | buat (`stock-alerts`) | baca/ubah **milik sendiri** | – | baca | semua |
| `email-templates` | – | – | semua | baca | semua |
| global `integrations`, `integration-tokens` | – | – | – | – | **admin saja** |

Field `loyverse.*`, `xero.*`, `ratingAvg`/`ratingCount` hanya ditulis oleh job sinkron dan hook server (`overrideAccess`); tidak ada peran yang bisa mengubahnya dari admin.

Catatan penting:
- Hak **buat pesanan** tidak diberikan lewat `POST /api/orders` generik. Pesanan dibuat oleh endpoint kustom yang menghitung ulang semua harga (bagian 8).
- Endpoint publik tidak boleh membocorkan `internalNotes`, `usedCount`, data pelanggan lain, atau stok mentah (cukup `soldOut` dan, opsional, `lowStock`).
- Terapkan `select`/`afterRead` agar field internal tidak ikut terkirim.

---

## 7. API yang kami konsumsi

URL dasar: `https://cms.<domain>/api`. Semua `GET` mengembalikan JSON Payload standar. Kami mengirim `locale=en|id`, `fallback-locale=en`, dan `depth` seperlunya.

### 7.1 Konten (untuk build)

| Kebutuhan | Request |
|---|---|
| Pengaturan situs | `GET /globals/site-settings?locale=id&depth=1` |
| Promo bar | `GET /globals/announcement` |
| Navigasi | `GET /globals/navigation` |
| Footer | `GET /globals/footer?depth=1` |
| Beranda | `GET /globals/home?depth=2` (agar `featured.products`, `sectors`, dan media terisi) |
| About | `GET /globals/about?depth=1` |
| Gallery | `GET /globals/gallery?depth=1` |
| News (halaman) | `GET /globals/news-page?depth=2` |
| Daftar artikel | `GET /articles?sort=-publishedAt&limit=24&page=1&depth=1` |
| Satu artikel | `GET /articles?where[slug][equals]=...&limit=1&depth=1` |
| FAQ | `GET /faqs?sort=order&limit=100` |
| Halaman bebas | `GET /pages?where[slug][equals]=terms&limit=1` |
| Kategori | `GET /product-categories?sort=order&depth=1` |
| Semua slug produk (untuk membuat URL statis) | `GET /products?select[slug]=true&limit=1000` |

### 7.2 Katalog (runtime atau build + revalidasi)

| Kebutuhan | Request |
|---|---|
| Daftar produk | `GET /products?where[category][equals]=<id>&depth=1&limit=24&page=1&sort=...` |
| Detail produk | `GET /products?where[slug][equals]=...&limit=1&depth=2` |
| Cari | `GET /products?where[or][0][name][like]=...&where[or][1][eyebrow][like]=...` (usulan: endpoint khusus `GET /search?q=` yang mencari nama, asal, notes, proses) |
| Stok / harga terkini untuk keranjang | `GET /products?where[slug][in]=a,b,c&select[loyverse]=true&select[slug]=true` (nilai dari cache Loyverse; sertakan `loyverse.syncedAt`). Harga final tetap dari `POST /api/checkout/quote` |
| Ulasan satu produk | `GET /reviews?where[product][equals]=<id>&where[status][equals]=approved&sort=-createdAt` |
| Pengiriman, pembayaran | `GET /shipping-methods?where[active][equals]=true`, `GET /payment-methods?where[active][equals]=true` |

### 7.3 Akun (cookie `HttpOnly`)

Memakai endpoint auth bawaan Payload pada collection `customers`:
`POST /customers` (daftar), `POST /customers/login`, `POST /customers/logout`, `GET /customers/me`, `POST /customers/forgot-password`, `POST /customers/reset-password`, `POST /customers/verify/:token`, `PATCH /customers/:id`.
Respons error mengikuti konvensi Payload; kami menampilkan `errors[].message`.

### 7.4 Endpoint kustom (dibangun tim CMS)

Kontrak lengkap (isi request dan respons) ada di `cms-api-notes.md` bagian 5 dan 6. Daftarnya:

| Endpoint | Fungsi |
|---|---|
| `POST /api/checkout/quote` | Hitung ulang subtotal, diskon, ongkir, biaya bayar, total dari `slug + option + qty`. Tolak kode diskon tidak valid (`422 invalid_discount`) |
| `POST /api/orders/create` | Buat pesanan: validasi stok, cadangkan stok, buat order + instruksi bayar. Menerima `Idempotency-Key` |
| `GET /api/orders/lookup?number=…&token=…` | Pesanan tamu untuk halaman konfirmasi |
| `GET /api/customers/me/orders` | Riwayat pesanan user login |
| `POST /api/orders/:id/cancel` | Batalkan selama belum `processing` |
| `GET /api/shipping/rates` | Ongkir berdasarkan tujuan dan berat (fase 2) |
| `POST /api/payments/webhook/:provider` | Dari payment gateway, memverifikasi tanda tangan lalu mengubah `status` |
| `POST /api/forms/contact`, `/newsletter`, `/wholesale`, `/stock-alert` | Form publik |
| `GET /api/search?q=` | Pencarian produk (usulan) |
| `GET /api/orders/:id/invoice` | PDF invoice dari Xero (diteruskan lewat server; cek pemilik atau `guestToken`) |
| `POST /api/reviews`, `POST /api/wishlist` | Kirim ulasan; tambah/hapus wishlist |
| `POST /api/returns`, `GET /api/returns/lookup` | Ajukan dan lihat retur (akun atau token) |
| `POST /api/integrations/loyverse/webhook` | Webhook Loyverse (item, stok, receipt); verifikasi tanda tangan |
| `POST /api/integrations/loyverse/sync` | Sinkron penuh manual (admin) |
| `GET /api/integrations/xero/connect`, `/callback` | Alur OAuth2 Xero (admin) |

---

## 8. Commerce di Payload (ringkas; detail di `cms-api-notes.md`)

- **Server yang menghitung uang.** Frontend hanya mengirim `slug`, `option`, `qty`; semua harga, pajak, diskon, dan total dihitung ulang di server: harga, pajak, dan stok dari Loyverse; diskon dan ongkir dari CMS. Frontend tidak pernah dipercaya soal harga.
- **Stok ada di Loyverse.** Saat pesanan dibuat, server mengambil stok terbaru dari Loyverse dan **mencadangkan** jumlahnya di Payload (`stock-reservations`, 15.2). Stok tersedia = stok Loyverse − cadangan aktif. Lepas cadangan bila status `expired` / `cancelled` (default 24 jam untuk transfer dan QRIS). Stok Loyverse berkurang saat receipt dibuat (pesanan `paid`). Bila Loyverse tidak bisa dihubungi saat pesanan dibuat, tolak dengan `503`, jangan menebak stok.
- **Nomor pesanan** dibuat server, unik, dan acak.
- **Idempotensi:** `Idempotency-Key` agar klik ganda tidak membuat dua pesanan.
- **Pembayaran:** pakai payment gateway lokal (Midtrans, Xendit, atau sejenis) dan **tokenisasi di sisi gateway**. CMS tidak pernah menerima nomor kartu atau CVV. Status berubah lewat **webhook** terverifikasi. Tombol "Simulate payment" di frontend dihapus setelah webhook jalan.
- **Status pesanan** menentukan tampilan halaman konfirmasi: `paid` → "GOOD COFFEE. ON THE WAY."; `awaiting_payment` → "ORDER RECEIVED." + instruksi bayar. "What happens next" (Confirmed → Preparing → On the way) mengikuti `status`.
- **Email transaksional** (template diedit di `email-templates`, 5.16): pesanan dibuat, pembayaran diterima (+ tautan invoice), dikirim (+ resi), dibatalkan, update retur, reset password, verifikasi email, stok kembali tersedia.
- **Setelah `paid`:** buat receipt di Loyverse (mengurangi stok) dan invoice + pencatatan pembayaran di Xero (bagian 15). Kegagalan salah satunya **tidak membatalkan pesanan**; masuk antrean ulang dan memberi peringatan ke `ops`.
- Estimasi tiba "13-14 October 2026" dihitung frontend dari `createdAt` + `minDays/maxDays` hari kerja.

---

## 9. Publikasi, cache, preview

### 9.1 Mengganti konten → situs ikut berubah

- Setiap kali dokumen **terbit** (atau berubah saat sudah terbit) di collection konten dan global, hook `afterChange` memanggil `REBUILD_HOOK_URL` (situs dibangun ulang di VPS). Lakukan **debounce** (mis. 30–60 detik) agar banyak simpanan beruntun menghasilkan satu build.
- Hook yang sama dipasang di `afterDelete`.
- Perubahan **harga dan stok tidak memicu build**; frontend membacanya langsung dari API. Perubahan di Loyverse masuk ke cache CMS lewat webhook dan sinkron berkala (15.2), bukan lewat build.
- Pengecualian: produk **baru terbit** atau **disembunyikan** mengubah daftar halaman statis (URL baru), jadi tetap memicu rebuild.
- Ke depan, kami bisa pindah ke ISR / revalidate per tag bila diperlukan; kabari kami bila tim CMS lebih suka itu.

### 9.2 Preview draft

Aktifkan **Live Preview** Payload untuk produk, artikel, halaman, dan semua global. URL preview mengarah ke frontend:
`https://<domain>/preview?path=/products/<slug>&secret=<PREVIEW_SECRET>`.
Frontend akan memanggil API dengan `draft=true` **hanya** bila `secret` benar. Preview tidak di-cache dan tidak diindeks (`noindex`).

### 9.3 SEO

Plugin SEO per dokumen: `title`, `description`, `image`. Tambahan yang kami harapkan:
`GET /sitemap` (daftar URL + `lastmod`) atau cukup kami buat dari API; `redirects` (plugin redirects) untuk slug yang berubah; `robots` diatur di frontend.

---

## 10. Migrasi konten awal (seed)

Agar frontend bisa langsung berganti dari data mock:

1. **Skrip seed** mengisi: kategori (3), **profil editorial** 13 produk (tanpa harga dan stok; ditautkan ke item Loyverse lewat `loyverse.itemId` setelah item dibuat di Loyverse), pengiriman (2), pembayaran (3), kode diskon (`SREG10`), semua global dengan teks di bagian 4, FAQ contoh, dan satu artikel utama + 6 artikel (placeholder).
2. **Aset** diunggah ke `media` (dengan alt text), diambil dari `public/images/` di repo frontend:
   - Logo: `logo.png`.
   - Foto bar/barista: `photo-bar.jpg`, `photo-espresso.jpg`.
   - Produk: `product-beans.png`, `category-drink.png`, `category-bakery.png`.
   - Galeri: `gallery/01.png` … `gallery/12.png`.
   - Lokasi: `shop-front.png`, `map.png`.
   - **Tetap di repo (bukan di CMS)**: ikon (`cart.svg`, `user.svg`, `chat.svg`, `caret.svg`, `asterisk.svg`), lencana `badge-new.svg`, stempel `stamp-sold-out.svg`, dekorasi `decor-roots.svg`, garis `line-footer.svg`, dan pola `pattern-dots.png` / `product-photography.png`.
3. Kami (frontend) menyediakan **ekspor JSON** dari `src/data/products.ts` dan `src/data/checkout.ts` bila diminta.
4. Setelah seed, **semua teks placeholder** (lorem ipsum, `YYYY/MM/DD`) harus diganti konten asli oleh pemilik bisnis sebelum go-live. Harga dan stok asli tidak perlu di-seed: ikut Loyverse. Nilai contoh di `src/data/products.ts` (mis. `195000`) bisa dipakai pemilik sebagai acuan saat mengisi item di Loyverse.

---

## 11. Fase dan *definition of done*

### Fase 1: konten dan katalog (frontend berhenti memakai mock)
- Setup Payload + Postgres + media disk lokal + i18n + peran admin.
- Media, kategori, profil produk, artikel, FAQ, pages, semua global (4.1–4.9), publikasi + rebuild hook, preview.
- **Sinkron katalog dari Loyverse (baca-saja)**: item, varian, harga, pajak, stok, webhook, dan sinkron penuh berkala (15.2).
- Endpoint baca di bagian 7.1 dan 7.2.
- **Selesai bila:** editor bisa mengubah teks dan foto beranda, About, News, dan profil produk dari panel admin tanpa campur tangan developer, dan harga, pajak, serta stok yang tampil di situs selalu mengikuti Loyverse (tertinggal maksimal 5 menit). Seed dan data asli terisi. `payload-types.ts` (atau OpenAPI) tersedia untuk kami.

### Fase 2: akun dan pesanan
- `customers` (daftar, login, lupa/ubah password, verifikasi), alamat tersimpan.
- Kuotasi (harga dan pajak dari Loyverse), ongkir, kode diskon, pembuatan pesanan dengan reservasi stok, payment gateway + webhook, **receipt ke Loyverse**, **invoice dan pembayaran ke Xero** (+ unduh PDF), email transaksional, riwayat pesanan, lacak resi, pembatalan, retur.
- **Selesai bila:** pembeli sungguhan bisa memesan dan membayar, status berubah otomatis dari webhook, stok tidak pernah oversell, dan tim ops bisa memproses pesanan dari admin.

### Fase 3: pelengkap
- Form kontak / newsletter / wholesale / notifikasi stok, pencarian, `ui-strings`, ulasan, wishlist, langganan, banner cookie dan analitik. (Lowongan kerja tidak dibuat.)

**Kriteria kualitas untuk semua fase:** respons katalog ≤ 300 ms (p95) dengan cache; semua endpoint publik punya rate limit; log sinkron Loyverse/Xero dengan peringatan ke `ops` bila gagal; backup database harian; staging dengan data contoh dan sandbox payment.

---

## 12. Pertanyaan terbuka

1. **Gallery:** opsi A (15 kotak tetap) atau B (grid fleksibel)? (4.7)
2. **Publikasi:** cukup rebuild lewat *deploy hook*, atau perlu ISR / SSR? (1 dan 9)
3. **Domain:** API dan situs berada di domain induk yang sama (agar cookie `Lax` jalan)? (2.3)
4. **Varian di Loyverse:** ukuran (250 g / 1 kg) dibuat sebagai *variant* item di Loyverse (stok dan harga per varian). *Grind* tidak mengubah stok, jadi kami usulkan sebagai opsi baris pesanan, bukan varian. Setuju? (5.3, 15.2)
5. **Langganan:** jadi dikerjakan? Butuh pembayaran berulang di gateway dan keputusan siapa yang menagih. (5.17)
6. **Bahasa:** apakah semua konten wajib dua bahasa (en dan id) sejak fase 1, atau mulai en dulu?
7. **Pesanan tamu:** seberapa jauh boleh dilihat tanpa login (token di URL, kedaluwarsa)? (5.11)
8. **Payment gateway dan API ongkir:** mana yang dipilih, dan siapa yang mendaftarkan akunnya?
9. **Retur / refund:** manual dari admin atau lewat API gateway?
10. **Teks legal** (Terms, Privacy, Shipping & Returns): siapa pemiliknya dan kapan siap?
11. **Wholesale:** diproses di sistem yang sama atau terpisah? (5.12)
12. **Halaman bebas:** rute `/{slug}` atau `/p/{slug}`? (5.6)
13. **Wilayah:** pakai dataset sendiri atau dari API ongkir? (5.9)
14. **Peran:** apakah tiga peran (admin, editor, ops) sudah cukup?
15. **Loyverse:** toko mana yang stoknya dipakai untuk online (satu `storeId`)? Siapa pemilik akun dan token API, dan apakah paket Loyverse yang dipakai mengizinkan API dan webhook? (15.2)
16. **Kode diskon web:** tetap di CMS dan dikirim sebagai potongan (usulan), atau dibuat sebagai diskon di Loyverse? (5.9)
17. **Receipt Loyverse:** dibuat saat `paid` (usulan) atau saat pesanan dibuat? Bagaimana stok minus bila kasir menjual item yang sama bersamaan? (15.2)
18. **Xero:** kode akun untuk penjualan, ongkir, dan biaya pembayaran, serta penomoran invoice. Siapa yang menentukan? (15.3)
19. **Tampilan pajak di checkout:** satu baris total atau per item? (Besaran pajaknya sendiri diatur tim Loyverse.)
20. **Foto produk:** diunggah ke CMS (usulan, karena butuh PNG transparan) atau diambil dari gambar item Loyverse?
21. **Item tanpa profil:** disembunyikan dari web (usulan) atau tampil dengan data minimal dari Loyverse?

---

## 13. Lampiran: contoh konfigurasi (sketsa)

Sketsa agar arahnya jelas; sesuaikan dengan versi Payload yang dipakai.

### 13.1 Collection `products` (ringkas)

```ts
// collections/Products.ts
import type { CollectionConfig } from 'payload'
import { isAdminOrEditor, isAdminOrOps } from '../access'
import { triggerRebuild } from '../hooks/triggerRebuild'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'category', 'loyverse.itemId', 'updatedAt'] },
  versions: { drafts: { autosave: true } },
  access: {
    // publik hanya melihat yang terbit; staf melihat semua termasuk draft
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  hooks: { afterChange: [triggerRebuild], afterDelete: [triggerRebuild] },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true, admin: { position: 'sidebar' } },
    { name: 'category', type: 'relationship', relationTo: 'product-categories', required: true },
    { name: 'name', type: 'text', required: true, localized: true },
    { name: 'eyebrow', type: 'text', localized: true },
    { name: 'score', type: 'number', min: 0, max: 100 },
    {
      name: 'specs', type: 'array', localized: true, maxRows: 10,
      fields: [{ name: 'label', type: 'text', required: true }, { name: 'value', type: 'text', required: true }],
    },
    { name: 'notes', type: 'array', localized: true, fields: [{ name: 'note', type: 'text', required: true }] },
    { name: 'size', type: 'text', localized: true },
    { name: 'unit', type: 'text', localized: true },
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    {
      // cache dari Loyverse; hanya job sinkron yang menulis (overrideAccess)
      name: 'loyverse', type: 'group',
      access: { create: () => false, update: () => false },
      fields: [
        { name: 'itemId', type: 'text', required: true, unique: true, index: true },
        { name: 'price', type: 'number', admin: { readOnly: true } },
        { name: 'soldOut', type: 'checkbox', admin: { readOnly: true } },
        { name: 'syncedAt', type: 'date', admin: { readOnly: true } },
      ],
    },
    { name: 'isNew', type: 'checkbox', defaultValue: false },
    // ... variants, detail, related, seo
  ],
}
```

### 13.2 Hook rebuild

```ts
// hooks/triggerRebuild.ts
import type { CollectionAfterChangeHook } from 'payload'

export const triggerRebuild: CollectionAfterChangeHook = async ({ doc, previousDoc }) => {
  const wasPublished = previousDoc?._status === 'published'
  const isPublished = doc?._status === 'published'
  // abaikan draft yang tidak pernah terbit
  if (!isPublished && !wasPublished) return doc
  if (process.env.REBUILD_HOOK_URL) {
    // sebaiknya di-debounce (mis. lewat antrean/job) agar tidak build berkali-kali
    fetch(process.env.REBUILD_HOOK_URL, { method: 'POST' }).catch(() => {})
  }
  return doc
}
```

### 13.3 Global `home` (kerangka)

```ts
// globals/Home.ts
import type { GlobalConfig } from 'payload'

export const Home: GlobalConfig = {
  slug: 'home',
  versions: { drafts: true },
  access: { read: () => true },
  fields: [
    {
      name: 'hero', type: 'group', fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: true },
        { name: 'background', type: 'upload', relationTo: 'media', required: true },
        { name: 'mark', type: 'upload', relationTo: 'media' },
        { name: 'intro', type: 'textarea', localized: true },
        { name: 'stats', type: 'array', maxRows: 3, localized: true, fields: [
          { name: 'value', type: 'text', required: true },
          { name: 'label', type: 'text', required: true },
        ] },
      ],
    },
    { name: 'sectorTitle', type: 'text', localized: true },
    { name: 'sectors', type: 'relationship', relationTo: 'product-categories', hasMany: true, maxRows: 3 },
    {
      name: 'featured', type: 'group', fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'subtitle', type: 'text', localized: true },
        { name: 'products', type: 'relationship', relationTo: 'products', hasMany: true, maxRows: 4 },
      ],
    },
    // ... roots, places
  ],
}
```

### 13.4 Akses berbasis peran

```ts
// access/index.ts
import type { Access } from 'payload'

const role = (r: string[]): Access => ({ req: { user } }) => !!user && r.includes((user as any).role)

export const isAdmin = role(['admin'])
export const isAdminOrEditor = role(['admin', 'editor'])
export const isAdminOrOps = role(['admin', 'ops'])
```

---

## 14. Yang kami siapkan di sisi frontend

- `src/lib/cms.ts`: klien API bertipe (memakai `payload-types.ts` atau OpenAPI dari tim CMS).
- Mengganti isi `src/data/products.ts` dan `src/data/checkout.ts`, serta semua teks di `.astro` yang tercantum di bagian 3, dengan data dari API.
- Rute baru: `/contacts`, `/faq`, `/news/[slug]`, `/p/[slug]` (atau `/[slug]`), 404, dan `/preview`.
- Keranjang tetap di browser untuk tamu, tetapi harga dan stok selalu diverifikasi lewat `POST /api/checkout/quote`.
- Mengganti auth `localStorage` dengan cookie dari Payload, dan pesanan dengan endpoint kustom.
- Saat Fase 1 siap di staging, kirimkan **URL staging**, akun editor uji, dan `payload-types.ts`. Kami mulai mengganti data mock per halaman.
- Halaman produk dan keranjang menampilkan `price`, pajak, dan `soldOut` dari API (sumber Loyverse), bukan dari hasil build. Link unduh invoice di akun dan konfirmasi memakai `GET /api/orders/:id/invoice`.

---

## 15. Integrasi Loyverse dan Xero

> Ringkasan: **Loyverse = katalog, harga, pajak, stok, dan catatan penjualan. Xero = invoice dan pembukuan. Payload = konten, pesanan web, dan perekat di antara keduanya.** Detail endpoint kedua layanan perlu dicek di dokumentasi resmi masing-masing (Loyverse API, Xero API); bagian ini mendefinisikan *perilaku yang kami butuhkan*, bukan menggantikan dokumentasi mereka.

### 15.1 Alur data

```
Loyverse ──(webhook + sinkron berkala)──▶ Payload (cache baca-saja) ──▶ Frontend
Frontend ──▶ Payload: quote / buat pesanan / bayar
Payload ──(pesanan paid)──▶ Loyverse: receipt (stok berkurang)
Payload ──(pesanan paid)──▶ Xero: invoice + pembayaran
Payload ◀──(webhook)── Payment gateway
```

### 15.2 Loyverse

**Dibaca dari Loyverse:** item, varian (SKU, harga), kategori, pajak, toko, dan level stok per toko. Frontend hanya memakai toko di `integrations.loyverse.storeId`.

**Cache di Payload.** Frontend tidak memanggil Loyverse langsung (menghindari batas laju dan membocorkan token). Job sinkron menulis ke `products.loyverse.*`:
- **Webhook** Loyverse (perubahan item, stok, receipt) memperbarui produk terkait segera.
- **Sinkron penuh** berkala (default tiap 5 menit, bisa diatur) untuk menutup webhook yang terlewat.
- Bila Loyverse tidak bisa dihubungi, API publik tetap melayani cache terakhir dan menandai `syncedAt` basi. **Pembuatan pesanan tidak memakai cache**: stok dicek ulang langsung ke Loyverse.

**Pemetaan.**
- Item Loyverse ↔ profil `products` lewat `loyverse.itemId`; varian lewat `variantId` (SKU sebagai cadangan).
- `soldOut` bila stok toko online ≤ 0 setelah dikurangi cadangan aktif; item yang stoknya tidak dilacak di Loyverse dianggap selalu tersedia. `lowStock` bila di bawah ambang (usulan 5).
- Item yang dihapus atau dinonaktifkan di Loyverse: profil disembunyikan dari API publik.
- Kategori Loyverse hanya petunjuk; kategori web tetap `product-categories` (editorial).

**Pajak.** Tarif dan mode (inklusif/eksklusif) dibaca dari pajak item di Loyverse. `POST /api/checkout/quote` mengembalikan `tax` dan `taxIncluded`; frontend hanya menampilkannya. Teks "All prices include applicable taxes." adalah `site-settings.taxNote` (teks saja).

**Reservasi stok** (collection internal `stock-reservations`): `order`, `variantId`, `qty`, `expiresAt`, `status` (`active` / `released` / `committed`). Dibuat saat pesanan dibuat, dilepas saat `expired`/`cancelled`, dan `committed` saat receipt dibuat. Stok tersedia = stok Loyverse − cadangan `active`.

**Pesanan → Loyverse.** Saat pesanan `paid`, server membuat **receipt** di Loyverse: baris per varian (`variantId`, qty, harga), pajak, potongan diskon, jenis pembayaran `integrations.loyverse.paymentTypeId`, dan catatan (nomor pesanan, opsi seperti grind). Receipt inilah yang mengurangi stok di Loyverse. Idempotensi: simpan `orders.loyverse.receiptId`; jangan buat dua kali. Bila gagal: `syncStatus: failed`, coba ulang otomatis (backoff), kirim peringatan ke `ops`. Pesanan tetap `paid`.

**Risiko yang diterima.** Kasir toko bisa menjual item yang sama di jendela waktu singkat antara cek stok dan receipt. Stok minus mungkin terjadi; `ops` mendapat peringatan (pertanyaan 17).

### 15.3 Xero

- **Koneksi:** OAuth2 oleh admin lewat `GET /api/integrations/xero/connect`. Token akses dan refresh disimpan terenkripsi (`TOKEN_ENCRYPTION_KEY`), diperbarui otomatis. Bila refresh gagal, status `integrations.xero` berubah dan `ops` mendapat peringatan.
- **Kontak:** saat pesanan pertama seorang pelanggan, buat atau cocokkan kontak di Xero berdasarkan email; simpan `customers.xeroContactId`. Pesanan tamu memakai kontak berdasarkan email yang sama.
- **Invoice hanya dibuat setelah pesanan `paid`** (tidak ada invoice untuk pesanan yang menunggu bayar atau kedaluwarsa). Isinya baris produk, potongan diskon, ongkir, dan biaya pembayaran sebagai baris terpisah. **Angka pajak disalin apa adanya dari Loyverse** (dari kuotasi/receipt); CMS tidak menghitung atau memetakan pajak sendiri. `Reference` = nomor pesanan `SRG-…`.
- **Pembayaran:** invoice dan pencatatan pembayarannya dibuat sekaligus, dipicu webhook gateway yang menandai `paid` (ke akun penampung gateway).
- **PDF:** `GET /api/orders/:id/invoice` mengambil PDF dari Xero dan meneruskannya ke pelanggan setelah memeriksa pemilik atau `guestToken`. Tombol "Download receipt" (`.txt`) di frontend diganti tautan ini. Tautan Xero asli tidak pernah dibuka ke publik.
- **Refund/retur:** buat credit note di Xero (`returns.xeroCreditNoteId`).
- **Kegagalan:** sama seperti Loyverse: simpan `orders.xero.lastError`, coba ulang, peringatkan `ops`. Pesanan tidak dibatalkan karena Xero gagal.
- **Hal yang harus disepakati dengan akuntan:** kode akun, penomoran invoice, mata uang (IDR), dan perlakuan biaya gateway. Soal pajak di sisi Xero (tipe pajak yang dipakai agar angkanya sama dengan Loyverse) dikoordinasikan oleh tim yang mengurus pajak, bukan ditentukan di CMS.

### 15.4 Pemantauan

Catat setiap sinkron dan panggilan keluar (sukses/gagal, durasi) di log terstruktur atau collection `sync-logs` (hanya admin). Tampilkan di admin: waktu sinkron terakhir, jumlah item belum punya profil, dan pesanan dengan `loyverse.syncStatus`/`xero.status` gagal.
