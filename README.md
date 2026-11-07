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
├── image-converter.js  # Generator konversi modular format gambar apa pun ke WebP (.webp)
├── supabase-service.js # Service layer operasi CRUD Database & Storage Supabase
├── app.js              # State management, drag-drop handling, batch upload, & modal controller
├── supabase_sync_setup.sql # Skrip SQL lengkap untuk Supabase SQL Editor (RLS, Index, & RPC Sync)
└── README.md           # Dokumentasi teknis & panduan SQL
```

---

## ⚡ Fitur Utama
1. **Multi-File Drag & Drop Upload (High Performance & Anti-Timeout)**:
   - **Batas Aman & Terukur**: Maksimal **20 foto** untuk 1x proses upload dan batas ukuran file maksimal **10MB per file** dengan validasi otomatis dan pop-up peringatan interaktif jika melebihi batas.
   - **Generator Konversi Otomatis ke WebP (`image-converter.js`)**: Semua format gambar (JPG, PNG, WEBP, BMP, GIF, TIFF, HEIC, dll) otomatis dikonversi menjadi format `.webp` dengan resolusi cerdas (maks. 1920x1920px) dan kompresi tinggi (rata-rata 150–350 KB). Menghemat penyimpanan Supabase hingga 80-90% tanpa mengurangi detail riasan makeup.
   - **Auto-Retry & Wake Lock**: Otomatis mencoba ulang jika sinyal 4G terputus sesaat, dan mencegah layar HP tertidur (*sleep*) saat proses upload aktif.
   - File tersimpan rapi di bucket: `images_mbell/{kategori}/{nama_file_acak}.webp` dan tabel `public.images`.

2. **Select All, Bulk Delete & Pindah Kategori Massal**:
   - Checkbox di setiap kartu foto galeri untuk memilih foto satuan atau banyak foto sekaligus.
   - **Gesture Modern**: Double-click di Desktop, atau Tekan Lama (~450ms) di HP untuk mulai memilih.
   - **Floating Bottom Action Bar**: Menampilkan jumlah foto terpilih (`✓ X foto dipilih`), tombol `Pilih Semua`, `Batal`, `Ubah Kategori`, dan `Hapus Foto`.
   - **Pindah Kategori Massal (Bulk Category Move)**: Mengubah kategori banyak foto yang dipilih sekaligus (misal 3 foto dari `akad` dipindah ke `pesta`) dengan preview foto terpilih, dropdown kategori, dan pilihan chip kategori instan.
   - Eksekusi atomik berkecepatan tinggi: Menghapus atau mengupdate baris di Database secara batch dalam 1x panggilan query.

3. **Manajemen Kategori Fleksibel (CRUD)**:
   - Tambah kategori baru secara instan (`+ Kategori Baru`).
   - Ubah nama kategori (otomatis meng-update semua foto terkait di tabel database).
   - Hapus kategori (dengan opsi konfirmasi aman).
   - Tab filter kategori dengan indikator badge jumlah foto yang bisa di-scroll horizontal.

4. **Manajemen Foto & Galeri**:
   - Filter cepat berdasarkan kategori aktif atau pencarian keyword (judul / deskripsi).
   - Edit detail foto (ubah judul, pindah kategori, deskripsi, details).
   - Lightbox zoom untuk melihat foto resolusi penuh.
   - Hapus foto satuan maupun massal dengan konfirmasi pop-up kustom yang aman.

5. **Desain Elegan & Responsif**:
   - Tema selaras dengan brand MBell MakeUp (Rosewood `#9E5A54`, Gold `#D4AF37`, Soft Cream `#FAF7F5`).
   - Tampilan optimal pada layar Desktop, Tablet, maupun Smartphone (Mobile Touchscreen-ready).

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

