/**
 * Lightbox Fullscreen Image Viewer
 * MBell MakeUp Portfolio Studio
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class Lightbox {
    constructor() {
      this.initKeyboardCloser();
    }

    get elements() {
      return {
        modal: document.getElementById('lightboxModal'),
        img: document.getElementById('lightboxImg'),
        title: document.getElementById('lightboxTitle'),
        category: document.getElementById('lightboxCategory'),
        openNewTab: document.getElementById('lightboxOpenNewTab')
      };
    }

    initKeyboardCloser() {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.elements.modal?.classList.contains('active')) {
          this.close();
        }
      });
    }

    open(photo, maybeTitle) {
      if (!photo) return;
      const els = this.elements;
      if (!els.modal) return;

      if (typeof photo === 'string') {
        photo = {
          imageUrl: photo,
          title: maybeTitle || 'Foto Hero & Profil',
          category: 'Hero / Banner',
          id: ''
        };
      }

      els.title.textContent = photo.title || 'Foto Portofolio';
      if (photo.id) {
        els.category.textContent = `Kategori: ${photo.category || '-'} • ID: #${photo.id}`;
      } else {
        els.category.textContent = `${photo.category || 'Preview Foto'}`;
      }
      els.img.src = photo.imageUrl || '';
      els.openNewTab.href = photo.imageUrl || '#';

      els.modal.classList.add('active');
    }

    close() {
      const els = this.elements;
      if (els.modal) {
        els.modal.classList.remove('active');
      }
    }
  }

  global.MBell.Lightbox = Lightbox;
  global.MBell.lightboxInstance = new Lightbox();
})(typeof window !== 'undefined' ? window : this);
