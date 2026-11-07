/**
 * Vercel & Local Build Script: Generate config.js from Environment Variables
 * MBell MakeUp Portfolio Studio
 *
 * File ini BEBAS dari kredensial rahasia (aman untuk di-commit ke Git).
 * Kredensial dibaca murni dari process.env (Vercel) atau .env lokal Anda.
 */

const fs = require('fs');
const path = require('path');

// 1. Baca variabel dari .env lokal jika file ada (untuk local dev)
const envVars = {};
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envVars[key] = val;
    }
  } catch (err) {
    console.warn('[build-config] Gagal membaca .env lokal:', err.message);
  }
}

// 2. Gabungkan prioritas: process.env (Vercel) > .env lokal (Local dev)
// PENTING: Jangan taruh default key/url rahasia di sini agar tidak bocor ke Git!
const config = {
  SUPABASE_URL: process.env.SUPABASE_URL || envVars.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || envVars.SUPABASE_ANON_KEY || '',
  BUCKET_NAME: process.env.BUCKET_NAME || envVars.BUCKET_NAME || 'images_mbell',
  TABLE_NAME: process.env.TABLE_NAME || envVars.TABLE_NAME || 'images',
  MAX_FILE_SIZE_MB: Number(process.env.MAX_FILE_SIZE_MB || envVars.MAX_FILE_SIZE_MB) || 30,
  MAX_BATCH_UPLOAD: Number(process.env.MAX_BATCH_UPLOAD || envVars.MAX_BATCH_UPLOAD) || 20,
  DEFAULT_CATEGORIES: []
};

if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
  console.warn('[build-config] Perhatian: SUPABASE_URL atau SUPABASE_ANON_KEY belum diisi di Environment Variables / .env');
}

// 3. Tulis file config.js yang siap disajikan ke browser
const configJsContent = `/**
 * Auto-generated Configuration for MBell MakeUp
 * Di-generate otomatis dari Environment Variables (Vercel / .env lokal)
 * File ini di-ignore oleh Git (.gitignore) sehingga aman dan tidak bocor ke publik.
 */
window.CONFIG = ${JSON.stringify(config, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, 'config.js'), configJsContent, 'utf-8');

console.log('✓ [build-config] File config.js berhasil di-generate secara aman!');
console.log('  • SUPABASE_URL     :', config.SUPABASE_URL ? 'Terisi (Aman)' : '(Kosong)');
console.log('  • BUCKET_NAME      :', config.BUCKET_NAME);
console.log('  • TABLE_NAME       :', config.TABLE_NAME);
console.log('  • MAX_FILE_SIZE_MB : ' + config.MAX_FILE_SIZE_MB + 'MB');
console.log('  • MAX_BATCH_UPLOAD : ' + config.MAX_BATCH_UPLOAD + ' foto');
