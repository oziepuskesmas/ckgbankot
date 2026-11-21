/**
 * APLIKASI INFO CKG - PUSKESMAS BANJARAN KOTA
 * Module: SIMPUS Integration, Patient Distribution, and SIMPUS Excel Import/Export
 */

// ----------------------------------------------------
// SIMPUS VIEW LOGIC (EXACT REPLICA OF USER REFERENCE SCREENSHOTS)
// ----------------------------------------------------
let selectedSimpusIds = new Set();

function renderSimpusView() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  const loggedUser = (sessionStorage.getItem('ckg_user_name') || '').trim().toLowerCase();
  const isPrivileged = (role === 'admin' || role === 'koordinator');

  // Petugas role is restricted from 'belum_bagi' tab
  if (!isPrivileged) {
    activeSimpusTab = 'sudah_bagi';
  }

  const belumBagiCount = simpusRecords.filter(r => !r.is_divided).length;

  let sudahBagiRecords = simpusRecords.filter(r => Boolean(r.is_divided));
  if (!isPrivileged && loggedUser) {
    sudahBagiRecords = sudahBagiRecords.filter(r => {
      const assigned = (r.assigned_to || '').toLowerCase().trim();
      return assigned === loggedUser || assigned.includes(loggedUser);
    });
  }
  const sudahBagiCount = sudahBagiRecords.length;

  const countBelumEl = document.getElementById('countBelumBagi');
  const countSudahEl = document.getElementById('countSudahBagi');

  if (countBelumEl) countBelumEl.textContent = belumBagiCount;
  if (countSudahEl) countSudahEl.textContent = sudahBagiCount;
  updateTotalEntryMonthMetric();

  // Sync petugas column header visibility based on active tab
  const thPetugas = document.getElementById('thSimpusPetugasEntry');
  if (thPetugas) {
    thPetugas.style.display = (activeSimpusTab !== 'sudah_bagi') ? 'none' : '';
  }

  // Also trigger switchSimpusTab to set DOM view states properly
  switchSimpusTab(activeSimpusTab);
}

function switchSimpusTab(tab) {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  const isPrivileged = (role === 'admin' || role === 'koordinator');

  if (!isPrivileged && tab === 'belum_bagi') {
    tab = 'sudah_bagi';
  }

  activeSimpusTab = tab;

  const btnBelum = document.getElementById('btnSimpusBelumBagi');
  const btnSudah = document.getElementById('btnSimpusSudahBagi');
  const petugasFilterGroup = document.getElementById('simpusPetugasFilterGroup');
  const belumBagiActions = document.getElementById('simpusBelumBagiActions');
  const btnMultiImport = document.getElementById('btnSimpusAdminMultiImport');
  const thPetugas = document.getElementById('thSimpusPetugasEntry');
  const tableViewContainer = document.getElementById('simpusTableViewContainer');
  const cardsViewContainer = document.getElementById('simpusSudahBagiCardsView');
  const infoBar = document.getElementById('simpusTableInfoBar');
  const bulkBar = document.getElementById('simpusBulkActionBar');

  if (tab === 'belum_bagi') {
    if (btnBelum) { btnBelum.className = 'simpus-pill-btn active-purple admin-koordinator-only'; }
    if (btnSudah) { btnSudah.className = 'simpus-pill-btn'; }
    if (petugasFilterGroup) petugasFilterGroup.style.display = 'none';
    if (belumBagiActions) belumBagiActions.style.display = 'flex';
    if (btnMultiImport) btnMultiImport.style.display = 'none';
    if (thPetugas) thPetugas.style.display = 'none';
    if (tableViewContainer) tableViewContainer.style.display = 'block';
    if (cardsViewContainer) cardsViewContainer.style.display = 'none';
    if (infoBar) infoBar.style.display = 'flex';
    if (bulkBar) bulkBar.style.display = 'none';
  } else {
    if (btnBelum) { btnBelum.className = 'simpus-pill-btn admin-koordinator-only'; }
    if (btnSudah) { btnSudah.className = 'simpus-pill-btn active-emerald'; }
    if (petugasFilterGroup) petugasFilterGroup.style.display = isPrivileged ? 'flex' : 'none';
    if (belumBagiActions) belumBagiActions.style.display = 'flex';
    if (btnMultiImport) btnMultiImport.style.display = role === 'admin' ? 'inline-flex' : 'none';
    if (thPetugas) thPetugas.style.display = '';
    if (tableViewContainer) tableViewContainer.style.display = 'none';
    if (cardsViewContainer) cardsViewContainer.style.display = 'block';
    if (infoBar) infoBar.style.display = 'none';
  }

  renderSimpusTableRecords();
}

function updateSimpusBulkActionState() {
  const checkboxes = document.querySelectorAll('.simpus-row-check');
  selectedSimpusIds.clear();
  checkboxes.forEach(cb => {
    if (cb.checked) {
      selectedSimpusIds.add(cb.value);
      const tr = cb.closest('tr');
      if (tr) tr.classList.add('simpus-row-selected');
    } else {
      const tr = cb.closest('tr');
      if (tr) tr.classList.remove('simpus-row-selected');
    }
  });

  const count = selectedSimpusIds.size;
  const countEl = document.getElementById('simpusSelectedCount');
  if (countEl) countEl.textContent = count;

  document.querySelectorAll('.selected-count-inline').forEach(el => {
    el.textContent = count;
  });

  const bar = document.getElementById('simpusBulkActionBar');
  if (bar) {
    if (count > 0 && activeSimpusTab === 'sudah_bagi') {
      bar.style.display = 'flex';
    } else {
      bar.style.display = 'none';
    }
  }

  const checkAll = document.getElementById('checkAllSimpusSudahBagi');
  if (checkAll && checkboxes.length > 0) {
    checkAll.checked = count === checkboxes.length;
    checkAll.indeterminate = count > 0 && count < checkboxes.length;
  }
}

function toggleSelectAllSimpus(checked) {
  const checkboxes = document.querySelectorAll('.simpus-row-check');
  checkboxes.forEach(cb => {
    cb.checked = checked;
  });
  updateSimpusBulkActionState();
}

function clearSimpusSelection() {
  selectedSimpusIds.clear();
  const checkAll = document.getElementById('checkAllSimpusSudahBagi');
  if (checkAll) {
    checkAll.checked = false;
    checkAll.indeterminate = false;
  }
  const checkboxes = document.querySelectorAll('.simpus-row-check');
  checkboxes.forEach(cb => {
    cb.checked = false;
    const tr = cb.closest('tr');
    if (tr) tr.classList.remove('simpus-row-selected');
  });
  updateSimpusBulkActionState();
}

async function executeSimpusBulkAction(actionType) {
  if (selectedSimpusIds.size === 0) {
    showToast('Pilih setidaknya satu data pasien SIMPUS!', 'warning');
    return;
  }

  const selectedArray = Array.from(selectedSimpusIds);
  const targetRecords = simpusRecords.filter(r => selectedArray.includes(String(r.id || r.nik)));

  if (targetRecords.length === 0) {
    showToast('Data terpilih tidak ditemukan!', 'error');
    return;
  }

  if (actionType === 'berhasil') {
    const defaultTgl = getTodayIsoString();

    const result = await Swal.fire({
      title: `<i class="bi bi-check-circle-fill" style="color: #059669;"></i> Bulk Action: Berhasil Entry (${targetRecords.length} Pasien)`,
      html: `
        <div style="text-align: left; font-size: 13.5px; display: flex; flex-direction: column; gap: 14px;">
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px 14px; border-radius: 8px; color: #065f46;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">
              <i class="bi bi-people-fill"></i> Sebanyak ${targetRecords.length} Data Pasien Terpilih
            </div>
            <div style="font-size: 12px; opacity: 0.9;">Seluruh data pasien terpilih ini akan dipindahkan secara masif dari SIMPUS ke Database Rekam Medis CKG (BNBA).</div>
          </div>

          <div>
            <label style="font-weight: 700; color: #1e293b; display: block; margin-bottom: 6px;">
              <i class="bi bi-geo-alt-fill" style="color: #2563eb;"></i> Pilih Kategori / Lokasi Entry CKG:
            </label>
            <select id="swalBulkTargetKategori" class="custom-input" style="width: 100%; padding: 9px 12px; border-radius: 6px; font-weight: 600; font-size: 13.5px;">
              <option value="Luar Gedung" selected>📋 CKG Luar Gedung</option>
              <option value="Dalam Gedung">🏥 CKG Dalam Gedung</option>
            </select>
          </div>

          <div>
            <label style="font-weight: 700; color: #1e293b; display: block; margin-bottom: 6px;">
              <i class="bi bi-calendar-event-fill" style="color: #2563eb;"></i> Pilih Tanggal Entry Massal:
            </label>
            <input type="date" id="swalBulkTanggalEntry" class="custom-input" style="width: 100%; padding: 9px 12px; border-radius: 6px; font-size: 13.5px;" value="${defaultTgl}">
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: `<i class="bi bi-check-circle-fill"></i> Selesai & Pindahkan ${targetRecords.length} Data`,
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const kat = document.getElementById('swalBulkTargetKategori')?.value || 'Luar Gedung';
        const tgl = document.getElementById('swalBulkTanggalEntry')?.value || defaultTgl;
        return { kategori: kat, tanggal_entry: tgl };
      }
    });

    if (!result.isConfirmed || !result.value) return;

    const { kategori, tanggal_entry } = result.value;

    Swal.fire({
      title: `Memindahkan ${targetRecords.length} Data ke CKG BNBA...`,
      html: `<div style="font-size: 13px; color: #475569; margin-top: 6px;">
              <i class="bi bi-cloud-arrow-up-fill" style="color: #059669;"></i> Menyimpan rekam medis ke <strong>${kategori}</strong> dan menghapus dari SIMPUS...
            </div>`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const newCkgRecords = targetRecords.map((item, idx) => ({
        id: `CKG-${new Date().getFullYear()}-${String(records.length + idx + 1).padStart(4, '0')}`,
        jenis_kegiatan: kategori,
        pos_lokasi: item.alamat || 'Puskesmas Banjaran Kota',
        nik: item.nik,
        nama: item.nama,
        tanggal_lahir: formatDateToYYYYMMDD(item.dob || ''),
        usia: parseInt(item.usia) || 0,
        jenis_kelamin: item.jenis_kelamin || 'Laki-laki',
        no_whatsapp: item.no_whatsapp || '',
        status_pernikahan: item.status_pernikahan || 'MENIKAH',
        provinsi: item.provinsi || 'Jawa Barat',
        kab_kota: item.kab_kota || 'Kab. Bandung',
        kecamatan: item.kecamatan || 'Banjaran',
        kelurahan: item.kelurahan || 'Tarajusari',
        alamat: item.alamat || '',
        pekerjaan: 'Lainnya',
        merokok: 'Tidak',
        bb: parseFloat(item.bb) || 0,
        tb: parseFloat(item.tb) || 0,
        lp: 0,
        imt: parseFloat(item.imt) || 0,
        td_sistolik: parseInt(item.sistol) || 0,
        td_diastolik: parseInt(item.diastol) || 0,
        gula_darah: parseInt(item.gula) || 0,
        kolesterol: parseInt(item.kolesterol) || 0,
        hb: 0,
        telinga: 'Normal',
        mata: 'Normal',
        gigi: 'Baik',
        katarak: 'Tidak',
        status_validasi: 'Terverifikasi',
        created_by: item.assigned_to || item.petugas_entry || sessionStorage.getItem('ckg_user_name') || 'Admin',
        petugas_entry: item.assigned_to || item.petugas_entry || sessionStorage.getItem('ckg_user_name') || 'Admin',
        created_at: tanggal_entry,
        tanggal_entry: tanggal_entry
      }));

      // Post to /api/ckg
      const resCkg = await fetch('/api/ckg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCkgRecords)
      });

      if (!resCkg.ok) {
        throw new Error(`Gagal menyimpan data CKG ke server (HTTP ${resCkg.status})`);
      }

      records.unshift(...newCkgRecords);
      safeLocalStorageSet('ckg_records', JSON.stringify(records));
      if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_records', records);

      // Delete from SIMPUS Cloud
      const deleteTab = 'sudah_bagi';
      for (const item of targetRecords) {
        const targetId = item.id || item.nik;
        try {
          await fetch(`/api/simpus?tab=${deleteTab}&id=${encodeURIComponent(targetId)}`, { method: 'DELETE' });
        } catch (_) { }
      }

      // Remove from local simpusRecords
      const removeSet = new Set(selectedArray);
      simpusRecords = simpusRecords.filter(r => !removeSet.has(String(r.id || r.nik)));
      safeLocalStorageSet('ckg_simpus_records', JSON.stringify(simpusRecords));
      if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_simpus_records', simpusRecords);

      clearSimpusSelection();
      renderApp();

      Swal.fire({
        icon: 'success',
        title: 'Aksi Massal Berhasil!',
        html: `Sebanyak <strong>${targetRecords.length} Data Pasien</strong> berhasil dipindahkan ke <strong>CKG ${kategori}</strong> pada tanggal <strong>${tanggal_entry}</strong> dan dihapus dari SIMPUS.`,
        confirmButtonColor: '#059669'
      });
    } catch (err) {
      console.error('Error in executeSimpusBulkAction (berhasil):', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memindahkan Data!',
        html: `Terjadi kesalahan saat memindahkan data massal: <strong>${err.message}</strong>`,
        confirmButtonColor: '#dc2626'
      });
    }

  } else if (actionType === 'sudah' || actionType === 'gagal') {
    const isSudah = actionType === 'sudah';
    const statusLabel = isSudah ? 'Sudah di Entry' : 'Gagal Entry';
    const btnColor = isSudah ? '#f59e0b' : '#dc2626';
    const iconClass = isSudah ? 'bi-bookmark-check-fill' : 'bi-x-circle-fill';

    const result = await Swal.fire({
      title: `<i class="bi ${iconClass}" style="color: ${btnColor};"></i> Bulk Action: ${statusLabel} (${targetRecords.length} Pasien)`,
      html: `
        <div style="font-size: 13.5px; text-align: left; line-height: 1.5;">
          Apakah Anda yakin ingin menandai <strong>${targetRecords.length} data pasien terpilih</strong> sebagai <strong>"${statusLabel}"</strong>?
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 8px; margin: 10px 0; font-size: 13px;">
            <strong>Jumlah Data:</strong> ${targetRecords.length} Pasien<br>
            <strong>Status Baru:</strong> ${statusLabel}
          </div>
          <span style="color: ${btnColor}; font-weight: 600; font-size: 12px;">
            <i class="bi bi-trash3-fill"></i> Data akan dihapus dari SIMPUS dan dipindahkan ke <strong>Recycle Data</strong>.
          </span>
        </div>
      `,
      icon: isSudah ? 'warning' : 'error',
      showCancelButton: true,
      confirmButtonColor: btnColor,
      cancelButtonColor: '#64748b',
      confirmButtonText: `<i class="bi ${iconClass}"></i> Ya, Tandai & Pindahkan ${targetRecords.length} Data`,
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: `Memindahkan ${targetRecords.length} Data ke Recycle...`,
      html: `<div style="font-size: 13px; color: #475569; margin-top: 6px;">
              <i class="bi bi-cloud-arrow-up-fill" style="color: ${btnColor};"></i> Mengupdate status data pasien ke <strong>${statusLabel}</strong>...
            </div>`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const deleteTab = 'sudah_bagi';
      const nowStr = new Date().toISOString().substring(0, 10) + ' ' + new Date().toLocaleTimeString('id-ID');
      const currentUser = sessionStorage.getItem('ckg_user_name') || currentRole || 'User';

      for (const item of targetRecords) {
        const targetId = item.id || item.nik;
        try {
          await fetch(`/api/simpus?tab=${deleteTab}&id=${encodeURIComponent(targetId)}`, { method: 'DELETE' });
        } catch (_) { }

        item.deleted_at = nowStr;
        item.deleted_by = currentUser;
        item.delete_reason = statusLabel;
        item.original_source = `Data SIMPUS (${statusLabel})`;

        recycleBin.unshift(item);
        await saveRecycleBinToStorage(item);
      }

      const removeSet = new Set(selectedArray);
      simpusRecords = simpusRecords.filter(r => !removeSet.has(String(r.id || r.nik)));
      safeLocalStorageSet('ckg_simpus_records', JSON.stringify(simpusRecords));
      if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_simpus_records', simpusRecords);

      clearSimpusSelection();
      renderApp();

      Swal.fire({
        icon: 'success',
        title: 'Aksi Massal Berhasil!',
        html: `Sebanyak <strong>${targetRecords.length} Data Pasien</strong> telah ditandai sebagai <strong>${statusLabel}</strong> dan dipindahkan ke <strong>Recycle Data</strong>.`,
        confirmButtonColor: '#059669'
      });
    } catch (err) {
      console.error(`Error in executeSimpusBulkAction (${actionType}):`, err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memindahkan Data!',
        html: `Terjadi kesalahan saat mengupdate data massal: <strong>${err.message}</strong>`,
        confirmButtonColor: '#dc2626'
      });
    }
  }
}

function renderSimpusTableRecords() {
  const containerTable = document.getElementById('simpusCardsContainer');
  const containerCards = document.getElementById('simpusSudahBagiCardsView');

  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  const loggedUser = (sessionStorage.getItem('ckg_user_name') || '').trim().toLowerCase();
  const isPrivileged = (role === 'admin' || role === 'koordinator');

  applyPetugasFilterLock();

  const petugasVal = document.getElementById('filterSimpusPetugas')?.value || '';
  const umurVal = document.getElementById('filterSimpusUmur')?.value || '';
  const nikVal = document.getElementById('filterSimpusNik')?.value || '';
  const limitVal = document.getElementById('filterSimpusLimit')?.value || '10';

  // Tab 1: Data Belum Di-Bagi (is_divided === false)
  // Tab 2: Data Sudah Di-Bagi (is_divided === true)
  let dataset = simpusRecords.filter(r => activeSimpusTab === 'sudah_bagi' ? Boolean(r.is_divided) : !r.is_divided);

  // If on "Data Sudah Di-Bagi" tab:
  if (activeSimpusTab === 'sudah_bagi') {
    if (!isPrivileged && loggedUser) {
      // Petugas role can ONLY see records assigned to them
      dataset = dataset.filter(r => {
        const assigned = (r.assigned_to || '').toLowerCase().trim();
        return assigned === loggedUser || assigned.includes(loggedUser);
      });
    } else if (petugasVal) {
      // Admin / Koordinator can filter by petugasVal dropdown
      dataset = dataset.filter(r => r.assigned_to === petugasVal);
    }
  }

  if (umurVal) {
    dataset = dataset.filter(r => {
      if (r.keterangan && r.keterangan.toLowerCase() === umurVal.toLowerCase()) return true;
      return isRecordInAgeCategory(r, umurVal);
    });
  }

  if (nikVal === '16_digit') {
    dataset = dataset.filter(r => isNik16Digit(r.nik));
  } else if (nikVal === 'non_16_digit') {
    dataset = dataset.filter(r => !isNik16Digit(r.nik));
  }

  const searchQuery = document.getElementById('searchSimpusRecords')?.value.trim().toLowerCase() || '';
  if (searchQuery) {
    dataset = dataset.filter(r => {
      const nama = (r.nama || '').toLowerCase();
      const nik = String(r.nik || '').toLowerCase();
      const alamat = (r.alamat || '').toLowerCase();
      const petugas = (r.assigned_to || r.petugas_entry || '').toLowerCase();
      const kel = (r.kelurahan || '').toLowerCase();
      const kec = (r.kecamatan || '').toLowerCase();
      const no_index = (r.no_index || '').toLowerCase();
      return nama.includes(searchQuery) || nik.includes(searchQuery) || alamat.includes(searchQuery) || petugas.includes(searchQuery) || kel.includes(searchQuery) || kec.includes(searchQuery) || no_index.includes(searchQuery);
    });
  }

  const isBelumBagi = (activeSimpusTab !== 'sudah_bagi');

  // RENDER 1: TABEL (Khusus Data Belum Di-Bagi)
  if (isBelumBagi) {
    const totalCount = dataset.length;
    let displayDataset = dataset;
    if (limitVal !== 'semua') {
      const limitNum = parseInt(limitVal) || 10;
      displayDataset = dataset.slice(0, limitNum);
    }

    const dispEl = document.getElementById('simpusDisplayedCount');
    const totEl = document.getElementById('simpusTotalCount');
    if (dispEl) dispEl.textContent = displayDataset.length.toLocaleString('id-ID');
    if (totEl) totEl.textContent = totalCount.toLocaleString('id-ID');

    if (!containerTable) return;
    const pagContainerEmpty = document.getElementById('sekolahPaginationContainer');
    if (pagContainerEmpty) pagContainerEmpty.style.display = 'none';

  if (dataset.length === 0) {
      containerTable.innerHTML = `
        <tr>
          <td colspan="18" style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="bi bi-inbox" style="font-size: 36px; display: block; margin-bottom: 8px; color: #94a3b8;"></i>
            <strong style="font-size: 15px;">Tidak Ada Data Pasien SIMPUS (Belum Di-Bagi)</strong>
            <p style="font-size: 12.5px; margin-top: 4px;">Belum ada data yang di-import atau belum ada data yang belum dibagikan.</p>
          </td>
        </tr>
      `;
      return;
    }

    containerTable.innerHTML = displayDataset.map((r, i) => {
      const statusPernikahan = r.status_pernikahan || 'MENIKAH';
      const prov = r.provinsi || 'Jawa Barat';
      const kabKota = r.kab_kota || 'Kab. Bandung';
      const kec = r.kecamatan || 'Banjaran';
      const kel = r.kelurahan || 'Tarajusari';
      const recId = r.id || r.nik;
      const safeRecId = escapeAttr(recId);

      return `
        <tr>
          <td style="text-align: center; font-weight: 700; color: #475569;">${i + 1}</td>
          <td><strong>${r.nama}</strong></td>
          <td><span style="font-family: monospace; font-size: 12px;">${r.nik}</span></td>
          <td>${formatDateToYYYYMMDD(r.dob) || '-'}</td>
          <td style="text-align: center;"><span class="badge badge-amber">${r.usia} th</span></td>
          <td>${statusPernikahan}</td>
          <td>${prov}</td>
          <td>${kabKota}</td>
          <td>${kec}</td>
          <td>${kel}</td>
          <td style="max-width: 180px; white-space: normal;">${r.alamat}</td>
          <td style="text-align: center;">${r.bb}</td>
          <td style="text-align: center;">${r.tb}</td>
          <td style="text-align: center;">${r.sistol}</td>
          <td style="text-align: center;">${r.diastol}</td>
          <td style="text-align: center;">${r.gula}</td>
          <td style="text-align: center;">${r.kolesterol}</td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="btn btn-outline-danger btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="deleteSimpusRecord('${safeRecId}')" title="Hapus Data Pasien">
              <i class="bi bi-trash-fill"></i> Hapus
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } else {
    // RENDER 2: SIMPUS ID REGISTRATION TABLE MODEL (Khusus Data Sudah Di-Bagi - Image 1 Style)
    if (!containerCards) return;

    const totalCount = dataset.length;
    let displayDataset = dataset;
    if (limitVal !== 'semua') {
      const limitNum = parseInt(limitVal) || 10;
      displayDataset = dataset.slice(0, limitNum);
    }

    const dispEl = document.getElementById('simpusDisplayedCount');
    const totEl = document.getElementById('simpusTotalCount');
    if (dispEl) dispEl.textContent = displayDataset.length.toLocaleString('id-ID');
    if (totEl) totEl.textContent = totalCount.toLocaleString('id-ID');

    if (dataset.length === 0) {
      containerCards.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); background: #ffffff; border-radius: var(--radius-md); border: 1px solid var(--border-color); width: 100%;">
          <i class="bi bi-inbox" style="font-size: 36px; color: #94a3b8; display: block; margin-bottom: 8px;"></i>
          <strong style="font-size: 15px; color: var(--text-main);">Tidak Ada Data Pasien (Sudah Di-Bagi)</strong>
          <p style="font-size: 12.5px; margin-top: 4px;">Belum ada data yang dibagikan atau tidak ada data yang cocok dengan filter saat ini.</p>
        </div>
      `;
      return;
    }

    const tableRowsHtml = displayDataset.map((r, i) => {
      const petugasName = r.petugas_entry || r.assigned_to || '-';
      const recId = r.id || r.nik;
      const safeRecId = escapeAttr(recId);
      const safeNik = escapeAttr(r.nik);
      const kel = r.kelurahan || 'Tarajusari';
      const kec = r.kecamatan || 'Banjaran';
      const statusPernikahan = r.status_pernikahan || 'MENIKAH';
      const isChecked = selectedSimpusIds.has(String(recId));

      return `
        <tr class="${isChecked ? 'simpus-row-selected' : ''}">
          <!-- Checkbox Column -->
          <td style="text-align: center; vertical-align: middle; padding: 12px 6px;">
            <input type="checkbox" class="simpus-row-check" value="${safeRecId}" ${isChecked ? 'checked' : ''} onchange="updateSimpusBulkActionState()" style="width: 16px; height: 16px; cursor: pointer;">
          </td>

          <!-- Column 1: No -->
          <td style="text-align: center; vertical-align: middle; padding: 12px 6px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #e0f2fe; color: #0284c7; font-weight: 800; font-size: 12px; border-radius: 50%; border: 1px solid #bae6fd;">
              ${i + 1}
            </div>
          </td>

          <!-- Column 2: Nama Pasien & Identitas -->
          <td style="min-width: 250px; vertical-align: top;">
            <div style="font-size: 14.5px; font-weight: 800; color: #0284c7; margin-bottom: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" onclick="openSimpusDetailModal('${safeRecId}')" title="Klik untuk Buka Detail Data">
              ${r.nama} <i class="bi bi-box-arrow-up-right" style="font-size: 11px; opacity: 0.85;"></i>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 5px;">
              <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                <div style="display: inline-flex; align-items: center; gap: 6px; background: #f8fafc; padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 11.5px; font-family: monospace; font-weight: 700; color: #1e293b; width: fit-content; cursor: pointer;" onclick="copyToClipboard('${safeNik}', 'NIK Pasien')" title="Salin NIK Pasien">
                  <i class="bi bi-card-text" style="color: #0284c7;"></i> NIK: ${r.nik} <i class="bi bi-copy" style="font-size: 10px; color: #0284c7; margin-left: 2px;"></i>
                </div>
                ${!isNik16Digit(r.nik) ? `<span class="badge badge-rose" style="font-size: 9.5px; padding: 2px 6px;" title="NIK bukan 16 digit"><i class="bi bi-exclamation-triangle-fill"></i> ${String(r.nik || '').replace(/\D/g, '').length ? String(r.nik || '').replace(/\D/g, '').length + ' Digit' : 'NIK Kosong'}</span>` : ''}
              </div>

              <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                <span class="badge badge-amber" style="padding: 3px 8px; font-size: 11px; font-weight: 700;">
                  <i class="bi bi-person-badge"></i> ${r.usia} Th (${r.keterangan || getKategoriUmur(r.usia, r.dob)})
                </span>
                <span class="badge badge-cyan" style="padding: 3px 8px; font-size: 11px; font-weight: 700;">
                  ${statusPernikahan}
                </span>
              </div>
            </div>
          </td>

          <!-- Column 3: Hasil Skrining / Pemeriksaan CKG -->
          <td style="min-width: 270px; vertical-align: top;">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; background: #fff1f2; border: 1px solid #ffe4e6; padding: 5px 10px; border-radius: 6px; font-size: 11.5px;">
                <span style="color: #9f1239; font-weight: 700;"><i class="bi bi-activity" style="margin-right: 4px;"></i> Tensi (TD)</span>
                <strong style="color: #e11d48; font-size: 12.5px;">${r.sistol && r.diastol ? r.sistol + '/' + r.diastol + ' mmHg' : '-'}</strong>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; border: 1px solid #d1fae5; padding: 5px 10px; border-radius: 6px; font-size: 11.5px;">
                <span style="color: #065f46; font-weight: 700;"><i class="bi bi-person-bounding-box" style="margin-right: 4px;"></i> BB / TB (IMT)</span>
                <strong style="color: #059669; font-size: 12px;">${r.bb ? r.bb + 'kg' : '-'} / ${r.tb ? r.tb + 'cm' : '-'} (${r.imt || '-'})</strong>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; background: #f0f9ff; border: 1px solid #e0f2fe; padding: 5px 10px; border-radius: 6px; font-size: 11.5px;">
                <span style="color: #075985; font-weight: 700;"><i class="bi bi-droplet-fill" style="margin-right: 4px;"></i> Gula / Kolesterol</span>
                <strong style="color: #0284c7; font-size: 12px;">${r.gula || '-'} / ${r.kolesterol || '-'} mg/dL</strong>
              </div>
            </div>
          </td>

          <!-- Column 4: Alamat -->
          <td style="min-width: 250px; vertical-align: top;">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;">
              <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 5px; line-height: 1.4;">
                <i class="bi bi-geo-alt-fill" style="color: #e11d48; margin-right: 4px;"></i> ${r.alamat || '-'}
              </div>
              <div style="display: flex; gap: 8px; font-size: 11px; color: #475569; background: #f8fafc; padding: 4px 8px; border-radius: 4px; border: 1px solid #f1f5f9; flex-wrap: wrap;">
                <span><strong>Kel:</strong> ${kel}</span>
                <span style="color: #cbd5e1;">|</span>
                <span><strong>Kec:</strong> ${kec}</span>
              </div>
            </div>
          </td>

          <!-- Column 5: Petugas & Action -->
          <td style="width: 170px; text-align: center; vertical-align: middle; padding: 12px 10px;">
            <div style="margin-bottom: 8px;">
              <span class="badge badge-purple" style="font-weight: 700; padding: 5px 12px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <i class="bi bi-person-fill"></i> ${petugasName}
              </span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; align-items: stretch;">
              <button class="btn btn-primary btn-sm" style="font-size: 11.5px; padding: 6px 12px; border-radius: 6px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 4px rgba(37,99,235,0.2);" onclick="openSimpusDetailModal('${safeRecId}')" title="Detail & Copy Data Pasien">
                <i class="bi bi-eye-fill"></i> Detail & Salin
              </button>
              <button class="btn btn-outline-danger btn-sm" style="font-size: 11px; padding: 5px 10px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 5px;" onclick="deleteSimpusRecord('${safeRecId}')" title="Hapus Data Pasien">
                <i class="bi bi-trash-fill"></i> Hapus
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    containerCards.innerHTML = `
      <div class="simpus-table-wrapper">
        <table class="simpus-registration-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">
                <input type="checkbox" id="checkAllSimpusSudahBagi" onchange="toggleSelectAllSimpus(this.checked)" style="width: 16px; height: 16px; cursor: pointer;" title="Pilih Semua">
              </th>
              <th style="width: 45px; text-align: center;">No</th>
              <th>Nama Pasien & Identitas</th>
              <th>Hasil Skrining / Pemeriksaan CKG</th>
              <th>Alamat Pasien</th>
              <th style="width: 170px; text-align: center;">Petugas & Tindakan</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
    `;

    updateSimpusBulkActionState();
  }
}

// Utility: Escape strings for safe use in inline HTML attribute handlers (onclick, etc.)
function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\\/g, '&#92;');
}

function copyToClipboard(text, label = 'Data') {
  if (!text || text === '-' || text === 'null' || text === 'undefined') {
    showToast(`Tidak ada data ${label} untuk disalin.`, 'warning');
    return;
  }

  const cleanText = String(text).trim();

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(cleanText).then(() => {
      showToast(`✓ ${label} ("${cleanText}") Berhasil Disalin!`, 'success');
    }).catch(() => {
      fallbackCopyToClipboard(cleanText, label);
    });
  } else {
    fallbackCopyToClipboard(cleanText, label);
  }
}

function fallbackCopyToClipboard(text, label) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(`✓ ${label} ("${text}") Berhasil Disalin!`, 'success');
  } catch (err) {
    showToast(`Gagal menyalin ${label}`, 'error');
  }
  document.body.removeChild(ta);
}

function copyAllSimpusPatientData(id) {
  const item = simpusRecords.find(r => r.id === id);
  if (!item) return;

  const fullSummary = `=== DATA REKAM MEDIS CKG PASIEN ===
Nama Pasien: ${item.nama}
NIK Pasien: ${item.nik}
Tanggal Skrining: ${item.tanggal}
Tanggal Lahir: ${formatDateToYYYYMMDD(item.dob) || '-'}
Usia / Kategori: ${item.usia} Tahun (${item.keterangan || getKategoriUmur(item.usia, item.dob)})
Alamat Lengkap: ${item.alamat}
Faskes / Lokasi: Puskesmas Banjaran Kota
Berat Badan (BB): ${item.bb} kg
Tinggi Badan (TB): ${item.tb} cm
Indeks Massa Tubuh (IMT): ${item.imt}
Tekanan Darah: ${item.sistol}/${item.diastol} mmHg
Gula Darah Sewaktu: ${item.gula || '-'} mg/dL
Kolesterol Total: ${item.kolesterol || '-'} mg/dL
Petugas Entry: ${item.assigned_to || 'Belum Di-assign'}
Status Validasi: Terverifikasi
===================================`;

  copyToClipboard(fullSummary, 'Seluruh Data Rekam Medis Pasien');
}

function openSimpusDetailModal(id) {
  const item = simpusRecords.find(r => r.id === id);
  if (!item) return;

  const modalBody = document.getElementById('detailModalBody');
  if (!modalBody) return;

  let imtBadge = `<span class="badge badge-emerald">${item.imt}</span>`;
  if (item.imt < 18.5) imtBadge = `<span class="badge badge-amber">${item.imt} (Kurus)</span>`;
  else if (item.imt >= 25.0 && item.imt <= 29.9) imtBadge = `<span class="badge badge-amber">${item.imt} (Gemuk)</span>`;
  else if (item.imt >= 30.0) imtBadge = `<span class="badge badge-rose">${item.imt} (Obesitas)</span>`;

  const safeNama = escapeAttr(item.nama);
  const safeNik = escapeAttr(item.nik);
  const safeTanggal = escapeAttr(item.tanggal);
  const safeId = escapeAttr(item.id);

  modalBody.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      
      <!-- Patient Header Banner -->
      <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 18px; border-radius: var(--radius-md); color: #ffffff; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);">
        <div>
          <div style="font-size: 21px; font-weight: 800; font-family: var(--font-heading); cursor: pointer;" onclick="copyToClipboard('${safeNama}', 'Nama Pasien')" title="Klik untuk menyalin Nama Pasien">
            ${item.nama} <i class="bi bi-copy" style="font-size: 14px; opacity: 0.8;"></i>
          </div>
          <div style="font-size: 13px; opacity: 0.95; margin-top: 4px; display: flex; gap: 14px; flex-wrap: wrap;">
            <span style="cursor: pointer;" onclick="copyToClipboard('${safeNik}', 'NIK Pasien')" title="Klik untuk menyalin NIK">
              <i class="bi bi-card-text"></i> NIK: <strong>${item.nik}</strong> <i class="bi bi-copy" style="font-size: 11px;"></i>
            </span>
            <span style="cursor: pointer;" onclick="copyToClipboard('${safeTanggal}', 'Tanggal Skrining')" title="Klik untuk menyalin Tanggal">
              <i class="bi bi-calendar-event"></i> Tanggal: ${item.tanggal} <i class="bi bi-copy" style="font-size: 11px;"></i>
            </span>
          </div>
        </div>
        
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-primary btn-sm" onclick="openDukcapilModal('${safeNik}', '${safeNama}')" style="box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <i class="bi bi-shield-check"></i> Cek Dukcapil
          </button>
          <button class="btn-copy-all" onclick="copyAllSimpusPatientData('${safeId}')">
            <i class="bi bi-clipboard-check-fill"></i> Salin Semua Data Pasien
          </button>
          <button class="btn btn-emerald btn-sm" onclick="handleSimpusActionBerhasil('${safeId}')" style="font-weight: 700; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
            <i class="bi bi-check-circle-fill"></i> Berhasil Entry
          </button>
          <button class="btn btn-amber btn-sm" onclick="handleSimpusActionSudahEntry('${safeId}')" style="font-weight: 700; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
            <i class="bi bi-bookmark-check-fill"></i> Sudah di Entry
          </button>
          <button class="btn btn-danger btn-sm" onclick="handleSimpusActionGagal('${safeId}')" style="font-weight: 700; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
            <i class="bi bi-x-circle-fill"></i> Gagal
          </button>
        </div>
      </div>

      <!-- Quick Instruction Banner -->
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 12.5px; display: flex; align-items: center; gap: 8px;">
        <i class="bi bi-info-circle-fill" style="font-size: 16px; color: var(--primary);"></i>
        <span><strong>Tips Petugas:</strong> Klik pada kotak parameter mana saja di bawah ini untuk <strong>menyalin (copy)</strong> data secara instan!</span>
      </div>

      <!-- Info Sections Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; font-size: 13px;">
        
        <!-- Section 1: Demografi & Wilayah -->
        <div style="background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 10px;">
          <div style="font-weight: 800; color: var(--primary); font-size: 14px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">
            <i class="bi bi-geo-alt-fill"></i> Demografi & Alamat Pasien
          </div>
          
          <div class="copyable-field" onclick="copyToClipboard('${item.nama}', 'Nama Lengkap Pasien')">
            <div>
              <div class="simpus-info-label">Nama Lengkap Pasien</div>
              <div class="simpus-info-val">${item.nama}</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.nik}', 'NIK Pasien')">
            <div>
              <div class="simpus-info-label">NIK Pasien (16 Digit)</div>
              <div class="simpus-info-val">${item.nik}</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${escapeAttr(formatDateToYYYYMMDD(item.dob)) || '-'}', 'Tanggal Lahir')">
            <div>
              <div class="simpus-info-label">Tanggal Lahir</div>
              <div class="simpus-info-val">${formatDateToYYYYMMDD(item.dob) || '-'}</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.usia}', 'Usia Pasien')">
            <div>
              <div class="simpus-info-label">Usia & Kategori</div>
              <div class="simpus-info-val">${item.usia} Tahun (${item.keterangan || getKategoriUmur(item.usia, item.dob)})</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.status_pernikahan || 'MENIKAH'}', 'Status Pernikahan')">
            <div>
              <div class="simpus-info-label">Status Pernikahan</div>
              <div class="simpus-info-val">${item.status_pernikahan || 'MENIKAH'}</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.provinsi || 'Jawa Barat'}', 'Provinsi')">
            <div>
              <div class="simpus-info-label">Provinsi</div>
              <div class="simpus-info-val">${item.provinsi || 'Jawa Barat'}</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.kab_kota || 'Kab. Bandung'}', 'Kabupaten / Kota')">
            <div>
              <div class="simpus-info-label">Kabupaten / Kota</div>
              <div class="simpus-info-val">${item.kab_kota || 'Kab. Bandung'}</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.kecamatan || 'Banjaran'}', 'Kecamatan')">
            <div>
              <div class="simpus-info-label">Kecamatan</div>
              <div class="simpus-info-val">${item.kecamatan || 'Banjaran'}</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.kelurahan || 'Tarajusari'}', 'Kelurahan / Desa')">
            <div>
              <div class="simpus-info-label">Kelurahan / Desa</div>
              <div class="simpus-info-val">${item.kelurahan || 'Tarajusari'}</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.alamat}', 'Alamat Pasien')">
            <div>
              <div class="simpus-info-label">Alamat Lengkap</div>
              <div class="simpus-info-val">${item.alamat}</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.assigned_to || item.petugas_entry || 'Puskesmas Banjaran Kota'}', 'Petugas Entry')">
            <div>
              <div class="simpus-info-label">Petugas Entry / Faskes</div>
              <div class="simpus-info-val">${item.assigned_to || item.petugas_entry || 'Puskesmas Banjaran Kota'}</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>
        </div>

        <!-- Section 2: Antropometri & Tanda Vital -->
        <div style="background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 10px;">
          <div style="font-weight: 800; color: var(--emerald); font-size: 14px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">
            <i class="bi bi-heart-pulse-fill"></i> Antropometri & Tanda Vital
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.bb}', 'Berat Badan')">
            <div>
              <div class="simpus-info-label">Berat Badan (BB)</div>
              <div class="simpus-info-val">${item.bb} kg</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.tb}', 'Tinggi Badan')">
            <div>
              <div class="simpus-info-label">Tinggi Badan (TB)</div>
              <div class="simpus-info-val">${item.tb} cm</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.imt}', 'Hasil IMT')">
            <div>
              <div class="simpus-info-label">Indeks Massa Tubuh (IMT)</div>
              <div class="simpus-info-val">${imtBadge}</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.sistol}/${item.diastol}', 'Tekanan Darah')">
            <div>
              <div class="simpus-info-label">Tekanan Darah (TD)</div>
              <div class="simpus-info-val">${item.sistol}/${item.diastol} mmHg</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.sistol}', 'TD Sistolik')">
            <div>
              <div class="simpus-info-label">Sistolik</div>
              <div class="simpus-info-val">${item.sistol} mmHg</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.diastol}', 'TD Diastolik')">
            <div>
              <div class="simpus-info-label">Diastolik</div>
              <div class="simpus-info-val">${item.diastol} mmHg</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>
        </div>

        <!-- Section 3: Skrining Lab & Status -->
        <div style="background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 10px;">
          <div style="font-weight: 800; color: var(--cyan); font-size: 14px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">
            <i class="bi bi-droplet-fill"></i> Skrining Lab & Status Validasi
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.gula && item.gula !== '-' ? item.gula : ''}', 'Gula Darah')">
            <div>
              <div class="simpus-info-label">Gula Darah Sewaktu</div>
              <div class="simpus-info-val">${item.gula && item.gula !== '-' ? item.gula + ' mg/dL' : '-'}</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.kolesterol && item.kolesterol !== '-' ? item.kolesterol : ''}', 'Kolesterol')">
            <div>
              <div class="simpus-info-label">Kolesterol Total</div>
              <div class="simpus-info-val">${item.kolesterol && item.kolesterol !== '-' ? item.kolesterol + ' mg/dL' : '-'}</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('Normal', 'Pemeriksaan Fisik')">
            <div>
              <div class="simpus-info-label">Pemeriksaan Fisik</div>
              <div class="simpus-info-val">Normal</div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('Terverifikasi', 'Status Validasi')">
            <div>
              <div class="simpus-info-label">Status Validasi System</div>
              <div class="simpus-info-val"><span class="badge badge-emerald">Terverifikasi</span></div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>

          <div class="copyable-field" onclick="copyToClipboard('${item.entry_status.toUpperCase()}', 'Status SIMPUS')">
            <div>
              <div class="simpus-info-label">Status Status SIMPUS</div>
              <div class="simpus-info-val"><strong>${item.entry_status.toUpperCase()}</strong></div>
            </div>
            <i class="bi bi-copy copy-icon"></i>
          </div>
        </div>

      </div>
    </div>
  `;

  document.getElementById('detailModalOverlay').classList.add('open');
}

function getTodayIsoString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function handleSimpusActionBerhasil(id) {
  const item = simpusRecords.find(r => (r.id || r.nik || '') === id);
  if (!item) {
    showToast('Data SIMPUS tidak ditemukan!', 'error');
    return;
  }

  // Close detail modal
  const detailModalOverlay = document.getElementById('detailModalOverlay');
  if (detailModalOverlay) detailModalOverlay.classList.remove('open');

  const defaultTgl = getTodayIsoString();

  const result = await Swal.fire({
    title: 'Konfirmasi Entry Data CKG (BNBA)',
    html: `
      <div style="text-align: left; font-size: 13.5px; display: flex; flex-direction: column; gap: 14px;">
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px 14px; border-radius: 8px; color: #1e40af;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px;">
            <i class="bi bi-person-check-fill"></i> ${item.nama}
          </div>
          <div>NIK: <strong>${item.nik}</strong> | Usia: ${item.usia} th</div>
          <div style="font-size: 12px; opacity: 0.85; margin-top: 4px;">Data pasien ini akan dipindahkan dari SIMPUS ke database CKG (BNBA).</div>
        </div>

        <div>
          <label style="font-weight: 700; color: #1e293b; display: block; margin-bottom: 6px;">
            <i class="bi bi-geo-alt-fill" style="color: #2563eb;"></i> Pilih Kategori / Lokasi Entry CKG:
          </label>
          <select id="swalTargetKategori" class="custom-input" style="width: 100%; padding: 9px 12px; border-radius: 6px; font-weight: 600; font-size: 13.5px;">
            <option value="Luar Gedung" selected>📋 CKG Luar Gedung</option>
            <option value="Dalam Gedung">🏥 CKG Dalam Gedung</option>
          </select>
        </div>

        <div>
          <label style="font-weight: 700; color: #1e293b; display: block; margin-bottom: 6px;">
            <i class="bi bi-calendar-event-fill" style="color: #2563eb;"></i> Pilih Tanggal Entry:
          </label>
          <input type="date" id="swalTanggalEntry" class="custom-input" style="width: 100%; padding: 9px 12px; border-radius: 6px; font-size: 13.5px;" value="${defaultTgl}">
        </div>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#059669',
    cancelButtonColor: '#64748b',
    confirmButtonText: '<i class="bi bi-check-circle-fill"></i> Selesai & Pindahkan Data',
    cancelButtonText: 'Batal',
    preConfirm: () => {
      const kat = document.getElementById('swalTargetKategori')?.value || 'Luar Gedung';
      const tgl = document.getElementById('swalTanggalEntry')?.value || defaultTgl;
      return { kategori: kat, tanggal_entry: tgl };
    }
  });

  if (!result.isConfirmed || !result.value) return;

  const { kategori, tanggal_entry } = result.value;

  Swal.fire({
    title: 'Memindahkan Data ke CKG BNBA...',
    html: `<div style="font-size: 13px; color: #475569; margin-top: 6px;">
            <i class="bi bi-cloud-arrow-up-fill" style="color: #059669;"></i> Menyimpan ke <strong>${kategori}</strong> dan menghapus dari SIMPUS...
          </div>`,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    // 1. Create new BNBA record object
    const newCkgRecord = {
      id: `CKG-${new Date().getFullYear()}-${String(records.length + 1).padStart(4, '0')}`,
      jenis_kegiatan: kategori,
      pos_lokasi: item.alamat || 'Puskesmas Banjaran Kota',
      nik: item.nik,
      nama: item.nama,
      tanggal_lahir: formatDateToYYYYMMDD(item.dob || ''),
      usia: parseInt(item.usia) || 0,
      jenis_kelamin: item.jenis_kelamin || 'Laki-laki',
      no_whatsapp: item.no_whatsapp || '',
      status_pernikahan: item.status_pernikahan || 'MENIKAH',
      provinsi: item.provinsi || 'Jawa Barat',
      kab_kota: item.kab_kota || 'Kab. Bandung',
      kecamatan: item.kecamatan || 'Banjaran',
      kelurahan: item.kelurahan || 'Tarajusari',
      alamat: item.alamat || '',
      pekerjaan: 'Lainnya',
      merokok: 'Tidak',
      bb: parseFloat(item.bb) || 0,
      tb: parseFloat(item.tb) || 0,
      lp: 0,
      imt: parseFloat(item.imt) || 0,
      td_sistolik: parseInt(item.sistol) || 0,
      td_diastolik: parseInt(item.diastol) || 0,
      gula_darah: parseInt(item.gula) || 0,
      kolesterol: parseInt(item.kolesterol) || 0,
      hb: 0,
      telinga: 'Normal',
      mata: 'Normal',
      gigi: 'Baik',
      katarak: 'Tidak',
      status_validasi: 'Terverifikasi',
      created_by: item.assigned_to || item.petugas_entry || sessionStorage.getItem('ckg_user_name') || 'Admin',
      petugas_entry: item.assigned_to || item.petugas_entry || sessionStorage.getItem('ckg_user_name') || 'Admin',
      created_at: tanggal_entry,
      tanggal_entry: tanggal_entry
    };

    // 2. Post to /api/ckg
    const resCkg = await fetch('/api/ckg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([newCkgRecord])
    });

    if (!resCkg.ok) {
      throw new Error(`Gagal menyimpan data CKG ke server (HTTP ${resCkg.status})`);
    }

    records.unshift(newCkgRecord);
    safeLocalStorageSet('ckg_records', JSON.stringify(records));
    if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_records', records);

    // 3. Delete record from SIMPUS table (sudah_bagi or belum_bagi)
    const targetId = item.id || item.nik || id;
    const deleteTab = item.is_divided ? 'sudah_bagi' : 'belum_bagi';
    await fetch(`/api/simpus?tab=${deleteTab}&id=${encodeURIComponent(targetId)}`, {
      method: 'DELETE'
    });

    // 4. Update local SIMPUS array
    simpusRecords = simpusRecords.filter(r => (r.id || r.nik || '') !== id);
    safeLocalStorageSet('ckg_simpus_records', JSON.stringify(simpusRecords));
    if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_simpus_records', simpusRecords);

    renderApp();

    Swal.fire({
      icon: 'success',
      title: 'Berhasil Dipindahkan!',
      html: `Data pasien <strong>${item.nama}</strong> berhasil disimpan ke <strong>CKG ${kategori}</strong> pada tanggal <strong>${tanggal_entry}</strong> dan telah dihapus dari SIMPUS.`,
      confirmButtonColor: '#059669'
    });
  } catch (err) {
    console.error('Error during handleSimpusActionBerhasil:', err);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Memindahkan Data!',
      html: `Terjadi kesalahan saat memindahkan data: <strong>${err.message}</strong>`,
      confirmButtonColor: '#dc2626'
    });
  }
}

async function handleSimpusActionSudahEntry(id) {
  const item = simpusRecords.find(r => (r.id || r.nik || '') === id);
  if (!item) {
    showToast('Data SIMPUS tidak ditemukan!', 'error');
    return;
  }

  const detailModalOverlay = document.getElementById('detailModalOverlay');
  if (detailModalOverlay) detailModalOverlay.classList.remove('open');

  const result = await Swal.fire({
    title: 'Mark Sebagai "Sudah di Entry"?',
    html: `
      <div style="font-size: 13.5px; text-align: left; line-height: 1.5;">
        Apakah Anda yakin ingin menandai data pasien ini sebagai <strong>"Sudah di Entry"</strong>?
        <div style="background: #fffbebf; border: 1px solid #fef3c7; padding: 10px 12px; border-radius: 8px; margin: 10px 0; font-size: 13px; color: #92400e;">
          <strong>Nama:</strong> ${item.nama}<br>
          <strong>NIK:</strong> ${item.nik || '-'}<br>
          <strong>Status:</strong> Sudah di Entry
        </div>
        <span style="color: #d97706; font-weight: 600; font-size: 12px;">
          <i class="bi bi-trash3-fill"></i> Data akan dihapus dari daftar SIMPUS dan dipindahkan ke <strong>Recycle Data</strong>.
        </span>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#64748b',
    confirmButtonText: '<i class="bi bi-archive-fill"></i> Ya, Pindahkan ke Recycle Data',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  Swal.fire({
    title: 'Memindahkan ke Recycle Data...',
    html: `<div style="font-size: 13px; color: #475569; margin-top: 6px;">
            <i class="bi bi-cloud-arrow-up-fill" style="color: #f59e0b;"></i> Mengupdate status data pasien <strong>${item.nama}</strong>...
          </div>`,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const targetId = item.id || item.nik || id;
    const deleteTab = item.is_divided ? 'sudah_bagi' : 'belum_bagi';
    await fetch(`/api/simpus?tab=${deleteTab}&id=${encodeURIComponent(targetId)}`, {
      method: 'DELETE'
    });

    item.deleted_at = new Date().toISOString().substring(0, 10) + ' ' + new Date().toLocaleTimeString('id-ID');
    item.deleted_by = sessionStorage.getItem('ckg_user_name') || currentRole || 'User';
    item.delete_reason = 'Sudah di Entry';
    item.original_source = 'Data SIMPUS (Sudah di Entry)';

    recycleBin.unshift(item);
    await saveRecycleBinToStorage(item);

    simpusRecords = simpusRecords.filter(r => (r.id || r.nik || '') !== id);
    safeLocalStorageSet('ckg_simpus_records', JSON.stringify(simpusRecords));
    if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_simpus_records', simpusRecords);

    renderApp();

    Swal.fire({
      icon: 'success',
      title: 'Berhasil Dipindahkan!',
      html: `Data pasien <strong>${item.nama}</strong> telah ditandai sebagai <strong>Sudah di Entry</strong> dan dipindahkan ke <strong>Recycle Data</strong>.`,
      confirmButtonColor: '#059669'
    });
  } catch (err) {
    console.error('Error during handleSimpusActionSudahEntry:', err);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Memindahkan Data!',
      html: `Gagal memindahkan data ke Recycle Data: <strong>${err.message}</strong>`,
      confirmButtonColor: '#dc2626'
    });
  }
}

async function handleSimpusActionGagal(id) {
  const item = simpusRecords.find(r => (r.id || r.nik || '') === id);
  if (!item) {
    showToast('Data SIMPUS tidak ditemukan!', 'error');
    return;
  }

  const detailModalOverlay = document.getElementById('detailModalOverlay');
  if (detailModalOverlay) detailModalOverlay.classList.remove('open');

  const result = await Swal.fire({
    title: 'Mark Sebagai "Gagal Entry"?',
    html: `
      <div style="font-size: 13.5px; text-align: left; line-height: 1.5;">
        Apakah Anda yakin ingin menandai data pasien ini sebagai <strong>"Gagal Entry"</strong>?
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 10px 12px; border-radius: 8px; margin: 10px 0; font-size: 13px; color: #991b1b;">
          <strong>Nama:</strong> ${item.nama}<br>
          <strong>NIK:</strong> ${item.nik || '-'}<br>
          <strong>Status:</strong> Gagal Entry
        </div>
        <span style="color: #dc2626; font-weight: 600; font-size: 12px;">
          <i class="bi bi-trash3-fill"></i> Data akan dihapus dari daftar SIMPUS dan dipindahkan ke <strong>Recycle Data</strong>.
        </span>
      </div>
    `,
    icon: 'error',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: '<i class="bi bi-x-circle-fill"></i> Ya, Tandai Gagal & Pindahkan',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  Swal.fire({
    title: 'Memindahkan ke Recycle Data...',
    html: `<div style="font-size: 13px; color: #475569; margin-top: 6px;">
            <i class="bi bi-cloud-arrow-up-fill" style="color: #dc2626;"></i> Mengupdate status data pasien <strong>${item.nama}</strong>...
          </div>`,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const targetId = item.id || item.nik || id;
    const deleteTab = item.is_divided ? 'sudah_bagi' : 'belum_bagi';
    await fetch(`/api/simpus?tab=${deleteTab}&id=${encodeURIComponent(targetId)}`, {
      method: 'DELETE'
    });

    item.deleted_at = new Date().toISOString().substring(0, 10) + ' ' + new Date().toLocaleTimeString('id-ID');
    item.deleted_by = sessionStorage.getItem('ckg_user_name') || currentRole || 'User';
    item.delete_reason = 'Gagal Entry';
    item.original_source = 'Data SIMPUS (Gagal Entry)';

    recycleBin.unshift(item);
    await saveRecycleBinToStorage(item);

    simpusRecords = simpusRecords.filter(r => (r.id || r.nik || '') !== id);
    safeLocalStorageSet('ckg_simpus_records', JSON.stringify(simpusRecords));
    if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_simpus_records', simpusRecords);

    renderApp();

    Swal.fire({
      icon: 'success',
      title: 'Berhasil Dipindahkan!',
      html: `Data pasien <strong>${item.nama}</strong> telah ditandai sebagai <strong>Gagal Entry</strong> dan dipindahkan ke <strong>Recycle Data</strong>.`,
      confirmButtonColor: '#059669'
    });
  } catch (err) {
    console.error('Error during handleSimpusActionGagal:', err);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Memindahkan Data!',
      html: `Gagal memindahkan data ke Recycle Data: <strong>${err.message}</strong>`,
      confirmButtonColor: '#dc2626'
    });
  }
}

function resetSimpusFilters() {
  const s = document.getElementById('searchSimpusRecords');
  const p = document.getElementById('filterSimpusPetugas');
  const u = document.getElementById('filterSimpusUmur');
  const n = document.getElementById('filterSimpusNik');
  const l = document.getElementById('filterSimpusLimit');
  if (s) s.value = '';
  if (p) p.value = '';
  if (u) u.value = '';
  if (n) n.value = '';
  if (l) l.value = '10';
  applyPetugasFilterLock();
  renderSimpusTableRecords();
  showToast('Filter SIMPUS telah di-reset.', 'info');
}

function setSimpusActionStatus(id, status) {
  const item = simpusRecords.find(r => r.id === id);
  if (item) {
    item.entry_status = status;
    saveSimpusRecordsToStorage();
    showToast(`Status data ${item.nama} diubah ke: ${status.toUpperCase()}`, 'success');
  }
}

function openBagiPetugasModal() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  if (role !== 'admin' && role !== 'koordinator') {
    Swal.fire({
      icon: 'warning',
      title: 'Akses Ditolak',
      text: 'Fitur Bagi Data ke Petugas hanya dapat diakses oleh Admin dan Koordinator.',
      confirmButtonColor: '#7c3aed'
    });
    return;
  }

  const belumBagiRecords = simpusRecords.filter(r => !r.is_divided);
  const belumBagi = belumBagiRecords.length;

  if (belumBagi === 0) {
    Swal.fire({
      icon: 'info',
      title: 'Seluruh Data Sudah Di-bagi',
      text: 'Saat ini tidak ada data SIMPUS yang belum di-bagi.',
      confirmButtonColor: '#7c3aed'
    });
    return;
  }

  // Populate target petugas dropdown dynamically
  const selectPetugas = document.getElementById('targetPetugasSelect');
  if (selectPetugas) {
    selectPetugas.innerHTML = '<option value="">-- Pilih Petugas Tujuan --</option>' +
      usersDb.map(u => `<option value="${u.nama_user}">${u.nama_user} (${u.role || 'Petugas'})</option>`).join('');
  }

  const inputJml = document.getElementById('jumlahDataBagi');
  if (inputJml) {
    inputJml.removeAttribute('max'); // Remove strict max attribute to prevent native browser validation tooltips
    inputJml.value = Math.min(10, belumBagi) || 1;
  }

  const helpText = document.getElementById('helpTextBagi');
  if (helpText) {
    helpText.textContent = `Maksimal data belum di-bagi saat ini: ${belumBagi} data.`;
  }

  document.getElementById('bagiPetugasModalOverlay').classList.add('open');
}

function closeBagiPetugasModal() {
  document.getElementById('bagiPetugasModalOverlay').classList.remove('open');
}

async function handleBagiPetugasSubmit(e) {
  e.preventDefault();
  const targetPetugas = document.getElementById('targetPetugasSelect').value;
  const countInput = document.getElementById('jumlahDataBagi').value;
  const count = parseInt(countInput) || 0;

  if (!targetPetugas) {
    showToast('Silakan pilih Petugas Tujuan terlebih dahulu!', 'error');
    return;
  }

  const belumBagiRecords = simpusRecords.filter(r => !r.is_divided);
  const belumBagi = belumBagiRecords.length;

  if (count <= 0) {
    showToast('Jumlah baris data yang di-bagi minimal 1 data!', 'warning');
    return;
  }

  if (count > belumBagi) {
    Swal.fire({
      icon: 'warning',
      title: 'Jumlah Melebihi Batas',
      text: `Jumlah data yang Anda masukkan (${count}) melebihi sisa data SIMPUS yang belum di-bagi (${belumBagi} data).`,
      confirmButtonColor: '#7c3aed'
    });
    return;
  }

  const idsToMove = belumBagiRecords.slice(0, count).map(r => r.id);

  if (idsToMove.length === 0) {
    showToast('Tidak ada data yang tersedia untuk di-bagi.', 'warning');
    closeBagiPetugasModal();
    return;
  }

  closeBagiPetugasModal();
  showLoadingOverlay('Membagikan Data SIMPUS...', `Mengalokasikan ${idsToMove.length} data ke ${targetPetugas} & menyinkronkan ke Cloud D1`);

  // 1. Update local records state immediately
  idsToMove.forEach(id => {
    const rec = simpusRecords.find(r => r.id === id);
    if (rec) {
      rec.is_divided = true;
      rec.assigned_to = targetPetugas;
      rec.petugas_entry = targetPetugas;
    }
  });
  saveSimpusRecordsToStorage();

  // 2. Network sync to backend API (non-blocking)
  try {
    const res = await fetch('/api/simpus/bagi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: idsToMove, petugas: targetPetugas })
    });
    if (res.ok) {
      fetchCloudSimpusRecords(true).catch(() => { });
    }
  } catch (err) {
    console.warn('Backend API /api/simpus/bagi sync notice:', err);
  }

  const assignedCount = idsToMove.length;
  hideLoadingOverlay();
  renderSimpusView();

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'success',
      title: 'Pembagian Data Berhasil!',
      html: `Berhasil membagikan <strong>${assignedCount} Data Pasien SIMPUS</strong> kepada petugas <strong>${targetPetugas}</strong>.<br><br><span style="color:#059669; font-weight:700;">Data otomatis berpindah ke tab "Data Sudah Di-Bagi".</span>`,
      confirmButtonColor: '#7c3aed'
    });
  } else {
    showToast(`Berhasil membagikan ${assignedCount} data SIMPUS kepada ${targetPetugas}!`, 'success');
  }
}

async function deleteAllSimpusData() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  if (role !== 'admin' && role !== 'koordinator') {
    showToast('Akses khusus Koordinator dan Admin!', 'error');
    return;
  }

  if (!simpusRecords || simpusRecords.length === 0) {
    showToast('Tidak ada data SIMPUS untuk dihapus.', 'info');
    return;
  }

  const invalidSimpus = simpusRecords.filter(r => !isNik16Digit(r.nik));
  const validSimpus = simpusRecords.filter(r => isNik16Digit(r.nik));
  const invalidCount = invalidSimpus.length;
  const validCount = validSimpus.length;

  if (typeof Swal === 'undefined') {
    if (confirm('Apakah Anda yakin ingin menghapus SELURUH Data Entry CKG dari SIMPUS di Cloud D1? Action ini tidak dapat dibatalkan.')) {
      showLoadingOverlay('Menghapus Data SIMPUS...', 'Menghapus seluruh record SIMPUS di Cloudflare D1 Database');
      try {
        await fetch('/api/simpus?tab=belum_bagi', { method: 'DELETE' });
        await fetch('/api/simpus?tab=sudah_bagi', { method: 'DELETE' });
      } catch (err) {
        console.error('Cloud delete SIMPUS error:', err);
      }
      simpusRecords = [];
      localStorage.removeItem('ckg_simpus_records');
      hideLoadingOverlay();
      renderSimpusView();
      showToast('Seluruh Data SIMPUS Berhasil Dihapus!', 'success');
    }
    return;
  }

  Swal.fire({
    title: '<span style="color:#dc2626; font-size: 20px;"><i class="bi bi-trash3-fill"></i> PILIHAN PENGHAPUSAN DATA SIMPUS</span>',
    html: `
      <div style="text-align:left; font-size:13px; color:#475569; margin-bottom:14px; line-height:1.5;">
        Silakan pilih jenis penghapusan data pada <strong>${simpusRecords.length} Data SIMPUS</strong>:
      </div>
      <div style="display:flex; flex-direction:column; gap:10px; text-align:left;">
        <!-- OPSI 1: Hapus NIK Tidak 16 Digit Saja -->
        <label id="lblSimpusOptNon16" style="display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border-radius:10px; border:2px solid ${invalidCount > 0 ? '#f59e0b' : '#e2e8f0'}; background:${invalidCount > 0 ? '#fffbeb' : '#f8fafc'}; cursor:${invalidCount > 0 ? 'pointer' : 'not-allowed'}; transition:all 0.2s;">
          <input type="radio" name="delete_simpus_mode" id="deleteSimpusModeNon16" value="non_16_digit" ${invalidCount > 0 ? 'checked' : 'disabled'} style="margin-top:3px; accent-color:#d97706; width:17px; height:17px; cursor:pointer;">
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
              ${invalidCount > 0 ? `Hanya menghapus <b>${invalidCount} data</b> SIMPUS yang NIK-nya tidak 16 digit. Sebanyak <b>${validCount} data</b> ber-NIK valid tetap <span style="color:#059669; font-weight:600;">AMAN</span>.` : 'Semua data SIMPUS sudah ber-NIK 16 digit valid.'}
            </div>
          </div>
        </label>

        <!-- OPSI 2: Hapus SEMUA Data -->
        <label id="lblSimpusOptAll" style="display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border-radius:10px; border:2px solid ${invalidCount === 0 ? '#ef4444' : '#e2e8f0'}; background:${invalidCount === 0 ? '#fef2f2' : '#ffffff'}; cursor:pointer; transition:all 0.2s;">
          <input type="radio" name="delete_simpus_mode" id="deleteSimpusModeAll" value="all" ${invalidCount === 0 ? 'checked' : ''} style="margin-top:3px; accent-color:#dc2626; width:17px; height:17px; cursor:pointer;">
          <div style="flex:1;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">
              <strong style="color:#dc2626; font-size:13.5px;">
                <i class="bi bi-exclamation-triangle-fill" style="color:#dc2626;"></i> Hapus SEMUA Data SIMPUS (Reset Total)
              </strong>
              <span class="badge" style="background:#fee2e2; color:#dc2626; font-size:11.5px; font-weight:700; padding:3px 8px; border-radius:12px;">
                ${simpusRecords.length} Data
              </span>
            </div>
            <div style="font-size:12px; color:#64748b; line-height:1.4;">
              Menghapus seluruh ${simpusRecords.length} data SIMPUS dari Cloudflare D1 Database & Penyimpanan Lokal.
            </div>
          </div>
        </label>
      </div>

      <!-- INFORMASI OPSI 1 -->
      <div id="boxSimpusInfoNon16" style="display:${invalidCount > 0 ? 'block' : 'none'}; margin-top:14px; text-align:left; background:#f0fdf4; padding:10px 12px; border-radius:8px; border:1px solid #bbf7d0; font-size:12px; color:#166534;">
        <i class="bi bi-shield-check" style="color:#16a34a; font-size:14px;"></i> <b>Perlindungan Data Aktif:</b> Hanya data SIMPUS ber-NIK tidak 16 digit yang akan dibersihkan. Sebanyak <b>${validCount} data</b> ber-NIK valid 16 digit tetap tersimpan aman.
      </div>

      <!-- PERINGATAN OPSI 2 (Ketik HAPUS SEMUA DATA) -->
      <div id="boxSimpusConfirmDeleteAll" style="display:${invalidCount === 0 ? 'block' : 'none'}; margin-top:14px; text-align:left; background:#fef2f2; padding:12px; border-radius:8px; border:1px solid #fecaca;">
        <label style="font-size:12px; font-weight:700; color:#991b1b; display:block; margin-bottom:6px;">
          Ketik "HAPUS SEMUA DATA" di bawah untuk mengaktifkan tombol konfirmasi:
        </label>
        <input type="text" id="confirmDeleteSimpusInputText" class="swal2-input" placeholder="HAPUS SEMUA DATA" style="width:100%; margin:0; font-weight:700; text-transform:uppercase; border:2px solid #f87171; border-radius:6px; padding:8px 12px; box-sizing:border-box; color:#991b1b;">
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
      const radioNon16 = document.getElementById('deleteSimpusModeNon16');
      const radioAll = document.getElementById('deleteSimpusModeAll');
      const lblNon16 = document.getElementById('lblSimpusOptNon16');
      const lblAll = document.getElementById('lblSimpusOptAll');
      const boxNon16 = document.getElementById('boxSimpusInfoNon16');
      const boxAll = document.getElementById('boxSimpusConfirmDeleteAll');
      const inputEl = document.getElementById('confirmDeleteSimpusInputText');

      function updateState() {
        const isAll = radioAll && radioAll.checked;
        if (isAll) {
          if (lblAll) { lblAll.style.border = '2px solid #ef4444'; lblAll.style.background = '#fef2f2'; }
          if (lblNon16) { lblNon16.style.border = '2px solid #e2e8f0'; lblNon16.style.background = '#ffffff'; }
          if (boxAll) boxAll.style.display = 'block';
          if (boxNon16) boxNon16.style.display = 'none';

          if (confirmBtn) {
            confirmBtn.textContent = 'Ya, Hapus Semua Data SIMPUS!';
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
      const radioAll = document.getElementById('deleteSimpusModeAll');
      const isAll = radioAll && radioAll.checked;
      if (isAll) {
        const inputEl = document.getElementById('confirmDeleteSimpusInputText');
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
        showLoadingOverlay('Membersihkan Data SIMPUS...', `Menghapus ${invalidCount} data SIMPUS ber-NIK tidak 16 digit`);
        try {
          const invalidIds = invalidSimpus.map(r => r.id || r.nik);
          await fetch('/api/simpus?filter=non_16_digit', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filter: 'non_16_digit', ids: invalidIds })
          });

          simpusRecords = simpusRecords.filter(r => isNik16Digit(r.nik));
          try { localStorage.setItem('ckg_simpus_records', JSON.stringify(simpusRecords)); } catch (_) { }
          hideLoadingOverlay();
          renderSimpusView();

          Swal.fire({
            icon: 'success',
            title: 'Pembersihan NIK SIMPUS Berhasil!',
            html: `Sebanyak <strong>${invalidCount} data</strong> SIMPUS ber-NIK tidak 16 digit telah berhasil dihapus dari Cloudflare D1 Database.<br><br>Sisa <strong>${simpusRecords.length} data</strong> ber-NIK 16 digit valid tetap tersimpan aman.`,
            confirmButtonColor: '#059669'
          });
        } catch (err) {
          hideLoadingOverlay();
          console.error('SIMPUS delete invalid NIK error:', err);
          Swal.fire({
            icon: 'error',
            title: 'Gagal Menghapus Data!',
            html: `Terjadi kesalahan saat menghapus data: <strong>${err.message}</strong>`,
            confirmButtonColor: '#dc2626'
          });
        }
      } else {
        showLoadingOverlay('Menghapus Seluruh Data SIMPUS...', 'Menghapus seluruh record SIMPUS di Cloudflare D1 Database');
        try {
          await fetch('/api/simpus?tab=belum_bagi', { method: 'DELETE' });
          await fetch('/api/simpus?tab=sudah_bagi', { method: 'DELETE' });
        } catch (err) {
          console.error('Cloud delete SIMPUS error:', err);
        }
        simpusRecords = [];
        localStorage.removeItem('ckg_simpus_records');
        hideLoadingOverlay();
        renderSimpusView();

        Swal.fire({
          icon: 'success',
          title: 'Berhasil Dihapus!',
          html: 'Seluruh Data SIMPUS telah <strong>berhasil dihapus secara permanen dari Cloudflare D1 Database</strong>.',
          confirmButtonColor: '#059669'
        });
      }
    }
  });
}

// Helper: Format any date string, ISO date, or Excel date serial integer to YYYY-MM-DD format
function formatDateToYYYYMMDD(val) {
  if (val === null || val === undefined || val === '') return '';

  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const s = String(val).trim();
  if (!s) return '';

  // Handle Excel date serial number (e.g. 37067 or "37067")
  if (!isNaN(s) && Number(s) > 1000 && Number(s) < 100000) {
    const n = Number(s);
    const date = new Date(Math.round((n - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Handle ISO string e.g. "2026-08-07T14:20:00.000Z"
  if (s.includes('T')) {
    const datePart = s.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  }

  // Handle standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Handle separators like DD/MM/YYYY or DD-MM-YYYY or YYYY/MM/DD
  if (s.includes('/') || s.includes('-')) {
    const sep = s.includes('/') ? '/' : '-';
    const parts = s.split(sep);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].substring(0, 2).padStart(2, '0');
        return `${y}-${m}-${d}`;
      } else if (parts[2].substring(0, 4).length === 4) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2].substring(0, 4);
        return `${y}-${m}-${d}`;
      }
    }
  }

  return s;
}

// Helper: Save XLSX workbook as a proper .xlsx download with correct filename
function saveXlsxFile(wb, filename) {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

let pendingImportFile = null;

function importSimpusXlsx() {
  pendingImportFile = null;
  const fileInput = document.getElementById('simpusXlsxFileInput');
  if (fileInput) fileInput.value = '';
  const dropZone = document.getElementById('importDropZone');
  if (dropZone) dropZone.classList.remove('file-ready');
  const fileInfo = document.getElementById('importFileInfo');
  if (fileInfo) fileInfo.style.display = 'none';
  const btnProcess = document.getElementById('btnProcessImport');
  if (btnProcess) btnProcess.disabled = true;

  document.getElementById('importSimpusModalOverlay').classList.add('open');

  // Setup drag-and-drop
  setTimeout(() => {
    const dz = document.getElementById('importDropZone');
    if (!dz || dz._dragSetup) return;
    dz._dragSetup = true;

    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      dz.classList.add('dragover');
    });
    dz.addEventListener('dragleave', () => {
      dz.classList.remove('dragover');
    });
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        setImportFile(file);
      } else {
        showToast('Format file tidak didukung. Gunakan .xlsx atau .xls', 'error');
      }
    });
  }, 100);
}

function closeImportSimpusModal() {
  document.getElementById('importSimpusModalOverlay').classList.remove('open');
  pendingImportFile = null;
}

function handleSimpusXlsxImport(event) {
  const file = event.target.files[0];
  if (file) setImportFile(file);
}

function setImportFile(file) {
  pendingImportFile = file;

  const dropZone = document.getElementById('importDropZone');
  if (dropZone) {
    dropZone.classList.add('file-ready');
    const iconEl = dropZone.querySelector('.import-dropzone-icon i');
    if (iconEl) iconEl.className = 'bi bi-file-earmark-check-fill';
    const textEl = dropZone.querySelector('.import-dropzone-text');
    if (textEl) textEl.innerHTML = `<strong style="color: #16a34a;">File Siap Di-Import!</strong>`;
  }

  const fileInfo = document.getElementById('importFileInfo');
  if (fileInfo) {
    fileInfo.style.display = 'flex';
    fileInfo.style.alignItems = 'center';
    fileInfo.style.gap = '6px';
  }
  const fileName = document.getElementById('importFileName');
  if (fileName) fileName.textContent = file.name;

  const btnProcess = document.getElementById('btnProcessImport');
  if (btnProcess) btnProcess.disabled = false;
}

function downloadTemplateSimpusXlsx() {
  try {
    const headers = [
      "NAMA PASIEN", "NIK", "TANGGAL LAHIR", "USIA",
      "Status Pernikahan", "Provinsi", "Kab/Kota", "Kecamatan", "Kelurahan", "Alamat Lengkap",
      "BB (kg)", "TB (cm)", "TD SISTOL", "TD DIASTOL", "GULA DARAH", "KOLESTEROL"
    ];

    const sampleRow1 = [
      "EUIS SARIBANON", "3204123456780001", "1962-12-01", 63,
      "MENIKAH", "Jawa Barat", "Kab. Bandung", "Banjaran", "Tarajusari", "Kp Cipeundeuy",
      54, 153, 135, 99, "91", "180"
    ];

    const sampleRow2 = [
      "SENY SEPTIANY", "3204134109910006", "1991-09-01", 34,
      "BELUM MENIKAH", "Jawa Barat", "Kab. Bandung", "Banjaran", "Tarajusari", "Kp Cipeundeuy",
      56, 159, 120, 92, "90", "180"
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow1, sampleRow2]);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 3, 15) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template SIMPUS Belum Di-Bagi");
    saveXlsxFile(wb, `Template_Import_SIMPUS_BelumDibagi_${new Date().toISOString().substring(0, 10)}.xlsx`);

    showToast('Template XLSX SIMPUS (Data Belum Di-Bagi) Berhasil Diunduh!', 'success');
  } catch (err) {
    console.error('Download SIMPUS template error:', err);
    showToast('Gagal mengunduh template XLSX.', 'error');
  }
}

function processImportFromModal() {
  if (!pendingImportFile) {
    showToast('Silakan pilih file XLSX terlebih dahulu.', 'error');
    return;
  }

  const file = pendingImportFile;
  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        showToast('File Excel tidak valid atau rusak!', 'error');
        return;
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonData.length === 0) {
        showToast('File XLSX kosong atau tidak memiliki data.', 'error');
        return;
      }

      const parsedRecords = [];
      let skippedInvalidNik = 0;
      const sampleInvalidNik = [];
      const maxId = simpusRecords.reduce((max, r) => {
        const num = parseInt(String(r.no)) || 0;
        return num > max ? num : max;
      }, 3900);

      jsonData.forEach((row, idx) => {
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
              if (keyClean.includes(target)) return String(row[rowKey]).trim();
            }
          }
          return '';
        };

        const nama = getVal('NAMA PASIEN', 'NAMA', 'Nama Pasien', 'Nama').toUpperCase();
        const rawNik = getVal('NIK', 'nik', 'No KTP', 'Nomor NIK');
        const cleanNik = extractCleanNik16(rawNik);

        if (!nama || nama.length < 2) return;

        // FILTER NIK WAJIB 16 DIGIT: Kurang atau lebih dari 16 digit DITOLAK / TIDAK BISA MASUK
        if (cleanNik.length !== 16) {
          skippedInvalidNik++;
          if (sampleInvalidNik.length < 5) {
            sampleInvalidNik.push({ nama, nik: rawNik || '(kosong)', len: cleanNik.length });
          }
          return;
        }

        const newId = `S-${maxId + idx + 1}-${Date.now()}`;
        const bb = parseFloat(getVal('BB (kg)', 'BB', 'BERAT BADAN', 'Berat Badan')) || 0;
        const tb = parseFloat(getVal('TB (cm)', 'TB', 'TINGGI BADAN', 'Tinggi Badan')) || 0;
        const imt = (bb > 0 && tb > 0) ? parseFloat((bb / ((tb / 100) ** 2)).toFixed(1)) : 0;
        const rawDob = getVal('TANGGAL LAHIR', 'Tgl Lahir', 'DOB', 'Tanggal_Lahir');
        const dobIso = formatDateToYYYYMMDD(rawDob) || '1990-01-01';
        const usia = parseInt(getVal('USIA', 'Usia', 'Umur')) || 30;
        const keterangan = getKategoriUmur(usia, dobIso);

        const record = {
          id: newId,
          no: maxId + idx + 1,
          petugas_entry: '',
          nama: nama,
          nik: cleanNik,
          tanggal: new Date().toISOString().substring(0, 10),
          dob: dobIso,
          usia: usia,
          status_pernikahan: getVal('Status Pernikahan', 'Status', 'Pernikahan') || 'MENIKAH',
          provinsi: getVal('Provinsi', 'Prov') || 'Jawa Barat',
          kab_kota: getVal('Kab/Kota', 'Kab', 'Kota') || 'Kab. Bandung',
          kecamatan: getVal('Kecamatan', 'Kec') || 'Banjaran',
          kelurahan: getVal('Kelurahan', 'Kel', 'Desa') || 'Tarajusari',
          alamat: getVal('Alamat Lengkap', 'ALAMAT', 'Alamat', 'Alamat_Lengkap') || '-',
          bb: bb,
          tb: tb,
          imt: imt,
          sistol: parseInt(getVal('TD SISTOL', 'TD SISTOLIK', 'SISTOL', 'Sistol')) || 120,
          diastol: parseInt(getVal('TD DIASTOL', 'TD DIASTOLIK', 'DIASTOL', 'Diastol')) || 80,
          gula: getVal('GULA DARAH', 'Gula Darah', 'Gula') || '100',
          kolesterol: getVal('KOLESTEROL', 'Kolesterol') || '180',
          keterangan: keterangan,
          is_divided: false,
          assigned_to: '',
          entry_status: 'belum'
        };

        parsedRecords.push(record);
      });

      if (parsedRecords.length === 0) {
        if (typeof Swal !== 'undefined') {
          if (skippedInvalidNik > 0) {
            const sampleList = sampleInvalidNik.map(s => `• <b>${s.nama}</b>: NIK "${s.nik}" (${s.len} digit)`).join('<br>');
            Swal.fire({
              icon: 'warning',
              title: 'Semua Data Ditolak (NIK Tidak 16 Digit)',
              html: `<div style="font-size:13px; text-align:left; line-height:1.6;">
                      Sebanyak <b>${skippedInvalidNik} baris data SIMPUS</b> ditolak karena NIK <b>tidak persis 16 digit</b> (kurang atau lebih).<br><br>
                      <b>Contoh data yang ditolak:</b><br>
                      <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:6px; padding:8px 12px; margin-top:6px; font-size:12px; color:#9f1239;">
                        ${sampleList}
                      </div><br>
                      Data tidak dapat masuk ke sistem jika NIK bukan 16 digit angka valid. Mohon periksa kembali file Excel Anda.
                    </div>`,
              confirmButtonColor: '#ef4444'
            });
          } else {
            Swal.fire('Gagal Read Excel', 'Sistem tidak menemukan baris data pasien yang valid pada file Excel tersebut. Mohon gunakan template resmi XLSX SIMPUS.', 'warning');
          }
        } else {
          showToast(skippedInvalidNik > 0 ? `${skippedInvalidNik} data ditolak karena NIK tidak 16 digit.` : 'Tidak ada data valid yang bisa di-import.', 'warning');
        }
        return;
      }

      closeImportSimpusModal();

      // Show Progress Modal for Cloud Sync
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          title: `<i class="bi bi-cloud-upload-fill" style="color:#d97706;"></i> Meng-upload ${parsedRecords.length} Data Pasien ke Cloud Database D1...`,
          html: `<div style="margin:10px 0;">
                  <div id="simpusImportProgressBar" style="width:100%;height:20px;background:#e2e8f0;border-radius:10px;overflow:hidden;">
                    <div id="simpusImportProgressFill" style="width:0%;height:100%;background:linear-gradient(90deg,#d97706,#f59e0b);border-radius:10px;transition:width 0.3s;"></div>
                  </div>
                  <div id="simpusImportProgressText" style="margin-top:8px;font-size:13px;color:#475569;font-weight:600;">0 / ${parsedRecords.length} data pasien (0%)</div>
                </div>`,
          allowOutsideClick: false,
          showConfirmButton: false
        });
      }

      const chunkSize = 20;
      let uploaded = 0;
      let failed = 0;
      let lastError = '';

      for (let i = 0; i < parsedRecords.length; i += chunkSize) {
        const chunk = parsedRecords.slice(i, i + chunkSize);
        let success = false;

        // Try up to 2 times per chunk
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const tStart = performance.now();
            const res = await fetch('/api/simpus?tab=belum_bagi', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(chunk)
            });
            const tEnd = performance.now();
            if (res.ok) {
              uploaded += chunk.length;
              success = true;
              console.log(`[Import SIMPUS Speed] Upload ${chunk.length} data completed in ${(tEnd - tStart).toFixed(1)} ms (${Math.round((chunk.length / ((tEnd - tStart) / 1000)))} data/sec)`);
              break;
            } else {
              const errBody = await res.text();
              lastError = `HTTP ${res.status}: ${errBody.substring(0, 200)}`;
              console.error(`[Import SIMPUS] Chunk ${i}-${i + chunk.length} failed (attempt ${attempt + 1}):`, lastError);
              // Wait before retry
              await new Promise(r => setTimeout(r, 500));
            }
          } catch (err) {
            lastError = err.message;
            console.error(`[Import SIMPUS] Network error chunk ${i} (attempt ${attempt + 1}):`, err.message);
            await new Promise(r => setTimeout(r, 500));
          }
        }

        if (!success) {
          failed += chunk.length;
        }

        const pct = Math.round(((uploaded + failed) / parsedRecords.length) * 100);
        const fillEl = document.getElementById('simpusImportProgressFill');
        const txtEl = document.getElementById('simpusImportProgressText');
        if (fillEl) fillEl.style.width = pct + '%';
        if (txtEl) txtEl.textContent = `${uploaded + failed} / ${parsedRecords.length} data pasien (${pct}%)`;

        // Small delay between chunks to avoid D1 rate limits
        if (i + chunkSize < parsedRecords.length) {
          await new Promise(r => setTimeout(r, 150));
        }
      }

      console.log(`[Import SIMPUS] Upload complete: ${uploaded} ok, ${failed} failed. Last error: ${lastError}`);

      simpusRecords = [...parsedRecords, ...simpusRecords];
      saveSimpusRecordsToStorage();
      renderSimpusView();
      updateCloudSyncPill(true, `D1 Online (${simpusRecords.length} SIMPUS)`);

      if (typeof Swal !== 'undefined') {
        if (uploaded > 0) {
          let skippedNotice = '';
          if (skippedInvalidNik > 0) {
            skippedNotice = `<div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:10px 12px; margin-top:10px; font-size:12.5px; color:#92400e;">
              ⚠️ <strong>${skippedInvalidNik} data pasien dilewati / ditolak</strong> karena NIK tidak persis 16 digit.
            </div>`;
          }
          Swal.fire({
            icon: 'success',
            title: 'Import & Sinkronisasi Cloud Berhasil!',
            html: `<div style="font-size:13.5px; text-align:left; line-height:1.6;">
                    Total <strong>${uploaded} Data Pasien</strong> dari file <strong>${file.name}</strong> telah <strong>ter-upload & tersimpan permanen di Cloudflare D1 Database (tab Data Belum Di-Bagi)</strong>.
                    ${skippedNotice}
                  </div>`,
            confirmButtonColor: '#d97706'
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Upload ke Cloud Database D1',
            html: `<div style="font-size:13.5px; text-align:left; line-height:1.6;">
                    Sistem gagal menyimpan <strong>${parsedRecords.length} Data Pasien</strong> ke Cloud D1.<br><br>
                    <div style="background:#fef2f2; border:1px solid #fca5a5; border-radius:8px; padding:10px; margin:8px 0; font-size:11.5px; color:#991b1b; word-break:break-all;">
                      <strong>Detail Error:</strong><br>${lastError || 'Unknown error - cek browser Console (F12)'}
                    </div>
                    <span style="color:#dc2626; font-size:12.5px;">Data telah diamankan di browser lokal. Silakan deploy ulang _worker.js lalu coba kembali.</span>
                  </div>`,
            confirmButtonColor: '#ef4444'
          });
        }
      } else {
        showToast(`${uploaded} data SIMPUS berhasil di-upload ke Cloud D1!`, 'success');
      }
    } catch (err) {
      console.error('Import XLSX Error:', err);
      showToast('Gagal membaca file XLSX. Pastikan format file benar.', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function openEksporPerPetugasModal() {
  const divided = simpusRecords.filter(r => r.is_divided);
  const petugasMap = {};

  divided.forEach(r => {
    const key = r.assigned_to || 'Belum Di-assign';
    if (!petugasMap[key]) petugasMap[key] = [];
    petugasMap[key].push(r);
  });

  const body = document.getElementById('eksporPerPetugasBody');
  if (!body) return;

  const petugasList = Object.keys(petugasMap);

  if (petugasList.length === 0) {
    body.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-muted);">
        <i class="bi bi-inbox" style="font-size: 36px; display: block; margin-bottom: 8px; color: #94a3b8;"></i>
        <strong>Belum Ada Data yang Sudah Di-Bagi</strong>
        <p style="font-size: 12.5px; margin-top: 4px;">Silakan distribusikan data terlebih dahulu ke petugas melalui tombol "Bagi Data ke Petugas".</p>
      </div>
    `;
  } else {
    body.innerHTML = `
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 12.5px; display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
        <i class="bi bi-info-circle-fill" style="font-size: 16px;"></i>
        <span>Klik tombol <strong>Download</strong> pada tiap petugas untuk mengunduh file XLSX data pasien yang menjadi tugas mereka.</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${petugasList.map(petugas => {
      const count = petugasMap[petugas].length;
      return `
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-subtle); padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
              <div>
                <div style="font-weight: 800; color: var(--text-main); font-size: 14px;">
                  <i class="bi bi-person-badge-fill" style="color: var(--primary);"></i> ${petugas}
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                  <span class="badge badge-purple">${count} Data Pasien</span>
                </div>
              </div>
              <button class="btn btn-emerald btn-sm" onclick="exportSinglePetugasXlsx('${petugas.replace(/'/g, "\\'")}')">
                <i class="bi bi-download"></i> Download XLSX
              </button>
            </div>
          `;
    }).join('')}
      </div>
    `;
  }

  document.getElementById('eksporPerPetugasModalOverlay').classList.add('open');
}

function closeEksporPerPetugasModal() {
  document.getElementById('eksporPerPetugasModalOverlay').classList.remove('open');
}

function exportSinglePetugasXlsx(petugasName) {
  const records = simpusRecords.filter(r => r.is_divided && r.assigned_to === petugasName);
  if (records.length === 0) {
    showToast(`Tidak ada data untuk petugas ${petugasName}.`, 'error');
    return;
  }

  const exportData = records.map((r, i) => ({
    'NO': i + 1,
    'PETUGAS ENTRY': r.assigned_to || r.petugas_entry || petugasName,
    'NAMA PASIEN': r.nama || '',
    'NIK': r.nik || '',
    'TANGGAL LAHIR': formatDateToYYYYMMDD(r.dob || r.tanggal_lahir),
    'USIA': r.usia || 0,
    'STATUS PERNIKAHAN': r.status_pernikahan || 'MENIKAH',
    'PROVINSI': r.provinsi || 'Jawa Barat',
    'KAB/KOTA': r.kab_kota || 'Kab. Bandung',
    'KECAMATAN': r.kecamatan || 'Banjaran',
    'KELURAHAN': r.kelurahan || 'Tarajusari',
    'ALAMAT LENGKAP': r.alamat || '',
    'BB (KG)': r.bb !== undefined && r.bb !== null ? r.bb : '',
    'TB (CM)': r.tb !== undefined && r.tb !== null ? r.tb : '',
    'TD SISTOL': r.sistol !== undefined && r.sistol !== null ? r.sistol : '',
    'TD DIASTOL': r.diastol !== undefined && r.diastol !== null ? r.diastol : '',
    'GULA DARAH': r.gula || '',
    'KOLESTEROL': r.kolesterol || '',
    'STATUS ENTRY': (r.entry_status || 'belum').toUpperCase()
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 6 },   // NO
    { wch: 25 },  // PETUGAS ENTRY
    { wch: 26 },  // NAMA PASIEN
    { wch: 18 },  // NIK
    { wch: 14 },  // TANGGAL LAHIR (yyyy-mm-dd)
    { wch: 8 },   // USIA
    { wch: 18 },  // STATUS PERNIKAHAN
    { wch: 16 },  // PROVINSI
    { wch: 16 },  // KAB/KOTA
    { wch: 16 },  // KECAMATAN
    { wch: 16 },  // KELURAHAN
    { wch: 35 },  // ALAMAT LENGKAP
    { wch: 10 },  // BB (KG)
    { wch: 10 },  // TB (CM)
    { wch: 12 },  // TD SISTOL
    { wch: 12 },  // TD DIASTOL
    { wch: 14 },  // GULA DARAH
    { wch: 14 },  // KOLESTEROL
    { wch: 16 }   // STATUS ENTRY
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Petugas');

  const safeName = petugasName.replace(/[^a-zA-Z0-9]/g, '_');
  saveXlsxFile(wb, `Data_SIMPUS_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  showToast(`File XLSX untuk ${petugasName} berhasil diunduh! (${records.length} data)`, 'success');
}

function exportAllPetugasXlsx() {
  const divided = simpusRecords.filter(r => r.is_divided);
  if (divided.length === 0) {
    showToast('Tidak ada data yang sudah di-bagi untuk diekspor.', 'error');
    return;
  }

  const petugasMap = {};
  divided.forEach(r => {
    const key = r.assigned_to || 'Belum Di-assign';
    if (!petugasMap[key]) petugasMap[key] = [];
    petugasMap[key].push(r);
  });

  const wb = XLSX.utils.book_new();

  Object.keys(petugasMap).forEach(petugas => {
    const records = petugasMap[petugas];
    const exportData = records.map((r, i) => ({
      'NO': i + 1,
      'PETUGAS ENTRY': r.assigned_to || r.petugas_entry || petugas,
      'NAMA PASIEN': r.nama || '',
      'NIK': r.nik || '',
      'TANGGAL LAHIR': formatDateToYYYYMMDD(r.dob || r.tanggal_lahir),
      'USIA': r.usia || 0,
      'STATUS PERNIKAHAN': r.status_pernikahan || 'MENIKAH',
      'PROVINSI': r.provinsi || 'Jawa Barat',
      'KAB/KOTA': r.kab_kota || 'Kab. Bandung',
      'KECAMATAN': r.kecamatan || 'Banjaran',
      'KELURAHAN': r.kelurahan || 'Tarajusari',
      'ALAMAT LENGKAP': r.alamat || '',
      'BB (KG)': r.bb !== undefined && r.bb !== null ? r.bb : '',
      'TB (CM)': r.tb !== undefined && r.tb !== null ? r.tb : '',
      'TD SISTOL': r.sistol !== undefined && r.sistol !== null ? r.sistol : '',
      'TD DIASTOL': r.diastol !== undefined && r.diastol !== null ? r.diastol : '',
      'GULA DARAH': r.gula || '',
      'KOLESTEROL': r.kolesterol || '',
      'STATUS ENTRY': (r.entry_status || 'belum').toUpperCase()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 6 },   // NO
      { wch: 25 },  // PETUGAS ENTRY
      { wch: 26 },  // NAMA PASIEN
      { wch: 18 },  // NIK
      { wch: 14 },  // TANGGAL LAHIR (yyyy-mm-dd)
      { wch: 8 },   // USIA
      { wch: 18 },  // STATUS PERNIKAHAN
      { wch: 16 },  // PROVINSI
      { wch: 16 },  // KAB/KOTA
      { wch: 16 },  // KECAMATAN
      { wch: 16 },  // KELURAHAN
      { wch: 35 },  // ALAMAT LENGKAP
      { wch: 10 },  // BB (KG)
      { wch: 10 },  // TB (CM)
      { wch: 12 },  // TD SISTOL
      { wch: 12 },  // TD DIASTOL
      { wch: 14 },  // GULA DARAH
      { wch: 14 },  // KOLESTEROL
      { wch: 16 }   // STATUS ENTRY
    ];

    const sheetName = petugas.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  saveXlsxFile(wb, `Data_SIMPUS_Semua_Petugas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  showToast(`File XLSX untuk semua petugas berhasil diunduh! (${divided.length} total data)`, 'success');
  closeEksporPerPetugasModal();
}

function exportSimpusXlsx() {
  if (simpusRecords.length === 0) {
    showToast('Tidak ada data SIMPUS untuk di-download.', 'error');
    return;
  }

  const exportData = simpusRecords.map((r, i) => ({
    'NO': i + 1,
    'PETUGAS ENTRY': r.assigned_to || r.petugas_entry || '-',
    'NAMA PASIEN': r.nama || '',
    'NIK': r.nik || '',
    'TANGGAL LAHIR': formatDateToYYYYMMDD(r.dob || r.tanggal_lahir),
    'USIA': r.usia || 0,
    'STATUS PERNIKAHAN': r.status_pernikahan || 'MENIKAH',
    'PROVINSI': r.provinsi || 'Jawa Barat',
    'KAB/KOTA': r.kab_kota || 'Kab. Bandung',
    'KECAMATAN': r.kecamatan || 'Banjaran',
    'KELURAHAN': r.kelurahan || 'Tarajusari',
    'ALAMAT LENGKAP': r.alamat || '',
    'BB (KG)': r.bb !== undefined && r.bb !== null ? r.bb : '',
    'TB (CM)': r.tb !== undefined && r.tb !== null ? r.tb : '',
    'TD SISTOL': r.sistol !== undefined && r.sistol !== null ? r.sistol : '',
    'TD DIASTOL': r.diastol !== undefined && r.diastol !== null ? r.diastol : '',
    'GULA DARAH': r.gula || '',
    'KOLESTEROL': r.kolesterol || '',
    'STATUS BAGI': r.is_divided ? 'Sudah Di-Bagi' : 'Belum Di-Bagi',
    'STATUS ENTRY': (r.entry_status || 'belum').toUpperCase()
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 6 },   // NO
    { wch: 25 },  // PETUGAS ENTRY
    { wch: 26 },  // NAMA PASIEN
    { wch: 18 },  // NIK
    { wch: 14 },  // TANGGAL LAHIR (yyyy-mm-dd)
    { wch: 8 },   // USIA
    { wch: 18 },  // STATUS PERNIKAHAN
    { wch: 16 },  // PROVINSI
    { wch: 16 },  // KAB/KOTA
    { wch: 16 },  // KECAMATAN
    { wch: 16 },  // KELURAHAN
    { wch: 35 },  // ALAMAT LENGKAP
    { wch: 10 },  // BB (KG)
    { wch: 10 },  // TB (CM)
    { wch: 12 },  // TD SISTOL
    { wch: 12 },  // TD DIASTOL
    { wch: 14 },  // GULA DARAH
    { wch: 14 },  // KOLESTEROL
    { wch: 14 },  // STATUS BAGI
    { wch: 16 }   // STATUS ENTRY
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data SIMPUS');

  saveXlsxFile(wb, `Data_SIMPUS_CKG_${new Date().toISOString().slice(0, 10)}.xlsx`);
  showToast(`File XLSX seluruh data SIMPUS berhasil diunduh! (${simpusRecords.length} data)`, 'success');
}

// ----------------------------------------------------

/* ==========================================================================
   👑 FITUR IMPORT DATA SIMPUS MULTI-PETUGAS KHUSUS ADMIN (SUDAH DI-BAGI)
   ========================================================================== */

let selectedSimpusAdminImportFile = null;
let parsedSimpusAdminRecords = [];

function openSimpusAdminMultiImportModal() {
  const role = (sessionStorage.getItem('ckg_user_role') || currentRole || 'Petugas').toLowerCase();
  if (role !== 'admin') {
    if (typeof Swal !== 'undefined') {
      Swal.fire('Akses Ditolak', 'Fitur Import SIMPUS Multi-Petugas ini khusus untuk Role Admin.', 'warning');
    } else {
      showToast('Akses khusus Admin!', 'error');
    }
    return;
  }

  const modal = document.getElementById('simpusAdminImportModal');
  if (modal) modal.classList.add('open', 'active');

  selectedSimpusAdminImportFile = null;
  parsedSimpusAdminRecords = [];

  const previewArea = document.getElementById('simpusAdminImportPreviewArea');
  const btnExec = document.getElementById('btnExecuteSimpusAdminImport');
  const fileInput = document.getElementById('simpusAdminImportFileInput');

  if (previewArea) {
    previewArea.style.display = 'none';
    previewArea.innerHTML = '';
  }
  if (btnExec) btnExec.disabled = true;
  if (fileInput) fileInput.value = '';
}

function closeSimpusAdminMultiImportModal() {
  const modal = document.getElementById('simpusAdminImportModal');
  if (modal) modal.classList.remove('open', 'active');
}

function downloadSimpusAdminXLSXTemplate() {
  try {
    const headers = [
      "Petugas Entry", "NAMA PASIEN", "NIK", "TANGGAL", "TANGGAL LAHIR", "USIA",
      "Status Pernikahan", "Provinsi", "Kab/Kota", "Kecamatan", "Kelurahan", "Alamat Lengkap",
      "BB (kg)", "TB (cm)", "TD SISTOL", "TD DIASTOL", "GULA DARAH", "KOLESTEROL"
    ];

    const sampleRow1 = [
      "Teti Nuryati, S.Keb, Bdn", "EUIS SARIBANON", "3204123456780001", "2026-08-01", "1962-12-01", 63,
      "MENIKAH", "Jawa Barat", "Kab. Bandung", "Banjaran", "Tarajusari", "Kp Cipeundeuy",
      54, 153, 135, 99, "91", "180"
    ];

    const sampleRow2 = [
      "Mochamad Fauzie, S.Gz", "SENY SEPTIANY", "3204134109910006", "2026-08-01", "1991-09-01", 34,
      "BELUM MENIKAH", "Jawa Barat", "Kab. Bandung", "Banjaran", "Tarajusari", "Kp Cipeundeuy",
      56, 159, 120, 92, "90", "180"
    ];

    const sampleRow3 = [
      "Anisa Rohmatunisa, AM.Keb", "NUR FAJARWATI ARIFAH", "3273076009850004", "2026-08-02", "1985-09-20", 40,
      "MENIKAH", "Jawa Barat", "Kab. Bandung", "Banjaran", "Tarajusari", "Kp Cipeundeuy",
      69, 155, 125, 96, "94", "180"
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow1, sampleRow2, sampleRow3]);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 3, 15) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template SIMPUS Multi Petugas");
    XLSX.writeFile(wb, `Template_Import_SIMPUS_MultiPetugas_${new Date().toISOString().substring(0, 10)}.xlsx`);

    showToast('Template Excel SIMPUS Multi-Petugas Berhasil Diunduh!', 'success');
  } catch (err) {
    console.error('Download SIMPUS admin template error:', err);
    if (typeof Swal !== 'undefined') Swal.fire('Gagal Download Template', err.message, 'error');
  }
}

function handleSimpusAdminImportFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  selectedSimpusAdminImportFile = file;
  parsedSimpusAdminRecords = [];

  const previewArea = document.getElementById('simpusAdminImportPreviewArea');
  const btnExec = document.getElementById('btnExecuteSimpusAdminImport');
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
      const maxNo = simpusRecords.reduce((max, r) => Math.max(max, parseInt(r.no) || 0), 3900);

      jsonRows.forEach((row, idx) => {
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
              if (keyClean.includes(target)) return String(row[rowKey]).trim();
            }
          }
          return '';
        };

        const nama = getVal('NAMA PASIEN', 'NAMA', 'Nama Pasien', 'Nama').toUpperCase();
        const rawNik = getVal('NIK', 'nik', 'No KTP', 'Nomor NIK');
        if (!nama || nama.length < 2) return;

        const cleanNik = extractCleanNik16(rawNik);
        // FILTER NIK WAJIB 16 DIGIT: Kurang atau lebih dari 16 digit DITOLAK / TIDAK BISA MASUK
        if (cleanNik.length !== 16) {
          skippedInvalidNik++;
          if (sampleInvalidNik.length < 5) {
            sampleInvalidNik.push({ nama, nik: rawNik || '(kosong)', len: cleanNik.length });
          }
          return;
        }

        let petugasName = getVal('Petugas Entry', 'Petugas', 'Assigned To', 'Petugas Skrining', 'Created By', 'Nama Petugas');
        if (!petugasName) petugasName = loggedAdmin;

        const rawDob = getVal('TANGGAL LAHIR', 'Tgl Lahir', 'DOB');
        const dobIso = formatDateToYYYYMMDD(rawDob) || '1990-01-01';
        const usia = parseInt(getVal('USIA', 'Usia', 'Umur')) || 30;
        const bb = parseFloat(getVal('BB (kg)', 'BB', 'BERAT BADAN')) || 0;
        const tb = parseFloat(getVal('TB (cm)', 'TB', 'TINGGI BADAN')) || 0;
        const imtVal = (bb > 0 && tb > 0) ? parseFloat((bb / ((tb / 100) ** 2)).toFixed(1)) : 0;
        const keterangan = getKategoriUmur(usia, dobIso);

        const recId = `S-${maxNo + idx + 1}-${Date.now()}`;
        const record = {
          id: recId,
          no: maxNo + idx + 1,
          petugas_entry: petugasName,
          nama: nama,
          nik: cleanNik,
          tanggal: getVal('TANGGAL', 'Tanggal', 'Tanggal Entry') || new Date().toISOString().substring(0, 10),
          dob: dobIso,
          usia: usia,
          status_pernikahan: getVal('Status Pernikahan', 'Status') || 'MENIKAH',
          provinsi: getVal('Provinsi', 'Prov') || 'Jawa Barat',
          kab_kota: getVal('Kab/Kota', 'Kab', 'Kota') || 'Kab. Bandung',
          kecamatan: getVal('Kecamatan', 'Kec') || 'Banjaran',
          kelurahan: getVal('Kelurahan', 'Kel', 'Desa') || 'Tarajusari',
          alamat: getVal('Alamat Lengkap', 'ALAMAT', 'Alamat') || '-',
          bb: bb,
          tb: tb,
          imt: imtVal,
          sistol: parseInt(getVal('TD SISTOL', 'TD SISTOLIK', 'SISTOL', 'Sistol')) || 120,
          diastol: parseInt(getVal('TD DIASTOL', 'TD DIASTOLIK', 'DIASTOL', 'Diastol')) || 80,
          gula: getVal('GULA DARAH', 'Gula Darah', 'Gula') || '100',
          kolesterol: getVal('KOLESTEROL', 'Kolesterol') || '180',
          keterangan: keterangan,
          is_divided: true,
          assigned_to: petugasName,
          entry_status: 'belum'
        };

        parsedSimpusAdminRecords.push(record);
        groupedSummary[petugasName] = (groupedSummary[petugasName] || 0) + 1;
      });

      window.__lastSimpusAdminImportSkippedNik = skippedInvalidNik;

      if (parsedSimpusAdminRecords.length === 0) {
        if (skippedInvalidNik > 0) {
          const sampleList = sampleInvalidNik.map(s => `• <b>${s.nama}</b>: NIK "${s.nik}" (${s.len} digit)`).join('<br>');
          Swal.fire({
            icon: 'warning',
            title: 'Semua Data Ditolak (NIK Tidak 16 Digit)',
            html: `<div style="font-size:13px; text-align:left; line-height:1.6;">
                    Sebanyak <b>${skippedInvalidNik} baris data SIMPUS</b> ditolak karena NIK <b>tidak persis 16 digit</b> (kurang atau lebih).<br><br>
                    <b>Contoh data yang ditolak:</b><br>
                    <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:6px; padding:8px 12px; margin-top:6px; font-size:12px; color:#9f1239;">
                      ${sampleList}
                    </div><br>
                    Data SIMPUS tidak dapat masuk jika NIK bukan 16 digit angka valid. Silakan periksa kembali file Excel.
                  </div>`,
            confirmButtonColor: '#ef4444'
          });
        } else {
          showToast('Tidak ada data SIMPUS valid terdeteksi!', 'warning');
        }
        if (btnExec) btnExec.disabled = true;
        return;
      }

      const officerCount = Object.keys(groupedSummary).length;

      let badgesHtml = Object.entries(groupedSummary).map(([pName, count]) => {
        return `<div style="background:#f3e8ff; border:1px solid #c084fc; padding:8px 14px; border-radius:10px; font-size:12.5px; font-weight:700; color:#6b21a8; display:flex; align-items:center; gap:8px;">
                  <i class="bi bi-person-badge-fill" style="color:#7c3aed;"></i>
                  <span>${pName}: <strong style="color:#5b21b6; font-size:13.5px;">${count} Data Pasien</strong></span>
                </div>`;
      }).join('');

      let previewRowsHtml = parsedSimpusAdminRecords.slice(0, 8).map((r, i) => {
        return `<tr>
                  <td style="text-align:center;">${i + 1}</td>
                  <td><strong>${r.nama}</strong><br><span style="font-size:11px; color:#64748b;">NIK: ${r.nik}</span></td>
                  <td><span class="badge badge-amber">${r.keterangan}</span></td>
                  <td><span class="badge badge-purple" style="font-weight:700;"><i class="bi bi-person-fill"></i> ${r.assigned_to}</span></td>
                  <td><span style="font-size:12px; color:#16a34a; font-weight:700;">Sudah Di-Bagi</span></td>
                </tr>`;
      }).join('');

      let skippedNoticeHtml = '';
      if (skippedInvalidNik > 0) {
        skippedNoticeHtml = `
          <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:10px; padding:10px 14px; margin-bottom:12px; font-size:12.5px; color:#9f1239; font-weight:600; display:flex; align-items:center; gap:8px;">
            <i class="bi bi-shield-fill-x" style="font-size:16px; color:#e11d48;"></i>
            <span><strong>${skippedInvalidNik} data SIMPUS dilewati / ditolak</strong> karena NIK tidak persis 16 digit. Hanya data dengan NIK 16 digit yang akan di-import.</span>
          </div>`;
      }

      previewArea.innerHTML = `
        <div style="background: #ffffff; border: 1.5px solid #d8b4fe; border-radius: 14px; padding: 16px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.08);">
          
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid #e9d5ff;">
            <div>
              <div style="font-weight:800; font-size:14px; color:#5b21b6;">
                <i class="bi bi-eye-fill"></i> PREVIEW SIMPUS MULTI-PETUGAS (SUDAH DI-BAGI)
              </div>
              <div style="font-size:12px; color:#6b21a8; margin-top:2px;">
                File: <strong>${file.name}</strong> - Total <strong>${parsedSimpusAdminRecords.length} Data Pasien Valid (NIK 16 Digit)</strong> untuk <strong>${officerCount} Petugas</strong>
              </div>
            </div>
            <span class="badge badge-emerald" style="font-size:12px; padding:6px 12px;"><i class="bi bi-check-circle-fill"></i> Ready Sync D1</span>
          </div>

          ${skippedNoticeHtml}

          <div style="margin-bottom:14px;">
            <div style="font-size:12px; font-weight:700; color:#4c1d95; margin-bottom:8px;">
              <i class="bi bi-people-fill"></i> Pembagian Data SIMPUS Per-Petugas Terdeteksi:
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${badgesHtml}
            </div>
          </div>

          <div style="font-size:12px; font-weight:700; color:#4c1d95; margin-bottom:6px;">
            <i class="bi bi-table"></i> Sample Preview Data Pasien (Top ${Math.min(8, parsedSimpusAdminRecords.length)} dari ${parsedSimpusAdminRecords.length}):
          </div>

          <div class="table-responsive" style="max-height:220px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:10px;">
            <table class="custom-table" style="font-size:12px;">
              <thead>
                <tr>
                  <th style="width:40px; text-align:center;">No</th>
                  <th>Nama Pasien & NIK</th>
                  <th>Kategori</th>
                  <th>Petugas Entry (Target)</th>
                  <th>Status Bagi</th>
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
      console.error('SIMPUS Admin import preview error:', err);
      showToast('Gagal membaca file Excel: ' + err.message, 'error');
    }
  };

  reader.readAsArrayBuffer(file);
}

async function executeSimpusAdminXLSXImport() {
  if (parsedSimpusAdminRecords.length === 0) {
    showToast('Tidak ada data SIMPUS yang siap di-import!', 'warning');
    return;
  }

  closeSimpusAdminMultiImportModal();

  const officerStats = {};
  parsedSimpusAdminRecords.forEach(r => {
    officerStats[r.assigned_to] = (officerStats[r.assigned_to] || 0) + 1;
  });

  Swal.fire({
    title: `<i class="bi bi-cloud-upload-fill" style="color:#7c3aed;"></i> Upload Batch SIMPUS Multi-Petugas ke Cloud D1...`,
    html: `<div style="margin:10px 0;">
            <div id="simpusAdminProgressBar" style="width:100%;height:20px;background:#e2e8f0;border-radius:10px;overflow:hidden;">
              <div id="simpusAdminProgressFill" style="width:0%;height:100%;background:linear-gradient(90deg,#7c3aed,#9333ea);border-radius:10px;transition:width 0.3s;"></div>
            </div>
            <div id="simpusAdminProgressText" style="margin-top:8px;font-size:13px;color:#475569;font-weight:600;">0 / ${parsedSimpusAdminRecords.length} data pasien</div>
          </div>`,
    allowOutsideClick: false,
    showConfirmButton: false
  });

  const chunkSize = 20;
  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < parsedSimpusAdminRecords.length; i += chunkSize) {
    const chunk = parsedSimpusAdminRecords.slice(i, i + chunkSize);
    try {
      const res = await fetch('/api/simpus?tab=sudah_bagi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk)
      });
      if (res.ok) { uploaded += chunk.length; } else { failed += chunk.length; }
    } catch (err) {
      failed += chunk.length;
    }

    const pct = Math.round(((uploaded + failed) / parsedSimpusAdminRecords.length) * 100);
    const fillEl = document.getElementById('simpusAdminProgressFill');
    const txtEl = document.getElementById('simpusAdminProgressText');
    if (fillEl) fillEl.style.width = pct + '%';
    if (txtEl) txtEl.textContent = `${uploaded + failed} / ${parsedSimpusAdminRecords.length} data pasien (${pct}%)`;
  }

  simpusRecords = [...parsedSimpusAdminRecords, ...simpusRecords];
  safeLocalStorageSet('ckg_simpus_records', JSON.stringify(simpusRecords));
  if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_simpus_records', simpusRecords);

  renderSimpusView();
  updateCloudSyncPill(true, `D1 Online (${simpusRecords.length} SIMPUS)`);

  let breakdownList = Object.entries(officerStats).map(([pName, cnt]) => {
    return `<li style="margin-bottom:4px;"><strong>${pName}</strong>: <span style="color:#059669; font-weight:700;">${cnt} Data Pasien</span></li>`;
  }).join('');

  let skippedNotice = '';
  const skippedCount = window.__lastSimpusAdminImportSkippedNik || 0;
  if (skippedCount > 0) {
    skippedNotice = `<div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:10px 12px; margin-top:10px; font-size:12.5px; color:#92400e;">
      ⚠️ <strong>${skippedCount} data SIMPUS dilewati / ditolak</strong> karena NIK tidak persis 16 digit.
    </div>`;
  }

  Swal.fire({
    icon: failed === 0 ? 'success' : 'warning',
    title: failed === 0 ? 'Import SIMPUS Multi-Petugas Berhasil!' : 'Import Sebagian Berhasil',
    html: `<div style="font-size:13.5px; text-align:left; line-height:1.6;">
            Total <strong>${uploaded} Data Pasien SIMPUS</strong> telah <strong>ter-upload & tersinkronisasi ke Cloudflare D1 Database (simpus_records)</strong>!<br><br>
            <div style="background:#f5f3ff; border:1px solid #ddd6fe; border-radius:10px; padding:12px;">
              <strong style="color:#5b21b6; font-size:13px;"><i class="bi bi-people-fill"></i> Rekapitulasi Alokasi Per-Petugas (Data Sudah Di-Bagi):</strong>
              <ul style="margin:6px 0 0 18px; padding:0; font-size:12.5px;">
                ${breakdownList}
              </ul>
            </div>
            ${skippedNotice}
          </div>`,
    confirmButtonColor: '#7c3aed'
  });
}
