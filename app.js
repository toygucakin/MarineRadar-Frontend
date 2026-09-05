/**
 * MyCarbons (MarineRadar) - Client-Side JavaScript Logic
 * Live API Connection, Scrape Triggers, Dynamic Filtering, Toast Notifications & Newsletter Modal
 */

/**
 * Dynamic API Base URL Configuration for decoupled Frontend/Backend repositories.
 * Priority: 1. window.ENV.API_BASE_URL -> 2. import.meta.env.VITE_API_BASE_URL -> 3. Relative (empty string '')
 */
const API_BASE_URL = (typeof window !== 'undefined' && window.ENV && window.ENV.API_BASE_URL !== undefined)
  ? window.ENV.API_BASE_URL
  : '';


// Application State
const appState = {
  allNews: [],
  newsletters: [],
  registeredVessels: [],
  activeCategory: 'all',
  searchQuery: '',
  authToken: null,
  currentUser: null,
  activeVesselFilter: 'all',
  currentPage: 1,
  itemsPerPage: 15
};

// DOM Element References
const DOM = {
  // Stat Cards
  statTotalCount: document.getElementById('stat-total-count'),
  statCarbonCount: document.getElementById('stat-carbon-count'),
  statAvgImpact: document.getElementById('stat-avg-impact'),
  statNewsletterCount: document.getElementById('stat-newsletter-count'),
  statCardNewsletter: document.getElementById('stat-card-newsletter'),

  // Controls
  searchInput: document.getElementById('search-input'),
  categoryTabs: document.getElementById('category-tabs'),
  btnRunPipeline: document.getElementById('btn-run-pipeline'),
  btnScrapeRss: document.getElementById('btn-scrape-rss'),
  btnScrapeHtml: document.getElementById('btn-scrape-html'),
  btnScrapeDeep: document.getElementById('btn-scrape-deep'),
  btnGenerateNewsletter: document.getElementById('btn-generate-newsletter'),
  userSelectDropdown: document.getElementById('user-select-dropdown'),
  vesselSelectDropdown: document.getElementById('vessel-select-dropdown'),

  // Content Areas
  newsGridContainer: document.getElementById('news-grid-container'),
  visibleCountBadge: document.getElementById('visible-count-badge'),
  toastContainer: null,

  // Modals
  newsletterModal: document.getElementById('newsletter-modal'),
  newsletterModalContent: document.getElementById('newsletter-modal-content'),
  btnCloseNewsletterModal: document.getElementById('btn-close-newsletter-modal'),
  
  archiveModal: document.getElementById('archive-modal'),
  archiveModalContent: document.getElementById('archive-modal-content'),
  btnCloseArchiveModal: document.getElementById('btn-close-archive-modal'),
  linkOpenArchive: document.getElementById('link-open-archive'),

  newsDetailModal: document.getElementById('news-detail-modal'),
  newsDetailModalContent: document.getElementById('news-detail-modal-content'),
  btnCloseDetailModal: document.getElementById('btn-close-detail-modal'),

  btnOpenLoginModal: document.getElementById('btn-open-login-modal'),
  loginFleetModal: document.getElementById('login-fleet-modal'),
  loginFleetModalContent: document.getElementById('login-fleet-modal-content'),
  btnCloseLoginModal: document.getElementById('btn-close-login-modal')
};

/**
 * DOM Load Initializer
 */
document.addEventListener('DOMContentLoaded', () => {
  initToastContainer();
  initApp();
});

function saveAuthSession(token, user) {
  appState.authToken = token;
  appState.currentUser = user;
  try {
    localStorage.setItem('marineradar_token', token);
    localStorage.setItem('marineradar_user', JSON.stringify(user));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

function clearAuthSession() {
  appState.authToken = null;
  appState.currentUser = null;
  try {
    localStorage.removeItem('marineradar_token');
    localStorage.removeItem('marineradar_user');
  } catch (e) {
    console.warn('LocalStorage clear error:', e);
  }
  hideFleetBanner();
  updateHeaderUserBar();
  populateVesselDropdown();
}

function restoreAuthSession() {
  try {
    const token = localStorage.getItem('marineradar_token');
    const userStr = localStorage.getItem('marineradar_user');
    if (token && userStr) {
      appState.authToken = token;
      appState.currentUser = JSON.parse(userStr);
      showFleetBanner(appState.currentUser);
    }
  } catch (e) {
    clearAuthSession();
  }
}

async function initApp() {
  restoreAuthSession();
  updateHeaderUserBar();
  await Promise.all([
    appState.authToken ? loadUserFleetNews() : loadNewsData(),
    loadNewslettersData(),
    loadRegisteredVessels()
  ]);

  setupEventListeners();
}

/**
 * Update Header User Status Bar (Logged in vs Logged out)
 */
function updateHeaderUserBar() {
  const container = document.getElementById('header-user-status-container');
  if (!container) return;

  const currentUser = appState.currentUser;
  const swaggerBtnHTML = `
    <a href="${API_BASE_URL}/api-docs" target="_blank" class="btn-docs" id="swagger-docs-btn">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
      API Docs (Swagger)
    </a>
  `;

  if (currentUser) {
    const vesselCount = (currentUser.assignedVessels || []).length;
    container.innerHTML = `
      <button class="btn-header-user" onclick="openLoginFleetModal()" title="Manage Fleet (${vesselCount} Vessels)">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>${escapeHTML(currentUser.name)}</span>
        <span class="user-vessel-badge">${vesselCount} Vessels</span>
      </button>
      ${swaggerBtnHTML}
    `;
  } else {
    container.innerHTML = `
      <button class="btn-header-user" id="btn-open-login-modal" onclick="openLoginFleetModal()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        Login / My Fleet
      </button>
      ${swaggerBtnHTML}
    `;
  }
}
window.updateHeaderUserBar = updateHeaderUserBar;

function logoutUser() {
  clearAuthSession();
  showToast('Logged out of fleet account', 'info');
  loadNewsData();
}
window.logoutUser = logoutUser;

/**
 * Initialize Toast Container
 */
function initToastContainer() {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  DOM.toastContainer = container;
}

/**
 * Fetch Live Articles from REST API (GET /api/news)
 */
async function loadNewsData() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/news`);
    const result = await response.json();

    if (result.success && Array.isArray(result.data)) {
      appState.allNews = result.data;
      updateStats();
      renderNewsGrid();
    } else {
      showErrorState('Failed to load articles from server.');
    }
  } catch (error) {
    console.error('API News Fetch Error:', error);
    showErrorState('Unable to connect to server. Please ensure the API service is running.');
  }
}

/**
 * Fetch Digests from REST API (GET /api/newsletters)
 */
async function loadNewslettersData() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/newsletters`);
    const result = await response.json();

    if (result.success && Array.isArray(result.data)) {
      appState.newsletters = result.data;
      if (DOM.statNewsletterCount) {
        DOM.statNewsletterCount.textContent = appState.newsletters.length;
      }
    }
  } catch (error) {
    console.warn('Digest data not yet retrieved:', error);
  }
}

/**
 * Update Hero KPI Panel Metrics
 */
function updateStats() {
  const news = appState.allNews;
  
  // 1. Total News Count
  if (DOM.statTotalCount) {
    DOM.statTotalCount.textContent = news.length;
  }

  // 2. Carbon & Green News Count
  const carbonCount = news.filter(item => 
    item.category === 'Carbon Emissions' || item.category === 'Clean Energy'
  ).length;
  if (DOM.statCarbonCount) {
    DOM.statCarbonCount.textContent = carbonCount;
  }

  // 3. Average Impact Score
  if (news.length > 0) {
    const totalImpact = news.reduce((acc, curr) => acc + (curr.impactScore || 6.0), 0);
    const avgImpact = (totalImpact / news.length).toFixed(1);
    if (DOM.statAvgImpact) {
      DOM.statAvgImpact.textContent = avgImpact;
    }
  } else if (DOM.statAvgImpact) {
    DOM.statAvgImpact.textContent = '0.0';
  }
}

/**
 * Render Dynamic News Grid Component with Pagination (15 Haber / Sayfa)
 */
function renderNewsGrid() {
  if (!DOM.newsGridContainer) return;

  // Filter Logic (Category & Search)
  let filteredNews = appState.allNews.filter(item => {
    const isSyntheticTab = appState.activeCategory === 'all' || appState.activeCategory === 'my-fleet' || appState.activeCategory === 'vessel-specific';
    const matchesCategory = isSyntheticTab || item.category === appState.activeCategory;
    const searchLower = (appState.searchQuery || '').toLowerCase();
    const matchesSearch = !appState.searchQuery || 
      (item.title && item.title.toLowerCase().includes(searchLower)) ||
      (item.summary && item.summary.toLowerCase().includes(searchLower)) ||
      (item.author && item.author.toLowerCase().includes(searchLower));

    return matchesCategory && matchesSearch;
  });

  const totalItems = filteredNews.length;
  const totalPages = Math.ceil(totalItems / appState.itemsPerPage) || 1;

  if (appState.currentPage > totalPages) appState.currentPage = totalPages;
  if (appState.currentPage < 1) appState.currentPage = 1;

  // Slice items for current page (15 items / page)
  const startIndex = (appState.currentPage - 1) * appState.itemsPerPage;
  const endIndex = Math.min(startIndex + appState.itemsPerPage, totalItems);
  const pageNews = filteredNews.slice(startIndex, endIndex);

  // Visible Count Badge
  if (DOM.visibleCountBadge) {
    if (totalItems === 0) {
      DOM.visibleCountBadge.textContent = '0 articles displayed';
    } else {
      DOM.visibleCountBadge.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalItems} articles (Page ${appState.currentPage} of ${totalPages})`;
    }
  }

  // Empty Filter State
  if (totalItems === 0) {
    DOM.newsGridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-card);">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="1.5" style="margin-bottom: 1rem;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <h3 style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; color: var(--text-heading); margin-bottom: 0.5rem;">No Articles Found Matching Criteria</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Try searching with a different keyword or category.</p>
      </div>
    `;
    renderPaginationControls(0, 0);
    return;
  }

  // Render HTML Cards for Current Page
  DOM.newsGridContainer.innerHTML = pageNews.map(news => createNewsCardHTML(news)).join('');

  // Render Pagination Controls
  renderPaginationControls(totalPages, totalItems);
}

/**
 * Smart Truncated Pagination Helper (1 2 3 4 5 ... N)
 */
function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

/**
 * Render Pagination Bar (1 2 3 ... N, Prev, Next)
 */
function renderPaginationControls(totalPages, totalItems) {
  const container = document.getElementById('pagination-controls-container');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  const startItem = (appState.currentPage - 1) * appState.itemsPerPage + 1;
  const endItem = Math.min(appState.currentPage * appState.itemsPerPage, totalItems);

  const pageNumbers = getPageNumbers(appState.currentPage, totalPages);
  let pageButtonsHTML = '';
  pageNumbers.forEach(p => {
    if (p === '...') {
      pageButtonsHTML += `<span class="pagination-ellipsis">...</span>`;
    } else {
      const isActive = p === appState.currentPage;
      pageButtonsHTML += `
        <button class="page-btn ${isActive ? 'active' : ''}" data-page="${p}">
          ${p}
        </button>
      `;
    }
  });

  container.innerHTML = `
    <div class="pagination-info">
      Showing <strong>${startItem}-${endItem}</strong> of <strong>${totalItems}</strong> articles
    </div>
    <div class="pagination-pages">
      <button class="page-btn" id="btn-prev-page" ${appState.currentPage === 1 ? 'disabled' : ''}>
        « Prev
      </button>
      ${pageButtonsHTML}
      <button class="page-btn" id="btn-next-page" ${appState.currentPage === totalPages ? 'disabled' : ''}>
        Next »
      </button>
    </div>
  `;

  // Page click listeners
  container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.currentPage = parseInt(btn.dataset.page, 10);
      renderNewsGrid();
      scrollToNewsGridTop();
    });
  });

  const prevBtn = document.getElementById('btn-prev-page');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (appState.currentPage > 1) {
        appState.currentPage--;
        renderNewsGrid();
        scrollToNewsGridTop();
      }
    });
  }

  const nextBtn = document.getElementById('btn-next-page');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (appState.currentPage < totalPages) {
        appState.currentPage++;
        renderNewsGrid();
        scrollToNewsGridTop();
      }
    });
  }
}

function scrollToNewsGridTop() {
  const section = document.querySelector('.news-grid-section');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Publisher Editor and Main Feed Resolver Helper
 */
function getSourceFeedInfo(news) {
  const author = news.author || 'MarineRadar Scraper';
  const url = (news.sourceUrl || news.link || '').toLowerCase();

  let mainFeed = 'Maritime Feed';
  if (url.includes('gcaptain.com')) mainFeed = 'gCaptain';
  else if (url.includes('splash247.com')) mainFeed = 'Splash247';
  else if (url.includes('marineinsight.com')) mainFeed = 'Marine Insight';
  else if (url.includes('safety4sea.com')) mainFeed = 'Safety4Sea';

  const authorLower = author.toLowerCase();
  const feedLower = mainFeed.toLowerCase();

  if (authorLower.includes(feedLower)) {
    return `${author} (${mainFeed})`;
  }
  return `${author} • ${mainFeed}`;
}

/**
 * Single News Card HTML Template Generator
 */
function createNewsCardHTML(news) {
  const newsId = news.id || news._id;
  const rawScore = (news.aiImportanceScore !== undefined && news.aiImportanceScore !== null)
    ? news.aiImportanceScore
    : (news.impactScore !== undefined && news.impactScore !== null ? news.impactScore : 6.5);
  const score = Number(rawScore).toFixed(1);
  const isHighImpact = score >= 8.0;

  let categoryClass = '';
  switch (news.category) {
    case 'Carbon Emissions': categoryClass = 'carbon'; break;
    case 'Alternative Fuels': categoryClass = 'fuel'; break;
    case 'Clean Energy': categoryClass = 'clean'; break;
    case 'Regulations': categoryClass = 'regulations'; break;
    case 'Green Ports': categoryClass = 'ports'; break;
    case 'Green Fleet': categoryClass = 'fleet'; break;
    case 'Maritime & Environment': categoryClass = 'environment'; break;
    default: categoryClass = ''; break;
  }

  const formattedDate = formatDate(news.publishedAt || news.createdAt);
  const sourceFeedText = getSourceFeedInfo(news);
  const targetUrl = news.sourceUrl || news.link || '#';

  const vesselCount = (news.matchedVessels && Array.isArray(news.matchedVessels)) ? news.matchedVessels.length : 0;
  const vesselBadgeHTML = vesselCount > 0 ? `
    <span class="category-tag clean" style="font-size: 0.68rem; padding: 0.15rem 0.45rem; background: #CCFBF1; color: #0D9488; border-color: rgba(13, 148, 136, 0.3);">
      ⚓ ${vesselCount} Vessel${vesselCount > 1 ? 's' : ''}
    </span>
  ` : '';

  const regs = news.regulations || [];
  const regBadgesHTML = regs.slice(0, 2).map(r => `
    <span class="category-tag fuel" style="font-size: 0.68rem; padding: 0.15rem 0.45rem; background: #FEF3C7; color: #D97706; border-color: rgba(217, 119, 6, 0.3);">
      📜 ${escapeHTML(r.code)}
    </span>
  `).join('');

  const aiBadgeHTML = news.aiCategorized ? `
    <span class="category-tag" style="font-size: 0.68rem; padding: 0.15rem 0.45rem; background: linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(13, 148, 136, 0.15) 100%); color: #7C3AED; border: 1px solid rgba(124, 58, 237, 0.3); font-weight: 700;">
      🤖 AI Analyzed
    </span>
  ` : '';

  return `
    <article class="news-card" data-id="${newsId}">
      <div>
        <div class="card-top-bar" style="flex-wrap: wrap; gap: 0.35rem;">
          <span class="category-tag ${categoryClass}">${escapeHTML(news.category || 'General')}</span>
          ${aiBadgeHTML}
          ${vesselBadgeHTML}
          ${regBadgesHTML}
          <div class="impact-badge" style="${isHighImpact ? 'background: #DCFCE7; border-color: rgba(22, 163, 74, 0.4); color: #15803D; box-shadow: 0 2px 8px rgba(22, 163, 74, 0.2);' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <span>${score}</span>
          </div>
        </div>

        <h4 class="news-title" title="${escapeHTML(news.title)}">
          ${escapeHTML(news.title)}
        </h4>

        <p class="news-summary">
          ${escapeHTML(news.summary || 'No summary description available.')}
        </p>
      </div>

      <div class="card-footer-meta">
        <div class="source-info">
          <span>⚓ ${escapeHTML(sourceFeedText)}</span>
          <span style="opacity: 0.5;">•</span>
          <span>${formattedDate}</span>
        </div>

        <a href="${escapeHTML(targetUrl)}" target="_blank" rel="noopener noreferrer" class="btn-read-more" title="View Article Details">
          Details
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </a>
      </div>
    </article>
  `;
}

/**
 * Fetch Registered Fleet Vessels from REST API (GET /api/vessels)
 */
async function loadRegisteredVessels() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/vessels`);
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      appState.registeredVessels = result.data;
      populateVesselDropdown();
    }
  } catch (e) {
    console.warn('Vessels fetch error:', e.message);
  }
}

function populateVesselDropdown() {
  const select = document.getElementById('vessel-select-dropdown');
  if (!select) return;

  const currentUser = appState.currentUser;
  let vesselsToDisplay = appState.registeredVessels;

  if (currentUser && Array.isArray(currentUser.assignedVessels)) {
    vesselsToDisplay = currentUser.assignedVessels;
  }

  if (currentUser) {
    select.innerHTML = `
      <option value="my-fleet" selected>⚓ My Assigned Vessels (${vesselsToDisplay.length})</option>
      <option value="all-news">🌐 All Public News (Genel Haberler)</option>
    `;

    if (vesselsToDisplay.length > 0) {
      const optGroup = document.createElement('optgroup');
      optGroup.label = 'Specific Fleet Vessels:';
      vesselsToDisplay.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id || v._id;
        opt.textContent = `🚢 ${v.vesselName} (${v.imoNumber ? 'IMO ' + v.imoNumber : (v.vesselType || 'Vessel')})`;
        optGroup.appendChild(opt);
      });
      select.appendChild(optGroup);
    }
  } else {
    select.innerHTML = `
      <option value="all-news" selected>⚓ All Fleet Vessels (Public Feed)</option>
    `;
    vesselsToDisplay.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id || v._id;
      opt.textContent = `🚢 ${v.vesselName} (${v.imoNumber ? 'IMO ' + v.imoNumber : (v.vesselType || 'Vessel')})`;
      select.appendChild(opt);
    });
  }
}

async function loginUserAndLoadFleetNews(userKey) {
  if (userKey === 'public') {
    appState.authToken = null;
    appState.currentUser = null;
    hideFleetBanner();
    await loadNewsData();
    showToast('Switched to Public Feed (All News)', 'info');
    return;
  }

  const userEmail = userKey === 'userA' ? 'ahmet.armator@mycarbons.com' : 'burak.operator@mycarbons.com';

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: 'password123' })
    });
    const result = await res.json();

    if (result.success && result.token) {
      saveAuthSession(result.token, result.user);

      // Load personalized news feed for logged in user
      await loadUserFleetNews();
      showFleetBanner(result.user);
      showToast(`Logged in as ${result.user.name} (${result.user.assignedVesselsCount} vessels)`, 'success');
    }
  } catch (err) {
    console.error('Fleet Login Error:', err);
    showToast('Failed to authenticate fleet user', 'error');
  }
}

async function loadUserFleetNews() {
  if (!appState.authToken) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/news/my-vessels`, {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });

    if (res.status === 401 || res.status === 403) {
      clearAuthSession();
      await loadNewsData();
      showToast('Session expired or unauthorized. Please log in again.', 'warning');
      return;
    }

    const result = await res.json();

    if (result.success && Array.isArray(result.data)) {
      appState.allNews = result.data;
      appState.activeCategory = 'my-fleet';
      appState.currentPage = 1;

      const categoryTabs = document.getElementById('category-tabs');
      if (categoryTabs) {
        categoryTabs.querySelectorAll('.tab-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.category === 'my-fleet');
        });
      }

      updateStats();
      renderNewsGrid();
    }
  } catch (err) {
    console.error('User Fleet News Error:', err);
  }
}

async function loadVesselSpecificNews(vesselId) {
  if (!vesselId || vesselId === 'my-fleet') {
    if (appState.currentUser) {
      await loadUserFleetNews();
    } else {
      await loadNewsData();
    }
    return;
  }

  if (vesselId === 'all-news' || vesselId === 'all') {
    appState.activeCategory = 'all';
    hideFleetBanner();
    await loadNewsData();
    showToast('Switched to All Public News (Genel Haberler)', 'info');
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/news/vessel/${vesselId}`);
    const result = await res.json();

    if (result.success && Array.isArray(result.data)) {
      appState.allNews = result.data;
      appState.activeCategory = 'vessel-specific';
      appState.currentPage = 1;
      updateStats();
      renderNewsGrid();
      const vesselObj = appState.registeredVessels.find(v => (v.id || v._id) === vesselId);
      const vName = vesselObj ? vesselObj.vesselName : 'Selected Vessel';
      showToast(`Filtered news for ${vName} (${result.data.length} articles)`, 'info');
    }
  } catch (e) {
    console.error('Vessel news filter error:', e);
  }
}

function showFleetBanner(user) {
  let banner = document.getElementById('user-fleet-active-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'user-fleet-active-banner';
    banner.style.cssText = 'margin-bottom: 1.25rem; background: linear-gradient(135deg, rgba(13, 148, 136, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%); padding: 0.9rem 1.25rem; border-radius: var(--radius-md); border: 1px solid rgba(13, 148, 136, 0.3); color: var(--text-heading); font-size: 0.92rem; font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;';
    DOM.newsGridContainer.parentNode.insertBefore(banner, DOM.newsGridContainer);
  }

  const vNames = (user.assignedVessels || []).map(v => v.vesselName).join(', ');
  banner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.6rem;">
      <span style="font-size: 1.2rem;">🚢</span>
      <div>
        <strong style="color: #0F766E;">Personalized Fleet View Active: ${user.name}</strong>
        <p style="margin: 0; font-size: 0.82rem; color: var(--text-muted); font-weight: 500;">Assigned Vessels (${user.assignedVesselsCount}): ${vNames || 'None'}</p>
      </div>
    </div>
    <span style="font-size: 0.75rem; font-weight: 700; background: #CCFBF1; color: #0D9488; padding: 0.2rem 0.6rem; border-radius: 999px;">JWT Authenticated</span>
  `;
}

function hideFleetBanner() {
  const banner = document.getElementById('user-fleet-active-banner');
  if (banner) banner.remove();
}

/**
 * Event Listener Binding & Handlers
 */
function setupEventListeners() {
  // 1. Live Search Input Listener
  if (DOM.searchInput) {
    DOM.searchInput.addEventListener('input', (e) => {
      appState.searchQuery = e.target.value;
      renderNewsGrid();
    });
  }

  // User Dropdown Switcher Listener
  if (DOM.userSelectDropdown) {
    DOM.userSelectDropdown.addEventListener('change', (e) => {
      const userKey = e.target.value;
      loginUserAndLoadFleetNews(userKey);
    });
  }

  // Vessel Dropdown Filter Listener
  if (DOM.vesselSelectDropdown) {
    DOM.vesselSelectDropdown.addEventListener('change', (e) => {
      const vesselId = e.target.value;
      loadVesselSpecificNews(vesselId);
    });
  }

  // 2. Category Tabs Listener
  if (DOM.categoryTabs) {
    DOM.categoryTabs.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.tab-btn');
      if (!tabBtn) return;

      DOM.categoryTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      tabBtn.classList.add('active');

      const cat = tabBtn.dataset.category || 'all';

      if (cat === 'my-fleet') {
        if (!appState.currentUser) {
          DOM.userSelectDropdown.value = 'userA';
          loginUserAndLoadFleetNews('userA');
        } else {
          loadUserFleetNews();
        }
      } else {
        appState.activeCategory = cat;
        if (!appState.currentUser) {
          loadNewsData();
        } else {
          renderNewsGrid();
        }
      }
    });
  }

  // 3. Run Full Pipeline Button Listener (Aşama 33)
  if (DOM.btnRunPipeline) {
    DOM.btnRunPipeline.addEventListener('click', async () => {
      DOM.btnRunPipeline.disabled = true;
      DOM.btnRunPipeline.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Running Pipeline...';
      showToast('Executing 4-Stage Scraping Pipeline...', 'info');

      try {
        const response = await fetch(`${API_BASE_URL}/api/news/scrape/pipeline`, { method: 'POST' });
        const result = await response.json();

        if (result.success && result.data) {
          const r = result.data;
          showToast(`⚡ Pipeline Finished: +${r.rssAdded + r.htmlAdded} new items, ${r.deepScrapedCount} deep scraped, ${r.matchedVesselsCount} vessels matched, ${r.classifiedRegulationsCount} regulations tagged!`, 'success');
          await loadNewsData();
        } else {
          showToast('Pipeline execution issue: ' + (result.message || 'Unknown error'), 'error');
        }
      } catch (e) {
        console.error('Pipeline Error:', e);
        showToast('Pipeline execution failed', 'error');
      } finally {
        DOM.btnRunPipeline.disabled = false;
        DOM.btnRunPipeline.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          Run Full Pipeline
        `;
      }
    });
  }

  // 4. RSS Scrape Button Listener
  if (DOM.btnScrapeRss) {
    DOM.btnScrapeRss.addEventListener('click', async () => {
      await handleScrapeTrigger(DOM.btnScrapeRss, '/api/news/scrape/rss', 'RSS');
    });
  }

  // 4. HTML Scrape Button Listener
  if (DOM.btnScrapeHtml) {
    DOM.btnScrapeHtml.addEventListener('click', async () => {
      await handleScrapeTrigger(DOM.btnScrapeHtml, '/api/news/scrape/html', 'HTML Web');
    });
  }

  // 5. Deep Scrape Button Listener
  if (DOM.btnScrapeDeep) {
    DOM.btnScrapeDeep.addEventListener('click', async () => {
      await handleScrapeTrigger(DOM.btnScrapeDeep, '/api/news/scrape/deep', 'Deep Article Scraper');
    });
  }

  // 6. Generate Newsletter Button Listener
  if (DOM.btnGenerateNewsletter) {
    DOM.btnGenerateNewsletter.addEventListener('click', async () => {
      await handleGenerateNewsletter();
    });
  }

  // 6. News Card Click Listener for Detail Modal
  if (DOM.newsGridContainer) {
    DOM.newsGridContainer.addEventListener('click', (e) => {
      const newsCard = e.target.closest('.news-card');
      if (!newsCard) return;

      const readMoreBtn = e.target.closest('a.btn-read-more');
      if (readMoreBtn) {
        e.preventDefault();
      }

      const newsId = newsCard.dataset.id;
      if (newsId) {
        openNewsDetailModal(newsId);
      }
    });
  }

  // 7. Open Archive Listeners
  if (DOM.statCardNewsletter) {
    DOM.statCardNewsletter.addEventListener('click', () => openArchiveModal());
  }
  if (DOM.linkOpenArchive) {
    DOM.linkOpenArchive.addEventListener('click', (e) => {
      e.preventDefault();
      openArchiveModal();
    });
  }

  // Open Login & Fleet Management Modal
  const openLoginBtn = document.getElementById('btn-open-login-modal');
  if (openLoginBtn) {
    openLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openLoginFleetModal();
    });
  }

  // 8. Close Modal Listeners
  if (DOM.btnCloseNewsletterModal) {
    DOM.btnCloseNewsletterModal.addEventListener('click', () => closeModal(DOM.newsletterModal));
  }

  if (DOM.btnCloseArchiveModal) {
    DOM.btnCloseArchiveModal.addEventListener('click', () => closeModal(DOM.archiveModal));
  }

  if (DOM.btnCloseDetailModal) {
    DOM.btnCloseDetailModal.addEventListener('click', () => closeModal(DOM.newsDetailModal));
  }

  if (DOM.btnCloseLoginModal) {
    DOM.btnCloseLoginModal.addEventListener('click', () => closeModal(DOM.loginFleetModal));
  }

  // Backdrop click to close modals
  window.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('modal-backdrop')) {
      closeModal(e.target);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

/**
 * Open News Detail Modal with Dynamic Content
 */
async function openNewsDetailModal(newsId) {
  let news = null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/news/${newsId}`);
    const result = await response.json();
    if (result.success && result.data) {
      news = result.data;
    }
  } catch (err) {
    console.error('Fetch news detail error:', err);
  }

  if (!news) {
    news = appState.allNews.find(item => (item.id || item._id) === newsId);
  }

  if (!news) {
    showToast('Article Detail Error', 'Unable to load details for the selected article.', true);
    return;
  }

  renderNewsDetailModalContent(news);
  openModal(DOM.newsDetailModal);
}

function renderNewsDetailModalContent(news) {
  if (!DOM.newsDetailModalContent) return;

  const newsId = news.id || news._id;
  const rawScore = (news.aiImportanceScore !== undefined && news.aiImportanceScore !== null)
    ? news.aiImportanceScore
    : (news.impactScore !== undefined && news.impactScore !== null ? news.impactScore : 6.5);
  const score = Number(rawScore).toFixed(1);
  const formattedDate = formatDate(news.publishedAt || news.createdAt);
  const sourceFeedText = getSourceFeedInfo(news);
  const targetUrl = news.sourceUrl || news.link || '#';
  const isScraped = news.isFullyScraped || (news.fullContent && news.fullContent.length > 50);

  let categoryClass = '';
  switch (news.category) {
    case 'Carbon Emissions': categoryClass = 'carbon'; break;
    case 'Alternative Fuels': categoryClass = 'fuel'; break;
    case 'Clean Energy': categoryClass = 'clean'; break;
    default: categoryClass = ''; break;
  }

  // Format full content into paragraphs if available
  let fullContentHTML = '';
  if (isScraped && news.fullContent) {
    const paragraphs = news.fullContent.split('\n\n');
    fullContentHTML = paragraphs.map(p => `<p style="margin-bottom: 0.85rem; line-height: 1.6; color: var(--text-body);">${escapeHTML(p)}</p>`).join('');
  }

  DOM.newsDetailModalContent.innerHTML = `
    <div class="news-detail-wrap">
      <div class="news-detail-header">
        <div class="news-detail-meta-bar">
          <span class="news-detail-source">📡 Source & Parent Feed: ${escapeHTML(sourceFeedText)}</span>
          <span class="news-detail-date">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            ${formattedDate}
          </span>
        </div>

        <h2 class="news-detail-title">${escapeHTML(news.title)}</h2>

        <div class="news-detail-badges" style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <span class="category-tag ${categoryClass}">${escapeHTML(news.category || 'General')}</span>
          <div class="impact-badge" style="background: #DCFCE7; border-color: rgba(22, 163, 74, 0.4); color: #15803D;">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <span>Impact Score: ${score}</span>
          </div>
          ${isScraped ? `
            <span class="category-tag clean" style="font-size: 0.72rem; padding: 0.2rem 0.5rem;">
              ✅ Deep Scraped Content
            </span>
          ` : `
            <span class="category-tag fuel" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; background: #FEF3C7; color: #D97706; border-color: rgba(217, 119, 6, 0.3);">
              ⏳ Summary Only
            </span>
          `}
        </div>
      </div>

      <div class="news-detail-body">
        <p style="font-weight: 700; color: var(--text-heading); margin-bottom: 0.5rem;">📄 Executive Summary:</p>
        <p style="background: rgba(16, 185, 129, 0.05); padding: 0.85rem; border-radius: var(--radius-md); border-left: 3px solid var(--brand-green); font-size: 0.92rem; margin-bottom: 1.25rem;">${escapeHTML(news.summary || news.content || 'No summary description available.')}</p>

        ${isScraped && news.fullContent ? `
          <p style="font-weight: 700; color: var(--text-heading); margin-bottom: 0.75rem;">📖 Full Article Text (Deep Web Content):</p>
          <div class="full-content-body" style="background: var(--bg-card); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-card); max-height: 400px; overflow-y: auto;">
            ${fullContentHTML}
          </div>
        ` : `
          <div style="text-align: center; padding: 1.5rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-card);">
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">Full article text has not been scraped yet for this news item.</p>
            <button class="btn-action btn-deep btn-deep-scrape-single" id="btn-deep-scrape-single" data-id="${newsId}" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; border: none; padding: 0.5rem 1.25rem; font-size: 0.88rem; cursor: pointer; border-radius: var(--radius-md);">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 0.4rem;"><path d="M12 2v20M17 12H7"></path></svg>
              Scrape Full Article Content Now
            </button>
          </div>
        `}

        <!-- 🤖 Google Gemini AI Analysis & Decarbonization Commentary Section (Aşama 43) -->
        <div class="ai-commentary-card">
          <div class="ai-commentary-header">
            <h4 class="ai-commentary-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v3m0 12v3M3 12h3m12 0h3m-3.5-6.5l-2.1 2.1m-8.8 8.8l-2.1 2.1m0-13l2.1 2.1m8.8 8.8l2.1 2.1"></path><circle cx="12" cy="12" r="3"></circle></svg>
              🤖 Google Gemini AI Decarbonization Analysis
            </h4>
            <button class="btn-ai-analyze btn-ai-analyze-single" data-id="${newsId}">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
              ${news.aiCategorized ? 'Re-Analyze with AI' : 'Analyze with AI Now'}
            </button>
          </div>

          ${news.aiCategorized && news.aiNote ? `
            <div class="ai-meta-row">
              <span class="ai-score-badge">
                ⭐ AI Importance Score: ${news.aiImportanceScore ? news.aiImportanceScore.toFixed(1) : score}/10
              </span>
              <span class="ai-score-badge" style="background: #E0E7FF; color: #3730A3; border-color: rgba(55, 48, 163, 0.25);">
                🏷️ AI Category: ${escapeHTML(news.category || 'General')}
              </span>
              ${news.aiAnalyzedAt ? `
                <span style="font-size: 0.75rem; color: var(--text-muted);">
                  🕒 Analyzed: ${formatDate(news.aiAnalyzedAt)}
                </span>
              ` : ''}
            </div>

            <div class="ai-commentary-text">
              <p style="margin: 0; line-height: 1.65;">${escapeHTML(news.aiNote)}</p>
            </div>

            ${news.aiVessels && news.aiVessels.length > 0 ? `
              <div style="margin-top: 0.85rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-size: 0.8rem; font-weight: 700; color: #6D28D9;">🚢 AI Detected Vessels:</span>
                ${news.aiVessels.map(v => `
                  <span style="font-size: 0.73rem; font-weight: 600; background: #F3E8FF; color: #6D28D9; padding: 0.15rem 0.5rem; border-radius: 999px; border: 1px solid rgba(109, 40, 217, 0.2);">
                    ${escapeHTML(v)}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          ` : `
            <p style="font-size: 0.88rem; color: var(--text-muted); margin: 0; line-height: 1.5;">
              This article has not been analyzed by Gemini AI yet. Click <strong>"Analyze with AI Now"</strong> above to generate real-time English decarbonization commentary, precision impact scoring, and AI vessel detection.
            </p>
          `}
        </div>

        ${(news.matchedVessels && news.matchedVessels.length > 0) ? `
          <div style="margin-top: 1.25rem; background: rgba(13, 148, 136, 0.05); padding: 1.1rem; border-radius: var(--radius-md); border: 1px solid rgba(13, 148, 136, 0.2);">
            <h4 style="font-size: 0.92rem; font-weight: 700; color: #0F766E; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
              ⚓ Mentioned Fleet Vessels in Article (${news.matchedVessels.length}):
            </h4>
            <div style="display: flex; flex-direction: column; gap: 0.6rem;">
              ${news.matchedVessels.map(mv => `
                <div style="background: var(--bg-card); padding: 0.75rem 0.9rem; border-radius: var(--radius-md); border: 1px solid var(--border-card);">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.25rem;">
                    <strong style="color: var(--text-heading); font-size: 0.88rem;">🚢 ${escapeHTML(mv.vesselName)} ${mv.imoNumber ? `(IMO ${escapeHTML(mv.imoNumber)})` : ''}</strong>
                    <span style="font-size: 0.7rem; font-weight: 700; background: #CCFBF1; color: #0D9488; padding: 0.1rem 0.45rem; border-radius: 999px;">Match Confidence: ${(mv.confidenceScore * 100).toFixed(0)}%</span>
                  </div>
                  ${mv.mentionSnippet ? `<p style="font-size: 0.82rem; color: var(--text-muted); font-style: italic; margin: 0;">"${escapeHTML(mv.mentionSnippet)}"</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="news-detail-footer" style="margin-top: 1.25rem; display: flex; justify-content: flex-end; align-items: center;">
        ${targetUrl && targetUrl !== '#' ? `
          <a href="${escapeHTML(targetUrl)}" target="_blank" rel="noopener noreferrer" class="btn-visit-source">
            Read Original Article (Open Source)
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
        ` : ''}
      </div>
    </div>
  `;

  // Bind listener to single AI analyze buttons
  const singleAiBtns = DOM.newsDetailModalContent.querySelectorAll('.btn-ai-analyze-single');
  singleAiBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetNewsId = btn.dataset.id;
      singleAiBtns.forEach(b => {
        b.disabled = true;
        b.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Analyzing with Gemini AI...';
      });

      try {
        showToast('Gemini AI Analysis Started', 'Analyzing article with Google Gemini AI Flash...', 'info');
        const response = await fetch(`${API_BASE_URL}/api/news/${targetNewsId}/ai-analyze`, { method: 'POST' });
        const result = await response.json();

        if (result.success && result.data) {
          showToast('Gemini AI Analysis Complete', `Generated AI commentary for "${result.data.title}"`, 'success');
          await loadNewsData();
          renderNewsDetailModalContent(result.data);
        } else {
          showToast('AI Analysis Error', result.message || 'Failed to analyze article with Gemini AI.', 'error');
          singleAiBtns.forEach(b => {
            b.disabled = false;
            b.innerHTML = '🤖 Try AI Analysis Again';
          });
        }
      } catch (err) {
        console.error('Single AI analyze error:', err);
        showToast('Connection Error', 'Failed to connect to Gemini AI service.', 'error');
        singleAiBtns.forEach(b => {
          b.disabled = false;
          b.innerHTML = '🤖 Try AI Analysis Again';
        });
      }
    });
  });

  // Bind listener to all single article deep scrape buttons
  const singleScrapeBtns = DOM.newsDetailModalContent.querySelectorAll('.btn-deep-scrape-single');
  singleScrapeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const newsIdToScrape = btn.dataset.id;
      singleScrapeBtns.forEach(b => {
        b.disabled = true;
        b.textContent = 'Scraping Full Text...';
      });

      try {
        const response = await fetch(`${API_BASE_URL}/api/news/${newsIdToScrape}/scrape-deep`, { method: 'POST' });
        const result = await response.json();

        if (result.success && result.data) {
          showToast('Deep Scraping Success', 'Full article text successfully extracted and saved.', false);
          // Refresh global state and modal view
          await loadNewsData();
          renderNewsDetailModalContent(result.data);
        } else {
          showToast('Deep Scraping Error', result.message || 'Could not extract article text.', true);
          singleScrapeBtns.forEach(b => {
            b.disabled = false;
            b.textContent = 'Scrape Full Article Content Now';
          });
        }
      } catch (err) {
        console.error('Single deep scrape error:', err);
        showToast('Connection Error', 'Failed to connect to deep scraper service.', true);
        singleScrapeBtns.forEach(b => {
          b.disabled = false;
          b.textContent = 'Scrape Full Article Content Now';
        });
      }
    });
  });
}

/**
 * Scrape API Trigger Handler & Loading State
 */
async function handleScrapeTrigger(button, endpointUrl, serviceName) {
  const originalHTML = button.innerHTML;
  
  button.disabled = true;
  button.innerHTML = `
    <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
    Scraping...
  `;

  try {
    const previousCount = appState.allNews.length;

    const targetUrl = endpointUrl.startsWith('http') ? endpointUrl : `${API_BASE_URL}${endpointUrl}`;
    const response = await fetch(targetUrl, { method: 'POST' });
    const result = await response.json();

    if (result.success) {
      const scrapedDeepCount = (result.data && typeof result.data.scrapedCount === 'number') ? result.data.scrapedCount : 0;
      const directAdded = (result.data && typeof result.data.addedCount === 'number') ? result.data.addedCount : (result.addedCount || 0);

      // Refresh news from server database
      await loadNewsData();

      let toastMsg = '';
      if (scrapedDeepCount > 0) {
        toastMsg = `${scrapedDeepCount} article${scrapedDeepCount > 1 ? 's' : ''} deep scraped with full text content!`;
      } else {
        const newCount = appState.allNews.length;
        const netNewCount = Math.max(directAdded, newCount - previousCount);

        toastMsg = netNewCount > 0 
          ? `${netNewCount} new article${netNewCount > 1 ? 's' : ''} added to feed.` 
          : 'All articles are up to date, no new items found.';
      }

      showToast(
        `${serviceName} Scraping Completed`,
        toastMsg,
        false
      );
    } else {
      showToast('Scraping Error', result.message || 'Data scraping failed.', true);
    }
  } catch (error) {
    console.error(`${serviceName} Scraping Error:`, error);
    showToast('Connection Error', `Unable to reach ${serviceName} service.`, true);
  } finally {
    button.disabled = false;
    button.innerHTML = originalHTML;
  }
}

/**
 * Generate Smart Newsletter Handler (POST /api/newsletters/generate)
 */
async function handleGenerateNewsletter() {
  const btn = DOM.btnGenerateNewsletter;
  const originalHTML = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = `
    <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
    Compiling...
  `;

  try {
    const response = await fetch(`${API_BASE_URL}/api/newsletters/generate`, { method: 'POST' });
    const result = await response.json();

    if (result.success && result.data) {
      const newsletter = result.data;
      
      await loadNewslettersData();
      renderNewsletterModalContent(newsletter);
      openModal(DOM.newsletterModal);

      showToast(
        'Digest Successfully Compiled',
        `Issue #${newsletter.issueNumber || 1} special digest has been compiled!`,
        false
      );
    } else {
      showToast('Digest Error', result.message || 'Unable to compile digest.', true);
    }
  } catch (error) {
    console.error('Generate Digest Error:', error);
    showToast('Connection Error', 'Unable to reach digest server service.', true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

function openLoginFleetModal() {
  renderLoginFleetModalContent();
  const modal = document.getElementById('login-fleet-modal');
  if (modal) {
    openModal(modal);
  }
}
window.openLoginFleetModal = openLoginFleetModal;

/**
 * Render User Login & Fleet Management Modal Content
 */
function renderLoginFleetModalContent() {
  if (!DOM.loginFleetModalContent) return;

  const currentUser = appState.currentUser;
  const isUserLoggedIn = !!currentUser;
  const assignedVessels = isUserLoggedIn ? (currentUser.assignedVessels || []) : [];
  const assignedVesselIds = assignedVessels.map(v => (v._id || v.id || v).toString());

  // Available registered vessels to add
  const availableVessels = appState.registeredVessels.filter(v => {
    const vId = (v._id || v.id).toString();
    return !assignedVesselIds.includes(vId);
  });

  if (!isUserLoggedIn) {
    // Show Email & Password Login Form
    DOM.loginFleetModalContent.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <div style="background: var(--bg-card); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-card);">
          <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 700; color: var(--text-heading); display: flex; align-items: center; gap: 0.5rem;">
            🔑 Sign In to Your Fleet Account
          </h4>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
            Enter your account email and password to access your personalized fleet news feed and manage assigned vessels.
          </p>

          <form id="form-user-login" style="display: flex; flex-direction: column; gap: 0.85rem;">
            <div>
              <label style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-heading); margin-bottom: 0.3rem;">
                Email Address:
              </label>
              <input type="email" id="input-login-email" required placeholder="e.g. ahmet.armator@mycarbons.com" value="ahmet.armator@mycarbons.com" style="width: 100%; background: var(--bg-main); color: var(--text-heading); border: 1px solid var(--border-card); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.9rem;">
            </div>

            <div>
              <label style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-heading); margin-bottom: 0.3rem;">
                Password:
              </label>
              <input type="password" id="input-login-password" required placeholder="Enter password" value="password123" style="width: 100%; background: var(--bg-main); color: var(--text-heading); border: 1px solid var(--border-card); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.9rem;">
            </div>

            <div id="login-error-msg" style="display: none; color: #DC2626; font-size: 0.82rem; font-weight: 600; background: #FEE2E2; padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);"></div>

            <button type="submit" id="btn-submit-login" class="btn-action" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; border: none; padding: 0.7rem; font-size: 0.92rem; font-weight: 700; cursor: pointer; justify-content: center; margin-top: 0.25rem;">
              🔑 Login to Fleet Portal
            </button>
          </form>

          <!-- Quick Fill Presets for Testing -->
          <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px dashed var(--border-card);">
            <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.5rem;">⚡ Quick Preset Fill (Demo Accounts):</span>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" id="btn-quick-user-a" style="background: #CCFBF1; color: #0D9488; border: 1px solid rgba(13, 148, 136, 0.3); padding: 0.3rem 0.65rem; border-radius: var(--radius-sm); font-size: 0.78rem; font-weight: 700; cursor: pointer;">
                🚢 User A (5 Vessels)
              </button>
              <button type="button" id="btn-quick-user-b" style="background: #FEF3C7; color: #D97706; border: 1px solid rgba(217, 119, 6, 0.3); padding: 0.3rem 0.65rem; border-radius: var(--radius-sm); font-size: 0.78rem; font-weight: 700; cursor: pointer;">
                🚢 User B (3 Vessels)
              </button>
            </div>
          </div>
        </div>

        <!-- Navigation Shortcut -->
        <div style="display: flex; justify-content: flex-end;">
          <button id="modal-btn-view-all" class="btn-action" style="background: var(--bg-main); color: var(--text-heading); border: 1px solid var(--border-card);">
            🌐 Continue as Guest (Public Feed)
          </button>
        </div>
      </div>
    `;

    // Bind form submit listener
    const form = document.getElementById('form-user-login');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('input-login-email').value.trim();
        const password = document.getElementById('input-login-password').value.trim();
        const errorDiv = document.getElementById('login-error-msg');
        const submitBtn = document.getElementById('btn-submit-login');

        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Logging in...';
        errorDiv.style.display = 'none';

        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const result = await res.json();

          if (result.success && result.token) {
            saveAuthSession(result.token, result.user);
            showToast(`Welcome back, ${result.user.name}!`, 'success');
            await loadUserFleetNews();
            showFleetBanner(result.user);
            updateHeaderUserBar();
            populateVesselDropdown();
            // Automatically close modal pop-up on successful login
            const modal = document.getElementById('login-fleet-modal');
            if (modal) closeModal(modal);
          } else {
            errorDiv.textContent = result.message || 'Login failed. Please check your credentials.';
            errorDiv.style.display = 'block';
          }
        } catch (err) {
          console.error('Login error:', err);
          errorDiv.textContent = 'Connection error. Please try again.';
          errorDiv.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '🔑 Login to Fleet Portal';
        }
      });
    }

    // Quick fill listeners
    const btnQuickA = document.getElementById('btn-quick-user-a');
    if (btnQuickA) {
      btnQuickA.addEventListener('click', () => {
        document.getElementById('input-login-email').value = 'ahmet.armator@mycarbons.com';
        document.getElementById('input-login-password').value = 'password123';
      });
    }

    const btnQuickB = document.getElementById('btn-quick-user-b');
    if (btnQuickB) {
      btnQuickB.addEventListener('click', () => {
        document.getElementById('input-login-email').value = 'burak.operator@mycarbons.com';
        document.getElementById('input-login-password').value = 'password123';
      });
    }

    const btnViewAll = document.getElementById('modal-btn-view-all');
    if (btnViewAll) {
      btnViewAll.addEventListener('click', async () => {
        appState.activeCategory = 'all';
        await loadNewsData();
        const modal = document.getElementById('login-fleet-modal');
        if (modal) closeModal(modal);
      });
    }

  } else {
    // Show Logged In Profile & Fleet Management Panel
    DOM.loginFleetModalContent.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <!-- Logged In User Profile Card -->
        <div style="background: var(--bg-card); padding: 1.1rem; border-radius: var(--radius-md); border: 1px solid var(--border-card); display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);">
              ${escapeHTML(currentUser.name ? currentUser.name.charAt(0) : 'U')}
            </div>
            <div>
              <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-heading);">
                ${escapeHTML(currentUser.name)}
              </h4>
              <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">
                ${escapeHTML(currentUser.email)} • Role: ${escapeHTML(currentUser.role || 'Armatör')}
              </p>
            </div>
          </div>

          <button id="modal-btn-logout" class="btn-header-logout" title="Logout from account">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Logout
          </button>
        </div>

        <!-- Fleet Management Panel -->
        <div style="background: rgba(13, 148, 136, 0.04); padding: 1.2rem; border-radius: var(--radius-md); border: 1px solid rgba(13, 148, 136, 0.2);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0F766E; display: flex; align-items: center; gap: 0.4rem;">
              ⚓ Your Assigned Fleet (${assignedVessels.length} Vessels):
            </h4>
            <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted);">Manage assigned vessels below</span>
          </div>

          <!-- Vessels List -->
          <div style="display: flex; flex-direction: column; gap: 0.6rem; max-height: 240px; overflow-y: auto; margin-bottom: 1rem; padding-right: 0.2rem;">
            ${assignedVessels.length > 0 ? assignedVessels.map(v => `
              <div class="vessel-list-item">
                <div>
                  <strong style="color: var(--text-heading); font-size: 0.88rem;">🚢 ${escapeHTML(v.vesselName)}</strong>
                  <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">${v.imoNumber ? 'IMO ' + escapeHTML(v.imoNumber) : escapeHTML(v.vesselType)}</span>
                </div>
                <button class="btn-remove-vessel" data-vessel-id="${v._id || v.id}" title="Remove vessel from your fleet">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  Remove
                </button>
              </div>
            `).join('') : '<p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">No vessels currently assigned to your fleet.</p>'}
          </div>

          <!-- Add Vessel Form -->
          <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; background: var(--bg-card); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-card);">
            <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-heading);">Add Vessel to Fleet:</span>
            <select id="modal-add-vessel-select" style="flex: 1; background: var(--bg-main); color: var(--text-heading); border: 1px solid var(--border-card); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600; cursor: pointer;">
              ${availableVessels.length > 0 ? availableVessels.map(av => `
                <option value="${av.id || av._id}">🚢 ${escapeHTML(av.vesselName)} (${av.imoNumber ? 'IMO ' + escapeHTML(av.imoNumber) : escapeHTML(av.vesselType)})</option>
              `).join('') : '<option value="">All registered vessels already in your fleet</option>'}
            </select>
            <button id="modal-btn-add-vessel" class="btn-action" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; border: none; padding: 0.5rem 0.95rem; font-size: 0.82rem; font-weight: 700;" ${availableVessels.length === 0 ? 'disabled' : ''}>
              Add Vessel ➕
            </button>
          </div>
        </div>
      </div>
    `;

    // Logout listener
    const btnLogout = document.getElementById('modal-btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        logoutUser();
        const modal = document.getElementById('login-fleet-modal');
        if (modal) closeModal(modal);
      });
    }

    // Add vessel listener
    const btnAddVessel = document.getElementById('modal-btn-add-vessel');
    if (btnAddVessel) {
      btnAddVessel.addEventListener('click', async () => {
        const vesselId = document.getElementById('modal-add-vessel-select').value;
        if (!vesselId || !currentUser) return;

        try {
          const res = await fetch(`${API_BASE_URL}/api/users/${currentUser.id || currentUser._id}/vessels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vesselId })
          });

          if (res.status === 401 || res.status === 403) {
            clearAuthSession();
            showToast('Session expired. Please log in again.', 'error');
            return;
          }

          const result = await res.json();
          if (result.success) {
            saveAuthSession(appState.authToken, result.data);
            showToast('Vessel added to your fleet!', 'success');
            await loadUserFleetNews();
            updateHeaderUserBar();
            populateVesselDropdown();
            renderLoginFleetModalContent();
          }
        } catch (e) {
          console.error('Add vessel error:', e);
        }
      });
    }

    // Remove vessel listeners
    const removeBtns = DOM.loginFleetModalContent.querySelectorAll('.btn-remove-vessel');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const vId = btn.dataset.vesselId;
        if (!vId || !currentUser) return;

        try {
          const res = await fetch(`${API_BASE_URL}/api/users/${currentUser.id || currentUser._id}/vessels/${vId}`, {
            method: 'DELETE'
          });

          if (res.status === 401 || res.status === 403) {
            clearAuthSession();
            showToast('Session expired. Please log in again.', 'error');
            return;
          }

          const result = await res.json();
          if (result.success) {
            saveAuthSession(appState.authToken, result.data);
            showToast('Vessel removed from your fleet.', 'info');
            await loadUserFleetNews();
            updateHeaderUserBar();
            populateVesselDropdown();
            renderLoginFleetModalContent();
          }
        } catch (e) {
          console.error('Remove vessel error:', e);
        }
      });
    });
  }
}

/**
 * Newsletter Cover Modal Content Generator
 */
function renderNewsletterModalContent(newsletter) {
  if (!DOM.newsletterModalContent) return;

  const dateStr = formatDate(newsletter.createdAt || newsletter.generatedAt);
  const newsList = Array.isArray(newsletter.featuredNews) ? newsletter.featuredNews : (Array.isArray(newsletter.news) ? newsletter.news : []);
  const issueNum = newsletter.issueNumber || 1;

  DOM.newsletterModalContent.innerHTML = `
    <div class="magazine-cover-card">
      <div class="magazine-badge-row">
        <span class="magazine-issue-pill">🌱 MYCARBONS DIGEST • ISSUE #${issueNum}</span>
        <span class="magazine-date">Published: ${dateStr}</span>
      </div>

      <h3 class="magazine-title">${escapeHTML(newsletter.title || 'Maritime Decarbonization Special Digest')}</h3>
      <p class="magazine-summary">${escapeHTML(newsletter.summary || 'Compiled from top-impact maritime articles compliant with IMO-DCS & EU-MRV.')}</p>
    </div>

    <h4 class="newsletter-section-heading">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-green)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
      Featured Highlighted Articles (${newsList.length})
    </h4>

    <div class="newsletter-news-list">
      ${newsList.length === 0 ? '<p style="color: var(--text-muted);">No articles available in this digest.</p>' : newsList.map(item => {
        const itemUrl = item.sourceUrl || item.link;
        return `
        <div class="newsletter-item-row">
          <div class="newsletter-item-content">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
              <span class="category-tag carbon" style="font-size: 0.68rem;">${escapeHTML(item.category || 'Decarbonization')}</span>
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--brand-green);">Impact: ${(item.impactScore || 6.0).toFixed(1)}</span>
            </div>
            <h5>${escapeHTML(item.title)}</h5>
            <p>${escapeHTML(item.summary || 'No detail description available.')}</p>
          </div>
          ${itemUrl ? `
            <a href="${escapeHTML(itemUrl)}" target="_blank" rel="noopener noreferrer" class="btn-read-more" style="white-space: nowrap;">
              Read ➔
            </a>
          ` : ''}
        </div>
      `;
      }).join('')}
    </div>
  `;
}

/**
 * Open Digest Archive Modal (GET /api/newsletters)
 */
async function openArchiveModal() {
  await loadNewslettersData();
  
  if (!DOM.archiveModalContent) return;

  const archives = appState.newsletters;

  if (archives.length === 0) {
    DOM.archiveModalContent.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
        <h4>No Compiled Digests Found</h4>
        <p style="font-size: 0.9rem;">Click "Generate Digest" to create your first special digest.</p>
      </div>
    `;
  } else {
    DOM.archiveModalContent.innerHTML = `
      <div class="archive-list">
        ${archives.map((item, index) => {
          const newsItems = Array.isArray(item.featuredNews) ? item.featuredNews : (Array.isArray(item.news) ? item.news : []);
          return `
            <div class="archive-card">
              <div class="archive-card-header">
                <div>
                  <span class="magazine-issue-pill" style="font-size: 0.7rem; padding: 0.2rem 0.6rem;">Issue #${item.issueNumber || (archives.length - index)}</span>
                  <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">${formatDate(item.createdAt || item.generatedAt)}</span>
                </div>
                <span style="font-size: 0.82rem; font-weight: 700; color: var(--brand-green);">${newsItems.length} Articles Selected</span>
              </div>
              <h4 style="font-family: 'Outfit', sans-serif; font-size: 1.15rem; color: var(--text-heading); margin-bottom: 0.4rem;">${escapeHTML(item.title)}</h4>
              <p style="font-size: 0.88rem; color: var(--text-body); line-height: 1.5; margin-bottom: 0.85rem;">${escapeHTML(item.summary || '')}</p>
              
              <details style="margin-top: 0.5rem;">
                <summary style="font-size: 0.82rem; font-weight: 700; color: var(--brand-green); cursor: pointer;">Show Selected Articles (${newsItems.length})</summary>
                <div style="margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; padding-left: 0.5rem; border-left: 2px solid var(--border-glow);">
                  ${newsItems.map(news => `
                    <div style="font-size: 0.85rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                      <strong style="color: var(--text-heading);">${escapeHTML(typeof news === 'object' ? news.title : 'Article Details')}</strong>
                      ${(typeof news === 'object' && (news.sourceUrl || news.link)) ? `
                        <a href="${escapeHTML(news.sourceUrl || news.link)}" target="_blank" rel="noopener noreferrer" style="color: var(--brand-green); font-size: 0.8rem; font-weight: 700; text-decoration: none;">Read ➔</a>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              </details>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  openModal(DOM.archiveModal);
}

/**
 * Modal Open / Close Helper Functions
 */
function openModal(modalElement) {
  if (!modalElement) return;
  modalElement.classList.add('active');
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalElement) {
  if (!modalElement) return;
  modalElement.classList.remove('active');
  const activeModals = document.querySelectorAll('.modal-backdrop.active');
  if (activeModals.length === 0) {
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.classList.remove('active');
  });
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
}
window.openModal = openModal;
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;

/**
 * Floating Toast Notification System
 */
function showToast(title, message, isError = false) {
  if (!DOM.toastContainer) initToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast-notification ${isError ? 'error' : ''}`;
  
  toast.innerHTML = `
    <div class="toast-icon">
      ${isError 
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      }
    </div>
    <div class="toast-body">
      <div class="toast-title">${escapeHTML(title)}</div>
      <div class="toast-message">${escapeHTML(message)}</div>
    </div>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 400);
  }, 4500);
}

/**
 * Utility Helpers
 */
function formatDate(dateStr) {
  if (!dateStr) return 'Today';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return 'Today';
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showErrorState(message) {
  if (DOM.newsGridContainer) {
    DOM.newsGridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; background: #FEE2E2; border-radius: var(--radius-lg); border: 1px solid #FCA5A5; color: #991B1B;">
        <h3 style="font-family: 'Outfit', sans-serif; font-size: 1.1rem; margin-bottom: 0.5rem;">⚠️ Connection Error</h3>
        <p style="font-size: 0.9rem;">${message}</p>
      </div>
    `;
  }
}
