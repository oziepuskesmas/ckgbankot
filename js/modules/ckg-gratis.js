/**
 * APLIKASI INFO CKG - PUSKESMAS BANJARAN KOTA
 * Module: Cek Kesehatan Gratis (CKG Posyandu / Dewasa & Lansia), Form Wizard, Examination Modal, Recycle Bin & Excel Sync
 */

// ==========================================================================
// 🌿 DATA CEK KESEHATAN GRATIS (STANDALONE CLOUD D1 DATASET - FORMAT BOT ENCO)
// ==========================================================================
function loadStoredCkgGratisRecords() {
  const saved = localStorage.getItem('ckg_gratis_records');
  if (saved) {
    try {
      ckgGratisRecords = JSON.parse(saved);
    } catch (e) {
      ckgGratisRecords = [];
    }
  } else {
    ckgGratisRecords = [];
  }
  if (typeof CkgIdb !== 'undefined') {
    CkgIdb.get('ckg_gratis_records').then(cached => {
      if (Array.isArray(cached) && cached.length > 0 && ckgGratisRecords.length === 0) {
        ckgGratisRecords = cached;
        if (typeof renderCkgGratisTable === 'function') renderCkgGratisTable();
      }
    }).catch(() => { });
  }
  fetchCkgGratisFromCloud(false);
}

function saveCkgGratisRecordsToStorage() {
  safeLocalStorageSet('ckg_gratis_records', JSON.stringify(ckgGratisRecords));
  if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_gratis_records', ckgGratisRecords);
  syncCkgGratisRecordsToCloud(ckgGratisRecords);
}

async function fetchCkgGratisFromCloud(showFeedback = false) {
  const tbody = document.getElementById('tableBodyCkgGratis');
  if (showFeedback && tbody && ckgGratisRecords.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="29" style="text-align: center; padding: 40px; color: #059669;">
          <div class="spinner-border text-success" role="status" style="width: 2rem; height: 2rem; border-width: 3px; display: inline-block;"></div>
          <div style="font-weight: 800; font-size: 13.5px; margin-top: 12px; color: #065f46;">
            <i class="bi bi-cloud-arrow-down-fill"></i> Memuat Data Cek Kesehatan Gratis dari Cloud D1...
          </div>
        </td>
      </tr>
    `;
  }

  try {
    const res = await fetch('/api/ckg-gratis');
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        ckgGratisRecords = result.data.map(r => ({
          id: r.id ? String(r.id) : ('CKG-G-' + Date.now()),
          jenis_kegiatan: r.jenis_kegiatan || r.lokasi_pelayanan || 'Luar Gedung',
          nik: r.nik || '',
          belum_punya_nik: r.belum_punya_nik ? 1 : 0,
          nama: r.nama || r.nama_pasien || 'Pasien',
          tanggal_lahir: formatDateToYYYYMMDD(r.tanggal_lahir) || '1990-01-01',
          usia: r.usia !== undefined ? r.usia : 30,
          jenis_kelamin: r.jenis_kelamin || 'L',
          no_whatsapp: r.no_whatsapp || '',
          status_pernikahan: r.status_pernikahan || 'MENIKAH',
          provinsi: r.provinsi || 'Jawa Barat',
          kab_kota: r.kab_kota || 'Kab. Bandung',
          kecamatan: r.kecamatan || 'Banjaran',
          kelurahan: r.kelurahan || 'Banjaran Kota',
          alamat: r.alamat || 'Banjaran',
          pekerjaan: r.pekerjaan || '',
          merokok: r.merokok || 'Tidak',
          bb: r.bb !== undefined ? r.bb : 60,
          tb: r.tb !== undefined ? r.tb : 165,
          lp: r.lp !== undefined ? r.lp : 80,
          imt: r.imt !== undefined ? r.imt : '22.0',
          td_sistolik: r.td_sistolik !== undefined ? r.td_sistolik : 120,
          td_diastolik: r.td_diastolik !== undefined ? r.td_diastolik : 80,
          gula_darah: r.gula_darah !== undefined ? r.gula_darah : '110',
          kolesterol: r.kolesterol !== undefined ? r.kolesterol : '180',
          hb: r.hb !== undefined ? r.hb : '14.0',
          telinga: r.telinga || 'Normal',
          mata: r.mata || 'Normal',
          gigi: r.gigi || 'Baik',
          katarak: r.katarak || 'Tidak',
          status_validasi: r.status_validasi || 'Terverifikasi',
          petugas_entry: r.petugas_entry || r.created_by || 'Admin',
          created_by: r.created_by || r.petugas_entry || 'Admin',
          created_at: r.created_at || r.tanggal_entry || new Date().toISOString().substring(0, 10),
          tanggal_entry: r.tanggal_entry || r.created_at || new Date().toISOString().substring(0, 10),
          kategori_sasaran: r.kategori_sasaran || '',
          kategori_umur: r.kategori_umur || '',
          tanpa_wali: r.tanpa_wali ? 1 : 0,
          nik_wali: r.nik_wali || '',
          nama_wali: r.nama_wali || '',
          tanggal_lahir_wali: r.tanggal_lahir_wali || '',
          jenis_kelamin_wali: r.jenis_kelamin_wali || '',
          no_whatsapp_wali: r.no_whatsapp_wali || '',
          wali_nomor_sama: r.wali_nomor_sama ? 1 : 0,
          is_bank_data: r.is_bank_data !== undefined ? r.is_bank_data : (r.from_bank_data || 0),
          from_bank_data: r.from_bank_data !== undefined ? r.from_bank_data : 0,
          enco_pasien_id: r.enco_pasien_id || null,
          enco_status_pendaftaran: r.enco_status_pendaftaran || '',
          enco_status_pelayanan: r.enco_status_pelayanan || '',
          status_pendaftaran: r.status_pendaftaran || r.enco_status_pendaftaran || '',
          status_pelayanan: r.status_pelayanan || r.enco_status_pelayanan || '',
          in_bot_queue: r.in_bot_queue || 0,
          bot_queue_date: r.bot_queue_date || ''
        }));

        safeLocalStorageSet('ckg_gratis_records', JSON.stringify(ckgGratisRecords));
        if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_gratis_records', ckgGratisRecords);

        if (typeof renderCkgGratisTable === 'function') renderCkgGratisTable();
        if (showFeedback) {
          showToast(`Berhasil memuat ${ckgGratisRecords.length} Data Cek Kesehatan Gratis dari Cloud.`, 'success');
        }
      }
    }
  } catch (err) {
    console.warn('Gagal memuat /api/ckg-gratis dari cloud:', err);
    if (typeof renderCkgGratisTable === 'function') renderCkgGratisTable();
  }
}

async function syncCkgGratisRecordsToCloud(dataToSync) {
  if (!dataToSync || !Array.isArray(dataToSync)) return;
  try {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < dataToSync.length; i += CHUNK_SIZE) {
      const chunk = dataToSync.slice(i, i + CHUNK_SIZE);
      await fetch('/api/ckg-gratis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk)
      });
    }
  } catch (err) {
    console.warn('Gagal menyingkronkan data CKG Gratis ke Cloud D1:', err);
  }
}

function loadStoredSimpusRecords() {
  const saved = localStorage.getItem('ckg_simpus_records');
  if (saved) {
    try {
      simpusRecords = JSON.parse(saved);
    } catch (e) {
      simpusRecords = [];
    }
  } else {
    simpusRecords = [];
  }
  fetchCloudSimpusRecords(true);
}

function saveSimpusRecordsToStorage() {
  safeLocalStorageSet('ckg_simpus_records', JSON.stringify(simpusRecords));
  if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_simpus_records', simpusRecords);
  syncSimpusToCloud(simpusRecords);
}

async function loadStoredRecycleBin() {
  const saved = localStorage.getItem('ckg_recycle_bin');
  if (saved) {
    try { recycleBin = JSON.parse(saved); } catch (_) { recycleBin = []; }
  }

  try {
    const res = await fetch('/api/recycle');
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        recycleBin = result.data;
        safeLocalStorageSet('ckg_recycle_bin', JSON.stringify(recycleBin));
      }
    }
  } catch (e) {
    console.log('Using local cached recycle bin:', e);
  }
}

async function saveRecycleBinToStorage(deletedItem = null, deleteId = null, deleteOptions = null) {
  safeLocalStorageSet('ckg_recycle_bin', JSON.stringify(recycleBin));
  try {
    if (deleteId) {
      await fetch(`/api/recycle?id=${encodeURIComponent(deleteId)}`, { method: 'DELETE' });
    } else if (deleteOptions && deleteOptions.source) {
      await fetch(`/api/recycle?source=${encodeURIComponent(deleteOptions.source)}`, { method: 'DELETE' });
    } else if (deleteOptions && deleteOptions.ids) {
      await fetch('/api/recycle', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deleteOptions.ids })
      });
    } else if (deleteOptions && deleteOptions.clearAll) {
      await fetch('/api/recycle', { method: 'DELETE' });
    } else if (deletedItem) {
      await fetch('/api/recycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deletedItem)
      });
    } else {
      await fetch('/api/recycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recycleBin)
      });
    }
  } catch (e) {
    console.log('Failed to sync recycle bin to D1 cloud:', e);
  }
}

async function loadStoredAnnouncement() {
  const saved = localStorage.getItem('ckg_announcement');
  if (saved) {
    try { announcementData = JSON.parse(saved); } catch (_) { announcementData = null; }
  }

  try {
    const res = await fetch('/api/announcement');
    if (res.ok) {
      const result = await res.json();
      if (result.success && result.data && result.data.content) {
        announcementData = result.data;
        announcementData.active = Boolean(result.data.active === 1 || result.data.active === '1' || result.data.active === true || result.data.active === 'true');
        localStorage.setItem('ckg_announcement', JSON.stringify(announcementData));
      }
    }
  } catch (e) {
    console.log('Using local cached announcement:', e);
  }

  if (!announcementData || !announcementData.content) {
    announcementData = {
      title: 'HIMBAUAN PENTING SISTEM',
      content: 'Selamat datang di Sistem Informasi Pencatatan CKG Puskesmas Banjaran Kota. Mohon lakukan verifikasi dan pencatatan data pasien By Name By Address (BNBA) dengan teliti.',
      author: 'Admin Utama',
      date: new Date().toISOString().substring(0, 10),
      active: true
    };
  }
}

async function saveAnnouncementToCloud(data) {
  localStorage.setItem('ckg_announcement', JSON.stringify(data));
  try {
    await fetch('/api/announcement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.log('Failed to sync announcement to D1 cloud:', e);
  }
}

async function checkAndShowAnnouncement() {
  await loadStoredAnnouncement();
  if (!announcementData || !announcementData.content) return;

  const isActive = Boolean(announcementData.active === true || announcementData.active === 1 || announcementData.active === '1' || announcementData.active === 'true');
  if (!isActive) return;

  const titleEl = document.getElementById('announcementPopupTitle');
  const authorEl = document.getElementById('announcementPopupAuthor');
  const dateEl = document.getElementById('announcementPopupDate');
  const contentEl = document.getElementById('announcementPopupContent');

  if (titleEl) {
    const titleText = (announcementData.title || 'HIMBAUAN PENTING SISTEM').toUpperCase();
    titleEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill" style="color: #dc2626; font-size: 20px;"></i> <span>${titleText}</span>`;
  }
  if (authorEl) authorEl.innerHTML = `<i class="bi bi-person-circle"></i> Oleh: ${announcementData.author || 'Admin'}`;
  if (dateEl) dateEl.innerHTML = `<i class="bi bi-calendar3"></i> Tanggal: ${announcementData.date || '-'}`;
  if (contentEl) contentEl.textContent = announcementData.content;

  const modal = document.getElementById('announcementModal');
  if (modal) {
    modal.classList.add('open', 'active');
  }
}

function closeAnnouncementModal() {
  const modal = document.getElementById('announcementModal');
  if (modal) modal.classList.remove('open', 'active');
}

function openEditAnnouncementModal() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || '').toLowerCase();
  if (role !== 'admin' && role !== 'koordinator') {
    Swal.fire('Akses Ditolak', 'Hanya Admin & Koordinator yang dapat mengelola pengumuman.', 'error');
    return;
  }

  Swal.fire({
    title: 'Kelola Pengumuman Sistem',
    html: `
      <div style="text-align: left; font-size: 13px;">
        <label class="form-label" style="font-weight:700; margin-bottom:4px; display:block;">Judul Pengumuman:</label>
        <input type="text" id="swalAnnTitle" class="swal2-input" style="margin: 0 0 12px 0; width: 100%; font-size: 13px;" value="${announcementData?.title || ''}" placeholder="Judul Pengumuman">
        
        <label class="form-label" style="font-weight:700; margin-bottom:4px; display:block;">Isi Pesan Pengumuman:</label>
        <textarea id="swalAnnContent" class="swal2-textarea" style="margin: 0 0 12px 0; width: 100%; height: 110px; font-size: 13px; line-height: 1.5;" placeholder="Tuliskan pesan...">${announcementData?.content || ''}</textarea>

        <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; margin-top: 6px;">
          <input type="checkbox" id="swalAnnActive" ${announcementData?.active ? 'checked' : ''}> Tampilkan Pengumuman Ini Saat User Log In
        </label>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Simpan Pengumuman',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#2563eb',
    preConfirm: () => {
      const title = document.getElementById('swalAnnTitle').value.trim();
      const content = document.getElementById('swalAnnContent').value.trim();
      const active = document.getElementById('swalAnnActive').checked;

      if (!content) {
        Swal.showValidationMessage('Isi pengumuman tidak boleh kosong!');
        return false;
      }
      return { title: title || 'HIMBAUAN PENTING SISTEM', content, active };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      announcementData = {
        title: result.value.title,
        content: result.value.content,
        author: sessionStorage.getItem('ckg_user_name') || 'Admin',
        date: new Date().toISOString().substring(0, 10),
        active: result.value.active
      };
      await saveAnnouncementToCloud(announcementData);
      Swal.fire('Berhasil!', 'Pengumuman sistem telah disimpan ke database cloud dan akan muncul untuk semua user.', 'success');
    }
  });
}

function getVisibleRecords(dataArray) {
  if (!Array.isArray(dataArray)) return [];
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();

  // Admin and Koordinator can see ALL records
  if (role === 'admin' || role === 'koordinator') {
    return dataArray;
  }

  // Petugas can ONLY see their own records
  const loggedUser = (sessionStorage.getItem('ckg_user_name') || '').toLowerCase().trim();

  return dataArray.filter(r => {
    const creator = (r.created_by || r.petugas_entry || r.petugas || r.assigned_to || '').toLowerCase().trim();
    return creator === loggedUser || creator === '' || creator.includes(loggedUser);
  });
}

function setupImportDropzone() {
  const dropzone = document.getElementById('importDropzone');
  if (!dropzone) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.remove('drag-over');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt ? dt.files : null;
    if (files && files.length > 0) {
      const fileInput = document.getElementById('importFileInput');
      if (fileInput) {
        fileInput.files = files;
        handleImportFileSelect({ target: { files: files } });
      }
    }
  }, false);
}

function setupUserSessionUI() {
  const savedName = sessionStorage.getItem('ckg_user_name') || 'Mochamad Fauzie, S.Gz';
  const savedRole = sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas';
  const portalType = (sessionStorage.getItem('ckg_portal_type') || 'puskesmas').toLowerCase();
  currentRole = savedRole;

  document.body.classList.remove('role-admin', 'role-koordinator', 'role-petugas', 'role-sekolah', 'role-posyandu');
  document.body.classList.add('role-' + (savedRole || 'Petugas').toLowerCase().replace(/\s+/g, '-'));

  const nameEl = document.getElementById('headerUserName');
  const roleBadgeEl = document.getElementById('headerUserRoleBadge');
  const avatarEl = document.getElementById('headerUserAvatar');

  if (nameEl) nameEl.textContent = savedName;
  if (roleBadgeEl) {
    const roleUpper = (savedRole || 'Petugas').toUpperCase();
    roleBadgeEl.textContent = roleUpper;
    roleBadgeEl.className = 'badge-role-pill role-' + (savedRole || 'Petugas').toLowerCase().replace(/\s+/g, '-');
  }
  if (avatarEl) {
    const initials = savedName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    avatarEl.textContent = initials;
    const apkAvatarEl = document.getElementById('apkHeaderAvatarText');
    if (apkAvatarEl) apkAvatarEl.textContent = initials;
    const apkSubEl = document.getElementById('apkHeaderSubText');
    if (apkSubEl) apkSubEl.textContent = savedName || 'Puskesmas Banjaran Kota';
  }

  // Multi-Portal Menu Scoping & Empty State Handling
  const emptyAccessView = document.getElementById('view-empty-access');
  const emptyAccName = document.getElementById('emptyAccessAccountName');
  if (emptyAccName) emptyAccName.textContent = savedName;

  if (portalType === 'sekolah' || portalType === 'posyandu') {
    let allowedMenus = [];
    try {
      const raw = sessionStorage.getItem('ckg_allowed_menus') || '[]';
      allowedMenus = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (_) { allowedMenus = []; }
    if (!Array.isArray(allowedMenus)) allowedMenus = [];

    if (allowedMenus.length === 0) {
      // Default: Akun Kosongan (Belum ada menu yang diizinkan Admin)
      document.querySelectorAll('.nav-tab-btn').forEach(b => b.style.display = 'none');
      document.querySelectorAll('.view-panel').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
      });
      if (emptyAccessView) {
        emptyAccessView.style.display = 'block';
        emptyAccessView.classList.add('active');
      }
    } else {
      if (emptyAccessView) {
        emptyAccessView.style.display = 'none';
        emptyAccessView.classList.remove('active');
      }
      document.querySelectorAll('.nav-tab-btn').forEach(b => {
        const v = b.getAttribute('data-view');
        if (allowedMenus.includes(v)) {
          b.style.display = 'inline-flex';
        } else {
          b.style.display = 'none';
        }
      });

      const activeBtn = document.querySelector('.nav-tab-btn.active');
      const activeView = activeBtn ? activeBtn.getAttribute('data-view') : '';
      if (!allowedMenus.includes(activeView)) {
        switchView(allowedMenus[0]);
      }
    }

    // If sekolah: lock filter to this school & restrict toolbar
    if (portalType === 'sekolah') {
      const filterSelectSekolah = document.getElementById('filterSelectSekolah');
      if (filterSelectSekolah) {
        filterSelectSekolah.value = savedName;
        filterSelectSekolah.disabled = true;
      }

      // Kunci Komponen Searchable Combobox Sekolah agar tidak bisa diklik / diubah
      const trigger = document.getElementById('comboboxSekolahTrigger');
      if (trigger) {
        trigger.style.pointerEvents = 'none';
        trigger.style.opacity = '0.9';
        trigger.style.background = '#f8fafc';
        trigger.style.cursor = 'not-allowed';
        trigger.title = 'Terkunci: Akun Anda terdaftar sebagai ' + savedName;
      }
      const labelEl = document.getElementById('comboboxSekolahLabel');
      if (labelEl) {
        labelEl.innerHTML = `<i class="bi bi-lock-fill" style="color: #059669; margin-right: 5px;"></i>${escapeHtml(savedName)} <span style="font-size: 11px; color: #059669; font-weight: 700; margin-left: 4px;">(Akun Terkunci)</span>`;
      }
      const clearBtn = document.getElementById('comboboxSekolahClearBtn');
      if (clearBtn) {
        clearBtn.style.setProperty('display', 'none', 'important');
      }

      // Khusus Akun Sekolah: Tampilkan menu Tambah Siswa, NIK Bermasalah, Absensi TTD, Refresh (Sembunyikan Export & Cetak Laporan)
      const allowedSekolahIds = [
        'btnTambahSiswaSekolah',
        'btnAnomaliNikSekolah',
        'btnAbsensiTtdSekolah',
        'btnRefreshSekolah'
      ];
      const sekolahActionBtns = document.querySelectorAll('#view-sekolah .action-buttons-group > button');
      sekolahActionBtns.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        const isAllowed = allowedSekolahIds.includes(btn.id) ||
          text.includes('tambah siswa') ||
          text.includes('nik') ||
          text.includes('ttd') ||
          text.includes('refresh');
        const isForbidden = btn.classList.contains('admin-only') ||
          btn.classList.contains('admin-koordinator-only') ||
          btn.id === 'btnExportSekolah' ||
          btn.id === 'btnLaporanSekolah' ||
          text.includes('cetak laporan') ||
          text.includes('eksport') ||
          text.includes('kelola sekolah') ||
          text.includes('naik kelas') ||
          text.includes('migrasi') ||
          text.includes('cek duplikat') ||
          text.includes('hapus semua') ||
          text.includes('antrean bot') ||
          text.includes('kirim kelas');
        if (isAllowed && !isForbidden) {
          btn.style.setProperty('display', 'inline-flex', 'important');
        } else {
          btn.style.setProperty('display', 'none', 'important');
        }
      });

      const btnKelolaQuick = document.querySelector('.btn-kelola-sekolah-quick');
      if (btnKelolaQuick) btnKelolaQuick.style.display = 'none';

      if (typeof updateKelasDropdownOptions === 'function') updateKelasDropdownOptions();
      if (typeof renderSekolahView === 'function') renderSekolahView();
    }
  } else {
    // Regular Puskesmas User: restore default role visibility
    if (emptyAccessView) {
      emptyAccessView.style.display = 'none';
      emptyAccessView.classList.remove('active');
    }
    const roleLower = (savedRole || 'Petugas').toLowerCase();
    applyMenuConfiguration();

    // Restore toolbar buttons for regular Puskesmas users
    const sekolahActionBtns = document.querySelectorAll('#view-sekolah .action-buttons-group > button');
    sekolahActionBtns.forEach(btn => {
      const isAdmOnly = btn.classList.contains('admin-only');
      const isAdmKoorOnly = btn.classList.contains('admin-koordinator-only');
      if (isAdmOnly && !roleLower.includes('admin')) {
        btn.style.display = 'none';
      } else if (isAdmKoorOnly && !roleLower.includes('admin') && !roleLower.includes('koordinator')) {
        btn.style.display = 'none';
      } else {
        btn.style.display = 'inline-flex';
      }
    });

    const btnKelolaQuick = document.querySelector('.btn-kelola-sekolah-quick');
    if (btnKelolaQuick) {
      btnKelolaQuick.style.display = roleLower.includes('admin') ? 'inline-flex' : 'none';
    }

    const filterSelectSekolah = document.getElementById('filterSelectSekolah');
    if (filterSelectSekolah && filterSelectSekolah.disabled) {
      filterSelectSekolah.disabled = false;
    }
  }

  renderApp();
  setTimeout(checkAndShowAnnouncement, 500);

  sendUserHeartbeat('active');
  fetchLiveSessions();

  if (!window._heartbeatInterval) {
    window._heartbeatInterval = setInterval(() => sendUserHeartbeat('active'), 15000);
  }
  if (!window._fetchSessionsInterval) {
    window._fetchSessionsInterval = setInterval(() => fetchLiveSessions(), 10000);
  }
  if (!window._cloudSyncInterval) {
    window._cloudSyncInterval = setInterval(() => {
      if (!document.hidden) {
        fetchCloudRecords();
        fetchCloudSimpusRecords(true);
      }
    }, 15000);
  }
}

async function checkAuthSession() {
  const isLoggedIn = sessionStorage.getItem('ckg_logged_in') === 'true';
  const portalOverlay = document.getElementById('portalSelectionContainer');
  const loginOverlay = document.getElementById('loginViewContainer');
  const sekolahOverlay = document.getElementById('sekolahLoginContainer');
  const posyanduOverlay = document.getElementById('posyanduLoginContainer');
  const mainApp = document.getElementById('appMainContainer');
  const savedRole = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  const isAdmin = savedRole.includes('admin');

  function hideAllLoginOverlays() {
    if (portalOverlay) { portalOverlay.classList.add('hidden'); portalOverlay.style.display = 'none'; }
    if (loginOverlay) { loginOverlay.classList.add('hidden'); loginOverlay.style.display = 'none'; }
    if (sekolahOverlay) { sekolahOverlay.classList.add('hidden'); sekolahOverlay.style.display = 'none'; }
    if (posyanduOverlay) { posyanduOverlay.classList.add('hidden'); posyanduOverlay.style.display = 'none'; }
  }

  function showPortalGate() {
    if (loginOverlay) { loginOverlay.classList.add('hidden'); loginOverlay.style.display = 'none'; }
    if (sekolahOverlay) { sekolahOverlay.classList.add('hidden'); sekolahOverlay.style.display = 'none'; }
    if (posyanduOverlay) { posyanduOverlay.classList.add('hidden'); posyanduOverlay.style.display = 'none'; }
    if (portalOverlay) { portalOverlay.classList.remove('hidden'); portalOverlay.style.display = 'flex'; }
  }

  // 1. Fast sync check from cached maintenance state (locks out instantly on refresh)
  const isCachedMaint = maintenanceState.maintenance_web || (localStorage.getItem('ckg_cached_maint_web') === '1');
  if (isCachedMaint && !isAdmin) {
    hideAllLoginOverlays();
    if (mainApp) mainApp.style.display = 'none';
    showMaintenanceScreen(maintenanceState.maintenance_web_message || localStorage.getItem('ckg_cached_maint_msg'));
    return;
  }

  // 2. Admin / Super Admin always bypasses maintenance screens
  if (isAdmin) {
    const existingOverlay = document.getElementById('maintenanceFullscreenOverlay');
    if (existingOverlay) existingOverlay.remove();

    if (isLoggedIn) {
      hideAllLoginOverlays();
      if (mainApp) mainApp.style.display = 'block';
      setupUserSessionUI();
    } else {
      showPortalGate();
      if (mainApp) mainApp.style.display = 'none';
    }
    return;
  }

  // 3. For non-admin: ALWAYS verify maintenance with Cloud D1 BEFORE revealing mainApp!
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
        }

        safeLocalStorageSet('ckg_cached_maint_web', maintenanceState.maintenance_web ? '1' : '0');
        safeLocalStorageSet('ckg_cached_maint_msg', maintenanceState.maintenance_web_message);

        if (maintenanceState.maintenance_web) {
          hideAllLoginOverlays();
          if (mainApp) mainApp.style.display = 'none';
          showMaintenanceScreen(maintenanceState.maintenance_web_message);
          return;
        }
      }
    }
  } catch (err) {
    console.warn('[Maintenance] Error checking status on load:', err);
  }

  // 4. Maintenance is OFF:
  const existingOverlay = document.getElementById('maintenanceFullscreenOverlay');
  if (existingOverlay) existingOverlay.remove();

  if (isLoggedIn) {
    hideAllLoginOverlays();
    if (mainApp) mainApp.style.display = 'block';
    setupUserSessionUI();
  } else {
    showPortalGate();
    if (mainApp) mainApp.style.display = 'none';
  }
}

function setupAuthFormEvents() {
  // No need for change listener anymore since password is popup-based
}

function updatePasswordVisibility() {
  // Removed - password is now handled via SweetAlert2 popup
}

function selectPegawaiQuick(namaPegawai) {
  const selectEl = document.getElementById('loginPegawaiSelect');
  if (!selectEl) return;

  for (let i = 0; i < selectEl.options.length; i++) {
    if (selectEl.options[i].value === namaPegawai) {
      selectEl.selectedIndex = i;
      break;
    }
  }
  // Sync combobox label
  const labelEl = document.getElementById('comboboxPegawaiLabel');
  const clearBtn = document.getElementById('comboboxPegawaiClearBtn');
  if (labelEl) {
    const selectedOpt = selectEl.options[selectEl.selectedIndex];
    labelEl.textContent = selectEl.value ? (selectedOpt?.textContent || selectEl.value) : '-- Pilih Nama Pegawai --';
  }
  if (clearBtn) {
    clearBtn.style.display = selectEl.value ? 'inline-block' : 'none';
  }
}


// ----------------------------------------------------
// OTHER GENERAL MODALS & LOGIC (MULTI-STEP WIZARD)
// ----------------------------------------------------
let currentWizardStep = 1;

function updateWizardUI() {
  const isCkgGratis = (currentInputTarget === 'ckg-gratis');
  const maxSteps = isCkgGratis ? 2 : 4;

  const formOverlay = document.getElementById('inputModalOverlay');
  const formEl = document.getElementById('ckgForm');
  if (formOverlay) formOverlay.classList.toggle('ckg-gratis-mode', isCkgGratis);
  if (formEl) formEl.classList.toggle('ckg-gratis-mode', isCkgGratis);

  const subtitleEl = document.getElementById('inputModalSubtitle');
  if (subtitleEl) {
    subtitleEl.style.display = isCkgGratis ? 'block' : 'none';
  }

  const btnPrev = document.getElementById('btnWizardPrev');
  const btnCancel = document.getElementById('btnWizardCancel');
  const btnNext = document.getElementById('btnWizardNext');
  const btnSubmit = document.getElementById('btnWizardSubmit');
  const alertFooter = document.getElementById('alertKategoriMismatch');

  if (isCkgGratis) {
    // Mode Simpel & Elegan: Single-Page Form Identitas Pasien (Tanpa Step Wizard)
    const s1 = document.getElementById('wizardStep1');
    const s2 = document.getElementById('wizardStep2');
    const s3 = document.getElementById('wizardStep3');
    const s4 = document.getElementById('wizardStep4');
    if (s1) { s1.classList.add('active'); s1.style.display = 'block'; }
    if (s2) { s2.classList.add('active'); s2.style.display = 'block'; }
    if (s3) { s3.classList.remove('active'); s3.style.display = 'none'; }
    if (s4) { s4.classList.remove('active'); s4.style.display = 'none'; }

    const stepperBar = document.querySelector('.wizard-stepper-bar');
    if (stepperBar) stepperBar.style.display = 'none';

    if (btnPrev) btnPrev.style.display = 'none';
    if (btnNext) btnNext.style.display = 'none';
    if (btnCancel) btnCancel.style.display = 'inline-flex';
    if (btnSubmit) {
      btnSubmit.style.display = 'inline-flex';
      btnSubmit.innerHTML = currentEditingId
        ? '<i class="bi bi-check-circle-fill"></i> Simpan Perubahan Identitas'
        : '<i class="bi bi-check-circle-fill"></i> Simpan Data Pasien';
    }
    if (alertFooter) alertFooter.style.display = 'none';

    const modalBody = document.querySelector('#inputModalOverlay .modal-body');
    if (modalBody && currentWizardStep === 1) {
      modalBody.scrollTop = 0;
    }
    return;
  }

  // Standar Multi-Step Wizard untuk Data Records Puskesmas
  const stepperBar = document.querySelector('.wizard-stepper-bar');
  if (stepperBar) stepperBar.style.display = 'flex';

  for (let i = 1; i <= 4; i++) {
    const stepEl = document.getElementById(`wizardStep${i}`);
    if (stepEl) {
      stepEl.classList.toggle('active', i === currentWizardStep);
      stepEl.style.display = (i === currentWizardStep) ? 'block' : 'none';
    }
  }

  // Stepper Items & Lines
  const stepperItems = document.querySelectorAll('.wizard-stepper-bar .stepper-item');
  const stepperLines = document.querySelectorAll('.wizard-stepper-bar .stepper-line');

  stepperItems.forEach(item => {
    const stepNum = parseInt(item.getAttribute('data-step')) || 1;
    item.style.display = 'flex';
    item.classList.toggle('active', stepNum === currentWizardStep);
    item.classList.toggle('completed', stepNum < currentWizardStep);
  });

  stepperLines.forEach((line, idx) => {
    line.style.display = 'block';
    line.classList.toggle('completed', (idx + 1) < currentWizardStep);
  });

  // Step Section Titles
  const s1Title = document.getElementById('wizardStep1Title');
  const s2Title = document.getElementById('wizardStep2Title');
  if (s1Title) {
    s1Title.innerHTML = `<i class="bi bi-people-fill"></i> Step 1 dari 4: Pilih Kategori Usia Sasaran Skrining`;
  }
  if (s2Title) {
    s2Title.innerHTML = `<i class="bi bi-person-fill"></i> Step 2 dari 4: Data Demografi Pasien`;
  }

  if (currentWizardStep === 1) {
    if (btnPrev) btnPrev.style.display = 'none';
    if (btnCancel) btnCancel.style.display = 'inline-flex';
    if (btnNext) btnNext.style.display = 'inline-flex';
    if (btnSubmit) btnSubmit.style.display = 'none';
  } else if (currentWizardStep === 4) {
    if (btnPrev) btnPrev.style.display = 'inline-flex';
    if (btnCancel) btnCancel.style.display = 'none';
    if (btnNext) btnNext.style.display = 'none';
    if (btnSubmit) {
      btnSubmit.style.display = 'inline-flex';
      btnSubmit.innerHTML = currentEditingId
        ? '<i class="bi bi-check-circle-fill"></i> Simpan Perubahan Data'
        : '<i class="bi bi-check-circle-fill"></i> Simpan Data CKG';
    }
  } else {
    if (btnPrev) btnPrev.style.display = 'inline-flex';
    if (btnCancel) btnCancel.style.display = 'none';
    if (btnNext) btnNext.style.display = 'inline-flex';
    if (btnSubmit) btnSubmit.style.display = 'none';
  }

  // Update visibilitas alert mismatch kategori
  if (currentWizardStep === 1) {
    if (alertFooter) alertFooter.style.display = 'none';
  } else if (currentWizardStep === 2) {
    if (typeof checkDobKategoriCompatibility === 'function') {
      checkDobKategoriCompatibility(false);
    }
  }

  // Selalu reset scroll ke paling atas agar header & input atas selalu terlihat
  const modalBody = document.querySelector('#inputModalOverlay .modal-body');
  if (modalBody) {
    modalBody.scrollTop = 0;
  }
}

function validateCurrentStep(step) {
  if (step === 1) {
    const kat = getSelectedKategoriSasaran();
    if (!kat) {
      showToast('Pilih Kategori Usia Sasaran Skrining terlebih dahulu!', 'warning');
      return false;
    }
    updateDataWaliVisibility();
    return true;
  }
  if (step === 2) {
    const belumPunyaNik = document.getElementById('belum_punya_nik')?.checked || false;
    const nik = (document.getElementById('nik')?.value || '').replace(/\D/g, '').trim();
    const nama = document.getElementById('nama')?.value.trim();
    const dob = document.getElementById('tanggal_lahir')?.value;
    const prov = document.getElementById('provinsi')?.value;
    const kab = document.getElementById('kab_kota')?.value;
    const kec = document.getElementById('kecamatan')?.value;
    const kel = document.getElementById('kelurahan')?.value;
    const alamat = document.getElementById('alamat')?.value.trim();

    if (!belumPunyaNik) {
      if (!nik || nik.length !== 16) {
        showToast('NIK Pasien WAJIB tepat 16 digit angka! (Saat ini: ' + nik.length + ' digit)', 'error');
        document.getElementById('nik')?.focus();
        return false;
      }
      const namaEl = document.getElementById('nama');
      if (namaEl && namaEl.disabled) {
        showToast('Harap klik tombol "Cek NIK" terlebih dahulu untuk memverifikasi atau mengisi identitas pasien!', 'warning');
        return false;
      }
    }
    if (!nama) {
      showToast('Nama Lengkap Pasien wajib diisi!', 'error');
      document.getElementById('nama').focus();
      return false;
    }
    if (!dob) {
      showToast('Tanggal Lahir Pasien wajib diisi!', 'error');
      document.getElementById('tanggal_lahir').focus();
      return false;
    }

    // Validasi Kesesuaian Kategori Usia vs Tanggal Lahir Pasien
    if (dob && typeof checkDobKategoriCompatibility === 'function') {
      const isCompat = checkDobKategoriCompatibility(true);
      if (!isCompat) {
        const correct = determineKategoriSasaran(dob);
        const curKat = getSelectedKategoriSasaran();
        showToast(`Tombol Selanjutnya terkunci! Usia terhitung (${correct.age} Thn) tidak sesuai kategori "${getKategoriLabel(curKat)}". Harap sesuaikan kategori terlebih dahulu!`, 'error');
        return false;
      }
    }
    if (!alamat) {
      showToast('Alamat Lengkap Pasien wajib diisi!', 'error');
      document.getElementById('alamat').focus();
      return false;
    }

    // Validasi Wajib Data Wali untuk Balita & Prasekolah
    const kat = getSelectedKategoriSasaran();
    const isWajibWali = (kat === 'bayi_balita' || kat === 'prasekolah');
    const isTanpaWali = isWajibWali ? false : (document.getElementById('daftarkan_tanpa_wali')?.checked || false);

    if (isWajibWali || belumPunyaNik) {
      const nikWali = (document.getElementById('nik_wali')?.value || '').replace(/\D/g, '').trim();
      const namaWaliEl = document.getElementById('nama_wali');
      const namaWali = (namaWaliEl?.value || '').trim();
      const dobWali = document.getElementById('tanggal_lahir_wali')?.value;
      const jkWali = document.getElementById('jenis_kelamin_wali')?.value;
      const waWali = (document.getElementById('no_whatsapp_wali')?.value || '').trim();
      const isNomorSama = document.getElementById('wali_nomor_sama')?.checked;
      const waPasien = (document.getElementById('no_whatsapp')?.value || '').trim();

      if (!nikWali || nikWali.length !== 16) {
        showToast('Kategori ' + (kat === 'bayi_balita' ? 'Bayi & Balita' : (kat === 'prasekolah' ? 'Anak Prasekolah' : 'Pasien')) + ' WAJIB mengisi NIK Wali 16 digit angka!', 'error');
        document.getElementById('nik_wali')?.focus();
        return false;
      }
      if (namaWaliEl && namaWaliEl.disabled) {
        showToast('Harap klik tombol "Cek NIK" Wali terlebih dahulu untuk memverifikasi atau mengisi identitas wali!', 'warning');
        return false;
      }
      if (!namaWali) {
        showToast('Nama Lengkap Wali wajib diisi!', 'error');
        document.getElementById('nama_wali')?.focus();
        return false;
      }
      if (!dobWali) {
        showToast('Tanggal Lahir Wali wajib diisi!', 'error');
        document.getElementById('tanggal_lahir_wali')?.focus();
        return false;
      }
      if (!jkWali) {
        showToast('Jenis Kelamin Wali wajib dipilih!', 'error');
        document.getElementById('jenis_kelamin_wali')?.focus();
        return false;
      }
      if (!waWali && (!isNomorSama || !waPasien)) {
        showToast('No. WhatsApp Wali wajib diisi!', 'error');
        document.getElementById('no_whatsapp_wali')?.focus();
        return false;
      }
    } else if (!isTanpaWali) {
      // Jika kategori lain tapi NIK Wali diisi, harus 16 digit
      const nikWali = (document.getElementById('nik_wali')?.value || '').replace(/\D/g, '').trim();
      if (nikWali && nikWali.length !== 16) {
        showToast('NIK Wali harus 16 digit angka jika diisi!', 'error');
        document.getElementById('nik_wali')?.focus();
        return false;
      }
    }

    return true;
  }
  if (step === 3) {
    const bb = parseFloat(document.getElementById('bb').value) || 0;
    const tb = parseFloat(document.getElementById('tb').value) || 0;

    if (bb <= 0) {
      showToast('Berat Badan (BB) wajib diisi angka valid!', 'error');
      document.getElementById('bb').focus();
      return false;
    }
    if (tb <= 0) {
      showToast('Tinggi Badan (TB) wajib diisi angka valid!', 'error');
      document.getElementById('tb').focus();
      return false;
    }
    return true;
  }
  return true;
}

function goToStep(targetStep) {
  const isCkgGratis = (currentInputTarget === 'ckg-gratis');
  if (isCkgGratis && targetStep > 2) return;

  if (targetStep < currentWizardStep) {
    currentWizardStep = targetStep;
    updateWizardUI();
    return;
  }

  for (let s = currentWizardStep; s < targetStep; s++) {
    if (!validateCurrentStep(s)) return;
  }

  currentWizardStep = targetStep;
  updateWizardUI();
}

function nextWizardStep() {
  const isCkgGratis = (currentInputTarget === 'ckg-gratis');
  const maxSteps = isCkgGratis ? 2 : 4;
  if (!validateCurrentStep(currentWizardStep)) return;
  if (currentWizardStep < maxSteps) {
    currentWizardStep++;
    updateWizardUI();
  }
}

function prevWizardStep() {
  if (currentWizardStep > 1) {
    currentWizardStep--;
    updateWizardUI();
  }
}

function openInputModal(kategori = 'Luar Gedung', isEdit = false, target = 'records') {
  currentInputTarget = target || 'records';
  if (!isEdit) {
    currentEditingId = null;
    const form = document.getElementById('ckgForm');
    if (form) form.reset();
    const nikInputEl = document.getElementById('nik');
    if (nikInputEl) nikInputEl.dataset.fromBankData = '0';
    const countEl = document.getElementById('nikWaliCounter');
    if (countEl) { countEl.textContent = '0'; countEl.style.color = '#64748b'; }
    const nikCountSpan = document.getElementById('nikCharCount');
    const nikHelpText = document.getElementById('nikHelpText');
    const nikBadge = document.getElementById('nikCounterBadge');
    if (nikCountSpan) nikCountSpan.textContent = '0';
    if (nikHelpText) {
      nikHelpText.style.color = '#dc2626';
      nikHelpText.innerHTML = '<i class="bi bi-exclamation-circle-fill"></i> NIK wajib tepat 16 digit angka';
    }
    if (nikBadge) {
      nikBadge.style.background = '#fef2f2';
      nikBadge.style.color = '#dc2626';
      nikBadge.style.borderColor = '#fecaca';
    }
    const defRadio = document.getElementById('kat_dewasa');
    if (defRadio) defRadio.checked = true;
    const tanpaWaliCb = document.getElementById('daftarkan_tanpa_wali');
    if (tanpaWaliCb) {
      tanpaWaliCb.checked = false;
      tanpaWaliCb.disabled = false;
      toggleTanpaWaliInputs(false);
    }
    const belumNikCb = document.getElementById('belum_punya_nik');
    if (belumNikCb) {
      belumNikCb.checked = false;
      toggleBelumPunyaNik(false);
    }
    updateDataWaliVisibility();
    // Kunci kolom demografi pasien dan wali saat input baru sampai klik "Cek NIK"
    setDemographicLock('all', true);
  } else {
    // Mode edit -> buka semua kuncian kolom agar bisa diedit
    setDemographicLock('all', false);
  }

  // Reset peringatan mismatch kategori
  const alertFooter = document.getElementById('alertKategoriMismatch');
  if (alertFooter) alertFooter.style.display = 'none';
  const dobWarning = document.getElementById('dobKategoriWarning');
  if (dobWarning) dobWarning.style.display = 'none';
  const btnNext = document.getElementById('btnWizardNext');
  if (btnNext) {
    btnNext.disabled = false;
    btnNext.style.opacity = '1';
    btnNext.style.cursor = 'pointer';
    btnNext.removeAttribute('title');
  }

  if (kategori === 'Dalam Gedung') {
    const el = document.getElementById('kegiatan_dalam');
    if (el) el.checked = true;
  } else {
    const el = document.getElementById('kegiatan_luar');
    if (el) el.checked = true;
  }

  const titleEl = document.getElementById('inputModalTitle');
  const btnSubmit = document.getElementById('btnWizardSubmit');

  const isCkgGratis = (currentInputTarget === 'ckg-gratis');

  if (titleEl) {
    if (isCkgGratis) {
      titleEl.innerHTML = isEdit
        ? `<i class="bi bi-pencil-square" style="color: var(--primary);"></i> Edit Data Identitas Pasien (Format Bot ENCO)`
        : `<i class="bi bi-person-vcard-fill" style="color: var(--primary);"></i> Form Input Data Identitas Pasien (Format Bot ENCO)`;
    } else {
      titleEl.innerHTML = isEdit
        ? `<i class="bi bi-pencil-square" style="color: var(--primary);"></i> Edit Data Record CKG Pasien`
        : `<i class="bi bi-file-earmark-medical-fill" style="color: var(--primary);"></i> Form Input Data CKG Pasien Baru`;
    }
  }

  if (btnSubmit) {
    if (isCkgGratis) {
      btnSubmit.innerHTML = isEdit
        ? '<i class="bi bi-check-circle-fill"></i> Simpan Perubahan Identitas'
        : '<i class="bi bi-check-circle-fill"></i> Simpan Data Pasien';
    } else {
      btnSubmit.innerHTML = isEdit
        ? '<i class="bi bi-check-circle-fill"></i> Simpan Perubahan Data'
        : '<i class="bi bi-check-circle-fill"></i> Simpan Data CKG';
    }
  }

  calculateIMT();
  currentWizardStep = 1;
  updateWizardUI();
  updateDataWaliVisibility();
  syncWilayahComboboxLabels();
  document.getElementById('inputModalOverlay').classList.add('open');
}

function closeInputModal() {
  document.getElementById('inputModalOverlay').classList.remove('open');
}

function openAddUserModal() {
  document.getElementById('addUserForm').reset();
  document.getElementById('editingUserOriginalName').value = '';
  const titleEl = document.getElementById('userModalTitle');
  const btnSubmit = document.getElementById('btnSubmitUser');
  if (titleEl) titleEl.innerHTML = '<i class="bi bi-person-plus-fill" style="color: var(--primary);"></i> Tambah User Database Baru';
  if (btnSubmit) btnSubmit.textContent = 'Simpan User';
  document.getElementById('userModalOverlay').classList.add('open');
}

function openEditUserModal(namaUser) {
  const user = usersDb.find(u => u.nama_user === namaUser);
  if (!user) return;

  document.getElementById('editingUserOriginalName').value = namaUser;
  document.getElementById('newNamaUser').value = user.nama_user;
  document.getElementById('newPassword').value = '';
  document.getElementById('newPassword').placeholder = user.has_password ? '(Biarkan kosong jika tidak diubah)' : 'Masukkan password baru...';
  document.getElementById('newRole').value = user.role || 'Petugas';

  const titleEl = document.getElementById('userModalTitle');
  const btnSubmit = document.getElementById('btnSubmitUser');
  if (titleEl) titleEl.innerHTML = '<i class="bi bi-pencil-square" style="color: var(--amber);"></i> Edit Data User Database';
  if (btnSubmit) btnSubmit.textContent = 'Simpan Perubahan';

  document.getElementById('userModalOverlay').classList.add('open');
}

function closeAddUserModal() {
  document.getElementById('userModalOverlay').classList.remove('open');
}

function handleAddUserSubmit(e) {
  e.preventDefault();
  const originalName = document.getElementById('editingUserOriginalName').value;
  const namaUser = document.getElementById('newNamaUser').value.trim();
  const password = document.getElementById('newPassword').value.trim();
  const role = document.getElementById('newRole').value;

  if (!namaUser) {
    showToast('Nama User wajib diisi!', 'error');
    return;
  }

  const isEdit = !!originalName;

  if (isEdit) {
    const duplicate = usersDb.find(u => u.nama_user.toLowerCase() === namaUser.toLowerCase() && u.nama_user !== originalName);
    if (duplicate) {
      showToast('User dengan Nama User ini sudah terdaftar!', 'error');
      return;
    }

    const index = usersDb.findIndex(u => u.nama_user === originalName);
    if (index !== -1) {
      const oldUser = usersDb[index];
      usersDb[index] = {
        nama_user: namaUser,
        password: password,
        role: role,
        has_password: password ? true : Boolean(oldUser.has_password)
      };
    }

    if (originalName !== namaUser) {
      deleteUserFromCloud(originalName);
    }
  } else {
    const existing = usersDb.find(u => u.nama_user.toLowerCase() === namaUser.toLowerCase());
    if (existing) {
      showToast('User dengan Nama User ini sudah terdaftar!', 'error');
      return;
    }

    const newUser = {
      nama_user: namaUser,
      password: password,
      role: role,
      has_password: Boolean(password)
    };
    usersDb.unshift(newUser);
  }

  saveUserDatabaseToStorage();
  syncUsersToCloud(usersDb);
  closeAddUserModal();
  renderUserDatabaseTable();
  showToast(isEdit ? `User (${namaUser}) Berhasil Diperbarui!` : `User Baru (${namaUser}) Berhasil Ditambahkan ke Database!`, 'success');
}

function deleteUser(namaUser) {
  if (namaUser === "Mochamad Fauzie, S.Gz") {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Aksi Ditolak',
        text: 'Admin Utama tidak dapat dihapus dari database!',
        confirmButtonColor: '#2563eb'
      });
    } else {
      showToast('Admin Utama tidak dapat dihapus!', 'error');
    }
    return;
  }

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Hapus User Database?',
      html: `Apakah Anda yakin ingin menghapus User <strong>[${namaUser}]</strong> dari Database?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus User!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        usersDb = usersDb.filter(u => u.nama_user !== namaUser);
        saveUserDatabaseToStorage();
        deleteUserFromCloud(namaUser);
        renderUserDatabaseTable();
        populateUserDropdowns();
        Swal.fire('Terhapus!', `User ${namaUser} Berhasil Dihapus dari Database.`, 'success');
      }
    });
  } else if (confirm(`Apakah Anda yakin ingin menghapus User [${namaUser}] dari Database?`)) {
    usersDb = usersDb.filter(u => u.nama_user !== namaUser);
    saveUserDatabaseToStorage();
    deleteUserFromCloud(namaUser);
    renderUserDatabaseTable();
    populateUserDropdowns();
    showToast(`User ${namaUser} Berhasil Dihapus!`, 'success');
  }
}

async function handleFormSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const belumPunyaNik = document.getElementById('belum_punya_nik')?.checked || false;
  let nik = (document.getElementById('nik')?.value || '').replace(/\D/g, '').trim();
  const nama = (document.getElementById('nama')?.value || '').trim();
  const tanggalLahir = (document.getElementById('tanggal_lahir')?.value || '').trim();
  const alamat = (document.getElementById('alamat')?.value || '').trim();
  const bb = parseFloat(document.getElementById('bb')?.value) || 0;
  const tb = parseFloat(document.getElementById('tb')?.value) || 0;

  // Smart Validation with automatic step switching
  if (!belumPunyaNik) {
    if (!nik || nik.length !== 16) {
      currentWizardStep = 2;
      updateWizardUI();
      showToast('NIK Pasien WAJIB tepat 16 digit angka! (Saat ini: ' + nik.length + ' digit)', 'error');
      setTimeout(() => document.getElementById('nik')?.focus(), 100);
      return;
    }
  } else {
    nik = ''; // Belum punya NIK
  }

  if (!nama) {
    currentWizardStep = 2;
    updateWizardUI();
    showToast('Nama Lengkap Pasien wajib diisi!', 'error');
    setTimeout(() => document.getElementById('nama')?.focus(), 100);
    return;
  }

  if (!tanggalLahir) {
    currentWizardStep = 2;
    updateWizardUI();
    showToast('Tanggal Lahir Pasien wajib diisi!', 'error');
    setTimeout(() => document.getElementById('tanggal_lahir')?.focus(), 100);
    return;
  }

  if (!alamat) {
    currentWizardStep = 2;
    updateWizardUI();
    showToast('Alamat Lengkap Pasien wajib diisi!', 'error');
    setTimeout(() => document.getElementById('alamat')?.focus(), 100);
    return;
  }

  // Validasi Data Wali untuk Balita & Prasekolah
  const katSasaran = getSelectedKategoriSasaran();
  const isWajibWali = (katSasaran === 'bayi_balita' || katSasaran === 'prasekolah');

  const nikWali = (document.getElementById('nik_wali')?.value || '').replace(/\D/g, '').trim();
  const namaWali = (document.getElementById('nama_wali')?.value || '').trim();
  const dobWali = (document.getElementById('tanggal_lahir_wali')?.value || '').trim();
  const jkWali = (document.getElementById('jenis_kelamin_wali')?.value || '').trim();
  let waWali = (document.getElementById('no_whatsapp_wali')?.value || '').trim();
  const isNomorSama = document.getElementById('wali_nomor_sama')?.checked;
  const waPasien = (document.getElementById('no_whatsapp')?.value || '').trim();

  if (isNomorSama && !waWali && waPasien) {
    waWali = waPasien;
  }

  const isTanpaWali = isWajibWali ? false : (document.getElementById('daftarkan_tanpa_wali')?.checked || false);

  if (isWajibWali || belumPunyaNik) {
    if (!nikWali || nikWali.length !== 16) {
      currentWizardStep = 2;
      updateWizardUI();
      showToast('Kategori ' + (katSasaran === 'bayi_balita' ? 'Bayi & Balita' : (katSasaran === 'prasekolah' ? 'Anak Prasekolah' : 'Pasien')) + ' WAJIB mengisi NIK Wali 16 digit angka!', 'error');
      setTimeout(() => document.getElementById('nik_wali')?.focus(), 100);
      return;
    }
    if (!namaWali) {
      currentWizardStep = 2;
      updateWizardUI();
      showToast('Nama Lengkap Wali wajib diisi!', 'error');
      setTimeout(() => document.getElementById('nama_wali')?.focus(), 100);
      return;
    }
    if (!dobWali) {
      currentWizardStep = 2;
      updateWizardUI();
      showToast('Tanggal Lahir Wali wajib diisi!', 'error');
      setTimeout(() => document.getElementById('tanggal_lahir_wali')?.focus(), 100);
      return;
    }
    if (!jkWali) {
      currentWizardStep = 2;
      updateWizardUI();
      showToast('Jenis Kelamin Wali wajib dipilih!', 'error');
      setTimeout(() => document.getElementById('jenis_kelamin_wali')?.focus(), 100);
      return;
    }
    if (!waWali) {
      currentWizardStep = 2;
      updateWizardUI();
      showToast('No. WhatsApp Wali wajib diisi!', 'error');
      setTimeout(() => document.getElementById('no_whatsapp_wali')?.focus(), 100);
      return;
    }
  } else if (!isTanpaWali && nikWali && nikWali.length !== 16) {
    currentWizardStep = 2;
    updateWizardUI();
    showToast('NIK Wali harus 16 digit angka jika diisi!', 'error');
    setTimeout(() => document.getElementById('nik_wali')?.focus(), 100);
    return;
  }

  const isCkgGratis = (currentInputTarget === 'ckg-gratis');

  if (!isCkgGratis) {
    if (!bb || bb <= 0) {
      currentWizardStep = 3;
      updateWizardUI();
      showToast('Berat Badan (BB) wajib diisi!', 'error');
      setTimeout(() => document.getElementById('bb')?.focus(), 100);
      return;
    }

    if (!tb || tb <= 0) {
      currentWizardStep = 3;
      updateWizardUI();
      showToast('Tinggi Badan (TB) wajib diisi!', 'error');
      setTimeout(() => document.getElementById('tb')?.focus(), 100);
      return;
    }
  }

  const targetDataset = isCkgGratis ? ckgGratisRecords : records;
  const existingRecord = currentEditingId ? targetDataset.find(r => r.id === currentEditingId) : null;

  const prefix = isCkgGratis ? 'CKG-G-2026-' : 'CKG-2026-';
  const isFromBankData = (document.getElementById('nik')?.dataset?.fromBankData === '1' || existingRecord?.from_bank_data === 1 || existingRecord?.is_bank_data === 1) ? 1 : 0;
  const formData = {
    id: currentEditingId || `${prefix}${String(targetDataset.length + 1).padStart(3, '0')}`,
    kategori_sasaran: katSasaran,
    kategori_umur: getKategoriUmur(parseInt(document.getElementById('usia')?.value) || 0, tanggalLahir),
    from_bank_data: isFromBankData,
    is_bank_data: isFromBankData,
    belum_punya_nik: belumPunyaNik ? 1 : 0,
    tanpa_wali: isTanpaWali ? 1 : 0,
    nik_wali: isTanpaWali ? '' : nikWali,
    nama_wali: isTanpaWali ? '' : namaWali,
    tanggal_lahir_wali: isTanpaWali ? '' : dobWali,
    jenis_kelamin_wali: isTanpaWali ? '' : jkWali,
    no_whatsapp_wali: waWali,
    wali_nomor_sama: isNomorSama ? 1 : 0,
    jenis_kegiatan: document.querySelector('input[name="jenis_kegiatan"]:checked')?.value || 'Luar Gedung',
    pos_lokasi: document.getElementById('pos_lokasi')?.value || '',
    nik: nik,
    nama: nama,
    tanggal_lahir: tanggalLahir,
    usia: parseInt(document.getElementById('usia')?.value) || 0,
    jenis_kelamin: document.getElementById('jenis_kelamin')?.value || 'L',
    no_whatsapp: document.getElementById('no_whatsapp')?.value || '',
    status_pernikahan: document.getElementById('status_pernikahan')?.value || 'MENIKAH',
    provinsi: document.getElementById('provinsi')?.value || 'Jawa Barat',
    kab_kota: document.getElementById('kab_kota')?.value || 'Kabupaten Bandung',
    kecamatan: document.getElementById('kecamatan')?.value || 'Banjaran',
    kelurahan: document.getElementById('kelurahan')?.value || 'Banjaran Kota',
    alamat: alamat,
    pekerjaan: document.getElementById('pekerjaan')?.value || '',
    merokok: isCkgGratis ? (existingRecord?.merokok || 'Tidak') : (document.querySelector('input[name="merokok"]:checked')?.value || 'Tidak'),
    bb: isCkgGratis ? (existingRecord?.bb || 0) : bb,
    tb: isCkgGratis ? (existingRecord?.tb || 0) : tb,
    lp: isCkgGratis ? (existingRecord?.lp || 0) : (parseFloat(document.getElementById('lp')?.value) || 0),
    imt: isCkgGratis ? (existingRecord?.imt || 0) : (parseFloat(document.getElementById('imt')?.value) || 0),
    td_sistolik: isCkgGratis ? (existingRecord?.td_sistolik || 0) : (parseInt(document.getElementById('td_sistolik')?.value) || 0),
    td_diastolik: isCkgGratis ? (existingRecord?.td_diastolik || 0) : (parseInt(document.getElementById('td_diastolik')?.value) || 0),
    gula_darah: isCkgGratis ? (existingRecord?.gula_darah || 0) : (parseInt(document.getElementById('gula_darah')?.value) || 0),
    kolesterol: isCkgGratis ? (existingRecord?.kolesterol || 0) : (parseInt(document.getElementById('kolesterol')?.value) || 0),
    hb: isCkgGratis ? (existingRecord?.hb || 0) : (parseFloat(document.getElementById('hb')?.value) || 0),
    telinga: isCkgGratis ? (existingRecord?.telinga || 'Normal') : (document.getElementById('telinga')?.value || 'Normal'),
    mata: isCkgGratis ? (existingRecord?.mata || 'Normal') : (document.getElementById('mata')?.value || 'Normal'),
    gigi: isCkgGratis ? (existingRecord?.gigi || 'Baik') : (document.getElementById('gigi')?.value || 'Baik'),
    katarak: isCkgGratis ? (existingRecord?.katarak || 'Tidak') : (document.querySelector('input[name="katarak"]:checked')?.value || 'Tidak'),
    status_validasi: existingRecord ? (existingRecord.status_validasi || 'Terverifikasi') : 'Terverifikasi',
    created_by: existingRecord ? (existingRecord.created_by || 'Admin') : (sessionStorage.getItem('ckg_user_name') || currentRole || 'Admin'),
    petugas_entry: existingRecord ? (existingRecord.petugas_entry || 'Admin') : (sessionStorage.getItem('ckg_user_name') || currentRole || 'Admin'),
    created_at: existingRecord ? (existingRecord.created_at || new Date().toISOString().substring(0, 10)) : new Date().toISOString().substring(0, 10),
    tanggal_entry: new Date().toISOString().substring(0, 10),
    status_pendaftaran: existingRecord ? (existingRecord.status_pendaftaran || '') : '',
    status_pelayanan: existingRecord ? (existingRecord.status_pelayanan || '') : '',
    enco_pasien_id: existingRecord ? (existingRecord.enco_pasien_id || null) : null,
    in_bot_queue: existingRecord ? (existingRecord.in_bot_queue || 0) : 0,
    bot_queue_date: existingRecord ? (existingRecord.bot_queue_date || '') : ''
  };

  const isEdit = !!currentEditingId;

  // Show loading
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: isEdit ? 'Memperbarui Data Pasien...' : 'Menyimpan ke Cloud Database...',
      html: `<div style="font-size:13px;color:#475569;">Mengirim data ke Cloudflare D1 Database (${isCkgGratis ? 'CKG Gratis' : 'Records'})</div>`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
  }

  try {
    const apiEndpoint = isCkgGratis ? '/api/ckg-gratis' : '/api/ckg';
    const res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([formData])
    });

    if (!res.ok) {
      throw new Error('Server responded with status ' + res.status);
    }

    if (isCkgGratis) {
      if (currentEditingId) {
        const idx = ckgGratisRecords.findIndex(r => r.id === currentEditingId);
        if (idx !== -1) ckgGratisRecords[idx] = formData;
      } else {
        ckgGratisRecords.unshift(formData);
      }
      safeLocalStorageSet('ckg_gratis_records', JSON.stringify(ckgGratisRecords));
      if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_gratis_records', ckgGratisRecords);
      renderCkgGratisTable();
    } else {
      if (currentEditingId) {
        const idx = records.findIndex(r => r.id === currentEditingId);
        if (idx !== -1) records[idx] = formData;
      } else {
        records.unshift(formData);
      }
      safeLocalStorageSet('ckg_records', JSON.stringify(records));
      if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_records', records);
      renderApp();
      updateCloudSyncPill(true, `D1 Online (${records.length} Rec)`);
    }

    currentEditingId = null;
    closeInputModal();

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: isEdit ? 'Data Pasien Diperbarui!' : 'Data Berhasil Disimpan ke Cloud!',
        html: `Rekam medis pasien <strong>${formData.nama}</strong> (${formData.nik ? 'NIK: ' + formData.nik : 'Belum Punya NIK'}) telah tersimpan langsung ke <strong>Cloudflare D1 Database</strong>.`,
        confirmButtonColor: '#059669'
      });
    } else {
      showToast(isEdit ? 'Data Pasien Berhasil Diperbarui!' : 'Data Pasien Tersimpan ke Cloud D1!', 'success');
    }
  } catch (err) {
    console.error('Failed to save to cloud D1:', err);
    if (isCkgGratis) {
      if (currentEditingId) {
        const idx = ckgGratisRecords.findIndex(r => r.id === currentEditingId);
        if (idx !== -1) ckgGratisRecords[idx] = formData;
      } else {
        ckgGratisRecords.unshift(formData);
      }
      safeLocalStorageSet('ckg_gratis_records', JSON.stringify(ckgGratisRecords));
      if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_gratis_records', ckgGratisRecords);
      renderCkgGratisTable();
    } else {
      if (currentEditingId) {
        const idx = records.findIndex(r => r.id === currentEditingId);
        if (idx !== -1) records[idx] = formData;
      } else {
        records.unshift(formData);
      }
      safeLocalStorageSet('ckg_records', JSON.stringify(records));
      if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_records', records);
      renderApp();
    }
    currentEditingId = null;
    closeInputModal();

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Tersimpan Lokal (Offline)',
        text: 'Gagal terhubung ke Cloud Database. Perubahan data telah tersimpan di browser Anda.',
        confirmButtonColor: '#f59e0b'
      });
    }
  }
}

function resetFilters() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  const isPrivileged = (role === 'admin' || role === 'koordinator');
  const loggedUser = sessionStorage.getItem('ckg_user_name') || '';

  const s = document.getElementById('searchDataRecords');
  if (s) s.value = '';

  ['filterKegiatan', 'filterBulan', 'filterTahun', 'filterTanggal', 'filterPetugas', 'filterUmur', 'filterNik'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === 'filterPetugas' && !isPrivileged && loggedUser) {
        el.value = loggedUser;
      } else {
        el.value = '';
      }
    }
  });

  const lim = document.getElementById('filterRecordLimit');
  if (lim) lim.value = '10';

  applyPetugasFilterLock();
  renderTableRecords();
  showToast('Filter telah di-reset.', 'info');
}

let currentRekapFilter = 'semua';

function isRecordCreatedByOfficer(r, u) {
  if (!r || !u) return false;

  const recOfficerRaw = (r.petugas_entry || r.created_by || r.assigned_to || r.petugas || '').toString().trim().toLowerCase();
  if (!recOfficerRaw) return false;

  const namaUser = (u.nama_user || '').toString().trim().toLowerCase();
  const username = (u.username || '').toString().trim().toLowerCase();

  if (recOfficerRaw === namaUser || recOfficerRaw === username) return true;
  if (recOfficerRaw === `petugas_${username}` || recOfficerRaw === `petugas_${namaUser}`) return true;

  const cleanNamaUser = namaUser.split(',')[0].trim();
  const cleanRecOfficer = recOfficerRaw.split(',')[0].trim();

  if (cleanNamaUser && (cleanRecOfficer === cleanNamaUser || cleanRecOfficer.includes(cleanNamaUser) || cleanNamaUser.includes(cleanRecOfficer))) {
    return true;
  }
  if (username && (cleanRecOfficer.includes(username) || username.includes(cleanRecOfficer))) {
    return true;
  }

  return false;
}

function isLuarGedungRecord(r) {
  const jk = (r.jenis_kegiatan || r.kegiatan || '').toString().trim().toLowerCase();
  if (!jk) return true;
  return jk.includes('luar') || jk.includes('posyandu') || jk.includes('field') || jk === 'l';
}

function isDalamGedungRecord(r) {
  const jk = (r.jenis_kegiatan || r.kegiatan || '').toString().trim().toLowerCase();
  if (!jk) return false;
  return jk.includes('dalam') || (jk.includes('gedung') && !jk.includes('luar')) || jk.includes('puskesmas') || jk === 'd';
}

function isRecordInMonthYear(r, targetMonth, targetYear) {
  const tMonthNum = targetMonth ? parseInt(targetMonth, 10) : null;
  const tYearNum = targetYear ? parseInt(targetYear, 10) : null;

  if (!tMonthNum && !tYearNum) return true;

  const d = getRecordEntryDate(r);
  if (!d) return false;

  const rMonthNum = parseInt(d.month, 10);
  const rYearNum = parseInt(d.year, 10);

  if (tMonthNum && rMonthNum !== tMonthNum) return false;
  if (tYearNum && rYearNum !== tYearNum) return false;

  return true;
}

function getOfficerPerformanceData(monthFilter = null, yearFilter = null) {
  const mSelect = document.getElementById('dashBulan');
  const ySelect = document.getElementById('dashTahun');

  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(now.getFullYear());

  let selectedMonth = monthFilter;
  let selectedYear = yearFilter;

  if (selectedMonth === null) {
    if (mSelect && mSelect.value) {
      selectedMonth = mSelect.value;
    } else {
      selectedMonth = currentMonthStr;
      if (mSelect) mSelect.value = currentMonthStr;
    }
  }

  if (selectedYear === null) {
    if (ySelect && ySelect.value) {
      selectedYear = ySelect.value;
    } else {
      selectedYear = currentYearStr;
      if (ySelect) ySelect.value = currentYearStr;
    }
  }

  let filteredRecords = records.filter(r => isRecordInMonthYear(r, selectedMonth, selectedYear));

  const dashUmurVal = document.getElementById('dashUmur')?.value || '';
  if (dashUmurVal) {
    filteredRecords = filteredRecords.filter(r => isRecordInAgeCategory(r, dashUmurVal));
  }

  const dashKatVal = document.getElementById('dashKategori')?.value || '';
  if (dashKatVal) {
    filteredRecords = filteredRecords.filter(r => {
      const pel = String(r.jenis_pelayanan || r.pelayanan || r.jenis_kegiatan || '').toLowerCase();
      return dashKatVal === 'Luar Gedung' ? pel.includes('luar') : pel.includes('dalam');
    });
  }

  return usersDb.map(u => {
    const officerRecords = filteredRecords.filter(r => isRecordCreatedByOfficer(r, u));
    const ckgLuar = officerRecords.filter(r => isLuarGedungRecord(r)).length;
    const ckgDalam = officerRecords.filter(r => isDalamGedungRecord(r)).length;

    return {
      nama: u.nama_user,
      role: u.role || 'Petugas',
      luarCount: ckgLuar,
      dalamCount: ckgDalam
    };
  });
}

function filterRekapitulasi(type) {
  currentRekapFilter = type;

  const btnSemua = document.getElementById('btnRekapSemua');
  const btnLuar = document.getElementById('btnRekapLuar');
  const btnDalam = document.getElementById('btnRekapDalam');
  const thTotal = document.getElementById('thTotalEntriRekap');

  if (btnSemua) {
    btnSemua.className = `btn btn-sm ${type === 'semua' ? 'btn-primary' : 'btn-outline-primary'}`;
    btnSemua.style.background = type === 'semua' ? '' : '#ffffff';
    btnSemua.style.color = type === 'semua' ? '' : '#3b82f6';
  }
  if (btnLuar) {
    btnLuar.className = `btn btn-sm ${type === 'luar' ? 'btn-primary' : 'btn-outline-primary'}`;
    btnLuar.style.background = type === 'luar' ? '#0284c7' : '#ffffff';
    btnLuar.style.color = type === 'luar' ? '#ffffff' : '#0284c7';
    btnLuar.style.borderColor = '#0284c7';
  }
  if (btnDalam) {
    btnDalam.className = `btn btn-sm ${type === 'dalam' ? 'btn-primary' : 'btn-outline-primary'}`;
    btnDalam.style.background = type === 'dalam' ? '#059669' : '#ffffff';
    btnDalam.style.color = type === 'dalam' ? '#ffffff' : '#059669';
    btnDalam.style.borderColor = '#059669';
  }

  if (thTotal) {
    if (type === 'luar') thTotal.textContent = 'Total Luar';
    else if (type === 'dalam') thTotal.textContent = 'Total Dalam';
    else thTotal.textContent = 'Total Entri';
  }

  const officersData = getOfficerPerformanceData();
  renderOfficerPerformanceTable(officersData);
}

function renderApp() {
  updateRoleUI();
  const officersData = getOfficerPerformanceData();
  renderDashboardMetrics(officersData);
  renderOfficerPerformanceTable(officersData);
  renderTableRecords();
  if (typeof renderCkgGratisTable === 'function') renderCkgGratisTable();
  renderSimpusView();
  renderUserDatabaseTable();
  renderRecycleTable();
  updateTotalEntryMonthMetric();
  if (typeof initDashboardCharts === 'function') {
    initDashboardCharts(officersData);
  }
}

function renderDashboardMetrics(officersData = getOfficerPerformanceData()) {
  let totalLuar = 0;
  let totalDalam = 0;

  officersData.forEach(o => {
    totalLuar += o.luarCount;
    totalDalam += o.dalamCount;
  });

  const totalAll = totalLuar + totalDalam;
  const targetAchievedCount = officersData.filter(o => (o.luarCount + o.dalamCount) >= 200).length;

  const totalEl = document.getElementById('dashTotalEntri');
  const luarEl = document.getElementById('dashLuarGedung');
  const dalamEl = document.getElementById('dashDalamGedung');
  const targetEl = document.getElementById('dashCapaiTarget');

  if (totalEl) totalEl.textContent = totalAll.toLocaleString('id-ID');
  if (luarEl) luarEl.textContent = totalLuar.toLocaleString('id-ID');
  if (dalamEl) dalamEl.textContent = totalDalam.toLocaleString('id-ID');
  if (targetEl) targetEl.textContent = `${targetAchievedCount} / ${officersData.length}`;

  updateTotalEntryMonthMetric();
  renderTop3Leaderboard(officersData);
}

function renderTop3Leaderboard(officersData = getOfficerPerformanceData()) {
  const container = document.getElementById('top3RankContainer');
  if (!container) return;

  const sorted = [...officersData].map(o => ({
    ...o,
    total: o.luarCount + o.dalamCount
  })).sort((a, b) => b.total - a.total);

  const top3 = sorted.slice(0, 3);

  if (top3.length === 0 || sorted.every(o => o.total === 0)) {
    container.innerHTML = `
      <div style="text-align: center; padding: 32px; color: #94a3b8; font-size: 13px; background: #ffffff; border-radius: 16px; border: 1px dashed #cbd5e1;">
        <i class="bi bi-trophy" style="font-size: 36px; display: block; margin-bottom: 8px; color: #cbd5e1;"></i>
        Belum ada data entri petugas pada periode bulan aktif ini.
      </div>
    `;
    return;
  }

  // Assign ranks
  const rank1 = top3[0];
  const rank2 = top3[1];
  const rank3 = top3[2];

  // Helper function to build officer podium card HTML
  const buildCardHtml = (item, rankNum) => {
    if (!item) return '<div style="flex: 1;"></div>';

    const initials = (item.nama || 'P').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    // Config based on Rank Number (1 = Gold, 2 = Silver, 3 = Bronze)
    const isRank1 = rankNum === 1;
    const isRank2 = rankNum === 2;

    const theme = isRank1 ? {
      pillBg: 'linear-gradient(135deg, #d97706, #b45309)',
      pillText: '🏆 JUARA 1 (RANK 1)',
      medalBadge: '1',
      medalBg: '#fef3c7',
      medalBorder: '#f59e0b',
      medalText: '#b45309',
      avatarBg: 'linear-gradient(135deg, #fef3c7, #fde68a)',
      avatarBorder: '#f59e0b',
      avatarText: '#78350f',
      ribbonText: '1st',
      cardBg: '#ffffff',
      cardBorder: '#f59e0b',
      cardShadow: '0 12px 28px rgba(245, 158, 11, 0.2)',
      nameColor: '#78350f',
      numColor: '#b45309',
      barColor: 'linear-gradient(90deg, #f59e0b, #d97706)',
      podiumBg: 'linear-gradient(180deg, #fde68a 0%, #f59e0b 100%)',
      podiumHeight: '42px',
      podiumBorder: '#d97706',
      offset: '-16px'
    } : isRank2 ? {
      pillBg: 'linear-gradient(135deg, #64748b, #475569)',
      pillText: '🥈 JUARA 2 (RANK 2)',
      medalBadge: '2',
      medalBg: '#f1f5f9',
      medalBorder: '#94a3b8',
      medalText: '#334155',
      avatarBg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
      avatarBorder: '#94a3b8',
      avatarText: '#334155',
      ribbonText: '2nd',
      cardBg: '#ffffff',
      cardBorder: '#cbd5e1',
      cardShadow: '0 8px 20px rgba(100, 116, 139, 0.12)',
      nameColor: '#334155',
      numColor: '#475569',
      barColor: 'linear-gradient(90deg, #94a3b8, #64748b)',
      podiumBg: 'linear-gradient(180deg, #e2e8f0 0%, #94a3b8 100%)',
      podiumHeight: '28px',
      podiumBorder: '#64748b',
      offset: '0px'
    } : {
      pillBg: 'linear-gradient(135deg, #ea580c, #c2410c)',
      pillText: '🥉 JUARA 3 (RANK 3)',
      medalBadge: '3',
      medalBg: '#ffedd5',
      medalBorder: '#fdba74',
      medalText: '#9a3412',
      avatarBg: 'linear-gradient(135deg, #ffedd5, #fed7aa)',
      avatarBorder: '#ea580c',
      avatarText: '#9a3412',
      ribbonText: '3rd',
      cardBg: '#ffffff',
      cardBorder: '#fdba74',
      cardShadow: '0 8px 20px rgba(234, 88, 12, 0.12)',
      nameColor: '#9a3412',
      numColor: '#c2410c',
      barColor: 'linear-gradient(90deg, #fb923c, #ea580c)',
      podiumBg: 'linear-gradient(180deg, #fed7aa 0%, #ea580c 100%)',
      podiumHeight: '18px',
      podiumBorder: '#ea580c',
      offset: '8px'
    };

    // Calculate max total for relative bar width
    const maxTotal = Math.max(rank1 ? rank1.total : 1, 1);
    const pct = Math.min(100, Math.round((item.total / maxTotal) * 100));

    return `
      <div class="podium-card-wrapper" style="display: flex; flex-direction: column; position: relative; margin-top: ${theme.offset}; transition: all 0.3s ease;">
        
        <!-- CARD BODY -->
        <div style="background: ${theme.cardBg}; border: 2px solid ${theme.cardBorder}; border-radius: 16px; padding: 16px; box-shadow: ${theme.cardShadow}; position: relative; display: flex; flex-direction: column; gap: 12px; z-index: 2;">
          
          <!-- TOP HEADER BADGES -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="background: ${theme.pillBg}; color: #ffffff; font-size: 10.5px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.3px; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
              ${theme.pillText}
            </span>

            <div style="width: 26px; height: 26px; border-radius: 50%; background: ${theme.medalBg}; border: 1.5px solid ${theme.medalBorder}; color: ${theme.medalText}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; box-shadow: 0 2px 4px rgba(0,0,0,0.06);">
              ${theme.medalBadge}
            </div>
          </div>

          <!-- OFFICER AVATAR & NAME -->
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="position: relative; flex-shrink: 0;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: ${theme.avatarBg}; border: 3px solid ${theme.avatarBorder}; color: ${theme.avatarText}; font-weight: 900; font-size: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
                ${initials}
              </div>
              <div style="position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); background: ${theme.avatarBorder}; color: #ffffff; font-size: 8.5px; font-weight: 900; padding: 1px 5px; border-radius: 8px; border: 1px solid #ffffff; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
                ${theme.ribbonText}
              </div>
            </div>

            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 14.5px; font-weight: 800; color: ${theme.nameColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.nama}">
                ${item.nama}
              </div>
              <div style="font-size: 11px; color: #64748b; font-weight: 600;">
                ${item.role || 'Petugas'}
              </div>
            </div>

            <div style="font-size: 24px; font-weight: 900; color: ${theme.numColor}; font-family: monospace; flex-shrink: 0;">
              ${item.total.toLocaleString('id-ID')}
            </div>
          </div>

          <!-- BOTTOM STATS CARD (TOTAL ENTRI BULAN INI) -->
          <div style="background: #f8fafc; border-radius: 10px; padding: 8px 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">
              <span>Total Entri Bulan Ini</span>
              <span style="color: ${theme.numColor}; font-size: 12px; font-weight: 900;">${item.total}</span>
            </div>

            <!-- Progress Bar -->
            <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
              <div style="width: ${pct}%; height: 100%; background: ${theme.barColor}; border-radius: 4px; transition: width 0.5s ease;"></div>
            </div>

            <div style="font-size: 11px; color: #475569; display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
              <span>📋 Luar: <strong>${item.luarCount}</strong></span>
              <span>🏢 Dalam: <strong>${item.dalamCount}</strong></span>
            </div>
          </div>

        </div>

        <!-- 3D PODIUM BASE STEP -->
        <div style="background: ${theme.podiumBg}; height: ${theme.podiumHeight}; border-radius: 0 0 12px 12px; border-top: 2px solid ${theme.podiumBorder}; box-shadow: inset 0 2px 4px rgba(255,255,255,0.6); position: relative; margin-top: -6px; z-index: 1;">
        </div>

      </div>
    `;
  };

  container.innerHTML = `
    <div style="background: linear-gradient(135deg, #fefce8 0%, #fffbeb 50%, #fafaf9 100%); border-radius: 18px; border: 1px solid #fef08a; padding: 22px; box-shadow: 0 10px 30px rgba(245, 158, 11, 0.08); position: relative; overflow: hidden;">
      
      <!-- Subtle Background Confetti Watermark Pattern -->
      <div style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none; background-image: radial-gradient(#f59e0b 0.8px, transparent 0.8px); background-size: 24px 24px; opacity: 0.12;"></div>

      <!-- HEADER TITLE BAR -->
      <div style="position: relative; z-index: 2; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);">
            <i class="bi bi-trophy-fill"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #1e293b;">Peringkat Petugas Tergas Terbanyak <span style="font-weight: 600; font-size: 13.5px; color: #64748b;">(Top 3 Batch Bulan Ini)</span></h3>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Top 3 Petugas Puskesmas dengan jumlah entri data CKG terbanyak pada bulan aktif</p>
          </div>
        </div>

        <span style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px;">
          <i class="bi bi-stars"></i> Leaderboard CKG
        </span>
      </div>

      <!-- 3D PODIUM GRID LAYOUT: Rank 2 (Left) | Rank 1 (Center Elevated) | Rank 3 (Right) -->
      <div style="position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 18px; align-items: flex-end;">
        ${buildCardHtml(rank2, 2)}
        ${buildCardHtml(rank1, 1)}
        ${buildCardHtml(rank3, 3)}
      </div>

    </div>
  `;
}

function updateTotalEntryMonthMetric() {
  const totalEl = document.getElementById('totalEntryMonth');
  if (!totalEl) return;

  const now = new Date();
  const yearStr = now.getFullYear().toString();
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');

  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  const loggedUser = (sessionStorage.getItem('ckg_user_name') || '').trim().toLowerCase();
  const isPrivileged = (role === 'admin' || role === 'koordinator');

  // Count ONLY records from Data Record CKG (getVisibleRecords(records)) for the current calendar month
  let currentMonthRecords = getVisibleRecords(records).filter(r => isRecordInMonthYear(r, monthStr, yearStr));

  // If user is 'Petugas', count strictly their own entries (per user) for the active month
  if (!isPrivileged && loggedUser) {
    currentMonthRecords = currentMonthRecords.filter(r => {
      const pEntry = (r.petugas_entry || '').toLowerCase().trim();
      const cBy = (r.created_by || '').toLowerCase().trim();
      return pEntry === loggedUser || pEntry.includes(loggedUser) || cBy === loggedUser || cBy === `petugas_${loggedUser}`;
    });
  }

  totalEl.textContent = currentMonthRecords.length.toLocaleString('id-ID');
}

function renderOfficerPerformanceTable(officersData = getOfficerPerformanceData()) {
  const tbody = document.getElementById('officerPerformanceTableBody');
  if (!tbody) return;

  const targetMin = 200;
  let displayData = [...officersData];

  if (currentRekapFilter === 'luar') {
    displayData.sort((a, b) => b.luarCount - a.luarCount);
  } else if (currentRekapFilter === 'dalam') {
    displayData.sort((a, b) => b.dalamCount - a.dalamCount);
  } else {
    displayData.sort((a, b) => (b.luarCount + b.dalamCount) - (a.luarCount + a.dalamCount));
  }

  tbody.innerHTML = displayData.map((o, index) => {
    let displayTotal = o.luarCount + o.dalamCount;
    if (currentRekapFilter === 'luar') displayTotal = o.luarCount;
    if (currentRekapFilter === 'dalam') displayTotal = o.dalamCount;

    const pctLuar = Math.round((o.luarCount / targetMin) * 100);
    const pctDalam = Math.round((o.dalamCount / targetMin) * 100);
    const valColor = currentRekapFilter === 'luar' ? '#0284c7' : (currentRekapFilter === 'dalam' ? '#059669' : 'var(--primary)');

    return `
      <tr>
        <td style="text-align: center; font-weight: 700; color: #475569;">${index + 1}</td>
        <td><strong>${o.nama}</strong></td>
        <td>
          <div class="progress-cell">
            <div class="progress-track">
              <div class="progress-fill fill-blue" style="width: ${Math.min(pctLuar, 100)}%;"></div>
            </div>
            <span class="progress-text">${pctLuar}% (${o.luarCount}/${targetMin})</span>
          </div>
        </td>
        <td>
          <div class="progress-cell">
            <div class="progress-track">
              <div class="progress-fill fill-emerald" style="width: ${Math.min(pctDalam, 100)}%;"></div>
            </div>
            <span class="progress-text">${pctDalam}% (${o.dalamCount}/${targetMin})</span>
          </div>
        </td>
        <td style="text-align: right;">
          <strong style="font-size: 14px; color: ${valColor};">${displayTotal.toLocaleString('id-ID')}</strong>
        </td>
      </tr>
    `;
  }).join('');
}

function renderUserDatabaseTable() {
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;

  sortUsersDbByRoleHierarchy();

  const activeUser = sessionStorage.getItem('ckg_user_name');

  tbody.innerHTML = usersDb.map((u, i) => {
    const isCurrentActive = activeUser === u.nama_user;

    let roleBadge = `<span class="badge badge-emerald">${u.role}</span>`;
    if (u.role === 'Admin') roleBadge = `<span class="badge badge-rose">Admin</span>`;
    if (u.role === 'Koordinator') roleBadge = `<span class="badge badge-amber">Koordinator</span>`;

    const safeNama = u.nama_user.replace(/'/g, "\\'");

    // Live session calculation
    const sessInfo = activeSessionsMap[u.nama_user] || {};
    const now = Date.now();
    const isLiveActive = (sessInfo.status === 'active') && (sessInfo.last_seen && (now - Number(sessInfo.last_seen)) < 90000);
    const isOnline = isCurrentActive || isLiveActive;

    let sessionStatusHtml = isOnline ? `
      <span class="badge" style="display:inline-flex; align-items:center; gap:6px; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-weight:600; padding:4px 10px; border-radius:20px; font-size:11.5px;">
        <span style="width:8px; height:8px; background:#10b981; border-radius:50%; display:inline-block; animation:pulseDot 1.5s infinite;"></span>
        Live Session Aktif
      </span>
    ` : `
      <span class="badge" style="display:inline-flex; align-items:center; gap:6px; background:#f8fafc; color:#64748b; border:1px solid #e2e8f0; font-weight:500; padding:4px 10px; border-radius:20px; font-size:11.5px;">
        <i class="bi bi-circle-fill" style="font-size:6px; color:#94a3b8;"></i> Offline
      </span>
    `;

    if (u.is_banned) {
      sessionStatusHtml = `<span class="badge badge-rose" style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca;"><i class="bi bi-slash-circle-fill"></i> Banned (${u.banned_duration_label || 'Nonaktif'})</span>`;
    }

    const hasPassword = Boolean(u.has_password || (u.password && String(u.password).trim().length > 0));

    const passwordDisplayHtml = hasPassword ? `
      <span class="badge" style="display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-weight: 600; padding: 4px 10px; border-radius: 20px; font-size: 11.5px;">
        <i class="bi bi-shield-lock-fill" style="color: #2563eb;"></i> Terproteksi
      </span>
    ` : '<span style="font-size: 11px; color: var(--text-muted); font-style: italic;">Tanpa Password</span>';

    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${u.nama_user}</strong></td>
        <td>${passwordDisplayHtml}</td>
        <td>${roleBadge}</td>
        <td>${sessionStatusHtml}</td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-amber btn-sm" onclick="openEditUserModal('${safeNama}')" title="Edit User">
              <i class="bi bi-pencil-square"></i> Edit
            </button>
            ${u.nama_user !== "Mochamad Fauzie, S.Gz" ? (
        u.is_banned ? `
                <button class="btn btn-emerald btn-sm" onclick="unbanUser('${safeNama}')" title="Buka Blokir">
                  <i class="bi bi-unlock-fill"></i> Unban
                </button>
              ` : `
                <button class="btn btn-rose btn-sm" onclick="openBanUserModal('${safeNama}')" style="background: #dc2626; color: #fff;" title="Blokir User">
                  <i class="bi bi-slash-circle-fill"></i> Blokir
                </button>
              `
      ) : ''}
            ${u.nama_user !== "Mochamad Fauzie, S.Gz" ? `
              <button class="btn btn-danger btn-sm" onclick="deleteUser('${safeNama}')" title="Hapus User">
                <i class="bi bi-trash"></i> Hapus
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openBanUserModal(namaUser) {
  if (namaUser === "Mochamad Fauzie, S.Gz") {
    Swal.fire({
      icon: 'error',
      title: 'Aksi Ditolak',
      text: 'Admin Utama tidak dapat dibanned/dinonaktifkan!',
      confirmButtonColor: '#2563eb'
    });
    return;
  }

  Swal.fire({
    title: 'Blokir / Nonaktifkan User',
    html: `
      <div style="text-align: left; font-size: 13px;">
        <p style="margin-bottom: 12px; font-weight:600;">Pilih durasi penonaktifan akun untuk <strong>${namaUser}</strong>:</p>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <input type="radio" name="banDuration" value="1d" checked> <strong>1 Hari</strong> (24 Jam)
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <input type="radio" name="banDuration" value="3d"> <strong>3 Hari</strong>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <input type="radio" name="banDuration" value="7d"> <strong>7 Hari</strong>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <input type="radio" name="banDuration" value="30d"> <strong>30 Hari</strong>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: #fef2f2; padding: 8px 12px; border-radius: 6px; border: 1px solid #fecaca; color: #dc2626;">
            <input type="radio" name="banDuration" value="permanent"> <strong>Permanen</strong> (Selamanya)
          </label>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Proses Blokir',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    preConfirm: () => {
      const selected = document.querySelector('input[name="banDuration"]:checked');
      if (!selected) {
        Swal.showValidationMessage('Pilih salah satu durasi blokir!');
        return false;
      }
      return selected.value;
    }
  }).then((result) => {
    if (result.isConfirmed) {
      const dur = result.value;
      const userObj = usersDb.find(u => u.nama_user === namaUser);
      if (!userObj) return;

      userObj.is_banned = true;
      const now = new Date();

      if (dur === '1d') {
        now.setDate(now.getDate() + 1);
        userObj.banned_until = now.toISOString();
        userObj.banned_duration_label = '1 Hari';
      } else if (dur === '3d') {
        now.setDate(now.getDate() + 3);
        userObj.banned_until = now.toISOString();
        userObj.banned_duration_label = '3 Hari';
      } else if (dur === '7d') {
        now.setDate(now.getDate() + 7);
        userObj.banned_until = now.toISOString();
        userObj.banned_duration_label = '7 Hari';
      } else if (dur === '30d') {
        now.setDate(now.getDate() + 30);
        userObj.banned_until = now.toISOString();
        userObj.banned_duration_label = '30 Hari';
      } else {
        userObj.banned_until = 'PERMANENT';
        userObj.banned_duration_label = 'Permanen';
      }

      saveUserDatabaseToStorage();
      syncUsersToCloud(usersDb);
      renderUserDatabaseTable();

      Swal.fire({
        icon: 'success',
        title: 'User Berhasil Di-Blokir!',
        text: `User ${namaUser} telah dinonaktifkan dengan durasi: ${userObj.banned_duration_label}.`,
        confirmButtonColor: '#2563eb'
      });
    }
  });
}

function unbanUser(namaUser) {
  Swal.fire({
    title: 'Buka Blokir User?',
    html: `Apakah Anda yakin ingin mengaktifkan kembali akun User <strong>[${namaUser}]</strong>?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#059669',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Aktifkan!',
    cancelButtonText: 'Batal'
  }).then((result) => {
    if (result.isConfirmed) {
      const userObj = usersDb.find(u => u.nama_user === namaUser);
      if (userObj) {
        userObj.is_banned = false;
        userObj.banned_until = null;
        userObj.banned_duration_label = null;
        saveUserDatabaseToStorage();
        syncUsersToCloud(usersDb);
        renderUserDatabaseTable();
        Swal.fire('Berhasil!', `Akun ${namaUser} telah aktif kembali.`, 'success');
      }
    }
  });
}

function getRecordEntryDate(r) {
  const dStr = r.tanggal_entry || r.created_at || r.tanggal || '';
  if (!dStr && dStr !== 0) return null;
  const str = String(dStr).trim();
  if (!str || str === 'undefined' || str === 'null') return null;

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.substring(0, 10).split('-');
    return { year: parts[0], month: parts[1], day: parts[2], yyyymmdd: `${parts[0]}-${parts[1]}-${parts[2]}` };
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(str)) {
    const parts = str.split(/[\/-]/);
    const day = String(parts[0]).padStart(2, '0');
    const month = String(parts[1]).padStart(2, '0');
    const year = parts[2];
    return { year, month, day, yyyymmdd: `${year}-${month}-${day}` };
  }

  // Handle Excel serial date numbers
  if (/^\d{4,5}$/.test(str)) {
    const serial = parseInt(str, 10);
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    if (!isNaN(date_info.getTime())) {
      const year = String(date_info.getFullYear());
      const month = String(date_info.getMonth() + 1).padStart(2, '0');
      const day = String(date_info.getDate()).padStart(2, '0');
      return { year, month, day, yyyymmdd: `${year}-${month}-${day}` };
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = String(parsed.getFullYear());
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return { year, month, day, yyyymmdd: `${year}-${month}-${day}` };
  }

  return null;
}

function renderTableRecords() {
  const tbody = document.getElementById('tableBodyDataRecords');
  if (!tbody) return;

  applyPetugasFilterLock();

  const filterKegiatanVal = document.getElementById('filterKegiatan')?.value || '';
  const filterBulanVal = document.getElementById('filterBulan')?.value || '';
  const filterTahunVal = document.getElementById('filterTahun')?.value || '';
  const filterTanggalVal = document.getElementById('filterTanggal')?.value || '';
  const filterPetugasVal = document.getElementById('filterPetugas')?.value || '';
  const filterUmurVal = document.getElementById('filterUmur')?.value || '';
  const filterNikVal = document.getElementById('filterNik')?.value || '';

  // Apply Row-Level Data Visibility (Petugas only sees own records; Admin & Koordinator see all)
  let filtered = getVisibleRecords(records);

  if (filterKegiatanVal) {
    filtered = filtered.filter(r => r.jenis_kegiatan === filterKegiatanVal);
  }

  if (filterBulanVal) {
    filtered = filtered.filter(r => {
      const recDate = getRecordEntryDate(r);
      return recDate ? recDate.month === filterBulanVal : false;
    });
  }

  if (filterTahunVal) {
    filtered = filtered.filter(r => {
      const recDate = getRecordEntryDate(r);
      return recDate ? recDate.year === filterTahunVal : false;
    });
  }

  if (filterTanggalVal) {
    filtered = filtered.filter(r => {
      const recDate = getRecordEntryDate(r);
      return recDate ? recDate.yyyymmdd === filterTanggalVal : false;
    });
  }

  if (filterPetugasVal) {
    filtered = filtered.filter(r => r.created_by === filterPetugasVal || r.petugas_entry === filterPetugasVal);
  }

  if (filterUmurVal) {
    filtered = filtered.filter(r => isRecordInAgeCategory(r, filterUmurVal));
  }

  if (filterNikVal === '16_digit') {
    filtered = filtered.filter(r => isNik16Digit(r.nik));
  } else if (filterNikVal === 'non_16_digit') {
    filtered = filtered.filter(r => !isNik16Digit(r.nik));
  }

  const searchQuery = document.getElementById('searchDataRecords')?.value.trim().toLowerCase() || '';
  if (searchQuery) {
    filtered = filtered.filter(r => {
      const nama = (r.nama || '').toLowerCase();
      const nik = String(r.nik || '').toLowerCase();
      const alamat = (r.alamat || '').toLowerCase();
      const petugas = (r.petugas_entry || r.created_by || '').toLowerCase();
      const pos = (r.pos_lokasi || '').toLowerCase();
      const kegiatan = (r.jenis_kegiatan || '').toLowerCase();
      return nama.includes(searchQuery) || nik.includes(searchQuery) || alamat.includes(searchQuery) || petugas.includes(searchQuery) || pos.includes(searchQuery) || kegiatan.includes(searchQuery);
    });
  }

  const limitVal = document.getElementById('filterRecordLimit')?.value || '10';
  let displayFiltered = filtered;
  if (limitVal !== 'semua') {
    const limitNum = parseInt(limitVal) || 10;
    displayFiltered = filtered.slice(0, limitNum);
  }

  tbody.innerHTML = buildTableRowsHtml(displayFiltered);

  const totalBulanBadge = document.getElementById('totalEntryBulanText');
  if (totalBulanBadge) {
    totalBulanBadge.textContent = `Total Entry Bulan Ini: ${filtered.length}`;
  }

  // Auto-sync Cek Kesehatan Gratis view if present
  const ckgGratisPanel = document.getElementById('view-ckg-gratis');
  if (ckgGratisPanel && ckgGratisPanel.classList.contains('active')) {
    renderCkgGratisTable();
  }
}

function formatDisplayDate(val) {
  if (!val && val !== 0) return '-';
  val = String(val).trim();
  if (!val || val === 'undefined' || val === 'null') return '-';

  // Handle Excel serial date numbers (e.g. 24959 -> 15-05-1968)
  if (/^\d{4,5}$/.test(val)) {
    const serial = parseInt(val, 10);
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    if (!isNaN(date_info.getTime())) {
      const d = String(date_info.getDate()).padStart(2, '0');
      const m = String(date_info.getMonth() + 1).padStart(2, '0');
      const y = date_info.getFullYear();
      return `${d}-${m}-${y}`;
    }
  }

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
    const parts = val.substring(0, 10).split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(val)) {
    const parts = val.split(/[\/-]/);
    const d = String(parts[0]).padStart(2, '0');
    const m = String(parts[1]).padStart(2, '0');
    return `${d}-${m}-${parts[2]}`;
  }

  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${d}-${m}-${y}`;
  }

  return val;
}

function buildTableRowsHtml(data) {
  if (data.length === 0) {
    return `
      <tr>
        <td colspan="15" style="text-align: center; padding: 30px; color: var(--text-muted);">
          <i class="bi bi-inbox" style="font-size: 28px; display: block; margin-bottom: 6px;"></i>
          Tidak ada data CKG yang sesuai dengan filter yang dipilih.
        </td>
      </tr>
    `;
  }

  return data.map((r, i) => {
    const isHipertensi = r.td_sistolik > 140 || r.td_diastolik > 90;
    const isGulaTinggi = r.gula_darah > 200;
    const isAnemia = r.hb > 0 && r.hb < 11.0;

    const trClass = isHipertensi ? 'tr-alert-hipertensi' : '';
    const tdClass = isHipertensi ? 'cell-hipertensi' : '';
    const gulaClass = isGulaTinggi ? 'cell-gula-tinggi' : '';
    const hbClass = isAnemia ? 'cell-anemia' : '';

    let imtBadge = `<span class="badge badge-emerald">${r.imt}</span>`;
    if (r.imt < 18.5) imtBadge = `<span class="badge badge-amber">${r.imt} (Kurus)</span>`;
    else if (r.imt >= 25.0 && r.imt <= 29.9) imtBadge = `<span class="badge badge-amber">${r.imt} (Gemuk)</span>`;
    else if (r.imt >= 30.0) imtBadge = `<span class="badge badge-rose">${r.imt} (Obesitas)</span>`;

    const kegiatanBadge = r.jenis_kegiatan === 'Luar Gedung'
      ? `<span class="badge badge-cyan"><i class="bi bi-geo-alt-fill"></i> Luar Gedung</span>`
      : `<span class="badge badge-emerald"><i class="bi bi-building-fill"></i> Dalam Gedung</span>`;

    const cleanRecNik = String(r.nik || '').replace(/\D/g, '');
    const isInEncoCacheRec = typeof encoState !== 'undefined' && Array.isArray(encoState.cachedRecords) && encoState.cachedRecords.some(ep => cleanRecNik && String(ep.nik || '').replace(/\D/g, '') === cleanRecNik);
    const isPernahRec = r.status_pelayanan === 'Pernah Input' || (r.enco_status_pelayanan && r.enco_status_pelayanan.toLowerCase().includes('pernah'));
    const isBankDataOrAsikRec = !!(
      r.is_bank_data == 1 ||
      r.from_bank_data == 1 ||
      r.enco_pasien_id ||
      isInEncoCacheRec ||
      isPernahRec ||
      (r.status_pelayanan && (r.status_pelayanan.toLowerCase().includes('selesai') || r.status_pelayanan.toLowerCase().includes('pernah'))) ||
      (r.status_pendaftaran && (r.status_pendaftaran.toLowerCase().includes('terdaftar') || r.status_pendaftaran.toLowerCase().includes('berhasil')))
    );

    return `
      <tr class="${trClass}">
        <td style="text-align: center;">
          <div style="display: flex; gap: 4px; justify-content: center;">
            <button class="btn btn-secondary btn-sm" onclick="viewDetailModal('${r.id}')" title="Detail">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-cyan btn-sm" onclick="editRecord('${r.id}')" title="Edit">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteRecord('${r.id}')" title="Hapus ke Tempat Sampah">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
        <td style="text-align: center; font-weight: bold;">${i + 1}</td>
        <td>
          <span style="font-size: 12px; font-weight: 700; color: #0284c7; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; display: inline-flex; align-items: center; gap: 4px;" onclick="promptChangeSingleRecordDate('${r.id}')" title="Klik untuk mengubah Tanggal Entry pasien ini">
            <i class="bi bi-pencil-square" style="font-size: 11px; opacity: 0.85;"></i>${formatDisplayDate(r.tanggal_entry || r.created_at)}
          </span>
        </td>
        <td>${kegiatanBadge}</td>
        <td>
          <div style="display: inline-flex; align-items: center; gap: 5px; flex-wrap: wrap;">
            <strong>${r.nama}</strong>
            ${isBankDataOrAsikRec ? `<i class="bi bi-check-circle-fill" style="color: #10b981; font-size: 13.5px; line-height: 1; flex-shrink: 0;" title="Terdaftar di Bank Data ASIK"></i>` : ''}
            ${isPernahRec ? `<span class="badge" style="background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; font-size: 9.5px; font-weight: 800; padding: 1px 5px; border-radius: 4px;"><i class="bi bi-clock-history"></i> Pernah Input</span>` : ''}
          </div><br>
          ${isNik16Digit(r.nik)
        ? `<span style="font-size: 11px; color: var(--text-muted); font-family: monospace;">${r.nik}</span>`
        : `<span style="font-size: 11px; color: #dc2626; font-weight: 700; font-family: monospace;">${r.nik || '-'} <span class="badge badge-rose" style="font-size: 9px; padding: 1px 5px;" title="NIK bukan 16 digit"><i class="bi bi-exclamation-triangle-fill"></i> ${String(r.nik || '').replace(/\D/g, '').length ? String(r.nik || '').replace(/\D/g, '').length + ' Digit' : 'NIK Kosong'}</span></span>`
      }
        </td>
        <td>${formatDateToYYYYMMDD(r.tanggal_lahir)}<br><span style="font-size: 11px; color: var(--text-muted);">${r.usia} th (${r.jenis_kelamin})</span></td>
        <td>${r.alamat}<br><span style="font-size: 11px; color: var(--text-muted);">${r.kelurahan}, ${r.kecamatan}</span></td>
        <td>${r.bb} kg / ${r.tb} cm / ${r.lp || '-'} cm</td>
        <td>${imtBadge}</td>
        <td><span class="${tdClass}">${r.td_sistolik}/${r.td_diastolik}</span></td>
        <td><span class="${gulaClass}">${r.gula_darah ? r.gula_darah + ' mg/dL' : '-'}</span></td>
        <td>${r.kolesterol ? r.kolesterol + ' mg/dL' : '-'}</td>
        <td><span class="${hbClass}">${r.hb ? r.hb + ' g/dL' : '-'}</span></td>
        <td>${r.katarak === 'Ya' ? '<span class="badge badge-rose">Katarak</span>' : '<span class="badge badge-emerald">Normal</span>'}</td>
        <td><span class="badge badge-emerald">${r.status_validasi}</span></td>
      </tr>
    `;
  }).join('');
}


/* ==========================================================================
   🏥 VIEW: CEK KESEHATAN GRATIS (FORMAT TEMPLATE BOT ENCO)
   ========================================================================== */

function renderCkgGratisTable() {
  const tbody = document.getElementById('tableBodyCkgGratis');
  if (!tbody) return;

  applyPetugasFilterLock();

  const filterUsiaVal = document.getElementById('filterCkgGratisUsia')?.value || '';
  const filterMinAgeVal = document.getElementById('filterCkgGratisMinAge')?.value;
  const filterMaxAgeVal = document.getElementById('filterCkgGratisMaxAge')?.value;
  const filterMinAge = filterMinAgeVal !== '' ? parseInt(filterMinAgeVal) : NaN;
  const filterMaxAge = filterMaxAgeVal !== '' ? parseInt(filterMaxAgeVal) : NaN;

  const filterJkVal = document.getElementById('filterCkgGratisJk')?.value || '';
  const filterBulanVal = document.getElementById('filterCkgGratisBulan')?.value || '';
  const filterTahunVal = document.getElementById('filterCkgGratisTahun')?.value || '';
  const filterPetugasVal = document.getElementById('filterCkgGratisPetugas')?.value || '';
  const searchQuery = (document.getElementById('searchCkgGratis')?.value || '').trim().toLowerCase();

  let filtered = getVisibleRecords(ckgGratisRecords);

  // 1. Filter Usia (Kategori)
  if (filterUsiaVal) {
    if (filterUsiaVal === 'umum') {
      filtered = filtered.filter(r => {
        const age = parseInt(r.usia);
        if (!isNaN(age) && age >= 18) return true;
        const kat = String(r.kategori_sasaran || '').toLowerCase();
        return kat.includes('dewasa') || kat.includes('lansia');
      });
    } else {
      filtered = filtered.filter(r => isRecordInAgeCategory(r, filterUsiaVal));
    }
  }

  // 2. Filter Rentang Usia Cepat (Min - Max)
  if (!isNaN(filterMinAge)) {
    filtered = filtered.filter(r => {
      const age = parseInt(r.usia) || 0;
      return age >= filterMinAge;
    });
  }
  if (!isNaN(filterMaxAge)) {
    filtered = filtered.filter(r => {
      const age = parseInt(r.usia) || 0;
      return age <= filterMaxAge;
    });
  }

  // 3. Filter Jenis Kelamin (L / P)
  if (filterJkVal) {
    filtered = filtered.filter(r => {
      const jk = String(r.jenis_kelamin || '').toUpperCase();
      return jk.startsWith(filterJkVal);
    });
  }

  // 4. Filter Bulan
  if (filterBulanVal) {
    filtered = filtered.filter(r => {
      const recDate = getRecordEntryDate(r);
      return recDate ? recDate.month === filterBulanVal : false;
    });
  }

  // 5. Filter Tahun
  if (filterTahunVal) {
    filtered = filtered.filter(r => {
      const recDate = getRecordEntryDate(r);
      return recDate ? recDate.year === filterTahunVal : false;
    });
  }

  // 6. Filter Petugas
  if (filterPetugasVal) {
    filtered = filtered.filter(r => r.created_by === filterPetugasVal || r.petugas_entry === filterPetugasVal);
  }

  // 7. Search Query
  if (searchQuery) {
    filtered = filtered.filter(r => {
      const nama = (r.nama || '').toLowerCase();
      const nik = String(r.nik || '').toLowerCase();
      const alamat = (r.alamat || '').toLowerCase();
      const petugas = (r.petugas_entry || r.created_by || '').toLowerCase();
      const peker = (r.pekerjaan || '').toLowerCase();
      const kel = (r.kelurahan || '').toLowerCase();
      const kec = (r.kecamatan || '').toLowerCase();
      return nama.includes(searchQuery) || nik.includes(searchQuery) || alamat.includes(searchQuery) || petugas.includes(searchQuery) || peker.includes(searchQuery) || kel.includes(searchQuery) || kec.includes(searchQuery);
    });
  }

  // Update total badge
  const totalBadge = document.getElementById('badgeTotalCkgGratis');
  if (totalBadge) {
    totalBadge.textContent = `Total: ${filtered.length} Pasien`;
  }

  // Apply Responsive Pagination (Desktop: 10, Mobile/APK: 3, or dropdown limit)
  const isMobile = isMobileOrApkView();
  const defaultPageSize = isMobile ? 3 : 10;
  const limitVal = document.getElementById('filterCkgGratisLimit')?.value || '';
  let pageSize = defaultPageSize;
  if (limitVal && limitVal !== 'semua') {
    pageSize = parseInt(limitVal) || defaultPageSize;
  }

  const filterSig = `${filterUsiaVal}|${filterMinAgeVal}|${filterMaxAgeVal}|${filterJkVal}|${filterBulanVal}|${filterTahunVal}|${filterPetugasVal}|${searchQuery}|${limitVal}`;
  if (lastCkgGratisFilterSignature !== filterSig) {
    currentCkgGratisPage = 1;
    lastCkgGratisFilterSignature = filterSig;
  }

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (currentCkgGratisPage > totalPages) currentCkgGratisPage = totalPages;
  if (currentCkgGratisPage < 1) currentCkgGratisPage = 1;

  const startIndex = (currentCkgGratisPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pagedList = limitVal === 'semua' ? filtered : filtered.slice(startIndex, endIndex);

  tbody.innerHTML = buildCkgGratisRowsHtml(pagedList, startIndex);

  if (limitVal === 'semua' || totalItems === 0) {
    const pagContainer = document.getElementById('ckgGratisPaginationContainer');
    if (pagContainer) pagContainer.style.display = 'none';
  } else {
    renderCkgGratisPagination(totalItems, pageSize, currentCkgGratisPage, totalPages);
  }
}

function buildCkgGratisRowsHtml(list, startIndex = 0) {
  if (!list || list.length === 0) {
    return `
      <tr>
        <td colspan="6" style="text-align: center; padding: 50px 20px; color: #64748b;">
          <div style="width: 60px; height: 60px; margin: 0 auto 14px auto; background: linear-gradient(135deg, #ecfdf5, #d1fae5); color: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: 0 4px 14px rgba(5,150,105,0.12);">
            <i class="bi bi-inbox"></i>
          </div>
          <div style="font-weight: 800; font-size: 15px; color: #064e3b; margin-bottom: 4px;">Tidak Ada Data Cek Kesehatan Gratis</div>
          <div style="font-size: 13px; color: #64748b; max-width: 480px; margin: 0 auto 14px auto;">
            Gunakan tombol <strong>"+ Input Data CKG"</strong> untuk menginput data pasien baru atau <strong>"Import Data"</strong> untuk mengunggah file Excel.
          </div>
        </td>
      </tr>
    `;
  }

  const formatGenderBot = (val) => {
    const s = String(val || '').trim().toUpperCase();
    if (s.startsWith('L') || s.includes('LAKI')) return 'L';
    if (s.startsWith('P') || s.includes('PEREMPUAN')) return 'P';
    return 'L';
  };

  const formatNikahBot = (val) => {
    const s = String(val || '').trim().toLowerCase();
    if (s.includes('belum')) return 'BELUM MENIKAH';
    if (s.includes('mati')) return 'CERAI MATI';
    if (s.includes('hidup') || s.includes('cerai')) return 'CERAI HIDUP';
    if (s.includes('kawin') || s.includes('menikah') || s.includes('nikah')) return 'MENIKAH';
    return 'BELUM MENIKAH';
  };

  const formatWaBot = (val) => {
    let s = String(val || '').trim().replace(/\D/g, '');
    if (!s) return '-';
    if (s.startsWith('62')) s = '0' + s.slice(2);
    if (!s.startsWith('0')) s = '0' + s;
    return s;
  };

  return list.map((r, i) => {
    const cleanNik = String(r.nik || r.nik_pasien || '').replace(/\D/g, '');
    const is16 = cleanNik.length === 16;
    const isBelumPunyaNik = !!(r.belum_punya_nik || (!cleanNik && (r.nik_wali || r.nama_wali)));
    const jk = formatGenderBot(r.jenis_kelamin);
    const wa = formatWaBot(r.no_whatsapp);
    const statusNikah = formatNikahBot(r.status_pernikahan);
    const prov = String(r.provinsi || 'JAWA BARAT').trim().toUpperCase();
    const kab = String(r.kab_kota || 'KAB. BANDUNG').trim().toUpperCase();
    const kec = String(r.kecamatan || 'BANJARAN').trim().toUpperCase();
    const kel = String(r.kelurahan || 'BANJARAN KOTA').trim().toUpperCase();
    const alamat = String(r.alamat || 'BANJARAN').trim();
    const pekerjaan = String(r.pekerjaan || 'Lainnya').trim();
    const isMerokok = String(r.merokok || '').toLowerCase().includes('ya');

    const isHipertensi = r.td_sistolik > 140 || r.td_diastolik > 90;
    const isGulaTinggi = r.gula_darah > 200;
    const isAnemia = r.hb > 0 && r.hb < 11.0;

    const isBotPernahInput = !!(
      r.status_pelayanan === 'Pernah Input' ||
      r.status_pelayanan === 'already-screened' ||
      (r.enco_status_pelayanan && (r.enco_status_pelayanan.toLowerCase().includes('pernah') || r.enco_status_pelayanan === 'already-screened')) ||
      (r.keterangan && String(r.keterangan).toLowerCase().includes('pernah'))
    );
    const isBotSelesai = (r.status_pelayanan === 'Selesai Pelayanan' || r.status_pelayanan === 'selesai');
    const isBotTerdaftar = (r.status_pendaftaran === 'Sudah Terdaftar' || r.status_pendaftaran === 'berhasil');
    const isBotAntre = !!(r.in_bot_queue || r.bot_queue_date);
    const botStatusBadge = isBotPernahInput
      ? `<div style="margin-top: 3px;"><span class="badge" style="background: #f3e8ff; color: #7e22ce; font-weight: 800; font-size: 10px; border: 1.5px solid #d8b4fe; display: inline-flex; align-items: center; gap: 3px;"><i class="bi bi-clock-history"></i> Pernah Input</span></div>`
      : isBotSelesai
        ? `<div style="margin-top: 3px;"><span class="badge" style="background: #ecfdf5; color: #059669; font-weight: 800; font-size: 10px; border: 1px solid #a7f3d0; display: inline-flex; align-items: center; gap: 3px;"><i class="bi bi-robot"></i> Selesai Bot</span></div>`
        : isBotTerdaftar
          ? `<div style="margin-top: 3px;"><span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 10px; border: 1px solid #bae6fd; display: inline-flex; align-items: center; gap: 3px;"><i class="bi bi-robot"></i> Terdaftar Bot</span></div>`
          : isBotAntre
            ? `<div style="margin-top: 3px;"><span class="badge" style="background: #fef3c7; color: #b45309; font-weight: 800; font-size: 10px; border: 1px solid #fde68a; display: inline-flex; align-items: center; gap: 3px;"><i class="bi bi-hourglass-split"></i> Antre Bot</span></div>`
            : '';

    const isInEncoCache = typeof encoState !== 'undefined' && Array.isArray(encoState.cachedRecords) && encoState.cachedRecords.some(ep => cleanNik && String(ep.nik || '').replace(/\D/g, '') === cleanNik);
    const isFromBankData = !!(
      r.is_bank_data == 1 ||
      r.from_bank_data == 1 ||
      r.enco_pasien_id ||
      isInEncoCache
    );
    const isEntriBotAsik = !!(
      isBotSelesai ||
      isBotTerdaftar ||
      isBotPernahInput ||
      (r.status_pelayanan && (r.status_pelayanan.toLowerCase().includes('selesai') || r.status_pelayanan.toLowerCase().includes('pernah'))) ||
      (r.status_pendaftaran && (r.status_pendaftaran.toLowerCase().includes('terdaftar') || r.status_pendaftaran.toLowerCase().includes('berhasil'))) ||
      (r.enco_status_pendaftaran && (r.enco_status_pendaftaran.toLowerCase().includes('terdaftar') || r.enco_status_pendaftaran.toLowerCase().includes('berhasil'))) ||
      (r.enco_status_pelayanan && (r.enco_status_pelayanan.toLowerCase().includes('selesai') || r.enco_status_pelayanan.toLowerCase().includes('pernah')))
    );
    const showCentangHijau = isFromBankData || isEntriBotAsik;

    return `
      <tr>
        <td style="text-align: center; vertical-align: middle;"><input type="checkbox" class="chk-ckg-gratis-row" value="${r.id}" style="cursor: pointer; width: 15px; height: 15px; accent-color: #0284c7;"></td>
        <td style="text-align: center; font-weight: 700; color: #64748b; vertical-align: middle;">${startIndex + i + 1}</td>
        
        <!-- KOLOM 2: NAMA PASIEN & IDENTITAS -->
        <td style="vertical-align: middle;">
          <div style="font-weight: 800; font-size: 13.5px; color: #1e293b; margin-bottom: 3px; display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span>${r.nama || '-'}</span>
            ${showCentangHijau ? `<i class="bi bi-check-circle-fill" style="color: #10b981; font-size: 14px; line-height: 1; flex-shrink: 0;" title="Terdaftar di Bank Data ASIK / Selesai Entri Bot"></i>` : ''}
            ${isBotPernahInput ? `<span class="badge" style="background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; font-size: 10px; font-weight: 800; padding: 1.5px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;"><i class="bi bi-clock-history"></i> Pernah Input</span>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-bottom: 4px;">
            ${is16
        ? `<span class="badge" style="background: #e0f2fe; color: #0369a1; font-family: monospace; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px;"><i class="bi bi-card-text"></i> ${cleanNik}</span>`
        : isBelumPunyaNik
          ? `<span class="badge" style="background: #fffbeb; color: #b45309; border: 1.5px solid #fde68a; font-size: 10.5px; font-weight: 800; padding: 2px 7px; border-radius: 6px;"><i class="bi bi-person-slash"></i> Belum Ada NIK</span>`
          : `<span class="badge" style="background: #fee2e2; color: #dc2626; font-family: monospace; font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 6px;"><i class="bi bi-exclamation-triangle"></i> ${cleanNik || '-'}</span>`
      }
            <span class="badge ${jk === 'P' ? 'badge-rose' : 'badge-cyan'}" style="font-weight: 800; font-size: 10.5px; padding: 2px 7px;">${jk === 'P' ? 'P' : 'L'}</span>
            <span class="badge badge-slate" style="font-weight: 700; font-size: 10.5px; padding: 2px 7px;">${r.usia || 0} th</span>
          </div>
          <div style="font-size: 11.5px; color: #64748b;">
            <i class="bi bi-calendar3"></i> Lahir: <strong>${formatDateToYYYYMMDD(r.tanggal_lahir)}</strong>
            ${(r.nama_wali || r.nik_wali) ? `<span style="color: #b45309; margin-left: 5px;">• Wali: <strong>${r.nama_wali || r.nik_wali}</strong></span>` : ''}
          </div>
        </td>

        <!-- KOLOM 3: ALAMAT & KONTAK -->
        <td style="vertical-align: middle;">
          <div style="font-size: 12.5px; font-weight: 700; color: #1e293b; line-height: 1.3; margin-bottom: 2px;">
            <i class="bi bi-geo-alt-fill" style="color: #ef4444; font-size: 11.5px;"></i> ${alamat}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
            ${kel}, Kec. ${kec}
          </div>
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            ${wa && wa !== '-'
        ? `<span style="font-family: monospace; font-size: 11px; color: #059669; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="bi bi-whatsapp"></i> ${wa}</span>`
        : `<span style="font-size: 11px; color: #94a3b8;">-</span>`
      }
            <span class="badge badge-slate" style="font-size: 10px; padding: 1px 6px;">${statusNikah}</span>
            ${pekerjaan && pekerjaan !== 'Lainnya' ? `<span class="badge badge-slate" style="font-size: 10px; padding: 1px 6px;">${pekerjaan}</span>` : ''}
          </div>
        </td>

        <!-- KOLOM 4: HASIL PEMERIKSAAN MEDIS -->
        <td style="vertical-align: middle;">
          ${(r.bb > 0 || r.tb > 0 || r.lp > 0 || r.td_sistolik > 0 || r.gula_darah > 0 || r.kolesterol > 0 || r.hb > 0) ? `
          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 5px;">
            <span class="badge" style="background: #f8fafc; color: #334155; font-size: 11px; font-weight: 700; border: 1px solid #e2e8f0; padding: 3px 8px;">
              <i class="bi bi-speedometer2" style="color: #64748b;"></i> ${r.bb ? r.bb + ' kg' : '-'} / ${r.tb ? r.tb + ' cm' : '-'} / LP ${r.lp ? r.lp + ' cm' : '-'}
            </span>
            <span class="badge ${isHipertensi ? 'cell-hipertensi' : 'badge-slate'}" style="font-size: 11px; font-weight: 700; padding: 3px 8px;">
              <i class="bi bi-heart-pulse-fill" style="color: ${isHipertensi ? '#dc2626' : '#64748b'};"></i> TD: ${r.td_sistolik || '-'}/${r.td_diastolik || '-'}
            </span>
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="badge ${isGulaTinggi ? 'cell-gula-tinggi' : 'badge-emerald'}" style="font-size: 10.5px; font-weight: 700; padding: 2px 7px;">
              GDS: ${r.gula_darah || '-'}
            </span>
            <span class="badge badge-slate" style="font-size: 10.5px; font-weight: 700; padding: 2px 7px;">
              Koles: ${r.kolesterol || '-'}
            </span>
            <span class="badge ${isAnemia ? 'cell-anemia' : 'badge-slate'}" style="font-size: 10.5px; font-weight: 700; padding: 2px 7px;">
              HB: ${r.hb || '-'}
            </span>
            ${String(r.katarak || '').toLowerCase().includes('ya')
          ? `<span class="badge badge-rose" style="font-size: 10px; font-weight: 800; padding: 2px 7px;"><i class="bi bi-eye"></i> Katarak</span>`
          : `<span class="badge badge-slate" style="font-size: 10px; padding: 2px 6px;"><i class="bi bi-eye"></i> Mata Normal</span>`
        }
          </div>
          ` : `
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="badge" style="background: #fffbeb; color: #b45309; border: 1.5px solid #fde68a; font-size: 11px; font-weight: 800; padding: 4px 9px; border-radius: 6px; display: inline-flex; align-items: center; gap: 5px;">
              <i class="bi bi-hourglass-split"></i> Belum Diperiksa
            </span>
            <button type="button" class="btn btn-sm" onclick="openPemeriksaanCkgGratisModal('${r.id}')" style="padding: 2px 7px; font-size: 10.5px; font-weight: 700; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; border-radius: 5px; cursor: pointer;">
              + Input Medis
            </button>
          </div>
          `}
        </td>

        <!-- KOLOM 5: PETUGAS & TGL ENTRY -->
        <td style="vertical-align: middle;">
          <div style="font-weight: 700; font-size: 12px; color: #1e293b; display: flex; align-items: center; gap: 5px; margin-bottom: 2px;">
            <i class="bi bi-person-badge-fill" style="color: #0284c7;"></i> ${r.petugas_entry || r.created_by || '-'}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
            <i class="bi bi-clock"></i> ${formatDateToYYYYMMDD(r.tanggal_entry || r.created_at)}
          </div>
          <div>
            <span class="badge badge-emerald" style="font-size: 10px; font-weight: 700; padding: 2px 7px;">
              <i class="bi bi-check-circle-fill"></i> ${r.status_validasi || 'Terverifikasi'}
            </span>
            ${botStatusBadge}
          </div>
        </td>

        <!-- KOLOM 6: AKSI -->
        <td style="text-align: center; vertical-align: middle;">
          <div style="display: flex; gap: 4px; justify-content: center; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="openPemeriksaanCkgGratisModal('${r.id}')" title="Input / Edit Hasil Pemeriksaan Medis" style="padding: 5px 9px; font-weight: 700; font-size: 11px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; background: #0284c7; color: white; border: none; box-shadow: 0 2px 4px rgba(2,132,199,0.2);">
              <i class="bi bi-heart-pulse-fill"></i> Periksa
            </button>
            <button class="btn btn-secondary btn-sm" onclick="sendSingleCkgGratisToBotQueue('${r.id}')" title="Kirim Pasien Ini ke Antrean Bot ENCO" style="padding: 5px 8px; background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;">
              <i class="bi bi-robot"></i>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="viewDetailModal('${r.id}', 'ckg-gratis')" title="Detail Pasien" style="padding: 5px 8px;">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-cyan btn-sm" onclick="editCkgGratisRecord('${r.id}')" title="Edit Data Identitas Pasien" style="padding: 5px 8px;">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteCkgGratisRecord('${r.id}')" title="Hapus Data" style="padding: 5px 8px;">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function editCkgGratisRecord(id) {
  const r = ckgGratisRecords.find(item => item.id === id);
  if (!r) return;

  openInputModal(r.jenis_kegiatan, true, 'ckg-gratis');
  currentEditingId = id;

  const setVal = (fieldId, val) => {
    const el = document.getElementById(fieldId);
    if (el) el.value = val !== undefined && val !== null ? val : '';
  };

  setVal('pos_lokasi', r.pos_lokasi);

  const belumNikCb = document.getElementById('belum_punya_nik');
  const isBelumNik = !!(r.belum_punya_nik || (!r.nik && (r.nik_wali || r.nama_wali)));
  if (belumNikCb) {
    belumNikCb.checked = isBelumNik;
    toggleBelumPunyaNik(isBelumNik);
  }

  if (!isBelumNik) {
    setVal('nik', r.nik);
    const nikInputEl = document.getElementById('nik');
    if (nikInputEl) nikInputEl.dataset.fromBankData = String(r.from_bank_data || r.is_bank_data || 0);
    const cleanNikVal = String(r.nik || '').replace(/\D/g, '').slice(0, 16);
    const nikCountSpan = document.getElementById('nikCharCount');
    const nikHelpText = document.getElementById('nikHelpText');
    const nikBadge = document.getElementById('nikCounterBadge');
    if (nikCountSpan) nikCountSpan.textContent = cleanNikVal.length;
    if (cleanNikVal.length === 16) {
      if (nikHelpText) {
        nikHelpText.style.color = '#059669';
        nikHelpText.innerHTML = '<i class="bi bi-check-circle-fill"></i> NIK 16 digit lengkap & valid';
      }
      if (nikBadge) {
        nikBadge.style.background = '#ecfdf5';
        nikBadge.style.color = '#059669';
        nikBadge.style.borderColor = '#a7f3d0';
      }
    }
  }

  setVal('nama', r.nama);
  setVal('tanggal_lahir', formatDateToYYYYMMDD(r.tanggal_lahir));
  setVal('usia', r.usia);
  setVal('jenis_kelamin', r.jenis_kelamin);
  setVal('no_whatsapp', r.no_whatsapp);
  setVal('status_pernikahan', r.status_pernikahan || 'MENIKAH');
  setVal('pekerjaan', r.pekerjaan);

  setVal('bb', r.bb);
  setVal('tb', r.tb);
  setVal('lp', r.lp);
  setVal('imt', r.imt);
  setVal('td_sistolik', r.td_sistolik);
  setVal('td_diastolik', r.td_diastolik);
  setVal('gula_darah', r.gula_darah);
  setVal('kolesterol', r.kolesterol);
  setVal('hb', r.hb);
  setVal('telinga', r.telinga || 'Normal');
  setVal('mata', r.mata || 'Normal');
  setVal('gigi', r.gigi || 'Normal');

  if (r.katarak === 'Ya') {
    const el = document.getElementById('katarak_ya');
    if (el) el.checked = true;
  } else {
    const el = document.getElementById('katarak_tidak');
    if (el) el.checked = true;
  }

  setVal('nik_wali', r.nik_wali || '');
  setVal('nama_wali', r.nama_wali || '');
  setVal('tanggal_lahir_wali', formatDateToYYYYMMDD(r.tanggal_lahir_wali) || '');
  setVal('jenis_kelamin_wali', r.jenis_kelamin_wali || '');
  setVal('no_whatsapp_wali', r.no_whatsapp_wali || '');

  const tanpaWaliCb = document.getElementById('daftarkan_tanpa_wali');
  if (tanpaWaliCb) {
    tanpaWaliCb.checked = !!r.tanpa_wali;
    toggleTanpaWaliInputs(!!r.tanpa_wali);
  }

  let katRadioId = 'kat_dewasa';
  if (r.kategori_sasaran) {
    katRadioId = 'kat_' + r.kategori_sasaran;
  } else {
    const age = parseInt(r.usia) || 0;
    if (age <= 5) katRadioId = 'kat_bayi_balita';
    else if (age <= 6) katRadioId = 'kat_prasekolah';
    else if (age < 18) katRadioId = 'kat_sekolah_remaja';
    else if (age >= 60) katRadioId = 'kat_lansia';
  }
  const radEl = document.getElementById(katRadioId);
  if (radEl) radEl.checked = true;

  updateDataWaliVisibility();
  if (isBelumNik && belumNikCb) {
    belumNikCb.checked = true;
    toggleBelumPunyaNik(true);
  }

  setTimeout(() => {
    initWilayahDropdowns();
    setTimeout(() => {
      setVal('provinsi', r.provinsi || 'Jawa Barat');
      setVal('kab_kota', r.kab_kota || 'Kab. Bandung');
      setVal('kecamatan', r.kecamatan || 'Banjaran');
      setVal('kelurahan', r.kelurahan || 'Banjaran Kota');
      setVal('alamat', r.alamat || '');
      syncWilayahComboboxLabels();
    }, 50);
  }, 50);
}

/* ==========================================================================
   🩺 MODAL & ENGINE PEMERIKSAAN MEDIS PASIEN CKG GRATIS (FORMAT BOT ENCO)
   ========================================================================== */

let currentPemeriksaanId = null;

function openPemeriksaanCkgGratisModal(recordId) {
  const r = ckgGratisRecords.find(item => String(item.id) === String(recordId));
  if (!r) {
    showToast('Data pasien tidak ditemukan!', 'error');
    return;
  }

  currentPemeriksaanId = recordId;

  // Header banner info
  const nameEl = document.getElementById('periksaModalNama');
  const nikEl = document.getElementById('periksaModalNik');
  const jkUsiaEl = document.getElementById('periksaModalJkUsia');
  const katEl = document.getElementById('periksaModalKategori');
  const alamatEl = document.getElementById('periksaModalAlamat');

  if (nameEl) nameEl.textContent = r.nama || '-';
  if (nikEl) nikEl.textContent = r.nik ? r.nik : (r.belum_punya_nik ? 'Belum Ada NIK' : '-');
  if (jkUsiaEl) jkUsiaEl.textContent = `${r.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki'} • ${r.usia || 0} Tahun`;
  if (katEl) katEl.textContent = getKategoriLabel(r.kategori_sasaran || determineKategoriSasaran(r.tanggal_lahir)?.category || 'dewasa');
  if (alamatEl) alamatEl.textContent = `${r.alamat || '-'}, ${r.kelurahan || '-'}, Kec. ${r.kecamatan || '-'}`;

  // Populate Examination Fields
  const setInput = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = (val !== undefined && val !== null && val !== 0 && val !== '0') ? val : '';
  };

  setInput('pemeriksaan_bb', r.bb);
  setInput('pemeriksaan_tb', r.tb);
  setInput('pemeriksaan_lp', r.lp);
  setInput('pemeriksaan_td_sistolik', r.td_sistolik);
  setInput('pemeriksaan_td_diastolik', r.td_diastolik);
  setInput('pemeriksaan_gds', r.gula_darah);
  setInput('pemeriksaan_kolesterol', r.kolesterol);
  setInput('pemeriksaan_hb', r.hb);

  const mataEl = document.getElementById('pemeriksaan_mata');
  if (mataEl) mataEl.value = r.mata || 'Normal';

  const telingaEl = document.getElementById('pemeriksaan_telinga');
  if (telingaEl) telingaEl.value = r.telinga || 'Normal';

  const gigiEl = document.getElementById('pemeriksaan_gigi');
  if (gigiEl) gigiEl.value = r.gigi || 'Baik';

  const isKatarak = String(r.katarak || '').toLowerCase().includes('ya');
  const radKatarakYa = document.getElementById('pemeriksaan_katarak_ya');
  const radKatarakTidak = document.getElementById('pemeriksaan_katarak_tidak');
  if (radKatarakYa && radKatarakTidak) {
    if (isKatarak) radKatarakYa.checked = true;
    else radKatarakTidak.checked = true;
  }

  const isMerokok = String(r.merokok || '').toLowerCase().includes('ya');
  const radRokokYa = document.getElementById('pemeriksaan_rokok_ya');
  const radRokokTidak = document.getElementById('pemeriksaan_rokok_tidak');
  if (radRokokYa && radRokokTidak) {
    if (isMerokok) radRokokYa.checked = true;
    else radRokokTidak.checked = true;
  }

  calculatePemeriksaanIMT();

  const overlay = document.getElementById('pemeriksaanCkgGratisModalOverlay');
  if (overlay) overlay.classList.add('open');
}

function calculatePemeriksaanIMT() {
  const bb = parseFloat(document.getElementById('pemeriksaan_bb')?.value) || 0;
  const tb = parseFloat(document.getElementById('pemeriksaan_tb')?.value) || 0;
  const imtEl = document.getElementById('pemeriksaan_imt');
  const badgeEl = document.getElementById('pemeriksaan_imt_badge');

  if (bb > 0 && tb > 0) {
    const tbM = tb / 100;
    const imt = (bb / (tbM * tbM)).toFixed(1);
    if (imtEl) imtEl.value = imt;
    if (badgeEl) {
      if (imt < 18.5) {
        badgeEl.textContent = 'Kurus / Kurang BB';
        badgeEl.className = 'badge badge-amber';
      } else if (imt <= 25.0) {
        badgeEl.textContent = 'Normal';
        badgeEl.className = 'badge badge-emerald';
      } else if (imt <= 27.0) {
        badgeEl.textContent = 'Kelebihan BB';
        badgeEl.className = 'badge badge-amber';
      } else {
        badgeEl.textContent = 'Obesitas';
        badgeEl.className = 'badge badge-rose';
      }
    }
  } else {
    if (imtEl) imtEl.value = '';
    if (badgeEl) {
      badgeEl.textContent = '-';
      badgeEl.className = 'badge badge-slate';
    }
  }
}

async function savePemeriksaanCkgGratis() {
  if (!currentPemeriksaanId) return;
  const r = ckgGratisRecords.find(item => String(item.id) === String(currentPemeriksaanId));
  if (!r) return;

  const bb = parseFloat(document.getElementById('pemeriksaan_bb')?.value) || 0;
  const tb = parseFloat(document.getElementById('pemeriksaan_tb')?.value) || 0;
  const lp = parseFloat(document.getElementById('pemeriksaan_lp')?.value) || 0;
  const imt = parseFloat(document.getElementById('pemeriksaan_imt')?.value) || 0;
  const tdSistolik = parseInt(document.getElementById('pemeriksaan_td_sistolik')?.value) || 0;
  const tdDiastolik = parseInt(document.getElementById('pemeriksaan_td_diastolik')?.value) || 0;
  const gds = parseInt(document.getElementById('pemeriksaan_gds')?.value) || 0;
  const kolesterol = parseInt(document.getElementById('pemeriksaan_kolesterol')?.value) || 0;
  const hb = parseFloat(document.getElementById('pemeriksaan_hb')?.value) || 0;

  const mata = document.getElementById('pemeriksaan_mata')?.value || 'Normal';
  const telinga = document.getElementById('pemeriksaan_telinga')?.value || 'Normal';
  const gigi = document.getElementById('pemeriksaan_gigi')?.value || 'Baik';
  const katarak = document.querySelector('input[name="pemeriksaan_katarak"]:checked')?.value || 'Tidak';
  const merokok = document.querySelector('input[name="pemeriksaan_rokok"]:checked')?.value || 'Tidak';

  // Update object
  r.bb = bb;
  r.tb = tb;
  r.lp = lp;
  r.imt = imt;
  r.td_sistolik = tdSistolik;
  r.td_diastolik = tdDiastolik;
  r.gula_darah = gds;
  r.kolesterol = kolesterol;
  r.hb = hb;
  r.mata = mata;
  r.telinga = telinga;
  r.gigi = gigi;
  r.katarak = katarak;
  r.merokok = merokok;

  // Loading
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Menyimpan Pemeriksaan Medis...',
      text: `Menyimpan data medis pasien ${r.nama} ke Cloud Database...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
  }

  try {
    const res = await fetch('/api/ckg-gratis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([r])
    });

    saveCkgGratisRecordsToStorage();
    renderCkgGratisTable();
    closePemeriksaanCkgGratisModal();

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: 'Pemeriksaan Berhasil Disimpan!',
        text: `Hasil pemeriksaan medis pasien ${r.nama} telah berhasil diperbarui di Cloud Database.`,
        timer: 1800,
        showConfirmButton: false
      });
    } else {
      showToast(`✓ Hasil pemeriksaan medis ${r.nama} berhasil disimpan!`, 'success');
    }
  } catch (err) {
    console.error('Failed saving pemeriksaan:', err);
    saveCkgGratisRecordsToStorage();
    renderCkgGratisTable();
    closePemeriksaanCkgGratisModal();
    showToast(`Data pemeriksaan disimpan secara lokal (Offline)`, 'warning');
  }
}

function closePemeriksaanCkgGratisModal() {
  const overlay = document.getElementById('pemeriksaanCkgGratisModalOverlay');
  if (overlay) overlay.classList.remove('open');
  currentPemeriksaanId = null;
}

async function deleteCkgGratisRecord(id) {
  const targetRecord = ckgGratisRecords.find(r => r.id === id);
  if (!targetRecord) {
    showToast('Data Cek Kesehatan Gratis tidak ditemukan!', 'error');
    return;
  }

  const result = await Swal.fire({
    title: 'Hapus Data CKG Gratis?',
    html: `<div style="font-size: 13.5px; text-align: left; line-height: 1.5;">
            Apakah Anda yakin ingin menghapus data pasien:
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 8px; margin: 10px 0; font-size: 13px;">
              <strong>Nama:</strong> ${targetRecord.nama}<br>
              <strong>NIK:</strong> ${targetRecord.nik || (targetRecord.belum_punya_nik ? 'Belum Punya NIK' : '-')}<br>
              <strong>ID:</strong> ${targetRecord.id}
            </div>
            <span style="color: #dc2626; font-weight: 600; font-size: 12px;">
              <i class="bi bi-cloud-arrow-down-fill"></i> Data akan dihapus dari Cloud D1 Database (Tabel CKG Gratis).
            </span>
          </div>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: '<i class="bi bi-trash-fill"></i> Ya, Hapus Data',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  Swal.fire({
    title: 'Menghapus Data dari Cloud Database...',
    html: `<div style="font-size: 13px; color: #475569; margin-top: 6px;">
            <i class="bi bi-cloud-arrow-up-fill" style="color: #059669;"></i> Menghapus <strong>${targetRecord.nama}</strong> dari Cloud D1...
          </div>`,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const res = await fetch(`/api/ckg-gratis?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: Gagal menghapus dari server cloud`);
    }

    ckgGratisRecords = ckgGratisRecords.filter(r => r.id !== id);
    safeLocalStorageSet('ckg_gratis_records', JSON.stringify(ckgGratisRecords));
    if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_gratis_records', ckgGratisRecords);

    renderCkgGratisTable();

    Swal.fire({
      icon: 'success',
      title: 'Berhasil Dihapus!',
      text: `Data pasien ${targetRecord.nama} berhasil dihapus dari Cloud Database CKG Gratis.`,
      timer: 1800,
      showConfirmButton: false
    });
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Gagal Menghapus',
      text: err.message
    });
  }
}

function resetCkgGratisFilters() {
  const s = document.getElementById('searchCkgGratis');
  if (s) s.value = '';
  const u = document.getElementById('filterCkgGratisUsia');
  if (u) u.value = '';
  const min = document.getElementById('filterCkgGratisMinAge');
  if (min) min.value = '';
  const max = document.getElementById('filterCkgGratisMaxAge');
  if (max) max.value = '';
  const jk = document.getElementById('filterCkgGratisJk');
  if (jk) jk.value = '';
  const b = document.getElementById('filterCkgGratisBulan');
  if (b) b.value = '';
  const t = document.getElementById('filterCkgGratisTahun');
  if (t) t.value = '';
  const p = document.getElementById('filterCkgGratisPetugas');
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  const isPrivileged = (role === 'admin' || role === 'koordinator');
  if (p && isPrivileged) p.value = '';
  const l = document.getElementById('filterCkgGratisLimit');
  if (l) l.value = '10';

  renderCkgGratisTable();
}

/* ==========================================================================
   📅 DATE UPDATE ENGINE (SINGLE RECORD & BULK MONTHLY FOR ADMIN)
   ========================================================================== */

function promptChangeSingleRecordDate(recordId) {
  const item = records.find(r => String(r.id) === String(recordId));
  if (!item) {
    showToast('Record data tidak ditemukan!', 'error');
    return;
  }

  const currentDateIso = formatDateToYYYYMMDD(item.created_at || item.tanggal_entry || item.tanggal) || new Date().toISOString().substring(0, 10);
  const currentFormatted = formatDisplayDate(item.tanggal_entry || item.created_at || item.tanggal);

  Swal.fire({
    title: '<div style="font-size: 16px; font-weight: 800; color: #0284c7; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="bi bi-calendar-event-fill" style="color: #0284c7; font-size: 20px;"></i> Ubah Tanggal Entry Pasien</div>',
    html: `
      <div style="text-align: left; font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px;">
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px;">
          <div style="font-weight: 800; color: #0284c7; font-size: 14px;">${item.nama}</div>
          <div style="font-size: 12px; color: #64748b;">NIK: ${item.nik || '-'} | Petugas: ${item.petugas_entry || item.created_by || '-'}</div>
          <div style="font-size: 12px; color: #475569; margin-top: 4px;">Tanggal Entry Saat Ini: <strong>${currentFormatted}</strong></div>
        </div>

        <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Pilih Tanggal Entry Baru:</label>
        <input type="date" id="swalSingleDateInput" class="swal2-input" value="${currentDateIso}" style="width: 100%; margin: 0; font-size: 13px; padding: 8px 12px; height: 42px; border-radius: 8px; font-weight: 600;">
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-check-lg"></i> Simpan Perubahan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#0284c7',
    cancelButtonColor: '#64748b',
    preConfirm: () => {
      const newDate = document.getElementById('swalSingleDateInput')?.value;
      if (!newDate) {
        Swal.showValidationMessage('Silakan pilih tanggal entry baru yang valid.');
        return false;
      }
      return newDate;
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const newDateVal = result.value;
      item.created_at = newDateVal;
      item.tanggal_entry = newDateVal;
      item.tanggal = newDateVal;

      saveRecordsToStorage();
      renderTableRecords();
      showToast(`✓ Tanggal entry untuk ${item.nama} berhasil diubah ke ${formatDisplayDate(newDateVal)}!`, 'success');
    }
  });
}

function openBulkUpdateDateModal() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  if (role !== 'admin' && role !== 'koordinator') {
    Swal.fire({
      icon: 'warning',
      title: 'Akses Ditolak',
      text: 'Fitur Ubah Tanggal Entry Massal hanya dapat diakses oleh Admin.',
      confirmButtonColor: '#2563eb'
    });
    return;
  }

  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(now.getFullYear());
  const todayIsoStr = now.toISOString().substring(0, 10);

  // Build Officers Dropdown Options for Bulk Update Modal
  let bulkPetugasOptionsHtml = `<option value="">-- Semua Petugas --</option>`;
  if (Array.isArray(usersDb) && usersDb.length > 0) {
    usersDb.forEach(u => {
      bulkPetugasOptionsHtml += `<option value="${escapeAttr(u.nama_user)}">${u.nama_user}</option>`;
    });
  }

  let bulkYearOptionsHtml = '';
  const cYear = parseInt(currentYearStr, 10);
  for (let y = 2045; y >= 2000; y--) {
    bulkYearOptionsHtml += `<option value="${y}" ${y === cYear ? 'selected' : ''}>${y}</option>`;
  }

  Swal.fire({
    title: '<div style="font-size: 16px; font-weight: 800; color: #0369a1; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="bi bi-calendar-range-fill" style="color: #0284c7; font-size: 22px;"></i> Ubah Tanggal Entry Massal (Khusus Admin)</div>',
    html: `
      <div style="text-align: left; font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px 6px;">
        <p style="color: #64748b; margin-bottom: 14px; line-height: 1.5;">Pilih bulan, tahun, dan petugas entry target, lalu tentukan tanggal entry baru yang akan diterapkan pada seluruh data tersebut:</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;"><i class="bi bi-calendar3" style="color: #0284c7;"></i> Bulan Target:</label>
            <select id="swalBulkMonthTarget" class="swal2-input" style="width: 100%; margin: 0; font-size: 13px; padding: 8px 12px; height: 42px; border-radius: 8px; font-weight: 600;">
              <option value="01">Januari</option>
              <option value="02">Februari</option>
              <option value="03">Maret</option>
              <option value="04">April</option>
              <option value="05">Mei</option>
              <option value="06">Juni</option>
              <option value="07" ${currentMonthStr === '07' ? 'selected' : ''}>Juli</option>
              <option value="08" ${currentMonthStr === '08' ? 'selected' : ''}>Agustus</option>
              <option value="09">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>
          </div>
          
          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;"><i class="bi bi-calendar-year" style="color: #0284c7;"></i> Tahun Target:</label>
            <select id="swalBulkYearTarget" class="swal2-input" style="width: 100%; margin: 0; font-size: 13px; padding: 8px 12px; height: 42px; border-radius: 8px; font-weight: 600;">
              ${bulkYearOptionsHtml}
            </select>
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;"><i class="bi bi-person-badge" style="color: #0284c7;"></i> Filter Petugas Entry Target:</label>
          <select id="swalBulkPetugasTarget" class="swal2-input" style="width: 100%; margin: 0; font-size: 13px; padding: 8px 12px; height: 42px; border-radius: 8px; font-weight: 700; color: #1e3a8a;">
            ${bulkPetugasOptionsHtml}
          </select>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;"><i class="bi bi-calendar-check-fill" style="color: #059669;"></i> Ubah Semua Ke Tanggal Entry Baru:</label>
          <input type="date" id="swalBulkNewDateInput" class="swal2-input" value="${todayIsoStr}" style="width: 100%; margin: 0; font-size: 13px; padding: 8px 12px; height: 42px; border-radius: 8px; font-weight: 700; border-color: #059669;">
        </div>

        <div style="font-size: 11.5px; color: #b45309; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 8px 10px; margin-top: 10px;">
          <i class="bi bi-exclamation-triangle-fill"></i> <strong>Perhatian:</strong> Seluruh data rekam medis CKG pada kriteria filter target yang dipilih akan diperbarui ke tanggal entry baru.
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-check-circle-fill"></i> Terapkan Perubahan Massal',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#0284c7',
    cancelButtonColor: '#64748b',
    preConfirm: () => {
      const monthVal = document.getElementById('swalBulkMonthTarget')?.value;
      const yearVal = document.getElementById('swalBulkYearTarget')?.value;
      const petugasVal = document.getElementById('swalBulkPetugasTarget')?.value || '';
      const newDateVal = document.getElementById('swalBulkNewDateInput')?.value;

      if (!monthVal || !yearVal) {
        Swal.showValidationMessage('Pilih Bulan dan Tahun target terlebih dahulu.');
        return false;
      }
      if (!newDateVal) {
        Swal.showValidationMessage('Pilih Tanggal Entry Baru yang valid.');
        return false;
      }

      return { monthVal, yearVal, petugasVal, newDateVal };
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const { monthVal, yearVal, petugasVal, newDateVal } = result.value;
      processBulkUpdateDate(monthVal, yearVal, petugasVal, newDateVal);
    }
  });
}

function processBulkUpdateDate(monthVal, yearVal, petugasVal, newDateVal) {
  const monthNames = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const targetMonthName = monthNames[parseInt(monthVal, 10)] || monthVal;

  const targetMonthNum = parseInt(monthVal, 10);
  const targetYearNum = parseInt(yearVal, 10);
  const targetPetugasClean = (petugasVal || '').trim().toLowerCase();

  const isMatch = (r) => {
    const d = getRecordEntryDate(r);
    if (!d) return false;
    const mNum = parseInt(d.month, 10);
    const yNum = parseInt(d.year, 10);
    if (mNum !== targetMonthNum || yNum !== targetYearNum) return false;

    if (targetPetugasClean) {
      const creator = (r.created_by || r.petugas_entry || r.assigned_to || r.petugas || '').trim().toLowerCase();
      return creator === targetPetugasClean || creator.includes(targetPetugasClean);
    }
    return true;
  };

  const matchingCkg = records.filter(isMatch);
  const matchingSimpus = simpusRecords.filter(isMatch);
  const totalMatching = matchingCkg.length + matchingSimpus.length;

  if (totalMatching === 0) {
    const petugasText = petugasVal ? ` untuk petugas "${petugasVal}"` : '';
    Swal.fire({
      icon: 'warning',
      title: 'Data Tidak Ditemukan',
      text: `Tidak ditemukan data CKG / SIMPUS pada bulan ${targetMonthName} ${yearVal}${petugasText}.`,
      confirmButtonColor: '#2563eb'
    });
    return;
  }

  matchingCkg.forEach(r => {
    r.created_at = newDateVal;
    r.tanggal_entry = newDateVal;
    r.tanggal = newDateVal;
  });

  matchingSimpus.forEach(r => {
    r.tanggal = newDateVal;
    r.created_at = newDateVal;
    r.tanggal_entry = newDateVal;
  });

  saveRecordsToStorage();
  saveSimpusRecordsToStorage();

  if (typeof syncRecordsToCloud === 'function' && matchingCkg.length > 0) {
    syncRecordsToCloud(matchingCkg);
  }
  if (typeof syncSimpusToCloud === 'function' && matchingSimpus.length > 0) {
    syncSimpusToCloud(matchingSimpus);
  }

  renderApp();

  const petugasText = petugasVal ? ` (Petugas: ${petugasVal})` : ' (Semua Petugas)';
  Swal.fire({
    icon: 'success',
    title: 'Berhasil Memperbarui Tanggal Entry Massal!',
    html: `Sebanyak <strong>${totalMatching} data</strong> (${matchingCkg.length} Data CKG & ${matchingSimpus.length} Data SIMPUS) pada bulan <strong>${targetMonthName} ${yearVal}</strong>${petugasText} telah berhasil diubah ke tanggal entry baru: <strong style="color: #0284c7;">${formatDisplayDate(newDateVal)}</strong>.`,
    confirmButtonColor: '#0284c7'
  });
}

function confirmDeleteAllCkgRecords() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || '').toLowerCase();
  if (role !== 'admin' && role !== 'koordinator') {
    showToast('Hanya Koordinator dan Admin yang dapat menghapus semua data.', 'error');
    return;
  }

  if (records.length === 0) {
    showToast('Tidak ada data CKG untuk dihapus.', 'info');
    return;
  }

  const invalidNikRecords = records.filter(r => !isNik16Digit(r.nik));
  const validNikRecords = records.filter(r => isNik16Digit(r.nik));
  const invalidCount = invalidNikRecords.length;
  const validCount = validNikRecords.length;

  if (typeof Swal === 'undefined') {
    if (confirm('Apakah Anda yakin ingin menghapus SEMUA data CKG?')) {
      window._intentionalDeleteAll = true;
      records = [];
      localStorage.removeItem('ckg_records');
      fetch('/api/ckg', { method: 'DELETE' });
      renderApp();
      updateCloudSyncPill(true, 'D1 Online (0 Rec)');
      showToast('Seluruh Data CKG Berhasil Dihapus!', 'success');
      setTimeout(() => { window._intentionalDeleteAll = false; }, 120000);
    }
    return;
  }

  Swal.fire({
    title: '<span style="color:#dc2626; font-size: 20px;"><i class="bi bi-trash3-fill"></i> PILIHAN PENGHAPUSAN DATA CKG</span>',
    html: `
      <div style="text-align:left; font-size:13px; color:#475569; margin-bottom:14px; line-height:1.5;">
        Silakan pilih jenis penghapusan data pada <strong>${records.length} Data CKG</strong>:
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; text-align:left;">
        <!-- OPSI 1: Hapus NIK Tidak 16 Digit Saja -->
        <label id="lblOptNon16" style="display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border-radius:10px; border:2px solid ${invalidCount > 0 ? '#f59e0b' : '#e2e8f0'}; background:${invalidCount > 0 ? '#fffbeb' : '#f8fafc'}; cursor:${invalidCount > 0 ? 'pointer' : 'not-allowed'}; transition:all 0.2s;">
          <input type="radio" name="delete_mode" id="deleteModeNon16" value="non_16_digit" ${invalidCount > 0 ? 'checked' : 'disabled'} style="margin-top:3px; accent-color:#d97706; width:17px; height:17px; cursor:pointer;">
          <div style="flex:1;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">
              <strong style="color:${invalidCount > 0 ? '#b45309' : '#94a3b8'}; font-size:13.5px;">
                <i class="bi bi-person-x-fill" style="color:#d97706;"></i> Hapus Data NIK Bukan 16 Digit Saja
              </strong>
              <span class="badge" style="background:${invalidCount > 0 ? '#fef3c7' : '#e2e8f0'}; color:${invalidCount > 0 ? '#b45309' : '#64748b'}; font-size:11.5px; font-weight:700; padding:3px 8px; border-radius:12px;">
                ${invalidCount} Data
              </span>
            </div>
            <div style="font-size:12px; color:#64748b; line-height:1.4;">
              ${invalidCount > 0
        ? `Hanya menghapus <b>${invalidCount} data</b> yang NIK-nya tidak 16 digit. Sebanyak <b>${validCount} data</b> ber-NIK valid tetap <span style="color:#059669; font-weight:600;">AMAN</span>.`
        : 'Semua data sudah ber-NIK 16 digit valid (tidak ada data NIK yang salah/rusak).'
      }
            </div>
          </div>
        </label>

        <!-- OPSI 2: Hapus SEMUA Data -->
        <label id="lblOptAll" style="display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border-radius:10px; border:2px solid ${invalidCount === 0 ? '#ef4444' : '#e2e8f0'}; background:${invalidCount === 0 ? '#fef2f2' : '#ffffff'}; cursor:pointer; transition:all 0.2s;">
          <input type="radio" name="delete_mode" id="deleteModeAll" value="all" ${invalidCount === 0 ? 'checked' : ''} style="margin-top:3px; accent-color:#dc2626; width:17px; height:17px; cursor:pointer;">
          <div style="flex:1;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">
              <strong style="color:#dc2626; font-size:13.5px;">
                <i class="bi bi-exclamation-triangle-fill" style="color:#dc2626;"></i> Hapus SEMUA Data CKG (Reset Total)
              </strong>
              <span class="badge" style="background:#fee2e2; color:#dc2626; font-size:11.5px; font-weight:700; padding:3px 8px; border-radius:12px;">
                ${records.length} Data
              </span>
            </div>
            <div style="font-size:12px; color:#64748b; line-height:1.4;">
              Menghapus seluruh ${records.length} data CKG secara permanen dari Cloudflare D1 Database & Penyimpanan Aplikasi.
            </div>
          </div>
        </label>
      </div>

      <!-- INFORMASI OPSI 1 -->
      <div id="boxInfoNon16" style="display:${invalidCount > 0 ? 'block' : 'none'}; margin-top:14px; text-align:left; background:#f0fdf4; padding:10px 12px; border-radius:8px; border:1px solid #bbf7d0; font-size:12px; color:#166534;">
        <i class="bi bi-shield-check" style="color:#16a34a; font-size:14px;"></i> <b>Perlindungan Data Aktif:</b> Hanya data NIK tidak 16 digit yang akan dibersihkan. Sebanyak <b>${validCount} data</b> ber-NIK valid 16 digit tetap aman tersimpan.
      </div>

      <!-- PERINGATAN OPSI 2 (Ketik HAPUS SEMUA DATA) -->
      <div id="boxConfirmDeleteAll" style="display:${invalidCount === 0 ? 'block' : 'none'}; margin-top:14px; text-align:left; background:#fef2f2; padding:12px; border-radius:8px; border:1px solid #fecaca;">
        <label style="font-size:12px; font-weight:700; color:#991b1b; display:block; margin-bottom:6px;">
          Ketik "HAPUS SEMUA DATA" di bawah untuk mengaktifkan tombol konfirmasi:
        </label>
        <input type="text" id="confirmDeleteInputText" class="swal2-input" placeholder="HAPUS SEMUA DATA" style="width:100%; margin:0; font-weight:700; text-transform:uppercase; border:2px solid #f87171; border-radius:6px; padding:8px 12px; box-sizing:border-box; color:#991b1b;">
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: invalidCount > 0 ? '#d97706' : '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: invalidCount > 0 ? `Hapus Data NIK Bukan 16 Digit (${invalidCount})` : 'Ya, Hapus Semua Data!',
    cancelButtonText: 'Batal',
    didOpen: () => {
      const confirmBtn = Swal.getConfirmButton();
      const radioNon16 = document.getElementById('deleteModeNon16');
      const radioAll = document.getElementById('deleteModeAll');
      const lblNon16 = document.getElementById('lblOptNon16');
      const lblAll = document.getElementById('lblOptAll');
      const boxNon16 = document.getElementById('boxInfoNon16');
      const boxAll = document.getElementById('boxConfirmDeleteAll');
      const inputEl = document.getElementById('confirmDeleteInputText');

      function updateState() {
        const isAll = radioAll && radioAll.checked;
        if (isAll) {
          if (lblAll) { lblAll.style.border = '2px solid #ef4444'; lblAll.style.background = '#fef2f2'; }
          if (lblNon16) { lblNon16.style.border = '2px solid #e2e8f0'; lblNon16.style.background = '#ffffff'; }
          if (boxAll) boxAll.style.display = 'block';
          if (boxNon16) boxNon16.style.display = 'none';

          if (confirmBtn) {
            confirmBtn.textContent = 'Ya, Hapus Semua Data!';
            confirmBtn.style.backgroundColor = '#dc2626';
            if (inputEl && inputEl.value.trim() === 'HAPUS SEMUA DATA') {
              confirmBtn.disabled = false;
              confirmBtn.style.opacity = '1';
              confirmBtn.style.cursor = 'pointer';
            } else {
              confirmBtn.disabled = true;
              confirmBtn.style.opacity = '0.4';
              confirmBtn.style.cursor = 'not-allowed';
            }
          }
        } else {
          if (lblNon16) { lblNon16.style.border = '2px solid #f59e0b'; lblNon16.style.background = '#fffbeb'; }
          if (lblAll) { lblAll.style.border = '2px solid #e2e8f0'; lblAll.style.background = '#ffffff'; }
          if (boxAll) boxAll.style.display = 'none';
          if (boxNon16) boxNon16.style.display = 'block';

          if (confirmBtn) {
            confirmBtn.textContent = `Hapus Data NIK Bukan 16 Digit (${invalidCount})`;
            confirmBtn.style.backgroundColor = '#d97706';
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
          }
        }
      }

      if (radioNon16) radioNon16.addEventListener('change', updateState);
      if (radioAll) radioAll.addEventListener('change', updateState);
      if (inputEl) {
        inputEl.addEventListener('input', () => {
          if (radioAll && radioAll.checked) {
            if (inputEl.value.trim() === 'HAPUS SEMUA DATA') {
              confirmBtn.disabled = false;
              confirmBtn.style.opacity = '1';
              confirmBtn.style.cursor = 'pointer';
            } else {
              confirmBtn.disabled = true;
              confirmBtn.style.opacity = '0.4';
              confirmBtn.style.cursor = 'not-allowed';
            }
          }
        });
      }

      updateState();
    },
    preConfirm: () => {
      const radioAll = document.getElementById('deleteModeAll');
      const isAll = radioAll && radioAll.checked;
      if (isAll) {
        const inputEl = document.getElementById('confirmDeleteInputText');
        if (!inputEl || inputEl.value.trim() !== 'HAPUS SEMUA DATA') {
          Swal.showValidationMessage('Harap ketik "HAPUS SEMUA DATA" dengan benar!');
          return false;
        }
        return { mode: 'all' };
      }
      return { mode: 'non_16_digit' };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      if (result.value.mode === 'non_16_digit') {
        Swal.fire({
          title: 'Menghapus Data NIK Tidak 16 Digit...',
          html: `<div style="font-size:13px; color:#475569; margin-top:6px;">
                  <i class="bi bi-person-x-fill" style="color:#d97706; font-size:18px;"></i>
                  Menghapus <strong>${invalidCount} data</strong> dari Cloudflare D1 Database & penyimpanan lokal...
                </div>`,
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => Swal.showLoading()
        });

        try {
          const invalidIds = invalidNikRecords.map(r => r.id);
          const res = await fetch('/api/ckg?filter=non_16_digit', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filter: 'non_16_digit', ids: invalidIds })
          });

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: Gagal menghapus data dari Cloud Database`);
          }

          records = records.filter(r => isNik16Digit(r.nik));
          try { localStorage.setItem('ckg_records', JSON.stringify(records)); } catch (_) { }
          renderApp();
          updateCloudSyncPill(true, `D1 Online (${records.length} Rec)`);

          Swal.fire({
            icon: 'success',
            title: 'Pembersihan NIK Berhasil!',
            html: `Sebanyak <strong>${invalidCount} data</strong> dengan NIK bukan 16 digit telah berhasil dihapus dari Cloudflare D1 Database.<br><br>Sisa <strong>${records.length} data</strong> dengan NIK 16 digit valid tetap tersimpan dengan aman!`,
            confirmButtonColor: '#059669'
          });
        } catch (err) {
          console.error('Failed to delete invalid NIK records:', err);
          Swal.fire({
            icon: 'error',
            title: 'Gagal Menghapus Data!',
            html: `Terjadi kesalahan saat menghapus data: <strong>${err.message}</strong>`,
            confirmButtonColor: '#dc2626'
          });
        }
      } else {
        window._intentionalDeleteAll = true;

        // Show progress loading indicator while deleting from Cloud D1
        Swal.fire({
          title: 'Menghapus Seluruh Data dari Cloud...',
          html: '<div style="font-size:13px; color:#475569; margin-top:6px;"><i class="bi bi-cloud-arrow-up-fill" style="color:#dc2626;"></i> Mengirim perintah HAPUS SEMUA DATA ke Cloudflare D1 Database...</div>',
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        try {
          const res = await fetch('/api/ckg', { method: 'DELETE' });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: Gagal mengosongkan database server`);
          }

          records = [];
          localStorage.removeItem('ckg_records');
          renderApp();
          updateCloudSyncPill(true, 'D1 Online (0 Rec)');

          Swal.fire({
            icon: 'success',
            title: 'Berhasil Dihapus!',
            html: 'Seluruh Data CKG telah <strong>berhasil dihapus secara permanen dari Cloudflare D1 Database</strong>.',
            confirmButtonColor: '#059669'
          });
        } catch (err) {
          console.error('Failed to delete all ckg_full_records:', err);
          Swal.fire({
            icon: 'error',
            title: 'Gagal Menghapus Data!',
            html: `Terjadi kesalahan saat menghapus data dari Cloud: <strong>${err.message}</strong>`,
            confirmButtonColor: '#dc2626'
          });
        }

        setTimeout(() => { window._intentionalDeleteAll = false; }, 120000);
      }
    }
  });
}

async function deleteRecord(id) {
  const targetRecord = records.find(r => r.id === id);
  if (!targetRecord) {
    showToast('Data CKG tidak ditemukan!', 'error');
    return;
  }

  const result = await Swal.fire({
    title: 'Hapus Data CKG?',
    html: `<div style="font-size: 13.5px; text-align: left; line-height: 1.5;">
            Apakah Anda yakin ingin menghapus data pasien:
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 8px; margin: 10px 0; font-size: 13px;">
              <strong>Nama:</strong> ${targetRecord.nama}<br>
              <strong>NIK:</strong> ${targetRecord.nik || '-'}<br>
              <strong>ID:</strong> ${targetRecord.id}
            </div>
            <span style="color: #dc2626; font-weight: 600; font-size: 12px;">
              <i class="bi bi-cloud-arrow-down-fill"></i> Data akan dihapus dari Cloud D1 Database dan dipindahkan ke Recycle Data.
            </span>
          </div>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: '<i class="bi bi-trash-fill"></i> Ya, Hapus Data Cloud',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  // Show progress loading overlay
  Swal.fire({
    title: 'Menghapus Data dari Cloud Database...',
    html: `<div style="font-size: 13px; color: #475569; margin-top: 6px;">
            <i class="bi bi-cloud-arrow-up-fill" style="color: #2563eb;"></i> Mengirim perintah HAPUS untuk data <strong>${targetRecord.nama}</strong> ke Cloudflare D1 Database...
          </div>`,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    // 1. Send DELETE HTTP request directly to Cloud D1 API
    const res = await fetch(`/api/ckg?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: Gagal menghapus dari server cloud`);
    }

    // 2. Add to Recycle Bin & save recycle bin to cloud
    targetRecord.deleted_at = new Date().toISOString().substring(0, 10) + ' ' + new Date().toLocaleTimeString('id-ID');
    targetRecord.deleted_by = sessionStorage.getItem('ckg_user_name') || currentRole || 'User';
    targetRecord.original_source = 'BNBA Skrining CKG';
    recycleBin.unshift(targetRecord);
    await saveRecycleBinToStorage(targetRecord);

    // 3. Remove from local state AFTER cloud confirmation
    records = records.filter(r => r.id !== id);
    safeLocalStorageSet('ckg_records', JSON.stringify(records));
    if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_records', records);

    renderApp();
    updateCloudSyncPill(true, `D1 Online (${records.length} Rec)`);

    // 4. Show success notification ONLY AFTER Cloud confirmation
    Swal.fire({
      icon: 'success',
      title: 'Berhasil Dihapus dari Cloud!',
      html: `Data pasien <strong>${targetRecord.nama}</strong> (NIK: ${targetRecord.nik || '-'}) telah <strong>terhapus dari Cloudflare D1 Database</strong> dan dipindahkan ke Recycle Data.`,
      confirmButtonColor: '#059669'
    });
  } catch (err) {
    console.error('Failed to delete CKG record from cloud D1:', err);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Menghapus Data!',
      html: `Gagal menghapus data dari Cloud Database: <strong>${err.message}</strong>.<br>Data tidak terhapus. Silakan periksa koneksi internet Anda.`,
      confirmButtonColor: '#dc2626'
    });
  }
}

async function deleteSimpusRecord(id) {
  const targetSimpus = simpusRecords.find(r => (r.id || r.nik || '') === id);
  if (!targetSimpus) {
    showToast('Data SIMPUS tidak ditemukan!', 'error');
    return;
  }

  const result = await Swal.fire({
    title: 'Hapus Data SIMPUS?',
    html: `<div style="font-size: 13.5px; text-align: left; line-height: 1.5;">
            Apakah Anda yakin ingin menghapus data SIMPUS:
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 8px; margin: 10px 0; font-size: 13px;">
              <strong>Nama:</strong> ${targetSimpus.nama || targetSimpus.nik}<br>
              <strong>NIK:</strong> ${targetSimpus.nik || '-'}
            </div>
            <span style="color: #dc2626; font-weight: 600; font-size: 12px;">
              <i class="bi bi-cloud-arrow-down-fill"></i> Data akan dihapus dari Cloud D1 Database dan dipindahkan ke Recycle Data.
            </span>
          </div>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: '<i class="bi bi-trash-fill"></i> Ya, Hapus Data Cloud',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  Swal.fire({
    title: 'Menghapus Data SIMPUS dari Cloud...',
    html: `<div style="font-size: 13px; color: #475569; margin-top: 6px;">
            <i class="bi bi-cloud-arrow-up-fill" style="color: #2563eb;"></i> Mengirim perintah HAPUS untuk data SIMPUS <strong>${targetSimpus.nama || targetSimpus.nik}</strong> ke Cloud D1...
          </div>`,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    const targetId = targetSimpus.id || targetSimpus.nik || id;
    const deleteTab = targetSimpus.is_divided ? 'sudah_bagi' : 'belum_bagi';
    const res = await fetch(`/api/simpus?tab=${deleteTab}&id=${encodeURIComponent(targetId)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: Gagal menghapus data SIMPUS dari server`);
    }

    targetSimpus.deleted_at = new Date().toISOString().substring(0, 10) + ' ' + new Date().toLocaleTimeString('id-ID');
    targetSimpus.deleted_by = sessionStorage.getItem('ckg_user_name') || currentRole || 'User';
    targetSimpus.original_source = 'Data SIMPUS CKG';
    recycleBin.unshift(targetSimpus);
    await saveRecycleBinToStorage(targetSimpus);

    simpusRecords = simpusRecords.filter(r => (r.id || r.nik || '') !== id);
    safeLocalStorageSet('ckg_simpus_records', JSON.stringify(simpusRecords));
    if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_simpus_records', simpusRecords);

    renderApp();

    Swal.fire({
      icon: 'success',
      title: 'Berhasil Dihapus dari Cloud!',
      html: `Data SIMPUS <strong>${targetSimpus.nama || targetSimpus.nik}</strong> telah <strong>terhapus dari Cloud D1 Database</strong> dan dipindahkan ke Recycle Data.`,
      confirmButtonColor: '#059669'
    });
  } catch (err) {
    console.error('Failed to delete SIMPUS record from cloud D1:', err);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Menghapus Data SIMPUS!',
      html: `Gagal menghapus data dari Cloud Database: <strong>${err.message}</strong>`,
      confirmButtonColor: '#dc2626'
    });
  }
}

function getFilteredRecycleBin() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || '').toLowerCase();
  if (role !== 'admin' && role !== 'koordinator') {
    return [];
  }

  let dataset = getVisibleRecords(recycleBin);

  const filterKegiatanVal = document.getElementById('filterRecycleKegiatan')?.value || '';
  const filterSourceVal = document.getElementById('filterRecycleSource')?.value || '';
  const filterPetugasVal = document.getElementById('filterRecyclePetugas')?.value || '';
  const searchQuery = document.getElementById('searchRecycle')?.value.trim().toLowerCase() || '';

  // Filter Jenis Kegiatan
  if (filterKegiatanVal) {
    dataset = dataset.filter(r => (r.jenis_kegiatan || '').toLowerCase() === filterKegiatanVal.toLowerCase());
  }

  // Filter Sumber Data
  if (filterSourceVal) {
    dataset = dataset.filter(r => {
      const src = r.original_source || 'BNBA';
      if (filterSourceVal === 'SIMPUS') {
        return src.includes('SIMPUS');
      } else {
        return !src.includes('SIMPUS');
      }
    });
  }

  // Filter Petugas
  if (filterPetugasVal) {
    dataset = dataset.filter(r =>
      r.deleted_by === filterPetugasVal ||
      r.created_by === filterPetugasVal ||
      r.petugas_entry === filterPetugasVal
    );
  }

  // Search Query
  if (searchQuery) {
    dataset = dataset.filter(r => {
      const nama = (r.nama || r.nama_pasien || '').toLowerCase();
      const nik = String(r.nik || '').toLowerCase();
      const deletedBy = (r.deleted_by || '').toLowerCase();
      const createdBy = (r.created_by || r.petugas_entry || '').toLowerCase();
      const alamat = (r.alamat || '').toLowerCase();
      const kegiatan = (r.jenis_kegiatan || '').toLowerCase();

      return nama.includes(searchQuery) || nik.includes(searchQuery) || deletedBy.includes(searchQuery) || createdBy.includes(searchQuery) || alamat.includes(searchQuery) || kegiatan.includes(searchQuery);
    });
  }

  return dataset;
}

function renderRecycleTable() {
  const tbody = document.getElementById('recycleTableBody');
  if (!tbody) return;

  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || '').toLowerCase();
  if (role !== 'admin' && role !== 'koordinator') {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 30px; color: var(--rose); font-weight:700;">
          <i class="bi bi-shield-lock-fill" style="font-size: 28px; display: block; margin-bottom: 6px;"></i>
          Akses Ditolak: Halaman Recycle Data hanya dapat diakses oleh Role Admin dan Koordinator.
        </td>
      </tr>
    `;
    return;
  }

  const visibleRecycle = getFilteredRecycleBin();

  if (visibleRecycle.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 35px; color: var(--text-muted);">
          <i class="bi bi-trash3" style="font-size: 32px; display: block; margin-bottom: 8px; color: #cbd5e1;"></i>
          Tidak ada data di tempat sampah yang sesuai dengan filter.
        </td>
      </tr>
    `;
    return;
  }

  // Limit Filter Logic (Default: 10)
  const limitVal = document.getElementById('filterRecycleLimit')?.value || '10';
  let displayedRecycle = visibleRecycle;
  if (limitVal !== 'all') {
    const limitNum = parseInt(limitVal, 10) || 10;
    displayedRecycle = visibleRecycle.slice(0, limitNum);
  }

  tbody.innerHTML = displayedRecycle.map((r, i) => {
    const safeId = r.id || r.nik || i;
    const sourceBadge = (r.original_source || 'BNBA').includes('SIMPUS')
      ? `<span class="badge badge-amber"><i class="bi bi-hdd-network"></i> SIMPUS</span>`
      : `<span class="badge badge-cyan"><i class="bi bi-folder-symlink-fill"></i> BNBA CKG</span>`;

    return `
      <tr>
        <td>${i + 1}</td>
        <td>${sourceBadge}</td>
        <td><strong>${r.nik || '-'}</strong></td>
        <td><strong>${r.nama || r.nama_pasien || 'Pasien'}</strong></td>
        <td>${r.jenis_kegiatan || '-'}</td>
        <td><span style="font-size: 12px; color: #64748b;">${r.deleted_at || '-'}</span></td>
        <td><span class="badge badge-emerald">${r.deleted_by || 'System'}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-emerald btn-sm" onclick="restoreFromRecycle('${safeId}')" title="Pulihkan Data">
              <i class="bi bi-arrow-counterclockwise"></i> Restore
            </button>
            <button class="btn btn-danger btn-sm" onclick="permanentDeleteFromRecycle('${safeId}')" title="Hapus Permanen">
              <i class="bi bi-trash-fill"></i> Hapus Permanen
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function resetRecycleFilters() {
  const s = document.getElementById('searchRecycle');
  if (s) s.value = '';

  const keg = document.getElementById('filterRecycleKegiatan');
  if (keg) keg.value = '';

  const src = document.getElementById('filterRecycleSource');
  if (src) src.value = '';

  const pet = document.getElementById('filterRecyclePetugas');
  if (pet) pet.value = '';

  const lim = document.getElementById('filterRecycleLimit');
  if (lim) lim.value = '10';

  renderRecycleTable();
  showToast('Filter & Pencarian Recycle Data telah di-reset.', 'info');
}

function restoreFilteredRecycle() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || '').toLowerCase();
  if (role !== 'admin' && role !== 'koordinator') {
    Swal.fire('Akses Ditolak', 'Hanya Admin & Koordinator yang dapat memulihkan data.', 'warning');
    return;
  }

  const itemsToRestore = getFilteredRecycleBin();

  if (itemsToRestore.length === 0) {
    showToast('Tidak ada data terfilter untuk dipulihkan.', 'warning');
    return;
  }

  const filterKegiatanVal = document.getElementById('filterRecycleKegiatan')?.value || 'Semua';
  const filterSourceVal = document.getElementById('filterRecycleSource')?.value || 'Semua';
  const filterPetugasVal = document.getElementById('filterRecyclePetugas')?.value || 'Semua';
  const searchQuery = (document.getElementById('searchRecycle')?.value || '').trim();

  Swal.fire({
    title: '<div style="font-size: 17px; font-weight: 800; color: #059669; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="bi bi-arrow-counterclockwise" style="color: #10b981; font-size: 24px;"></i> Restore Data Terfilter?</div>',
    html: `
      <div style="text-align: left; font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px;">
        <p style="color: #475569; margin-bottom: 12px; line-height: 1.5;">Apakah Anda yakin ingin memulihkan <strong>${itemsToRestore.length} data</strong> yang saat ini muncul sesuai filter?</p>
        
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #065f46; line-height: 1.6;">
          <div>• Jenis Kegiatan: <strong>${filterKegiatanVal || 'Semua Kegiatan'}</strong></div>
          <div>• Sumber Data: <strong>${filterSourceVal || 'Semua Sumber'}</strong></div>
          <div>• Petugas: <strong>${filterPetugasVal || 'Semua Petugas'}</strong></div>
          ${searchQuery ? `<div>• Kata Kunci Cari: <strong>"${searchQuery}"</strong></div>` : ''}
          <div style="margin-top: 6px; font-weight: 700; color: #047857;">Semua data terfilter di atas akan dikembalikan dari Tempat Sampah ke Database Aktif.</div>
        </div>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#059669',
    cancelButtonColor: '#64748b',
    confirmButtonText: `<i class="bi bi-check-lg"></i> Ya, Pulihkan ${itemsToRestore.length} Data!`,
    cancelButtonText: 'Batal'
  }).then((result) => {
    if (result.isConfirmed) {
      let restoredCount = 0;

      itemsToRestore.forEach(item => {
        const itemIndex = recycleBin.findIndex(r => (r.id || r.nik || '') === (item.id || item.nik || ''));
        if (itemIndex !== -1) {
          const [restoredItem] = recycleBin.splice(itemIndex, 1);
          restoredCount++;

          if (restoredItem.original_source && restoredItem.original_source.includes('SIMPUS')) {
            simpusRecords.unshift(restoredItem);
          } else {
            records.unshift(restoredItem);
          }
        }
      });

      saveRecycleBinToStorage();
      saveSimpusRecordsToStorage();
      saveRecordsToStorage();

      renderApp();

      Swal.fire({
        icon: 'success',
        title: 'Berhasil Mempulihkan Data!',
        html: `Sebanyak <strong>${restoredCount} data terfilter</strong> telah dikembalikan dari Tempat Sampah ke Database Aktif.`,
        confirmButtonColor: '#059669'
      });
    }
  });
}

function restoreFromRecycle(id) {
  const itemIndex = recycleBin.findIndex(r => (r.id || r.nik || '') === id);
  if (itemIndex === -1) {
    showToast('Data tidak ditemukan di Recycle Data', 'error');
    return;
  }

  const item = recycleBin[itemIndex];
  recycleBin.splice(itemIndex, 1);
  saveRecycleBinToStorage(null, id);

  if (item.original_source && item.original_source.includes('SIMPUS')) {
    simpusRecords.unshift(item);
    saveSimpusRecordsToStorage();
  } else {
    records.unshift(item);
    saveRecordsToStorage();
  }

  renderApp();
  Swal.fire('Dipulihkan!', `Data [${item.nama || item.nik}] berhasil dikembalikan ke database.`, 'success');
}

function permanentDeleteFromRecycle(id) {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || '').toLowerCase();
  if (role !== 'admin' && role !== 'koordinator') {
    Swal.fire('Akses Ditolak', 'Hanya Admin & Koordinator yang dapat menghapus data secara permanen.', 'warning');
    return;
  }

  Swal.fire({
    title: 'Hapus Permanen?',
    text: 'Data yang dihapus permanen tidak dapat dikembalikan lagi!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Hapus Permanen!',
    cancelButtonText: 'Batal'
  }).then((result) => {
    if (result.isConfirmed) {
      recycleBin = recycleBin.filter(r => (r.id || r.nik || '') !== id);
      saveRecycleBinToStorage(null, id);
      renderRecycleTable();
      Swal.fire('Terhapus!', 'Data telah dihapus permanen dari sistem.', 'success');
    }
  });
}

function emptyRecycleBin() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || '').toLowerCase();
  if (role !== 'admin' && role !== 'koordinator') {
    Swal.fire('Akses Ditolak', 'Hanya Admin & Koordinator yang dapat menghapus data di Recycle Data.', 'warning');
    return;
  }

  if (recycleBin.length === 0) {
    showToast('Tempat sampah saat ini sudah kosong.', 'info');
    return;
  }

  const filteredItems = getFilteredRecycleBin();
  const isFiltered = (
    (document.getElementById('searchRecycle')?.value || '').trim() !== '' ||
    (document.getElementById('filterRecycleKegiatan')?.value || '') !== '' ||
    (document.getElementById('filterRecycleSource')?.value || '') !== '' ||
    (document.getElementById('filterRecyclePetugas')?.value || '') !== ''
  );

  const countTotal = recycleBin.length;
  const countSimpus = recycleBin.filter(r => (r.original_source || '').toUpperCase().includes('SIMPUS')).length;
  const countBnba = countTotal - countSimpus;
  const countFiltered = filteredItems.length;

  const htmlContent = `
    <div style="text-align: left; margin-top: 8px;">
      <p style="font-size: 13.5px; color: var(--text-muted, #64748b); margin-bottom: 14px; line-height: 1.5;">
        Pilih sumber data yang ingin Anda hapus secara <strong>permanen</strong> dari Tempat Sampah:
      </p>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        
        <!-- Opsi 1: Semua Data -->
        <label class="recycle-option-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border: 2px solid #0284c7; border-radius: 12px; cursor: pointer; background: rgba(2, 132, 199, 0.06); transition: all 0.2s;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="radio" name="emptyRecycleSource" value="ALL" checked style="accent-color: #0284c7; width: 18px; height: 18px;">
            <div>
              <div style="font-weight: 800; font-size: 13.5px; color: var(--text-main, #0f172a);">🌐 Kosongkan Semua Data</div>
              <div style="font-size: 11.5px; color: #64748b;">Hapus seluruh isi tempat sampah secara total</div>
            </div>
          </div>
          <span class="badge badge-cyan" style="font-size: 12px; font-weight: 800; padding: 4px 10px;">${countTotal} Data</span>
        </label>

        ${isFiltered ? `
        <!-- Opsi Terfilter (Jika sedang ada filter aktif) -->
        <label class="recycle-option-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border: 2px solid #8b5cf6; border-radius: 12px; cursor: pointer; background: rgba(139, 92, 246, 0.06); transition: all 0.2s;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="radio" name="emptyRecycleSource" value="FILTERED" style="accent-color: #8b5cf6; width: 18px; height: 18px;">
            <div>
              <div style="font-weight: 800; font-size: 13.5px; color: var(--text-main, #0f172a);">🔍 Hanya Data Terfilter Saat Ini</div>
              <div style="font-size: 11.5px; color: #64748b;">Hapus data yang sesuai pencarian/filter di tabel</div>
            </div>
          </div>
          <span class="badge badge-purple" style="font-size: 12px; font-weight: 800; padding: 4px 10px;">${countFiltered} Data</span>
        </label>
        ` : ''}

        <!-- Opsi 2: Hanya SIMPUS -->
        <label class="recycle-option-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border: 2px solid #cbd5e1; border-radius: 12px; cursor: pointer; background: var(--bg-card, #ffffff); transition: all 0.2s;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="radio" name="emptyRecycleSource" value="SIMPUS" ${countSimpus === 0 ? 'disabled' : ''} style="accent-color: #f59e0b; width: 18px; height: 18px;">
            <div>
              <div style="font-weight: 800; font-size: 13.5px; color: var(--text-main, #0f172a);">🖥️ Hanya Data Sumber SIMPUS</div>
              <div style="font-size: 11.5px; color: #64748b;">Hapus data yang berasal dari SIMPUS saja</div>
            </div>
          </div>
          <span class="badge badge-amber" style="font-size: 12px; font-weight: 800; padding: 4px 10px;">${countSimpus} Data</span>
        </label>

        <!-- Opsi 3: Hanya BNBA CKG -->
        <label class="recycle-option-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border: 2px solid #cbd5e1; border-radius: 12px; cursor: pointer; background: var(--bg-card, #ffffff); transition: all 0.2s;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="radio" name="emptyRecycleSource" value="BNBA" ${countBnba === 0 ? 'disabled' : ''} style="accent-color: #06b6d4; width: 18px; height: 18px;">
            <div>
              <div style="font-weight: 800; font-size: 13.5px; color: var(--text-main, #0f172a);">📋 Hanya Data Sumber BNBA CKG</div>
              <div style="font-size: 11.5px; color: #64748b;">Hapus data yang berasal dari BNBA CKG saja</div>
            </div>
          </div>
          <span class="badge badge-emerald" style="font-size: 12px; font-weight: 800; padding: 4px 10px;">${countBnba} Data</span>
        </label>

      </div>

      <div style="margin-top: 14px; padding: 10px 14px; border-radius: 10px; background: rgba(225, 29, 72, 0.08); border: 1px solid rgba(225, 29, 72, 0.2); font-size: 12px; color: #e11d48; font-weight: 700; display: flex; align-items: center; gap: 8px;">
        <i class="bi bi-exclamation-triangle-fill" style="font-size: 16px;"></i>
        <span>Peringatan: Data yang dihapus permanen tidak dapat dipulihkan!</span>
      </div>
    </div>
  `;

  Swal.fire({
    title: 'Kosongkan Tempat Sampah',
    html: htmlContent,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: '<i class="bi bi-trash-fill"></i> Ya, Hapus Permanen Sekarang!',
    cancelButtonText: 'Batal',
    preConfirm: () => {
      const selectedOption = document.querySelector('input[name="emptyRecycleSource"]:checked')?.value || 'ALL';
      return selectedOption;
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      const targetSource = result.value;
      let countRemoved = 0;
      let targetLabel = '';
      let deleteOptions = null;

      if (targetSource === 'ALL') {
        countRemoved = recycleBin.length;
        recycleBin = [];
        targetLabel = 'Semua Data';
        deleteOptions = { clearAll: true };
      } else if (targetSource === 'FILTERED') {
        const idsToRemove = Array.from(new Set(filteredItems.map(item => String(item.id || item.nik))));
        countRemoved = idsToRemove.length;
        const idsSet = new Set(idsToRemove);
        recycleBin = recycleBin.filter(r => !idsSet.has(String(r.id || r.nik)));
        targetLabel = 'Data Terfilter';
        deleteOptions = { ids: idsToRemove };
      } else if (targetSource === 'SIMPUS') {
        const initialLen = recycleBin.length;
        recycleBin = recycleBin.filter(r => !(r.original_source || '').toUpperCase().includes('SIMPUS'));
        countRemoved = initialLen - recycleBin.length;
        targetLabel = 'Hanya Data SIMPUS';
        deleteOptions = { source: 'SIMPUS' };
      } else if (targetSource === 'BNBA') {
        const initialLen = recycleBin.length;
        recycleBin = recycleBin.filter(r => (r.original_source || '').toUpperCase().includes('SIMPUS'));
        countRemoved = initialLen - recycleBin.length;
        targetLabel = 'Hanya Data BNBA CKG';
        deleteOptions = { source: 'BNBA' };
      }

      // Show loading progress overlay for cloud deletion
      Swal.fire({
        title: 'Menghapus Data dari Cloud Database...',
        html: `<div style="font-size: 13px; color: #475569; margin-top: 6px;">
                <i class="bi bi-cloud-arrow-up-fill" style="color: #dc2626;"></i> Mengirim perintah HAPUS PERMANEN (${targetLabel}) ke Cloudflare D1 Database...
              </div>`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await saveRecycleBinToStorage(null, null, deleteOptions);
      renderRecycleTable();

      Swal.fire({
        icon: 'success',
        title: 'Terhapus Permanen dari Cloud Database!',
        html: `Sebanyak <strong>${countRemoved} Data</strong> (${targetLabel}) telah <strong>berhasil dihapus secara permanen dari Cloudflare D1 Database</strong> & Tempat Sampah.`,
        confirmButtonColor: '#059669'
      });
    }
  });
}

function viewDetailModal(id, source = 'records') {
  const r = (source === 'ckg-gratis' ? ckgGratisRecords.find(item => item.id === id) : null) || records.find(item => item.id === id) || ckgGratisRecords.find(item => item.id === id);
  if (!r) return;

  const modalBody = document.getElementById('detailModalBody');
  modalBody.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
      <div><strong>ID Record:</strong> ${r.id}</div>
      <div><strong>Kegiatan:</strong> ${r.jenis_kegiatan}</div>
      <div><strong>NIK:</strong> ${r.nik}</div>
      <div><strong>Nama Lengkap:</strong> ${r.nama}</div>
      <div><strong>Tanggal Lahir / Usia:</strong> ${formatDateToYYYYMMDD(r.tanggal_lahir)} (${r.usia} Tahun - ${getKategoriUmur(r.usia, r.tanggal_lahir)})</div>
      <div><strong>Jenis Kelamin:</strong> ${r.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
      <div><strong>Alamat:</strong> ${r.alamat}, Kel. ${r.kelurahan}, Kec. ${r.kecamatan}</div>
      <div><strong>BB / TB / LP:</strong> ${r.bb} kg / ${r.tb} cm / ${r.lp || '-'} cm</div>
      <div><strong>IMT:</strong> ${r.imt}</div>
      <div><strong>Tekanan Darah:</strong> ${r.td_sistolik}/${r.td_diastolik} mmHg</div>
      <div><strong>Gula Darah:</strong> ${r.gula_darah} mg/dL</div>
      <div><strong>Kolesterol:</strong> ${r.kolesterol} mg/dL</div>
      <div><strong>Hemoglobin (HB):</strong> ${r.hb} g/dL</div>
      <div><strong>Status Katarak:</strong> ${r.katarak}</div>
      ${(r.nama_wali || r.nik_wali) ? `
      <div style="grid-column: 1 / -1; margin-top: 6px; padding: 12px 14px; background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 10px;">
        <div style="font-weight: 800; color: #be123c; display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
          <i class="bi bi-person-vcard-fill" style="font-size: 16px;"></i> Data Wali / Orang Tua Pasien:
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12.5px; color: #881337;">
          <div><strong>NIK Wali:</strong> ${r.nik_wali || '-'}</div>
          <div><strong>Nama Lengkap Wali:</strong> ${r.nama_wali || '-'}</div>
          <div><strong>Tanggal Lahir Wali:</strong> ${formatDateToYYYYMMDD(r.tanggal_lahir_wali) || '-'}</div>
          <div><strong>Jenis Kelamin Wali:</strong> ${r.jenis_kelamin_wali === 'L' ? 'Laki-laki' : (r.jenis_kelamin_wali === 'P' ? 'Perempuan' : '-')}</div>
          <div style="grid-column: 1 / -1;"><strong>No. WhatsApp Wali:</strong> ${r.no_whatsapp_wali ? '+62 ' + r.no_whatsapp_wali : '-'}</div>
        </div>
      </div>
      ` : ''}
    </div>
  `;

  document.getElementById('detailModalOverlay').classList.add('open');
}

function closeDetailModal() {
  document.getElementById('detailModalOverlay').classList.remove('open');
}

function editRecord(id) {
  const r = records.find(item => item.id === id);
  if (!r) return;

  openInputModal(r.jenis_kegiatan, true);
  currentEditingId = id;

  const setVal = (fieldId, val) => {
    const el = document.getElementById(fieldId);
    if (el) el.value = val !== undefined && val !== null ? val : '';
  };

  setVal('pos_lokasi', r.pos_lokasi);
  setVal('nik', r.nik);
  const nikInputEl = document.getElementById('nik');
  if (nikInputEl) nikInputEl.dataset.fromBankData = String(r.from_bank_data || r.is_bank_data || 0);
  const cleanNikVal = String(r.nik || '').replace(/\D/g, '').slice(0, 16);
  const nikCountSpan = document.getElementById('nikCharCount');
  const nikHelpText = document.getElementById('nikHelpText');
  const nikBadge = document.getElementById('nikCounterBadge');
  if (nikCountSpan) nikCountSpan.textContent = cleanNikVal.length;
  if (cleanNikVal.length === 16) {
    if (nikHelpText) {
      nikHelpText.style.color = '#059669';
      nikHelpText.innerHTML = '<i class="bi bi-check-circle-fill"></i> NIK 16 digit lengkap & valid';
    }
    if (nikBadge) {
      nikBadge.style.background = '#ecfdf5';
      nikBadge.style.color = '#059669';
      nikBadge.style.borderColor = '#a7f3d0';
    }
  } else {
    if (nikHelpText) {
      nikHelpText.style.color = '#dc2626';
      nikHelpText.innerHTML = `<i class="bi bi-exclamation-circle-fill"></i> NIK wajib 16 digit angka (kurang ${16 - cleanNikVal.length} digit)`;
    }
    if (nikBadge) {
      nikBadge.style.background = '#fef2f2';
      nikBadge.style.color = '#dc2626';
      nikBadge.style.borderColor = '#fecaca';
    }
  }
  setVal('nama', r.nama);
  setVal('tanggal_lahir', formatDateToYYYYMMDD(r.tanggal_lahir));
  setVal('usia', r.usia);
  setVal('jenis_kelamin', r.jenis_kelamin || 'L');
  setVal('no_whatsapp', r.no_whatsapp);
  setVal('status_pernikahan', r.status_pernikahan || 'MENIKAH');
  setVal('alamat', r.alamat);
  setVal('kelurahan', r.kelurahan || 'Banjaran Kota');
  setVal('kecamatan', r.kecamatan || 'Banjaran');
  setVal('kab_kota', r.kab_kota || 'Kab. Bandung');
  setVal('provinsi', r.provinsi || 'Jawa Barat');
  syncWilayahComboboxLabels();
  setVal('pekerjaan', r.pekerjaan);
  setVal('bb', r.bb);
  setVal('tb', r.tb);
  setVal('lp', r.lp);
  setVal('imt', r.imt);
  setVal('td_sistolik', r.td_sistolik);
  setVal('td_diastolik', r.td_diastolik);
  setVal('gula_darah', r.gula_darah);
  setVal('kolesterol', r.kolesterol);
  setVal('hb', r.hb);
  setVal('telinga', r.telinga || 'Normal');
  setVal('mata', r.mata || 'Normal');
  setVal('gigi', r.gigi || 'Baik');

  // Set Wali Fields
  setVal('nik_wali', r.nik_wali);
  setVal('nama_wali', r.nama_wali);
  setVal('tanggal_lahir_wali', formatDateToYYYYMMDD(r.tanggal_lahir_wali));
  setVal('jenis_kelamin_wali', r.jenis_kelamin_wali);
  setVal('no_whatsapp_wali', r.no_whatsapp_wali);
  const chkWali = document.getElementById('wali_nomor_sama');
  if (chkWali) chkWali.checked = !!r.wali_nomor_sama;
  const countWali = document.getElementById('nikWaliCounter');
  if (countWali) {
    const len = (r.nik_wali || '').length;
    countWali.textContent = len;
    countWali.style.color = len === 16 ? '#16a34a' : '#64748b';
  }

  // Pre-select Kategori Sasaran
  let kat = r.kategori_sasaran;
  if (!kat) {
    const age = parseInt(r.usia) || 0;
    const months = getRecordAgeMonths(r);
    if (months !== null) {
      if (months <= 59) kat = 'bayi_balita';
      else if (months <= 72 || age <= 6) kat = 'prasekolah';
      else if (age < 18) kat = 'sekolah_remaja';
      else if (age < 60) kat = 'dewasa';
      else kat = 'lansia';
    } else {
      if (age < 5) kat = 'bayi_balita';
      else if (age <= 6) kat = 'prasekolah';
      else if (age < 18) kat = 'sekolah_remaja';
      else if (age < 60) kat = 'dewasa';
      else kat = 'lansia';
    }
  }
  const katRadio = document.getElementById(`kat_${kat}`);
  if (katRadio) katRadio.checked = true;
  updateDataWaliVisibility();

  // Fix Radio Buttons for Merokok, Katarak, and Jenis Kegiatan
  const isRokok = String(r.merokok || '').toUpperCase() === 'YA';
  if (isRokok) {
    const el = document.getElementById('rokok_ya');
    if (el) el.checked = true;
  } else {
    const el = document.getElementById('rokok_tidak');
    if (el) el.checked = true;
  }

  const isKatarak = String(r.katarak || '').toUpperCase() === 'YA';
  if (isKatarak) {
    const el = document.getElementById('katarak_ya');
    if (el) el.checked = true;
  } else {
    const el = document.getElementById('katarak_tidak');
    if (el) el.checked = true;
  }

  if (r.jenis_kegiatan === 'Dalam Gedung') {
    const el = document.getElementById('kegiatan_dalam');
    if (el) el.checked = true;
  } else {
    const el = document.getElementById('kegiatan_luar');
    if (el) el.checked = true;
  }

  calculateIMT();
}




/* ==========================================================================
   📊 EXPORT & IMPORT XLSX ENGINE (SheetJS)
   ========================================================================== */

function exportToXLSX() {
  if (records.length === 0) {
    showToast('Tidak ada data untuk diekspor!', 'error');
    return;
  }

  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  const isPrivileged = (role === 'admin' || role === 'koordinator');
  const loggedUser = sessionStorage.getItem('ckg_user_name') || '';

  // Build Officers Dropdown Options
  let petugasOptionsHtml = '';
  if (isPrivileged) {
    petugasOptionsHtml = `<option value="">-- Semua Petugas --</option>`;
    if (Array.isArray(usersDb) && usersDb.length > 0) {
      usersDb.forEach(u => {
        petugasOptionsHtml += `<option value="${escapeAttr(u.nama_user)}">${u.nama_user}</option>`;
      });
    }
  } else {
    petugasOptionsHtml = `<option value="${escapeAttr(loggedUser)}" selected>${loggedUser}</option>`;
  }

  const disabledPetugasAttr = isPrivileged ? '' : 'disabled="disabled"';
  const petugasLockNote = isPrivileged
    ? ''
    : `<div style="font-size: 11.5px; color: #0284c7; margin-top: 4px; font-weight: 600;"><i class="bi bi-lock-fill"></i> Terkunci: Petugas hanya dapat mengunduh data miliknya sendiri.</div>`;

  let exportYearOptionsHtml = '<option value="">-- Semua Tahun --</option>';
  const curY = new Date().getFullYear();
  for (let y = 2045; y >= 2000; y--) {
    exportYearOptionsHtml += `<option value="${y}" ${y === curY ? 'selected' : ''}>${y}</option>`;
  }

  Swal.fire({
    title: '<div style="font-size: 17px; font-weight: 800; color: #065f46; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="bi bi-file-earmark-excel-fill" style="color: #10b981; font-size: 22px;"></i> Filter Download Data CKG (Excel)</div>',
    html: `
      <div style="text-align: left; font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px 6px;">
        <p style="color: #64748b; margin-bottom: 14px; line-height: 1.5;">Silakan pilih filter bulan, tahun, dan petugas entry untuk menyaring data yang ingin diunduh:</p>
        
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;"><i class="bi bi-calendar3" style="color: #0284c7;"></i> Pilih Bulan:</label>
          <select id="swalExportBulan" class="swal2-input" style="width: 100%; margin: 0; font-size: 13px; padding: 8px 12px; height: 42px; border-radius: 8px; font-weight: 600;">
            <option value="">-- Semua Bulan --</option>
            <option value="01">Januari</option>
            <option value="02">Februari</option>
            <option value="03">Maret</option>
            <option value="04">April</option>
            <option value="05">Mei</option>
            <option value="06">Juni</option>
            <option value="07">Juli</option>
            <option value="08">Agustus</option>
            <option value="09">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;"><i class="bi bi-calendar-year" style="color: #0284c7;"></i> Pilih Tahun:</label>
          <select id="swalExportTahun" class="swal2-input" style="width: 100%; margin: 0; font-size: 13px; padding: 8px 12px; height: 42px; border-radius: 8px; font-weight: 600;">
            ${exportYearOptionsHtml}
          </select>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;"><i class="bi bi-person-badge" style="color: #0284c7;"></i> Nama Petugas Entry:</label>
          <select id="swalExportPetugas" class="swal2-input" ${disabledPetugasAttr} style="width: 100%; margin: 0; font-size: 13px; padding: 8px 12px; height: 42px; border-radius: 8px; font-weight: 700; ${!isPrivileged ? 'background-color: #f1f5f9; cursor: not-allowed;' : ''}">
            ${petugasOptionsHtml}
          </select>
          ${petugasLockNote}
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-download"></i> Unduh Excel (.xlsx)',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#059669',
    cancelButtonColor: '#64748b',
    preConfirm: () => {
      const bulanVal = document.getElementById('swalExportBulan')?.value || '';
      const tahunVal = document.getElementById('swalExportTahun')?.value || '';
      const petugasVal = isPrivileged
        ? (document.getElementById('swalExportPetugas')?.value || '')
        : loggedUser;

      return { bulanVal, tahunVal, petugasVal };
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const { bulanVal, tahunVal, petugasVal } = result.value;
      processExportXLSX(bulanVal, tahunVal, petugasVal);
    }
  });
}

function processExportXLSX(bulanVal, tahunVal, petugasVal) {
  let targetRecords = getVisibleRecords(records);

  if (bulanVal) {
    targetRecords = targetRecords.filter(r => {
      const d = getRecordEntryDate(r);
      return d ? d.month === bulanVal : false;
    });
  }

  if (tahunVal) {
    targetRecords = targetRecords.filter(r => {
      const d = getRecordEntryDate(r);
      return d ? d.year === tahunVal : false;
    });
  }

  if (petugasVal) {
    targetRecords = targetRecords.filter(r => r.created_by === petugasVal || r.petugas_entry === petugasVal);
  }

  if (targetRecords.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Data Tidak Ditemukan',
      text: 'Tidak ada data rekam medis CKG yang cocok dengan kriteria filter yang Anda pilih.',
      confirmButtonColor: '#2563eb'
    });
    return;
  }

  showLoadingOverlay('Mengekspor Data...', `Menyusun ${targetRecords.length} Data Excel (.XLSX)`);

  setTimeout(() => {
    try {
      const headers = [
        "ID", "Jenis Kegiatan", "Kategori Sasaran", "Kategori Usia ILP", "NIK Pasien", "Nama Pasien", "Tanggal Lahir", "Usia",
        "Jenis Kelamin", "No WhatsApp", "NIK Wali", "Nama Wali", "Tgl Lahir Wali", "JK Wali", "No WA Wali",
        "Status Nikah", "Provinsi", "Kab/Kota", "Kecamatan",
        "Kelurahan", "Alamat", "Pekerjaan", "Merokok", "BB (kg)", "TB (cm)", "LP (cm)", "IMT",
        "TD Sistolik", "TD Diastolik", "Gula Darah (mg/dL)", "Kolesterol (mg/dL)", "HB (g/dL)",
        "Pemeriksaan Telinga", "Pemeriksaan Mata", "Pemeriksaan Gigi", "Pemeriksaan Katarak",
        "Status Validasi", "Petugas Entry", "Tanggal Entry"
      ];

      const rows = targetRecords.map(r => [
        r.id || '',
        r.jenis_kegiatan || 'Luar Gedung',
        r.kategori_sasaran || '',
        getKategoriUmur(r.usia, r.tanggal_lahir),
        r.nik || '',
        r.nama || r.nama_pasien || '',
        formatDateToYYYYMMDD(r.tanggal_lahir),
        r.usia || 0,
        r.jenis_kelamin || 'L',
        r.no_whatsapp || '',
        r.nik_wali || '',
        r.nama_wali || '',
        formatDateToYYYYMMDD(r.tanggal_lahir_wali),
        r.jenis_kelamin_wali || '',
        r.no_whatsapp_wali || '',
        r.status_pernikahan || 'Belum Menikah',
        r.provinsi || 'Jawa Barat',
        r.kab_kota || 'Kab. Bandung',
        r.kecamatan || 'Banjaran',
        r.kelurahan || 'Banjaran Kota',
        r.alamat || '',
        r.pekerjaan || '',
        r.merokok || 'Tidak',
        r.bb || '',
        r.tb || '',
        r.lp || '',
        r.imt || '',
        r.td_sistolik || '',
        r.td_diastolik || '',
        r.gula_darah || '',
        r.kolesterol || '',
        r.hb || '',
        r.telinga || 'Normal',
        r.mata || 'Normal',
        r.gigi || 'Baik',
        r.katarak || 'Tidak',
        r.status_validasi || 'Terverifikasi',
        r.created_by || r.petugas_entry || sessionStorage.getItem('ckg_user_name') || 'Admin',
        formatDateToYYYYMMDD(r.created_at || r.tanggal_entry)
      ]);

      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Auto width for columns
      const colWidths = headers.map(h => ({ wch: Math.max(h.length + 3, 14) }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data BNBA CKG");

      const fileDateStr = new Date().toISOString().substring(0, 10);
      const safePetugasLabel = petugasVal ? petugasVal.replace(/\s+/g, '_') : 'SemuaPetugas';
      const filename = `Laporan_BNBA_CKG_${safePetugasLabel}_${tahunVal || 'All'}-${bulanVal || 'All'}_${fileDateStr}.xlsx`;
      XLSX.writeFile(wb, filename);

      hideLoadingOverlay();
      showToast(`✓ Berhasil Mengunduh ${targetRecords.length} Data CKG!`, 'success');
    } catch (err) {
      hideLoadingOverlay();
      console.error('Export XLSX error:', err);
      showToast('Gagal mengekspor data ke Excel: ' + err.message, 'error');
    }
  }, 400);
}

// Keep exportToCSV as alias for backward compatibility
function exportToCSV() {
  exportToXLSX();
}

/**
 * Export Data CKG to Excel (.XLSX) in the format matching Bot ENCO (CKG Umum)
 * Compatible with Bot ENCO Pendaftaran & Pelayanan tabs.
 */
function exportToBotEncoXLSX(source = 'records') {
  const dataPool = (source === 'ckg-gratis') ? ckgGratisRecords : records;
  if (dataPool.length === 0) {
    showToast(source === 'ckg-gratis' ? 'Tidak ada data Cek Kesehatan Gratis untuk diekspor!' : 'Tidak ada data untuk diekspor!', 'error');
    return;
  }

  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  const isPrivileged = (role === 'admin' || role === 'koordinator');
  const loggedUser = sessionStorage.getItem('ckg_user_name') || '';

  // Build Officers Dropdown Options
  let petugasOptionsHtml = '';
  if (isPrivileged) {
    petugasOptionsHtml = `<option value="">-- Semua Petugas --</option>`;
    if (Array.isArray(usersDb) && usersDb.length > 0) {
      usersDb.forEach(u => {
        petugasOptionsHtml += `<option value="${escapeAttr(u.nama_user)}">${u.nama_user}</option>`;
      });
    }
  } else {
    petugasOptionsHtml = `<option value="${escapeAttr(loggedUser)}" selected>${loggedUser}</option>`;
  }

  const disabledPetugasAttr = isPrivileged ? '' : 'disabled="disabled"';
  const petugasLockNote = isPrivileged
    ? ''
    : `<div style="font-size: 11.5px; color: #0284c7; margin-top: 4px; font-weight: 600;"><i class="bi bi-lock-fill"></i> Terkunci: Petugas hanya dapat mengunduh data miliknya sendiri.</div>`;

  let exportYearOptionsHtml = '<option value="">-- Semua Tahun --</option>';
  const curY = new Date().getFullYear();
  for (let y = 2045; y >= 2000; y--) {
    exportYearOptionsHtml += `<option value="${y}" ${y === curY ? 'selected' : ''}>${y}</option>`;
  }

  Swal.fire({
    title: '<div style="font-size: 17px; font-weight: 800; color: #065f46; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="bi bi-robot" style="color: #10b981; font-size: 24px;"></i> Download Data CKG (Format Bot ENCO)</div>',
    html: `
      <div style="text-align: left; font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px 6px;">
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; color: #065f46; font-size: 12.5px; line-height: 1.5;">
          <strong>Format Kompatibel Bot ENCO:</strong> File Excel (.xlsx) yang diunduh langsung dapat di-upload ke menu <strong>Pendaftaran</strong> dan <strong>Pelayanan (CKG Umum)</strong> pada ekstensi Bot ENCO.
        </div>
        
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;"><i class="bi bi-people-fill" style="color: #059669;"></i> Kategori Sasaran:</label>
          <select id="swalEncoKategori" class="swal2-input" style="width: 100%; margin: 0; font-size: 13px; padding: 8px 12px; height: 42px; border-radius: 8px; font-weight: 600;">
            <option value="umum" selected>CKG Umum (Dewasa & Lansia) [Rekomendasi]</option>
            <option value="dewasa">Usia Dewasa Saja (18 - 59 tahun)</option>
            <option value="lansia">Lansia Saja (>= 60 tahun)</option>
            <option value="semua">Semua Kategori (Tanpa Filter Kategori)</option>
          </select>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;"><i class="bi bi-calendar3" style="color: #059669;"></i> Pilih Bulan:</label>
          <select id="swalEncoBulan" class="swal2-input" style="width: 100%; margin: 0; font-size: 13px; padding: 8px 12px; height: 42px; border-radius: 8px; font-weight: 600;">
            <option value="">-- Semua Bulan --</option>
            <option value="01">Januari</option>
            <option value="02">Februari</option>
            <option value="03">Maret</option>
            <option value="04">April</option>
            <option value="05">Mei</option>
            <option value="06">Juni</option>
            <option value="07">Juli</option>
            <option value="08">Agustus</option>
            <option value="09">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;"><i class="bi bi-calendar-event" style="color: #059669;"></i> Pilih Tahun:</label>
          <select id="swalEncoTahun" class="swal2-input" style="width: 100%; margin: 0; font-size: 13px; padding: 8px 12px; height: 42px; border-radius: 8px; font-weight: 600;">
            ${exportYearOptionsHtml}
          </select>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;"><i class="bi bi-person-badge" style="color: #059669;"></i> Nama Petugas Entry:</label>
          <select id="swalEncoPetugas" class="swal2-input" ${disabledPetugasAttr} style="width: 100%; margin: 0; font-size: 13px; padding: 8px 12px; height: 42px; border-radius: 8px; font-weight: 700; ${!isPrivileged ? 'background-color: #f1f5f9; cursor: not-allowed;' : ''}">
            ${petugasOptionsHtml}
          </select>
          ${petugasLockNote}
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-download"></i> Unduh Format Bot ENCO (.xlsx)',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#059669',
    cancelButtonColor: '#64748b',
    preConfirm: () => {
      const kategoriVal = document.getElementById('swalEncoKategori')?.value || 'umum';
      const bulanVal = document.getElementById('swalEncoBulan')?.value || '';
      const tahunVal = document.getElementById('swalEncoTahun')?.value || '';
      const petugasVal = isPrivileged
        ? (document.getElementById('swalEncoPetugas')?.value || '')
        : loggedUser;

      return { kategoriVal, bulanVal, tahunVal, petugasVal };
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const { kategoriVal, bulanVal, tahunVal, petugasVal } = result.value;
      processExportBotEncoXLSX(kategoriVal, bulanVal, tahunVal, petugasVal, source);
    }
  });
}

function processExportBotEncoXLSX(kategoriVal, bulanVal, tahunVal, petugasVal, source = 'records') {
  const dataPool = (source === 'ckg-gratis') ? ckgGratisRecords : records;
  let targetRecords = getVisibleRecords(dataPool);

  // Filter Kategori
  if (kategoriVal === 'umum') {
    targetRecords = targetRecords.filter(r => {
      const kat = String(r.kategori_sasaran || '').toLowerCase();
      if (kat === 'dewasa' || kat === 'lansia' || kat.includes('dewasa') || kat.includes('lansia')) return true;
      const usiaNum = parseInt(r.usia);
      if (!isNaN(usiaNum) && usiaNum >= 18) return true;
      return false;
    });
  } else if (kategoriVal === 'dewasa') {
    targetRecords = targetRecords.filter(r => {
      const kat = String(r.kategori_sasaran || '').toLowerCase();
      return kat === 'dewasa' || kat.includes('dewasa');
    });
  } else if (kategoriVal === 'lansia') {
    targetRecords = targetRecords.filter(r => {
      const kat = String(r.kategori_sasaran || '').toLowerCase();
      return kat === 'lansia' || kat.includes('lansia');
    });
  }

  // Filter Bulan
  if (bulanVal) {
    targetRecords = targetRecords.filter(r => {
      const d = getRecordEntryDate(r);
      return d ? d.month === bulanVal : false;
    });
  }

  // Filter Tahun
  if (tahunVal) {
    targetRecords = targetRecords.filter(r => {
      const d = getRecordEntryDate(r);
      return d ? d.year === tahunVal : false;
    });
  }

  // Filter Petugas
  if (petugasVal) {
    targetRecords = targetRecords.filter(r => r.created_by === petugasVal || r.petugas_entry === petugasVal);
  }

  if (targetRecords.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Data Tidak Ditemukan',
      text: 'Tidak ada data rekam medis CKG yang cocok dengan kriteria filter yang Anda pilih.',
      confirmButtonColor: '#059669'
    });
    return;
  }

  showLoadingOverlay('Mengekspor Data Bot ENCO...', `Menyusun ${targetRecords.length} Data Excel Template Bot ENCO (.XLSX)`);

  setTimeout(() => {
    try {
      // Headers matching TEMPLATE BOT CKG.xlsx (first 23 columns) + KOLESTEROL & HB
      const headers = [
        "NIK", "NAMA", "TANGGAL LAHIR", "JENIS KELAMIN", "NO WHATSAPP",
        "STATUS PERNIKAHAN", "PROVINSI", "KAB/KOTA", "KECAMATAN", "KELURAHAN",
        "ALAMAT", "PEKERJAAN", "MEROKOK", "BB", "TB", "LP",
        "TD SISTOLIK", "TD DIASTOLIK", "GULA DARAH", "TELINGA", "MATA", "GIGI", "KATARAK",
        "KOLESTEROL", "HB"
      ];

      // Sanitizers
      const sanitizeNikStr = (val) => {
        let s = String(val || '').trim().replace(/\D/g, '');
        return s;
      };

      const formatGenderBot = (val) => {
        const s = String(val || '').trim().toUpperCase();
        if (s.startsWith('L') || s.includes('LAKI')) return 'L';
        if (s.startsWith('P') || s.includes('PEREMPUAN')) return 'P';
        return 'L';
      };

      const formatWaBot = (val) => {
        let s = String(val || '').trim().replace(/\D/g, '');
        if (!s) return '081234567890';
        if (s.startsWith('62')) s = '0' + s.slice(2);
        if (!s.startsWith('0')) s = '0' + s;
        return s;
      };

      const formatNikahBot = (val) => {
        const s = String(val || '').trim().toLowerCase();
        if (s.includes('belum')) return 'BELUM MENIKAH';
        if (s.includes('mati')) return 'CERAI MATI';
        if (s.includes('hidup') || s.includes('cerai')) return 'CERAI HIDUP';
        if (s.includes('kawin') || s.includes('menikah') || s.includes('nikah')) return 'MENIKAH';
        return 'BELUM MENIKAH';
      };

      const formatMerokokBot = (val) => {
        const s = String(val || '').trim().toLowerCase();
        return (s === 'ya' || s.includes('ya') || s === 'true' || s === '1' || s.includes('iya')) ? 'Ya' : 'Tidak';
      };

      const formatNum = (val) => {
        if (val === null || val === undefined || val === '') return '';
        const n = Number(String(val).replace(',', '.'));
        return isNaN(n) ? '' : n;
      };

      const rows = targetRecords.map(r => {
        const cleanNik = sanitizeNikStr(r.nik || r.nik_pasien || '');
        const cleanNama = String(r.nama || r.nama_pasien || '').trim();
        const tglLahir = formatDateToYYYYMMDD(r.tanggal_lahir);
        const jk = formatGenderBot(r.jenis_kelamin);
        const wa = formatWaBot(r.no_whatsapp);
        const statusNikah = formatNikahBot(r.status_pernikahan);
        const prov = String(r.provinsi || 'JAWA BARAT').trim().toUpperCase();
        const kab = String(r.kab_kota || 'KAB. BANDUNG').trim().toUpperCase();
        const kec = String(r.kecamatan || 'BANJARAN').trim().toUpperCase();
        const kel = String(r.kelurahan || 'BANJARAN KOTA').trim().toUpperCase();
        const alamat = String(r.alamat || 'BANJARAN').trim();
        const pekerjaan = String(r.pekerjaan || 'Lainnya').trim();
        const merokok = formatMerokokBot(r.merokok);

        const bb = formatNum(r.bb);
        const tb = formatNum(r.tb);
        const lp = formatNum(r.lp);
        const tdSis = formatNum(r.td_sistolik);
        const tdDia = formatNum(r.td_diastolik);
        const gula = formatNum(r.gula_darah);
        const telinga = r.telinga || 'Normal';
        const mata = r.mata || 'Normal';
        const gigi = r.gigi || 'Baik';
        const katarak = (String(r.katarak || '').toLowerCase().includes('ya')) ? 'Katarak' : 'Normal';
        const kol = formatNum(r.kolesterol);
        const hb = formatNum(r.hb);

        return [
          cleanNik,
          cleanNama,
          tglLahir,
          jk,
          wa,
          statusNikah,
          prov,
          kab,
          kec,
          kel,
          alamat,
          pekerjaan,
          merokok,
          bb,
          tb,
          lp,
          tdSis,
          tdDia,
          gula,
          telinga,
          mata,
          gigi,
          katarak,
          kol,
          hb
        ];
      });

      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Explicitly lock NIK and WhatsApp cell types as String ('s') to prevent scientific notation in Excel
      if (ws['!ref']) {
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
          // Col 0: NIK
          const nikCellRef = XLSX.utils.encode_cell({ r: R, c: 0 });
          if (ws[nikCellRef]) {
            ws[nikCellRef].t = 's';
            ws[nikCellRef].z = '@';
          }
          // Col 4: NO WHATSAPP
          const waCellRef = XLSX.utils.encode_cell({ r: R, c: 4 });
          if (ws[waCellRef]) {
            ws[waCellRef].t = 's';
            ws[waCellRef].z = '@';
          }
        }
      }

      // Auto width for columns
      const colWidths = headers.map(h => ({ wch: Math.max(h.length + 4, 15) }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

      const fileDateStr = new Date().toISOString().substring(0, 10);
      const safePetugasLabel = petugasVal ? petugasVal.replace(/\s+/g, '_') : 'SemuaPetugas';
      const safeKatLabel = kategoriVal ? kategoriVal.toUpperCase() : 'UMUM';
      const filename = `DATA_BOT_ENCO_CKG_${safeKatLabel}_${safePetugasLabel}_${tahunVal || 'All'}-${bulanVal || 'All'}_${fileDateStr}.xlsx`;
      XLSX.writeFile(wb, filename);

      hideLoadingOverlay();
      showToast(`✓ Berhasil Mengunduh ${targetRecords.length} Data CKG Format Bot ENCO!`, 'success');
    } catch (err) {
      hideLoadingOverlay();
      console.error('Export Bot ENCO XLSX error:', err);
      showToast('Gagal mengekspor data ke Excel Bot ENCO: ' + err.message, 'error');
    }
  }, 400);
}

let selectedImportFile = null;

function openImportModal(target = 'records') {
  currentImportTarget = target || 'records';
  const modal = document.getElementById('importModal');
  if (modal) modal.classList.add('open', 'active');
  selectedImportFile = null;
  const fileDetails = document.getElementById('importFileDetails');
  const btnExec = document.getElementById('btnExecuteImport');
  if (fileDetails) fileDetails.style.display = 'none';
  if (btnExec) btnExec.disabled = true;
  const fileInput = document.getElementById('importFileInput');
  if (fileInput) fileInput.value = '';

  const tanggalInput = document.getElementById('importTanggalEntry');
  if (tanggalInput) {
    tanggalInput.value = new Date().toISOString().substring(0, 10);
  }

  // Populate & handle Target Petugas select dropdown based on Role
  const targetSelect = document.getElementById('importTargetPetugas');
  const targetHint = document.getElementById('importTargetPetugasHint');
  const loggedUser = sessionStorage.getItem('ckg_user_name') || 'Mochamad Fauzie, S.Gz';
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();

  if (targetSelect) {
    targetSelect.innerHTML = '';

    // Get list of registered users sorted by role hierarchy (Admin -> Koordinator -> Petugas)
    sortUsersDbByRoleHierarchy();

    let userList = [];
    if (Array.isArray(usersDb) && usersDb.length > 0) {
      userList = usersDb.map(u => (u.nama_user || u.nama || '').trim()).filter(Boolean);
    }

    if (userList.length === 0) {
      try {
        const stored = JSON.parse(localStorage.getItem('ckg_user_db') || '[]');
        if (Array.isArray(stored) && stored.length > 0) {
          userList = stored.map(u => (u.nama_user || u.nama || '').trim()).filter(Boolean);
        }
      } catch (_) { }
    }

    // Deduplicate user list while preserving sorted role order
    userList = Array.from(new Set(userList));

    // Ensure loggedUser is in the list
    if (loggedUser && !userList.includes(loggedUser)) {
      userList.unshift(loggedUser);
    }

    userList.forEach(uName => {
      const opt = document.createElement('option');
      opt.value = uName;
      opt.textContent = uName;
      if (uName === loggedUser) opt.selected = true;
      targetSelect.appendChild(opt);
    });

    if (role === 'admin') {
      targetSelect.disabled = false;
      targetSelect.style.backgroundColor = '#ffffff';
      targetSelect.style.cursor = 'pointer';
      if (targetHint) {
        targetHint.innerHTML = `<i class="bi bi-unlock-fill" style="color: #059669; font-size: 13px;"></i> <strong style="color: #059669;">Akses Admin Unlocked:</strong> Memilih dari total ${userList.length} User Terdaftar di Database.`;
      }
    } else {
      // Role Koordinator & Petugas -> LOCKED
      targetSelect.value = loggedUser;
      targetSelect.disabled = true;
      targetSelect.style.backgroundColor = '#f1f5f9';
      targetSelect.style.cursor = 'not-allowed';
      if (targetHint) {
        targetHint.innerHTML = `<i class="bi bi-lock-fill" style="color: #dc2626; font-size: 13px;"></i> <strong style="color: #dc2626;">Role ${sessionStorage.getItem('ckg_user_role') || 'Petugas'}:</strong> Terkunci otomatis ke nama akun Anda (${loggedUser}).`;
      }
    }
  }
}

function closeImportModal() {
  const modal = document.getElementById('importModal');
  if (modal) modal.classList.remove('open', 'active');
}

function openAccountSettingsModal() {
  const loggedUser = sessionStorage.getItem('ckg_user_name') || 'Mochamad Fauzie, S.Gz';
  const role = sessionStorage.getItem('ckg_user_role') || 'Admin';

  const namaInput = document.getElementById('accountSettingNamaUser');
  const roleBadge = document.getElementById('accountSettingRole');
  const passInput = document.getElementById('accountSettingNewPassword');
  const confirmInput = document.getElementById('accountSettingConfirmPassword');

  if (namaInput) namaInput.value = loggedUser;
  if (roleBadge) roleBadge.textContent = role.toUpperCase();
  if (passInput) passInput.value = '';
  if (confirmInput) confirmInput.value = '';

  const modal = document.getElementById('accountSettingsModalOverlay');
  if (modal) modal.classList.add('open', 'active');
}

function closeAccountSettingsModal() {
  const modal = document.getElementById('accountSettingsModalOverlay');
  if (modal) modal.classList.remove('open', 'active');
}

async function handleSaveAccountSettings(e) {
  if (e) e.preventDefault();

  const loggedUser = sessionStorage.getItem('ckg_user_name') || 'Mochamad Fauzie, S.Gz';
  const newPass = (document.getElementById('accountSettingNewPassword')?.value || '').trim();
  const confirmPass = (document.getElementById('accountSettingConfirmPassword')?.value || '').trim();

  if (!newPass) {
    showToast('Masukkan password baru terlebih dahulu!', 'warning');
    return;
  }

  if (newPass !== confirmPass) {
    showToast('Konfirmasi password baru tidak cocok!', 'error');
    return;
  }

  showLoadingOverlay('Menyimpan Password...', 'Memperbarui kredensial akun user');

  try {
    // 1. Update global usersDb & local storage ckg_user_db
    let foundUser = usersDb.find(u => (u.nama_user || u.nama) === loggedUser);
    if (foundUser) {
      foundUser.password = newPass;
    } else {
      usersDb.push({
        nama_user: loggedUser,
        password: newPass,
        role: sessionStorage.getItem('ckg_user_role') || 'Petugas'
      });
    }
    saveUserDatabaseToStorage();

    // 2. Sync password to Cloud D1 Database via /api/users
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_password',
          nama_user: loggedUser,
          password: newPass
        })
      });
    } catch (err) {
      console.warn('Sync password cloud warning:', err);
    }

    hideLoadingOverlay();
    closeAccountSettingsModal();

    Swal.fire({
      icon: 'success',
      title: 'Setting Akun Berhasil!',
      html: `Password untuk akun <strong>[${loggedUser}]</strong> berhasil diperbarui/ditambahkan.`,
      confirmButtonColor: '#2563eb'
    });

  } catch (err) {
    hideLoadingOverlay();
    console.error('Save account setting error:', err);
    Swal.fire('Gagal Menyimpan', err.message, 'error');
  }
}

function handleImportFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  selectedImportFile = file;
  const fileDetails = document.getElementById('importFileDetails');
  const fileNameEl = document.getElementById('importFileName');
  const btnExec = document.getElementById('btnExecuteImport');

  // Read file to count valid 16-digit NIK rows
  const countReader = new FileReader();
  countReader.onload = function (ev) {
    try {
      const d = new Uint8Array(ev.target.result);
      const wb = XLSX.read(d, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      let valid16Count = 0;
      let invalidNikCount = 0;
      rows.forEach(r => {
        const keys = Object.keys(r);
        const hasNama = keys.some(k => /nama/i.test(k) && String(r[k]).trim());
        let rawNik = '';
        for (let k of keys) {
          if (/nik|ktp/i.test(k) && String(r[k]).trim()) { rawNik = String(r[k]).trim(); break; }
        }
        if (!hasNama && !rawNik) return;
        const cleanNik = extractCleanNik16(rawNik);
        if (cleanNik.length === 16) {
          valid16Count++;
        } else {
          invalidNikCount++;
        }
      });
      if (fileNameEl) {
        let text = `<strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB) - <span style="color:#059669;font-weight:700;">${valid16Count} NIK Valid (16 Digit)</span>`;
        if (invalidNikCount > 0) {
          text += ` <span style="color:#dc2626;font-size:12px;font-weight:600;">(${invalidNikCount} data NIK tidak 16 digit ditolak)</span>`;
        }
        fileNameEl.innerHTML = text;
      }
    } catch (_) {
      if (fileNameEl) fileNameEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    }
  };
  countReader.readAsArrayBuffer(file);

  if (fileDetails) fileDetails.style.display = 'block';
  if (btnExec) btnExec.disabled = false;
}

/* ==========================================================================
   👑 FITUR IMPORT DATA KHUSUS ADMIN (MULTI-PETUGAS)
   ========================================================================== */

let selectedAdminImportFile = null;
let parsedAdminRecords = [];

function openAdminImportModal() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  if (role !== 'admin') {
    if (typeof Swal !== 'undefined') {
      Swal.fire('Akses Ditolak', 'Fitur Import Multi-Petugas ini khusus untuk Role Admin.', 'warning');
    } else {
      showToast('Akses khusus Admin!', 'error');
    }
    return;
  }

  const modal = document.getElementById('adminImportModal');
  if (modal) modal.classList.add('open', 'active');

  selectedAdminImportFile = null;
  parsedAdminRecords = [];

  const previewArea = document.getElementById('adminImportPreviewArea');
  const btnExec = document.getElementById('btnExecuteAdminImport');
  const fileInput = document.getElementById('adminImportFileInput');
  const tglInput = document.getElementById('adminImportTanggalEntry');

  if (previewArea) {
    previewArea.style.display = 'none';
    previewArea.innerHTML = '';
  }
  if (btnExec) btnExec.disabled = true;
  if (fileInput) fileInput.value = '';
  if (tglInput) tglInput.value = new Date().toISOString().substring(0, 10);
}

function closeAdminImportModal() {
  const modal = document.getElementById('adminImportModal');
  if (modal) modal.classList.remove('open', 'active');
}

function downloadAdminXLSXTemplate() {
  try {
    const headers = [
      "Petugas Entry", "Jenis Kegiatan", "Tanggal Entry", "NIK", "Nama Pasien", "Tanggal Lahir", "Usia",
      "Jenis Kelamin", "No WhatsApp", "Status Pernikahan", "Provinsi", "Kab/Kota",
      "Kecamatan", "Kelurahan", "Alamat Lengkap", "Pekerjaan", "Merokok",
      "BB (kg)", "TB (cm)", "LP (cm)", "IMT", "TD Sistolik", "TD Diastolik",
      "Gula Darah (mg/dL)", "Kolesterol (mg/dL)", "HB (g/dL)",
      "Pemeriksaan Telinga", "Pemeriksaan Mata", "Pemeriksaan Gigi", "Pemeriksaan Katarak"
    ];

    const sampleRow1 = [
      "Teti Nuryati, S.Keb, Bdn", "Luar Gedung", "2026-08-01", "3204123456780001", "Euis Saribanon", "1962-12-01", 63,
      "P", "081234567890", "Kawin", "Jawa Barat", "Kab. Bandung",
      "Banjaran", "Banjaran Kota", "Kp. Cileutik RT 01/08", "Ibu Rumah Tangga", "Tidak",
      54, 153, 80, 23.07, 135, 99, 91, 180, 13.2, "Normal", "Normal", "Baik", "Tidak"
    ];

    const sampleRow2 = [
      "Mochamad Fauzie, S.Gz", "Luar Gedung", "2026-08-01", "3204134109910006", "Seny Septiany", "1991-09-01", 34,
      "P", "085712345678", "Kawin", "Jawa Barat", "Kab. Bandung",
      "Banjaran", "Banjaran Kota", "Bojongpulus", "Wiraswasta", "Tidak",
      56, 59, 80, 160.87, 120, 92, 90, 180, 12.5, "Normal", "Normal", "Baik", "Tidak"
    ];

    const sampleRow3 = [
      "Anisa Rohmatunisa, AM.Keb", "Dalam Gedung", "2026-08-02", "3273076009850004", "Nur Fajarwati Arifah", "1985-09-20", 40,
      "P", "082198765432", "Kawin", "Jawa Barat", "Kab. Bandung",
      "Banjaran", "Banjaran Kota", "Cipaku RT 02/02", "PNS", "Tidak",
      69, 155, 80, 28.72, 125, 96, 94, 180, 13.0, "Normal", "Normal", "Baik", "Tidak"
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow1, sampleRow2, sampleRow3]);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 3, 16) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template CKG Multi Petugas");
    XLSX.writeFile(wb, `Template_Import_Admin_MultiPetugas_CKG_${new Date().toISOString().substring(0, 10)}.xlsx`);

    showToast('Template Excel Khusus Admin Berhasil Diunduh!', 'success');
  } catch (err) {
    console.error('Download admin template error:', err);
    if (typeof Swal !== 'undefined') Swal.fire('Gagal Download Template', err.message, 'error');
  }
}

function handleAdminImportFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  selectedAdminImportFile = file;
  parsedAdminRecords = [];

  const previewArea = document.getElementById('adminImportPreviewArea');
  const btnExec = document.getElementById('btnExecuteAdminImport');
  const fallbackTanggal = document.getElementById('adminImportTanggalEntry')?.value || new Date().toISOString().substring(0, 10);
  const loggedAdmin = sessionStorage.getItem('ckg_user_name') || 'Admin';

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        showToast('File Excel tidak valid!', 'error');
        return;
      }

      const ws = workbook.Sheets[workbook.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (jsonRows.length === 0) {
        showToast('File Excel kosong!', 'warning');
        return;
      }

      const groupedSummary = {};
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
              if (keyClean.includes(target) && !keyClean.includes('faskes')) return String(row[rowKey]).trim();
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

        let petugasName = getVal('Petugas Entry', 'Petugas', 'Petugas Skrining', 'Created By', 'Nama Petugas');
        if (!petugasName) petugasName = loggedAdmin;

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
        const rowDate = formatDateToYYYYMMDD(rawRowDate) || fallbackTanggal;

        const record = {
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
          petugas_entry: petugasName,
          created_by: petugasName,
          created_at: rowDate, tanggal_entry: rowDate, tanggal: rowDate
        };

        parsedAdminRecords.push(record);
        groupedSummary[petugasName] = (groupedSummary[petugasName] || 0) + 1;
      });

      window.__lastAdminImportSkippedNik = skippedInvalidNik;

      if (parsedAdminRecords.length === 0) {
        if (skippedInvalidNik > 0) {
          const sampleList = sampleInvalidNik.map(s => `• <b>${s.nama}</b>: NIK "${s.nik}" (${s.len} digit)`).join('<br>');
          Swal.fire({
            icon: 'warning',
            title: 'Semua Data Ditolak (NIK Tidak 16 Digit)',
            html: `<div style="font-size:13px; text-align:left; line-height:1.6;">
                    Sebanyak <b>${skippedInvalidNik} baris data</b> ditolak karena NIK <b>tidak persis 16 digit</b> (kurang atau lebih).<br><br>
                    <b>Contoh data yang ditolak:</b><br>
                    <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:6px; padding:8px 12px; margin-top:6px; font-size:12px; color:#9f1239;">
                      ${sampleList}
                    </div><br>
                    Data pasien tidak dapat masuk jika NIK bukan 16 digit angka valid. Silakan periksa kembali file Excel.
                  </div>`,
            confirmButtonColor: '#ef4444'
          });
        } else {
          showToast('Tidak ada data pasien valid terdeteksi!', 'warning');
        }
        if (btnExec) btnExec.disabled = true;
        return;
      }

      const officerCount = Object.keys(groupedSummary).length;

      let badgesHtml = Object.entries(groupedSummary).map(([pName, count]) => {
        return `<div style="background:#f3e8ff; border:1px solid #c084fc; padding:8px 14px; border-radius:10px; font-size:12.5px; font-weight:700; color:#6b21a8; display:flex; align-items:center; gap:8px;">
                  <i class="bi bi-person-badge-fill" style="color:#7c3aed;"></i>
                  <span>${pName}: <strong style="color:#5b21b6; font-size:13.5px;">${count} Data</strong></span>
                </div>`;
      }).join('');

      let previewRowsHtml = parsedAdminRecords.slice(0, 8).map((r, i) => {
        return `<tr>
                  <td style="text-align:center;">${i + 1}</td>
                  <td><strong>${r.nama}</strong><br><span style="font-size:11px; color:#64748b;">NIK: ${r.nik}</span></td>
                  <td><span class="badge badge-cyan">${r.jenis_kegiatan}</span></td>
                  <td><span class="badge badge-purple" style="font-weight:700;"><i class="bi bi-person-fill"></i> ${r.petugas_entry}</span></td>
                  <td><span style="font-size:12px; color:#475569;">${r.created_at}</span></td>
                </tr>`;
      }).join('');

      let skippedNoticeHtml = '';
      if (skippedInvalidNik > 0) {
        skippedNoticeHtml = `
          <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:10px; padding:10px 14px; margin-bottom:12px; font-size:12.5px; color:#9f1239; font-weight:600; display:flex; align-items:center; gap:8px;">
            <i class="bi bi-shield-fill-x" style="font-size:16px; color:#e11d48;"></i>
            <span><strong>${skippedInvalidNik} data dilewati / ditolak</strong> karena NIK tidak persis 16 digit. Hanya data dengan NIK 16 digit yang akan di-import.</span>
          </div>`;
      }

      previewArea.innerHTML = `
        <div style="background: #ffffff; border: 1.5px solid #d8b4fe; border-radius: 14px; padding: 16px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.08);">
          
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid #e9d5ff;">
            <div>
              <div style="font-weight:800; font-size:14px; color:#5b21b6;">
                <i class="bi bi-eye-fill"></i> PREVIEW REKAPITULASI MULTI-PETUGAS
              </div>
              <div style="font-size:12px; color:#6b21a8; margin-top:2px;">
                File: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB) - Total <strong>${parsedAdminRecords.length} Data Pasien Valid (NIK 16 Digit)</strong> untuk <strong>${officerCount} Petugas Entry</strong>
              </div>
            </div>
            <span class="badge badge-emerald" style="font-size:12px; padding:6px 12px;"><i class="bi bi-check-circle-fill"></i> Ready Import</span>
          </div>

          ${skippedNoticeHtml}

          <div style="margin-bottom:14px;">
            <div style="font-size:12px; font-weight:700; color:#4c1d95; margin-bottom:8px;">
              <i class="bi bi-people-fill"></i> Pembagian Data Per-Petugas Terdeteksi:
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${badgesHtml}
            </div>
          </div>

          <div style="font-size:12px; font-weight:700; color:#4c1d95; margin-bottom:6px;">
            <i class="bi bi-table"></i> Sample Preview Data Pasien (Top ${Math.min(8, parsedAdminRecords.length)} dari ${parsedAdminRecords.length}):
          </div>

          <div class="table-responsive" style="max-height:220px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:10px;">
            <table class="custom-table" style="font-size:12px;">
              <thead>
                <tr>
                  <th style="width:40px; text-align:center;">No</th>
                  <th>Nama Pasien & NIK</th>
                  <th>Kegiatan</th>
                  <th>Petugas Entry (Hasil Alokasi)</th>
                  <th>Tanggal Entry</th>
                </tr>
              </thead>
              <tbody>
                ${previewRowsHtml}
              </tbody>
            </table>
          </div>

        </div>
      `;

      previewArea.style.display = 'block';
      if (btnExec) btnExec.disabled = false;

    } catch (err) {
      console.error('Admin import preview error:', err);
      showToast('Gagal membaca file Excel: ' + err.message, 'error');
    }
  };

  reader.readAsArrayBuffer(file);
}

async function executeAdminXLSXImport() {
  if (parsedAdminRecords.length === 0) {
    showToast('Tidak ada data pasien yang siap di-import!', 'warning');
    return;
  }

  closeAdminImportModal();

  const officerStats = {};
  parsedAdminRecords.forEach(r => {
    officerStats[r.petugas_entry] = (officerStats[r.petugas_entry] || 0) + 1;
  });

  Swal.fire({
    title: `<i class="bi bi-cloud-upload-fill" style="color:#7c3aed;"></i> Upload Batch Multi-Petugas ke Cloud D1...`,
    html: `<div style="margin:10px 0;">
            <div id="adminImportProgressBar" style="width:100%;height:20px;background:#e2e8f0;border-radius:10px;overflow:hidden;">
              <div id="adminImportProgressFill" style="width:0%;height:100%;background:linear-gradient(90deg,#7c3aed,#9333ea);border-radius:10px;transition:width 0.3s;"></div>
            </div>
            <div id="adminImportProgressText" style="margin-top:8px;font-size:13px;color:#475569;font-weight:600;">0 / ${parsedAdminRecords.length} data pasien</div>
          </div>`,
    allowOutsideClick: false,
    showConfirmButton: false
  });

  const chunkSize = 20;
  let uploaded = 0;
  let failed = 0;
  const isCkgGratisImport = (currentImportTarget === 'ckg-gratis');
  const importEndpoint = isCkgGratisImport ? '/api/ckg-gratis' : '/api/ckg';

  for (let i = 0; i < parsedAdminRecords.length; i += chunkSize) {
    const chunk = parsedAdminRecords.slice(i, i + chunkSize);
    try {
      const res = await fetch(importEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk)
      });
      if (res.ok) { uploaded += chunk.length; } else { failed += chunk.length; }
    } catch (err) {
      failed += chunk.length;
    }

    const pct = Math.round(((uploaded + failed) / parsedAdminRecords.length) * 100);
    const fillEl = document.getElementById('adminImportProgressFill');
    const txtEl = document.getElementById('adminImportProgressText');
    if (fillEl) fillEl.style.width = pct + '%';
    if (txtEl) txtEl.textContent = `${uploaded + failed} / ${parsedAdminRecords.length} data pasien (${pct}%)`;
  }

  if (isCkgGratisImport) {
    ckgGratisRecords = [...parsedAdminRecords, ...ckgGratisRecords];
    saveCkgGratisRecordsToStorage();
    renderCkgGratisTable();
  } else {
    records = [...parsedAdminRecords, ...records];
    saveRecordsToStorage();
    renderApp();
    updateCloudSyncPill(true, `D1 Online (${records.length} Rec)`);
  }

  let breakdownList = Object.entries(officerStats).map(([pName, cnt]) => {
    return `<li style="margin-bottom:4px;"><strong>${pName}</strong>: <span style="color:#059669; font-weight:700;">${cnt} Data Pasien</span></li>`;
  }).join('');

  let skippedNotice = '';
  const skippedCount = window.__lastAdminImportSkippedNik || 0;
  if (skippedCount > 0) {
    skippedNotice = `<div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:10px 12px; margin-top:10px; font-size:12.5px; color:#92400e;">
      ⚠️ <strong>${skippedCount} data pasien dilewati / ditolak</strong> karena NIK tidak persis 16 digit.
    </div>`;
  }

  Swal.fire({
    icon: failed === 0 ? 'success' : 'warning',
    title: failed === 0 ? 'Import Multi-Petugas Berhasil!' : 'Import Sebagian Berhasil',
    html: `<div style="font-size:13.5px; text-align:left; line-height:1.6;">
            Total <strong>${uploaded} Data Pasien</strong> telah <strong>ter-upload & tersinkronisasi ke Cloudflare D1 Database</strong>!<br><br>
            <div style="background:#f5f3ff; border:1px solid #ddd6fe; border-radius:10px; padding:12px;">
              <strong style="color:#5b21b6; font-size:13px;"><i class="bi bi-people-fill"></i> Rekapitulasi Alokasi Per-Petugas:</strong>
              <ul style="margin:6px 0 0 18px; padding:0; font-size:12.5px;">
                ${breakdownList}
              </ul>
            </div>
            ${skippedNotice}
          </div>`,
    confirmButtonColor: '#7c3aed'
  });
}
