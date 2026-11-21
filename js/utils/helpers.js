/**
 * APLIKASI INFO CKG - PUSKESMAS BANJARAN KOTA
 * Module: Utility & UI Helper Functions
 */

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

// Utility: Escape HTML Attributes
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

// Clipboard Copy Helpers
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

// Title Case Formatter
function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, function (m) {
    return m.toUpperCase();
  });
}

// Standard Date Formatter to YYYY-MM-DD (ISO)
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

// Display Date Formatter to DD-MM-YYYY
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

// Today ISO Date string (YYYY-MM-DD)
function getTodayIsoString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format Date to Indonesian Day & Month string
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

// UI Notification / Toast
function showToast(message, type = 'info') {
  if (typeof Swal !== 'undefined') {
    const isDark = document.body && document.body.classList.contains('dark-mode');
    const Toast = Swal.mixin({
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      showCloseButton: false,
      backdrop: false,
      timer: 2200,
      timerProgressBar: true,
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
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

// Loading Overlay
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

// Dark Mode Theme Controller
function initDarkMode() {
  const savedTheme = localStorage.getItem('ckg_theme_mode');
  const isDark = (savedTheme === 'dark');

  if (isDark) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  updateThemeToggleUI(isDark);
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('ckg_theme_mode', isDark ? 'dark' : 'light');
  updateThemeToggleUI(isDark);

  if (typeof initDashboardCharts === 'function' && typeof getOfficerPerformanceData === 'function') {
    try {
      const officersData = getOfficerPerformanceData();
      initDashboardCharts(officersData);
    } catch (e) {
      console.warn('Could not refresh charts on theme toggle:', e);
    }
  }

  showToast(isDark ? 'Mode Gelap Diaktifkan' : 'Mode Terang Diaktifkan', 'success');
}

function updateThemeToggleUI(isDark) {
  // 1. Landing Gate Web
  const portalGateIcon = document.getElementById('portalGateThemeIcon');
  const portalGateText = document.getElementById('portalGateThemeText');
  if (portalGateIcon) {
    portalGateIcon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    portalGateIcon.style.color = isDark ? '#f59e0b' : '#64748b';
  }
  if (portalGateText) portalGateText.textContent = isDark ? 'Mode Terang' : 'Mode Gelap';

  // 2. APK Native Portal
  const apkPortalIcon = document.getElementById('apkPortalThemeIcon');
  if (apkPortalIcon) {
    apkPortalIcon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    apkPortalIcon.style.color = isDark ? '#f59e0b' : '#64748b';
  }

  // 3. Header Navbar (Internal App)
  const headerBtnIcon = document.getElementById('themeToggleHeaderIcon');
  const headerBtnText = document.getElementById('themeToggleHeaderText');
  if (headerBtnIcon) {
    headerBtnIcon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    headerBtnIcon.style.color = '#f59e0b';
  }
  if (headerBtnText) headerBtnText.textContent = isDark ? 'Mode Terang' : 'Mode Gelap';

  // 4. User Dropdown Menu
  const userMenuIcon = document.getElementById('userMenuThemeIcon');
  const userMenuText = document.getElementById('userMenuThemeText');
  if (userMenuIcon) {
    userMenuIcon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    userMenuIcon.style.color = '#f59e0b';
  }
  if (userMenuText) userMenuText.textContent = isDark ? 'Mode Terang' : 'Mode Gelap';

  // 5. Login View (Puskesmas)
  const loginThemeIcon = document.getElementById('loginThemeIcon');
  const loginThemeText = document.getElementById('loginThemeText');
  if (loginThemeIcon) {
    loginThemeIcon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    loginThemeIcon.style.color = '#f59e0b';
  }
  if (loginThemeText) loginThemeText.textContent = isDark ? 'Mode Terang' : 'Mode Gelap';
}

// Bind to window for HTML inline access
window.escapeHtml = escapeHtml;
window.escapeAttr = escapeAttr;
window.copyToClipboard = copyToClipboard;
window.fallbackCopyToClipboard = fallbackCopyToClipboard;
window.toTitleCase = toTitleCase;
window.formatDateToYYYYMMDD = formatDateToYYYYMMDD;
window.formatDisplayDate = formatDisplayDate;
window.getTodayIsoString = getTodayIsoString;
window.formatTtdIndoDate = formatTtdIndoDate;
window.showToast = showToast;
window.showLoadingOverlay = showLoadingOverlay;
window.hideLoadingOverlay = hideLoadingOverlay;
window.initDarkMode = initDarkMode;
window.toggleDarkMode = toggleDarkMode;
window.updateThemeToggleUI = updateThemeToggleUI;
