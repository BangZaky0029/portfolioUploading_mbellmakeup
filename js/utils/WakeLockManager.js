/**
 * Screen Wake Lock API Manager
 * Mencegah layar smartphone meredup/padam saat proses upload foto aktif
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class WakeLockManager {
    constructor() {
      this.activeWakeLock = null;
    }

    async request() {
      try {
        if ('wakeLock' in navigator) {
          this.activeWakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.log('[WakeLock] Skipped:', err);
      }
    }

    release() {
      try {
        if (this.activeWakeLock) {
          this.activeWakeLock.release();
          this.activeWakeLock = null;
        }
      } catch (err) {
        console.log('[WakeLock] Release skipped:', err);
      }
    }
  }

  global.MBell.WakeLockManager = WakeLockManager;
})(typeof window !== 'undefined' ? window : this);
