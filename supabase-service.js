/**
 * Supabase Service Layer
 * MBell MakeUp Portfolio Uploading Manager
 */

(function (window) {
  'use strict';

  if (!window.CONFIG) {
    console.error('Configuration window.CONFIG not found! Make sure config.js is loaded first.');
    return;
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET_NAME, TABLE_NAME, DEFAULT_CATEGORIES } = window.CONFIG;

  // Inisialisasi Supabase Client
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Helper untuk membersihkan nama file
  function sanitizeFileName(fileName) {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const cleanName = nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 35);
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    return `${cleanName}_${timestamp}_${randomSuffix}${ext}`;
  }

  // Helper retry untuk mengatasi network jitter di jaringan seluler 4G/mobile
  async function runWithRetry(fn, maxRetries = 2, delayMs = 1000) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }

  // Helper untuk mengekstrak path storage dari Public URL
  function extractStoragePath(imageUrl) {
    if (!imageUrl) return null;
    const bucketMarker = `/${BUCKET_NAME}/`;
    const idx = imageUrl.indexOf(bucketMarker);
    if (idx !== -1) {
      const pathWithQuery = imageUrl.substring(idx + bucketMarker.length);
      return decodeURIComponent(pathWithQuery.split('?')[0]);
    }
    return null;
  }

  // Service Object
  const SupabaseService = {
    client,

    /**
     * Cek status koneksi Supabase
     */
    async checkConnection() {
      try {
        const { count, error } = await client
          .from(TABLE_NAME)
          .select('*', { count: 'exact', head: true });
        if (error) throw error;
        return { success: true, count: count || 0 };
      } catch (err) {
        console.error('Koneksi Supabase gagal:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Ambil semua kategori dari DB & Default list
     */
    async getCategories() {
      try {
        // Ambil kategori unik yang sudah ada di tabel
        const { data, error } = await client
          .from(TABLE_NAME)
          .select('category');

        if (error) throw error;

        // Hitung jumlah foto per kategori dari database
        const categoryCounts = {};
        if (data) {
          data.forEach(item => {
            const cat = item.category ? item.category.trim() : 'uncategorized';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          });
        }

        // Ambil custom categories dari localStorage jika ada
        const savedCustom = JSON.parse(localStorage.getItem('mbell_custom_categories') || '[]');

        // Gabungkan semua kategori unik
        const allCategoryNames = Array.from(new Set([
          ...DEFAULT_CATEGORIES,
          ...savedCustom,
          ...Object.keys(categoryCounts)
        ])).filter(Boolean);

        return allCategoryNames.sort((a, b) => a.localeCompare(b)).map(cat => ({
          name: cat,
          count: categoryCounts[cat] || 0
        }));
      } catch (err) {
        console.warn('Gagal mengambil kategori dari DB, menggunakan default:', err);
        return DEFAULT_CATEGORIES.map(cat => ({ name: cat, count: 0 }));
      }
    },

    /**
     * Tambah Kategori Baru ke localStorage
     */
    async addCategory(newCategory) {
      const cleanCat = newCategory.trim().replace(/\s+/g, '_');
      if (!cleanCat) throw new Error('Nama kategori tidak boleh kosong');

      const savedCustom = JSON.parse(localStorage.getItem('mbell_custom_categories') || '[]');
      if (!savedCustom.includes(cleanCat)) {
        savedCustom.push(cleanCat);
        localStorage.setItem('mbell_custom_categories', JSON.stringify(savedCustom));
      }
      return cleanCat;
    },

    /**
     * Ubah Nama Kategori di DB (Update cascade untuk semua foto terkait)
     */
    async renameCategory(oldName, newName) {
      const cleanNew = newName.trim().replace(/\s+/g, '_');
      if (!cleanNew) throw new Error('Nama kategori baru tidak valid');

      // 1. Update tabel public.images
      const { data, error } = await client
        .from(TABLE_NAME)
        .update({ category: cleanNew })
        .eq('category', oldName)
        .select();

      if (error) throw error;

      // 2. Update custom categories di localStorage
      let savedCustom = JSON.parse(localStorage.getItem('mbell_custom_categories') || '[]');
      savedCustom = savedCustom.map(c => c === oldName ? cleanNew : c);
      localStorage.setItem('mbell_custom_categories', JSON.stringify(savedCustom));

      return { success: true, updatedCount: data ? data.length : 0 };
    },

    /**
     * Hapus Kategori (Opsi: hapus foto di dalamnya atau hanya hapus kategori kosong)
     */
    async deleteCategory(categoryName, deletePhotos = false) {
      if (deletePhotos) {
        // Ambil semua foto di kategori ini
        const { data: photos, error: fetchErr } = await client
          .from(TABLE_NAME)
          .select('id, imageUrl')
          .eq('category', categoryName);

        if (fetchErr) throw fetchErr;

        if (photos && photos.length > 0) {
          // Hapus file-file dari storage
          const filePaths = photos.map(p => extractStoragePath(p.imageUrl)).filter(Boolean);
          if (filePaths.length > 0) {
            await client.storage.from(BUCKET_NAME).remove(filePaths);
          }
          // Hapus rows dari DB
          await client.from(TABLE_NAME).delete().eq('category', categoryName);
        }
      }

      // Hapus dari custom categories localStorage
      let savedCustom = JSON.parse(localStorage.getItem('mbell_custom_categories') || '[]');
      savedCustom = savedCustom.filter(c => c !== categoryName);
      localStorage.setItem('mbell_custom_categories', JSON.stringify(savedCustom));

      return { success: true };
    },

    /**
     * Ambil data gambar (bisa difilter per kategori dan keyword pencarian)
     */
    async getImages(category = 'all', searchQuery = '') {
      let query = client
        .from(TABLE_NAME)
        .select('*')
        .order('id', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data || [];
      if (searchQuery && searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        results = results.filter(img => 
          (img.title && img.title.toLowerCase().includes(q)) ||
          (img.description && img.description.toLowerCase().includes(q)) ||
          (img.category && img.category.toLowerCase().includes(q))
        );
      }

      return results;
    },

    /**
     * Upload single photo (File -> Storage -> Database)
     */
    async uploadPhoto(file, metadata) {
      if (!file) throw new Error('File gambar tidak ditemukan');
      const category = (metadata.category || 'uncategorized').trim();
      const sanitizedName = sanitizeFileName(file.name);
      const storagePath = `${category}/${sanitizedName}`;

      // 1. Upload ke Supabase Storage (dengan auto-retry jika ada gangguan sinyal 4G/mobile)
      const storageData = await runWithRetry(async () => {
        const { data, error } = await client.storage
          .from(BUCKET_NAME)
          .upload(storagePath, file, {
            cacheControl: '3600',
            contentType: file.type || 'image/webp',
            upsert: false
          });

        if (error) {
          throw new Error(`Gagal upload ke Storage: ${error.message}`);
        }
        return data;
      }, 2, 1200);

      // 2. Ambil Public URL
      const { data: urlData } = client.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // 3. Simpan data ke tabel public.images
      const title = metadata.title && metadata.title.trim() 
        ? metadata.title.trim() 
        : file.name.replace(/\.[^/.]+$/, "");

      const description = metadata.description && metadata.description.trim()
        ? metadata.description.trim()
        : `Portfolio ${category}`;

      const { data: dbData, error: dbError } = await client
        .from(TABLE_NAME)
        .insert([
          {
            title: title,
            category: category,
            imageUrl: publicUrl,
            description: description,
            details: metadata.details || null
          }
        ])
        .select()
        .single();

      if (dbError) {
        // Rollback: hapus file yang sudah terupload jika DB insert gagal
        await client.storage.from(BUCKET_NAME).remove([storagePath]);
        throw new Error(`Gagal menyimpan ke Database: ${dbError.message}`);
      }

      return dbData;
    },

    /**
     * Update detail foto (Title, Category, Description, Details)
     * Jika kategori berubah, otomatis sinkronisasi file di Supabase Storage & perbarui imageUrl
     */
    async updatePhoto(id, updates, currentPhoto = null) {
      const payload = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.details !== undefined) payload.details = updates.details;

      const cleanCategory = updates.category ? updates.category.trim() : null;
      if (cleanCategory) {
        payload.category = cleanCategory;
      }

      // Jika kategori berubah dan data foto lama tersedia, coba sinkronisasi Storage
      if (currentPhoto && cleanCategory && currentPhoto.category && currentPhoto.category !== cleanCategory && currentPhoto.imageUrl) {
        const oldStoragePath = extractStoragePath(currentPhoto.imageUrl);
        if (oldStoragePath) {
          const fileName = oldStoragePath.substring(oldStoragePath.lastIndexOf('/') + 1);
          const newStoragePath = `${cleanCategory}/${fileName}`;
          try {
            const { error: moveErr } = await client.storage
              .from(BUCKET_NAME)
              .move(oldStoragePath, newStoragePath);

            if (!moveErr) {
              const { data: urlData } = client.storage
                .from(BUCKET_NAME)
                .getPublicUrl(newStoragePath);
              if (urlData && urlData.publicUrl) {
                payload.imageUrl = urlData.publicUrl;
              }
            } else {
              console.warn('Gagal memindahkan file di storage (menggunakan URL lama):', moveErr.message);
            }
          } catch (storageErr) {
            console.warn('Gagal memindahkan file di storage:', storageErr);
          }
        }
      }

      const { data, error } = await client
        .from(TABLE_NAME)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    /**
     * Ubah kategori banyak foto sekaligus (Bulk Category Update & Storage Sync)
     * Menggunakan API resmi Supabase Storage (.move()) agar file fisik di S3 benar-benar berpindah,
     * lalu memperbarui kolom category & imageUrl di tabel public.images.
     * @param {Array<number|string|{id: number|string, imageUrl?: string, category?: string}>} photosOrIds
     * @param {string} newCategory - Nama kategori tujuan baru
     */
    async updatePhotosCategoryBatch(photosOrIds, newCategory) {
      const cleanCategory = (newCategory || '').trim();
      if (!cleanCategory) throw new Error('Kategori tujuan tidak boleh kosong');

      if (!photosOrIds || photosOrIds.length === 0) {
        return { success: true, updatedCount: 0, category: cleanCategory };
      }

      // Normalisasi input
      const isObjectArray = typeof photosOrIds[0] === 'object' && photosOrIds[0] !== null;
      const ids = photosOrIds.map(item => (typeof item === 'object' ? item.id : item))
        .map(id => (isNaN(id) ? id : Number(id)))
        .filter(Boolean);

      if (ids.length === 0) return { success: true, updatedCount: 0, category: cleanCategory };

      // Jika hanya array ID yang diberikan, ambil data foto dari DB terlebih dahulu
      let photoList = photosOrIds;
      if (!isObjectArray) {
        const { data: fetched, error: fetchErr } = await client
          .from(TABLE_NAME)
          .select('id, category, imageUrl')
          .in('id', ids);

        if (fetchErr) throw new Error(`Gagal mengambil data foto: ${fetchErr.message}`);
        photoList = fetched || [];
      }

      let totalUpdated = 0;
      const errors = [];

      for (const photo of photoList) {
        try {
          const oldStoragePath = extractStoragePath(photo.imageUrl);
          let newImageUrl = photo.imageUrl;

          // 1. Pindahkan file fisik di Supabase Storage via Storage API
          if (oldStoragePath && photo.category && photo.category !== cleanCategory) {
            const fileName = oldStoragePath.substring(oldStoragePath.lastIndexOf('/') + 1);
            const newStoragePath = `${cleanCategory}/${fileName}`;

            // Pindahkan file fisik di S3/Storage bucket
            const { error: moveErr } = await client.storage
              .from(BUCKET_NAME)
              .move(oldStoragePath, newStoragePath);

            if (!moveErr) {
              const { data: urlData } = client.storage
                .from(BUCKET_NAME)
                .getPublicUrl(newStoragePath);
              if (urlData && urlData.publicUrl) {
                newImageUrl = urlData.publicUrl;
              }
            } else {
              // Jika move gagal di storage (misal file belum ada atau sudah dipindahkan),
              // TETAP pertahankan URL foto lama agar gambar TIDAK rusak (404)!
              console.warn(`[Storage Move Skipped ID ${photo.id}]:`, moveErr.message);
              newImageUrl = photo.imageUrl;
            }
          }

          // 2. Perbarui baris tabel public.images (category & imageUrl)
          const targetId = Number(photo.id) || photo.id;
          const updatePayload = {
            category: cleanCategory,
            imageUrl: newImageUrl
          };

          const { error: updateErr } = await client
            .from(TABLE_NAME)
            .update(updatePayload)
            .eq('id', targetId);

          if (updateErr) {
            throw new Error(`Gagal update tabel database (${updateErr.message})`);
          }

          totalUpdated++;
        } catch (itemErr) {
          console.error(`Gagal memindahkan foto ID ${photo.id}:`, itemErr);
          errors.push(itemErr.message);
        }
      }

      if (errors.length > 0 && totalUpdated === 0) {
        throw new Error(errors[0]);
      }

      return { success: true, updatedCount: totalUpdated, category: cleanCategory };
    },

    /**
     * Hapus foto (Atomik: Storage + DB)
     */
    async deletePhoto(id, imageUrl) {
      // 1. Hapus file di Supabase Storage jika URL valid
      const storagePath = extractStoragePath(imageUrl);
      if (storagePath) {
        try {
          await client.storage.from(BUCKET_NAME).remove([storagePath]);
        } catch (storageErr) {
          console.warn('Gagal menghapus file dari storage (mungkin sudah tidak ada):', storageErr);
        }
      }

      // 2. Hapus baris data di tabel DB
      const { error: dbError } = await client
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      return { success: true, id };
    },

    /**
     * Hapus banyak foto sekaligus (Bulk Delete Atomik: Storage + DB)
     * Menggunakan batch removal untuk performa maksimal (hanya 2 panggilan API)
     * @param {Array<{id: number|string, imageUrl: string}>} photos
     */
    async deletePhotosBatch(photos) {
      if (!photos || photos.length === 0) {
        return { success: true, deletedCount: 0 };
      }

      const ids = photos.map(p => p.id).filter(Boolean);
      const storagePaths = photos.map(p => extractStoragePath(p.imageUrl)).filter(Boolean);

      // 1. Hapus file fisik secara batch dari Supabase Storage
      if (storagePaths.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < storagePaths.length; i += chunkSize) {
          const chunk = storagePaths.slice(i, i + chunkSize);
          try {
            await client.storage.from(BUCKET_NAME).remove(chunk);
          } catch (storageErr) {
            console.warn('Sebagian file di storage mungkin sudah tidak ada:', storageErr);
          }
        }
      }

      // 2. Hapus baris data secara batch dari Database public.images
      if (ids.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunkIds = ids.slice(i, i + chunkSize);
          const { error: dbError } = await client
            .from(TABLE_NAME)
            .delete()
            .in('id', chunkIds);

          if (dbError) {
            throw new Error(`Gagal menghapus data dari Database: ${dbError.message}`);
          }
        }
      }

      return { success: true, deletedCount: ids.length };
    }
  };

  window.SupabaseService = SupabaseService;
})(window);

