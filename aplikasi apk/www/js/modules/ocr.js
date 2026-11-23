/**
 * APLIKASI INFO CKG - PUSKESMAS BANJARAN KOTA
 * Module: OCR Identity Card Scanner (KTP / KK / KIA) & Data Autofill
 */

// =========================================================================
// 4. FITUR OCR IDENTITAS KTP / KK / KIA & INTEGRASI BANK DATA PUSKESMAS
// =========================================================================
let currentOcrTarget = 'pasien';

/**
 * 1. Pemicu Scan OCR Identitas (Pasien, Wali, Siswa, dsb)
 * Menampilkan dialog pilihan Kamera Langsung atau Galeri/File
 */
window.triggerOcrIdentityScan = function (target = 'pasien') {
  currentOcrTarget = target;

  let targetLabel = 'Pasien';
  if (target === 'wali') targetLabel = 'Wali';
  else if (target === 'periksa_siswa') targetLabel = 'Siswa (Pemeriksaan)';
  else if (target === 'tambah_siswa') targetLabel = 'Siswa Baru';

  if (!window.Swal) {
    const cam = document.getElementById('ocrCameraInput');
    if (cam) cam.click();
    return;
  }

  Swal.fire({
    title: `Scan Identitas ${targetLabel}`,
    html: `
      <div style="font-size: 13.5px; color: #475569; margin-bottom: 18px; line-height: 1.5;">
        Pindai foto <strong>e-KTP, KIA, atau Kartu Keluarga (KK)</strong> untuk mengisi data formulir secara instan dan otomatis memeriksa status NIK di Bank Data.
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
        <button type="button" id="btnOcrPickCamera" class="btn" style="background: linear-gradient(135deg, #7c3aed, #9333ea); color: #fff; border: none; border-radius: 12px; padding: 16px 10px; font-weight: 700; font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(124,58,237,0.25); cursor: pointer; transition: transform 0.15s ease;">
          <i class="bi bi-camera-fill" style="font-size: 26px;"></i>
          <span>Buka Kamera</span>
        </button>
        <button type="button" id="btnOcrPickGallery" class="btn" style="background: linear-gradient(135deg, #0284c7, #0ea5e9); color: #fff; border: none; border-radius: 12px; padding: 16px 10px; font-weight: 700; font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(2,132,199,0.25); cursor: pointer; transition: transform 0.15s ease;">
          <i class="bi bi-images" style="font-size: 26px;"></i>
          <span>Pilih dari Galeri</span>
        </button>
      </div>
      <div style="margin-top: 16px; font-size: 11.5px; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; text-align: left;">
        <i class="bi bi-lightbulb-fill" style="color: #f59e0b;"></i> <strong>Tips:</strong> Pastikan seluruh kartu terlihat jelas, tidak buram, dan pencahayaan terang untuk hasil OCR maksimal.
      </div>
    `,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: 'Tutup',
    cancelButtonColor: '#94a3b8',
    customClass: { popup: 'rounded-2xl shadow-2xl' },
    didOpen: () => {
      const btnCam = document.getElementById('btnOcrPickCamera');
      const btnGal = document.getElementById('btnOcrPickGallery');
      if (btnCam) {
        btnCam.addEventListener('click', () => {
          Swal.close();
          const inp = document.getElementById('ocrCameraInput');
          if (inp) {
            inp.value = '';
            inp.click();
          }
        });
      }
      if (btnGal) {
        btnGal.addEventListener('click', () => {
          Swal.close();
          const inp = document.getElementById('ocrGalleryInput');
          if (inp) {
            inp.value = '';
            inp.click();
          }
        });
      }
    }
  });
};

/**
 * 2. Handler Saat Berkas Foto Dipilih (dari Kamera atau Galeri)
 */
window.handleOcrFileSelected = function (event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  processOcrIdentity(file, currentOcrTarget);
};

/**
 * 3. Kompresi Gambar Khusus OCR via Canvas (Kualitas Optimal & Ukuran Ringan)
 */
function compressImageForOcr(file, maxDimension = 1400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 4. Proses OCR & Lookup Bank Data
 */
async function processOcrIdentity(file, target) {
  if (!window.Swal) return;

  Swal.fire({
    title: 'Memindai Kartu Identitas...',
    html: `
      <div style="text-align: center; padding: 14px 6px;">
        <div class="spinner-border text-primary" role="status" style="width: 2.8rem; height: 2.8rem; margin-bottom: 12px; color: #7c3aed !important;"></div>
        <div style="font-weight: 700; font-size: 15px; color: #1e293b;">AI Vision & OCR Engine Membaca Dokumen...</div>
        <div style="font-size: 12.5px; color: #64748b; margin-top: 6px; line-height: 1.5;">
          Mengekstrak NIK, Nama, Tanggal Lahir, Jenis Kelamin, serta otomatis memeriksa kecocokan di Bank Data Puskesmas...
        </div>
      </div>
    `,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    // A. Kompres gambar secara instan di sisi klien
    const base64Data = await compressImageForOcr(file, 1400, 0.85);

    // B. Kirim ke Endpoint Cloudflare /api/ai/ocr-ktp
    let responseData = null;
    try {
      const res = await fetch('/api/ai/ocr-ktp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          target: target
        })
      });
      if (res.ok) {
        responseData = await res.json();
      }
    } catch (netErr) {
      console.warn('Network OCR API error:', netErr);
    }

    // C. Fallback jika backend offline / gagal: gunakan Tesseract client jika tersedia
    if (!responseData || !responseData.success) {
      try {
        Swal.update({
          title: 'Memproses OCR Cadangan...',
          html: `<div style="font-size: 13px; color: #475569;">Menghubungkan parser lokal cadangan...</div>`
        });
        if (typeof Tesseract !== 'undefined') {
          const tRes = await Tesseract.recognize(base64Data, 'ind+eng');
          const rawText = tRes?.data?.text || '';
          const resText = await fetch('/api/ai/ocr-ktp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: rawText, target: target })
          });
          if (resText.ok) responseData = await resText.json();
        }
      } catch (_) { }
    }

    if (!responseData || !responseData.success) {
      throw new Error(responseData?.error || 'Gagal memindai kartu identitas. Pastikan foto kartu terbaca jelas.');
    }

    // D. Tampilkan Hasil Verifikasi & Konfirmasi
    showOcrResultDialog(responseData, target, base64Data);

  } catch (err) {
    console.error('OCR Processing error:', err);
    Swal.fire({
      icon: 'error',
      title: 'Pemindaian Gagal',
      html: `
        <div style="font-size: 13.5px; color: #475569; text-align: left;">
          ${escapeHtml(err.message || 'Terjadi kesalahan saat memproses OCR.')}<br><br>
          <ul style="margin: 0; padding-left: 20px; font-size: 12.5px; color: #64748b;">
            <li>Pastikan foto fokus dan tidak silau</li>
            <li>Pastikan nomor NIK 16 digit terbaca jelas</li>
            <li>Anda tetap dapat memasukkan NIK secara manual</li>
          </ul>
        </div>
      `,
      confirmButtonText: 'Coba Lagi',
      confirmButtonColor: '#7c3aed',
      showCancelButton: true,
      cancelButtonText: 'Input Manual',
      cancelButtonColor: '#94a3b8'
    }).then(res => {
      if (res.isConfirmed) {
        triggerOcrIdentityScan(target);
      }
    });
  }
}

/**
 * 5. Tampilan Dialog Hasil OCR & Status Bank Data
 */
function showOcrResultDialog(ocrResponse, target, imagePreviewUrl) {
  const ext = ocrResponse.extracted_data || {};
  const isFoundInBank = Boolean(ocrResponse.found_in_bank_data);
  const bankSource = ocrResponse.bank_data_source || 'Bank Data Puskesmas';
  const cleanNik = ext.nik || '';

  const pillHtml = isFoundInBank
    ? `<div style="background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        <i class="bi bi-patch-check-fill" style="color: #059669; font-size: 20px;"></i>
        <div style="text-align: left;">
          <div style="font-weight: 800; font-size: 13px; color: #065f46;">NIK DITEMUKAN DI BANK DATA!</div>
          <div style="font-size: 11.5px; color: #047857;">Terdaftar di <strong>${escapeHtml(bankSource)}</strong>. Riwayat data lama akan otomatis dimuat.</div>
        </div>
      </div>`
    : `<div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        <i class="bi bi-person-plus-fill" style="color: #2563eb; font-size: 20px;"></i>
        <div style="text-align: left;">
          <div style="font-weight: 800; font-size: 13px; color: #1e40af;">IDENTITAS BARU (BELUM DI BANK DATA)</div>
          <div style="font-size: 11.5px; color: #1d4ed8;">Data hasil scan akan diisikan langsung ke formulir pendaftaran secara otomatis.</div>
        </div>
      </div>`;

  const namaDisplay = ext.nama || (ocrResponse.bank_data?.nama) || '-';
  const jkDisplay = (ext.jenis_kelamin === 'P' || ext.jenis_kelamin === 'Perempuan') ? 'Perempuan (P)' : 'Laki-laki (L)';
  const dobDisplay = ext.tanggal_lahir || (ocrResponse.bank_data?.tanggal_lahir) || '-';
  const alamatDisplay = ext.alamat || (ocrResponse.bank_data?.alamat) || '-';
  const wilDisplay = [ext.kelurahan, ext.kecamatan, ext.kabupaten].filter(Boolean).join(', ') || '-';

  Swal.fire({
    title: 'Hasil Pemindaian Identitas',
    html: `
      ${pillHtml}
      
      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; text-align: left; font-size: 12.5px; line-height: 1.6;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="color: #64748b; font-weight: 600;">Nomor NIK:</span>
          <span style="font-size: 11px; color: #7c3aed; font-weight: 700;">Dapat disesuaikan jika perlu</span>
        </div>
        <div style="margin-bottom: 10px;">
          <input type="text" id="ocrDialogNikInput" class="form-control" maxlength="16" inputmode="numeric"
            value="${escapeHtml(cleanNik)}"
            placeholder="16 Digit NIK"
            style="font-family: monospace; font-size: 15px; font-weight: 800; letter-spacing: 1px; color: #0f172a; border-color: #cbd5e1; background: #ffffff;">
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 95px; color: #64748b; font-weight: 600; padding: 3px 0;">Nama:</td>
            <td style="font-weight: 800; color: #1e293b; padding: 3px 0;">${escapeHtml(namaDisplay)}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; padding: 3px 0;">Jenis Kelamin:</td>
            <td style="font-weight: 700; padding: 3px 0;">${escapeHtml(jkDisplay)}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; padding: 3px 0;">Tgl Lahir / Usia:</td>
            <td style="font-weight: 700; padding: 3px 0;">${escapeHtml(dobDisplay)} ${ext.usia ? `(${ext.usia} Thn)` : ''}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; padding: 3px 0;">Alamat:</td>
            <td style="padding: 3px 0;">${escapeHtml(alamatDisplay)}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; padding: 3px 0;">Wilayah:</td>
            <td style="padding: 3px 0; color: #475569;">${escapeHtml(wilDisplay)}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8;">
        <span>Engine: ${escapeHtml(ext.ocr_engine || 'Edge AI')}</span>
        <span style="cursor: pointer; color: #7c3aed; font-weight: 700;" onclick="viewOcrCapturedImage('${encodeURIComponent(imagePreviewUrl)}')">
          <i class="bi bi-eye"></i> Lihat Foto
        </span>
      </div>
    `,
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-check2-circle"></i> Gunakan Data Ini',
    confirmButtonColor: '#059669',
    denyButtonText: '<i class="bi bi-arrow-repeat"></i> Foto Ulang',
    denyButtonColor: '#64748b',
    cancelButtonText: 'Batal',
    cancelButtonColor: '#94a3b8',
    customClass: { popup: 'rounded-2xl shadow-2xl' }
  }).then((result) => {
    if (result.isConfirmed) {
      const dialogNikInp = document.getElementById('ocrDialogNikInput');
      const finalNik = (dialogNikInp ? dialogNikInp.value : cleanNik).replace(/\D/g, '').trim();
      ext.nik = finalNik;
      applyOcrDataToForm(ocrResponse, target, finalNik);
    } else if (result.isDenied) {
      triggerOcrIdentityScan(target);
    }
  });
}

/**
 * 6. Terapkan Data OCR ke Formulir Pendaftaran & Trigger Cek Bank Data Sesuai Target
 */
function applyOcrDataToForm(ocrResponse, target, finalNik) {
  const ext = ocrResponse.extracted_data || {};
  const isFound = Boolean(ocrResponse.found_in_bank_data);

  // A. Target: PASIEN
  if (target === 'pasien') {
    const nikInp = document.getElementById('nik');
    if (nikInp) {
      nikInp.value = finalNik;
      nikInp.dispatchEvent(new Event('input'));
      nikInp.dispatchEvent(new Event('change'));
    }

    if (isFound) {
      // Jika ada di Bank Data, triggerCekNikEnco akan memuat rekam medis lengkap
      triggerCekNikEnco('pasien');
    } else {
      // Jika NIK baru (belum di Bank Data), isi seluruh form dari hasil scan KTP
      if (ext.nama) document.getElementById('nama').value = ext.nama.toUpperCase();
      if (ext.tanggal_lahir) {
        const dobInp = document.getElementById('tanggal_lahir');
        if (dobInp) {
          dobInp.value = ext.tanggal_lahir;
          dobInp.dispatchEvent(new Event('change'));
          if (typeof calculateAgeFromDob === 'function') calculateAgeFromDob();
        }
      }
      if (ext.jenis_kelamin) {
        const jkVal = (ext.jenis_kelamin === 'P' || ext.jenis_kelamin === 'Perempuan') ? 'P' : 'L';
        const jkSel = document.getElementById('jenis_kelamin');
        if (jkSel) jkSel.value = jkVal;
      }
      if (ext.alamat) {
        const alm = document.getElementById('alamat');
        if (alm) {
          let fullAlm = ext.alamat;
          if (ext.rt || ext.rw) fullAlm += ` RT ${ext.rt || '00'} RW ${ext.rw || '00'}`;
          alm.value = fullAlm.toUpperCase();
        }
      }
      if (ext.status_perkawinan) {
        const spSel = document.getElementById('status_pernikahan');
        if (spSel) {
          if (/kawin|menikah/i.test(ext.status_perkawinan) && !/belum/i.test(ext.status_perkawinan)) spSel.value = 'Kawin';
          else if (/belum/i.test(ext.status_perkawinan)) spSel.value = 'Belum Kawin';
        }
      }
      if (ext.pekerjaan) {
        const pkInp = document.getElementById('pekerjaan');
        if (pkInp) pkInp.value = String(ext.pekerjaan || '').toUpperCase();
      }

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Formulir Berhasil Diisi dari KTP',
        text: 'NIK baru terisi. Silakan lengkapi pemeriksaan fisik & vital sign pasien.',
        timer: 3500,
        showConfirmButton: false
      });
    }
  }

  // B. Target: WALI
  else if (target === 'wali') {
    const nikWaliInp = document.getElementById('nik_wali');
    if (nikWaliInp) {
      nikWaliInp.value = finalNik;
      nikWaliInp.dispatchEvent(new Event('input'));
      nikWaliInp.dispatchEvent(new Event('change'));
    }

    if (isFound) {
      triggerCekNikEnco('wali');
    } else {
      if (ext.nama) {
        const nw = document.getElementById('nama_wali');
        if (nw) nw.value = ext.nama.toUpperCase();
      }
      if (ext.tanggal_lahir) {
        const dw = document.getElementById('tanggal_lahir_wali');
        if (dw) dw.value = ext.tanggal_lahir;
      }
      if (ext.jenis_kelamin) {
        const jkW = (ext.jenis_kelamin === 'P' || ext.jenis_kelamin === 'Perempuan') ? 'P' : 'L';
        const jw = document.getElementById('jenis_kelamin_wali');
        if (jw) jw.value = jkW;
      }

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Data Wali Berhasil Diisi dari KTP',
        timer: 3000,
        showConfirmButton: false
      });
    }
  }

  // C. Target: PERIKSA SISWA
  else if (target === 'periksa_siswa') {
    const pNikInp = document.getElementById('periksaNik');
    if (pNikInp) {
      pNikInp.value = finalNik;
      pNikInp.dispatchEvent(new Event('input'));
    }

    if (isFound) {
      cekNikSiswaBankData();
    } else {
      cekNikSiswaBankData().then(() => {
        if (ext.nama) {
          const pn = document.getElementById('periksaNama');
          if (pn) pn.value = ext.nama.toUpperCase();
        }
        if (ext.jenis_kelamin) {
          const pj = document.getElementById('periksaJk');
          if (pj) pj.value = (ext.jenis_kelamin === 'P' || ext.jenis_kelamin === 'Perempuan') ? 'P' : 'L';
        }
        if (ext.tanggal_lahir) {
          const pt = document.getElementById('periksaTglLahir');
          if (pt) {
            pt.value = ext.tanggal_lahir;
            if (typeof calculateSiswaAge === 'function') calculateSiswaAge();
          }
        }
        if (ext.alamat) {
          const pa = document.getElementById('periksaAlamat');
          if (pa) pa.value = String(ext.alamat || '').toUpperCase();
        }
      });
    }
  }

  // D. Target: TAMBAH SISWA
  else if (target === 'tambah_siswa') {
    const tNikInp = document.getElementById('tambahSiswaNik');
    if (tNikInp) {
      tNikInp.value = finalNik;
      tNikInp.dispatchEvent(new Event('input'));
    }

    if (isFound) {
      cekNikTambahSiswaBankData();
    } else {
      cekNikTambahSiswaBankData().then(() => {
        if (ext.nama) {
          const tn = document.getElementById('tambahSiswaNama');
          if (tn) tn.value = ext.nama.toUpperCase();
        }
        if (ext.jenis_kelamin) {
          const tj = document.getElementById('tambahSiswaJk');
          if (tj) tj.value = (ext.jenis_kelamin === 'P' || ext.jenis_kelamin === 'Perempuan') ? 'P' : 'L';
        }
        if (ext.tanggal_lahir) {
          const tt = document.getElementById('tambahSiswaTglLahir');
          if (tt) {
            tt.value = ext.tanggal_lahir;
            if (typeof calculateTambahSiswaAge === 'function') calculateTambahSiswaAge();
          }
        }
        if (ext.alamat) {
          const ta = document.getElementById('tambahSiswaAlamat');
          if (ta) ta.value = String(ext.alamat || '').toUpperCase();
        }
      });
    }
  }
}

/**
 * 7. Preview Gambar Hasil Scan
 */
window.viewOcrCapturedImage = function (encodedDataUrl) {
  const url = decodeURIComponent(encodedDataUrl);
  Swal.fire({
    title: 'Foto Kartu Identitas',
    imageUrl: url,
    imageAlt: 'Foto KTP / KK',
    confirmButtonText: 'Tutup',
    confirmButtonColor: '#7c3aed',
    customClass: { popup: 'rounded-2xl' }
  });
};
