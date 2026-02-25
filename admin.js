/* ============================================
   SYP Admin Dashboard — Application Logic
   ============================================ */

// ─── SVG Icons (Lucide) ─────────────────────
const icons = {
  home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  calendar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>`,
  shoppingBag: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  mail: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  barChart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16h.01"/><rect x="7" y="13" width="3" height="8" rx="1"/><rect x="12.5" y="9" width="3" height="12" rx="1"/><rect x="18" y="5" width="3" height="16" rx="1"/></svg>`,
  plus: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
  upload: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  chevronRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  x: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  edit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>`,
  users: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/></svg>`,
  camera: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/></svg>`,
  chevronDown: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  emptyBox: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
  refresh: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
  filter: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  image: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
};

// ─── State ─────────────────────────────────
const state = {
  authenticated: false,
  currentView: 'dashboard',
  currentTab: 'students',
  events: [],
  currentEvent: null,
  students: [],
  images: [],
  orders: [],
  allOrders: [],
  communications: [],
  dashboardStats: null,
  analyticsData: null,
  selectedStudentId: null,
  selectedOrderIds: new Set(),
  uploadProgress: 0,
  loading: false,
};

// ─── DOM References ────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  loginOverlay: () => $('#login-overlay'),
  loginForm: () => $('#login-form'),
  loginPassword: () => $('#login-password'),
  loginError: () => $('#login-error'),
  loginBtn: () => $('#login-btn'),
  app: () => $('#app'),
  sidebar: () => $('#sidebar'),
  sidebarNav: () => $('#sidebar-nav'),
  hamburger: () => $('#hamburger-btn'),
  backdrop: () => $('#sidebar-backdrop'),
  header: () => $('#content-header'),
  body: () => $('#content-body'),
  modalOverlay: () => $('#modal-overlay'),
  modalCard: () => $('#modal-card'),
  toastContainer: () => $('#toast-container'),
  logoutBtn: () => $('#logout-btn'),
};

// ─── Utility Functions ─────────────────────
function formatCurrency(cents) {
  return '$' + (cents / 100).toFixed(2);
}

function formatDate(isoString) {
  if (!isoString) return '---';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status) {
  if (!status) return `<span class="badge badge-none">none</span>`;
  const cls = {
    draft: 'badge-draft', active: 'badge-active', closed: 'badge-closed',
    paid: 'badge-paid', fulfilled: 'badge-fulfilled', pending: 'badge-pending',
    none: 'badge-none', refunded: 'badge-refunded',
  }[status] || 'badge-draft';
  return `<span class="badge ${cls}">${status}</span>`;
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function clientResize(file, maxDim = 2000) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve(file);
        return;
      }
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    };
    img.src = URL.createObjectURL(file);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── API Helper ────────────────────────────
async function api(path, options = {}) {
  try {
    const res = await fetch('/api' + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (res.status === 401) {
      showLogin();
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      toast(text || `Error ${res.status}`, 'error');
      return null;
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res;
  } catch (err) {
    toast('Network error: ' + err.message, 'error');
    return null;
  }
}

// Upload helper (FormData, no Content-Type header)
async function apiUpload(path, formData) {
  try {
    const res = await fetch('/api' + path, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (res.status === 401) { showLogin(); return null; }
    if (!res.ok) {
      const text = await res.text();
      toast(text || `Error ${res.status}`, 'error');
      return null;
    }
    return res.json();
  } catch (err) {
    toast('Upload error: ' + err.message, 'error');
    return null;
  }
}

// ─── Toast System ──────────────────────────
function toast(message, type = 'success') {
  const container = els.toastContainer();
  const iconMap = {
    success: icons.check,
    error: icons.x,
    info: icons.search,
  };
  const id = 'toast-' + Date.now();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.id = id;
  el.innerHTML = `
    ${iconMap[type] || ''}
    <span>${escapeHtml(message)}</span>
    <button class="toast-dismiss" onclick="this.parentElement.remove()">${icons.x}</button>
  `;
  container.appendChild(el);
  setTimeout(() => { const t = document.getElementById(id); if (t) t.remove(); }, 3000);
}

// ─── Modal System ──────────────────────────
function openModal(title, bodyHtml, footerHtml = '') {
  els.modalCard().innerHTML = `
    <div class="modal-header">
      <h2>${title}</h2>
      <button class="btn-icon" onclick="closeModal()">${icons.x}</button>
    </div>
    <div class="modal-body">${bodyHtml}</div>
    ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
  `;
  els.modalOverlay().classList.remove('hidden');
}

function closeModal() {
  els.modalOverlay().classList.add('hidden');
}

// Click outside modal to close
document.addEventListener('click', (e) => {
  if (e.target === els.modalOverlay()) closeModal();
});

// ─── Auth / Login ──────────────────────────
function showLogin() {
  state.authenticated = false;
  els.loginOverlay().classList.remove('hidden');
  els.app().classList.add('hidden');
  els.loginPassword().value = '';
  els.loginError().textContent = '';
  els.loginPassword().focus();
}

function hideLogin() {
  state.authenticated = true;
  els.loginOverlay().classList.add('hidden');
  els.app().classList.remove('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  const pw = els.loginPassword().value.trim();
  if (!pw) { els.loginError().textContent = 'Please enter a password.'; return; }

  els.loginBtn().disabled = true;
  els.loginBtn().innerHTML = '<span class="spinner"></span>';

  const res = await api('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password: pw }),
  });

  els.loginBtn().disabled = false;
  els.loginBtn().textContent = 'Sign In';

  if (res) {
    hideLogin();
    navigate('dashboard');
  } else {
    els.loginError().textContent = 'Invalid password.';
  }
}

async function handleLogout() {
  await api('/admin/auth/logout', { method: 'POST' });
  showLogin();
}

// ─── Navigation / Router ───────────────────
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'events', label: 'Events', icon: 'calendar' },
  { id: 'orders', label: 'Orders', icon: 'shoppingBag' },
  { id: 'communications', label: 'Communications', icon: 'mail' },
  { id: 'analytics', label: 'Analytics', icon: 'barChart' },
];

function renderSidebar() {
  els.sidebarNav().innerHTML = navItems.map(item => `
    <a class="nav-item ${state.currentView === item.id || (state.currentView === 'event-detail' && item.id === 'events') ? 'active' : ''}"
       data-view="${item.id}">
      ${icons[item.icon]}
      <span>${item.label}</span>
    </a>
  `).join('');

  els.sidebarNav().querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.view));
  });
}

function navigate(view, params = {}) {
  state.currentView = view;
  if (params.event) state.currentEvent = params.event;
  if (params.tab) state.currentTab = params.tab;
  state.selectedOrderIds.clear();

  renderSidebar();
  closeSidebar();

  switch (view) {
    case 'dashboard': renderDashboard(); break;
    case 'events': renderEvents(); break;
    case 'event-detail': renderEventDetail(); break;
    case 'orders': renderAllOrders(); break;
    case 'communications': renderCommunications(); break;
    case 'analytics': renderAnalytics(); break;
    case 'student-detail': renderStudentDetail(params.studentId); break;
    default: renderDashboard();
  }
}

// ─── Sidebar Mobile Toggle ─────────────────
function openSidebar() {
  els.sidebar().classList.add('open');
  els.backdrop().classList.add('show');
}
function closeSidebar() {
  els.sidebar().classList.remove('open');
  els.backdrop().classList.remove('show');
}

// ─── Header Rendering ──────────────────────
function renderHeader(title, breadcrumbs = []) {
  let bc = '';
  if (breadcrumbs.length) {
    bc = `<div class="breadcrumb">
      ${breadcrumbs.map((b, i) =>
        i < breadcrumbs.length - 1
          ? `<a onclick="${b.onclick}">${b.label}</a>${icons.chevronRight}`
          : `<span>${b.label}</span>`
      ).join('')}
    </div>`;
  }
  els.header().innerHTML = `
    <div>
      <h1>${title}</h1>
      ${bc}
    </div>
  `;
}

function renderHeaderWithActions(title, actionsHtml, breadcrumbs = []) {
  let bc = '';
  if (breadcrumbs.length) {
    bc = `<div class="breadcrumb">
      ${breadcrumbs.map((b, i) =>
        i < breadcrumbs.length - 1
          ? `<a onclick="${b.onclick}">${b.label}</a>${icons.chevronRight}`
          : `<span>${b.label}</span>`
      ).join('')}
    </div>`;
  }
  els.header().innerHTML = `
    <div>
      <h1>${title}</h1>
      ${bc}
    </div>
    <div class="btn-group">${actionsHtml}</div>
  `;
}

// ─── Loading & Empty States ────────────────
function loadingHTML() {
  return `<div class="loading-center"><div class="spinner spinner-lg"></div></div>`;
}

function emptyStateHTML(title, message, actionBtn = '') {
  return `
    <div class="empty-state">
      ${icons.emptyBox}
      <h3>${title}</h3>
      <p>${message}</p>
      ${actionBtn}
    </div>
  `;
}

// ────────────────────────────────────────────
// VIEW: Dashboard
// ────────────────────────────────────────────
async function renderDashboard() {
  renderHeader('Dashboard');
  els.body().innerHTML = loadingHTML();

  const stats = await api('/admin/dashboard/stats');
  if (!stats) { els.body().innerHTML = '<p class="text-secondary">Failed to load dashboard.</p>'; return; }
  state.dashboardStats = stats;

  const recentOrders = stats.recentOrders || [];

  els.body().innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Total Events</div>
        <div class="stat-value">${stats.totalEvents || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active Events</div>
        <div class="stat-value">${stats.activeEvents || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Orders</div>
        <div class="stat-value">${stats.totalOrders || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Revenue</div>
        <div class="stat-value">${formatCurrency(stats.revenue || 0)}</div>
      </div>
    </div>

    <div class="flex-between mb-16">
      <h3 class="section-title" style="margin-bottom:0">Recent Orders</h3>
      <button class="btn btn-primary" onclick="navigate('events')">
        ${icons.plus} Create Event
      </button>
    </div>

    ${recentOrders.length ? `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Student</th>
            <th>Event</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${recentOrders.map(o => `
            <tr style="cursor:pointer" onclick="navigateToOrder('${escapeHtml(o.id || '')}')">
              <td class="font-bold">#${escapeHtml(o.id || '---')}</td>
              <td>${escapeHtml(o.student_name || '---')}</td>
              <td>${escapeHtml(o.event_name || '---')}</td>
              <td>${formatCurrency(o.amount_cents || 0)}</td>
              <td>${statusBadge(o.status || 'none')}</td>
              <td class="text-secondary">${formatDate(o.created_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : emptyStateHTML('No orders yet', 'Orders will appear here once parents start placing them.')}
  `;
}

// ────────────────────────────────────────────
// VIEW: Events List
// ────────────────────────────────────────────
async function renderEvents() {
  renderHeaderWithActions('Events',
    `<button class="btn btn-primary" onclick="openCreateEventModal()">${icons.plus} Create Event</button>`
  );
  els.body().innerHTML = loadingHTML();

  const events = await api('/admin/events');
  if (!events) { els.body().innerHTML = '<p class="text-secondary">Failed to load events.</p>'; return; }
  state.events = events;

  if (!events.length) {
    els.body().innerHTML = emptyStateHTML(
      'No events yet',
      'Create your first school photo event to get started.',
      `<button class="btn btn-primary" onclick="openCreateEventModal()">${icons.plus} Create Event</button>`
    );
    return;
  }

  els.body().innerHTML = `
    <div class="events-grid">
      ${events.map(ev => `
        <div class="event-card" onclick="navigate('event-detail', { event: ${JSON.stringify(ev).replace(/"/g, '&quot;')} })">
          <div class="event-card-header">
            <div>
              <div class="event-card-title">${escapeHtml(ev.name)}</div>
              <div class="event-card-school">${escapeHtml(ev.school || '')}</div>
            </div>
            ${statusBadge(ev.status)}
          </div>
          <div class="event-card-meta">
            <span>${icons.calendar} ${formatDate(ev.date)}</span>
            <span>${icons.users} ${ev.student_count || 0} students</span>
            <span>${icons.shoppingBag} ${ev.order_count || 0} orders</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function openCreateEventModal() {
  openModal('Create Event', `
    <div class="form-group">
      <label>Event Name</label>
      <input type="text" id="evt-name" placeholder="Fall Pictures 2025">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>School</label>
        <input type="text" id="evt-school" placeholder="Lincoln Elementary">
      </div>
      <div class="form-group">
        <label>Date</label>
        <input type="date" id="evt-date">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Model</label>
        <select id="evt-model">
          <option value="prepay">Prepay</option>
          <option value="proof">Proof</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="evt-status">
          <option value="draft">Draft</option>
          <option value="active">Active</option>
        </select>
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitCreateEvent()">Create Event</button>
  `);
}

async function submitCreateEvent() {
  const data = {
    name: $('#evt-name').value.trim(),
    school: $('#evt-school').value.trim(),
    date: $('#evt-date').value,
    model: $('#evt-model').value,
    status: $('#evt-status').value,
  };
  if (!data.name) { toast('Event name is required.', 'error'); return; }

  const result = await api('/admin/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (result) {
    toast('Event created!');
    closeModal();
    renderEvents();
  }
}

// ────────────────────────────────────────────
// VIEW: Event Detail
// ────────────────────────────────────────────
async function renderEventDetail() {
  const ev = state.currentEvent;
  if (!ev) { navigate('events'); return; }

  renderHeaderWithActions(ev.name,
    `<button class="btn btn-ghost btn-sm" onclick="openEditEventModal()">${icons.edit} Edit</button>`,
    [
      { label: 'Events', onclick: "navigate('events')" },
      { label: ev.name, onclick: '' },
    ]
  );

  const tab = state.currentTab || 'students';

  els.body().innerHTML = `
    <div class="event-detail-header">
      <div>
        <div class="event-detail-meta">
          <span>${icons.calendar} ${formatDate(ev.date)}</span>
          <span>School: ${escapeHtml(ev.school || '---')}</span>
          <span>Model: ${ev.model || '---'}</span>
          <span>${statusBadge(ev.status)}</span>
        </div>
      </div>
    </div>
    <div class="tabs">
      <button class="tab ${tab === 'students' ? 'active' : ''}" onclick="switchTab('students')">Students</button>
      <button class="tab ${tab === 'images' ? 'active' : ''}" onclick="switchTab('images')">Images</button>
      <button class="tab ${tab === 'qrcodes' ? 'active' : ''}" onclick="switchTab('qrcodes')">QR Codes</button>
      <button class="tab ${tab === 'orders' ? 'active' : ''}" onclick="switchTab('orders')">Orders</button>
      <button class="tab ${tab === 'composites' ? 'active' : ''}" onclick="switchTab('composites')">Composites</button>
      <button class="tab ${tab === 'settings' ? 'active' : ''}" onclick="switchTab('settings')">Settings</button>
    </div>
    <div id="tab-content">${loadingHTML()}</div>
  `;

  switchTab(tab);
}

function switchTab(tab) {
  state.currentTab = tab;
  $$('.tab').forEach(t => t.classList.toggle('active', t.textContent.trim().toLowerCase().replace(' ', '') === tab));
  const container = $('#tab-content');
  if (!container) return;

  switch (tab) {
    case 'students': renderStudentsTab(container); break;
    case 'images': renderImagesTab(container); break;
    case 'qrcodes': renderQRCodesTab(container); break;
    case 'orders': renderEventOrdersTab(container); break;
    case 'composites': renderCompositesTab(container); break;
    case 'settings': renderSettingsTab(container); break;
  }
}

// ─── Students Tab ──────────────────────────
async function renderStudentsTab(container) {
  container.innerHTML = loadingHTML();
  const ev = state.currentEvent;
  const students = await api(`/admin/students?event_id=${ev.id}`);
  if (!students) { container.innerHTML = '<p class="text-secondary">Failed to load students.</p>'; return; }
  state.students = students;

  if (!students.length) {
    container.innerHTML = emptyStateHTML(
      'No students yet',
      'Import a CSV or add students manually.',
      `<div class="btn-group flex-center">
        <button class="btn btn-primary" onclick="openCSVImportModal()">${icons.upload} Import CSV</button>
        <button class="btn btn-ghost" onclick="openAddStudentModal()">${icons.plus} Add Student</button>
      </div>`
    );
    return;
  }

  container.innerHTML = `
    <div class="flex-between mb-16">
      <div class="search-box">
        ${icons.search}
        <input type="text" placeholder="Search students..." id="student-search" style="padding-left:36px;border:1px solid var(--border);border-radius:var(--radius);font-size:13px;height:36px;width:240px;">
      </div>
      <div class="btn-group">
        <button class="btn btn-ghost btn-sm" onclick="openCSVImportModal()">${icons.upload} Import CSV</button>
        <button class="btn btn-primary btn-sm" onclick="openAddStudentModal()">${icons.plus} Add Student</button>
      </div>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Grade</th>
            <th>Teacher</th>
            <th>Order Status</th>
            <th style="width:100px">Actions</th>
          </tr>
        </thead>
        <tbody id="students-tbody">
          ${renderStudentRows(students)}
        </tbody>
      </table>
    </div>
  `;

  const searchInput = $('#student-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      const q = e.target.value.toLowerCase();
      const filtered = state.students.filter(s =>
        (s.first_name + ' ' + s.last_name + ' ' + (s.code || '') + ' ' + (s.grade || '') + ' ' + (s.teacher || '')).toLowerCase().includes(q)
      );
      $('#students-tbody').innerHTML = renderStudentRows(filtered);
    }, 200));
  }
}

function renderStudentRows(students) {
  if (!students.length) {
    return `<tr><td colspan="6" class="table-empty"><p>No matching students</p></td></tr>`;
  }
  return students.map(s => `
    <tr style="cursor:pointer" onclick="showStudentDetail('${s.id}')">
      <td class="font-bold">${escapeHtml(s.code || '---')}</td>
      <td>${escapeHtml(s.first_name || '')} ${escapeHtml(s.last_name || '')}</td>
      <td>${escapeHtml(s.grade || '---')}</td>
      <td>${escapeHtml(s.teacher || '---')}</td>
      <td>${statusBadge(s.order_status || 'none')}</td>
      <td>
        <div class="btn-group">
          <button class="btn-icon" title="Edit" onclick="event.stopPropagation();openEditStudentModal('${s.id}')">${icons.edit}</button>
          <button class="btn-icon danger" title="Delete" onclick="event.stopPropagation();confirmDeleteStudent('${s.id}')">${icons.trash}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddStudentModal(studentData = null) {
  const isEdit = !!studentData;
  const s = studentData || {};
  openModal(isEdit ? 'Edit Student' : 'Add Student', `
    <div class="form-row">
      <div class="form-group">
        <label>First Name</label>
        <input type="text" id="stu-fname" value="${escapeHtml(s.first_name || '')}">
      </div>
      <div class="form-group">
        <label>Last Name</label>
        <input type="text" id="stu-lname" value="${escapeHtml(s.last_name || '')}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Grade</label>
        <input type="text" id="stu-grade" value="${escapeHtml(s.grade || '')}">
      </div>
      <div class="form-group">
        <label>Teacher</label>
        <input type="text" id="stu-teacher" value="${escapeHtml(s.teacher || '')}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Parent Email</label>
        <input type="email" id="stu-email" value="${escapeHtml(s.parent_email || '')}">
      </div>
      <div class="form-group">
        <label>Parent Phone</label>
        <input type="text" id="stu-phone" value="${escapeHtml(s.parent_phone || '')}">
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitStudent(${isEdit ? s.id : 'null'})">${isEdit ? 'Update' : 'Add'} Student</button>
  `);
}

async function openEditStudentModal(studentId) {
  const s = state.students.find(st => String(st.id) === String(studentId));
  if (s) openAddStudentModal(s);
}

async function submitStudent(studentId) {
  const ev = state.currentEvent;
  const data = {
    first_name: $('#stu-fname').value.trim(),
    last_name: $('#stu-lname').value.trim(),
    grade: $('#stu-grade').value.trim(),
    teacher: $('#stu-teacher').value.trim(),
    parent_email: $('#stu-email').value.trim(),
    parent_phone: $('#stu-phone').value.trim(),
  };
  if (!data.first_name || !data.last_name) { toast('First and last name are required.', 'error'); return; }

  let result;
  if (studentId) {
    result = await api(`/admin/students/${studentId}`, { method: 'PUT', body: JSON.stringify(data) });
  } else {
    result = await api('/admin/students', { method: 'POST', body: JSON.stringify({ ...data, event_id: ev.id }) });
  }
  if (result) {
    toast(studentId ? 'Student updated!' : 'Student added!');
    closeModal();
    switchTab('students');
  }
}

async function confirmDeleteStudent(studentId) {
  const s = state.students.find(st => String(st.id) === String(studentId));
  openModal('Delete Student', `
    <p class="confirm-message">Are you sure you want to delete <strong>${escapeHtml(s ? s.first_name + ' ' + s.last_name : '')}</strong>? This cannot be undone.</p>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-danger" onclick="deleteStudent('${studentId}')">Delete</button>
  `);
}

async function deleteStudent(studentId) {
  const result = await api(`/admin/students/${studentId}`, { method: 'DELETE' });
  if (result !== null) {
    toast('Student deleted.');
    closeModal();
    switchTab('students');
  }
}

// CSV Import
function openCSVImportModal() {
  openModal('Import Students from CSV', `
    <p class="text-secondary mb-16">Upload a CSV file with columns: first_name, last_name, grade, teacher, parent_email, parent_phone</p>
    <div class="form-group">
      <label>CSV File</label>
      <input type="file" id="csv-file" accept=".csv">
    </div>
    <div id="csv-preview-area"></div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" id="csv-confirm-btn" disabled onclick="submitCSVImport()">Import</button>
  `);

  $('#csv-file').addEventListener('change', handleCSVPreview);
}

let csvParsedData = [];

function handleCSVPreview(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const text = evt.target.result;
    const lines = text.trim().split('\n');
    if (lines.length < 2) { toast('CSV must have a header row and at least one data row.', 'error'); return; }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] || '');
      return obj;
    });

    csvParsedData = rows;

    const previewRows = rows.slice(0, 5);
    const area = $('#csv-preview-area');
    area.innerHTML = `
      <div class="csv-preview">
        <table>
          <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>
            ${previewRows.map(r => `<tr>${headers.map(h => `<td>${escapeHtml(r[h] || '')}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="csv-info">${rows.length} student${rows.length !== 1 ? 's' : ''} found${rows.length > 5 ? ` (showing first 5)` : ''}</p>
    `;
    $('#csv-confirm-btn').disabled = false;
  };
  reader.readAsText(file);
}

async function submitCSVImport() {
  const ev = state.currentEvent;
  const fileInput = $('#csv-file');
  const file = fileInput.files[0];
  if (!file) return;

  // Read CSV file as text and send as JSON (server expects { event_id, csv })
  const csvText = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsText(file);
  });

  const result = await api('/admin/students/import-csv', {
    method: 'POST',
    body: JSON.stringify({ event_id: ev.id, csv: csvText }),
  });
  if (result) {
    toast(`Imported ${result.created || 0} students! ${result.errors || 0} errors.`);
    closeModal();
    csvParsedData = [];
    switchTab('students');
  }
}

// ─── Images Tab ────────────────────────────
async function renderImagesTab(container) {
  container.innerHTML = loadingHTML();
  const ev = state.currentEvent;

  // Ensure students loaded
  if (!state.students.length) {
    const students = await api(`/admin/students?event_id=${ev.id}`);
    state.students = students || [];
  }

  const images = await api(`/admin/images?event_id=${ev.id}`);
  state.images = images || [];

  container.innerHTML = `
    <div class="flex-between mb-16" style="flex-wrap:wrap;gap:12px;">
      <div class="form-group" style="margin-bottom:0;min-width:220px;">
        <label>Select Student</label>
        <select id="image-student-select" style="width:100%">
          <option value="">-- Select a student --</option>
          ${state.students.map(s => `<option value="${s.id}" ${String(s.id) === String(state.selectedStudentId) ? 'selected' : ''}>${escapeHtml(s.code || '')} - ${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</option>`).join('')}
        </select>
      </div>
    </div>

    <div id="upload-zone-area" class="${state.selectedStudentId ? '' : 'hidden'}">
      <div class="upload-zone" id="upload-zone">
        ${icons.upload}
        <p>Drag & drop images here, or click to select</p>
        <p class="upload-hint">JPEG or PNG, max 10 files at a time</p>
        <input type="file" id="image-file-input" multiple accept="image/*" style="display:none">
      </div>
      <div id="upload-progress" class="hidden">
        <p class="text-sm text-secondary mt-8">Uploading...</p>
        <div class="progress-bar-container">
          <div class="progress-bar" id="upload-progress-bar" style="width:0%"></div>
        </div>
      </div>
    </div>

    <div id="images-grid-area">
      ${renderImagesGrid(state.images)}
    </div>
  `;

  // Student select
  $('#image-student-select').addEventListener('change', (e) => {
    state.selectedStudentId = e.target.value ? parseInt(e.target.value) : null;
    const zone = $('#upload-zone-area');
    if (state.selectedStudentId) zone.classList.remove('hidden');
    else zone.classList.add('hidden');
  });

  // Upload zone interactions
  const zone = $('#upload-zone');
  const fileInput = $('#image-file-input');

  zone.addEventListener('click', () => fileInput.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleImageUpload(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', (e) => handleImageUpload(e.target.files));
}

function renderImagesGrid(images) {
  if (!images.length) {
    return `<div class="empty-state mt-24">
      ${icons.camera}
      <h3>No images uploaded</h3>
      <p>Select a student above and upload their photos.</p>
    </div>`;
  }

  // Group by student
  const grouped = {};
  images.forEach(img => {
    const key = img.student_name || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(img);
  });

  return Object.entries(grouped).map(([name, imgs]) => `
    <div class="mt-24">
      <h4 class="mb-16">${escapeHtml(name)} (${imgs.length} image${imgs.length !== 1 ? 's' : ''})</h4>
      <div class="image-grid">
        ${imgs.map(img => `
          <div class="image-thumb">
            <img src="${img.url || img.thumbnail_url || ''}" alt="Student photo" loading="lazy">
            <button class="image-delete" onclick="deleteImage(${img.id})" title="Delete">${icons.x}</button>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

async function handleImageUpload(files) {
  if (!files.length || !state.selectedStudentId) return;
  const ev = state.currentEvent;

  const progressEl = $('#upload-progress');
  const barEl = $('#upload-progress-bar');
  progressEl.classList.remove('hidden');

  const total = files.length;
  let completed = 0;

  // Upload 2 at a time
  const fileArr = Array.from(files);
  for (let i = 0; i < fileArr.length; i += 2) {
    const batch = fileArr.slice(i, i + 2);
    await Promise.all(batch.map(async (file) => {
      const resized = await clientResize(file, 2000);
      const formData = new FormData();
      formData.append('image', resized, file.name);
      formData.append('student_id', state.selectedStudentId);
      await apiUpload('/admin/images/upload', formData);
      completed++;
      barEl.style.width = Math.round((completed / total) * 100) + '%';
    }));
  }

  toast(`${completed} image${completed !== 1 ? 's' : ''} uploaded!`);
  progressEl.classList.add('hidden');

  // Refresh images
  const images = await api(`/admin/images?event_id=${ev.id}`);
  state.images = images || [];
  $('#images-grid-area').innerHTML = renderImagesGrid(state.images);
}

async function deleteImage(imageId) {
  const result = await api(`/admin/images/${imageId}`, { method: 'DELETE' });
  if (result !== null) {
    toast('Image deleted.');
    state.images = state.images.filter(i => i.id !== imageId);
    $('#images-grid-area').innerHTML = renderImagesGrid(state.images);
  }
}

// ─── QR Codes Tab ──────────────────────────
async function renderQRCodesTab(container) {
  const ev = state.currentEvent;
  container.innerHTML = `
    <div class="card" style="max-width:600px;">
      <h3 class="section-title">QR Code Cards</h3>
      <p class="text-secondary mb-16">Generate a PDF with QR code cards for each student. These cards can be handed out on picture day for parents to scan and place orders.</p>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="generateQRPDF()">${icons.download} Generate QR PDF</button>
      </div>
      <div id="qr-status" class="mt-16"></div>
    </div>
  `;
}

async function generateQRPDF() {
  const ev = state.currentEvent;
  const statusEl = $('#qr-status');
  statusEl.innerHTML = `<div class="inline-flex"><span class="spinner"></span> Generating PDF...</div>`;

  try {
    const res = await fetch(`/api/admin/events/${ev.id}/qr-pdf`, { credentials: 'include' });
    if (!res.ok) { toast('Failed to generate QR PDF.', 'error'); statusEl.innerHTML = ''; return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ev.name.replace(/\s+/g, '_')}_QR_Cards.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    statusEl.innerHTML = `<span class="inline-flex" style="color:var(--success)">${icons.check} PDF downloaded!</span>`;
  } catch (err) {
    toast('Error generating PDF: ' + err.message, 'error');
    statusEl.innerHTML = '';
  }
}

// ─── Event Orders Tab ──────────────────────
async function renderEventOrdersTab(container) {
  container.innerHTML = loadingHTML();
  const ev = state.currentEvent;
  const orders = await api(`/admin/orders?event_id=${ev.id}`);
  if (!orders) { container.innerHTML = '<p class="text-secondary">Failed to load orders.</p>'; return; }
  state.orders = orders;

  container.innerHTML = `
    <div class="flex-between mb-16" style="flex-wrap:wrap;gap:12px;">
      <div class="filter-bar" style="margin-bottom:0;">
        <select id="order-status-filter" onchange="filterEventOrders()">
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary btn-sm" onclick="openManualOrderModal()">${icons.plus} Manual Order</button>
        <div class="dropdown">
          <button class="btn btn-ghost btn-sm" onclick="toggleDropdown(this)">${icons.download} Export ${icons.chevronDown}</button>
          <div class="dropdown-menu">
            <button class="dropdown-item" onclick="exportOrders('hh')">Export for H&H</button>
            <button class="dropdown-item" onclick="exportOrders('pspa')">Export PSPA</button>
            <button class="dropdown-item" onclick="exportOrders('pixnub')">Export Pixnub</button>
          </div>
        </div>
        <button class="btn btn-success btn-sm" id="bulk-fulfill-btn" style="display:none" onclick="bulkFulfillOrders()">${icons.check} Mark Fulfilled</button>
      </div>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width:40px"><input type="checkbox" class="bulk-checkbox" id="order-select-all" onchange="toggleAllOrders(this)"></th>
            <th>Order #</th>
            <th>Student</th>
            <th>Package</th>
            <th>Amount</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody id="event-orders-tbody">
          ${renderOrderRows(orders)}
        </tbody>
      </table>
    </div>
  `;
}

function renderOrderRows(orders) {
  if (!orders.length) {
    return `<tr><td colspan="8" class="table-empty"><p>No orders found</p></td></tr>`;
  }
  return orders.map(o => {
    const items = o.items || [];
    const studentNames = items.map(i => i.student_name).filter(Boolean).join(', ') || '---';
    const pkgNames = items.map(i => i.package).filter(Boolean).join(', ') || '---';
    return `
    <tr style="cursor:pointer" onclick="showOrderDetail('${o.id}')">
      <td onclick="event.stopPropagation()"><input type="checkbox" class="bulk-checkbox" value="${o.id}" onchange="toggleOrderSelect('${o.id}')"></td>
      <td class="font-bold">#${escapeHtml(o.order_number || String(o.id).slice(0,8))}</td>
      <td>${escapeHtml(studentNames)}</td>
      <td>${escapeHtml(pkgNames)}</td>
      <td>${formatCurrency(o.amount || 0)}</td>
      <td class="text-sm">${escapeHtml(o.payment_method || '---')}</td>
      <td>${statusBadge(o.status || 'none')}</td>
      <td class="text-secondary text-sm">${formatDate(o.created_at)}</td>
    </tr>`;
  }).join('');
}

function filterEventOrders() {
  const status = $('#order-status-filter').value;
  const filtered = status ? state.orders.filter(o => o.status === status) : state.orders;
  $('#event-orders-tbody').innerHTML = renderOrderRows(filtered);
}

function toggleAllOrders(el) {
  const checked = el.checked;
  state.selectedOrderIds.clear();
  $$('#event-orders-tbody .bulk-checkbox').forEach(cb => {
    cb.checked = checked;
    if (checked) state.selectedOrderIds.add(cb.value);
  });
  updateBulkFulfillBtn();
}

function toggleOrderSelect(orderId) {
  if (state.selectedOrderIds.has(orderId)) state.selectedOrderIds.delete(orderId);
  else state.selectedOrderIds.add(orderId);
  updateBulkFulfillBtn();
}

function updateBulkFulfillBtn() {
  const btn = $('#bulk-fulfill-btn');
  if (btn) btn.style.display = state.selectedOrderIds.size > 0 ? 'inline-flex' : 'none';
}

async function bulkFulfillOrders() {
  const ids = Array.from(state.selectedOrderIds);
  const result = await api('/admin/orders/bulk-status', {
    method: 'PUT',
    body: JSON.stringify({ order_ids: ids, status: 'fulfilled' }),
  });
  if (result) {
    toast(`${ids.length} order(s) marked as fulfilled!`);
    state.selectedOrderIds.clear();
    switchTab('orders');
  }
}

function toggleDropdown(btn) {
  const menu = btn.parentElement.querySelector('.dropdown-menu');
  document.querySelectorAll('.dropdown-menu.show').forEach(m => { if (m !== menu) m.classList.remove('show'); });
  menu.classList.toggle('show');
}

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown')) {
    document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
  }
});

async function exportOrders(format) {
  const ev = state.currentEvent;
  const formatMap = { hh: 'hh-csv', pspa: 'pspa', pixnub: 'pixnub' };
  const apiFormat = formatMap[format] || format;
  try {
    const res = await fetch(`/api/admin/export/${apiFormat}?event_id=${ev.id}`, { credentials: 'include' });
    if (!res.ok) { toast('Export failed.', 'error'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ev.name.replace(/\s+/g, '_')}_${format}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Export downloaded!');
  } catch (err) {
    toast('Export error: ' + err.message, 'error');
  }
}

// Manual Order Modal
async function openManualOrderModal() {
  const ev = state.currentEvent;
  if (!state.students.length) {
    const students = await api(`/admin/students?event_id=${ev.id}`);
    state.students = students || [];
  }

  // Standard packages — same as the order form
  const packages = [
    { id: 'A', name: 'Package A - Basic', price_cents: 3500 },
    { id: 'B', name: 'Package B - Standard', price_cents: 5000 },
    { id: 'C', name: 'Package C - Premium', price_cents: 7500 },
    { id: 'D', name: 'Package D - Deluxe', price_cents: 10000 },
  ];
  const addons = [
    { id: 'yearbook', name: 'Yearbook Photo', price_cents: 500 },
    { id: 'digital', name: 'Digital Download', price_cents: 1500 },
    { id: 'class_composite', name: 'Class Composite', price_cents: 1000 },
  ];

  openModal('Create Manual Order', `
    <div class="form-group">
      <label>Student</label>
      <select id="mo-student">
        <option value="">-- Select student --</option>
        ${state.students.map(s => `<option value="${s.id}">${escapeHtml(s.code || '')} - ${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Package</label>
      <div class="package-cards" id="mo-packages">
        ${packages.map(p => `
          <div class="package-card" data-id="${p.id}" data-price="${p.price_cents}" onclick="selectPackage(this)">
            <div class="pkg-name">${escapeHtml(p.name)}</div>
            <div class="pkg-price">${formatCurrency(p.price_cents)}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="form-group">
      <label>Add-ons</label>
      <div id="mo-addons">
        ${addons.map(a => `
          <label class="checkbox-label">
            <input type="checkbox" value="${a.id}" data-price="${a.price_cents}">
            ${escapeHtml(a.name)} (+${formatCurrency(a.price_cents)})
          </label>
        `).join('')}
      </div>
    </div>
    <div class="form-group">
      <label>Background</label>
      <select id="mo-background">
        <option value="">Default</option>
        <option value="F1">F1</option>
        <option value="F2">F2</option>
        <option value="F3">F3</option>
        <option value="F4">F4</option>
        <option value="F5">F5</option>
        <option value="F6">F6</option>
      </select>
    </div>
    <div class="form-group">
      <label>Payment Method</label>
      <select id="mo-payment" onchange="toggleManualPaymentFields()">
        <option value="cash">Cash / Check</option>
        <option value="stripe">Stripe (send payment link)</option>
      </select>
    </div>
    <div id="mo-stripe-fields" class="hidden">
      <div class="form-group">
        <label>Parent Email (for Stripe link)</label>
        <input type="email" id="mo-email" placeholder="parent@example.com">
      </div>
    </div>
    <div class="form-group">
      <label>Total</label>
      <div id="mo-total" class="font-bold" style="font-size:18px;color:var(--accent);">$0.00</div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitManualOrder()">Create Order</button>
  `);
}

let selectedPackageId = null;
let selectedPackagePrice = 0;

function selectPackage(el) {
  $$('.package-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedPackageId = el.dataset.id;
  selectedPackagePrice = parseInt(el.dataset.price) || 0;
  updateManualOrderTotal();
}

function updateManualOrderTotal() {
  let total = selectedPackagePrice;
  $$('#mo-addons input:checked').forEach(cb => {
    total += parseInt(cb.dataset.price) || 0;
  });
  const el = $('#mo-total');
  if (el) el.textContent = formatCurrency(total);
}

function toggleManualPaymentFields() {
  const method = $('#mo-payment').value;
  const fields = $('#mo-stripe-fields');
  if (method === 'stripe') fields.classList.remove('hidden');
  else fields.classList.add('hidden');
}

async function submitManualOrder() {
  const studentId = $('#mo-student').value;
  if (!studentId) { toast('Please select a student.', 'error'); return; }
  if (!selectedPackageId) { toast('Please select a package.', 'error'); return; }

  const addonIds = Array.from($$('#mo-addons input:checked')).map(cb => cb.value);
  const data = {
    student_id: parseInt(studentId),
    package_id: selectedPackageId,
    addon_ids: addonIds,
    background: $('#mo-background').value,
    payment_method: $('#mo-payment').value,
    parent_email: $('#mo-email')?.value || '',
  };

  const result = await api('/admin/orders', { method: 'POST', body: JSON.stringify(data) });
  if (result) {
    toast('Order created!');
    closeModal();
    selectedPackageId = null;
    selectedPackagePrice = 0;
    switchTab('orders');
  }
}

// ─── Composites Tab ────────────────────────
async function renderCompositesTab(container) {
  container.innerHTML = loadingHTML();
  const ev = state.currentEvent;

  const classes = await api(`/admin/composites/classes?event_id=${ev.id}`);

  container.innerHTML = `
    <div class="card" style="max-width:700px;">
      <h3 class="section-title">Class Composite Generator</h3>
      <p class="text-secondary mb-16">Generate print-ready 8x10 class composite PDFs from student portraits.</p>

      ${classes && classes.length ? `
      <div class="form-row">
        <div class="form-group">
          <label>Teacher / Class</label>
          <select id="comp-class" onchange="updateCompositePreview()">
            <option value="">-- Select a class --</option>
            ${classes.map(c => `<option value="${escapeHtml(c.teacher || '')}" data-grade="${escapeHtml(c.grade || '')}">${escapeHtml(c.teacher || 'Unknown')} — ${escapeHtml(c.grade || '?')} (${c.student_count} students)</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>School Name</label>
          <input type="text" id="comp-school" value="${escapeHtml(ev.school || '')}">
        </div>
        <div class="form-group">
          <label>Year</label>
          <input type="text" id="comp-year" value="${new Date().getFullYear()}-${new Date().getFullYear() + 1}">
        </div>
      </div>
      <div class="form-group">
        <label>Background Color</label>
        <input type="color" id="comp-bg" value="#ffffff" style="width:60px;height:36px;cursor:pointer;">
      </div>

      <div id="comp-preview" class="mt-16"></div>

      <div class="btn-group mt-16">
        <button class="btn btn-primary" id="comp-generate-btn" disabled onclick="generateComposite()">${icons.download} Generate PDF</button>
      </div>
      <div id="comp-status" class="mt-16"></div>
      ` : `
      <div class="empty-state">
        ${icons.users}
        <h3>No classes available</h3>
        <p>Students need to have a teacher assigned to generate composites. Import students with teacher info first.</p>
      </div>
      `}
    </div>
  `;
}

async function updateCompositePreview() {
  const select = $('#comp-class');
  const teacher = select.value;
  const grade = select.selectedOptions[0]?.dataset.grade || '';
  const preview = $('#comp-preview');
  const generateBtn = $('#comp-generate-btn');

  if (!teacher) {
    preview.innerHTML = '';
    generateBtn.disabled = true;
    return;
  }

  generateBtn.disabled = false;
  preview.innerHTML = `<p class="text-sm text-secondary">Selected: <strong>${escapeHtml(teacher)}</strong>${grade ? ' — Grade ' + escapeHtml(grade) : ''}</p>`;
}

async function generateComposite() {
  const ev = state.currentEvent;
  const select = $('#comp-class');
  const teacher = select.value;
  const grade = select.selectedOptions[0]?.dataset.grade || '';
  const schoolName = $('#comp-school').value.trim();
  const year = $('#comp-year').value.trim();
  const bgColor = $('#comp-bg').value;
  const statusEl = $('#comp-status');

  if (!teacher) { toast('Please select a class.', 'error'); return; }

  statusEl.innerHTML = `<div class="inline-flex"><span class="spinner"></span> Generating composite PDF...</div>`;

  try {
    const res = await fetch('/api/admin/composites/generate', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: ev.id,
        teacher,
        grade,
        school_name: schoolName,
        year,
        bg_color: bgColor,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast(err.error || 'Failed to generate composite.', 'error');
      statusEl.innerHTML = '';
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schoolName.replace(/\s+/g, '_')}_${teacher.replace(/\s+/g, '_')}_Composite.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    statusEl.innerHTML = `<span class="inline-flex" style="color:var(--success)">${icons.check} Composite PDF downloaded!</span>`;
  } catch (err) {
    toast('Error generating composite: ' + err.message, 'error');
    statusEl.innerHTML = '';
  }
}

// ─── Settings Tab ──────────────────────────
async function renderSettingsTab(container) {
  const ev = state.currentEvent;
  container.innerHTML = `
    <div class="card" style="max-width:600px;">
      <h3 class="section-title">Event Settings</h3>
      <div class="form-group">
        <label>Event Name</label>
        <input type="text" id="set-name" value="${escapeHtml(ev.name || '')}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>School</label>
          <input type="text" id="set-school" value="${escapeHtml(ev.school || '')}">
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="set-date" value="${ev.date || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Model</label>
          <select id="set-model">
            <option value="prepay" ${ev.model === 'prepay' ? 'selected' : ''}>Prepay</option>
            <option value="proof" ${ev.model === 'proof' ? 'selected' : ''}>Proof</option>
            <option value="hybrid" ${ev.model === 'hybrid' ? 'selected' : ''}>Hybrid</option>
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="set-status">
            <option value="draft" ${ev.status === 'draft' ? 'selected' : ''}>Draft</option>
            <option value="active" ${ev.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="closed" ${ev.status === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
        </div>
      </div>
      <div class="btn-group mt-16">
        <button class="btn btn-primary" onclick="updateEventSettings()">Save Changes</button>
        <button class="btn btn-danger" onclick="confirmDeleteEvent()">Delete Event</button>
      </div>
    </div>
  `;
}

async function updateEventSettings() {
  const ev = state.currentEvent;
  const data = {
    name: $('#set-name').value.trim(),
    school: $('#set-school').value.trim(),
    date: $('#set-date').value,
    model: $('#set-model').value,
    status: $('#set-status').value,
  };
  const result = await api(`/admin/events/${ev.id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (result) {
    toast('Event updated!');
    state.currentEvent = { ...ev, ...data };
    renderEventDetail();
  }
}

function openEditEventModal() {
  switchTab('settings');
}

function confirmDeleteEvent() {
  const ev = state.currentEvent;
  openModal('Delete Event', `
    <p class="confirm-message">Are you sure you want to delete <strong>${escapeHtml(ev.name)}</strong>? This will remove all students, images, and orders for this event. This cannot be undone.</p>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-danger" onclick="deleteEvent()">Delete Event</button>
  `);
}

async function deleteEvent() {
  const ev = state.currentEvent;
  const result = await api(`/admin/events/${ev.id}`, { method: 'DELETE' });
  if (result !== null) {
    toast('Event deleted.');
    closeModal();
    state.currentEvent = null;
    navigate('events');
  }
}

// ────────────────────────────────────────────
// VIEW: All Orders
// ────────────────────────────────────────────
async function renderAllOrders() {
  renderHeader('Orders');
  els.body().innerHTML = loadingHTML();

  const [orders, events] = await Promise.all([
    api('/admin/orders'),
    api('/admin/events'),
  ]);
  if (!orders) { els.body().innerHTML = '<p class="text-secondary">Failed to load orders.</p>'; return; }
  state.allOrders = orders;
  state.events = events || [];

  els.body().innerHTML = `
    <div class="filter-bar mb-16">
      <select id="all-order-event-filter" onchange="filterAllOrders()">
        <option value="">All Events</option>
        ${state.events.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}
      </select>
      <select id="all-order-status-filter" onchange="filterAllOrders()">
        <option value="">All Statuses</option>
        <option value="paid">Paid</option>
        <option value="pending">Pending</option>
        <option value="fulfilled">Fulfilled</option>
        <option value="refunded">Refunded</option>
      </select>
      <input type="date" id="all-order-date-from" onchange="filterAllOrders()" placeholder="From">
      <input type="date" id="all-order-date-to" onchange="filterAllOrders()" placeholder="To">
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Student</th>
            <th>Event</th>
            <th>Package</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody id="all-orders-tbody">
          ${renderAllOrderRows(orders)}
        </tbody>
      </table>
    </div>
  `;
}

function renderAllOrderRows(orders) {
  if (!orders.length) {
    return `<tr><td colspan="7" class="table-empty"><p>No orders found</p></td></tr>`;
  }
  return orders.map(o => {
    const items = o.items || [];
    const studentNames = items.map(i => i.student_name).filter(Boolean).join(', ') || '---';
    const pkgNames = items.map(i => i.package).filter(Boolean).join(', ') || '---';
    return `
    <tr style="cursor:pointer" onclick="showOrderDetail('${o.id}')">
      <td class="font-bold">#${escapeHtml(o.order_number || String(o.id).slice(0,8))}</td>
      <td>${escapeHtml(studentNames)}</td>
      <td>${escapeHtml(o.event_name || '---')}</td>
      <td>${escapeHtml(pkgNames)}</td>
      <td>${formatCurrency(o.amount || 0)}</td>
      <td>${statusBadge(o.status || 'none')}</td>
      <td class="text-secondary text-sm">${formatDate(o.created_at)}</td>
    </tr>`;
  }).join('');
}

function filterAllOrders() {
  const eventId = $('#all-order-event-filter').value;
  const status = $('#all-order-status-filter').value;
  const dateFrom = $('#all-order-date-from').value;
  const dateTo = $('#all-order-date-to').value;

  let filtered = state.allOrders;
  if (eventId) filtered = filtered.filter(o => String(o.event_id) === eventId);
  if (status) filtered = filtered.filter(o => o.status === status);
  if (dateFrom) filtered = filtered.filter(o => o.created_at >= dateFrom);
  if (dateTo) filtered = filtered.filter(o => o.created_at <= dateTo + 'T23:59:59');

  $('#all-orders-tbody').innerHTML = renderAllOrderRows(filtered);
}

async function showOrderDetail(orderId) {
  const order = await api(`/admin/orders/${orderId}`);
  if (!order) return;

  const items = order.items || [];

  openModal(`Order #${escapeHtml(order.order_number || String(order.id).slice(0,8))}`, `
    <div class="form-row">
      <div>
        <label class="text-sm text-secondary">Amount</label>
        <p class="font-bold" style="font-size:18px;color:var(--accent)">${formatCurrency(order.amount || 0)}</p>
      </div>
      <div>
        <label class="text-sm text-secondary">Payment</label>
        <p>${escapeHtml(order.payment_method || '---')}</p>
      </div>
    </div>
    <div class="form-row mt-16">
      <div>
        <label class="text-sm text-secondary">Status</label>
        <p>${statusBadge(order.status)}</p>
      </div>
      <div>
        <label class="text-sm text-secondary">Date</label>
        <p>${formatDate(order.created_at)}</p>
      </div>
    </div>
    ${order.parent_name ? `
    <div class="mt-16">
      <label class="text-sm text-secondary">Parent</label>
      <p>${escapeHtml(order.parent_name)}${order.parent_email ? ' &middot; ' + escapeHtml(order.parent_email) : ''}${order.parent_phone ? ' &middot; ' + escapeHtml(order.parent_phone) : ''}</p>
    </div>` : ''}
    ${items.length ? `
    <h4 class="mt-16 mb-8" style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-secondary)">Students</h4>
    <div class="table-container">
      <table>
        <thead><tr><th>Student</th><th>Package</th><th>Background</th><th>Add-ons</th></tr></thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td class="font-bold">${escapeHtml(item.student_name || '---')}</td>
              <td>${escapeHtml(item.package || '---')}</td>
              <td>${escapeHtml(item.background || 'Default')}</td>
              <td>${item.addons && item.addons.length ? item.addons.map(a => escapeHtml(a)).join(', ') : '---'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>` : ''}
    <div class="mt-16 flex-between">
      <div>
        <label class="text-sm text-secondary">Update Status</label>
        <select id="order-detail-status" style="margin-top:4px;">
          ${['paid','submitted_to_lab','fulfilled','refunded'].map(s =>
            `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </div>
      <button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${order.id}')">Update</button>
    </div>
  `);
}

async function navigateToOrder(orderNumber) {
  // Dashboard recent orders show order_number as id; look up the actual order
  // The orders list endpoint is the source of truth
  const orders = await api('/admin/orders');
  if (!orders) return;
  const match = orders.find(o => o.order_number === orderNumber || String(o.id) === orderNumber);
  if (match) showOrderDetail(match.id);
  else toast('Order not found.', 'error');
}

async function updateOrderStatus(orderId) {
  const status = $('#order-detail-status').value;
  const result = await api(`/admin/orders/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
  if (result) {
    toast(`Order status updated to ${status}!`);
    closeModal();
    // Refresh current view
    if (state.currentView === 'orders') renderAllOrders();
    else if (state.currentView === 'event-detail') switchTab('orders');
    else renderDashboard();
  }
}

// ────────────────────────────────────────────
// VIEW: Communications
// ────────────────────────────────────────────
async function renderCommunications() {
  renderHeader('Communications');
  els.body().innerHTML = loadingHTML();

  const events = await api('/admin/events');
  state.events = events || [];

  els.body().innerHTML = `
    <div class="flex-between mb-24" style="flex-wrap:wrap;gap:12px;">
      <div class="form-group" style="margin-bottom:0;min-width:220px;">
        <label>Select Event</label>
        <select id="comm-event-select" onchange="loadCommunications()">
          <option value="">-- Select an event --</option>
          ${state.events.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="comm-content">
      ${emptyStateHTML('Select an Event', 'Choose an event above to view and send communications.')}
    </div>
  `;
}

async function loadCommunications() {
  const eventId = $('#comm-event-select').value;
  const container = $('#comm-content');
  if (!eventId) {
    container.innerHTML = emptyStateHTML('Select an Event', 'Choose an event above to view and send communications.');
    return;
  }

  container.innerHTML = loadingHTML();
  const history = await api(`/admin/communications/history?event_id=${eventId}`);

  state.communications = history || [];

  // Compute counts from student data
  const students = await api(`/admin/students?event_id=${eventId}`);
  const allStudents = students || [];
  const galleryReadyCount = allStudents.filter(s => s.parent_email && !s.gallery_email_sent_at && s.image_count > 0).length;
  const reminderCount = allStudents.filter(s => s.parent_email && s.order_status === 'none' && s.gallery_email_sent_at).length;
  const commStats = { gallery_ready_count: galleryReadyCount, reminder_count: reminderCount };

  container.innerHTML = `
    <div class="stat-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:24px;">
      <div class="card">
        <h4 style="margin-bottom:12px">Gallery Ready Emails</h4>
        <p class="text-secondary mb-16">Notify parents that their child's gallery is ready to view and order from.</p>
        <p class="text-sm text-secondary mb-16">Will send to <strong>${commStats?.gallery_ready_count || 0}</strong> parents</p>
        <button class="btn btn-primary" onclick="confirmSendEmails('gallery_ready', '${eventId}')">${icons.mail} Send Gallery Ready</button>
      </div>
      <div class="card">
        <h4 style="margin-bottom:12px">Order Reminders</h4>
        <p class="text-secondary mb-16">Remind parents who haven't ordered yet that the deadline is approaching.</p>
        <p class="text-sm text-secondary mb-16">Will send to <strong>${commStats?.reminder_count || 0}</strong> parents</p>
        <button class="btn btn-warning" onclick="confirmSendEmails('reminder', '${eventId}')">${icons.mail} Send Reminders</button>
      </div>
    </div>

    <h3 class="section-title">Email History</h3>
    ${state.communications.length ? `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Email Type</th>
            <th>Recipient</th>
            <th>Sent Date</th>
          </tr>
        </thead>
        <tbody>
          ${state.communications.map(c => {
            const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || '---';
            const emailTypes = [];
            if (c.gallery_email_sent_at) emailTypes.push({ type: 'Gallery Ready', date: c.gallery_email_sent_at });
            if (c.reminder_email_sent_at) emailTypes.push({ type: 'Reminder', date: c.reminder_email_sent_at });
            return emailTypes.map(et => `
              <tr>
                <td>${escapeHtml(name)}</td>
                <td>${statusBadge(et.type === 'Gallery Ready' ? 'active' : 'pending')}<span style="margin-left:6px;">${et.type}</span></td>
                <td class="text-secondary">${escapeHtml(c.parent_email || '---')}</td>
                <td class="text-secondary">${formatDate(et.date)}</td>
              </tr>
            `).join('');
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : emptyStateHTML('No emails sent yet', 'Email history will appear here after you send communications.')}
  `;
}

function confirmSendEmails(type, eventId) {
  const label = type === 'gallery_ready' ? 'Gallery Ready emails' : 'Order Reminder emails';
  openModal('Confirm Send', `
    <p class="confirm-message">Are you sure you want to send <strong>${label}</strong> for this event? This will email all eligible parents.</p>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="sendEmails('${type}', '${eventId}')">Send Emails</button>
  `);
}

async function sendEmails(type, eventId) {
  const endpoint = type === 'gallery_ready' ? '/admin/communications/gallery-emails' : '/admin/communications/reminders';
  const result = await api(endpoint, {
    method: 'POST',
    body: JSON.stringify({ event_id: eventId }),
  });
  if (result) {
    toast(`${result.sent || 0} emails sent!`);
    closeModal();
    loadCommunications();
  }
}

// ────────────────────────────────────────────
// VIEW: Analytics
// ────────────────────────────────────────────
async function renderAnalytics() {
  renderHeader('Analytics');
  els.body().innerHTML = loadingHTML();

  const events = await api('/admin/events');
  state.events = events || [];

  els.body().innerHTML = `
    <div class="flex-between mb-24" style="flex-wrap:wrap;gap:12px;">
      <div class="form-group" style="margin-bottom:0;min-width:220px;">
        <label>Select Event</label>
        <select id="analytics-event-select" onchange="loadAnalytics()">
          <option value="">-- All events --</option>
          ${state.events.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="analytics-content">
      ${emptyStateHTML('Select an Event', 'Choose an event above to view analytics.')}
    </div>
  `;
}

async function loadAnalytics() {
  const eventId = $('#analytics-event-select').value;
  const container = $('#analytics-content');

  if (!eventId) {
    container.innerHTML = emptyStateHTML('Select an Event', 'Choose an event above to view analytics.');
    return;
  }

  container.innerHTML = loadingHTML();
  const data = await api(`/admin/analytics?event_id=${eventId}`);
  if (!data) { container.innerHTML = '<p class="text-secondary">Failed to load analytics.</p>'; return; }
  state.analyticsData = data;

  const colors = ['#4361ee', '#2ec4b6', '#ff9f1c', '#e63946', '#7209b7', '#3a0ca3'];

  container.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Revenue</div>
        <div class="stat-value">${formatCurrency(data.total_revenue || 0)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Orders</div>
        <div class="stat-value">${data.order_count || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Order Value</div>
        <div class="stat-value">${formatCurrency(data.avg_order_value || 0)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Conversion Rate</div>
        <div class="stat-value">${(data.conversion_rate || 0).toFixed(1)}%</div>
      </div>
    </div>

    <div class="card mb-24">
      <h3 class="section-title">Package Distribution</h3>
      <div class="bar-chart">
        ${(data.package_distribution || []).map((p, i) => {
          const maxVal = Math.max(...(data.package_distribution || []).map(x => x.count), 1);
          const pct = Math.max((p.count / maxVal) * 100, 2);
          return `
            <div class="bar-row">
              <div class="bar-label">Package ${escapeHtml(p.package || p.name || '?')}</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${pct}%;background:${colors[i % colors.length]}">${p.count}</div>
              </div>
              <div class="bar-value">${formatCurrency(p.revenue || 0)}</div>
            </div>
          `;
        }).join('') || '<p class="text-secondary">No data yet</p>'}
      </div>
    </div>

    <div class="card">
      <h3 class="section-title">Orders by Day</h3>
      <div class="bar-chart">
        ${(data.orders_by_day || []).map((d, i) => {
          const cnt = d.order_count || d.count || 0;
          const maxVal = Math.max(...(data.orders_by_day || []).map(x => x.order_count || x.count || 0), 1);
          const pct = Math.max((cnt / maxVal) * 100, 2);
          return `
            <div class="bar-row">
              <div class="bar-label">${formatDate(d.date)}</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${pct}%;background:var(--accent)">${cnt} order${cnt !== 1 ? 's' : ''}</div>
              </div>
              <div class="bar-value">${formatCurrency(d.revenue || 0)}</div>
            </div>
          `;
        }).join('') || '<p class="text-secondary">No data yet</p>'}
      </div>
    </div>
  `;
}

// ────────────────────────────────────────────
// VIEW: Student Detail
// ────────────────────────────────────────────
function showStudentDetail(studentId) {
  navigate('student-detail', { studentId });
}

async function renderStudentDetail(studentId) {
  renderHeader('Student Detail');
  els.body().innerHTML = loadingHTML();

  const student = await api(`/admin/students/${studentId}`);
  if (!student) { els.body().innerHTML = '<p class="text-secondary">Student not found.</p>'; return; }

  const images = student.images || [];

  // Try to load order details if student has an order
  let order = null;
  if (student.order_id) {
    order = await api(`/admin/orders/${student.order_id}`);
  }

  const ev = state.currentEvent;
  const breadcrumbs = [];
  if (ev) {
    breadcrumbs.push(
      { label: 'Events', onclick: "navigate('events')" },
      { label: ev.name, onclick: `navigate('event-detail', { event: state.currentEvent })` },
      { label: `${student.first_name} ${student.last_name}`, onclick: '' }
    );
  }

  renderHeaderWithActions(
    `${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}`,
    `<button class="btn btn-ghost btn-sm" onclick="openAddStudentModal(${JSON.stringify(student).replace(/"/g, '&quot;')})">${icons.edit} Edit</button>`,
    breadcrumbs
  );

  const orderItems = order ? (order.items || []) : [];

  els.body().innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
      <div class="card">
        <h3 class="section-title">Student Info</h3>
        <div class="detail-grid">
          <div><label class="text-sm text-secondary">Code</label><p class="font-bold">${escapeHtml(student.code || '---')}</p></div>
          <div><label class="text-sm text-secondary">Grade</label><p>${escapeHtml(student.grade || '---')}</p></div>
          <div><label class="text-sm text-secondary">Teacher</label><p>${escapeHtml(student.teacher || '---')}</p></div>
          <div><label class="text-sm text-secondary">Order Status</label><p>${statusBadge(student.order_status || 'none')}</p></div>
        </div>
      </div>
      <div class="card">
        <h3 class="section-title">Parent Info</h3>
        <div class="detail-grid">
          <div><label class="text-sm text-secondary">Name</label><p>${escapeHtml(student.parent_name || '---')}</p></div>
          <div><label class="text-sm text-secondary">Email</label><p>${escapeHtml(student.parent_email || '---')}</p></div>
          <div><label class="text-sm text-secondary">Phone</label><p>${escapeHtml(student.parent_phone || '---')}</p></div>
        </div>
      </div>
    </div>

    ${order ? `
    <div class="card mt-24">
      <h3 class="section-title">Order Details — #${escapeHtml(order.order_number || '')}</h3>
      <div class="detail-grid mb-16">
        <div><label class="text-sm text-secondary">Amount</label><p class="font-bold" style="color:var(--accent)">${formatCurrency(order.amount || 0)}</p></div>
        <div><label class="text-sm text-secondary">Status</label><p>${statusBadge(order.status)}</p></div>
        <div><label class="text-sm text-secondary">Payment</label><p>${escapeHtml(order.payment_method || '---')}</p></div>
        <div><label class="text-sm text-secondary">Date</label><p>${formatDate(order.created_at)}</p></div>
      </div>
      ${orderItems.length ? `
      <div class="table-container">
        <table>
          <thead><tr><th>Package</th><th>Background</th><th>Add-ons</th></tr></thead>
          <tbody>
            ${orderItems.filter(i => String(i.student_id) === String(studentId)).map(item => `
              <tr>
                <td>${escapeHtml(item.package || '---')}</td>
                <td>${escapeHtml(item.background || 'Default')}</td>
                <td>${item.addons && item.addons.length ? item.addons.map(a => escapeHtml(a)).join(', ') : '---'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>` : `
    <div class="card mt-24">
      <h3 class="section-title">Order</h3>
      <p class="text-secondary">No order placed yet.</p>
    </div>`}

    <div class="card mt-24">
      <h3 class="section-title">Images (${images.length})</h3>
      ${images.length ? `
      <div class="image-grid">
        ${images.map(img => `
          <div class="image-thumb">
            <img src="/api/admin/images/${img.id}" alt="Student photo" loading="lazy">
          </div>
        `).join('')}
      </div>` : '<p class="text-secondary">No images uploaded yet.</p>'}
    </div>
  `;
}

// ────────────────────────────────────────────
// Initialization
// ────────────────────────────────────────────
function init() {
  // Login form handler
  els.loginForm().addEventListener('submit', handleLogin);

  // Logout handler
  els.logoutBtn().addEventListener('click', handleLogout);

  // Hamburger
  els.hamburger().addEventListener('click', openSidebar);
  els.backdrop().addEventListener('click', closeSidebar);

  // Keyboard: Escape to close modal/sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!els.modalOverlay().classList.contains('hidden')) closeModal();
      closeSidebar();
    }
  });

  // Check auth on load
  checkAuth();
}

async function checkAuth() {
  const res = await api('/admin/auth/check');
  if (res && res.authenticated) {
    hideLogin();
    navigate('dashboard');
  } else {
    showLogin();
  }
}

// Addon checkbox listeners (delegated)
document.addEventListener('change', (e) => {
  if (e.target.closest('#mo-addons')) {
    updateManualOrderTotal();
  }
});

// Run
init();
