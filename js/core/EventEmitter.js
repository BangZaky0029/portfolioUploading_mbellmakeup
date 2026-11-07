/**
 * Lightweight Event Emitter (Pub/Sub)
 * Digunakan untuk komunikasi antar komponen secara decoupled
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  class EventEmitter {
    constructor() {
      this.events = new Map();
    }

    /**
     * Daftarkan listener untuk suatu event
     * @param {string} event 
     * @param {Function} handler 
     * @returns {Function} Unsubscribe function
     */
    on(event, handler) {
      if (!this.events.has(event)) {
        this.events.set(event, new Set());
      }
      this.events.get(event).add(handler);

      return () => this.off(event, handler);
    }

    /**
     * Hapus listener
     * @param {string} event 
     * @param {Function} handler 
     */
    off(event, handler) {
      if (this.events.has(event)) {
        this.events.get(event).delete(handler);
      }
    }

    /**
     * Pancarkan event beserta data payload
     * @param {string} event 
     * @param {*} payload 
     */
    emit(event, payload) {
      if (this.events.has(event)) {
        this.events.get(event).forEach(handler => {
          try {
            handler(payload);
          } catch (err) {
            console.error(`[EventEmitter] Error on '${event}':`, err);
          }
        });
      }
    }
  }

  global.MBell.EventEmitter = EventEmitter;
})(typeof window !== 'undefined' ? window : this);
