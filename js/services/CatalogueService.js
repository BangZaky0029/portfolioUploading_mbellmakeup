/**
 * Catalogue Service Layer
 * Mengelola operasi CRUD brosur katalog & S&K pada tabel database public.catalogue & Supabase Storage (images_mbell/catalogue/*)
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class CatalogueService {
    constructor(clientInstance, storageService, config) {
      this.clientInstance = clientInstance || global.MBell.supabaseClientInstance;
      this.storageService = storageService || global.MBell.storageServiceInstance;
      this.config = config || global.MBell.CONFIG || global.CONFIG || {};
    }

    get client() {
      return this.clientInstance.getClient();
    }

    get table() {
      return (global.MBell?.CONFIG?.TABLE_CATALOGUE || global.CONFIG?.TABLE_CATALOGUE || this.config.TABLE_CATALOGUE || 'catalogue');
    }

    get folder() {
      return (global.MBell?.CONFIG?.CATALOGUE_FOLDER || global.CONFIG?.CATALOGUE_FOLDER || this.config.CATALOGUE_FOLDER || 'catalogue');
    }

    async getCatalogues() {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .order('order_index', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;
      return data || [];
    }

    async uploadCatalogue(file, metadata, onProgress) {
      if (!file) throw new Error('File gambar brosur tidak ditemukan');

      // 1. Generate Safe Unique Filename in catalogue/
      const sanitize = global.MBell.Formatters?.sanitizeFileName || ((n) => n.replace(/[^a-zA-Z0-9._-]/g, '_'));
      const cleanName = sanitize(file.name);
      const timestamp = Date.now();
      const storagePath = `${this.folder}/${timestamp}_${cleanName}`;

      if (typeof onProgress === 'function') onProgress(20, 'Mengunggah file ke Supabase Storage...');

      // 2. Upload file ke Supabase Storage
      await this.storageService.uploadFile(storagePath, file);

      if (typeof onProgress === 'function') onProgress(65, 'Mendapatkan URL publik brosur...');

      // 3. Ambil Public URL
      const publicUrl = this.storageService.getPublicUrl(storagePath);

      if (typeof onProgress === 'function') onProgress(80, 'Menyimpan rincian paket ke database...');

      // 4. Insert data ke Database public.catalogue
      const record = {
        label: metadata.label?.trim() || 'Katalog Baru',
        short_title: metadata.short_title?.trim() || 'Paket Riasan',
        image_url: publicUrl,
        description: metadata.description?.trim() || '',
        wa_query: metadata.wa_query?.trim() || `Halo MBell MakeUp, saya ingin tanya mengenai ${metadata.label || 'paket ini'}.`,
        badge: metadata.badge?.trim() || 'Popular',
        order_index: Number(metadata.order_index) || 0
      };

      const { data, error } = await this.client
        .from(this.table)
        .insert([record])
        .select();

      if (error) {
        // Rollback storage if DB insert fails
        try {
          await this.storageService.deleteFiles([storagePath]);
        } catch (_) {}
        throw error;
      }

      if (typeof onProgress === 'function') onProgress(100, 'Selesai!');
      return data?.[0];
    }

    async updateCatalogue(id, updates, newFile, oldImageUrl, onProgress) {
      let finalImageUrl = updates.image_url;

      // Jika ada file gambar brosur baru yang diunggah
      if (newFile) {
        if (typeof onProgress === 'function') onProgress(25, 'Mengunggah brosur pengganti...');
        
        const sanitize = global.MBell.Formatters?.sanitizeFileName || ((n) => n.replace(/[^a-zA-Z0-9._-]/g, '_'));
        const cleanName = sanitize(newFile.name);
        const timestamp = Date.now();
        const newStoragePath = `${this.folder}/${timestamp}_${cleanName}`;

        await this.storageService.uploadFile(newStoragePath, newFile);
        finalImageUrl = this.storageService.getPublicUrl(newStoragePath);
        updates.image_url = finalImageUrl;

        // Hapus file lama di storage jika ada
        if (oldImageUrl) {
          const oldPath = this.extractStoragePath(oldImageUrl);
          if (oldPath) {
            try {
              await this.storageService.deleteFiles([oldPath]);
            } catch (delErr) {
              console.warn('[CatalogueService] Gagal menghapus file lama di storage:', delErr);
            }
          }
        }
      }

      if (typeof onProgress === 'function') onProgress(75, 'Memperbarui data katalog di database...');

      const payload = {
        label: updates.label?.trim(),
        short_title: updates.short_title?.trim(),
        description: updates.description?.trim(),
        wa_query: updates.wa_query?.trim(),
        badge: updates.badge?.trim(),
        order_index: Number(updates.order_index) || 0,
        updated_at: new Date().toISOString()
      };

      if (finalImageUrl) {
        payload.image_url = finalImageUrl;
      }

      const { data, error } = await this.client
        .from(this.table)
        .update(payload)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (typeof onProgress === 'function') onProgress(100, 'Selesai!');
      return data?.[0];
    }

    async deleteCatalogue(id, imageUrl) {
      // 1. Hapus dari database
      const { error } = await this.client
        .from(this.table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // 2. Hapus file fisik dari storage jika ada
      if (imageUrl) {
        const storagePath = this.extractStoragePath(imageUrl);
        if (storagePath) {
          try {
            await this.storageService.deleteFiles([storagePath]);
          } catch (delErr) {
            console.warn('[CatalogueService] Gagal menghapus file fisik di storage:', delErr);
          }
        }
      }

      return true;
    }

    extractStoragePath(url) {
      if (!url || typeof url !== 'string') return null;
      const bucket = this.storageService.bucket;
      // Pattern: .../images_mbell/catalogue/filename.ext
      const marker = `/${bucket}/`;
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        return decodeURIComponent(url.substring(idx + marker.length));
      }
      return null;
    }
  }

  global.MBell.CatalogueService = CatalogueService;
  global.MBell.catalogueServiceInstance = new CatalogueService();
})(window);
