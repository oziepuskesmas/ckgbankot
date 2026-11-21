/**
 * APLIKASI INFO CKG - PUSKESMAS BANJARAN KOTA
 * Module: ENCO Bot Integration, Bot Queue, Automated Screening Records & Reports
 */

/* ==========================================================================
   🤖 FITUR INTEGRASI ANTREAN BOT ENCO (CKG UMUM & CKG SEKOLAH)
   ========================================================================== */

let botQueueData = {
  UMUM: [],
  SEKOLAH: [],
  summary: {}
};

// Ambil jumlah antrean untuk badge di header view (sesuai akun yang sedang login)
async function fetchBotQueueCounts() {
  try {
    const petugas = sessionStorage.getItem('ckg_user_name') || '';
    const url = petugas ? `/api/enco/queue?petugas=${encodeURIComponent(petugas)}` : '/api/enco/queue';
    const res = await fetch(url);
    if (!res.ok) return;
    const json = await res.json();
    if (json.success && json.summary) {
      const bUmum = document.getElementById('badgeQueueCountUmum');
      const bSekolah = document.getElementById('badgeQueueCountSekolah');
      if (bUmum) bUmum.textContent = json.summary.total_umum || 0;
      if (bSekolah) bSekolah.textContent = json.summary.total_sekolah || 0;
      botQueueData.summary = json.summary;
    }
  } catch (err) {
    console.warn('Gagal memuat count antrean bot:', err);
  }
}

// Toggle Pilih Semua Checkbox CKG Gratis
function toggleSelectAllCkgGratis(masterEl) {
  const isChecked = !!masterEl.checked;
  const master1 = document.getElementById('chkCkgGratisAll');
  const master2 = document.getElementById('chkCkgGratisAllMobile');
  if (master1 && master1 !== masterEl) master1.checked = isChecked;
  if (master2 && master2 !== masterEl) master2.checked = isChecked;

  document.querySelectorAll('.chk-ckg-gratis-row').forEach(chk => {
    chk.checked = isChecked;
  });
  if (typeof updateCkgSelectedCount === 'function') {
    updateCkgSelectedCount();
  }
}

// Kirim pasien terpilih ke antrean Bot ENCO (CKG Umum)
async function sendSelectedCkgGratisToBotQueue() {
  const checkedBoxes = Array.from(document.querySelectorAll('.chk-ckg-gratis-row:checked'));
  if (checkedBoxes.length === 0) {
    Swal.fire({
      icon: 'info',
      title: 'Belum Ada Pasien Dipilih',
      text: 'Silakan centang satu atau beberapa pasien pada kotak centang tabel terlebih dahulu.'
    });
    return;
  }

  const selectedIds = checkedBoxes.map(c => c.value);
  const selectedRecords = ckgGratisRecords.filter(r => selectedIds.includes(r.id));

  const result = await Swal.fire({
    title: '<div style="font-size: 17px; font-weight: 800; color: #0284c7; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="bi bi-robot" style="font-size: 24px;"></i> Masukkan ke Antrean Bot ENCO</div>',
    html: `
      <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.5;">
        Anda akan memasukkan <strong>${selectedRecords.length} pasien</strong> ke dalam antrean pengerjaan <strong>Bot ENCO (CKG Umum)</strong>.<br><br>
        Setelah dimasukkan, Anda dapat langsung mengklik tombol <em>"Ambil Data dari CKG Bankot"</em> pada ekstensi Chrome Bot ENCO untuk memproses pendaftaran & pelayanan secara otomatis tanpa perlu unduh/unggah file Excel manual.
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: `<i class="bi bi-cloud-arrow-up-fill"></i> Ya, Masukkan (${selectedRecords.length} Pasien)`,
    cancelButtonText: 'Batal',
    confirmButtonColor: '#0284c7',
    cancelButtonColor: '#64748b'
  });

  if (!result.isConfirmed) return;

  try {
    showLoadingOverlay('Memproses Antrean Bot...', `Mengirim ${selectedRecords.length} data pasien ke antrean Cloud D1...`);
    const petugas = sessionStorage.getItem('ckg_user_name') || 'Petugas';
    const res = await fetch('/api/enco/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: selectedRecords,
        jenis: 'UMUM',
        petugas: petugas
      })
    });
    hideLoadingOverlay();
    const json = await res.json();
    if (json.success) {
      // Tandai records secara lokal
      selectedRecords.forEach(r => {
        r.in_bot_queue = 1;
        r.bot_queue_date = new Date().toISOString();
      });
      saveCkgGratisRecordsToStorage();
      renderCkgGratisTable();
      fetchBotQueueCounts();

      Swal.fire({
        icon: 'success',
        title: 'Berhasil Masuk Antrean Bot!',
        html: `
          <div style="font-size: 13.5px; color: #334155; line-height: 1.5;">
            <strong>${json.count || selectedRecords.length} data pasien</strong> berhasil ditambahkan ke antrean <strong>CKG Umum</strong>.<br><br>
            Buka ekstensi <strong>Bot ENCO</strong>, pilih menu Pendaftaran atau Pelayanan, lalu klik <strong>"Ambil Data dari CKG Bankot"</strong> untuk mulai mengerjakan.
          </div>
        `,
        confirmButtonColor: '#059669'
      });
    } else {
      throw new Error(json.error || 'Gagal menyimpan antrean');
    }
  } catch (err) {
    hideLoadingOverlay();
    Swal.fire('Gagal Menambahkan Antrean', err.message, 'error');
  }
}

// Kirim single pasien CKG Gratis ke antrean Bot
async function sendSingleCkgGratisToBotQueue(id) {
  const r = ckgGratisRecords.find(item => item.id === id);
  if (!r) return;

  try {
    const petugas = sessionStorage.getItem('ckg_user_name') || 'Petugas';
    const res = await fetch('/api/enco/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [r],
        jenis: 'UMUM',
        petugas: petugas
      })
    });
    const json = await res.json();
    if (json.success) {
      r.in_bot_queue = 1;
      r.bot_queue_date = new Date().toISOString();
      saveCkgGratisRecordsToStorage();
      renderCkgGratisTable();
      fetchBotQueueCounts();
      showToast(`Pasien "${r.nama || r.nik}" berhasil dimasukkan ke antrean Bot ENCO!`, 'success');
    } else {
      throw new Error(json.error || 'Gagal menyimpan antrean');
    }
  } catch (err) {
    showToast('Gagal: ' + err.message, 'error');
  }
}

// Kirim seluruh siswa di kelas/sekolah yang sedang tampil ke antrean Bot ENCO (CKG Sekolah)
async function sendCurrentSekolahToBotQueue() {
  const chosenSekolah = (document.getElementById('filterSelectSekolah')?.value || '').trim().toUpperCase();
  const chosenKelas = (document.getElementById('filterSelectKelas')?.value || '').trim().toUpperCase();

  if (!chosenSekolah) {
    Swal.fire('Pilih Sekolah', 'Silakan tentukan Sekolah terlebih dahulu.', 'warning');
    return;
  }

  let dataset = sekolahRecords.filter(r => (r.sekolah || '').toUpperCase() === chosenSekolah);
  if (chosenKelas) {
    dataset = dataset.filter(r => (r.kelas || '').toUpperCase() === chosenKelas);
  }

  if (dataset.length === 0) {
    Swal.fire('Data Kosong', 'Tidak ada data siswa yang cocok dengan pilihan sekolah dan kelas ini.', 'warning');
    return;
  }

  const result = await Swal.fire({
    title: '<div style="font-size: 17px; font-weight: 800; color: #4f46e5; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="bi bi-robot" style="font-size: 24px;"></i> Masukkan Kelas ke Antrean Bot</div>',
    html: `
      <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.5;">
        Kirim <strong>${dataset.length} siswa</strong> (${chosenSekolah} ${chosenKelas ? '- ' + chosenKelas : ''}) ke antrean <strong>Bot ENCO (CKG Sekolah)</strong>?<br><br>
        Data siswa siap diambil langsung di ekstensi Bot ENCO (menu Pendaftaran Anak Sekolah & Pelayanan Siswa).
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: `<i class="bi bi-cloud-arrow-up-fill"></i> Ya, Kirim (${dataset.length} Siswa)`,
    cancelButtonText: 'Batal',
    confirmButtonColor: '#4f46e5',
    cancelButtonColor: '#64748b'
  });

  if (!result.isConfirmed) return;

  try {
    showLoadingOverlay('Memproses Antrean Bot...', `Mengirim ${dataset.length} data siswa ke antrean Cloud D1...`);
    const petugas = sessionStorage.getItem('ckg_user_name') || 'Petugas';
    const res = await fetch('/api/enco/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: dataset,
        jenis: 'SEKOLAH',
        petugas: petugas
      })
    });
    hideLoadingOverlay();
    const json = await res.json();
    if (json.success) {
      fetchBotQueueCounts();
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Masuk Antrean Bot Sekolah!',
        html: `
          <div style="font-size: 13.5px; color: #334155; line-height: 1.5;">
            <strong>${json.count || dataset.length} siswa</strong> berhasil ditambahkan ke antrean <strong>CKG Sekolah</strong>.<br><br>
            Buka ekstensi <strong>Bot ENCO</strong>, lalu klik <strong>"Ambil Data dari CKG Bankot" ➔ Pilih CKG Sekolah</strong>.
          </div>
        `,
        confirmButtonColor: '#4f46e5'
      });
    } else {
      throw new Error(json.error || 'Gagal menyimpan antrean');
    }
  } catch (err) {
    hideLoadingOverlay();
    Swal.fire('Gagal Menambahkan Antrean', err.message, 'error');
  }
}

// Kirim single siswa sekolah ke antrean Bot
async function sendSingleSekolahToBotQueue(id) {
  const r = sekolahRecords.find(item => item.id === id);
  if (!r) return;

  try {
    const petugas = sessionStorage.getItem('ckg_user_name') || 'Petugas';
    const res = await fetch('/api/enco/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [r],
        jenis: 'SEKOLAH',
        petugas: petugas
      })
    });
    const json = await res.json();
    if (json.success) {
      fetchBotQueueCounts();
      showToast(`Siswa "${r.nama || r.nik}" berhasil dimasukkan ke antrean Bot Sekolah!`, 'success');
    } else {
      throw new Error(json.error || 'Gagal menyimpan antrean');
    }
  } catch (err) {
    showToast('Gagal: ' + err.message, 'error');
  }
}

// Buka Modal Kelola Antrean Bot (Popup Lengkap - Khusus Akun Petugas yang Login)
async function openBotQueueModal(jenis = 'UMUM') {
  showLoadingOverlay('Memuat Antrean Bot...', 'Mengambil data antrean dari Cloud Database...');
  let queueList = [];
  let summary = {};
  const petugas = sessionStorage.getItem('ckg_user_name') || '';

  try {
    const url = petugas
      ? `/api/enco/queue?jenis=${jenis}&petugas=${encodeURIComponent(petugas)}`
      : `/api/enco/queue?jenis=${jenis}`;
    const res = await fetch(url);
    const json = await res.json();
    hideLoadingOverlay();
    if (json.success) {
      queueList = json.data || [];
      summary = json.summary || {};
    }
  } catch (err) {
    hideLoadingOverlay();
    Swal.fire('Gagal Memuat Antrean', err.message, 'error');
    return;
  }

  const isUmum = (jenis === 'UMUM');
  const titleText = isUmum ? 'Antrean Bot ENCO - CKG Umum' : 'Antrean Bot ENCO - CKG Sekolah';
  const themeColor = isUmum ? '#0284c7' : '#4f46e5';

  const rowsHtml = queueList.length > 0 ? queueList.map((q, idx) => {
    const regBadge = (q.status_pendaftaran === 'berhasil' || q.status_pendaftaran === 'Sudah Terdaftar')
      ? `<span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 10.5px;"><i class="bi bi-check-circle-fill"></i> Terdaftar</span>`
      : (q.status_pendaftaran === 'gagal')
        ? `<span class="badge" style="background: #fee2e2; color: #dc2626; font-weight: 700; font-size: 10.5px;"><i class="bi bi-x-circle-fill"></i> Gagal</span>`
        : `<span class="badge" style="background: #fef3c7; color: #b45309; font-weight: 700; font-size: 10.5px;"><i class="bi bi-hourglass-split"></i> Antre</span>`;

    const isPernah = q.status_pelayanan === 'Pernah Input' ||
      q.status_pelayanan === 'already-screened' ||
      (q.keterangan && q.keterangan.toLowerCase().includes('pernah'));

    const isSelesai = q.status_pelayanan === 'selesai' || q.status_pelayanan === 'Selesai Pelayanan';

    const pelBadge = isPernah
      ? `<span class="badge" style="background: #f3e8ff; color: #7e22ce; border: 1.5px solid #d8b4fe; font-weight: 800; font-size: 10.5px; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;" title="Sudah pernah di-input skrining sebelumnya di ASIK"><i class="bi bi-clock-history"></i> Pernah Input</span>`
      : isSelesai
        ? `<span class="badge" style="background: #ecfdf5; color: #059669; border: 1.5px solid #a7f3d0; font-weight: 700; font-size: 10.5px; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;"><i class="bi bi-check-circle-fill"></i> Selesai</span>`
        : `<span class="badge" style="background: #f1f5f9; color: #64748b; font-weight: 700; font-size: 10.5px; padding: 3px 8px; border-radius: 6px;"><i class="bi bi-hourglass"></i> Belum</span>`;

    const tiketStr = q.no_tiket ? `<span style="font-family: monospace; font-size: 11px; color: #0284c7; font-weight: 700;">${escapeHtml(q.no_tiket)}</span>` : '-';
    const detailExtra = !isUmum && q.data ? `<div style="font-size: 11px; color: #64748b;">${escapeHtml(q.data.sekolah || '')} ${q.data.kelas ? '(' + escapeHtml(q.data.kelas) + ')' : ''}</div>` : '';

    return `
      <tr>
        <td style="text-align: center; font-weight: 700; color: #64748b; vertical-align: middle;">${idx + 1}</td>
        <td style="vertical-align: middle;">
          <div style="font-weight: 800; font-size: 13px; color: #1e293b; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span>${escapeHtml(q.nama)}</span>
            ${isPernah ? `<span class="badge" style="background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; font-size: 9.5px; font-weight: 800; padding: 1px 6px; border-radius: 4px;"><i class="bi bi-clock-history"></i> Pernah Input</span>` : ''}
          </div>
          <div style="font-family: monospace; font-size: 11px; color: #475569;">${escapeHtml(q.nik)}</div>
          ${detailExtra}
        </td>
        <td style="text-align: center; vertical-align: middle;">${regBadge}</td>
        <td style="text-align: center; vertical-align: middle;">${pelBadge}</td>
        <td style="text-align: center; vertical-align: middle;">${tiketStr}</td>
        <td style="text-align: center; vertical-align: middle;">
          <button type="button" class="btn btn-danger btn-sm" onclick="removeBotQueueItem('${q.id}', '${jenis}')" title="Hapus dari Antrean" style="padding: 3px 8px; font-size: 10.5px; border-radius: 6px;">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('') : `
    <tr>
      <td colspan="6" style="text-align: center; padding: 36px 16px; color: #94a3b8;">
        <i class="bi bi-robot" style="font-size: 32px; display: block; margin-bottom: 8px; color: #cbd5e1;"></i>
        <div style="font-weight: 700; font-size: 13.5px; color: #64748b;">Antrean Kosong</div>
        <div style="font-size: 12px; margin-top: 4px;">Belum ada data ${isUmum ? 'CKG Umum' : 'CKG Sekolah'} milik akun "${escapeHtml(petugas || 'Anda')}" di antrean Bot.</div>
      </td>
    </tr>
  `;

  Swal.fire({
    title: `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;">
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 17px; font-weight: 800; color: ${themeColor};">
        <i class="bi bi-robot" style="font-size: 24px;"></i> ${titleText}
      </div>
      <div style="font-size: 11.5px; font-weight: 700; color: #0369a1; background: #e0f2fe; border: 1px solid #bae6fd; padding: 2px 10px; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px;">
        <i class="bi bi-person-circle"></i> Akun: ${escapeHtml(petugas || 'Semua Akun')}
      </div>
    </div>`,
    width: '850px',
    html: `
      <div style="text-align: left; font-family: 'Plus Jakarta Sans', sans-serif;">
        <!-- KPI Metrics Header (5 Kategori Lengkap) -->
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
            <div style="font-size: 10px; color: #64748b; font-weight: 700;">TOTAL ANTREAN</div>
            <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${queueList.length}</div>
          </div>
          <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 8px 10px; text-align: center;">
            <div style="font-size: 10px; color: #854d0e; font-weight: 700;">SIAP / ANTRE</div>
            <div style="font-size: 18px; font-weight: 800; color: #ca8a04;">${queueList.filter(q => (q.status_pendaftaran === 'antre' || q.status_pelayanan === 'antre') && q.status_pelayanan !== 'Pernah Input' && q.status_pelayanan !== 'already-screened' && q.status_pelayanan !== 'selesai' && q.status_pelayanan !== 'Selesai Pelayanan').length}</div>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 10px; text-align: center;">
            <div style="font-size: 10px; color: #166534; font-weight: 700;">TERDAFTAR</div>
            <div style="font-size: 18px; font-weight: 800; color: #16a34a;">${queueList.filter(q => q.status_pendaftaran === 'berhasil' || q.status_pendaftaran === 'Sudah Terdaftar').length}</div>
          </div>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 10px; text-align: center;">
            <div style="font-size: 10px; color: #1e40af; font-weight: 700;">SELESAI LAYANAN</div>
            <div style="font-size: 18px; font-weight: 800; color: #2563eb;">${queueList.filter(q => q.status_pelayanan === 'selesai' || q.status_pelayanan === 'Selesai Pelayanan').length}</div>
          </div>
          <div style="background: #f3e8ff; border: 1px solid #d8b4fe; border-radius: 8px; padding: 8px 10px; text-align: center;">
            <div style="font-size: 10px; color: #7e22ce; font-weight: 700;">PERNAH INPUT</div>
            <div style="font-size: 18px; font-weight: 800; color: #9333ea;">${queueList.filter(q => q.status_pelayanan === 'Pernah Input' || q.status_pelayanan === 'already-screened' || (q.keterangan && q.keterangan.toLowerCase().includes('pernah'))).length}</div>
          </div>
        </div>

        <!-- Toolbar Aksi Antrean -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
          <div style="font-size: 12px; color: #475569; font-weight: 600;">
            <i class="bi bi-shield-check" style="color: #059669;"></i> Antrean khusus akun <strong>${escapeHtml(petugas || 'Anda')}</strong>. Hanya dapat diambil oleh akun ini di Bot ENCO.
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="clearCompletedBotQueue('${jenis}')" style="font-size: 11px; padding: 5px 9px;">
              <i class="bi bi-check2-all"></i> Bersihkan yang Selesai
            </button>
            <button type="button" class="btn btn-sm btn-danger" onclick="clearAllBotQueue('${jenis}')" style="font-size: 11px; padding: 5px 9px;">
              <i class="bi bi-trash"></i> Kosongkan Semua
            </button>
          </div>
        </div>

        <!-- Table Antrean -->
        <div style="max-height: 380px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <table class="custom-table" style="font-size: 12px; width: 100%; margin: 0;">
            <thead>
              <tr style="position: sticky; top: 0; background: #f8fafc; z-index: 2;">
                <th style="width: 40px; text-align: center;">NO</th>
                <th>NAMA & IDENTITAS</th>
                <th style="width: 100px; text-align: center;">PENDAFTARAN</th>
                <th style="width: 100px; text-align: center;">PELAYANAN</th>
                <th style="width: 110px; text-align: center;">NO TIKET</th>
                <th style="width: 60px; text-align: center;">AKSI</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `,
    showConfirmButton: true,
    confirmButtonText: 'Tutup',
    confirmButtonColor: '#64748b'
  });
}

// Hapus satu item dari antrean Bot
async function removeBotQueueItem(id, jenis) {
  try {
    const res = await fetch(`/api/enco/queue/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    });
    const json = await res.json();
    if (json.success) {
      showToast('Item berhasil dihapus dari antrean Bot.', 'info');
      fetchBotQueueCounts();
      openBotQueueModal(jenis);
    }
  } catch (err) {
    showToast('Gagal menghapus item: ' + err.message, 'error');
  }
}

// Bersihkan antrean yang statusnya sudah selesai (khusus akun aktif)
async function clearCompletedBotQueue(jenis) {
  try {
    const petugas = sessionStorage.getItem('ckg_user_name') || '';
    const res = await fetch(`/api/enco/queue/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear_completed: true, jenis: jenis, petugas: petugas })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Berhasil membersihkan ${json.deleted || 0} data yang sudah selesai.`, 'success');
      fetchBotQueueCounts();
      openBotQueueModal(jenis);
    }
  } catch (err) {
    showToast('Gagal membersihkan: ' + err.message, 'error');
  }
}

// Kosongkan seluruh antrean untuk jenis tertentu (khusus akun aktif)
async function clearAllBotQueue(jenis) {
  const isUmum = (jenis === 'UMUM');
  const petugas = sessionStorage.getItem('ckg_user_name') || '';
  const confirmRes = await Swal.fire({
    title: 'Kosongkan Seluruh Antrean Akun Ini?',
    text: `Seluruh data antrean ${isUmum ? 'CKG Umum' : 'CKG Sekolah'} milik akun "${petugas || 'Anda'}" akan dihapus dari antrean Bot ENCO. Data asli di rekam medis tetap tersimpan aman.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Kosongkan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b'
  });

  if (!confirmRes.isConfirmed) return;

  try {
    const res = await fetch(`/api/enco/queue/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear_all: true, jenis: jenis, petugas: petugas })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Antrean ${isUmum ? 'CKG Umum' : 'CKG Sekolah'} berhasil dikosongkan.`, 'success');
      fetchBotQueueCounts();
      openBotQueueModal(jenis);
    }
  } catch (err) {
    showToast('Gagal mengosongkan antrean: ' + err.message, 'error');
  }
}


/* ==========================================================================
   🤖 MENU ENCO (ASIK Kemkes Integration & Automation Records)
   ========================================================================== */

let encoState = {
  activeSubTab: 'pasien',
  currentOffset: 0,
  limit: 50,
  totalRecords: 0,
  searchDebounceTimer: null,
  cachedRecords: []
};

function renderEncoView() {
  loadEncoStats();
  populateEncoPetugasFilter();
  if (encoState.activeSubTab === 'pasien') {
    loadEncoRecords(0);
  } else if (encoState.activeSubTab === 'reports') {
    loadEncoReportsWeb();
  } else {
    loadEncoLogs();
  }
}

function switchEncoSubTab(tab) {
  encoState.activeSubTab = tab;
  const btnPasien = document.getElementById('btnEncoTabPasien');
  const btnLogs = document.getElementById('btnEncoTabLogs');
  const btnReports = document.getElementById('btnEncoTabReports');
  const subTabPasien = document.getElementById('encoSubTabPasien');
  const subTabLogs = document.getElementById('encoSubTabLogs');
  const subTabReports = document.getElementById('encoSubTabReports');

  if (btnPasien) btnPasien.className = tab === 'pasien' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
  if (btnLogs) btnLogs.className = tab === 'logs' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
  if (btnReports) btnReports.className = tab === 'reports' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';

  if (subTabPasien) subTabPasien.style.display = tab === 'pasien' ? 'block' : 'none';
  if (subTabLogs) subTabLogs.style.display = tab === 'logs' ? 'block' : 'none';
  if (subTabReports) subTabReports.style.display = tab === 'reports' ? 'block' : 'none';

  if (tab === 'pasien') {
    loadEncoRecords(encoState.currentOffset);
  } else if (tab === 'logs') {
    loadEncoLogs();
  } else if (tab === 'reports') {
    loadEncoReportsWeb();
  }
}

async function loadEncoStats() {
  try {
    const res = await fetch('/api/enco/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      const s = data.stats;
      const elTotal = document.getElementById('statEncoTotal');
      const elTerdaftar = document.getElementById('statEncoTerdaftar');
      const elLayanan = document.getElementById('statEncoSelesaiPelayanan');
      const elLogs = document.getElementById('statEncoTotalLogs');

      if (elTotal) elTotal.textContent = (s.total_pasien || 0).toLocaleString('id-ID');
      if (elTerdaftar) elTerdaftar.textContent = (s.total_terdaftar || 0).toLocaleString('id-ID');
      if (elLayanan) elLayanan.textContent = (s.total_selesai_layanan || 0).toLocaleString('id-ID');
      if (elLogs) elLogs.textContent = (s.total_logs || 0).toLocaleString('id-ID');
    }
  } catch (err) {
    console.error('Failed to load ENCO stats:', err);
  }
}

function populateEncoPetugasFilter() {
  const select = document.getElementById('filterEncoPetugas');
  if (!select) return;
  const currentVal = select.value;

  select.innerHTML = '<option value="">-- Semua Petugas --</option>';
  if (Array.isArray(usersDb) && usersDb.length > 0) {
    usersDb.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.nama_user;
      opt.textContent = u.nama_user;
      if (currentVal && u.nama_user === currentVal) opt.selected = true;
      select.appendChild(opt);
    });
  }
}

function debounceEncoSearch() {
  clearTimeout(encoState.searchDebounceTimer);
  encoState.searchDebounceTimer = setTimeout(() => {
    loadEncoRecords(0);
  }, 350);
}

function resetEncoFilters() {
  const sInput = document.getElementById('searchEncoPasien');
  const sDaftar = document.getElementById('filterEncoStatusDaftar');
  const sLayanan = document.getElementById('filterEncoStatusLayanan');
  const sPetugas = document.getElementById('filterEncoPetugas');
  const sTanggal = document.getElementById('filterEncoTanggal');

  if (sInput) sInput.value = '';
  if (sDaftar) sDaftar.value = '';
  if (sLayanan) sLayanan.value = '';
  if (sPetugas) sPetugas.value = '';
  if (sTanggal) sTanggal.value = '';

  loadEncoRecords(0);
}

async function loadEncoRecords(offset = 0) {
  encoState.currentOffset = offset;
  const tbody = document.getElementById('tableBodyEncoPasien');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 24px; color: var(--text-muted);"><i class="bi bi-arrow-repeat spin"></i> Memuat data pasien ENCO...</td></tr>`;
  }

  const sInput = (document.getElementById('searchEncoPasien')?.value || '').trim();
  const sDaftar = document.getElementById('filterEncoStatusDaftar')?.value || '';
  const sLayanan = document.getElementById('filterEncoStatusLayanan')?.value || '';
  const sPetugas = document.getElementById('filterEncoPetugas')?.value || '';
  const sTanggal = document.getElementById('filterEncoTanggal')?.value || '';

  const params = new URLSearchParams({
    limit: String(encoState.limit),
    offset: String(offset)
  });
  if (sInput) params.append('search', sInput);
  if (sDaftar) params.append('status_pendaftaran', sDaftar);
  if (sLayanan) params.append('status_pelayanan', sLayanan);
  if (sPetugas) params.append('petugas', sPetugas);
  if (sTanggal) params.append('tanggal', sTanggal);

  try {
    const res = await fetch(`/api/enco/records?${params.toString()}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gagal mengambil data');

    encoState.totalRecords = data.total || 0;
    encoState.cachedRecords = data.data || [];
    renderEncoRecordsTable(encoState.cachedRecords, offset);
    updateEncoPagination(offset, data.data.length, data.total);
  } catch (err) {
    console.error('Failed to fetch ENCO records:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 24px; color: #dc2626;"><i class="bi bi-exclamation-triangle"></i> Gagal memuat data: ${err.message}</td></tr>`;
    }
  }
}

function renderEncoRecordsTable(records, offset) {
  const tbody = document.getElementById('tableBodyEncoPasien');
  if (!tbody) return;

  if (!records || records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 32px; color: var(--text-muted);"><i class="bi bi-inbox" style="font-size: 28px; display: block; margin-bottom: 8px;"></i>Belum ada data pasien ENCO yang tercatat.</td></tr>`;
    return;
  }

  // Deduplikasi sisi klien berdasarkan NIK (menghindari duplikasi tampilan)
  const seenNiks = new Set();
  const uniqueRecords = [];
  records.forEach(r => {
    const cleanNik = String(r.nik || '').replace(/\D/g, '').trim() || String(r.nik || '').trim();
    if (!cleanNik || !seenNiks.has(cleanNik)) {
      if (cleanNik) seenNiks.add(cleanNik);
      uniqueRecords.push(r);
    }
  });

  const role = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  const isAdmin = role.includes('admin') || role.includes('koordinator');

  let html = '';
  uniqueRecords.forEach((r, idx) => {
    const no = offset + idx + 1;
    const isTerdaftar = (r.status_pendaftaran || '').toLowerCase().includes('terdaftar');
    const badgeDaftar = isTerdaftar
      ? `<span class="badge" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; font-weight:700;"><i class="bi bi-check2"></i> ${escapeHtml(r.status_pendaftaran || 'Sudah Terdaftar')}</span>`
      : `<span class="badge" style="background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; font-weight:700;"><i class="bi bi-person-check"></i> ${escapeHtml(r.status_pendaftaran || 'Berhasil')}</span>`;

    const isSelesaiLayanan = (r.status_pelayanan || '').toLowerCase() === 'selesai pelayanan';
    const badgeLayanan = isSelesaiLayanan
      ? `<span class="badge" style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; font-weight:700;"><i class="bi bi-patch-check-fill"></i> Selesai Layanan</span>`
      : `<span class="badge" style="background:#f8fafc; color:#64748b; border:1px solid #e2e8f0;"><i class="bi bi-clock"></i> Belum Pelayanan</span>`;

    const tglEntry = r.tanggal_daftar || (r.created_at ? r.created_at.split('T')[0] : '-');
    const noTiket = r.no_tiket || '-';
    const domisiliParts = [r.alamat, r.kelurahan, r.kecamatan, r.kab_kota].filter(Boolean);
    const domisiliStr = domisiliParts.length > 0 ? domisiliParts.join(', ') : '-';

    html += `
      <tr>
        <td style="text-align: center; font-weight: 700; color: var(--text-muted);">${no}</td>
        <td style="font-size: 12.5px; white-space: nowrap;">${escapeHtml(tglEntry)}</td>
        <td style="font-family: monospace; font-weight: 700; color: var(--primary); font-size: 13px;">${escapeHtml(r.nik)}</td>
        <td style="font-weight: 700; color: var(--text-color, #0f172a);">${escapeHtml(r.nama)}</td>
        <td style="font-size: 12.5px;">${escapeHtml(r.tanggal_lahir || '-')}${r.jenis_kelamin ? ` (${escapeHtml(r.jenis_kelamin)})` : ''}</td>
        <td style="font-size: 12px; color: #475569; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(domisiliStr)}">${escapeHtml(domisiliStr)}</td>
        <td>
          <span style="font-family: monospace; font-weight: 800; background: rgba(37,99,235,0.08); padding: 3px 8px; border-radius: 6px; color: #1d4ed8; border: 1px solid rgba(37,99,235,0.2);">
            ${escapeHtml(noTiket)}
          </span>
        </td>
        <td style="font-size: 12px; font-weight: 600;">${escapeHtml(r.kategori || 'Umum')}</td>
        <td>${badgeDaftar}</td>
        <td>${badgeLayanan}</td>
        <td style="font-size: 12.5px; font-weight: 600; color: #475569;">${escapeHtml(r.petugas_enco || '-')}</td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 4px; justify-content: center;">
            <button class="btn btn-secondary btn-sm" style="padding: 2px 7px;" onclick="viewEncoPatientDetail('${escapeHtml(r.nik)}')" title="Lihat Detail Pasien">
              <i class="bi bi-eye"></i>
            </button>
            ${isAdmin ? `
              <button class="btn btn-danger btn-sm" style="padding: 2px 7px;" onclick="deleteSingleEncoPatient('${escapeHtml(r.id)}', '${escapeHtml(r.nik)}', '${escapeHtml(r.nama)}')" title="Hapus Data">
                <i class="bi bi-trash"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function updateEncoPagination(offset, fetchedCount, totalCount) {
  const info = document.getElementById('encoPaginationInfo');
  const btnPrev = document.getElementById('btnEncoPrevPage');
  const btnNext = document.getElementById('btnEncoNextPage');

  const start = totalCount === 0 ? 0 : offset + 1;
  const end = offset + fetchedCount;

  if (info) {
    info.textContent = `Menampilkan ${start} - ${end} dari total ${totalCount.toLocaleString('id-ID')} pasien`;
  }
  if (btnPrev) {
    btnPrev.disabled = offset <= 0;
  }
  if (btnNext) {
    btnNext.disabled = end >= totalCount;
  }
}

function prevEncoPage() {
  const newOffset = Math.max(0, encoState.currentOffset - encoState.limit);
  loadEncoRecords(newOffset);
}

function nextEncoPage() {
  if (encoState.currentOffset + encoState.limit < encoState.totalRecords) {
    loadEncoRecords(encoState.currentOffset + encoState.limit);
  }
}

function viewEncoPatientDetail(nik) {
  const patient = encoState.cachedRecords.find(p => p.nik === nik);
  if (!patient) return;

  let rawObj = null;
  if (patient.raw_details) {
    try {
      rawObj = typeof patient.raw_details === 'string' ? JSON.parse(patient.raw_details) : patient.raw_details;
    } catch (_) { }
  }

  const statusNikah = patient.status_pernikahan || rawObj?.statuspernikahan || rawObj?.status_pernikahan || rawObj?.statusnikah || rawObj?.nikah || '-';
  const pekerjaanVal = patient.pekerjaan || rawObj?.pekerjaan || rawObj?.job || '-';

  const detailHtml = `
    <div style="text-align: left; font-size: 13.5px; line-height: 1.7;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="width: 140px; color: #64748b; font-weight: 600;">NIK:</td><td style="font-weight: 700; font-family: monospace;">${escapeHtml(patient.nik)}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Nama Pasien:</td><td style="font-weight: 700;">${escapeHtml(patient.nama)}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Tanggal Lahir:</td><td style="font-weight: 600;">${escapeHtml(patient.tanggal_lahir || '-')}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Jenis Kelamin:</td><td style="font-weight: 600;">${escapeHtml(patient.jenis_kelamin || '-')}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Status Pernikahan:</td><td style="font-weight: 600;">${escapeHtml(statusNikah)}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Pekerjaan:</td><td style="font-weight: 600;">${escapeHtml(pekerjaanVal)}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Alamat Domisili:</td><td style="font-weight: 600;">${escapeHtml(patient.alamat || '-')}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Kelurahan / Desa:</td><td>${escapeHtml(patient.kelurahan || '-')}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Kecamatan:</td><td>${escapeHtml(patient.kecamatan || 'Banjaran')}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Kab / Kota:</td><td>${escapeHtml(patient.kab_kota || 'Kab. Bandung')}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Provinsi:</td><td>${escapeHtml(patient.provinsi || 'Jawa Barat')}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Nomor Tiket ASIK:</td><td style="font-weight: 800; color: #2563eb; font-family: monospace;">${escapeHtml(patient.no_tiket || '-')}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Kategori:</td><td>${escapeHtml(patient.kategori || 'Umum')}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Status Pendaftaran:</td><td><strong style="color: #059669;">${escapeHtml(patient.status_pendaftaran || '-')}</strong></td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Status Pelayanan:</td><td><strong style="color: #2563eb;">${escapeHtml(patient.status_pelayanan || '-')}</strong></td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Petugas ENCO:</td><td>${escapeHtml(patient.petugas_enco || '-')}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Faskes:</td><td>${escapeHtml(patient.faskes || 'Puskesmas Banjaran Kota')}</td></tr>
        <tr><td style="color: #64748b; font-weight: 600;">Tanggal Rekam:</td><td>${escapeHtml(patient.created_at || '-')}</td></tr>
      </table>
    </div>
  `;

  Swal.fire({
    title: `<i class="bi bi-person-vcard-fill" style="color: #2563eb;"></i> Detail Pasien ASIK`,
    html: detailHtml,
    confirmButtonText: 'Tutup',
    confirmButtonColor: '#2563eb',
    width: '540px'
  });
}

async function deleteSingleEncoPatient(id, nik, nama) {
  const result = await Swal.fire({
    title: 'Hapus Rekam Pasien?',
    html: `Apakah Anda yakin ingin menghapus rekam data pasien <strong>${escapeHtml(nama)}</strong> (${escapeHtml(nik)}) dari database ENCO?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`/api/enco/delete?type=pasien&id=${encodeURIComponent(id || nik)}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Data pasien berhasil dihapus', 'success');
      loadEncoRecords(encoState.currentOffset);
      loadEncoStats();
    } else {
      throw new Error(data.error || 'Gagal menghapus');
    }
  } catch (err) {
    Swal.fire('Gagal Menghapus', err.message, 'error');
  }
}

async function confirmDeleteEncoData() {
  const role = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  const isAdmin = role === 'admin' || role.includes('admin');

  if (!isAdmin) {
    Swal.fire({
      icon: 'error',
      title: 'Akses Ditolak',
      text: 'Hanya Administrator yang memiliki hak akses untuk menghapus data ENCO.',
      confirmButtonColor: '#2563eb'
    });
    return;
  }

  const result = await Swal.fire({
    title: 'Hapus Database ENCO?',
    text: 'Pilih data yang ingin Anda bersihkan:',
    icon: 'warning',
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonColor: '#dc2626',
    denyButtonColor: '#7c3aed',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Hapus Semua Pasien',
    denyButtonText: 'Hapus Semua Log Bot',
    cancelButtonText: 'Batal'
  });

  let deleteType = '';
  if (result.isConfirmed) deleteType = 'all_records';
  else if (result.isDenied) deleteType = 'all_logs';
  else return;

  try {
    const res = await fetch(`/api/enco/delete?type=${deleteType}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Data berhasil dibersihkan', 'success');
      loadEncoStats();
      if (deleteType === 'all_records') loadEncoRecords(0);
      else loadEncoLogs();
    } else {
      throw new Error(data.error || 'Gagal menghapus');
    }
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
}

async function deleteSingleEncoLog(id, r2Key, sessionId, petugas) {
  const role = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  const isAdmin = role === 'admin' || role.includes('admin');

  if (!isAdmin) {
    Swal.fire({
      icon: 'error',
      title: 'Akses Ditolak',
      text: 'Hanya Administrator yang memiliki hak akses untuk menghapus log aktivitas bot ENCO.',
      confirmButtonColor: '#2563eb'
    });
    return;
  }

  const result = await Swal.fire({
    title: 'Hapus Log Bot?',
    text: 'Apakah Anda yakin ingin menghapus catatan log aktivitas bot ini dari database dan Cloud R2?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`/api/enco/delete?type=log&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json();

    if (sessionId || r2Key) {
      try {
        await fetch(`/api/enco/sessions?id=${encodeURIComponent(sessionId || '')}&petugas=${encodeURIComponent(petugas || '')}&key=${encodeURIComponent(r2Key || '')}`, { method: 'DELETE' });
      } catch (_) { }
    }

    if (data.success) {
      showToast('Log bot berhasil dihapus dari cloud', 'success');
      loadEncoLogs();
      loadEncoStats();
    } else {
      throw new Error(data.error || 'Gagal menghapus log');
    }
  } catch (err) {
    Swal.fire('Gagal Menghapus', err.message, 'error');
  }
}

async function confirmDeleteEncoLogs() {
  const role = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  const isAdmin = role === 'admin' || role.includes('admin');

  if (!isAdmin) {
    Swal.fire({
      icon: 'error',
      title: 'Akses Ditolak',
      text: 'Hanya Administrator yang memiliki hak akses untuk menghapus log aktivitas bot ENCO.',
      confirmButtonColor: '#2563eb'
    });
    return;
  }

  const result = await Swal.fire({
    title: 'Hapus Semua Log Bot?',
    text: 'Apakah Anda yakin ingin membersihkan seluruh riwayat log aktivitas bot ENCO? Tindakan ini tidak dapat dibatalkan.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Bersihkan Semua Log',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch('/api/enco/delete?type=all_logs', { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Semua log bot ENCO berhasil dibersihkan', 'success');
      loadEncoLogs();
      loadEncoStats();
    } else {
      throw new Error(data.error || 'Gagal menghapus log');
    }
  } catch (err) {
    Swal.fire('Gagal Menghapus', err.message, 'error');
  }
}

async function viewEncoSessionDetail(sessionId, petugas, fileName) {
  showLoadingOverlay('Memuat Detail Sesi Cloud...', 'Mengunduh snapshot rincian pasien dari Cloudflare R2...');
  try {
    const res = await fetch(`/api/enco/sessions/detail?id=${encodeURIComponent(sessionId || '')}&petugas=${encodeURIComponent(petugas || '')}`);
    const data = await res.json();
    hideLoadingOverlay();

    if (!data.success || !data.session) {
      throw new Error(data.error || 'Detail sesi tidak ditemukan di Cloud R2');
    }

    const sess = data.session;
    const patients = Array.isArray(sess.data) ? sess.data : [];

    const total = Number(sess.total || patients.length || 0);
    const berhasil = Number(sess.berhasil || 0);
    const gagal = Number(sess.gagal || 0);
    const terdaftar = Number(sess.pernahInput || 0);

    let modalHtml = `
      <div style="text-align: left; font-size: 13px;">
        <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <div style="font-weight: 800; font-size: 15px; color: #1e293b;">${escapeHtml(sess.fileName || fileName || 'Sesi Otomasi')}</div>
            <div style="font-size: 12px; color: #64748b;">Petugas: <strong>${escapeHtml(petugas || '-')}</strong> • ${escapeHtml(sess.dateStr || '-')}</div>
          </div>
          <span class="badge" style="background: rgba(37,99,235,0.1); color: #2563eb; font-weight: 700; border: 1px solid rgba(37,99,235,0.25);">Cloud R2 Storage</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; text-align: center;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px;">
            <div style="font-size: 18px; font-weight: 800; color: #16a34a;">${berhasil}</div>
            <div style="font-size: 10.5px; font-weight: 700; color: #15803d; text-transform: uppercase;">Berhasil</div>
          </div>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 8px;">
            <div style="font-size: 18px; font-weight: 800; color: #dc2626;">${gagal}</div>
            <div style="font-size: 10.5px; font-weight: 700; color: #b91c1c; text-transform: uppercase;">Error</div>
          </div>
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px;">
            <div style="font-size: 18px; font-weight: 800; color: #d97706;">${terdaftar}</div>
            <div style="font-size: 10.5px; font-weight: 700; color: #b45309; text-transform: uppercase;">Pernah Input</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">
            <div style="font-size: 18px; font-weight: 800; color: #334155;">${total}</div>
            <div style="font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total</div>
          </div>
        </div>

        <div style="font-weight: 700; color: #475569; margin-bottom: 6px; font-size: 12.5px;">Daftar Rincian Pasien (${patients.length} Pasien):</div>
        <div style="max-height: 280px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left; position: sticky; top: 0; z-index: 1;">
                <th style="padding: 6px 8px; width: 35px; text-align: center;">No</th>
                <th style="padding: 6px 8px;">Nama Pasien</th>
                <th style="padding: 6px 8px;">NIK</th>
                <th style="padding: 6px 8px;">Status / Hasil</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (patients.length === 0) {
      modalHtml += `<tr><td colspan="4" style="text-align: center; padding: 18px; color: #94a3b8;">Tidak ada data pasien yang tersimpan dalam snapshot sesi ini.</td></tr>`;
    } else {
      patients.slice(0, 500).forEach((p, idx) => {
        const isDone = p._status === 'done' || (p.status || '').includes('DONE');
        const isError = p._status === 'error' || p._status === 'invalid-nik';
        const isAlready = p._status === 'already-screened' || (p.status || '').includes('ALREADY');

        let badge = '<span style="color:#64748b;">Menunggu</span>';
        if (isDone) badge = '<span style="color:#16a34a; font-weight:700;">✅ Berhasil</span>';
        else if (isError) badge = `<span style="color:#dc2626; font-weight:700;" title="${escapeHtml(p._errorMsg || 'Error')}">❌ Error</span>`;
        else if (isAlready) badge = '<span style="color:#d97706; font-weight:700;">⚠️ Pernah Input</span>';

        modalHtml += `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 5px 8px; text-align: center; color: #94a3b8;">${idx + 1}</td>
            <td style="padding: 5px 8px; font-weight: 600; color: #1e293b;">${escapeHtml(p.nama || p.Nama || '-')}</td>
            <td style="padding: 5px 8px; font-family: monospace; color: #2563eb;">${escapeHtml(p.nik || p.NIK || '-')}</td>
            <td style="padding: 5px 8px;">${badge}</td>
          </tr>
        `;
      });
      if (patients.length > 500) {
        modalHtml += `<tr><td colspan="4" style="text-align: center; padding: 8px; color: #64748b; font-style: italic;">Menampilkan 500 dari ${patients.length} total pasien...</td></tr>`;
      }
    }

    modalHtml += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    Swal.fire({
      title: '<i class="bi bi-file-earmark-medical-fill" style="color: #7c3aed;"></i> Laporan Status Sesi (Cloud R2)',
      html: modalHtml,
      width: '640px',
      confirmButtonText: 'Tutup',
      confirmButtonColor: '#7c3aed'
    });
  } catch (err) {
    hideLoadingOverlay();
    Swal.fire('Gagal Memuat Detail', err.message, 'error');
  }
}

async function loadEncoLogs() {
  const tbody = document.getElementById('tableBodyEncoLogs');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 24px; color: var(--text-muted);"><i class="bi bi-arrow-repeat spin"></i> Memuat log bot ENCO...</td></tr>`;
  }

  const role = (sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas')).toLowerCase();
  const isAdmin = role === 'admin' || role.includes('admin');
  const selPetugas = (document.getElementById('filterEncoLogPetugas')?.value || '').trim();

  try {
    let url = `/api/enco/logs?limit=100`;
    if (selPetugas) url += `&petugas=${encodeURIComponent(selPetugas)}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gagal memuat log');

    const logs = data.data || [];

    // Isi opsi dropdown akun petugas jika belum
    const selectEl = document.getElementById('filterEncoLogPetugas');
    if (selectEl && selectEl.options.length <= 1) {
      const userList = await fetch('/api/enco/users').then(r => r.json()).catch(() => ({}));
      if (userList?.success && Array.isArray(userList.data)) {
        userList.data.forEach(u => {
          const opt = document.createElement('option');
          opt.value = u.nama_user;
          opt.textContent = `${u.nama_user} (${u.role || 'Petugas'})`;
          selectEl.appendChild(opt);
        });
      }
    }

    if (logs.length === 0) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 32px; color: var(--text-muted);"><i class="bi bi-clock-history" style="font-size: 28px; display: block; margin-bottom: 8px;"></i>Belum ada log aktivitas bot yang tercatat.</td></tr>`;
      return;
    }

    let html = '';
    logs.forEach((l, idx) => {
      const isSuccess = (l.status || '').toLowerCase() === 'selesai';
      const badgeStatus = isSuccess
        ? `<span class="badge" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0;"><i class="bi bi-check-circle"></i> Selesai</span>`
        : `<span class="badge" style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca;"><i class="bi bi-exclamation-circle"></i> ${escapeHtml(l.status || 'Berhenti')}</span>`;

      const hasR2Session = !!(l.session_id || l.r2_key);

      html += `
        <tr>
          <td style="text-align: center; font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
          <td style="font-size: 12.5px; white-space: nowrap;">${escapeHtml(l.created_at || '-')}</td>
          <td style="font-weight: 700; color: var(--primary);">${escapeHtml(l.petugas || '-')}</td>
          <td><span class="badge" style="background: rgba(37,99,235,0.08); color: #2563eb; font-weight: 700;">${escapeHtml(l.jenis_kegiatan || '-')}</span></td>
          <td style="text-align: center; font-weight: 800;">${Number(l.total_pasien || 0)}</td>
          <td style="text-align: center; font-weight: 800; color: #16a34a;">${Number(l.jumlah_berhasil || 0)}</td>
          <td style="text-align: center; font-weight: 800; color: #0284c7;">${Number(l.jumlah_terdaftar || 0)}</td>
          <td style="text-align: center; font-weight: 800; color: #dc2626;">${Number(l.jumlah_gagal || 0)}</td>
          <td>${badgeStatus}</td>
          <td style="font-size: 12.5px; color: #475569;">${escapeHtml(l.keterangan || '-')}</td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 4px; justify-content: center;">
              ${hasR2Session ? `
                <button class="btn btn-secondary btn-sm" style="padding: 2px 7px;" onclick="viewEncoSessionDetail('${escapeHtml(l.session_id || '')}', '${escapeHtml(l.petugas || '')}', '${escapeHtml(l.keterangan || '')}')" title="Lihat Laporan Sesi R2">
                  <i class="bi bi-file-earmark-medical"></i>
                </button>
              ` : ''}
              ${isAdmin ? `
                <button class="btn btn-danger btn-sm" style="padding: 2px 7px;" onclick="deleteSingleEncoLog(${Number(l.id)}, '${escapeHtml(l.r2_key || '')}', '${escapeHtml(l.session_id || '')}', '${escapeHtml(l.petugas || '')}')" title="Hapus Log Ini">
                  <i class="bi bi-trash"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    });

    if (tbody) tbody.innerHTML = html;
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 24px; color: #dc2626;">Gagal memuat log: ${err.message}</td></tr>`;
  }
}

async function exportEncoToExcel() {
  showLoadingOverlay('Mengekspor Data ENCO...', 'Mengambil seluruh rekam pasien dari database...');
  try {
    const res = await fetch('/api/enco/records?limit=10000&offset=0');
    const data = await res.json();
    hideLoadingOverlay();

    if (!data.success || !data.data || data.data.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Tidak Ada Data',
        text: 'Belum ada data pasien ENCO untuk diekspor.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    // Deduplikasi rekam pasien berdasarkan NIK sebelum ekspor ke Excel
    const seenNiks = new Set();
    const uniqueData = [];
    (data.data || []).forEach(r => {
      const cleanNik = String(r.nik || '').replace(/\D/g, '').trim() || String(r.nik || '').trim();
      if (!cleanNik || !seenNiks.has(cleanNik)) {
        if (cleanNik) seenNiks.add(cleanNik);
        uniqueData.push(r);
      }
    });

    const rows = uniqueData.map((r, idx) => {
      let rawObj = null;
      if (r.raw_details) {
        try { rawObj = typeof r.raw_details === 'string' ? JSON.parse(r.raw_details) : r.raw_details; } catch (_) { }
      }
      const statusNikah = r.status_pernikahan || rawObj?.statuspernikahan || rawObj?.status_pernikahan || rawObj?.statusnikah || rawObj?.nikah || '';
      const pekerjaanVal = r.pekerjaan || rawObj?.pekerjaan || rawObj?.job || '';

      return {
        'No': idx + 1,
        'Tanggal Entry': r.tanggal_daftar || '',
        'NIK': String(r.nik || ''),
        'Nama Pasien': r.nama || '',
        'Tanggal Lahir': r.tanggal_lahir || '',
        'Jenis Kelamin': r.jenis_kelamin || '',
        'Status Pernikahan': statusNikah,
        'Pekerjaan': pekerjaanVal,
        'Alamat': r.alamat || '',
        'Kelurahan/Desa': r.kelurahan || '',
        'Kecamatan': r.kecamatan || 'Banjaran',
        'Kab/Kota': r.kab_kota || 'Kab. Bandung',
        'Provinsi': r.provinsi || 'Jawa Barat',
        'No. Tiket ASIK': r.no_tiket || '',
        'Kategori': r.kategori || 'Umum',
        'Status Pendaftaran': r.status_pendaftaran || '',
        'Status Pelayanan': r.status_pelayanan || '',
        'Tanggal Pelayanan': r.tanggal_pelayanan || '',
        'Petugas ENCO': r.petugas_enco || '',
        'Faskes': r.faskes || 'Puskesmas Banjaran Kota'
      };
    });

    if (typeof XLSX === 'undefined') {
      throw new Error('Pustaka SheetJS (XLSX) tidak tersedia di halaman ini.');
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekam Data ENCO');

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Rekam_Data_ASIK_ENCO_${today}.xlsx`);
    showToast('Data ENCO berhasil diunduh dalam format Excel (.xlsx)', 'success');
  } catch (err) {
    hideLoadingOverlay();
    Swal.fire('Gagal Ekspor', err.message, 'error');
  }
}

// =========================================================================
// SUB-TAB 3: LAPORAN STATUS OTOMASI ENCO (Terhubung ke Cloudflare R2 per Akun)
// =========================================================================

const encoReportState = {
  activeFilter: 'all',
  currentSession: null,
  items: [],
  filtered: []
};

async function loadEncoReportsWeb() {
  const selectPetugas = document.getElementById('filterEncoReportPetugas');
  const selectMenu = document.getElementById('filterEncoReportMenu');
  const selectSession = document.getElementById('filterEncoReportSession');
  if (!selectPetugas || !selectMenu || !selectSession) return;

  try {
    // 1. Populate Petugas jika belum terisi
    if (selectPetugas.options.length <= 1) {
      let usersList = [];
      try {
        const res = await fetch('/api/users');
        const uData = await res.json();
        if (uData.success && Array.isArray(uData.data)) {
          usersList = uData.data.map(u => u.nama_user).filter(Boolean);
        }
      } catch (_) { }

      if (!usersList.length) {
        usersList = ['Mochamad Fauzie, S.Gz', 'Petugas'];
      }

      selectPetugas.innerHTML = usersList.map(u => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('');

      // Default ke user login
      const curUser = (typeof currentUser !== 'undefined' ? (currentUser?.nama_user || '') : '') || sessionStorage.getItem('ckg_user_name') || '';
      if (curUser && usersList.includes(curUser.trim())) {
        selectPetugas.value = curUser.trim();
      }
    }

    const petugas = selectPetugas.value || 'Mochamad Fauzie, S.Gz';
    const menu = selectMenu.value || 'pendaftaran';

    selectSession.innerHTML = '<option value="">Memuat sesi dari Cloud R2...</option>';

    const res = await fetch(`/api/enco/sessions?petugas=${encodeURIComponent(petugas)}&menu=${encodeURIComponent(menu)}`);
    const data = await res.json();

    if (data.success && Array.isArray(data.data) && data.data.length > 0) {
      selectSession.innerHTML = data.data.map((s, idx) => {
        const timeLabel = s.dateStr || new Date(s.timestamp || Date.now()).toLocaleString('id-ID');
        const fileLabel = s.fileName || 'Sesi Otomasi';
        const totalInfo = s.total ? `(${s.total} Pasien)` : '';
        return `<option value="${escapeHtml(s.id)}" data-key="${escapeHtml(s.r2_key || '')}">${idx === 0 ? '🔴 LIVE: ' : ''}${escapeHtml(fileLabel)} - ${escapeHtml(timeLabel)} ${totalInfo}</option>`;
      }).join('');

      await loadEncoReportSessionDetail();
    } else {
      selectSession.innerHTML = '<option value="">Belum ada sesi rekaman untuk akun ini</option>';
      renderEncoReportEmpty('Belum ada sesi eksekusi yang tersimpan di Cloud R2 untuk akun ' + petugas);
    }
  } catch (err) {
    console.error('[loadEncoReportsWeb] error:', err);
    selectSession.innerHTML = '<option value="">Gagal memuat sesi</option>';
    renderEncoReportEmpty('Gagal memuat sesi: ' + (err.message || err));
  }
}

async function loadEncoReportSessionDetail() {
  const selectPetugas = document.getElementById('filterEncoReportPetugas');
  const selectMenu = document.getElementById('filterEncoReportMenu');
  const selectSession = document.getElementById('filterEncoReportSession');
  const sessionId = selectSession?.value;
  if (!sessionId) {
    renderEncoReportEmpty('Pilih sesi untuk melihat laporan.');
    return;
  }

  const petugas = selectPetugas?.value || '';
  const menu = selectMenu?.value || 'pendaftaran';

  const tbody = document.getElementById('tableBodyEncoReports');
  if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 24px; color: var(--text-muted);"><i class="bi bi-arrow-repeat spin"></i> Mengunduh detail laporan dari Cloud R2...</td></tr>`;

  try {
    const res = await fetch(`/api/enco/sessions/detail?id=${encodeURIComponent(sessionId)}&petugas=${encodeURIComponent(petugas)}&menu=${encodeURIComponent(menu)}`);
    const data = await res.json();

    if (data.success && data.session) {
      encoReportState.currentSession = data.session;
      const rawPatients = Array.isArray(data.session.data) ? data.session.data : [];

      encoReportState.items = rawPatients.map((p, idx) => {
        const rawStatus = (p._status || p.status || '').toLowerCase();
        const isDone = rawStatus === 'done' || rawStatus.includes('done');
        const isError = rawStatus === 'error' || rawStatus === 'invalid-nik' || rawStatus.includes('error');
        const isAlready = rawStatus === 'already-screened' || rawStatus.includes('already');

        let statusKey = 'idle';
        let statusBadge = '<span class="badge" style="background:#e2e8f0; color:#475569;">Menunggu</span>';
        if (isDone) {
          statusKey = 'success';
          statusBadge = '<span class="badge" style="background:#dcfce7; color:#15803d; font-weight:700;">✅ Selesai</span>';
        } else if (isError) {
          statusKey = 'error';
          statusBadge = '<span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700;">❌ Error</span>';
        } else if (isAlready) {
          statusKey = 'already';
          statusBadge = '<span class="badge" style="background:#fef3c7; color:#b45309; font-weight:700;">⚠️ Pernah Input</span>';
        }

        // Tanggal pemeriksaan / input, Faskes pemeriksa, dan Layanan (khususnya untuk yang pernah input)
        let tglInput = p._screeningDate || p.screening_date || p.screeningDate || p.tanggal_pemeriksaan || p.tanggal_skrining || p.tanggal_pelayanan || p.tanggal_daftar || p.tanggal;
        let faskes = p._screeningFaskes || p.screening_faskes || p.screeningFaskes || p.faskes || p.faskes_pemeriksa || p.puskesmas;
        let layanan = p._screeningLayanan || p.screening_layanan || p.screeningLayanan || p.layanan;

        // Coba ekstrak dari teks error / keterangan / reason bila belum tercatat terpisah
        const combinedText = `${p._errorMsg || ''} ${p.error || ''} ${p.message || ''} ${p.keterangan || ''} ${p.reason || ''} ${p._reason || ''} ${p.detail || ''}`;
        if (!tglInput && combinedText) {
          const tm = combinedText.match(/(?:tanggal(?:\s*pemeriksaan|\s*skrining|\s*layanan)?|tgl|date|pada)\s*[:\-]?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}|[0-9]{1,4}[\/\-][0-9]{1,2}[\/\-][0-9]{1,4})/i);
          if (tm) tglInput = tm[1].trim();
        }
        if (!faskes && combinedText) {
          const fm = combinedText.match(/(?:puskesmas|faskes|fasilitas\s*kesehatan|klinik)(?:\s*pemeriksa)?\s*[:\-]?\s*([^\r\n,\)\.]+)/i);
          if (fm) faskes = fm[1].trim();
        }
        if (!layanan && combinedText) {
          const lm = combinedText.match(/layanan\s*[:\-]?\s*([^\r\n,\)\.]+)/i);
          if (lm) layanan = lm[1].trim();
        }

        // PENTING: Untuk status 'Pernah Input' (isAlready), JANGAN PERNAH fallback ke tanggal hari ini / session run date!
        // Tampilkan '-' jika riwayat tanggal pemeriksaan tidak tercatat di modal Kemkes.
        if (!tglInput) {
          if (isAlready) {
            tglInput = '-';
          } else if (isDone) {
            tglInput = p.tanggal_daftar || p.tanggal || (data.session.dateStr ? data.session.dateStr.split(',')[0].trim() : '-');
          } else {
            tglInput = '-';
          }
        }
        if (!faskes) faskes = '-';
        if (!layanan) layanan = p.kategori || p.category || 'CKG Umum';

        return {
          index: idx + 1,
          nama: p.nama || p.name || p.nama_pasien || p.fullname || '-',
          nik: String(p.nik || p.NIK || '-').trim(),
          kategori: p.kategori || p.category || 'UMUM',
          statusKey,
          statusBadge,
          tanggalInput: tglInput,
          faskesPemeriksa: faskes,
          layanan: layanan,
          waktuEksekusi: p.dateStr || p._timestamp || data.session.dateStr || '-',
          keterangan: p._errorMsg || p.no_tiket || p._nomorTiket || p.keterangan || (isDone ? 'Berhasil diproses' : isAlready ? 'Sudah menerima layanan CKG' : isError ? 'Error otomasi' : 'Menunggu')
        };
      });

      // Update Metric Cards
      const sess = data.session;
      const b = Number(sess.berhasil || encoReportState.items.filter(i => i.statusKey === 'success').length);
      const g = Number(sess.gagal || encoReportState.items.filter(i => i.statusKey === 'error').length);
      const w = Number(sess.pernahInput || encoReportState.items.filter(i => i.statusKey === 'already').length);
      const t = Number(sess.total || encoReportState.items.length);

      const elSuccess = document.getElementById('metricEncoReportSuccess');
      const elError = document.getElementById('metricEncoReportError');
      const elPernah = document.getElementById('metricEncoReportPernah');
      const elTotal = document.getElementById('metricEncoReportTotal');

      if (elSuccess) elSuccess.textContent = b.toLocaleString('id-ID');
      if (elError) elError.textContent = g.toLocaleString('id-ID');
      if (elPernah) elPernah.textContent = w.toLocaleString('id-ID');
      if (elTotal) elTotal.textContent = t.toLocaleString('id-ID');

      filterEncoReportRows();
    } else {
      renderEncoReportEmpty(data.error || 'Gagal memuat detail sesi');
    }
  } catch (err) {
    renderEncoReportEmpty('Error saat mengunduh data sesi: ' + err.message);
  }
}

function filterEncoReportRows() {
  const search = (document.getElementById('searchEncoReport')?.value || '').toLowerCase().trim();
  const filterDate = document.getElementById('filterEncoReportDate')?.value || '';
  const tbody = document.getElementById('tableBodyEncoReports');
  if (!tbody) return;

  let filtered = [...encoReportState.items];

  // Filter chip status
  if (encoReportState.activeFilter !== 'all') {
    filtered = filtered.filter(i => i.statusKey === encoReportState.activeFilter);
  }

  // Filter pencarian
  if (search) {
    filtered = filtered.filter(i =>
      i.nama.toLowerCase().includes(search) ||
      i.nik.toLowerCase().includes(search) ||
      i.faskesPemeriksa.toLowerCase().includes(search) ||
      i.keterangan.toLowerCase().includes(search)
    );
  }

  // Filter tanggal (YYYY-MM-DD)
  if (filterDate) {
    const [y, m, d] = filterDate.split('-');
    const ddmmyyyy = `${d}/${m}/${y}`;
    const ddmmyyyyDash = `${d}-${m}-${y}`;
    filtered = filtered.filter(i =>
      i.tanggalInput.includes(filterDate) ||
      i.tanggalInput.includes(ddmmyyyy) ||
      i.tanggalInput.includes(ddmmyyyyDash) ||
      i.waktuEksekusi.includes(filterDate) ||
      i.waktuEksekusi.includes(ddmmyyyy)
    );
  }

  encoReportState.filtered = filtered;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 24px; color: var(--text-muted);">Tidak ada data laporan yang cocok dengan filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.slice(0, 500).map(i => `
    <tr>
      <td style="text-align: center; font-weight: 700;">${i.index}</td>
      <td style="font-weight: 700; color: #1e293b;">${escapeHtml(i.nama)}</td>
      <td style="font-family: monospace; font-weight: 600;">${escapeHtml(i.nik)}</td>
      <td><span class="badge" style="background:#f1f5f9; color:#475569;">${escapeHtml(i.kategori)}</span></td>
      <td>${i.statusBadge}</td>
      <td style="background: #fefce8; font-weight: 700; color: #854d0e;">${escapeHtml(i.tanggalInput)}</td>
      <td style="background: #fefce8; color: #854d0e; font-weight: 600;">${escapeHtml(i.faskesPemeriksa)}</td>
      <td><span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:600;">${escapeHtml(i.layanan)}</span></td>
      <td style="font-size: 11px; color: #64748b;">${escapeHtml(i.waktuEksekusi)}</td>
      <td style="font-size: 11.5px; max-width: 250px;">${escapeHtml(i.keterangan)}</td>
    </tr>
  `).join('');
}

function setEncoReportStatusFilter(filter) {
  encoReportState.activeFilter = filter;
  const chipAll = document.getElementById('chipEncoReportAll');
  const chipErr = document.getElementById('chipEncoReportError');
  const chipSucc = document.getElementById('chipEncoReportSuccess');
  const chipPernah = document.getElementById('chipEncoReportPernah');

  if (chipAll) chipAll.className = filter === 'all' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
  if (chipErr) chipErr.className = filter === 'error' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
  if (chipSucc) chipSucc.className = filter === 'success' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
  if (chipPernah) chipPernah.className = filter === 'already' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';

  filterEncoReportRows();
}

function resetEncoReportFilters() {
  const inputSearch = document.getElementById('searchEncoReport');
  const inputDate = document.getElementById('filterEncoReportDate');
  if (inputSearch) inputSearch.value = '';
  if (inputDate) inputDate.value = '';
  setEncoReportStatusFilter('all');
}

function renderEncoReportEmpty(msg) {
  const tbody = document.getElementById('tableBodyEncoReports');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 28px; color: var(--text-muted);">${escapeHtml(msg)}</td></tr>`;
  }
}

function exportEncoReportWebToExcel() {
  const items = encoReportState.filtered.length ? encoReportState.filtered : encoReportState.items;
  if (!items.length) {
    Swal.fire('Data Kosong', 'Tidak ada data laporan untuk diekspor.', 'info');
    return;
  }
  if (typeof XLSX === 'undefined') {
    Swal.fire('Error', 'Pustaka Excel XLSX belum siap.', 'error');
    return;
  }

  const rows = items.map(i => ({
    'No': i.index,
    'Nama Pasien': i.nama,
    'NIK': i.nik,
    'Kategori': i.kategori,
    'Status Hasil': i.statusKey === 'success' ? 'Berhasil' : i.statusKey === 'already' ? 'Pernah Input' : i.statusKey === 'error' ? 'Error' : 'Menunggu',
    'Puskesmas Pemeriksa': i.faskesPemeriksa,
    'Tanggal Pemeriksaan': i.tanggalInput,
    'Layanan': i.layanan,
    'Waktu Eksekusi': i.waktuEksekusi,
    'Keterangan / Tiket': i.keterangan
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Status');
  const pet = document.getElementById('filterEncoReportPetugas')?.value || 'Petugas';
  XLSX.writeFile(wb, `Laporan_Status_ENCO_${pet.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  showToast('Laporan status berhasil diekspor ke Excel', 'success');
}

async function copyEncoReportWebSummary() {
  const sess = encoReportState.currentSession;
  const items = encoReportState.items;
  if (!items.length) {
    Swal.fire('Data Kosong', 'Tidak ada laporan untuk disalin.', 'info');
    return;
  }

  const pet = document.getElementById('filterEncoReportPetugas')?.value || 'Petugas';
  const menu = document.getElementById('filterEncoReportMenu')?.value || 'Pendaftaran';
  const b = items.filter(i => i.statusKey === 'success').length;
  const g = items.filter(i => i.statusKey === 'error').length;
  const w = items.filter(i => i.statusKey === 'already').length;

  let txt = `📊 *LAPORAN STATUS OTOMASI ENCO - ${menu.toUpperCase()}*\n`;
  txt += `👤 Petugas: ${pet}\n`;
  txt += `📅 Waktu: ${sess?.dateStr || new Date().toLocaleString('id-ID')}\n`;
  txt += `-------------------------\n`;
  txt += `• Total Data   : ${items.length}\n`;
  txt += `• ✅ Berhasil  : ${b}\n`;
  txt += `• ❌ Error     : ${g}\n`;
  txt += `• ⚠️ Pernah Input: ${w}\n`;
  txt += `-------------------------\n`;

  const warnings = items.filter(i => i.statusKey === 'already');
  if (warnings.length > 0) {
    txt += `\n⚠️ *DATA PERNAH INPUT (${warnings.length}):*\n`;
    warnings.slice(0, 10).forEach((item, idx) => {
      txt += `${idx + 1}. *${item.nama}* (${item.nik})\n   ➔ Tgl: ${item.tanggalInput} | Faskes: ${item.faskesPemeriksa}\n`;
    });
    if (warnings.length > 10) txt += `... dan ${warnings.length - 10} pasien lainnya.\n`;
  }

  try {
    await navigator.clipboard.writeText(txt);
    showToast('Ringkasan laporan berhasil disalin ke clipboard!', 'success');
  } catch (_) {
    Swal.fire('Gagal Menyalin', 'Izin clipboard ditolak oleh browser.', 'error');
  }
}

// Window Global Bindings untuk Laporan Status Web
window.loadEncoReportsWeb = loadEncoReportsWeb;
window.loadEncoReportSessionDetail = loadEncoReportSessionDetail;
window.loadEncoReportDetailSession = loadEncoReportSessionDetail;
window.exportEncoReportsExcel = exportEncoReportWebToExcel;
window.exportEncoReportWebToExcel = exportEncoReportWebToExcel;
window.copyEncoReportWebSummary = copyEncoReportWebSummary;
window.setEncoReportStatusFilter = setEncoReportStatusFilter;
window.resetEncoReportFilters = resetEncoReportFilters;
window.filterEncoReportRows = filterEncoReportRows;





// ==========================================================================