/**
 * Application Entry Point & Bootstrap
 * MBell MakeUp Portfolio Studio (Universal Zero-CORS OOP Architecture)
 */

(function(global) {
  'use strict';
  global.MBell = global.MBell || {};

  const MB = global.MBell;

  // Inisialisasi Master Controller
  const app = new MB.AppController();

  // Global namespace & backward compatibility
  global.app = app;
  global.AppController = MB.AppController;

  // Legacy SupabaseService wrapper untuk kompatibilitas
  global.SupabaseService = {
    checkConnection: () => MB.supabaseClientInstance.checkConnection(),
    getCategories: () => MB.categoryServiceInstance.getCategories(),
    addCategory: (cat) => MB.categoryServiceInstance.addCategory(cat),
    renameCategory: (oldCat, newCat) => MB.categoryServiceInstance.renameCategory(oldCat, newCat),
    deleteCategory: (cat, del) => MB.categoryServiceInstance.deleteCategory(cat, del),
    getImages: (cat, q) => MB.photoServiceInstance.getImages(cat, q),
    uploadPhoto: (f, m) => MB.photoServiceInstance.uploadPhoto(f, m),
    updatePhoto: (id, u, curr) => MB.photoServiceInstance.updatePhoto(id, u, curr),
    updatePhotosCategoryBatch: (p, c) => MB.photoServiceInstance.updatePhotosCategoryBatch(p, c),
    deletePhoto: (id, url) => MB.photoServiceInstance.deletePhoto(id, url),
    deletePhotosBatch: (p) => MB.photoServiceInstance.deletePhotosBatch(p)
  };

  // Inisialisasi saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
  } else {
    app.init();
  }
})(typeof window !== 'undefined' ? window : this);
