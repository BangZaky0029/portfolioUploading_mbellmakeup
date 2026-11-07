/**
 * Toast Notification System
 * MBell MakeUp Portfolio Studio
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class Toast {
    constructor(containerId = 'toastContainer') {
      this.containerId = containerId;
    }

    get container() {
      let el = document.getElementById(this.containerId);
      if (!el) {
        el = document.createElement('div');
        el.id = this.containerId;
        el.className = 'toast-container';
        document.body.appendChild(el);
      }
      return el;
    }

    show(message, type = 'info', duration = 3500) {
      const container = this.container;
      while (container.children.length >= 3) {
        container.firstElementChild.remove();
      }

      const toast = document.createElement('div');
      toast.className = `toast ${type}`;

      let icon = 'ℹ️';
      if (type === 'success') icon = '✓';
      if (type === 'error') icon = '⚠️';

      toast.innerHTML = `
        <div style="font-weight:bold; font-size:1.1rem; line-height:1;">${icon}</div>
        <div style="flex:1;">${message}</div>
      `;

      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 250);
      }, duration);
    }
  }

  global.MBell.Toast = Toast;
  global.MBell.toastInstance = new Toast();
})(typeof window !== 'undefined' ? window : this);
