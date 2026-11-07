/**
 * Master Application Controller & Orchestrator
 * MBell MakeUp Portfolio Studio
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class AppController {
    constructor() {
      const MB = global.MBell;

      this.events = new MB.EventEmitter();
      this.store = new MB.StateStore();

      // Services
      this.supabaseClient = MB.supabaseClientInstance;
      this.storageService = MB.storageServiceInstance;
      this.photoService = MB.photoServiceInstance;
      this.categoryService = MB.categoryServiceInstance;
      this.catalogueService = MB.catalogueServiceInstance;
      this.heroService = MB.heroServiceInstance;

      // Components
      this.modal = MB.modalManagerInstance;
      this.toast = MB.toastInstance;
      this.lightbox = MB.lightboxInstance;

      this.categoryNav = new MB.CategoryNav({
        store: this.store,
        categoryService: this.categoryService,
        modalManager: this.modal,
        toast: this.toast,
        events: this.events
      });

      this.galleryView = new MB.GalleryView({
        store: this.store,
        events: this.events,
        modalManager: this.modal,
        toast: this.toast
      });

      this.uploader = new MB.DropzoneUploader({
        store: this.store,
        events: this.events
      });

      if (MB.CatalogueView) {
        this.catalogueView = new MB.CatalogueView({
          catalogueService: this.catalogueService,
          modalManager: this.modal,
          toast: this.toast,
          lightbox: this.lightbox,
          events: this.events
        });
      }

      if (MB.HeroView) {
        this.heroView = new MB.HeroView({
          heroService: this.heroService,
          modalManager: this.modal,
          toast: this.toast,
          lightbox: this.lightbox,
          events: this.events
        });
      }

      // Controllers
      this.selectionManager = new MB.SelectionManager({
        store: this.store,
        photoService: this.photoService,
        modalManager: this.modal,
        toast: this.toast,
        events: this.events
      });

      this.uploadManager = new MB.UploadManager({
        store: this.store,
        photoService: this.photoService,
        dropzoneUploader: this.uploader,
        modalManager: this.modal,
        toast: this.toast,
        events: this.events
      });

      this.wireEvents();
    }

    get elements() {
      return {
        statusDot: document.getElementById('statusDot'),
        statusText: document.getElementById('statusText'),
        btnRefreshGallery: document.getElementById('btnRefreshGallery'),
        searchInput: document.getElementById('searchInput'),
        btnClearSearch: document.getElementById('btnClearSearch')
      };
    }

    wireEvents() {
      const els = this.elements;
      const debounce = global.MBell.Formatters?.debounce || ((fn) => fn);

      if (els.btnRefreshGallery) {
        els.btnRefreshGallery.addEventListener('click', async () => {
          els.btnRefreshGallery.disabled = true;
          await this.categoryNav.loadCategories();
          await this.loadGallery();
          this.toast.show('Galeri diperbarui dari Supabase', 'info');
          els.btnRefreshGallery.disabled = false;
        });
      }

      if (els.searchInput) {
        els.searchInput.addEventListener('input', debounce((e) => {
          this.store.setState({ searchQuery: e.target.value.trim() });
          this.loadGallery();
        }, 350));
      }

      if (els.btnClearSearch) {
        els.btnClearSearch.addEventListener('click', () => {
          if (this.elements.searchInput) this.elements.searchInput.value = '';
          this.store.setState({ searchQuery: '' });
          this.loadGallery();
        });
      }

      this.events.on('category:changed', () => {
        this.selectionManager.updateBulkActionBar();
        this.loadGallery();
      });

      this.events.on('category:renamed', () => {
        this.loadGallery();
      });

      this.events.on('category:deleted', () => {
        this.loadGallery();
      });

      this.events.on('upload:completed', async (targetCategory) => {
        await this.categoryNav.loadCategories();
        this.categoryNav.setActiveCategory(targetCategory);
      });

      this.events.on('photos:bulk-deleted', async () => {
        await this.categoryNav.loadCategories();
        await this.loadGallery();
      });

      this.events.on('photos:bulk-moved', async (targetCategory) => {
        await this.categoryNav.loadCategories();
        this.categoryNav.setActiveCategory(targetCategory);
      });

      this.events.on('photo:zoom', (photoId) => {
        const { photos } = this.store.getState();
        const photo = photos.find(p => String(p.id) === String(photoId));
        if (photo) this.lightbox.open(photo);
      });

      this.events.on('photo:edit', (photoId) => {
        const { photos } = this.store.getState();
        const photo = photos.find(p => String(p.id) === String(photoId));
        if (photo) this.galleryView.openEditModal(photo);
      });

      this.events.on('photo:delete', async (photoId) => {
        await this.handleDeleteSinglePhoto(photoId);
      });

      this.events.on('photo:edit-submit', async (payload) => {
        await this.handleEditPhotoSubmit(payload);
      });
    }

    async init() {
      const els = this.elements;

      // 0. Terapkan konfigurasi aktif (dari config.js) ke seluruh teks UI
      if (typeof global.MBell?.applyConfigToUI === 'function') {
        global.MBell.applyConfigToUI();
      }

      // 1. Cek Koneksi Supabase & Update Visual Status Header
      try {
        const conn = await this.supabaseClient.checkConnection();
        if (conn.success) {
          if (els.statusDot) els.statusDot.classList.remove('offline');
          if (els.statusText) els.statusText.textContent = 'Terhubung';
        } else {
          if (els.statusDot) els.statusDot.classList.add('offline');
          if (els.statusText) els.statusText.textContent = 'Koneksi Terganggu';
          this.toast.show(`Koneksi Supabase gagal: ${conn.error}`, 'error');
        }
      } catch (err) {
        console.warn('[AppController] Cek koneksi Supabase error:', err);
        if (els.statusDot) els.statusDot.classList.add('offline');
        if (els.statusText) els.statusText.textContent = 'Offline';
      }

      // 2. Load Kategori
      await this.categoryNav.loadCategories();
      if (els.statusText && (!els.statusText.textContent || els.statusText.textContent === 'Menghubungkan...')) {
        els.statusText.textContent = 'Terhubung';
        if (els.statusDot) els.statusDot.classList.remove('offline');
      }

      // 3. Load Galeri Foto
      await this.loadGallery();
    }

    async loadGallery() {
      this.galleryView.showLoading();

      const { activeCategory, searchQuery } = this.store.getState();
      try {
        const photos = await this.photoService.getImages(activeCategory, searchQuery);
        this.store.setState({ photos });
        this.galleryView.render(photos);
      } catch (err) {
        console.error('[AppController] Gagal memuat galeri:', err);
        this.galleryView.showError(err.message);
        this.toast.show('Gagal memuat galeri foto', 'error');
      }
    }

    async handleDeleteSinglePhoto(photoId) {
      const { photos } = this.store.getState();
      const photo = photos.find(p => String(p.id) === String(photoId));
      if (!photo) return;

      const confirmed = await this.modal.confirm({
        title: 'Hapus Foto Portofolio',
        message: `Apakah Anda yakin ingin menghapus foto "${photo.title || 'ini'}"?`,
        preview: {
          thumb: photo.imageUrl,
          title: photo.title || 'Foto Portofolio',
          meta: `Kategori: ${photo.category} • ID: #${photo.id}`
        },
        warning: 'File fisik di Supabase Storage dan data di tabel database akan dihapus permanen.',
        confirmText: 'Hapus Permanen',
        isDanger: true
      });

      if (!confirmed) return;

      try {
        await this.photoService.deletePhoto(photoId, photo.imageUrl);
        this.toast.show(`Foto "${photo.title || photoId}" berhasil dihapus`, 'success');
        await this.categoryNav.loadCategories();
        await this.loadGallery();
      } catch (err) {
        console.error('[AppController] Gagal hapus foto:', err);
        this.toast.show(`Gagal menghapus foto: ${err.message}`, 'error');
      }
    }

    async handleEditPhotoSubmit({ id, title, category, description, details, btn, modal }) {
      try {
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Menyimpan...';
        }

        const { photos } = this.store.getState();
        const currentPhoto = photos.find(p => String(p.id) === String(id));

        await this.photoService.updatePhoto(id, {
          title,
          category,
          description,
          details
        }, currentPhoto);

        this.toast.show('Detail foto berhasil diperbarui!', 'success');
        if (modal) modal.classList.remove('active');

        await this.categoryNav.loadCategories();
        await this.loadGallery();
      } catch (err) {
        console.error('[AppController] Gagal update foto:', err);
        this.toast.show(`Gagal update foto: ${err.message}`, 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Simpan Perubahan';
        }
      }
    }
  }

  global.MBell.AppController = AppController;
})(typeof window !== 'undefined' ? window : this);
