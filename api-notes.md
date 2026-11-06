# Catatan API: dipakai, belum dipakai, dan tumpang tindih

Dasar: [api.md](api.md) dibandingkan dengan kode di `src/` (per 2026-11-06). Tujuannya membantu memilah endpoint mana yang dipertahankan.

Keterangan: ✅ dipakai · 🟡 dipakai sebagian / hanya cadangan · ❌ belum dipakai (halaman belum ada)

## 1. Ringkasan

| | Jumlah |
|---|---|
| Dipakai penuh | 20 |
| Dipakai sebagian / cadangan | 3 |
| Belum dipakai | 26 (termasuk 11 global) |
| Bukan urusan frontend | 3 |

Semua yang belum dipakai terhubung ke halaman yang memang belum dibuat (Contacts, FAQ, legal, search, ulasan, wishlist, retur, form).

---

## 2. Dipakai

### Katalog (dibaca saat build, harga dan stok diperbarui lagi di browser)
| Endpoint | Dipakai di | Catatan |
|---|---|---|
| ✅ `GET /product-categories` | `lib/catalog.ts` | |
| ✅ `GET /products` | `lib/catalog.ts` | Saat build (daftar + halaman produk) dan di browser (`where[slug][in]` untuk harga/stok terbaru) |
| ✅ `GET /articles` | `lib/articles.ts` | Hanya untuk halaman detail `/news/[slug]`. Daftar `/news` belum memakainya |

### Akun
| Endpoint | Dipakai di |
|---|---|
| ✅ `POST /customers` (daftar) | `stores/session.ts` |
| ✅ `POST /customers/verify/:token` | `/verify` |
| ✅ `POST /customers/login` | `stores/session.ts` |
| ✅ `POST /customers/logout` | `stores/session.ts` |
| ✅ `GET /customers/me` | `stores/session.ts` |
| ✅ `PATCH /customers/:id` | `stores/session.ts` (profil, alamat) |
| ✅ `POST /customers/forgot-password` | `/forgot-password` |
| ✅ `POST /customers/reset-password` | `/reset-password` |
| ✅ `GET /customers/me/orders` | `lib/shop.ts` (halaman akun) |

### Checkout dan pesanan
| Endpoint | Dipakai di |
|---|---|
| ✅ `POST /shipping/rates` | `CheckoutDelivery` (tarif Biteship setelah kode pos diisi) |
| ✅ `POST /checkout/quote` | `useCart`, checkout, pembayaran. Satu-satunya sumber total |
| ✅ `POST /orders/create` | `CheckoutPayment` |
| ✅ `GET /orders/lookup` | `OrderConfirmation` (polling status) |
| ✅ `POST /orders/:nomor/cancel` | `OrderConfirmation` |
| ✅ `POST /payments/mock/simulate` | `/mock-pay`, tombol "Simulate payment" (hanya dev / `PUBLIC_MOCK_PAYMENTS`) |
| ✅ `GET /payment-methods` | `CheckoutPayment` |

### Form
| Endpoint | Dipakai di |
|---|---|
| ✅ `GET /forms/newsletter/confirm` | `/newsletter/confirm` |

### Sebagian / cadangan
| Endpoint | Status |
|---|---|
| 🟡 `GET /shipping-methods` | Hanya cadangan bila `/shipping/rates` membalas `shipping_unavailable`, dan untuk menampilkan nama metode di halaman pesanan lama |
| 🟡 `GET /provinces`, `/cities`, `/districts` | Dropdown wilayah di form alamat. Datanya **belum diisi** di CMS (api.md bagian 3), jadi dropdown kosong. Lihat bagian 4 |
| 🟡 `GET /media/...` | Tidak dipanggil langsung; URL gambar dari produk/artikel dipakai apa adanya |

---

## 3. Belum dipakai

### Konten (REST bawaan)
| Endpoint | Halaman yang dibutuhkan | Catatan |
|---|---|---|
| ❌ `GET /pages` | Terms, Privacy, Shipping & Returns | Halaman belum ada |
| ❌ `GET /faqs` | FAQ | Halaman belum ada |
| ❌ `GET /reviews` | Ulasan di halaman produk | Belum ada |
| ❌ `GET /redirects` | – | Bisa diatur di Nginx; tidak perlu dari frontend |
| ❌ `GET /globals/home` | Beranda | Teks beranda masih di kode |
| ❌ `GET /globals/about` | About | idem |
| ❌ `GET /globals/gallery` | Gallery | idem |
| ❌ `GET /globals/news-page` | Daftar `/news` | idem |
| ❌ `GET /globals/faq-page` | FAQ | Halaman belum ada |
| ❌ `GET /globals/contact-page` | Contacts | Halaman belum ada |
| ❌ `GET /globals/navigation` | Navbar | Menu masih di kode |
| ❌ `GET /globals/footer` | Footer | masih di kode |
| ❌ `GET /globals/announcement` | Promo bar | masih di kode |
| ❌ `GET /globals/site-settings` | Judul/SEO situs, kontak | masih di kode |
| ❌ `GET /globals/ui-strings` | Teks antarmuka | masih di kode |

### Akun dan interaksi
| Endpoint | Catatan |
|---|---|
| ❌ `POST /customers/refresh-token` | Sesi 7 hari; belum diperpanjang otomatis |
| ❌ `POST /wishlist` | Wishlist belum ada |
| ❌ `POST /reviews` | Form ulasan belum ada |
| ❌ `POST /returns`, `GET /returns/lookup` | Halaman retur belum ada |
| ❌ `GET /search` | Pencarian belum ada |
| ❌ `GET /shipping/areas` | Pencarian area Biteship untuk `areaId`. Opsional; rate sudah jalan dengan kode pos saja |

### Form publik
| Endpoint | Catatan |
|---|---|
| ❌ `POST /forms/contact` | Halaman Contacts belum ada |
| ❌ `POST /forms/wholesale` | Form wholesale belum ada |
| ❌ `POST /forms/newsletter` | Form berlangganan belum ada (hanya halaman konfirmasinya) |
| ❌ `POST /forms/stock-alert` | "Beri tahu saya" untuk produk sold out belum ada |

### Bukan urusan frontend (tidak akan dipakai LP)
| Endpoint | Pemanggil |
|---|---|
| `POST /payments/webhook/:provider` | Xendit / mock |
| `POST /integrations/loyverse/sync` | Admin di panel |
| `POST /integrations/loyverse/webhook` | Loyverse |

---

## 4. Yang tumpang tindih / ganda

| # | Yang ganda | Kesimpulan |
|---|---|---|
| 1 | `GET /shipping-methods` vs `POST /shipping/rates` | Sama-sama daftar ongkir. Rates itu dinamis (Biteship), methods itu tetap. **Pertahankan dua-duanya selama Biteship bisa mati** (`shipping_unavailable`). Bila Biteship dianggap selalu aktif, `shipping-methods` bisa dihapus dari LP dan dari CMS |
| 2 | `GET /provinces` `/cities` `/districts` vs `GET /shipping/areas` | Sama-sama untuk wilayah. Wilayah kosong, sedangkan rates cukup dengan kode pos. **Usul:** pilih satu. Bila ingin dropdown, isi data wilayah; bila ingin pencarian, pakai `shipping/areas` dan buang tiga koleksi itu. Catatan: `create` menuntut `province` dan `district` untuk Indonesia, jadi salah satu cara tetap harus mengisinya |
| 3 | `GET /orders/lookup` vs `GET /customers/me/orders` | Lookup untuk satu pesanan (tamu maupun login); `me/orders` untuk daftar. Bentuk datanya sama. **Dua-duanya perlu** |
| 4 | `POST /checkout/quote` vs `POST /orders/create` | Keduanya menghitung total, tetapi tujuannya beda (pratinjau vs final). **Perlu keduanya** |
| 5 | `GET /products` vs `GET /products/:id` vs `GET /search` | LP memakai `GET /products` dengan filter. `/products/:id` tidak dibutuhkan (LP mencari lewat `slug`). `/search` hanya perlu bila ada kotak pencarian |
| 6 | `newsletter` pada `POST /customers`, `contact.newsletter` pada `orders/create`, dan `POST /forms/newsletter` | Tiga pintu ke daftar yang sama. Dua yang pertama dipakai LP (checkbox saat daftar/checkout). Yang ketiga hanya perlu bila ada kolom email di footer |
| 7 | `PATCH /customers/:id` (field `newsletter`) vs `POST /forms/newsletter` | Berhenti berlangganan dari akun tidak lewat form. Pilih satu tempat |
| 8 | `POST /wishlist` vs `PATCH /customers/:id` | Wishlist tersimpan di data pelanggan, jadi secara teori bisa lewat PATCH. Endpoint khusus lebih aman (toggle), **pakai `/wishlist`** bila fitur ini dibuat |
| 9 | `POST /orders/:nomor/cancel` vs pembatalan admin | Pelanggan hanya saat `awaiting_payment`. Setelah dibayar lewat admin, bukan API. Bukan duplikat, tetapi pesan di LP harus konsisten (sudah) |
| 10 | `POST /payments/mock/simulate` vs webhook `mock` | Simulate dipakai browser, webhook dipakai server. Keduanya hanya untuk uji; **buang saat Xendit sungguhan** (`PAYMENT_PROVIDER=xendit`) |
| 11 | `GET /returns/lookup` vs `GET /orders/lookup` | Lookup retur hanya berguna bila halaman retur dibuat; bila tidak, keduanya tidak perlu |
| 12 | `GET /redirects` vs aturan Nginx | Bisa dikerjakan di Nginx; abaikan dari LP |
| 13 | 11 global (`home`, `about`, …, `ui-strings`) | Beberapa bisa digabung: `navigation` + `footer` + `announcement` + `site-settings` sering diambil bersamaan pada tiap halaman. Bila tim CMS mau menyederhanakan, satu global `site` dengan empat bagian cukup |

---

## 5. Usul keputusan

**Pertahankan (inti toko):** katalog, akun, `shipping/rates`, `checkout/quote`, `orders/*`, `payment-methods`, `payments/webhook`.

**Putuskan dulu (pilih salah satu):**
- #1 `shipping-methods` ada atau dibuang.
- #2 wilayah lewat dropdown (isi data) atau lewat `shipping/areas`.

**Bangun bila fiturnya diinginkan:** globals (konten halaman), FAQ, legal (`pages`), Contacts + `forms/contact`, wholesale, newsletter, search, ulasan, wishlist, retur, stock-alert, `refresh-token`.

**Aman dibuang dari LP:** `GET /products/:id`, `GET /redirects`, `POST /customers/refresh-token` (bila sesi 7 hari dianggap cukup).
