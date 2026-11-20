/**
 * APLIKASI INFO CKG - PUSKESMAS BANJARAN KOTA
 * Module: Android Mobile APK Controller, Hardware Back Button & Bottom Navigation
 */

/* ==========================================================================
   ANDROID MOBILE APK OPTIMIZATIONS & HARDWARE INTERACTION
   ========================================================================== */

/**
 * 1. Penanganan Tombol Back HP Android (Hardware Back Button)
 * Dipanggil langsung oleh MainActivity.java Android atau event Capacitor App.
 * Return 'handled' jika ada aksi yang ditangani (modal tertutup, dropdown ditutup).
 * Return 'unhandled' jika pengguna sudah berada di beranda/dashboard utama
 * (sehingga Android memunculkan konfirmasi keluar).
 */
window.handleAndroidBackButton = function () {
  try {
    // A. Cek jika SweetAlert2 sedang terbuka
    if (window.Swal && typeof Swal.isVisible === 'function' && Swal.isVisible()) {
      Swal.close();
      return 'handled';
    }

    // B. Cek jika searchable dropdown combobox sedang terbuka
    const openPanels = [
      'comboboxLoginSekolahPanel',
      'comboboxPegawaiDropdown',
      'comboboxSekolahPanel',
      'comboboxKelasPanel',
      'comboboxFilterSekolahPanel',
      'comboboxFilterKelasPanel'
    ];
    for (const panelId of openPanels) {
      const panel = document.getElementById(panelId);
      if (panel && (panel.style.display === 'block' || panel.style.display === 'flex' || panel.classList.contains('show'))) {
        panel.style.display = 'none';
        return 'handled';
      }
    }
    if (typeof closeAllWilayahSearchDropdowns === 'function') {
      const wilayahOpen = document.querySelector('.searchable-combobox-panel[style*="block"], .combobox-dropdown-panel[style*="block"]');
      if (wilayahOpen) {
        closeAllWilayahSearchDropdowns();
        return 'handled';
      }
    }

    // C. Cek jika Format Pengisian Pos (Vital, Lab, Fisik, dll) sedang terbuka
    const posPilihan = document.getElementById('modalFormPosPilihan');
    if (posPilihan && (posPilihan.style.display === 'flex' || posPilihan.style.display === 'block' || posPilihan.classList.contains('active'))) {
      if (typeof closeFormPosPopup === 'function') {
        closeFormPosPopup();
        return 'handled';
      }
    }

    // D. Cek modal-modal spesifik CKG Sekolah & Posyandu (urutan prioritas popup)
    const modalClosers = [
      { id: 'tambahSiswaModal', fn: typeof closeTambahSiswaModal === 'function' ? closeTambahSiswaModal : null },
      { id: 'modalPemeriksaanSiswa', fn: typeof closePemeriksaanModal === 'function' ? closePemeriksaanModal : null },
      { id: 'modalCkgGratisPemeriksaan', fn: typeof closePemeriksaanCkgGratisModal === 'function' ? closePemeriksaanCkgGratisModal : null },
      { id: 'modalAbsensiTtd', fn: typeof closeModalAbsensiTtd === 'function' ? closeModalAbsensiTtd : null },
      { id: 'modalAnomaliNik', fn: typeof closeAnomaliNikModal === 'function' ? closeAnomaliNikModal : null },
      { id: 'dukcapilModal', fn: typeof closeDukcapilModal === 'function' ? closeDukcapilModal : null },
      { id: 'modalHasilIndividu', fn: typeof closeHasilIndividuModal === 'function' ? closeHasilIndividuModal : null },
      { id: 'modalLaporanSekolah', fn: typeof closeLaporanSekolahModal === 'function' ? closeLaporanSekolahModal : null },
      { id: 'modalImportSekolah', fn: typeof closeImportSekolahModal === 'function' ? closeImportSekolahModal : null },
      { id: 'modalKelolaSekolah', fn: typeof closeKelolaSekolahModal === 'function' ? closeKelolaSekolahModal : null },
      { id: 'modalHapusDataSekolah', fn: typeof closeHapusDataSekolahModal === 'function' ? closeHapusDataSekolahModal : null },
      { id: 'modalNaikKelas', fn: typeof closeNaikKelasModal === 'function' ? closeNaikKelasModal : null },
      { id: 'modalMigrasiSekolah', fn: typeof closeMigrasiSekolahModal === 'function' ? closeMigrasiSekolahModal : null },
      { id: 'modalDuplicateFinder', fn: typeof closeDuplicateFinderModal === 'function' ? closeDuplicateFinderModal : null },
      { id: 'modalDetailPeserta', fn: typeof closeDetailModal === 'function' ? closeDetailModal : null },
      { id: 'modalInputData', fn: typeof closeInputModal === 'function' ? closeInputModal : null },
      { id: 'modalReturSisaBnhp', fn: () => { const m = document.getElementById('modalReturSisaBnhp'); if (m) m.style.display = 'none'; } },
      { id: 'modalMutasiAlatBnhp', fn: () => { const m = document.getElementById('modalMutasiAlatBnhp'); if (m) m.style.display = 'none'; } },
      { id: 'modalRestockBnhp', fn: () => { const m = document.getElementById('modalRestockBnhp'); if (m) m.style.display = 'none'; } },
      { id: 'modalTambahAlatBnhp', fn: () => { const m = document.getElementById('modalTambahAlatBnhp'); if (m) m.style.display = 'none'; } }
    ];

    for (const item of modalClosers) {
      const el = document.getElementById(item.id);
      if (el && (el.style.display === 'flex' || el.style.display === 'block' || el.classList.contains('active') || el.classList.contains('show'))) {
        if (item.fn) {
          item.fn();
        } else {
          el.style.display = 'none';
          el.classList.remove('active', 'show');
        }
        return 'handled';
      }
    }

    // E. Cek overlay modal umum yang sedang terlihat
    const activeGenericModal = document.querySelector('.modal-overlay.active, .modal.show, .modal-overlay[style*="display: flex"], .modal-overlay[style*="display: block"]');
    if (activeGenericModal) {
      activeGenericModal.style.display = 'none';
      activeGenericModal.classList.remove('active', 'show');
      return 'handled';
    }

    // F. Cek jika berada di portal/view turunan yang memiliki tombol kembali ke portal utama
    const portalContainer = document.getElementById('portalSelectionContainer');
    const mainViewContainer = document.getElementById('mainViewContainer');
    if (portalContainer && portalContainer.style.display === 'none' && mainViewContainer && mainViewContainer.style.display !== 'none') {
      const btnBackPortal = document.getElementById('btnKembaliKePortalUtama');
      if (btnBackPortal && typeof btnBackPortal.onclick === 'function') {
        btnBackPortal.click();
        return 'handled';
      }
    }

    // G. Jika dalam mode APK dan sedang di tab lain (selain Beranda), kembali ke Beranda dulu
    const activeNavBtn = document.querySelector('.apk-nav-btn.active, .nav-tab-btn.active');
    const currentViewName = activeNavBtn ? activeNavBtn.getAttribute('data-view') : '';
    if (currentViewName && currentViewName !== 'dashboard') {
      switchView('dashboard');
      return 'handled';
    }

    return 'unhandled';
  } catch (err) {
    console.warn('[AndroidBackButton] Error handling back button:', err);
    return 'unhandled';
  }
};

/**
 * 2. Floating Offline & Online Connection Detector
 * Menampilkan status jaringan secara elegan di bagian atas layar HP
 */
(function setupAndroidNetworkMonitor() {
  function getOrCreateBanner() {
    let banner = document.getElementById('android-offline-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'android-offline-banner';
      document.body.appendChild(banner);
    }
    return banner;
  }

  function showNetworkStatus(isOnline) {
    const banner = getOrCreateBanner();
    if (!isOnline) {
      banner.className = 'banner-offline is-visible';
      banner.innerHTML = '<i class="bi bi-wifi-off" style="font-size: 15px;"></i> Koneksi internet HP terputus. Pastikan paket data / Wi-Fi aktif.';
    } else {
      banner.className = 'banner-online is-visible';
      banner.innerHTML = '<i class="bi bi-wifi" style="font-size: 15px;"></i> Koneksi tersambung kembali ke server.';
      setTimeout(() => {
        banner.classList.remove('is-visible');
      }, 2500);
    }
  }

  window.addEventListener('offline', () => showNetworkStatus(false));
  window.addEventListener('online', () => showNetworkStatus(true));

  // Cek koneksi awal saat start
  if (!navigator.onLine) {
    setTimeout(() => showNetworkStatus(false), 1000);
  }
})();

/**
 * 3. Auto-save & Restore Form Draft (Pencegahan Kehilangan Data Isian di HP)
 * Menyimpan isian form pemeriksaan dan tambah siswa secara realtime di LocalStorage
 */
(function setupAndroidFormDraftAutoSave() {
  const DRAFT_FORMS = [
    { formId: 'formTambahSiswa', modalId: 'tambahSiswaModal', storageKey: 'ckg_draft_tambah_siswa' },
    { formId: 'formModalPemeriksaan', modalId: 'modalPemeriksaanSiswa', storageKey: 'ckg_draft_periksa_siswa' }
  ];

  DRAFT_FORMS.forEach(({ formId, modalId, storageKey }) => {
    let saveTimeout = null;
    document.addEventListener('input', (e) => {
      const form = document.getElementById(formId);
      if (form && form.contains(e.target)) {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          try {
            const formData = {};
            const inputs = form.querySelectorAll('input:not([type="password"]):not([type="hidden"]), select, textarea');
            inputs.forEach(input => {
              if (input.id && input.value) {
                if (input.type === 'checkbox') {
                  formData[input.id] = input.checked;
                } else if (input.type === 'radio') {
                  if (input.checked) formData[input.name] = input.value;
                } else {
                  formData[input.id] = input.value;
                }
              }
            });
            if (Object.keys(formData).length > 1) {
              formData._timestamp = Date.now();
              localStorage.setItem(storageKey, JSON.stringify(formData));
            }
          } catch (err) {
            console.warn('[AutoSaveDraft] Error saving:', err);
          }
        }, 600);
      }
    });

    const form = document.getElementById(formId);
    if (form) {
      form.addEventListener('submit', () => {
        setTimeout(() => {
          localStorage.removeItem(storageKey);
          const banner = document.getElementById('draftBanner_' + formId);
          if (banner) banner.remove();
        }, 1200);
      });
    }
  });

  window.restoreFormDraft = function (formId, storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      const form = document.getElementById(formId);
      if (!form) return;

      Object.entries(data).forEach(([key, val]) => {
        if (key.startsWith('_')) return;
        const input = form.querySelector('#' + key) || form.querySelector(`[name="${key}"][value="${val}"]`);
        if (input) {
          if (input.type === 'checkbox') {
            input.checked = Boolean(val);
            input.dispatchEvent(new Event('change'));
          } else if (input.type === 'radio') {
            input.checked = true;
            input.dispatchEvent(new Event('change'));
          } else {
            input.value = val;
            input.dispatchEvent(new Event('input'));
            input.dispatchEvent(new Event('change'));
          }
        }
      });

      const banner = document.getElementById('draftBanner_' + formId);
      if (banner) banner.remove();

      if (window.Swal) {
        Swal.fire({
          icon: 'success',
          title: 'Draft Dipulihkan',
          text: 'Data isian sebelumnya berhasil dimuat kembali.',
          timer: 1600,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      }
    } catch (e) {
      console.warn('[RestoreDraft] Error:', e);
    }
  };

  window.discardFormDraft = function (formId, storageKey) {
    localStorage.removeItem(storageKey);
    const banner = document.getElementById('draftBanner_' + formId);
    if (banner) banner.remove();
  };
})();


// =========================================================================
// 5. NATIVE MOBILE APK CONTROLLER & BOTTOM NAVIGATION LOGIC
// =========================================================================

/**
 * Deteksi dan aktifkan layout Native Mobile APK
 */
(function initApkModeDetection() {
  const isCapacitor = Boolean(
    (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
    window.location.protocol === 'capacitor:' ||
    window.location.hostname === 'localhost' ||
    (navigator.userAgent && navigator.userAgent.includes('Capacitor')) ||
    window.location.search.includes('apk=1') ||
    window.location.search.includes('native=1') ||
    window.location.search.includes('mobile=1')
  );

  if (isCapacitor) {
    document.documentElement.classList.add('is-native-apk');
    document.body.classList.add('is-native-apk');
    window.IS_NATIVE_APK = true;
    console.log('[NativeAPK] Mode Native Mobile APK Aktif');
  }

  // Update status online / offline di header APK
  function updateApkNetworkBadge() {
    const dot = document.getElementById('apkHeaderPulseDot');
    const label = document.getElementById('apkHeaderStatusLabel');
    const chip = document.getElementById('apkHeaderOnlineChip');
    if (!dot || !label) return;

    if (navigator.onLine) {
      dot.className = 'apk-pulse-dot';
      label.textContent = 'Online';
      if (chip) chip.style.background = '#f0fdf4';
    } else {
      dot.className = 'apk-pulse-dot offline';
      label.textContent = 'Offline';
      if (chip) chip.style.background = '#fef2f2';
    }
  }

  window.addEventListener('online', updateApkNetworkBadge);
  window.addEventListener('offline', updateApkNetworkBadge);
  document.addEventListener('DOMContentLoaded', updateApkNetworkBadge);
})();

/**
 * Handler Klik Item Navigasi Bawah APK
 */
window.handleApkNavClick = function (viewId) {
  if (window.navigator?.vibrate) {
    try { window.navigator.vibrate(20); } catch (_) { }
  }
  if (typeof switchView === 'function') {
    switchView(viewId);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Bottom Sheet / Dialog Menu Petugas untuk APK
 */
window.openApkUserSheet = function (e) {
  if (e) e.stopPropagation();
  const userName = sessionStorage.getItem('ckg_user_name') || 'Petugas CKG';
  const userRole = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toUpperCase();
  const isDark = document.body.classList.contains('dark-mode');

  if (!window.Swal) return;

  const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  Swal.fire({
    title: '',
    html: `
      <div style="text-align: left; padding: 4px;">
        <div style="display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid #e2e8f0; margin-bottom: 14px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; box-shadow: 0 4px 10px rgba(37,99,235,0.3);">
            ${escapeHtml(initials)}
          </div>
          <div style="overflow: hidden;">
            <div style="font-weight: 800; font-size: 15px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(userName)}</div>
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 3px;">
              <span class="badge" style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 12px;">${escapeHtml(userRole)}</span>
              <span style="font-size: 11px; color: #64748b;">Puskesmas Banjaran</span>
            </div>
          </div>
        </div>

        <div style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Menu Tambahan</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          <button type="button" class="btn" onclick="Swal.close(); switchView('data-records');" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; font-size: 12px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 8px; justify-content: flex-start;">
            <i class="bi bi-folder-symlink-fill" style="color: #2563eb; font-size: 15px;"></i> Records
          </button>
          <button type="button" class="btn" onclick="Swal.close(); switchView('alat-bnhp');" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; font-size: 12px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 8px; justify-content: flex-start;">
            <i class="bi bi-box-seam-fill" style="color: #059669; font-size: 15px;"></i> Alat & BNHP
          </button>
          <button type="button" class="btn" onclick="Swal.close(); switchView('laporan');" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; font-size: 12px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 8px; justify-content: flex-start;">
            <i class="bi bi-file-earmark-bar-graph" style="color: #d97706; font-size: 15px;"></i> Laporan
          </button>
          <button type="button" class="btn" onclick="Swal.close(); openAccountSettingsModal();" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; font-size: 12px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 8px; justify-content: flex-start;">
            <i class="bi bi-gear-fill" style="color: #64748b; font-size: 15px;"></i> Pengaturan
          </button>
        </div>

        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn" onclick="Swal.close(); toggleDarkMode();" style="flex: 1; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; font-size: 12.5px; font-weight: 700; color: #334155;">
            <i class="bi bi-moon-stars-fill" style="color: #f59e0b;"></i> ${isDark ? 'Mode Terang' : 'Mode Gelap'}
          </button>
          <button type="button" class="btn" onclick="Swal.close(); handleLogout();" style="flex: 1; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 10px; font-size: 12.5px; font-weight: 700; color: #dc2626;">
            <i class="bi bi-power"></i> Keluar
          </button>
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: 'Tutup',
    cancelButtonColor: '#94a3b8',
    customClass: { popup: 'rounded-2xl shadow-2xl' }
  });
};
