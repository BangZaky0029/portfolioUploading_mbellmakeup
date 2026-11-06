# MBell MakeUp - Portfolio Uploading Studio

Website uploader & manajemen foto portofolio **MBell MakeUp** berbasis Vanilla HTML5, CSS3, dan JavaScript modular. Terhubung langsung secara real-time ke **Supabase Database** (`public.images`) dan **Supabase Storage** (`images_mbell`).

---

## 🚀 Cara Menjalankan

Website ini berarsitektur **Zero-Build** (sangat ringan tanpa perlu `npm install` atau compile):

### Opsi 1: Buka Langsung di Browser
Cukup klik dua kali (double click) file **`index.html`** di Windows Explorer, atau buka browser (Chrome / Edge / Firefox) dan drag file `index.html` ke browser.

### Opsi 2: Menggunakan Local Server (Direkomendasikan)
Buka terminal di folder ini dan jalankan salah satu perintah:
```bash
# Menggunakan npx serve
npx serve .

# Atau menggunakan Python
python -m http.server 3000

# Atau menggunakan VS Code extension Live Server
```

---

## 📁 Struktur Folder Proyek
```
portfolioUploading_mbellmakeup/
├── index.html          # Markup terstruktur (Navbar, Drag-Drop Zone, Staging, Gallery, Modals)
├── style.css           # Styling modern & responsif (Luxury Rosewood & Gold MBell)
├── config.js           # Konfigurasi Supabase URL, Anon Key, Bucket, & Default Categories
├── supabase-service.js # Service layer operasi CRUD Database & Storage Supabase
├── app.js              # State management, drag-drop handling, batch upload, & modal controller
└── README.md           # Dokumentasi teknis & panduan SQL
```

---

## ⚡ Fitur Utama
1. **Multi-File Drag & Drop Upload**:
   - Tarik beberapa foto sekaligus ke area uploader.
   - Preview thumbnail, ukuran file, dan ubah judul sebelum upload.
   - Progress bar real-time saat upload berlangsung.
   - File otomatis tersimpan rapi di folder storage: `images_mbell/{kategori}/{nama_file}`.
   - Record otomatis di-insert ke tabel `public.images` (`id`, `title`, `category`, `imageUrl`, `description`, `details`).

2. **Manajemen Kategori Fleksibel (CRUD)**:
   - Tambah kategori baru secara instan (`+ Kategori Baru`).
   - Ubah nama kategori (otomatis meng-update semua foto terkait di tabel database).
   - Hapus kategori (dengan opsi konfirmasi aman).
   - Tab filter kategori dengan indikator badge jumlah foto yang bisa di-scroll horizontal.

3. **Manajemen Foto & Galeri**:
   - Filter cepat berdasarkan kategori aktif atau pencarian keyword (judul / deskripsi).
   - Edit detail foto (ubah judul, pindah kategori, deskripsi, details).
   - Lightbox zoom untuk melihat foto resolusi penuh.
   - Hapus foto **Atomik**: Menghapus baris data di tabel `images` **sekaligus** menghapus file fisik di Supabase Storage `images_mbell`.

4. **Desain Elegan & Responsif**:
   - Tema selaras dengan brand MBell MakeUp (Rosewood `#9E5A54`, Gold `#D4AF37`, Soft Cream `#FAF7F5`).
   - Tampilan optimal pada layar Desktop, Tablet, maupun Smartphone (Mobile).

---

## 🔒 Referensi Skrip SQL Supabase (RLS & Policies)

Jika suatu saat perlu me-reset atau memverifikasi policy di terminal SQL Supabase, gunakan skrip berikut:

```sql
-- 1. Pastikan Row Level Security aktif pada tabel images
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- 2. Kebijakan CRUD tabel public.images untuk role anon & authenticated
CREATE POLICY "Allow public read images"
ON public.images FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert images"
ON public.images FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update images"
ON public.images FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete images"
ON public.images FOR DELETE TO anon, authenticated USING (true);

-- 3. Kebijakan Storage Bucket images_mbell (Pastikan bucket berstatus PUBLIC)
CREATE POLICY "Allow public select objects"
ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'images_mbell');

CREATE POLICY "Allow public upload objects"
ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'images_mbell');

CREATE POLICY "Allow public update objects"
ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'images_mbell') WITH CHECK (bucket_id = 'images_mbell');

CREATE POLICY "Allow public delete objects"
ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'images_mbell');
```

