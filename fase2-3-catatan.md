# Catatan Fase 2 + 3 (akun, checkout, pesanan, form publik)

Status: **semua bagian yang tidak butuh akun luar sudah dibuat dan diuji.** 28 tes integrasi lulus, alur pesanan juga dicoba lewat HTTP sungguhan (kuotasi → buat pesanan → idempotensi → bayar → batal), dan migrasi terbukti menyiapkan database kosong (lalu seed jalan tanpa `push`).
Bagian yang menunggu akun/keputusan **belum dikerjakan** sesuai permintaan; daftar dan titik sambungnya ada di bagian "Menunggu".

Catatan sebelumnya ada di [fase1-catatan.md](fase1-catatan.md); isinya masih berlaku.

## Yang sudah dibuat

**Akun** — `customers` (auth terpisah dari admin): daftar, login cookie, tanpa verifikasi saat daftar (verifikasi email belakangan lewat kode OTP, lihat api-changes.md), lupa password, kunci akun 5 kali gagal / 10 menit, alamat tersimpan, wishlist. Kata sandi divalidasi di server (min. 8, huruf + angka). Pelanggan tidak bisa menulis `emailVerified` atau field internal lewat API.

**Checkout** — `shipping-methods`, `payment-methods`, `discount-codes` (tidak bisa dibaca publik), `provinces/cities/districts` + skrip `pnpm import:regions <file.json>`.
- `POST /api/checkout/quote`: harga, pajak, stok, diskon, ongkir, biaya bayar dihitung ulang di server. Kode error: `out_of_stock`, `option_required`, `invalid_option`, `variant_required`, `invalid_discount`, `product_unavailable`, `validation_error`.

**Pesanan** — `orders`, `stock-reservations`:
- `POST /api/orders/create` (header `Idempotency-Key`), `GET /api/orders/lookup?number=&token=`, `GET /api/customers/me/orders`, `POST /api/orders/:nomor/cancel`.
- Stok tersedia = stok Loyverse − reservasi `active` − `committed`. Cek + reservasi berjalan serial dalam satu transaksi; tes dua pesanan bersamaan membuktikan tidak ada oversell.
- Status berpindah lewat aturan transisi (`awaiting_payment → paid → processing → shipped → delivered`, cabang `cancelled/expired/refunded`). Efek samping (reservasi, email, kuota diskon) ada di hook, jadi berlaku sama untuk admin, webhook, dan job.
- Job tiap menit menutup pesanan belum dibayar yang lewat batas (default 24 jam, `ORDER_EXPIRY_HOURS`).
- Pesanan tamu hanya bisa dibuka dengan `guestToken`; "tidak ada" dan "token salah" menghasilkan 404 yang sama.

**Pembayaran (penyedia tiruan)** — antarmuka `PaymentProvider` di [src/lib/payments/provider.ts](src/lib/payments/provider.ts) dengan `mockProvider`. Webhook `POST /api/payments/webhook/:provider` memverifikasi tanda tangan, idempoten, dan menandai `needsRefund` bila pembayaran datang setelah pesanan kedaluwarsa/batal. `POST /api/payments/mock/simulate` menggantikan tombol "Simulate payment" (otomatis mati di produksi).

**Email** — `email-templates` (draft + versi, en/id). Tanpa template aktif, teks bawaan (Inggris) di [src/lib/email/send.ts](src/lib/email/send.ts) dipakai. Dikirim: pesanan dibuat, pembayaran diterima, dikirim, dibatalkan, update retur, verifikasi, reset password, stok kembali, konfirmasi newsletter, pesan kontak diterima.

**Lainnya** — `returns` (`POST /api/returns`, `GET /api/returns/lookup`), `reviews` (moderasi, `ratingAvg/ratingCount` produk dihitung otomatis), `POST /api/wishlist`, `GET /api/search?q=`, form `contact / newsletter (double opt-in) / wholesale / stock-alert` (honeypot `website` + rate limit), global `ui-strings`.

## Yang perlu Anda tahu / putuskan

1. **Pajak dihitung CMS dari tarif Loyverse yang di-cache**, bukan disalin dari receipt Loyverse. `cms.md` ingin angka pajak identik dengan Loyverse; pembulatan bisa selisih Rp1 per baris. Pajak diskalakan proporsional dengan diskon. Konfirmasikan dengan akuntan sebelum Xero disambungkan (pertanyaan 18/19).
2. **Stok `committed` tidak pernah dilepas sampai integrasi receipt Loyverse ada.** Saat pesanan `paid`, reservasinya jadi `committed` dan terus mengurangi stok tersedia. Saat integrasi receipt dibuat nanti, ia **wajib** mengubahnya menjadi `fulfilled` (setelah stok Loyverse berkurang), kalau tidak stok terhitung ganda.
3. **Produksi tanpa `PAYMENT_PROVIDER` → membuat pesanan gagal dengan 503 `payment_unavailable`** (sengaja, agar mock tidak aktif tanpa sengaja). Dev/staging otomatis memakai mock. Webhook mock butuh `MOCK_PAYMENT_SECRET`.
4. **Hanya aman untuk satu instance**: antrean serial stok (`src/lib/orders/mutex.ts`) dan rate limit ada di memori proses. Untuk multi-instance, ganti dengan `pg_advisory_xact_lock` dan penyimpanan rate limit bersama. Rate limit membaca `X-Forwarded-For`; pasang hanya di belakang proxy tepercaya.
5. **`guestToken` tidak kedaluwarsa** (pertanyaan 7 belum dijawab). Nomor pesanan: 4 digit acak per hari; bila lebih dari ±5.000 pesanan/hari, perpanjang.
6. ~~Membatalkan pesanan yang sudah dibayar diizinkan~~ (diganti: pelanggan hanya bisa membatalkan sebelum bayar; admin yang membatalkan pesanan berbayar): status jadi `cancelled`, `needsRefund` dicentang. **Tidak ada refund otomatis ke gateway**; ops memprosesnya manual.
7. **Form publik tidak "create terbuka" di collection** seperti tertulis di `cms.md`: pembuatan hanya lewat endpoint (agar rate limit dan honeypot selalu berlaku).
8. **Rute frontend yang saya asumsikan** untuk tautan di email: `/reset-password?token=`, `/order/<nomor>?token=`, `/newsletter/confirm?token=`, `/products/<slug>`, `/mock-pay?order=`. Sesuaikan di [src/lib/email/send.ts](src/lib/email/send.ts) dan [src/lib/payments/provider.ts](src/lib/payments/provider.ts) bila beda.
9. **Email**: tanpa `SMTP_HOST` email hanya dicatat di log. Verifikasi email wajib sebelum login, jadi SMTP harus siap sebelum pendaftaran dibuka. Template bahasa Indonesia belum ada (buat di admin).
10. **Ulasan**: `verifiedPurchase` dihitung saat ulasan dibuat dan hanya menghitung pesanan akun (bukan pesanan tamu).
11. **Retur**: foto hanya bisa ditambah dari admin (belum ada unggah dari pelanggan). Tidak ada credit note Xero.
12. **Wilayah**: collection dan skrip impor ada, tetapi **tidak ada dataset** di repo. Butuh berkas JSON (bentuknya ada di komentar atas skrip).
13. **`ui-strings`** berupa daftar `key → value` bebas; daftar kunci resmi menunggu dari frontend.
14. **Migrasi**: ada dua (`initial`, `fase2`). Jalankan `pnpm payload migrate` di produksi. Setiap perubahan skema berikutnya perlu `pnpm payload migrate:create <nama>`.
15. **Tes**: berjalan berurutan (satu database). Mereka membuat dan menghapus datanya sendiri; arahkan hanya ke database uji.

## Menunggu (belum dikerjakan; titik sambungnya sudah disiapkan)

| Hal | Butuh | Titik sambung |
|---|---|---|
| Gateway nyata (Midtrans/Xendit) | pilihan + akun sandbox | file baru yang mengimplementasikan `PaymentProvider`, daftarkan di `getProvider()`; `parseWebhook` memetakan payload gateway ke `{status}` |
| Ongkir dari API (`/api/shipping/rates`) | pilihan penyedia + kunci | `shipping-methods.price` masih tetap; `products.weightGrams` sudah ada; quote perlu menerima `destination` |
| Receipt ke Loyverse saat `paid` | token terverifikasi, `paymentTypeId`, jawaban pertanyaan 17 | pesanan `paid` sudah berstatus `loyverse.syncStatus = pending`; job harus membuat receipt lalu mengubah reservasi `committed → fulfilled` (butir 2) |
| Invoice + pembayaran Xero, `GET /api/orders/:id/invoice` | akun Xero, kode akun, penomoran | `xero.status = pending` sudah ditandai; `customers.xeroContactId` sudah ada; credit note via `returns.xeroCreditNoteId` |
| `subscriptions` | keputusan jadi/tidak + pembayaran berulang di gateway | belum ada collection |
| Refund otomatis lewat gateway | gateway terpilih | `needsRefund` sudah menandai pesanannya |

## Tambahan: pilih menu Loyverse yang tampil di web

Admin → grup **Loyverse**:
- **Kategori Loyverse**: centang *Tampilkan di web* untuk menampilkan semua menu di kategori itu. Opsional isi *Kategori web* agar produk baru langsung masuk kategori web yang benar.
- **Menu Loyverse**: centang per menu (bisa banyak sekaligus: pilih baris → Edit). Menu tampil bila menu **atau** kategorinya dicentang. Cari/saring berdasarkan nama atau kategori.

Cara kerja (tiap sinkron, 5 menit sekali):
1. Daftar kategori dan menu disalin dari Loyverse; centang Anda tidak ditimpa.
2. Menu yang dicentang tetapi belum punya produk dibuatkan **produk draf** (nama, slug, harga/stok dari Loyverse). Anda tinggal mengisi **foto (wajib), kategori web, teks**, lalu menerbitkan di Products. Produk draf tidak tampil di publik.
3. Menu yang centangnya dicabut: produknya disembunyikan dari API publik (tidak dihapus; centang lagi untuk menampilkan kembali).
4. Produk yang sudah ada sebelum fitur ini otomatis tercentang, jadi tidak hilang dari web.

Catatan: setelah draf diterbitkan, harga/stok di cache bisa kosong sampai sinkron berikutnya (maks. 5 menit); wajar. Migrasi baru: `20261102_033612_loyverse_menu` (jalankan `pnpm payload migrate`).

## Tambahan: ongkir Biteship (Indonesia) dan FedEx (luar negeri)

Sudah ada:
- `POST /api/shipping/rates` dan `GET /api/shipping/areas` ([src/lib/shipping/](src/lib/shipping/)). Tarif dihitung dari berat (berat varian, lalu berat produk, lalu bawaan, ditambah berat kemasan) dan kode pos tujuan.
- `shippingId` bisa berupa `biteship:<kurir>:<layanan>`; server menghitung ulang tarif di `quote` dan saat membuat pesanan (di luar kunci stok dan transaksi). Metode tetap di `shipping-methods` tetap jalan sebagai cadangan.
- Admin → Globals → Integrations → **Shipping**: alamat asal, kode kurir, berat kemasan, berat bawaan. Produk: `variantWeights` dan grup `customs` (deskripsi, kode HS, negara asal).
- Alamat luar negeri tidak mewajibkan provinsi dan kecamatan. Migrasi: `20261103_122434_shipping`.

**Belum diuji terhadap Biteship sungguhan** (tidak ada API key): bentuk respons tarif ditulis dari dokumentasi publik dan diuji dengan respons tiruan. Setelah `BITESHIP_API_KEY` terisi, jalankan satu permintaan tarif nyata dan bandingkan dengan dashboard Biteship. Bila nama field berbeda, perbaikannya hanya di [biteship.ts](src/lib/shipping/biteship.ts).

Belum ada: booking kurir dan resi di Biteship setelah `paid`, webhook status kiriman (`order.status`, `order.waybill_id`, `order.price`), FedEx (butuh akun developer; saat ini selalu `503`), gratis ongkir untuk tarif penyedia (batas gratis ongkir hanya berlaku untuk metode tetap), dan biaya bea masuk (DDU/DDP belum diputuskan).

## Seed lengkap dan field `articles.category`

- `pnpm seed` kini mengisi data contoh lengkap (13 produk, 6 artikel, 3 halaman, 8 FAQ, ulasan, semua global, 12 foto galeri) dari `media/images`. Aman diulang; konten yang sudah ada tidak ditimpa, kecuali global dan produk contoh (`SEED-`/`PENDING-`).
- Produk contoh memakai `loyverse.itemId = SEED-<slug>` dengan harga/stok palsu. Sinkron Loyverse melewati `SEED-*` ([sync.ts](src/lib/loyverse/sync.ts)). Sebelum rilis, hapus produk itu atau ganti `itemId` dengan ID Loyverse asli.
- Akun uji: `demo@sregcoffee.test` / `Demo12345`. Hapus sebelum produksi.
- Migrasi baru: `20261105_033408_articles_category` (kolom `category` pada artikel, per lokal). Jalankan `pnpm payload migrate` sebelum `pnpm seed`.
- Editor Lexical: tanpa H1; checklist, relasi, rata teks, dan indentasi dimatikan (sesuai `cms-news-notes.md`).

## Xendit (pembayaran)

- Penyedia baru `xendit` ([xendit.ts](src/lib/payments/xendit.ts)), aktif bila `PAYMENT_PROVIDER=xendit`. Memakai **Xendit Invoice** (halaman bayar Xendit, dibuka frontend sebagai popup/tab). Kartu, VA, QRIS, e-wallet dibatasi sesuai jenis metode yang dipilih pembeli.
- Webhook: `POST /api/payments/webhook/xendit`, diverifikasi header `x-callback-token` = `XENDIT_CALLBACK_TOKEN`. `PAID`/`SETTLED` → `paid`; `EXPIRED` → `expired`. Idempoten; pembayaran telat ditandai `needsRefund`.
- Env: `XENDIT_SECRET_KEY`, `XENDIT_CALLBACK_TOKEN`. 39 tes lulus (3 baru). **Belum diuji ke Xendit sungguhan** (butuh kunci mode test).
- Pesanan dibatalkan sebelum bayar → invoice di-expire di Xendit (`POST /invoices/{id}/expire!`, gagal = diabaikan).
- **Refund 100% manual** dari dashboard Xendit; CMS tidak memanggil API refund. Alur: pelanggan hanya bisa membatalkan sebelum bayar → pesanan berbayar dibatalkan admin (`cancelled`, `needsRefund`) → **email ke semua user admin/ops** ([refund.ts](src/lib/payments/refund.ts)) → admin refund di dashboard Xendit → webhook `refund.succeeded` mengubah pesanan ke `refunded` dan mematikan `needsRefund`. Refund sebagian hanya dicatat di `internalNotes`. Pembayaran yang masuk setelah pesanan kedaluwarsa/dibatalkan juga memicu email + `needsRefund`.
- Transisi baru: `cancelled → refunded` dan `expired → refunded`.
- Perlu didaftarkan di dashboard Xendit: webhook refund (`refund.succeeded`) ke URL webhook yang sama. **Bentuk payload refund Xendit saya tulis dari pengetahuan sendiri dan belum diverifikasi**: pencocokan memakai `data.invoice_id` atau `data.reference_id`; cek di mode test.
- 44 tes lulus.
