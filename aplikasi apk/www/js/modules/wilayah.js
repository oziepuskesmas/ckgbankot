/**
 * APLIKASI INFO CKG - PUSKESMAS BANJARAN KOTA
 * Module: Wilayah Indonesia (EMSIFA API & Cached Dataset Engine)
 */

// ==========================================================================
// 🗺️ API WILAYAH INDONESIA (EMSIFA API & WILAYAH_DATA CACHED ENGINE)
// ==========================================================================
const EMSIFA_BASE = 'https://www.emsifa.com/api-wilayah-indonesia/api';

function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, function (m) {
    return m.toUpperCase();
  });
}

let emsifaProvincesCache = null;
const emsifaRegenciesCache = {};
const emsifaDistrictsCache = {};
const emsifaVillagesCache = {};

async function fetchEmsifaWilayah(endpoint) {
  try {
    const res = await fetch(`${EMSIFA_BASE}/${endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`[Emsifa API Wilayah Notice] ${endpoint}:`, e);
    return null;
  }
}

// --------------------------------------------------------------------------
// 🔍 SEARCHABLE COMBOBOX LOGIC UNTUK DROPDOWN WILAYAH (CKG GRATIS)
// --------------------------------------------------------------------------
function getWilayahComboboxIds(fieldKey) {
  const map = {
    'provinsi': { selectId: 'provinsi', wrapperId: 'comboboxProvinsiWrapper', triggerId: 'comboboxProvinsiTrigger', labelId: 'comboboxProvinsiLabel', panelId: 'comboboxProvinsiPanel', inputId: 'inputSearchProvinsiDropdown', optionsId: 'comboboxProvinsiOptions', icon: 'bi-geo-alt-fill', defaultText: '-- Pilih Provinsi --' },
    'kab_kota': { selectId: 'kab_kota', wrapperId: 'comboboxKabKotaWrapper', triggerId: 'comboboxKabKotaTrigger', labelId: 'comboboxKabKotaLabel', panelId: 'comboboxKabKotaPanel', inputId: 'inputSearchKabKotaDropdown', optionsId: 'comboboxKabKotaOptions', icon: 'bi-buildings-fill', defaultText: '-- Pilih Kab/Kota --' },
    'kecamatan': { selectId: 'kecamatan', wrapperId: 'comboboxKecamatanWrapper', triggerId: 'comboboxKecamatanTrigger', labelId: 'comboboxKecamatanLabel', panelId: 'comboboxKecamatanPanel', inputId: 'inputSearchKecamatanDropdown', optionsId: 'comboboxKecamatanOptions', icon: 'bi-pin-map-fill', defaultText: '-- Pilih Kecamatan --' },
    'kelurahan': { selectId: 'kelurahan', wrapperId: 'comboboxKelurahanWrapper', triggerId: 'comboboxKelurahanTrigger', labelId: 'comboboxKelurahanLabel', panelId: 'comboboxKelurahanPanel', inputId: 'inputSearchKelurahanDropdown', optionsId: 'comboboxKelurahanOptions', icon: 'bi-house-door-fill', defaultText: '-- Pilih Kelurahan --' }
  };
  return map[fieldKey] || null;
}

function syncWilayahComboboxUI(fieldKey) {
  const ids = getWilayahComboboxIds(fieldKey);
  if (!ids) return;
  const select = document.getElementById(ids.selectId);
  const label = document.getElementById(ids.labelId);
  if (!select || !label) return;

  const selIndex = select.selectedIndex;
  if (selIndex >= 0 && select.options[selIndex] && select.options[selIndex].value) {
    label.textContent = select.options[selIndex].textContent;
    label.style.fontWeight = '700';
    label.style.color = '#1e293b';
  } else {
    label.textContent = ids.defaultText;
    label.style.fontWeight = '500';
    label.style.color = '#64748b';
  }
}

function syncWilayahComboboxLabels() {
  ['provinsi', 'kab_kota', 'kecamatan', 'kelurahan'].forEach(f => syncWilayahComboboxUI(f));
}

function toggleWilayahSearchDropdown(fieldKey, event) {
  if (event) event.stopPropagation();
  const ids = getWilayahComboboxIds(fieldKey);
  if (!ids) return;

  const panel = document.getElementById(ids.panelId);
  const trigger = document.getElementById(ids.triggerId);
  const select = document.getElementById(ids.selectId);
  if (!panel || !trigger || !select) return;

  if (select.disabled) return;

  const isOpen = panel.style.display === 'flex' || panel.style.display === 'block';
  closeAllWilayahSearchDropdowns();

  if (!isOpen) {
    panel.style.display = 'flex';
    trigger.classList.add('open');
    renderWilayahSearchOptions(fieldKey, '');
    const searchInput = document.getElementById(ids.inputId);
    if (searchInput) {
      searchInput.value = '';
      setTimeout(() => searchInput.focus(), 50);
    }
  }
}

function closeAllWilayahSearchDropdowns() {
  ['provinsi', 'kab_kota', 'kecamatan', 'kelurahan'].forEach(f => {
    const ids = getWilayahComboboxIds(f);
    if (!ids) return;
    const panel = document.getElementById(ids.panelId);
    const trigger = document.getElementById(ids.triggerId);
    if (panel) panel.style.display = 'none';
    if (trigger) trigger.classList.remove('open');
  });
}

function clearWilayahSearchInput(fieldKey) {
  const ids = getWilayahComboboxIds(fieldKey);
  if (!ids) return;
  const searchInput = document.getElementById(ids.inputId);
  if (searchInput) {
    searchInput.value = '';
    renderWilayahSearchOptions(fieldKey, '');
    searchInput.focus();
  }
}

function filterWilayahSearchOptions(fieldKey, keyword) {
  renderWilayahSearchOptions(fieldKey, keyword);
}

function renderWilayahSearchOptions(fieldKey, keyword = '') {
  const ids = getWilayahComboboxIds(fieldKey);
  if (!ids) return;

  const select = document.getElementById(ids.selectId);
  const container = document.getElementById(ids.optionsId);
  if (!select || !container) return;

  const kw = (keyword || '').toLowerCase().trim();
  const options = Array.from(select.options);
  const selectedVal = (select.value || '').toLowerCase();

  let html = '';
  let count = 0;

  options.forEach(opt => {
    const text = opt.textContent.trim();
    const val = opt.value;
    if (!val && !kw) {
      const isSelected = !select.value;
      html += `
        <div class="combobox-option-item ${isSelected ? 'selected' : ''}" onclick="selectWilayahSearchOption('${fieldKey}', '', '${escapeHtml(text)}')">
          <span style="display: flex; align-items: center; gap: 8px;">
            <i class="bi ${ids.icon}" style="color: #94a3b8; font-size: 13px;"></i>
            <span style="color: #64748b;">${escapeHtml(text)}</span>
          </span>
          ${isSelected ? '<i class="bi bi-check-lg" style="color: #4f46e5; font-size: 15px; font-weight: 800;"></i>' : ''}
        </div>
      `;
      count++;
      return;
    }
    if (!val) return;

    if (!kw || text.toLowerCase().includes(kw) || val.toLowerCase().includes(kw)) {
      const isSelected = (val.toLowerCase() === selectedVal);
      html += `
        <div class="combobox-option-item ${isSelected ? 'selected' : ''}" onclick="selectWilayahSearchOption('${fieldKey}', '${escapeHtml(val)}', '${escapeHtml(text)}')">
          <span style="display: flex; align-items: center; gap: 8px;">
            <i class="bi ${ids.icon}" style="color: ${isSelected ? '#4f46e5' : '#6366f1'}; font-size: 13px;"></i>
            <span style="font-weight: ${isSelected ? '800' : '600'};">${escapeHtml(text)}</span>
          </span>
          ${isSelected ? '<i class="bi bi-check-lg" style="color: #4f46e5; font-size: 15px; font-weight: 800;"></i>' : ''}
        </div>
      `;
      count++;
    }
  });

  if (count === 0) {
    html = `<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;"><i class="bi bi-search" style="font-size: 16px; display: block; margin-bottom: 4px;"></i>Tidak ada hasil untuk "${escapeHtml(keyword)}"</div>`;
  }

  container.innerHTML = html;
}

function selectWilayahSearchOption(fieldKey, value, text) {
  const ids = getWilayahComboboxIds(fieldKey);
  if (!ids) return;

  const select = document.getElementById(ids.selectId);
  if (select) {
    select.value = value;
    select.dispatchEvent(new Event('change'));
  }
  syncWilayahComboboxUI(fieldKey);
  closeAllWilayahSearchDropdowns();
}

// Global outside-click listener for wilayah comboboxes
document.addEventListener('click', function (e) {
  ['provinsi', 'kab_kota', 'kecamatan', 'kelurahan'].forEach(f => {
    const ids = getWilayahComboboxIds(f);
    if (!ids) return;
    const wrapper = document.getElementById(ids.wrapperId);
    if (wrapper && !wrapper.contains(e.target)) {
      const panel = document.getElementById(ids.panelId);
      const trigger = document.getElementById(ids.triggerId);
      if (panel) panel.style.display = 'none';
      if (trigger) trigger.classList.remove('open');
    }
  });
});

// --------------------------------------------------------------------------
// 🌐 UNIVERSAL CASCADING WILAYAH LOGIC (SE-INDONESIA EMSIFA API & CACHE)
// --------------------------------------------------------------------------
if (typeof escapeHtml !== 'function') {
  window.escapeHtml = function (str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
}

// ==========================================================================
// 🏛️ CUSTOM WILAYAH STORAGE (PERSISTENSI PILIHAN MANUAL OLEH PENGGUNA)
// ==========================================================================
const CKG_CUSTOM_WILAYAH_KEY = 'ckg_custom_wilayah_data_v1';

function getCustomWilayahStorage() {
  try {
    const raw = localStorage.getItem(CKG_CUSTOM_WILAYAH_KEY);
    if (!raw) return { provinsi: [], kab_kota: {}, kecamatan: {}, kelurahan: {} };
    const parsed = JSON.parse(raw);
    return {
      provinsi: Array.isArray(parsed.provinsi) ? parsed.provinsi : [],
      kab_kota: (parsed.kab_kota && typeof parsed.kab_kota === 'object') ? parsed.kab_kota : {},
      kecamatan: (parsed.kecamatan && typeof parsed.kecamatan === 'object') ? parsed.kecamatan : {},
      kelurahan: (parsed.kelurahan && typeof parsed.kelurahan === 'object') ? parsed.kelurahan : {}
    };
  } catch (e) {
    console.warn('Error reading custom wilayah storage:', e);
    return { provinsi: [], kab_kota: {}, kecamatan: {}, kelurahan: {} };
  }
}

function saveCustomWilayahStorage(data) {
  try {
    localStorage.setItem(CKG_CUSTOM_WILAYAH_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Error saving custom wilayah storage:', e);
  }
}

function getCustomProvinsiList() {
  const data = getCustomWilayahStorage();
  return (data.provinsi || []).filter(Boolean);
}

function addCustomProvinsi(name) {
  name = toTitleCase(String(name || '').trim());
  if (!name || name === '__manual__') return '';
  const data = getCustomWilayahStorage();
  if (!data.provinsi.some(p => p.toLowerCase() === name.toLowerCase())) {
    data.provinsi.push(name);
    data.provinsi.sort((a, b) => a.localeCompare(b));
    saveCustomWilayahStorage(data);
  }
  return name;
}

function getCustomKabKotaList(provName) {
  const data = getCustomWilayahStorage();
  const res = new Set();
  const pKey = (provName || '').trim().toLowerCase();
  if (pKey && data.kab_kota[pKey]) {
    data.kab_kota[pKey].forEach(k => res.add(k));
  }
  if (data.kab_kota['_all']) {
    data.kab_kota['_all'].forEach(k => res.add(k));
  }
  return Array.from(res).sort((a, b) => a.localeCompare(b));
}

function addCustomKabKota(provName, name) {
  name = toTitleCase(String(name || '').trim());
  if (!name || name === '__manual__') return '';
  const data = getCustomWilayahStorage();
  const pKey = (provName || '_all').trim().toLowerCase();
  if (!data.kab_kota[pKey]) data.kab_kota[pKey] = [];
  if (!data.kab_kota[pKey].some(k => k.toLowerCase() === name.toLowerCase())) {
    data.kab_kota[pKey].push(name);
    data.kab_kota[pKey].sort((a, b) => a.localeCompare(b));
    saveCustomWilayahStorage(data);
  }
  return name;
}

function getCustomKecamatanList(provName, kabName) {
  const data = getCustomWilayahStorage();
  const res = new Set();
  const pKey = (provName || '').trim().toLowerCase();
  const kKey = (kabName || '').trim().toLowerCase();
  const comboKey = `${pKey}|${kKey}`;
  if (data.kecamatan[comboKey]) {
    data.kecamatan[comboKey].forEach(k => res.add(k));
  }
  if (kKey && data.kecamatan[kKey]) {
    data.kecamatan[kKey].forEach(k => res.add(k));
  }
  if (data.kecamatan['_all']) {
    data.kecamatan['_all'].forEach(k => res.add(k));
  }
  return Array.from(res).sort((a, b) => a.localeCompare(b));
}

function addCustomKecamatan(provName, kabName, name) {
  name = toTitleCase(String(name || '').trim());
  if (!name || name === '__manual__') return '';
  const data = getCustomWilayahStorage();
  const pKey = (provName || '').trim().toLowerCase();
  const kKey = (kabName || '_all').trim().toLowerCase();
  const comboKey = `${pKey}|${kKey}`;
  if (!data.kecamatan[comboKey]) data.kecamatan[comboKey] = [];
  if (!data.kecamatan[comboKey].some(k => k.toLowerCase() === name.toLowerCase())) {
    data.kecamatan[comboKey].push(name);
    data.kecamatan[comboKey].sort((a, b) => a.localeCompare(b));
    saveCustomWilayahStorage(data);
  }
  return name;
}

function getCustomKelurahanList(provName, kabName, kecName) {
  const data = getCustomWilayahStorage();
  const res = new Set();
  const kKey = (kabName || '').trim().toLowerCase();
  const cKey = (kecName || '').trim().toLowerCase();
  const comboKey = `${kKey}|${cKey}`;
  if (data.kelurahan[comboKey]) {
    data.kelurahan[comboKey].forEach(k => res.add(k));
  }
  if (cKey && data.kelurahan[cKey]) {
    data.kelurahan[cKey].forEach(k => res.add(k));
  }
  if (data.kelurahan['_all']) {
    data.kelurahan['_all'].forEach(k => res.add(k));
  }
  return Array.from(res).sort((a, b) => a.localeCompare(b));
}

function addCustomKelurahan(provName, kabName, kecName, name) {
  name = toTitleCase(String(name || '').trim());
  if (!name || name === '__manual__') return '';
  const data = getCustomWilayahStorage();
  const kKey = (kabName || '').trim().toLowerCase();
  const cKey = (kecName || '_all').trim().toLowerCase();
  const comboKey = `${kKey}|${cKey}`;
  if (!data.kelurahan[comboKey]) data.kelurahan[comboKey] = [];
  if (!data.kelurahan[comboKey].some(k => k.toLowerCase() === name.toLowerCase())) {
    data.kelurahan[comboKey].push(name);
    data.kelurahan[comboKey].sort((a, b) => a.localeCompare(b));
    saveCustomWilayahStorage(data);
  }
  return name;
}

// --------------------------------------------------------------------------
// ✍️ DIALOG PENGISIAN MANUAL WILAYAH (SWEETALERT2 INTERACTIVE PROMPT)
// --------------------------------------------------------------------------
async function triggerManualWilayahInput(selectId, tier) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;

  if (selectEl.disabled) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Kolom Terkunci',
        text: selectEl.title || 'Kolom wilayah saat ini masih terkunci. Harap lakukan Cek NIK terlebih dahulu.',
        confirmButtonColor: '#059669'
      });
    }
    if (selectEl.value === '__manual__') {
      selectEl.value = selectEl._lastValidValue || '';
      syncWilayahComboboxUI(selectEl.id);
    }
    return;
  }

  const group = selectEl._cascadeGroup;
  const provSelect = group ? group.provSelect : document.getElementById('provinsi');
  const kabSelect = group ? group.kabSelect : document.getElementById('kab_kota');
  const kecSelect = group ? group.kecSelect : document.getElementById('kecamatan');
  const kelSelect = group ? group.kelSelect : document.getElementById('kelurahan');

  const provVal = (provSelect?.value && provSelect.value !== '__manual__') ? provSelect.value : '';
  const kabVal = (kabSelect?.value && kabSelect.value !== '__manual__') ? kabSelect.value : '';
  const kecVal = (kecSelect?.value && kecSelect.value !== '__manual__') ? kecSelect.value : '';

  if (tier === 'kab_kota' && !provVal) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Provinsi Dulu',
        text: 'Silakan pilih atau isi nama Provinsi terlebih dahulu sebelum menambahkan Kab/Kota.',
        confirmButtonColor: '#059669'
      });
    }
    if (selectEl.value === '__manual__') {
      selectEl.value = selectEl._lastValidValue || '';
      syncWilayahComboboxUI(selectEl.id);
    }
    return;
  }

  if (tier === 'kecamatan' && !kabVal) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Kab/Kota Dulu',
        text: 'Silakan pilih atau isi nama Kabupaten / Kota terlebih dahulu sebelum menambahkan Kecamatan.',
        confirmButtonColor: '#059669'
      });
    }
    if (selectEl.value === '__manual__') {
      selectEl.value = selectEl._lastValidValue || '';
      syncWilayahComboboxUI(selectEl.id);
    }
    return;
  }

  if (tier === 'kelurahan' && !kecVal) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Kecamatan Dulu',
        text: 'Silakan pilih atau isi nama Kecamatan terlebih dahulu sebelum menambahkan Desa / Kelurahan.',
        confirmButtonColor: '#059669'
      });
    }
    if (selectEl.value === '__manual__') {
      selectEl.value = selectEl._lastValidValue || '';
      syncWilayahComboboxUI(selectEl.id);
    }
    return;
  }

  const config = {
    provinsi: {
      title: 'Isi Manual Nama Provinsi',
      info: 'Nama provinsi baru akan otomatis disimpan dan tersedia pada pilihan selanjutnya.',
      placeholder: 'Contoh: Papua Barat Daya',
      icon: 'bi-geo-alt-fill'
    },
    kab_kota: {
      title: 'Isi Manual Kabupaten / Kota',
      info: `Provinsi: <strong>${escapeHtml(provVal)}</strong><br>Nama Kab/Kota akan disimpan dan tersedia pada pilihan selanjutnya.`,
      placeholder: 'Contoh: Kabupaten Bandung Barat',
      icon: 'bi-buildings-fill'
    },
    kecamatan: {
      title: 'Isi Manual Kecamatan',
      info: `Kab/Kota: <strong>${escapeHtml(kabVal)}</strong> &bull; Provinsi: <strong>${escapeHtml(provVal)}</strong><br>Nama kecamatan akan disimpan dan tersedia pada pilihan selanjutnya.`,
      placeholder: 'Contoh: Bojongsoang',
      icon: 'bi-pin-map-fill'
    },
    kelurahan: {
      title: 'Isi Manual Desa / Kelurahan',
      info: `Kecamatan: <strong>${escapeHtml(kecVal)}</strong> &bull; Kab/Kota: <strong>${escapeHtml(kabVal)}</strong><br>Nama desa/kelurahan akan disimpan dan tersedia pada pilihan selanjutnya.`,
      placeholder: 'Contoh: Desa Karangmulya',
      icon: 'bi-house-door-fill'
    }
  };

  const cfg = config[tier] || config.provinsi;

  if (typeof Swal === 'undefined') {
    const entered = window.prompt(`${cfg.title}\n${cfg.placeholder}:`);
    if (entered && entered.trim()) {
      await handleApplyManualWilayah(selectEl, tier, entered.trim(), group, provVal, kabVal, kecVal);
    } else if (selectEl.value === '__manual__') {
      selectEl.value = selectEl._lastValidValue || '';
      syncWilayahComboboxUI(selectEl.id);
    }
    return;
  }

  const { value: customInput, isConfirmed } = await Swal.fire({
    title: `<i class="bi ${cfg.icon}" style="color: #059669; margin-right: 6px;"></i> ${cfg.title}`,
    html: `
      <div style="font-size: 13px; color: #475569; margin-bottom: 12px; text-align: left; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 14px; border-radius: 8px;">
        ${cfg.info}
      </div>
      <div style="text-align: left; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">Nama Wilayah Baru:</div>
    `,
    input: 'text',
    inputPlaceholder: cfg.placeholder,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-check-lg"></i> Simpan & Gunakan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#059669',
    cancelButtonColor: '#64748b',
    inputValidator: (val) => {
      const v = (val || '').trim();
      if (!v) return 'Nama wilayah tidak boleh kosong!';
      if (v.length < 2) return 'Nama wilayah minimal 2 karakter!';
      if (v.toLowerCase() === '__manual__') return 'Nama tidak valid!';
    }
  });

  if (isConfirmed && customInput && customInput.trim()) {
    await handleApplyManualWilayah(selectEl, tier, customInput.trim(), group, provVal, kabVal, kecVal);
  } else {
    if (selectEl.value === '__manual__') {
      selectEl.value = selectEl._lastValidValue || '';
      syncWilayahComboboxUI(selectEl.id);
    }
  }
}

async function handleApplyManualWilayah(selectEl, tier, rawName, group, provVal, kabVal, kecVal) {
  const cleanName = toTitleCase(rawName.trim());
  if (!cleanName) return;

  // 1. Simpan ke storage custom
  if (tier === 'provinsi') {
    addCustomProvinsi(cleanName);
  } else if (tier === 'kab_kota') {
    addCustomKabKota(provVal, cleanName);
  } else if (tier === 'kecamatan') {
    addCustomKecamatan(provVal, kabVal, cleanName);
  } else if (tier === 'kelurahan') {
    addCustomKelurahan(provVal, kabVal, kecVal, cleanName);
  }

  // 2. Masukkan ke dropdown options jika belum ada (sebelum opsi __manual__)
  let opt = Array.from(selectEl.options).find(o => o.value.toLowerCase() === cleanName.toLowerCase());
  if (!opt) {
    opt = document.createElement('option');
    opt.value = cleanName;
    opt.textContent = cleanName;
    const manualOpt = Array.from(selectEl.options).find(o => o.value === '__manual__');
    if (manualOpt) {
      selectEl.insertBefore(opt, manualOpt);
    } else {
      selectEl.appendChild(opt);
    }
  }

  // 3. Pilih opsi tersebut & catat _lastValidValue
  selectEl.value = cleanName;
  selectEl._lastValidValue = cleanName;
  syncWilayahComboboxUI(selectEl.id);

  // 4. Jalankan downstream cascading
  if (group) {
    if (tier === 'provinsi') {
      await group.loadKab(cleanName);
    } else if (tier === 'kab_kota') {
      await group.loadKec(provVal || cleanName, cleanName);
    } else if (tier === 'kecamatan') {
      await group.loadKel(provVal, kabVal, cleanName);
    } else if (tier === 'kelurahan') {
      syncWilayahComboboxUI(selectEl.id);
    }
  }

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `"${cleanName}" berhasil disimpan & dipilih!`,
      showConfirmButton: false,
      timer: 2200
    });
  }
}

// --------------------------------------------------------------------------
// 🌐 UNIVERSAL CASCADING WILAYAH LOGIC (SE-INDONESIA EMSIFA API & CACHE)
// --------------------------------------------------------------------------
async function initWilayahDropdownsCascade(provSelectId, kabSelectId, kecSelectId, kelSelectId, initialProv, initialKab, initialKec, initialKel) {
  const provSelect = document.getElementById(provSelectId);
  const kabSelect = document.getElementById(kabSelectId);
  const kecSelect = document.getElementById(kecSelectId);
  const kelSelect = document.getElementById(kelSelectId);
  if (!provSelect || !kabSelect || !kecSelect || !kelSelect) return;

  const defProv = initialProv || 'Jawa Barat';
  const defKab = initialKab || 'Kabupaten Bandung';
  const defKec = initialKec || 'Banjaran';
  const defKel = initialKel || 'Tarajusari';

  function selectOptionByText(selectEl, textVal, tierName) {
    if (!selectEl || !textVal) return null;
    if (textVal === '__manual__') return null;
    const clean = String(textVal).trim().toLowerCase();
    const cleanStripped = clean.replace(/^(kabupaten|kab\.|kota)\s*/i, '').trim();
    for (let i = 0; i < selectEl.options.length; i++) {
      const opt = selectEl.options[i];
      if (opt.value === '__manual__') continue;
      const optVal = String(opt.value).trim().toLowerCase();
      const optText = String(opt.textContent).trim().toLowerCase();
      const optStripped = optVal.replace(/^(kabupaten|kab\.|kota)\s*/i, '').trim();
      if (optVal === clean || optText === clean || (cleanStripped && optStripped === cleanStripped)) {
        selectEl.selectedIndex = i;
        selectEl._lastValidValue = opt.value;
        syncWilayahComboboxUI(selectEl.id);
        return opt;
      }
    }
    const formatted = toTitleCase(String(textVal).trim());
    const opt = document.createElement('option');
    opt.value = formatted;
    opt.textContent = formatted;

    if (tierName === 'provinsi') {
      addCustomProvinsi(formatted);
    } else if (tierName === 'kab_kota') {
      addCustomKabKota(provSelect?.value, formatted);
    } else if (tierName === 'kecamatan') {
      addCustomKecamatan(provSelect?.value, kabSelect?.value, formatted);
    } else if (tierName === 'kelurahan') {
      addCustomKelurahan(provSelect?.value, kabSelect?.value, kecSelect?.value, formatted);
    }

    const manualOpt = Array.from(selectEl.options).find(o => o.value === '__manual__');
    if (manualOpt) {
      selectEl.insertBefore(opt, manualOpt);
    } else {
      selectEl.appendChild(opt);
    }
    selectEl.value = formatted;
    selectEl._lastValidValue = formatted;
    syncWilayahComboboxUI(selectEl.id);
    return opt;
  }

  // 1. Load Provinsi
  provSelect.innerHTML = '<option value="">-- Pilih Provinsi --</option>';
  if (!emsifaProvincesCache) {
    emsifaProvincesCache = await fetchEmsifaWilayah('provinces.json');
  }

  if (emsifaProvincesCache && emsifaProvincesCache.length > 0) {
    emsifaProvincesCache.forEach(p => {
      const name = toTitleCase(p.name);
      provSelect.innerHTML += `<option value="${name}" data-id="${p.id}">${name}</option>`;
    });
  } else if (typeof WILAYAH_DATA !== 'undefined') {
    Object.keys(WILAYAH_DATA).forEach(prov => {
      provSelect.innerHTML += `<option value="${prov}">${prov}</option>`;
    });
  }

  // Inject custom Provinsi dari localStorage
  const customProvs = getCustomProvinsiList();
  if (customProvs && customProvs.length > 0) {
    customProvs.forEach(cp => {
      const exists = Array.from(provSelect.options).some(o => o.value.toLowerCase() === cp.toLowerCase());
      if (!exists) {
        provSelect.innerHTML += `<option value="${escapeHtml(cp)}">${escapeHtml(cp)}</option>`;
      }
    });
  }

  // Opsi isi manual di akhir dropdown
  provSelect.innerHTML += `<option value="__manual__" style="font-weight: 700; color: #059669;">➕ Lainnya (Isi Manual)...</option>`;
  syncWilayahComboboxUI(provSelectId);

  // 2. Load Kab/Kota
  async function loadKab(provName, selectKabVal) {
    kabSelect.innerHTML = '<option value="">-- Pilih Kab/Kota --</option>';
    kecSelect.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
    kelSelect.innerHTML = '<option value="">-- Pilih Kelurahan --</option>';
    syncWilayahComboboxUI(kabSelectId);
    syncWilayahComboboxUI(kecSelectId);
    syncWilayahComboboxUI(kelSelectId);
    if (!provName || provName === '__manual__') {
      kabSelect.innerHTML += `<option value="__manual__" style="font-weight: 700; color: #059669;">➕ Lainnya (Isi Manual)...</option>`;
      kecSelect.innerHTML += `<option value="__manual__" style="font-weight: 700; color: #059669;">➕ Lainnya (Isi Manual)...</option>`;
      kelSelect.innerHTML += `<option value="__manual__" style="font-weight: 700; color: #059669;">➕ Lainnya (Isi Manual)...</option>`;
      return;
    }

    const provOpt = Array.from(provSelect.options).find(o => o.value.toLowerCase() === provName.toLowerCase());
    const provId = provOpt?.getAttribute('data-id');

    if (provId) {
      if (!emsifaRegenciesCache[provId]) {
        emsifaRegenciesCache[provId] = await fetchEmsifaWilayah(`regencies/${provId}.json`);
      }
      const regList = emsifaRegenciesCache[provId];
      if (regList && regList.length > 0) {
        regList.forEach(r => {
          const name = toTitleCase(r.name);
          kabSelect.innerHTML += `<option value="${name}" data-id="${r.id}">${name}</option>`;
        });
      }
    } else if (typeof WILAYAH_DATA !== 'undefined' && WILAYAH_DATA[provName]) {
      Object.keys(WILAYAH_DATA[provName]).forEach(kab => {
        kabSelect.innerHTML += `<option value="${kab}">${kab}</option>`;
      });
    }

    // Inject custom Kab/Kota dari localStorage untuk provinsi terpilih
    const customKabs = getCustomKabKotaList(provName);
    if (customKabs && customKabs.length > 0) {
      customKabs.forEach(ck => {
        const exists = Array.from(kabSelect.options).some(o => o.value.toLowerCase() === ck.toLowerCase());
        if (!exists) {
          kabSelect.innerHTML += `<option value="${escapeHtml(ck)}">${escapeHtml(ck)}</option>`;
        }
      });
    }

    // Opsi isi manual di akhir dropdown
    kabSelect.innerHTML += `<option value="__manual__" style="font-weight: 700; color: #059669;">➕ Lainnya (Isi Manual)...</option>`;

    if (selectKabVal) {
      selectOptionByText(kabSelect, selectKabVal, 'kab_kota');
      await loadKec(provName, kabSelect.value, defKec);
    } else {
      syncWilayahComboboxUI(kabSelectId);
    }
  }

  // 3. Load Kecamatan
  async function loadKec(provName, kabName, selectKecVal) {
    kecSelect.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
    kelSelect.innerHTML = '<option value="">-- Pilih Kelurahan --</option>';
    syncWilayahComboboxUI(kecSelectId);
    syncWilayahComboboxUI(kelSelectId);
    if (!kabName || kabName === '__manual__') {
      kecSelect.innerHTML += `<option value="__manual__" style="font-weight: 700; color: #059669;">➕ Lainnya (Isi Manual)...</option>`;
      kelSelect.innerHTML += `<option value="__manual__" style="font-weight: 700; color: #059669;">➕ Lainnya (Isi Manual)...</option>`;
      return;
    }

    const kabOpt = Array.from(kabSelect.options).find(o => o.value.toLowerCase() === kabName.toLowerCase() || o.value.toLowerCase().replace(/^(kabupaten|kab\.|kota)\s*/i, '') === kabName.toLowerCase().replace(/^(kabupaten|kab\.|kota)\s*/i, ''));
    const regId = kabOpt?.getAttribute('data-id');

    if (regId) {
      if (!emsifaDistrictsCache[regId]) {
        emsifaDistrictsCache[regId] = await fetchEmsifaWilayah(`districts/${regId}.json`);
      }
      const distList = emsifaDistrictsCache[regId];
      if (distList && distList.length > 0) {
        distList.forEach(d => {
          const name = toTitleCase(d.name);
          kecSelect.innerHTML += `<option value="${name}" data-id="${d.id}">${name}</option>`;
        });
      }
    } else if (typeof WILAYAH_DATA !== 'undefined' && WILAYAH_DATA[provName] && WILAYAH_DATA[provName][kabName]) {
      Object.keys(WILAYAH_DATA[provName][kabName]).forEach(kec => {
        kecSelect.innerHTML += `<option value="${kec}">${kec}</option>`;
      });
    }

    // Inject custom Kecamatan dari localStorage untuk kab/kota terpilih
    const customKecs = getCustomKecamatanList(provName, kabName);
    if (customKecs && customKecs.length > 0) {
      customKecs.forEach(ck => {
        const exists = Array.from(kecSelect.options).some(o => o.value.toLowerCase() === ck.toLowerCase());
        if (!exists) {
          kecSelect.innerHTML += `<option value="${escapeHtml(ck)}">${escapeHtml(ck)}</option>`;
        }
      });
    }

    // Opsi isi manual di akhir dropdown
    kecSelect.innerHTML += `<option value="__manual__" style="font-weight: 700; color: #059669;">➕ Lainnya (Isi Manual)...</option>`;

    if (selectKecVal) {
      selectOptionByText(kecSelect, selectKecVal, 'kecamatan');
      await loadKel(provName, kabName, kecSelect.value, defKel);
    } else {
      syncWilayahComboboxUI(kecSelectId);
    }
  }

  // 4. Load Kelurahan
  async function loadKel(provName, kabName, kecName, selectKelVal) {
    kelSelect.innerHTML = '<option value="">-- Pilih Kelurahan --</option>';
    syncWilayahComboboxUI(kelSelectId);
    if (!kecName || kecName === '__manual__') {
      kelSelect.innerHTML += `<option value="__manual__" style="font-weight: 700; color: #059669;">➕ Lainnya (Isi Manual)...</option>`;
      return;
    }

    const kecOpt = Array.from(kecSelect.options).find(o => o.value.toLowerCase() === kecName.toLowerCase());
    const distId = kecOpt?.getAttribute('data-id');

    if (distId) {
      if (!emsifaVillagesCache[distId]) {
        emsifaVillagesCache[distId] = await fetchEmsifaWilayah(`villages/${distId}.json`);
      }
      const vilList = emsifaVillagesCache[distId];
      const kelNameOverrides = { 'Banjaran': 'Banjaran Kulon' };
      if (vilList && vilList.length > 0) {
        vilList.forEach(v => {
          let displayName = toTitleCase(v.name);
          if (kelNameOverrides[displayName]) displayName = kelNameOverrides[displayName];
          kelSelect.innerHTML += `<option value="${displayName}" data-id="${v.id}">${displayName}</option>`;
        });
      }
    } else if (typeof WILAYAH_DATA !== 'undefined' && WILAYAH_DATA[provName] && WILAYAH_DATA[provName][kabName] && WILAYAH_DATA[provName][kabName][kecName]) {
      WILAYAH_DATA[provName][kabName][kecName].forEach(kel => {
        kelSelect.innerHTML += `<option value="${kel}">${kel}</option>`;
      });
    }

    // Inject custom Kelurahan dari localStorage untuk kecamatan terpilih
    const customKels = getCustomKelurahanList(provName, kabName, kecName);
    if (customKels && customKels.length > 0) {
      customKels.forEach(ck => {
        const exists = Array.from(kelSelect.options).some(o => o.value.toLowerCase() === ck.toLowerCase());
        if (!exists) {
          kelSelect.innerHTML += `<option value="${escapeHtml(ck)}">${escapeHtml(ck)}</option>`;
        }
      });
    }

    // Opsi isi manual di akhir dropdown
    kelSelect.innerHTML += `<option value="__manual__" style="font-weight: 700; color: #059669;">➕ Lainnya (Isi Manual)...</option>`;

    if (selectKelVal) {
      selectOptionByText(kelSelect, selectKelVal, 'kelurahan');
    } else {
      syncWilayahComboboxUI(kelSelectId);
    }
  }

  // Tautkan referensi cascade group dan tier ke element
  const cascadeGroup = { provSelect, kabSelect, kecSelect, kelSelect, loadKab, loadKec, loadKel };
  provSelect._cascadeGroup = cascadeGroup;
  kabSelect._cascadeGroup = cascadeGroup;
  kecSelect._cascadeGroup = cascadeGroup;
  kelSelect._cascadeGroup = cascadeGroup;

  provSelect._tierName = 'provinsi';
  kabSelect._tierName = 'kab_kota';
  kecSelect._tierName = 'kecamatan';
  kelSelect._tierName = 'kelurahan';

  provSelect.onchange = async () => {
    if (provSelect.value === '__manual__') {
      await triggerManualWilayahInput(provSelectId, 'provinsi');
    } else {
      provSelect._lastValidValue = provSelect.value;
      syncWilayahComboboxUI(provSelectId);
      await loadKab(provSelect.value);
    }
  };

  kabSelect.onchange = async () => {
    if (kabSelect.value === '__manual__') {
      await triggerManualWilayahInput(kabSelectId, 'kab_kota');
    } else {
      kabSelect._lastValidValue = kabSelect.value;
      syncWilayahComboboxUI(kabSelectId);
      await loadKec(provSelect.value, kabSelect.value);
    }
  };

  kecSelect.onchange = async () => {
    if (kecSelect.value === '__manual__') {
      await triggerManualWilayahInput(kecSelectId, 'kecamatan');
    } else {
      kecSelect._lastValidValue = kecSelect.value;
      syncWilayahComboboxUI(kecSelectId);
      await loadKel(provSelect.value, kabSelect.value, kecSelect.value);
    }
  };

  kelSelect.onchange = async () => {
    if (kelSelect.value === '__manual__') {
      await triggerManualWilayahInput(kelSelectId, 'kelurahan');
    } else {
      kelSelect._lastValidValue = kelSelect.value;
      syncWilayahComboboxUI(kelSelectId);
    }
  };

  selectOptionByText(provSelect, defProv, 'provinsi');
  await loadKab(provSelect.value, defKab);
}

async function initWilayahDropdowns() {
  await initWilayahDropdownsCascade('provinsi', 'kab_kota', 'kecamatan', 'kelurahan', 'Jawa Barat', 'Kabupaten Bandung', 'Banjaran', 'Tarajusari');
  syncWilayahComboboxLabels();
}

function getDeletedKampungList() {
  try {
    const raw = localStorage.getItem('ckg_deleted_kampung_list');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addToDeletedBlacklist(keyword) {
  if (!keyword) return;
  const kwUpper = String(keyword).toUpperCase().trim();
  const list = getDeletedKampungList();
  if (!list.includes(kwUpper)) {
    list.push(kwUpper);
    localStorage.setItem('ckg_deleted_kampung_list', JSON.stringify(list));
  }
}



async function syncKamusFromCloudServer() {
  try {
    console.log('☁️ [Kamus Sync] Fetching /api/kamus (GET)...');
    const res = await fetch('/api/kamus');
    console.log('☁️ [Kamus Sync] Response status:', res.status);
    if (res.ok) {
      const json = await res.json();
      console.log('☁️ [Kamus Sync] D1 returned:', json.success, 'items:', (json.data || []).length);
      if (json.success && Array.isArray(json.data)) {
        const deletedList = getDeletedKampungList();
        // Replace local with D1 cloud data as authoritative source
        const cloudMap = [];
        json.data.forEach(item => {
          const kw = String(item.keyword).toUpperCase().trim();
          if (!kw || deletedList.includes(kw)) return; // 🚫 Skip deleted keywords!

          const existing = cloudMap.find(m => m.keywords.includes(kw));
          if (existing) {
            existing.kel = item.kel || existing.kel;
            existing.kec = item.kec || existing.kec;
            existing.kab = item.kab || existing.kab;
            existing.prov = item.prov || existing.prov;
            if (item.lat) existing.lat = item.lat;
            if (item.lng) existing.lng = item.lng;
          } else {
            cloudMap.push({
              keywords: [kw],
              kel: item.kel || '',
              kec: item.kec || 'Banjaran',
              kab: item.kab || 'Kabupaten Bandung',
              prov: item.prov || 'Jawa Barat',
              lat: item.lat || null,
              lng: item.lng || null
            });
          }
        });

        // Also merge any local-only items not yet in cloud
        const local = getLearnedKampungMap();
        local.forEach(localItem => {
          if (!localItem.keywords || !Array.isArray(localItem.keywords)) return;
          localItem.keywords.forEach(lkw => {
            const cleanLkw = String(lkw).toUpperCase().trim();
            if (deletedList.includes(cleanLkw)) return; // 🚫 Skip deleted keywords!
            const inCloud = cloudMap.find(m => m.keywords.includes(cleanLkw));
            if (!inCloud) {
              cloudMap.push(localItem);
            }
          });
        });

        localStorage.setItem('ckg_learned_kampung_map', JSON.stringify(cloudMap));
        console.log('☁️ [Kamus Sync] Local storage updated, total entries:', cloudMap.length);
        refreshAdminKamusStats();
        if (typeof renderMapMarkers === 'function') renderMapMarkers();
      }
    } else {
      console.warn('☁️ [Kamus Sync] Non-OK response:', res.status);
    }
  } catch (err) {
    console.warn('☁️ [Kamus Sync] Error:', err);
  }
}

function saveLearnedKampungKeyword(keyword, kel, kec = 'Banjaran', kab = 'Kabupaten Bandung', prov = 'Jawa Barat', syncToCloud = true, lat = null, lng = null) {
  if (!keyword || !kel) return;
  const cleanKw = keyword.toUpperCase().replace(/^(KP\.|KAMPUNG|JLN?\.|JALAN|RT|RW)\s*/i, '').trim();
  if (cleanKw.length < 3) return;

  const current = getLearnedKampungMap();
  const existing = current.find(item => item.keywords.includes(cleanKw));
  if (existing) {
    existing.kel = kel;
    existing.kec = kec || existing.kec;
    existing.kab = kab || existing.kab;
    existing.prov = prov || existing.prov;
    if (lat) existing.lat = lat;
    if (lng) existing.lng = lng;
  } else {
    current.push({
      keywords: [cleanKw],
      kel: kel,
      kec: kec || 'Banjaran',
      kab: kab || 'Kabupaten Bandung',
      prov: prov || 'Jawa Barat',
      lat: lat || null,
      lng: lng || null
    });
  }
  try {
    localStorage.setItem('ckg_learned_kampung_map', JSON.stringify(current));
  } catch (e) { }

  if (syncToCloud) {
    // Sync to D1 Cloud Server
    fetch('/api/kamus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ keyword: cleanKw, kel, kec, kab, prov, lat, lng }])
    }).catch(err => console.warn('D1 Kamus push failed:', err));
  }
}

function downloadKamusAlamatTemplate() {
  if (typeof XLSX === 'undefined') {
    Swal.fire('Library XLSX Belum Siap', 'Silakan refresh halaman dan coba kembali.', 'warning');
    return;
  }
  const templateData = [
    {
      "KATA KUNCI KAMPUNG": "PAJAGALAN",
      "KELURAHAN / DESA": "Banjaran Kota",
      "KECAMATAN": "Banjaran",
      "KABUPATEN / KOTA": "Kabupaten Bandung",
      "PROVINSI": "Jawa Barat",
      "LATITUDE": "-7.045612",
      "LONGITUDE": "107.587421"
    },
    {
      "KATA KUNCI KAMPUNG": "KAMASAN",
      "KELURAHAN / DESA": "Kamasan",
      "KECAMATAN": "Banjaran",
      "KABUPATEN / KOTA": "Kabupaten Bandung",
      "PROVINSI": "Jawa Barat",
      "LATITUDE": "-7.041234",
      "LONGITUDE": "107.589012"
    },
    {
      "KATA KUNCI KAMPUNG": "CIAPUS",
      "KELURAHAN / DESA": "Ciapus",
      "KECAMATAN": "Banjaran",
      "KABUPATEN / KOTA": "Kabupaten Bandung",
      "PROVINSI": "Jawa Barat",
      "LATITUDE": "-7.051122",
      "LONGITUDE": "107.591234"
    },
    {
      "KATA KUNCI KAMPUNG": "DARMO",
      "KELURAHAN / DESA": "Darmo",
      "KECAMATAN": "Wonokromo",
      "KABUPATEN / KOTA": "Kota Surabaya",
      "PROVINSI": "Jawa Timur",
      "LATITUDE": "-7.291234",
      "LONGITUDE": "112.734567"
    },
    {
      "KATA KUNCI KAMPUNG": "MENTENG",
      "KELURAHAN / DESA": "Menteng",
      "KECAMATAN": "Menteng",
      "KABUPATEN / KOTA": "Kota Jakarta Pusat",
      "PROVINSI": "DKI Jakarta",
      "LATITUDE": "-6.191234",
      "LONGITUDE": "106.834567"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  // Auto-set column widths for clean presentation
  worksheet['!cols'] = [
    { wch: 22 }, // Kata Kunci Kampung
    { wch: 22 }, // Kelurahan / Desa
    { wch: 18 }, // Kecamatan
    { wch: 22 }, // Kabupaten / Kota
    { wch: 18 }, // Provinsi
    { wch: 14 }, // Latitude
    { wch: 14 }  // Longitude
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Kamus Alamat D1");
  XLSX.writeFile(workbook, "Template_Kamus_Alamat_Cloud_D1.xlsx");
}

async function handleExcelAddressUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const activeRole = (sessionStorage.getItem('ckg_user_role') || currentRole || '').toLowerCase();
  if (activeRole !== 'admin') {
    Swal.fire('Akses Ditolak', 'Hanya Admin yang dapat mengimpor Kamus Alamat.', 'error');
    return;
  }

  Swal.fire({
    title: 'Membaca & Mengunggah File Excel...',
    text: 'Mohon tunggu sebentar, sistem sedang memproses data alamat dan mengirim ke Cloud D1 Database Server.',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

    console.log('📊 [Kamus Import] Sheet parsed, total rows:', rows.length);
    if (!rows || rows.length === 0) {
      Swal.fire('File Kosong', 'Tidak ada data ditemukan dalam file Excel tersebut.', 'warning');
      return;
    }

    const itemsToSave = [];
    const prefixRegex = /^(KP\.?\s*|KAMPUNG\s+|JL\.?\s*|JLN\.?\s*|JALAN\s+|GG\.?\s*|GANG\s+|DS\.?\s*|DUSUN\s+)/i;
    const rtRwRegex = /\s*RT\.?\s*\d*\s*\/?\s*RW\.?\s*\d*/gi;
    const digitOnlyRegex = /^\d+$/;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      let kwVal = '';
      let kelVal = '';
      let kecVal = '';
      let kabVal = '';
      let provVal = '';
      let latVal = null;
      let lngVal = null;

      const keys = Object.keys(r);
      for (let k of keys) {
        const keyLower = k.toLowerCase().trim();
        const valStr = String(r[k]).trim();
        if (!valStr) continue;

        if (keyLower.includes('kata kunci') || keyLower.includes('keyword') || keyLower.includes('kampung') || keyLower.includes('alamat') || keyLower.includes('jalan')) {
          if (!kwVal) kwVal = valStr;
        } else if (keyLower.includes('kelurahan') || keyLower.includes('desa') || keyLower === 'kel') {
          if (!kelVal) kelVal = valStr;
        } else if (keyLower.includes('kecamatan') || keyLower === 'kec') {
          if (!kecVal) kecVal = valStr;
        } else if (keyLower.includes('kabupaten') || keyLower.includes('kab') || keyLower.includes('kota')) {
          if (!kabVal) kabVal = valStr;
        } else if (keyLower.includes('provinsi') || keyLower.includes('prov')) {
          if (!provVal) provVal = valStr;
        } else if (keyLower.includes('latitude') || keyLower === 'lat') {
          latVal = parseFloat(valStr) || null;
        } else if (keyLower.includes('longitude') || keyLower === 'lng' || keyLower === 'lon') {
          lngVal = parseFloat(valStr) || null;
        }
      }

      // Fallback: if headers didn't match keyword, check first column
      if (!kwVal && keys.length > 0) {
        kwVal = String(r[keys[0]] || '').trim();
      }

      if (!kwVal) continue;

      // Clean the keyword
      let cleanedKw = kwVal.toUpperCase().trim();
      cleanedKw = cleanedKw.replace(prefixRegex, '').trim();
      cleanedKw = cleanedKw.replace(rtRwRegex, '').trim();

      const words = cleanedKw.split(/[\s,;\/\\]+/).filter(w => w.length >= 2 && !digitOnlyRegex.test(w));
      const finalKw = words[0] || cleanedKw;

      if (!finalKw || finalKw.length < 2) continue;

      // Clean administration names
      kelVal = kelVal.replace(/^Kelurahan\s+|^Desa\s+/i, '').trim();
      kecVal = kecVal.replace(/^Kecamatan\s+/i, '').trim();
      kabVal = kabVal.replace(/^Kabupaten\s+|^Kota\s+/i, '').trim();

      itemsToSave.push({
        keyword: finalKw.toUpperCase(),
        kel: kelVal,
        kec: kecVal,
        kab: kabVal,
        prov: provVal,
        lat: latVal,
        lng: lngVal
      });
    }

    if (itemsToSave.length === 0) {
      event.target.value = '';
      Swal.fire('Data Tidak Valid', 'Sistem tidak dapat menemukan kata kunci kampung yang valid dari file Excel.', 'warning');
      return;
    }

    // Save to LocalStorage cache
    itemsToSave.forEach(item => {
      saveLearnedKampungKeyword(item.keyword, item.kel, item.kec, item.kab, item.prov, false, item.lat, item.lng);
    });

    // Upload directly to Cloud D1 Database via POST /api/kamus
    let d1Success = false;
    let d1Count = 0;
    let d1ErrorMsg = '';

    try {
      const res = await fetch('/api/kamus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemsToSave)
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        d1Success = true;
        d1Count = resJson.count || itemsToSave.length;
      } else {
        d1ErrorMsg = resJson.error || 'Response not OK';
      }
    } catch (netErr) {
      d1ErrorMsg = netErr.message;
    }

    event.target.value = '';
    await syncKamusFromCloudServer();
    refreshAdminKamusStats();
    renderKamusAlamatTable();

    Swal.fire({
      icon: d1Success ? 'success' : 'warning',
      title: d1Success ? 'Upload Kamus ke Cloud D1 Berhasil!' : 'Tersimpan Lokal, Gagal Upload Cloud',
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.7;">
          <p>Berhasil mengekstrak <strong>${itemsToSave.length}</strong> data kampung dari <strong>${rows.length}</strong> baris file Excel.</p>
          <div style="margin-top: 10px; padding: 10px 12px; background: ${d1Success ? '#f0fdf4' : '#fef2f2'}; border-radius: 8px; border: 1px solid ${d1Success ? '#bbf7d0' : '#fecaca'}; font-size: 12px;">
            ${d1Success
          ? `<strong style="color: #15803d;">☁️ Cloud D1 Database:</strong> ${d1Count} data berhasil disimpan/diperbarui ke cloud.`
          : `<strong style="color: #b91c1c;">⚠️ Error Cloud D1:</strong> ${d1ErrorMsg}`}
          </div>
        </div>
      `,
      confirmButtonText: 'Selesai'
    });

  } catch (err) {
    event.target.value = '';
    console.error('❌ Error handling Excel import:', err);
    Swal.fire('Gagal Membaca File', `Terjadi kesalahan saat memproses file Excel: ${err.message}`, 'error');
  }
}

function refreshAdminKamusStats() {
  const statEl = document.getElementById('statKamusAlamatText');
  if (!statEl) return;
  const learnedMap = getLearnedKampungMap();
  const staticCount = BANJARAN_KAMPUNG_MAP.length;
  const learnedCount = learnedMap.length;

  let totalKeywords = 0;
  BANJARAN_KAMPUNG_MAP.forEach(m => totalKeywords += m.keywords.length);
  learnedMap.forEach(m => totalKeywords += m.keywords.length);

  statEl.innerHTML = `
    🟢 <strong>Kamus Bawaan (Banjaran):</strong> ${staticCount} Wilayah Kelurahan (${totalKeywords - learnedCount} Kata Kunci)<br>
    ☁️ <strong>Kamus Cloud Database (D1 Cloud Sync & Excel Import):</strong> ${learnedCount} Kata Kunci Tersinkronisasi Seluruh Device<br>
    ✨ <strong>Total Bank Data Wilayah Siap Pakai:</strong> <strong>${staticCount + learnedCount} Wilayah / Entry</strong>
  `;

  renderKamusAlamatTable();
}

function renderKamusAlamatTable() {
  const tbody = document.getElementById('tbodyKamusAlamat');
  if (!tbody) return;

  const searchInput = document.getElementById('searchKamusInput');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const learnedMap = getLearnedKampungMap();
  if (!learnedMap || learnedMap.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 16px; color: #94a3b8;">
          ☁️ Belum ada kata kunci tersimpan di Kamus Cloud D1. Silakan unduh Template & impor file Excel.
        </td>
      </tr>`;
    return;
  }

  let rowsHtml = '';
  let matchCount = 0;

  learnedMap.forEach(item => {
    const kw = Array.isArray(item.keywords) ? item.keywords[0] : String(item.keywords || '');
    const fullKw = Array.isArray(item.keywords) ? item.keywords.join(', ') : String(item.keywords || '');
    const kel = item.kel || '-';
    const kec = item.kec || 'Banjaran';
    const kab = item.kab || 'Kabupaten Bandung';
    const prov = item.prov || 'Jawa Barat';

    if (query && !fullKw.toLowerCase().includes(query) && !kel.toLowerCase().includes(query) && !kec.toLowerCase().includes(query)) {
      return;
    }

    matchCount++;
    rowsHtml += `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 7px 12px; font-weight: 700; color: #0f172a;"><i class="bi bi-tag-fill" style="color: #0284c7;"></i> ${fullKw}</td>
        <td style="padding: 7px 12px; color: #334155;"><span class="badge" style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px;">${kel}</span></td>
        <td style="padding: 7px 12px; color: #475569;">${kec}</td>
        <td style="padding: 7px 12px; color: #475569;">${kab}</td>
        <td style="padding: 7px 12px; color: #475569;">${prov}</td>
        <td style="padding: 7px 12px; text-align: center;">
          <button class="btn btn-secondary btn-sm" onclick="deleteSingleKamusKeyword('${kw}')" title="Hapus kata kunci ini" style="background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; padding: 2px 8px; font-size: 11px; border-radius: 6px;">
            <i class="bi bi-trash"></i> Hapus
          </button>
        </td>
      </tr>
    `;
  });

  if (matchCount === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 14px; color: #94a3b8;">
          Tidak ada kata kunci kamus yang cocok dengan pencarian "${query}".
        </td>
      </tr>`;
  } else {
    tbody.innerHTML = rowsHtml;
  }
}

async function clearLearnedKampungMap() {
  const activeRole = (sessionStorage.getItem('ckg_user_role') || currentRole || '').toLowerCase();
  if (activeRole !== 'admin') {
    Swal.fire('Akses Ditolak', 'Hanya Admin yang dapat mereset Kamus Pembelajaran.', 'error');
    return;
  }

  const learnedMap = getLearnedKampungMap();
  const totalCount = learnedMap ? learnedMap.length : 0;

  const result = await Swal.fire({
    title: 'Hapus SEMUA Data Alamat?',
    html: `
      <div style="font-size: 13px; color: #64748b; text-align: left; line-height: 1.6;">
        <p style="margin-bottom: 10px;">
          Tindakan ini akan <strong>MENGHAPUS PERMANEN</strong> seluruh <strong>${totalCount} data kata kunci alamat/kampung</strong> dari:
        </p>
        <ul style="padding-left: 20px; color: #0f172a; margin-bottom: 12px; font-weight: 600;">
          <li>☁️ Cloud Database D1 Cloudflare</li>
          <li>💾 LocalStorage Penyimpanan Browser</li>
        </ul>
        <div style="padding: 10px 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; color: #be123c; font-weight: 700; font-size: 12px;">
          ⚠️ PERINGATAN: Tindakan ini tidak dapat dibatalkan!
        </div>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Hapus Semua Data Alamat!',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  // ====== SHOW REAL-TIME STEP-BY-STEP PROGRESS POPUP ======
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  Swal.fire({
    title: '🔄 Menghapus Seluruh Data Alamat...',
    html: `
      <div id="clearKamusProgressContainer" style="text-align: left; font-size: 13px; padding-top: 6px;">
        <div id="clearKamusProgressStep" style="font-weight: 700; color: #0284c7; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
          <span class="spinner-border spinner-border-sm" style="width: 16px; height: 16px; border-width: 2px; color: #0284c7;"></span>
          <span>Memulai proses penghapusan...</span>
        </div>
        <div style="height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 12px;">
          <div id="clearKamusProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #f43f5e, #be123c); border-radius: 6px; transition: width 0.4s ease;"></div>
        </div>
        <div id="clearKamusProgressLog" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-family: monospace; font-size: 11.5px; color: #475569; max-height: 160px; overflow-y: auto; line-height: 1.7;">
          <div>⏳ Menghubungkan ke server D1...</div>
        </div>
      </div>
    `,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => { Swal.showLoading(); }
  });

  const updateProgress = (pct, stepMsg, logText = '') => {
    const barEl = document.getElementById('clearKamusProgressBar');
    const stepEl = document.getElementById('clearKamusProgressStep');
    const logEl = document.getElementById('clearKamusProgressLog');
    if (barEl) barEl.style.width = pct + '%';
    if (stepEl && stepMsg) stepEl.querySelector('span:last-child').textContent = stepMsg;
    if (logEl && logText) {
      logEl.innerHTML += `<div>${logText}</div>`;
      logEl.scrollTop = logEl.scrollHeight;
    }
  };

  try {
    // --- STEP 1: Count initial cloud items ---
    updateProgress(15, '🔍 Mengecek data Cloud D1 Database...', '🔍 Menghitung data di Cloud D1 Database Server...');
    await delay(400);

    let initialCloudCount = 0;
    try {
      const checkRes = await fetch('/api/kamus');
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        initialCloudCount = (checkData.data && Array.isArray(checkData.data)) ? checkData.data.length : 0;
      }
    } catch (e) {
      initialCloudCount = 'Error';
    }
    updateProgress(30, '☁️ Mengirim perintah DELETE ke Cloud D1...', `☁️ Ditemukan ${initialCloudCount} data di Cloud D1. Mengirim permohonan hapus...`);
    await delay(400);

    // --- STEP 2: Execute DELETE command on Cloud D1 ---
    let cloudDeleted = false;
    let serverMessage = '';
    try {
      const delRes = await fetch('/api/kamus', { method: 'DELETE' });
      if (delRes.ok) {
        const delJson = await delRes.json();
        cloudDeleted = delJson.success === true;
        serverMessage = delJson.message || 'OK';
        updateProgress(60, '✅ Respon diterima dari Cloud D1...', `✅ Cloud D1 Respon: ${serverMessage}`);
      } else {
        updateProgress(60, '⚠️ Respon HTTP server non-200...', `⚠️ Cloud D1 Respon status: ${delRes.status}`);
      }
    } catch (netErr) {
      updateProgress(60, '❌ Kesalahan jaringan ke Cloud D1...', `❌ Error koneksi: ${netErr.message}`);
    }
    await delay(500);

    // --- STEP 3: Verify deletion on Cloud D1 ---
    updateProgress(75, '🔍 Memverifikasi status akhir Cloud D1...', '🔍 Verifikasi ulang data di Cloud D1...');
    let remainingCloudCount = 0;
    try {
      const vRes = await fetch('/api/kamus');
      if (vRes.ok) {
        const vData = await vRes.json();
        remainingCloudCount = (vData.data && Array.isArray(vData.data)) ? vData.data.length : 0;
      }
    } catch (e) { remainingCloudCount = 0; }

    updateProgress(85, '💾 Membersihkan Storage Browser (LocalStorage)...', `✅ Verifikasi Cloud D1 selesai (sisa record: ${remainingCloudCount}).`);
    await delay(400);

    // --- STEP 4: Clear LocalStorage ---
    localStorage.setItem('ckg_learned_kampung_map', '[]');
    localStorage.removeItem('ckg_deleted_kampung_list');
    localStorage.removeItem('ckg_deleted_kampungs_blacklist');
    localStorage.setItem('ckg_dictionary_is_reset', 'true');
    updateProgress(95, '🔄 Memperbarui Tampilan UI...', '💾 LocalStorage browser berhasil dibersihkan.');
    await delay(400);

    // --- STEP 5: Refresh UI ---
    refreshAdminKamusStats();
    renderKamusAlamatTable();
    updateProgress(100, '✨ Penghapusan Selesai!', '✨ Seluruh data alamat berhasil dihapus!');
    await delay(500);

    Swal.fire({
      icon: 'success',
      title: 'Seluruh Data Alamat Berhasil Dihapus!',
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.7;">
          <p style="color: #059669; font-weight: 700; margin-bottom: 6px;">
            🎉 Pembersihan data Kamus Alamat berhasil dilaksanakan.
          </p>
          <ul style="padding-left: 20px; color: #475569; font-size: 12px;">
            <li>☁️ <strong>Cloud D1 Database:</strong> ${cloudDeleted ? 'Terhapus total (0 Record)' : 'Respon diproses'}</li>
            <li>💾 <strong>LocalStorage Browser:</strong> Terhapus bersih</li>
          </ul>
        </div>
      `,
      confirmButtonText: 'Selesai',
      confirmButtonColor: '#0284c7'
    });

  } catch (fatalErr) {
    console.error('❌ Fatal clear kamus error:', fatalErr);
    Swal.fire('Gagal Menghapus', `Terjadi kesalahan: ${fatalErr.message}`, 'error');
  }
}

async function deleteSingleKamusKeyword(keyword) {
  if (!keyword) return;
  const activeRole = (sessionStorage.getItem('ckg_user_role') || currentRole || '').toLowerCase();
  if (activeRole !== 'admin') {
    Swal.fire('Akses Ditolak', 'Hanya Admin yang dapat menghapus kata kunci Kamus.', 'error');
    return;
  }

  const cleanKw = String(keyword).toUpperCase().trim();

  const res = await Swal.fire({
    title: 'Hapus Kata Kunci Alamat?',
    html: `Kata kunci <strong style="color: #e11d48;">"${cleanKw}"</strong> akan dihapus dari Cloud Database D1 & Local Storage.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal'
  });

  if (!res.isConfirmed) return;

  Swal.fire({
    title: 'Menghapus Data...',
    text: `Menghapus kata kunci "${cleanKw}" dari Cloud D1 & Local Storage...`,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => { Swal.showLoading(); }
  });

  addToDeletedBlacklist(cleanKw);

  const current = getLearnedKampungMap();
  const filtered = current.filter(item => {
    if (Array.isArray(item.keywords)) {
      return !item.keywords.some(k => String(k).toUpperCase().trim() === cleanKw);
    }
    return String(item.keywords).toUpperCase().trim() !== cleanKw;
  });
  localStorage.setItem('ckg_learned_kampung_map', JSON.stringify(filtered));

  try {
    await fetch(`/api/kamus?keyword=${encodeURIComponent(cleanKw)}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Single kamus delete error:', err);
  }

  refreshAdminKamusStats();
  renderKamusAlamatTable();
  if (typeof renderMapMarkers === 'function') renderMapMarkers();

  Swal.fire({
    icon: 'success',
    title: 'Berhasil Dihapus',
    text: `Kata kunci "${cleanKw}" telah berhasil dihapus dari Cloud D1 & Local Storage.`,
    timer: 1800,
    showConfirmButton: false
  });
}

async function scanExistingRecordsForAddressDictionary() {
  const activeRole = (sessionStorage.getItem('ckg_user_role') || currentRole || '').toLowerCase();
  if (activeRole !== 'admin') {
    Swal.fire('Akses Ditolak', 'Hanya Admin yang dapat mengelola Kamus Alamat.', 'error');
    return;
  }

  Swal.fire({
    title: 'Kelola Kamus Alamat Varian',
    html: `
      <div style="text-align: left; font-size: 13px; color: #475569; line-height: 1.6;">
        <p style="margin-bottom: 10px;">
          Manajemen Kamus Alamat sekarang dipusatkan secara resmi melalui <strong>File Excel</strong> untuk menjamin akurasi dan keselarasan database Cloud D1.
        </p>
        <p style="margin-bottom: 10px; color: #0f172a; font-weight: 700;">
          📥 Cara Menambahkan Data Kamus Alamat:
        </p>
        <ol style="padding-left: 20px; color: #0369a1; font-weight: 600;">
          <li>Klik <strong>"Download Template Excel"</strong> di menu Admin.</li>
          <li>Isi nama kampung, kelurahan, kecamatan, kabupaten, dan provinsi.</li>
          <li>Unggah file melalui tombol <strong>"Import Kamus Alamat (Excel)"</strong>. Data akan langsung tersimpan di Cloud D1 Database.</li>
        </ol>
      </div>
    `,
    icon: 'info',
    confirmButtonText: 'Mengerti',
    confirmButtonColor: '#0284c7'
  });
}

const BANJARAN_KAMPUNG_MAP = [
  { keywords: ['PAJAGALAN', 'PEJAGALAN', 'JAGALAN', 'BANJARAN KULON', 'BANJARAN KOTA', 'ALUN-ALUN BANJARAN', 'PASAR BANJARAN', 'STASIUN', 'BARULAKSANA', 'KAUM', 'BUNTRIS', 'PANGKAT'], kel: 'Banjaran Kulon', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  { keywords: ['KAMASAN', 'SEKECANDANG', 'SITUANGANG', 'BANTARPANJANG', 'CIGENTUR', 'SANGKAN', 'LEBAKSARI'], kel: 'Kamasan', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  { keywords: ['CIAPUS', 'CITARIM', 'CIPEUNEUY', 'CIPEUNDEUY', 'CIPEUNDEY', 'LEUWIWUNGGU', 'PALASARI', 'PASIRPANJANG'], kel: 'Ciapus', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  { keywords: ['TARAJUSARI', 'TARAJU', 'SAMPORA', 'WARUNGLEBAK', 'SUKAMUKTI', 'BABAKAN TARAJU'], kel: 'Tarajusari', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  { keywords: ['PASIRHUNI', 'PASIR HUNI', 'CIKUPA', 'SUKASARI', 'CIBEROD', 'LEBAKMUDA'], kel: 'Pasirhuni', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  { keywords: ['SINDANGPANON', 'SINDANG PANON', 'SUKAGALIH', 'CIGANITRI', 'SINDANG'], kel: 'Sindangpanon', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  { keywords: ['MARGAHURUN', 'MARGA HURUN', 'CILUNCAT', 'CIMANGGU'], kel: 'Margahurun', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  { keywords: ['KIANGROKE', 'KIANG ROKE', 'CITEUREUP', 'NAGRAK', 'BABAKAN KIANGROKE', 'BOJONG', 'PAMOYANAN'], kel: 'Kiangroke', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  { keywords: ['CIMAUNG', 'PUNTANG', 'CAMPAKA', 'WARUNGBANTENG', 'CIPALASARI', 'SUKAMAJU'], kel: 'Cimaung', kec: 'Cimaung', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  { keywords: ['CANGKUANG', 'BANDASARI', 'JATISARI', 'PANANJUNG'], kel: 'Cangkuang', kec: 'Cangkuang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  { keywords: ['ARJASARI', 'PINGGIRSARI', 'PATROL', 'BARTIM'], kel: 'Arjasari', kec: 'Arjasari', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  { keywords: ['PAMEUNGPEUK', 'LANGONSARI', 'WAAS'], kel: 'Pameungpeuk', kec: 'Pameungpeuk', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' }
];

let addressAutoDetectTimeout = null;

async function autoDetectRegionalFromAddressText(addressText) {
  if (!addressText || typeof addressText !== 'string') return;
  const rawText = addressText.trim();
  if (rawText.length < 3) return;

  const textUpper = rawText.toUpperCase();
  const provSelect = document.getElementById('provinsi');
  const kabSelect = document.getElementById('kab_kota');
  const kecSelect = document.getElementById('kecamatan');
  const kelSelect = document.getElementById('kelurahan');

  if (!provSelect || !kabSelect || !kecSelect || !kelSelect) return;

  const waitForOptions = async (selectEl, maxWaitMs = 1500) => {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (selectEl && selectEl.options && selectEl.options.length > 1) {
        const valid = Array.from(selectEl.options).filter(o => o.value);
        if (valid.length > 0) return true;
      }
      await new Promise(r => setTimeout(r, 50));
    }
    return false;
  };

  const triggerChange = async (el, targetChildSelect = null) => {
    el.dispatchEvent(new Event('change'));
    if (targetChildSelect) {
      await waitForOptions(targetChildSelect);
    } else {
      await new Promise(r => setTimeout(r, 120));
    }
  };

  const selectMatchingOption = (selectEl, targetVal, fuzzy = true) => {
    if (!targetVal || !selectEl) return null;
    const targetClean = targetVal.toLowerCase().replace(/^(kab\.|kota|kabupaten|kecamatan|kelurahan|desa)\s*/i, '').trim();
    const options = Array.from(selectEl.options).filter(o => o.value);

    // Direct exact match
    let match = options.find(o => o.value.toLowerCase() === targetVal.toLowerCase());
    if (match) return match;

    // Clean match
    match = options.find(o => {
      const oClean = o.value.toLowerCase().replace(/^(kab\.|kota|kabupaten|kecamatan|kelurahan|desa)\s*/i, '').trim();
      return oClean === targetClean;
    });
    if (match) return match;

    // Fuzzy contains match
    if (fuzzy) {
      match = options.find(o => {
        const oClean = o.value.toLowerCase().replace(/^(kab\.|kota|kabupaten|kecamatan|kelurahan|desa)\s*/i, '').trim();
        return oClean.includes(targetClean) || targetClean.includes(oClean);
      });
    }
    return match;
  };

  // PRIORITY 1: Check Combined Static + Learned Kampung Knowledge Map
  const fullKnowledgeMap = [...BANJARAN_KAMPUNG_MAP, ...getLearnedKampungMap()];
  let localHit = null;
  for (let entry of fullKnowledgeMap) {
    for (let kw of entry.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(textUpper) || textUpper.includes(kw)) {
        localHit = entry;
        break;
      }
    }
    if (localHit) break;
  }

  if (localHit) {
    // 1. Set Province
    const provMatch = selectMatchingOption(provSelect, localHit.prov);
    if (provMatch) {
      if (provSelect.value !== provMatch.value) {
        provSelect.value = provMatch.value;
        await triggerChange(provSelect, kabSelect);
      }
    } else if (provSelect.options.length > 1 && !provSelect.value) {
      provSelect.value = provSelect.options[1].value;
      await triggerChange(provSelect, kabSelect);
    }

    // 2. Set Kab / Kota
    const kabMatch = selectMatchingOption(kabSelect, localHit.kab);
    if (kabMatch) {
      if (kabSelect.value !== kabMatch.value) {
        kabSelect.value = kabMatch.value;
        await triggerChange(kabSelect, kecSelect);
      }
    }

    // 3. Set Kecamatan
    const kecMatch = selectMatchingOption(kecSelect, localHit.kec);
    if (kecMatch) {
      if (kecSelect.value !== kecMatch.value) {
        kecSelect.value = kecMatch.value;
        await triggerChange(kecSelect, kelSelect);
      }
    }

    // Ensure kelurahan options are populated before setting value
    await waitForOptions(kelSelect, 2000);

    // 4. Set Kelurahan
    const kelMatch = selectMatchingOption(kelSelect, localHit.kel);
    if (kelMatch) {
      kelSelect.value = kelMatch.value;
    } else if (localHit.kel) {
      const cleanTargetKel = String(localHit.kel).toLowerCase().replace(/^(kelurahan|desa)\s*/i, '').trim();
      const matchOpt = Array.from(kelSelect.options).find(o => {
        const cleanOpt = o.value.toLowerCase().replace(/^(kelurahan|desa)\s*/i, '').trim();
        return cleanOpt === cleanTargetKel || cleanOpt.includes(cleanTargetKel) || cleanTargetKel.includes(cleanOpt);
      });
      if (matchOpt) kelSelect.value = matchOpt.value;
    }
    return;
  }

  // PRIORITY 2: OpenStreetMap Geocoding Fallback + Auto-Learning
  try {
    const cleanSearch = textUpper.replace(/KP\.|KAMPUNG|JLN?\.|JALAN|RT:?|\d+|RW:?|\d+/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanSearch.length >= 3) {
      const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanSearch + ' Bandung Jawa Barat')}&format=json&addressdetails=1&limit=1`;
      const resp = await fetch(osmUrl);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.length > 0) {
          const addr = data[0].address || {};
          const foundProv = addr.state || 'Jawa Barat';
          const foundKab = addr.city || addr.regency || addr.county || 'Kabupaten Bandung';
          const foundKec = addr.town || addr.district || addr.suburb || 'Banjaran';
          const foundKel = addr.village || addr.quarter || addr.hamlet || addr.neighbourhood || '';

          if (foundKel) {
            // Auto-fill dropdowns from Nominatim lookup without auto-saving to Kamus Peta
            const provMatch = selectMatchingOption(provSelect, foundProv);
            if (provMatch) { provSelect.value = provMatch.value; await triggerChange(provSelect); }

            const kabMatch = selectMatchingOption(kabSelect, foundKab);
            if (kabMatch) { kabSelect.value = kabMatch.value; await triggerChange(kabSelect); }

            const kecMatch = selectMatchingOption(kecSelect, foundKec);
            if (kecMatch) { kecSelect.value = kecMatch.value; await triggerChange(kecMatch); }

            const kelMatch = selectMatchingOption(kelSelect, foundKel);
            if (kelMatch) { kelSelect.value = kelMatch.value; }
            return;
          }
        }
      }
    }
  } catch (err) {
    console.warn('OSM Geocoding fallback skipped:', err);
  }

  // PRIORITY 2: General Auto-Detect if not in local kampung map
  // 1. Detect Province
  let provMatched = false;
  let provOptions = Array.from(provSelect.options).filter(o => o.value);
  for (let o of provOptions) {
    const pValUpper = o.value.toUpperCase();
    if (textUpper.includes(pValUpper)) {
      if (provSelect.value !== o.value) {
        provSelect.value = o.value;
        await triggerChange(provSelect);
      }
      provMatched = true;
      break;
    }
  }

  if (!provMatched) {
    if (textUpper.includes('JAWA BARAT') || textUpper.includes('JABAR')) {
      const match = provOptions.find(o => o.value.toUpperCase().includes('JAWA BARAT'));
      if (match && provSelect.value !== match.value) {
        provSelect.value = match.value;
        await triggerChange(provSelect);
        provMatched = true;
      }
    } else {
      // Default to Jawa Barat if unspecified
      const match = provOptions.find(o => o.value.toUpperCase().includes('JAWA BARAT'));
      if (match && !provSelect.value) {
        provSelect.value = match.value;
        await triggerChange(provSelect);
      }
    }
  }

  // 2. Detect Kab / Kota
  let kabOptions = Array.from(kabSelect.options).filter(o => o.value);
  for (let o of kabOptions) {
    const valUpper = o.value.toUpperCase();
    const cleanName = valUpper.replace(/^KABUPATEN\s+/i, '').replace(/^KOTA\s+/i, '').replace(/^KAB\.\s+/i, '').trim();
    if (textUpper.includes(valUpper) || (cleanName.length >= 4 && textUpper.includes(cleanName))) {
      if (kabSelect.value !== o.value) {
        kabSelect.value = o.value;
        await triggerChange(kabSelect);
      }
      break;
    }
  }

  if (!kabSelect.value) {
    const match = kabOptions.find(o => o.value.toUpperCase().includes('BANDUNG'));
    if (match) {
      kabSelect.value = match.value;
      await triggerChange(kabSelect);
    }
  }

  // 3. Detect Kecamatan
  let kecOptions = Array.from(kecSelect.options).filter(o => o.value);
  for (let o of kecOptions) {
    const valUpper = o.value.toUpperCase().replace(/^KECAMATAN\s+/i, '').replace(/^KEC\.\s+/i, '').trim();
    if (valUpper.length >= 3 && textUpper.includes(valUpper)) {
      if (kecSelect.value !== o.value) {
        kecSelect.value = o.value;
        await triggerChange(kecSelect);
      }
      break;
    }
  }

  if (!kecSelect.value) {
    const match = kecOptions.find(o => o.value.toUpperCase().includes('BANJARAN'));
    if (match) {
      kecSelect.value = match.value;
      await triggerChange(kecSelect);
    }
  }

  // 4. Detect Kelurahan / Desa
  let kelOptions = Array.from(kelSelect.options).filter(o => o.value);
  for (let o of kelOptions) {
    const valUpper = o.value.toUpperCase().replace(/^KELURAHAN\s+/i, '').replace(/^DESA\s+/i, '').replace(/^KEL\.\s+/i, '').trim();
    if (valUpper.length >= 3 && textUpper.includes(valUpper)) {
      if (kelSelect.value !== o.value) {
        kelSelect.value = o.value;
      }
      break;
    }
  }
}

function initAddressAutoDetector() {
  const alamatEl = document.getElementById('alamat');
  if (!alamatEl) return;

  const handleInput = () => {
    if (addressAutoDetectTimeout) clearTimeout(addressAutoDetectTimeout);
    addressAutoDetectTimeout = setTimeout(() => {
      autoDetectRegionalFromAddressText(alamatEl.value);
    }, 300);
  };

  alamatEl.addEventListener('input', handleInput);
  alamatEl.addEventListener('change', handleInput);
  alamatEl.addEventListener('paste', () => {
    setTimeout(handleInput, 50);
  });
}

function getSelectedKategoriSasaran() {
  const checked = document.querySelector('input[name="kategori_sasaran"]:checked');
  return checked ? checked.value : 'dewasa';
}

function updateDataWaliVisibility() {
  const kat = getSelectedKategoriSasaran();
  const section = document.getElementById('sectionDataWali');
  const wrapperBelumNik = document.getElementById('wrapperBelumPunyaNik');
  const belumNikCb = document.getElementById('belum_punya_nik');

  const isWajib = (kat === 'bayi_balita' || kat === 'prasekolah');
  const isLansia = (kat === 'lansia');
  const tanpaWaliCb = document.getElementById('daftarkan_tanpa_wali');

  // Khusus Bayi/Balita dan Prasekolah: tampilkan opsi Belum Punya NIK
  if (wrapperBelumNik) {
    if (isWajib) {
      wrapperBelumNik.style.display = 'block';
    } else {
      wrapperBelumNik.style.display = 'none';
      if (belumNikCb && belumNikCb.checked) {
        belumNikCb.checked = false;
        toggleBelumPunyaNik(false);
      }
    }
  }

  if (!section) return;

  if (isWajib) {
    section.style.display = 'block';
    section.style.borderColor = '#fca5a5';
    section.style.background = '#fffbfb';
    const badge = document.getElementById('badgeWaliWajib');
    if (badge) {
      badge.style.display = 'inline-flex';
      badge.className = 'badge';
      badge.style.background = '#fee2e2';
      badge.style.color = '#dc2626';
      badge.style.borderColor = '#fca5a5';
      badge.innerHTML = '<i class="bi bi-exclamation-circle-fill"></i> Wajib bagi Balita & Prasekolah';
    }

    // Centangan "Daftarkan tanpa data wali" DIHILANGKAN untuk Bayi, Balita & Prasekolah
    const wrapperTanpaWali = document.getElementById('wrapperTanpaWali');
    if (wrapperTanpaWali) {
      wrapperTanpaWali.style.display = 'none';
    }
    if (tanpaWaliCb) {
      tanpaWaliCb.checked = false;
      toggleTanpaWaliInputs(false);
    }

    ['reqNikWali', 'reqNamaWali', 'reqDobWali', 'reqJkWali', 'reqWaWali'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'inline';
    });
  } else if (isLansia) {
    section.style.display = 'block';
    section.style.borderColor = '#fde047';
    section.style.background = '#fefce8';
    const badge = document.getElementById('badgeWaliWajib');
    if (badge) {
      badge.style.display = 'inline-flex';
      badge.className = 'badge';
      badge.style.background = '#fef3c7';
      badge.style.color = '#b45309';
      badge.style.borderColor = '#fde047';
      badge.innerHTML = '<i class="bi bi-info-circle"></i> Dianjurkan (Opsional)';
    }

    // Tampilkan untuk Lansia
    const wrapperTanpaWali = document.getElementById('wrapperTanpaWali');
    if (wrapperTanpaWali) {
      wrapperTanpaWali.style.display = 'flex';
    }

    const isTanpa = tanpaWaliCb?.checked || false;
    ['reqNikWali', 'reqNamaWali', 'reqDobWali', 'reqJkWali', 'reqWaWali'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  } else {
    // Hidden for Dewasa & Sekolah / Remaja
    section.style.display = 'none';
  }
}

function toggleBelumPunyaNik(isChecked) {
  const nikInput = document.getElementById('nik');
  const nikHelpText = document.getElementById('nikHelpText');
  const nikBadge = document.getElementById('nikCounterBadge');
  const btnCekNik = document.getElementById('btnCekNikPasien') || document.getElementById('btnCekNikDukcapil');
  const tanpaWaliCb = document.getElementById('daftarkan_tanpa_wali');

  if (isChecked) {
    if (nikInput) {
      nikInput.value = '';
      nikInput.disabled = true;
      nikInput.removeAttribute('required');
      nikInput.placeholder = 'Belum punya NIK (Terdaftar via NIK Wali)';
      nikInput.style.backgroundColor = '#f8fafc';
    }
    if (btnCekNik) btnCekNik.disabled = true;
    if (nikHelpText) {
      nikHelpText.style.color = '#b45309';
      nikHelpText.innerHTML = '<i class="bi bi-info-circle-fill"></i> Pasien balita belum memiliki NIK. Pengisian Data Wali wajib dilengkapi.';
    }
    if (nikBadge) {
      nikBadge.style.background = '#fef3c7';
      nikBadge.style.color = '#b45309';
      nikBadge.style.borderColor = '#fde68a';
      const countEl = document.getElementById('nikCharCount');
      if (countEl) countEl.textContent = '-';
    }
    if (tanpaWaliCb) {
      tanpaWaliCb.checked = false;
      tanpaWaliCb.disabled = true;
      toggleTanpaWaliInputs(false);
    }
    // Karena bayi belum punya NIK, buka kolom identitas pasien agar bisa diisi manual
    setDemographicLock('pasien', false);
    // Kolom wali tetap terkunci sampai klik "Cek NIK" Wali
    if (!currentEditingId) {
      setDemographicLock('wali', true);
    }
  } else {
    if (nikInput) {
      nikInput.disabled = false;
      nikInput.setAttribute('required', 'required');
      nikInput.placeholder = 'Masukkan 16 Digit NIK';
      nikInput.style.backgroundColor = '#ffffff';
    }
    if (btnCekNik) btnCekNik.disabled = false;
    if (tanpaWaliCb) {
      tanpaWaliCb.disabled = false;
    }
    if (nikHelpText) {
      nikHelpText.style.color = '#dc2626';
      nikHelpText.innerHTML = '<i class="bi bi-exclamation-circle-fill"></i> NIK wajib tepat 16 digit angka';
    }
    if (nikBadge) {
      nikBadge.style.background = '#fef2f2';
      nikBadge.style.color = '#dc2626';
      nikBadge.style.borderColor = '#fecaca';
      const countEl = document.getElementById('nikCharCount');
      if (countEl) countEl.textContent = (nikInput?.value || '').length;
    }
    // Jika tidak punya NIK tidak dicentang, kunci kembali kolom pasien sampai klik "Cek NIK"
    if (!currentEditingId) {
      setDemographicLock('pasien', true);
    }
  }
}

function toggleTanpaWaliInputs(checked) {
  const fields = ['nik_wali', 'nama_wali', 'tanggal_lahir_wali', 'jenis_kelamin_wali', 'no_whatsapp_wali', 'wali_nomor_sama'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = checked;
    if (checked) {
      if (el.type === 'checkbox') el.checked = false;
      else el.value = '';
      el.style.backgroundColor = '#f1f5f9';
      el.style.cursor = 'not-allowed';
    } else {
      el.style.backgroundColor = '#ffffff';
      el.style.cursor = '';
    }
  });
  const counter = document.getElementById('nikWaliCounter');
  if (counter && checked) {
    counter.textContent = '0';
    counter.style.color = '#64748b';
  }

  const kat = typeof getSelectedKategoriSasaran === 'function' ? getSelectedKategoriSasaran() : '';
  const isWajib = (kat === 'bayi_balita' || kat === 'prasekolah');
  ['reqNikWali', 'reqNamaWali', 'reqDobWali', 'reqJkWali', 'reqWaWali'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (isWajib && !checked) ? 'inline' : 'none';
  });
}

function getKategoriLabel(key) {
  switch (key) {
    case 'bayi_balita': return 'Bayi & Balita (0 - 59 Bulan / 0 - 5 Th)';
    case 'prasekolah': return 'Anak Prasekolah (60 - 72 Bulan / 5 - 6 Th)';
    case 'sekolah_remaja': return 'Sekolah & Remaja (6 - 18 Tahun)';
    case 'dewasa': return 'Dewasa (18 - 59 Tahun)';
    case 'lansia': return 'Lanjut Usia (Lansia) (>= 60 Tahun)';
    default: return key || 'Umum';
  }
}

function determineKategoriSasaran(dob, age) {
  let finalAge = parseInt(age);
  let months = null;

  if (dob) {
    const dobIso = (typeof formatDateToYYYYMMDD === 'function') ? formatDateToYYYYMMDD(dob) : dob;
    if (dobIso) {
      const d = new Date(dobIso);
      if (!isNaN(d.getTime())) {
        const now = new Date();
        let y = now.getFullYear() - d.getFullYear();
        let m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
        finalAge = y >= 0 ? y : 0;

        months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (now.getDate() < d.getDate()) months--;
        if (months < 0) months = 0;
      }
    }
  }

  if (isNaN(finalAge)) finalAge = 0;

  let key = 'dewasa';
  let label = 'Dewasa (18 - 59 Tahun)';
  let shortLabel = 'Dewasa';
  let radioId = 'kat_dewasa';

  if (months !== null) {
    if (months <= 59) {
      key = 'bayi_balita';
      label = 'Bayi & Balita (0 - 59 Bulan / 0 - 5 Th)';
      shortLabel = 'Bayi & Balita';
      radioId = 'kat_bayi_balita';
    } else if (months <= 72 || finalAge <= 6) {
      key = 'prasekolah';
      label = 'Anak Prasekolah (60 - 72 Bulan / 5 - 6 Th)';
      shortLabel = 'Anak Prasekolah';
      radioId = 'kat_prasekolah';
    } else if (finalAge < 18) {
      key = 'sekolah_remaja';
      label = 'Sekolah & Remaja (6 - 18 Tahun)';
      shortLabel = 'Sekolah & Remaja';
      radioId = 'kat_sekolah_remaja';
    } else if (finalAge >= 60) {
      key = 'lansia';
      label = 'Lanjut Usia (Lansia) (>= 60 Tahun)';
      shortLabel = 'Lansia';
      radioId = 'kat_lansia';
    } else {
      key = 'dewasa';
      label = 'Dewasa (18 - 59 Tahun)';
      shortLabel = 'Dewasa';
      radioId = 'kat_dewasa';
    }
  } else {
    if (finalAge < 5) {
      key = 'bayi_balita';
      label = 'Bayi & Balita (0 - 5 Tahun)';
      shortLabel = 'Bayi & Balita';
      radioId = 'kat_bayi_balita';
    } else if (finalAge >= 5 && finalAge <= 6) {
      key = 'prasekolah';
      label = 'Anak Prasekolah (5 - 6 Tahun)';
      shortLabel = 'Anak Prasekolah';
      radioId = 'kat_prasekolah';
    } else if (finalAge >= 7 && finalAge < 18) {
      key = 'sekolah_remaja';
      label = 'Sekolah & Remaja (6 - 18 Tahun)';
      shortLabel = 'Sekolah & Remaja';
      radioId = 'kat_sekolah_remaja';
    } else if (finalAge >= 60) {
      key = 'lansia';
      label = 'Lanjut Usia (Lansia) (>= 60 Tahun)';
      shortLabel = 'Lansia';
      radioId = 'kat_lansia';
    } else {
      key = 'dewasa';
      label = 'Dewasa (18 - 59 Tahun)';
      shortLabel = 'Dewasa';
      radioId = 'kat_dewasa';
    }
  }

  return { key, label, shortLabel, radioId, age: finalAge, months };
}

function checkDobKategoriCompatibility(isManual = false) {
  if (currentInputTarget === 'ckg-gratis') {
    const alertFooter = document.getElementById('alertKategoriMismatch');
    if (alertFooter) alertFooter.style.display = 'none';
    const dobWarning = document.getElementById('dobKategoriWarning');
    if (dobWarning) dobWarning.style.display = 'none';
    return true;
  }

  const dobVal = document.getElementById('tanggal_lahir')?.value;
  const alertFooter = document.getElementById('alertKategoriMismatch');
  const textFooter = document.getElementById('textKategoriMismatch');
  const btnAutoSwitch = document.getElementById('btnAutoSwitchKategori');
  const dobWarning = document.getElementById('dobKategoriWarning');
  const dobWarningText = document.getElementById('dobKategoriWarningText');
  const btnNext = document.getElementById('btnWizardNext');

  if (!dobVal) {
    if (alertFooter) alertFooter.style.display = 'none';
    if (dobWarning) dobWarning.style.display = 'none';
    if (btnNext) {
      btnNext.disabled = false;
      btnNext.style.opacity = '1';
      btnNext.style.cursor = 'pointer';
      btnNext.removeAttribute('title');
    }
    return true;
  }

  const ageInput = document.getElementById('usia');
  const currentAge = parseInt(ageInput?.value) || 0;
  const correct = determineKategoriSasaran(dobVal, currentAge);
  const currentKey = getSelectedKategoriSasaran();

  if (currentKey !== correct.key) {
    // Kategori TIDAK SESUAI dengan umur
    const currentLabel = getKategoriLabel(currentKey);
    const ageDesc = (correct.months !== null && correct.months < 72)
      ? `${correct.months} Bulan (${correct.age} Thn)`
      : `${correct.age} Tahun`;

    const warningMsg = `Usia (${ageDesc}) tidak sesuai dengan kategori yang dipilih di awal (${currentLabel})!`;

    if (dobWarning && dobWarningText) {
      dobWarning.style.display = 'block';
      dobWarningText.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${warningMsg} Harap beralih ke kategori <strong>${correct.label}</strong>.`;
    }

    if (alertFooter && textFooter) {
      alertFooter.style.display = 'inline-flex';
      textFooter.innerHTML = `<span style="color:#b91c1c;">${warningMsg}</span> Harap beralih ke <strong>${correct.shortLabel}</strong>`;
    }

    if (btnAutoSwitch) {
      btnAutoSwitch.setAttribute('data-target-radio', correct.radioId);
      btnAutoSwitch.innerHTML = `<i class="bi bi-arrow-repeat"></i> Beralih ke ${correct.shortLabel}`;
    }

    // KUNCI TOMBOL SELANJUTNYA
    if (btnNext) {
      btnNext.disabled = true;
      btnNext.style.opacity = '0.45';
      btnNext.style.cursor = 'not-allowed';
      btnNext.title = `Tombol Selanjutnya terkunci! Usia (${ageDesc}) tidak sesuai kategori "${currentLabel}". Silakan beralih ke kategori "${correct.label}".`;
    }

    if (isManual) {
      showToast(`Peringatan: Usia (${ageDesc}) tidak sesuai kategori ${currentLabel}! Tombol Selanjutnya terkunci sampai kategori disesuaikan.`, 'warning');
    }

    return false;
  } else {
    // Sesuai / Compatible
    if (alertFooter) alertFooter.style.display = 'none';
    if (dobWarning) dobWarning.style.display = 'none';
    if (btnNext) {
      btnNext.disabled = false;
      btnNext.style.opacity = '1';
      btnNext.style.cursor = 'pointer';
      btnNext.removeAttribute('title');
    }
    return true;
  }
}

function switchKategoriToCorrect() {
  const btnAutoSwitch = document.getElementById('btnAutoSwitchKategori');
  let targetRadioId = btnAutoSwitch?.getAttribute('data-target-radio');

  if (!targetRadioId) {
    const dobVal = document.getElementById('tanggal_lahir')?.value;
    if (dobVal) {
      const correct = determineKategoriSasaran(dobVal);
      targetRadioId = correct.radioId;
    }
  }

  if (targetRadioId) {
    const radio = document.getElementById(targetRadioId);
    if (radio) {
      radio.checked = true;
      updateDataWaliVisibility();
      checkDobKategoriCompatibility(false);
      showToast('Kategori sasaran berhasil disesuaikan! Tombol Selanjutnya telah aktif.', 'success');
    }
  }
}

function calculateAgeFromDOB(isFromCekNik = false) {
  const dobVal = document.getElementById('tanggal_lahir').value;
  const ageInput = document.getElementById('usia');
  if (!dobVal || !ageInput) return;

  const dob = new Date(dobVal);
  if (isNaN(dob.getTime())) return;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years--;

  const finalAge = years >= 0 ? years : 0;
  ageInput.value = finalAge;

  const correct = determineKategoriSasaran(dobVal, finalAge);
  const currentKey = getSelectedKategoriSasaran();

  if (currentInputTarget === 'ckg-gratis') {
    // Mode Simpel CKG Gratis: Otomatis sinkronkan pill kategori tanpa perlu popup error
    if (correct.radioId) {
      const radio = document.getElementById(correct.radioId);
      if (radio && !radio.checked) {
        radio.checked = true;
        updateDataWaliVisibility();
      }
    }
    const alertFooter = document.getElementById('alertKategoriMismatch');
    if (alertFooter) alertFooter.style.display = 'none';
    const dobWarning = document.getElementById('dobKategoriWarning');
    if (dobWarning) dobWarning.style.display = 'none';
    return;
  }

  if (isFromCekNik) {
    // Skenario 1: Cek NIK -> langsung otomatis pindah ke kategori umur yang sesuai
    if (currentKey !== correct.key) {
      const radio = document.getElementById(correct.radioId);
      if (radio) {
        radio.checked = true;
      }
      updateDataWaliVisibility();
      checkDobKategoriCompatibility(false);
      showToast(`Kategori usia otomatis disesuaikan menjadi: ${correct.label} (${correct.age} Thn)`, 'info');
    } else {
      checkDobKategoriCompatibility(false);
    }
  } else {
    // Skenario 2: Isi Manual -> jangan ganti radio diam-diam, lakukan validasi & kunci tombol jika mismatch
    checkDobKategoriCompatibility(true);
  }
}

// Window Bindings untuk Pilihan Manual & Custom Storage Wilayah
if (typeof window !== 'undefined') {
  window.triggerManualWilayahInput = triggerManualWilayahInput;
  window.getCustomWilayahStorage = getCustomWilayahStorage;
  window.saveCustomWilayahStorage = saveCustomWilayahStorage;
  window.getCustomProvinsiList = getCustomProvinsiList;
  window.addCustomProvinsi = addCustomProvinsi;
  window.getCustomKabKotaList = getCustomKabKotaList;
  window.addCustomKabKota = addCustomKabKota;
  window.getCustomKecamatanList = getCustomKecamatanList;
  window.addCustomKecamatan = addCustomKecamatan;
  window.getCustomKelurahanList = getCustomKelurahanList;
  window.addCustomKelurahan = addCustomKelurahan;
}
