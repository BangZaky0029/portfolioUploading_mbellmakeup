/**
 * Image to WebP Converter & Optimization Engine
 * MBell MakeUp Portfolio Studio
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class ImageConverter {
    static isWebPSupported() {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      } catch (e) {
        return false;
      }
    }

    static changeExtensionToWebP(fileName) {
      if (!fileName) return `image_${Date.now()}.webp`;
      const lastDotIndex = fileName.lastIndexOf('.');
      if (lastDotIndex === -1) {
        return `${fileName}.webp`;
      }
      return `${fileName.substring(0, lastDotIndex)}.webp`;
    }

    static calculateDimensions(width, height, maxWidth, maxHeight) {
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

    static loadImageFromFile(file) {
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

    static async convertToWebP(file, options = {}) {
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

      if (file.type === 'image/svg+xml' || originalExt === '.svg') {
        return file;
      }

      let img;
      try {
        img = await this.loadImageFromFile(file);
      } catch (err) {
        console.warn(`[ImageConverter] Tidak dapat membaca format ${originalName}, menggunakan file asli:`, err);
        return file;
      }

      const origWidth = img.naturalWidth || img.width;
      const origHeight = img.naturalHeight || img.height;
      const { width, height } = this.calculateDimensions(origWidth, origHeight, maxWidth, maxHeight);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { alpha: keepTransparency });
      if (!ctx) {
        console.warn('[ImageConverter] Konteks 2D canvas tidak tersedia, menggunakan file asli.');
        return file;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const isSupported = this.isWebPSupported();
      const targetMime = isSupported ? 'image/webp' : 'image/jpeg';
      const newFileName = isSupported 
        ? this.changeExtensionToWebP(originalName) 
        : originalName.replace(/\.[^/.]+$/, '.jpg');

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.warn('[ImageConverter] Pembuatan WebP Blob gagal, menggunakan file asli.');
              resolve(file);
              return;
            }

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

    static async convertBatchToWebP(fileList, options = {}, onProgress = null) {
      if (!fileList || fileList.length === 0) return [];

      const total = fileList.length;
      const results = [];

      for (let i = 0; i < total; i++) {
        const file = fileList[i];
        const converted = await this.convertToWebP(file, options);
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
  }

  global.MBell.ImageConverter = ImageConverter;
  global.ImageConverter = ImageConverter;
  global.convertToWebP = ImageConverter.convertToWebP.bind(ImageConverter);
})(typeof window !== 'undefined' ? window : this);
