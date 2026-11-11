# Jajanku 🍡

Catat jajan dari foto. AI mengenali tiap item, memotongnya jadi stiker, lalu menaruhnya di kalender.

**Stack:** Next.js 16 (App Router) · Tailwind CSS 4 · Motion · Supabase (Postgres, Auth, Storage) · fal.ai (vision + BiRefNet) · ExcelJS

---

## 1. Yang perlu dipasang

- **Node.js 20 atau lebih baru** → https://nodejs.org (cek dengan `node -v`)
- **VS Code** + ekstensi yang disarankan (VS Code akan menawarkannya otomatis saat folder dibuka):
  Tailwind CSS IntelliSense, ESLint

## 2. Buka di VS Code

1. Ekstrak zip, lalu di VS Code: **File → Open Folder…** → pilih folder `jajanku`.
2. Buka terminal VS Code (**Terminal → New Terminal**) lalu jalankan:
   ```bash
   npm install
   ```

## 3. Sambungkan ke Supabase (cloud, gratis)

1. Masuk ke https://supabase.com → **New project**. Simpan password database-nya.
2. Buka **SQL Editor → New query**, tempel **seluruh isi** `supabase/schema.sql`, klik **Run**.
   Aman dijalankan ulang; **jalankan lagi setiap kali `schema.sql` diperbarui** (mis. setelah update fitur).
   Ini membuat tabel, keamanan per-user (RLS), unit bawaan, dan bucket penyimpanan stiker/foto.
3. Buka **Project Settings → API Keys**, salin:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Buka **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: tambahkan `http://localhost:3000/auth/callback`
5. *(Opsional, enak untuk development)* **Authentication → Sign In / Providers → Email** → matikan
   **Confirm email** supaya bisa langsung masuk setelah daftar.

## 4. Isi `.env.local`

Salin `.env.example` menjadi `.env.local` (sejajar dengan `package.json`), lalu isi. Tanpa tanda kutip, tanpa spasi di sekitar `=`.

### AI gratis (disarankan untuk mulai)

1. **Gemini (utama):** buka https://aistudio.google.com/apikey → login akun Google → **Create API key** → salin ke `GEMINI_API_KEY`.
2. **Groq (opsional, cadangan saat Gemini sibuk):** https://console.groq.com/keys → **Create API Key** → salin ke `GROQ_API_KEY`.

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
AI_PROVIDER=gratis
GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...
```

Cara kerjanya:
- Foto dibaca Gemini. Kalau sibuk/kena batas, otomatis dicoba ulang lalu pindah ke model berikutnya di `GEMINI_MODELS`, lalu ke Groq.
- Kalau semua AI sedang sibuk, stiker tetap dibuat dan kamu tinggal mengisi nama item sendiri.
- Stiker dipotong **di browser** (gratis, tanpa API). Pertama kali agak lama karena browser mengunduh model penghapus latar; berikutnya lebih cepat.
- Batas free tier tiap model bisa dilihat di https://aistudio.google.com/rate-limit (Gemini) dan dashboard Groq. Kalau model di `GEMINI_MODELS` tidak tersedia untuk akunmu, ganti dengan model yang muncul di AI Studio.
- Di free tier Gemini, Google boleh memakai data yang dikirim untuk meningkatkan produknya.

### fal.ai (opsional, berbayar, stiker paling rapi)

Isi `FAL_KEY` (preset **API**) dari https://fal.ai/dashboard/keys, tambah saldo, lalu set `AI_PROVIDER=fal`.

### Chat AI "Jaja"

Halaman **/chat** memakai `GEMINI_API_KEY` / `GROQ_API_KEY` yang sama. Jaja bisa menjelaskan cara pakai app,
menghitung pengeluaranmu (bulan ini & bulan lalu), dan memberi tips hemat. Jaja hanya melihat data akun yang sedang login.

> ⚠️ Jangan pernah commit / bagikan `.env.local`. Setelah mengubahnya, jalankan ulang `npm run dev`.

## 5. Jalankan

```bash
npm run dev
```

Buka http://localhost:3000 → onboarding → **Bikin akun gratis** → mulai catat jajan.
Untuk mencoba di HP: pastikan HP dan laptop di Wi-Fi yang sama, lalu buka `http://<IP-laptop>:3000`
(kamera di browser HP butuh HTTPS; untuk mencoba kamera, pakai **Impor foto** atau deploy ke Vercel).

Halaman **/preview** (hanya mode development) menampilkan desain dengan data contoh tanpa database:
`/preview` untuk Meja, `/preview?v=stats` untuk Statistik.

---

## Fitur

Juga: ⭐ rating & catatan per item, 🔔 pengingat budget (banner + notifikasi browser), login dengan Google,
dan PWA (bisa dipasang di layar utama HP).


| Halaman | Isi |
|---|---|
| `/selamat-datang` | 3 slide penjelasan untuk pengunjung baru |
| `/login`, `/register` | Masuk / daftar (Supabase Auth) |
| `/` Meja | Ringkasan bulan + budget, kalender stiker (geser ganti bulan), daftar per tanggal, filter kategori |
| `/tambah` | Kamera / impor foto → AI → stiker → cek harga, unit, toko → simpan |
| `/momen/[id]` | Ubah / hapus momen & item, lihat foto asli |
| `/statistik` | Grafik per hari, per kategori, budget bulanan, item & toko teratas, ekspor Excel |
| `/cari` | Cari jajanan dari semua bulan |
| `/chat` | Chat dengan Jaja, asisten AI (cara pakai, cek pengeluaran, tips hemat) |
| `/tambah` mode **Struk 🧾** | Foto struk → nama, jumlah & harga terisi otomatis. Di halaman cek ada tombol **Isi harga dari struk** |
| `/album` | Album semua stiker, filter kategori & ⭐ favorit |
| `/rekap` | Rekap bulanan ala story (Wrapped), kartu bisa disimpan/dibagikan |
| `/harga` | Riwayat harga per jajanan + perbandingan antar toko |
| `/lupa-password` | Kirim link untuk membuat password baru |
| `/alat` | CRUD unit & toko |
| `/tampilan` | Palet warna, huruf judul & tulisan, pola hiasan |
| `/kamu` | Ringkasan, menu pengaturan, profil, ekspor, keluar |

Tata letak menyesuaikan perangkat: **HP** (tab bar bawah + bottom sheet), **tablet** (rail ikon),
**desktop** (sidebar + 2 kolom).

## Login dengan Google (opsional)

1. Google Cloud Console → **APIs & Services → Credentials → Create credentials → OAuth client ID** (Web application).
2. *Authorized redirect URI*: `https://<project-id>.supabase.co/auth/v1/callback` (lihat di Supabase → Authentication → Sign In / Providers → Google).
3. Salin **Client ID** & **Client secret** ke Supabase → Authentication → Sign In / Providers → **Google** → Enable.
4. Supabase → Authentication → URL Configuration: pastikan `http://localhost:3000/auth/callback` (dan URL Vercel-mu) ada di Redirect URLs.

## Deploy ke Vercel (supaya bisa dipakai & dipasang di HP)

Kamera browser di HP **wajib HTTPS**, jadi untuk memotret langsung dari HP, app perlu online.

1. Upload folder ini ke GitHub (repo privat boleh). `.env.local` otomatis tidak ikut.
2. https://vercel.com → **Add New → Project** → pilih repo → **Deploy**.
3. Di Vercel → Project → **Settings → Environment Variables**, isi variabel yang sama dengan `.env.local`, lalu **Redeploy**.
4. Supabase → Authentication → URL Configuration: ganti **Site URL** ke `https://<nama-app>.vercel.app` dan tambahkan
   `https://<nama-app>.vercel.app/auth/callback` ke Redirect URLs.
5. Buka URL Vercel di HP → **Kamu → Pasang aplikasi** (Android/Chrome) atau Safari → **Bagikan → Tambah ke Layar Utama** (iPhone).

## Alur AI

**Mode gratis** (`src/lib/ai/llm.ts`, `free.ts`, `src/lib/sticker-client.ts`)
1. Foto dikecilkan di browser → `POST /api/analyze`
2. Gemini (cadangan Groq) membaca foto → JSON: nama, kategori, ukuran kemasan, unit, kotak posisi
3. Browser memotong tiap kotak + menghapus latar (`@imgly/background-removal`) → WebP → bucket `stickers`

**Mode fal.ai** (`src/lib/ai/fal.ts`): `openrouter/router/vision` membaca, `fal-ai/birefnet/v2` memotong di server.

> Lisensi: `@imgly/background-removal` berlisensi **AGPL-3.0**. Aman untuk proyek pribadi, tugas, atau open-source.
> Kalau Jajanku dijual sebagai produk tertutup, beli lisensi komersial IMG.LY atau pakai mode fal.ai.

## Struktur

```
src/app/(auth)/        selamat-datang, login, register
src/app/(app)/         Meja, tambah, momen, statistik, cari, alat, tampilan, kamu
src/app/api/analyze    endpoint AI
src/app/api/export     ekspor .xlsx
src/components/ui/     komponen ala iOS: segmented, sheet, large-title, ilustrasi, dll.
src/lib/theme.ts       palet, font, pola (disimpan di profiles.theme)
supabase/schema.sql    tabel, RLS, unit bawaan, bucket storage
supabase/seed.sql      akun demo + data contoh (untuk Supabase lokal)
```

## Opsional: Supabase lokal (Docker)

```bash
npx supabase init
npx supabase start
```

Salin `supabase/schema.sql` ke `supabase/migrations/20261111000000_init.sql`, lalu `npx supabase db reset`
(menjalankan migrasi + `seed.sql`). Akun demo tertulis di bagian atas `supabase/seed.sql`.
URL & key lokal muncul di output `supabase start`.

## Kode pemulihan password (tanpa email)

Lupa password memakai **email + kode pemulihan** (bukan link email). Kode `JAJAN-XXXX-XXXX` ditampilkan sekali setelah daftar, bisa dibuat ulang di halaman **Kamu**. Yang disimpan hanya hash-nya.

1. Jalankan ulang `supabase/schema.sql` (membuat tabel `recovery_codes`).
2. Ambil **Secret key** di Supabase → Project Settings → API Keys → Secret keys (`sb_secret_...`).
3. Isi `SUPABASE_SECRET_KEY` di `.env.local` dan di Vercel → Settings → Environment Variables. Jangan pakai awalan `NEXT_PUBLIC_` dan jangan di-commit.

Tanpa key ini aplikasi tetap jalan, hanya saja kode pemulihan tidak dibuat.
