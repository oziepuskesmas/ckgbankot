/**
 * APLIKASI INFO CKG - PUSKESMAS BANJARAN KOTA
 * Module: Responsive Pagination Engine (Desktop: 10 items, Mobile/APK: 3 items)
 */

var currentSekolahPage = 1;
var lastSekolahFilterSignature = '';

var currentCkgGratisPage = 1;
var lastCkgGratisFilterSignature = '';

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

function getCkgGratisPageSize() {
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

  const prevDisabled = currentPage <= 1 ? 'disabled' : '';
  buttonsHtml += `
    <button type="button" class="sekolah-page-btn" ${prevDisabled} onclick="changeSekolahPage(${currentPage - 1})" title="Halaman Sebelumnya">
      <i class="bi bi-chevron-left"></i> ${isMobile ? '' : 'Sebelumnya'}
    </button>
  `;

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
  if (typeof renderSekolahView === 'function') {
    renderSekolahView();
  }

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
  if (typeof renderCkgGratisTable === 'function') {
    renderCkgGratisTable();
  }

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

// Window resize listener
let resizePaginationTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizePaginationTimer);
  resizePaginationTimer = setTimeout(() => {
    const activeView = (typeof currentActiveView !== 'undefined') ? currentActiveView : null;
    if (activeView === 'sekolah' && typeof renderSekolahView === 'function') {
      renderSekolahView();
    } else if (activeView === 'ckg-gratis' && typeof renderCkgGratisTable === 'function') {
      renderCkgGratisTable();
    }
  }, 300);
});

// Bind to window for HTML inline access
window.currentSekolahPage = currentSekolahPage;
window.lastSekolahFilterSignature = lastSekolahFilterSignature;
window.currentCkgGratisPage = currentCkgGratisPage;
window.lastCkgGratisFilterSignature = lastCkgGratisFilterSignature;
window.isMobileOrApkView = isMobileOrApkView;
window.getSekolahPageSize = getSekolahPageSize;
window.getCkgGratisPageSize = getCkgGratisPageSize;
window.generatePaginationPages = generatePaginationPages;
window.renderSekolahPagination = renderSekolahPagination;
window.changeSekolahPage = changeSekolahPage;
window.renderCkgGratisPagination = renderCkgGratisPagination;
window.changeCkgGratisPage = changeCkgGratisPage;
