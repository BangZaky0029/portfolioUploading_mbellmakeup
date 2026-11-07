-- ============================================================================
-- SCRIPT SQL PERBAIKAN PERMISSION & SINKRONISASI: MBell MakeUp Studio
-- Tujuan:
-- 1. Mengatasi error permission: Mengizinkan role 'anon' & 'authenticated' 
--    melakukan UPDATE pada kolom category & imageUrl di tabel public.images.
-- 2. Memastikan hak akses penuh (GRANT ALL) pada tabel images dan sequence id.
-- 3. Memastikan izin bucket storage.objects (images_mbell) untuk memindahkan file.
-- 4. Menghapus RPC lama yang hanya mengubah DB tanpa memindahkan file di S3.
--
-- Cara Eksekusi:
-- 1. Buka Supabase Dashboard > Pilih Project MBell ("BangZaky29's / mbell")
-- 2. Buka menu "SQL Editor" di bilah kiri
-- 3. Klik "New Query", paste seluruh kode ini, lalu klik "RUN" (Ctrl + Enter)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. GRANT PRIVILEGES (HAK AKSES TABEL DATABASE)
-- ----------------------------------------------------------------------------
-- Memastikan role anon (pengunjung/aplikasi tanpa login auth) memiliki izin penuh
GRANT ALL ON TABLE public.images TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 2. SETUP RLS POLICIES PADA TABEL public.images
-- ----------------------------------------------------------------------------
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Reset policy UPDATE agar tidak terhalang oleh policy lama yang membatasi
DROP POLICY IF EXISTS "Allow public update on images" ON public.images;
DROP POLICY IF EXISTS "Allow anon update images" ON public.images;
DROP POLICY IF EXISTS "Enable update for anon" ON public.images;

-- Buat Policy UPDATE yang mengizinkan update kolom category & imageUrl
CREATE POLICY "Allow public update on images" 
ON public.images 
FOR UPDATE 
TO anon, authenticated, service_role 
USING (true) 
WITH CHECK (true);

-- Pastikan Policy SELECT aktif
DROP POLICY IF EXISTS "Allow public select on images" ON public.images;
CREATE POLICY "Allow public select on images" 
ON public.images 
FOR SELECT 
TO anon, authenticated, service_role 
USING (true);

-- Pastikan Policy INSERT aktif
DROP POLICY IF EXISTS "Allow public insert on images" ON public.images;
CREATE POLICY "Allow public insert on images" 
ON public.images 
FOR INSERT 
TO anon, authenticated, service_role 
WITH CHECK (true);

-- Pastikan Policy DELETE aktif
DROP POLICY IF EXISTS "Allow public delete on images" ON public.images;
CREATE POLICY "Allow public delete on images" 
ON public.images 
FOR DELETE 
TO anon, authenticated, service_role 
USING (true);


-- ----------------------------------------------------------------------------
-- 3. SETUP RLS POLICIES PADA storage.objects (Bucket: images_mbell)
-- ----------------------------------------------------------------------------
-- Mengizinkan Storage API Supabase (.move(), .upload(), .remove()) bekerja tanpa batas
DROP POLICY IF EXISTS "Allow public update on images_mbell" ON storage.objects;
CREATE POLICY "Allow public update on images_mbell" 
ON storage.objects 
FOR UPDATE 
TO anon, authenticated, service_role 
USING (bucket_id = 'images_mbell') 
WITH CHECK (bucket_id = 'images_mbell');

DROP POLICY IF EXISTS "Allow public delete on images_mbell" ON storage.objects;
CREATE POLICY "Allow public delete on images_mbell" 
ON storage.objects 
FOR DELETE 
TO anon, authenticated, service_role 
USING (bucket_id = 'images_mbell');

DROP POLICY IF EXISTS "Allow public insert on images_mbell" ON storage.objects;
CREATE POLICY "Allow public insert on images_mbell" 
ON storage.objects 
FOR INSERT 
TO anon, authenticated, service_role 
WITH CHECK (bucket_id = 'images_mbell');

DROP POLICY IF EXISTS "Allow public select on images_mbell" ON storage.objects;
CREATE POLICY "Allow public select on images_mbell" 
ON storage.objects 
FOR SELECT 
TO anon, authenticated, service_role 
USING (bucket_id = 'images_mbell');


-- ----------------------------------------------------------------------------
-- 4. HAPUS RPC LAMA (KARENA FILE STORAGE HARUS DIPINDAHKAN VIA STORAGE API JS)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.move_photos_category(BIGINT[], TEXT);


-- ----------------------------------------------------------------------------
-- 5. INDEX PERFORMA DATABASE
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_images_category ON public.images (category);
CREATE INDEX IF NOT EXISTS idx_images_id_desc ON public.images (id DESC);


-- ----------------------------------------------------------------------------
-- 6. VERIFIKASI SELESAI
-- ----------------------------------------------------------------------------
SELECT 'Izin UPDATE dan RLS Policy Berhasil Dikonfigurasi!' AS status;
