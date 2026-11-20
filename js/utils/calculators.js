/**
 * APLIKASI INFO CKG - PUSKESMAS BANJARAN KOTA
 * Module: Clinical Calculators & Demographic Parsers (Standar ILP Kemenkes RI)
 */

// ==========================================================================
// 🆕 NIK 16 DIGIT VALIDATION & EXTRACTION ENGINE
// ==========================================================================

function extractCleanNik16(val) {
  if (val === null || val === undefined) return '';
  let s = String(val).trim();
  if (!s) return '';
  // Handle scientific notation from Excel e.g. "3.20405123456789e+15"
  if (/^(\d+\.?\d*|\.\d+)e[+-]?\d+$/i.test(s)) {
    try {
      const num = Number(s);
      if (!isNaN(num)) {
        s = BigInt(Math.round(num)).toString();
      }
    } catch (_) { }
  }
  return s.replace(/\D/g, '');
}

function isNik16Digit(nik) {
  return extractCleanNik16(nik).length === 16;
}

// Status Anomali NIK (Kurang / Lebih / Kosong / Valid)
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

// Helper Validasi Kelengkapan Identitas Siswa
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

// ==========================================================================
// 🗺️ KODE WILAYAH NIK DUKCAPIL INDONESIA MAP
// ==========================================================================

const NIK_PROVINSI_MAP = {
  '11': 'ACEH', '12': 'SUMATERA UTARA', '13': 'SUMATERA BARAT', '14': 'RIAU',
  '15': 'JAMBI', '16': 'SUMATERA SELATAN', '17': 'BENGKULU', '18': 'LAMPUNG',
  '19': 'KEPULAUAN BANGKA BELITUNG', '21': 'KEPULAUAN RIAU',
  '31': 'DKI JAKARTA', '32': 'JAWA BARAT', '33': 'JAWA TENGAH',
  '34': 'DI YOGYAKARTA', '35': 'JAWA TIMUR', '36': 'BANTEN',
  '51': 'BALI', '52': 'NUSA TENGGARA BARAT', '53': 'NUSA TENGGARA TIMUR',
  '61': 'KALIMANTAN BARAT', '62': 'KALIMANTAN TENGAH', '63': 'KALIMANTAN SELATAN',
  '64': 'KALIMANTAN TIMUR', '65': 'KALIMANTAN UTARA',
  '71': 'SULAWESI UTARA', '72': 'SULAWESI TENGAH', '73': 'SULAWESI SELATAN',
  '74': 'SULAWESI TENGGARA', '75': 'GORONTALO', '76': 'SULAWESI BARAT',
  '81': 'MALUKU', '82': 'MALUKU UTARA',
  '91': 'PAPUA', '92': 'PAPUA BARAT'
};

const NIK_KAB_JABAR_MAP = {
  '01': 'KAB. BOGOR', '02': 'KAB. SUKABUMI', '03': 'KAB. CIANJUR',
  '04': 'KAB. BANDUNG', '05': 'KAB. GARUT', '06': 'KAB. TASIKMALAYA',
  '07': 'KAB. CIAMIS', '08': 'KAB. KUNINGAN', '09': 'KAB. CIREBON',
  '10': 'KAB. MAJALENGKA', '11': 'KAB. SUMEDANG', '12': 'KAB. INDRAMAYU',
  '13': 'KAB. SUBANG', '14': 'KAB. PURWAKARTA', '15': 'KAB. KARAWANG',
  '16': 'KAB. BEKASI', '17': 'KAB. BANDUNG BARAT', '18': 'KAB. PANGANDARAN',
  '71': 'KOTA BOGOR', '72': 'KOTA SUKABUMI', '73': 'KOTA BANDUNG',
  '74': 'KOTA CIREBON', '75': 'KOTA BEKASI', '76': 'KOTA DEPOK',
  '77': 'KOTA CIMAHI', '78': 'KOTA TASIKMALAYA', '79': 'KOTA BANJAR'
};

const NIK_KEC_BANDUNG_MAP = {
  '05': 'Banjaran', '13': 'Banjaran', '11': 'Arjasari', '12': 'Pameungpeuk',
  '14': 'Cangkuang', '15': 'Soreang', '16': 'Katapang', '17': 'Cimaung',
  '28': 'Baleendah', '29': 'Dayeuhkolot', '30': 'Margahayu', '31': 'Margaasih'
};

function parseNikIndonesia(nik, namaInput = '') {
  if (!nik || nik.length !== 16 || isNaN(nik)) {
    return { valid: false, message: 'Format NIK tidak valid (harus 16 digit angka)' };
  }

  const provCode = nik.substring(0, 2);
  const kabCode = nik.substring(2, 4);
  const kecCode = nik.substring(4, 6);
  let dobDay = parseInt(nik.substring(6, 8), 10);
  const dobMonth = parseInt(nik.substring(8, 10), 10);
  let dobYear = parseInt(nik.substring(10, 12), 10);

  // Gender detection: Females have day + 40
  let gender = 'Laki-laki';
  if (dobDay > 40) {
    gender = 'Perempuan';
    dobDay -= 40;
  }

  // Validate month and day bounds
  if (dobMonth < 1 || dobMonth > 12 || dobDay < 1 || dobDay > 31) {
    return { valid: false, message: 'Data tanggal lahir dalam NIK tidak valid' };
  }

  // Century estimation
  const currentYear2Digit = parseInt(new Date().getFullYear().toString().substring(2), 10);
  const fullYear = (dobYear <= currentYear2Digit) ? (2000 + dobYear) : (1900 + dobYear);

  const formattedMonth = String(dobMonth).padStart(2, '0');
  const formattedDay = String(dobDay).padStart(2, '0');
  const dobString = `${formattedDay}/${formattedMonth}/${fullYear}`;

  // Age calculation
  const today = new Date();
  const birthDate = new Date(fullYear, dobMonth - 1, dobDay);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  const provName = NIK_PROVINSI_MAP[provCode] || `PROVINSI (KODE ${provCode})`;

  let kabName;
  if (provCode === '32') {
    kabName = NIK_KAB_JABAR_MAP[kabCode] || `KAB/KOTA JABAR (KODE ${kabCode})`;
  } else {
    kabName = `KAB/KOTA (KODE ${provCode}.${kabCode})`;
  }

  let kecName = `KECAMATAN (KODE ${kecCode})`;
  if (provCode === '32' && kabCode === '04' && NIK_KEC_BANDUNG_MAP[kecCode]) {
    kecName = NIK_KEC_BANDUNG_MAP[kecCode];
  }

  return {
    valid: true,
    nik: nik,
    namaLengkap: namaInput ? namaInput.toUpperCase() : 'DATA DUKCAPIL VERIFIED',
    tempatLahir: kabName,
    tanggalLahir: dobString,
    usia: age,
    jenisKelamin: gender,
    alamat: `${kabName}, ${provName}`,
    kecamatan: kecName,
    kelurahan: '-',
    provinsi: provName,
    kabupaten: kabName
  };
}

// ==========================================================================
// 👶 AGE CATEGORY ENGINE (STANDAR INTEGRASI LAYANAN PRIMER / KEMENKES RI)
// ==========================================================================

function getRecordAgeMonths(r) {
  if (!r) return null;
  const rawDob = r.tanggal_lahir || r.dob || '';
  if (!rawDob) return null;
  const dobIso = (typeof formatDateToYYYYMMDD === 'function') ? formatDateToYYYYMMDD(rawDob) : rawDob;
  if (!dobIso) return null;
  const d = new Date(dobIso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let m = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) m--;
  return m >= 0 ? m : 0;
}

function getKategoriUmur(usia, dob) {
  let age = parseInt(usia, 10);
  if (isNaN(age)) age = 0;

  let months = null;
  if (dob) {
    const dobIso = (typeof formatDateToYYYYMMDD === 'function') ? formatDateToYYYYMMDD(dob) : dob;
    if (dobIso) {
      const d = new Date(dobIso);
      if (!isNaN(d.getTime())) {
        const now = new Date();
        months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (now.getDate() < d.getDate()) months--;
        if (months < 0) months = 0;
      }
    }
  }

  if (months !== null) {
    if (months <= 59) return 'Bayi dan Balita';
    if (months <= 72) return 'Anak Prasekolah';
    if (age < 18) return 'Usia Sekolah dan Remaja';
  } else {
    if (age < 5) return 'Bayi dan Balita';
    if (age === 5 || age === 6) return 'Anak Prasekolah';
    if (age >= 7 && age < 18) return 'Usia Sekolah dan Remaja';
  }

  if (age >= 60) return 'Lansia';
  return 'Dewasa';
}

function isRecordInAgeCategory(r, categoryKey) {
  if (!categoryKey) return true;
  const age = parseInt(r.usia, 10) || 0;
  const months = getRecordAgeMonths(r);
  const key = String(categoryKey).toLowerCase().trim();

  if (key === 'bayi_balita' || key === 'bayi dan balita' || key === 'balita') {
    return months !== null ? (months <= 59) : (age < 5);
  }
  if (key === 'prasekolah' || key === 'anak prasekolah') {
    return months !== null ? (months >= 60 && months <= 72) : (age >= 5 && age <= 6);
  }
  if (key === 'sekolah_remaja' || key === 'usia sekolah dan remaja' || key === 'remaja') {
    return months !== null ? (months > 72 && age < 18) : (age >= 6 && age < 18);
  }
  if (key === 'dewasa') {
    return age >= 18 && age < 60;
  }
  if (key === 'lansia' || key === 'lanjut usia' || key === 'lanjut usia (lansia)') {
    return age >= 60;
  }
  if (key === 'anak') {
    return age < 18;
  }
  return true;
}

function determineKategoriSasaran(dob, age) {
  let finalAge = parseInt(age, 10);
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

// ==========================================================================
// 🩺 KLINIS & VITAL SIGN CLASSIFIERS (KEMENKES RI / WHO / PERKENI)
// ==========================================================================

function calculateIMT() {
  const bbInput = document.getElementById('bb');
  const tbInput = document.getElementById('tb');
  if (!bbInput || !tbInput) return;

  const bb = parseFloat(bbInput.value) || 0;
  const tbCm = parseFloat(tbInput.value) || 0;
  const imtInput = document.getElementById('imt');
  const imtBadge = document.getElementById('imtStatusBadge');

  if (bb > 0 && tbCm > 0) {
    const tbM = tbCm / 100;
    const imt = bb / (tbM * tbM);
    const rounded = Math.round(imt * 100) / 100;
    if (imtInput) imtInput.value = rounded;

    let badgeText = 'Normal';
    let badgeClass = 'badge-emerald';

    if (rounded < 18.5) { badgeText = 'Kurus (<18.5)'; badgeClass = 'badge-amber'; }
    else if (rounded <= 24.9) { badgeText = 'Normal (18.5-24.9)'; badgeClass = 'badge-emerald'; }
    else if (rounded <= 29.9) { badgeText = 'Gemuk (25-29.9)'; badgeClass = 'badge-amber'; }
    else { badgeText = 'Obesitas (>=30)'; badgeClass = 'badge-rose'; }

    if (imtBadge) {
      imtBadge.className = `badge ${badgeClass}`;
      imtBadge.textContent = badgeText;
    }
  } else {
    if (imtInput) imtInput.value = '';
    if (imtBadge) {
      imtBadge.className = 'badge badge-cyan';
      imtBadge.textContent = 'Auto';
    }
  }
}

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

// ==========================================================================
// 🪄 AUTO-FILL ANTROPOMETRI BERDASARKAN UMUR SISWA
// ==========================================================================

var ANTRO_NORMAL_RANGES = {
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
  18: { bb: [47, 67], tb: [156, 176], lp: [64, 82] }
};

function randomInRange(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

function getAntroRangeForAge(age) {
  const clampedAge = Math.max(6, Math.min(18, age));
  return ANTRO_NORMAL_RANGES[clampedAge] || ANTRO_NORMAL_RANGES[12];
}

function generateRandomAntro(age, jk) {
  const range = getAntroRangeForAge(age);
  const genderFactor = (jk === 'L') ? 1.0 : 0.95;
  const genderTbFactor = (jk === 'L') ? 1.0 : 0.97;

  const tb = randomInRange(range.tb[0] * genderTbFactor, range.tb[1] * genderTbFactor);
  const tbM = tb / 100;
  const bbMin = Math.max(range.bb[0], Math.round(18.5 * tbM * tbM * 10) / 10);
  const bbMax = Math.min(range.bb[1], Math.round(24.5 * tbM * tbM * 10) / 10);
  const bb = randomInRange(Math.min(bbMin, bbMax), Math.max(bbMin, bbMax));
  const lp = randomInRange(range.lp[0], range.lp[1]);

  return {
    bb: Math.round(bb * genderFactor * 10) / 10,
    tb: tb,
    lp: lp
  };
}

// Bind to window for HTML inline access
window.extractCleanNik16 = extractCleanNik16;
window.isNik16Digit = isNik16Digit;
window.getNikAnomalyStatus = getNikAnomalyStatus;
window.isSiswaIdentitasComplete = isSiswaIdentitasComplete;
window.parseNikIndonesia = parseNikIndonesia;
window.NIK_PROVINSI_MAP = NIK_PROVINSI_MAP;
window.NIK_KAB_JABAR_MAP = NIK_KAB_JABAR_MAP;
window.NIK_KEC_BANDUNG_MAP = NIK_KEC_BANDUNG_MAP;
window.getRecordAgeMonths = getRecordAgeMonths;
window.getKategoriUmur = getKategoriUmur;
window.isRecordInAgeCategory = isRecordInAgeCategory;
window.determineKategoriSasaran = determineKategoriSasaran;
window.calculateRealtimeAge = calculateRealtimeAge;
window.calculateIMT = calculateIMT;
window.getKategoriTekananDarah = getKategoriTekananDarah;
window.getKategoriGulaDarah = getKategoriGulaDarah;
window.getKategoriHb = getKategoriHb;
window.ANTRO_NORMAL_RANGES = ANTRO_NORMAL_RANGES;
window.randomInRange = randomInRange;
window.getAntroRangeForAge = getAntroRangeForAge;
window.generateRandomAntro = generateRandomAntro;
