/**
 * Modal & Custom Dialog Manager
 * Menangani pengganti alert, confirm, dan prompt bawaan browser
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class ModalManager {
    constructor() {
      this.initGlobalClosers();
    }

    get elements() {
      return {
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
        btnAlertOk: document.getElementById('btnAlertOk')
      };
    }

    initGlobalClosers() {
      document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
          const modal = btn.closest('.modal-backdrop');
          if (modal) modal.classList.remove('active');
        });
      });

      document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.classList.remove('active');
          }
        });
      });
    }

    open(modalId) {
      const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
      if (modal) modal.classList.add('active');
    }

    close(modalId) {
      const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
      if (modal) modal.classList.remove('active');
    }

    alert({ title = 'Pemberitahuan', message, type = 'warning' }) {
      return new Promise((resolve) => {
        const els = this.elements;
        if (!els.alertModal) {
          window.alert(`${title}\n\n${message}`);
          resolve(true);
          return;
        }

        els.alertTitle.textContent = title;
        els.alertMessage.textContent = message || '';
        els.alertModal.classList.add('active');

        const handleClose = () => {
          els.alertModal.classList.remove('active');
          els.btnAlertOk.removeEventListener('click', handleClose);
          resolve(true);
        };

        els.btnAlertOk.addEventListener('click', handleClose);
      });
    }

    confirm({ title, message, preview, warning, confirmText = 'Ya, Lanjutkan', isDanger = true }) {
      return new Promise((resolve) => {
        const els = this.elements;
        if (!els.confirmModal) {
          resolve(window.confirm(`${title}\n\n${message}`));
          return;
        }

        els.confirmTitle.textContent = title || 'Konfirmasi';
        els.confirmMessage.textContent = message || '';
        els.btnConfirmSubmit.textContent = confirmText;

        if (isDanger) {
          els.btnConfirmSubmit.className = 'btn btn-danger';
        } else {
          els.btnConfirmSubmit.className = 'btn btn-primary';
        }

        if (preview && preview.thumb) {
          els.confirmPreviewBox.style.display = 'flex';
          els.confirmPreviewImg.src = preview.thumb;
          els.confirmPreviewTitle.textContent = preview.title || 'Foto Portofolio';
          els.confirmPreviewMeta.textContent = preview.meta || '';
        } else {
          els.confirmPreviewBox.style.display = 'none';
        }

        if (warning) {
          els.confirmWarning.textContent = warning;
          els.confirmWarning.style.display = 'block';
        } else {
          els.confirmWarning.style.display = 'none';
        }

        els.confirmModal.classList.add('active');

        const handleConfirm = () => {
          cleanup();
          els.confirmModal.classList.remove('active');
          resolve(true);
        };

        const handleCancel = () => {
          cleanup();
          els.confirmModal.classList.remove('active');
          resolve(false);
        };

        const cleanup = () => {
          els.btnConfirmSubmit.removeEventListener('click', handleConfirm);
          els.btnConfirmCancel.removeEventListener('click', handleCancel);
          els.confirmModal.querySelectorAll('[data-close-modal]').forEach(b => b.removeEventListener('click', handleCancel));
        };

        els.btnConfirmSubmit.addEventListener('click', handleConfirm);
        els.btnConfirmCancel.addEventListener('click', handleCancel);
        els.confirmModal.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', handleCancel));
      });
    }

    prompt({ title, message, placeholder = '', defaultValue = '', confirmText = 'Simpan', validate }) {
      return new Promise((resolve) => {
        const els = this.elements;
        if (!els.promptModal) {
          resolve(window.prompt(`${title}\n\n${message}`, defaultValue));
          return;
        }

        els.promptTitle.textContent = title || 'Input Data';
        els.promptMessage.textContent = message || '';
        els.promptInput.placeholder = placeholder;
        els.promptInput.value = defaultValue;
        els.promptError.style.display = 'none';
        els.promptError.textContent = '';
        els.btnPromptSubmit.textContent = confirmText;

        els.promptModal.classList.add('active');
        setTimeout(() => {
          els.promptInput.focus();
          if (defaultValue) els.promptInput.select();
        }, 100);

        const handleConfirm = () => {
          const val = els.promptInput.value;
          if (validate) {
            const err = validate(val);
            if (err) {
              els.promptError.textContent = err;
              els.promptError.style.display = 'block';
              els.promptInput.focus();
              return;
            }
          }
          cleanup();
          els.promptModal.classList.remove('active');
          resolve(val.trim());
        };

        const handleCancel = () => {
          cleanup();
          els.promptModal.classList.remove('active');
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

        const cleanup = () => {
          els.btnPromptSubmit.removeEventListener('click', handleConfirm);
          els.promptInput.removeEventListener('keydown', handleKey);
          els.promptModal.querySelectorAll('[data-close-modal]').forEach(b => b.removeEventListener('click', handleCancel));
        };

        els.btnPromptSubmit.addEventListener('click', handleConfirm);
        els.promptInput.addEventListener('keydown', handleKey);
        els.promptModal.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', handleCancel));
      });
    }
  }

  global.MBell.ModalManager = ModalManager;
  global.MBell.modalManagerInstance = new ModalManager();
})(typeof window !== 'undefined' ? window : this);
