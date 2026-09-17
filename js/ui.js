// ============================================================
// Shared UI helpers — building blocks used by every view.
// ============================================================
import { icon } from './icons.js'

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// ---------- toast ----------
export function toast(type, title, body = '') {
  const cont = document.getElementById('toasts')
  if (!cont) return
  const el = document.createElement('div')
  el.className = 'toast toast-' + type
  const ic = { success: 'circle-check', error: 'alert-circle', warning: 'alert-triangle', info: 'info' }[type] || 'info'
  el.innerHTML = `<span class="toast-ic">${icon(ic, '', 18)}</span>
    <div class="flex-1"><p class="toast-title">${esc(title)}</p>${body ? `<p class="toast-body">${esc(body)}</p>` : ''}</div>
    <button class="toast-x" aria-label="Dismiss">${icon('x', '', 14)}</button>`
  cont.appendChild(el)
  const kill = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 250) }
  el.querySelector('.toast-x').onclick = kill
  setTimeout(kill, 5000)
}

// ---------- dialog ----------
export function openDialog(html, opts = {}) {
  closeDialog()
  const wrap = document.createElement('div')
  wrap.id = 'dlg'
  wrap.className = 'dialog-overlay'
  wrap.innerHTML = `<div class="dialog ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <button class="dialog-close icon-btn" data-close aria-label="Close">${icon('x', '', 18)}</button>${html}</div>`
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) closeDialog() })
  wrap.querySelector('[data-close]').onclick = () => closeDialog()
  document.body.appendChild(wrap)
  const inp = wrap.querySelector('input, textarea, select')
  if (inp && !opts.noFocus) setTimeout(() => inp.focus(), 60)
  return wrap
}
export const closeDialog = () => document.getElementById('dlg')?.remove()

export const dialogHead = (t, d = '') => `<div style="padding-right:2rem"><h3 class="dialog-title">${t}</h3>${d ? `<p class="dialog-desc">${d}</p>` : ''}</div>`
export const dialogFoot = (cancel, okHtml) => `<div class="dialog-foot"><button class="btn btn-outline" data-close>${cancel}</button>${okHtml}</div>`
export const field = (label, inner) => `<div class="field"><label class="label-sm">${label}</label>${inner}</div>`

export function confirmDialog(title, desc, okLabel, onOk, danger = true) {
  const wrap = openDialog(`${dialogHead(title)}<p class="dialog-desc mt-2">${desc}</p>
    <div class="dialog-foot"><button class="btn btn-outline" data-close>Cancel</button>
    <button class="btn ${danger ? 'btn-destructive' : 'btn-brand'}" data-ok>${okLabel}</button></div>`, { noFocus: true })
  wrap.querySelector('[data-ok]').onclick = () => { closeDialog(); onOk() }
}

// ---------- session / store ----------
export const store = {
  user: null, view: 'dashboard', theme: 'dark', sidebarCollapsed: false, viewUserId: null,
  load() {
    try {
      const raw = JSON.parse(localStorage.getItem('sims_replica_session') || '{}')
      this.user = raw.user || null
      this.theme = raw.theme || 'dark'
      this.sidebarCollapsed = !!raw.sidebarCollapsed
    } catch { /* ignore */ }
  },
  save() {
    try {
      localStorage.setItem('sims_replica_session', JSON.stringify({ user: this.user, theme: this.theme, sidebarCollapsed: this.sidebarCollapsed }))
    } catch { /* ignore */ }
  },
}

// navigation delegate — app.js injects the real router at boot
export let go = null
export const setGo = (fn) => { go = fn }

// ---------- building blocks ----------
export function banner(iconName, title, sub, actionsHtml = '', kicker = '') {
  return `<div class="banner anim-view">
    <div class="banner-deco-a"></div><div class="banner-deco-b"></div>
    <div class="banner-c">
      <div class="min-w-0" style="min-width:0">
        ${kicker ? `<p class="banner-date"><span class="pulse-dot" style="display:inline-block;height:6px;width:6px;border-radius:9999px;background:rgba(255,255,255,.35)"></span>${kicker}</p>` : ''}
        <h2 class="banner-title" style="display:flex;align-items:center;gap:.5rem;${kicker ? '' : 'margin-top:0'}">${iconName ? icon(iconName, '', 26) : ''} ${title}</h2>
        ${sub ? `<p class="banner-sub">${sub}</p>` : ''}
      </div>
      ${actionsHtml ? `<div class="row wrap gap-2" style="flex-shrink:0">${actionsHtml}</div>` : ''}
    </div></div>`
}

export const btnWhite = (id, label, ic) => `<button class="btn btn-white" data-action="${id}">${ic ? icon(ic, '', 16) : ''}${label}</button>`
export const btnBrand = (id, label, ic) => `<button class="btn btn-brand" data-action="${id}">${ic ? icon(ic, '', 16) : ''}${label}</button>`

export function card(titleHtml, desc, contentHtml, opts = {}) {
  const actions = opts.actions || ''
  return `<div class="card ${opts.cls || ''}"><div class="card-h ${actions || titleHtml ? 'row' : ''}">
      <div>${titleHtml ? `<h3 class="card-t ${opts.titleSize || ''}">${titleHtml}</h3>` : ''}${desc ? `<p class="card-d">${desc}</p>` : ''}</div>
      ${actions}</div><div class="card-c ${opts.flush ? 'flush' : ''}">${contentHtml}</div></div>`
}

export const statCard = ({ ic, color, label, value, trend, view }) => `
  <div class="card stat-card hoverable" ${view ? `data-go="${view}"` : ''}>
    <div class="stat-blob"></div>
    <div class="stat-inner">
      <div class="stat-top">
        <div class="stat-ic ic-${color}">${icon(ic, '', 20)}</div>
        <span class="stat-arrow">${icon('arrow-right')}</span>
      </div>
      <p class="stat-value" data-count="${esc(value)}">${esc(value)}</p>
      <p class="stat-label">${esc(label)}</p>
      ${trend ? `<p class="stat-trend">${esc(trend)}</p>` : ''}
    </div></div>`

export const empty = (ic, text, cta = '') => `<div class="empty">${icon(ic)}<p>${text}</p>${cta}</div>`

export const avatarHtml = (name, role, size = 'av-8') => {
  const img = role?.__img
  const isStudent = img ? role.__student : role === 'Student'
  const src = img || role?.avatar
  if (src) return `<span class="avatar ${size}"><img src="${src}" alt="${esc(name)}"></span>`
  return `<span class="avatar ${size} ${isStudent ? '' : 'staff'}">${icon('user', '', size === 'av-6' ? 12 : size === 'av-8' ? 14 : size === 'av-10' ? 16 : 24)}</span>`
}

export const table = (heads, rowsHtml, opts = {}) => `
  <div class="table-wrap"><table class="table"><thead><tr>
    ${heads.map((h, i) => `<th class="${opts.hide?.[i] || ''}" style="${opts.right && i >= opts.right ? 'text-align:right' : ''}">${h}</th>`).join('')}
  </tr></thead><tbody>${rowsHtml}</tbody></table></div>`

export const pillTabs = (items, activeId, attr = 'data-tab') => `<div class="tabs">${items.map((t) =>
  `<button class="tab ${t.id === activeId ? 'active' : ''}" ${attr}="${t.id}">${t.label}${t.count != null ? `&nbsp;(${t.count})` : ''}</button>`).join('')}</div>`

// ---------- charts (SVG, animated) ----------
export function barChart(data, opts = {}) {
  // data: [{label, value, color?}]; opts: {max, height, horizontal}
  const max = opts.max ?? 100
  const h = opts.height || 260
  const W = 600, padL = 38, padB = 26, padT = 10
  const cw = W - padL - 8, ch = h - padB - padT
  const n = data.length || 1
  const bw = Math.min(64, (cw / n) * 0.55)
  const ticks = [0, .25, .5, .75, 1].map((t) => Math.round(max * t))
  let bars = ''
  data.forEach((d, i) => {
    const bh = Math.max(2, (d.value / max) * ch)
    const x = padL + (i + 0.5) * (cw / n) - bw / 2
    const y = padT + ch - bh
    bars += `<rect class="bar-grow" style="animation-delay:${i * 70}ms" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="6" fill="${d.color || 'var(--chart-1)'}"><title>${esc(d.label)}: ${d.value}</title></rect>`
    bars += `<text x="${(padL + (i + 0.5) * (cw / n)).toFixed(1)}" y="${h - 8}" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">${esc(d.label.length > 10 ? d.label.slice(0, 9) + '…' : d.label)}</text>`
  })
  const grid = ticks.map((t) => {
    const y = padT + ch - (t / max) * ch
    return `<line x1="${padL}" x2="${W - 8}" y1="${y}" y2="${y}" stroke="var(--border)" stroke-width="1"/>
      <text x="${padL - 6}" y="${y + 3}" text-anchor="end" font-size="10" fill="var(--muted-foreground)">${t}</text>`
  }).join('')
  return `<div style="position:relative"><svg viewBox="0 0 ${W} ${h}" style="width:100%;height:auto" role="img">${grid}${bars}</svg></div>`
}

export function donutChart(segments, opts = {}) {
  // segments: [{name, value, color}]; skips zero values
  const total = segments.reduce((a, s) => a + s.value, 0) || 1
  const R = opts.r || 60, SW = opts.sw || 22, C = 2 * Math.PI * R
  let off = 0, circles = ''
  segments.forEach((s) => {
    const frac = s.value / total
    if (frac <= 0) return
    const dash = Math.max(frac * C - 2, 1)
    circles += `<circle class="donut-anim" cx="80" cy="80" r="${R}" fill="none" stroke="${s.color}" stroke-width="${SW}"
      stroke-dasharray="0 ${C.toFixed(1)}" data-dash="${dash.toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}"
      transform="rotate(-90 80 80)" stroke-linecap="butt"><title>${esc(s.name)}: ${s.value}</title></circle>`
    off += frac * C
  })
  const legend = opts.noLegend ? '' : `<div class="legend-row">${segments.filter((s) => s.value > 0).map((s) =>
    `<span class="legend-item"><span class="legend-swatch" style="background:${s.color}"></span>${esc(s.name)}</span>`).join('')}</div>`
  const center = opts.center ? `<text x="80" y="76" text-anchor="middle" font-size="20" font-weight="700" fill="var(--foreground)">${opts.center[0]}</text><text x="80" y="94" text-anchor="middle" font-size="10" fill="var(--muted-foreground)">${opts.center[1]}</text>` : ''
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.donut-anim[data-dash]').forEach((c) => { c.setAttribute('stroke-dasharray', c.dataset.dash); c.removeAttribute('data-dash') })
  }))
  return `<div style="display:flex;flex-direction:column;align-items:center"><svg viewBox="0 0 160 160" style="width:${opts.w || 180}px;height:auto" role="img">${circles}${center}</svg>${legend}</div>`
}

export function lineChart(data, opts = {}) {
  // data: [{label, value}]; smooth area chart with gradient fill
  const W = 600, H = opts.height || 220
  const padL = 34, padB = 24, padT = 12
  const max = opts.max ?? (Math.max(...data.map((d) => d.value)) * 1.1 || 100)
  const cw = W - padL - 12, ch = H - padB - padT
  const pts = data.map((d, i) => [padL + (i + 0.5) * (cw / data.length), padT + ch - (d.value / max) * ch])
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = path + ` L ${pts[pts.length - 1][0].toFixed(1)} ${padT + ch} L ${pts[0][0].toFixed(1)} ${padT + ch} Z`
  const dots = pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="var(--chart-1)" stroke="var(--card)" stroke-width="2"><title>${esc(data[i].label)}: ${data[i].value}</title></circle>`).join('')
  const labels = data.map((d, i) => `<text x="${(padL + (i + 0.5) * (cw / data.length)).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="var(--muted-foreground)">${esc(d.label)}</text>`).join('')
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img">
    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--chart-1)" stop-opacity=".35"/><stop offset="100%" stop-color="var(--chart-1)" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#ag)"/>
    <path class="line-draw" d="${path}" fill="none" stroke="var(--chart-1)" stroke-width="2.5" stroke-linecap="round"/>
    ${dots}${labels}</svg>`
}

// ---------- count-up for stat values ----------
export function animateCounts(root) {
  root.querySelectorAll('[data-count]').forEach((el) => {
    const raw = el.dataset.count
    const num = parseFloat(String(raw).replace(/[$,%]/g, ''))
    if (!Number.isFinite(num)) return
    const prefix = String(raw).startsWith('$') ? '$' : ''
    const suffix = String(raw).endsWith('%') ? '%' : ''
    const decimals = String(raw).includes('.') ? 2 : 0
    const t0 = performance.now(), dur = 700
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3)
      el.textContent = prefix + (num * e).toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals === 2 ? 2 : 0 }) + suffix
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

export function stagger(root) {
  root.querySelectorAll('.stagger').forEach((c) => {
    Array.from(c.children).forEach((ch, i) => { ch.style.animationDelay = Math.min(i * 60, 420) + 'ms' })
  })
}

export function finishView(root) {
  stagger(root)
  animateCounts(root)
}

// Student picker list used by several dialogs
export function studentPickerHtml(students, onPick) {
  return students.map((s) => `
    <button class="search-item" data-pick="${s.id}">
      ${avatarHtml(s.name, 'Student', 'av-8')}
      <div><p class="font-medium">${esc(s.name)}</p><p class="cell-sub">${esc(s.admissionNo)} · ${esc(s.className ?? '')}</p></div>
    </button>`).join('')
}
