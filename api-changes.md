# Perubahan API

Catatan perubahan yang berdampak pada frontend (LP). Rujukan lengkap endpoint ada di [api.md](api.md); alur dan saran implementasi di [lp.md](lp.md). Yang terbaru di atas.

## 2026-11-06

### Daftar akun tanpa verifikasi email; verifikasi memakai kode OTP  (BERUBAH, ada yang dihapus)

| | Sebelum | Sekarang |
|---|---|---|
| `POST /customers` | Mengirim email berisi tautan verifikasi | Tidak mengirim email apa pun |
| `POST /customers/login` | Ditolak sampai email diverifikasi | **Langsung bisa login** setelah daftar |
| `POST /customers/verify/:token` | Ada | **Dihapus** |
| Halaman `/verify?token=` di LP | Dibutuhkan | **Tidak dipakai lagi** (boleh dihapus) |
| `POST /customers/otp/send` | – | **Baru** |
| `POST /customers/otp/verify` | – | **Baru** |
| `user.emailVerified` pada `GET /customers/me` | – | **Baru** (boolean) |

**Alur pendaftaran di LP**
1. `POST /customers` → `201`.
2. `POST /customers/login` dengan email dan kata sandi yang sama → cookie sesi (pendaftaran tidak otomatis login).
3. Verifikasi kapan saja, misalnya dari halaman akun atau saat checkout, bila `user.emailVerified` bernilai `false`:
   - `POST /customers/otp/send` → `202 { ok: true, expiresInSeconds: 600, resendAfterSeconds: 60 }`. Email berisi kode 6 angka.
   - Tampilkan kolom kode. `POST /customers/otp/verify` dengan `{ "code": "123456" }` → `200 { ok: true, emailVerified: true }`.

**Aturan OTP**
- Kode berlaku 10 menit. Minta kode baru tidak bisa sebelum 60 detik (`429 otp_cooldown`; sisa detik ada di `error.fields.retryAfter`).
- Salah 5 kali, kode hangus (`422 otp_invalid` dengan `error.fields.attemptsLeft`, lalu pelanggan harus meminta kode baru).
- Kode kedaluwarsa: `410 otp_expired`. Sudah terverifikasi: `409 already_verified`. Email gagal terkirim: `503 email_unavailable`.
- Kedua endpoint wajib login (`credentials: 'include'`); tanpa login `401 unauthorized`.
- Saat ini verifikasi **tidak menjadi syarat** untuk apa pun di CMS (login, checkout, ulasan). `emailVerified` hanya penanda; frontend yang memutuskan bila ingin membatasi fitur.

**Pelanggan lama.** Yang sudah terverifikasi lewat tautan otomatis menjadi `emailVerified: true` saat migrasi dijalankan.

**Isi email** memakai template `verify-email` (bisa diubah di admin, placeholder `{{code}}`, `{{minutes}}`, `{{customerName}}`).

### Menu admin yang tidak dipakai LP disembunyikan
Hanya memengaruhi panel admin. API, data, dan seed tidak berubah. Daftar ada di `hiddenInAdmin` di `src/payload.config.ts`.
