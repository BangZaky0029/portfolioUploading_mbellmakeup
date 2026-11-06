/**
 * Application Controller
 * MBell MakeUp - Portfolio Uploading Dashboard
 * Integrated Custom Pop-up Dialog System (No native browser alerts/confirms/prompts)
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // State Management
  const state = {
    categories: [],
    activeCategory: 'all',
    photos: [],
    stagedFiles: [],
    searchQuery: '',
    isUploading: false
  };

  // DOM Elements
  const elements = {
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    totalPhotosCount: document.getElementById('totalPhotosCount'),
    totalCategoriesCount: document.getElementById('totalCategoriesCount'),
    
    // Upload Elements
    uploadCategorySelect: document.getElementById('uploadCategorySelect'),
    btnQuickAddCat: document.getElementById('btnQuickAddCat'),
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    stagingWrapper: document.getElementById('stagingWrapper'),
    stagingContainer: document.getElementById('stagingContainer'),
    stagedCount: document.getElementById('stagedCount'),
    btnClearStaged: document.getElementById('btnClearStaged'),
    btnUploadSubmit: document.getElementById('btnUploadSubmit'),
    uploadProgressBox: document.getElementById('uploadProgressBox'),
    uploadProgressBar: document.getElementById('uploadProgressBar'),
    uploadProgressText: document.getElementById('uploadProgressText'),
    uploadProgressPercent: document.getElementById('uploadProgressPercent'),

    // Category & Gallery
    categoryTabsContainer: document.getElementById('categoryTabsContainer'),
    searchInput: document.getElementById('searchInput'),
    btnRefreshGallery: document.getElementById('btnRefreshGallery'),
    btnOpenManageCat: document.getElementById('btnOpenManageCat'),
    currentCategoryTitle: document.getElementById('currentCategoryTitle'),
    visiblePhotoCount: document.getElementById('visiblePhotoCount'),
    photoGrid: document.getElementById('photoGrid'),

    // Edit Modal
    editModal: document.getElementById('editModal'),
    editPhotoId: document.getElementById('editPhotoId'),
    editPhotoThumb: document.getElementById('editPhotoThumb'),
    editPhotoIdLabel: document.getElementById('editPhotoIdLabel'),
    editPhotoUrlLabel: document.getElementById('editPhotoUrlLabel'),
    editPhotoTitle: document.getElementById('editPhotoTitle'),
    editPhotoCategory: document.getElementById('editPhotoCategory'),
    editPhotoDesc: document.getElementById('editPhotoDesc'),
    editPhotoDetails: document.getElementById('editPhotoDetails'),
    btnSaveEditPhoto: document.getElementById('btnSaveEditPhoto'),

    // Manage Category Modal
    manageCatModal: document.getElementById('manageCatModal'),
    newCatInput: document.getElementById('newCatInput'),
    btnAddNewCat: document.getElementById('btnAddNewCat'),
    catTableBody: document.getElementById('catTableBody'),

    // Lightbox Modal
    lightboxModal: document.getElementById('lightboxModal'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxTitle: document.getElementById('lightboxTitle'),
    lightboxCategory: document.getElementById('lightboxCategory'),
    lightboxOpenNewTab: document.getElementById('lightboxOpenNewTab'),

    // Custom Pop-up Dialogs
    promptModal: document.getElementById('promptModal'),
    promptTitle: document.getElementById('promptTitle'),
    promptMessage: document.getElementById('promptMessage'),
    promptInput: document.getElementById('promptInput'),
    promptError: document.getElementById('promptError'),
    btnPromptSubmit: document.getElementById('btnPromptSubmit'),

    confirmModal: document.getElementById('confirmModal'),
    confirmTitle: document.getElementById('confirmTitle'),
    confirmMessage: document.getElementById('confirmMessage'),
    confirmPreviewBox: document.getElementById('confirmPreviewBox'),
    confirmPreviewImg: document.getElementById('confirmPreviewImg'),
    confirmPreviewTitle: document.getElementById('confirmPreviewTitle'),
    confirmPreviewMeta: document.getElementById('confirmPreviewMeta'),
    confirmWarning: document.getElementById('confirmWarning'),
    btnConfirmSubmit: document.getElementById('btnConfirmSubmit'),
    btnConfirmCancel: document.getElementById('btnConfirmCancel'),

    alertModal: document.getElementById('alertModal'),
    alertTitle: document.getElementById('alertTitle'),
    alertMessage: document.getElementById('alertMessage'),
    btnAlertOk: document.getElementById('btnAlertOk'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // ==========================================================================
  // Custom Pop-up Dialog Engine (Replaces browser alert, confirm, prompt)
  // ==========================================================================
  function customPrompt({ title, message, placeholder = '', defaultValue = '', confirmText = 'Simpan', validate }) {
    return new Promise((resolve) => {
      elements.promptTitle.textContent = title || 'Input Data';
      elements.promptMessage.textContent = message || '';
      elements.promptInput.placeholder = placeholder;
      elements.promptInput.value = defaultValue;
      elements.promptError.style.display = 'none';
      elements.promptError.textContent = '';
      elements.btnPromptSubmit.textContent = confirmText;

      elements.promptModal.classList.add('active');
      setTimeout(() => {
        elements.promptInput.focus();
        if (defaultValue) elements.promptInput.select();
      }, 100);

      const handleConfirm = () => {
        const val = elements.promptInput.value;
        if (validate) {
          const err = validate(val);
          if (err) {
            elements.promptError.textContent = err;
            elements.promptError.style.display = 'block';
            elements.promptInput.focus();
            return;
          }
        }
        cleanup();
        elements.promptModal.classList.remove('active');
        resolve(val.trim());
      };

      const handleCancel = () => {
        cleanup();
        elements.promptModal.classList.remove('active');
        resolve(null);
      };

      const handleKey = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirm();
        } else if (e.key === 'Escape') {
          handleCancel();
        }
      };

      function cleanup() {
        elements.btnPromptSubmit.removeEventListener('click', handleConfirm);
        elements.promptInput.removeEventListener('keydown', handleKey);
        elements.promptModal.querySelectorAll('[data-close-modal]').forEach(b => b.removeEventListener('click', handleCancel));
      }

      elements.btnPromptSubmit.addEventListener('click', handleConfirm);
      elements.promptInput.addEventListener('keydown', handleKey);
      elements.promptModal.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', handleCancel));
    });
  }

  function customConfirm({ title, message, preview, warning, confirmText = 'Ya, Lanjutkan', isDanger = true }) {
    return new Promise((resolve) => {
      elements.confirmTitle.textContent = title || 'Konfirmasi';
      elements.confirmMessage.textContent = message || '';
      elements.btnConfirmSubmit.textContent = confirmText;
      
      if (isDanger) {
        elements.btnConfirmSubmit.className = 'btn btn-danger';
      } else {
        elements.btnConfirmSubmit.className = 'btn btn-primary';
      }

      if (preview && preview.thumb) {
        elements.confirmPreviewBox.style.display = 'flex';
        elements.confirmPreviewImg.src = preview.thumb;
        elements.confirmPreviewTitle.textContent = preview.title || 'Foto Portofolio';
        elements.confirmPreviewMeta.textContent = preview.meta || '';
      } else {
        elements.confirmPreviewBox.style.display = 'none';
      }

      if (warning) {
        elements.confirmWarning.textContent = warning;
        elements.confirmWarning.style.display = 'block';
      } else {
        elements.confirmWarning.style.display = 'none';
      }

      elements.confirmModal.classList.add('active');

      const handleConfirm = () => {
        cleanup();
        elements.confirmModal.classList.remove('active');
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        elements.confirmModal.classList.remove('active');
        resolve(false);
      };

      function cleanup() {
        elements.btnConfirmSubmit.removeEventListener('click', handleConfirm);
        elements.btnConfirmCancel.removeEventListener('click', handleCancel);
        elements.confirmModal.querySelectorAll('[data-close-modal]').forEach(b => b.removeEventListener('click', handleCancel));
      }

      elements.btnConfirmSubmit.addEventListener('click', handleConfirm);
      elements.btnConfirmCancel.addEventListener('click', handleCancel);
      elements.confirmModal.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', handleCancel));
    });
  }

  function customAlert({ title = 'Pemberitahuan', message, type = 'warning' }) {
    return new Promise((resolve) => {
      elements.alertTitle.textContent = title;
      elements.alertMessage.textContent = message || '';

      elements.alertModal.classList.add('active');

      const handleClose = () => {
        elements.alertModal.classList.remove('active');
        elements.btnAlertOk.removeEventListener('click', handleClose);
        resolve(true);
      };

      elements.btnAlertOk.addEventListener('click', handleClose);
    });
  }

  // ==========================================================================
  // Toast Notifications
  // ==========================================================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" fill="none" stroke="#28A745" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" fill="none" stroke="#D94848" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" fill="none" stroke="#9E5A54" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    }

    toast.innerHTML = `
      <div style="flex-shrink:0;">${iconSvg}</div>
      <div style="flex:1;">${message}</div>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // ==========================================================================
  // Helper Formatters
  // ==========================================================================
  function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ==========================================================================
  // Data Loading & Initialization
  // ==========================================================================
  async function initApp() {
    // 1. Cek Koneksi Supabase
    try {
      const conn = await window.SupabaseService.checkConnection();
      if (conn.success) {
        elements.statusDot.classList.remove('offline');
        elements.statusText.textContent = 'Supabase Terhubung';
      } else {
        elements.statusDot.classList.add('offline');
        elements.statusText.textContent = 'Koneksi Terganggu';
        showToast('Peringatan: Gagal terhubung ke Supabase. Periksa RLS / Network.', 'error');
      }
    } catch (e) {
      elements.statusDot.classList.add('offline');
      elements.statusText.textContent = 'Offline';
    }

    // 2. Load Kategori
    await loadCategories();

    // 3. Load Galeri Foto
    await loadGallery();
  }

  async function loadCategories() {
    try {
      const categories = await window.SupabaseService.getCategories();
      state.categories = categories;

      // Update counters
      elements.totalCategoriesCount.textContent = categories.length;

      // Populate Selects
      renderCategorySelects(categories);

      // Render Tabs
      renderCategoryTabs(categories);
    } catch (err) {
      console.error('Gagal memuat kategori:', err);
      showToast('Gagal memuat daftar kategori', 'error');
    }
  }

  function renderCategorySelects(categories) {
    const optionsHtml = categories.map(cat => 
      `<option value="${cat.name}">${cat.name}</option>`
    ).join('');

    elements.uploadCategorySelect.innerHTML = optionsHtml;
    elements.editPhotoCategory.innerHTML = optionsHtml;

    // Set default selection
    if (state.activeCategory !== 'all') {
      elements.uploadCategorySelect.value = state.activeCategory;
    }
  }

  function renderCategoryTabs(categories) {
    // Total count calculation
    const totalAll = categories.reduce((sum, c) => sum + (c.count || 0), 0);
    elements.totalPhotosCount.textContent = totalAll;

    let tabsHtml = `
      <div class="category-pill ${state.activeCategory === 'all' ? 'active' : ''}" data-category="all">
        <span>Semua Foto</span>
        <span class="pill-count">${totalAll}</span>
      </div>
    `;

    categories.forEach(cat => {
      const isActive = state.activeCategory === cat.name ? 'active' : '';
      tabsHtml += `
        <div class="category-pill ${isActive}" data-category="${cat.name}">
          <span>${cat.name}</span>
          <span class="pill-count">${cat.count || 0}</span>
        </div>
      `;
    });

    elements.categoryTabsContainer.innerHTML = tabsHtml;

    // Attach click events
    elements.categoryTabsContainer.querySelectorAll('.category-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const cat = pill.dataset.category;
        setActiveCategory(cat);
      });
    });
  }

  function setActiveCategory(cat) {
    state.activeCategory = cat;
    
    // Update tab visual
    elements.categoryTabsContainer.querySelectorAll('.category-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.category === cat);
    });

    // Update upload select if valid
    if (cat !== 'all') {
      elements.uploadCategorySelect.value = cat;
      elements.currentCategoryTitle.textContent = `Koleksi: ${cat}`;
    } else {
      elements.currentCategoryTitle.textContent = 'Semua Koleksi';
    }

    loadGallery();
  }

  async function loadGallery() {
    elements.photoGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <div style="display:inline-block; width:32px; height:32px; border:3px solid var(--border-light); border-top-color:var(--primary); border-radius:50%; animation: spin 0.8s linear infinite;"></div>
        <p style="margin-top:0.75rem; font-size:0.85rem; color:var(--text-muted);">Memuat foto dari Supabase...</p>
      </div>
      <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
    `;

    try {
      const photos = await window.SupabaseService.getImages(state.activeCategory, state.searchQuery);
      state.photos = photos;
      renderPhotoGrid(photos);
    } catch (err) {
      console.error('Gagal memuat galeri:', err);
      elements.photoGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Gagal Memuat Galeri</h3>
          <p>${err.message || 'Periksa koneksi internet atau permission SQL Supabase'}</p>
        </div>
      `;
      showToast('Gagal memuat galeri foto', 'error');
    }
  }

  function renderPhotoGrid(photos) {
    elements.visiblePhotoCount.textContent = `(${photos.length} foto)`;

    if (!photos || photos.length === 0) {
      elements.photoGrid.innerHTML = `
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

    elements.photoGrid.innerHTML = photos.map(photo => {
      const title = photo.title || 'Tanpa Judul';
      const category = photo.category || 'uncategorized';
      const desc = photo.description || '-';
      const imgUrl = photo.imageUrl || '';

      return `
        <div class="photo-card" data-id="${photo.id}">
          <div class="photo-media-wrapper">
            <img class="photo-img" src="${imgUrl}" alt="${title}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'><rect width=\'100\' height=\'100\' fill=\'%23F0EAE6\'/><text x=\'50\' y=\'50\' fill=\'%23999\' font-size=\'12\' text-anchor=\'middle\' dominant-baseline=\'middle\'>Foto Rusak</text></svg>'">
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

    // Attach card action listeners
    attachCardEvents();
  }

  function attachCardEvents() {
    // Zoom / Lightbox
    elements.photoGrid.querySelectorAll('.zoom-btn, .photo-img').forEach(el => {
      el.addEventListener('click', (e) => {
        const card = e.target.closest('.photo-card');
        if (!card) return;
        const photoId = card.dataset.id;
        const photo = state.photos.find(p => p.id == photoId);
        if (photo) openLightbox(photo);
      });
    });

    // Edit Detail
    elements.photoGrid.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const photoId = btn.dataset.id;
        const photo = state.photos.find(p => p.id == photoId);
        if (photo) openEditModal(photo);
      });
    });

    // Delete Photo (Custom Pop-up Confirmation)
    elements.photoGrid.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const photoId = btn.dataset.id;
        const photo = state.photos.find(p => p.id == photoId);
        if (!photo) return;

        const confirmed = await customConfirm({
          title: 'Hapus Foto Portofolio',
          message: `Apakah Anda yakin ingin menghapus foto "${photo.title || 'ini'}"?`,
          preview: {
            thumb: photo.imageUrl,
            title: photo.title || 'Foto Portofolio',
            meta: `Kategori: ${photo.category} • ID: #${photo.id}`
          },
          warning: 'File fisik di Supabase Storage dan data di tabel database akan dihapus permanen.',
          confirmText: 'Ya, Hapus Foto',
          isDanger: true
        });

        if (!confirmed) return;

        try {
          btn.disabled = true;
          await window.SupabaseService.deletePhoto(photo.id, photo.imageUrl);
          showToast(`Foto "${photo.title}" berhasil dihapus`, 'success');
          
          // Refresh list & counters
          await loadCategories();
          await loadGallery();
        } catch (err) {
          console.error('Gagal menghapus foto:', err);
          showToast(`Gagal menghapus foto: ${err.message}`, 'error');
          btn.disabled = false;
        }
      });
    });
  }

  // ==========================================================================
  // Drag and Drop & Staging Upload Handler
  // ==========================================================================
  ['dragenter', 'dragover'].forEach(eventName => {
    elements.dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    elements.dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.dropzone.classList.remove('dragover');
    });
  });

  elements.dropzone.addEventListener('click', () => {
    elements.fileInput.click();
  });

  elements.dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleSelectedFiles(files);
  });

  elements.fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    handleSelectedFiles(files);
  });

  function handleSelectedFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    const validFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      customAlert({
        title: 'Format Tidak Didukung',
        message: 'Hanya file gambar (PNG, JPG, JPEG, WEBP) yang dapat diunggah ke portofolio MBell MakeUp.',
        type: 'warning'
      });
      return;
    }

    validFiles.forEach(file => {
      const id = 'stage_' + Math.random().toString(36).substring(2, 9);
      const previewUrl = URL.createObjectURL(file);
      const cleanTitle = file.name.substring(0, file.name.lastIndexOf('.'))
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      state.stagedFiles.push({
        id,
        file,
        previewUrl,
        title: cleanTitle
      });
    });

    renderStagedFiles();
    elements.fileInput.value = ''; // Reset input
  }

  function renderStagedFiles() {
    const count = state.stagedFiles.length;
    elements.stagedCount.textContent = count;

    if (count === 0) {
      elements.stagingWrapper.style.display = 'none';
      elements.stagingContainer.innerHTML = '';
      return;
    }

    elements.stagingWrapper.style.display = 'block';
    elements.stagingContainer.innerHTML = state.stagedFiles.map((item) => `
      <div class="staged-item" data-id="${item.id}">
        <img class="staged-thumb" src="${item.previewUrl}" alt="Preview">
        <div class="staged-info">
          <input type="text" class="form-input staged-title-input" value="${item.title}" style="padding: 2px 6px; font-size: 0.8rem; margin-bottom: 2px;" placeholder="Judul foto">
          <div class="staged-size">${formatBytes(item.file.size)} &bull; ${item.file.type.split('/')[1].toUpperCase()}</div>
        </div>
        <button type="button" class="staged-remove" data-id="${item.id}" title="Hapus dari antrean">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `).join('');

    // Listener input title update
    elements.stagingContainer.querySelectorAll('.staged-title-input').forEach((input, index) => {
      input.addEventListener('change', (e) => {
        if (state.stagedFiles[index]) {
          state.stagedFiles[index].title = e.target.value;
        }
      });
    });

    // Listener hapus per item
    elements.stagingContainer.querySelectorAll('.staged-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const targetIndex = state.stagedFiles.findIndex(item => item.id === id);
        if (targetIndex !== -1) {
          URL.revokeObjectURL(state.stagedFiles[targetIndex].previewUrl);
          state.stagedFiles.splice(targetIndex, 1);
          renderStagedFiles();
        }
      });
    });
  }

  elements.btnClearStaged.addEventListener('click', () => {
    state.stagedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    state.stagedFiles = [];
    renderStagedFiles();
  });

  // ==========================================================================
  // Process Batch Upload to Supabase
  // ==========================================================================
  elements.btnUploadSubmit.addEventListener('click', async () => {
    if (state.stagedFiles.length === 0 || state.isUploading) return;

    const targetCategory = elements.uploadCategorySelect.value;
    if (!targetCategory) {
      customAlert({
        title: 'Kategori Belum Dipilih',
        message: 'Pilih kategori tujuan upload terlebih dahulu sebelum mengunggah foto.',
        type: 'warning'
      });
      return;
    }

    state.isUploading = true;
    elements.btnUploadSubmit.disabled = true;
    elements.uploadProgressBox.style.display = 'block';

    const total = state.stagedFiles.length;
    let completed = 0;
    let errorCount = 0;

    for (let i = 0; i < total; i++) {
      const item = state.stagedFiles[i];
      const percent = Math.round(((i) / total) * 100);
      elements.uploadProgressBar.style.width = `${percent}%`;
      elements.uploadProgressPercent.textContent = `${percent}%`;
      elements.uploadProgressText.textContent = `Mengunggah (${i + 1}/${total}): ${item.file.name}...`;

      try {
        await window.SupabaseService.uploadPhoto(item.file, {
          title: item.title,
          category: targetCategory,
          description: `Portfolio ${targetCategory}`
        });
        completed++;
      } catch (err) {
        console.error(`Gagal upload ${item.file.name}:`, err);
        errorCount++;
        showToast(`Gagal: ${item.file.name} (${err.message})`, 'error');
      }
    }

    elements.uploadProgressBar.style.width = '100%';
    elements.uploadProgressPercent.textContent = '100%';
    elements.uploadProgressText.textContent = `Selesai! ${completed} berhasil, ${errorCount} gagal.`;

    if (completed > 0) {
      showToast(`Sukses mengunggah ${completed} foto ke kategori "${targetCategory}"!`, 'success');
      // Bersihkan antrean
      state.stagedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
      state.stagedFiles = [];
      renderStagedFiles();

      // Refresh categories & gallery
      await loadCategories();
      // Pindahkan filter ke kategori yang baru di-upload agar admin langsung melihat hasilnya
      setActiveCategory(targetCategory);
    }

    setTimeout(() => {
      elements.uploadProgressBox.style.display = 'none';
      elements.btnUploadSubmit.disabled = false;
      state.isUploading = false;
    }, 2000);
  });

  // ==========================================================================
  // Edit Photo Modal
  // ==========================================================================
  function openEditModal(photo) {
    elements.editPhotoId.value = photo.id;
    elements.editPhotoIdLabel.textContent = photo.id;
    elements.editPhotoThumb.src = photo.imageUrl || '';
    elements.editPhotoUrlLabel.textContent = photo.imageUrl || '';
    elements.editPhotoTitle.value = photo.title || '';
    elements.editPhotoCategory.value = photo.category || 'uncategorized';
    elements.editPhotoDesc.value = photo.description || '';
    elements.editPhotoDetails.value = photo.details || '';

    elements.editModal.classList.add('active');
  }

  elements.btnSaveEditPhoto.addEventListener('click', async () => {
    const id = elements.editPhotoId.value;
    const title = elements.editPhotoTitle.value.trim();
    const category = elements.editPhotoCategory.value;
    const description = elements.editPhotoDesc.value.trim();
    const details = elements.editPhotoDetails.value.trim();

    if (!title) {
      customAlert({
        title: 'Form Belum Lengkap',
        message: 'Judul foto tidak boleh kosong.',
        type: 'warning'
      });
      return;
    }

    try {
      elements.btnSaveEditPhoto.disabled = true;
      elements.btnSaveEditPhoto.textContent = 'Menyimpan...';

      await window.SupabaseService.updatePhoto(id, {
        title,
        category,
        description,
        details
      });

      showToast('Detail foto berhasil diperbarui!', 'success');
      elements.editModal.classList.remove('active');

      // Refresh data
      await loadCategories();
      await loadGallery();
    } catch (err) {
      console.error('Gagal update foto:', err);
      showToast(`Gagal update foto: ${err.message}`, 'error');
    } finally {
      elements.btnSaveEditPhoto.disabled = false;
      elements.btnSaveEditPhoto.textContent = 'Simpan Perubahan';
    }
  });

  // ==========================================================================
  // Category Management Modal
  // ==========================================================================
  elements.btnOpenManageCat.addEventListener('click', () => {
    renderCategoryTable();
    elements.manageCatModal.classList.add('active');
  });

  // Quick Add Category (Menggunakan Custom Pop-up Modal)
  elements.btnQuickAddCat.addEventListener('click', async () => {
    const catName = await customPrompt({
      title: 'Tambah Kategori Baru',
      message: 'Masukkan nama kategori baru untuk portofolio MBell MakeUp:',
      placeholder: 'contoh: HennaArt, Maternity, SigerSunda',
      confirmText: '+ Tambah Kategori',
      validate: (val) => {
        if (!val || !val.trim()) return 'Nama kategori tidak boleh kosong';
        return null;
      }
    });

    if (catName) {
      handleAddNewCategory(catName.trim());
    }
  });

  elements.btnAddNewCat.addEventListener('click', () => {
    const val = elements.newCatInput.value.trim();
    if (val) {
      handleAddNewCategory(val);
      elements.newCatInput.value = '';
    } else {
      customAlert({
        title: 'Validasi Kategori',
        message: 'Nama kategori baru tidak boleh kosong.',
        type: 'warning'
      });
    }
  });

  async function handleAddNewCategory(catName) {
    try {
      const added = await window.SupabaseService.addCategory(catName);
      showToast(`Kategori "${added}" berhasil ditambahkan!`, 'success');
      await loadCategories();
      renderCategoryTable();
      elements.uploadCategorySelect.value = added;
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function renderCategoryTable() {
    elements.catTableBody.innerHTML = state.categories.map(cat => `
      <tr>
        <td><strong>${cat.name}</strong></td>
        <td style="text-align:center;">
          <span class="pill-count" style="font-weight:600; font-size:0.78rem;">${cat.count || 0}</span>
        </td>
        <td style="text-align:right;">
          <button type="button" class="btn btn-secondary btn-sm rename-cat-btn" data-cat="${cat.name}" style="padding:2px 6px;">Ubah</button>
          <button type="button" class="btn btn-danger btn-sm del-cat-btn" data-cat="${cat.name}" data-count="${cat.count || 0}" style="padding:2px 6px;">Hapus</button>
        </td>
      </tr>
    `).join('');

    // Rename Listener (Custom Pop-up Prompt)
    elements.catTableBody.querySelectorAll('.rename-cat-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const oldCat = btn.dataset.cat;
        const newCat = await customPrompt({
          title: 'Ubah Nama Kategori',
          message: `Ganti nama kategori "${oldCat}" menjadi nama baru:`,
          defaultValue: oldCat,
          placeholder: 'Nama kategori baru',
          confirmText: 'Simpan Nama Baru',
          validate: (val) => {
            if (!val || !val.trim()) return 'Nama kategori tidak boleh kosong';
            return null;
          }
        });

        if (!newCat || newCat.trim() === oldCat) return;

        try {
          btn.disabled = true;
          const res = await window.SupabaseService.renameCategory(oldCat, newCat.trim());
          showToast(`Kategori diubah menjadi "${newCat.trim()}". ${res.updatedCount} foto diperbarui.`, 'success');
          await loadCategories();
          renderCategoryTable();
          await loadGallery();
        } catch (err) {
          showToast(`Gagal mengubah nama kategori: ${err.message}`, 'error');
          btn.disabled = false;
        }
      });
    });

    // Delete Category Listener (Custom Pop-up Confirm)
    elements.catTableBody.querySelectorAll('.del-cat-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const catName = btn.dataset.cat;
        const count = parseInt(btn.dataset.count, 10) || 0;

        let deletePhotos = false;
        if (count > 0) {
          const choice = await customConfirm({
            title: 'Hapus Kategori & Foto',
            message: `Kategori "${catName}" memiliki ${count} foto di dalamnya!`,
            warning: 'PERINGATAN: Menghapus kategori ini juga akan menghapus seluruh file foto di dalamnya dari Supabase Storage & database secara permanen.',
            confirmText: 'Ya, Hapus Semua Foto',
            isDanger: true
          });
          if (!choice) return;
          deletePhotos = true;
        } else {
          const choice = await customConfirm({
            title: 'Hapus Kategori',
            message: `Apakah Anda yakin ingin menghapus kategori "${catName}"?`,
            warning: 'Kategori ini belum memiliki foto portofolio.',
            confirmText: 'Hapus Kategori',
            isDanger: true
          });
          if (!choice) return;
        }

        try {
          btn.disabled = true;
          await window.SupabaseService.deleteCategory(catName, deletePhotos);
          showToast(`Kategori "${catName}" berhasil dihapus`, 'success');
          await loadCategories();
          renderCategoryTable();
          if (state.activeCategory === catName) {
            setActiveCategory('all');
          } else {
            await loadGallery();
          }
        } catch (err) {
          showToast(`Gagal menghapus kategori: ${err.message}`, 'error');
          btn.disabled = false;
        }
      });
    });
  }

  // ==========================================================================
  // Lightbox Preview Modal
  // ==========================================================================
  function openLightbox(photo) {
    elements.lightboxTitle.textContent = photo.title || 'Foto Portofolio';
    elements.lightboxCategory.textContent = `Kategori: ${photo.category || '-'} • ID: #${photo.id}`;
    elements.lightboxImg.src = photo.imageUrl || '';
    elements.lightboxOpenNewTab.href = photo.imageUrl || '#';

    elements.lightboxModal.classList.add('active');
  }

  // Close modals when clicking backdrop or close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-backdrop').forEach(modal => modal.classList.remove('active'));
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('active');
      }
    });
  });

  // Search Bar Filter
  elements.searchInput.addEventListener('input', debounce((e) => {
    state.searchQuery = e.target.value;
    loadGallery();
  }, 250));

  // Refresh Gallery Button
  elements.btnRefreshGallery.addEventListener('click', async () => {
    elements.btnRefreshGallery.disabled = true;
    await loadCategories();
    await loadGallery();
    showToast('Galeri diperbarui dari Supabase', 'info');
    elements.btnRefreshGallery.disabled = false;
  });

  // Run on start
  initApp();
});
