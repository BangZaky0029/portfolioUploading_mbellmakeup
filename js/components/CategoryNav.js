/**
 * Category Navigation & Category Management Component
 * MBell MakeUp Portfolio Studio
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class CategoryNav {
    constructor({ store, categoryService, modalManager, toast, events }) {
      this.store = store;
      this.categoryService = categoryService || global.MBell.categoryServiceInstance;
      this.modal = modalManager || global.MBell.modalManagerInstance;
      this.toast = toast || global.MBell.toastInstance;
      this.events = events;

      this.bindEvents();
    }

    get elements() {
      return {
        totalCategoriesCount: document.getElementById('totalCategoriesCount'),
        totalPhotosCount: document.getElementById('totalPhotosCount'),
        uploadCategorySelect: document.getElementById('uploadCategorySelect'),
        editPhotoCategory: document.getElementById('editPhotoCategory'),
        bulkTargetCategorySelect: document.getElementById('bulkTargetCategorySelect'),
        categoryTabsContainer: document.getElementById('categoryTabsContainer'),
        currentCategoryTitle: document.getElementById('currentCategoryTitle'),
        btnQuickAddCat: document.getElementById('btnQuickAddCat'),
        btnOpenManageCat: document.getElementById('btnOpenManageCat'),
        manageCatModal: document.getElementById('manageCatModal'),
        catTableBody: document.getElementById('catTableBody'),
        newCatInput: document.getElementById('newCatInput'),
        btnAddNewCat: document.getElementById('btnAddNewCat')
      };
    }

    bindEvents() {
      const els = this.elements;

      if (els.btnQuickAddCat) {
        els.btnQuickAddCat.addEventListener('click', () => this.handleQuickAddCategory());
      }

      if (els.btnOpenManageCat) {
        els.btnOpenManageCat.addEventListener('click', () => {
          this.renderCategoryTable();
          els.manageCatModal.classList.add('active');
        });
      }

      if (els.btnAddNewCat) {
        els.btnAddNewCat.addEventListener('click', () => {
          const val = els.newCatInput.value.trim();
          if (val) {
            this.addNewCategory(val);
            els.newCatInput.value = '';
          } else {
            this.modal.alert({
              title: 'Validasi Kategori',
              message: 'Nama kategori baru tidak boleh kosong.',
              type: 'warning'
            });
          }
        });
      }
    }

    async loadCategories() {
      try {
        const categories = await this.categoryService.getCategories();
        this.store.setState({ categories });

        const els = this.elements;
        if (els.totalCategoriesCount) {
          els.totalCategoriesCount.textContent = categories.length;
        }

        this.renderCategorySelects(categories);
        this.renderCategoryTabs(categories);
      } catch (err) {
        console.error('[CategoryNav] Gagal memuat kategori:', err);
        this.toast.show('Gagal memuat daftar kategori', 'error');
      }
    }

    renderCategorySelects(categories) {
      const optionsHtml = categories.map(cat =>
        `<option value="${cat.name}">${cat.name}</option>`
      ).join('');

      const els = this.elements;
      if (els.uploadCategorySelect) els.uploadCategorySelect.innerHTML = optionsHtml;
      if (els.editPhotoCategory) els.editPhotoCategory.innerHTML = optionsHtml;
      if (els.bulkTargetCategorySelect) els.bulkTargetCategorySelect.innerHTML = optionsHtml;

      const { activeCategory } = this.store.getState();
      if (activeCategory !== 'all' && els.uploadCategorySelect) {
        els.uploadCategorySelect.value = activeCategory;
      }
    }

    renderCategoryTabs(categories) {
      const { activeCategory } = this.store.getState();
      const totalAll = categories.reduce((sum, c) => sum + (c.count || 0), 0);
      const els = this.elements;

      if (els.totalPhotosCount) {
        els.totalPhotosCount.textContent = totalAll;
      }

      let tabsHtml = `
        <div class="category-pill ${activeCategory === 'all' ? 'active' : ''}" data-category="all">
          <span>Semua Foto</span>
          <span class="pill-count">${totalAll}</span>
        </div>
      `;

      categories.forEach(cat => {
        const isActive = activeCategory === cat.name ? 'active' : '';
        tabsHtml += `
          <div class="category-pill ${isActive}" data-category="${cat.name}">
            <span>${cat.name}</span>
            <span class="pill-count">${cat.count || 0}</span>
          </div>
        `;
      });

      if (els.categoryTabsContainer) {
        els.categoryTabsContainer.innerHTML = tabsHtml;

        els.categoryTabsContainer.querySelectorAll('.category-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            const cat = pill.dataset.category;
            this.setActiveCategory(cat);
          });
        });
      }
    }

    setActiveCategory(cat) {
      this.store.setState({
        activeCategory: cat,
        selectedPhotoIds: new Set(),
        isSelectionMode: false
      });

      const els = this.elements;
      if (els.categoryTabsContainer) {
        els.categoryTabsContainer.querySelectorAll('.category-pill').forEach(p => {
          p.classList.toggle('active', p.dataset.category === cat);
        });
      }

      if (cat !== 'all') {
        if (els.uploadCategorySelect) els.uploadCategorySelect.value = cat;
        if (els.currentCategoryTitle) els.currentCategoryTitle.textContent = `Koleksi: ${cat}`;
      } else {
        if (els.currentCategoryTitle) els.currentCategoryTitle.textContent = 'Semua Koleksi';
      }

      this.events.emit('category:changed', cat);
    }

    async handleQuickAddCategory() {
      const catName = await this.modal.prompt({
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
        await this.addNewCategory(catName.trim());
      }
    }

    async addNewCategory(catName) {
      try {
        const added = await this.categoryService.addCategory(catName);
        this.toast.show(`Kategori "${added}" berhasil ditambahkan!`, 'success');
        await this.loadCategories();
        this.renderCategoryTable();
        const els = this.elements;
        if (els.uploadCategorySelect) els.uploadCategorySelect.value = added;
      } catch (err) {
        this.toast.show(err.message, 'error');
      }
    }

    renderCategoryTable() {
      const els = this.elements;
      if (!els.catTableBody) return;
      const { categories } = this.store.getState();

      els.catTableBody.innerHTML = categories.map(cat => `
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

      els.catTableBody.querySelectorAll('.rename-cat-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const oldCat = btn.dataset.cat;
          const newCat = await this.modal.prompt({
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
            const res = await this.categoryService.renameCategory(oldCat, newCat.trim());
            this.toast.show(`Kategori diubah menjadi "${newCat.trim()}". ${res.updatedCount} foto diperbarui.`, 'success');
            await this.loadCategories();
            this.renderCategoryTable();
            this.events.emit('category:renamed', { oldCat, newCat: newCat.trim() });
          } catch (err) {
            this.toast.show(`Gagal mengubah nama kategori: ${err.message}`, 'error');
            btn.disabled = false;
          }
        });
      });

      els.catTableBody.querySelectorAll('.del-cat-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const catName = btn.dataset.cat;
          const count = parseInt(btn.dataset.count, 10) || 0;

          let deletePhotos = false;
          if (count > 0) {
            const choice = await this.modal.confirm({
              title: 'Hapus Kategori & Foto',
              message: `Kategori "${catName}" memiliki ${count} foto di dalamnya!`,
              warning: 'PERINGATAN: Menghapus kategori ini juga akan menghapus seluruh file foto di dalamnya dari Supabase Storage & database secara permanen.',
              confirmText: 'Ya, Hapus Semua Foto',
              isDanger: true
            });
            if (!choice) return;
            deletePhotos = true;
          } else {
            const choice = await this.modal.confirm({
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
            await this.categoryService.deleteCategory(catName, deletePhotos);
            this.toast.show(`Kategori "${catName}" berhasil dihapus`, 'success');
            await this.loadCategories();
            this.renderCategoryTable();

            const { activeCategory } = this.store.getState();
            if (activeCategory === catName) {
              this.setActiveCategory('all');
            } else {
              this.events.emit('category:deleted', catName);
            }
          } catch (err) {
            this.toast.show(`Gagal menghapus kategori: ${err.message}`, 'error');
            btn.disabled = false;
          }
        });
      });
    }
  }

  global.MBell.CategoryNav = CategoryNav;
})(typeof window !== 'undefined' ? window : this);
