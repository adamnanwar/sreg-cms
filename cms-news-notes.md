# Catatan untuk tim CMS: halaman detail News

Halaman `/news/{slug}` sudah dibuat di frontend dengan layout khusus (hero dua kolom, lalu satu kolom artikel). Frontend sudah membaca `GET /articles`, jadi dokumen ini berisi **bentuk data yang kami harapkan** dan **apa yang perlu disiapkan di CMS**. Definisi koleksi dasar ada di [`cms.md`](cms.md) bagian 5.4; dokumen ini hanya menambah detail dan beberapa permintaan. Bila ada beda, kabari kami sebelum diubah.

Status saat ini: `GET /articles` masih kosong, jadi di mode dev frontend menampilkan satu artikel contoh (`/news/sample`). Di build produksi tidak ada halaman artikel sampai ada yang terbit.

---

## 1. Request yang dipakai frontend

Dilakukan **saat build** (halaman dibuat statis), bukan dari browser pengunjung, sehingga CORS tidak terlibat.

```
GET /api/articles?depth=1&sort=-publishedAt&limit=50&page=1
```

- Diulang per halaman sampai `hasNextPage` bernilai `false`.
- Hanya artikel yang **terbit** (`_status: published`) yang boleh muncul di API publik, termasuk lewat `GET` biasa tanpa login.
- `depth=1` wajib mengisi relasi `image` (upload) sebagai objek, bukan hanya id.
- Frontend tidak mengirim `?locale=`; bila Anda mengaktifkan lokal pada artikel, lokal default dipakai. Beri tahu kami bila `id` perlu dipisah.

## 2. Field yang dibaca

Nama field mengikuti `cms.md` 5.4. Tanda **\*** berarti halaman rusak atau kosong bila tidak ada.

| Field | Tipe | Dipakai untuk |
|---|---|---|
| `slug` \* | text, unik | URL `/news/{slug}`. Huruf kecil, angka, tanda hubung |
| `title` \* | text | Judul besar di hero (ditampilkan kapital), `<title>` halaman |
| `excerpt` | textarea | Ringkasan di bawah judul, kartu "Keep reading", dan fallback deskripsi SEO |
| `body` \* | rich text (Lexical) | Isi artikel; lihat bagian 3 |
| `image` | upload ke `media` | Foto di sisi kanan hero. Tanpa foto, hero jadi satu kolom penuh |
| `publishedAt` \* | date | Tanggal (`YYYY/MM/DD`) dan urutan terbaru dulu |
| `meta.title`, `meta.description`, `meta.image` | group SEO | `<title>`, `<meta description>`, gambar share. Nama group `meta` (plugin SEO, seperti di `lp.md`) atau `seo` (seperti di `cms.md`): keduanya kami baca |
| `category` | text/select atau relasi dengan `label` | Label kecil di atas judul, mis. `ROASTERY`. **Opsional (usulan)** |
| `author` | text atau relasi dengan `name` | Baris "By …". **Opsional (usulan)** |
| `featured`, `tags` | seperti di `cms.md` | Belum dipakai halaman detail; `featured` dipakai halaman daftar nanti |

Permintaan untuk field `image` (koleksi `media`):
- `alt` **wajib diisi** editor, karena dipakai sebagai teks alternatif gambar hero.
- Ukuran `hero` (1920 lebar) harus tersedia; frontend memakainya untuk hero dan memakai `og` (1200×630) untuk gambar share. Bila `hero` tidak ada, dipakai file aslinya.

## 3. Isi artikel (`body`, Lexical)

Frontend mengubah JSON Lexical menjadi HTML sendiri (tanpa `@payloadcms/richtext-lexical`), lalu memberi gaya sreg. Yang didukung:

| Di editor | Hasil |
|---|---|
| Paragraf | `<p>` |
| Judul **H2 sampai H6** | `<h2>` … `<h6>` |
| Daftar berpoin dan bernomor | `<ul>` / `<ol>` |
| Kutipan | `<blockquote>` |
| Tebal, miring, garis bawah, coret, kode | `<strong>`, `<em>`, `<u>`, `<s>`, `<code>` |
| Link (internal/eksternal) | `<a>`; hanya `http(s)`, `mailto`, `tel`, dan `/…` yang diterima |
| Gambar (node `upload`) | `<figure><img>`, memakai `value.alt` dan `value.width/height` |
| Garis pemisah | `<hr>` |

Permintaan konfigurasi editor Lexical:
- **Matikan H1.** Judul halaman sudah H1; H1 di dalam isi akan dirender sebagai H2.
- Jangan aktifkan fitur di luar tabel di atas (mis. blok kustom, tabel, embed, daftar centang) **tanpa memberi tahu kami**, karena frontend akan mengabaikannya (hanya anak-anaknya yang tampil, atau tidak sama sekali). Bila perlu, kami tambah.
- Untuk node `upload`, pastikan relasinya terisi (`depth` cukup) agar `value.url` dan `value.sizes` ada. Bila tidak, gambar tidak tampil.
- Gambar di dalam isi paling bagus berformat landscape; tampil selebar kolom (maks. 880 px) dan dipotong pada tinggi 640 px.

## 4. Hal lain yang kami butuhkan

1. **Terbit dan rebuild.** Halaman dibuat saat build. Setiap artikel diterbitkan, diubah, atau dihapus, tolong panggil `REBUILD_HOOK_URL` (seperti di `cms.md`), kalau tidak halaman lama tetap tampil.
2. **Pratinjau draf (opsional, belakangan).** Live Preview ke `/news/{slug}` butuh rute pratinjau; koordinasi dulu sebelum dikerjakan.
3. **Tautan dari email atau halaman lain.** Bila CMS membuat tautan ke artikel (mis. email newsletter), polanya `<frontend>/news/{slug}`.
4. **`slug` tidak boleh berubah** setelah terbit tanpa mengisi `GET /redirects`, supaya tautan lama tidak mati.
5. **Artikel terkait:** frontend menampilkan 3 artikel terbaru lainnya. Bila Anda ingin relasi manual (`related`), kabari kami; belum kami buat.

## 5. Yang belum selesai di sisi frontend

- Halaman daftar `/news` masih memakai teks contoh di kode. Kami hubungkan setelah ada beberapa artikel dan Anda memastikan global `news-page` (`headline`, `headlineRelated`, lihat `cms.md` 4.x) tersedia.
- Terjemahan (`?locale=id`) belum dipakai di halaman News.

## 6. Pertanyaan untuk tim CMS

1. Apakah `category` dan `author` akan ada di koleksi `articles`? Bila tidak, baris kecil itu otomatis hilang dan tidak perlu apa-apa.
2. Apakah SEO group dinamai `meta` atau `seo`? (Kami baca keduanya; ini hanya untuk kepastian.)
3. Bisa isi satu artikel contoh (judul, ringkasan, foto, isi dengan judul, daftar, dan satu gambar) supaya kami cek tampilan dengan data asli?
