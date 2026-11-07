/**
 * Central Reactive State Store
 * Single source of truth untuk state aplikasi MBell MakeUp
 */

(function (global) {
  'use strict';
  global.MBell = global.MBell || {};

  class StateStore {
    constructor(initialState = {}) {
      this.state = {
        categories: [],
        activeCategory: 'all',
        photos: [],
        stagedFiles: [],
        searchQuery: '',
        isUploading: false,
        selectedPhotoIds: new Set(),
        isSelectionMode: false,
        ...initialState
      };
      this.listeners = new Set();
    }

    /**
     * Ambil salinan state saat ini
     * @returns {Object}
     */
    getState() {
      return this.state;
    }

    /**
     * Perbarui state dan beritahukan seluruh listener
     * @param {Object} updates 
     */
    setState(updates) {
      const prevState = { ...this.state };
      this.state = { ...this.state, ...updates };
      this.notify(this.state, prevState);
    }

    /**
     * Langganan perubahan state
     * @param {Function} listener 
     * @returns {Function} Unsubscribe
     */
    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    notify(state, prevState) {
      this.listeners.forEach(listener => {
        try {
          listener(state, prevState);
        } catch (err) {
          console.error('[StateStore] Listener error:', err);
        }
      });
    }
  }

  global.MBell.StateStore = StateStore;
})(typeof window !== 'undefined' ? window : this);