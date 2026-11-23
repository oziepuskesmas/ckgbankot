/**
 * APLIKASI INFO CKG - PUSKESMAS BANJARAN KOTA
 * Module: CKG Anak Sekolah (Skrining Kesehatan, Pemeriksaan 5 Pos, Master Sarana, TTD Rematri, Naik Kelas & Mutasi)
 */

// ==========================================================================
// 🎓 MODUL TERPISAH: CKG SEKOLAH (ISOLATED CLOUD D1 DATABASE)
// ==========================================================================

// Utility: Escape HTML special characters to prevent XSS
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let sekolahRecords = [];
let pendingSekolahImportData = null;
let pendingSekolahImportSkipDuplicates = true;
let pendingSekolahImportNewOnly = [];

// Utility: Cek apakah NIK valid dan terisi untuk pengecekan duplikat.
// NIK kosong, strip '-', '0', atau panjang < 6 karakter TIDAK dianggap duplikat.
function isNikValidForDuplicate(nik) {
  if (nik === null || nik === undefined) return false;
  const s = String(nik).trim();
  if (s === '' || s === '-' || s === '0' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined' || s.length < 6) {
    return false;
  }
  return true;
}

function setImportDupMode(skip) {
  pendingSekolahImportSkipDuplicates = skip;
  const btnSkip = document.getElementById('btnImportSkipDup');
  const btnAll = document.getElementById('btnImportAllDup');
  if (btnSkip && btnAll) {
    if (skip) {
      btnSkip.style.boxShadow = '0 0 0 3px rgba(5, 150, 105, 0.4)';
      btnSkip.style.transform = 'scale(1.02)';
      btnAll.style.boxShadow = 'none';
      btnAll.style.transform = 'scale(1)';
    } else {
      btnAll.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.4)';
      btnAll.style.transform = 'scale(1.02)';
      btnSkip.style.boxShadow = 'none';
      btnSkip.style.transform = 'scale(1)';
    }
  }
}

async function loadStoredSekolahRecords() {
  if (typeof CkgIdb !== 'undefined') {
    try {
      const cached = await CkgIdb.get('sekolah_records');
      if (Array.isArray(cached) && cached.length > 0 && sekolahRecords.length === 0) {
        sekolahRecords = cached;
        populateSekolahFilterDropdowns();
        renderSekolahView();
      }
    } catch (_) { }
  }
  fetchSekolahRecordsFromCloud(false);
}

async function fetchSekolahRecordsFromCloud(showFeedback = false) {
  const tableBody = document.getElementById('tableBodySekolah');
  if (showFeedback && tableBody && sekolahRecords.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #4f46e5;">
          <div class="spinner-border text-primary" role="status" style="width: 2rem; height: 2rem; border-width: 3px; display: inline-block;"></div>
          <div style="font-weight: 800; font-size: 13.5px; margin-top: 12px; color: #4338ca;">
            <i class="bi bi-cloud-arrow-down-fill"></i> Memuat data langsung dari Cloud Database...
          </div>
        </td>
      </tr>
    `;
  }

  try {
    fetchMasterSekolahFromCloud();
    const res = await fetch('/api/sekolah');
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        sekolahRecords = result.data.map((r, idx) => {
          const bbNum = r.bb !== undefined ? Number(r.bb) : 0;
          const tbNum = r.tb !== undefined ? Number(r.tb) : 0;
          const sistolNum = r.td_sistolik !== undefined ? Number(r.td_sistolik) : 0;

          const antroDoneVal = r.antro_done !== undefined ? Number(r.antro_done) : ((bbNum > 0 && tbNum > 0) ? 1 : 0);
          const vitalDoneVal = r.vital_done !== undefined ? Number(r.vital_done) : (sistolNum > 0 ? 1 : 0);
          const labDoneVal = r.lab_done !== undefined ? Number(r.lab_done) : (((r.hb && r.hb !== '-' && String(r.hb).trim() !== '') || (r.gula_darah && r.gula_darah !== '-' && String(r.gula_darah).trim() !== '')) ? 1 : 0);
          const organDoneVal = r.organ_done !== undefined ? Number(r.organ_done) : 0;
          const kesimpulanDoneVal = r.kesimpulan_done !== undefined ? Number(r.kesimpulan_done) : ((r.catatan_rujukan && r.catatan_rujukan !== '-' && String(r.catatan_rujukan).trim() !== '') ? 1 : 0);

          // PENTING: Identitas TIDAK terhitung sebagai pemeriksaan!
          // is_examined hanya true jika minimal satu stasiun pemeriksaan medis (antro, vital, lab, organ, kesimpulan) telah dilakukan
          const isExamined = !!(antroDoneVal || vitalDoneVal || labDoneVal || organDoneVal || kesimpulanDoneVal);

          let imtVal = r.imt !== undefined ? Number(r.imt) : 0;
          let statusImt = r.status_imt || 'Normal';
          if (bbNum > 0 && tbNum > 0 && imtVal === 0) {
            const tbM = tbNum / 100;
            imtVal = Number((bbNum / (tbM * tbM)).toFixed(2));
            if (imtVal < 17.0) statusImt = 'Sangat Kurus';
            else if (imtVal < 18.5) statusImt = 'Kurus';
            else if (imtVal <= 25.0) statusImt = 'Normal';
            else if (imtVal <= 27.0) statusImt = 'Gemuk';
            else statusImt = 'Obesitas';
          }

          return {
            id: r.id ? String(r.id) : `SCH-${Date.now()}-${idx}`,
            no: r.no || idx + 1,
            nama: (r.nama || r.nama_siswa || '').trim().toUpperCase(),
            kelas: (r.kelas || '').trim().toUpperCase(),
            sekolah: (r.sekolah || r.nama_sekolah || '').trim().toUpperCase(),
            jk: r.jk || r.jenis_kelamin || 'L',
            nik: r.nik || r.nisn_nik || '',
            tanggal_lahir: r.tanggal_lahir || '',
            no_whatsapp: r.no_whatsapp || '',
            provinsi: r.provinsi || 'Jawa Barat',
            kab_kota: r.kab_kota || 'Kab. Bandung',
            kecamatan: r.kecamatan || 'Banjaran',
            kelurahan: r.kelurahan || 'Tarajusari',
            alamat: r.alamat || '',
            bb: bbNum,
            tb: tbNum,
            lp: r.lp !== undefined ? Number(r.lp) : 0,
            imt: imtVal,
            status_imt: statusImt,
            td_sistolik: sistolNum,
            td_diastolik: r.td_diastolik !== undefined ? Number(r.td_diastolik) : 0,
            gula_darah: r.gula_darah || '-',
            hb: r.hb || '-',
            telinga: r.telinga || 'Tidak ada serumen',
            gigi: r.gigi || r.karies || 'Tidak ada',
            mata: r.mata || r.kacamata || 'Normal',
            kebugaran: r.kebugaran || 'Baik',
            menstruasi: r.menstruasi || 'Belum',
            kuku: r.kuku || 'Pendek Bersih',
            merokok: r.merokok || 'Tidak',
            jenis_rokok: r.jenis_rokok || '-',
            intensitas_merokok: r.intensitas_merokok || '-',
            jumlah_batang: r.jumlah_batang || '-',
            tahun_skrining: r.tahun_skrining || (r.tanggal_entry ? r.tanggal_entry.substring(0, 4) : '2026'),
            status_kesehatan: r.status_kesehatan || 'Sehat',
            catatan_rujukan: r.catatan_rujukan || '-',
            is_examined: isExamined,
            petugas_entry: r.petugas_entry || 'Admin',
            tanggal_entry: r.tanggal_entry || new Date().toISOString().substring(0, 10),
            antro_done: antroDoneVal,
            vital_done: vitalDoneVal,
            lab_done: labDoneVal,
            organ_done: organDoneVal,
            kesimpulan_done: kesimpulanDoneVal,
            identitas_done: r.identitas_done !== undefined ? Number(r.identitas_done) : 1,
            riwayat_pemeriksaan: Array.isArray(r.riwayat_pemeriksaan) ? r.riwayat_pemeriksaan : (typeof r.riwayat_pemeriksaan === 'string' ? JSON.parse(r.riwayat_pemeriksaan || '[]') : [])
          };
        });
        if (typeof CkgIdb !== 'undefined') {
          CkgIdb.set('sekolah_records', sekolahRecords);
        }
        populateSekolahFilterDropdowns();
        renderSekolahView();

        if (showFeedback) {
          showToast(`Berhasil memuat ${sekolahRecords.length} data siswa dari Cloud Database.`, 'success');
        }
      }
    }
  } catch (err) {
    console.warn('⚡ Fetch /api/sekolah notice (Offline/Fallback):', err);
    if (typeof CkgIdb !== 'undefined' && sekolahRecords.length === 0) {
      try {
        const cached = await CkgIdb.get('sekolah_records');
        if (Array.isArray(cached) && cached.length > 0) {
          sekolahRecords = cached;
        }
      } catch (_) { }
    }
    populateSekolahFilterDropdowns();
    renderSekolahView();
    if (showFeedback) {
      showToast('Gagal memuat data dari Cloud Database.', 'warning');
    }
  }
}

// Multi-user live synchronization: Refresh CKG Sekolah data periodically
if (!window._ckgSekolahSyncInterval) {
  window._ckgSekolahSyncInterval = setInterval(() => {
    if (document.hidden) return;
    const viewSekolah = document.getElementById('view-ckg-sekolah');
    const modal = document.getElementById('modalPemeriksaanSiswa');
    if (viewSekolah && viewSekolah.classList.contains('active') && (!modal || modal.style.display !== 'flex')) {
      fetchSekolahRecordsFromCloud(false);
    }
  }, 25000);
}

async function syncSekolahRecordsToCloud(dataList) {
  if (!Array.isArray(dataList)) return;
  try {
    await fetch('/api/sekolah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataList)
    });
  } catch (err) {
    console.warn('⚡ Sync /api/sekolah notice:', err);
  }
}

function saveSekolahRecordsToStorage() {
  if (typeof CkgIdb !== 'undefined') {
    CkgIdb.set('sekolah_records', sekolahRecords);
  }
  syncSekolahRecordsToCloud(sekolahRecords);
}

// ==========================================================================
// 🏫 MASTER SARANA SEKOLAH PUSKESMAS BANJARAN KOTA (Daftar_Sekolah.md)
// ==========================================================================
const DEFAULT_MASTER_SARANA_SEKOLAH = [
  // --- 1. SD / MI (Kelas 1 - 6) ---
  { nama: 'MI CHOIRUL HUDA', level: 'SD' },
  { nama: 'MI PERSIS 119 CIHAMERANG', level: 'SD' },
  { nama: 'MIS DARUSSALAM', level: 'SD' },
  { nama: 'MIS M. THREE', level: 'SD' },
  { nama: 'MIS MIFTAHUS SAADAH', level: 'SD' },
  { nama: 'MIS PERSIS 278 PANGKALAN', level: 'SD' },
  { nama: 'SDIT ZAKIA', level: 'SD' },
  { nama: 'SDN ARIASACANAGARA', level: 'SD' },
  { nama: 'SDN BANJARAN 01', level: 'SD' },
  { nama: 'SDN BANJARAN 02', level: 'SD' },
  { nama: 'SDN CIHAMERANG', level: 'SD' },
  { nama: 'SDN CIPEUNDEUY', level: 'SD' },
  { nama: 'SDN KIARAPAYUNG 01', level: 'SD' },
  { nama: 'SDN KIARAPAYUNG 02', level: 'SD' },
  { nama: 'SDN MEKARJAYA', level: 'SD' },
  { nama: 'SDN PANGAUBAN', level: 'SD' },
  { nama: 'SDN PASIRWARU', level: 'SD' },
  { nama: 'SDN PONDOKSIRAP', level: 'SD' },
  { nama: 'SDN SIRAH RANCA 01', level: 'SD' },
  { nama: 'SDN SIRAH RANCA 02', level: 'SD' },
  { nama: 'SDN TARAJUSARI', level: 'SD' },

  // --- 2. SMP / MTs (Kelas 7 - 9) ---
  { nama: 'MTS DARUL HIKMAH AL - USMANI', level: 'SMP' },
  { nama: 'MTS PERSIS 282 CILEUTIK', level: 'SMP' },
  { nama: 'MTSS PERSIS BANJARAN', level: 'SMP' },
  { nama: 'MTSS MIFTAHUL HUDA KIARAPAYUNG', level: 'SMP' },
  { nama: 'MIFTAHUL HUDA KIARAPAYUNG', level: 'SMP' },
  { nama: 'SMP PASUNDAN 1 BANJARAN', level: 'SMP' },
  { nama: 'SMP PGRI BANJARAN', level: 'SMP' },
  { nama: 'SMP PGRI CIBARIBIS BANJARAN', level: 'SMP' },
  { nama: 'SMP TERPADU AL FALAH', level: 'SMP' },
  { nama: 'SMPN 1 BANJARAN', level: 'SMP' },
  { nama: 'SMPN 3 BANJARAN', level: 'SMP' },

  // --- 3. SMA / SMK / MA (Kelas 10 - 12) ---
  { nama: 'MAS PERSIS 31 BANJARAN', level: 'SMA' },
  { nama: 'SMA PASUNDAN BANJARAN', level: 'SMA' },
  { nama: 'SMAN 1 BANJARAN', level: 'SMA' },
  { nama: 'SMK KHARISMA NUSANTARA', level: 'SMA' },
  { nama: 'SMK PASUNDAN 1 BANJARAN', level: 'SMA' },
  { nama: 'SMK PASUNDAN 2 BANJARAN', level: 'SMA' },
  { nama: 'SMK PGRI CIBARIBIS', level: 'SMA' },
  { nama: 'SMK PLUS PRATAMA ADI', level: 'SMA' }
];

function loadMasterSekolahFromStorage() {
  try {
    const raw = localStorage.getItem('ckg_master_sekolah');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(s => ({
          nama: (s.nama || '').trim().toUpperCase(),
          level: (s.level || 'SD').trim().toUpperCase(),
          has_password: Boolean(s.has_password || (s.password && s.password.trim() !== '')),
          password: s.password || '',
          allowed_menus: s.allowed_menus || '',
          is_active: s.is_active !== undefined ? s.is_active : (s.has_password || s.password ? 1 : 0)
        }));
      }
    }
  } catch (e) {
    console.warn('Error reading ckg_master_sekolah:', e);
  }
  return DEFAULT_MASTER_SARANA_SEKOLAH.map(s => ({
    ...s,
    password: '',
    allowed_menus: '',
    is_active: 0
  }));
}

let MASTER_SARANA_SEKOLAH = loadMasterSekolahFromStorage();

function saveMasterSekolahToStorage(newList) {
  if (Array.isArray(newList)) {
    MASTER_SARANA_SEKOLAH = newList;
  }
  try {
    localStorage.setItem('ckg_master_sekolah', JSON.stringify(MASTER_SARANA_SEKOLAH));
  } catch (e) {
    console.warn('Error saving ckg_master_sekolah:', e);
  }
  if (typeof CkgIdb !== 'undefined') {
    try { CkgIdb.set('master_sekolah', MASTER_SARANA_SEKOLAH); } catch (_) { }
  }
  syncMasterSekolahToCloud(MASTER_SARANA_SEKOLAH);
  populateSekolahFilterDropdowns();
  populateLoginSekolahDropdown();
  renderAdminSekolahTable();
}

async function syncMasterSekolahToCloud(list) {
  if (!Array.isArray(list)) return;
  try {
    await fetch('/api/master-sekolah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(list)
    });
  } catch (err) {
    console.warn('Sync /api/master-sekolah error:', err);
  }
}

async function fetchMasterSekolahFromCloud() {
  try {
    const res = await fetch('/api/master-sekolah');
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        MASTER_SARANA_SEKOLAH = result.data.map(item => ({
          nama: (item.nama || '').trim().toUpperCase(),
          level: (item.level || 'SD').trim().toUpperCase(),
          password: item.password || '',
          allowed_menus: item.allowed_menus || '',
          is_active: item.is_active !== undefined ? item.is_active : (item.password ? 1 : 0)
        }));
        try {
          localStorage.setItem('ckg_master_sekolah', JSON.stringify(MASTER_SARANA_SEKOLAH));
        } catch (_) { }
        populateSekolahFilterDropdowns();
        populateLoginSekolahDropdown();
        renderAdminSekolahTable();
      }
    }
  } catch (err) {
    console.warn('Fetch master sekolah notice (offline/fallback):', err);
  }
}

function getSchoolLevel(schoolName) {
  if (!schoolName) return null;
  const upper = schoolName.trim().toUpperCase();
  const found = MASTER_SARANA_SEKOLAH.find(s => s.nama.toUpperCase() === upper);
  if (found) return found.level;

  // Deteksi otomatis jika terdapat variasi penulisan
  if (/^(SD|MI|MIS|SDIT|SDN)/i.test(upper) || upper.includes('SD') || upper.includes('MI')) return 'SD';
  if (/^(SMP|MTS|MTSS)/i.test(upper) || upper.includes('SMP') || upper.includes('MTS')) return 'SMP';
  if (/^(SMA|SMK|MA|MAS|SMAN)/i.test(upper) || upper.includes('SMA') || upper.includes('SMK') || upper.includes('MA')) return 'SMA';
  return null;
}

function getClassesForSchool(schoolName) {
  const level = getSchoolLevel(schoolName);
  if (level === 'SD') {
    return ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6', 'Lulus'];
  } else if (level === 'SMP') {
    return ['Kelas 7', 'Kelas 8', 'Kelas 9', 'Lulus'];
  } else if (level === 'SMA') {
    return ['Kelas 10', 'Kelas 11', 'Kelas 12', 'Lulus'];
  }
  return [
    'Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6',
    'Kelas 7', 'Kelas 8', 'Kelas 9', 'Kelas 10', 'Kelas 11', 'Kelas 12', 'Lulus'
  ];
}

// Populate Filter Dropdowns & Selects (Sekolah & Kelas)
function populateSekolahFilterDropdowns() {
  const selectSekolah = document.getElementById('filterSelectSekolah');
  const datalistTambah = document.getElementById('listSekolahTambahOptions');

  const sdList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SD').map(s => s.nama);
  const smpList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SMP').map(s => s.nama);
  const smaList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SMA').map(s => s.nama);

  // Cek jika ada sekolah tambahan dari data rekaman
  const masterSet = new Set(MASTER_SARANA_SEKOLAH.map(s => s.nama.toUpperCase()));
  const extraSchools = [];
  sekolahRecords.forEach(r => {
    if (r.sekolah && r.sekolah.trim()) {
      const up = r.sekolah.trim().toUpperCase();
      if (!masterSet.has(up) && !extraSchools.includes(up)) extraSchools.push(up);
    }
  });

  if (selectSekolah) {
    const savedSekolah = selectSekolah.value;
    let html = '<option value="">-- Pilih Sekolah (Wajib) --</option>';
    html += '<optgroup label="📚 SD / MI (Kelas 1 - 6)">';
    html += sdList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    html += '</optgroup>';
    html += '<optgroup label="🏫 SMP / MTs (Kelas 7 - 9)">';
    html += smpList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    html += '</optgroup>';
    html += '<optgroup label="🎓 SMA / SMK / MA (Kelas 10 - 12)">';
    html += smaList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    html += '</optgroup>';
    if (extraSchools.length > 0) {
      html += '<optgroup label="📍 Sekolah Lainnya">';
      html += extraSchools.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
      html += '</optgroup>';
    }
    selectSekolah.innerHTML = html;
    if (savedSekolah) selectSekolah.value = savedSekolah;

    // Sync Searchable Combobox Trigger Label
    const labelEl = document.getElementById('comboboxSekolahLabel');
    const clearBtn = document.getElementById('comboboxSekolahClearBtn');
    if (labelEl) {
      labelEl.textContent = selectSekolah.value || '-- Pilih Sekolah (Wajib) --';
    }
    if (clearBtn) {
      clearBtn.style.display = selectSekolah.value ? 'inline-block' : 'none';
    }
  }

  if (datalistTambah) {
    const allUnique = [...MASTER_SARANA_SEKOLAH.map(s => s.nama), ...extraSchools];
    datalistTambah.innerHTML = allUnique.map(s => `<option value="${escapeHtml(s)}"></option>`).join('');
  }

  populateSchoolSelectElement('tambahSiswaSekolah');
  populateSchoolSelectElement('periksaSekolah');

  updateKelasDropdownOptions();
  populateTahunFilterOptions();
}

function onFilterTahunChange() {
  renderSekolahView();
}

function populateTahunFilterOptions() {
  const select = document.getElementById('filterSelectTahun');
  if (!select) return;

  const currentVal = select.value || '2026';
  const yearsSet = new Set(['2026', '2027', '2025']);

  sekolahRecords.forEach(r => {
    if (r.tahun_skrining && String(r.tahun_skrining).trim()) {
      yearsSet.add(String(r.tahun_skrining).trim());
    }
    if (r.tanggal_entry && r.tanggal_entry.length >= 4) {
      const y = r.tanggal_entry.substring(0, 4);
      if (/^\d{4}$/.test(y)) yearsSet.add(y);
    }
    if (Array.isArray(r.riwayat_pemeriksaan)) {
      r.riwayat_pemeriksaan.forEach(h => {
        if (h.tahun && /^\d{4}$/.test(String(h.tahun).trim())) yearsSet.add(String(h.tahun).trim());
        if (h.tahun_ajaran) {
          const match = String(h.tahun_ajaran).match(/\b(20\d\d)\b/);
          if (match) yearsSet.add(match[1]);
        }
      });
    }
  });

  const sortedYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  let html = '';
  sortedYears.forEach(y => {
    const isCur = y === '2026' ? ' (Aktif)' : '';
    html += `<option value="${escapeHtml(y)}">${escapeHtml(y)}${isCur}</option>`;
  });
  html += `<option value="all">Semua Tahun</option>`;

  select.innerHTML = html;
  if (Array.from(select.options).some(o => o.value === currentVal)) {
    select.value = currentVal;
  } else {
    select.value = '2026';
  }
}

// ==========================================================================
// 🔍 SEARCHABLE COMBOBOX LOGIC UNTUK FILTER SEKOLAH
// ==========================================================================
function toggleSekolahDropdown(event) {
  if (event) event.stopPropagation();

  // Khusus Akun Sekolah: Cegah pembukaan dropdown (Terkunci ke akun sendiri)
  const portalType = (sessionStorage.getItem('ckg_portal_type') || '').toLowerCase();
  const schoolAccountName = sessionStorage.getItem('ckg_user_name') || '';
  if (portalType === 'sekolah') {
    showToast(`Daftar sekolah terkunci sesuai akun login Anda (${schoolAccountName}).`, 'info');
    return;
  }

  const panel = document.getElementById('comboboxSekolahPanel');
  const trigger = document.getElementById('comboboxSekolahTrigger');
  if (!panel || !trigger) return;

  const isOpen = panel.style.display === 'flex';
  if (isOpen) {
    closeSekolahDropdown();
  } else {
    closeKelasDropdown();
    panel.style.display = 'flex';
    trigger.classList.add('open');
    const searchInput = document.getElementById('inputSearchSekolahDropdown');
    if (searchInput) {
      searchInput.value = '';
      setTimeout(() => searchInput.focus(), 50);
    }
    renderSearchableSekolahOptions('');
  }
}

function closeSekolahDropdown() {
  const panel = document.getElementById('comboboxSekolahPanel');
  const trigger = document.getElementById('comboboxSekolahTrigger');
  if (panel) panel.style.display = 'none';
  if (trigger) trigger.classList.remove('open');
}

function onFilterSekolahSearchInput(keyword) {
  renderSearchableSekolahOptions(keyword);
}

function clearSearchInputSekolah() {
  const searchInput = document.getElementById('inputSearchSekolahDropdown');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  renderSearchableSekolahOptions('');
}

function selectSekolahComboboxOption(value, label) {
  const portalType = (sessionStorage.getItem('ckg_portal_type') || '').toLowerCase();
  const schoolAccountName = sessionStorage.getItem('ckg_user_name') || '';
  if (portalType === 'sekolah' && schoolAccountName) {
    value = schoolAccountName;
    label = schoolAccountName;
  }

  const selectSekolah = document.getElementById('filterSelectSekolah');
  const labelEl = document.getElementById('comboboxSekolahLabel');
  const clearBtn = document.getElementById('comboboxSekolahClearBtn');

  if (selectSekolah) {
    selectSekolah.value = value;
  }
  if (labelEl) {
    if (portalType === 'sekolah') {
      labelEl.innerHTML = `<i class="bi bi-lock-fill" style="color: #059669; margin-right: 5px;"></i>${escapeHtml(value)} <span style="font-size: 11px; color: #059669; font-weight: 700;">(Akun Terkunci)</span>`;
    } else {
      labelEl.textContent = label || '-- Pilih Sekolah (Wajib) --';
    }
  }
  if (clearBtn) {
    clearBtn.style.display = (value && portalType !== 'sekolah') ? 'inline-block' : 'none';
  }

  closeSekolahDropdown();
  updateKelasDropdownOptions();
  renderSekolahView();
}

function clearSekolahFilter(event) {
  if (event) event.stopPropagation();
  const portalType = (sessionStorage.getItem('ckg_portal_type') || '').toLowerCase();
  if (portalType === 'sekolah') return;
  selectSekolahComboboxOption('', '-- Pilih Sekolah (Wajib) --');
}

function renderSearchableSekolahOptions(filterKeyword = '') {
  const container = document.getElementById('comboboxSekolahOptions');
  if (!container) return;

  const selectSekolah = document.getElementById('filterSelectSekolah');
  const selectedVal = (selectSekolah?.value || '').trim().toUpperCase();
  const kw = filterKeyword.trim().toLowerCase();

  const sdList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SD').map(s => s.nama);
  const smpList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SMP').map(s => s.nama);
  const smaList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SMA').map(s => s.nama);

  const masterSet = new Set(MASTER_SARANA_SEKOLAH.map(s => s.nama.toUpperCase()));
  const extraSchools = [];
  sekolahRecords.forEach(r => {
    if (r.sekolah && r.sekolah.trim()) {
      const up = r.sekolah.trim().toUpperCase();
      if (!masterSet.has(up) && !extraSchools.includes(up)) extraSchools.push(up);
    }
  });

  const filterFn = name => !kw || name.toLowerCase().includes(kw);

  const filteredSD = sdList.filter(filterFn);
  const filteredSMP = smpList.filter(filterFn);
  const filteredSMA = smaList.filter(filterFn);
  const filteredExtra = extraSchools.filter(filterFn);

  const totalMatches = filteredSD.length + filteredSMP.length + filteredSMA.length + filteredExtra.length;

  if (totalMatches === 0) {
    container.innerHTML = `
      <div style="padding: 18px 12px; text-align: center; color: #94a3b8; font-size: 12px;">
        <i class="bi bi-search" style="font-size: 16px; display: block; margin-bottom: 4px;"></i>
        Tidak ada sekolah yang cocok dengan "<strong>${escapeHtml(filterKeyword)}</strong>"
      </div>
    `;
    return;
  }

  let html = '';

  const renderGroup = (title, icon, items) => {
    if (items.length === 0) return '';
    let groupHtml = `<div class="combobox-group-header"><span><i class="${icon}"></i> ${title}</span><span>(${items.length})</span></div>`;
    items.forEach(item => {
      const isSelected = selectedVal === item.toUpperCase();
      groupHtml += `
        <div class="combobox-option-item ${isSelected ? 'selected' : ''}" onclick="selectSekolahComboboxOption('${escapeHtml(item)}', '${escapeHtml(item)}')">
          <span>${escapeHtml(item)}</span>
          ${isSelected ? '<i class="bi bi-check2" style="font-weight: 800;"></i>' : ''}
        </div>
      `;
    });
    return groupHtml;
  };

  html += renderGroup('SD / MI (Kelas 1 - 6)', 'bi bi-mortarboard-fill', filteredSD);
  html += renderGroup('SMP / MTs (Kelas 7 - 9)', 'bi bi-buildings-fill', filteredSMP);
  html += renderGroup('SMA / SMK / MA (Kelas 10 - 12)', 'bi bi-award-fill', filteredSMA);
  if (filteredExtra.length > 0) {
    html += renderGroup('Sekolah Lainnya', 'bi bi-pin-map-fill', filteredExtra);
  }

  container.innerHTML = html;
}

// ==========================================================================
// 🔍 SEARCHABLE COMBOBOX LOGIC UNTUK FILTER KELAS
// ==========================================================================
function toggleKelasDropdown(event) {
  if (event) event.stopPropagation();
  const panel = document.getElementById('comboboxKelasPanel');
  const trigger = document.getElementById('comboboxKelasTrigger');
  if (!panel || !trigger) return;

  const isOpen = panel.style.display === 'flex';
  if (isOpen) {
    closeKelasDropdown();
  } else {
    closeSekolahDropdown();
    panel.style.display = 'flex';
    trigger.classList.add('open');
    const searchInput = document.getElementById('inputSearchKelasDropdown');
    if (searchInput) {
      searchInput.value = '';
      setTimeout(() => searchInput.focus(), 50);
    }
    renderSearchableKelasOptions('');
  }
}

function closeKelasDropdown() {
  const panel = document.getElementById('comboboxKelasPanel');
  const trigger = document.getElementById('comboboxKelasTrigger');
  if (panel) panel.style.display = 'none';
  if (trigger) trigger.classList.remove('open');
}

function onFilterKelasSearchInput(keyword) {
  renderSearchableKelasOptions(keyword);
}

function clearSearchInputKelas() {
  const searchInput = document.getElementById('inputSearchKelasDropdown');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  renderSearchableKelasOptions('');
}

function selectKelasComboboxOption(value, label) {
  const selectKelas = document.getElementById('filterSelectKelas');
  const labelEl = document.getElementById('comboboxKelasLabel');
  const clearBtn = document.getElementById('comboboxKelasClearBtn');

  if (selectKelas) {
    selectKelas.value = value;
  }
  if (labelEl) {
    labelEl.textContent = label || '-- Semua Kelas --';
  }
  if (clearBtn) {
    clearBtn.style.display = value ? 'inline-block' : 'none';
  }

  closeKelasDropdown();
  renderSekolahView();
}

function clearKelasFilter(event) {
  if (event) event.stopPropagation();
  selectKelasComboboxOption('', '-- Semua Kelas --');
}

function renderSearchableKelasOptions(filterKeyword = '') {
  const container = document.getElementById('comboboxKelasOptions');
  if (!container) return;

  const selectSekolah = document.getElementById('filterSelectSekolah');
  const selectKelas = document.getElementById('filterSelectKelas');
  const selectedVal = (selectKelas?.value || '').trim().toUpperCase();
  const kw = filterKeyword.trim().toLowerCase();

  const chosenSekolah = (selectSekolah?.value || '').trim();
  const standardClasses = getClassesForSchool(chosenSekolah);
  const kelasSet = new Set(standardClasses.map(k => k.toUpperCase()));

  sekolahRecords.forEach(r => {
    if (!chosenSekolah || (r.sekolah || '').toUpperCase() === chosenSekolah.toUpperCase()) {
      if (r.kelas && r.kelas.trim()) kelasSet.add(r.kelas.trim().toUpperCase());
    }
  });

  const sortedKelas = Array.from(kelasSet).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB || a.localeCompare(b);
  });

  const filteredKelas = sortedKelas.filter(k => !kw || k.toLowerCase().includes(kw));

  const totalMatches = (kw ? 0 : 1) + filteredKelas.length;

  if (totalMatches === 0) {
    container.innerHTML = `
      <div style="padding: 18px 12px; text-align: center; color: #94a3b8; font-size: 12px;">
        <i class="bi bi-search" style="font-size: 16px; display: block; margin-bottom: 4px;"></i>
        Tidak ada kelas yang cocok dengan "<strong>${escapeHtml(filterKeyword)}</strong>"
      </div>
    `;
    return;
  }

  let html = '';

  // Default / Semua Kelas
  if (!kw || '-- semua kelas --'.includes(kw) || 'semua'.includes(kw)) {
    const isSelected = !selectedVal;
    html += `
      <div class="combobox-option-item ${isSelected ? 'selected' : ''}" onclick="selectKelasComboboxOption('', '-- Semua Kelas --')">
        <span style="display: flex; align-items: center; gap: 6px;">
          <i class="bi bi-grid-fill" style="color: #6366f1;"></i>
          <strong>-- Semua Kelas --</strong>
        </span>
        ${isSelected ? '<i class="bi bi-check2" style="font-weight: 800;"></i>' : ''}
      </div>
    `;
  }

  filteredKelas.forEach(item => {
    const isSelected = selectedVal === item.toUpperCase();
    html += `
      <div class="combobox-option-item ${isSelected ? 'selected' : ''}" onclick="selectKelasComboboxOption('${escapeHtml(item)}', '${escapeHtml(item)}')">
        <span style="display: flex; align-items: center; gap: 6px;">
          <i class="bi bi-mortarboard" style="color: #059669;"></i>
          ${escapeHtml(item)}
        </span>
        ${isSelected ? '<i class="bi bi-check2" style="font-weight: 800;"></i>' : ''}
      </div>
    `;
  });

  container.innerHTML = html;
}

// Global click listener to close searchable combobox when clicking outside
document.addEventListener('click', function (e) {
  const wrapperSekolah = document.getElementById('comboboxSekolahWrapper');
  if (wrapperSekolah && !wrapperSekolah.contains(e.target)) {
    closeSekolahDropdown();
  }
  const wrapperKelas = document.getElementById('comboboxKelasWrapper');
  if (wrapperKelas && !wrapperKelas.contains(e.target)) {
    closeKelasDropdown();
  }
});

function populateSchoolSelectElement(elementId) {
  const el = document.getElementById(elementId);
  if (!el || el.tagName !== 'SELECT') return;
  const currentVal = el.value;

  const sdList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SD').map(s => s.nama);
  const smpList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SMP').map(s => s.nama);
  const smaList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SMA').map(s => s.nama);

  let html = '<option value="">-- Pilih Sekolah --</option>';
  html += '<optgroup label="📚 SD / MI (Kelas 1 - 6)">';
  html += sdList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  html += '</optgroup>';
  html += '<optgroup label="🏫 SMP / MTs (Kelas 7 - 9)">';
  html += smpList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  html += '</optgroup>';
  html += '<optgroup label="🎓 SMA / SMK / MA (Kelas 10 - 12)">';
  html += smaList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  html += '</optgroup>';

  el.innerHTML = html;
  if (currentVal) el.value = currentVal;

  // Khusus Akun Sekolah: Kunci select sekolah ke akun sendiri
  const portalType = (sessionStorage.getItem('ckg_portal_type') || '').toLowerCase();
  const schoolAccountName = sessionStorage.getItem('ckg_user_name') || '';
  if (portalType === 'sekolah' && schoolAccountName) {
    el.value = schoolAccountName;
    el.disabled = true;
    el.style.backgroundColor = '#f1f5f9';
    el.style.cursor = 'not-allowed';
  } else {
    el.disabled = false;
    el.style.backgroundColor = '';
    el.style.cursor = '';
  }
}

function updateKelasDropdownOptions() {
  const selectSekolah = document.getElementById('filterSelectSekolah');
  const selectKelas = document.getElementById('filterSelectKelas');
  if (!selectKelas) return;

  const chosenSekolah = (selectSekolah?.value || '').trim();
  const savedKelas = selectKelas.value;

  const standardClasses = getClassesForSchool(chosenSekolah);
  const kelasSet = new Set(standardClasses.map(k => k.toUpperCase()));

  sekolahRecords.forEach(r => {
    if (!chosenSekolah || (r.sekolah || '').toUpperCase() === chosenSekolah.toUpperCase()) {
      if (r.kelas && r.kelas.trim()) kelasSet.add(r.kelas.trim().toUpperCase());
    }
  });

  const sortedKelas = Array.from(kelasSet).sort((a, b) => {
    if (a.toUpperCase() === 'LULUS') return 1;
    if (b.toUpperCase() === 'LULUS') return -1;
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB || a.localeCompare(b);
  });

  selectKelas.innerHTML = '<option value="">-- Semua Kelas --</option>' +
    sortedKelas.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');

  if (savedKelas && kelasSet.has(savedKelas.toUpperCase())) selectKelas.value = savedKelas;

  // Sync Kelas Combobox Label
  const kelasLabelEl = document.getElementById('comboboxKelasLabel');
  const kelasClearBtn = document.getElementById('comboboxKelasClearBtn');
  if (kelasLabelEl) {
    kelasLabelEl.textContent = selectKelas.value || '-- Semua Kelas --';
  }
  if (kelasClearBtn) {
    kelasClearBtn.style.display = selectKelas.value ? 'inline-block' : 'none';
  }
}

function updateTambahSiswaKelasDropdown() {
  const selectSekolah = document.getElementById('tambahSiswaSekolah');
  const selectKelas = document.getElementById('tambahSiswaKelas');
  if (!selectKelas) return;

  const chosenSekolah = (selectSekolah?.value || '').trim();
  const standardClasses = getClassesForSchool(chosenSekolah);

  selectKelas.innerHTML = '<option value="">-- Pilih Kelas --</option>' +
    standardClasses.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
}

async function initWilayahDropdownsSekolah(initialProv, initialKab, initialKec, initialKel) {
  await initWilayahDropdownsCascade('periksaProvinsi', 'periksaKabKota', 'periksaKecamatan', 'periksaKelurahan', initialProv, initialKab, initialKec, initialKel);
}

// ==========================================================================
// 🔍 INTEGRASI BANK DATA CKG / ASIK UNTUK SISWA SEKOLAH
// ==========================================================================

function isStudentInBankData(r) {
  if (!r) return false;
  if (Number(r.is_bank_data) === 1 || Number(r.from_bank_data) === 1) return true;
  const cleanNik = String(r.nik || '').replace(/\D/g, '');
  if (cleanNik.length !== 16) return false;
  if (Array.isArray(ckgGratisRecords) && ckgGratisRecords.some(cg => String(cg.nik || '').replace(/\D/g, '') === cleanNik)) return true;
  if (Array.isArray(records) && records.some(rec => String(rec.nik || '').replace(/\D/g, '') === cleanNik)) return true;
  if (typeof encoState !== 'undefined' && Array.isArray(encoState.cachedRecords) && encoState.cachedRecords.some(ep => String(ep.nik || '').replace(/\D/g, '') === cleanNik)) return true;
  return false;
}

function setIdentitasFieldsLockState(isLocked, isFromBankData = false) {
  const fields = [
    { id: 'periksaNama', type: 'input' },
    { id: 'periksaJk', type: 'select' },
    { id: 'periksaTglLahir', type: 'input' },
    { id: 'periksaProvinsi', type: 'select' },
    { id: 'periksaKabKota', type: 'select' },
    { id: 'periksaKecamatan', type: 'select' },
    { id: 'periksaKelurahan', type: 'select' },
    { id: 'periksaAlamat', type: 'input' }
  ];

  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (!el) return;
    if (isLocked) {
      if (f.type === 'select') {
        el.disabled = true;
      } else {
        el.readOnly = true;
      }
      el.style.backgroundColor = isFromBankData ? '#f0fdf4' : '#f1f5f9';
      el.style.borderColor = isFromBankData ? '#a7f3d0' : '#cbd5e1';
      el.style.color = isFromBankData ? '#065f46' : '#64748b';
      el.style.cursor = 'not-allowed';
      el.title = isFromBankData
        ? 'Data resmi terverifikasi dari Bank Data CKG / ASIK (Terkunci)'
        : 'Terkunci: Wajib klik Cek NIK terlebih dahulu!';
    } else {
      if (f.type === 'select') {
        el.disabled = false;
      } else {
        el.readOnly = false;
      }
      el.style.backgroundColor = '#ffffff';
      el.style.borderColor = '';
      el.style.color = '';
      el.style.cursor = '';
      el.title = '';
    }
  });

  // Tombol Isi Manual Wilayah ikut terkunci jika form identitas dikunci
  const manualBtns = document.querySelectorAll('#periksaIdentitasPanel .btn-manual-wilayah');
  manualBtns.forEach(btn => {
    btn.disabled = isLocked;
    btn.style.opacity = isLocked ? '0.4' : '1';
    btn.style.pointerEvents = isLocked ? 'none' : 'auto';
  });
}

function updateBankDataBadgeStatus(isFound, customText) {
  const badge = document.getElementById('badgeBankDataStatus');
  const hint = document.getElementById('hintCekNikSiswa');
  if (!badge) return;

  if (isFound === true) {
    badge.style.background = '#d1fae5';
    badge.style.color = '#065f46';
    badge.style.border = '1px solid #a7f3d0';
    badge.innerHTML = `<i class="bi bi-patch-check-fill" style="color: #10b981;"></i> ${customText || 'Terdaftar di Bank Data'}`;
    if (hint) {
      hint.innerHTML = `<span style="color: #047857; font-weight: 700;"><i class="bi bi-check-circle-fill"></i> Data NIK terdaftar di Bank Data CKG/ASIK. Identitas terkunci menggunakan data resmi bank data.</span>`;
    }
  } else if (isFound === false) {
    badge.style.background = '#e0f2fe';
    badge.style.color = '#0369a1';
    badge.style.border = '1px solid #bae6fd';
    badge.innerHTML = `<i class="bi bi-pencil-fill" style="color: #0284c7;"></i> ${customText || 'Belum Terdaftar (Silakan Daftarkan)'}`;
    if (hint) {
      hint.innerHTML = `<span style="color: #0369a1; font-weight: 700;"><i class="bi bi-unlock-fill"></i> NIK belum ada di Bank Data. Kolom telah dibuka, silakan lengkapi data untuk mendaftarkan.</span>`;
    }
  } else {
    badge.style.background = '#fee2e2';
    badge.style.color = '#b91c1c';
    badge.style.border = '1px solid #fca5a5';
    badge.innerHTML = `<i class="bi bi-shield-lock-fill"></i> ${customText || 'Wajib Cek NIK Dulu'}`;
    if (hint) {
      hint.innerHTML = `<i class="bi bi-info-circle-fill" style="color: #0284c7;"></i> <span>Klik <strong>Cek NIK</strong> terlebih dahulu. Kolom identitas lainnya terkunci sampai NIK dicek di Bank Data CKG.</span>`;
    }
  }
}

function onPeriksaNikInputChange() {
  const clean = document.getElementById('periksaNik')?.value.replace(/\D/g, '') || '';
  const siswaId = document.getElementById('periksaSiswaId')?.value;
  const siswa = sekolahRecords.find(r => String(r.id) === String(siswaId));
  if (siswa) {
    siswa.is_bank_data_checked = false;
  }
  setIdentitasFieldsLockState(true, false);
  updateBankDataBadgeStatus(null, 'Wajib Cek NIK Dulu');
}

function applyBankDataStateToIdentitas(siswa) {
  if (!siswa) return;
  const cleanNik = String(siswa.nik || '').replace(/\D/g, '');
  const inBankData = isStudentInBankData(siswa);

  if (inBankData) {
    siswa.is_bank_data = 1;
    siswa.from_bank_data = 1;
    siswa.is_bank_data_checked = true;
    setIdentitasFieldsLockState(true, true);
    updateBankDataBadgeStatus(true, 'Data Terdaftar di Bank Data');
  } else if (siswa.is_bank_data_checked) {
    setIdentitasFieldsLockState(false, false);
    updateBankDataBadgeStatus(false, 'Belum Terdaftar (Silakan Daftarkan)');
  } else if (cleanNik.length === 16 && Number(siswa.identitas_done) === 1) {
    siswa.is_bank_data_checked = true;
    setIdentitasFieldsLockState(false, false);
    updateBankDataBadgeStatus(false, 'Data Manual Tersimpan');
  } else {
    setIdentitasFieldsLockState(true, false);
    updateBankDataBadgeStatus(null, 'Wajib Cek NIK Dulu');
  }
}

async function cekNikSiswaBankData() {
  const nikInput = document.getElementById('periksaNik');
  const rawNik = nikInput ? nikInput.value.trim() : '';
  const cleanNik = rawNik.replace(/\D/g, '');

  if (cleanNik.length !== 16) {
    Swal.fire({
      icon: 'warning',
      title: 'NIK Tidak Valid',
      text: `NIK harus terdiri dari 16 digit angka (saat ini ${cleanNik.length} digit). Harap masukkan NIK 16 digit terlebih dahulu.`
    });
    return;
  }

  const btn = document.getElementById('btnCekNikSiswaBankData');
  const origBtnText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Memeriksa...';
  }

  Swal.fire({
    title: 'Mengecek Bank Data...',
    html: `<div style="font-size: 13.5px; color: #475569; margin-top: 8px;">Sedang mencari NIK <strong>${cleanNik}</strong> di Bank Data CKG & ASIK...</div>`,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => { Swal.showLoading(); }
  });

  let foundData = null;
  let source = '';

  // 1. Cek local dataset ckgGratisRecords (Cek Kesehatan Gratis)
  if (Array.isArray(ckgGratisRecords) && ckgGratisRecords.length > 0) {
    const match = ckgGratisRecords.find(r => String(r.nik || '').replace(/\D/g, '') === cleanNik);
    if (match) {
      foundData = match;
      source = 'Cek Kesehatan Gratis';
    }
  }

  // 2. Cek local dataset records (Database Pasien CKG)
  if (!foundData && Array.isArray(records) && records.length > 0) {
    const match = records.find(r => String(r.nik || '').replace(/\D/g, '') === cleanNik);
    if (match) {
      foundData = match;
      source = 'Database Pasien CKG';
    }
  }

  // 3. Cek API /api/enco/lookup-nik
  if (!foundData) {
    try {
      const res = await fetch(`/api/enco/lookup-nik?nik=${encodeURIComponent(cleanNik)}`);
      if (res.ok) {
        const j = await res.json();
        if (j && j.success && j.found && j.data) {
          foundData = j.data;
          source = 'Bank Data ASIK';
        }
      }
    } catch (_) { }
  }

  // 4. Cek fallback search /api/enco/records
  if (!foundData) {
    try {
      const resSearch = await fetch(`/api/enco/records?search=${encodeURIComponent(cleanNik)}&limit=10`);
      if (resSearch.ok) {
        const jSearch = await resSearch.json();
        if (jSearch && jSearch.success && Array.isArray(jSearch.data)) {
          const match = jSearch.data.find(item => String(item.nik || '').replace(/\D/g, '') === cleanNik);
          if (match) {
            foundData = match;
            source = 'Bank Data ASIK';
          }
        }
      }
    } catch (_) { }
  }

  // 5. Cek API /api/ckg-gratis jika dataset belum loaded
  if (!foundData) {
    try {
      const res = await fetch('/api/ckg-gratis');
      if (res.ok) {
        const j = await res.json();
        if (j && j.success && Array.isArray(j.data)) {
          const match = j.data.find(r => String(r.nik || '').replace(/\D/g, '') === cleanNik);
          if (match) {
            foundData = match;
            source = 'Cek Kesehatan Gratis';
          }
        }
      }
    } catch (_) { }
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = origBtnText || '<i class="bi bi-search"></i> Cek NIK';
  }

  const siswaId = document.getElementById('periksaSiswaId')?.value;
  const siswa = sekolahRecords.find(r => String(r.id) === String(siswaId));

  if (foundData) {
    // KASUS A: DATA DITEMUKAN DI BANK DATA
    const rawNama = foundData.nama || foundData.nama_pasien || '';
    const rawDob = foundData.tanggal_lahir || foundData.tgl_lahir || '';
    let rawJk = foundData.jenis_kelamin || foundData.jk || 'L';
    if (String(rawJk).toUpperCase().startsWith('P') || String(rawJk).toLowerCase() === 'perempuan') rawJk = 'P';
    else rawJk = 'L';
    const rawProv = foundData.provinsi || 'Jawa Barat';
    const rawKab = foundData.kab_kota || 'Kabupaten Bandung';
    const rawKec = foundData.kecamatan || 'Banjaran';
    const rawKel = foundData.kelurahan || '';
    const rawAlamat = foundData.alamat || '';

    await Swal.fire({
      icon: 'success',
      title: 'Data Ditemukan di Bank Data!',
      html: `
        <div style="text-align: left; background: #f0fdf4; border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 14px 16px; margin-top: 10px; font-size: 13px;">
          <div style="font-weight: 800; color: #065f46; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <i class="bi bi-patch-check-fill" style="color: #10b981; font-size: 18px;"></i>
            <span>Data Terverifikasi (${escapeHtml(source)})</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; line-height: 1.6; font-size: 12.5px;">
            <tr><td style="width: 105px; color: #64748b;">NIK:</td><td style="font-weight: 700; font-family: monospace;">${escapeHtml(cleanNik)}</td></tr>
            <tr><td style="color: #64748b;">Nama:</td><td style="font-weight: 800; color: #047857;">${escapeHtml(rawNama)}</td></tr>
            <tr><td style="color: #64748b;">Jenis Kelamin:</td><td style="font-weight: 700;">${rawJk === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)'}</td></tr>
            <tr><td style="color: #64748b;">Tanggal Lahir:</td><td>${escapeHtml(rawDob || '-')}</td></tr>
            <tr><td style="color: #64748b;">Wilayah:</td><td>${escapeHtml([rawKel, rawKec, rawKab, rawProv].filter(Boolean).join(', ') || '-')}</td></tr>
            <tr><td style="color: #64748b;">Alamat:</td><td>${escapeHtml(rawAlamat || '-')}</td></tr>
          </table>
          <div style="margin-top: 10px; font-size: 12px; color: #047857; font-weight: 700;">
            <i class="bi bi-info-circle-fill"></i> Data identitas otomatis disesuaikan dengan data resmi Bank Data dan terkunci.
          </div>
        </div>
      `,
      confirmButtonText: '<i class="bi bi-check2-circle"></i> Gunakan Data Bank Data',
      confirmButtonColor: '#059669'
    });

    if (rawNama) document.getElementById('periksaNama').value = rawNama.toUpperCase();
    document.getElementById('periksaJk').value = rawJk;
    if (rawDob) document.getElementById('periksaTglLahir').value = rawDob;
    if (rawAlamat) document.getElementById('periksaAlamat').value = rawAlamat;
    calculateSiswaAge();

    initWilayahDropdownsSekolah(rawProv, rawKab, rawKec, rawKel);

    if (siswa) {
      siswa.is_bank_data = 1;
      siswa.from_bank_data = 1;
      siswa.is_bank_data_checked = true;
      siswa.nama = rawNama ? rawNama.toUpperCase() : siswa.nama;
      siswa.jk = rawJk;
      if (rawDob) siswa.tanggal_lahir = rawDob;
      if (rawAlamat) siswa.alamat = rawAlamat;
      siswa.provinsi = rawProv;
      siswa.kab_kota = rawKab;
      siswa.kecamatan = rawKec;
      siswa.kelurahan = rawKel;
    }
    setIdentitasFieldsLockState(true, true);
    updateBankDataBadgeStatus(true, 'Data Terdaftar di Bank Data');
  } else {
    // KASUS B: DATA TIDAK ADA DI BANK DATA
    await Swal.fire({
      icon: 'info',
      title: 'NIK Belum Terdaftar di Bank Data',
      html: `
        <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #334155;">
          NIK <strong>${escapeHtml(cleanNik)}</strong> belum ditemukan di Bank Data CKG / ASIK.
          <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 12px 14px; margin-top: 10px; color: #1e40af; font-weight: 700;">
            <i class="bi bi-unlock-fill" style="color: #2563eb;"></i> Kolom pendaftaran telah terbuka. Silakan lengkapi identitas siswa untuk mendaftarkan.
          </div>
        </div>
      `,
      confirmButtonText: '<i class="bi bi-pencil-square"></i> Lengkapi Identitas',
      confirmButtonColor: '#2563eb'
    });

    if (siswa) {
      siswa.is_bank_data = 0;
      siswa.from_bank_data = 0;
      siswa.is_bank_data_checked = true;
    }
    setIdentitasFieldsLockState(false, false);
    updateBankDataBadgeStatus(false, 'Belum Terdaftar (Silakan Daftarkan)');
    document.getElementById('periksaNama')?.focus();
  }
}

function setSelectKelasValue(selectEl, targetVal) {
  if (!selectEl || !targetVal) return;
  const rawTarget = String(targetVal).trim();
  const cleanTarget = rawTarget.toLowerCase().replace(/^kelas\s*/i, '').trim();

  // 1. Direct match (case-insensitive & whitespace tolerant)
  for (let i = 0; i < selectEl.options.length; i++) {
    const opt = selectEl.options[i];
    const optVal = String(opt.value).trim().toLowerCase();
    const optClean = optVal.replace(/^kelas\s*/i, '').trim();
    if (optVal === rawTarget.toLowerCase() || optClean === cleanTarget) {
      selectEl.selectedIndex = i;
      return;
    }
  }

  // 2. Custom class name (e.g. "12 RPL 1" or "10 IPA")
  const customOpt = document.createElement('option');
  customOpt.value = rawTarget;
  customOpt.textContent = rawTarget;
  selectEl.appendChild(customOpt);
  selectEl.value = rawTarget;
}

function updatePeriksaSiswaKelasDropdown(targetKelasToSelect) {
  const selectSekolah = document.getElementById('periksaSekolah');
  const selectKelas = document.getElementById('periksaKelas');
  if (!selectKelas) return;

  const chosenSekolah = (selectSekolah?.value || '').trim();
  const currentKelas = targetKelasToSelect || selectKelas.value;
  const standardClasses = getClassesForSchool(chosenSekolah);

  let html = '<option value="">-- Pilih Kelas --</option>';
  standardClasses.forEach(k => {
    html += `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`;
  });
  selectKelas.innerHTML = html;

  if (currentKelas) {
    setSelectKelasValue(selectKelas, currentKelas);
  }
}

// State for Filter Status Skrining (all | sudah | belum | rujukan)
let currentSekolahStatusFilter = 'all';

/**
 * Pengecekan 5 Indikator Pemeriksaan CKG Sekolah:
 * 1. Identitas (Nama, NIK/JK, Sekolah, Kelas)
 * 2. Antropometri (BB & TB atau antro_done === 1)
 * 3. Tanda Vital (Tekanan Darah sistol > 0 atau vital_done === 1)
 * 4. Laboratorium (Hb/Gula Darah terisi, ATAU dicentang "Tidak Diperiksa", atau lab_done === 1)
 * 5. Skrining Organ Indera (Telinga, Gigi, Mata, dll selesai atau organ_done === 1)
 */
function getSekolahRecordExamStations(r) {
  if (!r) {
    return {
      hasIdentitas: false,
      hasAntro: false,
      hasVital: false,
      hasLab: false,
      isLabTidakDiperiksa: false,
      hasOrgan: false,
      hasKesimpulan: false,
      completedCount: 0,
      isComplete: false,
      isPartial: false,
      isBelum: true
    };
  }

  // 1. Identitas: Siswa wajib memiliki nama dan sekolah & kelas
  const hasIdentitas = !!(r.nama && String(r.nama).trim() !== '' && r.sekolah && r.kelas);

  // 2. Antropometri
  const bbNum = Number(r.bb) || 0;
  const tbNum = Number(r.tb) || 0;
  const hasAntro = !!(Number(r.antro_done) === 1 || (bbNum > 0 && tbNum > 0));

  // 3. Tanda Vital
  const sistolNum = Number(r.td_sistolik) || 0;
  const hasVital = !!(Number(r.vital_done) === 1 || sistolNum > 0);

  // 4. Laboratorium (Bisa terisi nilai Hb/GDS, ATAU ditandai "Tidak Diperiksa")
  const isLabTidakDiperiksa = !!(
    Number(r.lab_tidak_diperiksa) === 1 ||
    r.hb === 'Tidak Diperiksa' ||
    r.gula_darah === 'Tidak Diperiksa' ||
    r.kategori_hb === 'Tidak Diperiksa' ||
    r.kategori_gula === 'Tidak Diperiksa' ||
    r.lab_status === 'Tidak Diperiksa'
  );
  const hasLabValue = !!(
    (r.hb && r.hb !== '-' && r.hb !== 'Tidak Diperiksa' && String(r.hb).trim() !== '') ||
    (r.gula_darah && r.gula_darah !== '-' && r.gula_darah !== 'Tidak Diperiksa' && String(r.gula_darah).trim() !== '')
  );
  const hasLab = !!(Number(r.lab_done) === 1 || isLabTidakDiperiksa || hasLabValue);

  // 5. Skrining Organ Indera (Telinga, Gigi, Mata)
  // Hanya terisi jika organ_done === 1 (eksplisit diperiksa & disimpan).
  // Untuk data lama di database yang sudah diperiksa medis sebelumnya (memiliki data antro/vital/lab/is_examined):
  // tetap dipertahankan jika telinga, mata, dan gigi terisi bukan '-'
  const hasOtherMedicalExams = !!(
    Number(r.antro_done) === 1 ||
    Number(r.vital_done) === 1 ||
    Number(r.lab_done) === 1 ||
    Number(r.is_examined) === 1 ||
    (Number(r.bb) > 0 && Number(r.tb) > 0) ||
    Number(r.td_sistolik) > 0
  );
  const hasOrgan = !!(
    Number(r.organ_done) === 1 ||
    (hasOtherMedicalExams && r.telinga && r.telinga !== '-' && r.mata && r.mata !== '-' && r.gigi && r.gigi !== '-')
  );

  // 6. Kesimpulan & Rujukan (Opsional)
  const hasKesimpulan = !!(
    Number(r.kesimpulan_done) === 1 ||
    (r.status_kesehatan && r.status_kesehatan !== '-' && String(r.status_kesehatan).trim() !== '') ||
    (r.catatan_rujukan && r.catatan_rujukan !== '-' && String(r.catatan_rujukan).trim() !== '')
  );

  // Hitung jumlah stasiun medis yang terpenuhi (dari 4 stasiun medis: antro, vital, lab, organ)
  const medicalStations = [hasAntro, hasVital, hasLab, hasOrgan];
  const completedCount = medicalStations.filter(Boolean).length;

  // Indikator SUDAH DIPERIKSA (LENGKAP): Identitas + Antro + Vital + Lab + Organ Indera (Semua stasiun selesai)
  const isComplete = hasIdentitas && (completedCount === 4);

  // Indikator PERIKSA SEBAGIAN: Ada minimal 1 stasiun medis terisi, TAPI belum lengkap ke-4 stasiunnya
  // (Pemeriksaan sebagian TIDAK terhitung di Sudah Diperiksa!)
  const isPartial = completedCount >= 1 && !isComplete;

  // Indikator BELUM DIPERIKSA: Belum ada stasiun medis yang diisi sama sekali (0 stasiun)
  const isBelum = completedCount === 0;

  return {
    hasIdentitas,
    hasAntro,
    hasVital,
    hasLab,
    isLabTidakDiperiksa,
    hasOrgan,
    hasKesimpulan,
    completedCount,
    isComplete,
    isPartial,
    isBelum
  };
}

function isSekolahRecordExamined(r) {
  // Hanya bernilai TRUE jika SEMUA 5 indikator terpenuhi!
  // Pemeriksaan sebagian TIDAK TERHITUNG di sudah diperiksa.
  return getSekolahRecordExamStations(r).isComplete;
}

function isSekolahRecordPartialExamined(r) {
  return getSekolahRecordExamStations(r).isPartial;
}

function isSekolahRecordBelumExamined(r) {
  return getSekolahRecordExamStations(r).isBelum;
}

function isSekolahRecordPerluRujukan(r) {
  if (!r) return false;
  const hbVal = parseFloat(r.hb);
  const isAnemia = !isNaN(hbVal) && hbVal > 0 && hbVal < 12.0;
  const isHipertensi = r.td_sistolik && Number(r.td_sistolik) > 120;
  const adaKaries = r.gigi && r.gigi !== 'Tidak ada' && r.gigi !== 'Tidak' && r.gigi !== '0';
  const mataBukanNormal = r.mata && r.mata !== 'Normal' && r.mata !== 'Tidak';
  const adaSerumen = r.telinga && (String(r.telinga).toLowerCase().includes('ada serumen') || String(r.telinga).toLowerCase().includes('infeksi'));
  const statusRujuk = r.status_kesehatan && (r.status_kesehatan === 'Perlu Rujukan' || r.status_kesehatan === 'Perlu Perhatian' || r.status_kesehatan !== 'Sehat');
  return !!(isAnemia || isHipertensi || adaKaries || mataBukanNormal || adaSerumen || statusRujuk);
}

function toggleLabTidakDiperiksa(isChecked) {
  const cb = document.getElementById('periksaLabTidakDiperiksa');
  if (cb) cb.checked = isChecked;

  const banner = document.getElementById('bannerLabTidakDiperiksaAktif');
  if (banner) banner.style.display = isChecked ? 'block' : 'none';

  const gulaInput = document.getElementById('periksaGula');
  const hbInput = document.getElementById('periksaHb');
  const katGula = document.getElementById('periksaKategoriGula');
  const katHb = document.getElementById('periksaKategoriHb');

  if (isChecked) {
    if (gulaInput) {
      gulaInput.disabled = true;
      if (gulaInput.value && gulaInput.value !== 'Tidak Diperiksa') {
        gulaInput.dataset.preVal = gulaInput.value;
      }
      gulaInput.value = '';
      gulaInput.placeholder = '🚫 Tidak Diperiksa';
    }
    if (hbInput) {
      hbInput.disabled = true;
      if (hbInput.value && hbInput.value !== 'Tidak Diperiksa') {
        hbInput.dataset.preVal = hbInput.value;
      }
      hbInput.value = '';
      hbInput.placeholder = '🚫 Tidak Diperiksa';
    }
    if (katGula) katGula.value = 'Tidak Diperiksa';
    if (katHb) katHb.value = 'Tidak Diperiksa';
  } else {
    if (hbInput) {
      hbInput.disabled = false;
      hbInput.placeholder = 'Contoh: 13.5';
      if (hbInput.dataset.preVal && hbInput.dataset.preVal !== 'Tidak Diperiksa') {
        hbInput.value = hbInput.dataset.preVal;
      }
    }
    updateGulaDarahLockState();
    calculateSiswaLabCategory();
  }
}

function setSekolahStatusFilter(status) {
  currentSekolahStatusFilter = status || 'all';

  // Synchronize Dropdown
  const select = document.getElementById('filterSelectStatus');
  if (select && select.value !== currentSekolahStatusFilter) {
    select.value = currentSekolahStatusFilter;
  }

  // Synchronize Quick Filter Pills
  document.querySelectorAll('.status-pill').forEach(pill => {
    if (pill.getAttribute('data-status') === currentSekolahStatusFilter) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  // Synchronize Clickable Metric Cards active indicator
  const cardMap = {
    all: 'cardFilterTotal',
    sudah: 'cardFilterSudah',
    belum: 'cardFilterBelum',
    sebagian: 'cardFilterSebagian'
  };

  ['cardFilterTotal', 'cardFilterSudah', 'cardFilterBelum', 'cardFilterSebagian'].forEach(id => {
    document.getElementById(id)?.classList.remove('active-filter');
  });

  const activeCardId = cardMap[currentSekolahStatusFilter];
  if (activeCardId) {
    document.getElementById(activeCardId)?.classList.add('active-filter');
  }

  renderSekolahView();
}

function applySekolahFilter() {
  renderSekolahView();
}


// ==========================================================================
// 📱 RESPONSIVE PAGINATION ENGINE (DESKTOP: 10 DATA, MOBILE/APK: 3 DATA)
// ==========================================================================

let currentSekolahPage = 1;
let lastSekolahFilterSignature = '';

let currentCkgGratisPage = 1;
let lastCkgGratisFilterSignature = '';

function isMobileOrApkView() {
  if (typeof window === 'undefined') return false;
  if (window.IS_NATIVE_APK) return true;
  if (typeof document !== 'undefined' && (
      document.documentElement.classList.contains('is-native-apk') ||
      document.body?.classList.contains('is-native-apk')
  )) return true;
  if (window.innerWidth <= 768) return true;
  if (navigator && navigator.userAgent && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent)) {
    return true;
  }
  return false;
}

function getSekolahPageSize() {
  return isMobileOrApkView() ? 3 : 10;
}

function generatePaginationPages(currentPage, totalPages, isMobile = false) {
  const pages = [];
  const maxButtons = isMobile ? 5 : 7;
  
  if (totalPages <= maxButtons) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  
  pages.push(1);
  
  let start = Math.max(2, currentPage - (isMobile ? 1 : 2));
  let end = Math.min(totalPages - 1, currentPage + (isMobile ? 1 : 2));
  
  if (currentPage <= (isMobile ? 2 : 3)) {
    end = Math.min(totalPages - 1, isMobile ? 3 : 5);
  } else if (currentPage >= totalPages - (isMobile ? 1 : 2)) {
    start = Math.max(2, totalPages - (isMobile ? 2 : 4));
  }
  
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push('...');
  pages.push(totalPages);
  
  return pages;
}

function renderSekolahPagination(totalItems, pageSize, currentPage, totalPages) {
  const container = document.getElementById('sekolahPaginationContainer');
  if (!container) return;

  if (totalItems === 0 || totalPages <= 1) {
    if (totalItems > 0 && totalPages <= 1) {
      container.style.display = 'flex';
      container.innerHTML = `
        <div class="sekolah-pagination-info">
          <i class="bi bi-info-circle-fill" style="color: #3b82f6;"></i>
          <span>Menampilkan <strong>1 - ${totalItems}</strong> dari <strong>${totalItems.toLocaleString('id-ID')}</strong> siswa (Halaman <strong>1</strong> dari <strong>1</strong>)</span>
        </div>
        <div class="sekolah-pagination-nav">
          <button type="button" class="sekolah-page-btn active">1</button>
        </div>
      `;
    } else {
      container.style.display = 'none';
    }
    return;
  }

  container.style.display = 'flex';

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);
  const isMobile = isMobileOrApkView();

  const pages = generatePaginationPages(currentPage, totalPages, isMobile);

  let buttonsHtml = '';

  // Tombol Sebelumnya
  const prevDisabled = currentPage <= 1 ? 'disabled' : '';
  buttonsHtml += `
    <button type="button" class="sekolah-page-btn" ${prevDisabled} onclick="changeSekolahPage(${currentPage - 1})" title="Halaman Sebelumnya">
      <i class="bi bi-chevron-left"></i> ${isMobile ? '' : 'Sebelumnya'}
    </button>
  `;

  // Nomor Halaman
  pages.forEach(p => {
    if (p === '...') {
      buttonsHtml += `<span class="sekolah-page-ellipsis">&hellip;</span>`;
    } else {
      const activeClass = p === currentPage ? 'active' : '';
      buttonsHtml += `
        <button type="button" class="sekolah-page-btn ${activeClass}" onclick="changeSekolahPage(${p})" title="Halaman ${p}">
          ${p}
        </button>
      `;
    }
  });

  // Tombol Selanjutnya
  const nextDisabled = currentPage >= totalPages ? 'disabled' : '';
  buttonsHtml += `
    <button type="button" class="sekolah-page-btn" ${nextDisabled} onclick="changeSekolahPage(${currentPage + 1})" title="Halaman Selanjutnya">
      ${isMobile ? '' : 'Selanjutnya'} <i class="bi bi-chevron-right"></i>
    </button>
  `;

  container.innerHTML = `
    <div class="sekolah-pagination-info">
      <i class="bi bi-info-circle-fill" style="color: #3b82f6;"></i>
      <span>Menampilkan <strong>${startIndex} - ${endIndex}</strong> dari <strong>${totalItems.toLocaleString('id-ID')}</strong> siswa (Halaman <strong>${currentPage}</strong> dari <strong>${totalPages}</strong>)</span>
    </div>
    <div class="sekolah-pagination-nav">
      ${buttonsHtml}
    </div>
  `;
}

function changeSekolahPage(targetPage) {
  currentSekolahPage = targetPage;
  renderSekolahView();

  // Scroll to top of table smoothly so user sees the new page
  const tableEl = document.getElementById('sekolahDataTable');
  if (tableEl) {
    const rect = tableEl.getBoundingClientRect();
    if (rect.top < 0) {
      window.scrollTo({
        top: window.pageYOffset + rect.top - 120,
        behavior: 'smooth'
      });
    }
  }
}

function renderCkgGratisPagination(totalItems, pageSize, currentPage, totalPages) {
  const container = document.getElementById('ckgGratisPaginationContainer');
  if (!container) return;

  if (totalItems === 0 || totalPages <= 1) {
    if (totalItems > 0 && totalPages <= 1) {
      container.style.display = 'flex';
      container.innerHTML = `
        <div class="sekolah-pagination-info">
          <i class="bi bi-info-circle-fill" style="color: #059669;"></i>
          <span>Menampilkan <strong>1 - ${totalItems}</strong> dari <strong>${totalItems.toLocaleString('id-ID')}</strong> pasien (Halaman <strong>1</strong> dari <strong>1</strong>)</span>
        </div>
        <div class="sekolah-pagination-nav">
          <button type="button" class="sekolah-page-btn active">1</button>
        </div>
      `;
    } else {
      container.style.display = 'none';
    }
    return;
  }

  container.style.display = 'flex';

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);
  const isMobile = isMobileOrApkView();

  const pages = generatePaginationPages(currentPage, totalPages, isMobile);

  let buttonsHtml = '';

  const prevDisabled = currentPage <= 1 ? 'disabled' : '';
  buttonsHtml += `
    <button type="button" class="sekolah-page-btn" ${prevDisabled} onclick="changeCkgGratisPage(${currentPage - 1})" title="Halaman Sebelumnya">
      <i class="bi bi-chevron-left"></i> ${isMobile ? '' : 'Sebelumnya'}
    </button>
  `;

  pages.forEach(p => {
    if (p === '...') {
      buttonsHtml += `<span class="sekolah-page-ellipsis">&hellip;</span>`;
    } else {
      const activeClass = p === currentPage ? 'active' : '';
      buttonsHtml += `
        <button type="button" class="sekolah-page-btn ${activeClass}" onclick="changeCkgGratisPage(${p})" title="Halaman ${p}">
          ${p}
        </button>
      `;
    }
  });

  const nextDisabled = currentPage >= totalPages ? 'disabled' : '';
  buttonsHtml += `
    <button type="button" class="sekolah-page-btn" ${nextDisabled} onclick="changeCkgGratisPage(${currentPage + 1})" title="Halaman Selanjutnya">
      ${isMobile ? '' : 'Selanjutnya'} <i class="bi bi-chevron-right"></i>
    </button>
  `;

  container.innerHTML = `
    <div class="sekolah-pagination-info">
      <i class="bi bi-info-circle-fill" style="color: #059669;"></i>
      <span>Menampilkan <strong>${startIndex} - ${endIndex}</strong> dari <strong>${totalItems.toLocaleString('id-ID')}</strong> pasien (Halaman <strong>${currentPage}</strong> dari <strong>${totalPages}</strong>)</span>
    </div>
    <div class="sekolah-pagination-nav">
      ${buttonsHtml}
    </div>
  `;
}

function changeCkgGratisPage(targetPage) {
  currentCkgGratisPage = targetPage;
  renderCkgGratisTable();

  const tableEl = document.getElementById('tableBodyCkgGratis');
  if (tableEl) {
    const rect = tableEl.getBoundingClientRect();
    if (rect.top < 0) {
      window.scrollTo({
        top: window.pageYOffset + rect.top - 120,
        behavior: 'smooth'
      });
    }
  }
}

// Window resize listener: automatically re-render with adapted page size if window crosses mobile breakpoint
if (typeof window !== 'undefined') {
  let lastIsMob = isMobileOrApkView();
  window.addEventListener('resize', () => {
    const currentIsMob = isMobileOrApkView();
    if (currentIsMob !== lastIsMob) {
      lastIsMob = currentIsMob;
      currentSekolahPage = 1;
      currentCkgGratisPage = 1;
      if (document.getElementById('tableBodySekolah')) {
        renderSekolahView();
      }
      if (document.getElementById('tableBodyCkgGratis')) {
        renderCkgGratisTable();
      }
    }
  });
}

function renderSekolahView() {
  const tbody = document.getElementById('tableBodySekolah');
  if (!tbody) return;

  const portalType = (sessionStorage.getItem('ckg_portal_type') || '').toLowerCase();
  const schoolAccountName = sessionStorage.getItem('ckg_user_name') || '';

  let chosenSekolah = (document.getElementById('filterSelectSekolah')?.value || '').trim().toUpperCase();
  // Khusus Akun Sekolah: Kunci sekolah otomatis dan paksa ke akun sendiri
  if (portalType === 'sekolah' && schoolAccountName) {
    chosenSekolah = schoolAccountName.trim().toUpperCase();
    const selSekolah = document.getElementById('filterSelectSekolah');
    if (selSekolah && selSekolah.value !== schoolAccountName) {
      selSekolah.value = schoolAccountName;
      selSekolah.disabled = true;
    }
  }

  const chosenKelas = (document.getElementById('filterSelectKelas')?.value || '').trim().toUpperCase();
  const chosenTahun = (document.getElementById('filterSelectTahun')?.value || '2026').trim();
  const searchQuery = (document.getElementById('searchSekolahRecords')?.value || '').trim().toLowerCase();

  // WAJIB PILIH SEKOLAH: Jika belum ada sekolah yang dipilih, data siswa TIDAK ditampilkan
  if (!chosenSekolah) {
    // Reset KPI Summary Metrics & Pill Counts ke 0
    ['metricSekolahTotal', 'metricSekolahSudah', 'metricSekolahBelum', 'metricSekolahSebagian',
      'pillCountTotal', 'pillCountSudah', 'pillCountBelum', 'pillCountSebagian'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
      });

    const pagContainer = document.getElementById('sekolahPaginationContainer');
    if (pagContainer) pagContainer.style.display = 'none';

    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 60px 20px; color: #64748b;">
          <div style="width: 72px; height: 72px; margin: 0 auto 16px auto; background: linear-gradient(135deg, #ecfdf5, #d1fae5); color: #059669; border: 2px dashed #34d399; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 4px 14px rgba(5,150,105,0.12);">
            <i class="bi bi-building"></i>
          </div>
          <div style="font-size: 17px; font-weight: 800; color: #064e3b; margin-bottom: 6px;">Silakan Pilih Sekolah Terlebih Dahulu</div>
          <p style="font-size: 13.5px; color: #64748b; max-width: 500px; margin: 0 auto 16px auto; line-height: 1.6;">
            Data siswa tidak ditampilkan sebelum nama sekolah dipilih. Silakan pilih nama sekolah pada menu filter <strong>"Pilih Sekolah"</strong> di atas.
          </p>
          <button type="button" class="btn-modern-sm" onclick="toggleSekolahDropdown(event)" style="display: inline-flex; align-items: center; gap: 8px; padding: 9px 22px; font-size: 13.5px; font-weight: 700; background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(16,185,129,0.3); transition: all 0.2s ease;">
            <i class="bi bi-search"></i> Pilih Sekolah Sekarang
          </button>
        </td>
      </tr>
    `;
    return;
  }

  let dataset = [...sekolahRecords];

  if (chosenSekolah) {
    dataset = dataset.filter(r => (r.sekolah || '').toUpperCase() === chosenSekolah);
  }

  if (chosenKelas) {
    dataset = dataset.filter(r => (r.kelas || '').toUpperCase() === chosenKelas);
  }

  if (chosenTahun && chosenTahun !== 'all') {
    dataset = dataset.filter(r => {
      const recYear = String(r.tahun_skrining || (r.tanggal_entry ? r.tanggal_entry.substring(0, 4) : '2026')).trim();
      if (recYear === chosenTahun) return true;
      if (Array.isArray(r.riwayat_pemeriksaan) && r.riwayat_pemeriksaan.length > 0) {
        return r.riwayat_pemeriksaan.some(h => {
          const hy = String(h.tahun || (h.tanggal_pemeriksaan ? h.tanggal_pemeriksaan.substring(0, 4) : '') || h.tahun_ajaran || '').trim();
          return hy === chosenTahun || hy.includes(chosenTahun);
        });
      }
      return false;
    });
  }

  if (searchQuery) {
    dataset = dataset.filter(r => {
      const nama = (r.nama || '').toLowerCase();
      const nik = String(r.nik || '').toLowerCase();
      const sekolah = (r.sekolah || '').toLowerCase();
      const kelas = (r.kelas || '').toLowerCase();
      const alamat = (r.alamat || '').toLowerCase();
      return nama.includes(searchQuery) || nik.includes(searchQuery) || sekolah.includes(searchQuery) || kelas.includes(searchQuery) || alamat.includes(searchQuery);
    });
  }

  const filterSekolahNikVal = document.getElementById('filterSekolahNik')?.value || '';
  if (filterSekolahNikVal === '16_digit') {
    dataset = dataset.filter(r => isNik16Digit(r.nik));
  } else if (filterSekolahNikVal === 'non_16_digit') {
    dataset = dataset.filter(r => getNikAnomalyStatus(r.nik).type !== 'valid');
  } else if (filterSekolahNikVal === 'nik_kurang') {
    dataset = dataset.filter(r => getNikAnomalyStatus(r.nik).type === 'kurang');
  } else if (filterSekolahNikVal === 'nik_lebih') {
    dataset = dataset.filter(r => getNikAnomalyStatus(r.nik).type === 'lebih');
  } else if (filterSekolahNikVal === 'nik_kosong') {
    dataset = dataset.filter(r => getNikAnomalyStatus(r.nik).type === 'kosong');
  }

  // Update Toolbar Badge Counters Realtime untuk sekolah aktif
  const currentSchoolRecords = sekolahRecords.filter(r => (r.sekolah || '').toUpperCase() === chosenSekolah);
  const anomaliNikCount = currentSchoolRecords.filter(r => getNikAnomalyStatus(r.nik).type !== 'valid').length;
  const femaleStudents = currentSchoolRecords.filter(r => r.jk === 'P');
  const ttdSiswiCount = femaleStudents.reduce((sum, s) => sum + getStudentTtdLogs(s).length, 0);

  const badgeAnomali = document.getElementById('badgeCountAnomaliNik');
  if (badgeAnomali) badgeAnomali.textContent = anomaliNikCount;
  const badgeTtd = document.getElementById('badgeCountTtdTotal');
  if (badgeTtd) badgeTtd.textContent = ttdSiswiCount;

  // Update KPI Summary Metrics (Calculated BEFORE status filtering so total counts stay accurate)
  const totalStudents = dataset.length;
  const sudahPeriksa = dataset.filter(r => isSekolahRecordExamined(r)).length;
  const periksaSebagian = dataset.filter(r => isSekolahRecordPartialExamined(r)).length;
  const belumPeriksa = dataset.filter(r => isSekolahRecordBelumExamined(r)).length;

  document.getElementById('metricSekolahTotal') && (document.getElementById('metricSekolahTotal').textContent = totalStudents.toLocaleString('id-ID'));
  document.getElementById('metricSekolahSudah') && (document.getElementById('metricSekolahSudah').textContent = sudahPeriksa.toLocaleString('id-ID'));
  document.getElementById('metricSekolahBelum') && (document.getElementById('metricSekolahBelum').textContent = belumPeriksa.toLocaleString('id-ID'));
  document.getElementById('metricSekolahSebagian') && (document.getElementById('metricSekolahSebagian').textContent = periksaSebagian.toLocaleString('id-ID'));

  // Update Pill Counts
  document.getElementById('pillCountTotal') && (document.getElementById('pillCountTotal').textContent = totalStudents.toLocaleString('id-ID'));
  document.getElementById('pillCountSudah') && (document.getElementById('pillCountSudah').textContent = sudahPeriksa.toLocaleString('id-ID'));
  document.getElementById('pillCountBelum') && (document.getElementById('pillCountBelum').textContent = belumPeriksa.toLocaleString('id-ID'));
  document.getElementById('pillCountSebagian') && (document.getElementById('pillCountSebagian').textContent = periksaSebagian.toLocaleString('id-ID'));

  // Apply Status Filter to the rendered table dataset
  if (currentSekolahStatusFilter === 'sudah') {
    dataset = dataset.filter(r => isSekolahRecordExamined(r));
  } else if (currentSekolahStatusFilter === 'belum') {
    dataset = dataset.filter(r => isSekolahRecordBelumExamined(r));
  } else if (currentSekolahStatusFilter === 'sebagian') {
    dataset = dataset.filter(r => isSekolahRecordPartialExamined(r));
  }

  if (dataset.length === 0) {
    let emptyIcon = 'bi-mortarboard';
    let emptyTitle = 'Tidak Ada Data Siswa Ditemukan';
    let emptyMsg = 'Pilih Sekolah & Kelas lain, atau klik tombol <strong>"Tambah Siswa"</strong> / <strong>"Import Data Excel"</strong> untuk menambahkan data.';

    if (currentSekolahStatusFilter === 'sudah' && totalStudents > 0) {
      emptyIcon = 'bi-clock-history';
      emptyTitle = 'Belum Ada Siswa yang Selesai Diperiksa Lengkap';
      emptyMsg = `Dari <strong>${totalStudents}</strong> siswa pada kelas ini, belum ada yang menyelesaikan ke-5 stasiun pemeriksaan (identitas, antro, lab, vital, organ). Klik tombol <strong>"Periksa"</strong> untuk melengkapi skrining.`;
    } else if (currentSekolahStatusFilter === 'belum' && totalStudents > 0) {
      emptyIcon = 'bi-check-circle-fill';
      emptyTitle = 'Semua Siswa Sudah Mulai Diperiksa! 🎉';
      emptyMsg = `Hebat! Seluruh <strong>${totalStudents}</strong> siswa pada kelas ini sudah memiliki data skrining (tidak ada yang belum diperiksa sama sekali).`;
    } else if (currentSekolahStatusFilter === 'sebagian' && totalStudents > 0) {
      emptyIcon = 'bi-check-circle-fill';
      emptyTitle = 'Tidak Ada Siswa yang Periksa Sebagian 👍';
      emptyMsg = 'Semua siswa yang telah diperiksa sudah menyelesaikan seluruh pos pemeriksaan secara lengkap.';
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 48px 20px; color: #64748b;">
          <div style="width: 56px; height: 56px; margin: 0 auto 12px auto; background: #eef2ff; color: #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 26px;">
            <i class="bi ${emptyIcon}"></i>
          </div>
          <div style="font-size: 15px; font-weight: 800; color: #1e293b; margin-bottom: 4px;">${emptyTitle}</div>
          <p style="font-size: 12.5px; color: #64748b; margin: 0;">${emptyMsg}</p>
        </td>
      </tr>
    `;
    return;
  }

  // Signature filter change check -> automatically reset to page 1 if any filter or search changed
  const currentFilterSignature = `${chosenSekolah}|${chosenKelas}|${chosenTahun}|${currentSekolahStatusFilter}|${filterSekolahNikVal}|${searchQuery}`;
  if (lastSekolahFilterSignature !== currentFilterSignature) {
    currentSekolahPage = 1;
    lastSekolahFilterSignature = currentFilterSignature;
  }

  const isMobileOrApk = isMobileOrApkView();
  const pageSize = isMobileOrApk ? 3 : 10;
  const totalItems = dataset.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (currentSekolahPage > totalPages) currentSekolahPage = totalPages;
  if (currentSekolahPage < 1) currentSekolahPage = 1;

  const startIndex = (currentSekolahPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pagedDataset = dataset.slice(startIndex, endIndex);

  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || '').toLowerCase();
  const isSekolahUser = (portalType === 'sekolah' || role === 'sekolah');

  tbody.innerHTML = pagedDataset.map((r, idx) => {
    const stations = getSekolahRecordExamStations(r);
    const { hasAntro, hasVital, hasLab, isLabTidakDiperiksa, hasOrgan, isComplete, isPartial, isBelum, completedCount } = stations;

    const safeId = escapeHtml(r.id || '');
    const safeNama = escapeHtml(r.nama || '-');
    const safeSekolah = escapeHtml(r.sekolah || '-');
    const safeKelas = escapeHtml(r.kelas || '-');
    const safeNik = escapeHtml(r.nik || '');
    const safeJk = r.jk === 'P' ? 'Perempuan' : 'Laki-laki';
    const jkColor = r.jk === 'P' ? '#ec4899' : '#4f46e5';

    // Status Checklist Items
    const checklistItems = [];
    if (hasAntro) {
      checklistItems.push(`<span class="status-check-badge antro"><i class="bi bi-check-circle-fill" style="color: #10b981;"></i> Antro</span>`);
    }
    if (hasVital) {
      checklistItems.push(`<span class="status-check-badge vital"><i class="bi bi-check-circle-fill" style="color: #3b82f6;"></i> Vital</span>`);
    }
    if (hasLab) {
      if (isLabTidakDiperiksa) {
        checklistItems.push(`<span class="status-check-badge lab" style="background: #fdf2f8; color: #be185d; border-color: #fbcfe8;"><i class="bi bi-check-circle-fill" style="color: #db2777;"></i> Lab (Tdk Periksa)</span>`);
      } else {
        checklistItems.push(`<span class="status-check-badge lab"><i class="bi bi-check-circle-fill" style="color: #ec4899;"></i> Lab</span>`);
      }
    }
    if (hasOrgan) {
      checklistItems.push(`<span class="status-check-badge organ"><i class="bi bi-check-circle-fill" style="color: #0d9488;"></i> Organ</span>`);
    }

    let statusBadge = '';
    if (isComplete) {
      statusBadge = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <span class="badge" style="background: #d1fae5; color: #065f46; border: 1.5px solid #a7f3d0; padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;">
            <i class="bi bi-check-circle-fill" style="color: #059669;"></i> Sudah Diperiksa
          </span>
          <div class="status-checklist">${checklistItems.join('')}</div>
        </div>
      `;
    } else if (isPartial) {
      statusBadge = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <span class="badge" style="background: #dbeafe; color: #1e40af; border: 1.5px solid #bfdbfe; padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;">
            <i class="bi bi-pie-chart-fill" style="color: #2563eb;"></i> Periksa Sebagian (${completedCount}/4)
          </span>
          <div class="status-checklist">${checklistItems.join('')}</div>
        </div>
      `;
    } else {
      statusBadge = `<span class="badge badge-amber" style="padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;"><i class="bi bi-clock-history"></i> Belum Diperiksa</span>`;
    }

    // Column Hasil Pemeriksaan: ONLY show chips for categories that have ACTUALLY been filled!
    let hasilChips = [];

    // 1. Antropometri
    if (hasAntro) {
      let imtStr = '-';
      let giziStr = r.status_imt || 'Normal';
      if (r.bb && r.tb) {
        const tbM = r.tb / 100;
        if (tbM > 0) {
          const val = (r.bb / (tbM * tbM));
          imtStr = val.toFixed(1);
          if (val < 17.0) giziStr = 'Sangat Kurus';
          else if (val < 18.5) giziStr = 'Kurus';
          else if (val <= 25.0) giziStr = 'Normal';
          else if (val <= 27.0) giziStr = 'Gemuk';
          else giziStr = 'Obesitas';
        }
      }
      hasilChips.push(`
        <span style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 7px; border-radius: 6px; font-weight: 600; color: #065f46;">
          <strong>Antro:</strong> ${r.bb || '-'}kg / ${r.tb || '-'}cm (IMT: ${imtStr} - ${escapeHtml(giziStr)})
        </span>
      `);
    }

    // 2. Tanda Vital
    if (hasVital) {
      const tdStr = (r.td_sistolik && r.td_diastolik) ? `${r.td_sistolik}/${r.td_diastolik}` : `${r.td_sistolik || '-'}`;
      const tdKat = getKategoriTekananDarah(r.td_sistolik, r.td_diastolik);
      hasilChips.push(`
        <span style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 2px 7px; border-radius: 6px; font-weight: 600; color: #1e40af;">
          <strong>TD:</strong> ${tdStr} mmHg ${tdKat ? `(${escapeHtml(tdKat)})` : ''}
        </span>
      `);
    }

    // 3. Laboratorium
    if (hasLab) {
      if (isLabTidakDiperiksa) {
        hasilChips.push(`
          <span style="background: #fdf2f8; border: 1px solid #fbcfe8; padding: 2px 7px; border-radius: 6px; font-weight: 700; color: #9d174d; display: inline-flex; align-items: center; gap: 4px;">
            <i class="bi bi-slash-circle" style="color: #db2777;"></i> <strong>Lab:</strong> Tidak Diperiksa
          </span>
        `);
      } else {
        const ageLab = getAgeFromDOB(r.tanggal_lahir);
        if (r.hb && r.hb !== '-' && String(r.hb).trim() !== '') {
          const hbKat = getKategoriHb(r.hb, ageLab, r.jk);
          hasilChips.push(`
            <span style="background: #fdf2f8; border: 1px solid #fbcfe8; padding: 2px 7px; border-radius: 6px; font-weight: 600; color: #9d174d;">
              <strong>HB:</strong> ${escapeHtml(r.hb)} g/dL ${hbKat ? `(${escapeHtml(hbKat)})` : ''}
            </span>
          `);
        }
        if (r.gula_darah && r.gula_darah !== '-' && String(r.gula_darah).trim() !== '') {
          const gdsKat = getKategoriGulaDarah(r.gula_darah, ageLab);
          hasilChips.push(`
            <span style="background: #fdf4ff; border: 1px solid #f5d0fe; padding: 2px 7px; border-radius: 6px; font-weight: 600; color: #86198f;">
              <strong>Gula:</strong> ${escapeHtml(r.gula_darah)} mg/dL ${gdsKat ? `(${escapeHtml(gdsKat)})` : ''}
            </span>
          `);
        }
      }
    }

    // 4. Organ Indera
    if (hasOrgan) {
      const telingaStr = r.telinga || 'Normal';
      const gigiStr = r.gigi || 'Bebas Karies';
      const mataStr = r.mata || 'Normal';
      const kukuStr = r.kuku || 'Pendek Bersih';
      const kebugaranStr = r.kebugaran || 'Baik';
      hasilChips.push(`
        <span style="background: #f0fdfa; border: 1px solid #99f6e4; padding: 2px 7px; border-radius: 6px; font-weight: 600; color: #115e59;">
          <strong>Gigi:</strong> ${escapeHtml(gigiStr)}
        </span>
      `);
      hasilChips.push(`
        <span style="background: #fdf4ff; border: 1px solid #f5d0fe; padding: 2px 7px; border-radius: 6px; font-weight: 600; color: #86198f;">
          <strong>Mata:</strong> ${escapeHtml(mataStr)}
        </span>
      `);
      hasilChips.push(`
        <span style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 7px; border-radius: 6px; font-weight: 600; color: #047857;">
          <strong>Kuku:</strong> ${escapeHtml(kukuStr)}
        </span>
      `);
      hasilChips.push(`
        <span style="background: #fffbeb; border: 1px solid #fef3c7; padding: 2px 7px; border-radius: 6px; font-weight: 600; color: #92400e;">
          <strong>Telinga:</strong> ${escapeHtml(telingaStr)}
        </span>
      `);
      hasilChips.push(`
        <span style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 7px; border-radius: 6px; font-weight: 600; color: #475569;">
          <strong>Kebugaran:</strong> ${escapeHtml(kebugaranStr)}
        </span>
      `);
      if (r.jk === 'P' && r.menstruasi && r.menstruasi !== '-') {
        hasilChips.push(`
          <span style="background: #fdf2f8; border: 1px solid #fbcfe8; padding: 2px 7px; border-radius: 6px; font-weight: 600; color: #be185d;">
            <strong>Menstruasi:</strong> ${escapeHtml(r.menstruasi)}
          </span>
        `);
      }
      if (r.jk === 'P') {
        const studentTtdLogs = getStudentTtdLogs(r);
        if (studentTtdLogs.length > 0) {
          const lastLog = studentTtdLogs[0];
          hasilChips.push(`
            <span style="background: #fdf2f8; border: 1.5px solid #f472b6; padding: 2px 7px; border-radius: 6px; font-weight: 700; color: #9d174d; display: inline-flex; align-items: center; gap: 4px;" title="Terakhir minum TTD: ${escapeHtml(lastLog.tanggal || '')} ${escapeHtml(lastLog.waktu || '')}">
              🌸 <strong>TTD:</strong> ${studentTtdLogs.length}x
            </span>
          `);
        }
      }
      if (r.jk === 'L' && r.merokok && r.merokok !== '-') {
        let smokeBadge = r.merokok;
        if (r.merokok === 'Aktif') {
          const detailParts = [];
          if (r.jenis_rokok && r.jenis_rokok !== '-') detailParts.push(r.jenis_rokok);
          if (r.jenis_rokok === 'Konvensional') {
            if (r.intensitas_merokok && r.intensitas_merokok !== '-') detailParts.push(r.intensitas_merokok);
            if (r.jumlah_batang && r.jumlah_batang !== '-' && r.jumlah_batang !== '0') detailParts.push(`${r.jumlah_batang} btg`);
          }
          if (detailParts.length > 0) smokeBadge += ` (${detailParts.join(', ')})`;
        }
        const badgeBg = r.merokok === 'Aktif' ? '#fef2f2' : (r.merokok === 'Pasif' ? '#fff7ed' : '#f0fdf4');
        const badgeBorder = r.merokok === 'Aktif' ? '#fecaca' : (r.merokok === 'Pasif' ? '#fed7aa' : '#bbf7d0');
        const badgeColor = r.merokok === 'Aktif' ? '#dc2626' : (r.merokok === 'Pasif' ? '#c2410c' : '#16a34a');
        hasilChips.push(`
          <span style="background: ${badgeBg}; border: 1px solid ${badgeBorder}; padding: 2px 7px; border-radius: 6px; font-weight: 600; color: ${badgeColor};">
            <strong>Merokok:</strong> ${escapeHtml(smokeBadge)}
          </span>
        `);
      }
    }

    // 5. Catatan Rujukan (jika ada)
    if (r.catatan_rujukan && r.catatan_rujukan !== '-' && String(r.catatan_rujukan).trim() !== '') {
      hasilChips.push(`
        <span style="background: #fef2f2; border: 1px solid #fecaca; padding: 2px 7px; border-radius: 6px; font-weight: 700; color: #dc2626;">
          <strong>Rujukan:</strong> ${escapeHtml(r.catatan_rujukan)}
        </span>
      `);
    }

    const hasPastHistory = Array.isArray(r.riwayat_pemeriksaan) && r.riwayat_pemeriksaan.length > 0;
    const hasilContent = hasilChips.length > 0
      ? `<div style="display: flex; gap: 4px; flex-wrap: wrap; font-size: 11px;">${hasilChips.join('')}</div>`
      : (hasPastHistory
        ? `<span style="font-size: 11px; color: #1e40af; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><i class="bi bi-clock-history"></i> Belum diperiksa <span style="font-size: 10px; color: #64748b;">(ada ${r.riwayat_pemeriksaan.length} riwayat arsip)</span></span>`
        : `<span style="font-size: 11.5px; color: #94a3b8; font-style: italic;">Belum ada pemeriksaan</span>`);

    return `
      <tr style="cursor: pointer; transition: background 0.15s ease;">
        <!-- Column 1: No -->
        <td style="text-align: center; font-weight: 800; color: #64748b; font-size: 12px; vertical-align: middle;">
          ${startIndex + idx + 1}
        </td>

        <!-- Column 2: Nama Siswa (Clickable to open examination popup) -->
        <td onclick="openPemeriksaanModal('${safeId}')" style="vertical-align: middle;">
          <div style="font-size: 14.5px; font-weight: 800; color: #4f46e5; display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
            <i class="bi bi-person-fill" style="color: ${jkColor}; font-size: 16px;"></i>
            <span>${safeNama}</span>
            ${isStudentInBankData(r) ? `<i class="bi bi-check-circle-fill" style="color: #10b981; font-size: 14px; line-height: 1; flex-shrink: 0;" title="Terdaftar di Bank Data (Cek Kesehatan Gratis / ASIK)"></i>` : ''}
            <i class="bi bi-box-arrow-up-right" style="font-size: 11px; color: #94a3b8; margin-left: 2px;"></i>
          </div>
          <div style="font-size: 11.5px; color: #64748b; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <span><strong style="color: #475569;">NIK:</strong> ${safeNik || '-'} ${(() => {
        const nikStat = getNikAnomalyStatus(r.nik);
        if (nikStat.type !== 'valid') {
          return `<span class="badge" style="font-size: 9px; padding: 1.5px 5px; background: ${nikStat.bg}; color: ${nikStat.color}; border: 1px solid ${nikStat.border}; font-weight: 700;" title="${nikStat.label}"><i class="bi bi-exclamation-triangle-fill"></i> ${nikStat.label}</span>`;
        }
        return '';
      })()}</span>
            <span>&bull;</span>
            <span style="color: ${jkColor}; font-weight: 700;">${safeJk}</span>
            ${(() => {
        const a = calculateRealtimeAge(r.tanggal_lahir);
        return a ? `<span>&bull;</span><span style="font-weight: 700; color: #047857;">${a.years} Th</span>` : '';
      })()}
          </div>
        </td>

        <!-- Column 3: Sekolah & Kelas -->
        <td onclick="openPemeriksaanModal('${safeId}')" style="vertical-align: middle;">
          <div style="font-weight: 800; color: #1e293b; font-size: 13px; margin-bottom: 2px;">
            ${safeSekolah}
          </div>
          ${safeKelas.toUpperCase() === 'LULUS'
        ? `<span class="badge badge-emerald" style="font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px; background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;"><i class="bi bi-mortarboard-fill"></i> LULUS</span>`
        : `<span class="badge badge-purple" style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">${safeKelas}</span>`
      }
          <span class="badge" style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; margin-left: 3px;" title="Tahun CKG Skrining"><i class="bi bi-calendar-check"></i> ${escapeHtml(r.tahun_skrining || '2026')}</span>
          ${hasPastHistory
        ? `<div style="margin-top: 3px;">
                <span style="font-size: 10px; font-weight: 700; color: #1e40af; background: #eff6ff; border: 1px solid #bfdbfe; padding: 1px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;" title="${r.riwayat_pemeriksaan.length} riwayat skrining tersimpan">
                  <i class="bi bi-clock-history"></i> ${r.riwayat_pemeriksaan.length} Riwayat
                </span>
               </div>`
        : ''
      }
        </td>

        <!-- Column 4: Status Skrining (Checklist) -->
        <td onclick="openPemeriksaanModal('${safeId}')" style="text-align: center; vertical-align: middle;">
          ${statusBadge}
        </td>

        <!-- Column 5: Hasil Pemeriksaan (Clean Chips) -->
        <td onclick="openPemeriksaanModal('${safeId}')" style="vertical-align: middle;">
          ${hasilContent}
        </td>

        <!-- Column 6: Aksi -->
        <td style="text-align: center; vertical-align: middle;">
          <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary btn-sm" onclick="openPemeriksaanModal('${safeId}')" title="Periksa / Edit Siswa" style="padding: 5px 9px; font-size: 11px; border-radius: 8px;">
              <i class="bi bi-heart-pulse"></i> Periksa
            </button>
            ${r.jk === 'P' ? `
            <button type="button" class="btn btn-sm" onclick="catatAbsenMinumTtd('${safeId}')" title="Absen Minum Tablet Tambah Darah (TTD)" style="padding: 5px 8px; font-size: 11px; border-radius: 8px; background: #fdf2f8; color: #db2777; border: 1.5px solid #fbcfe8; font-weight: 700;">
              <i class="bi bi-capsule"></i> TTD
            </button>
            ` : ''}
            ${!isSekolahUser ? `
            <button type="button" class="btn btn-sm" onclick="sendSingleSekolahToBotQueue('${safeId}')" title="Kirim Siswa Ini ke Antrean Bot ENCO" style="padding: 5px 8px; font-size: 11px; border-radius: 8px; background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;">
              <i class="bi bi-robot"></i>
            </button>
            ` : ''}
            ${!isSekolahUser ? `
            <button type="button" class="btn btn-sm btn-print-siswa" onclick="cetakHasilSiswaIndividu('${safeId}')" title="Cetak Surat / Lembar Hasil Pemeriksaan Siswa Ini" style="padding: 5px 8px; font-size: 11px; border-radius: 8px; background: #0d9488; color: #fff;">
              <i class="bi bi-printer-fill"></i>
            </button>
            ` : ''}
            <button type="button" class="btn btn-danger btn-sm" onclick="deleteSiswaSekolah('${safeId}')" title="Hapus Siswa" style="padding: 5px 8px; font-size: 11px; border-radius: 8px;">
              <i class="bi bi-trash-fill"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderSekolahPagination(totalItems, pageSize, currentSekolahPage, totalPages);
}

// --------------------------------------------------------------------------
// 🩺 POP-UP PEMERIKSAAN & IDENTITAS SISWA (MULTI-USER ISOLATED)
// --------------------------------------------------------------------------

function openFormPosPopup(posKey) {
  const siswaId = document.getElementById('periksaSiswaId')?.value;
  const siswa = sekolahRecords.find(r => r.id === siswaId);
  if (!siswa) {
    showToast('Data siswa tidak ditemukan.', 'warning');
    return;
  }

  // VALIDASI MUTLAK: Sebelum melakukan pemeriksaan fisik/klinis, WAJIB melengkapi identitas!
  if (posKey !== 'identitas') {
    if (!isSiswaIdentitasComplete(siswa)) {
      const missing = getMissingIdentitasFields(siswa);
      Swal.fire({
        icon: 'warning',
        title: 'Lengkapi Identitas Terlebih Dahulu!',
        html: `
          <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #334155;">
            Sebelum memulai pengisian pemeriksaan fisik / klinis, Anda <strong>diwajibkan melengkapi data identitas siswa</strong> terlebih dahulu.
            <div style="background: #fff1f2; border: 1.5px solid #fecaca; border-radius: 10px; padding: 10px 14px; margin: 12px 0; color: #9f1239;">
              <strong style="font-size: 13px;"><i class="bi bi-exclamation-triangle-fill"></i> Data yang belum lengkap:</strong>
              <ul style="margin: 6px 0 0 18px; padding: 0;">
                ${missing.map(m => `<li>${escapeHtml(m)}</li>`).join('')}
              </ul>
            </div>
            <span style="font-size: 12px; color: #64748b;">Silakan lengkapi NIK 16 digit dan Tanggal Lahir pada Format 1 (Identitas).</span>
          </div>
        `,
        confirmButtonText: '<i class="bi bi-pencil-square"></i> Lengkapi Identitas Sekarang',
        confirmButtonColor: '#059669',
        showCancelButton: true,
        cancelButtonText: 'Batal'
      }).then(res => {
        if (res.isConfirmed) {
          openFormPosPopup('identitas');
        }
      });
      return;
    }
  }

  // Set student banner inside form popup
  const titleEl = document.getElementById('formPosModalTitle');
  const namaEl = document.getElementById('formPosNamaSiswa');
  const subInfoEl = document.getElementById('formPosSubInfo');
  const avatarEl = document.getElementById('formPosAvatar');

  if (namaEl) namaEl.textContent = siswa.nama || 'Nama Siswa';
  if (subInfoEl) {
    const safeJk = siswa.jk === 'P' ? 'Perempuan' : 'Laki-laki';
    let cleanKelas = String(siswa.kelas || '-').trim();
    if (/^kelas\s+/i.test(cleanKelas)) {
      cleanKelas = cleanKelas.replace(/^kelas\s+/i, '').trim();
    }
    const safeKelas = (!cleanKelas || cleanKelas === '-') ? '-' : `KELAS ${cleanKelas}`;
    const safeAgeInfo = (() => {
      const a = calculateRealtimeAge(siswa.tanggal_lahir);
      return a ? ` &bull; ${a.years} Th` : '';
    })();
    subInfoEl.innerHTML = `${escapeHtml(siswa.sekolah || 'Nama Sekolah')} &bull; ${escapeHtml(safeKelas)} &bull; ${escapeHtml(safeJk)}${safeAgeInfo}`;
  }
  if (avatarEl) avatarEl.textContent = (siswa.nama || 'S').charAt(0).toUpperCase();

  if (posKey === 'identitas' || posKey === 'semua') {
    updatePeriksaSiswaKelasDropdown(siswa.kelas);
    initWilayahDropdownsSekolah(
      siswa.provinsi || 'Jawa Barat',
      siswa.kab_kota || 'Kabupaten Bandung',
      siswa.kecamatan || 'Banjaran',
      siswa.kelurahan || 'Tarajusari'
    );
    applyBankDataStateToIdentitas(siswa);
  }

  const titleMap = {
    identitas: '<i class="bi bi-person-vcard-fill" style="color: #10b981;"></i> Format 1: Identitas & Domisili Siswa',
    antro: '<i class="bi bi-person-arms-up" style="color: #0284c7;"></i> Format 2: Antropometri & Status Gizi',
    vital: '<i class="bi bi-heart-pulse-fill" style="color: #ef4444;"></i> Format 3: Tanda Vital (Tekanan Darah)',
    lab: '<i class="bi bi-droplet-fill" style="color: #d946ef;"></i> Format 4: Pemeriksaan Laboratorium Sederhana',
    organ: '<i class="bi bi-eye-fill" style="color: #0d9488;"></i> Format 5: Organ Indera & Spesifik UKS',
    kesimpulan: '<i class="bi bi-clipboard2-pulse-fill" style="color: #f59e0b;"></i> Format 6: Kesimpulan & Rujukan (Opsional)',
    semua: '<i class="bi bi-card-checklist" style="color: #059669;"></i> Pemeriksaan Lengkap (Semua Format Sekaligus)'
  };

  if (titleEl) titleEl.innerHTML = titleMap[posKey] || '<i class="bi bi-pencil-square"></i> Format Pemeriksaan';

  // Toggle form panels
  const panels = ['identitas', 'antro', 'vital', 'lab', 'organ', 'kesimpulan'];
  panels.forEach(p => {
    const el = document.getElementById(`panelPemeriksaan${p.charAt(0).toUpperCase() + p.slice(1)}`);
    if (el) el.style.display = (posKey === 'semua' || posKey === p) ? 'block' : 'none';
  });

  const globalFooter = document.getElementById('panelPemeriksaanSemuaFooter');
  if (globalFooter) {
    if (posKey === 'semua') {
      globalFooter.classList.add('is-active-semua');
      globalFooter.style.setProperty('display', 'flex', 'important');
    } else {
      globalFooter.classList.remove('is-active-semua');
      globalFooter.style.setProperty('display', 'none', 'important');
    }
  }

  // Hide Menu Popup, Show Form Popup
  const mMenu = document.getElementById('modalPemeriksaanSiswa');
  if (mMenu) {
    mMenu.classList.remove('active', 'open');
    mMenu.style.display = 'none';
  }

  const mForm = document.getElementById('modalFormPosSiswa');
  if (mForm) {
    mForm.classList.add('active', 'open');
    mForm.style.display = 'flex';
  }
}

function closeFormPosPopup() {
  const globalFooter = document.getElementById('panelPemeriksaanSemuaFooter');
  if (globalFooter) {
    globalFooter.classList.remove('is-active-semua');
    globalFooter.style.setProperty('display', 'none', 'important');
  }

  // Hide Form Popup, Re-open Menu Popup
  const mForm = document.getElementById('modalFormPosSiswa');
  if (mForm) {
    mForm.classList.remove('active', 'open');
    mForm.style.display = 'none';
  }

  const mMenu = document.getElementById('modalPemeriksaanSiswa');
  if (mMenu) {
    mMenu.classList.add('active', 'open');
    mMenu.style.display = 'flex';
  }

  const siswaId = document.getElementById('periksaSiswaId')?.value;
  const siswa = sekolahRecords.find(r => r.id === siswaId);
  if (siswa) updateSekolahMenuBadges(siswa);
}

function switchSekolahModalTab(tabKey) {
  if (tabKey === 'menu') {
    closeFormPosPopup();
  } else {
    openFormPosPopup(tabKey);
  }
}

function updateSekolahMenuBadges(siswa) {
  if (!siswa) return;

  const stations = getSekolahRecordExamStations(siswa);
  const { hasAntro, hasVital, hasLab, isLabTidakDiperiksa, hasOrgan, hasKesimpulan } = stations;
  const isIdComplete = isSiswaIdentitasComplete(siswa);

  // 1. Identitas (Wajib Lengkap Sebelum Pemeriksaan Fisik)
  const bIdentitas = document.getElementById('badgePosMenuIdentitas');
  const btnIdentitas = document.getElementById('btnPosMenuIdentitas');
  const bAntro = document.getElementById('badgePosMenuAntro');
  const btnAntro = document.getElementById('btnPosMenuAntro');
  const bVital = document.getElementById('badgePosMenuVital');
  const btnVital = document.getElementById('btnPosMenuVital');
  const bLab = document.getElementById('badgePosMenuLab');
  const btnLab = document.getElementById('btnPosMenuLab');
  const bOrgan = document.getElementById('badgePosMenuOrgan');
  const btnOrgan = document.getElementById('btnPosMenuOrgan');
  const bKesimpulan = document.getElementById('badgePosMenuKesimpulan');
  const btnKesimpulan = document.getElementById('btnPosMenuKesimpulan');

  if (bIdentitas) {
    if (isIdComplete) {
      bIdentitas.innerHTML = `<span class="badge badge-pos-done"><i class="bi bi-check-circle-fill"></i> Lengkap</span>`;
      btnIdentitas?.classList.add('is-done');
    } else {
      bIdentitas.innerHTML = `<span class="badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;"><i class="bi bi-exclamation-triangle-fill"></i> Belum Lengkap (Wajib)</span>`;
      btnIdentitas?.classList.remove('is-done');
    }
  }

  // Tampilkan Banner Peringatan jika identitas belum lengkap
  const bannerId = document.getElementById('bannerIdentitasWajib');
  const textMissing = document.getElementById('textDetailMissingIdentitas');
  if (bannerId) {
    if (!isIdComplete) {
      bannerId.style.display = 'flex';
      if (textMissing) {
        textMissing.textContent = `Data belum lengkap: ${getMissingIdentitasFields(siswa).join(', ')}. Harap isi Pos 1. Identitas terlebih dahulu.`;
      }
    } else {
      bannerId.style.display = 'none';
    }
  }

  // Khusus Siswa Perempuan: TTD di modal pemeriksaan ditiadakan per permintaan user
  const cardTtd = document.getElementById('sekolahCardTtdRemajaPutri');
  if (cardTtd) {
    cardTtd.style.display = 'none';
  }

  const subsequentBtns = [
    { btn: btnAntro, badge: bAntro, name: 'Antropometri' },
    { btn: btnVital, badge: bVital, name: 'Tanda Vital' },
    { btn: btnLab, badge: bLab, name: 'Laboratorium' },
    { btn: btnOrgan, badge: bOrgan, name: 'Organ Indera' },
    { btn: btnKesimpulan, badge: bKesimpulan, name: 'Kesimpulan & Rujukan' }
  ];

  if (!isIdComplete) {
    // KUNCI SELURUH FORM BERIKUTNYA JIKA IDENTITAS BELUM LENGKAP
    subsequentBtns.forEach(item => {
      if (item.btn) {
        item.btn.classList.remove('is-done');
        item.btn.classList.add('is-locked');
        item.btn.style.opacity = '0.5';
        item.btn.style.cursor = 'not-allowed';
        item.btn.style.backgroundColor = '#f8fafc';
        item.btn.style.borderColor = '#cbd5e1';
        item.btn.title = 'Terkunci: Wajib melengkapi seluruh data identitas siswa terlebih dahulu!';
      }
      if (item.badge) {
        item.badge.innerHTML = `<span class="badge" style="background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1;"><i class="bi bi-lock-fill"></i> Terkunci</span>`;
      }
    });
  } else {
    // BUKA KUNCI JIKA IDENTITAS SUDAH LENGKAP
    subsequentBtns.forEach(item => {
      if (item.btn) {
        item.btn.classList.remove('is-locked');
        item.btn.style.opacity = '1';
        item.btn.style.cursor = 'pointer';
        item.btn.style.backgroundColor = '';
        item.btn.style.borderColor = '';
        item.btn.title = '';
      }
    });

    // 2. Antropometri
    if (bAntro) {
      if (hasAntro) {
        bAntro.innerHTML = `<span class="badge badge-pos-done"><i class="bi bi-check-circle-fill"></i> Terisi (${siswa.bb || 0}kg/${siswa.tb || 0}cm)</span>`;
        btnAntro?.classList.add('is-done');
      } else {
        bAntro.innerHTML = `<span class="badge badge-pos-pending"><i class="bi bi-hourglass-split"></i> Belum</span>`;
        btnAntro?.classList.remove('is-done');
      }
    }

    // 3. Tanda Vital
    if (bVital) {
      if (hasVital) {
        bVital.innerHTML = `<span class="badge badge-pos-done"><i class="bi bi-check-circle-fill"></i> Terisi (${siswa.td_sistolik}/${siswa.td_diastolik || 0})</span>`;
        btnVital?.classList.add('is-done');
      } else {
        bVital.innerHTML = `<span class="badge badge-pos-pending"><i class="bi bi-hourglass-split"></i> Belum</span>`;
        btnVital?.classList.remove('is-done');
      }
    }

    // 4. Lab
    if (bLab) {
      if (isLabTidakDiperiksa) {
        bLab.innerHTML = `<span class="badge badge-pos-done" style="background:#fce7f3; color:#be185d; border:1px solid #fbcfe8;"><i class="bi bi-check-circle-fill" style="color:#db2777;"></i> Terisi (Tidak Diperiksa)</span>`;
        btnLab?.classList.add('is-done');
      } else if (hasLab) {
        const parts = [];
        if (siswa.hb && siswa.hb !== '-' && siswa.hb !== 'Tidak Diperiksa') parts.push(`Hb ${siswa.hb}`);
        if (siswa.gula_darah && siswa.gula_darah !== '-' && siswa.gula_darah !== 'Tidak Diperiksa') parts.push(`GDS ${siswa.gula_darah}`);
        bLab.innerHTML = `<span class="badge badge-pos-done"><i class="bi bi-check-circle-fill"></i> Terisi ${parts.length ? `(${parts.join(', ')})` : ''}</span>`;
        btnLab?.classList.add('is-done');
      } else {
        bLab.innerHTML = `<span class="badge badge-pos-pending"><i class="bi bi-hourglass-split"></i> Belum</span>`;
        btnLab?.classList.remove('is-done');
      }
    }

    // 5. Organ Indera
    if (bOrgan) {
      if (hasOrgan) {
        bOrgan.innerHTML = `<span class="badge badge-pos-done"><i class="bi bi-check-circle-fill"></i> Terisi (Selesai)</span>`;
        btnOrgan?.classList.add('is-done');
      } else {
        bOrgan.innerHTML = `<span class="badge badge-pos-pending"><i class="bi bi-hourglass-split"></i> Belum</span>`;
        btnOrgan?.classList.remove('is-done');
      }
    }

    // 6. Kesimpulan & Rujukan (Opsional)
    if (bKesimpulan) {
      if (hasKesimpulan) {
        const statLabel = siswa.status_kesehatan || 'Terisi';
        bKesimpulan.innerHTML = `<span class="badge badge-pos-done"><i class="bi bi-check-circle-fill"></i> Terisi (${escapeHtml(statLabel)})</span>`;
        btnKesimpulan?.classList.add('is-done');
      } else {
        bKesimpulan.innerHTML = `<span class="badge" style="background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1;"><i class="bi bi-dash-circle"></i> Opsional</span>`;
        btnKesimpulan?.classList.remove('is-done');
      }
    }
  }

  // Ringkasan hasil pemeriksaan yang sudah terisi
  const elRingkasan = document.getElementById('modalMenuHasilRingkasan');
  if (elRingkasan) {
    const chips = [];
    if (hasAntro) chips.push(`<span class="status-check-badge antro"><i class="bi bi-check-circle-fill" style="color:#10b981;"></i> Antro: ${siswa.bb || '-'}kg / ${siswa.tb || '-'}cm</span>`);
    if (hasVital) chips.push(`<span class="status-check-badge vital"><i class="bi bi-check-circle-fill" style="color:#3b82f6;"></i> TD: ${siswa.td_sistolik || '-'}/${siswa.td_diastolik || '-'}</span>`);
    if (isLabTidakDiperiksa) {
      chips.push(`<span class="status-check-badge lab" style="background:#fdf2f8; color:#be185d; border:1px solid #fbcfe8;"><i class="bi bi-check-circle-fill" style="color:#db2777;"></i> Lab: Tidak Diperiksa</span>`);
    } else if (hasLab) {
      if (siswa.hb && siswa.hb !== '-' && siswa.hb !== 'Tidak Diperiksa') chips.push(`<span class="status-check-badge lab"><i class="bi bi-check-circle-fill" style="color:#ec4899;"></i> Hb: ${siswa.hb}</span>`);
      if (siswa.gula_darah && siswa.gula_darah !== '-' && siswa.gula_darah !== 'Tidak Diperiksa') chips.push(`<span class="status-check-badge lab"><i class="bi bi-check-circle-fill" style="color:#ec4899;"></i> Gula: ${siswa.gula_darah}</span>`);
    }
    if (hasOrgan) chips.push(`<span class="status-check-badge organ"><i class="bi bi-check-circle-fill" style="color:#0d9488;"></i> Organ Indera (Selesai)</span>`);

    elRingkasan.innerHTML = chips.length > 0
      ? `<div style="display: flex; gap: 6px; flex-wrap: wrap;">${chips.join('')}</div>`
      : `<span style="color: #94a3b8; font-style: italic;">Belum ada pos pemeriksaan yang diisi.</span>`;
  }
}

function openPemeriksaanModal(siswaId, defaultTab = 'menu') {
  const siswa = sekolahRecords.find(r => r.id === siswaId);
  if (!siswa) {
    showToast('Data siswa tidak ditemukan.', 'warning');
    return;
  }

  // Buka modal segera agar pengguna langsung melihat tampilan pemeriksaan
  const modal = document.getElementById('modalPemeriksaanSiswa');
  if (modal) {
    modal.classList.add('active', 'open');
    modal.style.display = 'flex';
  }

  document.getElementById('periksaSiswaId').value = siswa.id;
  document.getElementById('displayNamaSiswa').textContent = siswa.nama || 'Nama Siswa';
  document.getElementById('displaySekolahSiswa').textContent = siswa.sekolah || 'Nama Sekolah';
  document.getElementById('displayKelasSiswa').textContent = siswa.kelas || 'Kelas';
  document.getElementById('displayTahunSiswa') && (document.getElementById('displayTahunSiswa').textContent = `Tahun CKG ${siswa.tahun_skrining || '2026'}`);

  const ageObjModal = calculateRealtimeAge(siswa.tanggal_lahir);
  const safeAgeModalStr = ageObjModal ? ` - ${ageObjModal.years} Th` : '';
  document.getElementById('displayJkSiswa').textContent = `${siswa.jk === 'P' ? 'Perempuan' : 'Laki-laki'}${safeAgeModalStr}`;
  document.getElementById('badgeAvatarSiswa').textContent = (siswa.nama || 'S').charAt(0).toUpperCase();

  const stationsModal = getSekolahRecordExamStations(siswa);
  const badgeStatus = document.getElementById('badgeStatusSkrining');
  if (badgeStatus) {
    if (siswa.status_kesehatan === 'Perlu Rujukan') {
      badgeStatus.style.background = '#fef2f2';
      badgeStatus.style.border = '1.5px solid #ef4444';
      badgeStatus.style.color = '#dc2626';
      badgeStatus.textContent = 'PERLU RUJUKAN';
    } else if (siswa.status_kesehatan === 'Perlu Perhatian') {
      badgeStatus.style.background = '#fffbeb';
      badgeStatus.style.border = '1.5px solid #f59e0b';
      badgeStatus.style.color = '#d97706';
      badgeStatus.textContent = 'PERLU PERHATIAN';
    } else if (stationsModal.isComplete) {
      badgeStatus.style.background = '#d1fae5';
      badgeStatus.style.border = '1.5px solid #059669';
      badgeStatus.style.color = '#065f46';
      badgeStatus.textContent = 'SUDAH DIPERIKSA (LENGKAP)';
    } else if (stationsModal.isPartial) {
      badgeStatus.style.background = '#dbeafe';
      badgeStatus.style.border = '1.5px solid #2563eb';
      badgeStatus.style.color = '#1e40af';
      badgeStatus.textContent = `PERIKSA SEBAGIAN (${stationsModal.completedCount}/4)`;
    } else {
      badgeStatus.style.background = '#fef3c7';
      badgeStatus.style.border = '1.5px solid #f59e0b';
      badgeStatus.style.color = '#b45309';
      badgeStatus.textContent = 'BELUM DIPERIKSA';
    }
  }

  // Populate Section 1: Identitas
  document.getElementById('periksaNama').value = siswa.nama || '';
  document.getElementById('periksaNik').value = siswa.nik || '';
  document.getElementById('periksaJk').value = siswa.jk || 'L';
  const periksaJkSelect = document.getElementById('periksaJk');
  if (periksaJkSelect) {
    periksaJkSelect.onchange = () => {
      const curJk = periksaJkSelect.value;
      updateGenderSpecificVisibility(curJk);
      calculateSiswaLabCategory();
    };
  }
  populateSchoolSelectElement('periksaSekolah');
  if (siswa.sekolah) document.getElementById('periksaSekolah').value = siswa.sekolah;
  // Khusus Akun Sekolah: Kunci sekolah pada modal periksa ke akun sendiri
  const portalTypePeriksa = (sessionStorage.getItem('ckg_portal_type') || '').toLowerCase();
  const schoolAccountPeriksa = sessionStorage.getItem('ckg_user_name') || '';
  if (portalTypePeriksa === 'sekolah' && schoolAccountPeriksa) {
    const pSek = document.getElementById('periksaSekolah');
    if (pSek) {
      pSek.value = schoolAccountPeriksa;
      pSek.disabled = true;
      pSek.style.backgroundColor = '#f1f5f9';
      pSek.style.cursor = 'not-allowed';
    }
  }
  updatePeriksaSiswaKelasDropdown(siswa.kelas);
  document.getElementById('periksaTglLahir').value = siswa.tanggal_lahir || '';
  document.getElementById('periksaAlamat').value = siswa.alamat || '';
  calculateSiswaAge();
  initWilayahDropdownsSekolah(
    siswa.provinsi || 'Jawa Barat',
    siswa.kab_kota || 'Kabupaten Bandung',
    siswa.kecamatan || 'Banjaran',
    siswa.kelurahan || 'Tarajusari'
  );
  applyBankDataStateToIdentitas(siswa);

  // Populate Section 2: Fisik & Klinis
  document.getElementById('periksaBb').value = siswa.bb || '';
  document.getElementById('periksaTb').value = siswa.tb || '';
  document.getElementById('periksaLp').value = siswa.lp || '';
  document.getElementById('periksaSistol').value = siswa.td_sistolik || '';
  document.getElementById('periksaDiastol').value = siswa.td_diastolik || '';
  calculateSiswaVitalCategory();

  // Set status checkbox Tidak Diperiksa Lab
  const isLabTidak = !!(
    Number(siswa.lab_tidak_diperiksa) === 1 ||
    siswa.hb === 'Tidak Diperiksa' ||
    siswa.gula_darah === 'Tidak Diperiksa' ||
    siswa.kategori_hb === 'Tidak Diperiksa'
  );
  toggleLabTidakDiperiksa(isLabTidak);

  if (!isLabTidak) {
    // Gula Darah: cek kunci usia < 15 th
    const ageForGula = ageObjModal ? ageObjModal.years : 12;
    if (ageForGula < 15) {
      document.getElementById('periksaGula').value = '';
    } else {
      document.getElementById('periksaGula').value = (siswa.gula_darah && siswa.gula_darah !== '-') ? siswa.gula_darah : '';
    }
    document.getElementById('periksaHb').value = (siswa.hb && siswa.hb !== '-') ? siswa.hb : '';
    updateGulaDarahLockState();
    calculateSiswaLabCategory();
  }

  // Populate Section 3: Khusus (Telinga, Gigi Karies, Mata, Kuku, Kebugaran, Menstruasi / Merokok)
  document.getElementById('periksaTelinga').value = (siswa.telinga && siswa.telinga !== '-') ? siswa.telinga : 'Tidak ada serumen';
  document.getElementById('periksaGigi').value = (siswa.gigi && siswa.gigi !== '-') ? siswa.gigi : 'Tidak ada';
  document.getElementById('periksaMata').value = (siswa.mata && siswa.mata !== '-') ? siswa.mata : 'Normal';
  if (document.getElementById('periksaKuku')) document.getElementById('periksaKuku').value = (siswa.kuku && siswa.kuku !== '-') ? siswa.kuku : 'Pendek Bersih';
  if (document.getElementById('periksaKebugaran')) document.getElementById('periksaKebugaran').value = (siswa.kebugaran && siswa.kebugaran !== '-') ? siswa.kebugaran : 'Baik';
  if (document.getElementById('periksaMenstruasi')) document.getElementById('periksaMenstruasi').value = (siswa.menstruasi && siswa.menstruasi !== '-') ? siswa.menstruasi : 'Belum';
  if (document.getElementById('periksaMerokok')) document.getElementById('periksaMerokok').value = (siswa.merokok && siswa.merokok !== '-') ? siswa.merokok : 'Tidak';
  if (document.getElementById('periksaJenisRokok')) document.getElementById('periksaJenisRokok').value = (siswa.jenis_rokok && siswa.jenis_rokok !== '-') ? siswa.jenis_rokok : '';
  if (document.getElementById('periksaIntensitasRokok')) document.getElementById('periksaIntensitasRokok').value = (siswa.intensitas_merokok && siswa.intensitas_merokok !== '-') ? siswa.intensitas_merokok : '';
  if (document.getElementById('periksaJumlahBatang')) document.getElementById('periksaJumlahBatang').value = (siswa.jumlah_batang && siswa.jumlah_batang !== '-' && siswa.jumlah_batang !== '0') ? siswa.jumlah_batang : '';
  updateGenderSpecificVisibility(siswa.jk);

  // Populate Section 4: Kesimpulan & Rujukan
  if (document.getElementById('periksaStatusKesehatan')) document.getElementById('periksaStatusKesehatan').value = siswa.status_kesehatan || 'Sehat';
  if (document.getElementById('periksaCatatanRujukan')) document.getElementById('periksaCatatanRujukan').value = (siswa.catatan_rujukan && siswa.catatan_rujukan !== '-') ? siswa.catatan_rujukan : '';

  calculateSiswaIMT();
  updateSekolahMenuBadges(siswa);
  renderRiwayatPemeriksaanSiswa(siswa);

  // Close form modal if previously open
  const mForm = document.getElementById('modalFormPosSiswa');
  if (mForm) {
    mForm.classList.remove('active', 'open');
    mForm.style.display = 'none';
  }

  if (modal) {
    modal.classList.add('active', 'open');
    modal.style.display = 'flex';
  }

  // If a specific tab was explicitly requested other than 'menu', open that form
  if (defaultTab && defaultTab !== 'menu') {
    openFormPosPopup(defaultTab);
  }

  // Multi-user concurrency: Fetch fresh single student record from Cloud in background
  fetch(`/api/sekolah?id=${encodeURIComponent(siswaId)}`)
    .then(r => r.json())
    .then(res => {
      if (res.success && res.data && res.data.length > 0) {
        const fresh = res.data[0];
        const curIdx = sekolahRecords.findIndex(r => r.id === siswaId);
        if (curIdx >= 0) {
          sekolahRecords[curIdx] = { ...sekolahRecords[curIdx], ...fresh };
          const curS = sekolahRecords[curIdx];
          updateSekolahMenuBadges(curS);
          renderRiwayatPemeriksaanSiswa(curS);
          if (document.getElementById('periksaSiswaId')?.value === siswaId) {
            if (document.activeElement?.id !== 'periksaBb') document.getElementById('periksaBb').value = curS.bb || '';
            if (document.activeElement?.id !== 'periksaTb') document.getElementById('periksaTb').value = curS.tb || '';
            if (document.activeElement?.id !== 'periksaSistol') document.getElementById('periksaSistol').value = curS.td_sistolik || '';
            if (document.activeElement?.id !== 'periksaDiastol') document.getElementById('periksaDiastol').value = curS.td_diastolik || '';
            if (document.activeElement?.id !== 'periksaHb') document.getElementById('periksaHb').value = (curS.hb && curS.hb !== '-') ? curS.hb : '';
            if (document.activeElement?.id !== 'periksaGula') document.getElementById('periksaGula').value = (curS.gula_darah && curS.gula_darah !== '-') ? curS.gula_darah : '';
            if (document.getElementById('periksaKuku') && document.activeElement?.id !== 'periksaKuku') document.getElementById('periksaKuku').value = curS.kuku || 'Pendek Bersih';
            calculateSiswaIMT();
            calculateSiswaVitalCategory();
            calculateSiswaLabCategory();
          }
        }
      }
    })
    .catch(_ => { });
}

async function refreshCurrentSiswaModal(btn) {
  const siswaId = document.getElementById('periksaSiswaId')?.value;
  if (!siswaId) return;

  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="sekolah-spinner" style="width: 13px; height: 13px; border-width: 2px; display: inline-block; vertical-align: middle;" aria-hidden="true"></span> Memuat...`;
  }

  try {
    const res = await fetch(`/api/sekolah?id=${encodeURIComponent(siswaId)}`);
    const json = await res.json();
    if (json.success && json.data && json.data.length > 0) {
      const fresh = json.data[0];
      const curIdx = sekolahRecords.findIndex(r => r.id === siswaId);
      if (curIdx >= 0) {
        sekolahRecords[curIdx] = { ...sekolahRecords[curIdx], ...fresh };
      } else {
        sekolahRecords.push(fresh);
      }
      if (typeof CkgIdb !== 'undefined') {
        CkgIdb.set('sekolah_records', sekolahRecords);
      }
      openPemeriksaanModal(siswaId, 'menu');
      renderSekolahView();
      showToast('Data pemeriksaan siswa berhasil diperbarui dari Cloud Database!', 'success');
    } else {
      showToast('Data siswa tidak ditemukan di server.', 'warning');
    }
  } catch (err) {
    console.error('Error refreshing siswa data:', err);
    showToast('Gagal memuat pembaruan data: ' + err.message, 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml || `<i class="bi bi-arrow-clockwise"></i> Refresh Data`;
    }
  }
}

function closePemeriksaanModal() {
  const m1 = document.getElementById('modalPemeriksaanSiswa');
  if (m1) {
    m1.classList.remove('active', 'open');
    m1.style.display = 'none';
  }
  const m2 = document.getElementById('modalFormPosSiswa');
  if (m2) {
    m2.classList.remove('active', 'open');
    m2.style.display = 'none';
  }
}

function renderRiwayatPemeriksaanSiswa(siswa) {
  const container = document.getElementById('containerRiwayatPemeriksaanSiswa');
  const listEl = document.getElementById('listRiwayatPemeriksaanSiswa');
  const badgeEl = document.getElementById('badgeJumlahRiwayatSiswa');
  if (!container || !listEl) return;

  const history = Array.isArray(siswa?.riwayat_pemeriksaan) ? siswa.riwayat_pemeriksaan : [];
  if (history.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  if (badgeEl) badgeEl.textContent = `${history.length} Riwayat Tersimpan`;

  const sorted = [...history].reverse();

  listEl.innerHTML = sorted.map((h, i) => {
    const thnLabel = h.tahun_ajaran || h.tahun || '-';
    const kelasLabel = h.kelas || '-';
    const tgl = h.tanggal_pemeriksaan || h.tanggal_entry || '-';
    const petugas = h.petugas_entry || 'Petugas';

    const bb = Number(h.bb || 0);
    const tb = Number(h.tb || 0);
    const lp = Number(h.lp || 0);
    const imt = Number(h.imt || 0);
    const tdS = Number(h.td_sistolik || 0);
    const tdD = Number(h.td_diastolik || 0);
    const hb = (h.hb && h.hb !== '-') ? h.hb : '';
    const gula = (h.gula_darah && h.gula_darah !== '-') ? h.gula_darah : '';

    const chips = [];
    if (bb > 0 || tb > 0) chips.push(`<strong>BB/TB:</strong> ${bb}kg / ${tb}cm`);
    if (imt > 0) chips.push(`<strong>IMT:</strong> ${imt} (${escapeHtml(h.status_imt || 'Normal')})`);
    if (lp > 0) chips.push(`<strong>LP:</strong> ${lp}cm`);
    if (tdS > 0) chips.push(`<strong>Tensi:</strong> ${tdS}/${tdD} mmHg`);
    if (hb) chips.push(`<strong>HB:</strong> ${escapeHtml(hb)} g/dL`);
    if (gula) chips.push(`<strong>GDS:</strong> ${escapeHtml(gula)} mg/dL`);
    if (h.merokok && h.merokok !== '-' && h.merokok !== 'Tidak') {
      let rText = h.merokok;
      if (h.jenis_rokok && h.jenis_rokok !== '-') rText += ` - ${h.jenis_rokok}`;
      if (h.intensitas_merokok && h.intensitas_merokok !== '-') rText += ` (${h.intensitas_merokok})`;
      chips.push(`<strong>Merokok:</strong> ${escapeHtml(rText)}`);
    }
    if (h.menstruasi && h.menstruasi !== '-') chips.push(`<strong>Menstruasi:</strong> ${escapeHtml(h.menstruasi)}`);
    if (h.status_kesehatan) chips.push(`<strong>Status:</strong> ${escapeHtml(h.status_kesehatan)}`);
    if (h.catatan_rujukan && h.catatan_rujukan !== '-') chips.push(`<span style="color:#dc2626; font-weight:700;"><strong>Rujukan:</strong> ${escapeHtml(h.catatan_rujukan)}</span>`);

    return `
      <div style="background: #ffffff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 10px 14px; box-shadow: 0 1px 3px rgba(37,99,235,0.06);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; border-bottom: 1px solid #eff6ff; padding-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="background: #1d4ed8; color: #ffffff; font-size: 11px; font-weight: 800; padding: 2.5px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
              <i class="bi bi-calendar3"></i> Tahun ${escapeHtml(thnLabel)}
            </span>
            <span style="background: #f3e8ff; color: #7e22ce; font-size: 11px; font-weight: 800; padding: 2.5px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
              <i class="bi bi-mortarboard-fill"></i> ${escapeHtml(kelasLabel)}
            </span>
          </div>
          <div style="font-size: 11px; color: #64748b;">
            <span><i class="bi bi-calendar-event"></i> ${escapeHtml(tgl)}</span> &bull; <span>Pemeriksa: <strong>${escapeHtml(petugas)}</strong></span>
          </div>
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap; font-size: 11.5px; color: #334155;">
          ${chips.length > 0
        ? chips.map(c => `<span style="background:#f8fafc; border:1px solid #e2e8f0; padding:2px 7px; border-radius:6px;">${c}</span>`).join('')
        : '<span style="color:#94a3b8; font-style:italic;">Tidak ada catatan klinis khusus</span>'}
        </div>
      </div>
    `;
  }).join('');
}

function calculateRealtimeAge(dobString) {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years < 0) return { years: 0, months: 0, text: '0 Tahun', totalYears: 0 };

  let text = `${years} Tahun`;
  if (months > 0) {
    text += ` ${months} Bulan`;
  }
  return { years, months, text, totalYears: years };
}

function calculateSiswaAge() {
  const dobVal = document.getElementById('periksaTglLahir')?.value;
  const usiaEl = document.getElementById('periksaUsia');
  if (!dobVal) {
    if (usiaEl) usiaEl.value = '';
    updateGulaDarahLockState();
    return;
  }
  const ageObj = calculateRealtimeAge(dobVal);
  if (ageObj) {
    if (usiaEl) usiaEl.value = ageObj.text;
  } else {
    if (usiaEl) usiaEl.value = '';
  }
  updateGulaDarahLockState();
}

function calculateTambahSiswaAge() {
  const dobVal = document.getElementById('tambahSiswaTglLahir')?.value;
  const usiaEl = document.getElementById('tambahSiswaUsia');
  if (!dobVal) {
    if (usiaEl) usiaEl.value = '';
    return;
  }
  const ageObj = calculateRealtimeAge(dobVal);
  if (ageObj) {
    if (usiaEl) usiaEl.value = ageObj.text;
  } else {
    if (usiaEl) usiaEl.value = '';
  }
}

function updateGulaDarahLockState() {
  const dobVal = document.getElementById('periksaTglLahir')?.value;
  const ageObj = calculateRealtimeAge(dobVal);
  const age = ageObj ? ageObj.years : 12;
  const gulaInput = document.getElementById('periksaGula');
  const hint = document.getElementById('periksaGulaLockHint');
  if (!gulaInput) return;

  if (age < 15) {
    gulaInput.disabled = true;
    gulaInput.readOnly = true;
    gulaInput.value = '';
    gulaInput.style.backgroundColor = '#f1f5f9';
    gulaInput.style.borderColor = '#cbd5e1';
    gulaInput.style.color = '#94a3b8';
    gulaInput.style.cursor = 'not-allowed';
    gulaInput.placeholder = '🔒 Terkunci (Khusus Usia >= 15 Tahun)';
    if (hint) hint.style.display = 'block';
  } else {
    gulaInput.disabled = false;
    gulaInput.readOnly = false;
    gulaInput.style.backgroundColor = '';
    gulaInput.style.borderColor = '';
    gulaInput.style.color = '';
    gulaInput.style.cursor = '';
    gulaInput.placeholder = 'Contoh: 100';
    if (hint) hint.style.display = 'none';
  }
  calculateSiswaLabCategory();
}

/**
 * Klasifikasi Tekanan Darah Berdasarkan Sistolik & Diastolik (Standar Medis Kemenkes/AHA)
 * Hasil berupa teks kategori non-editable/readonly.
 */
function getKategoriTekananDarah(sistol, diastol) {
  const s = parseInt(sistol, 10);
  const d = parseInt(diastol, 10);
  if (!s || s <= 0) return '';
  if (s < 90 || (d > 0 && d < 60)) return 'Hipotensi (Rendah)';
  if (s <= 120 && (!d || d <= 80)) return 'Normal';
  if (s <= 139 || (d > 0 && d <= 89)) return 'Pre-Hipertensi';
  if (s <= 159 || (d > 0 && d <= 99)) return 'Hipertensi Derajat 1';
  return 'Hipertensi Derajat 2';
}

function calculateSiswaVitalCategory() {
  const sistol = document.getElementById('periksaSistol')?.value;
  const diastol = document.getElementById('periksaDiastol')?.value;
  const katEl = document.getElementById('periksaKategoriTd');
  if (katEl) {
    katEl.value = getKategoriTekananDarah(sistol, diastol);
  }
}

/**
 * Klasifikasi Gula Darah Sewaktu (GDS) (Standar PERKENI)
 * Khusus usia < 15 tahun terkunci
 */
function getKategoriGulaDarah(gds, age) {
  if (age !== undefined && age !== null && age < 15) {
    return 'Terkunci (< 15 Th)';
  }
  if (gds === undefined || gds === null || gds === '' || gds === '-') return '';
  const val = parseFloat(gds);
  if (isNaN(val) || val <= 0) return '';
  if (val < 70) return 'Hipoglikemia (Rendah)';
  if (val <= 139) return 'Normal';
  if (val <= 199) return 'Pra-Diabetes (Tinggi)';
  return 'Diabetes (Sangat Tinggi)';
}

/**
 * Klasifikasi Hemoglobin (Hb) Berdasarkan Usia dan Jenis Kelamin (Standar WHO / Kemenkes)
 */
function getKategoriHb(hb, age, jk) {
  if (hb === undefined || hb === null || hb === '' || hb === '-') return '';
  const val = parseFloat(hb);
  if (isNaN(val) || val <= 0) return '';

  let cutoffNormal = 12.0;
  if (age !== undefined && age !== null && age < 12) cutoffNormal = 11.5;
  else if (age !== undefined && age !== null && age >= 15 && jk === 'L') cutoffNormal = 13.0;
  else cutoffNormal = 12.0;

  if (val >= cutoffNormal) return 'Normal (Tidak Anemia)';
  if (val >= 11.0) return 'Anemia Ringan';
  if (val >= 8.0) return 'Anemia Sedang';
  return 'Anemia Berat';
}

function calculateSiswaLabCategory() {
  const dobVal = document.getElementById('periksaTglLahir')?.value;
  const ageObj = calculateRealtimeAge(dobVal);
  const age = ageObj ? ageObj.years : 12;
  const jk = document.getElementById('periksaJk')?.value || 'L';

  const gdsVal = document.getElementById('periksaGula')?.value;
  const hbVal = document.getElementById('periksaHb')?.value;

  const katGulaEl = document.getElementById('periksaKategoriGula');
  const katHbEl = document.getElementById('periksaKategoriHb');

  if (katGulaEl) {
    katGulaEl.value = getKategoriGulaDarah(gdsVal, age);
  }
  if (katHbEl) {
    katHbEl.value = getKategoriHb(hbVal, age, jk);
  }
}

/**
 * Kontrol Tampilan Pertanyaan Spesifik Gender:
 * - Menstruasi: Hanya Ditampilkan untuk Siswa Perempuan (P)
 * - Skrining Rokok: Hanya Ditampilkan untuk Siswa Laki-laki (L)
 * - Jika Merokok === 'Aktif': Muncul Pertanyaan Lanjutan Intensitas Rokok & Berapa Batang
 */
function handleMerokokChange() {
  const val = document.getElementById('periksaMerokok')?.value || 'Tidak';
  const detailEl = document.getElementById('groupMerokokDetail');
  const jenisEl = document.getElementById('periksaJenisRokok');
  const konvenEl = document.getElementById('groupKonvensionalDetail');
  const infoElektrik = document.getElementById('infoElektrikNote');
  const intensitasEl = document.getElementById('periksaIntensitasRokok');
  const groupBatang = document.getElementById('groupJumlahBatang');
  const batangEl = document.getElementById('periksaJumlahBatang');

  if (val === 'Aktif') {
    if (detailEl) detailEl.style.display = 'block';
    handleJenisRokokChange();
  } else {
    if (detailEl) detailEl.style.display = 'none';
    if (jenisEl) jenisEl.value = '';
    if (konvenEl) konvenEl.style.display = 'none';
    if (infoElektrik) infoElektrik.style.display = 'none';
    if (intensitasEl) intensitasEl.value = '';
    if (groupBatang) groupBatang.style.display = 'none';
    if (batangEl) batangEl.value = '';
  }
}

function handleJenisRokokChange() {
  const jenisVal = document.getElementById('periksaJenisRokok')?.value || '';
  const konvenEl = document.getElementById('groupKonvensionalDetail');
  const infoElektrik = document.getElementById('infoElektrikNote');
  const intensitasEl = document.getElementById('periksaIntensitasRokok');
  const groupBatang = document.getElementById('groupJumlahBatang');
  const batangEl = document.getElementById('periksaJumlahBatang');

  if (jenisVal === 'Konvensional') {
    if (konvenEl) konvenEl.style.display = 'block';
    if (infoElektrik) infoElektrik.style.display = 'none';
    handleIntensitasRokokChange();
  } else if (jenisVal === 'Elektrik') {
    // STOP SAMPAI DISITU: Sembunyikan dan reset pertanyaan lanjutan
    if (konvenEl) konvenEl.style.display = 'none';
    if (infoElektrik) infoElektrik.style.display = 'block';
    if (intensitasEl) intensitasEl.value = '';
    if (groupBatang) groupBatang.style.display = 'none';
    if (batangEl) batangEl.value = '';
  } else {
    if (konvenEl) konvenEl.style.display = 'none';
    if (infoElektrik) infoElektrik.style.display = 'none';
    if (intensitasEl) intensitasEl.value = '';
    if (groupBatang) groupBatang.style.display = 'none';
    if (batangEl) batangEl.value = '';
  }
}

function handleIntensitasRokokChange() {
  const val = document.getElementById('periksaIntensitasRokok')?.value || '';
  const groupBatang = document.getElementById('groupJumlahBatang');
  if (val && val !== '' && val !== '-') {
    if (groupBatang) groupBatang.style.display = 'block';
  } else {
    if (groupBatang) groupBatang.style.display = 'none';
  }
}

function updateMenstruasiVisibility(jk) {
  updateGenderSpecificVisibility(jk);
}

function updateGenderSpecificVisibility(jk) {
  const curJk = jk || document.getElementById('periksaJk')?.value || 'L';
  const groupMenstruasi = document.getElementById('groupPeriksaMenstruasi');
  const groupMerokok = document.getElementById('groupPeriksaMerokok');
  const groupDetail = document.getElementById('groupMerokokDetail');

  if (curJk === 'P') {
    if (groupMenstruasi) groupMenstruasi.style.display = 'block';
    if (groupMerokok) groupMerokok.style.display = 'none';
    if (groupDetail) groupDetail.style.display = 'none';
  } else {
    if (groupMenstruasi) {
      groupMenstruasi.style.display = 'none';
      const inputMenstruasi = document.getElementById('periksaMenstruasi');
      if (inputMenstruasi) inputMenstruasi.value = 'Belum';
    }
    if (groupMerokok) groupMerokok.style.display = 'block';
    handleMerokokChange();
  }
}

function calculateSiswaIMT() {
  const bb = parseFloat(document.getElementById('periksaBb')?.value) || 0;
  const tb = parseFloat(document.getElementById('periksaTb')?.value) || 0;
  const imtInput = document.getElementById('periksaImt');
  const badgeImt = document.getElementById('badgeImtSiswa');

  if (bb > 0 && tb > 0) {
    const tbM = tb / 100;
    const imt = (bb / (tbM * tbM));
    const imtFixed = imt.toFixed(1);
    if (imtInput) imtInput.value = imtFixed;

    if (badgeImt) {
      badgeImt.style.background = '#10b981';
      badgeImt.style.color = '#ffffff';
      if (imt < 17.0) {
        badgeImt.textContent = 'Sangat Kurus';
      } else if (imt < 18.5) {
        badgeImt.textContent = 'Kurus';
      } else if (imt <= 25.0) {
        badgeImt.textContent = 'Normal';
      } else if (imt <= 27.0) {
        badgeImt.textContent = 'Gemuk';
      } else {
        badgeImt.textContent = 'Obesitas';
      }
    }
  } else {
    if (imtInput) imtInput.value = '';
    if (badgeImt) {
      badgeImt.style.background = '#10b981';
      badgeImt.style.color = '#ffffff';
      badgeImt.textContent = 'Auto';
    }
  }
}

// ==========================================================================
// 🪄 AUTO-FILL ANTROPOMETRI BERDASARKAN UMUR SISWA (NILAI ACAK NORMAL)
// ==========================================================================

/**
 * Tabel referensi BB, TB, LP normal anak sekolah Indonesia berdasarkan umur (tahun).
 * Min/Max adalah rentang normal yang menghasilkan IMT 18.5-25.0 (Normal).
 * Sumber: Standar Antropometri Kemenkes RI (disesuaikan untuk usia sekolah).
 */
var ANTRO_NORMAL_RANGES = {
  // Umur: { bb: [min, max], tb: [min, max], lp: [min, max] }
  6: { bb: [18, 24], tb: [110, 122], lp: [50, 56] },
  7: { bb: [20, 27], tb: [115, 127], lp: [51, 58] },
  8: { bb: [22, 30], tb: [120, 133], lp: [52, 60] },
  9: { bb: [24, 33], tb: [124, 138], lp: [53, 62] },
  10: { bb: [26, 37], tb: [128, 143], lp: [54, 64] },
  11: { bb: [28, 41], tb: [133, 150], lp: [55, 66] },
  12: { bb: [31, 46], tb: [138, 156], lp: [56, 68] },
  13: { bb: [35, 52], tb: [145, 163], lp: [58, 72] },
  14: { bb: [38, 56], tb: [148, 168], lp: [59, 74] },
  15: { bb: [42, 60], tb: [152, 172], lp: [60, 76] },
  16: { bb: [44, 63], tb: [154, 174], lp: [62, 78] },
  17: { bb: [46, 65], tb: [155, 175], lp: [63, 80] },
  18: { bb: [47, 67], tb: [156, 176], lp: [64, 82] },
};

/**
 * Generate random float between min and max, rounded to 1 decimal
 */
function randomInRange(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

/**
 * Hitung umur siswa dari tanggal lahir
 */
function getAgeFromDOB(dob) {
  if (!dob) return 12; // Default umur jika tidak ada tanggal lahir
  const ageObj = calculateRealtimeAge(dob);
  return ageObj ? ageObj.years : 12;
}

/**
 * Dapatkan rentang normal BB, TB, LP berdasarkan umur
 */
function getAntroRangeForAge(age) {
  // Clamp umur ke rentang yang ada di tabel (6-18)
  const clampedAge = Math.max(6, Math.min(18, age));
  return ANTRO_NORMAL_RANGES[clampedAge] || ANTRO_NORMAL_RANGES[12];
}

/**
 * Generate nilai BB, TB, LP acak yang normal berdasarkan umur & jenis kelamin
 */
function generateRandomAntro(age, jk) {
  const range = getAntroRangeForAge(age);

  // Laki-laki cenderung sedikit lebih berat & tinggi
  const genderFactor = (jk === 'L') ? 1.0 : 0.95;
  const genderTbFactor = (jk === 'L') ? 1.0 : 0.97;

  const tb = randomInRange(range.tb[0] * genderTbFactor, range.tb[1] * genderTbFactor);
  // Hitung BB yang menghasilkan IMT normal (18.5-24.5) berdasarkan TB
  const tbM = tb / 100;
  const bbMin = Math.max(range.bb[0], Math.round(18.5 * tbM * tbM * 10) / 10);
  const bbMax = Math.min(range.bb[1], Math.round(24.5 * tbM * tbM * 10) / 10);
  const bb = randomInRange(Math.min(bbMin, bbMax), Math.max(bbMin, bbMax));

  const lp = randomInRange(range.lp[0], range.lp[1]);

  return {
    bb: bb * genderFactor,
    tb: tb,
    lp: lp
  };
}

/**
 * Auto-fill BB, TB, LP untuk siswa yang sedang diperiksa (di form Antropometri)
 */
function autoFillAntroSiswa() {
  const siswaId = document.getElementById('periksaSiswaId')?.value;
  const siswa = sekolahRecords.find(r => r.id === siswaId);

  if (!siswa) {
    showToast('Data siswa tidak ditemukan. Silakan buka data siswa terlebih dahulu.', 'warning');
    return;
  }

  const age = getAgeFromDOB(siswa.tanggal_lahir);
  const jk = siswa.jk || 'L';
  const antro = generateRandomAntro(age, jk);

  // Bulatkan ke 1 desimal
  const bb = Math.round(antro.bb * 10) / 10;
  const tb = Math.round(antro.tb * 10) / 10;
  const lp = Math.round(antro.lp * 10) / 10;

  document.getElementById('periksaBb').value = bb;
  document.getElementById('periksaTb').value = tb;
  document.getElementById('periksaLp').value = lp;

  // Trigger kalkulasi IMT otomatis
  calculateSiswaIMT();

  showToast(`Antropometri ${siswa.nama} terisi otomatis (Umur: ${age} th) ➔ BB: ${bb}kg, TB: ${tb}cm, LP: ${lp}cm`, 'success');
}

/**
 * Generate nilai Tanda Vital (TD Sistolik & Diastolik) acak yang normal sesuai umur & jenis kelamin
 */
function generateRandomVital(age, jk) {
  let minSistol = 100, maxSistol = 112;
  let minDiastol = 62, maxDiastol = 72;

  if (age <= 9) {
    minSistol = 95; maxSistol = 105;
    minDiastol = 58; maxDiastol = 68;
  } else if (age <= 12) {
    minSistol = 100; maxSistol = 112;
    minDiastol = 60; maxDiastol = 72;
  } else if (age <= 14) {
    if (jk === 'P') {
      minSistol = 102; maxSistol = 114;
      minDiastol = 62; maxDiastol = 74;
    } else {
      minSistol = 106; maxSistol = 118;
      minDiastol = 64; maxDiastol = 76;
    }
  } else if (age <= 18) {
    if (jk === 'P') {
      minSistol = 106; maxSistol = 118;
      minDiastol = 64; maxDiastol = 76;
    } else {
      minSistol = 110; maxSistol = 122;
      minDiastol = 68; maxDiastol = 78;
    }
  } else {
    if (jk === 'P') {
      minSistol = 108; maxSistol = 118;
      minDiastol = 68; maxDiastol = 78;
    } else {
      minSistol = 112; maxSistol = 122;
      minDiastol = 70; maxDiastol = 80;
    }
  }

  const sistol = Math.floor(minSistol + Math.random() * (maxSistol - minSistol + 1));
  const diastol = Math.floor(minDiastol + Math.random() * (maxDiastol - minDiastol + 1));
  return { sistol, diastol };
}

/**
 * Auto-fill Tanda Vital (Tekanan Darah) siswa otomatis dengan nilai acak normal
 */
function autoFillVitalSiswa() {
  const siswaId = document.getElementById('periksaSiswaId')?.value;
  const siswa = sekolahRecords.find(r => r.id === siswaId);
  if (!siswa) {
    showToast('Data siswa tidak ditemukan.', 'warning');
    return;
  }

  const dobVal = document.getElementById('periksaTglLahir')?.value || siswa.tanggal_lahir;
  const ageObj = calculateRealtimeAge(dobVal);
  const age = ageObj ? ageObj.years : 12;
  const jk = document.getElementById('periksaJk')?.value || siswa.jk || 'L';

  const vital = generateRandomVital(age, jk);
  const sistolInput = document.getElementById('periksaSistol');
  const diastolInput = document.getElementById('periksaDiastol');

  if (sistolInput) sistolInput.value = vital.sistol;
  if (diastolInput) diastolInput.value = vital.diastol;
  calculateSiswaVitalCategory();

  showToast(`Tanda Vital ${siswa.nama} terisi otomatis (Umur: ${age} th, ${jk === 'P' ? 'Perempuan' : 'Laki-laki'}) ➔ TD: ${vital.sistol}/${vital.diastol} mmHg`, 'success');
}

/**
 * Generate nilai Laboratorium (Hb & GDS) acak yang normal sesuai umur & jenis kelamin
 * Khusus GDS: Jika usia < 15 tahun, nilainya null (terkunci)
 */
function generateRandomLab(age, jk) {
  let minHb = 12.0, maxHb = 13.8;

  if (age < 12) {
    minHb = 12.0; maxHb = 13.8;
  } else if (age <= 14) {
    if (jk === 'P') {
      minHb = 12.2; maxHb = 14.2;
    } else {
      minHb = 12.6; maxHb = 14.8;
    }
  } else {
    if (jk === 'P') {
      minHb = 12.4; maxHb = 14.6;
    } else {
      minHb = 13.6; maxHb = 15.8;
    }
  }

  const hb = (minHb + Math.random() * (maxHb - minHb)).toFixed(1);

  let gds = null;
  if (age >= 15) {
    gds = Math.floor(85 + Math.random() * (115 - 85 + 1));
  }

  return { hb, gds };
}

/**
 * Auto-fill Laboratorium (Hb & Gula Darah) siswa otomatis dengan nilai acak normal
 */
function autoFillLabSiswa() {
  const siswaId = document.getElementById('periksaSiswaId')?.value;
  const siswa = sekolahRecords.find(r => r.id === siswaId);
  if (!siswa) {
    showToast('Data siswa tidak ditemukan.', 'warning');
    return;
  }

  // Reset centang Tidak Diperiksa saat menggunakan Isi Otomatis
  toggleLabTidakDiperiksa(false);

  const dobVal = document.getElementById('periksaTglLahir')?.value || siswa.tanggal_lahir;
  const ageObj = calculateRealtimeAge(dobVal);
  const age = ageObj ? ageObj.years : 12;
  const jk = document.getElementById('periksaJk')?.value || siswa.jk || 'L';

  const lab = generateRandomLab(age, jk);
  const hbInput = document.getElementById('periksaHb');
  const gulaInput = document.getElementById('periksaGula');

  if (hbInput) hbInput.value = lab.hb;

  updateGulaDarahLockState();

  if (age < 15) {
    if (gulaInput) gulaInput.value = '';
    calculateSiswaLabCategory();
    showToast(`Laboratorium ${siswa.nama} terisi otomatis (Umur: ${age} th) ➔ Hb: ${lab.hb} g/dL (Normal). Gula darah terkunci karena usia < 15 tahun.`, 'info');
  } else {
    if (gulaInput) gulaInput.value = lab.gds;
    calculateSiswaLabCategory();
    showToast(`Laboratorium ${siswa.nama} terisi otomatis (Umur: ${age} th) ➔ Hb: ${lab.hb} g/dL, GDS: ${lab.gds} mg/dL (Normal)`, 'success');
  }
}

/**
 * Bulk Auto-fill: Isi semua siswa yang Antropometri-nya masih kosong
 * dengan nilai acak normal berdasarkan umur masing-masing
 */
async function bulkAutoFillAntroSekolah() {
  const chosenSekolah = (document.getElementById('filterSelectSekolah')?.value || '').trim().toUpperCase();

  if (!chosenSekolah) {
    Swal.fire('Pilih Sekolah Terlebih Dahulu', 'Silakan pilih sekolah pada filter sebelum menggunakan fitur Auto-Fill Antropometri.', 'warning');
    return;
  }

  // Cari siswa yang belum punya data antro (BB=0 atau TB=0) di sekolah yang dipilih
  const targetRecords = sekolahRecords.filter(r => {
    const matchSekolah = (r.sekolah || '').toUpperCase() === chosenSekolah;
    const bbEmpty = !r.bb || Number(r.bb) === 0;
    const tbEmpty = !r.tb || Number(r.tb) === 0;
    return matchSekolah && (bbEmpty || tbEmpty);
  });

  if (targetRecords.length === 0) {
    Swal.fire('Semua Data Sudah Terisi! 👍', 'Tidak ada siswa yang BB/TB-nya masih kosong di sekolah ini.', 'info');
    return;
  }

  const confirm = await Swal.fire({
    title: 'Auto-Fill Antropometri Massal',
    html: `
      <div style="text-align: left; font-size: 13px; line-height: 1.7;">
        <p>Akan mengisi <strong style="color: #2563eb;">${targetRecords.length} siswa</strong> yang BB/TB-nya masih kosong dengan nilai <strong>acak normal</strong> sesuai umur.</p>
        <ul style="margin: 8px 0; padding-left: 18px;">
          <li>BB, TB, LP akan diacak dalam rentang normal</li>
          <li>Setiap siswa mendapat nilai <strong>berbeda-beda</strong></li>
          <li>IMT otomatis terhitung Normal (18.5 - 25.0)</li>
          <li>Data siswa yang sudah terisi <strong>TIDAK akan ditimpa</strong></li>
        </ul>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: `Ya, Isi ${targetRecords.length} Siswa`,
    cancelButtonText: 'Batal',
    confirmButtonColor: '#0284c7'
  });

  if (!confirm.isConfirmed) return;

  let filled = 0;

  targetRecords.forEach(r => {
    const idx = sekolahRecords.findIndex(s => s.id === r.id);
    if (idx < 0) return;

    const age = getAgeFromDOB(r.tanggal_lahir);
    const jk = r.jk || 'L';
    const antro = generateRandomAntro(age, jk);

    const bb = Math.round(antro.bb * 10) / 10;
    const tb = Math.round(antro.tb * 10) / 10;
    const lp = Math.round(antro.lp * 10) / 10;

    // Hitung IMT
    const tbM = tb / 100;
    const imt = tbM > 0 ? Math.round((bb / (tbM * tbM)) * 100) / 100 : 0;
    let statusImt = 'Normal';
    if (imt < 17.0) statusImt = 'Sangat Kurus';
    else if (imt < 18.5) statusImt = 'Kurus';
    else if (imt <= 25.0) statusImt = 'Normal';
    else if (imt <= 27.0) statusImt = 'Gemuk';
    else statusImt = 'Obesitas';

    sekolahRecords[idx].bb = bb;
    sekolahRecords[idx].tb = tb;
    sekolahRecords[idx].lp = lp;
    sekolahRecords[idx].imt = imt;
    sekolahRecords[idx].status_imt = statusImt;
    sekolahRecords[idx].antro_done = 1;
    // Update is_examined sesuai kelengkapan 5 indikator (hanya lengkap jika semua 5 stasiun selesai)
    sekolahRecords[idx].is_examined = isSekolahRecordExamined(sekolahRecords[idx]) ? 1 : 0;

    filled++;
  });

  // Simpan ke IndexedDB & Cloud
  if (typeof CkgIdb !== 'undefined') {
    CkgIdb.set('sekolah_records', sekolahRecords);
  }
  syncSekolahRecordsToCloud(sekolahRecords);

  renderSekolahView();

  Swal.fire({
    title: `Berhasil! ${filled} Siswa Terisi`,
    html: `<p style="font-size: 13px;">Data Antropometri (BB, TB, LP) untuk <strong>${filled}</strong> siswa berhasil diisi secara otomatis dengan nilai acak normal sesuai umur masing-masing.</p>`,
    icon: 'success',
    confirmButtonColor: '#059669'
  });
}

/**
 * Bulk Set Lab Tidak Diperiksa:
 * Menandai semua siswa di sekolah yang dipilih yang belum memiliki data lab menjadi "Tidak Diperiksa"
 */
async function bulkSetLabTidakDiperiksa() {
  const chosenSekolah = (document.getElementById('filterSelectSekolah')?.value || '').trim().toUpperCase();

  if (!chosenSekolah) {
    Swal.fire('Pilih Sekolah Terlebih Dahulu', 'Silakan pilih sekolah pada filter sebelum menggunakan fitur Set Lab Tidak Diperiksa.', 'warning');
    return;
  }

  // Cari siswa yang belum memiliki data lab di sekolah yang dipilih
  const targetRecords = sekolahRecords.filter(r => {
    const matchSekolah = (r.sekolah || '').toUpperCase() === chosenSekolah;
    const stations = getSekolahRecordExamStations(r);
    return matchSekolah && !stations.hasLab;
  });

  if (targetRecords.length === 0) {
    Swal.fire('Semua Data Sudah Lengkap! 👍', 'Seluruh siswa di sekolah ini sudah memiliki data Lab atau sudah ditandai Tidak Diperiksa.', 'info');
    return;
  }

  const confirm = await Swal.fire({
    title: 'Tandai Lab Tidak Diperiksa Massal',
    html: `
      <div style="text-align: left; font-size: 13px; line-height: 1.7;">
        <p>Akan menandai <strong style="color: #db2777;">${targetRecords.length} siswa</strong> di <strong>${escapeHtml(chosenSekolah)}</strong> sebagai <strong>"Tidak Diperiksa"</strong> untuk stasiun Laboratorium.</p>
        <div style="background: #fdf2f8; border: 1.5px solid #fbcfe8; border-radius: 10px; padding: 10px 14px; margin: 10px 0; font-size: 12px; color: #9d174d;">
          <i class="bi bi-info-circle-fill"></i> <strong>Catatan:</strong> Siswa yang ditandai <em>"Tidak Diperiksa"</em> tetap memenuhi syarat stasiun Lab dan dapat terhitung <strong>"Sudah Diperiksa"</strong> jika Antro, Vital, dan Organ Indera juga telah selesai.
        </div>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: `Ya, Tandai ${targetRecords.length} Siswa`,
    cancelButtonText: 'Batal',
    confirmButtonColor: '#db2777'
  });

  if (!confirm.isConfirmed) return;

  Swal.fire({
    title: 'Memproses Status Lab...',
    html: `Sedang memperbarui <strong>${targetRecords.length}</strong> siswa ke Cloud Database...`,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  const modified = [];

  targetRecords.forEach(r => {
    const idx = sekolahRecords.findIndex(s => s.id === r.id);
    if (idx < 0) return;

    sekolahRecords[idx].lab_done = 1;
    sekolahRecords[idx].lab_tidak_diperiksa = 1;
    sekolahRecords[idx].hb = 'Tidak Diperiksa';
    sekolahRecords[idx].gula_darah = 'Tidak Diperiksa';
    sekolahRecords[idx].kategori_hb = 'Tidak Diperiksa';
    sekolahRecords[idx].kategori_gula = 'Tidak Diperiksa';
    sekolahRecords[idx].is_examined = isSekolahRecordExamined(sekolahRecords[idx]) ? 1 : 0;

    modified.push(sekolahRecords[idx]);
  });

  if (typeof CkgIdb !== 'undefined') {
    CkgIdb.set('sekolah_records', sekolahRecords);
  }

  // Kirim batch ke server
  try {
    const batchSize = 50;
    for (let i = 0; i < modified.length; i += batchSize) {
      const batch = modified.slice(i, i + batchSize);
      await fetch('/api/sekolah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch)
      });
    }

    renderSekolahView();

    Swal.fire({
      icon: 'success',
      title: 'Pembaruan Lab Berhasil!',
      html: `Sebanyak <strong>${modified.length} siswa</strong> di <strong>${escapeHtml(chosenSekolah)}</strong> berhasil ditandai <em>"Tidak Diperiksa"</em> untuk stasiun Lab.`,
      confirmButtonColor: '#059669'
    });
  } catch (err) {
    console.error('Error in bulkSetLabTidakDiperiksa:', err);
    renderSekolahView();
    Swal.fire({
      icon: 'warning',
      title: 'Tersimpan Lokal',
      text: 'Data tersimpan di perangkat ini, namun terjadi kendala saat sinkronisasi Cloud: ' + (err.message || ''),
      confirmButtonColor: '#d97706'
    });
  }
}

let isSavingSekolahCategory = false;

async function saveSekolahCategory(categoryKey, triggerBtn) {
  if (isSavingSekolahCategory) {
    console.warn(`[saveSekolahCategory] Penyimpanan sedang berlangsung untuk ${categoryKey}. Permintaan kedua diabaikan.`);
    return;
  }

  const id = document.getElementById('periksaSiswaId')?.value;
  const idx = sekolahRecords.findIndex(r => r.id === id);
  if (idx < 0) {
    showToast('Data siswa tidak valid.', 'danger');
    return;
  }

  // Cari elemen tombol simpan untuk memberikan feedback loading spinner & disabled
  let btn = triggerBtn;
  if (!btn && window.event) {
    const t = window.event.currentTarget || window.event.target;
    if (t) btn = t.tagName === 'BUTTON' ? t : t.closest('button');
  }
  if (!btn) {
    btn = document.querySelector(`#panelPemeriksaan${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)} button[onclick*="saveSekolahCategory"]`);
  }

  let originalBtnHtml = '';
  if (btn) {
    originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.85';
    btn.innerHTML = `<span class="sekolah-spinner" aria-hidden="true"></span> Sedang Menyimpan...`;
  }
  isSavingSekolahCategory = true;

  try {
    const currentUserName = sessionStorage.getItem('ckg_user_name') || 'Admin';
    const existing = sekolahRecords[idx];

    let titleMsg = '';
    let categoryName = '';
    let fieldsToUpdate = {
      petugas_entry: currentUserName,
      tanggal_entry: new Date().toISOString().substring(0, 10)
    };

    // Preliminary field defaults
    if (categoryKey === 'identitas') {
      const nama = (document.getElementById('periksaNama')?.value || '').trim().toUpperCase();
      const rawNik = (document.getElementById('periksaNik')?.value || '').trim();
      const cleanNik = rawNik.replace(/\D/g, '');
      const tglLahirVal = (document.getElementById('periksaTglLahir')?.value || '').trim();
      const jkVal = document.getElementById('periksaJk')?.value || 'L';
      const portalTypeSekolah = (sessionStorage.getItem('ckg_portal_type') || '').toLowerCase();
      const schoolAccountSekolah = sessionStorage.getItem('ckg_user_name') || '';
      const sekolahVal = (portalTypeSekolah === 'sekolah' && schoolAccountSekolah)
        ? schoolAccountSekolah.toUpperCase()
        : (document.getElementById('periksaSekolah')?.value || existing.sekolah || '').trim().toUpperCase();
      const kelasVal = (document.getElementById('periksaKelas')?.value || existing.kelas || '').trim().toUpperCase();
      const provVal = (document.getElementById('periksaProvinsi')?.value || '').trim();
      const kabVal = (document.getElementById('periksaKabKota')?.value || '').trim();
      const kecVal = (document.getElementById('periksaKecamatan')?.value || '').trim();
      const kelVal = (document.getElementById('periksaKelurahan')?.value || '').trim();
      const alamatVal = (document.getElementById('periksaAlamat')?.value || '').trim().toUpperCase();

      const missingIdentity = [];
      if (!nama) missingIdentity.push('Nama Lengkap Siswa');
      if (!rawNik) {
        missingIdentity.push('NIK (Kosong)');
      } else if (cleanNik.length !== 16) {
        missingIdentity.push(`NIK harus 16 digit (saat ini ${cleanNik.length} digit)`);
      }
      if (!jkVal) missingIdentity.push('Jenis Kelamin');
      if (!sekolahVal) missingIdentity.push('Asal Sekolah');
      if (!kelasVal) missingIdentity.push('Kelas Siswa');
      if (!tglLahirVal) missingIdentity.push('Tanggal Lahir');
      if (!provVal || provVal === '__manual__') missingIdentity.push('Provinsi');
      if (!kabVal || kabVal === '__manual__') missingIdentity.push('Kabupaten / Kota');
      if (!kecVal || kecVal === '__manual__') missingIdentity.push('Kecamatan');
      if (!kelVal || kelVal === '__manual__') missingIdentity.push('Desa / Kelurahan');
      if (!alamatVal) missingIdentity.push('Alamat Tempat Tinggal');

      if (missingIdentity.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Identitas Belum Lengkap!',
          html: `
            <div style="text-align: left; font-size: 13.5px; line-height: 1.6;">
              <p style="margin-bottom: 8px; color: #b91c1c; font-weight: 700;">
                <i class="bi bi-exclamation-triangle-fill"></i> Seluruh data identitas wajib diisi lengkap:
              </p>
              <ul style="margin: 0; padding-left: 20px; color: #334155;">
                ${missingIdentity.map(m => `<li><strong>${escapeHtml(m)}</strong></li>`).join('')}
              </ul>
              <p style="margin-top: 10px; font-size: 12px; color: #64748b;">
                Lengkapi seluruh isian di atas agar form pemeriksaan selanjutnya dapat dibuka.
              </p>
            </div>
          `,
          confirmButtonColor: '#059669'
        });
        return;
      }

      fieldsToUpdate.nama = nama;
      fieldsToUpdate.nik = rawNik;
      fieldsToUpdate.jk = jkVal;
      fieldsToUpdate.sekolah = sekolahVal;
      fieldsToUpdate.kelas = kelasVal;
      fieldsToUpdate.tanggal_lahir = tglLahirVal;
      fieldsToUpdate.provinsi = provVal;
      fieldsToUpdate.kab_kota = kabVal;
      fieldsToUpdate.kecamatan = kecVal;
      fieldsToUpdate.kelurahan = kelVal;
      fieldsToUpdate.alamat = alamatVal;
      fieldsToUpdate.identitas_done = 1;
      const isBankRecord = Number(existing.is_bank_data) === 1 || isStudentInBankData({ nik: cleanNik });
      fieldsToUpdate.is_bank_data = isBankRecord ? 1 : 0;
      fieldsToUpdate.from_bank_data = isBankRecord ? 1 : 0;
      categoryName = 'Identitas Siswa';
      titleMsg = 'Data Identitas Siswa Berhasil Disimpan & Lengkap!';
    } else {
      // Validasi mutlak: Kategori pemeriksaan fisik/klinis hanya boleh disimpan jika identitas sudah lengkap!
      if (!isSiswaIdentitasComplete(existing)) {
        const missing = getMissingIdentitasFields(existing);
        Swal.fire({
          icon: 'warning',
          title: 'Identitas Siswa Belum Lengkap!',
          html: `Data identitas siswa belum lengkap (<strong>${missing.join(', ')}</strong>).<br><br>Wajib melengkapi dan menyimpan Format Identitas terlebih dahulu sebelum menyimpan data pemeriksaan lainnya.`,
          confirmButtonText: '<i class="bi bi-pencil-square"></i> Buka Format Identitas',
          confirmButtonColor: '#059669'
        }).then(() => {
          openFormPosPopup('identitas');
        });
        return;
      }
    }

    if (categoryKey === 'antro') {
      const bbVal = parseFloat(document.getElementById('periksaBb')?.value) || 0;
      const tbVal = parseFloat(document.getElementById('periksaTb')?.value) || 0;
      let imtVal = 0;
      let statusImt = 'Normal';
      if (bbVal > 0 && tbVal > 0) {
        const tbM = tbVal / 100;
        imtVal = parseFloat((bbVal / (tbM * tbM)).toFixed(2));
        if (imtVal < 17.0) statusImt = 'Sangat Kurus';
        else if (imtVal < 18.5) statusImt = 'Kurus';
        else if (imtVal <= 25.0) statusImt = 'Normal';
        else if (imtVal <= 27.0) statusImt = 'Gemuk';
        else statusImt = 'Obesitas';
      }

      fieldsToUpdate.bb = bbVal;
      fieldsToUpdate.tb = tbVal;
      fieldsToUpdate.lp = parseFloat(document.getElementById('periksaLp')?.value) || 0;
      fieldsToUpdate.imt = imtVal;
      fieldsToUpdate.status_imt = statusImt;
      fieldsToUpdate.antro_done = (bbVal > 0 && tbVal > 0) ? 1 : 0;
      categoryName = 'Antropometri';
      titleMsg = 'Data Antropometri Berhasil Disimpan!';
    } else if (categoryKey === 'vital') {
      fieldsToUpdate.td_sistolik = parseInt(document.getElementById('periksaSistol')?.value, 10) || 0;
      fieldsToUpdate.td_diastolik = parseInt(document.getElementById('periksaDiastol')?.value, 10) || 0;
      fieldsToUpdate.kategori_td = document.getElementById('periksaKategoriTd')?.value || getKategoriTekananDarah(fieldsToUpdate.td_sistolik, fieldsToUpdate.td_diastolik);
      fieldsToUpdate.vital_done = (fieldsToUpdate.td_sistolik > 0) ? 1 : 0;
      categoryName = 'Tanda Vital (Tekanan Darah)';
      titleMsg = 'Data Tanda Vital Berhasil Disimpan!';
    } else if (categoryKey === 'lab') {
      const isTidakDiperiksa = document.getElementById('periksaLabTidakDiperiksa')?.checked || false;
      const dobVal = document.getElementById('periksaTglLahir')?.value || existing.tanggal_lahir;
      const ageObj = calculateRealtimeAge(dobVal);
      const age = ageObj ? ageObj.years : 12;

      if (isTidakDiperiksa) {
        fieldsToUpdate.lab_done = 1;
        fieldsToUpdate.lab_tidak_diperiksa = 1;
        fieldsToUpdate.gula_darah = 'Tidak Diperiksa';
        fieldsToUpdate.hb = 'Tidak Diperiksa';
        fieldsToUpdate.kategori_gula = 'Tidak Diperiksa';
        fieldsToUpdate.kategori_hb = 'Tidak Diperiksa';
      } else {
        const gulaVal = (age >= 15) ? (document.getElementById('periksaGula')?.value.trim() || '-') : '-';
        const hbVal = document.getElementById('periksaHb')?.value.trim() || '-';
        fieldsToUpdate.lab_tidak_diperiksa = 0;
        fieldsToUpdate.gula_darah = gulaVal;
        fieldsToUpdate.hb = hbVal;
        fieldsToUpdate.kategori_gula = document.getElementById('periksaKategoriGula')?.value || getKategoriGulaDarah(gulaVal, age);
        fieldsToUpdate.kategori_hb = document.getElementById('periksaKategoriHb')?.value || getKategoriHb(hbVal, age, existing.jk || 'L');
        fieldsToUpdate.lab_done = !!((hbVal && hbVal !== '-') || (gulaVal && gulaVal !== '-')) ? 1 : 0;
      }
      categoryName = 'Laboratorium';
      titleMsg = isTidakDiperiksa ? 'Status Lab Berhasil Ditandai Tidak Diperiksa (Selesai)!' : 'Data Laboratorium Berhasil Disimpan!';
    } else if (categoryKey === 'organ') {
      fieldsToUpdate.telinga = document.getElementById('periksaTelinga')?.value || 'Tidak ada serumen';
      fieldsToUpdate.gigi = document.getElementById('periksaGigi')?.value || 'Tidak ada';
      fieldsToUpdate.mata = document.getElementById('periksaMata')?.value || 'Normal';
      fieldsToUpdate.kuku = document.getElementById('periksaKuku')?.value || 'Pendek Bersih';
      fieldsToUpdate.kebugaran = document.getElementById('periksaKebugaran')?.value || 'Baik';
      const curJk = document.getElementById('periksaJk')?.value || existing.jk || 'L';
      if (curJk === 'P') {
        fieldsToUpdate.menstruasi = document.getElementById('periksaMenstruasi')?.value || 'Belum';
        fieldsToUpdate.merokok = '-';
        fieldsToUpdate.jenis_rokok = '-';
        fieldsToUpdate.intensitas_merokok = '-';
        fieldsToUpdate.jumlah_batang = '-';
      } else {
        fieldsToUpdate.menstruasi = '-';
        const merokokVal = document.getElementById('periksaMerokok')?.value || 'Tidak';
        fieldsToUpdate.merokok = merokokVal;
        if (merokokVal === 'Aktif') {
          const jenisVal = document.getElementById('periksaJenisRokok')?.value || '-';
          fieldsToUpdate.jenis_rokok = jenisVal;
          if (jenisVal === 'Konvensional') {
            fieldsToUpdate.intensitas_merokok = document.getElementById('periksaIntensitasRokok')?.value || 'Tidak Nentu';
            fieldsToUpdate.jumlah_batang = document.getElementById('periksaJumlahBatang')?.value ? String(document.getElementById('periksaJumlahBatang').value) : '-';
          } else {
            fieldsToUpdate.intensitas_merokok = '-';
            fieldsToUpdate.jumlah_batang = '-';
          }
        } else {
          fieldsToUpdate.jenis_rokok = '-';
          fieldsToUpdate.intensitas_merokok = '-';
          fieldsToUpdate.jumlah_batang = '-';
        }
      }
      fieldsToUpdate.organ_done = 1;
      categoryName = 'Organ Indera & UKS';
      titleMsg = 'Data Organ Indera Berhasil Disimpan!';
    } else if (categoryKey === 'kesimpulan') {
      fieldsToUpdate.status_kesehatan = document.getElementById('periksaStatusKesehatan')?.value || 'Sehat';
      fieldsToUpdate.catatan_rujukan = document.getElementById('periksaCatatanRujukan')?.value.trim() || '-';
      fieldsToUpdate.kesimpulan_done = 1;
      categoryName = 'Kesimpulan & Rujukan';
      titleMsg = 'Data Kesimpulan Berhasil Disimpan!';
    }

    // Hitung status kelengkapan 5 indikator secara realtime setelah pembaruan kategori ini
    const simulatedRecord = { ...existing, ...fieldsToUpdate };
    fieldsToUpdate.is_examined = isSekolahRecordExamined(simulatedRecord) ? 1 : 0;

    // ATOMIC PARTIAL UPDATE: Only sends fields for this category to prevent overwriting others
    let freshRecord = null;
    try {
      let patchRes = await fetch('/api/sekolah', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, category: categoryKey, fields: fieldsToUpdate })
      });
      if (!patchRes.ok) {
        patchRes = await fetch('/api/sekolah', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'partial_update', id, category: categoryKey, fields: fieldsToUpdate })
        });
      }
      if (patchRes.ok) {
        const resJson = await patchRes.json();
        if (resJson.data) freshRecord = resJson.data;
      }
    } catch (err) {
      console.warn('Partial update notice:', err);
    }

    // Update local memory without overwriting other categories
    if (freshRecord) {
      sekolahRecords[idx] = { ...sekolahRecords[idx], ...freshRecord };
    } else {
      sekolahRecords[idx] = { ...sekolahRecords[idx], ...fieldsToUpdate };
    }
    if (typeof CkgIdb !== 'undefined') {
      CkgIdb.set('sekolah_records', sekolahRecords);
    }

    const currentSiswa = sekolahRecords[idx];

    // Update modal header display in real-time
    document.getElementById('displayNamaSiswa').textContent = currentSiswa.nama || 'Nama Siswa';
    document.getElementById('displaySekolahSiswa').textContent = currentSiswa.sekolah || 'Nama Sekolah';
    let cleanKelasDisp = String(currentSiswa.kelas || 'Kelas').replace(/^kelas\s+/i, '').trim();
    document.getElementById('displayKelasSiswa').textContent = cleanKelasDisp ? `Kelas ${cleanKelasDisp}` : 'Kelas';
    document.getElementById('displayJkSiswa').textContent = currentSiswa.jk === 'P' ? 'Perempuan' : 'Laki-laki';
    document.getElementById('displayTahunSiswa') && (document.getElementById('displayTahunSiswa').textContent = `Tahun CKG ${currentSiswa.tahun_skrining || '2026'}`);

    // Update menu buttons checkmarks in modal
    updateSekolahMenuBadges(currentSiswa);

    // Update header badge status
    const badgeStatus = document.getElementById('badgeStatusSkrining');
    if (badgeStatus) {
      const curStations = getSekolahRecordExamStations(currentSiswa);
      if (currentSiswa.status_kesehatan === 'Perlu Rujukan') {
        badgeStatus.style.background = '#fef2f2';
        badgeStatus.style.border = '1.5px solid #ef4444';
        badgeStatus.style.color = '#dc2626';
        badgeStatus.textContent = 'PERLU RUJUKAN';
      } else if (currentSiswa.status_kesehatan === 'Perlu Perhatian') {
        badgeStatus.style.background = '#fffbeb';
        badgeStatus.style.border = '1.5px solid #f59e0b';
        badgeStatus.style.color = '#d97706';
        badgeStatus.textContent = 'PERLU PERHATIAN';
      } else if (curStations.isComplete) {
        badgeStatus.style.background = '#d1fae5';
        badgeStatus.style.border = '1.5px solid #059669';
        badgeStatus.style.color = '#065f46';
        badgeStatus.textContent = 'SUDAH DIPERIKSA (LENGKAP)';
      } else if (curStations.isPartial) {
        badgeStatus.style.background = '#dbeafe';
        badgeStatus.style.border = '1.5px solid #2563eb';
        badgeStatus.style.color = '#1e40af';
        badgeStatus.textContent = `PERIKSA SEBAGIAN (${curStations.completedCount}/4)`;
      } else {
        badgeStatus.style.background = '#fef3c7';
        badgeStatus.style.border = '1.5px solid #f59e0b';
        badgeStatus.style.color = '#b45309';
        badgeStatus.textContent = 'BELUM DIPERIKSA';
      }
    }

    // Refresh table background view
    renderSekolahView();

    Swal.fire({
      icon: 'success',
      title: titleMsg,
      html: `Format data <strong>${categoryName}</strong> untuk <strong>${currentSiswa.nama}</strong> berhasil disimpan ke Cloud Database.<br><span style="font-size: 12px; color: #059669; font-weight: 600;">Data bagian lain tetap aman dan tidak terganggu.</span>`,
      confirmButtonColor: '#059669',
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-grid-fill"></i> Menu Bagian',
      cancelButtonText: 'Tetap di Form Ini',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        switchSekolahModalTab('menu');
      }
    });
  } catch (err) {
    console.error('Error in saveSekolahCategory:', err);
    showToast('Gagal menyimpan: ' + (err.message || 'Terjadi kesalahan'), 'danger');
  } finally {
    isSavingSekolahCategory = false;
    if (btn) {
      btn.disabled = false;
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      if (originalBtnHtml) btn.innerHTML = originalBtnHtml;
    }
  }
}

let isSavingPemeriksaanSiswa = false;

async function savePemeriksaanSiswa(event) {
  if (event && event.preventDefault) event.preventDefault();
  if (isSavingPemeriksaanSiswa) {
    console.warn('[savePemeriksaanSiswa] Sedang menyimpan seluruh pemeriksaan. Permintaan kedua diabaikan.');
    return;
  }

  const id = document.getElementById('periksaSiswaId')?.value;
  const idx = sekolahRecords.findIndex(r => r.id === id);
  if (idx < 0) {
    showToast('Data siswa tidak valid.', 'danger');
    return;
  }

  let btn = null;
  if (event) {
    const t = event.currentTarget || event.target;
    if (t) btn = t.tagName === 'BUTTON' ? t : t.closest('button');
  }
  if (!btn && window.event) {
    const t = window.event.currentTarget || window.event.target;
    if (t) btn = t.tagName === 'BUTTON' ? t : t.closest('button');
  }
  if (!btn) {
    btn = document.querySelector('#panelPemeriksaanSemuaFooter button[onclick*="savePemeriksaanSiswa"]');
  }

  let originalBtnHtml = '';
  if (btn) {
    originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.85';
    btn.innerHTML = `<span class="sekolah-spinner" aria-hidden="true"></span> Menyimpan Seluruh Data...`;
  }
  isSavingPemeriksaanSiswa = true;

  try {
    const currentUserName = sessionStorage.getItem('ckg_user_name') || 'Admin';

    // 1. Validasi Wajib Lengkapi Identitas Sebelum Pemeriksaan Fisik/Skrining
    const curNama = (document.getElementById('periksaNama')?.value || sekolahRecords[idx].nama || '').trim().toUpperCase();
    const curNik = (document.getElementById('periksaNik')?.value || sekolahRecords[idx].nik || '').trim();
    const cleanNik = curNik.replace(/\D/g, '');
    const curTglLahir = document.getElementById('periksaTglLahir')?.value || sekolahRecords[idx].tanggal_lahir || '';
    const curJk = document.getElementById('periksaJk')?.value || sekolahRecords[idx].jk || 'L';
    const curSekolah = (document.getElementById('periksaSekolah')?.value || sekolahRecords[idx].sekolah || '').trim().toUpperCase();
    const curKelas = (document.getElementById('periksaKelas')?.value || sekolahRecords[idx].kelas || '').trim().toUpperCase();

    const curProv = (document.getElementById('periksaProvinsi')?.value || sekolahRecords[idx].provinsi || '').trim();
    const curKab = (document.getElementById('periksaKabKota')?.value || sekolahRecords[idx].kab_kota || '').trim();
    const curKec = (document.getElementById('periksaKecamatan')?.value || sekolahRecords[idx].kecamatan || '').trim();
    const curKel = (document.getElementById('periksaKelurahan')?.value || sekolahRecords[idx].kelurahan || '').trim();
    const curAlamat = (document.getElementById('periksaAlamat')?.value || sekolahRecords[idx].alamat || '').trim().toUpperCase();

    const missingFields = [];
    if (!curNama) missingFields.push('Nama Siswa');
    if (!cleanNik) {
      missingFields.push('NIK (Masih kosong)');
    } else if (cleanNik.length !== 16) {
      missingFields.push(`NIK harus 16 digit (saat ini ${cleanNik.length} digit)`);
    }
    if (!curTglLahir) missingFields.push('Tanggal Lahir');
    if (!curJk) missingFields.push('Jenis Kelamin (L/P)');
    if (!curSekolah) missingFields.push('Sekolah');
    if (!curKelas) missingFields.push('Kelas');
    if (!curProv || curProv === '__manual__') missingFields.push('Provinsi');
    if (!curKab || curKab === '__manual__') missingFields.push('Kabupaten / Kota');
    if (!curKec || curKec === '__manual__') missingFields.push('Kecamatan');
    if (!curKel || curKel === '__manual__') missingFields.push('Desa / Kelurahan');
    if (!curAlamat) missingFields.push('Alamat Tempat Tinggal');

    if (missingFields.length > 0) {
      if (btn) {
        btn.disabled = false;
        btn.style.pointerEvents = '';
        btn.style.opacity = '';
        if (originalBtnHtml) btn.innerHTML = originalBtnHtml;
      }
      isSavingPemeriksaanSiswa = false;
      Swal.fire({
        icon: 'warning',
        title: 'Lengkapi Identitas Terlebih Dahulu!',
        html: `
          <div style="text-align: left; font-size: 13px; line-height: 1.6;">
            <p style="margin-bottom: 8px; color: #b91c1c; font-weight: 700;">
              <i class="bi bi-exclamation-triangle-fill"></i> Pemeriksaan fisik/skrining tidak dapat disimpan sebelum data identitas siswa lengkap:
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #334155;">
              ${missingFields.map(m => `<li><strong>${m}</strong></li>`).join('')}
            </ul>
            <p style="margin-top: 10px; font-size: 12px; color: #64748b;">
              Wajib melengkapi data Identitas (Nama, NIK 16 digit, Tanggal Lahir, Kelas) di Pos 1 Identitas sebelum pemeriksaan.
            </p>
          </div>
        `,
        confirmButtonColor: '#059669',
        confirmButtonText: 'Buka Pos 1 Identitas Sekarang'
      }).then((res) => {
        if (res.isConfirmed) {
          openFormPosPopup('identitas');
        }
      });
      return;
    }

    const isFormSemuaActive = document.getElementById('panelPemeriksaanSemuaFooter')?.classList.contains('is-active-semua');
    const hasOrganDone = isFormSemuaActive ? 1 : (Number(sekolahRecords[idx].organ_done) === 1 ? 1 : 0);
    const sistolVal = parseInt(document.getElementById('periksaSistolik')?.value, 10) || 0;
    const diastolVal = parseInt(document.getElementById('periksaDiastolik')?.value, 10) || 0;

    let imtVal = 0;
    let statusImt = 'Normal';
    const bbVal = parseFloat(document.getElementById('periksaBb')?.value) || 0;
    const tbVal = parseFloat(document.getElementById('periksaTb')?.value) || 0;
    if (bbVal > 0 && tbVal > 0) {
      const tbM = tbVal / 100;
      imtVal = parseFloat((bbVal / (tbM * tbM)).toFixed(2));
      if (imtVal < 17.0) statusImt = 'Sangat Kurus';
      else if (imtVal < 18.5) statusImt = 'Kurus';
      else if (imtVal <= 25.0) statusImt = 'Normal';
      else if (imtVal <= 27.0) statusImt = 'Gemuk';
      else statusImt = 'Obesitas';
    }

    const statusKesehatan = document.getElementById('periksaStatusKesehatan')?.value || 'Sehat';
    const catatanRujukan = document.getElementById('periksaCatatanRujukan')?.value.trim() || '-';
    const kebugaran = document.getElementById('periksaKebugaran')?.value || 'Baik';
    const menstruasi = (curJk === 'P') ? (document.getElementById('periksaMenstruasi')?.value || 'Belum') : '-';
    let merokokVal = '-';
    let jenisRokokVal = '-';
    let intensitasRokokVal = '-';
    let jumlahBatangVal = '-';
    if (curJk === 'L') {
      merokokVal = hasOrganDone ? (document.getElementById('periksaMerokok')?.value || 'Tidak') : (sekolahRecords[idx].merokok || '-');
      if (merokokVal === 'Aktif') {
        jenisRokokVal = hasOrganDone ? (document.getElementById('periksaJenisRokok')?.value || '-') : (sekolahRecords[idx].jenis_rokok || '-');
        if (jenisRokokVal === 'Konvensional') {
          intensitasRokokVal = hasOrganDone ? (document.getElementById('periksaIntensitasRokok')?.value || 'Tidak Nentu') : (sekolahRecords[idx].intensitas_merokok || '-');
          jumlahBatangVal = hasOrganDone ? (document.getElementById('periksaJumlahBatang')?.value ? String(document.getElementById('periksaJumlahBatang').value) : '-') : (sekolahRecords[idx].jumlah_batang || '-');
        }
      }
    }
    const kukuVal = document.getElementById('periksaKuku')?.value || sekolahRecords[idx].kuku || 'Pendek Bersih';

    const tglLahirVal = document.getElementById('periksaTglLahir')?.value || sekolahRecords[idx].tanggal_lahir;
    const ageObj = calculateRealtimeAge(tglLahirVal);
    const age = ageObj ? ageObj.years : 12;
    const isLabTidakDiperiksa = document.getElementById('periksaLabTidakDiperiksa')?.checked || false;
    let finalGula = '-';
    let finalHb = '-';
    let finalKatGula = '';
    let finalKatHb = '';
    let finalLabDone = 0;
    let finalLabTidakDiperiksa = 0;

    if (isLabTidakDiperiksa) {
      finalLabDone = 1;
      finalLabTidakDiperiksa = 1;
      finalGula = 'Tidak Diperiksa';
      finalHb = 'Tidak Diperiksa';
      finalKatGula = 'Tidak Diperiksa';
      finalKatHb = 'Tidak Diperiksa';
    } else {
      finalGula = (age >= 15) ? (document.getElementById('periksaGula')?.value.trim() || '-') : '-';
      finalHb = document.getElementById('periksaHb')?.value.trim() || '-';
      finalKatGula = document.getElementById('periksaKategoriGula')?.value || getKategoriGulaDarah(finalGula, age);
      finalKatHb = document.getElementById('periksaKategoriHb')?.value || getKategoriHb(finalHb, age, curJk);
      finalLabDone = !!((finalHb && finalHb !== '-') || (finalGula && finalGula !== '-')) ? 1 : (sekolahRecords[idx].lab_done || 0);
    }

    const updatedRecord = {
      ...sekolahRecords[idx],
      nama: document.getElementById('periksaNama')?.value.trim().toUpperCase() || sekolahRecords[idx].nama,
      nik: document.getElementById('periksaNik')?.value.trim() || '',
      jk: curJk,
      sekolah: document.getElementById('periksaSekolah')?.value.trim().toUpperCase() || sekolahRecords[idx].sekolah,
      kelas: document.getElementById('periksaKelas')?.value.trim().toUpperCase() || sekolahRecords[idx].kelas,
      tanggal_lahir: document.getElementById('periksaTglLahir')?.value || '',
      provinsi: curProv || 'Jawa Barat',
      kab_kota: curKab || 'Kabupaten Bandung',
      kecamatan: curKec || 'Banjaran',
      kelurahan: curKel || 'Tarajusari',
      alamat: curAlamat || '',
      bb: bbVal,
      tb: tbVal,
      lp: parseFloat(document.getElementById('periksaLp')?.value) || 0,
      imt: imtVal,
      status_imt: statusImt,
      td_sistolik: sistolVal,
      td_diastolik: diastolVal,
      kategori_td: document.getElementById('periksaKategoriTd')?.value || getKategoriTekananDarah(sistolVal, diastolVal),
      gula_darah: finalGula,
      kategori_gula: finalKatGula,
      hb: finalHb,
      kategori_hb: finalKatHb,
      lab_tidak_diperiksa: finalLabTidakDiperiksa,
      telinga: hasOrganDone ? (document.getElementById('periksaTelinga')?.value || 'Tidak ada serumen') : (sekolahRecords[idx].telinga || '-'),
      gigi: hasOrganDone ? (document.getElementById('periksaGigi')?.value || 'Tidak ada') : (sekolahRecords[idx].gigi || '-'),
      mata: hasOrganDone ? (document.getElementById('periksaMata')?.value || 'Normal') : (sekolahRecords[idx].mata || '-'),
      kuku: hasOrganDone ? kukuVal : (sekolahRecords[idx].kuku || '-'),
      kebugaran: hasOrganDone ? (kebugaran || 'Baik') : (sekolahRecords[idx].kebugaran || '-'),
      menstruasi: hasOrganDone ? menstruasi : (sekolahRecords[idx].menstruasi || '-'),
      merokok: hasOrganDone ? merokokVal : (sekolahRecords[idx].merokok || '-'),
      jenis_rokok: hasOrganDone ? jenisRokokVal : (sekolahRecords[idx].jenis_rokok || '-'),
      intensitas_merokok: hasOrganDone ? intensitasRokokVal : (sekolahRecords[idx].intensitas_merokok || '-'),
      jumlah_batang: hasOrganDone ? jumlahBatangVal : (sekolahRecords[idx].jumlah_batang || '-'),
      status_kesehatan: statusKesehatan || sekolahRecords[idx].status_kesehatan || 'Sehat',
      catatan_rujukan: (catatanRujukan && catatanRujukan !== '-') ? catatanRujukan : (sekolahRecords[idx].catatan_rujukan || '-'),
      antro_done: (bbVal > 0 && tbVal > 0) ? 1 : (sekolahRecords[idx].antro_done || 0),
      vital_done: (sistolVal > 0) ? 1 : (sekolahRecords[idx].vital_done || 0),
      lab_done: finalLabDone,
      organ_done: hasOrganDone ? 1 : 0,
      kesimpulan_done: (statusKesehatan && statusKesehatan !== 'Sehat' && statusKesehatan !== '') || (catatanRujukan && catatanRujukan !== '-' && catatanRujukan.trim() !== '') ? 1 : (sekolahRecords[idx].kesimpulan_done || 0),
      identitas_done: 1,
      is_examined: 0, // Akan dihitung tepat di bawah
      petugas_entry: currentUserName,
      tanggal_entry: new Date().toISOString().substring(0, 10)
    };

    // Hitung status kelengkapan 5 indikator secara objektif
    updatedRecord.is_examined = isSekolahRecordExamined(updatedRecord) ? 1 : 0;

    // Directly POST to Cloud Database
    try {
      await fetch('/api/sekolah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([updatedRecord])
      });
    } catch (err) {
      console.warn('Sync to cloud error:', err);
    }

    await fetchSekolahRecordsFromCloud();
    closePemeriksaanModal();

    Swal.fire({
      icon: 'success',
      title: 'Pemeriksaan Berhasil Disimpan!',
      html: `Seluruh data pemeriksaan untuk <strong>${updatedRecord.nama}</strong> (${statusKesehatan}) telah berhasil disimpan langsung ke Cloud Database.`,
      confirmButtonColor: '#059669',
      timer: 2500
    });
  } catch (err) {
    console.error('Error saving all pemeriksaan:', err);
    showToast('Gagal menyimpan data: ' + (err.message || 'Terjadi kesalahan'), 'danger');
  } finally {
    isSavingPemeriksaanSiswa = false;
    if (btn) {
      btn.disabled = false;
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      if (originalBtnHtml) btn.innerHTML = originalBtnHtml;
    }
  }
}

// --------------------------------------------------------------------------
// • TAMBAH SISWA BARU (LANGSUNG KE CLOUD DATABASE)
// --------------------------------------------------------------------------

let isTambahSiswaBankDataChecked = false;
let isTambahSiswaFromBankData = false;

function setTambahSiswaFieldsLockState(isLocked, isFromBankData = false) {
  const fields = [
    'tambahSiswaNama',
    'tambahSiswaJk',
    'tambahSiswaTglLahir',
    'tambahSiswaProvinsi',
    'tambahSiswaKabKota',
    'tambahSiswaKecamatan',
    'tambahSiswaKelurahan',
    'tambahSiswaAlamat'
  ];

  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = isLocked;
    if (isLocked) {
      el.style.backgroundColor = '#f1f5f9';
      el.style.color = '#334155';
      el.style.cursor = 'not-allowed';
      if (isFromBankData) {
        el.title = 'Terkunci: Data resmi terverifikasi dari Bank Data';
      } else {
        el.title = 'Terkunci: Harap lakukan Cek NIK terlebih dahulu';
      }
    } else {
      el.style.backgroundColor = '';
      el.style.color = '';
      el.style.cursor = '';
      el.removeAttribute('title');
    }
  });

  // Tombol Isi Manual Wilayah ikut terkunci jika pendaftaran siswa dikunci
  const manualBtns = document.querySelectorAll('#modalTambahSiswa .btn-manual-wilayah');
  manualBtns.forEach(btn => {
    btn.disabled = isLocked;
    btn.style.opacity = isLocked ? '0.4' : '1';
    btn.style.pointerEvents = isLocked ? 'none' : 'auto';
  });

  // Sekolah: jika login sekolah, tetap terkunci pada nama sekolah akunnya
  const portalType = (sessionStorage.getItem('ckg_portal_type') || '').toLowerCase();
  const schoolAccountName = (sessionStorage.getItem('ckg_user_name') || '').trim();
  const sekolahEl = document.getElementById('tambahSiswaSekolah');
  if (sekolahEl) {
    if (portalType === 'sekolah' && schoolAccountName) {
      sekolahEl.disabled = true;
      sekolahEl.style.backgroundColor = '#f1f5f9';
      sekolahEl.style.cursor = 'not-allowed';
    } else {
      sekolahEl.disabled = isLocked;
      sekolahEl.style.backgroundColor = isLocked ? '#f1f5f9' : '';
      sekolahEl.style.cursor = isLocked ? 'not-allowed' : '';
    }
  }

  // Kelas: terbuka jika NIK sudah dicek
  const kelasEl = document.getElementById('tambahSiswaKelas');
  if (kelasEl) {
    kelasEl.disabled = isLocked;
    kelasEl.style.backgroundColor = isLocked ? '#f1f5f9' : '';
    kelasEl.style.cursor = isLocked ? 'not-allowed' : '';
  }
}

function updateBankDataBadgeStatusTambah(inBankData, customText) {
  const badge = document.getElementById('badgeBankDataStatusTambah');
  if (!badge) return;

  if (inBankData === true) {
    badge.style.background = '#dcfce7';
    badge.style.color = '#15803d';
    badge.style.borderColor = '#86efac';
    badge.innerHTML = `<i class="bi bi-patch-check-fill" style="color: #10b981;"></i> ${escapeHtml(customText || 'Data Terdaftar di Bank Data')}`;
  } else if (inBankData === false) {
    badge.style.background = '#e0f2fe';
    badge.style.color = '#0369a1';
    badge.style.borderColor = '#7dd3fc';
    badge.innerHTML = `<i class="bi bi-pencil-square" style="color: #0284c7;"></i> ${escapeHtml(customText || 'Belum Terdaftar (Silakan Daftarkan)')}`;
  } else {
    badge.style.background = '#fee2e2';
    badge.style.color = '#b91c1c';
    badge.style.borderColor = '#fca5a5';
    badge.innerHTML = `<i class="bi bi-shield-lock-fill" style="color: #ef4444;"></i> ${escapeHtml(customText || 'Wajib Cek NIK Dulu')}`;
  }
}

function onTambahSiswaNikInputChange() {
  isTambahSiswaBankDataChecked = false;
  isTambahSiswaFromBankData = false;
  setTambahSiswaFieldsLockState(true, false);
  updateBankDataBadgeStatusTambah(null, 'Wajib Cek NIK Dulu');
}

function calculateTambahSiswaAge() {
  const dobInput = document.getElementById('tambahSiswaTglLahir');
  const usiaInput = document.getElementById('tambahSiswaUsia');
  if (!dobInput || !usiaInput) return;

  const dobVal = dobInput.value;
  if (!dobVal) {
    usiaInput.value = '';
    return;
  }

  const birthDate = new Date(dobVal);
  if (isNaN(birthDate.getTime())) {
    usiaInput.value = '';
    return;
  }

  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  if (today.getDate() < birthDate.getDate()) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years < 0) {
    usiaInput.value = 'Tanggal belum lewat';
    return;
  }

  usiaInput.value = `${years} Tahun ${months} Bulan`;
}

async function cekNikTambahSiswaBankData() {
  const nikInput = document.getElementById('tambahSiswaNik');
  const rawNik = nikInput ? nikInput.value.trim() : '';
  const cleanNik = rawNik.replace(/\D/g, '');

  if (cleanNik.length !== 16) {
    Swal.fire({
      icon: 'warning',
      title: 'NIK Tidak Valid',
      text: `NIK harus terdiri dari 16 digit angka (saat ini ${cleanNik.length} digit). Harap masukkan NIK 16 digit terlebih dahulu.`,
      confirmButtonColor: '#059669'
    });
    return;
  }

  const btn = document.getElementById('btnCekNikTambahSiswa');
  const origBtnText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Memeriksa...';
  }

  Swal.fire({
    title: 'Mengecek Bank Data...',
    html: `<div style="font-size: 13.5px; color: #475569; margin-top: 8px;">Sedang mencari NIK <strong>${cleanNik}</strong> di Bank Data CKG & ASIK...</div>`,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => { Swal.showLoading(); }
  });

  let foundData = null;
  let source = '';

  // 1. Cek local dataset ckgGratisRecords
  if (Array.isArray(ckgGratisRecords) && ckgGratisRecords.length > 0) {
    const match = ckgGratisRecords.find(r => String(r.nik || '').replace(/\D/g, '') === cleanNik);
    if (match) { foundData = match; source = 'Cek Kesehatan Gratis'; }
  }

  // 2. Cek local dataset records
  if (!foundData && Array.isArray(records) && records.length > 0) {
    const match = records.find(r => String(r.nik || '').replace(/\D/g, '') === cleanNik);
    if (match) { foundData = match; source = 'Database Pasien CKG'; }
  }

  // 3. Cek API /api/enco/lookup-nik
  if (!foundData) {
    try {
      const res = await fetch(`/api/enco/lookup-nik?nik=${encodeURIComponent(cleanNik)}`);
      if (res.ok) {
        const j = await res.json();
        if (j && j.success && j.found && j.data) {
          foundData = j.data;
          source = 'Bank Data ASIK';
        }
      }
    } catch (_) { }
  }

  // 4. Cek fallback search /api/enco/records
  if (!foundData) {
    try {
      const resSearch = await fetch(`/api/enco/records?search=${encodeURIComponent(cleanNik)}&limit=10`);
      if (resSearch.ok) {
        const jSearch = await resSearch.json();
        if (jSearch && jSearch.success && Array.isArray(jSearch.data)) {
          const match = jSearch.data.find(item => String(item.nik || '').replace(/\D/g, '') === cleanNik);
          if (match) { foundData = match; source = 'Bank Data ASIK'; }
        }
      }
    } catch (_) { }
  }

  // 5. Cek API /api/ckg-gratis
  if (!foundData) {
    try {
      const res = await fetch('/api/ckg-gratis');
      if (res.ok) {
        const j = await res.json();
        if (j && j.success && Array.isArray(j.data)) {
          const match = j.data.find(r => String(r.nik || '').replace(/\D/g, '') === cleanNik);
          if (match) { foundData = match; source = 'Cek Kesehatan Gratis'; }
        }
      }
    } catch (_) { }
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = origBtnText || '<i class="bi bi-search"></i> Cek NIK';
  }

  if (foundData) {
    isTambahSiswaBankDataChecked = true;
    isTambahSiswaFromBankData = true;

    const rawNama = foundData.nama || foundData.nama_pasien || '';
    const rawDob = foundData.tanggal_lahir || foundData.tgl_lahir || '';
    let rawJk = foundData.jenis_kelamin || foundData.jk || 'L';
    if (String(rawJk).toUpperCase().startsWith('P') || String(rawJk).toLowerCase() === 'perempuan') rawJk = 'P';
    else rawJk = 'L';
    const rawProv = foundData.provinsi || 'Jawa Barat';
    const rawKab = foundData.kab_kota || 'Kabupaten Bandung';
    const rawKec = foundData.kecamatan || 'Banjaran';
    const rawKel = foundData.kelurahan || '';
    const rawAlamat = foundData.alamat || '';

    await Swal.fire({
      icon: 'success',
      title: 'Data Ditemukan di Bank Data!',
      html: `
        <div style="text-align: left; background: #f0fdf4; border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 14px 16px; margin-top: 10px; font-size: 13px;">
          <div style="font-weight: 800; color: #065f46; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <i class="bi bi-patch-check-fill" style="color: #10b981; font-size: 18px;"></i>
            <span>Data Terverifikasi (${escapeHtml(source)})</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; line-height: 1.6; font-size: 12.5px;">
            <tr><td style="width: 105px; color: #64748b;">NIK:</td><td style="font-weight: 700; font-family: monospace;">${escapeHtml(cleanNik)}</td></tr>
            <tr><td style="color: #64748b;">Nama:</td><td style="font-weight: 800; color: #047857;">${escapeHtml(rawNama)}</td></tr>
            <tr><td style="color: #64748b;">Jenis Kelamin:</td><td style="font-weight: 700;">${rawJk === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)'}</td></tr>
            <tr><td style="color: #64748b;">Tanggal Lahir:</td><td>${escapeHtml(rawDob || '-')}</td></tr>
            <tr><td style="color: #64748b;">Wilayah:</td><td>${escapeHtml([rawKel, rawKec, rawKab, rawProv].filter(Boolean).join(', ') || '-')}</td></tr>
            <tr><td style="color: #64748b;">Alamat:</td><td>${escapeHtml(rawAlamat || '-')}</td></tr>
          </table>
          <div style="margin-top: 10px; font-size: 12px; color: #047857; font-weight: 700;">
            <i class="bi bi-info-circle-fill"></i> Data identitas otomatis disesuaikan dengan data resmi Bank Data dan terkunci. Silakan pilih kelas siswa.
          </div>
        </div>
      `,
      confirmButtonText: '<i class="bi bi-check2-circle"></i> Gunakan Data Bank Data',
      confirmButtonColor: '#059669'
    });

    if (rawNama) document.getElementById('tambahSiswaNama').value = rawNama.toUpperCase();
    document.getElementById('tambahSiswaJk').value = rawJk;
    if (rawDob) document.getElementById('tambahSiswaTglLahir').value = rawDob;
    if (rawAlamat) document.getElementById('tambahSiswaAlamat').value = rawAlamat;
    calculateTambahSiswaAge();

    initWilayahDropdownsCascade('tambahSiswaProvinsi', 'tambahSiswaKabKota', 'tambahSiswaKecamatan', 'tambahSiswaKelurahan', rawProv, rawKab, rawKec, rawKel);

    setTambahSiswaFieldsLockState(true, true);
    updateBankDataBadgeStatusTambah(true, 'Data Terdaftar di Bank Data');
    document.getElementById('tambahSiswaKelas')?.focus();
  } else {
    isTambahSiswaBankDataChecked = true;
    isTambahSiswaFromBankData = false;

    await Swal.fire({
      icon: 'info',
      title: 'NIK Belum Terdaftar di Bank Data',
      html: `
        <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #334155;">
          NIK <strong>${escapeHtml(cleanNik)}</strong> belum ditemukan di Bank Data CKG / ASIK.
          <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 12px 14px; margin-top: 10px; color: #1e40af; font-weight: 700;">
            <i class="bi bi-unlock-fill" style="color: #2563eb;"></i> Kolom pendaftaran telah terbuka. Silakan lengkapi seluruh data identitas siswa untuk mendaftarkan.
          </div>
        </div>
      `,
      confirmButtonText: '<i class="bi bi-pencil-square"></i> Lengkapi Identitas Siswa',
      confirmButtonColor: '#2563eb'
    });

    setTambahSiswaFieldsLockState(false, false);
    updateBankDataBadgeStatusTambah(false, 'Belum Terdaftar (Silakan Daftarkan)');
    document.getElementById('tambahSiswaNama')?.focus();
  }
}

function openTambahSiswaModal() {
  const form = document.getElementById('formTambahSiswa');
  if (form) form.reset();

  isTambahSiswaBankDataChecked = false;
  isTambahSiswaFromBankData = false;

  populateSchoolSelectElement('tambahSiswaSekolah');

  const portalType = (sessionStorage.getItem('ckg_portal_type') || '').toLowerCase();
  const schoolAccountName = (sessionStorage.getItem('ckg_user_name') || '').trim();

  // If a school filter is currently chosen, default to it
  const currentSekolahFilter = document.getElementById('filterSelectSekolah')?.value;
  const currentKelasFilter = document.getElementById('filterSelectKelas')?.value;
  if (currentSekolahFilter) document.getElementById('tambahSiswaSekolah').value = currentSekolahFilter;

  // Khusus Akun Sekolah: Kunci pilihan sekolah otomatis sesuai akun login dan tidak bisa diubah
  const tambahSekolahEl = document.getElementById('tambahSiswaSekolah');
  if (tambahSekolahEl) {
    if (portalType === 'sekolah' && schoolAccountName) {
      tambahSekolahEl.value = schoolAccountName;
      tambahSekolahEl.disabled = true;
      tambahSekolahEl.style.backgroundColor = '#f1f5f9';
      tambahSekolahEl.style.cursor = 'not-allowed';
    } else {
      tambahSekolahEl.disabled = true;
      tambahSekolahEl.style.backgroundColor = '#f1f5f9';
      tambahSekolahEl.style.cursor = 'not-allowed';
    }
  }

  updateTambahSiswaKelasDropdown();
  if (currentKelasFilter) document.getElementById('tambahSiswaKelas').value = currentKelasFilter;

  // Initial Lock State: All demographic fields locked until Cek NIK is pressed
  setTambahSiswaFieldsLockState(true, false);
  updateBankDataBadgeStatusTambah(null, 'Wajib Cek NIK Dulu');

  // Initialize wilayah dropdowns with Puskesmas default
  initWilayahDropdownsCascade('tambahSiswaProvinsi', 'tambahSiswaKabKota', 'tambahSiswaKecamatan', 'tambahSiswaKelurahan', 'Jawa Barat', 'Kabupaten Bandung', 'Banjaran', 'Tarajusari');

  const modal = document.getElementById('modalTambahSiswa');
  if (modal) {
    modal.classList.add('active');
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
}

function closeTambahSiswaModal() {
  const modal = document.getElementById('modalTambahSiswa');
  if (modal) {
    modal.classList.remove('active');
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
  isTambahSiswaBankDataChecked = false;
  isTambahSiswaFromBankData = false;
}

let isSavingTambahSiswa = false;

async function saveTambahSiswa(event) {
  if (event && event.preventDefault) event.preventDefault();
  if (isSavingTambahSiswa) {
    console.warn('[saveTambahSiswa] Sedang menambahkan siswa baru. Permintaan kedua diabaikan.');
    return;
  }

  const portalType = (sessionStorage.getItem('ckg_portal_type') || '').toLowerCase();
  const schoolAccountName = (sessionStorage.getItem('ckg_user_name') || '').trim();

  // 1. Validasi NIK sudah dicek di Bank Data
  const rawNik = (document.getElementById('tambahSiswaNik')?.value || '').trim();
  const cleanNik = rawNik.replace(/\D/g, '');

  if (!isTambahSiswaBankDataChecked || cleanNik.length !== 16) {
    Swal.fire({
      icon: 'warning',
      title: 'Harap Cek NIK Terlebih Dahulu',
      text: 'Kolom identitas masih terkunci. Harap masukkan 16 digit NIK Siswa dan klik tombol "Cek NIK" untuk memverifikasi ke Bank Data CKG sebelum menyimpan data.',
      confirmButtonColor: '#059669'
    });
    return;
  }

  const nama = (document.getElementById('tambahSiswaNama')?.value || '').trim().toUpperCase();
  const jk = (document.getElementById('tambahSiswaJk')?.value || 'L').trim();
  let sekolah = (document.getElementById('tambahSiswaSekolah')?.value || '').trim().toUpperCase();
  if (portalType === 'sekolah' && schoolAccountName) {
    sekolah = schoolAccountName.toUpperCase();
  }
  const kelas = (document.getElementById('tambahSiswaKelas')?.value || '').trim().toUpperCase();
  const tglLahir = (document.getElementById('tambahSiswaTglLahir')?.value || '').trim();
  const prov = (document.getElementById('tambahSiswaProvinsi')?.value || '').trim();
  const kab = (document.getElementById('tambahSiswaKabKota')?.value || '').trim();
  const kec = (document.getElementById('tambahSiswaKecamatan')?.value || '').trim();
  const kel = (document.getElementById('tambahSiswaKelurahan')?.value || '').trim();
  const alamat = (document.getElementById('tambahSiswaAlamat')?.value || '').trim().toUpperCase();

  // 2. Validasi kelengkapan semua identitas
  if (!nama || !sekolah || !kelas || !tglLahir || !prov || !kab || !kec || !kel || !alamat ||
      prov === '__manual__' || kab === '__manual__' || kec === '__manual__' || kel === '__manual__') {
    Swal.fire({
      icon: 'warning',
      title: 'Identitas Belum Lengkap',
      text: 'Semua kolom identitas (Nama Lengkap, NIK 16 digit, Jenis Kelamin, Asal Sekolah, Kelas, Tanggal Lahir, Provinsi, Kab/Kota, Kecamatan, Desa/Kelurahan, dan Alamat) wajib diisi lengkap!',
      confirmButtonColor: '#059669'
    });
    return;
  }

  const nikInput = document.getElementById('tambahSiswaNik').value.trim();

  // Anti-Duplikat NIK: Cek apakah NIK sudah ada di database (hanya jika NIK valid & terisi)
  if (isNikValidForDuplicate(nikInput)) {
    const existingByNik = sekolahRecords.filter(r => isNikValidForDuplicate(r.nik) && String(r.nik).trim() === nikInput);
    if (existingByNik.length > 0) {
      const existList = existingByNik.map(r =>
        `• <strong>${escapeHtml(r.nama)}</strong> - ${escapeHtml(r.sekolah || '-')} / ${escapeHtml(r.kelas || '-')}`
      ).join('<br>');

      const dupResult = await Swal.fire({
        icon: 'warning',
        title: '⚠️ NIK Sudah Terdaftar!',
        html: `
          <div style="text-align: left; font-size: 13px; line-height: 1.6;">
            <p>NIK <strong>${escapeHtml(nikInput)}</strong> sudah ditemukan pada data siswa berikut:</p>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 10px 14px; margin: 8px 0; color: #991b1b;">
              ${existList}
            </div>
            <p style="color: #64748b; font-size: 12px;">Apakah Anda yakin ingin menambahkan <strong>${escapeHtml(nama)}</strong> sebagai data baru? Data duplikat bisa menyulitkan proses skrining.</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Tetap Simpan (Duplikat)',
        cancelButtonText: 'Batal, Jangan Simpan',
        confirmButtonColor: '#d97706',
        cancelButtonColor: '#64748b',
        reverseButtons: true
      });

      if (!dupResult.isConfirmed) {
        showToast('Penyimpanan dibatalkan. Siswa tidak ditambahkan.', 'info');
        return;
      }
    }
  }
  // PENTING: Jika NIK kosong / belum ada, TIDAK di anggap duplikat data (langsung disimpan)

  let submitBtn = event?.target?.querySelector?.('button[type="submit"]') || document.querySelector('#formTambahSiswa button[type="submit"]');
  let originalBtnHtml = '';
  if (submitBtn) {
    originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.style.pointerEvents = 'none';
    submitBtn.style.opacity = '0.85';
    submitBtn.innerHTML = `<span class="sekolah-spinner" aria-hidden="true"></span> Menyimpan Siswa...`;
  }
  isSavingTambahSiswa = true;

  try {
    const currentUserName = sessionStorage.getItem('ckg_user_name') || 'Admin';

    const cleanNik = nikInput.replace(/\D/g, '');
    const isIdLengkap = !!(nama && cleanNik.length === 16 && tglLahir && sekolah && kelas && prov && kab && kec && kel && alamat);

    const newSiswa = {
      id: `SCH-${Date.now()}`,
      no: sekolahRecords.length + 1,
      nama: nama,
      nik: nikInput,
      jk: document.getElementById('tambahSiswaJk')?.value || 'L',
      sekolah: sekolah,
      kelas: kelas,
      tanggal_lahir: tglLahir,
      alamat: alamat,
      provinsi: prov,
      kab_kota: kab,
      kecamatan: kec,
      kelurahan: kel,
      bb: 0,
      tb: 0,
      lp: 0,
      imt: 0,
      status_imt: 'Normal',
      td_sistolik: 0,
      td_diastolik: 0,
      gula_darah: '-',
      hb: '-',
      telinga: '-',
      gigi: '-',
      mata: '-',
      kuku: '-',
      kebugaran: '-',
      menstruasi: '-',
      merokok: 'Tidak',
      jenis_rokok: '-',
      intensitas_merokok: '-',
      jumlah_batang: '-',
      status_kesehatan: 'Sehat',
      catatan_rujukan: '-',
      antro_done: 0,
      vital_done: 0,
      lab_done: 0,
      organ_done: 0,
      kesimpulan_done: 0,
      identitas_done: isIdLengkap ? 1 : 0,
      is_bank_data: isTambahSiswaFromBankData ? 1 : 0,
      from_bank_data: isTambahSiswaFromBankData ? 1 : 0,
      ttd_logs: '[]',
      is_examined: false,
      petugas_entry: currentUserName,
      tanggal_entry: new Date().toISOString().substring(0, 10),
      tahun_skrining: document.getElementById('filterSelectTahun')?.value !== 'all' ? (document.getElementById('filterSelectTahun')?.value || '2026') : '2026'
    };

    // Directly POST to Cloud Database
    try {
      await fetch('/api/sekolah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([newSiswa])
      });
    } catch (err) {
      console.warn('Sync to cloud error:', err);
    }

    await fetchSekolahRecordsFromCloud();
    closeTambahSiswaModal();

    Swal.fire({
      icon: 'success',
      title: 'Siswa Berhasil Ditambahkan!',
      html: `Data siswa <strong>${newSiswa.nama}</strong> (${newSiswa.sekolah} - ${newSiswa.kelas}) telah tersimpan langsung di Cloud Database.`,
      confirmButtonColor: '#059669',
      timer: 2500
    });
  } catch (err) {
    console.error('Error saving tambah siswa:', err);
    showToast('Gagal menambahkan siswa: ' + (err.message || 'Terjadi kesalahan'), 'danger');
  } finally {
    isSavingTambahSiswa = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.pointerEvents = '';
      submitBtn.style.opacity = '';
      if (originalBtnHtml) submitBtn.innerHTML = originalBtnHtml;
    }
  }
}

// --------------------------------------------------------------------------
// 🗑️ HAPUS SISWA (LANGSUNG DARI CLOUD DATABASE)
// --------------------------------------------------------------------------

async function deleteSiswaSekolah(id) {
  const siswa = sekolahRecords.find(r => r.id === id);
  const namaSiswa = siswa ? siswa.nama : 'Siswa ini';

  const result = await Swal.fire({
    icon: 'warning',
    title: 'Hapus Data Siswa?',
    html: `Apakah Anda yakin ingin menghapus <strong>${namaSiswa}</strong> secara permanen dari Cloud Database?`,
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus Data',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b'
  });

  if (!result.isConfirmed) return;

  try {
    await fetch(`/api/sekolah?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Delete from cloud error:', err);
  }

  await fetchSekolahRecordsFromCloud();
  showToast(`Data ${namaSiswa} berhasil dihapus dari Cloud Database.`, 'info');
}

// ==========================================================================
// 🗑️ FITUR HAPUS DATA SISWA SPESIFIK & BULK (SEKOLAH, KELAS, TAHUN, STATUS)
// ==========================================================================

function openHapusDataSekolahModal() {
  const currentUserRole = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  if (!currentUserRole.includes('admin') && !currentUserRole.includes('koordinator')) {
    showToast('Hanya Koordinator dan Admin yang memiliki izin untuk menghapus data CKG Sekolah.', 'warning');
    return;
  }

  const modal = document.getElementById('modalHapusDataSekolah');
  if (!modal) return;

  const selectSekolah = document.getElementById('hapusSekolahPilihSekolah');
  if (selectSekolah) {
    const masterSet = new Set(MASTER_SARANA_SEKOLAH.map(s => s.nama.toUpperCase()));
    const extraSchools = [];
    sekolahRecords.forEach(r => {
      if (r.sekolah && r.sekolah.trim()) {
        const up = r.sekolah.trim().toUpperCase();
        if (!masterSet.has(up) && !extraSchools.includes(up)) extraSchools.push(up);
      }
    });

    const sdList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SD').map(s => s.nama);
    const smpList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SMP').map(s => s.nama);
    const smaList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SMA').map(s => s.nama);

    let html = '<option value="">-- Pilih Sekolah Target --</option>';
    html += '<option value="all" style="font-weight: 800; color: #dc2626;">⚠️ [SEMUA SEKOLAH] (Hapus Seluruh Sekolah Terdaftar)</option>';
    html += '<optgroup label="📚 SD / MI (Kelas 1 - 6)">';
    html += sdList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    html += '</optgroup>';
    html += '<optgroup label="🏫 SMP / MTs (Kelas 7 - 9)">';
    html += smpList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    html += '</optgroup>';
    html += '<optgroup label="🎓 SMA / SMK / MA (Kelas 10 - 12)">';
    html += smaList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    html += '</optgroup>';
    if (extraSchools.length > 0) {
      html += '<optgroup label="📍 Sekolah Lainnya">';
      html += extraSchools.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
      html += '</optgroup>';
    }

    selectSekolah.innerHTML = html;

    // Sinkronkan otomatis jika filter sekolah sedang aktif di halaman utama CKG Sekolah
    const activeSekolah = document.getElementById('filterSelectSekolah')?.value;
    if (activeSekolah) {
      selectSekolah.value = activeSekolah;
    }
  }

  // Populate Dropdown Tahun Skrining
  const selectTahun = document.getElementById('hapusSekolahPilihTahun');
  if (selectTahun) {
    const yearsSet = new Set(['2026', '2027', '2025']);
    sekolahRecords.forEach(r => {
      if (r.tahun_skrining && String(r.tahun_skrining).trim()) {
        yearsSet.add(String(r.tahun_skrining).trim());
      }
      if (r.tanggal_entry && r.tanggal_entry.length >= 4) {
        const y = r.tanggal_entry.substring(0, 4);
        if (/^\d{4}$/.test(y)) yearsSet.add(y);
      }
    });

    const sortedYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    let htmlTahun = '<option value="all">-- Semua Tahun --</option>';
    sortedYears.forEach(y => {
      const isCur = y === '2026' ? ' (Tahun Berjalan)' : '';
      htmlTahun += `<option value="${escapeHtml(y)}">${escapeHtml(y)}${isCur}</option>`;
    });
    selectTahun.innerHTML = htmlTahun;

    const activeTahun = document.getElementById('filterSelectTahun')?.value;
    if (activeTahun && (activeTahun === 'all' || sortedYears.includes(activeTahun))) {
      selectTahun.value = activeTahun;
    } else {
      selectTahun.value = '2026';
    }
  }

  // Reset status filter ke Semua
  const selectStatus = document.getElementById('hapusSekolahPilihStatus');
  if (selectStatus) selectStatus.value = 'all';

  // Reset checkbox konfirmasi & disable tombol hapus
  const chk = document.getElementById('hapusSekolahConfirmCheck');
  if (chk) chk.checked = false;
  const btn = document.getElementById('btnSubmitHapusSekolah');
  if (btn) btn.disabled = true;

  // Update opsi kelas berdasarkan sekolah yang terpilih
  onHapusSekolahChange();

  modal.classList.add('open');
  modal.style.display = 'flex';
}

function closeHapusDataSekolahModal() {
  const modal = document.getElementById('modalHapusDataSekolah');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function onHapusSekolahChange() {
  const selectSekolah = document.getElementById('hapusSekolahPilihSekolah');
  const selectKelas = document.getElementById('hapusSekolahPilihKelas');
  if (!selectKelas) return;

  const chosenSekolah = (selectSekolah?.value || '').trim();
  const currentKelasVal = selectKelas.value;

  const kelasSet = new Set();
  if (chosenSekolah && chosenSekolah !== 'all') {
    const standardClasses = getClassesForSchool(chosenSekolah);
    standardClasses.forEach(k => kelasSet.add(k.toUpperCase()));
    sekolahRecords.forEach(r => {
      if ((r.sekolah || '').toUpperCase() === chosenSekolah.toUpperCase()) {
        if (r.kelas && r.kelas.trim()) kelasSet.add(r.kelas.trim().toUpperCase());
      }
    });
  } else {
    ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6',
      'Kelas 7', 'Kelas 8', 'Kelas 9', 'Kelas 10', 'Kelas 11', 'Kelas 12', 'Lulus'].forEach(k => kelasSet.add(k.toUpperCase()));
    sekolahRecords.forEach(r => {
      if (r.kelas && r.kelas.trim()) kelasSet.add(r.kelas.trim().toUpperCase());
    });
  }

  const sortedKelas = Array.from(kelasSet).sort((a, b) => {
    if (a.toUpperCase() === 'LULUS') return 1;
    if (b.toUpperCase() === 'LULUS') return -1;
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB || a.localeCompare(b);
  });

  let html = '<option value="all">-- Semua Kelas --</option>';
  html += sortedKelas.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
  selectKelas.innerHTML = html;

  const activeMainKelas = document.getElementById('filterSelectKelas')?.value;
  if (activeMainKelas && kelasSet.has(activeMainKelas.toUpperCase())) {
    selectKelas.value = activeMainKelas;
  } else if (currentKelasVal && kelasSet.has(currentKelasVal.toUpperCase())) {
    selectKelas.value = currentKelasVal;
  } else {
    selectKelas.value = 'all';
  }

  updateHapusSekolahPreview();
}

function getFilteredRecordsForDeletion() {
  const chosenSekolah = (document.getElementById('hapusSekolahPilihSekolah')?.value || '').trim();
  const chosenKelas = (document.getElementById('hapusSekolahPilihKelas')?.value || 'all').trim();
  const chosenTahun = (document.getElementById('hapusSekolahPilihTahun')?.value || 'all').trim();
  const chosenStatus = (document.getElementById('hapusSekolahPilihStatus')?.value || 'all').trim();
  const chosenNikValid = (document.getElementById('hapusSekolahPilihNikValid')?.value || 'all').trim();

  if (!chosenSekolah) return [];

  return sekolahRecords.filter(r => {
    // 1. Filter Sekolah
    if (chosenSekolah !== 'all') {
      if ((r.sekolah || '').toUpperCase() !== chosenSekolah.toUpperCase()) return false;
    }

    // 2. Filter Kelas
    if (chosenKelas !== 'all') {
      if ((r.kelas || '').toUpperCase() !== chosenKelas.toUpperCase()) return false;
    }

    // 3. Filter Tahun
    if (chosenTahun !== 'all') {
      const recYear = String(r.tahun_skrining || (r.tanggal_entry ? r.tanggal_entry.substring(0, 4) : '2026')).trim();
      let matchYear = (recYear === chosenTahun);
      if (!matchYear && Array.isArray(r.riwayat_pemeriksaan) && r.riwayat_pemeriksaan.length > 0) {
        matchYear = r.riwayat_pemeriksaan.some(h => {
          const hy = String(h.tahun || (h.tanggal_pemeriksaan ? h.tanggal_pemeriksaan.substring(0, 4) : '') || h.tahun_ajaran || '').trim();
          return hy === chosenTahun || hy.includes(chosenTahun);
        });
      }
      if (!matchYear) return false;
    }

    // 4. Filter Status
    if (chosenStatus === 'sudah') {
      if (!isSekolahRecordExamined(r)) return false;
    } else if (chosenStatus === 'belum') {
      if (!isSekolahRecordBelumExamined(r)) return false;
    } else if (chosenStatus === 'sebagian') {
      if (!isSekolahRecordPartialExamined(r)) return false;
    }

    // 5. Filter Validitas NIK
    if (chosenNikValid === 'non_16_digit') {
      if (isNik16Digit(r.nik)) return false;
    }

    return true;
  });
}

function updateHapusSekolahPreview() {
  const chosenSekolah = (document.getElementById('hapusSekolahPilihSekolah')?.value || '').trim();
  const chosenKelas = (document.getElementById('hapusSekolahPilihKelas')?.value || 'all').trim();
  const chosenTahun = (document.getElementById('hapusSekolahPilihTahun')?.value || 'all').trim();
  const chosenStatus = (document.getElementById('hapusSekolahPilihStatus')?.value || 'all').trim();
  const chosenNikValid = (document.getElementById('hapusSekolahPilihNikValid')?.value || 'all').trim();

  const previewDetails = document.getElementById('hapusSekolahPreviewDetails');
  const countBadge = document.getElementById('hapusSekolahTotalCountBadge');

  if (!chosenSekolah) {
    if (previewDetails) {
      previewDetails.innerHTML = '<span style="color: #64748b;"><i class="bi bi-info-circle"></i> Silakan pilih sekolah target terlebih dahulu untuk melihat ringkasan data yang akan dihapus.</span>';
    }
    if (countBadge) {
      countBadge.textContent = '0 Siswa Terpilih';
      countBadge.style.background = '#f1f5f9';
      countBadge.style.color = '#64748b';
      countBadge.style.borderColor = '#cbd5e1';
    }
    toggleHapusSekolahSubmitBtn(0);
    return;
  }

  const matched = getFilteredRecordsForDeletion();
  const matchedCount = matched.length;

  const sudahCount = matched.filter(r => isSekolahRecordExamined(r)).length;
  const belumCount = matched.filter(r => isSekolahRecordBelumExamined(r)).length;
  const sebagianCount = matched.filter(r => isSekolahRecordPartialExamined(r)).length;

  let statusText = 'Semua Status (Sudah & Belum Diperiksa)';
  if (chosenStatus === 'belum') statusText = 'Hanya Siswa yang BELUM Diperiksa';
  else if (chosenStatus === 'sudah') statusText = 'Hanya Siswa yang SUDAH Diperiksa';
  else if (chosenStatus === 'sebagian') statusText = 'Hanya Siswa yang Diperiksa Sebagian';

  let nikText = 'Semua Data Siswa';
  if (chosenNikValid === 'non_16_digit') nikText = '<span style="color:#d97706; font-weight:700;">Hanya Siswa dengan NIK Bukan 16 Digit</span>';

  if (countBadge) {
    countBadge.textContent = `${matchedCount.toLocaleString('id-ID')} Siswa Terpilih`;
    countBadge.style.background = matchedCount > 0 ? '#fee2e2' : '#f1f5f9';
    countBadge.style.color = matchedCount > 0 ? '#991b1b' : '#64748b';
    countBadge.style.borderColor = matchedCount > 0 ? '#fca5a5' : '#cbd5e1';
  }

  if (previewDetails) {
    if (matchedCount === 0) {
      previewDetails.innerHTML = `
        <div style="color: #64748b; line-height: 1.6;">
          <div>• <strong>Sekolah:</strong> ${chosenSekolah === 'all' ? '<span style="color:#dc2626; font-weight:700;">SEMUA SEKOLAH</span>' : escapeHtml(chosenSekolah)}</div>
          <div>• <strong>Kelas:</strong> ${chosenKelas === 'all' ? 'Semua Kelas' : escapeHtml(chosenKelas)}</div>
          <div>• <strong>Tahun Skrining:</strong> ${chosenTahun === 'all' ? 'Semua Tahun' : escapeHtml(chosenTahun)}</div>
          <div>• <strong>Status:</strong> ${escapeHtml(statusText)}</div>
          <div style="margin-top: 8px; padding: 8px 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; color: #64748b; font-weight: 600;">
            <i class="bi bi-info-circle"></i> Tidak ada data siswa yang cocok dengan kriteria filter di atas.
          </div>
        </div>
      `;
    } else {
      previewDetails.innerHTML = `
        <div style="line-height: 1.7;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #fed7aa; padding-bottom: 4px; margin-bottom: 4px;">
            <span><i class="bi bi-building"></i> <strong>Sekolah Target:</strong></span>
            <strong style="color: ${chosenSekolah === 'all' ? '#dc2626' : '#1e40af'};">${chosenSekolah === 'all' ? '⚠️ SEMUA SEKOLAH (Seluruh Database)' : escapeHtml(chosenSekolah)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #fed7aa; padding-bottom: 4px; margin-bottom: 4px;">
            <span><i class="bi bi-grid-fill"></i> <strong>Tingkat Kelas:</strong></span>
            <strong style="color: #0369a1;">${chosenKelas === 'all' ? 'Semua Kelas' : escapeHtml(chosenKelas)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #fed7aa; padding-bottom: 4px; margin-bottom: 4px;">
            <span><i class="bi bi-calendar-check-fill" style="color: #2563eb;"></i> <strong>Tahun Skrining:</strong></span>
            <strong style="color: #1e40af;">${chosenTahun === 'all' ? 'Semua Tahun' : escapeHtml(chosenTahun)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #fed7aa; padding-bottom: 4px; margin-bottom: 6px;">
            <span><i class="bi bi-ui-checks"></i> <strong>Filter Status:</strong></span>
            <span style="font-weight: 600; color: #475569;">${escapeHtml(statusText)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #fed7aa; padding-bottom: 4px; margin-bottom: 6px;">
            <span><i class="bi bi-person-badge"></i> <strong>Filter NIK:</strong></span>
            <span>${nikText}</span>
          </div>
          <div style="margin-top: 8px; padding: 10px 14px; background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 8px; color: #9f1239;">
            <div style="font-size: 13.5px; font-weight: 800; display: flex; align-items: center; justify-content: space-between;">
              <span><i class="bi bi-exclamation-octagon-fill" style="color: #e11d48;"></i> Total Siswa Akan Dihapus:</span>
              <span style="font-size: 15px; color: #be123c; font-weight: 900;">${matchedCount.toLocaleString('id-ID')} Siswa</span>
            </div>
            <div style="font-size: 11.5px; margin-top: 4px; color: #b91c1c;">
              Rincian: <strong>${sudahCount}</strong> Sudah Periksa | <strong>${sebagianCount}</strong> Periksa Sebagian | <strong>${belumCount}</strong> Belum Periksa
            </div>
          </div>
        </div>
      `;
    }
  }

  toggleHapusSekolahSubmitBtn(matchedCount);
}

function toggleHapusSekolahSubmitBtn(forcedCount) {
  const count = forcedCount !== undefined ? forcedCount : getFilteredRecordsForDeletion().length;
  const isChecked = document.getElementById('hapusSekolahConfirmCheck')?.checked;
  const btn = document.getElementById('btnSubmitHapusSekolah');
  if (btn) {
    btn.disabled = !(count > 0 && isChecked);
  }
}

async function executeHapusDataSekolah(event) {
  if (event) event.preventDefault();

  const currentUserRole = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  if (!currentUserRole.includes('admin') && !currentUserRole.includes('koordinator')) {
    showToast('Hanya Koordinator dan Admin yang memiliki izin untuk menghapus data CKG Sekolah.', 'warning');
    return;
  }

  const chosenSekolah = (document.getElementById('hapusSekolahPilihSekolah')?.value || '').trim();
  const chosenKelas = (document.getElementById('hapusSekolahPilihKelas')?.value || 'all').trim();
  const chosenTahun = (document.getElementById('hapusSekolahPilihTahun')?.value || 'all').trim();
  const chosenStatus = (document.getElementById('hapusSekolahPilihStatus')?.value || 'all').trim();

  if (!chosenSekolah) {
    Swal.fire('Peringatan', 'Silakan pilih sekolah target terlebih dahulu.', 'warning');
    return;
  }

  const matched = getFilteredRecordsForDeletion();
  if (matched.length === 0) {
    Swal.fire('Tidak Ada Data', 'Tidak ada data siswa yang cocok dengan kriteria filter yang dipilih.', 'info');
    return;
  }

  const isChecked = document.getElementById('hapusSekolahConfirmCheck')?.checked;
  if (!isChecked) {
    Swal.fire('Konfirmasi Diperlukan', 'Harap beri centang pada kotak persetujuan konfirmasi sebelum melanjutkan.', 'warning');
    return;
  }

  const targetSekolahLabel = chosenSekolah === 'all' ? 'SEMUA SEKOLAH' : chosenSekolah;
  const targetKelasLabel = chosenKelas === 'all' ? 'Semua Kelas' : chosenKelas;
  const targetTahunLabel = chosenTahun === 'all' ? 'Semua Tahun' : chosenTahun;

  const result = await Swal.fire({
    icon: 'warning',
    title: `Hapus ${matched.length.toLocaleString('id-ID')} Data Siswa?`,
    html: `
      <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.6;">
        <p>Apakah Anda benar-benar yakin ingin menghapus data siswa dengan rincian berikut?</p>
        <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px;">
          <div>🏫 <strong>Sekolah:</strong> <span style="color: ${chosenSekolah === 'all' ? '#dc2626' : '#1e40af'}; font-weight: 700;">${escapeHtml(targetSekolahLabel)}</span></div>
          <div>📚 <strong>Kelas:</strong> <span style="color: #0284c7; font-weight: 700;">${escapeHtml(targetKelasLabel)}</span></div>
          <div>📅 <strong>Tahun Skrining:</strong> <span style="color: #1e40af; font-weight: 700;">${escapeHtml(targetTahunLabel)}</span></div>
          <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">👥 <strong>Total Siswa Dihapus:</strong> <strong style="color: #be123c; font-size: 14px;">${matched.length.toLocaleString('id-ID')} Siswa</strong></div>
        </div>
        <p style="color: #dc2626; font-weight: 700; margin-bottom: 0;">
          ⚠️ PERINGATAN: Tindakan ini bersifat PERMANEN dan menghapus data langsung dari server Cloud Database D1!
        </p>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: `<i class="bi bi-trash3-fill"></i> Ya, Hapus ${matched.length} Siswa`,
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b'
  });

  if (!result.isConfirmed) return;

  Swal.fire({
    title: 'Menghapus Data Siswa...',
    html: 'Mohon tunggu, sedang menghapus data dari Cloud Database D1.',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  const matchedIds = matched.map(r => r.id).filter(Boolean);

  try {
    const chosenNikValid = (document.getElementById('hapusSekolahPilihNikValid')?.value || 'all').trim();
    const params = new URLSearchParams();
    if (chosenSekolah && chosenSekolah !== 'all') params.append('sekolah', chosenSekolah);
    if (chosenKelas && chosenKelas !== 'all') params.append('kelas', chosenKelas);
    if (chosenTahun && chosenTahun !== 'all') params.append('tahun', chosenTahun);
    if (chosenStatus && chosenStatus !== 'all') params.append('status', chosenStatus);
    if (chosenNikValid === 'non_16_digit') params.append('filter', 'non_16_digit');

    await fetch(`/api/sekolah?${params.toString()}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sekolah: chosenSekolah,
        kelas: chosenKelas,
        tahun: chosenTahun,
        status: chosenStatus,
        filter: chosenNikValid === 'non_16_digit' ? 'non_16_digit' : undefined,
        ids: matchedIds
      })
    });

    // Hapus dari memori lokal dan IndexedDB secara instan
    const idSet = new Set(matchedIds);
    sekolahRecords = sekolahRecords.filter(r => !idSet.has(r.id));
    if (typeof CkgIdb !== 'undefined') {
      try { await CkgIdb.set('sekolah_records', sekolahRecords); } catch (_) { }
    }

    closeHapusDataSekolahModal();
    await fetchSekolahRecordsFromCloud();

    Swal.fire({
      icon: 'success',
      title: 'Berhasil Dihapus',
      text: `Sebanyak ${matched.length.toLocaleString('id-ID')} data siswa dari ${targetSekolahLabel} berhasil dihapus secara permanen.`,
      confirmButtonColor: '#059669'
    });
  } catch (err) {
    console.warn('Hapus data sekolah error:', err);
    closeHapusDataSekolahModal();
    await fetchSekolahRecordsFromCloud();
    Swal.fire('Terjadi Kesalahan', `Gagal menghapus data: ${err.message}`, 'error');
  }
}

// Alias untuk kompatibilitas ke fungsi lama
async function confirmDeleteAllSekolahRecords() {
  openHapusDataSekolahModal();
}

// ==========================================================================
// 🔍 DUPLICATE FINDER: PENGELOLA & PEMBERSIH DATA DUPLIKAT CKG SEKOLAH
// ==========================================================================

let currentDuplicateGroups = [];

function openDuplicateFinderModal() {
  const currentUserRole = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  if (!currentUserRole.includes('admin') && !currentUserRole.includes('koordinator')) {
    showToast('Fitur Cek Duplikat hanya dapat digunakan oleh Koordinator dan Admin.', 'warning');
    return;
  }

  if (!sekolahRecords || sekolahRecords.length === 0) {
    showToast('Belum ada data siswa di Cloud Database.', 'info');
    return;
  }

  // Scan & kelompokkan berdasarkan NIK yang sama
  // PENTING: Siswa dengan NIK kosong/tidak valid TIDAK dianggap duplikat!
  const nikMap = {};
  sekolahRecords.forEach(r => {
    if (isNikValidForDuplicate(r.nik)) {
      const cleanNik = String(r.nik).trim();
      if (!nikMap[cleanNik]) nikMap[cleanNik] = [];
      nikMap[cleanNik].push(r);
    }
  });

  currentDuplicateGroups = Object.keys(nikMap)
    .filter(k => nikMap[k].length > 1)
    .map(nik => ({
      nik: nik,
      records: nikMap[nik]
    }));

  if (currentDuplicateGroups.length === 0) {
    Swal.fire({
      icon: 'success',
      title: 'Tidak Ada Data Duplikat!',
      html: `
        <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #334155;">
          <p>Seluruh <strong>${sekolahRecords.length}</strong> data siswa telah diperiksa berdasarkan NIK.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px 16px; margin: 12px 0; color: #166534;">
            <div style="font-weight: 800; font-size: 13.5px; display: flex; align-items: center; gap: 8px;">
              <i class="bi bi-shield-check" style="color: #16a34a; font-size: 18px;"></i> Semua NIK Siswa Unik
            </div>
            <div style="font-size: 12px; color: #15803d; margin-top: 4px;">
              Tidak ditemukan data ganda. Database CKG Sekolah Anda dalam kondisi bersih dan teratur.
            </div>
          </div>
          <div style="font-size: 12px; color: #64748b; background: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px dashed #cbd5e1;">
            💡 <em>Catatan: Data siswa yang NIK-nya kosong tidak dianggap sebagai duplikat.</em>
          </div>
        </div>
      `,
      confirmButtonText: 'Tutup',
      confirmButtonColor: '#059669'
    });
    return;
  }

  const modal = document.getElementById('modalDuplicateFinder');
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
  }

  renderDuplicateFinderContent();
}

function closeDuplicateFinderModal() {
  const modal = document.getElementById('modalDuplicateFinder');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function getDuplicateRecordScore(r) {
  let score = 0;
  const bbNum = Number(r.bb) || 0;
  const tbNum = Number(r.tb) || 0;
  const sistolNum = Number(r.td_sistolik) || 0;
  const isExamined = !!r.is_examined || (bbNum > 0 || tbNum > 0 || sistolNum > 0);

  if (isExamined) score += 1000;
  if (bbNum > 0) score += 50;
  if (tbNum > 0) score += 50;
  if (sistolNum > 0) score += 50;
  if (r.gula_darah && r.gula_darah !== '-') score += 20;
  if (r.hb && r.hb !== '-') score += 20;
  if (r.no_whatsapp && r.no_whatsapp.trim() !== '') score += 10;
  if (r.alamat && r.alamat.trim() !== '') score += 10;
  if (r.tanggal_lahir && r.tanggal_lahir.trim() !== '') score += 10;
  if (r.telinga && r.telinga !== '-') score += 5;
  if (r.gigi && r.gigi !== '-') score += 5;
  if (r.mata && r.mata !== '-') score += 5;
  return score;
}

function renderDuplicateFinderContent() {
  const contentEl = document.getElementById('duplicateFinderContent');
  const summaryEl = document.getElementById('duplicateFinderSummary');
  const btnAutoEl = document.getElementById('btnAutoResolveDuplicates');
  if (!contentEl) return;

  // Re-scan from current sekolahRecords to make sure it's 100% fresh
  const nikMap = {};
  sekolahRecords.forEach(r => {
    if (isNikValidForDuplicate(r.nik)) {
      const cleanNik = String(r.nik).trim();
      if (!nikMap[cleanNik]) nikMap[cleanNik] = [];
      nikMap[cleanNik].push(r);
    }
  });

  currentDuplicateGroups = Object.keys(nikMap)
    .filter(k => nikMap[k].length > 1)
    .map(nik => ({
      nik: nik,
      records: nikMap[nik]
    }));

  if (currentDuplicateGroups.length === 0) {
    contentEl.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <i class="bi bi-check-circle-fill" style="font-size: 48px; color: #22c55e;"></i>
        <h4 style="font-weight: 800; color: #166534; margin: 14px 0 6px 0;">Semua Duplikat Berhasil Dibersihkan!</h4>
        <p style="color: #64748b; font-size: 13px;">Tidak ada lagi siswa dengan NIK ganda di database.</p>
      </div>
    `;
    if (summaryEl) summaryEl.textContent = 'Semua data bersih (0 duplikat)';
    if (btnAutoEl) btnAutoEl.style.display = 'none';
    return;
  }

  const totalGroups = currentDuplicateGroups.length;
  const totalRows = currentDuplicateGroups.reduce((acc, g) => acc + g.records.length, 0);
  const totalRedundant = currentDuplicateGroups.reduce((acc, g) => acc + (g.records.length - 1), 0);

  if (summaryEl) {
    summaryEl.innerHTML = `<strong>${totalGroups} NIK Ganda</strong> ditemukan (${totalRows} baris data, <strong>${totalRedundant} duplikat redundan</strong>).`;
  }
  if (btnAutoEl) {
    btnAutoEl.style.display = 'inline-flex';
    btnAutoEl.innerHTML = `<i class="bi bi-magic"></i> Hapus Otomatis ${totalRedundant} Duplikat (Simpan Data Terlengkap)`;
  }

  let html = `
    <div style="background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; font-size: 12.5px; color: #991b1b; line-height: 1.5;">
      <div style="font-weight: 800; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
        <i class="bi bi-exclamation-triangle-fill" style="color: #dc2626;"></i> Ditemukan Data Siswa Dengan NIK Sama
      </div>
      <div>
        Data yang ditandai dengan badge <span style="background: #059669; color: #fff; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: 700;">⭐ Disarankan Simpan</span> adalah data yang <strong>sudah diperiksa / paling lengkap</strong>. Anda dapat menghapus data duplikat satu per satu atau menggunakan tombol otomatis.
      </div>
    </div>
  `;

  currentDuplicateGroups.forEach((group, groupIdx) => {
    // Determine which record is best to keep
    const recordsWithScore = group.records.map(r => ({
      record: r,
      score: getDuplicateRecordScore(r)
    }));

    // Sort descending by score
    recordsWithScore.sort((a, b) => b.score - a.score);
    const bestRecordId = recordsWithScore[0].record.id;

    html += `
      <div style="border: 1.5px solid #e2e8f0; border-radius: 14px; margin-bottom: 14px; overflow: hidden; background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
        <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="font-weight: 800; font-size: 13px; color: #1e293b; display: flex; align-items: center; gap: 8px;">
            <span style="background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800;">Grup #${groupIdx + 1}</span>
            <span>NIK: <code style="font-size: 13px; font-weight: 800; color: #0f172a; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${escapeHtml(group.nik)}</code></span>
          </div>
          <span style="background: #fee2e2; color: #b91c1c; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 20px;">
            ${group.records.length} Record Terdaftar
          </span>
        </div>
        <div style="padding: 10px 14px; display: flex; flex-direction: column; gap: 8px;">
    `;

    recordsWithScore.forEach(({ record: r, score }) => {
      const isBest = (r.id === bestRecordId);
      const bbNum = Number(r.bb) || 0;
      const tbNum = Number(r.tb) || 0;
      const sistolNum = Number(r.td_sistolik) || 0;
      const isExamined = !!r.is_examined || (bbNum > 0 || tbNum > 0 || sistolNum > 0);

      const itemBg = isBest ? '#f0fdf4' : '#fff5f5';
      const itemBorder = isBest ? '#86efac' : '#fecaca';

      html += `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; background: ${itemBg}; border: 1.5px solid ${itemBorder}; border-radius: 10px; padding: 10px 14px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 220px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-weight: 800; font-size: 13.5px; color: #0f172a;">${escapeHtml(r.nama)}</span>
              ${isBest ? `
                <span style="background: #059669; color: #ffffff; font-size: 10.5px; font-weight: 800; padding: 2px 7px; border-radius: 6px; display: inline-flex; align-items: center; gap: 3px;">
                  <i class="bi bi-star-fill" style="font-size: 9px;"></i> Disarankan Simpan (Utama)
                </span>
              ` : `
                <span style="background: #ef4444; color: #ffffff; font-size: 10.5px; font-weight: 800; padding: 2px 7px; border-radius: 6px;">
                  ⚠️ Duplikat / Redundan
                </span>
              `}
            </div>
            <div style="font-size: 11.5px; color: #475569; margin-top: 4px; display: flex; gap: 12px; flex-wrap: wrap;">
              <span><strong>Sekolah:</strong> ${escapeHtml(r.sekolah || '-')}</span>
              <span><strong>Kelas:</strong> ${escapeHtml(r.kelas || '-')}</span>
              <span><strong>JK:</strong> ${escapeHtml(r.jk || '-')}</span>
              <span><strong>ID:</strong> <code style="font-size: 10.5px;">${escapeHtml(r.id || '-')}</code></span>
            </div>
            <div style="font-size: 11.5px; margin-top: 4px;">
              ${isExamined ? `
                <span style="color: #15803d; font-weight: 700;">
                  <i class="bi bi-check-circle-fill"></i> Sudah Diperiksa
                  <span style="font-weight: 500; color: #166534;">(BB: ${bbNum}kg, TB: ${tbNum}cm, TD: ${sistolNum}/${r.td_diastolik || 0}, IMT: ${r.imt || 0})</span>
                </span>
              ` : `
                <span style="color: #b91c1c; font-weight: 600;">
                  <i class="bi bi-clock-history"></i> Belum Diperiksa (Pemeriksaan Kosong)
                </span>
              `}
            </div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button type="button" class="btn btn-sm" onclick="deleteSingleDuplicateRecord('${escapeHtml(r.id)}', '${escapeHtml(r.nama)}', '${escapeHtml(group.nik)}')"
              style="background: #dc2626; color: #ffffff; border: none; border-radius: 8px; padding: 6px 12px; font-size: 11.5px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: background 0.2s;"
              onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'"
              title="Hapus record duplikat ini dari Cloud Database">
              <i class="bi bi-trash3-fill"></i> Hapus Baris Ini
            </button>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  contentEl.innerHTML = html;
}

async function deleteSingleDuplicateRecord(id, nama, nik) {
  const currentUserRole = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  if (!currentUserRole.includes('admin') && !currentUserRole.includes('koordinator')) {
    showToast('Hanya Koordinator dan Admin yang dapat menghapus data duplikat.', 'warning');
    return;
  }

  const result = await Swal.fire({
    icon: 'warning',
    title: 'Hapus Record Duplikat?',
    html: `
      <div style="text-align: left; font-size: 13px; line-height: 1.5;">
        <p>Apakah Anda yakin ingin menghapus data siswa:</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px; color: #991b1b; font-weight: 700;">
          ${escapeHtml(nama)} (NIK: ${escapeHtml(nik)})
        </div>
        <p style="color: #64748b; font-size: 11.5px; margin-top: 8px;">Record ini akan dihapus permanen dari Cloudflare D1. Record pasangan lainnya dengan NIK yang sama tetap tersimpan.</p>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus Sekarang',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    reverseButtons: true
  });

  if (!result.isConfirmed) return;

  try {
    await fetch(`/api/sekolah?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    showToast(`Data duplikat ${nama} berhasil dihapus.`, 'info');
    await fetchSekolahRecordsFromCloud();
    renderDuplicateFinderContent();
  } catch (err) {
    console.error('Error deleting duplicate record:', err);
    showToast('Gagal menghapus data duplikat: ' + err.message, 'danger');
  }
}

async function autoResolveAllDuplicates() {
  const currentUserRole = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  if (!currentUserRole.includes('admin') && !currentUserRole.includes('koordinator')) {
    showToast('Hanya Koordinator dan Admin yang dapat menghapus data duplikat.', 'warning');
    return;
  }

  if (!currentDuplicateGroups || currentDuplicateGroups.length === 0) return;

  // Gather all redundant IDs (all records in each group except the one with highest score)
  const redundantList = [];
  currentDuplicateGroups.forEach(group => {
    const scored = group.records.map(r => ({ record: r, score: getDuplicateRecordScore(r) }));
    scored.sort((a, b) => b.score - a.score);
    // Best is at index 0, rest are redundant
    for (let i = 1; i < scored.length; i++) {
      redundantList.push(scored[i].record);
    }
  });

  if (redundantList.length === 0) {
    showToast('Tidak ada data duplikat yang dapat dihapus.', 'info');
    return;
  }

  const result = await Swal.fire({
    icon: 'question',
    title: `Hapus Otomatis ${redundantList.length} Duplikat?`,
    html: `
      <div style="text-align: left; font-size: 13px; line-height: 1.6;">
        <p>Sistem akan secara otomatis:</p>
        <ul style="padding-left: 18px; margin: 8px 0; color: #1e293b;">
          <li><strong style="color: #059669;">Mempertahankan</strong> 1 data terlengkap / sudah diperiksa untuk setiap NIK.</li>
          <li><strong style="color: #dc2626;">Menghapus permanen</strong> <strong>${redundantList.length}</strong> record ganda yang kosong/redundant dari Cloudflare D1.</li>
        </ul>
        <p style="color: #64748b; font-size: 11.5px;">Tindakan ini tidak dapat dibatalkan. Pastikan data yang dipertahankan sudah sesuai.</p>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: `Ya, Bersihkan ${redundantList.length} Duplikat`,
    cancelButtonText: 'Batal',
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#64748b',
    reverseButtons: true
  });

  if (!result.isConfirmed) return;

  Swal.fire({
    title: 'Membersihkan Data Duplikat...',
    html: `Sedang menghapus <strong>${redundantList.length}</strong> record dari Cloud Database...`,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    for (const item of redundantList) {
      await fetch(`/api/sekolah?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    }

    await fetchSekolahRecordsFromCloud();
    renderDuplicateFinderContent();

    Swal.fire({
      icon: 'success',
      title: 'Pembersihan Selesai!',
      html: `Sebanyak <strong>${redundantList.length}</strong> data duplikat berhasil dibersihkan dari Cloud Database. Seluruh data siswa kini unik!`,
      confirmButtonColor: '#059669'
    });
  } catch (err) {
    console.error('Error auto resolving duplicates:', err);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Membersihkan',
      text: err.message || 'Terjadi kesalahan saat menghapus data duplikat.',
      confirmButtonColor: '#dc2626'
    });
  }
}

/* ==========================================================================
   🏫 FITUR KELOLA MASTER SARANA SEKOLAH: TAMBAH & EDIT (KHUSUS ADMIN)
   ========================================================================== */

let currentKelolaLevelFilter = 'ALL';

function openKelolaSekolahModal() {
  const currentUserRole = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  if (!currentUserRole.includes('admin')) {
    Swal.fire({
      icon: 'warning',
      title: 'Akses Khusus Admin',
      text: 'Mohon maaf, fitur Tambah dan Edit Sekolah hanya dapat diakses oleh Administrator Sistem.'
    });
    return;
  }

  const modal = document.getElementById('modalKelolaSekolah');
  if (!modal) return;

  resetFormKelolaSekolah();
  currentKelolaLevelFilter = 'ALL';

  const searchInput = document.getElementById('inputSearchKelolaSekolah');
  if (searchInput) searchInput.value = '';

  filterKelolaSekolahTable('ALL');
  renderKelolaSekolahTable();

  modal.classList.add('open');
  modal.style.display = 'flex';
}

function closeKelolaSekolahModal() {
  const modal = document.getElementById('modalKelolaSekolah');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
  resetFormKelolaSekolah();
}

// Event listener click outside modal content to close
document.addEventListener('DOMContentLoaded', () => {
  const modalKelola = document.getElementById('modalKelolaSekolah');
  if (modalKelola) {
    modalKelola.addEventListener('click', (e) => {
      if (e.target === modalKelola) {
        closeKelolaSekolahModal();
      }
    });
  }
});

function resetFormKelolaSekolah() {
  const oldNamaInput = document.getElementById('kelolaOldNamaSekolah');
  const namaInput = document.getElementById('kelolaInputNamaSekolah');
  const levelSelect = document.getElementById('kelolaSelectLevelSekolah');
  const titleForm = document.getElementById('titleFormKelolaSekolah');
  const iconForm = document.getElementById('iconFormKelolaSekolah');
  const textBtn = document.getElementById('textBtnSubmitKelola');
  const btnCancel = document.getElementById('btnCancelEditSekolah');
  const noticeEdit = document.getElementById('noticeEditSekolahSiswa');

  if (oldNamaInput) oldNamaInput.value = '';
  if (namaInput) namaInput.value = '';
  if (levelSelect) levelSelect.value = 'SD';
  if (titleForm) titleForm.textContent = 'Tambah Sekolah Baru';
  if (iconForm) iconForm.className = 'bi bi-plus-circle-fill';
  if (textBtn) textBtn.textContent = 'Simpan';
  if (btnCancel) btnCancel.style.display = 'none';
  if (noticeEdit) noticeEdit.style.display = 'none';
}

function editSekolahItem(nama) {
  const school = MASTER_SARANA_SEKOLAH.find(s => s.nama.toUpperCase() === (nama || '').trim().toUpperCase());
  if (!school) return;

  const oldNamaInput = document.getElementById('kelolaOldNamaSekolah');
  const namaInput = document.getElementById('kelolaInputNamaSekolah');
  const levelSelect = document.getElementById('kelolaSelectLevelSekolah');
  const titleForm = document.getElementById('titleFormKelolaSekolah');
  const iconForm = document.getElementById('iconFormKelolaSekolah');
  const textBtn = document.getElementById('textBtnSubmitKelola');
  const btnCancel = document.getElementById('btnCancelEditSekolah');
  const noticeEdit = document.getElementById('noticeEditSekolahSiswa');

  if (oldNamaInput) oldNamaInput.value = school.nama;
  if (namaInput) {
    namaInput.value = school.nama;
    setTimeout(() => {
      namaInput.focus();
      namaInput.select();
    }, 100);
  }
  if (levelSelect) levelSelect.value = school.level;
  if (titleForm) titleForm.textContent = `Edit Sekolah: ${school.nama}`;
  if (iconForm) iconForm.className = 'bi bi-pencil-square';
  if (textBtn) textBtn.textContent = 'Simpan Perubahan';
  if (btnCancel) btnCancel.style.display = 'inline-block';

  // Check how many students are enrolled
  const enrolledCount = (sekolahRecords || []).filter(r => (r.sekolah || '').trim().toUpperCase() === school.nama.toUpperCase()).length;
  if (noticeEdit) {
    if (enrolledCount > 0) {
      noticeEdit.innerHTML = `<i class="bi bi-info-circle-fill"></i> Terdapat <strong>${enrolledCount} data siswa</strong> terdaftar di sekolah ini. Mengubah nama sekolah akan otomatis memperbarui seluruh data siswa tersebut ke nama baru di database.`;
      noticeEdit.style.display = 'block';
    } else {
      noticeEdit.style.display = 'none';
    }
  }

  const cardForm = document.getElementById('cardFormKelolaSekolah');
  if (cardForm) {
    cardForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

async function submitFormKelolaSekolah(event) {
  event.preventDefault();

  const currentUserRole = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  if (!currentUserRole.includes('admin')) {
    Swal.fire('Akses Ditolak', 'Hanya Admin yang dapat menambah atau mengedit sekolah.', 'warning');
    return;
  }

  const oldNamaInput = document.getElementById('kelolaOldNamaSekolah');
  const namaInput = document.getElementById('kelolaInputNamaSekolah');
  const levelSelect = document.getElementById('kelolaSelectLevelSekolah');

  const oldNama = (oldNamaInput?.value || '').trim();
  const newNama = (namaInput?.value || '').trim().toUpperCase();
  const level = (levelSelect?.value || 'SD').trim().toUpperCase();

  if (!newNama) {
    showToast('Nama sekolah tidak boleh kosong.', 'warning');
    return;
  }

  // Check duplicate name
  const isDuplicate = MASTER_SARANA_SEKOLAH.some(s => s.nama.toUpperCase() === newNama.toUpperCase() && s.nama.toUpperCase() !== oldNama.toUpperCase());
  if (isDuplicate) {
    Swal.fire({
      icon: 'warning',
      title: 'Nama Sekolah Sudah Terdaftar',
      text: `Sekolah dengan nama "${newNama}" sudah ada di dalam database master sekolah.`,
      confirmButtonColor: '#4f46e5'
    });
    return;
  }

  if (oldNama) {
    // Mode EDIT
    const oldUpper = oldNama.toUpperCase();
    const enrolledStudents = (sekolahRecords || []).filter(r => (r.sekolah || '').trim().toUpperCase() === oldUpper);

    if (oldUpper !== newNama && enrolledStudents.length > 0) {
      const confirm = await Swal.fire({
        icon: 'question',
        title: 'Perbarui Nama Sekolah & Data Siswa?',
        html: `Anda akan mengubah nama sekolah dari <strong>${escapeHtml(oldNama)}</strong> menjadi <strong>${escapeHtml(newNama)}</strong>.<br><br>Sebanyak <strong>${enrolledStudents.length} siswa</strong> di database akan otomatis diperbarui ke nama sekolah yang baru. Lanjutkan?`,
        showCancelButton: true,
        confirmButtonText: 'Ya, Simpan Perubahan',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#64748b'
      });
      if (!confirm.isConfirmed) return;
    }

    // Update in MASTER_SARANA_SEKOLAH array
    const targetIdx = MASTER_SARANA_SEKOLAH.findIndex(s => s.nama.toUpperCase() === oldUpper);
    if (targetIdx !== -1) {
      MASTER_SARANA_SEKOLAH[targetIdx] = { nama: newNama, level };
    } else {
      MASTER_SARANA_SEKOLAH.push({ nama: newNama, level });
    }

    // If name changed, cascade update student records in memory & sync
    if (oldUpper !== newNama) {
      let changedCount = 0;
      (sekolahRecords || []).forEach(r => {
        if ((r.sekolah || '').trim().toUpperCase() === oldUpper) {
          r.sekolah = newNama;
          changedCount++;
        }
      });
      if (changedCount > 0) {
        saveSekolahRecordsToStorage();
      }

      // Update active filter if user currently selected this school
      const selectFilter = document.getElementById('filterSelectSekolah');
      if (selectFilter && selectFilter.value.trim().toUpperCase() === oldUpper) {
        selectFilter.value = newNama;
        const labelEl = document.getElementById('comboboxSekolahLabel');
        if (labelEl) labelEl.textContent = newNama;
      }
    }

    // Send PUT to backend Cloudflare D1
    try {
      await fetch('/api/master-sekolah', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldNama, newNama, level })
      });
    } catch (err) {
      console.warn('PUT /api/master-sekolah notice:', err);
    }

    saveMasterSekolahToStorage([...MASTER_SARANA_SEKOLAH]);
    showToast(`Sekolah "${newNama}" berhasil diperbarui.`, 'success');
  } else {
    // Mode TAMBAH
    MASTER_SARANA_SEKOLAH.push({ nama: newNama, level });

    // Send POST to backend Cloudflare D1
    try {
      await fetch('/api/master-sekolah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: newNama, level })
      });
    } catch (err) {
      console.warn('POST /api/master-sekolah notice:', err);
    }

    saveMasterSekolahToStorage([...MASTER_SARANA_SEKOLAH]);
    showToast(`Sekolah baru "${newNama}" (${level}) berhasil ditambahkan!`, 'success');
  }

  resetFormKelolaSekolah();
  renderKelolaSekolahTable();
  renderSekolahView();
}

async function deleteSekolahItem(nama) {
  const currentUserRole = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  if (!currentUserRole.includes('admin')) {
    Swal.fire('Akses Ditolak', 'Hanya Admin yang dapat menghapus data sekolah.', 'warning');
    return;
  }

  const cleanNama = (nama || '').trim().toUpperCase();
  const enrolledCount = (sekolahRecords || []).filter(r => (r.sekolah || '').trim().toUpperCase() === cleanNama).length;

  if (enrolledCount > 0) {
    Swal.fire({
      icon: 'error',
      title: 'Tidak Dapat Menghapus!',
      html: `Sekolah <strong>${escapeHtml(cleanNama)}</strong> masih memiliki <strong>${enrolledCount} data siswa</strong> terdaftar di database.<br><br>Gunakan fitur <strong>Migrasi Sekolah</strong> untuk memindahkan data siswa terlebih dahulu sebelum menghapus sarana sekolah ini.`,
      confirmButtonColor: '#4f46e5'
    });
    return;
  }

  const confirm = await Swal.fire({
    icon: 'warning',
    title: 'Hapus Sekolah?',
    html: `Apakah Anda yakin ingin menghapus sekolah <strong>${escapeHtml(cleanNama)}</strong> dari daftar master data?`,
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b'
  });

  if (!confirm.isConfirmed) return;

  MASTER_SARANA_SEKOLAH = MASTER_SARANA_SEKOLAH.filter(s => s.nama.toUpperCase() !== cleanNama);

  try {
    await fetch(`/api/master-sekolah?nama=${encodeURIComponent(cleanNama)}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('DELETE /api/master-sekolah error:', err);
  }

  saveMasterSekolahToStorage([...MASTER_SARANA_SEKOLAH]);
  showToast(`Sekolah "${cleanNama}" berhasil dihapus.`, 'info');
  renderKelolaSekolahTable();
}

function filterKelolaSekolahTable(level) {
  currentKelolaLevelFilter = level;
  document.querySelectorAll('.btn-filter-kelola').forEach(btn => {
    if (btn.getAttribute('data-level') === level) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderKelolaSekolahTable();
}

function renderKelolaSekolahTable() {
  const tbody = document.getElementById('tbodyKelolaSekolah');
  if (!tbody) return;

  const searchKw = (document.getElementById('inputSearchKelolaSekolah')?.value || '').trim().toLowerCase();

  // 1. Calculate Stats
  const totalCount = MASTER_SARANA_SEKOLAH.length;
  const sdCount = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SD').length;
  const smpCount = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SMP').length;
  const smaCount = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SMA').length;

  const statTotal = document.getElementById('statKelolaTotalSekolah');
  const statSd = document.getElementById('statKelolaSd');
  const statSmp = document.getElementById('statKelolaSmp');
  const statSma = document.getElementById('statKelolaSma');

  if (statTotal) statTotal.textContent = totalCount;
  if (statSd) statSd.textContent = sdCount;
  if (statSmp) statSmp.textContent = smpCount;
  if (statSma) statSma.textContent = smaCount;

  const tabTotal = document.getElementById('countTabKelolaAll');
  const tabSd = document.getElementById('countTabKelolaSd');
  const tabSmp = document.getElementById('countTabKelolaSmp');
  const tabSma = document.getElementById('countTabKelolaSma');

  if (tabTotal) tabTotal.textContent = totalCount;
  if (tabSd) tabSd.textContent = sdCount;
  if (tabSmp) tabSmp.textContent = smpCount;
  if (tabSma) tabSma.textContent = smaCount;

  // 2. Filter items
  let filtered = [...MASTER_SARANA_SEKOLAH];
  if (currentKelolaLevelFilter !== 'ALL') {
    filtered = filtered.filter(s => s.level === currentKelolaLevelFilter);
  }
  if (searchKw) {
    filtered = filtered.filter(s => s.nama.toLowerCase().includes(searchKw) || s.level.toLowerCase().includes(searchKw));
  }

  // Sort by level order (SD, SMP, SMA) then alphabetically
  const levelOrder = { 'SD': 1, 'SMP': 2, 'SMA': 3 };
  filtered.sort((a, b) => {
    const lA = levelOrder[a.level] || 99;
    const lB = levelOrder[b.level] || 99;
    if (lA !== lB) return lA - lB;
    return a.nama.localeCompare(b.nama);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 32px 16px; color: #94a3b8;">
          <i class="bi bi-search" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
          Tidak ada data sekolah yang sesuai dengan pencarian.
        </td>
      </tr>
    `;
    return;
  }

  // Pre-calculate enrolled students count per school
  const studentCountMap = {};
  (sekolahRecords || []).forEach(r => {
    if (r.sekolah) {
      const up = r.sekolah.trim().toUpperCase();
      studentCountMap[up] = (studentCountMap[up] || 0) + 1;
    }
  });

  let html = '';
  filtered.forEach((school, idx) => {
    const count = studentCountMap[school.nama.toUpperCase()] || 0;
    let badgeClass = 'badge-level-sd';
    let badgeIcon = 'bi bi-mortarboard-fill';
    let levelLabel = 'SD / MI';
    if (school.level === 'SMP') {
      badgeClass = 'badge-level-smp';
      badgeIcon = 'bi bi-buildings-fill';
      levelLabel = 'SMP / MTs';
    } else if (school.level === 'SMA') {
      badgeClass = 'badge-level-sma';
      badgeIcon = 'bi bi-award-fill';
      levelLabel = 'SMA / SMK / MA';
    }

    html += `
      <tr class="tr-kelola-sekolah" style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 14px; text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
        <td style="padding: 10px 14px; font-weight: 700; color: #1e293b;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="bi bi-building" style="color: #6366f1;"></i>
            <span>${escapeHtml(school.nama)}</span>
          </div>
        </td>
        <td style="padding: 10px 14px; text-align: center;">
          <span class="${badgeClass}">
            <i class="${badgeIcon}"></i> ${levelLabel}
          </span>
        </td>
        <td style="padding: 10px 14px; text-align: center;">
          <span style="font-weight: 800; font-size: 12px; background: ${count > 0 ? '#e0e7ff' : '#f1f5f9'}; color: ${count > 0 ? '#4338ca' : '#94a3b8'}; padding: 3px 10px; border-radius: 999px;">
            ${count} Siswa
          </span>
        </td>
        <td style="padding: 10px 14px; text-align: center;">
          <div style="display: inline-flex; gap: 6px;">
            <button type="button" class="btn btn-sm" onclick="editSekolahItem('${escapeHtml(school.nama)}')"
              title="Edit Data Sekolah"
              style="padding: 4px 10px; font-size: 11.5px; font-weight: 700; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
              <i class="bi bi-pencil-fill"></i> Edit
            </button>
            <button type="button" class="btn btn-sm" onclick="deleteSekolahItem('${escapeHtml(school.nama)}')"
              title="Hapus Sekolah"
              style="padding: 4px 8px; font-size: 11.5px; font-weight: 700; background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; border-radius: 6px; cursor: pointer;">
              <i class="bi bi-trash3-fill"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

/* ==========================================================================
   🎓 FITUR NAIK KELAS & KELULUSAN (CKG SEKOLAH)
   ========================================================================== */

function openNaikKelasModal() {
  const currentUserRole = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  if (!currentUserRole.includes('admin') && !currentUserRole.includes('koordinator')) {
    showToast('Fitur Kenaikan Kelas hanya dapat diakses oleh Admin dan Koordinator.', 'warning');
    return;
  }

  const modal = document.getElementById('modalNaikKelas');
  if (!modal) return;

  const selectSekolah = document.getElementById('naikKelasSekolah');
  if (selectSekolah) {
    const masterSet = new Set(MASTER_SARANA_SEKOLAH.map(s => s.nama.toUpperCase()));
    const extraSchools = [];
    sekolahRecords.forEach(r => {
      if (r.sekolah && r.sekolah.trim()) {
        const up = r.sekolah.trim().toUpperCase();
        if (!masterSet.has(up) && !extraSchools.includes(up)) extraSchools.push(up);
      }
    });

    const sdList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SD').map(s => s.nama);
    const smpList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SMP').map(s => s.nama);
    const smaList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SMA').map(s => s.nama);

    let html = '<option value="">-- Pilih Sekolah --</option>';
    html += '<optgroup label="📚 SD / MI (Kelas 1 - 6)">';
    html += sdList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    html += '</optgroup>';
    html += '<optgroup label="🏫 SMP / MTs (Kelas 7 - 9)">';
    html += smpList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    html += '</optgroup>';
    html += '<optgroup label="🎓 SMA / SMK / MA (Kelas 10 - 12)">';
    html += smaList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    html += '</optgroup>';
    if (extraSchools.length > 0) {
      html += '<optgroup label="📍 Sekolah Lainnya">';
      html += extraSchools.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
      html += '</optgroup>';
    }

    selectSekolah.innerHTML = html;

    const currentFilterSekolah = document.getElementById('filterSelectSekolah')?.value;
    if (currentFilterSekolah) {
      selectSekolah.value = currentFilterSekolah;
    }
  }

  // Pre-fill archive year label (e.g. "2025/2026")
  const inputTahun = document.getElementById('naikKelasTahunArsip');
  if (inputTahun) {
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    const startYear = curMonth >= 7 ? curYear : curYear - 1;
    inputTahun.value = `${startYear}/${startYear + 1}`;
  }

  const radioOtomatis = document.querySelector('input[name="modeNaikKelas"][value="otomatis"]');
  if (radioOtomatis) radioOtomatis.checked = true;
  toggleNaikKelasMode();

  onNaikKelasSekolahChange();

  modal.classList.add('open');
  modal.style.display = 'flex';
}

function closeNaikKelasModal() {
  const modal = document.getElementById('modalNaikKelas');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function toggleNaikKelasMode() {
  const isManual = document.querySelector('input[name="modeNaikKelas"]:checked')?.value === 'manual';
  const containerManual = document.getElementById('containerNaikKelasManual');
  if (containerManual) {
    containerManual.style.display = isManual ? 'block' : 'none';
  }
  previewNaikKelasImpact();
}

function onNaikKelasSekolahChange() {
  const schoolName = document.getElementById('naikKelasSekolah')?.value || '';
  const selectAsal = document.getElementById('naikKelasAsal');
  const selectTujuan = document.getElementById('naikKelasTujuan');

  if (selectAsal && selectTujuan) {
    const standardClasses = getClassesForSchool(schoolName);

    const existingClasses = new Set();
    sekolahRecords.forEach(r => {
      if ((r.sekolah || '').toUpperCase() === schoolName.toUpperCase() && r.kelas && r.kelas.trim()) {
        existingClasses.add(r.kelas.trim().toUpperCase());
      }
    });

    const asalSet = new Set([...standardClasses.map(c => c.toUpperCase()), ...existingClasses]);
    asalSet.delete('LULUS');

    const sortedAsal = Array.from(asalSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB || a.localeCompare(b);
    });

    selectAsal.innerHTML = '<option value="">-- Pilih Kelas Asal --</option>' +
      sortedAsal.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');

    const tujuanSet = new Set([...standardClasses.map(c => c.toUpperCase()), ...existingClasses, 'LULUS']);
    const sortedTujuan = Array.from(tujuanSet).sort((a, b) => {
      if (a === 'LULUS') return 1;
      if (b === 'LULUS') return -1;
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB || a.localeCompare(b);
    });

    selectTujuan.innerHTML = '<option value="">-- Pilih Kelas Tujuan --</option>' +
      sortedTujuan.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
  }

  previewNaikKelasImpact();
}

function promoteClassString(oldKelas, schoolLevel) {
  if (!oldKelas) return null;
  const clean = oldKelas.trim();
  const upper = clean.toUpperCase();
  if (upper === 'LULUS' || upper.includes('ALUMNI')) return null;

  let maxGrade = 9;
  if (schoolLevel === 'SD') maxGrade = 6;
  else if (schoolLevel === 'SMP') maxGrade = 9;
  else if (schoolLevel === 'SMA') maxGrade = 12;
  else {
    const numMatch = clean.match(/\d+/);
    if (numMatch) {
      const n = parseInt(numMatch[0], 10);
      if (n <= 6) maxGrade = 6;
      else if (n <= 9) maxGrade = 9;
      else maxGrade = 12;
    }
  }

  const arabicMatch = clean.match(/(\d+)/);
  if (arabicMatch) {
    const currentNum = parseInt(arabicMatch[1], 10);
    if (currentNum >= maxGrade) {
      return 'LULUS';
    }
    const nextNum = currentNum + 1;
    return clean.replace(arabicMatch[1], String(nextNum));
  }

  const romanMap = {
    'I': 'II', 'II': 'III', 'III': 'IV', 'IV': 'V', 'V': 'VI', 'VI': 'LULUS',
    'VII': 'VIII', 'VIII': 'IX', 'IX': 'LULUS',
    'X': 'XI', 'XI': 'XII', 'XII': 'LULUS'
  };
  for (const [rom, nextRom] of Object.entries(romanMap)) {
    const reg = new RegExp(`\\b${rom}\\b`, 'i');
    if (reg.test(clean)) {
      if (nextRom === 'LULUS') return 'LULUS';
      return clean.replace(reg, nextRom);
    }
  }

  return null;
}

function previewNaikKelasImpact() {
  const schoolName = document.getElementById('naikKelasSekolah')?.value || '';
  const isManual = document.querySelector('input[name="modeNaikKelas"]:checked')?.value === 'manual';
  const previewList = document.getElementById('naikKelasPreviewList');
  const countBadge = document.getElementById('naikKelasTotalCountBadge');
  const btnSubmit = document.getElementById('btnSubmitNaikKelas');

  if (!previewList || !countBadge) return;

  if (!schoolName) {
    previewList.innerHTML = '<span style="color:#94a3b8; font-style:italic;">Pilih sekolah terlebih dahulu untuk melihat ringkasan.</span>';
    countBadge.textContent = '0 Siswa';
    if (btnSubmit) btnSubmit.disabled = true;
    return;
  }

  const schoolStudents = sekolahRecords.filter(r => (r.sekolah || '').toUpperCase() === schoolName.toUpperCase());
  const level = getSchoolLevel(schoolName);

  if (schoolStudents.length === 0) {
    previewList.innerHTML = `<span style="color:#ef4444; font-weight:600;"><i class="bi bi-exclamation-triangle"></i> Tidak ada data siswa yang terdaftar di sekolah "${escapeHtml(schoolName)}".</span>`;
    countBadge.textContent = '0 Siswa';
    if (btnSubmit) btnSubmit.disabled = true;
    return;
  }

  let totalImpacted = 0;
  let breakdownHtml = '';

  if (isManual) {
    const asal = (document.getElementById('naikKelasAsal')?.value || '').trim().toUpperCase();
    const tujuan = (document.getElementById('naikKelasTujuan')?.value || '').trim().toUpperCase();

    if (!asal || !tujuan) {
      previewList.innerHTML = '<span style="color:#64748b;">Silakan pilih Kelas Asal dan Kelas Tujuan.</span>';
      countBadge.textContent = '0 Siswa';
      if (btnSubmit) btnSubmit.disabled = true;
      return;
    }

    if (asal === tujuan) {
      previewList.innerHTML = '<span style="color:#ef4444; font-weight:600;">Kelas asal dan kelas tujuan tidak boleh sama.</span>';
      countBadge.textContent = '0 Siswa';
      if (btnSubmit) btnSubmit.disabled = true;
      return;
    }

    const matchedStudents = schoolStudents.filter(r => (r.kelas || '').trim().toUpperCase() === asal);
    totalImpacted = matchedStudents.length;

    const isLulus = tujuan === 'LULUS';
    breakdownHtml = `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
        <div>
          <strong style="color:#1e293b;">${escapeHtml(asal)}</strong>
          <i class="bi bi-arrow-right" style="margin:0 6px; color:#2563eb;"></i>
          <strong style="color:${isLulus ? '#059669' : '#2563eb'};">${escapeHtml(tujuan)}</strong>
          ${isLulus ? ' <span class="badge badge-emerald" style="font-size:10px; padding:2px 6px;">🎓 LULUS</span>' : ''}
        </div>
        <div style="font-weight:800; color:#1e40af;">${totalImpacted} Siswa</div>
      </div>
    `;
  } else {
    const classGroups = {};
    schoolStudents.forEach(r => {
      const k = (r.kelas || '').trim().toUpperCase() || 'TANPA KELAS';
      if (k === 'LULUS' || k.includes('ALUMNI')) return;
      if (!classGroups[k]) classGroups[k] = 0;
      classGroups[k]++;
    });

    const entries = Object.entries(classGroups);
    if (entries.length === 0) {
      previewList.innerHTML = '<span style="color:#64748b;">Semua siswa di sekolah ini sudah berstatus LULUS.</span>';
      countBadge.textContent = '0 Siswa';
      if (btnSubmit) btnSubmit.disabled = true;
      return;
    }

    entries.sort((a, b) => {
      const numA = parseInt(a[0].replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b[0].replace(/\D/g, ''), 10) || 0;
      return numA - numB || a[0].localeCompare(b[0]);
    });

    breakdownHtml = '<div style="display:flex; flex-direction:column; gap:6px;">';
    entries.forEach(([oldCls, count]) => {
      const newCls = promoteClassString(oldCls, level) || 'LULUS';
      const isLulus = newCls === 'LULUS';
      totalImpacted += count;
      breakdownHtml += `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; display:flex; align-items:center; justify-content:space-between; font-size:12.5px;">
          <div>
            <span style="font-weight:700; color:#334155;">${escapeHtml(oldCls)}</span>
            <i class="bi bi-arrow-right" style="margin:0 6px; color:#3b82f6;"></i>
            <span style="font-weight:800; color:${isLulus ? '#059669' : '#1d4ed8'};">${escapeHtml(newCls)}</span>
            ${isLulus ? ' <span class="badge badge-emerald" style="font-size:10px; padding:2px 6px;">🎓 LULUS</span>' : ''}
          </div>
          <span style="font-weight:800; color:#1e40af; background:#dbeafe; padding:2px 8px; border-radius:10px; font-size:11px;">
            ${count} siswa
          </span>
        </div>
      `;
    });
    breakdownHtml += '</div>';
  }

  previewList.innerHTML = breakdownHtml;
  countBadge.textContent = `${totalImpacted} Siswa`;
  if (btnSubmit) btnSubmit.disabled = totalImpacted === 0;
}

async function executeNaikKelas(e) {
  if (e && e.preventDefault) e.preventDefault();

  const currentUserRole = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  if (!currentUserRole.includes('admin') && !currentUserRole.includes('koordinator')) {
    showToast('Hanya Koordinator dan Admin yang memiliki izin memproses kenaikan kelas.', 'warning');
    return;
  }

  const schoolName = document.getElementById('naikKelasSekolah')?.value;
  if (!schoolName) {
    showToast('Silakan pilih sekolah terlebih dahulu.', 'warning');
    return;
  }

  const isManual = document.querySelector('input[name="modeNaikKelas"]:checked')?.value === 'manual';
  const resetSkrining = document.getElementById('naikKelasResetSkrining')?.checked || false;
  const level = getSchoolLevel(schoolName);

  const updates = [];
  const schoolStudents = sekolahRecords.filter(r => (r.sekolah || '').toUpperCase() === schoolName.toUpperCase());

  if (isManual) {
    const asal = (document.getElementById('naikKelasAsal')?.value || '').trim().toUpperCase();
    const tujuan = (document.getElementById('naikKelasTujuan')?.value || '').trim().toUpperCase();
    if (!asal || !tujuan) {
      showToast('Pilih kelas asal dan kelas tujuan.', 'warning');
      return;
    }

    schoolStudents.forEach(student => {
      if ((student.kelas || '').trim().toUpperCase() === asal) {
        updates.push({ student, targetKelas: tujuan, isLulus: tujuan === 'LULUS' });
      }
    });
  } else {
    schoolStudents.forEach(student => {
      const oldK = (student.kelas || '').trim().toUpperCase();
      if (oldK === 'LULUS' || oldK.includes('ALUMNI')) return;
      const nextK = promoteClassString(student.kelas, level) || 'LULUS';
      updates.push({ student, targetKelas: nextK, isLulus: nextK === 'LULUS' });
    });
  }

  if (updates.length === 0) {
    showToast('Tidak ada siswa yang perlu dinaikkan kelasnya.', 'info');
    return;
  }

  const inputTahunArsip = (document.getElementById('naikKelasTahunArsip')?.value || '').trim();
  const curY = new Date().getFullYear();
  const curM = new Date().getMonth() + 1;
  const defStart = curM >= 7 ? curY : curY - 1;
  const tahunArsip = inputTahunArsip || `${defStart}/${defStart + 1}`;

  const lulusCount = updates.filter(u => u.isLulus).length;
  const naikCount = updates.length - lulusCount;

  const result = await Swal.fire({
    title: 'Konfirmasi Kenaikan Kelas',
    html: `
      <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #1e293b;">
        <p>Anda akan memproses <strong>${updates.length} siswa</strong> di <strong>${escapeHtml(schoolName)}</strong>:</p>
        <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 12px; margin: 12px 0;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span><i class="bi bi-arrow-up-circle-fill" style="color:#2563eb;"></i> Naik Tingkat Kelas:</span>
            <strong>${naikCount} siswa</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span><i class="bi bi-mortarboard-fill" style="color:#059669;"></i> Masuk Status Lulus:</span>
            <strong style="color:#059669;">${lulusCount} siswa</strong>
          </div>
          <div style="display:flex; justify-content:space-between; border-top: 1px dashed #bfdbfe; padding-top: 4px; margin-top: 4px;">
            <span><i class="bi bi-archive-fill" style="color:#7c3aed;"></i> Periode Arsip Skrining:</span>
            <strong style="color:#7c3aed;">Tahun ${escapeHtml(tahunArsip)}</strong>
          </div>
        </div>
        ${resetSkrining ? `
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 12px; font-size:12px; color:#15803d; line-height: 1.5;">
            <i class="bi bi-shield-check"></i> <strong>Pemeriksaan sebelumnya TIDAK AKAN HILANG.</strong> Seluruh hasil skrining akan otomatis diarsipkan dengan tanda <strong>Tahun ${escapeHtml(tahunArsip)}</strong> dan <strong>Kelas Saat Pemeriksaan</strong>. Formulir siswa kemudian disiapkan segar untuk kelas baru.
          </div>
        ` : ''}
        <p style="font-size: 11.5px; color: #64748b; margin-top: 10px;">Pastikan Anda sudah mengekspor backup data sebelum memproses kenaikan kelas masal.</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#64748b',
    confirmButtonText: '<i class="bi bi-mortarboard-fill"></i> Ya, Proses Sekarang',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  Swal.fire({
    title: 'Memproses Kenaikan Kelas...',
    html: `Sedang memperbarui <strong>${updates.length}</strong> siswa di Cloud Database...`,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  const modifiedRecords = [];
  let totalArchivedCount = 0;

  updates.forEach(({ student, targetKelas, isLulus }) => {
    const oldKelas = student.kelas || '-';

    // 1. Cek apakah ada riwayat pemeriksaan yang perlu diarsipkan (baik lengkap maupun sebagian)
    const hasExamData = getSekolahRecordExamStations(student).completedCount > 0
      || Number(student.bb || 0) > 0
      || Number(student.tb || 0) > 0
      || Number(student.td_sistolik || 0) > 0
      || (student.hb && student.hb !== '-' && student.hb !== 'Tidak Diperiksa')
      || (student.gula_darah && student.gula_darah !== '-' && student.gula_darah !== 'Tidak Diperiksa');

    if (hasExamData) {
      if (!Array.isArray(student.riwayat_pemeriksaan)) {
        student.riwayat_pemeriksaan = [];
      }

      const historyEntry = {
        id_riwayat: 'HIST-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
        tahun_ajaran: tahunArsip,
        tahun: student.tahun_skrining || ((student.tanggal_entry && student.tanggal_entry.length >= 4) ? student.tanggal_entry.substring(0, 4) : '2026'),
        kelas: oldKelas,
        sekolah: student.sekolah || schoolName,
        tanggal_pemeriksaan: student.tanggal_entry || new Date().toISOString().substring(0, 10),
        petugas_entry: student.petugas_entry || 'Petugas',
        bb: Number(student.bb || 0),
        tb: Number(student.tb || 0),
        lp: Number(student.lp || 0),
        imt: Number(student.imt || 0),
        status_imt: student.status_imt || 'Normal',
        td_sistolik: Number(student.td_sistolik || 0),
        td_diastolik: Number(student.td_diastolik || 0),
        gula_darah: student.gula_darah || '-',
        hb: student.hb || '-',
        telinga: student.telinga || 'Tidak ada serumen',
        gigi: student.gigi || 'Tidak ada',
        mata: student.mata || 'Normal',
        kebugaran: student.kebugaran || 'Baik',
        menstruasi: student.menstruasi || 'Belum',
        kuku: student.kuku || 'Pendek Bersih',
        merokok: student.merokok || 'Tidak',
        jenis_rokok: student.jenis_rokok || '-',
        intensitas_merokok: student.intensitas_merokok || '-',
        jumlah_batang: student.jumlah_batang || '-',
        status_kesehatan: student.status_kesehatan || 'Sehat',
        catatan_rujukan: student.catatan_rujukan || '-',
        is_examined: 1,
        antro_done: student.antro_done ? 1 : 0,
        vital_done: student.vital_done ? 1 : 0,
        lab_done: student.lab_done ? 1 : 0,
        organ_done: student.organ_done ? 1 : 0,
        kesimpulan_done: student.kesimpulan_done ? 1 : 0
      };

      // Hindari duplikasi untuk kelas dan tahun ajaran yang persis sama
      const existIdx = student.riwayat_pemeriksaan.findIndex(h => h.kelas === historyEntry.kelas && h.tahun_ajaran === historyEntry.tahun_ajaran);
      if (existIdx >= 0) {
        student.riwayat_pemeriksaan[existIdx] = historyEntry;
      } else {
        student.riwayat_pemeriksaan.push(historyEntry);
      }
      totalArchivedCount++;
    }

    // 2. Perbarui ke kelas target baru
    student.kelas = targetKelas;

    // 3. Reset formulir aktif untuk siswa yang naik tingkat (bukan lulus)
    if (resetSkrining && !isLulus) {
      student.bb = 0;
      student.tb = 0;
      student.lp = 0;
      student.imt = 0;
      student.status_imt = 'Normal';
      student.td_sistolik = 0;
      student.td_diastolik = 0;
      student.gula_darah = '-';
      student.hb = '-';
      student.telinga = 'Tidak ada serumen';
      student.gigi = 'Tidak ada';
      student.mata = 'Normal';
      student.kebugaran = 'Baik';
      student.menstruasi = 'Belum';
      student.kuku = 'Pendek Bersih';
      student.merokok = 'Tidak';
      student.jenis_rokok = '-';
      student.intensitas_merokok = '-';
      student.jumlah_batang = '-';
      student.status_kesehatan = 'Sehat';
      student.catatan_rujukan = '-';
      student.is_examined = 0;
      student.antro_done = 0;
      student.vital_done = 0;
      student.lab_done = 0;
      student.organ_done = 0;
      student.kesimpulan_done = 0;
      student.tanggal_entry = '';
      const currentYearNum = parseInt(student.tahun_skrining || '2026', 10);
      student.tahun_skrining = String(isNaN(currentYearNum) ? 2027 : currentYearNum + 1);
    }

    modifiedRecords.push(student);
  });

  if (typeof CkgIdb !== 'undefined') {
    CkgIdb.set('sekolah_records', sekolahRecords);
  }

  try {
    const batchSize = 50;
    for (let i = 0; i < modifiedRecords.length; i += batchSize) {
      const batch = modifiedRecords.slice(i, i + batchSize);
      await fetch('/api/sekolah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch)
      });
    }

    closeNaikKelasModal();
    populateSekolahFilterDropdowns();

    const selectFilter = document.getElementById('filterSelectSekolah');
    if (selectFilter) {
      selectFilter.value = schoolName;
      updateKelasDropdownOptions();
    }
    renderSekolahView();

    Swal.fire({
      icon: 'success',
      title: 'Kenaikan Kelas Berhasil!',
      html: `
        <div style="text-align: left; font-size: 13.5px; line-height: 1.6;">
          <p>Kenaikan kelas untuk <strong>${escapeHtml(schoolName)}</strong> telah selesai diproses!</p>
          <ul style="padding-left: 20px; color: #1e293b;">
            <li><strong>${naikCount} siswa</strong> berhasil naik ke tingkat kelas berikutnya.</li>
            <li><strong style="color: #059669;">${lulusCount} siswa</strong> tingkat akhir berhasil dialihkan ke status <strong>"LULUS"</strong>.</li>
            <li><strong style="color: #2563eb;">${totalArchivedCount} pemeriksaan sebelumnya</strong> berhasil diarsipkan ke riwayat (Tahun: <strong>${escapeHtml(tahunArsip)}</strong>).</li>
          </ul>
          <div style="font-size: 12px; color: #047857; background: #ecfdf5; padding: 8px 12px; border-radius: 8px; border: 1px solid #a7f3d0; margin-top: 10px;">
            💡 Riwayat pemeriksaan kelas sebelumnya dapat dilihat kapan saja dengan mengklik tombol <strong>Periksa</strong> pada baris siswa.
          </div>
        </div>
      `,
      confirmButtonColor: '#059669'
    });
  } catch (err) {
    console.error('Error executing naik kelas:', err);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Memperbarui Cloud',
      text: err.message || 'Terjadi kesalahan saat menyinkronkan ke database server.',
      confirmButtonColor: '#dc2626'
    });
  }
}

/* ==========================================================================
   🔄 FITUR MIGRASI / MUTASI SEKOLAH SISWA (CKG SEKOLAH)
   ========================================================================== */

let migrasiCachedStudents = [];

function openMigrasiSekolahModal() {
  const currentUserRole = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  if (!currentUserRole.includes('admin') && !currentUserRole.includes('koordinator')) {
    showToast('Fitur Migrasi Sekolah hanya dapat diakses oleh Admin dan Koordinator.', 'warning');
    return;
  }

  const modal = document.getElementById('modalMigrasiSekolah');
  if (!modal) return;

  const selectAsal = document.getElementById('migrasiSekolahAsal');
  const selectTujuan = document.getElementById('migrasiSekolahTujuan');

  const masterSet = new Set(MASTER_SARANA_SEKOLAH.map(s => s.nama.toUpperCase()));
  const extraSchools = [];
  sekolahRecords.forEach(r => {
    if (r.sekolah && r.sekolah.trim()) {
      const up = r.sekolah.trim().toUpperCase();
      if (!masterSet.has(up) && !extraSchools.includes(up)) extraSchools.push(up);
    }
  });

  const sdList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SD').map(s => s.nama);
  const smpList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SMP').map(s => s.nama);
  const smaList = MASTER_SARANA_SEKOLAH.filter(s => s.level === 'SMA').map(s => s.nama);

  function buildOptions(placeholder) {
    let html = `<option value="">${placeholder}</option>`;
    html += '<optgroup label="📚 SD / MI (Kelas 1 - 6)">';
    html += sdList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    html += '</optgroup>';
    html += '<optgroup label="🏫 SMP / MTs (Kelas 7 - 9)">';
    html += smpList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    html += '</optgroup>';
    html += '<optgroup label="🎓 SMA / SMK / MA (Kelas 10 - 12)">';
    html += smaList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    html += '</optgroup>';
    if (extraSchools.length > 0) {
      html += '<optgroup label="📍 Sekolah Lainnya">';
      html += extraSchools.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
      html += '</optgroup>';
    }
    return html;
  }

  if (selectAsal) {
    selectAsal.innerHTML = buildOptions('-- Pilih Sekolah Asal --');
    const currentFilter = document.getElementById('filterSelectSekolah')?.value;
    if (currentFilter) selectAsal.value = currentFilter;
  }

  if (selectTujuan) {
    selectTujuan.innerHTML = buildOptions('-- Pilih Sekolah Tujuan --');
  }

  const radioAll = document.querySelector('input[name="modeMigrasiSiswa"][value="all"]');
  if (radioAll) radioAll.checked = true;
  toggleMigrasiMode();

  onMigrasiSekolahAsalChange();
  onMigrasiSekolahTujuanChange();

  modal.classList.add('open');
  modal.style.display = 'flex';
}

function closeMigrasiSekolahModal() {
  const modal = document.getElementById('modalMigrasiSekolah');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function onMigrasiSekolahAsalChange() {
  const originSchool = document.getElementById('migrasiSekolahAsal')?.value || '';
  const selectFilterKelas = document.getElementById('migrasiKelasAsalFilter');

  if (selectFilterKelas) {
    const existingClasses = new Set();
    sekolahRecords.forEach(r => {
      if ((r.sekolah || '').toUpperCase() === originSchool.toUpperCase() && r.kelas && r.kelas.trim()) {
        existingClasses.add(r.kelas.trim().toUpperCase());
      }
    });

    const sorted = Array.from(existingClasses).sort((a, b) => {
      if (a === 'LULUS') return 1;
      if (b === 'LULUS') return -1;
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB || a.localeCompare(b);
    });

    selectFilterKelas.innerHTML = '<option value="">-- Semua Kelas --</option>' +
      sorted.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
  }

  updateMigrasiSiswaList();
}

function onMigrasiKelasAsalFilterChange() {
  updateMigrasiSiswaList();
}

function onMigrasiSekolahTujuanChange() {
  const destSchool = document.getElementById('migrasiSekolahTujuan')?.value || '';
  const selectDestKelas = document.getElementById('migrasiKelasTujuan');
  if (!selectDestKelas) return;

  let html = '<option value="keep">-- Pertahankan Kelas Saat Ini --</option>';
  if (destSchool) {
    const classes = getClassesForSchool(destSchool);
    html += classes.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  }
  selectDestKelas.innerHTML = html;
}

function toggleMigrasiMode() {
  const isSelected = document.querySelector('input[name="modeMigrasiSiswa"]:checked')?.value === 'selected';
  const containerChecklist = document.getElementById('containerMigrasiChecklist');
  if (containerChecklist) {
    containerChecklist.style.display = isSelected ? 'block' : 'none';
  }
  updateMigrasiCheckedCount();
}

function updateMigrasiSiswaList() {
  const originSchool = (document.getElementById('migrasiSekolahAsal')?.value || '').trim().toUpperCase();
  const filterKelas = (document.getElementById('migrasiKelasAsalFilter')?.value || '').trim().toUpperCase();
  const badgeAll = document.getElementById('migrasiCountAllBadge');
  const checklistContainer = document.getElementById('migrasiSiswaChecklistItems');
  const checkAll = document.getElementById('migrasiCheckAll');

  if (!originSchool) {
    migrasiCachedStudents = [];
    if (badgeAll) badgeAll.textContent = '0';
    if (checklistContainer) checklistContainer.innerHTML = '<div style="color:#94a3b8; font-size:12px; text-align:center; padding:10px;">Pilih sekolah asal terlebih dahulu</div>';
    updateMigrasiCheckedCount();
    return;
  }

  migrasiCachedStudents = sekolahRecords.filter(r => {
    if ((r.sekolah || '').toUpperCase() !== originSchool) return false;
    if (filterKelas && (r.kelas || '').trim().toUpperCase() !== filterKelas) return false;
    return true;
  });

  if (badgeAll) badgeAll.textContent = String(migrasiCachedStudents.length);

  if (checklistContainer) {
    if (migrasiCachedStudents.length === 0) {
      checklistContainer.innerHTML = '<div style="color:#ef4444; font-size:12px; text-align:center; padding:10px;">Tidak ada siswa yang cocok dengan filter</div>';
    } else {
      checklistContainer.innerHTML = migrasiCachedStudents.map(r => {
        const safeId = escapeHtml(r.id || '');
        const safeNama = escapeHtml(r.nama || '');
        const safeKelas = escapeHtml(r.kelas || '-');
        const safeNik = escapeHtml(r.nik || '-');
        return `
          <label style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:6px 12px; cursor:pointer; font-size:12.5px; margin:0;">
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" class="cb-migrasi-siswa" value="${safeId}" onchange="updateMigrasiCheckedCount()" style="width:16px; height:16px;">
              <div>
                <strong style="color:#0f172a;">${safeNama}</strong>
                <span style="font-size:11px; color:#64748b; margin-left:6px;">(NIK: ${safeNik})</span>
              </div>
            </div>
            <span class="badge badge-purple" style="font-size:10px; padding:2px 7px;">${safeKelas}</span>
          </label>
        `;
      }).join('');
    }
  }

  if (checkAll) checkAll.checked = false;
  updateMigrasiCheckedCount();
}

function toggleMigrasiCheckAll(checked) {
  document.querySelectorAll('.cb-migrasi-siswa').forEach(cb => {
    cb.checked = checked;
  });
  updateMigrasiCheckedCount();
}

function updateMigrasiCheckedCount() {
  const textEl = document.getElementById('migrasiCheckedCountText');
  const checkedCbs = document.querySelectorAll('.cb-migrasi-siswa:checked');
  if (textEl) {
    textEl.textContent = `${checkedCbs.length} dipilih`;
  }
}

async function executeMigrasiSekolah(e) {
  if (e && e.preventDefault) e.preventDefault();

  const currentUserRole = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  if (!currentUserRole.includes('admin') && !currentUserRole.includes('koordinator')) {
    showToast('Hanya Koordinator dan Admin yang memiliki izin memproses migrasi sekolah.', 'warning');
    return;
  }

  const asal = document.getElementById('migrasiSekolahAsal')?.value;
  const tujuan = document.getElementById('migrasiSekolahTujuan')?.value;
  const kelasTujuanVal = document.getElementById('migrasiKelasTujuan')?.value || 'keep';
  const isSelectedMode = document.querySelector('input[name="modeMigrasiSiswa"]:checked')?.value === 'selected';

  if (!asal) {
    showToast('Pilih sekolah asal.', 'warning');
    return;
  }
  if (!tujuan) {
    showToast('Pilih sekolah tujuan.', 'warning');
    return;
  }
  if (asal.toUpperCase() === tujuan.toUpperCase()) {
    showToast('Sekolah tujuan tidak boleh sama dengan sekolah asal.', 'warning');
    return;
  }

  let targetStudents = [];
  if (isSelectedMode) {
    const checkedIds = new Set(Array.from(document.querySelectorAll('.cb-migrasi-siswa:checked')).map(cb => cb.value));
    if (checkedIds.size === 0) {
      showToast('Centang setidaknya 1 siswa yang ingin dipindahkan.', 'warning');
      return;
    }
    targetStudents = migrasiCachedStudents.filter(r => checkedIds.has(r.id));
  } else {
    targetStudents = [...migrasiCachedStudents];
  }

  if (targetStudents.length === 0) {
    showToast('Tidak ada siswa yang dipilih untuk dipindahkan.', 'warning');
    return;
  }

  const kelasDesc = kelasTujuanVal === 'keep' ? 'Mempertahankan kelas masing-masing' : `Diubah menjadi ${kelasTujuanVal}`;

  const result = await Swal.fire({
    title: 'Konfirmasi Migrasi Sekolah',
    html: `
      <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #1e293b;">
        <p>Anda akan memindahkan data <strong>${targetStudents.length} siswa</strong>:</p>
        <div style="background: #f0fdfa; border: 1.5px solid #99f6e4; border-radius: 10px; padding: 12px; margin: 12px 0;">
          <div style="margin-bottom:6px;">
            <strong style="color: #64748b;">Sekolah Asal:</strong><br>
            <span style="font-weight:700; color:#b91c1c;">${escapeHtml(asal)}</span>
          </div>
          <div style="margin-bottom:6px;">
            <strong style="color: #64748b;">Sekolah Tujuan:</strong><br>
            <span style="font-weight:700; color:#0f766e;">${escapeHtml(tujuan)}</span>
          </div>
          <div>
            <strong style="color: #64748b;">Penyesuaian Kelas:</strong><br>
            <span style="font-weight:700; color:#0369a1;">${escapeHtml(kelasDesc)}</span>
          </div>
        </div>
        <p style="font-size: 11.5px; color: #64748b;">Riwayat pemeriksaan medis siswa akan tetap tersimpan utuh di bawah nama sekolah yang baru.</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#0d9488',
    cancelButtonColor: '#64748b',
    confirmButtonText: '<i class="bi bi-arrow-left-right"></i> Ya, Pindahkan Siswa',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  Swal.fire({
    title: 'Memindahkan Data Siswa...',
    html: `Sedang memindahkan <strong>${targetStudents.length}</strong> siswa ke server Cloud...`,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  targetStudents.forEach(student => {
    student.sekolah = tujuan;
    if (kelasTujuanVal !== 'keep') {
      student.kelas = kelasTujuanVal;
    }
  });

  if (typeof CkgIdb !== 'undefined') {
    CkgIdb.set('sekolah_records', sekolahRecords);
  }

  try {
    const batchSize = 50;
    for (let i = 0; i < targetStudents.length; i += batchSize) {
      const batch = targetStudents.slice(i, i + batchSize);
      await fetch('/api/sekolah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch)
      });
    }

    closeMigrasiSekolahModal();
    populateSekolahFilterDropdowns();

    const selectFilter = document.getElementById('filterSelectSekolah');
    if (selectFilter) {
      selectFilter.value = tujuan;
      updateKelasDropdownOptions();
    }
    renderSekolahView();

    Swal.fire({
      icon: 'success',
      title: 'Migrasi Siswa Berhasil!',
      html: `
        <div style="text-align: left; font-size: 13.5px; line-height: 1.6;">
          <p>Sebanyak <strong>${targetStudents.length} siswa</strong> berhasil dipindahkan ke <strong>${escapeHtml(tujuan)}</strong>.</p>
          <div style="font-size: 12px; color: #047857; background: #ecfdf5; padding: 8px 12px; border-radius: 8px; border: 1px solid #a7f3d0;">
            Filter CKG Sekolah telah otomatis diarahkan ke <strong>${escapeHtml(tujuan)}</strong> untuk mempermudah pengecekan.
          </div>
        </div>
      `,
      confirmButtonColor: '#059669'
    });
  } catch (err) {
    console.error('Error executing migrasi sekolah:', err);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Memindahkan Siswa',
      text: err.message || 'Terjadi kesalahan saat menyimpan data ke server Cloudflare D1.',
      confirmButtonColor: '#dc2626'
    });
  }
}

// --------------------------------------------------------------------------
// 📥 EXPORT & IMPORT EXCEL CKG SEKOLAH
// --------------------------------------------------------------------------

function exportSekolahToXLSX() {
  if (typeof XLSX === 'undefined') {
    showToast('Library SheetJS XLSX belum dimuat.', 'danger');
    return;
  }

  const portalType = (sessionStorage.getItem('ckg_portal_type') || '').toLowerCase();
  const schoolAccountName = (sessionStorage.getItem('ckg_user_name') || '').trim();

  let chosenSekolah = (document.getElementById('filterSelectSekolah')?.value || '').trim().toUpperCase();
  if (portalType === 'sekolah' && schoolAccountName) {
    chosenSekolah = schoolAccountName.toUpperCase();
  }
  if (!chosenSekolah) {
    showToast('Silakan pilih sekolah terlebih dahulu sebelum mengekspor data.', 'warning');
    return;
  }
  const chosenKelas = (document.getElementById('filterSelectKelas')?.value || '').trim().toUpperCase();
  const searchQuery = (document.getElementById('searchSekolahRecords')?.value || '').trim().toLowerCase();

  let dataset = [...sekolahRecords];

  if (chosenSekolah) dataset = dataset.filter(r => (r.sekolah || '').toUpperCase() === chosenSekolah);
  if (chosenKelas) dataset = dataset.filter(r => (r.kelas || '').toUpperCase() === chosenKelas);
  if (searchQuery) {
    dataset = dataset.filter(r => {
      const nama = (r.nama || '').toLowerCase();
      const nik = String(r.nik || '').toLowerCase();
      return nama.includes(searchQuery) || nik.includes(searchQuery);
    });
  }

  const chosenTahun = (document.getElementById('filterSelectTahun')?.value || '2026').trim();
  if (chosenTahun && chosenTahun !== 'all') {
    dataset = dataset.filter(r => {
      const recYear = String(r.tahun_skrining || (r.tanggal_entry ? r.tanggal_entry.substring(0, 4) : '2026')).trim();
      if (recYear === chosenTahun) return true;
      if (Array.isArray(r.riwayat_pemeriksaan) && r.riwayat_pemeriksaan.length > 0) {
        return r.riwayat_pemeriksaan.some(h => {
          const hy = String(h.tahun || (h.tanggal_pemeriksaan ? h.tanggal_pemeriksaan.substring(0, 4) : '') || h.tahun_ajaran || '').trim();
          return hy === chosenTahun || hy.includes(chosenTahun);
        });
      }
      return false;
    });
  }

  // Apply active status filter if set
  if (currentSekolahStatusFilter === 'sudah') {
    dataset = dataset.filter(r => isSekolahRecordExamined(r));
  } else if (currentSekolahStatusFilter === 'belum') {
    dataset = dataset.filter(r => isSekolahRecordBelumExamined(r));
  } else if (currentSekolahStatusFilter === 'sebagian') {
    dataset = dataset.filter(r => isSekolahRecordPartialExamined(r));
  }

  if (dataset.length === 0) {
    showToast('Tidak ada data CKG Sekolah yang sesuai filter untuk diekspor.', 'warning');
    return;
  }

  const headers = [
    'NO', 'NAMA SISWA', 'NIK', 'JENIS KELAMIN', 'SEKOLAH', 'KELAS', 'TAHUN SKRINING', 'TANGGAL LAHIR', 'NO WHATSAPP',
    'ALAMAT', 'BB (KG)', 'TB (CM)', 'LP (CM)', 'IMT', 'STATUS GIZI', 'TD SISTOLIK', 'TD DIASTOLIK',
    'GULA DARAH', 'HB', 'TELINGA (SERUMEN)', 'GIGI KARIES', 'PEMERIKSAAN MATA', 'KUKU', 'KEBUGARAN', 'MENSTRUASI',
    'MEROKOK', 'JENIS ROKOK', 'INTENSITAS MEROKOK', 'JUMLAH BATANG',
    'STATUS KESEHATAN', 'CATATAN RUJUKAN', 'STATUS SKRINING', 'PETUGAS ENTRY', 'TANGGAL ENTRY'
  ];

  const rows = dataset.map((r, idx) => {
    let imtVal = '';
    let giziStr = r.status_imt || 'Normal';
    if (r.bb && r.tb) {
      const tbM = r.tb / 100;
      if (tbM > 0) {
        const val = (r.bb / (tbM * tbM));
        imtVal = val.toFixed(1);
        if (val < 17.0) giziStr = 'Sangat Kurus';
        else if (val < 18.5) giziStr = 'Kurus';
        else if (val <= 25.0) giziStr = 'Normal';
        else if (val <= 27.0) giziStr = 'Gemuk';
        else giziStr = 'Obesitas';
      }
    }

    const stations = getSekolahRecordExamStations(r);
    let statusSkriningText = 'Belum Diperiksa';
    if (stations.isComplete) {
      statusSkriningText = 'Sudah Diperiksa (Lengkap)';
    } else if (stations.isPartial) {
      statusSkriningText = `Periksa Sebagian (${stations.completedCount}/4)`;
    }

    return [
      r.no || idx + 1,
      r.nama || '',
      r.nik || '',
      r.jk === 'P' ? 'Perempuan' : 'Laki-laki',
      r.sekolah || '',
      r.kelas || '',
      r.tahun_skrining || '2026',
      r.tanggal_lahir || '',
      r.no_whatsapp || '',
      r.alamat || '',
      r.bb || '',
      r.tb || '',
      r.lp || '',
      imtVal,
      giziStr,
      r.td_sistolik || '',
      r.td_diastolik || '',
      r.gula_darah || '-',
      r.hb || '-',
      r.telinga || 'Tidak ada serumen',
      r.gigi || 'Tidak ada',
      r.mata || 'Normal',
      r.kuku || 'Pendek Bersih',
      r.kebugaran || 'Baik',
      r.jk === 'P' ? (r.menstruasi || 'Belum') : '-',
      r.jk === 'L' ? (r.merokok || 'Tidak') : '-',
      (r.jk === 'L' && r.merokok === 'Aktif') ? (r.jenis_rokok || '-') : '-',
      (r.jk === 'L' && r.merokok === 'Aktif' && r.jenis_rokok === 'Konvensional') ? (r.intensitas_merokok || '-') : '-',
      (r.jk === 'L' && r.merokok === 'Aktif' && r.jenis_rokok === 'Konvensional') ? (r.jumlah_batang || '-') : '-',
      r.status_kesehatan || 'Sehat',
      r.catatan_rujukan || '-',
      statusSkriningText,
      r.petugas_entry || 'Admin',
      r.tanggal_entry || ''
    ];
  });

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CKG_SEKOLAH');

  let statusSuffix = '';
  if (currentSekolahStatusFilter === 'sudah') statusSuffix = '_SUDAH_DIPERIKSA';
  if (currentSekolahStatusFilter === 'belum') statusSuffix = '_BELUM_DIPERIKSA';
  if (currentSekolahStatusFilter === 'sebagian') statusSuffix = '_PERIKSA_SEBAGIAN';

  const fileName = `CKG_SEKOLAH_${chosenSekolah ? chosenSekolah.replace(/\s+/g, '_') : 'SEMUA'}_${chosenKelas ? chosenKelas.replace(/\s+/g, '_') : 'SEMUA_KELAS'}_TAHUN_${chosenTahun}${statusSuffix}_${new Date().toISOString().substring(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
  showToast(`Berhasil mendownload Excel (${dataset.length} Siswa).`, 'success');
}

function downloadSekolahXLSXTemplate() {
  if (typeof XLSX === 'undefined') {
    showToast('Library SheetJS XLSX belum dimuat.', 'danger');
    return;
  }

  const headers = [
    'NO', 'NAMA SISWA', 'NIK', 'JENIS KELAMIN', 'SEKOLAH', 'KELAS', 'TAHUN SKRINING', 'TANGGAL LAHIR', 'NO WHATSAPP',
    'ALAMAT', 'BB (KG)', 'TB (CM)', 'LP (CM)', 'TD SISTOLIK', 'TD DIASTOLIK',
    'GULA DARAH', 'HB', 'TELINGA (SERUMEN)', 'GIGI KARIES', 'PEMERIKSAAN MATA', 'KUKU',
    'KEBUGARAN', 'MENSTRUASI', 'MEROKOK', 'JENIS ROKOK', 'INTENSITAS MEROKOK', 'JUMLAH BATANG', 'STATUS KESEHATAN', 'CATATAN RUJUKAN'
  ];

  const sampleRows = [
    [1, 'AHMAD FAUZI', '3204011504100001', 'L', 'SDN BANJARAN 01', 'Kelas 1', '2026', '2017-04-15', '081234567890', 'Kp. Pajagalan RT 01 RW 02', 24, 118, 52, 100, 65, '90', '12.5', 'Tidak ada serumen', 'Tidak ada', 'Normal', 'Pendek Bersih', 'Baik', '-', 'Tidak', '-', '-', '-', 'Sehat', '-'],
    [2, 'SITI NURHALIZA', '3204015508110002', 'P', 'SMPN 1 BANJARAN', 'Kelas 7', '2026', '2012-08-15', '089876543210', 'Kp. Ciapus RT 03 RW 01', 42, 148, 60, 105, 65, '95', '11.8', 'Ada serumen', '2', '-1', 'Panjang Bersih', 'Cukup', 'Sudah', '-', '-', '-', '-', 'Perlu Perhatian', 'Konseling Anemia'],
    [3, 'RIZKY PRATAMA', '3204012002080003', 'L', 'SMAN 1 BANJARAN', 'Kelas 10', '2026', '2009-02-20', '085712345678', 'Kp. Tarajusari RT 02 RW 04', 55, 168, 70, 115, 75, '100', '13.8', 'Tidak ada serumen', 'Tidak ada', 'Normal', 'Pendek Bersih', 'Baik', '-', 'Aktif', 'Konvensional', 'Tiap Hari', '5', 'Sehat', '-']
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'TEMPLATE_CKG_SEKOLAH');

  XLSX.writeFile(wb, 'TEMPLATE_IMPORT_CKG_SEKOLAH.xlsx');
  showToast('Template Excel CKG Sekolah berhasil didownload.', 'info');
}

function openImportSekolahModal() {
  const modal = document.getElementById('modalImportSekolah');
  if (!modal) return;
  pendingSekolahImportData = null;
  document.getElementById('sekolahImportFileInput').value = '';
  document.getElementById('sekolahImportDropzoneText').textContent = 'Pilih atau Tarik File Excel CKG Sekolah (.xlsx / .csv)';
  document.getElementById('sekolahImportPreviewArea').style.display = 'none';
  document.getElementById('btnExecuteSekolahImport').disabled = true;
  modal.classList.add('active');
  modal.classList.add('open');
  modal.style.display = 'flex';
}

function closeImportSekolahModal() {
  const modal = document.getElementById('modalImportSekolah');
  if (modal) {
    modal.classList.remove('active');
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function handleSekolahImportFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (json.length < 2) {
        showToast('File Excel kosong atau tidak memiliki data siswa.', 'warning');
        return;
      }

      const headers = (json[0] || []).map(h => String(h || '').trim().toUpperCase());
      const getColIdx = (aliases) => headers.findIndex(h => aliases.some(a => h.includes(a)));

      const idxNo = getColIdx(['NO']);
      const idxNama = getColIdx(['NAMA', 'SISWA']);
      const idxNik = getColIdx(['NIK', 'NISN']);
      const idxJk = getColIdx(['JK', 'JENIS KELAMIN']);
      const idxSekolah = getColIdx(['SEKOLAH']);
      const idxKelas = getColIdx(['KELAS']);
      const idxTglLahir = getColIdx(['TANGGAL LAHIR', 'TGL LAHIR', 'DOB']);
      const idxWa = getColIdx(['NO WHATSAPP', 'WA', 'HP', 'TELEPON']);
      const idxAlamat = getColIdx(['ALAMAT']);
      const idxBb = getColIdx(['BB']);
      const idxTb = getColIdx(['TB']);
      const idxLp = getColIdx(['LP']);
      const idxTdSistol = getColIdx(['TD SISTOLIK', 'SISTOL']);
      const idxTdDiastol = getColIdx(['TD DIASTOLIK', 'DIASTOL']);
      const idxGula = getColIdx(['GULA']);
      const idxHb = getColIdx(['HB']);
      const idxTelinga = getColIdx(['TELINGA', 'SERUMEN']);
      const idxGigi = getColIdx(['GIGI', 'KARIES']);
      const idxMata = getColIdx(['MATA', 'PENGLIHATAN']);
      const idxKuku = getColIdx(['KUKU']);
      const idxKebugaran = getColIdx(['KEBUGARAN', 'BUGAR']);
      const idxMenstruasi = getColIdx(['MENSTRUASI', 'HAID']);
      const idxMerokok = getColIdx(['MEROKOK', 'ROKOK']);
      const idxJenisRokok = getColIdx(['JENIS ROKOK']);
      const idxIntensitasMerokok = getColIdx(['INTENSITAS MEROKOK', 'INTENSITAS ROKOK']);
      const idxJumlahBatang = getColIdx(['JUMLAH BATANG', 'BATANG']);
      const idxTahun = getColIdx(['TAHUN SKRINING', 'TAHUN']);
      const idxStatusKesehatan = getColIdx(['STATUS KESEHATAN', 'KESIMPULAN', 'STATUS']);
      const idxCatatanRujukan = getColIdx(['CATATAN RUJUKAN', 'RUJUKAN', 'TINDAK LANJUT']);

      const parsedItems = [];
      let skippedInvalidNik = 0;
      const sampleInvalidNik = [];
      const currentUserName = sessionStorage.getItem('ckg_user_name') || 'Admin';

      for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length === 0) continue;

        const namaVal = idxNama >= 0 ? String(row[idxNama] || '').trim().toUpperCase() : '';
        if (!namaVal) continue;

        const rawNik = idxNik >= 0 ? String(row[idxNik] || '').trim() : '';
        const cleanNik = extractCleanNik16(rawNik);

        // FILTER NIK WAJIB 16 DIGIT: Kurang atau lebih dari 16 digit DITOLAK / TIDAK BISA MASUK
        if (cleanNik.length !== 16) {
          skippedInvalidNik++;
          if (sampleInvalidNik.length < 5) {
            sampleInvalidNik.push({ nama: namaVal, nik: rawNik || '(kosong)', len: cleanNik.length });
          }
          continue;
        }

        const noVal = idxNo >= 0 ? parseInt(row[idxNo], 10) || i : i;
        const sekolahVal = idxSekolah >= 0 ? String(row[idxSekolah] || '').trim().toUpperCase() : '';
        const kelasVal = idxKelas >= 0 ? String(row[idxKelas] || '').trim().toUpperCase() : '';
        const jkVal = idxJk >= 0 ? (String(row[idxJk] || '').toUpperCase().includes('P') ? 'P' : 'L') : 'L';
        const nikVal = cleanNik;
        const tglLahirVal = idxTglLahir >= 0 ? formatDateToYYYYMMDD(row[idxTglLahir]) : '';
        const waVal = idxWa >= 0 ? String(row[idxWa] || '').trim() : '';
        const alamatVal = idxAlamat >= 0 ? String(row[idxAlamat] || '').trim().toUpperCase() : '';
        const bbVal = idxBb >= 0 ? parseFloat(row[idxBb]) || 0 : 0;
        const tbVal = idxTb >= 0 ? parseFloat(row[idxTb]) || 0 : 0;
        const lpVal = idxLp >= 0 ? parseFloat(row[idxLp]) || 0 : 0;
        const tdSistolVal = idxTdSistol >= 0 ? parseInt(row[idxTdSistol], 10) || 0 : 0;
        const tdDiastolVal = idxTdDiastol >= 0 ? parseInt(row[idxTdDiastol], 10) || 0 : 0;
        const gulaVal = idxGula >= 0 ? String(row[idxGula] || '-').trim() : '-';
        const hbVal = idxHb >= 0 ? String(row[idxHb] || '-').trim() : '-';
        const hasTelingaCell = idxTelinga >= 0 && row[idxTelinga] !== undefined && String(row[idxTelinga]).trim() !== '' && String(row[idxTelinga]).trim() !== '-';
        const hasGigiCell = idxGigi >= 0 && row[idxGigi] !== undefined && String(row[idxGigi]).trim() !== '' && String(row[idxGigi]).trim() !== '-';
        const hasMataCell = idxMata >= 0 && row[idxMata] !== undefined && String(row[idxMata]).trim() !== '' && String(row[idxMata]).trim() !== '-';
        const hasOrganInExcel = hasTelingaCell || hasGigiCell || hasMataCell;

        const telingaVal = hasTelingaCell ? String(row[idxTelinga]).trim() : '-';
        const gigiVal = hasGigiCell ? String(row[idxGigi]).trim() : '-';
        const mataVal = hasMataCell ? String(row[idxMata]).trim() : '-';
        const kukuVal = (idxKuku >= 0 && row[idxKuku]) ? String(row[idxKuku]).trim() : '-';
        const kebugaranVal = (idxKebugaran >= 0 && row[idxKebugaran]) ? String(row[idxKebugaran]).trim() : '-';
        const menstruasiVal = (idxMenstruasi >= 0 && row[idxMenstruasi]) ? String(row[idxMenstruasi]).trim() : '-';
        const merokokVal = (idxMerokok >= 0 && row[idxMerokok]) ? String(row[idxMerokok]).trim() : (jkVal === 'L' ? 'Tidak' : '-');
        const jenisRokokVal = (idxJenisRokok >= 0 && row[idxJenisRokok]) ? String(row[idxJenisRokok]).trim() : '-';
        const intensitasMerokokVal = (idxIntensitasMerokok >= 0 && row[idxIntensitasMerokok]) ? String(row[idxIntensitasMerokok]).trim() : '-';
        const jumlahBatangVal = (idxJumlahBatang >= 0 && row[idxJumlahBatang]) ? String(row[idxJumlahBatang]).trim() : '-';
        const tahunVal = (idxTahun >= 0 && row[idxTahun]) ? String(row[idxTahun]).trim() : (document.getElementById('filterSelectTahun')?.value !== 'all' ? (document.getElementById('filterSelectTahun')?.value || '2026') : '2026');
        const statusKesehatanVal = idxStatusKesehatan >= 0 ? String(row[idxStatusKesehatan] || 'Sehat').trim() : 'Sehat';
        const catatanRujukanVal = idxCatatanRujukan >= 0 ? String(row[idxCatatanRujukan] || '-').trim() : '-';

        let imtVal = 0;
        let statusImtVal = 'Normal';
        if (bbVal > 0 && tbVal > 0) {
          const tbM = tbVal / 100;
          imtVal = parseFloat((bbVal / (tbM * tbM)).toFixed(2));
          if (imtVal < 17.0) statusImtVal = 'Sangat Kurus';
          else if (imtVal < 18.5) statusImtVal = 'Kurus';
          else if (imtVal <= 25.0) statusImtVal = 'Normal';
          else if (imtVal <= 27.0) statusImtVal = 'Gemuk';
          else statusImtVal = 'Obesitas';
        }

        const antroDoneVal = (bbVal > 0 && tbVal > 0) ? 1 : 0;
        const vitalDoneVal = (tdSistolVal > 0) ? 1 : 0;
        const labDoneVal = ((hbVal && hbVal !== '-') || (gulaVal && gulaVal !== '-')) ? 1 : 0;
        const organDoneVal = hasOrganInExcel ? 1 : 0;
        const kesimpulanDoneVal = (statusKesehatanVal && statusKesehatanVal !== 'Sehat' && statusKesehatanVal !== '-') || (catatanRujukanVal && catatanRujukanVal !== '-') ? 1 : 0;
        const isExamined = (antroDoneVal || vitalDoneVal || labDoneVal || organDoneVal || kesimpulanDoneVal) ? 1 : 0;

        parsedItems.push({
          id: `SCH-${Date.now()}-${i}`,
          no: noVal,
          nama: namaVal,
          kelas: kelasVal,
          sekolah: sekolahVal,
          jk: jkVal,
          nik: nikVal,
          tanggal_lahir: tglLahirVal,
          no_whatsapp: waVal,
          provinsi: 'Jawa Barat',
          kab_kota: 'Kab. Bandung',
          kecamatan: 'Banjaran',
          kelurahan: 'Tarajusari',
          alamat: alamatVal,
          bb: bbVal,
          tb: tbVal,
          lp: lpVal,
          imt: imtVal,
          status_imt: statusImtVal,
          td_sistolik: tdSistolVal,
          td_diastolik: tdDiastolVal,
          gula_darah: gulaVal,
          hb: hbVal,
          telinga: telingaVal,
          gigi: gigiVal,
          mata: mataVal,
          kuku: kukuVal,
          kebugaran: kebugaranVal,
          menstruasi: menstruasiVal,
          merokok: merokokVal,
          jenis_rokok: jenisRokokVal,
          intensitas_merokok: intensitasMerokokVal,
          jumlah_batang: jumlahBatangVal,
          status_kesehatan: statusKesehatanVal,
          catatan_rujukan: catatanRujukanVal,
          is_examined: isExamined,
          antro_done: antroDoneVal,
          vital_done: vitalDoneVal,
          lab_done: labDoneVal,
          organ_done: organDoneVal,
          kesimpulan_done: kesimpulanDoneVal,
          identitas_done: 1,
          petugas_entry: currentUserName,
          tanggal_entry: new Date().toISOString().substring(0, 10),
          tahun_skrining: tahunVal
        });
      }

      pendingSekolahImportData = parsedItems;
      document.getElementById('sekolahImportDropzoneText').textContent = `File Terpilih: ${file.name} (${parsedItems.length} Siswa Terdeteksi)`;

      // --- Anti-Duplikat: Cek NIK duplikat terhadap data yang sudah ada di database ---
      // PENTING: NIK kosong / tidak valid TIDAK dianggap duplikat data!
      const existingNikSet = new Set();
      sekolahRecords.forEach(r => {
        if (isNikValidForDuplicate(r.nik)) existingNikSet.add(String(r.nik).trim());
      });

      const duplicateItems = parsedItems.filter(item => isNikValidForDuplicate(item.nik) && existingNikSet.has(String(item.nik).trim()));
      const newItems = parsedItems.filter(item => !isNikValidForDuplicate(item.nik) || !existingNikSet.has(String(item.nik).trim()));

      // Cek duplikat di dalam file Excel itu sendiri (hanya NIK valid)
      const fileNikMap = {};
      parsedItems.forEach(item => {
        if (isNikValidForDuplicate(item.nik)) {
          const nik = String(item.nik).trim();
          if (!fileNikMap[nik]) fileNikMap[nik] = [];
          fileNikMap[nik].push(item);
        }
      });
      const internalDuplicateNiks = Object.keys(fileNikMap).filter(k => fileNikMap[k].length > 1);

      const previewArea = document.getElementById('sekolahImportPreviewArea');
      previewArea.style.display = 'block';

      if (duplicateItems.length === 0 && internalDuplicateNiks.length === 0) {
        // No duplicates found - simple green message
        previewArea.innerHTML = `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; color: #166534; font-size: 13px; font-weight: 700;">
            <i class="bi bi-check-circle-fill" style="color: #22c55e;"></i> Berhasil membaca ${parsedItems.length} data siswa dari file Excel.
            <span style="display: block; font-size: 11px; font-weight: 600; color: #15803d; margin-top: 4px;">✅ Tidak ada data duplikat ditemukan. Aman untuk diimport langsung.</span>
          </div>
        `;
        pendingSekolahImportSkipDuplicates = false;
        pendingSekolahImportNewOnly = parsedItems;
      } else {
        // Duplicates found - show warning
        const dupList = duplicateItems.slice(0, 8).map(d => {
          const existInDb = sekolahRecords.find(r => isNikValidForDuplicate(r.nik) && String(r.nik).trim() === String(d.nik).trim());
          return `<li style="margin-bottom: 4px;"><strong>${escapeHtml(d.nama)}</strong> (NIK: ${escapeHtml(d.nik)})${existInDb ? ' - sudah ada: <em>' + escapeHtml(existInDb.nama) + '</em> (' + escapeHtml(existInDb.sekolah || '') + ')' : ''}</li>`;
        }).join('');

        let internalDupHtml = '';
        if (internalDuplicateNiks.length > 0) {
          internalDupHtml = `
            <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 12px; margin-top: 8px; font-size: 11.5px; color: #854d0e;">
              <i class="bi bi-exclamation-triangle-fill"></i> <strong>${internalDuplicateNiks.length} NIK duplikat</strong> ditemukan <em>di dalam file Excel itu sendiri</em>.
            </div>
          `;
        }

        previewArea.innerHTML = `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; color: #166534; font-size: 13px; font-weight: 700; margin-bottom: 10px;">
            <i class="bi bi-check-circle-fill" style="color: #22c55e;"></i> Berhasil membaca ${parsedItems.length} data siswa dari file Excel.
          </div>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px; color: #991b1b; font-size: 12.5px;">
            <div style="font-weight: 800; font-size: 13px; margin-bottom: 6px;">
              <i class="bi bi-exclamation-diamond-fill" style="color: #dc2626;"></i> ${duplicateItems.length} Data Duplikat NIK Ditemukan!
            </div>
            <ul style="margin: 0; padding-left: 18px; line-height: 1.6;">${dupList}</ul>
            ${duplicateItems.length > 8 ? '<div style="font-size: 11px; color: #b91c1c; margin-top: 4px;">...dan ' + (duplicateItems.length - 8) + ' lainnya</div>' : ''}
            ${internalDupHtml}
            <div style="font-size: 11.5px; color: #64748b; margin: 8px 0 10px 0;">
              *Siswa dengan NIK kosong tetap dianggap data baru dan aman diimport.
            </div>
            <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" onclick="setImportDupMode(true)" id="btnImportSkipDup" class="btn btn-sm" style="background: #059669; color: #fff; border: none; border-radius: 8px; padding: 8px 14px; font-weight: 700; font-size: 12px; cursor: pointer; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.4); transform: scale(1.02);">
                <i class="bi bi-funnel-fill"></i> Import Hanya Data Baru (${newItems.length} siswa)
              </button>
              <button type="button" onclick="setImportDupMode(false)" id="btnImportAllDup" class="btn btn-sm" style="background: #d97706; color: #fff; border: none; border-radius: 8px; padding: 8px 14px; font-weight: 700; font-size: 12px; cursor: pointer;">
                <i class="bi bi-arrow-repeat"></i> Import Semua (${parsedItems.length} siswa)
              </button>
            </div>
          </div>
        `;
        // Default to skip duplicates
        pendingSekolahImportSkipDuplicates = true;
        pendingSekolahImportNewOnly = newItems;
      }
      document.getElementById('btnExecuteSekolahImport').disabled = false;

    } catch (err) {
      console.error('Error parsing Excel CKG Sekolah:', err);
      showToast('Gagal memproses file Excel. Format file mungkin tidak sesuai.', 'danger');
    }
  };
  reader.readAsArrayBuffer(file);
}

async function executeSekolahXLSXImport() {
  if (!pendingSekolahImportData || pendingSekolahImportData.length === 0) return;

  const itemsToUpload = (pendingSekolahImportSkipDuplicates && pendingSekolahImportNewOnly)
    ? pendingSekolahImportNewOnly
    : pendingSekolahImportData;

  const total = itemsToUpload.length;
  if (total === 0) {
    showToast('Tidak ada data baru untuk diimport (seluruh data duplikat dilewati).', 'warning');
    return;
  }

  Swal.fire({
    title: 'Mengunggah ke Cloud Database...',
    html: `Sedang mengunggah <strong>${total}</strong> data siswa langsung ke server Cloudflare D1...`,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    // Send in chunks of 50 to prevent large payload timeouts
    const chunkSize = 50;
    for (let i = 0; i < total; i += chunkSize) {
      const chunk = itemsToUpload.slice(i, i + chunkSize);
      await fetch('/api/sekolah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk)
      });
    }

    await fetchSekolahRecordsFromCloud();
    closeImportSekolahModal();

    let skippedNotice = '';
    const skippedNik = window.__lastSekolahImportSkippedNik || 0;
    if (skippedNik > 0) {
      skippedNotice = `<div style="margin-top:10px; font-size:12.5px; color:#92400e; background:#fffbeb; padding:8px 12px; border-radius:8px; border:1px solid #fde68a; text-align:left;">
        ⚠️ <strong>${skippedNik} data siswa dilewati / ditolak</strong> karena NIK tidak persis 16 digit.
      </div>`;
    }

    Swal.fire({
      icon: 'success',
      title: 'Import ke Cloud Berhasil!',
      html: `Sebanyak <strong>${total}</strong> data siswa berhasil diunggah langsung ke Cloud Database.${skippedNotice}`,
      confirmButtonColor: '#059669'
    });
  } catch (err) {
    console.error('Import error:', err);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Mengunggah',
      text: err.message || 'Terjadi kesalahan saat mengunggah ke Cloud Database.',
      confirmButtonColor: '#dc2626'
    });
  }
}

// ==========================================================================
// 📋 OUTPUT LAPORAN HASIL PEMERIKSAAN SEKOLAH BESERTA KETERANGANNYA
// ==========================================================================

/**
 * Otomatis mendiagnosa dan merumuskan keterangan & rekomendasi tindak lanjut
 * berdasarkan data hasil pemeriksaan tiap pos CKG Sekolah.
 */
function generateKeteranganSiswa(r) {
  const findings = [];
  const actions = [];

  // 1. Antropometri & Status Gizi
  if (r.bb && r.tb) {
    const tbM = r.tb / 100;
    if (tbM > 0) {
      const imt = r.bb / (tbM * tbM);
      if (imt < 17.0) {
        findings.push(`Gizi Buruk / Sangat Kurus (IMT: ${imt.toFixed(1)})`);
        actions.push('Konseling gizi seimbang, PMT (Pemberian Makanan Tambahan) & evaluasi berkala');
      } else if (imt < 18.5) {
        findings.push(`Kurus / Kurang Gizi (IMT: ${imt.toFixed(1)})`);
        actions.push('Edukasi gizi seimbang & pola makan tinggi protein');
      } else if (imt > 27.0) {
        findings.push(`Obesitas (IMT: ${imt.toFixed(1)})`);
        actions.push('Konseling gizi klinis, batasi gula/lemak & rutin olahraga');
      } else if (imt > 25.0) {
        findings.push(`Gemuk / Overweight (IMT: ${imt.toFixed(1)})`);
        actions.push('Edukasi pola hidup sehat & aktivitas fisik teratur min. 30 menit/hari');
      }
    }
  }

  // 2. Tanda Vital (Tekanan Darah)
  if (r.td_sistolik && r.td_diastolik) {
    const s = Number(r.td_sistolik);
    const d = Number(r.td_diastolik);
    if (s >= 140 || d >= 90) {
      findings.push(`Hipertensi (${s}/${d} mmHg)`);
      actions.push('Rujukan ke Poli Umum Puskesmas untuk pemeriksaan & tatalaksana tensi');
    } else if (s >= 130 || d >= 85) {
      findings.push(`Prehipertensi (${s}/${d} mmHg)`);
      actions.push('Kurangi konsumsi garam/asin, hindari begadang & pantau tensi berkala');
    }
  }

  // 3. Laboratorium
  if (r.hb && r.hb !== '-' && !String(r.hb).toLowerCase().includes('tidak')) {
    const hbNum = parseFloat(r.hb);
    if (!isNaN(hbNum) && hbNum > 0) {
      if (hbNum < 12.0) {
        findings.push(`Anemia (Kadar Hb: ${hbNum} g/dL)`);
        actions.push('Pemberian Tablet Tambah Darah (TTD) & perbanyak sayur hijau/daging');
      }
    }
  }
  if (r.gula_darah && r.gula_darah !== '-' && !String(r.gula_darah).toLowerCase().includes('tidak')) {
    const gdsNum = parseFloat(r.gula_darah);
    if (!isNaN(gdsNum) && gdsNum >= 140) {
      findings.push(`Gula Darah Tinggi (GDS: ${gdsNum} mg/dL)`);
      actions.push('Rujukan pemeriksaan konfirmasi GDP/G2PP ke Puskesmas');
    }
  }

  // 4. Organ Indera
  // Gigi & Mulut
  if (r.gigi && r.gigi !== '-' && r.gigi !== 'Tidak ada' && r.gigi !== '0') {
    const gigiStr = String(r.gigi).toLowerCase().includes('karies') ? r.gigi : `Karies Gigi (${r.gigi})`;
    findings.push(gigiStr);
    actions.push('Rujukan ke Poli Gigi Puskesmas untuk penambalan/perawatan');
  }
  // Mata / Penglihatan
  if (r.mata && r.mata !== '-' && String(r.mata).toLowerCase() !== 'normal') {
    findings.push(`Gangguan Penglihatan (${r.mata})`);
    actions.push('Pemeriksaan visus/refraksi mata lanjutan di Puskesmas / Optik');
  }
  // Telinga
  if (r.telinga && r.telinga !== '-' && String(r.telinga).toLowerCase().includes('ada') && !String(r.telinga).toLowerCase().includes('tidak')) {
    findings.push(`Serumen Telinga (${r.telinga})`);
    actions.push('Pembersihan/ekstraksi serumen di Poli Puskesmas');
  }
  // Kebersihan Kuku
  if (r.kuku && (String(r.kuku).toLowerCase().includes('panjang') || String(r.kuku).toLowerCase().includes('kotor'))) {
    findings.push('Kebersihan Kuku Kurang');
    actions.push('Edukasi memotong kuku berkala & Cuci Tangan Pakai Sabun (CTPS)');
  }
  // Kebugaran Jasmani
  if (r.kebugaran && String(r.kebugaran).toLowerCase().includes('kurang')) {
    findings.push('Kebugaran Jasmani Kurang');
    actions.push('Tingkatkan aktivitas gerak jasmani di sekolah dan di rumah');
  }

  // 5. Skrining Merokok (Khusus Laki-laki)
  if (r.jk === 'L' && r.merokok) {
    if (r.merokok === 'Aktif') {
      if (r.jenis_rokok === 'Elektrik') {
        findings.push('Perokok Aktif (Elektrik / Vape)');
        actions.push('Konseling bahaya uap nikotin & Upaya Berhenti Merokok (UBM)');
      } else {
        const detail = [r.intensitas_merokok, r.jumlah_batang ? `${r.jumlah_batang} btg/hari` : ''].filter(Boolean).join(', ');
        findings.push(`Perokok Aktif Konvensional (${detail || 'Aktif'})`);
        actions.push('Konseling & intervensi Upaya Berhenti Merokok (UBM) di Puskesmas');
      }
    } else if (r.merokok === 'Pasif') {
      findings.push('Perokok Pasif (Terpapar Asap Rokok di Lingkungan)');
      actions.push('Edukasi menciptakan lingkungan rumah bebas asap rokok');
    }
  }

  // 6. Catatan Manual Petugas / Rujukan Tambahan
  if (r.catatan_rujukan && r.catatan_rujukan !== '-' && String(r.catatan_rujukan).trim() !== '') {
    actions.push(`Catatan Khusus: ${r.catatan_rujukan.trim()}`);
  }

  // Tentukan Status Kesimpulan
  let statusSummary = r.status_kesehatan || 'Sehat';
  if (findings.length === 0) {
    return {
      status: 'Sehat',
      statusClass: 'status-sehat',
      diagnosaText: 'Tidak ditemukan kelainan bermakna (Kondisi Fisik Sehat).',
      tindakLanjutText: 'Pertahankan Pola Hidup Bersih & Sehat (PHBS) serta konsumsi makanan bergizi seimbang.'
    };
  } else {
    const isRujukan = statusSummary === 'Perlu Rujukan' || actions.some(a => a.toLowerCase().includes('rujukan'));
    const finalStatus = isRujukan ? 'Perlu Rujukan' : (statusSummary === 'Perlu Perhatian' ? 'Perlu Perhatian' : 'Perlu Rujukan');
    return {
      status: finalStatus,
      statusClass: finalStatus === 'Perlu Rujukan' ? 'status-rujukan' : 'status-perhatian',
      diagnosaText: findings.join('; '),
      tindakLanjutText: actions.join('; ')
    };
  }
}

/**
 * Membuka Modal Laporan Hasil Pemeriksaan Sekolah (Kolektif)
 */
function openLaporanSekolahModal() {
  const modal = document.getElementById('modalLaporanSekolah');
  if (!modal) return;

  const selectSekolah = document.getElementById('modalLaporanSelectSekolah');
  const currentMainSekolah = (document.getElementById('filterSelectSekolah')?.value || '').trim();

  // Populate Daftar Sekolah
  if (selectSekolah) {
    const masterSet = new Set(MASTER_SARANA_SEKOLAH.map(s => s.nama.toUpperCase()));
    const allSchools = [...MASTER_SARANA_SEKOLAH.map(s => s.nama)];
    sekolahRecords.forEach(r => {
      if (r.sekolah && r.sekolah.trim()) {
        const up = r.sekolah.trim().toUpperCase();
        if (!masterSet.has(up)) {
          masterSet.add(up);
          allSchools.push(r.sekolah.trim());
        }
      }
    });

    let html = '';
    allSchools.sort().forEach(s => {
      html += `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`;
    });
    selectSekolah.innerHTML = html;

    const portalType = (sessionStorage.getItem('ckg_portal_type') || '').toLowerCase();
    const schoolAccountName = (sessionStorage.getItem('ckg_user_name') || '').trim();

    if (portalType === 'sekolah' && schoolAccountName) {
      selectSekolah.value = schoolAccountName;
      selectSekolah.disabled = true;
      selectSekolah.style.backgroundColor = '#f1f5f9';
      selectSekolah.style.cursor = 'not-allowed';
    } else {
      selectSekolah.disabled = false;
      selectSekolah.style.backgroundColor = '';
      selectSekolah.style.cursor = '';
      if (currentMainSekolah && allSchools.some(s => s.toUpperCase() === currentMainSekolah.toUpperCase())) {
        selectSekolah.value = currentMainSekolah;
      }
    }
  }

  // Sync filter tahun
  const selectTahun = document.getElementById('modalLaporanSelectTahun');
  const mainTahun = document.getElementById('filterSelectTahun')?.value || '2026';
  if (selectTahun) {
    const yearsSet = new Set(['2026', '2027', '2025']);
    sekolahRecords.forEach(r => {
      if (r.tahun_skrining) yearsSet.add(String(r.tahun_skrining).trim());
    });
    let thHtml = '';
    Array.from(yearsSet).sort((a, b) => b.localeCompare(a)).forEach(y => {
      thHtml += `<option value="${escapeHtml(y)}">${escapeHtml(y)}</option>`;
    });
    thHtml += `<option value="all">Semua Tahun</option>`;
    selectTahun.innerHTML = thHtml;
    selectTahun.value = mainTahun;
  }

  onModalLaporanSekolahChange();

  modal.style.display = 'flex';
  modal.classList.add('open');
}

function closeLaporanSekolahModal() {
  const modal = document.getElementById('modalLaporanSekolah');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('open');
  }
}

function onModalLaporanSekolahChange() {
  const selectSekolah = document.getElementById('modalLaporanSelectSekolah');
  const selectKelas = document.getElementById('modalLaporanSelectKelas');
  if (!selectSekolah || !selectKelas) return;

  const chosenSchool = selectSekolah.value.trim().toUpperCase();
  const currentKelasFilter = (document.getElementById('filterSelectKelas')?.value || '').trim().toUpperCase();

  // Ambil kelas unik pada sekolah tersebut
  const classesSet = new Set();
  sekolahRecords.forEach(r => {
    if ((r.sekolah || '').trim().toUpperCase() === chosenSchool && r.kelas) {
      classesSet.add(r.kelas.trim());
    }
  });

  const sortedClasses = Array.from(classesSet).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB || a.localeCompare(b);
  });

  let html = '<option value="">Semua Kelas</option>';
  sortedClasses.forEach(k => {
    html += `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`;
  });
  selectKelas.innerHTML = html;

  if (currentKelasFilter && sortedClasses.some(k => k.toUpperCase() === currentKelasFilter)) {
    selectKelas.value = currentKelasFilter;
  }

  updateLaporanSekolahContent();
}

function updateLaporanSekolahContent() {
  const chosenSekolah = (document.getElementById('modalLaporanSelectSekolah')?.value || '').trim().toUpperCase();
  const chosenKelas = (document.getElementById('modalLaporanSelectKelas')?.value || '').trim().toUpperCase();
  const chosenTahun = (document.getElementById('modalLaporanSelectTahun')?.value || '2026').trim();
  const filterStatus = (document.getElementById('modalLaporanFilterStatus')?.value || 'all').trim();

  let dataset = sekolahRecords.filter(r => (r.sekolah || '').toUpperCase() === chosenSekolah);

  if (chosenKelas) {
    dataset = dataset.filter(r => (r.kelas || '').toUpperCase() === chosenKelas);
  }

  if (chosenTahun && chosenTahun !== 'all') {
    dataset = dataset.filter(r => {
      const recYear = String(r.tahun_skrining || (r.tanggal_entry ? r.tanggal_entry.substring(0, 4) : '2026')).trim();
      if (recYear === chosenTahun) return true;
      if (Array.isArray(r.riwayat_pemeriksaan) && r.riwayat_pemeriksaan.length > 0) {
        return r.riwayat_pemeriksaan.some(h => {
          const hy = String(h.tahun || (h.tanggal_pemeriksaan ? h.tanggal_pemeriksaan.substring(0, 4) : '') || h.tahun_ajaran || '').trim();
          return hy === chosenTahun || hy.includes(chosenTahun);
        });
      }
      return false;
    });
  }

  if (filterStatus === 'masalah') {
    dataset = dataset.filter(r => {
      const ket = generateKeteranganSiswa(r);
      return ket.status !== 'Sehat';
    });
  } else if (filterStatus === 'sehat') {
    dataset = dataset.filter(r => {
      const ket = generateKeteranganSiswa(r);
      return ket.status === 'Sehat';
    });
  } else if (filterStatus === 'sudah') {
    dataset = dataset.filter(r => isSekolahRecordExamined(r));
  }

  const totalLbl = document.getElementById('modalLaporanTotalLabel');
  if (totalLbl) totalLbl.textContent = `${dataset.length} Siswa`;

  renderPrintableLaporanSekolah(dataset, chosenSekolah, chosenKelas, chosenTahun);
}

/**
 * Merender Dokumen Cetak Laporan Resmi Kolektif Sekolah
 */
function renderPrintableLaporanSekolah(dataset, schoolName, kelasName, tahunVal) {
  const container = document.getElementById('printLaporanSekolahContainer');
  if (!container) return;

  const totalSiswa = dataset.length;
  let sehatCount = 0;
  let perhatianCount = 0;
  let rujukanCount = 0;

  // Breakdown temuan
  let kurusCount = 0;
  let obesitasCount = 0;
  let hipertensiCount = 0;
  let anemiaCount = 0;
  let gdsCount = 0;
  let gigiCount = 0;
  let mataCount = 0;
  let serumenCount = 0;
  let rokokAktifCount = 0;
  let rokokPasifCount = 0;

  const rowsWithKeterangan = dataset.map((r, i) => {
    const ket = generateKeteranganSiswa(r);
    if (ket.status === 'Sehat') sehatCount++;
    else if (ket.status === 'Perlu Perhatian') perhatianCount++;
    else rujukanCount++;

    // Hitung breakdown
    const diag = ket.diagnosaText.toLowerCase();
    if (diag.includes('kurus')) kurusCount++;
    if (diag.includes('obesitas') || diag.includes('gemuk')) obesitasCount++;
    if (diag.includes('hipertensi')) hipertensiCount++;
    if (diag.includes('anemia')) anemiaCount++;
    if (diag.includes('gula darah')) gdsCount++;
    if (diag.includes('karies') || diag.includes('gigi')) gigiCount++;
    if (diag.includes('penglihatan') || diag.includes('mata')) mataCount++;
    if (diag.includes('serumen')) serumenCount++;
    if (diag.includes('perokok aktif')) rokokAktifCount++;
    if (diag.includes('perokok pasif')) rokokPasifCount++;

    return { record: r, index: i + 1, keterangan: ket };
  });

  const displaySchool = schoolName || 'SEMUA SEKOLAH';
  const displayKelas = kelasName ? `Kelas ${kelasName}` : 'Semua Kelas';
  const displayTahun = tahunVal && tahunVal !== 'all' ? tahunVal : 'Semua Tahun';
  const todayFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  let tableRowsHtml = '';
  if (rowsWithKeterangan.length === 0) {
    tableRowsHtml = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: #64748b; font-style: italic;">
          Tidak ada data siswa yang memenuhi filter yang dipilih.
        </td>
      </tr>
    `;
  } else {
    tableRowsHtml = rowsWithKeterangan.map(item => {
      const r = item.record;
      const k = item.keterangan;
      const ageObj = calculateRealtimeAge(r.tanggal_lahir);
      const ageStr = ageObj ? `${ageObj.years} Th` : '-';

      // Antro
      const antroStr = (r.bb && r.tb) ? `${r.bb}kg / ${r.tb}cm<br><span style="font-size: 10px; color: #475569;">IMT: ${r.imt || '-'} (${r.status_imt || 'Normal'})</span>` : '-';

      // TD
      const tdStr = (r.td_sistolik && r.td_diastolik) ? `${r.td_sistolik}/${r.td_diastolik} mmHg` : '-';

      // Lab
      let labStr = '-';
      if ((r.hb && r.hb !== '-') || (r.gula_darah && r.gula_darah !== '-')) {
        const parts = [];
        if (r.hb && r.hb !== '-') parts.push(`Hb: ${r.hb}`);
        if (r.gula_darah && r.gula_darah !== '-') parts.push(`GDS: ${r.gula_darah}`);
        labStr = parts.join('<br>');
      }

      // Organ & Rokok
      const organParts = [];
      if (r.gigi && r.gigi !== '-' && r.gigi !== 'Tidak ada' && r.gigi !== '0') organParts.push(`Gigi: ${r.gigi}`);
      if (r.mata && r.mata !== '-' && String(r.mata).toLowerCase() !== 'normal') organParts.push(`Mata: ${r.mata}`);
      if (r.telinga && r.telinga !== '-' && String(r.telinga).toLowerCase().includes('ada') && !String(r.telinga).toLowerCase().includes('tidak')) organParts.push(`Telinga: ${r.telinga}`);
      if (r.jk === 'L' && r.merokok && r.merokok !== 'Tidak' && r.merokok !== '-') {
        organParts.push(`Rokok: ${r.merokok}${r.jenis_rokok && r.jenis_rokok !== '-' ? ' (' + r.jenis_rokok + ')' : ''}`);
      }
      const organStr = organParts.length > 0 ? organParts.join('<br>') : '<span style="color:#059669;">Normal</span>';

      // Status Badge Style
      let statusColor = '#047857';
      let statusBg = '#ecfdf5';
      if (k.status === 'Perlu Rujukan') {
        statusColor = '#b91c1c';
        statusBg = '#fef2f2';
      } else if (k.status === 'Perlu Perhatian') {
        statusColor = '#b45309';
        statusBg = '#fffbeb';
      }

      return `
        <tr>
          <td style="text-align: center; font-weight: 700;">${item.index}</td>
          <td>
            <strong>${escapeHtml(r.nama)}</strong><br>
            <span style="font-size: 10px; color: #64748b;">NIK: ${escapeHtml(r.nik || '-')}</span>
          </td>
          <td style="text-align: center;">${r.jk === 'P' ? 'P' : 'L'} / ${ageStr}</td>
          <td style="text-align: center; font-weight: 700;">${escapeHtml(r.kelas || '-')}</td>
          <td>${antroStr}</td>
          <td style="text-align: center;">${tdStr}</td>
          <td style="text-align: center;">${labStr}</td>
          <td>${organStr}</td>
          <td style="text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 10px; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}44;">
              ${escapeHtml(k.status)}
            </span>
          </td>
          <td style="font-size: 10.5px; line-height: 1.4;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 3px;">
              ${escapeHtml(k.diagnosaText)}
            </div>
            <div style="color: #0369a1; font-style: italic;">
              <strong>Rekomendasi / Tindak Lanjut:</strong> ${escapeHtml(k.tindakLanjutText)}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  container.innerHTML = `
    <!-- KOP RESMI PUSKESMAS -->
    <div class="report-kop-header">
      <div class="report-kop-instansi">PEMERINTAH KABUPATEN BANDUNG</div>
      <div class="report-kop-dinas">DINAS KESEHATAN</div>
      <div class="report-kop-puskesmas">UPTD PUSKESMAS BANJARAN KOTA</div>
      <div class="report-kop-alamat">Jl. Raya Banjaran No. 58, Kec. Banjaran, Kabupaten Bandung, Jawa Barat 40377 • Telp. (022) 5940822 • Email: pkmbanjarankota@gmail.com</div>
    </div>

    <!-- JUDUL LAPORAN -->
    <div class="report-title-box">
      <h2 class="report-main-title">LAPORAN HASIL PENJARINGAN KESEHATAN & SKRINING CKG SISWA SEKOLAH</h2>
      <div class="report-sub-title">Program Usaha Kesehatan Sekolah (UKS) & Cek Kesehatan Gratis (CKG) Remaja</div>
    </div>

    <!-- METADATA SEKOLAH -->
    <div class="report-meta-grid">
      <div class="report-meta-item">
        <span class="report-meta-label">Nama Sekolah:</span>
        <span class="report-meta-val">${escapeHtml(displaySchool)}</span>
      </div>
      <div class="report-meta-item">
        <span class="report-meta-label">Tingkat Kelas:</span>
        <span class="report-meta-val">${escapeHtml(displayKelas)}</span>
      </div>
      <div class="report-meta-item">
        <span class="report-meta-label">Tahun Skrining:</span>
        <span class="report-meta-val">Tahun ${escapeHtml(displayTahun)}</span>
      </div>
      <div class="report-meta-item">
        <span class="report-meta-label">Tanggal Pelaksanaan:</span>
        <span class="report-meta-val">${todayFormatted}</span>
      </div>
      <div class="report-meta-item">
        <span class="report-meta-label">Wilayah Kerja:</span>
        <span class="report-meta-val">UPTD Puskesmas Banjaran Kota</span>
      </div>
      <div class="report-meta-item">
        <span class="report-meta-label">Total Sasaran:</span>
        <span class="report-meta-val">${totalSiswa} Siswa Terdata</span>
      </div>
    </div>

    <!-- RINGKASAN EKSEKUTIF STATISTIK TEMUAN -->
    <div style="margin-bottom: 16px;">
      <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px; text-transform: uppercase;">
        <i class="bi bi-bar-chart-fill" style="color: #0284c7;"></i> Ringkasan Rekapitulasi Temuan Kesehatan
      </div>

      <div class="report-summary-cards">
        <div class="report-summary-card card-total">
          <div class="report-card-num">${totalSiswa}</div>
          <div class="report-card-lbl">Total Siswa</div>
        </div>
        <div class="report-summary-card card-sehat">
          <div class="report-card-num">${sehatCount}</div>
          <div class="report-card-lbl">Kondisi Sehat</div>
        </div>
        <div class="report-summary-card card-perhatian">
          <div class="report-card-num">${perhatianCount}</div>
          <div class="report-card-lbl">Perlu Perhatian</div>
        </div>
        <div class="report-summary-card card-rujukan">
          <div class="report-card-num">${rujukanCount}</div>
          <div class="report-card-lbl">Perlu Rujukan</div>
        </div>
      </div>

      <!-- Detail Masalah Grid -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 11.5px; line-height: 1.6;">
        <div style="font-weight: 700; color: #334155; margin-bottom: 4px;">Detail Identifikasi Masalah Kesehatan Terbanyak:</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 6px;">
          <div>🦷 Karies Gigi / Gigi Berlubang: <strong>${gigiCount} siswa</strong></div>
          <div>👓 Gangguan Penglihatan (Mata Minus): <strong>${mataCount} siswa</strong></div>
          <div>👂 Serumen Telinga: <strong>${serumenCount} siswa</strong></div>
          <div>🥣 Masalah Gizi: Kurus <strong>${kurusCount}</strong>, Gemuk/Obes <strong>${obesitasCount}</strong></div>
          <div>🩸 Anemia (Hb Rendah): <strong>${anemiaCount} siswa</strong></div>
          <div>💓 Hipertensi / Prehipertensi: <strong>${hipertensiCount} siswa</strong></div>
          <div>🚭 Skrining Rokok (Laki-laki): Aktif <strong>${rokokAktifCount}</strong>, Pasif <strong>${rokokPasifCount}</strong></div>
        </div>
      </div>
    </div>

    <!-- TABEL HASIL PEMERIKSAAN & KETERANGAN TINDAK LANJUT -->
    <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px; text-transform: uppercase;">
      <i class="bi bi-table" style="color: #0284c7;"></i> Data Rinci Siswa Beserta Hasil Pemeriksaan & Keterangan Rujukan
    </div>

    <table class="table-laporan-sekolah">
      <thead>
        <tr>
          <th style="width: 30px;">No</th>
          <th style="width: 150px;">Nama Siswa & NIK</th>
          <th style="width: 70px;">JK/Usia</th>
          <th style="width: 55px;">Kelas</th>
          <th style="width: 120px;">Antropometri & Gizi</th>
          <th style="width: 85px;">Tekanan Darah</th>
          <th style="width: 80px;">Laboratorium</th>
          <th style="width: 110px;">Organ Indera & Rokok</th>
          <th style="width: 90px;">Kesimpulan</th>
          <th style="min-width: 200px;">Keterangan Diagnosa & Rekomendasi Tindak Lanjut</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>

    <!-- REKOMENDASI PUSKESMAS -->
    <div class="page-break-avoid" style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 11.5px; line-height: 1.6; color: #166534;">
      <div style="font-weight: 800; font-size: 12px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
        <i class="bi bi-shield-check" style="font-size: 16px; color: #15803d;"></i> REKOMENDASI DAN SARAN TINDAK LANJUT MEDIS DARI PUSKESMAS:
      </div>
      <ol style="margin: 0; padding-left: 18px;">
        <li>Bagi siswa yang berstatus <strong>Perlu Rujukan</strong> (Karies gigi, gangguan visus refraksi, anemia, dll), dimohon pihak sekolah/guru UKS menyampaikan kepada orang tua untuk memeriksakan anak ke <strong>UPTD Puskesmas Banjaran Kota</strong> pada jam pelayanan kerja dengan membawa fotokopi KK / BPJS.</li>
        <li>Bagi siswa yang berstatus <strong>Perokok Aktif</strong> (konvensional maupun elektrik/vape), disarankan untuk mengikuti konseling <strong>Klinik Upaya Berhenti Merokok (UBM)</strong> di Puskesmas guna mencegah ketergantungan nikotin jangka panjang.</li>
        <li>Mengoptimalkan peran <strong>Kader Kesehatan Remaja (KKR) / Dokter Kecil</strong> serta pembiasaan <strong>Pola Hidup Bersih dan Sehat (PHBS)</strong>, sarapan pagi gizi seimbang, dan Cuci Tangan Pakai Sabun (CTPS) di lingkungan sekolah.</li>
      </ol>
    </div>

    <!-- TANDA TANGAN PENGESAHAN -->
    <div class="report-ttd-container page-break-avoid">
      <div class="report-ttd-box">
        <div>Mengetahui,</div>
        <div style="font-weight: 700;">Kepala Sekolah / Pembina UKS</div>
        <div style="margin-top: 5px; font-weight: 600; color: #475569;">${escapeHtml(displaySchool)}</div>
        <div style="margin-top: 55px; border-bottom: 1px solid #000; font-weight: 800; padding-bottom: 2px;">
          ( .................................................... )
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">NIP. ...................................................</div>
      </div>

      <div class="report-ttd-box">
        <div>Banjaran, ${todayFormatted}</div>
        <div style="font-weight: 700;">Penanggung Jawab Skrining UKS</div>
        <div style="margin-top: 5px; font-weight: 600; color: #475569;">UPTD Puskesmas Banjaran Kota</div>
        <div style="margin-top: 55px; border-bottom: 1px solid #000; font-weight: 800; padding-bottom: 2px;">
          ( ${escapeHtml(sessionStorage.getItem('ckg_user_name') || 'Tim UKS Puskesmas')} )
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">NIP. ...................................................</div>
      </div>
    </div>
  `;
}

function printLaporanSekolah() {
  window.print();
}

/**
 * Ekspor Laporan Hasil Pemeriksaan Beserta Keterangannya ke Excel (.xlsx)
 */
function exportLaporanSekolahToXLSX() {
  if (typeof XLSX === 'undefined') {
    showToast('Library SheetJS XLSX belum dimuat.', 'danger');
    return;
  }

  const chosenSekolah = (document.getElementById('modalLaporanSelectSekolah')?.value || '').trim().toUpperCase();
  const chosenKelas = (document.getElementById('modalLaporanSelectKelas')?.value || '').trim().toUpperCase();
  const chosenTahun = (document.getElementById('modalLaporanSelectTahun')?.value || '2026').trim();
  const filterStatus = (document.getElementById('modalLaporanFilterStatus')?.value || 'all').trim();

  let dataset = sekolahRecords.filter(r => (r.sekolah || '').toUpperCase() === chosenSekolah);
  if (chosenKelas) dataset = dataset.filter(r => (r.kelas || '').toUpperCase() === chosenKelas);
  if (chosenTahun && chosenTahun !== 'all') {
    dataset = dataset.filter(r => {
      const recYear = String(r.tahun_skrining || (r.tanggal_entry ? r.tanggal_entry.substring(0, 4) : '2026')).trim();
      return recYear === chosenTahun;
    });
  }

  if (filterStatus === 'masalah') {
    dataset = dataset.filter(r => generateKeteranganSiswa(r).status !== 'Sehat');
  } else if (filterStatus === 'sehat') {
    dataset = dataset.filter(r => generateKeteranganSiswa(r).status === 'Sehat');
  }

  if (dataset.length === 0) {
    showToast('Tidak ada data siswa untuk diekspor.', 'warning');
    return;
  }

  const headers = [
    'NO', 'NAMA SISWA', 'NIK', 'JENIS KELAMIN', 'USIA', 'SEKOLAH', 'KELAS', 'TAHUN SKRINING',
    'BB (KG)', 'TB (CM)', 'LP (CM)', 'IMT', 'STATUS GIZI',
    'TD SISTOLIK', 'TD DIASTOLIK', 'GULA DARAH', 'HB',
    'TELINGA', 'GIGI KARIES', 'PEMERIKSAAN MATA', 'KUKU', 'KEBUGARAN', 'MENSTRUASI',
    'STATUS MEROKOK', 'JENIS ROKOK', 'INTENSITAS MEROKOK', 'JUMLAH BATANG',
    'KESIMPULAN STATUS KESEHATAN',
    'HASIL TEMUAN / DIAGNOSA MEDIS',
    'KETERANGAN TINDAK LANJUT / REKOMENDASI RUJUKAN',
    'CATATAN MANUAL PETUGAS', 'TANGGAL PEMERIKSAAN'
  ];

  const rows = dataset.map((r, idx) => {
    const ket = generateKeteranganSiswa(r);
    const ageObj = calculateRealtimeAge(r.tanggal_lahir);
    const ageStr = ageObj ? `${ageObj.years} Tahun` : '';

    return [
      idx + 1,
      r.nama || '',
      r.nik || '',
      r.jk === 'P' ? 'Perempuan' : 'Laki-laki',
      ageStr,
      r.sekolah || '',
      r.kelas || '',
      r.tahun_skrining || '2026',
      r.bb || '',
      r.tb || '',
      r.lp || '',
      r.imt || '',
      r.status_imt || 'Normal',
      r.td_sistolik || '',
      r.td_diastolik || '',
      r.gula_darah || '-',
      r.hb || '-',
      r.telinga || 'Tidak ada serumen',
      r.gigi || 'Tidak ada',
      r.mata || 'Normal',
      r.kuku || 'Pendek Bersih',
      r.kebugaran || 'Baik',
      r.jk === 'P' ? (r.menstruasi || 'Belum') : '-',
      r.jk === 'L' ? (r.merokok || 'Tidak') : '-',
      (r.jk === 'L' && r.merokok === 'Aktif') ? (r.jenis_rokok || '-') : '-',
      (r.jk === 'L' && r.merokok === 'Aktif' && r.jenis_rokok === 'Konvensional') ? (r.intensitas_merokok || '-') : '-',
      (r.jk === 'L' && r.merokok === 'Aktif' && r.jenis_rokok === 'Konvensional') ? (r.jumlah_batang || '-') : '-',
      ket.status,
      ket.diagnosaText,
      ket.tindakLanjutText,
      r.catatan_rujukan || '-',
      r.tanggal_entry || ''
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'LAPORAN_HASIL_CKG');

  const fileName = `LAPORAN_HASIL_CKG_${chosenSekolah.replace(/\s+/g, '_')}_${chosenKelas ? chosenKelas.replace(/\s+/g, '_') : 'SEMUA_KELAS'}_TAHUN_${chosenTahun}_${new Date().toISOString().substring(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
  showToast(`Berhasil mendownload Excel Laporan Hasil (${dataset.length} Siswa).`, 'success');
}

/**
 * Membuka Modal Lembar Hasil Pemeriksaan Individu Siswa (Rapor Kesehatan)
 */
function cetakHasilSiswaIndividu(siswaId) {
  const siswa = sekolahRecords.find(r => String(r.id) === String(siswaId));
  if (!siswa) {
    showToast('Data siswa tidak ditemukan.', 'warning');
    return;
  }

  const modal = document.getElementById('modalHasilIndividu');
  if (!modal) return;

  renderPrintableHasilIndividu(siswa);

  modal.style.display = 'flex';
  modal.classList.add('open');
}

function closeHasilIndividuModal() {
  const modal = document.getElementById('modalHasilIndividu');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('open');
  }
}

function printHasilIndividu() {
  window.print();
}

/**
 * Merender Lembar Hasil Pemeriksaan Individu (Surat Rujukan / Rapor Kesehatan Siswa)
 */
function renderPrintableHasilIndividu(r) {
  const container = document.getElementById('printHasilIndividuContainer');
  if (!container) return;

  const ket = generateKeteranganSiswa(r);
  const ageObj = calculateRealtimeAge(r.tanggal_lahir);
  const ageStr = ageObj ? `${ageObj.years} Tahun ${ageObj.months ? ageObj.months + ' Bulan' : ''}` : '-';
  const todayFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Antro IMT
  const antroStr = (r.bb && r.tb) ? `${r.bb} kg / ${r.tb} cm (IMT: ${r.imt || '-'})` : '-';
  const giziStr = r.status_imt || 'Normal';

  // TD
  const tdStr = (r.td_sistolik && r.td_diastolik) ? `${r.td_sistolik}/${r.td_diastolik} mmHg` : '-';

  // Status Badge Color
  let statusBadgeColor = '#047857';
  let statusBadgeBg = '#ecfdf5';
  if (ket.status === 'Perlu Rujukan') {
    statusBadgeColor = '#b91c1c';
    statusBadgeBg = '#fef2f2';
  } else if (ket.status === 'Perlu Perhatian') {
    statusBadgeColor = '#b45309';
    statusBadgeBg = '#fffbeb';
  }

  container.innerHTML = `
    <!-- KOP PUSKESMAS -->
    <div class="report-kop-header">
      <div class="report-kop-instansi">PEMERINTAH KABUPATEN BANDUNG</div>
      <div class="report-kop-dinas">DINAS KESEHATAN</div>
      <div class="report-kop-puskesmas">UPTD PUSKESMAS BANJARAN KOTA</div>
      <div class="report-kop-alamat">Jl. Raya Banjaran No. 58, Kec. Banjaran, Kab. Bandung, Jawa Barat 40377 • Telp. (022) 5940822</div>
    </div>

    <!-- JUDUL SURAT -->
    <div style="text-align: center; margin-bottom: 20px;">
      <h3 style="font-size: 15px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">
        LEMBAR HASIL PENJARINGAN KESEHATAN & SKRINING CKG SISWA
      </h3>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
        Nomor Surat: 440 / UKS-CKG / ${(r.sekolah || 'SCH').substring(0, 4).toUpperCase()} / ${r.tahun_skrining || '2026'}
      </div>
    </div>

    <!-- IDENTITAS SISWA -->
    <table style="width: 100%; font-size: 12px; margin-bottom: 16px; border-collapse: collapse;">
      <tr>
        <td style="width: 150px; padding: 4px 0; color: #475569; font-weight: 600;">Nama Lengkap</td>
        <td style="width: 15px; padding: 4px 0;">:</td>
        <td style="padding: 4px 0; font-weight: 800; color: #0f172a; font-size: 13px;">${escapeHtml(r.nama)}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: 600;">Nomor Induk Kependudukan (NIK)</td>
        <td style="padding: 4px 0;">:</td>
        <td style="padding: 4px 0; font-weight: 700;">${escapeHtml(r.nik || '-')}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: 600;">Jenis Kelamin / Usia</td>
        <td style="padding: 4px 0;">:</td>
        <td style="padding: 4px 0;">${r.jk === 'P' ? 'Perempuan' : 'Laki-laki'} (${ageStr})</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: 600;">Sekolah / Kelas</td>
        <td style="padding: 4px 0;">:</td>
        <td style="padding: 4px 0; font-weight: 700;">${escapeHtml(r.sekolah || '-')} &bull; ${escapeHtml(r.kelas || '-')}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: 600;">Tahun Skrining</td>
        <td style="padding: 4px 0;">:</td>
        <td style="padding: 4px 0; font-weight: 700; color: #1e40af;">Tahun ${escapeHtml(r.tahun_skrining || '2026')}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #475569; font-weight: 600;">Alamat Tempat Tinggal</td>
        <td style="padding: 4px 0;">:</td>
        <td style="padding: 4px 0;">${escapeHtml(r.alamat || '-')}</td>
      </tr>
    </table>

    <!-- TABEL HASIL PEMERIKSAAN MEDIS -->
    <div style="font-weight: 800; font-size: 12px; margin-bottom: 6px; text-transform: uppercase; color: #0f172a;">
      <i class="bi bi-heart-pulse-fill" style="color: #0d9488;"></i> Hasil Pemeriksaan Tiap Pos / Stasiun Kesehatan:
    </div>

    <table class="table-laporan-sekolah" style="font-size: 11.5px; margin-bottom: 16px;">
      <thead>
        <tr>
          <th style="width: 40px;">No</th>
          <th style="width: 180px;">Parameter Pemeriksaan</th>
          <th style="width: 200px;">Hasil Pengukuran</th>
          <th>Kategori / Penilaian Klinis</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: center; font-weight: 700;">1</td>
          <td style="font-weight: 700;">Antropometri</td>
          <td>${antroStr}</td>
          <td>Status Gizi: <strong>${escapeHtml(giziStr)}</strong></td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: 700;">2</td>
          <td style="font-weight: 700;">Tekanan Darah (Vital)</td>
          <td>${tdStr}</td>
          <td>${r.td_sistolik ? escapeHtml(getKategoriTekananDarah(r.td_sistolik, r.td_diastolik) || 'Normal') : '-'}</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: 700;">3</td>
          <td style="font-weight: 700;">Laboratorium (Hb / Gula)</td>
          <td>
            ${r.hb && r.hb !== '-' ? `Hb: ${escapeHtml(r.hb)} g/dL<br>` : ''}
            ${r.gula_darah && r.gula_darah !== '-' ? `GDS: ${escapeHtml(r.gula_darah)} mg/dL` : ''}
            ${(!r.hb || r.hb === '-') && (!r.gula_darah || r.gula_darah === '-') ? 'Tidak Diperiksa' : ''}
          </td>
          <td>
            ${(() => {
      const notes = [];
      if (r.hb && r.hb !== '-') {
        const hbKat = getKategoriHb(r.hb, ageObj?.years || 12, r.jk);
        if (hbKat) notes.push(`Hb: ${hbKat}`);
      }
      if (r.gula_darah && r.gula_darah !== '-') {
        const gdsKat = getKategoriGulaDarah(r.gula_darah, ageObj?.years || 12);
        if (gdsKat) notes.push(`GDS: ${gdsKat}`);
      }
      return notes.length > 0 ? notes.join(', ') : 'Dalam Batas Normal';
    })()}
          </td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: 700;">4</td>
          <td style="font-weight: 700;">Kesehatan Gigi & Mulut</td>
          <td>${escapeHtml(r.gigi || 'Tidak ada')}</td>
          <td>${r.gigi && r.gigi !== '-' && r.gigi !== 'Tidak ada' && r.gigi !== '0' ? '<span style="color:#b91c1c; font-weight:700;">Ada Karies Gigi</span>' : 'Gigi Bersih / Sehat'}</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: 700;">5</td>
          <td style="font-weight: 700;">Pemeriksaan Penglihatan (Mata)</td>
          <td>${escapeHtml(r.mata || 'Normal')}</td>
          <td>${r.mata && String(r.mata).toLowerCase() !== 'normal' ? '<span style="color:#b91c1c; font-weight:700;">Perlu Periksa Visus Lanjut</span>' : 'Penglihatan Baik'}</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: 700;">6</td>
          <td style="font-weight: 700;">Pemeriksaan Telinga</td>
          <td>${escapeHtml(r.telinga || 'Tidak ada serumen')}</td>
          <td>${r.telinga && String(r.telinga).toLowerCase().includes('ada') && !String(r.telinga).toLowerCase().includes('tidak') ? '<span style="color:#b45309; font-weight:700;">Perlu Pembersihan Serumen</span>' : 'Bersih'}</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: 700;">7</td>
          <td style="font-weight: 700;">Kebersihan Kuku & Kebugaran</td>
          <td>Kuku: ${escapeHtml(r.kuku || '-')} &bull; Bugar: ${escapeHtml(r.kebugaran || '-')}</td>
          <td>${escapeHtml(r.kebugaran || 'Baik')}</td>
        </tr>
        ${r.jk === 'L' ? `
          <tr>
            <td style="text-align: center; font-weight: 700;">8</td>
            <td style="font-weight: 700;">Skrining Merokok</td>
            <td>
              ${escapeHtml(r.merokok || 'Tidak')}
              ${r.merokok === 'Aktif' ? ` (${escapeHtml(r.jenis_rokok || '-')}${r.jenis_rokok === 'Konvensional' ? ', ' + (r.intensitas_merokok || '-') + ', ' + (r.jumlah_batang || '-') + ' btg' : ''})` : ''}
            </td>
            <td>
              ${r.merokok === 'Aktif' ? '<span style="color:#b91c1c; font-weight:700;">Perokok Aktif (Perlu Konseling UBM)</span>' : (r.merokok === 'Pasif' ? '<span style="color:#b45309; font-weight:700;">Perokok Pasif</span>' : 'Bebas Rokok')}
            </td>
          </tr>
        ` : ''}
      </tbody>
    </table>

    <!-- KESIMPULAN STATUS KESEHATAN -->
    <div style="background: ${statusBadgeBg}; border: 1.5px solid ${statusBadgeColor}44; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase;">
          KESIMPULAN STATUS KESEHATAN SISWA:
        </span>
        <span style="display: inline-block; padding: 3px 12px; border-radius: 20px; font-weight: 900; font-size: 11px; background: ${statusBadgeColor}; color: #ffffff;">
          ${escapeHtml(ket.status)}
        </span>
      </div>
      <div style="font-size: 12px; line-height: 1.6; color: #1e293b;">
        <div style="margin-bottom: 4px;">
          <strong>Temuan Masalah:</strong> ${escapeHtml(ket.diagnosaText)}
        </div>
        <div style="color: #0369a1;">
          <strong>Keterangan Tindak Lanjut:</strong> ${escapeHtml(ket.tindakLanjutText)}
        </div>
      </div>
    </div>

    <!-- PESAN UNTUK ORANG TUA / SEKOLAH -->
    <div style="font-size: 11.5px; line-height: 1.5; color: #475569; margin-bottom: 24px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px 14px;">
      <strong>Catatan untuk Orang Tua / Wali Murid:</strong><br>
      Lembar hasil skrining ini merupakan laporan awal status kesehatan siswa di sekolah. Apabila anak memerlukan rujukan / penanganan lebih lanjut, silakan mengunjungi <strong>UPTD Puskesmas Banjaran Kota</strong> dengan membawa lembar hasil ini.
    </div>

    <!-- TANDA TANGAN DOKTER / PETUGAS -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; padding: 0 10px;">
      <div style="font-size: 11.5px; color: #475569;">
        <div>Diterima oleh Pihak Sekolah / Orang Tua:</div>
        <div style="margin-top: 50px; border-bottom: 1px solid #333; width: 180px;"></div>
        <div style="margin-top: 3px;">Tanda Tangan & Nama Terang</div>
      </div>

      <div style="text-align: center; font-size: 11.5px;">
        <div>Banjaran, ${todayFormatted}</div>
        <div style="font-weight: 700;">Petugas Pemeriksa UKS / Dokter,</div>
        <div style="margin-top: 50px; border-bottom: 1px solid #333; font-weight: 800; min-width: 180px; padding-bottom: 2px;">
          ${escapeHtml(r.petugas_entry || sessionStorage.getItem('ckg_user_name') || 'Tim Medis Puskesmas')}
        </div>
        <div style="color: #64748b; font-size: 10.5px; margin-top: 2px;">UPTD Puskesmas Banjaran Kota</div>
      </div>
    </div>
  `;
}


// ==========================================================================

// 1. Helper Status Anomali NIK (Kurang / Lebih / Kosong / Valid)
function getNikAnomalyStatus(nik) {
  if (nik === null || nik === undefined) {
    return { type: 'kosong', label: 'Kosong', digits: 0, color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
  }
  const clean = String(nik).trim().replace(/\D/g, '');
  if (clean.length === 0) {
    return { type: 'kosong', label: 'Kosong', digits: 0, color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
  } else if (clean.length < 16) {
    return { type: 'kurang', label: `Kurang (${clean.length} dgt)`, digits: clean.length, color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  } else if (clean.length > 16) {
    return { type: 'lebih', label: `Lebih (${clean.length} dgt)`, digits: clean.length, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  } else {
    return { type: 'valid', label: 'Valid (16 dgt)', digits: 16, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
  }
}

// 2. Helper Validasi Kelengkapan Identitas Siswa
function isSiswaIdentitasComplete(siswa) {
  if (!siswa) return false;
  const nama = (siswa.nama || '').trim();
  const nikClean = String(siswa.nik || '').replace(/\D/g, '');
  const tglLahir = (siswa.tanggal_lahir || '').trim();
  const jk = (siswa.jk || '').trim().toUpperCase();
  const sekolah = (siswa.sekolah || '').trim();
  const kelas = (siswa.kelas || '').trim();
  const prov = (siswa.provinsi || '').trim();
  const kab = (siswa.kab_kota || '').trim();
  const kec = (siswa.kecamatan || '').trim();
  const kel = (siswa.kelurahan || '').trim();
  const alamat = (siswa.alamat || '').trim();

  return Boolean(
    nama &&
    nikClean.length === 16 &&
    tglLahir &&
    (jk === 'L' || jk === 'P') &&
    sekolah &&
    kelas &&
    prov &&
    kab &&
    kec &&
    kel &&
    alamat
  );
}

function getMissingIdentitasFields(siswa) {
  const missing = [];
  if (!siswa) return ['Data Siswa Kosong'];

  const nama = (siswa.nama || '').trim();
  const nikRaw = String(siswa.nik || '').trim();
  const nikClean = nikRaw.replace(/\D/g, '');
  const tglLahir = (siswa.tanggal_lahir || '').trim();
  const jk = (siswa.jk || '').trim().toUpperCase();
  const sekolah = (siswa.sekolah || '').trim();
  const kelas = (siswa.kelas || '').trim();
  const prov = (siswa.provinsi || '').trim();
  const kab = (siswa.kab_kota || '').trim();
  const kec = (siswa.kecamatan || '').trim();
  const kel = (siswa.kelurahan || '').trim();
  const alamat = (siswa.alamat || '').trim();

  if (!nama) missing.push('Nama Lengkap');
  if (!nikRaw) {
    missing.push('NIK (Kosong)');
  } else if (nikClean.length < 16) {
    missing.push(`NIK Kurang (${nikClean.length} dari 16 digit)`);
  } else if (nikClean.length > 16) {
    missing.push(`NIK Lebih (${nikClean.length} dari 16 digit)`);
  }
  if (!jk || (jk !== 'L' && jk !== 'P')) missing.push('Jenis Kelamin (L/P)');
  if (!sekolah) missing.push('Asal Sekolah');
  if (!kelas) missing.push('Kelas Siswa');
  if (!tglLahir) missing.push('Tanggal Lahir');
  if (!prov) missing.push('Provinsi');
  if (!kab) missing.push('Kab/Kota');
  if (!kec) missing.push('Kecamatan');
  if (!kel) missing.push('Desa/Kelurahan');
  if (!alamat) missing.push('Alamat Tempat Tinggal');

  return missing;
}

// 3. Helper Log Absensi Minum Tablet Tambah Darah (TTD)
function getStudentTtdLogs(siswa) {
  if (!siswa || !siswa.ttd_logs) return [];
  if (Array.isArray(siswa.ttd_logs)) return siswa.ttd_logs;
  try {
    const parsed = typeof siswa.ttd_logs === 'string' ? JSON.parse(siswa.ttd_logs) : siswa.ttd_logs;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function formatTtdIndoDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    return dateStr;
  } catch (_) {
    return dateStr;
  }
}

function renderTtdLogsInModal(siswa) {
  if (!siswa) {
    if (typeof currentPemeriksaanSiswaIndex !== 'undefined' && currentPemeriksaanSiswaIndex >= 0) {
      siswa = sekolahRecords[currentPemeriksaanSiswaIndex];
    }
  }
  if (!siswa) return;

  const logs = getStudentTtdLogs(siswa);
  const count = logs.length;

  const lblTotal = document.getElementById('labelTotalTtdSiswa');
  if (lblTotal) lblTotal.textContent = `${count} Kali Minum`;

  const lblOrgan = document.getElementById('labelTtdInOrgan');
  if (lblOrgan) lblOrgan.textContent = `${count}x`;

  const container = document.getElementById('listLogTtdSiswa');
  if (!container) return;

  if (count === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 14px 10px; color: #9d174d; font-size: 12px; font-weight: 600; background: #fff5f8; border-radius: 8px; border: 1px dashed #fbcfe8;">
        <i class="bi bi-info-circle-fill" style="color: #ec4899;"></i> Belum ada catatan absensi minum TTD untuk siswi ini. Klik tombol <strong>+ Absen Minum TTD Sekarang</strong> di atas untuk mencatat.
      </div>
    `;
    return;
  }

  container.innerHTML = logs.map((log, idx) => {
    const dateFormatted = formatTtdIndoDate(log.tanggal);
    const safePetugas = escapeHtml(log.petugas || 'Petugas');
    const safeKet = escapeHtml(log.keterangan || 'Minum 1 Tablet TTD');
    const safeWaktu = escapeHtml(log.waktu || '-');
    const logNo = count - idx;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 8px; padding: 7px 12px; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
          <span style="background: #db2777; color: #fff; font-size: 10.5px; font-weight: 800; padding: 2px 7px; border-radius: 6px; white-space: nowrap;">
            #${logNo}
          </span>
          <div style="font-size: 12px; color: #831843; line-height: 1.4;">
            <div>
              <strong style="color: #9d174d;">📅 ${dateFormatted}</strong>
              <span style="margin: 0 4px; color: #f472b6;">•</span>
              <span style="font-weight: 700; color: #db2777;"><i class="bi bi-clock-fill"></i> ${safeWaktu} WIB</span>
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 1px;">
              Petugas: <strong>${safePetugas}</strong> ${safeKet ? `• <span style="font-style: italic;">${safeKet}</span>` : ''}
            </div>
          </div>
        </div>
        <button type="button" onclick="hapusLogTtd('${siswa.id}', '${log.id}')" title="Hapus catatan ini" style="background: #fee2e2; border: 1px solid #fecaca; color: #dc2626; border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer; transition: all 0.15s ease;" onmouseover="this.style.background='#fca5a5'" onmouseout="this.style.background='#fee2e2'">
          <i class="bi bi-trash3-fill"></i>
        </button>
      </div>
    `;
  }).join('');
}

async function catatAbsenMinumTtd(targetId) {
  let siswa = null;
  if (targetId) {
    siswa = sekolahRecords.find(r => r.id === targetId);
  } else if (typeof currentPemeriksaanSiswaIndex !== 'undefined' && currentPemeriksaanSiswaIndex >= 0) {
    siswa = sekolahRecords[currentPemeriksaanSiswaIndex];
  } else {
    const curId = document.getElementById('periksaSiswaId')?.value;
    if (curId) siswa = sekolahRecords.find(r => r.id === curId);
  }

  if (!siswa) {
    showToast('Pilih data siswi terlebih dahulu.', 'warning');
    return;
  }

  if (siswa.jk !== 'P') {
    Swal.fire({
      icon: 'info',
      title: 'Khusus Siswi Perempuan',
      text: 'Program Minum Tablet Tambah Darah (TTD) hanya diperuntukkan bagi siswi remaja putri (P).',
      confirmButtonColor: '#3b82f6'
    });
    return;
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const defaultPetugas = sessionStorage.getItem('ckg_user_name') || 'Petugas UKS / Puskesmas';

  const result = await Swal.fire({
    title: `<div style="display:flex;align-items:center;justify-content:center;gap:8px;font-size:18px;color:#9d174d;"><span style="font-size:22px;">🌸</span> Catat Absen Minum TTD</div>`,
    html: `
      <div style="text-align: left; font-size: 13px; line-height: 1.6;">
        <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; color: #831843;">
          <div style="font-weight: 800; font-size: 14px; color: #9d174d;">${escapeHtml(siswa.nama)}</div>
          <div style="font-size: 12px; color: #be185d;">${escapeHtml(siswa.sekolah || '-')} • Kelas ${escapeHtml(siswa.kelas || '-')}</div>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px; font-size: 12px;">Tanggal Minum TTD:</label>
          <input type="date" id="swalTtdTanggal" class="swal2-input" value="${todayStr}" style="width: 100%; margin: 0; height: 38px; font-size: 13px;">
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px; font-size: 12px;">Waktu / Jam (WIB):</label>
          <input type="time" id="swalTtdWaktu" class="swal2-input" value="${timeStr}" style="width: 100%; margin: 0; height: 38px; font-size: 13px;">
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px; font-size: 12px;">Nama Petugas / Guru Pendamping:</label>
          <input type="text" id="swalTtdPetugas" class="swal2-input" value="${escapeHtml(defaultPetugas)}" placeholder="Nama Petugas / Guru UKS" style="width: 100%; margin: 0; height: 38px; font-size: 13px;">
        </div>

        <div>
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px; font-size: 12px;">Keterangan / Catatan:</label>
          <input type="text" id="swalTtdKeterangan" class="swal2-input" value="Minum 1 Tablet TTD di Sekolah" placeholder="Contoh: Minum bersama di kelas" style="width: 100%; margin: 0; height: 38px; font-size: 13px;">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-check2-circle"></i> Simpan Catatan Absen',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#db2777',
    cancelButtonColor: '#64748b',
    preConfirm: () => {
      const tanggal = document.getElementById('swalTtdTanggal')?.value;
      const waktu = document.getElementById('swalTtdWaktu')?.value;
      const petugas = document.getElementById('swalTtdPetugas')?.value.trim() || defaultPetugas;
      const keterangan = document.getElementById('swalTtdKeterangan')?.value.trim() || 'Minum 1 Tablet TTD di Sekolah';

      if (!tanggal) {
        Swal.showValidationMessage('Tanggal wajib diisi.');
        return false;
      }
      if (!waktu) {
        Swal.showValidationMessage('Waktu/jam wajib diisi.');
        return false;
      }
      return { tanggal, waktu, petugas, keterangan };
    }
  });

  if (!result.isConfirmed || !result.value) return;

  const { tanggal, waktu, petugas, keterangan } = result.value;

  const currentLogs = getStudentTtdLogs(siswa);
  const newLogEntry = {
    id: `TTD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    tanggal,
    waktu,
    timestamp: new Date().toISOString(),
    petugas,
    keterangan
  };

  currentLogs.unshift(newLogEntry);
  const updatedLogsJson = JSON.stringify(currentLogs);
  siswa.ttd_logs = updatedLogsJson;

  try {
    let res = await fetch('/api/sekolah', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: siswa.id,
        fields: { ttd_logs: updatedLogsJson }
      })
    });

    if (!res.ok) {
      await fetch('/api/sekolah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([siswa])
      });
    }

    renderTtdLogsInModal(siswa);
    renderSekolahView();
    if (document.getElementById('modalAbsensiTtd')?.classList.contains('open')) {
      renderAbsensiTtdTable();
    }

    Swal.fire({
      icon: 'success',
      title: 'Absensi TTD Berhasil Dicatat!',
      html: `Siswi <strong>${escapeHtml(siswa.nama)}</strong> telah dicatat minum TTD pada <strong>${formatTtdIndoDate(tanggal)} pk. ${waktu} WIB</strong>.`,
      confirmButtonColor: '#db2777',
      timer: 2000
    });
  } catch (err) {
    console.error('Gagal mencatat absen TTD:', err);
    showToast('Gagal menyimpan absensi TTD ke cloud: ' + err.message, 'danger');
  }
}

async function hapusLogTtd(siswaId, logId) {
  const siswa = sekolahRecords.find(r => r.id === siswaId);
  if (!siswa) return;

  const confirmRes = await Swal.fire({
    title: 'Hapus Catatan Absen TTD?',
    text: 'Data absensi minum TTD yang dihapus tidak dapat dikembalikan.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b'
  });

  if (!confirmRes.isConfirmed) return;

  const currentLogs = getStudentTtdLogs(siswa);
  const filtered = currentLogs.filter(l => l.id !== logId);
  const updatedLogsJson = JSON.stringify(filtered);
  siswa.ttd_logs = updatedLogsJson;

  try {
    let res = await fetch('/api/sekolah', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: siswa.id,
        fields: { ttd_logs: updatedLogsJson }
      })
    });

    if (!res.ok) {
      await fetch('/api/sekolah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([siswa])
      });
    }

    renderTtdLogsInModal(siswa);
    renderSekolahView();
    if (document.getElementById('modalAbsensiTtd')?.classList.contains('open')) {
      renderAbsensiTtdTable();
    }

    showToast('Catatan absen TTD berhasil dihapus.', 'info');
  } catch (err) {
    console.error('Gagal menghapus log TTD:', err);
    showToast('Gagal menghapus log TTD: ' + err.message, 'danger');
  }
}

// ==========================================================================
// MODAL: DATA SISWA NIK BERMASALAH (KURANG / LEBIH / KOSONG) SESUAI SEKOLAH
// ==========================================================================

let currentAnomaliTypeFilter = 'all';

function getActiveSchoolForFilter() {
  const portalType = (sessionStorage.getItem('ckg_portal_type') || '').toLowerCase();
  const schoolAccountName = (sessionStorage.getItem('ckg_user_name') || '').trim();
  if (portalType === 'sekolah' && schoolAccountName) {
    return schoolAccountName.toUpperCase();
  }
  const selVal = (document.getElementById('filterSelectSekolah')?.value || '').trim();
  return selVal ? selVal.toUpperCase() : '';
}

function openAnomaliNikModal() {
  const activeSchool = getActiveSchoolForFilter();
  if (!activeSchool) {
    Swal.fire({
      icon: 'warning',
      title: 'Pilih Sekolah Terlebih Dahulu',
      text: 'Silakan pilih sekolah pada filter utama di atas sebelum membuka menu Data NIK Bermasalah.',
      confirmButtonColor: '#d97706'
    });
    return;
  }

  const lblSekolah = document.getElementById('badgeAnomaliSekolahLabel');
  if (lblSekolah) lblSekolah.textContent = `Sekolah: ${activeSchool}`;

  // Populate filter kelas khusus sekolah ini
  const selKelas = document.getElementById('selectAnomaliKelasFilter');
  if (selKelas) {
    const schoolRecords = sekolahRecords.filter(r => (r.sekolah || '').toUpperCase() === activeSchool);
    const kelasSet = new Set();
    schoolRecords.forEach(r => { if (r.kelas) kelasSet.add(r.kelas.trim()); });
    let optionsHtml = '<option value="">Semua Kelas</option>';
    Array.from(kelasSet).sort().forEach(k => {
      optionsHtml += `<option value="${escapeHtml(k)}">Kelas ${escapeHtml(k)}</option>`;
    });
    selKelas.innerHTML = optionsHtml;
    selKelas.value = '';
  }

  const searchInput = document.getElementById('searchAnomaliInput');
  if (searchInput) searchInput.value = '';

  filterAnomaliType('all');

  const modal = document.getElementById('modalAnomaliNik');
  if (modal) {
    modal.classList.add('active', 'open');
    modal.style.display = 'flex';
  }
}

function closeAnomaliNikModal() {
  const modal = document.getElementById('modalAnomaliNik');
  if (modal) {
    modal.classList.remove('active', 'open');
    modal.style.display = 'none';
  }
}

function filterAnomaliType(type) {
  currentAnomaliTypeFilter = type || 'all';
  const pills = document.querySelectorAll('#pillsAnomaliType .anomali-type-pill');
  pills.forEach(p => {
    if (p.getAttribute('data-type') === currentAnomaliTypeFilter) {
      p.classList.add('active');
      p.style.background = '#d97706';
      p.style.color = '#ffffff';
      p.style.border = 'none';
    } else {
      p.classList.remove('active');
      p.style.background = '#ffffff';
      p.style.color = '#475569';
      p.style.border = '1px solid #cbd5e1';
    }
  });

  renderAnomaliNikTable();
}

function renderAnomaliNikTable() {
  const tbody = document.getElementById('tbodyAnomaliNik');
  if (!tbody) return;

  const activeSchool = getActiveSchoolForFilter();
  if (!activeSchool) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#64748b;">Sekolah belum dipilih.</td></tr>`;
    return;
  }

  const schoolRecords = sekolahRecords.filter(r => (r.sekolah || '').toUpperCase() === activeSchool);

  // Hitung metrik ringkasan
  const totalKurang = schoolRecords.filter(r => getNikAnomalyStatus(r.nik).type === 'kurang').length;
  const totalLebih = schoolRecords.filter(r => getNikAnomalyStatus(r.nik).type === 'lebih').length;
  const totalKosong = schoolRecords.filter(r => getNikAnomalyStatus(r.nik).type === 'kosong').length;
  const totalAnomali = totalKurang + totalLebih + totalKosong;

  const elTot = document.getElementById('statAnomaliTotal');
  if (elTot) elTot.textContent = totalAnomali.toLocaleString('id-ID');
  const elKurang = document.getElementById('statAnomaliKurang');
  if (elKurang) elKurang.textContent = totalKurang.toLocaleString('id-ID');
  const elLebih = document.getElementById('statAnomaliLebih');
  if (elLebih) elLebih.textContent = totalLebih.toLocaleString('id-ID');
  const elKosong = document.getElementById('statAnomaliKosong');
  if (elKosong) elKosong.textContent = totalKosong.toLocaleString('id-ID');

  // Filter anomali
  let dataset = schoolRecords.filter(r => {
    const st = getNikAnomalyStatus(r.nik);
    if (currentAnomaliTypeFilter === 'all') return st.type !== 'valid';
    return st.type === currentAnomaliTypeFilter;
  });

  // Filter kelas
  const kelasVal = document.getElementById('selectAnomaliKelasFilter')?.value;
  if (kelasVal) {
    dataset = dataset.filter(r => (r.kelas || '').trim() === kelasVal);
  }

  // Filter query pencarian
  const q = (document.getElementById('searchAnomaliInput')?.value || '').trim().toLowerCase();
  if (q) {
    dataset = dataset.filter(r => {
      const nama = (r.nama || '').toLowerCase();
      const nik = String(r.nik || '').toLowerCase();
      const kelas = (r.kelas || '').toLowerCase();
      return nama.includes(q) || nik.includes(q) || kelas.includes(q);
    });
  }

  if (dataset.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 45px 20px; color: #64748b;">
          <div style="width: 50px; height: 50px; margin: 0 auto 10px auto; background: #ecfdf5; color: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
            <i class="bi bi-shield-check"></i>
          </div>
          <div style="font-size: 14px; font-weight: 800; color: #065f46;">Tidak Ada Data NIK Bermasalah</div>
          <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Seluruh data siswa pada filter ini sudah memiliki NIK 16 digit yang valid.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = dataset.map((r, idx) => {
    const st = getNikAnomalyStatus(r.nik);
    const safeNama = escapeHtml(r.nama || '-');
    const safeKelas = escapeHtml(r.kelas || '-');
    const safeNik = escapeHtml(r.nik || '');
    const cleanNik = String(r.nik || '').replace(/\D/g, '');
    const jkColor = r.jk === 'P' ? '#ec4899' : '#4f46e5';
    const jkLabel = r.jk === 'P' ? 'Perempuan' : 'Laki-laki';

    return `
      <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;">
        <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
        <td style="padding: 10px 12px;">
          <div style="font-weight: 800; color: #1e293b; font-size: 13.5px; display: flex; align-items: center; gap: 6px;">
            <i class="bi bi-person-fill" style="color: ${jkColor};"></i>
            <span>${safeNama}</span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            <span style="color: ${jkColor}; font-weight: 600;">${jkLabel}</span>
            ${r.tanggal_lahir ? ` • Lahir: ${r.tanggal_lahir}` : ''}
          </div>
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <span class="badge badge-purple" style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">${safeKelas}</span>
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <span class="badge" style="background: ${st.bg}; color: ${st.color}; border: 1px solid ${st.border}; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
            <i class="bi bi-exclamation-triangle-fill"></i> ${st.label}
          </span>
        </td>
        <td style="padding: 10px 12px;">
          ${cleanNik.length > 0
        ? `<div style="font-family: monospace; font-size: 13px; font-weight: 700; color: #1e293b; letter-spacing: 0.5px;">${safeNik}</div>
               <div style="font-size: 10.5px; color: #64748b; margin-top: 1px;">Jumlah: <strong>${cleanNik.length} digit</strong> (wajib 16 digit)</div>`
        : `<span style="font-style: italic; color: #94a3b8; font-size: 12px;">(Belum diisi / Kosong)</span>`
      }
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary btn-sm" onclick="editNikSiswaModal('${r.id}')" style="padding: 5px 10px; font-size: 11.5px; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
              <i class="bi bi-pencil-square"></i> Perbaiki NIK
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="openPemeriksaanModal('${r.id}'); closeAnomaliNikModal();" style="padding: 5px 9px; font-size: 11.5px; border-radius: 6px;" title="Buka Detail Skrining">
              <i class="bi bi-box-arrow-up-right"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function editNikSiswaModal(siswaId) {
  const siswa = sekolahRecords.find(r => r.id === siswaId);
  if (!siswa) {
    showToast('Data siswa tidak ditemukan.', 'danger');
    return;
  }

  const currentNikRaw = String(siswa.nik || '').trim();

  const { value: newNik } = await Swal.fire({
    title: '<div style="font-size: 17px; font-weight: 800; color: #1e293b;"><i class="bi bi-pencil-square" style="color: #059669;"></i> Perbaiki NIK Siswa</div>',
    html: `
      <div style="text-align: left; font-size: 13px; line-height: 1.6;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px;">
          <div style="font-weight: 800; font-size: 14px; color: #1e293b;">${escapeHtml(siswa.nama)}</div>
          <div style="font-size: 12px; color: #64748b;">${escapeHtml(siswa.sekolah || '-')} • Kelas ${escapeHtml(siswa.kelas || '-')}</div>
        </div>

        <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px; font-size: 12px;">
          Masukkan NIK Baru (Tepat 16 Digit Angka):
        </label>
        <input id="swalInputEditNik" class="swal2-input" value="${escapeHtml(currentNikRaw)}" placeholder="Contoh: 3204123456780001" maxlength="16" style="width: 100%; margin: 0; font-family: monospace; font-size: 15px; font-weight: 700; letter-spacing: 1px;" oninput="
          this.value = this.value.replace(/\\D/g, '');
          const cnt = document.getElementById('swalNikDigitCounter');
          if (cnt) {
            cnt.textContent = this.value.length + '/16 digit';
            cnt.style.color = this.value.length === 16 ? '#059669' : '#dc2626';
          }
        ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <span style="font-size: 11px; color: #64748b;">NIK harus berasal dari Kartu Keluarga (KK) siswa.</span>
          <span id="swalNikDigitCounter" style="font-size: 11.5px; font-weight: 800; color: ${currentNikRaw.length === 16 ? '#059669' : '#dc2626'};">
            ${currentNikRaw.replace(/\D/g, '').length}/16 digit
          </span>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-check2-circle"></i> Simpan NIK Baru',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#059669',
    cancelButtonColor: '#64748b',
    preConfirm: () => {
      const inputEl = document.getElementById('swalInputEditNik');
      const val = (inputEl ? inputEl.value : '').replace(/\D/g, '');
      if (!val) {
        Swal.showValidationMessage('NIK wajib diisi.');
        return false;
      }
      if (val.length !== 16) {
        Swal.showValidationMessage(`NIK harus tepat 16 digit angka (saat ini ${val.length} digit).`);
        return false;
      }
      return val;
    }
  });

  if (!newNik) return;

  // Cek duplikasi NIK dengan siswa lain di database
  const dup = sekolahRecords.find(r => r.id !== siswa.id && isNikValidForDuplicate(r.nik) && String(r.nik).trim() === newNik);
  if (dup) {
    const dupConfirm = await Swal.fire({
      icon: 'warning',
      title: 'NIK Sudah Terdaftar!',
      html: `NIK <strong>${newNik}</strong> sudah digunakan oleh siswa <strong>${escapeHtml(dup.nama)}</strong> (${escapeHtml(dup.sekolah || '')} - Kelas ${escapeHtml(dup.kelas || '')}).<br><br>Apakah Anda yakin ingin tetap menyimpan?`,
      showCancelButton: true,
      confirmButtonText: 'Tetap Simpan',
      cancelButtonText: 'Batal Perbaiki',
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b'
    });
    if (!dupConfirm.isConfirmed) return;
  }

  siswa.nik = newNik;
  siswa.identitas_done = isSiswaIdentitasComplete(siswa) ? 1 : 0;

  try {
    let res = await fetch('/api/sekolah', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: siswa.id,
        fields: {
          nik: newNik,
          identitas_done: siswa.identitas_done
        }
      })
    });

    if (!res.ok) {
      await fetch('/api/sekolah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([siswa])
      });
    }

    renderAnomaliNikTable();
    renderSekolahView();

    Swal.fire({
      icon: 'success',
      title: 'NIK Berhasil Diperbaiki!',
      html: `NIK untuk siswa <strong>${escapeHtml(siswa.nama)}</strong> berhasil diperbarui menjadi <strong>${newNik}</strong> (16 digit valid).`,
      confirmButtonColor: '#059669',
      timer: 2000
    });
  } catch (err) {
    console.error('Gagal memperbarui NIK:', err);
    showToast('Gagal menyimpan perbaikan NIK: ' + err.message, 'danger');
  }
}

function exportAnomaliNikToExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Library XLSX belum dimuat.', 'danger');
    return;
  }

  const activeSchool = getActiveSchoolForFilter();
  if (!activeSchool) {
    showToast('Pilih sekolah terlebih dahulu.', 'warning');
    return;
  }

  const schoolRecords = sekolahRecords.filter(r => (r.sekolah || '').toUpperCase() === activeSchool);
  const anomalousRecords = schoolRecords.filter(r => getNikAnomalyStatus(r.nik).type !== 'valid');

  if (anomalousRecords.length === 0) {
    showToast('Tidak ada data NIK bermasalah untuk diekspor.', 'info');
    return;
  }

  const rows = anomalousRecords.map((r, idx) => {
    const st = getNikAnomalyStatus(r.nik);
    const cleanNik = String(r.nik || '').replace(/\D/g, '');
    return {
      'No': idx + 1,
      'Nama Siswa': r.nama || '-',
      'Jenis Kelamin': r.jk === 'P' ? 'Perempuan' : 'Laki-laki',
      'Sekolah': r.sekolah || activeSchool,
      'Kelas': r.kelas || '-',
      'Tanggal Lahir': r.tanggal_lahir || '-',
      'Status NIK': st.label,
      'NIK Saat Ini': r.nik ? `'${r.nik}` : '(Kosong)',
      'Jumlah Digit': cleanNik.length,
      'Keterangan': st.type === 'kosong' ? 'NIK belum diisi' : (st.type === 'kurang' ? `Kurang ${16 - cleanNik.length} digit` : `Kelebihan ${cleanNik.length - 16} digit`)
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'NIK Bermasalah');

  const cleanSchool = activeSchool.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().substring(0, 10);
  XLSX.writeFile(wb, `Data_NIK_Bermasalah_${cleanSchool}_${dateStr}.xlsx`);
  showToast('File Excel NIK bermasalah berhasil diunduh!', 'success');
}

// ==========================================================================
// MODAL: DAFTAR ABSENSI MINUM TTD SISWI REMAJA PUTRI SESUAI SEKOLAH
// ==========================================================================

let currentTtdFilterStatus = 'all';

function openModalAbsensiTtd() {
  const activeSchool = getActiveSchoolForFilter();
  if (!activeSchool) {
    Swal.fire({
      icon: 'warning',
      title: 'Pilih Sekolah Terlebih Dahulu',
      text: 'Silakan pilih sekolah pada filter utama di atas sebelum membuka menu Absensi TTD.',
      confirmButtonColor: '#db2777'
    });
    return;
  }

  const lblSekolah = document.getElementById('badgeTtdSekolahLabel');
  if (lblSekolah) lblSekolah.textContent = `Sekolah: ${activeSchool}`;

  // Populate filter kelas siswi khusus sekolah ini
  const selKelas = document.getElementById('selectTtdKelasFilter');
  if (selKelas) {
    const femaleRecords = sekolahRecords.filter(r => (r.sekolah || '').toUpperCase() === activeSchool && r.jk === 'P');
    const kelasSet = new Set();
    femaleRecords.forEach(r => { if (r.kelas) kelasSet.add(r.kelas.trim()); });
    let optionsHtml = '<option value="">Semua Kelas</option>';
    Array.from(kelasSet).sort().forEach(k => {
      optionsHtml += `<option value="${escapeHtml(k)}">Kelas ${escapeHtml(k)}</option>`;
    });
    selKelas.innerHTML = optionsHtml;
    selKelas.value = '';
  }

  const searchInput = document.getElementById('searchTtdInput');
  if (searchInput) searchInput.value = '';

  filterTtdStatus('all');

  const modal = document.getElementById('modalAbsensiTtd');
  if (modal) {
    modal.classList.add('active', 'open');
    modal.style.display = 'flex';
  }
}

function closeModalAbsensiTtd() {
  const modal = document.getElementById('modalAbsensiTtd');
  if (modal) {
    modal.classList.remove('active', 'open');
    modal.style.display = 'none';
  }
}

function filterTtdStatus(status) {
  currentTtdFilterStatus = status || 'all';
  const pills = document.querySelectorAll('#pillsTtdFilter .ttd-filter-pill');
  pills.forEach(p => {
    if (p.getAttribute('data-filter') === currentTtdFilterStatus) {
      p.classList.add('active');
      p.style.background = '#db2777';
      p.style.color = '#ffffff';
      p.style.border = 'none';
    } else {
      p.classList.remove('active');
      p.style.background = '#ffffff';
      p.style.color = '#475569';
      p.style.border = '1px solid #cbd5e1';
    }
  });

  renderAbsensiTtdTable();
}

function renderAbsensiTtdTable() {
  const tbody = document.getElementById('tbodyAbsensiTtd');
  if (!tbody) return;

  const activeSchool = getActiveSchoolForFilter();
  if (!activeSchool) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#64748b;">Sekolah belum dipilih.</td></tr>`;
    return;
  }

  const femaleStudents = sekolahRecords.filter(r => (r.sekolah || '').toUpperCase() === activeSchool && r.jk === 'P');

  // Hitung metrik ringkasan siswi TTD
  const totalSiswi = femaleStudents.length;
  const sudahPernah = femaleStudents.filter(r => getStudentTtdLogs(r).length > 0).length;
  const belumPernah = totalSiswi - sudahPernah;
  const totalTablet = femaleStudents.reduce((sum, r) => sum + getStudentTtdLogs(r).length, 0);

  const elTot = document.getElementById('statTtdTotalSiswi');
  if (elTot) elTot.textContent = totalSiswi.toLocaleString('id-ID');
  const elSudah = document.getElementById('statTtdSudahPernah');
  if (elSudah) elSudah.textContent = sudahPernah.toLocaleString('id-ID');
  const elBelum = document.getElementById('statTtdBelumPernah');
  if (elBelum) elBelum.textContent = belumPernah.toLocaleString('id-ID');
  const elTab = document.getElementById('statTtdTotalTablet');
  if (elTab) elTab.textContent = totalTablet.toLocaleString('id-ID');

  // Filter status TTD
  let dataset = femaleStudents.filter(r => {
    const logs = getStudentTtdLogs(r);
    if (currentTtdFilterStatus === 'sudah') return logs.length > 0;
    if (currentTtdFilterStatus === 'belum') return logs.length === 0;
    return true;
  });

  // Filter kelas
  const kelasVal = document.getElementById('selectTtdKelasFilter')?.value;
  if (kelasVal) {
    dataset = dataset.filter(r => (r.kelas || '').trim() === kelasVal);
  }

  // Filter search
  const q = (document.getElementById('searchTtdInput')?.value || '').trim().toLowerCase();
  if (q) {
    dataset = dataset.filter(r => {
      const nama = (r.nama || '').toLowerCase();
      const nik = String(r.nik || '').toLowerCase();
      const kelas = (r.kelas || '').toLowerCase();
      return nama.includes(q) || nik.includes(q) || kelas.includes(q);
    });
  }

  const checkAll = document.getElementById('checkAllTtdStudents');
  if (checkAll) checkAll.checked = false;

  if (dataset.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 45px 20px; color: #64748b;">
          <div style="width: 50px; height: 50px; margin: 0 auto 10px auto; background: #fdf2f8; color: #db2777; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
            🌸
          </div>
          <div style="font-size: 14px; font-weight: 800; color: #9d174d;">Tidak Ada Data Siswi</div>
          <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Tidak ada siswi perempuan yang sesuai dengan kriteria filter saat ini.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = dataset.map((r, idx) => {
    const logs = getStudentTtdLogs(r);
    const count = logs.length;
    const safeNama = escapeHtml(r.nama || '-');
    const safeKelas = escapeHtml(r.kelas || '-');
    const safeNik = escapeHtml(r.nik || '-');
    const lastLog = count > 0 ? logs[0] : null;

    let lastLogHtml = `<span style="color: #94a3b8; font-style: italic; font-size: 11.5px;">Belum pernah absen</span>`;
    if (lastLog) {
      const dFormatted = formatTtdIndoDate(lastLog.tanggal);
      lastLogHtml = `
        <div style="font-size: 12px; color: #831843;">
          <strong>📅 ${dFormatted}</strong>
          <span style="margin: 0 4px; color: #f472b6;">•</span>
          <span style="font-weight: 700; color: #db2777;"><i class="bi bi-clock-fill"></i> ${escapeHtml(lastLog.waktu || '-')} WIB</span>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 1px;">
          Petugas: <strong>${escapeHtml(lastLog.petugas || 'Petugas')}</strong>
        </div>
      `;
    }

    return `
      <tr style="border-bottom: 1px solid #fce7f3; transition: background 0.15s ease;">
        <td style="padding: 10px 8px; text-align: center;">
          <input type="checkbox" class="check-ttd-student" value="${r.id}" style="cursor: pointer;">
        </td>
        <td style="padding: 10px 10px; text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
        <td style="padding: 10px 12px;">
          <div style="font-weight: 800; color: #831843; font-size: 13.5px; display: flex; align-items: center; gap: 6px;">
            <i class="bi bi-person-fill" style="color: #ec4899;"></i>
            <span>${safeNama}</span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            <span>NIK: ${safeNik}</span>
            ${(() => {
        const a = calculateRealtimeAge(r.tanggal_lahir);
        return a ? ` • <span style="font-weight: 600; color: #047857;">${a.years} Th</span>` : '';
      })()}
          </div>
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <span class="badge badge-purple" style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">${safeKelas}</span>
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <span class="badge" style="background: ${count > 0 ? '#fdf2f8' : '#f8fafc'}; color: ${count > 0 ? '#be185d' : '#64748b'}; border: 1.5px solid ${count > 0 ? '#f472b6' : '#cbd5e1'}; font-size: 12px; font-weight: 800; padding: 3px 10px; border-radius: 20px;">
            ${count > 0 ? `🌸 ${count} Kali` : '0 Kali'}
          </span>
        </td>
        <td style="padding: 10px 12px;">
          ${lastLogHtml}
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm" onclick="catatAbsenMinumTtd('${r.id}')" style="background: linear-gradient(135deg, #ec4899, #db2777); color: #fff; border: none; font-weight: 700; font-size: 11.5px; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(219,39,119,0.25);">
              <i class="bi bi-capsule"></i> + Absen
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="openPemeriksaanModal('${r.id}'); closeModalAbsensiTtd();" style="padding: 4px 8px; font-size: 11.5px; border-radius: 6px;" title="Lihat Log Riwayat Lengkap">
              <i class="bi bi-clock-history"></i> Log
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function toggleSelectAllTtd(checked) {
  const checkboxes = document.querySelectorAll('.check-ttd-student');
  checkboxes.forEach(cb => { cb.checked = checked; });
}

async function bulkAbsenMinumTtd() {
  const checkedBoxes = Array.from(document.querySelectorAll('.check-ttd-student:checked'));
  if (checkedBoxes.length === 0) {
    Swal.fire({
      icon: 'info',
      title: 'Pilih Siswi Terlebih Dahulu',
      text: 'Silakan centang satu atau beberapa siswi pada kolom paling kiri tabel untuk melakukan absen masal.',
      confirmButtonColor: '#db2777'
    });
    return;
  }

  const selectedIds = checkedBoxes.map(cb => cb.value);
  const selectedStudents = sekolahRecords.filter(r => selectedIds.includes(r.id));

  const todayStr = new Date().toISOString().substring(0, 10);
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const defaultPetugas = sessionStorage.getItem('ckg_user_name') || 'Petugas UKS / Puskesmas';

  const result = await Swal.fire({
    title: `<div style="display:flex;align-items:center;justify-content:center;gap:8px;font-size:17px;color:#9d174d;"><span style="font-size:22px;">🌸</span> Absen Masal Minum TTD (${selectedStudents.length} Siswi)</div>`,
    html: `
      <div style="text-align: left; font-size: 13px; line-height: 1.6;">
        <div style="background: #fdf2f8; border: 1.5px solid #fbcfe8; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; color: #831843;">
          <div style="font-weight: 800; font-size: 13.5px; color: #9d174d;">
            <i class="bi bi-people-fill"></i> ${selectedStudents.length} Siswi Terpilih
          </div>
          <div style="font-size: 11.5px; color: #be185d; margin-top: 2px; max-height: 70px; overflow-y: auto;">
            ${selectedStudents.map(s => escapeHtml(s.nama)).join(', ')}
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px; font-size: 12px;">Tanggal Minum TTD Bersama:</label>
          <input type="date" id="swalBulkTanggal" class="swal2-input" value="${todayStr}" style="width: 100%; margin: 0; height: 38px; font-size: 13px;">
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px; font-size: 12px;">Waktu / Jam (WIB):</label>
          <input type="time" id="swalBulkWaktu" class="swal2-input" value="${timeStr}" style="width: 100%; margin: 0; height: 38px; font-size: 13px;">
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px; font-size: 12px;">Nama Petugas / Guru UKS:</label>
          <input type="text" id="swalBulkPetugas" class="swal2-input" value="${escapeHtml(defaultPetugas)}" placeholder="Nama Petugas / Guru" style="width: 100%; margin: 0; height: 38px; font-size: 13px;">
        </div>

        <div>
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px; font-size: 12px;">Keterangan / Catatan:</label>
          <input type="text" id="swalBulkKeterangan" class="swal2-input" value="Aksi Bergizi: Minum TTD Bersama di Sekolah" placeholder="Keterangan" style="width: 100%; margin: 0; height: 38px; font-size: 13px;">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: `<i class="bi bi-check2-all"></i> Simpan Absen (${selectedStudents.length} Siswi)`,
    cancelButtonText: 'Batal',
    confirmButtonColor: '#db2777',
    cancelButtonColor: '#64748b',
    preConfirm: () => {
      const tanggal = document.getElementById('swalBulkTanggal')?.value;
      const waktu = document.getElementById('swalBulkWaktu')?.value;
      const petugas = document.getElementById('swalBulkPetugas')?.value.trim() || defaultPetugas;
      const keterangan = document.getElementById('swalBulkKeterangan')?.value.trim() || 'Minum TTD Bersama di Sekolah';

      if (!tanggal) {
        Swal.showValidationMessage('Tanggal wajib diisi.');
        return false;
      }
      if (!waktu) {
        Swal.showValidationMessage('Waktu wajib diisi.');
        return false;
      }
      return { tanggal, waktu, petugas, keterangan };
    }
  });

  if (!result.isConfirmed || !result.value) return;

  const { tanggal, waktu, petugas, keterangan } = result.value;

  Swal.fire({
    title: 'Menyimpan Absensi TTD...',
    html: `Sedang memproses absensi untuk <strong>${selectedStudents.length}</strong> siswi...`,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  for (const s of selectedStudents) {
    const logs = getStudentTtdLogs(s);
    logs.unshift({
      id: `TTD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tanggal,
      waktu,
      timestamp: new Date().toISOString(),
      petugas,
      keterangan
    });
    s.ttd_logs = JSON.stringify(logs);
  }

  try {
    await fetch('/api/sekolah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedStudents)
    });

    renderAbsensiTtdTable();
    renderSekolahView();

    Swal.fire({
      icon: 'success',
      title: 'Absensi Masal Berhasil!',
      html: `Berhasil mencatat absensi minum TTD untuk <strong>${selectedStudents.length} siswi</strong> pada tanggal <strong>${formatTtdIndoDate(tanggal)} pk. ${waktu} WIB</strong>.`,
      confirmButtonColor: '#db2777'
    });
  } catch (err) {
    console.error('Gagal simpan absensi masal:', err);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Menyimpan Absensi Masal',
      text: err.message,
      confirmButtonColor: '#dc2626'
    });
  }
}

function exportTtdToExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Library XLSX belum dimuat.', 'danger');
    return;
  }

  const activeSchool = getActiveSchoolForFilter();
  if (!activeSchool) {
    showToast('Pilih sekolah terlebih dahulu.', 'warning');
    return;
  }

  const femaleStudents = sekolahRecords.filter(r => (r.sekolah || '').toUpperCase() === activeSchool && r.jk === 'P');
  if (femaleStudents.length === 0) {
    showToast('Tidak ada data siswi untuk diekspor.', 'info');
    return;
  }

  const rows = femaleStudents.map((r, idx) => {
    const logs = getStudentTtdLogs(r);
    const lastLog = logs.length > 0 ? logs[0] : null;
    const historyDetail = logs.map(l => `${l.tanggal} ${l.waktu} (${l.petugas || 'Petugas'})`).join('; ');

    return {
      'No': idx + 1,
      'Nama Siswi': r.nama || '-',
      'NIK': r.nik ? `'${r.nik}` : '(Kosong)',
      'Sekolah': r.sekolah || activeSchool,
      'Kelas': r.kelas || '-',
      'Tanggal Lahir': r.tanggal_lahir || '-',
      'Total Minum TTD': logs.length,
      'Minum TTD Terakhir (Tgl & Waktu)': lastLog ? `${lastLog.tanggal} pk. ${lastLog.waktu} WIB` : 'Belum Pernah',
      'Riwayat Lengkap Absensi': historyDetail || 'Belum Pernah'
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Absensi TTD Siswi');

  const cleanSchool = activeSchool.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().substring(0, 10);
  XLSX.writeFile(wb, `Rekap_Absensi_TTD_Siswi_${cleanSchool}_${dateStr}.xlsx`);
  showToast('File Excel Rekap Absensi TTD berhasil diunduh!', 'success');
}

// Global Window Bindings
window.getNikAnomalyStatus = getNikAnomalyStatus;
window.isSiswaIdentitasComplete = isSiswaIdentitasComplete;
window.getMissingIdentitasFields = getMissingIdentitasFields;
window.getStudentTtdLogs = getStudentTtdLogs;
window.renderTtdLogsInModal = renderTtdLogsInModal;
window.catatAbsenMinumTtd = catatAbsenMinumTtd;
window.hapusLogTtd = hapusLogTtd;
window.openAnomaliNikModal = openAnomaliNikModal;
window.closeAnomaliNikModal = closeAnomaliNikModal;
window.filterAnomaliType = filterAnomaliType;
window.renderAnomaliNikTable = renderAnomaliNikTable;
window.editNikSiswaModal = editNikSiswaModal;
window.exportAnomaliNikToExcel = exportAnomaliNikToExcel;
window.openModalAbsensiTtd = openModalAbsensiTtd;
window.closeModalAbsensiTtd = closeModalAbsensiTtd;
window.filterTtdStatus = filterTtdStatus;
window.renderAbsensiTtdTable = renderAbsensiTtdTable;
window.toggleSelectAllTtd = toggleSelectAllTtd;
window.bulkAbsenMinumTtd = bulkAbsenMinumTtd;
window.exportTtdToExcel = exportTtdToExcel;
window.isStudentInBankData = isStudentInBankData;
window.setIdentitasFieldsLockState = setIdentitasFieldsLockState;
window.updateBankDataBadgeStatus = updateBankDataBadgeStatus;
window.onPeriksaNikInputChange = onPeriksaNikInputChange;
window.applyBankDataStateToIdentitas = applyBankDataStateToIdentitas;
window.cekNikSiswaBankData = cekNikSiswaBankData;


// Window Bindings untuk Searchable Dropdown & Popup Login Sekolah
window.populateLoginSekolahDropdown = populateLoginSekolahDropdown;
window.toggleLoginSekolahDropdown = toggleLoginSekolahDropdown;
window.closeLoginSekolahDropdown = closeLoginSekolahDropdown;
window.onFilterLoginSekolahSearchInput = onFilterLoginSekolahSearchInput;
window.clearSearchInputLoginSekolah = clearSearchInputLoginSekolah;
window.selectLoginSekolahOption = selectLoginSekolahOption;
window.clearLoginSekolahSelection = clearLoginSekolahSelection;
window.handleSekolahLogin = handleSekolahLogin;

// Searchable Wilayah Dropdowns (Cek Kesehatan Gratis & CKG Sekolah)
window.toggleWilayahSearchDropdown = toggleWilayahSearchDropdown;
window.closeAllWilayahSearchDropdowns = closeAllWilayahSearchDropdowns;
window.filterWilayahSearchOptions = filterWilayahSearchOptions;
window.clearWilayahSearchInput = clearWilayahSearchInput;
window.selectWilayahSearchOption = selectWilayahSearchOption;
window.syncWilayahComboboxUI = syncWilayahComboboxUI;
window.syncWilayahComboboxLabels = syncWilayahComboboxLabels;

// Tambah Siswa Form & Bank Data
window.openTambahSiswaModal = openTambahSiswaModal;
window.closeTambahSiswaModal = closeTambahSiswaModal;
window.saveTambahSiswa = saveTambahSiswa;
window.onTambahSiswaNikInputChange = onTambahSiswaNikInputChange;
window.cekNikTambahSiswaBankData = cekNikTambahSiswaBankData;
window.calculateTambahSiswaAge = calculateTambahSiswaAge;
window.setTambahSiswaFieldsLockState = setTambahSiswaFieldsLockState;
window.updateBankDataBadgeStatusTambah = updateBankDataBadgeStatusTambah;

document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('comboboxLoginSekolahWrapper');
  const panel = document.getElementById('comboboxLoginSekolahPanel');
  if (wrapper && panel && !wrapper.contains(e.target)) {
    panel.style.display = 'none';
  }
});
