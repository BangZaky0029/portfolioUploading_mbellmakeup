/**
 * Dropzone & Staging UI Component
 * Menangani interaksi Drag & Drop, antrean file siap upload, dan progres bar
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class DropzoneUploader {
    constructor({ store, events }) {
      this.store = store;
      this.events = events;
      this.bindEvents();
    }

    get elements() {
      return {
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
        uploadProgressPercent: document.getElementById('uploadProgressPercent')
      };
    }

    bindEvents() {
      const els = this.elements;
      if (!els.dropzone) return;

      ['dragenter', 'dragover'].forEach(eventName => {
        els.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          els.dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        els.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          els.dropzone.classList.remove('dragover');
        });
      });

      els.dropzone.addEventListener('click', () => {
        els.fileInput.click();
      });

      els.dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        this.events.emit('files:selected', files);
      });

      els.fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        this.events.emit('files:selected', files);
      });

      if (els.btnClearStaged) {
        els.btnClearStaged.addEventListener('click', () => {
          this.clearStaging();
        });
      }

      if (els.btnUploadSubmit) {
        els.btnUploadSubmit.addEventListener('click', () => {
          this.events.emit('upload:requested');
        });
      }
    }

    renderStagedFiles() {
      const { stagedFiles } = this.store.getState();
      const count = stagedFiles.length;
      const els = this.elements;
      const formatBytes = global.MBell.Formatters?.formatBytes || ((b) => `${b} B`);

      if (els.stagedCount) {
        els.stagedCount.textContent = count;
      }

      if (count === 0) {
        if (els.stagingWrapper) els.stagingWrapper.style.display = 'none';
        if (els.stagingContainer) els.stagingContainer.innerHTML = '';
        return;
      }

      if (els.stagingWrapper) els.stagingWrapper.style.display = 'block';

      if (els.stagingContainer) {
        els.stagingContainer.innerHTML = stagedFiles.map((item) => {
          const originalExt = (item.file.name.substring(item.file.name.lastIndexOf('.') + 1) || 'IMG').toUpperCase();
          return `
            <div class="staged-item" data-id="${item.id}">
              <img class="staged-thumb" src="${item.previewUrl}" alt="Preview">
              <div class="staged-info">
                <input type="text" class="form-input staged-title-input" value="${item.title}" style="padding: 2px 6px; font-size: 0.8rem; margin-bottom: 2px;" placeholder="Judul foto">
                <div class="staged-size">${formatBytes(item.file.size)} &bull; ${originalExt} &rarr; <span style="color:var(--primary); font-weight:600;">WEBP</span></div>
              </div>
              <button type="button" class="staged-remove" data-id="${item.id}" title="Hapus dari antrean">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          `;
        }).join('');

        els.stagingContainer.querySelectorAll('.staged-title-input').forEach((input, index) => {
          input.addEventListener('change', (e) => {
            const state = this.store.getState();
            if (state.stagedFiles[index]) {
              state.stagedFiles[index].title = e.target.value;
            }
          });
        });

        els.stagingContainer.querySelectorAll('.staged-remove').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const state = this.store.getState();
            const targetIndex = state.stagedFiles.findIndex(item => item.id === id);
            if (targetIndex !== -1) {
              URL.revokeObjectURL(state.stagedFiles[targetIndex].previewUrl);
              state.stagedFiles.splice(targetIndex, 1);
              this.renderStagedFiles();
            }
          });
        });
      }

      if (els.fileInput) {
        els.fileInput.value = '';
      }
    }

    clearStaging() {
      const { stagedFiles } = this.store.getState();
      stagedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
      this.store.setState({ stagedFiles: [] });
      this.renderStagedFiles();
    }

    showProgress(percent, text) {
      const els = this.elements;
      if (els.uploadProgressBox) els.uploadProgressBox.style.display = 'block';
      if (els.uploadProgressBar) els.uploadProgressBar.style.width = `${percent}%`;
      if (els.uploadProgressPercent) els.uploadProgressPercent.textContent = `${percent}%`;
      if (els.uploadProgressText) els.uploadProgressText.textContent = text;
    }

    hideProgress() {
      const els = this.elements;
      if (els.uploadProgressBox) els.uploadProgressBox.style.display = 'none';
    }

    setUploading(isUploading) {
      const els = this.elements;
      if (els.btnUploadSubmit) {
        els.btnUploadSubmit.disabled = isUploading;
      }
    }
  }

  global.MBell.DropzoneUploader = DropzoneUploader;
})(typeof window !== 'undefined' ? window : this);
