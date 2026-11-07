/**
 * Category Service Layer
 * Mengelola kategori portofolio di database Supabase dan sinkronisasi localStorage
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class CategoryService {
    constructor(clientInstance, storageService, config) {
      this.clientInstance = clientInstance || global.MBell.supabaseClientInstance;
      this.storageService = storageService || global.MBell.storageServiceInstance;
      this.config = config || global.MBell.CONFIG || global.CONFIG || {};
      this.storageKey = 'mbell_custom_categories';
    }

    get client() {
      return this.clientInstance.getClient();
    }

    get table() {
      return (global.MBell?.CONFIG?.TABLE_NAME || global.CONFIG?.TABLE_NAME || this.config.TABLE_NAME || 'images');
    }

    async getCategories() {
      try {
        const { data, error } = await this.client
          .from(this.table)
          .select('category');

        if (error) throw error;

        const categoryCounts = {};
        if (data) {
          data.forEach(item => {
            const cat = item.category ? item.category.trim() : 'uncategorized';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          });
        }

        const savedCustom = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        const defaultCats = this.config.DEFAULT_CATEGORIES || [];

        const allCategoryNames = Array.from(new Set([
          ...defaultCats,
          ...savedCustom,
          ...Object.keys(categoryCounts)
        ])).filter(Boolean);

        return allCategoryNames.sort((a, b) => a.localeCompare(b)).map(cat => ({
          name: cat,
          count: categoryCounts[cat] || 0
        }));
      } catch (err) {
        console.warn('[CategoryService] Gagal mengambil kategori dari DB, menggunakan default:', err);
        const defaultCats = this.config.DEFAULT_CATEGORIES || [];
        return defaultCats.map(cat => ({ name: cat, count: 0 }));
      }
    }

    async addCategory(newCategory) {
      const cleanCat = newCategory.trim().replace(/\s+/g, '_');
      if (!cleanCat) throw new Error('Nama kategori tidak boleh kosong');

      const savedCustom = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      if (!savedCustom.includes(cleanCat)) {
        savedCustom.push(cleanCat);
        localStorage.setItem(this.storageKey, JSON.stringify(savedCustom));
      }
      return cleanCat;
    }

    async renameCategory(oldName, newName) {
      const cleanNew = newName.trim().replace(/\s+/g, '_');
      if (!cleanNew) throw new Error('Nama kategori baru tidak valid');

      const { data, error } = await this.client
        .from(this.table)
        .update({ category: cleanNew })
        .eq('category', oldName)
        .select();

      if (error) throw error;

      let savedCustom = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      savedCustom = savedCustom.map(c => c === oldName ? cleanNew : c);
      localStorage.setItem(this.storageKey, JSON.stringify(savedCustom));

      return { success: true, updatedCount: data ? data.length : 0 };
    }

    async deleteCategory(categoryName, deletePhotos = false) {
      if (deletePhotos) {
        const { data: photos, error: fetchErr } = await this.client
          .from(this.table)
          .select('id, imageUrl')
          .eq('category', categoryName);

        if (fetchErr) throw fetchErr;

        if (photos && photos.length > 0) {
          const filePaths = photos
            .map(p => this.storageService.extractPath(p.imageUrl))
            .filter(Boolean);

          if (filePaths.length > 0) {
            await this.storageService.deleteFiles(filePaths);
          }

          await this.client.from(this.table).delete().eq('category', categoryName);
        }
      }

      let savedCustom = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      savedCustom = savedCustom.filter(c => c !== categoryName);
      localStorage.setItem(this.storageKey, JSON.stringify(savedCustom));

      return { success: true };
    }
  }

  global.MBell.CategoryService = CategoryService;
  global.MBell.categoryServiceInstance = new CategoryService();
})(typeof window !== 'undefined' ? window : this);
