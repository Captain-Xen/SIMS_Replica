// ============================================================
// App shell — login, sidebar, header, router, search, idle timer.
// ============================================================
import { icon } from './icons.js'
import { DB, uid, timeAgo } from './data.js'
import { esc, toast, openDialog, closeDialog, confirmDialog, store, finishView, setGo, avatarHtml } from './ui.js'

export const NAV = [
  { id: 'dashboard', label: 'Dashboard', ic: 'layout-dashboard', roles: [] },
  { id: 'profile', label: 'My Profile', ic: 'circle-user', roles: [] },
  { id: 'subjects', label: 'My Subjects', ic: 'book-open', roles: ['Teacher'] },
  { id: 'add', label: 'Add Record', ic: 'user-plus', roles: ['Admin', 'Principal'] },
  { id: 'students', label: 'Students', ic: 'users', roles: ['Admin', 'Principal', 'Vice Principal', 'Teacher', 'Nurse'] },
  { id: 'staff', label: 'Staff Management', ic: 'badge-check', roles: ['Admin', 'Principal'] },
  { id: 'grades', label: 'Academics & Grades', ic: 'clipboard-list', roles: ['Teacher', 'Admin', 'Student'] },
  { id: 'attendance', label: 'Attendance', ic: 'clipboard-check', roles: ['Teacher', 'Admin', 'Student'] },
  { id: 'timetable', label: 'Timetable', ic: 'calendar-clock', roles: ['Student', 'Teacher'] },
  { id: 'fees', label: 'Fee Management', ic: 'dollar-sign', roles: ['Admin', 'Student'] },
  { id: 'announcements', label: 'Announcements', ic: 'megaphone', roles: ['Admin', 'Principal', 'Student', 'Teacher'] },
  { id: 'discipline', label: 'Discipline', ic: 'gavel', roles: ['Principal', 'Vice Principal', 'Admin'] },
  { id: 'messages', label: 'Messages', ic: 'mail', roles: [] },
  { id: 'assignments', label: 'Assignments', ic: 'clipboard-check', roles: ['Teacher', 'Student'] },
  { id: 'library', label: 'Library', ic: 'library', roles: [] },
  { id: 'events', label: 'Events Calendar', ic: 'calendar-days', roles: [] },
  { id: 'parent-portal', label: 'Parent Portal', ic: 'heart-handshake', roles: ['Student'] },
  { id: 'reports', label: 'Reports', ic: 'file-text', roles: ['Admin', 'Principal', 'Teacher', 'Student'] },
  { id: 'analytics', label: 'Analytics', ic: 'bar-chart-3', roles: ['Admin', 'Principal', 'Teacher'] },
  { id: 'exams', label: 'Exams', ic: 'graduation-cap', roles: ['Admin', 'Principal', 'Teacher', 'Student'] },
  { id: 'health', label: 'Health Records', ic: 'heart-pulse', roles: ['Nurse', 'Admin', 'Principal'] },
  { id: 'transport', label: 'Transportation', ic: 'bus', roles: ['Admin', 'Principal', 'Student'] },
  { id: 'cafeteria', label: 'Cafeteria', ic: 'utensils-crossed', roles: ['Admin', 'Principal', 'Student'] },
  { id: 'alumni', label: 'Alumni', ic: 'graduation-cap', roles: ['Admin', 'Principal'] },
  { id: 'visitors', label: 'Visitors', ic: 'user-check', roles: ['Admin', 'Principal', 'Ancillary Staff'] },
  { id: 'inventory', label: 'Inventory', ic: 'package-open', roles: ['Admin', 'Principal'] },
  { id: 'facilities', label: 'Facilities', ic: 'door-open', roles: ['Admin', 'Principal', 'Teacher'] },
  { id: 'admissions', label: 'Admissions', ic: 'clipboard-paste', roles: ['Admin', 'Principal'] },
  { id: 'terms', label: 'Terms & Calendar', ic: 'calendar-range', roles: ['Admin', 'Principal', 'Teacher'] },
  { id: 'performance', label: 'Performance', ic: 'star', roles: ['Admin', 'Principal', 'Teacher'] },
  { id: 'finance', label: 'Finance', ic: 'wallet', roles: ['Admin', 'Principal'] },
  { id: 'conference', label: 'Conferences', ic: 'calendar-clock', roles: ['Admin', 'Principal', 'Teacher', 'Student'] },
  { id: 'activities', label: 'Activities', ic: 'trophy', roles: ['Admin', 'Principal', 'Teacher', 'Student'] },
  { id: 'uniform', label: 'Uniform', ic: 'shirt', roles: ['Admin', 'Principal', 'Student'] },
  { id: 'notifications', label: 'Notifications', ic: 'bell', roles: [] },
  { id: 'import', label: 'Bulk Import', ic: 'upload', roles: ['Admin'] },
  { id: 'settings', label: 'System Settings', ic: 'settings', roles: ['Admin'] },
  { id: 'help', label: 'Help & FAQ', ic: 'help-circle', roles: [] },
]
export const VIEW_TITLES = Object.fromEntries([
  ['dashboard', 'Dashboard'], ['profile', 'My Profile'], ['subjects', 'My Subjects'], ['add', 'Add Record'],
  ['students', 'Students'], ['staff', 'Staff Management'], ['grades', 'Academics & Grades'], ['attendance', 'Attendance'],
  ['timetable', 'Timetable'], ['fees', 'Fee Management'], ['announcements', 'Announcements'], ['discipline', 'Discipline Module'],
  ['messages', 'Messages'], ['assignments', 'Assignments'], ['notifications', 'Notifications'], ['library', 'Library'],
  ['events', 'Events Calendar'], ['parent-portal', 'Parent Portal'], ['reports', 'Reports & Transcripts'], ['analytics', 'School Analytics'],
  ['exams', 'Exam Management'], ['health', 'Health Records'], ['transport', 'Transportation'], ['cafeteria', 'Cafeteria'],
  ['alumni', 'Alumni'], ['visitors', 'Visitor Management'], ['inventory', 'Inventory'], ['facilities', 'Facilities Booking'],
  ['admissions', 'Admissions'], ['terms', 'Terms & Calendar'], ['performance', 'Staff Performance'], ['finance', 'School Finance'],
  ['conference', 'Parent-Teacher Conferences'], ['activities', 'School Activities'], ['uniform', 'Uniform Management'],
  ['import', 'Bulk Import'], ['settings', 'System Settings'], ['help', 'Help & FAQ'],
])
const ALWAYS_ON = ['dashboard', 'profile', 'settings', 'help', 'notifications']
export const navForRole = (role) => NAV.filter((n) => (n.roles.length === 0 || n.roles.includes(role)) && DB.data.settings.features[n.id] !== false)
export const isHideable = (id) => !ALWAYS_ON.includes(id)

// ---------- accent (theme engine mirror) ----------
export function applyAccent(accent) {
  const DEF = '5,150,105|4,120,87|16,185,129'
  const raw = accent && accent.trim() ? accent.trim() : DEF
  const [p = '', , s = ''] = raw.split('|')
  const ok = (v) => { const a = v.split(',').map(Number); return a.length === 3 && a.every((n) => n >= 0 && n <= 255) ? `rgb(${a[0]} ${a[1]} ${a[2]})` : null }
  const root = document.documentElement
  root.style.setProperty('--brand-base', ok(p) || ok(DEF.split('|')[0]))
  root.style.setProperty('--brand-strong-base', ok(s) || ok(DEF.split('|')[2]))
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function toggleTheme() {
  const next = store.theme === 'dark' ? 'light' : 'dark'
  const swap = () => { store.theme = next; applyTheme(next); store.save() }
  if (document.startViewTransition) document.startViewTransition(swap)
  else swap()
  const btns = document.querySelectorAll('[data-theme-ic]')
  btns.forEach((b) => { b.innerHTML = icon(next === 'dark' ? 'sun' : 'moon', '', 20) })
}

export function unreadCount() {
  return DB.data.notifications.filter((n) => n.userId === store.user?.id && !n.read).length
}

// ---------- login screen ----------
export function renderLogin() {
  const root = document.getElementById('app')
  const s = DB.data.settings
  root.innerHTML = `
  <div class="login-page">
    <div class="blob blob-a"></div><div class="blob blob-b"></div>
    <button class="login-theme" data-theme-ic aria-label="Toggle theme">${icon(store.theme === 'dark' ? 'sun' : 'moon', '', 20)}</button>
    <div class="glass login-card" id="login-card"></div>
    <footer class="login-foot">
      <p>© 2026 Xen LabsJM. All Rights Reserved. Free Digital Tools for Education</p>
      <p class="row gap-1"><span>Developed by Xen</span><span aria-hidden="true">·</span>
        <a href="https://github.com/Captain-Xen" target="_blank" rel="noopener noreferrer">${icon('github', '', 14)} GitHub</a></p>
    </footer>
  </div>`
  renderLoginForm('login')
  root.querySelector('[data-theme-ic]').onclick = toggleTheme
}

function renderLoginForm(mode, portal = 'Staff') {
  const card = document.getElementById('login-card')
  if (!card) return
  const s = DB.data.settings
  const schoolName = esc(s.name || 'School Name')
  const logo = s.logo ? `<img src="${s.logo}" alt="School logo">` : icon('graduation-cap', '', 42)
  const swap = (m, p) => { renderLoginForm(m, p); const c = document.getElementById('login-card'); c?.classList.remove('swap-in'); void c?.offsetWidth; c?.classList.add('swap-in') }

  let inner = ''
  if (mode === 'login') {
    inner = `
    <div class="portal-tabs">
      ${['Staff', 'Student'].map((p) => `<button class="portal-tab ${portal === p ? 'active' : ''}" data-portal="${p}">${icon(p === 'Staff' ? 'shield-check' : 'graduation-cap', '', 16)} ${p} Portal</button>`).join('')}
    </div>
    <form id="login-form" class="stack-4">
      <div><label class="label" for="l-email">Email</label>
        <div class="input-wrap">${icon('mail', 'input-ic', 16)}<input id="l-email" class="input has-ic" type="email" required placeholder="you@edu.edu" value="${portal === 'Student' ? '' : ''}"></div></div>
      <div><label class="label" for="l-pass">Password</label>
        <div class="input-wrap">${icon('lock', 'input-ic', 16)}<input id="l-pass" class="input has-ic" type="password" required placeholder="••••••••"></div></div>
      <button class="btn btn-brand btn-block" style="padding:.625rem" type="submit">${icon('log-in', '', 16)} Sign In</button>
      <div class="row center gap-2 text-sm" style="padding-top:.5rem;justify-content:center">
        <button type="button" class="btn-link" data-mode="register">Register New User</button>
        <span class="muted">·</span>
        <button type="button" class="btn-link" data-mode="forgot">Forgot Password?</button>
      </div>
    </form>
    <div class="demo-box">
      <p class="demo-box-title">Demo accounts — click to autofill</p>
      <div class="demo-grid">
        ${[['Admin', 'admin@edu.edu', 'admin123', 'Staff'], ['Teacher', 'staff@edu.edu', 'staff123', 'Staff'], ['Student', 'student@edu.edu', 'student123', 'Student']]
          .map((a) => `<button class="demo-btn" data-fill="${a[1]}" data-pass="${a[2]}" data-portal-fill="${a[3]}"><span class="font-semibold">${a[0]}</span></button>`).join('')}
      </div>
    </div>`
  } else if (mode === 'register') {
    inner = `
    <div class="row gap-2 mb-4">${icon('user-plus', 'brand-text', 20)}<h2 class="serif text-xl font-semibold">Create Account</h2></div>
    <form id="reg-form" class="stack-4">
      <div><label class="label" for="r-name">Full Name</label><div class="input-wrap">${icon('user', 'input-ic', 16)}<input id="r-name" class="input has-ic" required placeholder="Jane Doe"></div></div>
      <div><label class="label" for="r-email">Email</label><div class="input-wrap">${icon('mail', 'input-ic', 16)}<input id="r-email" type="email" class="input has-ic" required placeholder="you@edu.edu"></div></div>
      <div><label class="label" for="r-pass">Password</label><div class="input-wrap">${icon('lock', 'input-ic', 16)}<input id="r-pass" type="password" class="input has-ic" required placeholder="••••••••"></div></div>
      <div><label class="label">I am a...</label>
        <div class="role-pick" id="role-pick">
          <button type="button" data-role="Student" class="active">${icon('graduation-cap', '', 16)} Student</button>
          <button type="button" data-role="Teacher">${icon('shield-check', '', 16)} Teacher</button>
        </div></div>
      <button class="btn btn-brand btn-block" style="padding:.625rem" type="submit">${icon('user-plus', '', 16)} Create Account</button>
      <button type="button" class="btn-link btn-block text-center" data-mode="login">Back to Login</button>
    </form>`
  } else {
    inner = `
    <div class="row gap-2 mb-2">${icon('key-round', 'brand-text', 20)}<h2 class="serif text-xl font-semibold">Reset Password</h2></div>
    <p class="muted text-sm mb-4">Enter your email and we'll send you a reset link.</p>
    <form id="forgot-form" class="stack-4">
      <div><label class="label" for="f-email">Email</label><div class="input-wrap">${icon('mail', 'input-ic', 16)}<input id="f-email" type="email" class="input has-ic" required placeholder="you@edu.edu"></div></div>
      <button class="btn btn-brand btn-block" style="padding:.625rem" type="submit">${icon('mail', '', 16)} Send Reset Link</button>
      <button type="button" class="btn-link row center gap-1" data-mode="login" style="justify-content:center">${icon('arrow-left', '', 14)} Back to Login</button>
    </form>`
  }

  card.innerHTML = `
    <div class="stack" style="align-items:center;text-align:center;margin-bottom:1.5rem">
      <div class="login-logo">${logo}</div>
      <h1 class="login-school">${schoolName}</h1>
      <p class="login-tagline">${esc(s.tagline || 'School Information Management System (SIMS)')}</p>
    </div>` + inner

  card.querySelectorAll('[data-portal]').forEach((b) => { b.onclick = () => swap('login', b.dataset.portal) })
  card.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => swap(b.dataset.mode, portal) })
  card.querySelectorAll('[data-fill]').forEach((b) => {
    b.onclick = () => {
      swap('login', b.dataset.portalFill)
      requestAnimationFrame(() => {
        const em = document.getElementById('l-email'), pw = document.getElementById('l-pass')
        if (em && pw) {
          em.value = b.dataset.fill; pw.value = b.dataset.pass
          em.closest('.input-wrap').classList.add('flash'); setTimeout(() => em.closest('.input-wrap').classList.remove('flash'), 600)
        }
      })
    }
  })
  const roleButtons = card.querySelectorAll('#role-pick button')
  let regRole = 'Student'
  roleButtons.forEach((b) => { b.onclick = () => { regRole = b.dataset.role; roleButtons.forEach((x) => x.classList.toggle('active', x === b)) } })

  card.querySelector('#login-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const email = document.getElementById('l-email').value.trim().toLowerCase()
    const pass = document.getElementById('l-pass').value
    const acct = DB.data.staff.find((u) => u.email.toLowerCase() === email && u.password === pass)
    if (acct) {
      store.user = { id: acct.id, name: acct.name, email: acct.email, role: acct.role, accountType: 'demo', avatar: acct.avatar, bio: acct.bio, phone: acct.phone, department: acct.department, subjects: acct.subjects, points: acct.points ?? 0, level: acct.level ?? 1, badges: acct.badges ?? 0 }
      store.view = 'dashboard'
      store.save()
      renderApp()
      toast('success', `Welcome back, ${acct.name.split(' ')[0]}!`, `Signed in as ${acct.role}.`)
    } else {
      const stu = DB.data.students.find((u) => u.email.toLowerCase() === email)
      if (stu && pass === 'student123') {
        store.user = { id: stu.id, name: stu.name, email: stu.email, role: 'Student', accountType: 'demo', avatar: null, grade: stu.grade, className: stu.className, admissionNo: stu.admissionNo, guardian: stu.guardian, points: 196, level: 2, badges: 3 }
        store.view = 'dashboard'; store.save(); renderApp()
        toast('success', `Welcome back, ${stu.name.split(' ')[0]}!`, 'Signed in as Student.')
      } else toast('error', 'Sign in failed', 'Invalid email or password.')
    }
  })
  card.querySelector('#reg-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const name = document.getElementById('r-name').value.trim()
    const email = document.getElementById('r-email').value.trim()
    if (DB.data.staff.some((u) => u.email.toLowerCase() === email) || DB.data.students.some((u) => u.email.toLowerCase() === email)) {
      toast('error', 'Registration failed', 'An account with this email already exists.'); return
    }
    if (regRole === 'Teacher') {
      DB.data.staff.push({ id: uid('staff'), email, name, password: document.getElementById('r-pass').value, role: 'Teacher', department: 'General', phone: '', bio: '', subjects: [], status: 'Active', avatar: null, points: 0, level: 1, badges: 0 })
    } else {
      DB.data.students.push({ id: uid('stu'), email, name, dob: '', gender: '', bloodGroup: '', admissionNo: 'EDU-' + String(DB.data.students.length + 1).padStart(3, '0'), grade: 7, className: '7A', guardian: '', phone: '', status: 'Active', feeStatus: 'Pending' })
    }
    DB.save()
    store.user = { id: regRole === 'Teacher' ? 'new-t' : 'new-s', name, email, role: regRole, accountType: 'real', avatar: null, points: 0, level: 1, badges: 0 }
    store.view = 'dashboard'; store.save(); renderApp()
    toast('success', 'Account created!', `Welcome to ${s.name || 'School Name'}, ${name.split(' ')[0]}.`)
  })
  card.querySelector('#forgot-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    toast('success', 'Reset link sent', `Check ${document.getElementById('f-email').value} for instructions.`)
    swap('login', portal)
  })
}

// ---------- app shell ----------
let viewModules = {}
async function loadViewModule(view) {
  const group = ['dashboard', 'profile'].includes(view) ? 'core'
    : ['students', 'staff', 'add', 'admissions', 'alumni', 'visitors'].includes(view) ? 'people'
    : ['grades', 'attendance', 'timetable', 'subjects', 'exams', 'assignments', 'reports', 'analytics', 'performance', 'conference', 'parent-portal', 'terms'].includes(view) ? 'academics'
    : 'operations'
  if (!viewModules[group]) viewModules[group] = await import('./views/' + group + '.js')
  return viewModules[group]
}

export function renderApp() {
  const root = document.getElementById('app')
  root.innerHTML = shellHtml()
  bindShell()
  applyAccent(DB.data.settings.accent)
  go(store.view || 'dashboard')
}

function shellHtml() {
  const u = store.user
  const nav = navForRole(u.role)
  const s = DB.data.settings
  const unread = unreadCount()
  const navBtn = (n) => `
    <button class="nav-item ${store.view === n.id ? 'active' : ''}" data-nav="${n.id}" ${store.view === n.id ? '' : ''} title="${esc(n.label)}">
      ${store.view === n.id && n.id !== 'notifications' ? '<span class="nav-indicator"></span>' : ''}
      ${icon(n.ic, 'nav-ic', 20)}
      <span class="nav-label">${esc(n.label)}</span>
      ${n.id === 'notifications' && unread > 0 ? `<span class="nav-badge">${unread > 9 ? '9+' : unread}</span>` : ''}
      ${n.id === 'notifications' && unread > 0 && store.sidebarCollapsed ? '<span class="nav-dot"></span>' : ''}
    </button>`
  return `
  <div class="shell">
    <div class="shell-body">
      <aside class="sidebar ${store.sidebarCollapsed ? 'collapsed' : ''}" id="sidebar">
        <button class="sidebar-logo" data-nav="dashboard">
          <span class="logo-badge">${s.logo ? `<img src="${s.logo}" alt="School">` : icon('graduation-cap', '', 20)}</span>
          <span class="sidebar-logo-text">
            <span class="sidebar-school">${esc(s.name || 'School Name')}</span>
            <span class="sidebar-portal">${esc(u.role)} Portal ${u.accountType === 'demo' ? '<span class="badge badge-demo" style="font-size:8px;padding:0 4px">Demo</span>' : ''}</span>
          </span>
        </button>
        <nav class="sidebar-nav">${nav.map(navBtn).join('')}</nav>
        <div class="sidebar-foot">
          <button class="nav-item nav-logout ${store.sidebarCollapsed ? '' : ''}" data-logout title="Logout">${icon('log-out', 'nav-ic', 20)}<span class="nav-label">Logout</span></button>
        </div>
      </aside>
      <div style="display:flex;min-width:0;flex:1;flex-direction:column">
        <header class="header">
          <button class="icon-btn menu-btn" id="mobile-menu" aria-label="Open menu">${icon('menu', '', 20)}</button>
          <button class="icon-btn hide-md-down" id="toggle-sidebar" aria-label="Toggle sidebar">${icon(store.sidebarCollapsed ? 'panel-left-open' : 'panel-left-close', '', 20)}</button>
          <h1 class="header-title" id="view-title">${esc(VIEW_TITLES[store.view] || 'Dashboard')}</h1>
          <div class="header-actions">
            <button class="search-trigger" id="open-search">${icon('search', '', 16)}<span>Search...</span><kbd>⌘K</kbd></button>
            <button class="icon-btn" data-theme-ic aria-label="Toggle theme">${icon(store.theme === 'dark' ? 'sun' : 'moon', '', 20)}</button>
            <button class="icon-btn" id="bell-btn" aria-label="Notifications">${icon('bell', '', 20)}${unread > 0 ? `<span class="bell-dot">${unread > 9 ? '9+' : unread}</span>` : ''}</button>
            <span class="header-sep hide-md-down"></span>
            ${u.accountType === 'demo' ? '<span class="demo-pill">Demo Account</span>' : ''}
            <button class="header-user" id="profile-btn">
              ${avatarHtml(u.name, u.role, 'av-8')}
              <span class="hide-md-down" style="text-align:left"><span class="header-user-name" style="display:block">${esc(u.name)}</span><span class="header-user-role" style="display:block">${esc(u.role)}</span></span>
            </button>
          </div>
        </header>
        <main class="main"><div id="view" class="anim-view"></div></main>
      </div>
    </div>
    <footer class="footer"><div class="footer-inner">
      <p>© 2026 Xen LabsJM. All Rights Reserved. Free Digital Tools for Education</p>
      <p class="row gap-1" style="justify-content:center"><span>Developed by Xen</span><span aria-hidden="true">·</span>
        <a href="https://github.com/Captain-Xen" target="_blank" rel="noopener noreferrer">${icon('github', '', 14)} GitHub</a></p>
    </div></footer>
    <div class="toasts" id="toasts"></div>
    <div id="overlays"></div>
  </div>`
}

function bindShell() {
  const root = document.getElementById('app')
  root.querySelector('[data-theme-ic]').onclick = toggleTheme
  root.querySelector('#mobile-menu').onclick = openMobileNav
  root.querySelector('#toggle-sidebar').onclick = () => {
    store.sidebarCollapsed = !store.sidebarCollapsed
    store.save()
    document.getElementById('sidebar').classList.toggle('collapsed', store.sidebarCollapsed)
    document.getElementById('toggle-sidebar').innerHTML = icon(store.sidebarCollapsed ? 'panel-left-open' : 'panel-left-close', '', 20)
  }
  root.querySelector('#bell-btn').onclick = () => go('notifications')
  root.querySelector('#profile-btn').onclick = () => go('profile')
  root.querySelector('#open-search').onclick = openSearch
  root.querySelectorAll('[data-nav]').forEach((b) => { b.onclick = () => go(b.dataset.nav) })
  root.querySelector('[data-logout]').onclick = () => confirmDialog('Sign out?', 'You will be returned to the login screen. You can sign back in any time.', 'Logout', doLogout, true)
  window.onkeydown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch() }
    if (e.key === 'Escape') closeDialog() || closeSearch()
  }
  armIdleTimer()
}

export function doLogout(auto = false) {
  store.user = null
  store.view = 'dashboard'
  store.save()
  renderLogin()
  toast(auto ? 'warning' : 'info', auto ? 'Logged out (idle)' : 'Signed out', auto ? 'You were inactive for too long.' : 'See you soon!')
}

// ---------- navigation ----------
setGo(go)
export async function go(view) {
  if (!store.user) return
  const nav = navForRole(store.user.role)
  if (!nav.some((n) => n.id === view)) view = 'dashboard'
  store.view = view
  const title = document.getElementById('view-title')
  if (title) title.textContent = VIEW_TITLES[view] || 'Dashboard'
  document.querySelectorAll('[data-nav]').forEach((b) => {
    const on = b.dataset.nav === view
    b.classList.toggle('active', on)
    if (on && !b.classList.contains('nav-logout') && !store.sidebarCollapsed) {
      if (!b.querySelector('.nav-indicator')) b.insertAdjacentHTML('afterbegin', '<span class="nav-indicator"></span>')
    } else b.querySelector('.nav-indicator')?.remove()
  })
  const bell = document.getElementById('bell-btn')
  if (bell) {
    const un = unreadCount()
    bell.innerHTML = icon('bell', '', 20) + (un > 0 ? `<span class="bell-dot">${un > 9 ? '9+' : un}</span>` : '')
  }
  const nb = document.querySelector(`.nav-item[data-nav="notifications"] .nav-badge`)
  const un = unreadCount()
  if (nb) nb.textContent = un > 9 ? '9+' : un
  window.scrollTo(0, 0)
  const mount = document.getElementById('view')
  mount.className = 'anim-view'
  mount.innerHTML = `<div class="view-loading"><svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></div>`
  const mod = await loadViewModule(view)
  if (store.view !== view) return // user navigated away while loading
  mount.innerHTML = ''
  mod.render(view, mount)
  finishView(mount)
}

export function refreshBell() {
  if (!store.user) return
  const bell = document.getElementById('bell-btn')
  const un = unreadCount()
  if (bell) bell.innerHTML = icon('bell', '', 20) + (un > 0 ? `<span class="bell-dot">${un > 9 ? '9+' : un}</span>` : '')
  const badge = document.querySelector('.nav-item[data-nav="notifications"] .nav-badge')
  if (badge) badge.textContent = un > 9 ? '9+' : un
}

// ---------- mobile nav ----------
function openMobileNav() {
  const u = store.user
  const s = DB.data.settings
  const nav = navForRole(u.role)
  const un = unreadCount()
  const ov = document.createElement('div')
  ov.id = 'mobile-nav'
  ov.innerHTML = `<div class="sheet-overlay"></div><div class="sheet">
    <div class="sheet-head">
      <span class="logo-badge">${s.logo ? `<img src="${s.logo}" alt="">` : icon('graduation-cap', '', 20)}</span>
      <span class="sheet-title">${esc(s.name || 'School Name')}</span>
      ${u.accountType === 'demo' ? '<span class="badge badge-demo" style="font-size:9px">Demo</span>' : ''}
    </div>
    <nav class="sidebar-nav">${nav.map((n) => `
      <button class="nav-item ${store.view === n.id ? 'active' : ''}" data-mnav="${n.id}">
        ${icon(n.ic, 'nav-ic', 20)}<span class="nav-label">${esc(n.label)}</span>
        ${n.id === 'notifications' && un > 0 ? `<span class="nav-badge">${un > 9 ? '9+' : un}</span>` : ''}
      </button>`).join('')}
    </nav>
    <div class="sidebar-foot"><button class="nav-item nav-logout" data-mlogout>${icon('log-out', 'nav-ic', 20)}<span class="nav-label">Logout</span></button></div>
  </div>`
  document.body.appendChild(ov)
  ov.querySelector('.sheet-overlay').onclick = () => ov.remove()
  ov.querySelectorAll('[data-mnav]').forEach((b) => { b.onclick = () => { ov.remove(); go(b.dataset.mnav) } })
  ov.querySelector('[data-mlogout]').onclick = () => { ov.remove(); confirmDialog('Sign out?', 'You will be returned to the login screen.', 'Logout', doLogout) }
}

// ---------- search ----------
function closeSearch() { document.getElementById('search-modal')?.remove() }

function openSearch() {
  closeSearch()
  const u = store.user
  const el = document.createElement('div')
  el.id = 'search-modal'
  el.innerHTML = `<div class="sheet-overlay" style="z-index:69"></div>
  <div class="search-modal" style="z-index:70">
    <div class="search-input-row">${icon('search', 'muted', 18)}<input class="search-input" id="search-input" placeholder="Search pages, students, staff, announcements...">
      <kbd>Esc</kbd></div>
    <div class="search-results" id="search-results"></div>
  </div>`
  el.querySelector('.sheet-overlay').onclick = closeSearch
  document.body.appendChild(el)
  const input = el.querySelector('#search-input')
  input.focus()
  const results = el.querySelector('#search-results')

  const jump = (v, arg) => {
    closeSearch()
    if (v === 'profile') { store.viewUserId = arg; }
    go(v)
  }
  window.__searchJump = jump

  function renderResults() {
    const q = input.value.trim().toLowerCase()
    if (!q) {
      const pages = navForRole(u.role).slice(0, 8)
      results.innerHTML = `<div class="search-group">Pages</div>` + pages.map((n) =>
        `<button class="search-item" data-page="${n.id}">${icon(n.ic, 'muted', 16)}<span>${esc(n.label)}</span><span class="cell-sub">Jump to</span></button>`).join('')
      results.querySelectorAll('[data-page]').forEach((b) => { b.onclick = () => jump(b.dataset.page) })
      return
    }
    const pages = navForRole(u.role).filter((n) => n.label.toLowerCase().includes(q))
    const students = DB.data.students.filter((s) => s.name.toLowerCase().includes(q) || (s.admissionNo || '').toLowerCase().includes(q)).slice(0, 4)
    const staff = DB.data.staff.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)).slice(0, 3)
    const anns = DB.data.__announcements ? [] : []
    const events = DB.data.events.filter((e) => e.title.toLowerCase().includes(q)).slice(0, 3)
    let html = ''
    if (pages.length) html += `<div class="search-group">Pages</div>` + pages.map((n) => `<button class="search-item" data-page="${n.id}">${icon(n.ic, 'muted', 16)}<span>${esc(n.label)}</span></button>`).join('')
    if (students.length) html += `<div class="search-group">Students</div>` + students.map((s) => `<button class="search-item" data-student="${s.id}">${icon('user', 'muted', 16)}<span>${esc(s.name)}</span><span class="cell-sub">${esc(s.className ?? '')} · ${esc(s.admissionNo)}</span></button>`).join('')
    if (staff.length) html += `<div class="search-group">Staff</div>` + staff.map((s) => `<button class="search-item" data-staff="${s.id}">${icon('user', 'muted', 16)}<span>${esc(s.name)}</span><span class="cell-sub">${esc(s.role)}</span></button>`).join('')
    if (events.length) html += `<div class="search-group">Events</div>` + events.map((e) => `<button class="search-item" data-page="events">${icon('calendar-days', 'muted', 16)}<span>${esc(e.title)}</span><span class="cell-sub">${esc(e.date)}</span></button>`).join('')
    results.innerHTML = html || `<div class="search-empty">No results for "${esc(input.value)}"</div>`
    results.querySelectorAll('[data-page]').forEach((b) => { b.onclick = () => jump(b.dataset.page) })
    results.querySelectorAll('[data-student]').forEach((b) => { b.onclick = () => jump('profile', b.dataset.student) })
    results.querySelectorAll('[data-staff]').forEach((b) => { b.onclick = () => jump('profile', b.dataset.staff) })
  }
  renderResults()
  input.oninput = renderResults
  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      const first = results.querySelector('.search-item')
      if (first) first.click()
    }
  }
}

// ---------- idle timer (7 min → 60s countdown, like the original) ----------
const IDLE_LIMIT = 7 * 60 * 1000
let idleTimer = null, countdownTimer = null, lastActivity = 0
function armIdleTimer() {
  const reset = () => {
    const now = Date.now()
    if (now - lastActivity < 5000) return
    lastActivity = now
    clearTimeout(idleTimer)
    idleTimer = setTimeout(showIdleWarning, IDLE_LIMIT)
  }
  ;['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, reset, { passive: true }))
  reset()
}
function showIdleWarning() {
  if (!store.user || document.getElementById('idle-dlg')) return
  let secs = 60
  const el = document.createElement('div')
  el.id = 'idle-dlg'
  el.className = 'dialog-overlay'
  el.style.zIndex = 90
  el.innerHTML = `<div class="dialog" style="max-width:26rem">
    <div style="padding-right:2rem"><h3 class="dialog-title">Still there?</h3>
    <p class="dialog-desc">You've been inactive. You'll be automatically signed out in <b id="idle-secs" style="color:#f59e0b">${secs}</b> seconds.</p></div>
    <div class="dialog-foot"><button class="btn btn-brand" id="idle-stay">Stay logged in</button></div></div>`
  document.body.appendChild(el)
  const close = () => { clearInterval(countdownTimer); el.remove(); clearTimeout(idleTimer); idleTimer = setTimeout(() => store.user && showIdleWarning(), IDLE_LIMIT) }
  el.querySelector('#idle-stay').onclick = close
  countdownTimer = setInterval(() => {
    secs--
    const t = el.querySelector('#idle-secs')
    if (t) t.textContent = secs
    if (secs <= 1) { clearInterval(countdownTimer); el.remove(); doLogout(true) }
  }, 1000)
}
