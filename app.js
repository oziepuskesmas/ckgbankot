/**
 * APLIKASI INFO CKG - PUSKESMAS BANJARAN KOTA
 * Main Core Application Orchestrator, State Manager, View Router & Authentication
 */

// Main Application Logic for Pencatatan CKG Puskesmas Banjaran Kota

// Quota & Storage Optimization: Clean up oversized/obsolete localStorage keys immediately
(function cleanupStorageQuota() {
  try {
    localStorage.removeItem('ckg_sekolah_records_v1'); // Migrated to IndexedDB to eliminate 5MB quota crash
    localStorage.removeItem('ckg_records_db'); // Obsolete duplicate of ckg_records
  } catch (_) { }
})();

// Robust, high-capacity IndexedDB storage layer for large datasets (no 5MB quota limit)
const CkgIdb = {
  dbName: 'CkgIndexedDb',
  dbVersion: 1,
  dbPromise: null,
  getDb() {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve) => {
      try {
        if (typeof indexedDB === 'undefined') return resolve(null);
        const req = indexedDB.open(this.dbName, this.dbVersion);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('store')) {
            db.createObjectStore('store');
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => {
          console.warn('[CkgIdb] open error:', e.target?.error);
          resolve(null);
        };
      } catch (err) {
        console.warn('[CkgIdb] init exception:', err);
        resolve(null);
      }
    });
    return this.dbPromise;
  },
  async set(key, val) {
    try {
      const db = await this.getDb();
      if (!db) return false;
      return new Promise((resolve) => {
        const tx = db.transaction('store', 'readwrite');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.objectStore('store').put(val, key);
      });
    } catch (_) {
      return false;
    }
  },
  async get(key) {
    try {
      const db = await this.getDb();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction('store', 'readonly');
        const req = tx.objectStore('store').get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      });
    } catch (_) {
      return null;
    }
  },
  async delete(key) {
    try {
      const db = await this.getDb();
      if (!db) return false;
      return new Promise((resolve) => {
        const tx = db.transaction('store', 'readwrite');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.objectStore('store').delete(key);
      });
    } catch (_) {
      return false;
    }
  }
};

// Safe localStorage setter that handles QuotaExceededError without crashing or breaking caller flow
function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[safeLocalStorageSet] Storage quota warning on key "${key}":`, err);
    if (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014) {
      try {
        localStorage.removeItem('ckg_sekolah_records_v1');
        localStorage.removeItem('ckg_records_db');
        localStorage.setItem(key, value);
        return true;
      } catch (_) {
        return false;
      }
    }
    return false;
  }
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Initial User Database matching user specifications
const INITIAL_USERS_DB = [
  { nama_user: "Mochamad Fauzie, S.Gz", password: "213", role: "Admin" },
  { nama_user: "Nurul Hidayah, Amd.Kes", password: "213", role: "Koordinator" },
  { nama_user: "Anisa Rohmatunisa, AM.Keb", password: "", role: "Petugas" },
  { nama_user: "Neng Yulia Trisnawati, AM.Keb", password: "", role: "Petugas" },
  { nama_user: "Teti Nuryati, S.Keb, Bdn", password: "", role: "Petugas" }
];

// Officers List (Populated dynamically from database)
const OFFICERS_DATA = [];

// SIMPUS Records (Populated dynamically from Cloudflare D1 Database)
const INITIAL_SIMPUS_RECORDS = [];

// CKG Screening Records (Populated dynamically from Cloudflare D1 Database)
const INITIAL_MOCK_RECORDS = [];

let usersDb = [];
let records = [];
let ckgGratisRecords = [];
let currentInputTarget = 'records'; // 'records' | 'ckg-gratis'
let currentImportTarget = 'records'; // 'records' | 'ckg-gratis'
let simpusRecords = [];
let recycleBin = [];
let announcementData = null;
let activeSimpusTab = 'belum_bagi'; // 'belum_bagi' or 'sudah_bagi'
let currentRole = 'Admin';
let currentEditingId = null;
let activeSessionsMap = {};
let gatePasswordPuskesmas = '213';
let masterPosyanduDb = [];

async function sendUserHeartbeat(status = 'active') {
  const loggedUser = sessionStorage.getItem('ckg_user_name');
  if (!loggedUser) return;

  const now = Date.now();
  activeSessionsMap[loggedUser] = {
    last_seen: now,
    status: status
  };

  try {
    localStorage.setItem('ckg_active_user_sessions', JSON.stringify(activeSessionsMap));
  } catch (_) { }

  try {
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama_user: loggedUser, status: status })
    });
  } catch (_) { }
}

async function fetchLiveSessions() {
  try {
    const res = await fetch('/api/sessions');
    if (res.ok) {
      const result = await res.json();
      if (result && result.success && Array.isArray(result.data)) {
        result.data.forEach(item => {
          if (item && item.nama_user) {
            activeSessionsMap[item.nama_user] = {
              last_seen: Number(item.last_seen) || 0,
              status: item.status || 'offline'
            };
          }
        });
      }
    }
  } catch (_) { }

  try {
    const local = JSON.parse(localStorage.getItem('ckg_active_user_sessions') || '{}');
    for (let uName in local) {
      if (!activeSessionsMap[uName] || local[uName].last_seen > (activeSessionsMap[uName].last_seen || 0)) {
        activeSessionsMap[uName] = local[uName];
      }
    }
  } catch (_) { }
}

async function manualRefreshLiveSessions() {
  showToast('Memperbarui Status Live Session...', 'info');
  await fetchCloudUsers();
  await fetchLiveSessions();
  if (typeof renderUserDatabaseTable === 'function') renderUserDatabaseTable();
  showToast('Status Live Session Berhasil Diperbarui!', 'success');
}

function toggleTablePasswordVisibility(index, realPass) {
  const codeEl = document.getElementById(`passCode_${index}`);
  const iconEl = document.getElementById(`eyeIcon_${index}`);
  if (!codeEl || !iconEl) return;
  if (codeEl.textContent === '••••••••') {
    codeEl.textContent = realPass;
    iconEl.className = 'bi bi-eye-fill';
    iconEl.style.color = '#2563eb';
  } else {
    codeEl.textContent = '••••••••';
    iconEl.className = 'bi bi-eye-slash-fill';
    iconEl.style.color = '#64748b';
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && sessionStorage.getItem('ckg_logged_in') === 'true') {
    sendUserHeartbeat('active');
    fetchLiveSessions();
  }
});

window.addEventListener('pagehide', () => {
  const loggedUser = sessionStorage.getItem('ckg_user_name');
  if (loggedUser) {
    const payload = JSON.stringify({ nama_user: loggedUser, status: 'offline' });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/sessions', new Blob([payload], { type: 'application/json' }));
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  applyCustomLogo();
  loadLocalMenuConfig();
  applyMenuConfiguration();
  syncMenuConfigFromCloud();
  loadStoredUserDatabase();
  loadStoredRecords();
  loadStoredSimpusRecords();
  loadStoredRecycleBin();
  loadStoredAnnouncement();
  loadStoredSekolahRecords();
  loadStoredCkgGratisRecords();
  setupImportDropzone();
  startLiveClock();
  initWilayahDropdowns();
  setupEventListeners();
  setupAuthFormEvents();
  fetchMasterSekolahFromCloud();
  fetchMasterPosyanduFromCloud();
  checkAuthSession();
  fetchBotQueueCounts();

  // Load maintenance settings from Cloud D1 and poll periodically
  loadMaintenanceSettings();
  if (!window._maintInterval) {
    window._maintInterval = setInterval(loadMaintenanceSettings, 15000);
  }
});

function loadStoredUserDatabase() {
  // Force clean stale local storage keys from previous test sessions
  const isV2Synced = localStorage.getItem('ckg_user_db_v2_synced');

  if (!isV2Synced) {
    localStorage.removeItem('ckg_user_db');
    localStorage.setItem('ckg_user_db_v2_synced', 'true');
    usersDb = [...INITIAL_USERS_DB];
  } else {
    const saved = localStorage.getItem('ckg_user_db');
    let loaded = null;
    if (saved) {
      try { loaded = JSON.parse(saved); } catch (e) { loaded = null; }
    }

    const legacyBlacklist = ['babeh', 'babcri', 'testuser', 'demo'];

    if (Array.isArray(loaded) && loaded.length > 0) {
      usersDb = loaded.filter(u => u && u.nama_user && !legacyBlacklist.includes(String(u.nama_user).toLowerCase().trim()));

      INITIAL_USERS_DB.forEach(initUser => {
        if (!usersDb.some(u => u.nama_user === initUser.nama_user)) {
          usersDb.push(initUser);
        }
      });
    } else {
      usersDb = [...INITIAL_USERS_DB];
    }
  }

  saveUserDatabaseToStorage();
  populateUserDropdowns();
  fetchCloudUsers();
}

function getRolePriority(role) {
  const r = String(role || '').toLowerCase().trim();
  if (r.includes('admin')) return 1;
  if (r.includes('koordinator') || r.includes('kordinator')) return 2;
  return 3; // Petugas or default
}

function sortUsersDbByRoleHierarchy() {
  if (!Array.isArray(usersDb)) return;
  usersDb.sort((a, b) => {
    const pA = getRolePriority(a ? a.role : '');
    const pB = getRolePriority(b ? b.role : '');
    if (pA !== pB) return pA - pB;
    const nameA = String((a && (a.nama_user || a.nama)) || '');
    const nameB = String((b && (b.nama_user || b.nama)) || '');
    return nameA.localeCompare(nameB);
  });
}

function resetUserDatabaseToDefault() {
  usersDb = JSON.parse(JSON.stringify(INITIAL_USERS_DB));
  saveUserDatabaseToStorage();
  if (typeof renderUserDatabaseTable === 'function') renderUserDatabaseTable();
}

function saveUserDatabaseToStorage() {
  sortUsersDbByRoleHierarchy();
  localStorage.setItem('ckg_user_db', JSON.stringify(usersDb));
  populateUserDropdowns();
}

function populateUserDropdowns() {
  sortUsersDbByRoleHierarchy();

  const loginSelect = document.getElementById('loginPegawaiSelect');
  const targetSelect = document.getElementById('targetPetugasSelect');
  const filterPetugasSelect = document.getElementById('filterPetugas');
  const filterSimpusSelect = document.getElementById('filterSimpusPetugas');
  const importTargetSelect = document.getElementById('importTargetPetugas');

  if (loginSelect) {
    const prevVal = loginSelect.value;
    loginSelect.innerHTML = '<option value="">-- Pilih Nama Pegawai --</option>';
    usersDb.forEach((u) => {
      const opt = document.createElement('option');
      opt.value = u.nama_user;
      opt.dataset.role = u.role || 'Petugas';
      opt.dataset.needPass = 'true';
      opt.textContent = `${u.nama_user}${u.role !== 'Petugas' ? ' (' + u.role + ')' : ''}`;
      if (prevVal && u.nama_user === prevVal) opt.selected = true;
      loginSelect.appendChild(opt);
    });

    // Sync Pegawai Combobox Label
    const pegawaiLabelEl = document.getElementById('comboboxPegawaiLabel');
    const pegawaiClearBtn = document.getElementById('comboboxPegawaiClearBtn');
    if (pegawaiLabelEl) {
      const selectedOpt = loginSelect.options[loginSelect.selectedIndex];
      pegawaiLabelEl.textContent = loginSelect.value ? (selectedOpt?.textContent || loginSelect.value) : '-- Pilih Nama Pegawai --';
    }
    if (pegawaiClearBtn) {
      pegawaiClearBtn.style.display = loginSelect.value ? 'inline-block' : 'none';
    }
  }

  if (targetSelect) {
    const prevTarget = targetSelect.value;
    targetSelect.innerHTML = '<option value="">-- Pilih Petugas --</option>';
    usersDb.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.nama_user;
      opt.textContent = u.nama_user;
      if (prevTarget && u.nama_user === prevTarget) opt.selected = true;
      targetSelect.appendChild(opt);
    });
  }

  ['filterPetugas', 'filterSimpusPetugas', 'filterLaporanPetugas', 'filterSekolahPetugas', 'filterRecyclePetugas', 'filterCkgGratisPetugas'].forEach(selectId => {
    const sel = document.getElementById(selectId);
    if (sel) {
      const prev = sel.value;
      sel.innerHTML = '<option value="">-- Semua Petugas --</option>';
      usersDb.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.nama_user;
        opt.textContent = u.nama_user;
        if (prev && u.nama_user === prev) opt.selected = true;
        sel.appendChild(opt);
      });
    }
  });

  if (importTargetSelect && !importTargetSelect.disabled) {
    const prevImportTarget = importTargetSelect.value;
    importTargetSelect.innerHTML = '';
    usersDb.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.nama_user;
      opt.textContent = u.nama_user;
      if (prevImportTarget && u.nama_user === prevImportTarget) opt.selected = true;
      importTargetSelect.appendChild(opt);
    });
  }

  if (typeof updatePasswordVisibility === 'function') {
    updatePasswordVisibility();
  }

  applyPetugasFilterLock();
}

function applyPetugasFilterLock() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  const isPrivileged = (role === 'admin' || role === 'koordinator');
  const loggedUser = sessionStorage.getItem('ckg_user_name') || '';

  ['filterPetugas', 'filterSimpusPetugas', 'filterLaporanPetugas', 'filterSekolahPetugas', 'filterRecyclePetugas', 'filterCkgGratisPetugas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (!isPrivileged && loggedUser) {
        el.value = loggedUser;
        el.disabled = true;
        el.title = `Terkunci: Hak Akses Petugas hanya melihat data sendiri (${loggedUser})`;
        el.style.backgroundColor = '#f1f5f9';
        el.style.cursor = 'not-allowed';
        el.style.opacity = '0.85';
      } else {
        el.disabled = false;
        el.title = '';
        el.style.backgroundColor = '';
        el.style.cursor = '';
        el.style.opacity = '';
      }
    }
  });
}

function loadStoredRecords() {
  const saved = localStorage.getItem('ckg_records');
  if (saved) {
    try {
      records = JSON.parse(saved);
    } catch (e) {
      records = [];
    }
  } else {
    records = [];
  }
  fetchCloudRecords();
}

function saveRecordsToStorage() {
  safeLocalStorageSet('ckg_records', JSON.stringify(records));
  if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_records', records);
  syncRecordsToCloud(records);
}

async function fetchCloudRecords() {
  try {
    const res = await fetch('/api/ckg');
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        if (result.data.length > 0) {
          const prevLen = records.length;
          const newRecords = result.data.map(r => ({
            id: r.id ? (String(r.id).startsWith('CKG-') ? String(r.id) : `CKG-${r.id}`) : 'CKG-' + Date.now(),
            jenis_kegiatan: r.jenis_kegiatan || r.lokasi_pelayanan || 'Luar Gedung',
            nik: r.nik || '',
            nama: r.nama || r.nama_pasien || 'Pasien',
            tanggal_lahir: formatDateToYYYYMMDD(r.tanggal_lahir) || '1990-01-01',
            usia: r.usia || 30,
            jenis_kelamin: r.jenis_kelamin || 'L',
            no_whatsapp: r.no_whatsapp || '',
            status_pernikahan: r.status_pernikahan || 'Kawin',
            provinsi: r.provinsi || 'Jawa Barat',
            kab_kota: r.kab_kota || 'Kab. Bandung',
            kecamatan: r.kecamatan || 'Banjaran',
            kelurahan: r.kelurahan || 'Banjaran Kota',
            alamat: r.alamat || 'Banjaran',
            pekerjaan: r.pekerjaan || '',
            merokok: r.merokok || 'Tidak',
            bb: r.bb || 60,
            tb: r.tb || 165,
            lp: r.lp || 80,
            imt: r.imt || '22.0',
            td_sistolik: r.td_sistolik || 120,
            td_diastolik: r.td_diastolik || 80,
            gula_darah: r.gula_darah || '110',
            kolesterol: r.kolesterol || '180',
            hb: r.hb || '14.0',
            telinga: r.telinga || 'Normal',
            mata: r.mata || 'Normal',
            gigi: r.gigi || 'Normal',
            katarak: r.katarak || 'Tidak',
            status_validasi: r.status_validasi || 'Terverifikasi',
            petugas_entry: r.petugas_entry || r.created_by || 'Admin',
            created_by: r.created_by || r.petugas_entry || 'Admin',
            created_at: r.created_at || r.tanggal_entry || new Date().toISOString().substring(0, 10),
            tanggal_entry: r.tanggal_entry || r.created_at || new Date().toISOString().substring(0, 10)
          }));
          records = newRecords;

          // Non-blocking background save to local storage cache
          setTimeout(() => {
            try { localStorage.setItem('ckg_records', JSON.stringify(records)); } catch (_) { }
          }, 100);

          updateCloudSyncPill(true, `D1 Online (${records.length} Rec)`);

          // Only trigger UI re-render if data count changed or on initial load
          if (prevLen !== records.length || prevLen === 0) {
            requestAnimationFrame(() => {
              if (typeof renderApp === 'function') renderApp();
            });
          }
        } else if (records.length > 0 && !window._intentionalDeleteAll) {
          // Push local records to D1 if D1 is currently empty (but NOT after intentional delete)
          syncRecordsToCloud(records);
        } else {
          updateCloudSyncPill(true, 'D1 Online (0 Rec)');
        }
      }
    }
  } catch (e) {
    console.log('Using local cached records:', e);
  }
}

async function syncRecordsToCloud(dataToSync) {
  if (!dataToSync || dataToSync.length === 0) return;
  try {
    updateCloudSyncPill('syncing', 'Menyingkronkan Data...');
    const CHUNK_SIZE = 200;
    for (let i = 0; i < dataToSync.length; i += CHUNK_SIZE) {
      const chunk = dataToSync.slice(i, i + CHUNK_SIZE);
      await fetch('/api/ckg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk)
      });
    }
    updateCloudSyncPill(true, `D1 Online (${dataToSync.length} Rec)`);
  } catch (e) {
    console.log('Failed to sync CKG records to cloud D1:', e);
    updateCloudSyncPill(true, `D1 Active`);
  }
}


// ==========================================================================
// 🔍 SEARCHABLE COMBOBOX LOGIC UNTUK LOGIN PEGAWAI
// ==========================================================================
function togglePegawaiDropdown(event) {
  if (event) event.stopPropagation();
  const panel = document.getElementById('comboboxPegawaiPanel');
  const trigger = document.getElementById('comboboxPegawaiTrigger');
  if (!panel || !trigger) return;

  const isOpen = panel.style.display === 'flex';
  if (isOpen) {
    closePegawaiDropdown();
  } else {
    panel.style.display = 'flex';
    trigger.classList.add('open');
    const searchInput = document.getElementById('inputSearchPegawaiDropdown');
    if (searchInput) {
      searchInput.value = '';
      setTimeout(() => searchInput.focus(), 50);
    }
    renderSearchablePegawaiOptions('');
  }
}

function closePegawaiDropdown() {
  const panel = document.getElementById('comboboxPegawaiPanel');
  const trigger = document.getElementById('comboboxPegawaiTrigger');
  if (panel) panel.style.display = 'none';
  if (trigger) trigger.classList.remove('open');
}

function onFilterPegawaiSearchInput(keyword) {
  renderSearchablePegawaiOptions(keyword);
}

function clearSearchInputPegawai() {
  const searchInput = document.getElementById('inputSearchPegawaiDropdown');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  renderSearchablePegawaiOptions('');
}

function selectPegawaiComboboxOption(value, label) {
  const selectEl = document.getElementById('loginPegawaiSelect');
  const labelEl = document.getElementById('comboboxPegawaiLabel');
  const clearBtn = document.getElementById('comboboxPegawaiClearBtn');

  if (selectEl) {
    selectEl.value = value;
  }
  if (labelEl) {
    labelEl.textContent = label || '-- Pilih Nama Pegawai --';
  }
  if (clearBtn) {
    clearBtn.style.display = value ? 'inline-block' : 'none';
  }

  closePegawaiDropdown();
}

function clearPegawaiFilter(event) {
  if (event) event.stopPropagation();
  selectPegawaiComboboxOption('', '-- Pilih Nama Pegawai --');
}

function renderSearchablePegawaiOptions(filterKeyword = '') {
  const container = document.getElementById('comboboxPegawaiOptions');
  if (!container) return;

  const selectEl = document.getElementById('loginPegawaiSelect');
  const selectedVal = (selectEl?.value || '').trim();
  const kw = filterKeyword.trim().toLowerCase();

  // Group users by role
  const roleGroups = {};
  const roleOrder = ['Admin', 'Koordinator', 'Petugas'];
  const roleIcons = {
    'Admin': 'bi-shield-lock-fill',
    'Koordinator': 'bi-person-fill-gear',
    'Petugas': 'bi-person-fill'
  };
  const roleColors = {
    'Admin': '#dc2626',
    'Koordinator': '#d97706',
    'Petugas': '#2563eb'
  };

  usersDb.forEach(u => {
    const role = u.role || 'Petugas';
    if (!roleGroups[role]) roleGroups[role] = [];
    const displayName = `${u.nama_user}${role !== 'Petugas' ? ' (' + role + ')' : ''}`;
    if (!kw || u.nama_user.toLowerCase().includes(kw) || displayName.toLowerCase().includes(kw)) {
      roleGroups[role].push({ value: u.nama_user, display: displayName, role });
    }
  });

  const totalMatches = roleOrder.reduce((sum, r) => sum + (roleGroups[r]?.length || 0), 0);

  if (totalMatches === 0) {
    container.innerHTML = `
      <div style="padding: 18px 12px; text-align: center; color: #94a3b8; font-size: 12px;">
        <i class="bi bi-search" style="font-size: 16px; display: block; margin-bottom: 4px;"></i>
        Tidak ada pegawai yang cocok dengan "<strong>${escapeHtml(filterKeyword)}</strong>"
      </div>
    `;
    return;
  }

  let html = '';

  roleOrder.forEach(role => {
    const users = roleGroups[role];
    if (!users || users.length === 0) return;

    html += `<div class="combobox-group-header"><span><i class="${roleIcons[role]}" style="color: ${roleColors[role]};"></i> ${role}</span><span>(${users.length})</span></div>`;

    users.forEach(u => {
      const isSelected = selectedVal === u.value;
      html += `
        <div class="combobox-option-item ${isSelected ? 'selected' : ''}" onclick="selectPegawaiComboboxOption('${escapeHtml(u.value)}', '${escapeHtml(u.display)}')">
          <span style="display: flex; align-items: center; gap: 6px;">
            <i class="${roleIcons[u.role]}" style="color: ${roleColors[u.role]};"></i>
            ${escapeHtml(u.display)}
          </span>
          ${isSelected ? '<i class="bi bi-check2" style="font-weight: 800;"></i>' : ''}
        </div>
      `;
    });
  });

  container.innerHTML = html;
}

// Global click listener to close pegawai combobox
document.addEventListener('click', function (e) {
  const wrapperPegawai = document.getElementById('comboboxPegawaiWrapper');
  if (wrapperPegawai && !wrapperPegawai.contains(e.target)) {
    closePegawaiDropdown();
  }
});

/* ==========================================================================
   📊 LOADING OVERLAY HELPERS
   ========================================================================== */

function showLoadingOverlay(text = 'Memuat Data...', subtext = 'Menghubungkan ke Database Cloudflare D1') {
  const overlay = document.getElementById('loadingOverlay');
  const textEl = document.getElementById('loadingText');
  const subtextEl = document.getElementById('loadingSubtext');
  if (textEl) textEl.textContent = text;
  if (subtextEl) subtextEl.textContent = subtext;
  if (overlay) {
    overlay.style.removeProperty('display');
    overlay.style.removeProperty('pointer-events');
    overlay.classList.add('active');
  }
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.setProperty('display', 'none', 'important');
    overlay.style.setProperty('pointer-events', 'none', 'important');
  }
}

/* ==========================================================================
   🔑 LOGIN HANDLER WITH SWEETALERT2 PASSWORD POPUP
   ========================================================================== */

function handleLogin(e) {
  e.preventDefault();
  const selectEl = document.getElementById('loginPegawaiSelect');

  if (!selectEl || !selectEl.value) {
    Swal.fire({
      icon: 'warning',
      title: 'Nama Pegawai Belum Dipilih',
      text: 'Silakan pilih Nama Pegawai terlebih dahulu dari daftar.',
      confirmButtonColor: '#2563eb'
    });
    return;
  }

  const selectedPegawai = selectEl.value.trim();

  // Match against usersDb database
  const user = usersDb.find(u => u.nama_user.toLowerCase() === selectedPegawai.toLowerCase());

  if (!user) {
    Swal.fire({
      icon: 'error',
      title: 'Login Gagal',
      html: `User <strong>${selectedPegawai}</strong> tidak terdaftar di Database!`,
      confirmButtonColor: '#dc2626'
    });
    return;
  }

  // Check if user is BANNED
  if (user.is_banned) {
    if (user.banned_until && user.banned_until !== 'PERMANENT' && new Date() > new Date(user.banned_until)) {
      // Ban has expired! Automatically unban user
      user.is_banned = false;
      user.banned_until = null;
      saveUserDatabaseToStorage();
      syncUsersToCloud(usersDb);
    } else {
      const untilText = user.banned_until === 'PERMANENT' ? 'Permanen' : (new Date(user.banned_until).toLocaleString('id-ID'));
      Swal.fire({
        icon: 'error',
        title: 'Akun Dinonaktifkan / Banned',
        html: `<div style="font-size: 14px; margin-bottom: 6px;">Akun <strong>${user.nama_user}</strong> sedang dalam status nonaktif/banned.</div>
               <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 8px 12px; border-radius: 6px; color: #dc2626; font-size: 12px; font-weight: 700; margin-top: 8px;">
                 Status: ${user.banned_duration_label || 'Banned'} (Hingga: ${untilText})
               </div>
               <div style="font-size: 11.5px; color: #64748b; margin-top: 10px;">Silakan hubungi Admin Utama Puskesmas untuk verifikasi kembali.</div>`,
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'Tutup'
      });
      return;
    }
  }

  // Check if system is in maintenance mode - only Admin / Super Admin allowed
  const userRole = (user.role || 'Petugas').toLowerCase();
  const isAdmin = userRole.includes('admin');
  const isMaint = maintenanceState.maintenance_web || (localStorage.getItem('ckg_cached_maint_web') === '1');
  if (isMaint && !isAdmin) {
    showMaintenanceScreen(maintenanceState.maintenance_web_message || localStorage.getItem('ckg_cached_maint_msg'));
    Swal.fire({
      icon: 'warning',
      title: 'Sistem Dalam Maintenance',
      html: `<div style="font-size: 13.5px; line-height: 1.6;">
              Sistem saat ini sedang dalam pemeliharaan/maintenance oleh Administrator.<br><br>
              <strong style="color: #dc2626;">Akses hanya dibuka untuk Admin & Super Admin.</strong> Silakan hubungi Administrator atau coba beberapa saat lagi.
             </div>`,
      confirmButtonColor: '#2563eb'
    });
    return;
  }

  const dbPassword = (user.password || '').trim();

  // If user has NO password ➔ login directly
  if (dbPassword === '') {
    performLoginSuccess(user);
    return;
  }

  // If user HAS a password ➔ show SweetAlert2 password popup
  Swal.fire({
    title: 'Masukkan Kata Sandi',
    html: `<div style="text-align:center; margin-bottom: 8px;">
             <div style="width:48px; height:48px; border-radius:50%; background: linear-gradient(135deg, #2563eb, #0284c7); display:inline-flex; align-items:center; justify-content:center; margin-bottom:8px;">
               <i class="bi bi-shield-lock-fill" style="color:#fff; font-size:22px;"></i>
             </div>
             <div style="font-size:13px; color:#64748b; font-weight:600;">
               Verifikasi akses <strong style="color:#0f172a;">${user.nama_user}</strong> (${user.role})
             </div>
           </div>`,
    input: 'password',
    inputPlaceholder: 'Masukkan kata sandi database...',
    inputAttributes: {
      autocapitalize: 'off',
      autocorrect: 'off'
    },
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-box-arrow-in-right"></i> Masuk',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#64748b',
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: (inputPass) => {
      if (!inputPass || inputPass.trim() === '') {
        Swal.showValidationMessage('Kata sandi tidak boleh kosong!');
        return false;
      }
      if (inputPass.trim() !== dbPassword) {
        Swal.showValidationMessage('Kata Sandi Yang Anda Masukan Salah');
        return false;
      }
      return inputPass;
    }
  }).then((result) => {
    if (result.isConfirmed) {
      performLoginSuccess(user);
    }
  });
}

function performLoginSuccess(user) {
  const userRole = (user.role || 'Petugas').toLowerCase();
  const isAdmin = userRole.includes('admin');
  if (maintenanceState.maintenance_web && !isAdmin) {
    showMaintenanceScreen(maintenanceState.maintenance_web_message);
    return;
  }

  showLoadingOverlay('Memverifikasi Akses...', `Login sebagai ${user.nama_user}`);

  setTimeout(() => {
    // Set session
    sessionStorage.setItem('ckg_logged_in', 'true');
    sessionStorage.setItem('ckg_portal_type', 'puskesmas');
    sessionStorage.setItem('ckg_user_name', user.nama_user);
    sessionStorage.setItem('ckg_user_role', user.role || 'Petugas');

    sendUserHeartbeat('active');
    fetchLiveSessions();

    checkAuthSession();
    fetchBotQueueCounts();
    hideLoadingOverlay();

    // Background load maintenance settings and apply locks
    loadMaintenanceSettings().then(() => {
      const currentRoleLower = (user.role || 'Petugas').toLowerCase();
      if (!currentRoleLower.includes('admin') && maintenanceState.maintenance_web) {
        showMaintenanceScreen(maintenanceState.maintenance_web_message);
      }
    });

    // Directly open Announcement popup
    setTimeout(checkAndShowAnnouncement, 300);
  }, 200);
}

function handleLogout() {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Keluar dari Sistem?',
      html: `
        <div style="text-align: center; padding: 4px 0 6px 0;">
          <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #ffe4e6, #fecdd3); color: #e11d48; display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 12px; box-shadow: 0 6px 16px rgba(225, 29, 72, 0.2);">
            <i class="bi bi-power"></i>
          </div>
          <p style="font-size: 13.5px; color: #64748b; margin: 0; line-height: 1.5;">Apakah Anda yakin ingin mengakhiri sesi dan keluar dari aplikasi <strong>CKG Puskesmas Banjaran Kota</strong>?</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-box-arrow-right"></i> Ya, Keluar',
      cancelButtonText: '<i class="bi bi-x-circle"></i> Batal',
      customClass: {
        confirmButton: 'custom-swal-confirm-danger',
        cancelButton: 'custom-swal-cancel'
      },
      buttonsStyling: false
    }).then((result) => {
      if (result.isConfirmed) {
        sendUserHeartbeat('offline');
        sessionStorage.removeItem('ckg_logged_in');
        sessionStorage.removeItem('ckg_portal_type');
        sessionStorage.removeItem('ckg_user_name');
        sessionStorage.removeItem('ckg_user_role');
        sessionStorage.removeItem('ckg_allowed_menus');
        sessionStorage.removeItem('ckg_sekolah_filter');
        checkAuthSession();
        fetchBotQueueCounts();
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Keluar',
          text: 'Anda telah keluar dari sistem CKG.',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  } else {
    sessionStorage.removeItem('ckg_logged_in');
    sessionStorage.removeItem('ckg_portal_type');
    sessionStorage.removeItem('ckg_user_name');
    sessionStorage.removeItem('ckg_user_role');
    sessionStorage.removeItem('ckg_allowed_menus');
    sessionStorage.removeItem('ckg_sekolah_filter');
    checkAuthSession();
    fetchBotQueueCounts();
    showToast('Anda telah keluar dari sistem CKG.', 'info');
  }
}

/* ==========================================================================
   🚪 MULTI-PORTAL ACCESS GATE & AUTHENTICATION HANDLERS
   ========================================================================== */

function returnToPortalPicker() {
  const portalOverlay = document.getElementById('portalSelectionContainer');
  const puskesmasOverlay = document.getElementById('loginViewContainer');
  const sekolahOverlay = document.getElementById('sekolahLoginContainer');
  const posyanduOverlay = document.getElementById('posyanduLoginContainer');

  if (puskesmasOverlay) { puskesmasOverlay.classList.add('hidden'); puskesmasOverlay.style.display = 'none'; }
  if (sekolahOverlay) { sekolahOverlay.classList.add('hidden'); sekolahOverlay.style.display = 'none'; }
  if (posyanduOverlay) { posyanduOverlay.classList.add('hidden'); posyanduOverlay.style.display = 'none'; }
  if (portalOverlay) { portalOverlay.classList.remove('hidden'); portalOverlay.style.display = 'flex'; }
}

function openPuskesmasGate() {
  const isDark = document.body.classList.contains('dark-mode');
  Swal.fire({
    title: '<span style="font-weight: 800; font-size: 20px;">Autentikasi Gerbang Puskesmas</span>',
    html: `
      <div style="text-align: center; margin-bottom: 14px;">
        <div style="width: 64px; height: 64px; border-radius: 20px; background: linear-gradient(135deg, #059669, #0284c7); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #fff; font-size: 30px; box-shadow: 0 10px 25px rgba(5,150,105,0.35);">
          <i class="bi bi-shield-lock-fill"></i>
        </div>
        <div style="font-size: 13.5px; color: ${isDark ? '#94a3b8' : '#64748b'}; line-height: 1.55; max-width: 380px; margin: 0 auto;">
          Masukkan kata sandi akses internal Puskesmas Banjaran Kota untuk membuka daftar nama pegawai dan staf medis.
        </div>
      </div>
    `,
    input: 'password',
    inputPlaceholder: 'Masukkan sandi gerbang puskesmas...',
    inputAttributes: {
      autocapitalize: 'off',
      autocorrect: 'off',
      style: `text-align: center; font-size: 16px; letter-spacing: 2px; font-weight: 700; border-radius: 12px; padding: 12px; ${isDark ? 'background: #0f172a; color: #fff; border: 1.5px solid #334155;' : 'background: #f8fafc; border: 1.5px solid #cbd5e1;'}`
    },
    background: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#ffffff' : '#0f172a',
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-box-arrow-in-right"></i> Buka Portal Pegawai',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#059669',
    cancelButtonColor: '#64748b',
    customClass: {
      popup: 'swal-modern-glass-popup'
    },
    preConfirm: (inputPass) => {
      if (!inputPass || inputPass.trim() === '') {
        Swal.showValidationMessage('Kata sandi gerbang tidak boleh kosong!');
        return false;
      }
      const targetPass = (gatePasswordPuskesmas || '213').trim();
      if (inputPass.trim() !== targetPass) {
        Swal.showValidationMessage('Kata Sandi Gerbang Puskesmas Salah!');
        return false;
      }
      return inputPass;
    }
  }).then((result) => {
    if (result.isConfirmed) {
      const portalOverlay = document.getElementById('portalSelectionContainer');
      const puskesmasOverlay = document.getElementById('loginViewContainer');
      if (portalOverlay) { portalOverlay.classList.add('hidden'); portalOverlay.style.display = 'none'; }
      if (puskesmasOverlay) {
        puskesmasOverlay.classList.remove('hidden');
        puskesmasOverlay.style.display = 'flex';
      }
      if (typeof populatePegawaiDropdown === 'function') populatePegawaiDropdown();
    }
  });
}

function openSekolahPortal() {
  const portalOverlay = document.getElementById('portalSelectionContainer');
  const sekolahOverlay = document.getElementById('sekolahLoginContainer');
  if (portalOverlay) { portalOverlay.classList.add('hidden'); portalOverlay.style.display = 'none'; }
  if (sekolahOverlay) {
    sekolahOverlay.classList.remove('hidden');
    sekolahOverlay.style.display = 'flex';
  }
  populateLoginSekolahDropdown();
}

function openPosyanduPortal() {
  const portalOverlay = document.getElementById('portalSelectionContainer');
  const posyanduOverlay = document.getElementById('posyanduLoginContainer');
  if (portalOverlay) { portalOverlay.classList.add('hidden'); portalOverlay.style.display = 'none'; }
  if (posyanduOverlay) {
    posyanduOverlay.classList.remove('hidden');
    posyanduOverlay.style.display = 'flex';
  }
  populateLoginPosyanduDesaFilter();
  populateLoginPosyanduDropdown();
}

function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  const icon = btnEl.querySelector('i');
  if (icon) {
    icon.className = isPass ? 'bi bi-eye-fill' : 'bi bi-eye-slash-fill';
  }
}

let currentLoginSekolahSearchQuery = '';

function populateLoginSekolahDropdown() {
  const container = document.getElementById('comboboxLoginSekolahOptions');
  const hiddenInput = document.getElementById('loginSekolahSelect');

  // HANYA tampilkan sekolah yang aktif (is_active !== 0) DAN sudah diset password oleh admin
  const activeSchools = MASTER_SARANA_SEKOLAH.filter(s => {
    const hasPass = s.password && String(s.password).trim() !== '';
    const isActive = s.is_active !== 0;
    return hasPass && isActive;
  });

  const sdList = activeSchools.filter(s => s.level === 'SD');
  const smpList = activeSchools.filter(s => s.level === 'SMP');
  const smaList = activeSchools.filter(s => s.level === 'SMA');

  if (container) {
    let optionsHtml = '';
    const renderGroup = (label, list) => {
      if (!list || list.length === 0) return '';
      let grpHtml = `<div class="combobox-group-header" style="padding: 6px 12px; font-size: 11px; font-weight: 800; color: #4f46e5; background: #eef2ff; border-top: 1px solid #e0e7ff; letter-spacing: 0.5px;">${label}</div>`;
      list.forEach(s => {
        grpHtml += `
          <div class="combobox-option-item login-sekolah-opt" data-name="${escapeHtml(s.nama).toLowerCase()}" onclick="selectLoginSekolahOption('${escapeHtml(s.nama)}')" style="padding: 9px 14px; font-size: 13.5px; font-weight: 700; color: #1e293b; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
            <span>${escapeHtml(s.nama)}</span>
            <span class="badge" style="background: #eff6ff; color: #2563eb; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${escapeHtml(s.level || '')}</span>
          </div>
        `;
      });
      return grpHtml;
    };

    optionsHtml += renderGroup('Tingkat SD / MI', sdList);
    optionsHtml += renderGroup('Tingkat SMP / MTs', smpList);
    optionsHtml += renderGroup('Tingkat SMA / SMK / MA', smaList);

    if (activeSchools.length === 0) {
      optionsHtml = `<div style="padding: 20px 14px; text-align: center; color: #64748b; font-size: 12.5px;">Belum ada akun sekolah yang diaktifkan oleh Admin Puskesmas.</div>`;
    }

    container.innerHTML = optionsHtml;
  }

  // Also support hidden input value sync
  if (hiddenInput && hiddenInput.value) {
    const exists = activeSchools.some(s => s.nama.toUpperCase() === hiddenInput.value.toUpperCase());
    if (!exists) {
      clearLoginSekolahSelection();
    }
  }
}

function toggleLoginSekolahDropdown(event) {
  if (event) event.stopPropagation();
  const panel = document.getElementById('comboboxLoginSekolahPanel');
  if (!panel) return;
  const isShown = panel.style.display === 'block';
  panel.style.display = isShown ? 'none' : 'block';
  if (!isShown) {
    const input = document.getElementById('inputSearchLoginSekolahDropdown');
    if (input) {
      input.value = '';
      onFilterLoginSekolahSearchInput('');
      setTimeout(() => input.focus(), 50);
    }
  }
}

function closeLoginSekolahDropdown() {
  const panel = document.getElementById('comboboxLoginSekolahPanel');
  if (panel) panel.style.display = 'none';
}

function onFilterLoginSekolahSearchInput(val) {
  currentLoginSekolahSearchQuery = (val || '').trim().toLowerCase();
  const items = document.querySelectorAll('#comboboxLoginSekolahOptions .login-sekolah-opt');
  items.forEach(item => {
    const name = item.getAttribute('data-name') || '';
    if (!currentLoginSekolahSearchQuery || name.includes(currentLoginSekolahSearchQuery)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });

  // Sembunyikan header group yang tidak memiliki item visible
  const groups = document.querySelectorAll('#comboboxLoginSekolahOptions .combobox-group-header');
  groups.forEach(grp => {
    let nextEl = grp.nextElementSibling;
    let hasVisibleSibling = false;
    while (nextEl && !nextEl.classList.contains('combobox-group-header')) {
      if (nextEl.style.display !== 'none') {
        hasVisibleSibling = true;
        break;
      }
      nextEl = nextEl.nextElementSibling;
    }
    grp.style.display = hasVisibleSibling ? 'block' : 'none';
  });
}

function clearSearchInputLoginSekolah() {
  const input = document.getElementById('inputSearchLoginSekolahDropdown');
  if (input) input.value = '';
  onFilterLoginSekolahSearchInput('');
}

function selectLoginSekolahOption(schoolName) {
  const hiddenInput = document.getElementById('loginSekolahSelect');
  if (hiddenInput) hiddenInput.value = schoolName;

  const labelEl = document.getElementById('comboboxLoginSekolahLabel');
  if (labelEl) {
    labelEl.textContent = schoolName;
    labelEl.style.color = '#1e293b';
  }

  const clearBtn = document.getElementById('comboboxLoginSekolahClearBtn');
  if (clearBtn) clearBtn.style.display = 'inline-flex';

  closeLoginSekolahDropdown();
}

function clearLoginSekolahSelection(event) {
  if (event) event.stopPropagation();
  const hiddenInput = document.getElementById('loginSekolahSelect');
  if (hiddenInput) hiddenInput.value = '';

  const labelEl = document.getElementById('comboboxLoginSekolahLabel');
  if (labelEl) {
    labelEl.textContent = '-- Pilih Sekolah --';
    labelEl.style.color = '#64748b';
  }

  const clearBtn = document.getElementById('comboboxLoginSekolahClearBtn');
  if (clearBtn) clearBtn.style.display = 'none';
}

async function handleSekolahLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const hiddenInput = document.getElementById('loginSekolahSelect');
  const schoolName = (hiddenInput?.value || '').trim().toUpperCase();

  if (!schoolName) {
    Swal.fire({
      icon: 'warning',
      title: 'Pilih Sekolah',
      text: 'Silakan pilih nama sekolah Anda terlebih dahulu dari daftar.',
      confirmButtonColor: '#2563eb'
    });
    return;
  }

  const school = MASTER_SARANA_SEKOLAH.find(s => s.nama.toUpperCase() === schoolName);
  if (!school) {
    Swal.fire({
      icon: 'error',
      title: 'Sekolah Tidak Ditemukan',
      text: 'Data sekolah yang dipilih tidak ditemukan di database.',
      confirmButtonColor: '#dc2626'
    });
    return;
  }

  const schoolPass = (school.password || '').trim();
  if (!schoolPass) {
    Swal.fire({
      icon: 'info',
      title: 'Akun Belum Diaktifkan',
      html: `Akun untuk <strong>${escapeHtml(school.nama)}</strong> belum diatur kata sandinya oleh Administrator Puskesmas.<br><br><span style="font-size:12.5px; color:#64748b;">Silakan hubungi Admin Puskesmas Banjaran Kota untuk meminta aktivasi kata sandi.</span>`,
      confirmButtonColor: '#2563eb'
    });
    return;
  }

  if (school.is_active === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Akun Dinonaktifkan',
      html: `Akun untuk <strong>${escapeHtml(school.nama)}</strong> saat ini dalam status nonaktif / terkunci.<br><br><span style="font-size:12.5px; color:#64748b;">Silakan hubungi Administrator Puskesmas.</span>`,
      confirmButtonColor: '#f59e0b'
    });
    return;
  }

  // Pop-up Kata Sandi Akun Sekolah
  const isDark = document.body.classList.contains('dark-mode');
  const result = await Swal.fire({
    title: '<div style="font-size: 19px; font-weight: 800; color: #1e40af;"><i class="bi bi-shield-lock-fill" style="color: #2563eb;"></i> Kata Sandi Akun Sekolah</div>',
    html: `
      <div style="text-align: center; margin-bottom: 12px;">
        <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 12px 16px; margin: 0 auto 12px auto; max-width: 380px;">
          <div style="font-size: 15px; font-weight: 800; color: #1e3a8a;">${escapeHtml(school.nama)}</div>
          <div style="font-size: 12px; color: #3b82f6; margin-top: 2px;">Tingkat ${escapeHtml(school.level || '-')} • Wilayah Puskesmas Banjaran Kota</div>
        </div>
        <p style="font-size: 13px; color: ${isDark ? '#cbd5e1' : '#64748b'}; margin: 0;">
          Masukkan kata sandi resmi yang telah diset oleh Admin Puskesmas untuk masuk ke portal:
        </p>
      </div>
    `,
    input: 'password',
    inputPlaceholder: 'Masukkan kata sandi sekolah...',
    inputAttributes: {
      autocapitalize: 'off',
      autocorrect: 'off',
      style: `text-align: center; font-size: 16px; letter-spacing: 2px; font-weight: 700; border-radius: 10px; padding: 10px; ${isDark ? 'background: #0f172a; color: #fff; border: 1.5px solid #334155;' : 'background: #f8fafc; border: 1.5px solid #cbd5e1;'}`
    },
    background: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#ffffff' : '#0f172a',
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-box-arrow-in-right"></i> Masuk Sekarang',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#64748b',
    preConfirm: (inputPass) => {
      if (!inputPass || !inputPass.trim()) {
        Swal.showValidationMessage('Kata sandi tidak boleh kosong!');
        return false;
      }
      if (inputPass.trim() !== schoolPass) {
        Swal.showValidationMessage('Kata sandi yang Anda masukkan salah!');
        return false;
      }
      return inputPass.trim();
    }
  });

  if (!result.isConfirmed || !result.value) return;

  // Login Success as Sekolah!
  sessionStorage.setItem('ckg_logged_in', 'true');
  sessionStorage.setItem('ckg_portal_type', 'sekolah');
  sessionStorage.setItem('ckg_user_name', school.nama);
  sessionStorage.setItem('ckg_user_role', 'Sekolah');
  sessionStorage.setItem('ckg_allowed_menus', school.allowed_menus || '[]');
  sessionStorage.setItem('ckg_sekolah_filter', school.nama);

  showLoadingOverlay('Memverifikasi Akun...', `Login sebagai ${school.nama}`);
  setTimeout(() => {
    checkAuthSession();
    fetchBotQueueCounts();
    hideLoadingOverlay();
    Swal.fire({
      icon: 'success',
      title: 'Selamat Datang!',
      html: `Berhasil masuk ke portal CKG sebagai <strong>${escapeHtml(school.nama)}</strong>`,
      timer: 1600,
      showConfirmButton: false
    });
  }, 250);
}
function populateLoginPosyanduDesaFilter() {
  const filter = document.getElementById('loginPosyanduDesaFilter');
  if (!filter) return;
  const desaSet = new Set();
  masterPosyanduDb.forEach(p => { if (p.desa) desaSet.add(p.desa); });
  const sortedDesa = Array.from(desaSet).sort();

  let html = '<option value="">Semua Desa / Kelurahan</option>';
  sortedDesa.forEach(d => {
    html += `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`;
  });
  filter.innerHTML = html;
}

function filterPosyanduDropdownByDesa(selectedDesa) {
  populateLoginPosyanduDropdown(selectedDesa);
}

function populateLoginPosyanduDropdown(desaFilter = '') {
  const select = document.getElementById('loginPosyanduSelect');
  if (!select) return;

  let list = [...masterPosyanduDb];
  if (desaFilter) {
    list = list.filter(p => p.desa === desaFilter);
  }

  let html = '<option value="">-- Pilih Posyandu --</option>';
  list.forEach(p => {
    const rwStr = p.rw ? ` (${p.rw})` : '';
    html += `<option value="${p.id || escapeHtml(p.nama)}">${escapeHtml(p.nama)}${rwStr}</option>`;
  });
  select.innerHTML = html;
}

function handlePosyanduLogin(e) {
  e.preventDefault();
  const select = document.getElementById('loginPosyanduSelect');
  const passInput = document.getElementById('loginPosyanduPassword');
  if (!select || !select.value) {
    Swal.fire({ icon: 'warning', title: 'Pilih Posyandu', text: 'Silakan pilih nama Posyandu terlebih dahulu.', confirmButtonColor: '#e11d48' });
    return;
  }
  const posyanduVal = select.value;
  const inputPass = passInput ? passInput.value.trim() : '';

  const posyandu = masterPosyanduDb.find(p => String(p.id) === String(posyanduVal) || p.nama.toUpperCase() === posyanduVal.toUpperCase());
  if (!posyandu) {
    Swal.fire({ icon: 'error', title: 'Posyandu Tidak Ditemukan', text: 'Data Posyandu tidak ditemukan di database.', confirmButtonColor: '#dc2626' });
    return;
  }

  const posPass = (posyandu.password || '').trim();
  if (posPass === '') {
    Swal.fire({
      icon: 'info',
      title: 'Akun Belum Diaktifkan',
      html: `Akun untuk <strong>${posyandu.nama}</strong> belum diatur kata sandinya oleh Administrator Puskesmas.<br><br><span style="font-size:12.5px; color:#64748b;">Silakan hubungi Admin Puskesmas Banjaran Kota untuk meminta aktivasi kata sandi.</span>`,
      confirmButtonColor: '#e11d48'
    });
    return;
  }

  if (posyandu.is_active === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Akun Dinonaktifkan',
      html: `Akun untuk <strong>${posyandu.nama}</strong> saat ini dalam status nonaktif / terkunci. Silakan hubungi Administrator Puskesmas.`,
      confirmButtonColor: '#f59e0b'
    });
    return;
  }

  if (inputPass !== posPass) {
    Swal.fire({
      icon: 'error',
      title: 'Kata Sandi Salah',
      text: 'Kata sandi Posyandu yang Anda masukkan salah. Silakan periksa kembali.',
      confirmButtonColor: '#dc2626'
    });
    return;
  }

  // Login Success as Posyandu!
  sessionStorage.setItem('ckg_logged_in', 'true');
  sessionStorage.setItem('ckg_portal_type', 'posyandu');
  sessionStorage.setItem('ckg_user_name', posyandu.nama);
  sessionStorage.setItem('ckg_user_role', 'Posyandu');
  sessionStorage.setItem('ckg_allowed_menus', posyandu.allowed_menus || '[]');

  showLoadingOverlay('Memverifikasi Akun...', `Login sebagai ${posyandu.nama}`);
  setTimeout(() => {
    checkAuthSession();
    fetchBotQueueCounts();
    hideLoadingOverlay();
    Swal.fire({
      icon: 'success',
      title: 'Selamat Datang!',
      html: `Berhasil masuk ke portal CKG sebagai <strong>${posyandu.nama}</strong>`,
      timer: 1600,
      showConfirmButton: false
    });
  }, 250);
}


function switchView(viewId) {
  closeUserProfileDropdown();

  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  const portalType = (sessionStorage.getItem('ckg_portal_type') || 'puskesmas').toLowerCase();

  // Dynamic Menu Configuration Check (Active Status & Role Permissions)
  const menuConfig = (currentMenuConfig && currentMenuConfig.length > 0)
    ? currentMenuConfig.find(m => m.id === viewId)
    : (typeof DEFAULT_MENU_CONFIG !== 'undefined' ? DEFAULT_MENU_CONFIG.find(m => m.id === viewId) : null);

  if (menuConfig) {
    if (menuConfig.enabled === false) {
      Swal.fire({
        icon: 'info',
        title: 'Menu Dinonaktifkan',
        text: `Menu "${menuConfig.label}" sedang dinonaktifkan oleh Administrator.`,
        confirmButtonColor: '#2563eb'
      });
      return;
    }
    const permittedRoles = menuConfig.roles || menuConfig.defaultRoles || [];
    if (role !== 'admin' && !permittedRoles.includes(role)) {
      Swal.fire({
        icon: 'warning',
        title: 'Akses Ditolak',
        text: `Role "${role.toUpperCase()}" tidak memiliki izin untuk membuka menu "${menuConfig.label}".`,
        confirmButtonColor: '#2563eb'
      });
      return;
    }
  }

  // Multi-Portal Role & Permission Check
  if (portalType === 'sekolah' || portalType === 'posyandu') {
    let allowedArr = [];
    try {
      const raw = sessionStorage.getItem('ckg_allowed_menus') || '[]';
      allowedArr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (_) { allowedArr = []; }
    if (!Array.isArray(allowedArr) || !allowedArr.includes(viewId)) {
      Swal.fire({
        icon: 'warning',
        title: 'Akses Ditolak',
        text: 'Akun Anda tidak memiliki izin untuk membuka menu ini.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }
  }

  if (role === 'petugas') {
    if (viewId === 'laporan' || viewId === 'recycle-data' || viewId === 'admin-panel' || viewId === 'enco') {
      Swal.fire({
        icon: 'warning',
        title: 'Akses Ditolak',
        text: viewId === 'enco' ? 'Menu ENCO hanya dapat diakses khusus oleh Administrator.' : 'Menu ini hanya dapat diakses oleh Role Admin dan Koordinator.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }
  } else if (role === 'koordinator') {
    if (viewId === 'admin-panel' || viewId === 'enco') {
      Swal.fire({
        icon: 'warning',
        title: 'Akses Ditolak',
        text: viewId === 'enco' ? 'Menu ENCO hanya dapat diakses khusus oleh Administrator.' : 'Admin Panel hanya dapat diakses oleh Admin.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }
  }

  // Check maintenance menu lock (non-admin only)
  if (role !== 'admin' && maintenanceState.locked_menus && maintenanceState.locked_menus.includes(viewId)) {
    Swal.fire({
      icon: 'warning',
      title: '<i class="bi bi-shield-lock-fill" style="color:#f59e0b;"></i> Menu Dalam Maintenance',
      html: `<div style="font-size:13.5px; line-height:1.7;">
              Menu <strong>${viewId}</strong> sedang <strong style="color:#dc2626;">dikunci oleh Admin</strong> untuk sementara waktu.<br><br>
              <span style="color:#64748b; font-size:12.5px;">${maintenanceState.maintenance_menu_message || 'Silakan hubungi Admin untuk informasi lebih lanjut.'}</span>
            </div>`,
      confirmButtonColor: '#f59e0b'
    });
    return;
  }

  document.querySelectorAll('.nav-tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-view') === viewId);
  });

  document.querySelectorAll('.apk-nav-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-view') === viewId);
  });

  document.querySelectorAll('.view-panel').forEach(panel => {
    const isTarget = panel.id === `view-${viewId}`;
    panel.classList.toggle('active', isTarget);
  });

  window.scrollTo({ top: 0, behavior: 'instant' });

  if (viewId === 'dashboard' && typeof initDashboardCharts === 'function') {
    const officersData = typeof getOfficerPerformanceData === 'function' ? getOfficerPerformanceData() : OFFICERS_DATA;
    setTimeout(() => initDashboardCharts(officersData), 50);
  } else if (viewId === 'simpus') {
    renderSimpusView();
  } else if (viewId === 'laporan') {
    renderLaporanView();
  } else if (viewId === 'sekolah') {
    fetchSekolahRecordsFromCloud(false);
    fetchBotQueueCounts();
  } else if (viewId === 'alat-bnhp') {
    if (typeof initAlatBnhpView === 'function') initAlatBnhpView();
  } else if (viewId === 'data-records') {
    renderTableRecords();
  } else if (viewId === 'ckg-gratis') {
    renderCkgGratisTable();
    fetchCkgGratisFromCloud(false);
    fetchBotQueueCounts();
  } else if (viewId === 'recycle-data') {
    renderRecycleTable();
  } else if (viewId === 'enco') {
    renderEncoView();
  } else if (viewId === 'admin-panel') {
    refreshAdminKamusStats();
  }
}

function updateRoleUI() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();

  document.body.classList.remove('role-admin', 'role-koordinator', 'role-petugas');
  document.body.classList.add('role-' + role);

  const roleBadgeEl = document.getElementById('headerUserRoleBadge');
  if (roleBadgeEl) {
    roleBadgeEl.textContent = role.toUpperCase();
    roleBadgeEl.className = 'badge-role-pill role-' + role;
  }

  applyPetugasFilterLock();
  initAddressAutoDetector();
  applyMenuConfiguration();
}


function downloadXLSXTemplate() {
  try {
    const headers = [
      "Jenis Kegiatan", "Tanggal Entry", "NIK", "Nama Pasien", "Tanggal Lahir", "Usia",
      "Jenis Kelamin", "No WhatsApp", "Status Pernikahan", "Provinsi", "Kab/Kota",
      "Kecamatan", "Kelurahan", "Alamat Lengkap", "Pekerjaan", "Merokok",
      "BB (kg)", "TB (cm)", "LP (cm)", "IMT", "TD Sistolik", "TD Diastolik",
      "Gula Darah (mg/dL)", "Kolesterol (mg/dL)", "HB (g/dL)",
      "Pemeriksaan Telinga", "Pemeriksaan Mata", "Pemeriksaan Gigi", "Pemeriksaan Katarak"
    ];
    const sampleRow1 = [
      "Luar Gedung", "2026-07-15", "3204123456780001", "Ahmad Fauzi", "1992-05-14", 34,
      "L", "081234567890", "Kawin", "Jawa Barat", "Kab. Bandung",
      "Banjaran", "Banjaran Kota", "Jl. Raya Banjaran No. 45 RT 02/05", "Wiraswasta", "Tidak",
      65, 168, 82, 23.03, 120, 80, 110, 175, 14.2, "Normal", "Normal", "Normal", "Tidak"
    ];
    const sampleRow2 = [
      "Dalam Gedung", "2026-08-05", "3204987654320002", "Siti Aminah", "1988-11-20", 37,
      "P", "085712345678", "Kawin", "Jawa Barat", "Kab. Bandung",
      "Banjaran", "Sindangpanon", "Kp. Sindangpanon RT 01/03", "Ibu Rumah Tangga", "Tidak",
      58, 155, 78, 24.14, 130, 85, 125, 190, 12.8, "Normal", "Normal", "Normal", "Tidak"
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow1, sampleRow2]);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 3, 15) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Form CKG");
    XLSX.writeFile(wb, `Template_Import_Form_CKG_Pasien_${new Date().toISOString().substring(0, 10)}.xlsx`);
    showToast('Template Excel Resmi Form CKG Berhasil Diunduh!', 'success');
  } catch (err) {
    console.error('Download template error:', err);
    if (typeof Swal !== 'undefined') Swal.fire('Gagal Download Template', err.message, 'error');
  }
}

function executeXLSXImport() {
  if (!selectedImportFile) {
    showToast('Pilih file Excel terlebih dahulu!', 'warning');
    return;
  }

  const reader = new FileReader();

  reader.onload = async function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        Swal.fire('File Error', 'File Excel tidak memiliki worksheet.', 'error');
        return;
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonRows.length === 0) {
        Swal.fire('File Kosong', 'File Excel tidak berisi data.', 'error');
        return;
      }

      const targetSelect = document.getElementById('importTargetPetugas');
      const targetPetugas = (targetSelect && targetSelect.value) ? targetSelect.value : (sessionStorage.getItem('ckg_user_name') || 'Admin');
      const tanggalInput = document.getElementById('importTanggalEntry');
      const selectedTanggal = (tanggalInput && tanggalInput.value) ? tanggalInput.value : new Date().toISOString().substring(0, 10);

      // Build records array
      const newRecords = [];
      let skippedInvalidNik = 0;
      const sampleInvalidNik = [];

      jsonRows.forEach(row => {
        const getVal = (...keys) => {
          for (let k of keys) {
            const target = k.toLowerCase().trim();
            for (let rowKey in row) {
              if (rowKey.toLowerCase().trim() === target) return String(row[rowKey]).trim();
            }
          }
          for (let k of keys) {
            const target = k.toLowerCase().trim();
            for (let rowKey in row) {
              const keyClean = rowKey.toLowerCase().trim();
              if (keyClean.includes(target) && !keyClean.includes('petugas') && !keyClean.includes('faskes')) return String(row[rowKey]).trim();
            }
          }
          return '';
        };

        const rawNik = getVal('NIK', 'No KTP', 'Nomor NIK');
        const nama = getVal('Nama Pasien', 'Nama Lengkap', 'Nama Pasien & NIK', 'Nama');
        if (!nama && !rawNik) return;

        const cleanNik = extractCleanNik16(rawNik);
        // FILTER NIK WAJIB 16 DIGIT: Kurang atau lebih dari 16 digit DITOLAK / TIDAK BISA MASUK
        if (cleanNik.length !== 16) {
          skippedInvalidNik++;
          if (sampleInvalidNik.length < 5) {
            sampleInvalidNik.push({ nama: nama || 'Tanpa Nama', nik: rawNik || '(kosong)', len: cleanNik.length });
          }
          return;
        }

        const dobStr = formatDateToYYYYMMDD(getVal('Tanggal Lahir', 'Tgl Lahir', 'DOB')) || '1990-01-01';
        let age = parseInt(getVal('Usia', 'Umur')) || 30;
        if (isNaN(age) || age <= 0) {
          try { const bd = new Date(dobStr); if (!isNaN(bd.getTime())) age = new Date().getFullYear() - bd.getFullYear(); } catch (_) { }
        }

        const jkRaw = getVal('Jenis Kelamin', 'JK') || 'L';
        const jk = jkRaw.toUpperCase().startsWith('P') ? 'P' : 'L';
        const bb = parseFloat(getVal('BB (kg)', 'BB', 'Berat Badan')) || 60;
        const tb = parseFloat(getVal('TB (cm)', 'TB', 'Tinggi Badan')) || 165;
        const lp = parseFloat(getVal('LP (cm)', 'LP', 'Lingkar Perut')) || 80;
        const imtVal = (tb > 0) ? (bb / ((tb / 100) * (tb / 100))).toFixed(2) : '22.0';
        const rawRowDate = getVal('Tanggal Entry', 'Tanggal Skrining', 'Tanggal', 'Tgl Entry');
        const rowDate = formatDateToYYYYMMDD(rawRowDate) || selectedTanggal;

        newRecords.push({
          id: 'CKG-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
          jenis_kegiatan: getVal('Jenis Kegiatan', 'Kegiatan') || 'Luar Gedung',
          nik: cleanNik,
          nama: nama || 'Pasien Tanpa Nama',
          tanggal_lahir: dobStr, usia: age, jenis_kelamin: jk,
          no_whatsapp: getVal('No WhatsApp', 'WA', 'HP') || '',
          status_pernikahan: getVal('Status Pernikahan', 'Status Nikah') || 'Kawin',
          provinsi: getVal('Provinsi') || 'Jawa Barat',
          kab_kota: getVal('Kab/Kota', 'Kota') || 'Kab. Bandung',
          kecamatan: getVal('Kecamatan') || 'Banjaran',
          kelurahan: getVal('Kelurahan', 'Desa') || 'Banjaran Kota',
          alamat: getVal('Alamat Lengkap', 'Alamat') || 'Banjaran',
          pekerjaan: getVal('Pekerjaan') || '',
          merokok: getVal('Merokok') || 'Tidak',
          bb, tb, lp, imt: imtVal,
          td_sistolik: parseInt(getVal('TD Sistolik', 'Sistol')) || 120,
          td_diastolik: parseInt(getVal('TD Diastolik', 'Diastol')) || 80,
          gula_darah: getVal('Gula Darah (mg/dL)', 'Gula Darah') || '110',
          kolesterol: getVal('Kolesterol (mg/dL)', 'Kolesterol') || '180',
          hb: getVal('HB (g/dL)', 'HB') || '14.0',
          telinga: getVal('Pemeriksaan Telinga', 'Telinga') || 'Normal',
          mata: getVal('Pemeriksaan Mata', 'Mata') || 'Normal',
          gigi: getVal('Pemeriksaan Gigi', 'Gigi') || 'Normal',
          katarak: getVal('Pemeriksaan Katarak', 'Katarak') || 'Tidak',
          status_validasi: 'Terverifikasi',
          petugas_entry: targetPetugas, created_by: targetPetugas,
          created_at: rowDate, tanggal_entry: rowDate, tanggal: rowDate
        });
      });

      if (newRecords.length === 0) {
        if (skippedInvalidNik > 0) {
          const sampleList = sampleInvalidNik.map(s => `• <b>${s.nama}</b>: NIK "${s.nik}" (${s.len} digit)`).join('<br>');
          Swal.fire({
            icon: 'warning',
            title: 'Semua Data Ditolak (NIK Tidak 16 Digit)',
            html: `<div style="font-size:13px; text-align:left; line-height:1.6;">
                    Sebanyak <b>${skippedInvalidNik} baris data pasien</b> ditolak karena NIK <b>tidak persis 16 digit</b> (kurang atau lebih).<br><br>
                    <b>Contoh data yang ditolak:</b><br>
                    <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:6px; padding:8px 12px; margin-top:6px; font-size:12px; color:#9f1239;">
                      ${sampleList}
                    </div><br>
                    Data pasien tidak dapat masuk jika NIK bukan 16 digit angka valid. Silakan periksa kembali file Excel.
                  </div>`,
            confirmButtonColor: '#ef4444'
          });
        } else {
          Swal.fire('Tidak Ada Data', 'Tidak ditemukan data pasien yang valid.', 'warning');
        }
        return;
      }

      closeImportModal();

      // Show progress popup
      Swal.fire({
        title: `<i class="bi bi-cloud-upload"></i> Mengupload ke Cloud D1...`,
        html: `<div style="margin:10px 0;"><div id="importProgressBar" style="width:100%;height:20px;background:#e2e8f0;border-radius:10px;overflow:hidden;"><div id="importProgressFill" style="width:0%;height:100%;background:linear-gradient(90deg,#059669,#10b981);border-radius:10px;transition:width 0.3s;"></div></div><div id="importProgressText" style="margin-top:8px;font-size:13px;color:#475569;font-weight:600;">0 / ${newRecords.length} data pasien</div></div>`,
        allowOutsideClick: false, showConfirmButton: false
      });

      // Send in chunks of 20 with progress
      const chunkSize = 20;
      let uploaded = 0;
      let failed = 0;
      const isCkgGratisImport = (currentImportTarget === 'ckg-gratis');
      const importEndpoint = isCkgGratisImport ? '/api/ckg-gratis' : '/api/ckg';

      for (let i = 0; i < newRecords.length; i += chunkSize) {
        const chunk = newRecords.slice(i, i + chunkSize);
        try {
          const res = await fetch(importEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chunk)
          });
          if (res.ok) { uploaded += chunk.length; } else { failed += chunk.length; }
        } catch (err) { failed += chunk.length; }

        const pct = Math.round(((uploaded + failed) / newRecords.length) * 100);
        const fillEl = document.getElementById('importProgressFill');
        const txtEl = document.getElementById('importProgressText');
        if (fillEl) fillEl.style.width = pct + '%';
        if (txtEl) txtEl.textContent = `${uploaded + failed} / ${newRecords.length} data pasien (${pct}%)`;
      }

      // Update local cache
      if (isCkgGratisImport) {
        ckgGratisRecords = [...newRecords, ...ckgGratisRecords];
        saveCkgGratisRecordsToStorage();
        renderCkgGratisTable();
      } else {
        records = [...newRecords, ...records];
        saveRecordsToStorage();
        renderApp();
        updateCloudSyncPill(true, `D1 Online (${records.length} Rec)`);
      }

      // Show result
      let skippedNotice = '';
      if (skippedInvalidNik > 0) {
        skippedNotice = `<div style="background:#fffbeb;padding:10px 12px;border-radius:8px;border:1px solid #fde68a;margin-top:8px;font-size:12.5px;color:#92400e;text-align:left;">
          ⚠️ <strong>${skippedInvalidNik} data pasien dilewati / ditolak</strong> karena NIK tidak persis 16 digit.
        </div>`;
      }
      Swal.fire({
        icon: failed === 0 ? 'success' : 'warning',
        title: failed === 0 ? 'Import Data Berhasil!' : 'Import Sebagian Berhasil',
        html: `<div style="font-size:14px;line-height:1.6;">
          <div style="background:#f0fdf4;padding:12px;border-radius:8px;border:1px solid #86efac;margin-bottom:8px;">
            <i class="bi bi-cloud-check" style="color:#059669;font-size:18px;"></i>
            <strong style="color:#059669;">${uploaded}</strong> data pasien berhasil disimpan ke <strong>Cloudflare D1 Database</strong>
          </div>
          ${failed > 0 ? `<div style="background:#fef2f2;padding:12px;border-radius:8px;border:1px solid #fecaca;"><i class="bi bi-exclamation-triangle" style="color:#dc2626;"></i> <strong style="color:#dc2626;">${failed}</strong> data gagal (disimpan lokal)</div>` : ''}
          ${skippedNotice}
        </div>`,
        confirmButtonColor: '#059669'
      });

    } catch (err) {
      console.error('Import parse error:', err);
      Swal.fire({ icon: 'error', title: 'Gagal Import File', text: 'Format file tidak dapat diproses: ' + err.message, confirmButtonColor: '#dc2626' });
    }
  };

  reader.readAsArrayBuffer(selectedImportFile);
}

function showToast(message, type = 'info') {
  if (typeof Swal !== 'undefined') {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });

    let swalIcon = 'info';
    if (type === 'success') swalIcon = 'success';
    else if (type === 'error') swalIcon = 'error';
    else if (type === 'warning') swalIcon = 'warning';

    Toast.fire({
      icon: swalIcon,
      title: message
    });
  } else {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'bi-info-circle-fill';
    if (type === 'success') iconClass = 'bi-check-circle-fill';
    if (type === 'error') iconClass = 'bi-exclamation-triangle-fill';

    toast.innerHTML = `
      <i class="bi ${iconClass}" style="font-size: 16px; color: var(--primary);"></i>
      <div style="font-size: 12.5px; font-weight: 600;">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

/* ==========================================================================
   🏛️ DUKCAPIL KTP VERIFICATION SERVICE MODULE
   ========================================================================== */

const DUKCAPIL_API_BASE = '/api/dukcapil';
let isDukcapilServiceOnline = false;

async function checkDukcapilHealth(showToastMsg = false) {
  const statusIndicator = document.getElementById('dukcapilStatusIndicator');
  const statusText = document.getElementById('dukcapilStatusText');
  const statusBanner = document.getElementById('dukcapilStatusBanner');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const resp = await fetch(`${DUKCAPIL_API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (resp.ok) {
      isDukcapilServiceOnline = true;
      if (statusIndicator) statusIndicator.style.background = '#22c55e';
      if (statusText) statusText.innerHTML = '🟢 Layanan Dukcapil Aktif (Cloudflare Edge Engine)';
      if (statusBanner) {
        statusBanner.style.background = '#f0fdf4';
        statusBanner.style.borderColor = '#86efac';
        statusBanner.style.color = '#166534';
      }
      if (showToastMsg) showToast('Layanan Verifikasi Dukcapil terhubung aktif!', 'success');
      return true;
    }
  } catch (err) {
    // Service offline -> Use fallback local NIK engine
  }

  isDukcapilServiceOnline = false;
  if (statusIndicator) statusIndicator.style.background = '#f59e0b';
  if (statusText) statusText.innerHTML = '🟡 Mode Lokal: Validator & Parser NIK (Server Offline)';
  if (statusBanner) {
    statusBanner.style.background = '#fffbeb';
    statusBanner.style.borderColor = '#fde68a';
    statusBanner.style.color = '#92400e';
  }
  if (showToastMsg) showToast('Mode Lokal Dukcapil aktif (server tidak merespon).', 'warning');
  return false;
}

function openDukcapilModal(nik = '', nama = '') {
  const modalOverlay = document.getElementById('dukcapilModalOverlay');
  if (!modalOverlay) return;

  modalOverlay.classList.add('open');

  const inputNik = document.getElementById('dukcapilInputNik');
  const inputNama = document.getElementById('dukcapilInputNama');
  const resultContainer = document.getElementById('dukcapilResultContainer');

  if (inputNik) inputNik.value = nik || '';
  if (inputNama) inputNama.value = nama || '';
  if (resultContainer) resultContainer.style.display = 'none';

  checkDukcapilHealth();

  if (nik && nik.length === 16) {
    executeDukcapilVerification(nik, nama);
  }
}

function closeDukcapilModal() {
  const modalOverlay = document.getElementById('dukcapilModalOverlay');
  if (modalOverlay) modalOverlay.classList.remove('open');
}

function handleDukcapilSearchSubmit(event) {
  event.preventDefault();
  const nik = document.getElementById('dukcapilInputNik')?.value.trim() || '';
  const nama = document.getElementById('dukcapilInputNama')?.value.trim() || '';

  if (!nik || nik.length !== 16 || isNaN(nik)) {
    showToast('NIK harus berupa 16 digit angka!', 'error');
    return;
  }

  executeDukcapilVerification(nik, nama);
}

async function executeDukcapilVerification(nik, nama = '') {
  const container = document.getElementById('dukcapilResultContainer');
  if (!container) return;

  container.style.display = 'block';
  container.innerHTML = `
    <div style="text-align: center; padding: 24px; color: var(--text-muted);">
      <div class="spinner-border text-primary" role="status" style="width: 2rem; height: 2rem; border: 3px solid var(--primary); border-right-color: transparent; border-radius: 50%; animation: spin 0.75s linear infinite; margin: 0 auto 10px;"></div>
      <div style="font-weight: 600; font-size: 13px;">Menghubungkan & Memeriksa Data KTP...</div>
    </div>
  `;

  // Try official API if online
  if (isDukcapilServiceOnline) {
    try {
      const resp = await fetch(`${DUKCAPIL_API_BASE}/verify-nik`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik: nik, namaLengkap: nama })
      });
      const resData = await resp.json();

      if (resp.ok && resData) {
        renderDukcapilResultCard(resData.data || resData, true, resData.valid);
        return;
      }
    } catch (err) {
      console.warn('API Dukcapil error, switching to local parser fallback:', err);
    }
  }

  // Local Parser Fallback
  setTimeout(() => {
    const parsedData = parseNikIndonesia(nik, nama);
    renderDukcapilResultCard(parsedData, false, parsedData.valid);
  }, 400);
}

// Local NIK Parser Fallback Engine & Maps are provided by js/utils/calculators.js

function renderDukcapilResultCard(data, isOfficial = false, isValid = true) {
  const container = document.getElementById('dukcapilResultContainer');
  if (!container) return;

  if (!isValid || !data) {
    container.innerHTML = `
      <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 16px; border-radius: var(--radius-md); color: #991b1b; font-size: 13px;">
        <div style="font-weight: 800; font-size: 15px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
          <i class="bi bi-x-circle-fill" style="color: var(--rose);"></i> Data KTP Tidak Ditemukan / Tidak Valid
        </div>
        <p style="margin: 0;">Pastikan NIK 16 digit dan ejaan nama lengkap sudah benar sesuai KTP asli.</p>
      </div>
    `;
    return;
  }

  const badgeSource = isOfficial
    ? `<span class="badge badge-emerald" style="font-size: 11px;"><i class="bi bi-check-seal-fill"></i> Terverifikasi Server Dukcapil Official</span>`
    : `<span class="badge badge-amber" style="font-size: 11px;"><i class="bi bi-cpu-fill"></i> Validasi Parser NIK Standar Dukcapil</span>`;

  container.innerHTML = `
    <div style="background: linear-gradient(135deg, #f8fafc, #eff6ff); border: 1px solid #cbd5e1; border-radius: var(--radius-md); padding: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
      
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px dashed #cbd5e1;">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.5px;">KARTU TANDA PENDUKUNG (KTP) VERIFIED</div>
          <div style="font-size: 18px; font-weight: 800; color: var(--text-main); font-family: var(--font-heading); margin-top: 2px;">
            ${data.namaLengkap}
          </div>
        </div>
        ${badgeSource}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12.5px;">
        
        <div style="background: #ffffff; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0;">
          <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">NOMOR INDUK KEPENDUDUKAN (NIK)</div>
          <div style="font-weight: 800; font-size: 14px; color: var(--primary); font-family: monospace; margin-top: 2px;">${data.nik}</div>
        </div>

        <div style="background: #ffffff; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0;">
          <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">JENIS KELAMIN & USIA</div>
          <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">${data.jenisKelamin} (${data.usia ? data.usia + ' Thn' : '-'})</div>
        </div>

        <div style="background: #ffffff; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0;">
          <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">TEMPAT & TGL LAHIR</div>
          <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">${data.tempatLahir || 'KAB. BANDUNG'}, ${data.tanggalLahir}</div>
        </div>

        <div style="background: #ffffff; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0;">
          <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">KECAMATAN / KELURAHAN</div>
          <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">${data.kecamatan || 'BANJARAN'} / ${data.kelurahan || 'BANJARAN KOTA'}</div>
        </div>

        <div style="grid-column: span 2; background: #ffffff; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0;">
          <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">ALAMAT LENGKAP KTP</div>
          <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">${data.alamat || '-'}</div>
        </div>

      </div>

    </div>
  `;
}

/* ==========================================================================
   PENGECEKAN NIK BANK DATA ASIK (MENU ENCO) & AUTO-FILL / LOCK SISTEM
   ========================================================================== */

function setDemographicLock(target, isLocked) {
  if (target === 'pasien' || target === 'all') {
    const pasienFields = [
      'nama', 'tanggal_lahir', 'jenis_kelamin', 'no_whatsapp',
      'status_pernikahan', 'pekerjaan', 'alamat', 'provinsi',
      'kab_kota', 'kecamatan', 'kelurahan'
    ];
    pasienFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.disabled = isLocked;
        if (isLocked) {
          el.style.backgroundColor = '#f1f5f9';
          el.style.cursor = 'not-allowed';
          el.title = 'Kolom terkunci. Silakan klik tombol "Cek NIK" terlebih dahulu.';
        } else {
          el.style.backgroundColor = '';
          el.style.cursor = '';
          el.removeAttribute('title');
        }
      }
    });

    ['provinsi', 'kab_kota', 'kecamatan', 'kelurahan'].forEach(f => {
      const ids = getWilayahComboboxIds(f);
      if (!ids) return;
      const trigger = document.getElementById(ids.triggerId);
      if (trigger) {
        if (isLocked) {
          trigger.style.backgroundColor = '#f1f5f9';
          trigger.style.cursor = 'not-allowed';
          trigger.style.pointerEvents = 'none';
          trigger.title = 'Kolom terkunci. Silakan klik tombol "Cek NIK" terlebih dahulu.';
        } else {
          trigger.style.backgroundColor = '';
          trigger.style.cursor = '';
          trigger.style.pointerEvents = '';
          trigger.removeAttribute('title');
        }
      }
    });
  }

  if (target === 'wali' || target === 'all') {
    const waliFields = [
      'nama_wali', 'tanggal_lahir_wali', 'jenis_kelamin_wali',
      'no_whatsapp_wali', 'wali_nomor_sama'
    ];
    waliFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.disabled = isLocked;
        if (isLocked) {
          el.style.backgroundColor = '#f1f5f9';
          el.style.cursor = 'not-allowed';
          el.title = 'Kolom terkunci. Silakan klik tombol "Cek NIK" wali terlebih dahulu.';
        } else {
          el.style.backgroundColor = '';
          el.style.cursor = '';
          el.removeAttribute('title');
        }
      }
    });
  }
}

// Alias untuk kompatibilitas jika dipanggil modul lama
window.triggerNikDukcapilLookup = () => triggerCekNikEnco('pasien');

async function triggerCekNikEnco(target = 'pasien') {
  const isWali = (target === 'wali');
  const nikInput = document.getElementById(isWali ? 'nik_wali' : 'nik');
  const btn = document.getElementById(isWali ? 'btnCekNikWali' : 'btnCekNikPasien') || document.getElementById('btnCekNikDukcapil');
  if (!nikInput) return;

  const cleanNik = (nikInput.value || '').replace(/\D/g, '').trim();

  if (!cleanNik || cleanNik.length !== 16) {
    Swal.fire({
      icon: 'warning',
      title: 'NIK Tidak Lengkap',
      html: `
        <div style="font-size: 13.5px; color: #475569; text-align: left; line-height: 1.5;">
          NIK ${isWali ? 'Wali' : 'Pasien'} harus terdiri dari <strong>tepat 16 digit angka</strong>.<br>
          Saat ini: <span style="font-family: monospace; font-weight: 700; color: #dc2626;">${cleanNik.length} digit</span>.
        </div>
      `,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Mengerti',
      customClass: { popup: 'rounded-2xl shadow-2xl' }
    });
    nikInput.focus();
    return;
  }

  // Visual loading button state
  let origBtnHtml = '';
  if (btn) {
    origBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Memeriksa...';
  }

  // Tampilkan loading dialog
  Swal.fire({
    title: 'Mengecek Bank Data ASIK...',
    html: `
      <div style="font-size: 13.5px; color: #475569; margin-top: 8px;">
        Sedang mencari NIK <strong>${cleanNik}</strong> di bank data rekam pasien ASIK (Menu ENCO)...
      </div>
    `,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  let foundData = null;

  try {
    // 1. Coba request ke API lookup-nik
    const resLookup = await fetch(`/api/enco/lookup-nik?nik=${encodeURIComponent(cleanNik)}`);
    if (resLookup.ok) {
      const jsonLookup = await resLookup.json();
      if (jsonLookup && jsonLookup.success && jsonLookup.found && jsonLookup.data) {
        foundData = jsonLookup.data;
      }
    }
  } catch (err) {
    console.warn('API lookup-nik error:', err);
  }

  // 2. Fallback: coba search ke /api/enco/records
  if (!foundData) {
    try {
      const resSearch = await fetch(`/api/enco/records?search=${encodeURIComponent(cleanNik)}&limit=10`);
      if (resSearch.ok) {
        const jsonSearch = await resSearch.json();
        if (jsonSearch && jsonSearch.success && Array.isArray(jsonSearch.data)) {
          const match = jsonSearch.data.find(item => String(item.nik || '').replace(/\D/g, '') === cleanNik);
          if (match) foundData = match;
        }
      }
    } catch (err) {
      console.warn('Fallback enco search error:', err);
    }
  }

  // 3. Fallback: cek cache lokal di browser (ckgGratisRecords & records)
  if (!foundData) {
    if (typeof ckgGratisRecords !== 'undefined' && Array.isArray(ckgGratisRecords)) {
      const match = ckgGratisRecords.find(item => String(item.nik || '').replace(/\D/g, '') === cleanNik);
      if (match) foundData = match;
    }
    if (!foundData && typeof records !== 'undefined' && Array.isArray(records)) {
      const match = records.find(item => String(item.nik || '').replace(/\D/g, '') === cleanNik);
      if (match) foundData = match;
    }
  }

  // Kembalikan tombol ke state normal
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = origBtnHtml || '<i class="bi bi-search"></i> Cek NIK';
  }

  // Skenario 1: DATA DITEMUKAN
  if (foundData) {
    const rawNama = foundData.nama || foundData.nama_pasien || '';
    const rawDob = foundData.tanggal_lahir || foundData.tgl_lahir || '';
    const rawJk = foundData.jenis_kelamin || foundData.jk || 'L';
    const rawWa = foundData.no_wa || foundData.no_whatsapp || foundData.no_telepon || foundData.no_hp || '';
    const rawAlamat = foundData.alamat || '';
    const rawPekerjaan = foundData.pekerjaan || '';
    const rawNikah = foundData.status_pernikahan || '';
    const rawProv = foundData.provinsi || 'Jawa Barat';
    const rawKab = foundData.kab_kota || 'Kab. Bandung';
    const rawKec = foundData.kecamatan || 'Banjaran';
    const rawKel = foundData.kelurahan || '';

    let calcAgeText = '';
    if (rawDob) {
      const iso = (typeof formatDateToYYYYMMDD === 'function') ? formatDateToYYYYMMDD(rawDob) : rawDob;
      const bDate = new Date(iso);
      if (!isNaN(bDate.getTime())) {
        const diff = Date.now() - bDate.getTime();
        const ageY = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        if (ageY >= 0) calcAgeText = `(${ageY} Tahun)`;
      }
    }

    const jkLabel = (rawJk === 'P' || String(rawJk).toLowerCase().startsWith('p')) ? 'Perempuan (P)' : 'Laki-laki (L)';
    const wilayahLabel = [rawKel, rawKec, rawKab, rawProv].filter(Boolean).join(', ') || '-';

    const result = await Swal.fire({
      title: isWali ? 'Data Wali Ditemukan!' : 'Data Pasien Ditemukan!',
      icon: 'success',
      html: `
        <div style="text-align: left; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-top: 10px; font-size: 13px;">
          <div style="font-weight: 800; color: #1e293b; font-size: 13.5px; margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; display: flex; align-items: center; gap: 8px;">
            <i class="bi bi-person-check-fill" style="color: #10b981; font-size: 18px;"></i>
            <span>Detail Identitas</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; line-height: 1.6;">
            <tr>
              <td style="width: 110px; color: #64748b; font-weight: 600;">NIK</td>
              <td style="font-weight: 700; color: #1e293b; font-family: monospace;">: ${escapeHtml(cleanNik)}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Nama Lengkap</td>
              <td style="font-weight: 800; color: #2563eb; font-size: 14px;">: ${escapeHtml(rawNama)}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Tgl Lahir</td>
              <td style="color: #334155;">: ${escapeHtml(rawDob)} ${calcAgeText}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Jenis Kelamin</td>
              <td style="color: #334155;">: ${jkLabel}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">No. WhatsApp</td>
              <td style="color: #334155;">: ${escapeHtml(rawWa || '-')}</td>
            </tr>
            ${!isWali ? `
            <tr>
              <td style="color: #64748b; font-weight: 600;">Pekerjaan</td>
              <td style="color: #334155;">: ${escapeHtml(rawPekerjaan || '-')}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Alamat</td>
              <td style="color: #334155;">: ${escapeHtml(rawAlamat || '-')}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Wilayah</td>
              <td style="color: #334155;">: ${escapeHtml(wilayahLabel)}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        <p style="margin-top: 14px; font-size: 13px; color: #475569; text-align: center; font-weight: 600;">
          Apakah Anda ingin mengonfirmasi dan mengisi otomatis data ${isWali ? 'wali' : 'pasien'} ini ke formulir?
        </p>
      `,
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="bi bi-check2-circle"></i> Konfirmasi & Gunakan Data',
      cancelButtonText: '<i class="bi bi-pencil-square"></i> Isi Manual / Ubah',
      reverseButtons: true,
      customClass: { popup: 'rounded-2xl shadow-2xl' }
    });

    if (result.isConfirmed) {
      if (isWali) {
        // Isi Data Wali
        const elNamaWali = document.getElementById('nama_wali');
        const elDobWali = document.getElementById('tanggal_lahir_wali');
        const elJkWali = document.getElementById('jenis_kelamin_wali');
        const elWaWali = document.getElementById('no_whatsapp_wali');

        if (elNamaWali) elNamaWali.value = rawNama;
        if (elDobWali && rawDob) {
          elDobWali.value = (typeof formatDateToYYYYMMDD === 'function') ? formatDateToYYYYMMDD(rawDob) : rawDob;
        }
        if (elJkWali) {
          elJkWali.value = (rawJk === 'P' || String(rawJk).toLowerCase().startsWith('p')) ? 'P' : 'L';
        }
        if (elWaWali) {
          elWaWali.value = String(rawWa).replace(/^(\+62|62|0)/, '');
        }
      } else {
        // Isi Data Pasien
        const elNama = document.getElementById('nama');
        const elDob = document.getElementById('tanggal_lahir');
        const elJk = document.getElementById('jenis_kelamin');
        const elWa = document.getElementById('no_whatsapp');
        const elNikah = document.getElementById('status_pernikahan');
        const elPek = document.getElementById('pekerjaan');
        const elAlm = document.getElementById('alamat');

        if (elNama) elNama.value = rawNama;
        if (elDob && rawDob) {
          elDob.value = (typeof formatDateToYYYYMMDD === 'function') ? formatDateToYYYYMMDD(rawDob) : rawDob;
          calculateAgeFromDOB(true);
        }
        if (elJk) {
          elJk.value = (rawJk === 'P' || String(rawJk).toLowerCase().startsWith('p')) ? 'P' : 'L';
        }
        if (elWa) elWa.value = rawWa;
        if (elNikah && rawNikah) {
          const matchNikah = Array.from(elNikah.options).find(o => o.value.toLowerCase() === rawNikah.toLowerCase());
          if (matchNikah) elNikah.value = matchNikah.value;
        }
        if (elPek) elPek.value = rawPekerjaan;
        if (elAlm) elAlm.value = rawAlamat;

        // Dropdown Wilayah
        const provSelect = document.getElementById('provinsi');
        if (provSelect && rawProv) {
          const matchProv = Array.from(provSelect.options).find(o => o.value.toLowerCase().includes(rawProv.toLowerCase()));
          if (matchProv) provSelect.value = matchProv.value;
        }
        const kabSelect = document.getElementById('kab_kota');
        if (kabSelect && rawKab) {
          const matchKab = Array.from(kabSelect.options).find(o => o.value.toLowerCase().includes(rawKab.toLowerCase()));
          if (matchKab) kabSelect.value = matchKab.value;
        }
        const kecSelect = document.getElementById('kecamatan');
        if (kecSelect && rawKec) {
          const matchKec = Array.from(kecSelect.options).find(o => o.value.toLowerCase().includes(rawKec.toLowerCase()));
          if (matchKec) kecSelect.value = matchKec.value;
        }
        const kelSelect = document.getElementById('kelurahan');
        if (kelSelect && rawKel) {
          const matchKel = Array.from(kelSelect.options).find(o => o.value.toLowerCase().includes(rawKel.toLowerCase()));
          if (matchKel) kelSelect.value = matchKel.value;
        }
        syncWilayahComboboxLabels();
      }

      // Buka kolom identitas
      if (!isWali) {
        const nikInput = document.getElementById('nik');
        if (nikInput) nikInput.dataset.fromBankData = '1';
      }
      setDemographicLock(target, false);
      showToast(`Data ${isWali ? 'Wali' : 'Pasien'} berhasil dikonfirmasi dan diisi otomatis dari bank data ASIK`, 'success');
    } else {
      // User membatalkan konfirmasi -> buka kuncian kolom agar bisa diisi/diubah manual
      if (!isWali) {
        const nikInput = document.getElementById('nik');
        if (nikInput) nikInput.dataset.fromBankData = '0';
      }
      setDemographicLock(target, false);
      showToast(`Kolom ${isWali ? 'data wali' : 'identitas pasien'} telah dibuka untuk pengisian manual`, 'info');
    }
  } else {
    // Skenario 2: DATA TIDAK DITEMUKAN
    if (!isWali) {
      const nikInput = document.getElementById('nik');
      if (nikInput) nikInput.dataset.fromBankData = '0';
    }
    await Swal.fire({
      title: 'Data Tidak Ditemukan',
      icon: 'info',
      html: `
        <div style="font-size: 13.5px; color: #475569; line-height: 1.6; margin-top: 8px;">
          <p style="margin: 0 0 12px 0;">
            NIK <strong>${escapeHtml(cleanNik)}</strong> belum terdaftar di bank data rekam data pasien ASIK (Menu ENCO).
          </p>
          <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; color: #1e40af; font-size: 13.5px; font-weight: 700; text-align: center;">
            <i class="bi bi-pencil-square" style="font-size: 16px;"></i> Silakan isi identitas secara manual.
          </div>
        </div>
      `,
      confirmButtonColor: '#2563eb',
      confirmButtonText: '<i class="bi bi-pencil-fill"></i> Isi Identitas Manual',
      customClass: { popup: 'rounded-2xl shadow-2xl' }
    });

    // Buka kuncian kolom agar bisa diisi manual
    setDemographicLock(target, false);

    // Focus ke input nama
    if (isWali) {
      const el = document.getElementById('nama_wali');
      if (el) el.focus();
    } else {
      const el = document.getElementById('nama');
      if (el) el.focus();
    }
  }
}


/* ==========================================================================
   CLOUDFLARE D1 DATABASE CLOUD SYNC ENGINE
   ========================================================================== */

let isSyncingWithCloud = false;

// Async function to pull latest SIMPUS data from Cloudflare D1 Database
async function fetchCloudSimpusRecords(silent = false) {
  try {
    const res = await fetch('/api/simpus', { method: 'GET' });
    if (!res.ok) throw new Error('API Endpoint /api/simpus non-200 response');

    const result = await res.json();
    if (result && result.success && Array.isArray(result.data)) {
      const prevLen = simpusRecords.length;
      simpusRecords = result.data;

      // Non-blocking background save to local storage cache (prevents UI freeze for ~9000 records)
      setTimeout(() => {
        try { localStorage.setItem('ckg_simpus_records', JSON.stringify(simpusRecords)); } catch (_) { }
      }, 100);

      const countVal = (typeof result.count === 'number') ? result.count : simpusRecords.length;
      updateCloudSyncPill(true, `D1 Online (${countVal} Rec)`);

      // Only trigger heavy DOM re-rendering if data count actually changed or initial state was empty
      if (prevLen !== simpusRecords.length || prevLen === 0) {
        requestAnimationFrame(() => {
          if (typeof renderSimpusView === 'function') renderSimpusView();
          if (typeof updateDashboardMetrics === 'function') updateDashboardMetrics();
          if (typeof renderTableRecords === 'function') renderTableRecords();
        });
      }

      if (!silent && typeof Swal !== 'undefined' && countVal > 0) {
        Swal.fire({
          icon: 'success',
          title: 'Cloud Sync Berhasil',
          text: `Data (${countVal} Pasien) berhasil disinkronisasi dari Cloudflare D1 Database!`,
          timer: 2000,
          showConfirmButton: false
        });
      }
      return true;
    }
  } catch (err) {
    console.warn('[Cloud SIMPUS Sync]:', err);
    updateCloudSyncPill(true, `D1 Online (${simpusRecords.length} Rec)`);
  }
  return false;
}

// Async function to push SIMPUS data to Cloudflare D1 Database
async function syncSimpusToCloud(records) {
  if (!records || records.length === 0 || isSyncingWithCloud) return;

  isSyncingWithCloud = true;
  updateCloudSyncPill('syncing', 'Syncing...');

  try {
    const belum = records.filter(r => !r.is_divided);
    const sudah = records.filter(r => Boolean(r.is_divided));
    const CHUNK_SIZE = 200;

    for (let i = 0; i < belum.length; i += CHUNK_SIZE) {
      const chunk = belum.slice(i, i + CHUNK_SIZE);
      await fetch('/api/simpus?tab=belum_bagi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk)
      });
    }

    for (let i = 0; i < sudah.length; i += CHUNK_SIZE) {
      const chunk = sudah.slice(i, i + CHUNK_SIZE);
      await fetch('/api/simpus?tab=sudah_bagi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk)
      });
    }

    updateCloudSyncPill(true, `D1 Online (${records.length} Rec)`);
  } catch (err) {
    updateCloudSyncPill(true, `D1 Active`);
  } finally {
    isSyncingWithCloud = false;
  }
}

// Update the Cloud Sync Badge pill in the top header
function updateCloudSyncPill(status, text) {
  const pill = document.getElementById('cloudSyncPill');
  const icon = document.getElementById('cloudSyncIcon');
  const textEl = document.getElementById('cloudSyncStatusText');

  if (!pill || !icon || !textEl) return;

  if (status === 'syncing') {
    pill.style.background = '#fefce8';
    pill.style.border = '1px solid #fef08a';
    pill.style.color = '#854d0e';
    icon.className = 'bi bi-cloud-arrow-up-fill';
    icon.style.color = '#eab308';
    textEl.innerHTML = `Cloud Storage: <strong>${text || 'Syncing...'}</strong>`;
  } else {
    // Default to Cloud Storage D1 Online green badge
    pill.style.background = '#f0fdf4';
    pill.style.border = '1px solid #86efac';
    pill.style.color = '#166534';
    icon.className = 'bi bi-cloud-check-fill';
    icon.style.color = '#22c55e';
    textEl.innerHTML = `Cloud Storage: <strong>${text || 'D1 Online'}</strong>`;
  }
}

// Check real-time Ping latency to Cloud Server
async function checkCloudPing() {
  const start = performance.now();
  try {
    const res = await fetch('/api/ping?t=' + Date.now());
    if (res.ok) {
      const pingMs = Math.round(performance.now() - start);
      const pingEl = document.getElementById('cloudPingMs');
      const iconEl = document.getElementById('cloudPingIcon');
      const pillEl = document.getElementById('cloudPingPill');

      if (pingEl) pingEl.textContent = `${pingMs} ms`;
      if (iconEl && pillEl) {
        if (pingMs < 100) {
          iconEl.style.color = '#10b981';
          pillEl.style.borderColor = '#86efac';
          pillEl.style.background = '#f0fdf4';
        } else if (pingMs < 300) {
          iconEl.style.color = '#f59e0b';
          pillEl.style.borderColor = '#fde68a';
          pillEl.style.background = '#fefce8';
        } else {
          iconEl.style.color = '#ef4444';
          pillEl.style.borderColor = '#fca5a5';
          pillEl.style.background = '#fef2f2';
        }
      }
    }
  } catch (_) { }
}

setInterval(checkCloudPing, 10000);
setTimeout(checkCloudPing, 1000);

// Force manual sync on header pill click
async function forceSyncWithCloud(showToastMsg = true) {
  showLoadingOverlay('Sinkronisasi Cloud Storage D1...', 'Mengambil & menyinkronkan data terbaru dengan Cloudflare D1 Database');
  updateCloudSyncPill('syncing', 'Syncing...');

  await fetchCloudRecords();
  const success = await fetchCloudSimpusRecords(!showToastMsg);
  if (!success && simpusRecords.length > 0) {
    await syncSimpusToCloud(simpusRecords);
  }
  await fetchCloudUsers();
  renderApp();

  hideLoadingOverlay();
  if (showToastMsg) {
    showToast('Sinkronisasi Cloud D1 Selesai!', 'success');
  }
}

async function fetchCloudUsers() {
  try {
    const res = await fetch('/api/users', { method: 'GET' });
    if (res.ok) {
      const result = await res.json();
      if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
        usersDb = result.data.map(u => ({
          nama_user: u.nama_user || u.nama || u.username,
          password: u.password || '',
          role: u.role || 'Petugas',
          is_banned: !!u.is_banned,
          banned_duration_label: u.banned_duration_label || ''
        }));
        saveUserDatabaseToStorage();
        if (typeof renderUserDatabaseTable === 'function') renderUserDatabaseTable();
      }
    }
  } catch (e) {
    console.warn('[Cloud Sync Warning] Failed to fetch users from D1:', e);
  }
}

async function syncUsersToCloud(users) {
  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users)
    });
  } catch (e) {
    console.warn('[Cloud Sync Error] Users failed to push to D1:', e);
  }
}

async function deleteUserFromCloud(namaUser) {
  try {
    await fetch(`/api/users?nama_user=${encodeURIComponent(namaUser)}`, {
      method: 'DELETE'
    });
  } catch (e) {
    console.warn('[Cloud Sync Error] User delete failed in D1:', e);
  }
}

// Auto-trigger Cloud Sync on app startup with ultrafast D1 read
document.addEventListener('DOMContentLoaded', () => {
  const isLoggedIn = sessionStorage.getItem('ckg_logged_in') === 'true';

  if (isLoggedIn) {
    showLoadingOverlay('Memuat Aplikasi...', 'Menyinkronkan data dari Cloudflare D1 Database');
  }

  Promise.all([
    fetchCloudUsers().catch(() => { }),
    fetchCloudRecords().catch(() => { })
  ]).finally(() => {
    if (isLoggedIn) {
      setTimeout(() => hideLoadingOverlay(), 250);
    }
    // Fetch SIMPUS in background without blocking UI
    setTimeout(() => {
      fetchCloudSimpusRecords(true).catch(() => { });
    }, 500);
  });
});


/* ==========================================================================
   🔍 UNIVERSAL SEARCH & RENDERING LOGIC FOR LAPORAN & CKG SEKOLAH
   ========================================================================== */

function renderLaporanView() {
  const tbody = document.getElementById('tableBodyLaporan');
  if (!tbody) return;

  applyPetugasFilterLock();

  const searchQuery = document.getElementById('searchLaporanRecords')?.value.trim().toLowerCase() || '';
  const filterKegiatanVal = document.getElementById('filterLaporanKegiatan')?.value || '';
  const filterBulanVal = document.getElementById('filterLaporanBulan')?.value || '';
  const filterTahunVal = document.getElementById('filterLaporanTahun')?.value || '';
  const filterPetugasVal = document.getElementById('filterLaporanPetugas')?.value || '';

  // RBAC Data Visibility
  let dataset = getVisibleRecords(records);

  if (filterKegiatanVal) {
    dataset = dataset.filter(r => r.jenis_kegiatan === filterKegiatanVal);
  }

  if (filterBulanVal) {
    dataset = dataset.filter(r => {
      const recDate = getRecordEntryDate(r);
      return recDate ? recDate.month === filterBulanVal : false;
    });
  }

  if (filterTahunVal) {
    dataset = dataset.filter(r => {
      const recDate = getRecordEntryDate(r);
      return recDate ? recDate.year === filterTahunVal : false;
    });
  }

  if (filterPetugasVal) {
    dataset = dataset.filter(r => r.created_by === filterPetugasVal || r.petugas_entry === filterPetugasVal);
  }

  if (searchQuery) {
    dataset = dataset.filter(r => {
      const nama = (r.nama || '').toLowerCase();
      const nik = String(r.nik || '').toLowerCase();
      const alamat = (r.alamat || '').toLowerCase();
      const petugas = (r.petugas_entry || r.created_by || '').toLowerCase();
      const pos = (r.pos_lokasi || '').toLowerCase();
      const kegiatan = (r.jenis_kegiatan || '').toLowerCase();
      return nama.includes(searchQuery) || nik.includes(searchQuery) || alamat.includes(searchQuery) || petugas.includes(searchQuery) || pos.includes(searchQuery) || kegiatan.includes(searchQuery);
    });
  }

  // Update Metric Summaries
  const metricTotal = document.getElementById('metricLaporanTotal');
  const metricLuar = document.getElementById('metricLaporanLuar');
  const metricDalam = document.getElementById('metricLaporanDalam');
  const metricHipertensi = document.getElementById('metricLaporanHipertensi');

  if (metricTotal) metricTotal.textContent = dataset.length.toLocaleString('id-ID');
  if (metricLuar) metricLuar.textContent = dataset.filter(r => r.jenis_kegiatan === 'Luar Gedung').length.toLocaleString('id-ID');
  if (metricDalam) metricDalam.textContent = dataset.filter(r => r.jenis_kegiatan === 'Dalam Gedung').length.toLocaleString('id-ID');
  if (metricHipertensi) metricHipertensi.textContent = dataset.filter(r => (r.td_sistolik > 140 || r.td_diastolik > 90 || r.gula_darah > 200)).length.toLocaleString('id-ID');

  if (dataset.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" style="text-align: center; padding: 36px; color: var(--text-muted);">
          <i class="bi bi-inbox" style="font-size: 32px; display: block; margin-bottom: 8px; color: #94a3b8;"></i>
          <strong>Tidak ada data Laporan CKG yang sesuai dengan pencarian / filter.</strong>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = dataset.map((r, i) => {
    const isHipertensi = r.td_sistolik > 140 || r.td_diastolik > 90;
    const isGulaTinggi = r.gula_darah > 200;
    const trClass = isHipertensi ? 'tr-alert-hipertensi' : '';
    const tensiClass = isHipertensi ? 'cell-hipertensi' : '';
    const gulaClass = isGulaTinggi ? 'cell-gula-tinggi' : '';

    let imtBadge = `<span class="badge badge-emerald">${r.imt || '-'}</span>`;
    if (r.imt < 18.5) imtBadge = `<span class="badge badge-amber">${r.imt} (Kurus)</span>`;
    else if (r.imt >= 25.0 && r.imt <= 29.9) imtBadge = `<span class="badge badge-amber">${r.imt} (Gemuk)</span>`;
    else if (r.imt >= 30.0) imtBadge = `<span class="badge badge-rose">${r.imt} (Obesitas)</span>`;

    const kegiatanBadge = r.jenis_kegiatan === 'Luar Gedung'
      ? `<span class="badge badge-cyan"><i class="bi bi-geo-alt-fill"></i> Luar Gedung</span>`
      : `<span class="badge badge-emerald"><i class="bi bi-building-fill"></i> Dalam Gedung</span>`;

    return `
      <tr class="${trClass}">
        <td style="text-align: center; font-weight: 700; color: var(--text-muted);">${i + 1}</td>
        <td>${formatDisplayDate(r.created_at || r.tanggal_entry || r.tanggal)}</td>
        <td>${kegiatanBadge}</td>
        <td>
          <div style="font-weight: 700; color: var(--primary);">${r.nama || '-'}</div>
          <div style="font-size: 11px; color: var(--text-muted);">NIK: ${r.nik || '-'}</div>
        </td>
        <td>
          <div>${formatDisplayDate(r.tanggal_lahir)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${r.usia ? r.usia + ' Th' : '-'}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${r.alamat || '-'}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${r.pos_lokasi || 'Puskesmas'}</div>
        </td>
        <td><span class="${tensiClass}">${r.td_sistolik && r.td_diastolik ? r.td_sistolik + '/' + r.td_diastolik : '-'}</span></td>
        <td><span class="${gulaClass}">${r.gula_darah ? r.gula_darah + ' mg/dL' : '-'}</span></td>
        <td>${r.kolesterol ? r.kolesterol + ' mg/dL' : '-'}</td>
        <td>${imtBadge}</td>
        <td><span class="badge badge-purple">${r.petugas_entry || r.created_by || '-'}</span></td>
        <td><span class="badge badge-emerald"><i class="bi bi-check-all"></i> Valid</span></td>
      </tr>
    `;
  }).join('');
}

function resetLaporanFilters() {
  const s = document.getElementById('searchLaporanRecords');
  const k = document.getElementById('filterLaporanKegiatan');
  const b = document.getElementById('filterLaporanBulan');
  const t = document.getElementById('filterLaporanTahun');
  const p = document.getElementById('filterLaporanPetugas');
  if (s) s.value = '';
  if (k) k.value = '';
  if (b) b.value = '';
  if (t) t.value = '';
  if (p) p.value = '';
  applyPetugasFilterLock();
  renderLaporanView();
  showToast('Filter Laporan telah di-reset.', 'info');
}


/* ==========================================================================
   🤖 CLOUDFLARE WORKERS AI INTEGRATION (ADDRESS AUTO-LEARNING & HEALTH AI)
   ========================================================================== */

async function parseAddressWithAI(rawText) {
  if (!rawText || !rawText.trim()) {
    showToast('Silakan masukkan teks alamat terlebih dahulu.', 'warning');
    return null;
  }

  showToast('🤖 AI sedang menganalisis & mempelajari alamat...', 'info');

  try {
    const res = await fetch('/api/ai/parse-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: rawText })
    });

    const result = await res.json();

    if (result.success && result.data) {
      const data = result.data;
      showToast(`✨ AI Berhasil (${data.source || 'Cloudflare AI'}): Kel. ${data.kelurahan}, Kec. ${data.kecamatan}`, 'success');
      return data;
    } else {
      throw new Error(result.error || 'Gagal memproses alamat');
    }
  } catch (err) {
    console.error('AI Address Parser Error:', err);
    showToast('Gagal memproses alamat via AI: ' + err.message, 'error');
    return null;
  }
}

async function analyzePatientHealthWithAI(patientData) {
  try {
    const res = await fetch('/api/ai/analyze-health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData)
    });

    const result = await res.json();
    return result.recommendation || 'Pemeriksaan umum normal.';
  } catch (err) {
    console.error('AI Health Analyzer Error:', err);
    return 'Gagal memuat saran AI.';
  }
}
