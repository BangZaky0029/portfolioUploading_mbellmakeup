/**
 * Supabase Storage Service
 * Mengelola upload, delete, move, dan URL file di bucket images_mbell
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class StorageService {
    constructor(clientInstance, config) {
      this.clientInstance = clientInstance || global.MBell.supabaseClientInstance;
      this.config = config || global.MBell.CONFIG || global.CONFIG || {};
    }

    get client() {
      return this.clientInstance.getClient();
    }

    get bucket() {
      return (global.MBell?.CONFIG?.BUCKET_NAME || global.CONFIG?.BUCKET_NAME || this.config.BUCKET_NAME || 'images_mbell');
    }

    async uploadFile(storagePath, file) {
      return await this.clientInstance.runWithRetry(async () => {
        const { data, error } = await this.client.storage
          .from(this.bucket)
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
    }

    getPublicUrl(storagePath) {
      const { data } = this.client.storage
        .from(this.bucket)
        .getPublicUrl(storagePath);

      return data?.publicUrl || '';
    }

    async moveFile(oldPath, newPath) {
      const { error } = await this.client.storage
        .from(this.bucket)
        .move(oldPath, newPath);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    }

    async deleteFiles(storagePaths) {
      if (!storagePaths || storagePaths.length === 0) return;

      const chunkSize = 50;
      for (let i = 0; i < storagePaths.length; i += chunkSize) {
        const chunk = storagePaths.slice(i, i + chunkSize);
        try {
          await this.client.storage.from(this.bucket).remove(chunk);
        } catch (err) {
          console.warn('[StorageService] Sebagian file di storage gagal dihapus:', err);
        }
      }
    }

    extractPath(imageUrl) {
      const formatters = global.MBell.Formatters;
      if (formatters && typeof formatters.extractStoragePath === 'function') {
        return formatters.extractStoragePath(imageUrl, this.bucket);
      }
      return null;
    }
  }

  global.MBell.StorageService = StorageService;
  global.MBell.storageServiceInstance = new StorageService();
})(typeof window !== 'undefined' ? window : this);
