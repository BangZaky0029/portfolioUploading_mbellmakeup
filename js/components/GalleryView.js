/**
 * Gallery View & Photo Card Renderer
 * MBell MakeUp Portfolio Studio
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class GalleryView {
    constructor({ store, events, modalManager, toast }) {
      this.store = store;
      this.events = events;
      this.modal = modalManager || global.MBell.modalManagerInstance;
      this.toast = toast || global.MBell.toastInstance;

      this.fallbackBrokenImage = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23F0EAE6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%23999%22%20font-size%3D%2212%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3EFoto%20Rusak%3C%2Ftext%3E%3C%2Fsvg%3E";

      this.bindEditModalEvents();
    }

    get elements() {
      return {
        photoGrid: document.getElementById('photoGrid'),
        visiblePhotoCount: document.getElementById('visiblePhotoCount'),
        editModal: document.getElementById('editModal'),
        editPhotoId: document.getElementById('editPhotoId'),
        editPhotoIdLabel: document.getElementById('editPhotoIdLabel'),
        editPhotoThumb: document.getElementById('editPhotoThumb'),
        editPhotoUrlLabel: document.getElementById('editPhotoUrlLabel'),
        editPhotoTitle: document.getElementById('editPhotoTitle'),
        editPhotoCategory: document.getElementById('editPhotoCategory'),
        editPhotoDesc: document.getElementById('editPhotoDesc'),
        editPhotoDetails: document.getElementById('editPhotoDetails'),
        btnSaveEditPhoto: document.getElementById('btnSaveEditPhoto')
      };
    }

    bindEditModalEvents() {
      const els = this.elements;
      if (!els.btnSaveEditPhoto) return;

      els.btnSaveEditPhoto.addEventListener('click', () => {
        const id = els.editPhotoId.value;
        const title = els.editPhotoTitle.value.trim();
        const category = els.editPhotoCategory.value;
        const description = els.editPhotoDesc.value.trim();
        const details = els.editPhotoDetails.value.trim();

        if (!title) {
          this.modal.alert({
            title: 'Form Belum Lengkap',
            message: 'Judul foto tidak boleh kosong.',
            type: 'warning'
          });
          return;
        }

        this.events.emit('photo:edit-submit', {
          id,
          title,
          category,
          description,
          details,
          btn: els.btnSaveEditPhoto,
          modal: els.editModal
        });
      });
    }

    showLoading() {
      const els = this.elements;
      if (!els.photoGrid) return;
      els.photoGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
          <div style="display:inline-block; width:32px; height:32px; border:3px solid var(--border-light); border-top-color:var(--primary); border-radius:50%; animation: spin 0.8s linear infinite;"></div>
          <p style="margin-top:0.75rem; font-size:0.85rem; color:var(--text-muted);">Memuat foto dari Supabase...</p>
        </div>
        <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
      `;
    }

    showError(message) {
      const els = this.elements;
      if (!els.photoGrid) return;
      els.photoGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Gagal Memuat Galeri</h3>
          <p>${message || 'Periksa koneksi internet atau permission SQL Supabase'}</p>
        </div>
      `;
    }

    render(photos) {
      const els = this.elements;
      if (!els.photoGrid) return;

      if (els.visiblePhotoCount) {
        els.visiblePhotoCount.textContent = `(${photos.length} foto)`;
      }

      if (!photos || photos.length === 0) {
        els.photoGrid.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3>Belum Ada Foto</h3>
            <p>Tarik & lepas foto pada area uploader di sebelah kiri untuk mengunggah ke kategori ini.</p>
          </div>
        `;
        return;
      }

      const { selectedPhotoIds } = this.store.getState();

      els.photoGrid.innerHTML = photos.map(photo => {
        const title = photo.title || 'Tanpa Judul';
        const category = photo.category || 'uncategorized';
        const desc = photo.description || '-';
        const imgUrl = photo.imageUrl || '';
        const isSelected = selectedPhotoIds.has(photo.id);

        return `
          <div class="photo-card ${isSelected ? 'selected' : ''}" data-id="${photo.id}">
            <div class="photo-select-wrapper">
              <div class="photo-checkbox" data-id="${photo.id}" title="${isSelected ? 'Batalkan pilihan' : 'Pilih foto ini'}">
                <svg width="14" height="14" fill="none" stroke="${isSelected ? '#FFF' : 'transparent'}" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            </div>
            <div class="photo-media-wrapper">
              <img class="photo-img" src="${imgUrl}" alt="${title}" loading="lazy" onerror="this.onerror=null;this.src='${this.fallbackBrokenImage}';">
              <span class="photo-badge">${category}</span>
              <div class="photo-actions-overlay">
                <button class="photo-action-btn zoom-btn" title="Perbesar / Lightbox" data-id="${photo.id}">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"/>
                  </svg>
                </button>
                <button class="photo-action-btn edit-btn" title="Edit Detail" data-id="${photo.id}">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                </button>
                <button class="photo-action-btn delete-btn" title="Hapus Foto" data-id="${photo.id}">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="photo-details">
              <div class="photo-title" title="${title}">${title}</div>
              <div class="photo-desc" title="${desc}">${desc}</div>
              <div class="photo-meta">
                <span>ID: #${photo.id}</span>
                <a href="${imgUrl}" target="_blank" style="color:var(--primary); text-decoration:none; font-weight:600;">Lihat File ↗</a>
              </div>
            </div>
          </div>
        `;
      }).join('');

      this.attachCardInteractions();
    }

    attachCardInteractions() {
      const els = this.elements;
      if (!els.photoGrid) return;

      els.photoGrid.querySelectorAll('.photo-card').forEach(card => {
        const photoId = card.dataset.id;
        let touchTimer = null;
        let touchStartX = 0;
        let touchStartY = 0;
        let isLongPressTriggered = false;

        card.addEventListener('touchstart', (e) => {
          if (e.target.closest('.photo-action-btn')) return;

          isLongPressTriggered = false;
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;

          touchTimer = setTimeout(() => {
            isLongPressTriggered = true;
            if (navigator.vibrate) navigator.vibrate(50);
            this.events.emit('photo:longpress', { photoId, card });
          }, 450);
        }, { passive: true });

        card.addEventListener('touchmove', (e) => {
          const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
          const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
          if (deltaX > 10 || deltaY > 10) {
            clearTimeout(touchTimer);
          }
        }, { passive: true });

        card.addEventListener('touchend', () => {
          clearTimeout(touchTimer);
        });

        card.addEventListener('touchcancel', () => {
          clearTimeout(touchTimer);
        });

        card.addEventListener('contextmenu', (e) => {
          const { isSelectionMode } = this.store.getState();
          if (isLongPressTriggered || isSelectionMode) {
            e.preventDefault();
          }
        });

        card.addEventListener('dblclick', (e) => {
          if (e.target.closest('.photo-action-btn')) return;
          this.events.emit('photo:doubleclick', { photoId, card });
        });

        card.addEventListener('click', (e) => {
          if (isLongPressTriggered) {
            e.preventDefault();
            e.stopPropagation();
            isLongPressTriggered = false;
            return;
          }

          if (e.target.closest('.photo-action-btn')) return;

          const { isSelectionMode } = this.store.getState();
          if (isSelectionMode) {
            e.preventDefault();
            this.events.emit('photo:select-toggle', photoId);
            return;
          }

          if (e.target.closest('.photo-img') || e.target.closest('.photo-media-wrapper')) {
            this.events.emit('photo:zoom', photoId);
          }
        });

        const cb = card.querySelector('.photo-checkbox');
        if (cb) {
          cb.addEventListener('click', (e) => {
            e.stopPropagation();
            this.events.emit('photo:select-toggle', photoId);
          });
        }
      });

      els.photoGrid.querySelectorAll('.zoom-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.events.emit('photo:zoom', btn.dataset.id);
        });
      });

      els.photoGrid.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.events.emit('photo:edit', btn.dataset.id);
        });
      });

      els.photoGrid.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.events.emit('photo:delete', btn.dataset.id);
        });
      });
    }

    openEditModal(photo) {
      const els = this.elements;
      if (!photo || !els.editModal) return;

      els.editPhotoId.value = photo.id;
      els.editPhotoIdLabel.textContent = photo.id;
      els.editPhotoThumb.src = photo.imageUrl || '';
      els.editPhotoUrlLabel.textContent = photo.imageUrl || '';
      els.editPhotoTitle.value = photo.title || '';
      els.editPhotoCategory.value = photo.category || 'uncategorized';
      els.editPhotoDesc.value = photo.description || '';
      els.editPhotoDetails.value = photo.details || '';

      els.editModal.classList.add('active');
    }
  }

  global.MBell.GalleryView = GalleryView;
})(typeof window !== 'undefined' ? window : this);
