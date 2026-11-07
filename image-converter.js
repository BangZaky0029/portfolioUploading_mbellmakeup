/**
 * Image to WebP Converter & Optimization Engine
 * MBell MakeUp Portfolio Studio
 * 
 * Modul standalone untuk mengonversi gambar dari ekstensi apa pun 
 * (JPG, JPEG, PNG, WEBP, BMP, TIFF, GIF, HEIC/HEIF) ke format WebP (.webp).
 * Mengoptimalkan ukuran file (kompresi hemat kuota) sekaligus menjaga ketajaman
 * detail riasan makeup (skin texture, glitter, & eye details).
 */

(function (global) {
  'use strict';

  /**
   * Cek dukungan browser terhadap ekspor format WebP di HTML5 Canvas
   * @returns {boolean}
   */
  function checkWebPSupport() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) {
      return false;
    }
  }

  const isWebPSupported = checkWebPSupport();

  /**
   * Mengganti ekstensi file asli menjadi .webp
   * @param {string} fileName 
   * @returns {string}
   */
  function changeExtensionToWebP(fileName) {
    if (!fileName) return `image_${Date.now()}.webp`;
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return `${fileName}.webp`;
    }
    return `${fileName.substring(0, lastDotIndex)}.webp`;
  }

  /**
   * Menghitung dimensi proporsional dengan mempertahankan aspek rasio (aspect ratio)
   * @param {number} width 
   * @param {number} height 
   * @param {number} maxWidth 
   * @param {number} maxHeight 
   * @returns {{width: number, height: number}}
   */
  function calculateDimensions(width, height, maxWidth, maxHeight) {
    if (width <= maxWidth && height <= maxHeight) {
      return { width, height };
    }

    const ratio = width / height;
    const maxRatio = maxWidth / maxHeight;

    if (ratio > maxRatio) {
      return {
        width: maxWidth,
        height: Math.round(maxWidth / ratio)
      };
    } else {
      return {
        width: Math.round(maxHeight * ratio),
        height: maxHeight
      };
    }
  }

  /**
   * Membaca file gambar dan memuatnya ke Image Element
   * @param {File|Blob} file 
   * @returns {Promise<HTMLImageElement>}
   */
  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Gagal memuat gambar: ${file.name || 'File tidak valid'}`));
      };

      img.src = objectUrl;
    });
  }

  /**
   * Mengonversi File/Blob gambar dari ekstensi apa pun ke WebP (.webp)
   * 
   * @param {File|Blob} file - File gambar input (JPG, PNG, BMP, dsb)
   * @param {Object} [options] - Pengaturan konversi
   * @param {number} [options.maxWidth=1920] - Batas lebar maksimum (px)
   * @param {number} [options.maxHeight=1920] - Batas tinggi maksimum (px)
   * @param {number} [options.quality=0.82] - Kualitas WebP (0.1 - 1.0), default 0.82 sangat tajam untuk makeup
   * @param {boolean} [options.keepTransparency=true] - Menjaga transparansi alpha channel
   * @returns {Promise<File>} File baru dalam format WebP
   */
  async function convertToWebP(file, options = {}) {
    if (!file) {
      throw new Error('File gambar tidak ditemukan.');
    }

    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 0.82,
      keepTransparency = true
    } = options;

    const originalName = file.name || `photo_${Date.now()}`;
    const originalExt = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();

    // 1. Jika file adalah SVG, lewati rasterisasi karena SVG adalah grafik vektor
    if (file.type === 'image/svg+xml' || originalExt === '.svg') {
      return file;
    }

    // 2. Muat gambar
    let img;
    try {
      img = await loadImageFromFile(file);
    } catch (err) {
      console.warn(`[ImageConverter] Tidak dapat membaca format ${originalName}, menggunakan file asli:`, err);
      return file;
    }

    // 3. Hitung dimensi target
    const origWidth = img.naturalWidth || img.width;
    const origHeight = img.naturalHeight || img.height;
    const { width, height } = calculateDimensions(origWidth, origHeight, maxWidth, maxHeight);

    // 4. Siapkan Canvas dengan dukungan alpha channel (transparansi)
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { alpha: keepTransparency });
    if (!ctx) {
      console.warn('[ImageConverter] Konteks 2D canvas tidak tersedia, menggunakan file asli.');
      return file;
    }

    // Aktifkan smoothing kualitas tinggi agar detail makeup tetap halus dan tajam
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 5. Gambar ke canvas
    ctx.drawImage(img, 0, 0, width, height);

    // 6. Konversi canvas ke WebP Blob
    const targetMime = isWebPSupported ? 'image/webp' : 'image/jpeg';
    const newFileName = isWebPSupported 
      ? changeExtensionToWebP(originalName) 
      : originalName.replace(/\.[^/.]+$/, '.jpg');

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.warn('[ImageConverter] Pembuatan WebP Blob gagal, menggunakan file asli.');
            resolve(file);
            return;
          }

          // Buat objek File baru dengan ekstensi .webp & mime-type image/webp
          const webpFile = new File([blob], newFileName, {
            type: targetMime,
            lastModified: Date.now()
          });

          resolve(webpFile);
        },
        targetMime,
        quality
      );
    });
  }

  /**
   * Konversi batch banyak file sekaligus ke WebP dengan pelacakan progres
   * @param {File[]} fileList 
   * @param {Object} [options] 
   * @param {Function} [onProgress] Callback callback({ index, total, percent, currentFile, convertedFile })
   * @returns {Promise<File[]>}
   */
  async function convertBatchToWebP(fileList, options = {}, onProgress = null) {
    if (!fileList || fileList.length === 0) return [];

    const total = fileList.length;
    const results = [];

    for (let i = 0; i < total; i++) {
      const file = fileList[i];
      const converted = await convertToWebP(file, options);
      results.push(converted);

      if (typeof onProgress === 'function') {
        const percent = Math.round(((i + 1) / total) * 100);
        onProgress({
          index: i,
          total,
          percent,
          currentFile: file,
          convertedFile: converted
        });
      }
    }

    return results;
  }

  // Namespace Object
  const ImageConverter = {
    convertToWebP,
    convertBatchToWebP,
    changeExtensionToWebP,
    calculateDimensions,
    isWebPSupported: () => isWebPSupported
  };

  // Dukungan Ekspor Universal (Browser Global & Module)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageConverter;
  }

  global.ImageConverter = ImageConverter;
  global.convertToWebP = convertToWebP;

})(typeof window !== 'undefined' ? window : this);

