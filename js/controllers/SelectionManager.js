/**
 * Selection Manager & Bulk Actions Controller
 * MBell MakeUp Portfolio Studio
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class SelectionManager {
    constructor({ store, photoService, modalManager, toast, events }) {
      this.store = store;
      this.photoService = photoService || global.MBell.photoServiceInstance;
      this.modal = modalManager || global.MBell.modalManagerInstance;
      this.toast = toast || global.MBell.toastInstance;
      this.events = events;

      this.bindEvents();
    }

    get elements() {
      return {
        photoGrid: document.getElementById('photoGrid'),
        btnToggleSelectMode: document.getElementById('btnToggleSelectMode'),
        btnToggleSelectModeText: document.getElementById('btnToggleSelectModeText'),
        bulkActionBar: document.getElementById('bulkActionBar'),
        bulkSelectedCount: document.getElementById('bulkSelectedCount'),
        bulkDeleteCount: document.getElementById('bulkDeleteCount'),
        btnBulkSelectAll: document.getElementById('btnBulkSelectAll'),
        btnBulkCancel: document.getElementById('btnBulkCancel'),
        btnBulkDelete: document.getElementById('btnBulkDelete'),
        btnBulkOpenEditCategory: document.getElementById('btnBulkOpenEditCategory'),

        bulkCategoryModal: document.getElementById('bulkCategoryModal'),
        bulkCatPhotoCount: document.getElementById('bulkCatPhotoCount'),
        bulkCatThumbsPreview: document.getElementById('bulkCatThumbsPreview'),
        bulkTargetCategorySelect: document.getElementById('bulkTargetCategorySelect'),
        bulkCatChipsGrid: document.getElementById('bulkCatChipsGrid'),
        btnSaveBulkCategory: document.getElementById('btnSaveBulkCategory')
      };
    }

    bindEvents() {
      const els = this.elements;

      if (els.btnToggleSelectMode) {
        els.btnToggleSelectMode.addEventListener('click', () => {
          const { isSelectionMode } = this.store.getState();
          if (isSelectionMode) {
            this.exitSelectionMode();
          } else {
            this.enterSelectionMode();
          }
        });
      }

      if (els.btnBulkSelectAll) {
        els.btnBulkSelectAll.addEventListener('click', () => this.selectAllPhotos(true));
      }

      if (els.btnBulkCancel) {
        els.btnBulkCancel.addEventListener('click', () => this.exitSelectionMode());
      }

      if (els.btnBulkDelete) {
        els.btnBulkDelete.addEventListener('click', () => this.handleBulkDelete());
      }

      if (els.btnBulkOpenEditCategory) {
        els.btnBulkOpenEditCategory.addEventListener('click', () => this.openBulkCategoryModal());
      }

      if (els.bulkTargetCategorySelect) {
        els.bulkTargetCategorySelect.addEventListener('change', (e) => {
          const selectedCat = e.target.value;
          const chips = this.elements.bulkCatChipsGrid;
          if (chips) {
            chips.querySelectorAll('.bulk-cat-chip').forEach(c => {
              c.classList.toggle('selected', c.dataset.cat === selectedCat);
            });
          }
        });
      }

      if (els.btnSaveBulkCategory) {
        els.btnSaveBulkCategory.addEventListener('click', () => this.handleSaveBulkCategory());
      }

      this.events.on('photo:longpress', ({ photoId }) => {
        this.enterSelectionMode(photoId);
      });

      this.events.on('photo:doubleclick', ({ photoId }) => {
        this.enterSelectionMode(photoId);
      });

      this.events.on('photo:select-toggle', (photoId) => {
        this.togglePhotoSelection(photoId);
      });
    }

    enterSelectionMode(initialPhotoId = null) {
      this.store.setState({ isSelectionMode: true });

      const els = this.elements;
      if (els.photoGrid) els.photoGrid.classList.add('selection-mode-active');
      document.body.classList.add('selection-mode-active');

      if (els.btnToggleSelectModeText) {
        els.btnToggleSelectModeText.textContent = '✕ Selesai';
      }

      if (initialPhotoId) {
        const id = isNaN(initialPhotoId) ? initialPhotoId : Number(initialPhotoId);
        const { selectedPhotoIds } = this.store.getState();
        selectedPhotoIds.add(id);
        this.store.setState({ selectedPhotoIds });

        const card = els.photoGrid?.querySelector(`.photo-card[data-id="${id}"]`);
        if (card) {
          card.classList.add('selected');
          const icon = card.querySelector('.photo-checkbox svg');
          if (icon) icon.setAttribute('stroke', '#FFF');
        }
      }

      this.updateBulkActionBar();
    }

    exitSelectionMode() {
      const { selectedPhotoIds } = this.store.getState();
      selectedPhotoIds.clear();
      this.store.setState({
        isSelectionMode: false,
        selectedPhotoIds
      });

      const els = this.elements;
      if (els.photoGrid) els.photoGrid.classList.remove('selection-mode-active');
      document.body.classList.remove('selection-mode-active');

      if (els.btnToggleSelectModeText) {
        els.btnToggleSelectModeText.textContent = 'Pilih Foto';
      }

      if (els.photoGrid) {
        els.photoGrid.querySelectorAll('.photo-card').forEach(card => {
          card.classList.remove('selected');
          const icon = card.querySelector('.photo-checkbox svg');
          if (icon) icon.setAttribute('stroke', 'transparent');
        });
      }

      this.updateBulkActionBar();
    }

    togglePhotoSelection(photoId) {
      const id = isNaN(photoId) ? photoId : Number(photoId);
      const { selectedPhotoIds } = this.store.getState();

      if (selectedPhotoIds.has(id)) {
        selectedPhotoIds.delete(id);
      } else {
        selectedPhotoIds.add(id);
      }
      this.store.setState({ selectedPhotoIds });

      const els = this.elements;
      const card = els.photoGrid?.querySelector(`.photo-card[data-id="${id}"]`);
      if (card) {
        const isSelected = selectedPhotoIds.has(id);
        card.classList.toggle('selected', isSelected);
        const icon = card.querySelector('.photo-checkbox svg');
        if (icon) {
          icon.setAttribute('stroke', isSelected ? '#FFF' : 'transparent');
        }
      }

      this.updateBulkActionBar();
    }

    selectAllPhotos(selectAll = true) {
      const { photos, selectedPhotoIds } = this.store.getState();

      if (selectAll) {
        photos.forEach(p => selectedPhotoIds.add(p.id));
      } else {
        selectedPhotoIds.clear();
      }
      this.store.setState({ selectedPhotoIds });

      const els = this.elements;
      if (els.photoGrid) {
        els.photoGrid.querySelectorAll('.photo-card').forEach(card => {
          const id = isNaN(card.dataset.id) ? card.dataset.id : Number(card.dataset.id);
          const isSelected = selectedPhotoIds.has(id);
          card.classList.toggle('selected', isSelected);
          const icon = card.querySelector('.photo-checkbox svg');
          if (icon) {
            icon.setAttribute('stroke', isSelected ? '#FFF' : 'transparent');
          }
        });
      }

      this.updateBulkActionBar();
    }

    updateBulkActionBar() {
      const { selectedPhotoIds } = this.store.getState();
      const count = selectedPhotoIds.size;
      const els = this.elements;

      if (els.bulkSelectedCount) els.bulkSelectedCount.textContent = count;
      if (els.bulkDeleteCount) els.bulkDeleteCount.textContent = count;

      if (count > 0) {
        if (els.bulkActionBar) els.bulkActionBar.classList.add('active');
      } else {
        if (els.bulkActionBar) els.bulkActionBar.classList.remove('active');
      }
    }

    async handleBulkDelete() {
      const { selectedPhotoIds, photos } = this.store.getState();
      const count = selectedPhotoIds.size;
      if (count === 0) return;

      const photosToDelete = photos.filter(p => selectedPhotoIds.has(p.id));
      if (photosToDelete.length === 0) return;

      const confirmed = await this.modal.confirm({
        title: 'Hapus Banyak Foto Portofolio',
        message: `Apakah Anda yakin ingin menghapus ${count} foto yang dipilih sekaligus?`,
        warning: 'PERINGATAN: Semua file fisik di Supabase Storage dan data di database akan dihapus permanen.',
        confirmText: `Ya, Hapus ${count} Foto`,
        isDanger: true
      });

      if (!confirmed) return;

      const els = this.elements;
      try {
        if (els.btnBulkDelete) {
          els.btnBulkDelete.disabled = true;
          els.btnBulkDelete.innerHTML = `
            <svg class="spin-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke-opacity="0.3"></circle>
              <path d="M12 3a9 9 0 0 1 9 9" stroke-linecap="round"></path>
            </svg>
            <span class="bulk-btn-text">Menghapus...</span>
          `;
        }

        const res = await this.photoService.deletePhotosBatch(photosToDelete);
        this.toast.show(`Sukses menghapus ${res.deletedCount} foto portofolio!`, 'success');

        this.exitSelectionMode();
        this.events.emit('photos:bulk-deleted');
      } catch (err) {
        console.error('[SelectionManager] Gagal hapus banyak foto:', err);
        this.toast.show(`Gagal menghapus foto: ${err.message}`, 'error');
      } finally {
        if (els.btnBulkDelete) {
          els.btnBulkDelete.disabled = false;
          els.btnBulkDelete.innerHTML = `
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            <span class="bulk-btn-text">Hapus (<span id="bulkDeleteCount">${this.store.getState().selectedPhotoIds.size}</span>) Foto</span>
          `;
        }
      }
    }

    openBulkCategoryModal() {
      const { selectedPhotoIds, photos, categories, activeCategory } = this.store.getState();
      const count = selectedPhotoIds.size;
      if (count === 0) return;

      const selectedPhotos = photos.filter(p => selectedPhotoIds.has(p.id));
      if (selectedPhotos.length === 0) return;

      const els = this.elements;
      if (els.bulkCatPhotoCount) els.bulkCatPhotoCount.textContent = count;

      const maxThumbnails = 8;
      const shownPhotos = selectedPhotos.slice(0, maxThumbnails);
      let thumbsHtml = shownPhotos.map(p => `
        <img class="bulk-thumb-mini" src="${p.imageUrl}" alt="${p.title}" title="${p.title}">
      `).join('');

      if (count > maxThumbnails) {
        thumbsHtml += `<div class="bulk-thumb-more">+${count - maxThumbnails}</div>`;
      }
      if (els.bulkCatThumbsPreview) els.bulkCatThumbsPreview.innerHTML = thumbsHtml;

      const optionsHtml = categories.map(c => `
        <option value="${c.name}">${c.name}</option>
      `).join('');

      if (els.bulkTargetCategorySelect) {
        els.bulkTargetCategorySelect.innerHTML = optionsHtml;
        const initialCat = (activeCategory !== 'all')
          ? activeCategory
          : (categories[0] ? categories[0].name : '');
        els.bulkTargetCategorySelect.value = initialCat;
        this.renderBulkCategoryChips(initialCat);
      }

      if (els.bulkCategoryModal) els.bulkCategoryModal.classList.add('active');
    }

    renderBulkCategoryChips(activeCatName) {
      const els = this.elements;
      if (!els.bulkCatChipsGrid) return;
      const { categories } = this.store.getState();

      els.bulkCatChipsGrid.innerHTML = categories.map(cat => {
        const isSel = cat.name === activeCatName ? 'selected' : '';
        return `
          <div class="bulk-cat-chip ${isSel}" data-cat="${cat.name}">
            ${cat.name}
          </div>
        `;
      }).join('');

      els.bulkCatChipsGrid.querySelectorAll('.bulk-cat-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const catName = chip.dataset.cat;
          if (els.bulkTargetCategorySelect) {
            els.bulkTargetCategorySelect.value = catName;
          }
          els.bulkCatChipsGrid.querySelectorAll('.bulk-cat-chip').forEach(c => {
            c.classList.toggle('selected', c.dataset.cat === catName);
          });
        });
      });
    }

    async handleSaveBulkCategory() {
      const els = this.elements;
      if (!els.bulkTargetCategorySelect) return;
      const targetCategory = els.bulkTargetCategorySelect.value;
      if (!targetCategory) {
        this.toast.show('Pilih kategori tujuan terlebih dahulu', 'error');
        return;
      }

      const { selectedPhotoIds, photos } = this.store.getState();
      const photoIds = Array.from(selectedPhotoIds);
      const selectedPhotos = photos.filter(p => selectedPhotoIds.has(p.id));

      try {
        if (els.btnSaveBulkCategory) {
          els.btnSaveBulkCategory.disabled = true;
          els.btnSaveBulkCategory.textContent = 'Memindahkan...';
        }

        const res = await this.photoService.updatePhotosCategoryBatch(
          selectedPhotos.length > 0 ? selectedPhotos : photoIds,
          targetCategory
        );
        this.toast.show(`Berhasil memindahkan ${res.updatedCount} foto ke kategori "${targetCategory}"!`, 'success');

        if (els.bulkCategoryModal) els.bulkCategoryModal.classList.remove('active');
        this.exitSelectionMode();

        this.events.emit('photos:bulk-moved', targetCategory);
      } catch (err) {
        console.error('[SelectionManager] Gagal memindahkan kategori:', err);
        this.toast.show(`Gagal memindahkan kategori: ${err.message}`, 'error');
      } finally {
        if (els.btnSaveBulkCategory) {
          els.btnSaveBulkCategory.disabled = false;
          els.btnSaveBulkCategory.textContent = 'Simpan & Pindahkan';
        }
      }
    }
  }

  global.MBell.SelectionManager = SelectionManager;
})(typeof window !== 'undefined' ? window : this);
