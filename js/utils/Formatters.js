/**
 * Utilitas Formatter & String Helper
 * MBell MakeUp Portfolio Studio
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

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

  function sanitizeFileName(fileName) {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const cleanName = nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 35);
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    return `${cleanName}_${timestamp}_${randomSuffix}${ext}`;
  }

  function extractStoragePath(imageUrl, bucketName) {
    if (!imageUrl) return null;
    const activeBucket = bucketName || global.MBell?.CONFIG?.BUCKET_NAME || global.CONFIG?.BUCKET_NAME || 'images_mbell';
    const bucketMarker = `/${activeBucket}/`;
    const idx = imageUrl.indexOf(bucketMarker);
    if (idx !== -1) {
      const pathWithQuery = imageUrl.substring(idx + bucketMarker.length);
      return decodeURIComponent(pathWithQuery.split('?')[0]);
    }
    return null;
  }

  global.MBell.Formatters = {
    formatBytes,
    debounce,
    sanitizeFileName,
    extractStoragePath
  };
})(typeof window !== 'undefined' ? window : this);
