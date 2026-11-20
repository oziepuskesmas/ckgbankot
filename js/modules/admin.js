/**
 * APLIKASI INFO CKG - PUSKESMAS BANJARAN KOTA
 * Module: Admin Panel, Menu Configuration, Master Data, Maintenance & Branding
 */

/* ==========================================================================
   🏢 ADMIN PANEL: MULTI-PORTAL MANAGEMENT (SEKOLAH, POSYANDU, GATE)
   ========================================================================== */

/* ==========================================================================
   🧭 DYNAMIC MENU CONFIGURATION ENGINE (GESER POSISI, PERMISSION, STATUS)
   ========================================================================== */

const DEFAULT_MENU_CONFIG = [
  { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2', defaultRoles: ['admin', 'koordinator', 'petugas'], enabled: true, desc: 'Statistik & grafik performa CKG' },
  { id: 'sekolah', label: 'Sekolah', icon: 'bi-mortarboard-fill', defaultRoles: ['admin', 'koordinator', 'petugas', 'sekolah'], enabled: true, desc: 'Skrining kesehatan anak sekolah' },
  { id: 'alat-bnhp', label: 'Alat&BNHP CKG', icon: 'bi-box-seam-fill', defaultRoles: ['admin', 'koordinator', 'petugas'], enabled: true, desc: 'Logistik & persediaan BMHP' },
  { id: 'laporan', label: 'Laporan', icon: 'bi-file-earmark-bar-graph', defaultRoles: ['admin', 'koordinator'], enabled: true, desc: 'Rekapitulasi laporan bulanan & tahunan' },
  { id: 'data-records', label: 'Records', icon: 'bi-folder-symlink-fill', defaultRoles: ['admin', 'koordinator', 'petugas'], enabled: true, desc: 'Data rekam medis skrining CKG' },
  { id: 'ckg-gratis', label: 'Cek Kesehatan Gratis', icon: 'bi-heart-pulse-fill', iconColor: '#10b981', defaultRoles: ['admin', 'koordinator', 'petugas'], enabled: true, desc: 'Pelayanan & antrian posyandu gratis' },
  { id: 'enco', label: 'ENCO', icon: 'bi-robot', badge: 'ASIK', defaultRoles: ['admin'], enabled: true, desc: 'Integrasi bot otomatisasi ASIK' },
  { id: 'recycle-data', label: 'Recycle', icon: 'bi-trash3-fill', defaultRoles: ['admin', 'koordinator'], enabled: true, desc: 'Tempat sampah pemulihan data' },
  { id: 'admin-panel', label: 'Admin', icon: 'bi-person-workspace', defaultRoles: ['admin'], enabled: true, desc: 'Kelola user, akses & sistem' }
];

let currentMenuConfig = [];
let draggedMenuIndex = null;

function loadLocalMenuConfig() {
  try {
    const raw = localStorage.getItem('ckg_menu_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = [];
        parsed.forEach(item => {
          const def = DEFAULT_MENU_CONFIG.find(d => d.id === item.id);
          if (def) merged.push({ ...def, ...item });
        });
        DEFAULT_MENU_CONFIG.forEach(def => {
          if (!merged.some(m => m.id === def.id)) merged.push({ ...def });
        });
        currentMenuConfig = merged;
        return currentMenuConfig;
      }
    }
  } catch (_) { }
  currentMenuConfig = JSON.parse(JSON.stringify(DEFAULT_MENU_CONFIG));
  return currentMenuConfig;
}

async function syncMenuConfigFromCloud() {
  try {
    const res = await fetch('/api/menu-config');
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        const merged = [];
        json.data.forEach(item => {
          const def = DEFAULT_MENU_CONFIG.find(d => d.id === item.id);
          if (def) merged.push({ ...def, ...item });
        });
        DEFAULT_MENU_CONFIG.forEach(def => {
          if (!merged.some(m => m.id === def.id)) merged.push({ ...def });
        });
        currentMenuConfig = merged;
        try { localStorage.setItem('ckg_menu_config', JSON.stringify(currentMenuConfig)); } catch (_) { }
        applyMenuConfiguration();
      }
    }
  } catch (err) {
    console.warn('Sync menu config error:', err);
  }
}

function applyMenuConfiguration() {
  if (!Array.isArray(currentMenuConfig) || currentMenuConfig.length === 0) {
    loadLocalMenuConfig();
  }

  const navBar = document.querySelector('.nav-tabs-bar');
  if (!navBar) return;

  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  const portalType = (sessionStorage.getItem('ckg_portal_type') || 'puskesmas').toLowerCase();

  const btnMap = {};
  navBar.querySelectorAll('.nav-tab-btn').forEach(btn => {
    const v = btn.getAttribute('data-view');
    if (v) btnMap[v] = btn;
  });

  const quickBtn = navBar.querySelector('.btn-kelola-menu-quick');

  currentMenuConfig.forEach(item => {
    const btn = btnMap[item.id];
    if (btn) {
      navBar.appendChild(btn);

      let isAllowed = false;
      const permittedRoles = item.roles || item.defaultRoles || [];

      if (role === 'admin') {
        isAllowed = true;
      } else if (portalType === 'sekolah') {
        let allowedArr = [];
        try {
          const raw = sessionStorage.getItem('ckg_allowed_menus') || '[]';
          allowedArr = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (_) { }
        isAllowed = allowedArr.includes(item.id) && permittedRoles.includes('sekolah');
      } else if (portalType === 'posyandu') {
        let allowedArr = [];
        try {
          const raw = sessionStorage.getItem('ckg_allowed_menus') || '[]';
          allowedArr = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (_) { }
        isAllowed = allowedArr.includes(item.id) && permittedRoles.includes('posyandu');
      } else {
        isAllowed = permittedRoles.includes(role);
      }

      if (item.enabled === false) {
        btn.style.display = 'none';
        btn.style.opacity = '0.55';
        btn.title = `${item.label} (Dinonaktifkan)`;
        return;
      } else {
        btn.style.opacity = '1';
        btn.title = item.label;
      }

      btn.style.display = isAllowed ? 'inline-flex' : 'none';
    }
  });

  if (quickBtn) {
    navBar.appendChild(quickBtn);
    quickBtn.style.display = (role === 'admin') ? 'inline-flex' : 'none';
  }

  const activeBtn = navBar.querySelector('.nav-tab-btn.active');
  if (activeBtn && activeBtn.style.display === 'none') {
    const firstVisible = Array.from(navBar.querySelectorAll('.nav-tab-btn:not(.btn-kelola-menu-quick)')).find(b => b.style.display !== 'none');
    if (firstVisible) {
      const targetView = firstVisible.getAttribute('data-view');
      if (targetView) switchView(targetView);
    }
  }
}

function buildMenuConfigRowsHtml() {
  if (!Array.isArray(currentMenuConfig) || currentMenuConfig.length === 0) {
    loadLocalMenuConfig();
  }

  const allRoles = [
    { key: 'admin', label: 'Admin', color: '#dc2626', bg: '#fee2e2' },
    { key: 'koordinator', label: 'Koordinator', color: '#b45309', bg: '#fef3c7' },
    { key: 'petugas', label: 'Petugas', color: '#0369a1', bg: '#e0f2fe' },
    { key: 'sekolah', label: 'Sekolah', color: '#4f46e5', bg: '#e0e7ff' },
    { key: 'posyandu', label: 'Posyandu', color: '#059669', bg: '#d1fae5' }
  ];

  return currentMenuConfig.map((item, idx) => {
    const isFirst = (idx === 0);
    const isLast = (idx === currentMenuConfig.length - 1);
    const isEnabled = (item.enabled !== false);
    const isAdminMenu = (item.id === 'admin-panel');
    const permittedRoles = item.roles || item.defaultRoles || [];

    const rolesCheckboxes = allRoles.map(r => {
      const isChecked = permittedRoles.includes(r.key);
      const isLocked = (isAdminMenu && r.key === 'admin');
      return `
        <label style="display: inline-flex; align-items: center; gap: 5px; margin-right: 12px; margin-bottom: 4px; font-size: 12px; cursor: ${isLocked ? 'not-allowed' : 'pointer'}; user-select: none;">
          <input type="checkbox" 
            onchange="toggleMenuRolePermission('${item.id}', '${r.key}')" 
            ${isChecked ? 'checked' : ''} 
            ${isLocked ? 'disabled' : ''} 
            style="accent-color: #2563eb; width: 15px; height: 15px; cursor: pointer;">
          <span class="badge" style="background: ${r.bg}; color: ${r.color}; font-weight: 700; font-size: 11px; padding: 2px 7px; border-radius: 6px;">
            ${r.label}
          </span>
        </label>
      `;
    }).join('');

    const statusBtn = isEnabled ? `
      <button type="button" onclick="toggleMenuStatus('${item.id}')" 
        ${isAdminMenu ? 'disabled title="Menu Admin wajib selalu aktif"' : ''} 
        style="background: #ecfdf5; color: #059669; border: 1.5px solid #a7f3d0; font-weight: 700; border-radius: 20px; padding: 4px 12px; font-size: 11.5px; cursor: ${isAdminMenu ? 'not-allowed' : 'pointer'}; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s;">
        <i class="bi bi-check-circle-fill"></i> Aktif
      </button>
    ` : `
      <button type="button" onclick="toggleMenuStatus('${item.id}')" 
        style="background: #fef2f2; color: #dc2626; border: 1.5px solid #fecaca; font-weight: 700; border-radius: 20px; padding: 4px 12px; font-size: 11.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s;">
        <i class="bi bi-x-circle-fill"></i> Nonaktif
      </button>
    `;

    return `
      <tr draggable="true" 
          ondragstart="handleMenuDragStart(event, ${idx})" 
          ondragover="handleMenuDragOver(event)" 
          ondrop="handleMenuDrop(event, ${idx})" 
          ondragend="handleMenuDragEnd(event)"
          style="background: ${isEnabled ? '#ffffff' : '#fafafa'}; opacity: ${isEnabled ? '1' : '0.75'}; transition: all 0.2s; border-bottom: 1px solid #f1f5f9;">
        
        <td style="text-align: center; vertical-align: middle; font-weight: 700; color: #64748b;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
            <i class="bi bi-grip-vertical" style="color: #94a3b8; cursor: grab; font-size: 16px;" title="Tahan & geser untuk memindahkan posisi"></i>
            <span>${idx + 1}</span>
          </div>
        </td>

        <td style="text-align: center; vertical-align: middle;">
          <div style="display: flex; gap: 4px; justify-content: center;">
            <button type="button" 
              onclick="moveMenuPosition('${item.id}', -1)" 
              ${isFirst ? 'disabled' : ''} 
              title="Geser posisi ke atas" 
              style="padding: 4px 9px; font-size: 11.5px; border-radius: 6px; background: ${isFirst ? '#f8fafc' : '#eff6ff'}; color: ${isFirst ? '#cbd5e1' : '#1d4ed8'}; border: 1px solid ${isFirst ? '#e2e8f0' : '#bfdbfe'}; cursor: ${isFirst ? 'not-allowed' : 'pointer'}; font-weight: 700;">
              <i class="bi bi-arrow-up"></i> Naik
            </button>
            <button type="button" 
              onclick="moveMenuPosition('${item.id}', 1)" 
              ${isLast ? 'disabled' : ''} 
              title="Geser posisi ke bawah" 
              style="padding: 4px 9px; font-size: 11.5px; border-radius: 6px; background: ${isLast ? '#f8fafc' : '#eff6ff'}; color: ${isLast ? '#cbd5e1' : '#1d4ed8'}; border: 1px solid ${isLast ? '#e2e8f0' : '#bfdbfe'}; cursor: ${isLast ? 'not-allowed' : 'pointer'}; font-weight: 700;">
              <i class="bi bi-arrow-down"></i> Turun
            </button>
          </div>
        </td>

        <td style="vertical-align: middle;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 34px; height: 34px; border-radius: 8px; background: rgba(37,99,235,0.08); display: flex; align-items: center; justify-content: center; font-size: 18px; color: ${item.iconColor || 'var(--primary, #2563eb)'};">
              <i class="bi ${item.icon}"></i>
            </div>
            <div>
              <div style="font-weight: 800; font-size: 13.5px; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                ${item.label}
                ${item.badge ? `<span class="badge" style="background: linear-gradient(135deg, #06b6d4, #2563eb); font-size: 9px; padding: 2px 5px; border-radius: 8px; color: #fff; font-weight: 800;">${item.badge}</span>` : ''}
              </div>
              <div style="font-size: 11px; color: #64748b; font-family: monospace;">ID: ${item.id}</div>
            </div>
          </div>
        </td>

        <td style="text-align: center; vertical-align: middle;">
          ${statusBtn}
        </td>

        <td style="vertical-align: middle;">
          <div style="display: flex; flex-wrap: wrap; align-items: center;">
            ${rolesCheckboxes}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
            ${item.desc || ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAdminMenuTable() {
  const tbody = document.getElementById('tbodyAdminMenuConfig');
  if (tbody) tbody.innerHTML = buildMenuConfigRowsHtml();
}

function renderModalMenuTable() {
  const tbody = document.getElementById('tbodyModalMenuConfig');
  if (tbody) tbody.innerHTML = buildMenuConfigRowsHtml();
}

function moveMenuPosition(id, direction) {
  const idx = currentMenuConfig.findIndex(m => m.id === id);
  if (idx === -1) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= currentMenuConfig.length) return;

  const item = currentMenuConfig.splice(idx, 1)[0];
  currentMenuConfig.splice(newIdx, 0, item);

  applyMenuConfiguration();
  renderAdminMenuTable();
  renderModalMenuTable();
  try { localStorage.setItem('ckg_menu_config', JSON.stringify(currentMenuConfig)); } catch (_) { }
}

function toggleMenuStatus(id) {
  if (id === 'admin-panel') {
    showToast('Menu Admin tidak dapat dinonaktifkan demi keamanan sistem!', 'warning');
    return;
  }
  const item = currentMenuConfig.find(m => m.id === id);
  if (!item) return;
  item.enabled = !item.enabled;
  applyMenuConfiguration();
  renderAdminMenuTable();
  renderModalMenuTable();
  try { localStorage.setItem('ckg_menu_config', JSON.stringify(currentMenuConfig)); } catch (_) { }
  showToast(`Menu ${item.label} berhasil ${item.enabled ? 'diaktifkan' : 'dinonaktifkan'}!`, 'info');
}

function toggleMenuRolePermission(id, role) {
  if (id === 'admin-panel' && role === 'admin') {
    showToast('Akses Admin untuk menu Admin Panel tidak dapat dihapus!', 'warning');
    return;
  }
  const item = currentMenuConfig.find(m => m.id === id);
  if (!item) return;
  if (!item.roles) {
    item.roles = [...(item.defaultRoles || [])];
  }
  const rIdx = item.roles.indexOf(role);
  if (rIdx > -1) {
    item.roles.splice(rIdx, 1);
  } else {
    item.roles.push(role);
  }
  applyMenuConfiguration();
  renderAdminMenuTable();
  renderModalMenuTable();
  try { localStorage.setItem('ckg_menu_config', JSON.stringify(currentMenuConfig)); } catch (_) { }
}

function handleMenuDragStart(e, idx) {
  draggedMenuIndex = idx;
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  if (e.target) e.target.style.opacity = '0.5';
}

function handleMenuDragOver(e) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
}

function handleMenuDrop(e, targetIdx) {
  e.preventDefault();
  if (draggedMenuIndex === null || draggedMenuIndex === targetIdx) return;
  const item = currentMenuConfig.splice(draggedMenuIndex, 1)[0];
  currentMenuConfig.splice(targetIdx, 0, item);
  draggedMenuIndex = null;
  applyMenuConfiguration();
  renderAdminMenuTable();
  renderModalMenuTable();
  try { localStorage.setItem('ckg_menu_config', JSON.stringify(currentMenuConfig)); } catch (_) { }
}

function handleMenuDragEnd(e) {
  draggedMenuIndex = null;
  if (e.target) e.target.style.opacity = '1';
}

async function saveMenuConfigToCloud() {
  try {
    localStorage.setItem('ckg_menu_config', JSON.stringify(currentMenuConfig));
    applyMenuConfiguration();

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'Menyimpan Pengaturan Menu...',
        text: 'Menyinkronkan urutan posisi, permission, dan status menu ke Cloudflare D1 Database',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
    }

    const userRole = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Admin').toLowerCase();
    const res = await fetch('/api/menu-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': userRole
      },
      body: JSON.stringify(currentMenuConfig)
    });

    if (res.ok) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'success',
          title: 'Pengaturan Menu Disimpan!',
          text: 'Urutan susunan posisi, hak akses per role, dan status aktif menu berhasil disimpan secara permanen.',
          confirmButtonColor: '#2563eb'
        });
      } else {
        showToast('Pengaturan menu berhasil disimpan ke Cloud D1!', 'success');
      }
    } else {
      throw new Error('Server status ' + res.status);
    }
  } catch (err) {
    console.error('Save menu error:', err);
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Tersimpan di Browser Lokal',
        text: 'Pengaturan menu aktif di browser ini, namun sinkronisasi cloud mengalami kendala: ' + err.message,
        confirmButtonColor: '#f59e0b'
      });
    } else {
      showToast('Pengaturan tersimpan lokal!', 'info');
    }
  }
}

function resetMenuConfigToDefault() {
  const doReset = () => {
    currentMenuConfig = JSON.parse(JSON.stringify(DEFAULT_MENU_CONFIG));
    localStorage.removeItem('ckg_menu_config');
    applyMenuConfiguration();
    renderAdminMenuTable();
    renderModalMenuTable();
    saveMenuConfigToCloud();
    showToast('Urutan dan hak akses menu berhasil dikembalikan ke default!', 'success');
  };

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Reset ke Pengaturan Awal?',
      text: 'Semua urutan posisi, hak akses role, dan status menu akan dikembalikan ke standar awal sistem.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Reset ke Default',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb'
    }).then(res => {
      if (res.isConfirmed) doReset();
    });
  } else {
    if (confirm('Kembalikan urutan & izin menu ke pengaturan default?')) doReset();
  }
}

function openMenuConfigModal() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || '').toLowerCase();
  if (role !== 'admin') {
    showToast('Hanya Administrator yang dapat mengatur menu navigasi!', 'error');
    return;
  }
  renderModalMenuTable();
  const modal = document.getElementById('modalMenuConfigOverlay');
  if (modal) modal.classList.add('open');
}

function closeMenuConfigModal() {
  const modal = document.getElementById('modalMenuConfigOverlay');
  if (modal) modal.classList.remove('open');
}

window.openMenuConfigModal = openMenuConfigModal;
window.closeMenuConfigModal = closeMenuConfigModal;
window.moveMenuPosition = moveMenuPosition;
window.toggleMenuStatus = toggleMenuStatus;
window.toggleMenuRolePermission = toggleMenuRolePermission;
window.saveMenuConfigToCloud = saveMenuConfigToCloud;
window.resetMenuConfigToDefault = resetMenuConfigToDefault;
window.handleMenuDragStart = handleMenuDragStart;
window.handleMenuDragOver = handleMenuDragOver;
window.handleMenuDrop = handleMenuDrop;
window.handleMenuDragEnd = handleMenuDragEnd;

function switchAdminSubtab(tabName) {
  const tabs = ['users', 'sekolah', 'posyandu', 'gate', 'menu'];
  tabs.forEach(t => {
    const btn = document.getElementById(`btnSubtabAdmin${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const sec = document.getElementById(`adminSection${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) {
      if (t === tabName) {
        btn.classList.add('active');
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
      } else {
        btn.classList.remove('active');
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      }
    }
    if (sec) {
      sec.style.display = (t === tabName) ? 'block' : 'none';
    }
  });

  if (tabName === 'sekolah') {
    renderAdminSekolahTable();
  } else if (tabName === 'posyandu') {
    renderAdminPosyanduTable();
  } else if (tabName === 'gate') {
    const gateInput = document.getElementById('inputGatePasswordPuskesmas');
    if (gateInput) gateInput.value = gatePasswordPuskesmas || '213';
  } else if (tabName === 'menu') {
    renderAdminMenuTable();
  }
}

function renderAdminSekolahTable() {
  const tbody = document.getElementById('adminSekolahTableBody');
  if (!tbody) return;

  const search = (document.getElementById('adminSearchSekolahInput')?.value || '').trim().toUpperCase();
  const levelFilter = document.getElementById('adminFilterLevelSekolah')?.value || '';

  let filtered = [...MASTER_SARANA_SEKOLAH];
  if (levelFilter) {
    filtered = filtered.filter(s => s.level === levelFilter);
  }
  if (search) {
    filtered = filtered.filter(s => s.nama.toUpperCase().includes(search));
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">Tidak ada data sekolah yang cocok dengan filter pencarian.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((s, idx) => {
    const hasPassword = s.password && s.password.trim() !== '';
    const passBadge = hasPassword
      ? `<span class="badge badge-emerald" style="font-size: 11px;"><i class="bi bi-shield-check"></i> Sudah Diset</span>`
      : `<span class="badge badge-rose" style="font-size: 11px;"><i class="bi bi-shield-slash"></i> Belum Diset</span>`;

    let allowedArr = [];
    try {
      allowedArr = typeof s.allowed_menus === 'string' ? JSON.parse(s.allowed_menus || '[]') : (s.allowed_menus || []);
    } catch (_) { allowedArr = []; }

    const menuLabels = {
      'sekolah': 'CKG Sekolah',
      'alat-bnhp': 'Alat & BNHP',
      'dashboard': 'Dashboard',
      'data-records': 'Records'
    };

    const menuBadges = allowedArr.length > 0
      ? allowedArr.map(m => `<span class="badge badge-blue" style="font-size: 10.5px; margin-right: 4px;">${menuLabels[m] || m}</span>`).join('')
      : `<span style="font-size: 11.5px; color: #94a3b8; font-style: italic;">(Kosongan / 0 Menu)</span>`;

    const statusBadge = (s.is_active === 1 || (s.is_active === undefined && hasPassword))
      ? `<span class="badge badge-emerald" style="font-size: 11px;">Aktif</span>`
      : `<span class="badge badge-gray" style="font-size: 11px;">Nonaktif</span>`;

    return `
      <tr>
        <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
        <td style="font-weight: 700; color: var(--text-color);">${escapeHtml(s.nama)}</td>
        <td><span class="badge badge-blue" style="font-size: 11px;">${s.level}</span></td>
        <td>${passBadge}</td>
        <td>${menuBadges}</td>
        <td>${statusBadge}</td>
        <td style="text-align: center;">
          <button class="btn btn-primary btn-sm" onclick="openEditSekolahAksesModal('${encodeURIComponent(s.nama)}')"
            style="border-radius: 6px; padding: 5px 12px; font-size: 12px; font-weight: 700; background: linear-gradient(135deg, #2563eb, #0284c7); border: none;">
            <i class="bi bi-gear-fill"></i> Atur Akses
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openEditSekolahAksesModal(encodedNama) {
  const nama = decodeURIComponent(encodedNama);
  const school = MASTER_SARANA_SEKOLAH.find(s => s.nama.toUpperCase() === nama.toUpperCase());
  if (!school) return;

  document.getElementById('editAksesSekolahNama').value = school.nama;
  document.getElementById('editAksesSekolahLabel').textContent = school.nama;
  document.getElementById('editAksesSekolahLevelBadge').textContent = `Tingkat: ${school.level}`;
  document.getElementById('editAksesSekolahPassword').value = school.password || '';
  document.getElementById('editAksesSekolahStatus').value = (school.is_active !== undefined) ? String(school.is_active) : (school.password ? '1' : '0');

  let allowedArr = [];
  try {
    allowedArr = typeof school.allowed_menus === 'string' ? JSON.parse(school.allowed_menus || '[]') : (school.allowed_menus || []);
  } catch (_) { allowedArr = []; }

  document.getElementById('chkMenuSekolah_sekolah').checked = allowedArr.includes('sekolah');
  document.getElementById('chkMenuSekolah_alat').checked = allowedArr.includes('alat-bnhp');
  document.getElementById('chkMenuSekolah_dashboard').checked = allowedArr.includes('dashboard');
  document.getElementById('chkMenuSekolah_records').checked = allowedArr.includes('data-records');

  document.getElementById('modalEditSekolahAksesOverlay').classList.add('open');
}

function closeEditSekolahAksesModal() {
  document.getElementById('modalEditSekolahAksesOverlay').classList.remove('open');
}

async function handleSaveSekolahAkses(e) {
  e.preventDefault();
  const nama = document.getElementById('editAksesSekolahNama').value;
  const password = document.getElementById('editAksesSekolahPassword').value.trim();
  const is_active = parseInt(document.getElementById('editAksesSekolahStatus').value, 10);

  const allowed = [];
  if (document.getElementById('chkMenuSekolah_sekolah').checked) allowed.push('sekolah');
  if (document.getElementById('chkMenuSekolah_alat').checked) allowed.push('alat-bnhp');
  if (document.getElementById('chkMenuSekolah_dashboard').checked) allowed.push('dashboard');
  if (document.getElementById('chkMenuSekolah_records').checked) allowed.push('data-records');

  const school = MASTER_SARANA_SEKOLAH.find(s => s.nama.toUpperCase() === nama.toUpperCase());
  if (school) {
    school.password = password;
    school.allowed_menus = JSON.stringify(allowed);
    school.is_active = is_active;
  }

  try {
    const res = await fetch('/api/master-sekolah', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: nama,
        password: password,
        allowed_menus: JSON.stringify(allowed),
        is_active: is_active
      })
    });
    if (res.ok) {
      showToast(`Akses untuk ${nama} berhasil disimpan!`, 'success');
    }
  } catch (err) {
    console.warn('Save sekolah akses notice:', err);
    showToast(`Tersimpan lokal: Akses untuk ${nama}`, 'info');
  }

  try {
    localStorage.setItem('ckg_master_sekolah', JSON.stringify(MASTER_SARANA_SEKOLAH));
  } catch (_) { }

  closeEditSekolahAksesModal();
  renderAdminSekolahTable();
}

async function fetchMasterPosyanduFromCloud() {
  try {
    const res = await fetch('/api/master-posyandu');
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        masterPosyanduDb = result.data;
        populateLoginPosyanduDesaFilter();
        populateLoginPosyanduDropdown();
        renderAdminPosyanduTable();
      }
    }
  } catch (err) {
    console.warn('Fetch master posyandu notice:', err);
  }
}

function renderAdminPosyanduTable() {
  const tbody = document.getElementById('adminPosyanduTableBody');
  if (!tbody) return;

  const search = (document.getElementById('adminSearchPosyanduInput')?.value || '').trim().toUpperCase();
  const desaFilter = document.getElementById('adminFilterDesaPosyandu')?.value || '';

  // Also populate the filter options if empty
  const filterEl = document.getElementById('adminFilterDesaPosyandu');
  if (filterEl && filterEl.options.length <= 1) {
    const desaSet = new Set();
    masterPosyanduDb.forEach(p => { if (p.desa) desaSet.add(p.desa); });
    Array.from(desaSet).sort().forEach(d => {
      filterEl.innerHTML += `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`;
    });
  }

  let filtered = [...masterPosyanduDb];
  if (desaFilter) {
    filtered = filtered.filter(p => p.desa === desaFilter);
  }
  if (search) {
    filtered = filtered.filter(p => p.nama.toUpperCase().includes(search) || (p.desa && p.desa.toUpperCase().includes(search)));
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">Tidak ada data posyandu yang cocok dengan filter pencarian.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((p, idx) => {
    const hasPassword = p.password && p.password.trim() !== '';
    const passBadge = hasPassword
      ? `<span class="badge badge-emerald" style="font-size: 11px;"><i class="bi bi-shield-check"></i> Sudah Diset</span>`
      : `<span class="badge badge-rose" style="font-size: 11px;"><i class="bi bi-shield-slash"></i> Belum Diset</span>`;

    let allowedArr = [];
    try {
      allowedArr = typeof p.allowed_menus === 'string' ? JSON.parse(p.allowed_menus || '[]') : (p.allowed_menus || []);
    } catch (_) { allowedArr = []; }

    const menuLabels = {
      'data-records': 'Records',
      'dashboard': 'Dashboard',
      'alat-bnhp': 'Alat & BNHP',
      'sekolah': 'CKG Sekolah'
    };

    const menuBadges = allowedArr.length > 0
      ? allowedArr.map(m => `<span class="badge badge-blue" style="font-size: 10.5px; margin-right: 4px;">${menuLabels[m] || m}</span>`).join('')
      : `<span style="font-size: 11.5px; color: #94a3b8; font-style: italic;">(Kosongan / 0 Menu)</span>`;

    const statusBadge = (p.is_active === 1 || (p.is_active === undefined && hasPassword))
      ? `<span class="badge badge-emerald" style="font-size: 11px;">Aktif</span>`
      : `<span class="badge badge-gray" style="font-size: 11px;">Nonaktif</span>`;

    return `
      <tr>
        <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
        <td style="font-weight: 700; color: var(--text-color);">${escapeHtml(p.nama)}</td>
        <td><span class="badge badge-emerald" style="font-size: 11px;">${escapeHtml(p.desa || '-')}</span></td>
        <td>${escapeHtml(p.rw || '-')}</td>
        <td>${passBadge}</td>
        <td>${menuBadges}</td>
        <td>${statusBadge}</td>
        <td style="text-align: center;">
          <button class="btn btn-primary btn-sm" onclick="openEditPosyanduAksesModal('${p.id}')"
            style="border-radius: 6px; padding: 5px 10px; font-size: 11.5px; font-weight: 700; background: linear-gradient(135deg, #e11d48, #db2777); border: none;">
            <i class="bi bi-gear-fill"></i> Akses
          </button>
          <button class="btn btn-secondary btn-sm" onclick="deletePosyandu('${p.id}', '${encodeURIComponent(p.nama)}')"
            style="border-radius: 6px; padding: 5px 8px; font-size: 11.5px; color: #dc2626;" title="Hapus Posyandu">
            <i class="bi bi-trash3-fill"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openEditPosyanduAksesModal(id) {
  const posyandu = masterPosyanduDb.find(p => String(p.id) === String(id));
  if (!posyandu) return;

  document.getElementById('editAksesPosyanduId').value = posyandu.id;
  document.getElementById('editAksesPosyanduLabel').textContent = posyandu.nama;
  document.getElementById('editAksesPosyanduDesaBadge').textContent = `Desa: ${posyandu.desa || '-'} • RW: ${posyandu.rw || '-'}`;
  document.getElementById('editAksesPosyanduPassword').value = posyandu.password || '';
  document.getElementById('editAksesPosyanduStatus').value = (posyandu.is_active !== undefined) ? String(posyandu.is_active) : (posyandu.password ? '1' : '0');

  let allowedArr = [];
  try {
    allowedArr = typeof posyandu.allowed_menus === 'string' ? JSON.parse(posyandu.allowed_menus || '[]') : (posyandu.allowed_menus || []);
  } catch (_) { allowedArr = []; }

  document.getElementById('chkMenuPosyandu_records').checked = allowedArr.includes('data-records');
  document.getElementById('chkMenuPosyandu_dashboard').checked = allowedArr.includes('dashboard');
  document.getElementById('chkMenuPosyandu_alat').checked = allowedArr.includes('alat-bnhp');

  document.getElementById('modalEditPosyanduAksesOverlay').classList.add('open');
}

function closeEditPosyanduAksesModal() {
  document.getElementById('modalEditPosyanduAksesOverlay').classList.remove('open');
}

async function handleSavePosyanduAkses(e) {
  e.preventDefault();
  const id = document.getElementById('editAksesPosyanduId').value;
  const password = document.getElementById('editAksesPosyanduPassword').value.trim();
  const is_active = parseInt(document.getElementById('editAksesPosyanduStatus').value, 10);

  const allowed = [];
  if (document.getElementById('chkMenuPosyandu_records').checked) allowed.push('data-records');
  if (document.getElementById('chkMenuPosyandu_dashboard').checked) allowed.push('dashboard');
  if (document.getElementById('chkMenuPosyandu_alat').checked) allowed.push('alat-bnhp');

  const posyandu = masterPosyanduDb.find(p => String(p.id) === String(id));
  if (posyandu) {
    posyandu.password = password;
    posyandu.allowed_menus = JSON.stringify(allowed);
    posyandu.is_active = is_active;
  }

  try {
    await fetch('/api/master-posyandu', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id,
        password: password,
        allowed_menus: JSON.stringify(allowed),
        is_active: is_active
      })
    });
    showToast('Akses Posyandu berhasil disimpan!', 'success');
  } catch (err) {
    console.warn('Save posyandu akses notice:', err);
  }

  closeEditPosyanduAksesModal();
  renderAdminPosyanduTable();
}

function openAddPosyanduModal() {
  document.getElementById('formAddPosyandu').reset();
  document.getElementById('modalAddPosyanduOverlay').classList.add('open');
}

function closeAddPosyanduModal() {
  document.getElementById('modalAddPosyanduOverlay').classList.remove('open');
}

async function handleSaveNewPosyandu(e) {
  e.preventDefault();
  const nama = document.getElementById('newPosyanduNama').value.trim();
  const desa = document.getElementById('newPosyanduDesa').value;
  const rw = document.getElementById('newPosyanduRw').value.trim();
  const password = document.getElementById('newPosyanduPassword').value.trim();

  if (!nama) {
    showToast('Nama Posyandu wajib diisi!', 'error');
    return;
  }

  try {
    const res = await fetch('/api/master-posyandu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: nama,
        desa: desa,
        rw: rw,
        password: password,
        allowed_menus: '[]',
        is_active: password ? 1 : 0
      })
    });
    if (res.ok) {
      showToast(`Posyandu ${nama} berhasil ditambahkan!`, 'success');
      await fetchMasterPosyanduFromCloud();
    }
  } catch (err) {
    console.warn('Add posyandu notice:', err);
  }

  closeAddPosyanduModal();
}

async function deletePosyandu(id, encodedNama) {
  const nama = decodeURIComponent(encodedNama);
  const confirm = await Swal.fire({
    title: 'Hapus Posyandu?',
    html: `Apakah Anda yakin ingin menghapus data <strong>${nama}</strong> dari database?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal'
  });

  if (confirm.isConfirmed) {
    try {
      await fetch(`/api/master-posyandu?id=${id}`, { method: 'DELETE' });
      showToast(`Posyandu ${nama} berhasil dihapus.`, 'success');
      await fetchMasterPosyanduFromCloud();
    } catch (err) {
      console.warn('Delete posyandu notice:', err);
    }
  }
}

async function handleSaveGatePassword(e) {
  e.preventDefault();
  const input = document.getElementById('inputGatePasswordPuskesmas');
  if (!input) return;
  const newPass = input.value.trim();
  if (!newPass) {
    showToast('Kata sandi gerbang tidak boleh kosong!', 'error');
    return;
  }

  gatePasswordPuskesmas = newPass;

  try {
    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gate_password_puskesmas: newPass })
    });
    if (res.ok) {
      Swal.fire({
        icon: 'success',
        title: 'Kata Sandi Gerbang Disimpan',
        text: 'Kata sandi gerbang Puskesmas Banjaran Kota berhasil diperbarui.',
        timer: 1800,
        showConfirmButton: false
      });
    }
  } catch (err) {
    console.warn('Save gate password error:', err);
    showToast('Tersimpan lokal: Password Gerbang Puskesmas', 'info');
  }
}

function startLiveClock() {
  const clockEl = document.getElementById('liveClock');
  const dateEl = document.getElementById('liveDate');

  function update() {
    const now = new Date();
    if (clockEl) clockEl.textContent = now.toTimeString().split(' ')[0];
    if (dateEl) {
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      dateEl.textContent = `${dd}/${mm}/${yyyy}`;
    }
  }

  update();
  setInterval(update, 1000);
}

// (Obsolete duplicate loadStoredRecords and saveRecordsToStorage removed to prevent duplicate ckg_records_db quota exhaustion)

function populateAllYearDropdowns() {
  const currentYearStr = String(new Date().getFullYear());
  const yearSelectIds = [
    { id: 'dashTahun', defaultLabel: 'Semua Tahun' },
    { id: 'filterLaporanTahun', defaultLabel: '-- Semua Tahun --' },
    { id: 'filterTahun', defaultLabel: '-- Semua Tahun --' },
    { id: 'filterSekolahTahun', defaultLabel: '-- Semua Tahun --' }
  ];

  yearSelectIds.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      const savedVal = el.value;
      let html = `<option value="">${item.defaultLabel}</option>`;
      for (let y = 2045; y >= 2000; y--) {
        html += `<option value="${y}">${y}</option>`;
      }
      el.innerHTML = html;
      if (savedVal) {
        el.value = savedVal;
      } else if (item.id === 'dashTahun') {
        el.value = currentYearStr;
      }
    }
  });
}

function setupEventListeners() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const addUserForm = document.getElementById('addUserForm');
  if (addUserForm) addUserForm.addEventListener('submit', handleAddUserSubmit);

  const bagiPetugasForm = document.getElementById('bagiPetugasForm');
  if (bagiPetugasForm) bagiPetugasForm.addEventListener('submit', handleBagiPetugasSubmit);

  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.getAttribute('data-view');
      switchView(viewId);
    });
  });

  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(now.getFullYear());

  populateAllYearDropdowns();

  const dashBulanEl = document.getElementById('dashBulan');
  const dashTahunEl = document.getElementById('dashTahun');
  if (dashBulanEl && !dashBulanEl.value) dashBulanEl.value = currentMonthStr;
  if (dashTahunEl && !dashTahunEl.value) dashTahunEl.value = currentYearStr;

  ['dashBulan', 'dashTahun', 'dashKategori', 'dashUmur'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => renderApp());
  });

  const roleSelect = document.getElementById('roleSelect');
  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      currentRole = e.target.value;
      sessionStorage.setItem('ckg_user_role', currentRole);
      renderApp();
      showToast(`Hak Akses Berhasil Diubah ke: ${currentRole.toUpperCase()}`, 'info');
    });
  }

  const btnRefreshTop = document.getElementById('btnRefreshTop');
  if (btnRefreshTop) {
    btnRefreshTop.addEventListener('click', () => {
      renderApp();
      showToast('Data Berhasil Di-refresh!', 'success');
    });
  }

  const dobInput = document.getElementById('tanggal_lahir');
  if (dobInput) {
    dobInput.addEventListener('change', () => calculateAgeFromDOB(false));
    dobInput.addEventListener('input', () => calculateAgeFromDOB(false));
  }

  // Sync address dictionary from Cloudflare D1 Server on startup
  syncKamusFromCloudServer();

  // Auto-trigger Dukcapil lookup when NIK reaches 16 digits and update live counter
  const nikInput = document.getElementById('nik');
  if (nikInput) {
    nikInput.addEventListener('input', () => {
      nikInput.dataset.fromBankData = '0';
      const val = nikInput.value.replace(/\D/g, '').slice(0, 16);
      nikInput.value = val; // strip non-digits and cap at exactly 16

      const countSpan = document.getElementById('nikCharCount');
      const helpText = document.getElementById('nikHelpText');
      const badge = document.getElementById('nikCounterBadge');
      if (countSpan) countSpan.textContent = val.length;

      if (val.length === 16) {
        if (helpText) {
          helpText.style.color = '#059669';
          helpText.innerHTML = '<i class="bi bi-info-circle-fill"></i> NIK 16 digit lengkap. Silakan klik tombol "Cek NIK" untuk verifikasi.';
        }
        if (badge) {
          badge.style.background = '#ecfdf5';
          badge.style.color = '#059669';
          badge.style.borderColor = '#a7f3d0';
        }
      } else {
        if (helpText) {
          helpText.style.color = '#dc2626';
          helpText.innerHTML = `<i class="bi bi-exclamation-circle-fill"></i> NIK wajib 16 digit angka (kurang ${16 - val.length} digit)`;
        }
        if (badge) {
          badge.style.background = '#fef2f2';
          badge.style.color = '#dc2626';
          badge.style.borderColor = '#fecaca';
        }
        const statusEl = document.getElementById('nikDukcapilStatus');
        if (statusEl) statusEl.style.display = 'none';
        if (!currentEditingId) {
          setDemographicLock('pasien', true);
        }
      }
    });

    nikInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerCekNikEnco('pasien');
      }
    });
  }

  // Event listener untuk Kategori Sasaran & Data Wali
  document.querySelectorAll('input[name="kategori_sasaran"]').forEach(radio => {
    radio.addEventListener('change', () => {
      updateDataWaliVisibility();
      checkDobKategoriCompatibility(false);
    });
  });

  const nikWaliInput = document.getElementById('nik_wali');
  if (nikWaliInput) {
    nikWaliInput.addEventListener('input', () => {
      const val = nikWaliInput.value.replace(/\D/g, '').slice(0, 16);
      nikWaliInput.value = val; // strip non-digits and cap at 16
      const counter = document.getElementById('nikWaliCounter');
      const helpWali = document.getElementById('nikWaliHelpText');
      if (counter) {
        counter.textContent = val.length;
        counter.style.color = val.length === 16 ? '#16a34a' : '#64748b';
      }
      if (val.length === 16) {
        if (helpWali) {
          helpWali.style.color = '#059669';
          helpWali.innerHTML = '<i class="bi bi-info-circle-fill"></i> NIK wali 16 digit lengkap. Silakan klik tombol "Cek NIK" Wali.';
        }
      } else {
        if (!currentEditingId) {
          setDemographicLock('wali', true);
        }
        if (helpWali) {
          helpWali.style.color = '#dc2626';
          helpWali.innerHTML = `<i class="bi bi-exclamation-circle-fill"></i> NIK wali wajib 16 digit angka (kurang ${16 - val.length} digit)`;
        }
      }
    });

    nikWaliInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerCekNikEnco('wali');
      }
    });
  }

  const chkWaliSama = document.getElementById('wali_nomor_sama');
  const waWaliInput = document.getElementById('no_whatsapp_wali');
  const waPasienInput = document.getElementById('no_whatsapp');

  if (chkWaliSama && waWaliInput && waPasienInput) {
    const syncPhone = () => {
      if (chkWaliSama.checked) {
        let pVal = waPasienInput.value.trim().replace(/^(\+62|62|0)/, '');
        waWaliInput.value = pVal;
      }
    };
    chkWaliSama.addEventListener('change', syncPhone);
    waPasienInput.addEventListener('input', () => {
      if (chkWaliSama.checked) syncPhone();
    });
  }

  const bbInput = document.getElementById('bb');
  const tbInput = document.getElementById('tb');
  if (bbInput && tbInput) {
    bbInput.addEventListener('input', calculateIMT);
    tbInput.addEventListener('input', calculateIMT);
  }

  const entryForm = document.getElementById('ckgForm');
  if (entryForm) entryForm.addEventListener('submit', handleFormSubmit);

  ['filterKegiatan', 'filterBulan', 'filterTahun', 'filterTanggal', 'filterPetugas', 'filterUmur', 'filterNik'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', renderTableRecords);
  });

  ['filterSimpusPetugas', 'filterSimpusUmur', 'filterSimpusNik', 'filterSimpusLimit'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', renderSimpusTableRecords);
  });

  ['filterCkgGratisUsia', 'filterCkgGratisJk', 'filterCkgGratisBulan', 'filterCkgGratisTahun', 'filterCkgGratisPetugas', 'filterCkgGratisLimit'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', renderCkgGratisTable);
  });
}

/* ==========================================================================
   🖼️ CUSTOM PNG LOGO MANAGER
   ========================================================================== */

function applyCustomLogo() {
  const activeLogo = localStorage.getItem('ckg_custom_logo') || 'logo.png';

  document.querySelectorAll('.brand-logo img, .visual-brand-logo img, .form-logo-img').forEach(img => {
    img.src = activeLogo;
    img.style.display = 'block';
    if (img.nextElementSibling) img.nextElementSibling.style.display = 'none';
  });

  // Dynamically update browser tab favicon
  document.querySelectorAll("link[rel*='icon']").forEach(link => {
    link.href = activeLogo;
  });
}

function openCustomLogoModal() {
  const currentLogo = localStorage.getItem('ckg_custom_logo');

  Swal.fire({
    title: 'Ganti Logo Aplikasi (PNG)',
    html: `
      <div style="text-align: left; font-size: 13px;">
        <p style="margin-bottom: 12px; color: #475569;">Pilih file gambar <strong>PNG/JPG</strong> baru dari perangkat Anda untuk mengganti logo aplikasi di Header & Halaman Login:</p>
        <input type="file" id="customLogoFileInput" accept="image/png, image/jpeg, image/webp" class="swal2-input" style="margin: 0 0 14px 0; width: 100%; font-size: 13px;">
        
        <div id="logoPreviewBox" style="text-align: center; margin-top: 14px; ${currentLogo ? '' : 'display: none;'}">
          <div style="font-size: 12px; color: #64748b; margin-bottom: 6px; font-weight: 600;">Preview Logo:</div>
          <img id="logoPreviewImg" src="${currentLogo || ''}" style="max-width: 90px; max-height: 90px; border-radius: 50%; border: 3px solid #2563eb; box-shadow: 0 4px 12px rgba(0,0,0,0.15); object-fit: contain;">
        </div>
      </div>
    `,
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: '<i class="bi bi-check-circle-fill"></i> Simpan Logo Baru',
    denyButtonText: '<i class="bi bi-arrow-counterclockwise"></i> Reset Logo Default',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#2563eb',
    denyButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    didOpen: () => {
      const fileInput = document.getElementById('customLogoFileInput');
      const previewBox = document.getElementById('logoPreviewBox');
      const previewImg = document.getElementById('logoPreviewImg');

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            previewImg.src = ev.target.result;
            previewBox.style.display = 'block';
          };
          reader.readAsDataURL(file);
        }
      });
    },
    preConfirm: () => {
      const fileInput = document.getElementById('customLogoFileInput');
      if (!fileInput.files || fileInput.files.length === 0) {
        Swal.showValidationMessage('Pilih file PNG/JPG terlebih dahulu!');
        return false;
      }
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(fileInput.files[0]);
      });
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      localStorage.setItem('ckg_custom_logo', result.value);
      applyCustomLogo();
      Swal.fire({
        icon: 'success',
        title: 'Logo Berhasil Diperbarui!',
        text: 'Logo aplikasi telah langsung diperbarui.',
        confirmButtonColor: '#2563eb'
      });
    } else if (result.isDenied) {
      localStorage.removeItem('ckg_custom_logo');
      location.reload();
    }
  });
}

/* ==========================================================================
   🔧 MAINTENANCE MODE SYSTEM (Web & Menu Lock)
   ========================================================================== */

let maintenanceState = {
  maintenance_web: localStorage.getItem('ckg_cached_maint_web') === '1',
  maintenance_web_message: localStorage.getItem('ckg_cached_maint_msg') || 'Sistem sedang dalam maintenance. Silakan coba beberapa saat lagi.',
  locked_menus: [],
  maintenance_menu_message: 'Menu ini sedang dalam maintenance oleh Admin.'
};

async function loadMaintenanceSettings() {
  try {
    const res = await fetch('/api/maintenance');
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        maintenanceState.maintenance_web = !!data.maintenance_web;
        maintenanceState.maintenance_web_message = data.maintenance_web_message || maintenanceState.maintenance_web_message;
        maintenanceState.locked_menus = data.locked_menus || [];
        maintenanceState.maintenance_menu_message = data.maintenance_menu_message || maintenanceState.maintenance_menu_message;
        if (data.gate_password_puskesmas) {
          gatePasswordPuskesmas = String(data.gate_password_puskesmas).trim();
          const gateInput = document.getElementById('inputGatePasswordPuskesmas');
          if (gateInput && !gateInput.matches(':focus')) {
            gateInput.value = gatePasswordPuskesmas;
          }
        }

        safeLocalStorageSet('ckg_cached_maint_web', maintenanceState.maintenance_web ? '1' : '0');
        safeLocalStorageSet('ckg_cached_maint_msg', maintenanceState.maintenance_web_message);
      }
    }
  } catch (err) {
    console.warn('[Maintenance] Could not fetch settings:', err.message);
  }

  // Update Admin Panel UI
  updateMaintenanceAdminUI();
  // Apply locks for current user
  applyMaintenanceLocks();
}

function updateMaintenanceAdminUI() {
  const toggle = document.getElementById('toggleMaintenanceWeb');
  const badge = document.getElementById('maintenanceWebStatusBadge');
  const msgEl = document.getElementById('maintenanceWebMessage');

  if (toggle) toggle.checked = maintenanceState.maintenance_web;
  if (badge) {
    if (maintenanceState.maintenance_web) {
      badge.textContent = 'AKTIF';
      badge.className = 'badge badge-rose';
      badge.style.fontSize = '11px';
    } else {
      badge.textContent = 'NONAKTIF';
      badge.className = 'badge badge-emerald';
      badge.style.fontSize = '11px';
    }
  }
  if (msgEl && maintenanceState.maintenance_web_message) {
    msgEl.value = maintenanceState.maintenance_web_message;
  }

  // Update menu lock checkboxes
  document.querySelectorAll('.menu-lock-checkbox').forEach(cb => {
    cb.checked = maintenanceState.locked_menus.includes(cb.value);
  });
}

async function toggleMaintenanceWebMode() {
  const toggle = document.getElementById('toggleMaintenanceWeb');
  const newState = toggle ? toggle.checked : false;
  const msgEl = document.getElementById('maintenanceWebMessage');
  const customMsg = msgEl ? msgEl.value.trim() : '';

  const actionText = newState ? 'MENGAKTIFKAN' : 'MENONAKTIFKAN';
  const result = await Swal.fire({
    title: `${actionText} Maintenance Web?`,
    html: newState
      ? `<div style="font-size:13.5px; text-align:left; line-height:1.7;">
          Semua pengguna <strong style="color:#dc2626;">SELAIN Admin / Super Admin</strong> akan <strong>TIDAK BISA AKSES</strong> ke aplikasi.<br><br>
          Mereka akan melihat halaman Maintenance Mode sampai Anda menonaktifkannya.
        </div>`
      : `<div style="font-size:13.5px;">Semua pengguna akan dapat mengakses aplikasi kembali secara normal.</div>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: newState ? '#dc2626' : '#059669',
    cancelButtonColor: '#64748b',
    confirmButtonText: newState ? 'Ya, Aktifkan Maintenance' : 'Ya, Nonaktifkan',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) {
    if (toggle) toggle.checked = !newState;
    return;
  }

  try {
    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maintenance_web: newState,
        maintenance_web_message: customMsg || maintenanceState.maintenance_web_message
      })
    });

    if (res.ok) {
      maintenanceState.maintenance_web = newState;
      if (customMsg) maintenanceState.maintenance_web_message = customMsg;
      safeLocalStorageSet('ckg_cached_maint_web', newState ? '1' : '0');
      safeLocalStorageSet('ckg_cached_maint_msg', maintenanceState.maintenance_web_message);
      updateMaintenanceAdminUI();
      showToast(`Maintenance Web berhasil ${newState ? 'DIAKTIFKAN' : 'DINONAKTIFKAN'}!`, newState ? 'warning' : 'success');
    } else {
      showToast('Gagal menyimpan pengaturan maintenance.', 'error');
      if (toggle) toggle.checked = !newState;
    }
  } catch (err) {
    showToast('Gagal koneksi ke Cloud: ' + err.message, 'error');
    if (toggle) toggle.checked = !newState;
  }
}

async function saveMenuMaintenanceSettings() {
  const checkedMenus = [];
  document.querySelectorAll('.menu-lock-checkbox:checked').forEach(cb => {
    checkedMenus.push(cb.value);
  });

  try {
    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked_menus: checkedMenus })
    });

    if (res.ok) {
      maintenanceState.locked_menus = checkedMenus;
      applyMaintenanceLocks();

      if (typeof Swal !== 'undefined') {
        const lockedNames = checkedMenus.length > 0
          ? checkedMenus.map(m => `<li style="margin:2px 0;"><i class="bi bi-lock-fill" style="color:#dc2626;"></i> <strong>${m}</strong></li>`).join('')
          : '<li style="color:#059669;"><i class="bi bi-unlock-fill"></i> Tidak ada menu yang dikunci</li>';

        Swal.fire({
          icon: 'success',
          title: 'Pengaturan Kunci Menu Tersimpan!',
          html: `<div style="font-size:13px; text-align:left; line-height:1.6;">
                  Menu berikut <strong>dikunci</strong> untuk semua pengguna selain Admin:
                  <ul style="margin:8px 0 0 16px; padding:0;">${lockedNames}</ul>
                </div>`,
          confirmButtonColor: '#7c3aed'
        });
      } else {
        showToast(`${checkedMenus.length} menu berhasil dikunci!`, 'success');
      }
    } else {
      showToast('Gagal menyimpan pengaturan menu maintenance.', 'error');
    }
  } catch (err) {
    showToast('Gagal koneksi Cloud: ' + err.message, 'error');
  }
}

function applyMaintenanceLocks() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  const isAdmin = role.includes('admin');

  // Admin / Super Admin bypasses all locks & maintenance screens
  if (isAdmin) {
    document.querySelectorAll('.nav-tab-btn.maintenance-locked').forEach(btn => {
      btn.classList.remove('maintenance-locked');
    });
    const overlay = document.getElementById('maintenanceFullscreenOverlay');
    if (overlay) overlay.remove();

    const isLoggedIn = sessionStorage.getItem('ckg_logged_in') === 'true';
    const mainApp = document.getElementById('appMainContainer');
    if (isLoggedIn && mainApp) mainApp.style.display = 'block';
    return;
  }

  // Non-Admin: If website maintenance is active, LOCK DOWN THE WHOLE APP
  if (maintenanceState.maintenance_web) {
    const mainApp = document.getElementById('appMainContainer');
    if (mainApp) mainApp.style.display = 'none';
    showMaintenanceScreen(maintenanceState.maintenance_web_message);
    return;
  }

  // Website maintenance is OFF: Remove fullscreen overlay if present
  const overlay = document.getElementById('maintenanceFullscreenOverlay');
  if (overlay) overlay.remove();
  const isLoggedIn = sessionStorage.getItem('ckg_logged_in') === 'true';
  const mainApp = document.getElementById('appMainContainer');
  if (isLoggedIn && mainApp) mainApp.style.display = 'block';

  // Apply menu locks for non-admin
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    const viewId = btn.getAttribute('data-view');
    if (maintenanceState.locked_menus.includes(viewId)) {
      btn.classList.add('maintenance-locked');
    } else {
      btn.classList.remove('maintenance-locked');
    }
  });
}

function checkMaintenanceOnLogin(userRole) {
  const role = (userRole || 'Petugas').toLowerCase();
  const isAdmin = role.includes('admin');

  if (isAdmin) return true; // Admin / Super Admin always passes

  if (maintenanceState.maintenance_web) {
    // Show fullscreen maintenance overlay
    showMaintenanceScreen(maintenanceState.maintenance_web_message);
    return false; // Block login
  }

  return true; // Allow login
}

function showMaintenanceScreen(message) {
  // Remove existing overlay if any
  const existing = document.getElementById('maintenanceFullscreenOverlay');
  if (existing) existing.remove();

  const mainApp = document.getElementById('appMainContainer');
  if (mainApp) mainApp.style.display = 'none';

  const overlay = document.createElement('div');
  overlay.id = 'maintenanceFullscreenOverlay';
  overlay.className = 'maintenance-fullscreen-overlay';
  overlay.innerHTML = `
    <div class="maintenance-fullscreen-content">
      <div class="maintenance-icon-box">
        <i class="bi bi-tools"></i>
      </div>
      <h1>🔧 Sistem Dalam Maintenance</h1>
      <p>${message || 'Sistem sedang dalam pemeliharaan oleh Administrator. Silakan coba beberapa saat lagi.'}</p>
      <div class="maint-badge">
        <i class="bi bi-clock-history"></i>
        Pencatatan CKG Puskesmas Banjaran Kota
      </div>
      <div style="margin-top: 26px;">
        <button onclick="exitMaintenanceToLogin()" style="background: linear-gradient(135deg, #0284c7, #2563eb); border: 1px solid rgba(255,255,255,0.25); color: #fff; padding: 12px 26px; border-radius: 12px; font-size: 13.5px; font-weight: 800; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);">
          <i class="bi bi-box-arrow-left" style="font-size: 16px;"></i> Kembali ke Halaman Login
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function exitMaintenanceToLogin() {
  sendUserHeartbeat('offline');
  sessionStorage.removeItem('ckg_logged_in');
  sessionStorage.removeItem('ckg_user_name');
  sessionStorage.removeItem('ckg_user_role');

  const overlay = document.getElementById('maintenanceFullscreenOverlay');
  if (overlay) overlay.remove();

  if (window._heartbeatInterval) {
    clearInterval(window._heartbeatInterval);
    window._heartbeatInterval = null;
  }
  if (window._fetchSessionsInterval) {
    clearInterval(window._fetchSessionsInterval);
    window._fetchSessionsInterval = null;
  }
  if (window._cloudSyncInterval) {
    clearInterval(window._cloudSyncInterval);
    window._cloudSyncInterval = null;
  }

  const mainApp = document.getElementById('appMainContainer');
  if (mainApp) mainApp.style.display = 'none';

  const loginOverlay = document.getElementById('loginViewContainer');
  if (loginOverlay) {
    loginOverlay.classList.remove('hidden');
    loginOverlay.style.display = 'flex';
  }
}

/* ==========================================================================
   👤 USER PROFILE DROPDOWN MENU POPOVER
   ========================================================================== */

function toggleUserProfileDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('userProfileDropdownMenu');
  if (menu) {
    menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'block' : 'none';
  }
}

function closeUserProfileDropdown() {
  const menu = document.getElementById('userProfileDropdownMenu');
  if (menu) {
    menu.style.display = 'none';
  }
}

document.addEventListener('click', (e) => {
  const container = document.getElementById('userProfileDropdownContainer');
  if (container && !container.contains(e.target)) {
    closeUserProfileDropdown();
  }
});

document.addEventListener('touchstart', (e) => {
  const container = document.getElementById('userProfileDropdownContainer');
  if (container && !container.contains(e.target)) {
    closeUserProfileDropdown();
  }
}, { passive: true });

window.addEventListener('scroll', () => {
  closeUserProfileDropdown();
}, { passive: true });
