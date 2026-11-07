/**
 * Supabase Client Provider & Connection Checker
 * MBell MakeUp Portfolio Studio
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class SupabaseClient {
    constructor(config) {
      this.config = config || global.MBell.CONFIG || global.CONFIG || {};
      this.client = null;
      this.init();
    }

    init() {
      if (!this.config.SUPABASE_URL || !this.config.SUPABASE_ANON_KEY) {
        console.warn('[SupabaseClient] Kredensial Supabase belum diatur. Silakan isi file config.js atau buat dari config.example.js');
        return;
      }

      if (global.supabase && typeof global.supabase.createClient === 'function') {
        this.client = global.supabase.createClient(
          this.config.SUPABASE_URL,
          this.config.SUPABASE_ANON_KEY
        );
      } else {
        console.error('[SupabaseClient] window.supabase library tidak ditemukan. Pastikan CDN Supabase ter-load.');
      }
    }

    getClient() {
      if (!this.client) {
        this.init();
      }
      return this.client;
    }

    async runWithRetry(fn, maxRetries = 2, delayMs = 1000) {
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

    async checkConnection() {
      try {
        if (!this.config.SUPABASE_URL || !this.config.SUPABASE_ANON_KEY) {
          return { success: false, error: 'Kredensial Supabase belum diisi di config.js' };
        }

        const client = this.getClient();
        if (!client) throw new Error('Supabase client belum diinisialisasi');

        const { count, error } = await client
          .from(this.config.TABLE_NAME)
          .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return { success: true, count: count || 0 };
      } catch (err) {
        console.error('[SupabaseClient] Koneksi Supabase gagal:', err);
        return { success: false, error: err.message };
      }
    }
  }

  global.MBell.SupabaseClient = SupabaseClient;
  global.MBell.supabaseClientInstance = new SupabaseClient();
})(typeof window !== 'undefined' ? window : this);
