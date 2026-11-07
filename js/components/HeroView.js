/**
 * Hero & Profile View Controller
 * Mengelola antarmuka visual CRUD untuk Foto Utama Hero (Arch), Profil About, dan S&K Thumbnail
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class HeroView {
    constructor({ heroService, modalManager, toast, lightbox, events }) {
      this.heroService = heroService;
      this.modal = modalManager;
      this.toast = toast;
      this.lightbox = lightbox;
      this.events = events;

      this.heroList = [];
      this.skFlyer = null;
      this.editingHero = null;
      this.stagedNewFile = null;

      this.initElements();
      this.bindEvents();
    }

    initElements() {
      this.els = {
        heroView: document.getElementById('heroView'),
        heroCardsContainer: document.getElementById('heroCardsContainer'),
        btnRefreshHero: document.getElementById('btnRefreshHero'),

        // Modal Edit Hero
        editHeroModal: document.getElementById('editHeroModal'),
        editHeroSlotName: document.getElementById('editHeroSlotName'),
        editHeroCurrentImg: document.getElementById('editHeroCurrentImg'),
        editHeroFileInput: document.getElementById('editHeroFileInput'),
        editHeroDropzone: document.getElementById('editHeroDropzone'),
        editHeroNewFilePreview: document.getElementById('editHeroNewFilePreview'),
        editHeroNewFileText: document.getElementById('editHeroNewFileText'),
        editHeroInputTitle: document.getElementById('editHeroInputTitle'),
        editHeroInputSubtitle: document.getElementById('editHeroInputSubtitle'),
        editHeroInputAlt: document.getElementById('editHeroInputAlt'),
        editHeroInputDesc: document.getElementById('editHeroInputDesc'),
        btnSaveEditHero: document.getElementById('btnSaveEditHero')
      };
    }

    bindEvents() {
      // Refresh hero
      if (this.els.btnRefreshHero) {
        this.els.btnRefreshHero.addEventListener('click', () => {
          this.loadHeroData();
          this.toast?.show('Data foto Hero diperbarui', 'info');
        });
      }

      // Dropzone di modal edit
      if (this.els.editHeroDropzone && this.els.editHeroFileInput) {
        this.els.editHeroDropzone.addEventListener('click', () => {
          this.els.editHeroFileInput.click();
        });

        this.els.editHeroFileInput.addEventListener('change', (e) => {
          const file = e.target.files?.[0];
          if (file) this.handleSelectEditFile(file);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
          this.els.editHeroDropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            this.els.editHeroDropzone.classList.add('drag-over');
          });
        });

        ['dragleave', 'drop'].forEach(eventName => {
          this.els.editHeroDropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            this.els.editHeroDropzone.classList.remove('drag-over');
          });
        });

        this.els.editHeroDropzone.addEventListener('drop', (e) => {
          const file = e.dataTransfer?.files?.[0];
          if (file) this.handleSelectEditFile(file);
        });
      }

      // Simpan perubahan di modal edit
      if (this.els.btnSaveEditHero) {
        this.els.btnSaveEditHero.addEventListener('click', () => this.handleSaveEditSubmit());
      }
    }

    handleSelectEditFile(file) {
      if (!file.type.startsWith('image/')) {
        this.toast?.show('File harus berupa gambar (JPG, PNG, WebP)', 'warning');
        return;
      }
      this.stagedNewFile = file;

      if (this.els.editHeroNewFileText) {
        const sizeKb = (file.size / 1024).toFixed(1);
        this.els.editHeroNewFileText.textContent = `File baru dipilih: ${file.name} (${sizeKb} KB)`;
      }

      if (this.els.editHeroNewFilePreview) {
        const url = URL.createObjectURL(file);
        this.els.editHeroNewFilePreview.src = url;
        this.els.editHeroNewFilePreview.style.display = 'block';
      }
    }

    async loadHeroData() {
      if (!this.heroService) return;

      try {
        if (this.els.heroCardsContainer) {
          this.els.heroCardsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
              <div class="spinner" style="margin: 0 auto 0.75rem;"></div>
              <p style="font-size: 0.88rem; font-weight: 600;">Memuat data Foto Hero & Profil dari Supabase...</p>
            </div>
          `;
        }

        const [heroImages, skFlyer] = await Promise.all([
          this.heroService.getHeroImages(),
          this.heroService.getSKFlyer()
        ]);

        this.heroList = heroImages || [];
        this.skFlyer = skFlyer || null;

        this.renderHeroCards();
      } catch (err) {
        console.error('[HeroView] Gagal memuat data hero:', err);
        this.toast?.show('Gagal memuat data Foto Hero: ' + (err.message || 'Koneksi error'), 'error');
        if (this.els.heroCardsContainer) {
          this.els.heroCardsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; background: #FFF; border-radius: 16px; border: 1px dashed var(--border-color);">
              <p style="color: var(--danger); font-weight: 700;">Gagal memuat data Hero dari Supabase.</p>
              <button type="button" class="btn btn-secondary btn-sm" id="btnRetryHero" style="margin-top: 0.75rem;">Coba Lagi</button>
            </div>
          `;
          document.getElementById('btnRetryHero')?.addEventListener('click', () => this.loadHeroData());
        }
      }
    }

    renderHeroCards() {
      if (!this.els.heroCardsContainer) return;

      const heroMain = this.heroList.find(h => h.key === 'hero_main');
      const aboutMain = this.heroList.find(h => h.key === 'about_main');

      const skImgUrl = this.skFlyer?.image_url || 'https://fsbvnkwxwvffghrdxnxr.supabase.co/storage/v1/object/public/images_mbell/catalogue/S&K.jpeg';

      const html = `
        <!-- ================================================================
             SLOT 1: Foto Utama Hero (Organic Arch Portrait)
             ================================================================ -->
        <div class="hero-slot-card" data-key="hero_main">
          <div class="hero-slot-header">
            <div class="hero-slot-badge-type">Halaman Depan (Hero)</div>
            <span class="hero-slot-indicator-active">● Aktif di Website</span>
          </div>

          <!-- Preview Mockup Arch -->
          <div class="hero-arch-mockup-wrapper">
            <div class="hero-arch-mockup">
              <img src="${heroMain?.image_url || 'https://fsbvnkwxwvffghrdxnxr.supabase.co/storage/v1/object/public/images_mbell/heroImages/foto_1_opt.jpeg'}"
                   alt="${heroMain?.alt_text || 'Foto Utama Hero'}"
                   class="hero-arch-img" />
              <div class="hero-arch-badge-pill">${heroMain?.subtitle || 'Certified MUA'}</div>
            </div>
          </div>

          <div class="hero-slot-info">
            <h3 class="hero-slot-title">${heroMain?.title || 'Foto Utama Hero (Organic Arch)'}</h3>
            <p class="hero-slot-desc">${heroMain?.description || 'Foto portrait utama dengan kubah melengkung di bagian Hero website.'}</p>
            <div class="hero-slot-meta">
              <span><strong>Slot:</strong> hero_main</span>
              <span><strong>Rasio:</strong> 4:5 (Kubah Melengkung)</span>
            </div>
          </div>

          <div class="hero-slot-actions">
            <button type="button" class="btn btn-secondary btn-sm btn-view-hero" data-url="${heroMain?.image_url}" data-title="${heroMain?.title}">
              👁️ Lihat Foto
            </button>
            <button type="button" class="btn btn-primary btn-sm btn-edit-hero" data-id="${heroMain?.id}" data-key="hero_main">
              ✏️ Ganti Foto & Edit
            </button>
          </div>
        </div>

        <!-- ================================================================
             SLOT 2: Foto Profil About (Bella Doing Makeup)
             ================================================================ -->
        <div class="hero-slot-card" data-key="about_main">
          <div class="hero-slot-header">
            <div class="hero-slot-badge-type" style="background: rgba(158, 90, 84, 0.12); color: var(--primary);">Profil MUA (About)</div>
            <span class="hero-slot-indicator-active">● Aktif di Website</span>
          </div>

          <!-- Preview Mockup About 4:5 Rounded -->
          <div class="hero-about-mockup-wrapper">
            <div class="hero-about-mockup">
              <img src="${aboutMain?.image_url || 'https://fsbvnkwxwvffghrdxnxr.supabase.co/storage/v1/object/public/images_mbell/heroImages/foto_2_opt.jpeg'}"
                   alt="${aboutMain?.alt_text || 'Foto Profil Bella MUA'}"
                   class="hero-about-img" />
              <div class="hero-about-quote-pill">
                <em>"Kecantikan alami adalah karakter terbaikmu."</em>
                <small>— Bella Aprilian</small>
              </div>
            </div>
          </div>

          <div class="hero-slot-info">
            <h3 class="hero-slot-title">${aboutMain?.title || 'Foto Profil About (Bella Makeup Artist)'}</h3>
            <p class="hero-slot-desc">${aboutMain?.description || 'Kecantikan alami adalah karakter terbaikmu. — Bella Aprilian'}</p>
            <div class="hero-slot-meta">
              <span><strong>Slot:</strong> about_main</span>
              <span><strong>Rasio:</strong> 4:5 (Rounded Card)</span>
            </div>
          </div>

          <div class="hero-slot-actions">
            <button type="button" class="btn btn-secondary btn-sm btn-view-hero" data-url="${aboutMain?.image_url}" data-title="${aboutMain?.title}">
              👁️ Lihat Foto
            </button>
            <button type="button" class="btn btn-primary btn-sm btn-edit-hero" data-id="${aboutMain?.id}" data-key="about_main">
              ✏️ Ganti Foto & Edit
            </button>
          </div>
        </div>

        <!-- ================================================================
             SLOT 3: Foto Kecil Mengambang di Hero (S&K Flyer)
             ================================================================ -->
        <div class="hero-slot-card hero-slot-linked-card" data-key="hero_sk">
          <div class="hero-slot-header">
            <div class="hero-slot-badge-type" style="background: rgba(217, 119, 6, 0.12); color: #B45309;">Foto Kecil Hero (S&K)</div>
            <span class="hero-slot-indicator-linked">🔗 Terhubung ke Katalog</span>
          </div>

          <!-- Preview Mockup Floating S&K -->
          <div class="hero-sk-mockup-wrapper">
            <div class="hero-sk-mockup">
              <img src="${skImgUrl}"
                   alt="Flyer Syarat & Ketentuan"
                   class="hero-sk-img" />
              <div class="hero-sk-overlay-badge">📑 Flyer S&K Terkatalog</div>
            </div>
          </div>

          <div class="hero-slot-info">
            <h3 class="hero-slot-title">Foto Kecil Mengambang (Syarat & Ketentuan)</h3>
            <p class="hero-slot-desc">
              Foto kecil yang melayang di sudut kiri bawah kubah Hero otomatis mengambil flyer <strong>Syarat & Ketentuan</strong> dari tabel <code>catalogue</code>.
            </p>
            <div class="hero-slot-meta">
              <span><strong>Sumber:</strong> public.catalogue</span>
              <span><strong>File:</strong> S&K.jpeg</span>
            </div>
          </div>

          <div class="hero-slot-actions">
            <button type="button" class="btn btn-secondary btn-sm btn-view-hero" data-url="${skImgUrl}" data-title="Flyer Syarat & Ketentuan">
              👁️ Lihat Flyer S&K
            </button>
            <button type="button" class="btn btn-outline-primary btn-sm" id="btnJumpToCatalogue">
              📑 Buka Tab Katalog ↗
            </button>
          </div>
        </div>
      `;

      this.els.heroCardsContainer.innerHTML = html;
      this.attachCardEvents();
    }

    attachCardEvents() {
      // 1. Tombol View Lightbox
      this.els.heroCardsContainer.querySelectorAll('.btn-view-hero').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const url = e.currentTarget.getAttribute('data-url');
          const title = e.currentTarget.getAttribute('data-title');
          if (url && this.lightbox) {
            this.lightbox.open({
              imageUrl: url,
              title: title || 'Foto Hero & Profil',
              category: 'Hero / Profil',
              id: ''
            });
          }
        });
      });

      // 2. Tombol Edit Hero
      this.els.heroCardsContainer.querySelectorAll('.btn-edit-hero').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = Number(e.currentTarget.getAttribute('data-id'));
          const key = e.currentTarget.getAttribute('data-key');
          const item = this.heroList.find(h => h.id === id || h.key === key);
          if (item) this.openEditModal(item);
        });
      });

      // 3. Tombol Jump ke Tab Katalog
      document.getElementById('btnJumpToCatalogue')?.addEventListener('click', () => {
        const tabCatalogue = document.getElementById('tabModeCatalogue');
        if (tabCatalogue) tabCatalogue.click();
      });
    }

    openEditModal(item) {
      this.editingHero = item;
      this.stagedNewFile = null;

      if (this.els.editHeroSlotName) {
        this.els.editHeroSlotName.textContent = item.title;
      }
      if (this.els.editHeroCurrentImg) {
        this.els.editHeroCurrentImg.src = item.image_url;
      }
      if (this.els.editHeroNewFilePreview) {
        this.els.editHeroNewFilePreview.src = '';
        this.els.editHeroNewFilePreview.style.display = 'none';
      }
      if (this.els.editHeroNewFileText) {
        this.els.editHeroNewFileText.textContent = 'Klik atau drag foto baru ke sini untuk mengganti gambar';
      }

      if (this.els.editHeroInputTitle) this.els.editHeroInputTitle.value = item.title || '';
      if (this.els.editHeroInputSubtitle) this.els.editHeroInputSubtitle.value = item.subtitle || '';
      if (this.els.editHeroInputAlt) this.els.editHeroInputAlt.value = item.alt_text || '';
      if (this.els.editHeroInputDesc) this.els.editHeroInputDesc.value = item.description || '';

      if (this.els.editHeroFileInput) this.els.editHeroFileInput.value = '';

      if (this.els.editHeroModal) {
        this.els.editHeroModal.classList.add('active');
      } else if (this.modal?.open) {
        this.modal.open('editHeroModal');
      }
    }

    async handleSaveEditSubmit() {
      if (!this.editingHero) return;

      const title = this.els.editHeroInputTitle?.value?.trim();
      const subtitle = this.els.editHeroInputSubtitle?.value?.trim();
      const alt_text = this.els.editHeroInputAlt?.value?.trim();
      const description = this.els.editHeroInputDesc?.value?.trim();

      if (!title) {
        this.toast?.show('Judul / nama foto tidak boleh kosong', 'warning');
        return;
      }

      const saveBtn = this.els.btnSaveEditHero;
      const originalText = saveBtn ? saveBtn.innerHTML : '';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="btn-spinner"></span> Menyimpan...';
      }

      try {
        await this.heroService.updateHeroImage(
          this.editingHero.id,
          {
            title,
            subtitle,
            alt_text,
            description,
            is_active: true
          },
          this.stagedNewFile,
          this.editingHero.image_url,
          (percent, msg) => {
            if (saveBtn) saveBtn.innerHTML = `<span class="btn-spinner"></span> ${msg}`;
          }
        );

        this.toast?.show('Foto Hero & Profil berhasil diperbarui!', 'success');

        if (this.els.editHeroModal) {
          this.els.editHeroModal.classList.remove('active');
        } else if (this.modal?.close) {
          this.modal.close('editHeroModal');
        }

        await this.loadHeroData();
      } catch (err) {
        console.error('[HeroView] Gagal menyimpan edit:', err);
        this.toast?.show('Gagal menyimpan: ' + (err.message || 'Error tidak diketahui'), 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalText;
        }
      }
    }
  }

  global.MBell.HeroView = HeroView;
})(typeof window !== 'undefined' ? window : this);

