-- ============================================================================
-- SCRIPT SQL SINKRONISASI DATABASE & STORAGE: MBell MakeUp Studio
-- Tujuan:
-- 1. Memastikan izin (RLS Policy) tabel images & storage.objects lengkap (SELECT, INSERT, UPDATE, DELETE).
-- 2. Membuat Index performa agar perpindahan batch kategori secepat kilat.
-- 3. Membuat Stored Procedure (RPC) `move_photos_category` untuk sinkronisasi otomatis
--    perpindahan file fisik di Supabase Storage & database public.images.
--
-- Cara Eksekusi:
-- 1. Buka Supabase Dashboard > Pilih Project MBell ("BangZaky29's / mbell")
-- 2. Buka menu "SQL Editor" di bilah kiri
-- 3. Klik "New Query", paste seluruh kode di bawah ini, lalu klik "RUN" (Ctrl + Enter)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. INDEX PERFORMA DATABASE
-- ----------------------------------------------------------------------------
-- Mempercepat filter per kategori dan sorting galeri
CREATE INDEX IF NOT EXISTS idx_images_category ON public.images (category);
CREATE INDEX IF NOT EXISTS idx_images_id_desc ON public.images (id DESC);


-- ----------------------------------------------------------------------------
-- 2. RLS POLICIES PADA TABEL public.images
-- ----------------------------------------------------------------------------
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Policy SELECT (Melihat foto di web)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'images' AND policyname = 'Allow public select on images'
    ) THEN
        CREATE POLICY "Allow public select on images" 
        ON public.images FOR SELECT TO public USING (true);
    END IF;
END $$;

-- Policy INSERT (Upload foto baru)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'images' AND policyname = 'Allow public insert on images'
    ) THEN
        CREATE POLICY "Allow public insert on images" 
        ON public.images FOR INSERT TO public WITH CHECK (true);
    END IF;
END $$;

-- Policy UPDATE (Ubah judul, kategori, deskripsi, & imageUrl)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'images' AND policyname = 'Allow public update on images'
    ) THEN
        CREATE POLICY "Allow public update on images" 
        ON public.images FOR UPDATE TO public USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Policy DELETE (Hapus foto portofolio)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'images' AND policyname = 'Allow public delete on images'
    ) THEN
        CREATE POLICY "Allow public delete on images" 
        ON public.images FOR DELETE TO public USING (true);
    END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 3. RLS POLICIES PADA storage.objects (Supabase Storage Bucket: images_mbell)
-- ----------------------------------------------------------------------------
-- Memastikan client diperbolehkan memindahkan (UPDATE) dan menghapus (DELETE) file fisik

-- Policy UPDATE storage (Dibutuhkan untuk pemindahan folder / move file)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public update on images_mbell'
    ) THEN
        CREATE POLICY "Allow public update on images_mbell" 
        ON storage.objects FOR UPDATE TO public 
        USING (bucket_id = 'images_mbell') 
        WITH CHECK (bucket_id = 'images_mbell');
    END IF;
END $$;

-- Policy DELETE storage (Dibutuhkan untuk hapus foto dari storage)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public delete on images_mbell'
    ) THEN
        CREATE POLICY "Allow public delete on images_mbell" 
        ON storage.objects FOR DELETE TO public 
        USING (bucket_id = 'images_mbell');
    END IF;
END $$;

-- Policy INSERT storage (Dibutuhkan untuk upload file)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public insert on images_mbell'
    ) THEN
        CREATE POLICY "Allow public insert on images_mbell" 
        ON storage.objects FOR INSERT TO public 
        WITH CHECK (bucket_id = 'images_mbell');
    END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 4. RPC FUNCTION: move_photos_category
-- ----------------------------------------------------------------------------
-- Fungsi ini mengeksekusi sinkronisasi atomik di level server PostgreSQL:
-- 1. Mengubah nama path di storage.objects ('oldCategory/file.jpg' -> 'newCategory/file.jpg')
-- 2. Mengupdate kolom category dan imageUrl di public.images
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.move_photos_category(
    p_photo_ids BIGINT[],
    p_new_category TEXT
)
RETURNS TABLE(
    updated_id BIGINT, 
    old_category TEXT, 
    new_category TEXT, 
    new_image_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    v_clean_cat TEXT := trim(p_new_category);
    v_file_name TEXT;
    v_old_storage_path TEXT;
    v_new_storage_path TEXT;
    v_new_image_url TEXT;
BEGIN
    -- Validasi input kategori
    IF v_clean_cat IS NULL OR v_clean_cat = '' THEN
        RAISE EXCEPTION 'Kategori tujuan tidak boleh kosong';
    END IF;

    -- Loop setiap foto yang dipilih
    FOR r IN 
        SELECT id, category, "imageUrl" 
        FROM public.images 
        WHERE id = ANY(p_photo_ids)
    LOOP
        -- Ekstrak nama file asli dari URL (misal: 159528_137760.jpg)
        v_file_name := split_part(r."imageUrl", '/', array_length(string_to_array(r."imageUrl", '/'), 1));
        -- Hapus query parameter jika ada (?t=...)
        v_file_name := split_part(v_file_name, '?', 1);

        -- Buat path lama dan path baru di storage
        v_old_storage_path := r.category || '/' || v_file_name;
        v_new_storage_path := v_clean_cat || '/' || v_file_name;

        -- Ganti bagian /images_mbell/[oldCategory]/ pada imageUrl dengan kategori baru
        v_new_image_url := regexp_replace(
            r."imageUrl",
            '/images_mbell/[^/]+/(.*)$',
            '/images_mbell/' || v_clean_cat || '/\1'
        );

        -- 1. Update baris file di storage.objects
        UPDATE storage.objects
        SET name = v_new_storage_path,
            updated_at = now()
        WHERE bucket_id = 'images_mbell' 
          AND (name = v_old_storage_path OR name LIKE '%/' || v_file_name);

        -- 2. Update baris foto di public.images
        UPDATE public.images
        SET category = v_clean_cat,
            "imageUrl" = v_new_image_url
        WHERE id = r.id;

        -- Return baris hasil
        updated_id := r.id;
        old_category := r.category;
        new_category := v_clean_cat;
        new_image_url := v_new_image_url;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- Berikan izin akses eksekusi fungsi RPC ke public / anon / authenticated
GRANT EXECUTE ON FUNCTION public.move_photos_category(BIGINT[], TEXT) TO anon, authenticated, service_role, postgres;


-- ----------------------------------------------------------------------------
-- 5. VERIFIKASI HASIL SETUP
-- ----------------------------------------------------------------------------
SELECT 'Setup SQL Sinkronisasi Berhasil Dijalankan!' AS status;

