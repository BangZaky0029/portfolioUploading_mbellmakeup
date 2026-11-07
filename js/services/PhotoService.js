/**
 * Photo Service Layer
 * Mengelola operasi CRUD foto pada tabel database public.images & sinkronisasi Supabase Storage
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class PhotoService {
    constructor(clientInstance, storageService, config) {
      this.clientInstance = clientInstance || global.MBell.supabaseClientInstance;
      this.storageService = storageService || global.MBell.storageServiceInstance;
      this.config = config || global.MBell.CONFIG || global.CONFIG || {};
    }

    get client() {
      return this.clientInstance.getClient();
    }

    get table() {
      return (global.MBell?.CONFIG?.TABLE_NAME || global.CONFIG?.TABLE_NAME || this.config.TABLE_NAME || 'images');
    }

    async getImages(category = 'all', searchQuery = '') {
      let query = this.client
        .from(this.table)
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
    }

    async uploadPhoto(file, metadata) {
      if (!file) throw new Error('File gambar tidak ditemukan');
      const category = (metadata.category || 'uncategorized').trim();
      const sanitize = global.MBell.Formatters?.sanitizeFileName || ((n) => n);
      const sanitizedName = sanitize(file.name);
      const storagePath = `${category}/${sanitizedName}`;

      // 1. Upload ke Storage
      await this.storageService.uploadFile(storagePath, file);

      // 2. Ambil Public URL
      const publicUrl = this.storageService.getPublicUrl(storagePath);

      // 3. Simpan data ke Database
      const title = metadata.title && metadata.title.trim() 
        ? metadata.title.trim() 
        : file.name.replace(/\.[^/.]+$/, "");

      const description = metadata.description && metadata.description.trim()
        ? metadata.description.trim()
        : `Portfolio ${category}`;

      const { data: dbData, error: dbError } = await this.client
        .from(this.table)
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
        await this.storageService.deleteFiles([storagePath]);
        throw new Error(`Gagal menyimpan ke Database: ${dbError.message}`);
      }

      return dbData;
    }

    async updatePhoto(id, updates, currentPhoto = null) {
      const payload = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.details !== undefined) payload.details = updates.details;

      const cleanCategory = updates.category ? updates.category.trim() : null;
      if (cleanCategory) {
        payload.category = cleanCategory;
      }

      if (currentPhoto && cleanCategory && currentPhoto.category && currentPhoto.category !== cleanCategory && currentPhoto.imageUrl) {
        const oldStoragePath = this.storageService.extractPath(currentPhoto.imageUrl);
        if (oldStoragePath) {
          const fileName = oldStoragePath.substring(oldStoragePath.lastIndexOf('/') + 1);
          const newStoragePath = `${cleanCategory}/${fileName}`;
          try {
            const moveRes = await this.storageService.moveFile(oldStoragePath, newStoragePath);
            if (moveRes.success) {
              const newUrl = this.storageService.getPublicUrl(newStoragePath);
              if (newUrl) payload.imageUrl = newUrl;
            } else {
              console.warn('[PhotoService] Gagal memindahkan file di storage (URL lama dipertahankan):', moveRes.error);
            }
          } catch (storageErr) {
            console.warn('[PhotoService] Gagal memindahkan file di storage:', storageErr);
          }
        }
      }

      const { data, error } = await this.client
        .from(this.table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    async updatePhotosCategoryBatch(photosOrIds, newCategory) {
      const cleanCategory = (newCategory || '').trim();
      if (!cleanCategory) throw new Error('Kategori tujuan tidak boleh kosong');

      if (!photosOrIds || photosOrIds.length === 0) {
        return { success: true, updatedCount: 0, category: cleanCategory };
      }

      const isObjectArray = typeof photosOrIds[0] === 'object' && photosOrIds[0] !== null;
      const ids = photosOrIds.map(item => (typeof item === 'object' ? item.id : item))
        .map(id => (isNaN(id) ? id : Number(id)))
        .filter(Boolean);

      if (ids.length === 0) return { success: true, updatedCount: 0, category: cleanCategory };

      let photoList = photosOrIds;
      if (!isObjectArray) {
        const { data: fetched, error: fetchErr } = await this.client
          .from(this.table)
          .select('id, category, imageUrl')
          .in('id', ids);

        if (fetchErr) throw new Error(`Gagal mengambil data foto: ${fetchErr.message}`);
        photoList = fetched || [];
      }

      let totalUpdated = 0;
      const errors = [];

      for (const photo of photoList) {
        try {
          const oldStoragePath = this.storageService.extractPath(photo.imageUrl);
          let newImageUrl = photo.imageUrl;

          if (oldStoragePath && photo.category && photo.category !== cleanCategory) {
            const fileName = oldStoragePath.substring(oldStoragePath.lastIndexOf('/') + 1);
            const newStoragePath = `${cleanCategory}/${fileName}`;

            const moveRes = await this.storageService.moveFile(oldStoragePath, newStoragePath);
            if (moveRes.success) {
              const publicUrl = this.storageService.getPublicUrl(newStoragePath);
              if (publicUrl) newImageUrl = publicUrl;
            } else {
              console.warn(`[PhotoService Storage Move Skipped ID ${photo.id}]:`, moveRes.error);
              newImageUrl = photo.imageUrl;
            }
          }

          const targetId = Number(photo.id) || photo.id;
          const updatePayload = {
            category: cleanCategory,
            imageUrl: newImageUrl
          };

          const { error: updateErr } = await this.client
            .from(this.table)
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
    }

    async deletePhoto(id, imageUrl) {
      const storagePath = this.storageService.extractPath(imageUrl);
      if (storagePath) {
        await this.storageService.deleteFiles([storagePath]);
      }

      const { error: dbError } = await this.client
        .from(this.table)
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;
      return { success: true, id };
    }

    async deletePhotosBatch(photos) {
      if (!photos || photos.length === 0) {
        return { success: true, deletedCount: 0 };
      }

      const ids = photos.map(p => p.id).filter(Boolean);
      const storagePaths = photos.map(p => this.storageService.extractPath(p.imageUrl)).filter(Boolean);

      if (storagePaths.length > 0) {
        await this.storageService.deleteFiles(storagePaths);
      }

      if (ids.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunkIds = ids.slice(i, i + chunkSize);
          const { error: dbError } = await this.client
            .from(this.table)
            .delete()
            .in('id', chunkIds);

          if (dbError) {
            throw new Error(`Gagal menghapus data dari Database: ${dbError.message}`);
          }
        }
      }

      return { success: true, deletedCount: ids.length };
    }
  }

  global.MBell.PhotoService = PhotoService;
  global.MBell.photoServiceInstance = new PhotoService();
})(typeof window !== 'undefined' ? window : this);
