/**
 * Hero & Profile Service Layer
 * Mengelola operasi CRUD foto Hero utama, Profil About, dan relasi S&K
 * Tabel: public.hero_images & Storage: images_mbell/heroImages/*
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class HeroService {
    constructor(clientInstance, storageService, config) {
      this.clientInstance = clientInstance || global.MBell.supabaseClientInstance;
      this.storageService = storageService || global.MBell.storageServiceInstance;
      this.config = config || global.MBell.CONFIG || global.CONFIG || {};
    }

    get client() {
      return this.clientInstance.getClient();
    }

    get table() {
      return (global.MBell?.CONFIG?.TABLE_HERO || global.CONFIG?.TABLE_HERO || this.config.TABLE_HERO || 'hero_images');
    }

    get folder() {
      return (global.MBell?.CONFIG?.HERO_FOLDER || global.CONFIG?.HERO_FOLDER || this.config.HERO_FOLDER || 'heroImages');
    }

    /**
     * Mengambil semua foto Hero & Profil dari Supabase
     */
    async getHeroImages() {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .order('order_index', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;
      return data || [];
    }

    /**
     * Mengambil satu foto berdasarkan key unik (misal: 'hero_main' atau 'about_main')
     */
    async getHeroByKey(key) {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('key', key)
        .maybeSingle();

      if (error) throw error;
      return data;
    }

    /**
     * Mengambil data flyer Syarat & Ketentuan dari tabel catalogue untuk preview thumbnail Hero
     */
    async getSKFlyer() {
      const catTable = global.MBell?.CONFIG?.TABLE_CATALOGUE || global.CONFIG?.TABLE_CATALOGUE || 'catalogue';
      const { data, error } = await this.client
        .from(catTable)
        .select('*')
        .ilike('label', '%Syarat%')
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return data;
    }

    /**
     * Mengunggah foto Hero/Profil baru
     */
    async uploadHeroImage(file, metadata, onProgress) {
      if (!file) throw new Error('File gambar tidak ditemukan');

      const sanitize = global.MBell.Formatters?.sanitizeFileName || ((n) => n.replace(/[^a-zA-Z0-9._-]/g, '_'));
      const cleanName = sanitize(file.name);
      const timestamp = Date.now();
      const storagePath = `${this.folder}/${timestamp}_${cleanName}`;

      if (typeof onProgress === 'function') onProgress(25, 'Mengunggah file ke Supabase Storage (heroImages)...');

      await this.storageService.uploadFile(storagePath, file);

      if (typeof onProgress === 'function') onProgress(70, 'Mendapatkan URL publik gambar...');
      const publicUrl = this.storageService.getPublicUrl(storagePath);

      if (typeof onProgress === 'function') onProgress(85, 'Menyimpan konfigurasi foto ke database...');

      const payload = {
        key: metadata.key || `hero_${timestamp}`,
        title: metadata.title || 'Foto Hero',
        subtitle: metadata.subtitle || null,
        description: metadata.description || null,
        alt_text: metadata.alt_text || metadata.title || null,
        image_url: publicUrl,
        is_active: metadata.is_active !== undefined ? metadata.is_active : true,
        order_index: Number(metadata.order_index) || 1
      };

      const { data, error } = await this.client
        .from(this.table)
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      if (typeof onProgress === 'function') onProgress(100, 'Berhasil disimpan!');
      return data;
    }

    /**
     * Ekstraksi path storage dari URL gambar Supabase
     */
    extractStoragePath(url) {
      if (!url || typeof url !== 'string') return null;
      const bucket = this.storageService.bucket || 'images_mbell';
      const marker = `/${bucket}/`;
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        return decodeURIComponent(url.substring(idx + marker.length));
      }
      if (url.includes(`${this.folder}/`)) {
        return `${this.folder}/${url.split(`${this.folder}/`)[1]}`;
      }
      return null;
    }

    /**
     * Memperbarui detail atau mengganti file foto Hero/Profil
     */
    async updateHeroImage(id, metadata, newFile = null, currentImageUrl = null, onProgress) {
      if (!id) throw new Error('ID foto tidak valid');

      let finalImageUrl = currentImageUrl;

      if (newFile) {
        if (typeof onProgress === 'function') onProgress(20, 'Mengunggah foto baru ke storage heroImages...');
        const sanitize = global.MBell.Formatters?.sanitizeFileName || ((n) => n.replace(/[^a-zA-Z0-9._-]/g, '_'));
        const cleanName = sanitize(newFile.name);
        const timestamp = Date.now();
        const storagePath = `${this.folder}/${timestamp}_${cleanName}`;

        await this.storageService.uploadFile(storagePath, newFile);
        finalImageUrl = this.storageService.getPublicUrl(storagePath);

        // Hapus file lama di storage bucket jika foto baru diunggah
        if (currentImageUrl) {
          const oldStoragePath = this.extractStoragePath(currentImageUrl);
          if (oldStoragePath) {
            try {
              if (typeof onProgress === 'function') onProgress(50, 'Menghapus file foto lama dari storage...');
              await this.storageService.deleteFiles([oldStoragePath]);
              console.log('[HeroService] Berhasil menghapus file lama dari storage:', oldStoragePath);
            } catch (delErr) {
              console.warn('[HeroService] Gagal menghapus file lama di storage:', delErr);
            }
          }
        }
      }

      if (typeof onProgress === 'function') onProgress(80, 'Memperbarui database Supabase...');

      const payload = {
        title: metadata.title,
        subtitle: metadata.subtitle !== undefined ? metadata.subtitle : null,
        description: metadata.description !== undefined ? metadata.description : null,
        alt_text: metadata.alt_text !== undefined ? metadata.alt_text : null,
        image_url: finalImageUrl,
        is_active: metadata.is_active !== undefined ? metadata.is_active : true,
        order_index: Number(metadata.order_index) || 1,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from(this.table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (typeof onProgress === 'function') onProgress(100, 'Perubahan berhasil disimpan!');
      return data;
    }

    /**
     * Menghapus slot foto
     */
    async deleteHeroImage(id, imageUrl) {
      if (!id) throw new Error('ID foto tidak valid');

      const { error } = await this.client
        .from(this.table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (imageUrl) {
        const storagePath = this.extractStoragePath(imageUrl);
        if (storagePath) {
          try {
            await this.storageService.deleteFiles([storagePath]);
            console.log('[HeroService] Berhasil menghapus file dari storage:', storagePath);
          } catch (storageErr) {
            console.warn('[HeroService] Gagal menghapus file dari storage:', storageErr);
          }
        }
      }

      return true;
    }
  }

  global.MBell.HeroService = HeroService;
  global.MBell.heroServiceInstance = new HeroService();
})(typeof window !== 'undefined' ? window : this);
