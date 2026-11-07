/**
 * Upload Manager Controller
 * Menangani validasi batas 10MB & 20 foto, optimasi WebP, dan proses batch upload
 */

(function (global) {
  'use strict';
  global.MBell = global.MBell || {};

  class UploadManager {
    constructor({ store, photoService, dropzoneUploader, modalManager, toast, events }) {
      this.store = store;
      this.photoService = photoService || global.MBell.photoServiceInstance;
      this.uploader = dropzoneUploader;
      this.modal = modalManager || global.MBell.modalManagerInstance;
      this.toast = toast || global.MBell.toastInstance;
      this.events = events;

      const WakeLockClass = global.MBell.WakeLockManager;
      this.wakeLock = WakeLockClass ? new WakeLockClass() : { request: async () => { }, release: () => { } };

      this.bindEvents();
    }

    get elements() {
      return {
        uploadCategorySelect: document.getElementById('uploadCategorySelect')
      };
    }

    bindEvents() {
      this.events.on('files:selected', (fileList) => {
        this.handleSelectedFiles(fileList);
      });

      this.events.on('upload:requested', () => {
        this.processBatchUpload();
      });
    }

    handleSelectedFiles(fileList) {
      if (!fileList || fileList.length === 0) return;

      const validImageExtensions = /\.(jpe?g|png|webp|bmp|gif|tiff|tif|heic|heif|svg|avif)$/i;
      const validFiles = Array.from(fileList).filter(f =>
        f.type.startsWith('image/') || validImageExtensions.test(f.name)
      );

      if (validFiles.length === 0) {
        this.modal.alert({
          title: 'Format Tidak Didukung',
          message: 'Hanya file gambar (JPG, PNG, WEBP, BMP, GIF, TIFF, dll) yang dapat diunggah ke portofolio MBell MakeUp.',
          type: 'warning'
        });
        return;
      }

      const config = global.MBell.CONFIG || global.CONFIG || {};
      const maxMb = config.MAX_FILE_SIZE_MB || 30;
      const maxBytes = maxMb * 1024 * 1024; // Selalu sinkron otomatis dengan maxMb
      const maxBatch = config.MAX_BATCH_UPLOAD || 20;

      const formatBytes = global.MBell.Formatters?.formatBytes || ((b) => `${b} B`);

      const oversizedFiles = validFiles.filter(f => f.size > maxBytes);
      const sizeAllowedFiles = validFiles.filter(f => f.size <= maxBytes);

      if (oversizedFiles.length > 0) {
        const oversizedInfo = oversizedFiles
          .map(f => `• ${f.name} (${formatBytes(f.size)})`)
          .slice(0, 5)
          .join('\n');
        const moreText = oversizedFiles.length > 5 ? `\n...dan ${oversizedFiles.length - 5} file lainnya` : '';

        if (sizeAllowedFiles.length === 0) {
          this.modal.alert({
            title: `File Melebihi Batas ${maxMb}MB`,
            message: `Semua foto yang Anda pilih melebihi batas maksimal ${maxMb}MB per file:\n\n${oversizedInfo}${moreText}\n\nHarap pilih foto dengan ukuran maksimal ${maxMb}MB.`,
            type: 'warning'
          });
          if (this.uploader.elements.fileInput) this.uploader.elements.fileInput.value = '';
          return;
        } else {
          this.modal.alert({
            title: `Sebagian File Melebihi ${maxMb}MB`,
            message: `${oversizedFiles.length} foto dilewati karena melebihi batas maksimal ${maxMb}MB:\n\n${oversizedInfo}${moreText}\n\n${sizeAllowedFiles.length} foto lainnya yang memenuhi syarat tetap dimasukkan ke antrean.`,
            type: 'warning'
          });
        }
      }

      const { stagedFiles } = this.store.getState();
      const currentCount = stagedFiles.length;
      let allowedFiles = sizeAllowedFiles;

      if (currentCount + sizeAllowedFiles.length > maxBatch) {
        const remainingQuota = Math.max(0, maxBatch - currentCount);
        if (remainingQuota === 0) {
          this.modal.alert({
            title: 'Batas Antrean Tercapai',
            message: `Maksimal ${maxBatch} foto per proses upload agar proses cepat dan foto otomatis dikonversi ke WebP tanpa lemot. Silakan unggah antrean foto ini terlebih dahulu.`,
            type: 'warning'
          });
          if (this.uploader.elements.fileInput) this.uploader.elements.fileInput.value = '';
          return;
        }

        allowedFiles = sizeAllowedFiles.slice(0, remainingQuota);
        this.toast.show(`Maksimal ${maxBatch} foto untuk 1x upload. ${remainingQuota} foto pertama dimasukkan ke antrean.`, 'info');
      }

      allowedFiles.forEach(file => {
        const id = 'stage_' + Math.random().toString(36).substring(2, 9);
        const previewUrl = URL.createObjectURL(file);
        const cleanTitle = file.name.substring(0, file.name.lastIndexOf('.'))
          .replace(/[_-]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());

        stagedFiles.push({
          id,
          file,
          previewUrl,
          title: cleanTitle
        });
      });

      this.store.setState({ stagedFiles });
      this.uploader.renderStagedFiles();
    }

    async processBatchUpload() {
      const { stagedFiles, isUploading } = this.store.getState();
      if (stagedFiles.length === 0 || isUploading) return;

      const targetCategory = this.elements.uploadCategorySelect?.value;
      if (!targetCategory) {
        this.modal.alert({
          title: 'Kategori Belum Dipilih',
          message: 'Pilih kategori tujuan upload terlebih dahulu sebelum mengunggah foto.',
          type: 'warning'
        });
        return;
      }

      this.store.setState({ isUploading: true });
      this.uploader.setUploading(true);

      await this.wakeLock.request();

      const total = stagedFiles.length;
      let completed = 0;
      let errorCount = 0;

      const ImageConverter = global.MBell.ImageConverter;

      for (let i = 0; i < total; i++) {
        const item = stagedFiles[i];
        const percent = Math.round(((i) / total) * 100);
        this.uploader.showProgress(
          percent,
          `Mengonversi ke WebP & mengunggah (${i + 1}/${total}): ${item.file.name}...`
        );

        try {
          const optimizedFile = ImageConverter
            ? await ImageConverter.convertToWebP(item.file, { maxWidth: 1920, maxHeight: 1920, quality: 0.82 })
            : item.file;

          await this.photoService.uploadPhoto(optimizedFile, {
            title: item.title,
            category: targetCategory,
            description: `Portfolio ${targetCategory}`
          });
          completed++;
        } catch (err) {
          console.error(`[UploadManager] Gagal upload ${item.file.name}:`, err);
          errorCount++;
          if (errorCount <= 2 || total <= 3) {
            this.toast.show(`Gagal: ${item.file.name} (${err.message})`, 'error');
          }
        }
      }

      this.wakeLock.release();

      this.uploader.showProgress(100, `Selesai! ${completed} berhasil, ${errorCount} gagal.`);

      if (errorCount > 2) {
        this.toast.show(`Sebagian upload gagal (${errorCount} foto). Periksa koneksi internet Anda dan coba lagi.`, 'error');
      }

      if (completed > 0) {
        this.toast.show(`Sukses mengunggah ${completed} foto ke kategori "${targetCategory}"!`, 'success');
        this.uploader.clearStaging();
        this.events.emit('upload:completed', targetCategory);
      }

      setTimeout(() => {
        this.uploader.hideProgress();
        this.uploader.setUploading(false);
        this.store.setState({ isUploading: false });
      }, 2000);
    }
  }

  global.MBell.UploadManager = UploadManager;
})(typeof window !== 'undefined' ? window : this);
