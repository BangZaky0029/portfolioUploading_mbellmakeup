/**
 * Catalogue View Component
 * Mengelola antarmuka mode Katalog Brosur & S&K:
 * - Menampilkan daftar kartu brosur (rasio portrait flyer) dengan order badge, status pill, dan tombol aksi
 * - Form upload brosur katalog baru dengan file preview, label, short_title, badge, order_index, description, wa_query
 * - Modal edit brosur (#editCatalogueModal) dengan opsi ganti file gambar
 * - Integrasi Lightbox preview dan konfirmasi hapus via ModalManager
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class CatalogueView {
    constructor(options = {}) {
      this.catalogueService = options.catalogueService || global.MBell.catalogueServiceInstance;
      this.modal = options.modalManager || global.MBell.modalManagerInstance;
      this.toast = options.toast || global.MBell.toastInstance;
      this.lightbox = options.lightbox || global.MBell.lightboxInstance;
      this.events = options.events;

      this.catalogues = [];
      this.selectedFile = null;
      this.editSelectedFile = null;

      this.initElements();
      this.bindEvents();
    }

    initElements() {
      this.els = {
        // Mode Switcher Tabs
        modeSwitcherContainer: document.getElementById('modeSwitcherContainer') || document.querySelector('.mode-switcher-container'),
        tabModePortfolio: document.getElementById('tabModePortfolio'),
        tabModeCatalogue: document.getElementById('tabModeCatalogue'),
        tabModeHero: document.getElementById('tabModeHero'),
        portfolioView: document.getElementById('portfolioView'),
        catalogueView: document.getElementById('catalogueView'),
        heroView: document.getElementById('heroView'),

        // Catalogue Upload Elements
        catDropzone: document.getElementById('catDropzone'),
        catFileInput: document.getElementById('catFileInput'),
        catStagingBox: document.getElementById('catStagingBox'),
        catStagingImg: document.getElementById('catStagingImg'),
        catStagingName: document.getElementById('catStagingName'),
        catStagingSize: document.getElementById('catStagingSize'),
        btnCatClearFile: document.getElementById('btnCatClearFile'),

        catInputLabel: document.getElementById('catInputLabel'),
        catInputShortTitle: document.getElementById('catInputShortTitle'),
        catSelectBadge: document.getElementById('catSelectBadge'),
        catInputOrder: document.getElementById('catInputOrder'),
        catInputDesc: document.getElementById('catInputDesc'),
        catInputWaQuery: document.getElementById('catInputWaQuery'),
        btnUploadCatalogue: document.getElementById('btnUploadCatalogue'),

        catUploadProgressBox: document.getElementById('catUploadProgressBox'),
        catUploadProgressText: document.getElementById('catUploadProgressText'),
        catUploadProgressBar: document.getElementById('catUploadProgressBar'),
        catUploadProgressPercent: document.getElementById('catUploadProgressPercent'),

        // Catalogue Grid & Header Elements
        catalogueGrid: document.getElementById('catalogueGrid'),
        catalogueCount: document.getElementById('catalogueCount'),
        btnRefreshCatalogue: document.getElementById('btnRefreshCatalogue'),

        // Edit Modal Elements
        editCatalogueModal: document.getElementById('editCatalogueModal'),
        editCatId: document.getElementById('editCatId'),
        editCatOldImageUrl: document.getElementById('editCatOldImageUrl'),
        editCatLabel: document.getElementById('editCatLabel'),
        editCatShortTitle: document.getElementById('editCatShortTitle'),
        editCatBadge: document.getElementById('editCatBadge'),
        editCatOrder: document.getElementById('editCatOrder'),
        editCatDesc: document.getElementById('editCatDesc'),
        editCatWaQuery: document.getElementById('editCatWaQuery'),
        editCatCurrentImg: document.getElementById('editCatCurrentImg'),
        editCatFileInput: document.getElementById('editCatFileInput'),
        editCatNewFileText: document.getElementById('editCatNewFileText'),
        btnSaveEditCatalogue: document.getElementById('btnSaveEditCatalogue')
      };
    }

    bindEvents() {
      // 1. Mode Switcher Tabs (Portfolio <-> Catalogue <-> Hero & Profil)
      if (this.els.tabModePortfolio && this.els.tabModeCatalogue) {
        this.els.tabModePortfolio.addEventListener('click', () => this.switchMode('portfolio'));
        this.els.tabModeCatalogue.addEventListener('click', () => this.switchMode('catalogue'));
      }
      if (this.els.tabModeHero) {
        this.els.tabModeHero.addEventListener('click', () => this.switchMode('hero'));
      }

      // Responsive DOM teleportation (Desktop in header, Mobile floating at viewport bottom)
      this.setupResponsiveModeSwitcher();

      // 2. Dropzone & File Input Upload
      if (this.els.catDropzone && this.els.catFileInput) {
        this.els.catDropzone.addEventListener('click', () => this.els.catFileInput.click());

        this.els.catFileInput.addEventListener('change', (e) => {
          const file = e.target.files?.[0];
          if (file) this.handleSelectFile(file);
        });

        // Drag & drop listeners
        ['dragenter', 'dragover'].forEach(name => {
          this.els.catDropzone.addEventListener(name, (e) => {
            e.preventDefault();
            this.els.catDropzone.classList.add('drag-over');
          });
        });

        ['dragleave', 'drop'].forEach(name => {
          this.els.catDropzone.addEventListener(name, (e) => {
            e.preventDefault();
            this.els.catDropzone.classList.remove('drag-over');
          });
        });

        this.els.catDropzone.addEventListener('drop', (e) => {
          const file = e.dataTransfer?.files?.[0];
          if (file) this.handleSelectFile(file);
        });
      }

      if (this.els.btnCatClearFile) {
        this.els.btnCatClearFile.addEventListener('click', () => this.clearSelectedFile());
      }

      // 3. Auto-suggest WhatsApp Query based on label input
      if (this.els.catInputLabel && this.els.catInputWaQuery) {
        this.els.catInputLabel.addEventListener('input', (e) => {
          const val = e.target.value.trim();
          if (val && (!this.els.catInputWaQuery.value || this.els.catInputWaQuery.dataset.autofilled === 'true')) {
            this.els.catInputWaQuery.value = `Halo MBell MakeUp, saya ingin konsultasi mengenai ${val}. Boleh minta info detail ketersediaan tanggal dan layanannya?`;
            this.els.catInputWaQuery.dataset.autofilled = 'true';
          }
        });

        this.els.catInputWaQuery.addEventListener('focus', () => {
          this.els.catInputWaQuery.dataset.autofilled = 'false';
        });
      }

      // 4. Submit Upload Catalogue
      if (this.els.btnUploadCatalogue) {
        this.els.btnUploadCatalogue.addEventListener('click', () => this.handleUploadSubmit());
      }

      // 5. Refresh Catalogue Grid
      if (this.els.btnRefreshCatalogue) {
        this.els.btnRefreshCatalogue.addEventListener('click', () => {
          this.loadCatalogueList();
          this.toast?.show('Daftar brosur katalog diperbarui', 'info');
        });
      }

      // 6. Edit Modal: Replace Image File Input
      if (this.els.editCatFileInput) {
        this.els.editCatFileInput.addEventListener('change', (e) => {
          const file = e.target.files?.[0];
          if (file) {
            this.editSelectedFile = file;
            if (this.els.editCatNewFileText) {
              this.els.editCatNewFileText.textContent = `File baru dipilih: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
            }
          }
        });
      }

      // 7. Edit Modal: Save Button
      if (this.els.btnSaveEditCatalogue) {
        this.els.btnSaveEditCatalogue.addEventListener('click', () => this.handleSaveEditSubmit());
      }
    }

    /**
     * Pastikan Switcher Mode selalu berada di DOM body saat mobile (agar floating bottom 100% bebas dari efek containing block header)
     * dan kembali ke dalam .header-container saat desktop (> 860px).
     */
    setupResponsiveModeSwitcher() {
      const switcher = this.els.modeSwitcherContainer;
      const headerContainer = document.querySelector('.header-container');
      const headerStats = document.querySelector('.header-stats');
      if (!switcher || !headerContainer) return;

      const reposition = () => {
        const isMobile = window.innerWidth <= 860;
        if (isMobile) {
          if (switcher.parentElement !== document.body) {
            document.body.appendChild(switcher);
          }
        } else {
          if (switcher.parentElement !== headerContainer) {
            if (headerStats) {
              headerContainer.insertBefore(switcher, headerStats);
            } else {
              headerContainer.appendChild(switcher);
            }
          }
        }
      };

      reposition();
      window.addEventListener('resize', reposition, { passive: true });
    }

    switchMode(mode) {
      const { portfolioView, catalogueView, heroView, tabModePortfolio, tabModeCatalogue, tabModeHero } = this.els;

      // 1. Reset semua view ke kondisi tersembunyi
      if (portfolioView) {
        portfolioView.classList.add('hidden-view');
        portfolioView.style.display = 'none';
      }
      if (catalogueView) {
        catalogueView.classList.add('hidden-view');
        catalogueView.style.display = 'none';
      }
      if (heroView) {
        heroView.classList.add('hidden-view');
        heroView.style.display = 'none';
      }

      // 2. Reset active tab classes
      tabModePortfolio?.classList.remove('active');
      tabModeCatalogue?.classList.remove('active');
      tabModeHero?.classList.remove('active');

      // 3. Aktifkan view yang dipilih
      if (mode === 'catalogue') {
        if (catalogueView) {
          catalogueView.classList.remove('hidden-view');
          catalogueView.style.display = '';
        }
        tabModeCatalogue?.classList.add('active');
        this.loadCatalogueList();
      } else if (mode === 'hero') {
        if (heroView) {
          heroView.classList.remove('hidden-view');
          heroView.style.display = '';
        }
        tabModeHero?.classList.add('active');
        if (global.app?.heroView) {
          global.app.heroView.loadHeroData();
        }
      } else {
        if (portfolioView) {
          portfolioView.classList.remove('hidden-view');
          portfolioView.style.display = '';
        }
        tabModePortfolio?.classList.add('active');
      }
    }

    handleSelectFile(file) {
      if (!file.type.startsWith('image/')) {
        this.toast?.show('File harus berupa gambar (JPG, PNG, WebP)', 'warning');
        return;
      }

      const maxMb = Number(global.MBell?.CONFIG?.MAX_FILE_SIZE_MB) || 30;
      if (file.size > maxMb * 1024 * 1024) {
        this.toast?.show(`Ukuran file melebihi batas maksimal ${maxMb}MB`, 'error');
        return;
      }

      this.selectedFile = file;

      if (this.els.catStagingBox && this.els.catStagingImg) {
        this.els.catStagingImg.src = URL.createObjectURL(file);
        if (this.els.catStagingName) this.els.catStagingName.textContent = file.name;
        if (this.els.catStagingSize) {
          this.els.catStagingSize.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
        }
        this.els.catStagingBox.style.display = 'flex';
      }

      // Default label if empty
      if (this.els.catInputLabel && !this.els.catInputLabel.value) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        this.els.catInputLabel.value = cleanName;
        if (this.els.catInputWaQuery && !this.els.catInputWaQuery.value) {
          this.els.catInputWaQuery.value = `Halo MBell MakeUp, saya ingin konsultasi mengenai ${cleanName}. Boleh minta info detail ketersediaan tanggal dan layanannya?`;
        }
      }
    }

    clearSelectedFile() {
      this.selectedFile = null;
      if (this.els.catFileInput) this.els.catFileInput.value = '';
      if (this.els.catStagingBox) this.els.catStagingBox.style.display = 'none';
      if (this.els.catStagingImg) this.els.catStagingImg.src = '';
    }

    async handleUploadSubmit() {
      if (!this.selectedFile) {
        this.toast?.show('Pilih file gambar brosur terlebih dahulu', 'warning');
        return;
      }

      const label = this.els.catInputLabel?.value.trim();
      if (!label) {
        this.toast?.show('Harap isi Judul Paket Katalog', 'warning');
        this.els.catInputLabel?.focus();
        return;
      }

      const shortTitle = this.els.catInputShortTitle?.value.trim() || 'Paket Riasan';
      const badge = this.els.catSelectBadge?.value || 'Popular';
      const orderIndex = Number(this.els.catInputOrder?.value) || (this.catalogues.length + 1);
      const description = this.els.catInputDesc?.value.trim() || '';
      const waQuery = this.els.catInputWaQuery?.value.trim() || `Halo MBell MakeUp, saya ingin tanya mengenai ${label}.`;

      const metadata = {
        label,
        short_title: shortTitle,
        badge,
        order_index: orderIndex,
        description,
        wa_query: waQuery
      };

      try {
        this.setUploadProgress(true, 10, 'Menyiapkan upload...');
        if (this.els.btnUploadCatalogue) this.els.btnUploadCatalogue.disabled = true;

        await this.catalogueService.uploadCatalogue(
          this.selectedFile,
          metadata,
          (percent, text) => this.setUploadProgress(true, percent, text)
        );

        this.toast?.show(`Brosur "${label}" berhasil diunggah!`, 'success');
        this.resetUploadForm();
        await this.loadCatalogueList();
      } catch (err) {
        console.error('[CatalogueView] Gagal upload:', err);
        this.toast?.show(`Gagal upload brosur: ${err.message}`, 'error');
      } finally {
        this.setUploadProgress(false);
        if (this.els.btnUploadCatalogue) this.els.btnUploadCatalogue.disabled = false;
      }
    }

    setUploadProgress(show, percent = 0, text = 'Mengunggah...') {
      if (!this.els.catUploadProgressBox) return;
      if (show) {
        this.els.catUploadProgressBox.style.display = 'block';
        if (this.els.catUploadProgressBar) this.els.catUploadProgressBar.style.width = `${percent}%`;
        if (this.els.catUploadProgressPercent) this.els.catUploadProgressPercent.textContent = `${percent}%`;
        if (this.els.catUploadProgressText) this.els.catUploadProgressText.textContent = text;
      } else {
        this.els.catUploadProgressBox.style.display = 'none';
      }
    }

    resetUploadForm() {
      this.clearSelectedFile();
      if (this.els.catInputLabel) this.els.catInputLabel.value = '';
      if (this.els.catInputShortTitle) this.els.catInputShortTitle.value = '';
      if (this.els.catInputDesc) this.els.catInputDesc.value = '';
      if (this.els.catInputWaQuery) this.els.catInputWaQuery.value = '';
      if (this.els.catInputOrder) this.els.catInputOrder.value = this.catalogues.length + 1;
    }

    async loadCatalogueList() {
      if (!this.els.catalogueGrid) return;

      this.els.catalogueGrid.innerHTML = `
        <div class="catalogue-loading" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
          <div class="loading-spinner" style="width: 32px; height: 32px; margin: 0 auto 1rem; border: 3px solid rgba(158,90,84,0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <p style="font-size: 0.9rem; font-weight: 500;">Memuat daftar katalog brosur dari Supabase...</p>
        </div>
      `;

      try {
        const data = await this.catalogueService.getCatalogues();
        this.catalogues = data || [];
        this.renderCatalogues(this.catalogues);

        if (this.els.catalogueCount) {
          this.els.catalogueCount.textContent = this.catalogues.length;
        }

        // Auto-increment default order for next upload
        if (this.els.catInputOrder && (!this.els.catInputOrder.value || this.els.catInputOrder.value === '1')) {
          this.els.catInputOrder.value = this.catalogues.length + 1;
        }
      } catch (err) {
        console.error('[CatalogueView] Gagal load katalog:', err);
        this.els.catalogueGrid.innerHTML = `
          <div class="catalogue-error" style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; background: #FFF5F5; border: 1px solid #FED7D7; border-radius: 12px; color: #C53030;">
            <p style="font-weight: 600; margin-bottom: 0.5rem;">Gagal memuat katalog dari database</p>
            <p style="font-size: 0.85rem; color: #742A2A;">${err.message || 'Periksa koneksi Supabase atau pastikan tabel public.catalogue sudah dibuat.'}</p>
          </div>
        `;
        this.toast?.show('Gagal memuat data katalog', 'error');
      }
    }

    renderCatalogues(items) {
      if (!this.els.catalogueGrid) return;

      if (!items || items.length === 0) {
        this.els.catalogueGrid.innerHTML = `
          <div class="catalogue-empty" style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1.5rem; background: var(--bg-card); border: 2px dashed var(--border-color); border-radius: 16px;">
            <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📑</div>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-dark); margin-bottom: 0.35rem;">Belum Ada Brosur Katalog</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); max-w: 420px; margin: 0 auto 1.25rem;">
              Silakan unggah brosur pricelist atau dokumen Syarat & Ketentuan menggunakan form di sebelah kiri.
            </p>
          </div>
        `;
        return;
      }

      const cardsHtml = items.map((item, index) => {
        const safeLabel = this.escapeHtml(item.label || 'Katalog Paket');
        const safeShort = this.escapeHtml(item.short_title || '');
        const safeDesc = this.escapeHtml(item.description || '-');
        const safeBadge = this.escapeHtml(item.badge || 'Popular');
        const orderIndex = item.order_index !== undefined ? item.order_index : (index + 1);

        return `
          <div class="catalogue-card" data-cat-id="${item.id}">
            <!-- Thumbnail Flyer Container -->
            <div class="catalogue-card-thumb-wrapper">
              <img src="${item.image_url}" alt="${safeLabel}" loading="lazy" class="catalogue-card-img" />
              
              <!-- Order Index Pill -->
              <span class="catalogue-order-badge" title="Urutan ke-${orderIndex}">#${orderIndex}</span>

              <!-- Badge Pill -->
              <span class="catalogue-status-badge badge-${safeBadge.toLowerCase()}">${safeBadge}</span>

              <!-- Quick Hover View Button -->
              <button type="button" class="catalogue-quick-view-btn" data-action="preview" data-id="${item.id}" title="Perbesar Brosur">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>

            <!-- Card Body Content -->
            <div class="catalogue-card-body">
              <div class="catalogue-card-header">
                <h4 class="catalogue-card-title">${safeLabel}</h4>
                <span class="catalogue-card-short">${safeShort}</span>
              </div>

              <p class="catalogue-card-desc" title="${safeDesc}">${safeDesc}</p>

              <!-- Action Buttons -->
              <div class="catalogue-card-actions">
                <button type="button" class="btn btn-sm btn-secondary" data-action="preview" data-id="${item.id}" title="Lihat Ukuran Penuh">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Preview</span>
                </button>

                <button type="button" class="btn btn-sm btn-secondary" data-action="edit" data-id="${item.id}" title="Edit Rincian Paket">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>

                <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="${item.id}" title="Hapus Brosur">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      this.els.catalogueGrid.innerHTML = cardsHtml;

      // Bind action events on rendered cards
      this.els.catalogueGrid.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const id = btn.dataset.id;
          const item = this.catalogues.find(c => String(c.id) === String(id));
          if (!item) return;

          if (action === 'preview') {
            this.handlePreviewCatalogue(item);
          } else if (action === 'edit') {
            this.openEditModal(item);
          } else if (action === 'delete') {
            this.handleDeleteCatalogue(item);
          }
        });
      });
    }

    handlePreviewCatalogue(item) {
      if (this.lightbox) {
        this.lightbox.open({
          title: item.label,
          category: item.short_title || 'Brosur Katalog',
          imageUrl: item.image_url,
          id: item.id
        });
      } else {
        window.open(item.image_url, '_blank');
      }
    }

    openEditModal(item) {
      if (!this.els.editCatalogueModal) return;

      this.editSelectedFile = null;
      if (this.els.editCatFileInput) this.els.editCatFileInput.value = '';
      if (this.els.editCatNewFileText) this.els.editCatNewFileText.textContent = '';

      if (this.els.editCatId) this.els.editCatId.value = item.id;
      if (this.els.editCatOldImageUrl) this.els.editCatOldImageUrl.value = item.image_url || '';
      if (this.els.editCatLabel) this.els.editCatLabel.value = item.label || '';
      if (this.els.editCatShortTitle) this.els.editCatShortTitle.value = item.short_title || '';
      if (this.els.editCatBadge) this.els.editCatBadge.value = item.badge || 'Popular';
      if (this.els.editCatOrder) this.els.editCatOrder.value = item.order_index ?? 0;
      if (this.els.editCatDesc) this.els.editCatDesc.value = item.description || '';
      if (this.els.editCatWaQuery) this.els.editCatWaQuery.value = item.wa_query || '';
      if (this.els.editCatCurrentImg) this.els.editCatCurrentImg.src = item.image_url || '';

      this.els.editCatalogueModal.classList.add('active');
    }

    async handleSaveEditSubmit() {
      const id = this.els.editCatId?.value;
      if (!id) return;

      const label = this.els.editCatLabel?.value.trim();
      if (!label) {
        this.toast?.show('Judul brosur paket tidak boleh kosong', 'warning');
        return;
      }

      const shortTitle = this.els.editCatShortTitle?.value.trim() || '';
      const badge = this.els.editCatBadge?.value || 'Popular';
      const orderIndex = Number(this.els.editCatOrder?.value) || 0;
      const description = this.els.editCatDesc?.value.trim() || '';
      const waQuery = this.els.editCatWaQuery?.value.trim() || '';
      const oldImageUrl = this.els.editCatOldImageUrl?.value;

      const updates = {
        label,
        short_title: shortTitle,
        badge,
        order_index: orderIndex,
        description,
        wa_query: waQuery
      };

      try {
        if (this.els.btnSaveEditCatalogue) {
          this.els.btnSaveEditCatalogue.disabled = true;
          this.els.btnSaveEditCatalogue.textContent = 'Menyimpan...';
        }

        await this.catalogueService.updateCatalogue(
          id,
          updates,
          this.editSelectedFile,
          oldImageUrl
        );

        this.toast?.show(`Brosur "${label}" berhasil diperbarui!`, 'success');
        this.els.editCatalogueModal?.classList.remove('active');
        await this.loadCatalogueList();
      } catch (err) {
        console.error('[CatalogueView] Gagal simpan edit:', err);
        this.toast?.show(`Gagal menyimpan perubahan: ${err.message}`, 'error');
      } finally {
        if (this.els.btnSaveEditCatalogue) {
          this.els.btnSaveEditCatalogue.disabled = false;
          this.els.btnSaveEditCatalogue.textContent = 'Simpan Perubahan';
        }
      }
    }

    async handleDeleteCatalogue(item) {
      const confirmed = await this.modal?.confirm({
        title: 'Hapus Brosur Katalog',
        message: `Apakah Anda yakin ingin menghapus "${item.label}" (${item.short_title})?`,
        preview: {
          thumb: item.image_url,
          title: item.label,
          meta: `Urutan #${item.order_index} • Tag: ${item.badge}`
        },
        warning: 'Brosur akan dihapus permanen dari Supabase Storage dan website client mbell-1 akan langsung menyesuaikan.',
        confirmText: 'Ya, Hapus Brosur',
        isDanger: true
      });

      if (!confirmed) return;

      try {
        await this.catalogueService.deleteCatalogue(item.id, item.image_url);
        this.toast?.show(`Brosur "${item.label}" berhasil dihapus`, 'success');
        await this.loadCatalogueList();
      } catch (err) {
        console.error('[CatalogueView] Gagal hapus:', err);
        this.toast?.show(`Gagal menghapus brosur: ${err.message}`, 'error');
      }
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  global.MBell.CatalogueView = CatalogueView;
})(window);
