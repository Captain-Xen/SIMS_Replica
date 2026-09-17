// ============================================================
// Views: fees, finance, announcements, discipline, messages, notifications,
//        library, events, health, transport, cafeteria, inventory, facilities,
//        activities, uniform, import, settings, help
// ============================================================
import { icon } from '../icons.js'
import { DB, uid, timeAgo, nowIso, todayStr, dateOffset, nowTime, fmtMoney, csvDownload, printHtml, initials } from '../data.js'
import { esc, toast, banner, card, empty, avatarHtml, openDialog, closeDialog, confirmDialog, dialogHead, dialogFoot, field, barChart, donutChart, statCard, store, go } from '../ui.js'
import { applyAccent, refreshBell } from '../app.js'

const sel = (id, options, value, extra = '') => `<select id="${id}" class="input" ${extra}>${options.map((o) => { const v = o[0], l = o[1] ?? o[0]; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>` }).join('')}</select>`

export function render(view, mount) {
  const map = { fees, finance, announcements, discipline, messages, notifications, library, events, health, transport, cafeteria, inventory, facilities, activities, uniform, import: importView, settings, help }
  map[view](mount)
}

// ------------------------------------------------------------
// FEES
// ------------------------------------------------------------
function fees(mount) {
  const u = store.user
  if (u.role === 'Student') {
    const my = DB.data.fees.filter((f) => f.studentId === u.id || f.studentName === u.name)
    const balance = my.filter((f) => f.status === 'Pending').reduce((a, f) => a + f.amount, 0)
    const paid = my.filter((f) => f.status === 'Paid').reduce((a, f) => a + f.amount, 0)
    mount.innerHTML = `
    ${banner('dollar-sign', 'Fee Management', 'Your fee records and payments.')}
    <div class="stat-grid stagger" style="grid-template-columns:repeat(3,1fr)">
      ${statCard({ ic: 'wallet', color: 'amber', label: 'Outstanding Balance', value: '$' + balance.toLocaleString(), trend: 'Due this term' })}
      ${statCard({ ic: 'check', color: 'emerald', label: 'Total Paid', value: '$' + paid.toLocaleString(), trend: 'All time' })}
      ${statCard({ ic: 'file-text', color: 'teal', label: 'Fee Records', value: String(my.length), trend: 'Term 1' })}
    </div>
    ${my.length === 0 ? `<div class="card">${empty('dollar-sign', 'No fee records found.')}</div>` : `
    <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">
      ${my.map((f) => `
      <div class="card"><div class="card-c">
        <div class="row between gap-2"><p class="font-semibold">${esc(f.term)}</p>
          <span class="badge ${f.status === 'Paid' ? 'badge-soft' : 'badge-warn'}">${f.status}</span></div>
        <p class="text-xs muted mt-1 row gap-1">${icon('calendar', '', 12)} Due ${new Date(f.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <p class="text-3xl font-bold mt-3">$${f.amount.toLocaleString()}</p>
        <div class="mt-3" style="text-align:right">
          ${f.status === 'Paid' ? `<span class="badge badge-soft">${icon('check', '', 12)} Paid</span>`
            : `<button class="btn btn-brand btn-sm" data-pay="${f.id}">Pay Now</button>`}
        </div>
      </div></div>`).join('')}
    </div>`}`
    mount.querySelectorAll('[data-pay]').forEach((b) => { b.onclick = () => {
      const f = DB.data.fees.find((x) => x.id === b.dataset.pay)
      const wrap = openDialog(`${dialogHead('Pay Fee — ' + esc(f.term), '$' + f.amount.toLocaleString() + ' · Due ' + f.dueDate)}
        <div class="dropzone mt-3" style="border-color:var(--brand);background:color-mix(in srgb,var(--brand) 6%,transparent)">
          ${icon('info', '', 16)}<p class="text-xs muted">Demo checkout — no real payment is processed.</p></div>
        ${dialogFoot('Cancel', `<button class="btn btn-brand" id="pay-ok">${icon('check', '', 14)} Confirm Payment</button>`)}`)
      wrap.querySelector('#pay-ok').onclick = () => {
        f.status = 'Paid'; DB.save(); closeDialog()
        toast('success', 'Payment recorded', `Receipt for ${f.term} — $${f.amount.toLocaleString()}.`)
        fees(mount)
      }
    } })
    return
  }

  let q = '', statusF = 'All'
  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)
  function paint() {
    const all = DB.data.fees
    const collected = all.filter((f) => f.status === 'Paid').reduce((a, f) => a + f.amount, 0)
    const pending = all.filter((f) => f.status === 'Pending').reduce((a, f) => a + f.amount, 0)
    const filtered = all.filter((f) => (statusF === 'All' || f.status === statusF) && (!q || f.studentName.toLowerCase().includes(q)))
    root.innerHTML = `
    ${banner('dollar-sign', 'Fee Management', 'Track and collect student fees.')}
    <div class="stat-grid stagger">
      ${statCard({ ic: 'check', color: 'emerald', label: 'Total Collected', value: '$' + collected.toLocaleString(), trend: Math.round(collected / (collected + pending || 1) * 100) + '% of total' })}
      ${statCard({ ic: 'clock', color: 'amber', label: 'Pending', value: '$' + pending.toLocaleString(), trend: 'Outstanding' })}
      ${statCard({ ic: 'trending-up', color: 'teal', label: 'Collection Rate', value: Math.round(collected / (collected + pending || 1) * 100) + '%', trend: 'This term' })}
      ${statCard({ ic: 'users', color: 'cyan', label: 'Paid Records', value: `${all.filter((f) => f.status === 'Paid').length}/${all.length}`, trend: 'Student records' })}
    </div>
    <div class="card"><div class="card-c tight"><div class="toolbar" style="padding:0">
      <div class="input-wrap">${icon('search', 'input-ic', 16)}<input class="input has-ic" id="fee-q" placeholder="Search students..." value="${esc(q)}"></div>
      <div class="toolbar-row">
        ${['All', 'Paid', 'Pending'].map((s) => `<button class="subj-chip ${statusF === s ? 'sc-brand' : 'sc-slate'}" data-f="${s}">${s}</button>`).join('')}
      </div></div></div></div>
    <div class="card"><div class="card-c flush">
      ${filtered.length === 0 ? empty('dollar-sign', 'No fee records found.') : `
      <div class="table-wrap"><table class="table"><thead><tr>
        <th>Student</th><th>Term</th><th>Amount</th><th class="hide-md-down">Due Date</th><th>Status</th><th style="text-align:right">Action</th>
      </tr></thead><tbody>
        ${filtered.map((f) => `
        <tr>
          <td class="font-medium">${esc(f.studentName)}</td>
          <td>${esc(f.term)}</td>
          <td class="font-semibold">$${f.amount.toLocaleString()}</td>
          <td class="hide-md-down"><span class="row gap-1 text-sm">${icon('calendar', 'muted', 12)} ${new Date(f.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></td>
          <td><span class="badge ${f.status === 'Paid' ? 'badge-soft' : 'badge-warn'}">${f.status}</span></td>
          <td style="text-align:right"><button class="btn ${f.status === 'Paid' ? 'btn-outline' : 'btn-brand'} btn-sm" data-toggle="${f.id}">${f.status === 'Paid' ? 'Mark Pending' : 'Mark Paid'}</button></td>
        </tr>`).join('')}
      </tbody></table></div>`}
    </div></div>`
    root.querySelector('#fee-q').oninput = (e) => { q = e.target.value.toLowerCase(); paint() }
    root.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { statusF = b.dataset.f; paint() } })
    root.querySelectorAll('[data-toggle]').forEach((b) => { b.onclick = () => {
      const f = DB.data.fees.find((x) => x.id === b.dataset.toggle)
      f.status = f.status === 'Paid' ? 'Pending' : 'Paid'
      DB.save(); toast('success', f.status === 'Paid' ? 'Marked as paid' : 'Marked as pending', f.studentName); paint()
    } })
  }
  paint()
}

// ------------------------------------------------------------
// FINANCE
// ------------------------------------------------------------
function finance(mount) {
  const d = DB.data
  const CAT = { Salaries: 'badge-soft', Supplies: 'badge-teal', Maintenance: 'badge-warn', Transport: 'badge-info', Utilities: 'sc-orange', Events: 'badge-violet', Health: 'badge-danger', Sports: 'sc-lime', Other: 'badge-muted' }
  const catChip = (c) => `<span class="badge ${CAT[c] || 'badge-muted'}">${esc(c)}</span>`
  const totalAlloc = d.budgets.reduce((a, b) => a + b.allocated, 0)
  const totalSpent = d.budgets.reduce((a, b) => a + b.spent, 0)

  mount.innerHTML = `
  ${banner('wallet', 'School Finance', 'Budgets, expenses and utilization.',
    `<button class="btn btn-white" data-exp>${icon('plus', '', 16)} Add Expense</button>
     <button class="btn btn-brand" data-budgets>${icon('wallet', '', 16)} Manage Budgets</button>`)}
  <div class="stat-grid stagger">
    ${statCard({ ic: 'wallet', color: 'emerald', label: 'Total Budget', value: fmtMoney(totalAlloc), trend: 'This period' })}
    ${statCard({ ic: 'trending-up', color: 'amber', label: 'Total Spent', value: fmtMoney(totalSpent), trend: Math.round(totalSpent / (totalAlloc || 1) * 100) + '% utilized' })}
    ${statCard({ ic: 'dollar-sign', color: 'teal', label: 'Remaining', value: fmtMoney(totalAlloc - totalSpent), trend: 'Available' })}
    ${statCard({ ic: 'percent', color: 'cyan', label: 'Utilization', value: Math.round(totalSpent / (totalAlloc || 1) * 100) + '%', trend: 'Of allocated' })}
  </div>
  ${card('Budget vs Spending', 'Allocated and spent per category',
    barChart([
      ...d.budgets.map((b) => ({ label: b.category.slice(0, 8), value: Math.round(b.allocated / 1000), color: 'var(--chart-1)' })),
      ...d.budgets.map((b) => ({ label: b.category.slice(0, 6) + '·spent', value: Math.round(b.spent / 1000), color: '#f59e0b' })),
    ], { max: Math.max(...d.budgets.map((b) => b.allocated)) / 1000 * 1.15 }), { titleSize: 'text-base' })}
  ${card('Budget Categories', '', d.budgets.map((b) => {
    const pct = Math.round(b.spent / b.allocated * 100)
    const tone = pct >= 90 ? 'var(--destructive)' : pct >= 70 ? '#f59e0b' : 'var(--brand)'
    return `<div class="row-card">
      <div class="row between gap-2 wrap"><p class="text-sm font-semibold">${esc(b.category)} <span class="badge badge-muted">${esc(b.period)}</span></p>
        <span class="badge" style="background:color-mix(in srgb,${tone} 12%,transparent);color:${tone}">${pct}% used</span></div>
      <div class="progress mt-2"><div style="width:${pct}%;background:${tone}"></div></div>
      <p class="text-xs muted mt-1">${fmtMoney(b.spent)} spent of ${fmtMoney(b.allocated)} · ${fmtMoney(b.allocated - b.spent)} remaining</p>
    </div>`
  }).join(''), { titleSize: 'text-base' })}
  ${card('Expenses', 'All recorded spending', d.expenses.length ? `<div class="table-wrap"><table class="table"><thead><tr>
      <th>Description</th><th>Category</th><th>Amount</th><th class="hide-md-down">Date</th><th class="hide-md-down">Recorded By</th><th style="text-align:right">Actions</th>
    </tr></thead><tbody>
      ${d.expenses.map((x) => `
      <tr>
        <td class="font-medium">${esc(x.description)}</td>
        <td>${catChip(x.category)}</td>
        <td class="font-semibold">${fmtMoney(x.amount)}</td>
        <td class="hide-md-down">${new Date(x.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
        <td class="hide-md-down"><p class="cell-sub">${esc(x.recordedByName || '—')}</p></td>
        <td><div class="row gap-1" style="justify-content:flex-end">
          <button class="btn btn-ghost btn-icon" data-edit="${x.id}">${icon('pencil', '', 16)}</button>
          <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-del="${x.id}">${icon('trash-2', '', 16)}</button>
        </div></td>
      </tr>`).join('')}
    </tbody></table></div>` : empty('wallet', 'No expenses recorded.'), { titleSize: 'text-base', flush: true })}`

  mount.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => expenseDialog(DB.data.expenses.find((x) => x.id === b.dataset.edit), () => finance(mount)) })
  mount.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => {
    const x = DB.data.expenses.find((e) => e.id === b.dataset.del)
    confirmDialog('Delete expense?', `Remove "${x.description}"?`, 'Delete', () => {
      DB.data.expenses = DB.data.expenses.filter((e) => e.id !== x.id); DB.save(); toast('success', 'Expense deleted'); finance(mount)
    })
  } })
  mount.querySelector('[data-exp]').onclick = () => expenseDialog(null, () => finance(mount))
  mount.querySelector('[data-budgets]').onclick = () => budgetsDialog(() => finance(mount))

  function expenseDialog(x, onDone) {
    const wrap = openDialog(`${dialogHead(x ? 'Edit Expense' : 'Add Expense')}
      <div class="form-grid">
        ${field('Description *', `<input class="input" id="ex-desc" value="${esc(x?.description || '')}">`)}
        ${field('Category', sel('ex-cat', ['Salaries', 'Supplies', 'Maintenance', 'Transport', 'Utilities', 'Events', 'Health', 'Sports', 'Other'], x?.category || 'Supplies'))}
        ${field('Amount (cents) *', `<input class="input" id="ex-amt" type="number" value="${x?.amount ?? 0}" placeholder="e.g. 45000 = $450.00">`)}
        ${field('Date', `<input class="input" id="ex-date" type="date" value="${x?.date || todayStr()}">`)}
        ${field('Link to Budget', sel('ex-bud', [['', 'None'], ...DB.data.budgets.map((b) => [b.id, b.category])], x?.budgetId || ''))}
      </div>
      ${dialogFoot('Cancel', `<button class="btn btn-brand" id="ex-save">${icon('check', '', 14)} Save Expense</button>`)}`)
    wrap.querySelector('#ex-save').onclick = () => {
      const v = (id) => wrap.querySelector('#' + id).value
      if (!v('ex-desc').trim() || !Number(v('ex-amt'))) { toast('error', 'Description and amount are required'); return }
      const data = { description: v('ex-desc').trim(), category: v('ex-cat'), amount: Number(v('ex-amt')), date: v('ex-date'), budgetId: v('ex-bud') || null, recordedByName: store.user.name }
      if (x) Object.assign(x, data)
      else DB.data.expenses.push({ id: uid('exp'), ...data, createdAt: nowIso() })
      const bud = DB.data.budgets.find((b) => b.id === data.budgetId)
      if (bud) bud.spent = Math.min(bud.allocated * 2, bud.spent + (x ? 0 : data.amount))
      DB.save(); closeDialog(); toast('success', 'Expense saved'); onDone()
    }
  }
  function budgetsDialog(onDone) {
    const wrap = openDialog(`${dialogHead('Manage Budgets', 'Adjust allocations per category.')}
      <div class="stack-3 mt-3" id="bud-rows">
        ${DB.data.budgets.map((b) => `
        <div class="row gap-2" data-bud="${b.id}">
          <span class="flex-1 text-sm font-medium">${esc(b.category)} <span class="muted text-xs">· ${esc(b.period)}</span></span>
          <input class="input" type="number" value="${b.allocated}" style="width:9rem" data-amt>
          <button class="btn btn-outline btn-sm" data-save-b="${b.id}">Save</button>
        </div>`).join('')}
      </div>
      <div style="height:1px;background:var(--border);margin:.75rem 0"></div>
      <div class="row gap-2"><input class="input" id="bud-new-cat" placeholder="New category" style="flex:1">
        <input class="input" id="bud-new-amt" type="number" placeholder="Allocated (cents)" style="width:11rem">
        <button class="btn btn-outline btn-sm" id="bud-add">${icon('plus', '', 14)} Add</button></div>
      ${dialogFoot('Close', '')}`, { wide: true, noFocus: true })
    wrap.querySelectorAll('[data-save-b]').forEach((b) => { b.onclick = () => {
      const bud = DB.data.budgets.find((x) => x.id === b.dataset.saveB)
      bud.allocated = Number(wrap.querySelector(`[data-bud="${b.id}"] [data-amt]`).value) || bud.allocated
      DB.save(); toast('success', 'Budget updated', bud.category)
    } })
    wrap.querySelector('#bud-add').onclick = () => {
      const cat = wrap.querySelector('#bud-new-cat').value.trim()
      const amt = Number(wrap.querySelector('#bud-new-amt').value)
      if (!cat || !amt) { toast('error', 'Category and amount required'); return }
      DB.data.budgets.push({ id: uid('bud'), category: cat, allocated: amt, spent: 0, period: 'Term 1' })
      DB.save(); toast('success', 'Budget added', cat); closeDialog(); onDone()
    }
  }
}

// ------------------------------------------------------------
// ANNOUNCEMENTS
// ------------------------------------------------------------
function announcements(mount) {
  const u = store.user
  const canPost = ['Admin', 'Principal', 'Teacher'].includes(u.role)
  const ROLE_CHIP = { Admin: 'badge-soft', Principal: 'badge-teal', 'Vice Principal': 'badge-info', Teacher: 'badge-warn', Student: 'badge-danger' }
  mount.innerHTML = `
  ${banner('megaphone', 'Announcements', 'School-wide news and updates.',
    canPost ? `<button class="btn btn-white" data-new>${icon('plus', '', 16)} New Announcement</button>` : '')}
  <div class="stack-3" id="ann-list" style="max-width:44rem"></div>`
  const list = mount.querySelector('#ann-list')
  function paint() {
    const all = DB.data.__announcements || []
    list.innerHTML = all.length === 0 ? `<div class="card">${empty('megaphone', 'No announcements yet.')}</div>` : all.map((a) => `
      <div class="card hoverable"><div class="card-c">
        <div class="row gap-3">
          ${avatarHtml(a.authorName, a.authorRole, 'av-10')}
          <div class="flex-1"><p class="font-medium">${esc(a.authorName)}</p>
            <p class="text-xs muted">${timeAgo(a.createdAt)}</p></div>
          <span class="badge ${ROLE_CHIP[a.authorRole] || 'badge-muted'}">${esc(a.authorRole)}</span>
          ${u.role === 'Admin' ? `<button class="btn btn-ghost btn-icon" style="color:#ef4444" data-del="${a.id}">${icon('trash-2', '', 16)}</button>` : ''}
        </div>
        <h3 class="font-semibold mt-3">${esc(a.title)}</h3>
        <p class="text-sm mt-1" style="line-height:1.6">${esc(a.body)}</p>
      </div></div>`).join('')
    list.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => {
      DB.data.__announcements = DB.data.__announcements.filter((x) => x.id !== b.dataset.del)
      toast('success', 'Announcement deleted'); paint()
    } })
  }
  paint()
  mount.querySelector('[data-new]')?.addEventListener('click', () => {
    const wrap = openDialog(`${dialogHead('New Announcement')}
      <div class="stack-3 mt-3">
        ${field('Title', `<input class="input" id="an-title" placeholder="What's the news?">`)}
        ${field('Body', `<textarea class="input" id="an-body" rows="6" placeholder="Write the announcement..."></textarea>`)}
      </div>
      ${dialogFoot('Cancel', `<button class="btn btn-brand" id="an-save">${icon('send', '', 14)} Post Announcement</button>`)}`)
    wrap.querySelector('#an-save').onclick = () => {
      const title = wrap.querySelector('#an-title').value.trim()
      const body = wrap.querySelector('#an-body').value.trim()
      if (!title || !body) { toast('error', 'Title and body are required'); return }
      DB.data.__announcements.unshift({ id: uid('ann'), title, body, authorId: store.user.id, authorName: store.user.name, authorRole: store.user.role, createdAt: nowIso() })
      closeDialog(); toast('success', 'Announcement posted'); paint()
    }
  })
}

// ------------------------------------------------------------
// DISCIPLINE
// ------------------------------------------------------------
function discipline(mount) {
  const d = DB.data
  const TYPE = { Detention: { badge: 'badge-warn', ic: 'clock' }, Suspension: { badge: 'badge-danger', ic: 'alert-circle' }, Warning: { badge: 'badge-muted', ic: 'info' } }
  const detentions = d.discipline.filter((x) => x.type === 'Detention').length
  const suspensions = d.discipline.filter((x) => x.type === 'Suspension').length
  const warnings = d.discipline.filter((x) => x.type === 'Warning').length
  mount.innerHTML = `
  ${banner('gavel', 'Discipline Module', 'Track incidents and disciplinary actions.')}
  <div class="dropzone" style="border-color:#f59e0b;background:color-mix(in srgb,#f59e0b 8%,transparent)">
    ${icon('alert-triangle', '', 18)}<p class="text-xs" style="color:#b45309">Escalation policy: 3 detentions → 1 suspension · 4 suspensions → expulsion hearing.</p></div>
  <div class="stat-grid stagger">
    ${statCard({ ic: 'clock', color: 'amber', label: 'Detentions', value: String(detentions), trend: 'Current' })}
    ${statCard({ ic: 'alert-circle', color: 'cyan', label: 'Suspensions', value: String(suspensions), trend: 'Current' })}
    ${statCard({ ic: 'info', color: 'teal', label: 'Warnings', value: String(warnings), trend: 'Issued' })}
    ${statCard({ ic: 'users', color: 'emerald', label: 'At-risk Students', value: String(new Set(d.discipline.map((x) => x.studentId)).size), trend: 'With records' })}
  </div>
  <div class="cols-lg-3" style="grid-template-columns:1fr 1.6fr">
    ${card('Issue Discipline', 'Record a new incident', `
      <div class="stack-3">
        ${field('Student', sel('dc-student', d.students.map((s) => [s.id, `${s.name} (${s.className})`]), d.students[0]?.id))}
        ${field('Type', sel('dc-type', ['Detention', 'Suspension', 'Warning'], 'Detention'))}
        ${field('Reason', `<textarea class="input" id="dc-reason" rows="3" placeholder="Describe the incident..."></textarea>`)}
        <button class="btn btn-brand" data-save>${icon('gavel', '', 14)} Record Action</button>
      </div>`, { titleSize: 'text-base' })}
    ${card('Discipline History', '', d.discipline.length ? d.discipline.map((x) => {
      const t = TYPE[x.type] || TYPE.Warning
      return `<div class="row-card row gap-3">
        <span class="stat-ic" style="width:2.25rem;height:2.25rem;border-radius:.5rem;background:color-mix(in srgb,#f59e0b 15%,transparent);color:#b45309">${icon(t.ic, '', 14)}</span>
        <div class="flex-1"><div class="row gap-2 wrap"><span class="badge ${t.badge}">${esc(x.type)}</span>
          <p class="text-sm font-medium">${esc(x.studentName)}</p></div>
          <p class="text-xs muted clamp-2">${esc(x.reason)}</p></div>
        <div style="text-align:right;flex-shrink:0"><p class="text-xs muted">${esc(x.issuerName || '—')}</p>
          <p class="text-xs muted">${timeAgo(new Date(x.date + 'T12:00:00').toISOString())}</p></div>
      </div>`
    }).join('') : empty('shield-check', 'Everyone is in good standing.'), { titleSize: 'text-base', flush: true })}
  </div>`
  mount.querySelector('[data-save]').onclick = () => {
    const sid = mount.querySelector('#dc-student').value
    const type = mount.querySelector('#dc-type').value
    const reason = mount.querySelector('#dc-reason').value.trim()
    if (!reason) { toast('error', 'Reason is required'); return }
    const s = d.students.find((x) => x.id === sid)
    d.discipline.unshift({ id: uid('dis'), studentId: sid, studentName: s.name, type, reason, date: todayStr(), issuerName: store.user.name })
    DB.save(); toast('success', 'Action recorded', `${type} for ${s.name}`); discipline(mount)
  }
}

// ------------------------------------------------------------
// MESSAGES
// ------------------------------------------------------------
function messages(mount) {
  const u = store.user
  const d = DB.data
  const people = [...d.staff.filter((s) => s.id !== u.id).map((s) => ({ id: s.id, name: s.name, role: s.role })), ...d.students.map((s) => ({ id: s.id, name: s.name, role: 'Student' }))]
  let activeId = null, query = ''

  mount.innerHTML = `
  <div class="row between gap-2 wrap mb-4">
    <h2 class="serif text-xl font-semibold">Messages</h2>
    <button class="btn btn-brand btn-sm" data-new>${icon('plus', '', 14)} New Message</button>
  </div>
  <div class="card" style="display:flex;height:calc(100vh - 15rem);min-height:420px;overflow:hidden">
    <div style="width:320px;border-right:1px solid var(--border);display:flex;flex-direction:column" id="conv-pane">
      <div style="padding:.75rem"><div class="input-wrap">${icon('search', 'input-ic', 14)}<input class="input has-ic" id="msg-q" placeholder="Search conversations..." style="padding-top:.4rem;padding-bottom:.4rem"></div></div>
      <div id="conv-list" style="flex:1;overflow-y:auto"></div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;min-width:0" id="thread-pane"></div>
  </div>`

  const convList = mount.querySelector('#conv-list')
  const threadPane = mount.querySelector('#thread-pane')

  function lastMsg(pid) {
    const all = d.messages.filter((m) => (m.fromId === u.id && m.toId === pid) || (m.fromId === pid && m.toId === u.id))
    return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
  }
  function unreadFor(pid) { return d.messages.filter((m) => m.fromId === pid && m.toId === u.id && !m.read).length }

  function paintList() {
    const filtered = people.filter((p) => !query || p.name.toLowerCase().includes(query))
    filtered.sort((a, b) => {
      const la = lastMsg(a.id)?.createdAt || '', lb = lastMsg(b.id)?.createdAt || ''
      return lb.localeCompare(la)
    })
    convList.innerHTML = filtered.map((p) => {
      const lm = lastMsg(p.id)
      const un = unreadFor(p.id)
      return `<button class="row gap-3" data-conv="${p.id}" style="width:100%;padding:.625rem .75rem;text-align:left;${activeId === p.id ? 'background:color-mix(in srgb,var(--brand) 8%,transparent)' : ''}">
        ${avatarHtml(p.name, p.role, 'av-8')}
        <div class="flex-1" style="min-width:0">
          <div class="row between gap-1"><p class="text-sm font-medium truncate">${esc(p.name)}</p>
            ${lm ? `<span class="text-xs muted">${timeAgo(lm.createdAt)}</span>` : ''}</div>
          <div class="row between gap-1"><p class="text-xs muted truncate">${lm ? esc(lm.body.slice(0, 34)) : 'No messages yet'}</p>
            ${un ? `<span class="badge badge-solid" style="padding:0 .4rem;font-size:10px">${un}</span>` : ''}</div>
        </div>
      </button>`
    }).join('')
    convList.querySelectorAll('[data-conv]').forEach((b) => { b.onclick = () => { activeId = b.dataset.conv; paintList(); paintThread() } })
  }

  function paintThread() {
    const p = people.find((x) => x.id === activeId)
    if (!p) { threadPane.innerHTML = `<div class="empty" style="height:100%"><p>Pick a conversation to start messaging.</p></div>`; return }
    d.messages.forEach((m) => { if (m.fromId === p.id && m.toId === u.id) m.read = true })
    DB.save(); refreshBell()
    const thread = d.messages.filter((m) => (m.fromId === u.id && m.toId === p.id) || (m.fromId === p.id && m.toId === u.id)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    threadPane.innerHTML = `
      <div class="row gap-3" style="padding:.75rem 1rem;border-bottom:1px solid var(--border)">
        <button class="btn btn-ghost btn-icon only-mobile" data-back>${icon('arrow-left', '', 16)}</button>
        ${avatarHtml(p.name, p.role, 'av-8')}
        <div><p class="font-medium">${esc(p.name)}</p><p class="text-xs muted">${esc(p.role)}</p></div>
      </div>
      <div id="msg-scroll" style="flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.5rem">
        ${thread.length === 0 ? '<p class="muted text-sm" style="text-align:center;margin:auto">No messages yet — say hello! 👋</p>' : thread.map((m) => {
          const mine = m.fromId === u.id
          return `<div style="max-width:70%;${mine ? 'align-self:flex-end' : 'align-self:flex-start'}">
            <div style="padding:.5rem .875rem;border-radius:1rem;font-size:.875rem;${mine
              ? 'background:var(--brand);color:var(--brand-foreground);border-bottom-right-radius:.25rem'
              : 'border:1px solid var(--border);background:var(--card);border-bottom-left-radius:.25rem'}">${esc(m.body)}</div>
            <p class="text-xs muted" style="margin-top:2px;${mine ? 'text-align:right' : ''}">${timeAgo(m.createdAt)}</p>
          </div>`
        }).join('')}
      </div>
      <div class="row gap-2" style="padding:.75rem 1rem;border-top:1px solid var(--border)">
        <textarea id="msg-input" class="input" rows="1" placeholder="Type a message..." style="resize:none;max-height:96px"></textarea>
        <button class="btn btn-brand btn-icon" id="msg-send" style="border-radius:9999px;width:2.5rem;height:2.5rem">${icon('send', '', 16)}</button>
      </div>
      <p class="text-xs muted" style="text-align:center;padding:0 1rem .5rem">Press Enter to send</p>`
    const scroll = threadPane.querySelector('#msg-scroll')
    scroll.scrollTop = scroll.scrollHeight
    threadPane.querySelector('[data-back]')?.addEventListener('click', () => { activeId = null; paintThread() })
    const input = threadPane.querySelector('#msg-input')
    const send = () => {
      const body = input.value.trim()
      if (!body) return
      d.messages.push({ id: uid('msg'), fromId: u.id, fromName: u.name, fromRole: u.role, toId: p.id, toName: p.name, toRole: p.role, body, read: false, createdAt: nowIso() })
      DB.save(); input.value = ''; paintList(); paintThread()
    }
    threadPane.querySelector('#msg-send').onclick = send
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
  }

  mount.querySelector('#msg-q').oninput = (e) => { query = e.target.value.toLowerCase(); paintList() }
  mount.querySelector('[data-new]').onclick = () => {
    const wrap = openDialog(`${dialogHead('New Message')}
      <div class="stack-3 mt-3">
        <div class="input-wrap">${icon('search', 'input-ic', 14)}<input class="input has-ic" id="nm-q" placeholder="Search recipients..."></div>
        <div class="stack-2" id="nm-list" style="max-height:240px;overflow-y:auto">
          ${people.map((p) => `<button class="search-item" data-rcpt="${p.id}">${avatarHtml(p.name, p.role, 'av-8')}
            <div><p class="font-medium text-sm">${esc(p.name)}</p></div><span class="badge badge-muted">${esc(p.role)}</span></button>`).join('')}
        </div>
        <div id="nm-compose" style="display:none">
          <textarea class="input" id="nm-body" rows="3" placeholder="Write your message..."></textarea>
          <button class="btn btn-brand btn-block mt-2" id="nm-send">${icon('send', '', 14)} Send Message</button>
        </div>
      </div>${dialogFoot('Close', '')}`, { noFocus: true })
    let rcpt = null
    const q = wrap.querySelector('#nm-q')
    q.oninput = () => {
      const v = q.value.toLowerCase()
      wrap.querySelectorAll('[data-rcpt]').forEach((b) => {
        const p = people.find((x) => x.id === b.dataset.rcpt)
        b.style.display = p.name.toLowerCase().includes(v) ? '' : 'none'
      })
    }
    wrap.querySelectorAll('[data-rcpt]').forEach((b) => { b.onclick = () => {
      rcpt = people.find((x) => x.id === b.dataset.rcpt)
      wrap.querySelector('#nm-compose').style.display = 'block'
      wrap.querySelector('#nm-body').focus()
    } })
    wrap.querySelector('#nm-send').onclick = () => {
      const body = wrap.querySelector('#nm-body').value.trim()
      if (!rcpt || !body) { toast('error', 'Pick a recipient and write a message'); return }
      d.messages.push({ id: uid('msg'), fromId: u.id, fromName: u.name, fromRole: u.role, toId: rcpt.id, toName: rcpt.name, toRole: rcpt.role, body, read: false, createdAt: nowIso() })
      DB.save(); closeDialog(); toast('success', 'Message sent', 'To ' + rcpt.name); paintList()
    }
  }
  paintList(); paintThread()
}

// ------------------------------------------------------------
// NOTIFICATIONS
// ------------------------------------------------------------
function notifications(mount) {
  const u = store.user
  let tab = 'All'
  const TYPE = {
    info: { ic: 'info', bg: '#0ea5e9' }, success: { ic: 'check', bg: 'var(--brand)' }, warning: { ic: 'alert-triangle', bg: '#f59e0b' },
    message: { ic: 'mail', bg: '#0d9488' }, assignment: { ic: 'clipboard-list', bg: '#8b5cf6' },
  }
  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)

  function paint() {
    const mine = DB.data.notifications.filter((n) => n.userId === u.id)
    const unread = mine.filter((n) => !n.read)
    const list = tab === 'Unread' ? unread : mine
    root.innerHTML = `
    <div class="row between gap-2 wrap">
      <div class="row gap-2"><h2 class="serif text-xl font-semibold" style="display:flex;align-items:center;gap:.5rem">${icon('bell', '', 20)} Notifications</h2>
        ${unread.length ? `<span class="badge badge-soft">${unread.length} new</span>` : ''}</div>
      <button class="btn btn-outline btn-sm" data-readall ${unread.length === 0 ? 'disabled' : ''}>${icon('check-check', '', 14)} Mark all as read</button>
    </div>
    <div class="tabs" style="max-width:16rem">
      <button class="tab ${tab === 'All' ? 'active' : ''}" data-tab="All">All (${mine.length})</button>
      <button class="tab ${tab === 'Unread' ? 'active' : ''}" data-tab="Unread">Unread (${unread.length})</button>
    </div>
    <div class="card"><div class="card-c flush">
      ${list.length === 0 ? (tab === 'Unread' ? empty('bell-off', 'No unread notifications.') : empty('bell-off', 'No notifications yet.')) :
      list.map((n) => {
        const t = TYPE[n.type] || TYPE.info
        return `<div class="row gap-3" data-n="${n.id}" style="padding:.875rem 1.25rem;border-bottom:1px solid var(--border);cursor:pointer;${!n.read ? 'background:color-mix(in srgb,var(--brand) 5%,transparent)' : ''};transition:background .2s">
          <span class="stat-ic" style="width:2.5rem;height:2.5rem;border-radius:9999px;background:color-mix(in srgb,${t.bg} 15%,transparent);color:${t.bg}">${icon(t.ic, '', 16)}</span>
          <div class="flex-1" style="min-width:0">
            <div class="row gap-2"><p class="text-sm font-semibold">${esc(n.title)}</p>
              ${!n.read ? '<span style="width:8px;height:8px;border-radius:9999px;background:var(--brand);flex-shrink:0"></span>' : ''}
              <span class="text-xs muted" style="margin-left:auto">${timeAgo(n.createdAt)}</span></div>
            <p class="text-xs muted clamp-2">${esc(n.body)}</p>
            ${n.type === 'message' ? '<p class="text-xs brand-text mt-1">Open Messages →</p>' : n.type === 'assignment' ? '<p class="text-xs brand-text mt-1">Open Assignments →</p>' : ''}
          </div>
        </div>`
      }).join('')}
      ${list.length ? `<p class="text-xs muted" style="padding:.75rem 1.25rem">Showing ${list.length} of ${mine.length} notifications</p>` : ''}
    </div></div>`
    root.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; paint() } })
    root.querySelector('[data-readall]').onclick = () => {
      DB.data.notifications.forEach((n) => { if (n.userId === u.id) n.read = true })
      DB.save(); refreshBell(); toast('success', 'All caught up'); paint()
    }
    root.querySelectorAll('[data-n]').forEach((el) => { el.onclick = () => {
      const n = DB.data.notifications.find((x) => x.id === el.dataset.n)
      if (n) { n.read = true; DB.save(); refreshBell() }
      if (n?.type === 'message') return go('messages')
      if (n?.type === 'assignment') return go('assignments')
      paint()
    } })
  }
  paint()
}

// ------------------------------------------------------------
// LIBRARY
// ------------------------------------------------------------
function library(mount) {
  const u = store.user
  const isStaff = u.role !== 'Student'
  const CATS = ['Fiction', 'Science', 'Mathematics', 'History', 'Reference', 'General']
  const CAT_COLOR = { Fiction: 'sc-rose', Science: 'sc-teal', Mathematics: 'sc-brand', History: 'sc-amber', Reference: 'sc-violet', General: 'sc-slate' }
  let q = '', catF = ''
  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)

  function paint() {
    const books = DB.data.books
    const loans = DB.data.loans
    const activeLoans = loans.filter((l) => l.status !== 'Returned')
    const overdue = activeLoans.filter((l) => l.status === 'Overdue' || new Date(l.dueDate) < new Date())
    const filtered = books.filter((b) => (!catF || b.category === catF) && (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)))
    const myLoans = isStaff ? activeLoans : activeLoans.filter((l) => l.userId === u.id)
    const catData = CATS.map((c) => ({ name: c, value: books.filter((b) => b.category === c).length, color: { Fiction: '#f43f5e', Science: '#0d9488', Mathematics: 'var(--brand)', History: '#f59e0b', Reference: '#8b5cf6', General: '#64748b' }[c] })).filter((x) => x.value)

    root.innerHTML = `
    ${banner('library', 'Library', 'Catalogue, loans and returns.',
      isStaff ? `<button class="btn btn-white" data-add>${icon('plus', '', 16)} Add Book</button>` : '')}
    <div class="stat-grid stagger">
      ${statCard({ ic: 'book-open', color: 'emerald', label: 'Total Titles', value: String(books.length), trend: 'In catalogue' })}
      ${statCard({ ic: 'check', color: 'teal', label: 'Available', value: String(books.reduce((a, b) => a + b.available, 0)), trend: 'Copies on shelf' })}
      ${statCard({ ic: 'book-marked', color: 'amber', label: 'Borrowed', value: String(activeLoans.length - overdue.length), trend: 'On loan' })}
      ${statCard({ ic: 'clock', color: 'cyan', label: 'Overdue', value: String(overdue.length), trend: 'Needs follow-up' })}
    </div>
    <div class="cols-lg-3">
      <div class="span-2 stack-6">
        <div class="card"><div class="card-c tight"><div class="toolbar" style="padding:0">
          <div class="input-wrap">${icon('search', 'input-ic', 16)}<input class="input has-ic" id="lib-q" placeholder="Search by title or author..." value="${esc(q)}"></div>
          ${sel('lib-cat', [['', 'All categories'], ...CATS.map((c) => [c, c])], catF, 'style="width:11rem"')}
        </div></div></div>
        ${filtered.length === 0 ? `<div class="card">${empty('library', 'No books found.')}</div>` : `
        <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:1rem">
          ${filtered.map((b) => `
          <div class="card" style="overflow:hidden"><div style="height:4px;background:${b.available > 0 ? 'var(--brand)' : '#ef4444'}"></div>
            <div class="card-c stack-2">
              <div class="row between gap-2"><p class="font-semibold text-sm" style="min-width:0">${esc(b.title)}</p>
                <span class="subj-chip ${CAT_COLOR[b.category] || 'sc-slate'}" style="flex-shrink:0">${esc(b.category)}</span></div>
              <p class="text-xs muted">${esc(b.author)}</p>
              <p class="text-xs muted">${esc(b.isbn || '')} · Shelf ${esc(b.shelf || '—')}</p>
              <div class="row between gap-2 mt-2">
                ${b.available > 0 ? `<span class="text-xs" style="color:var(--brand);font-weight:600">${b.available} of ${b.copies} available</span>`
                  : '<span class="text-xs" style="color:#ef4444;font-weight:600">Unavailable</span>'}
                ${b.available > 0 ? `<button class="btn btn-outline btn-sm" data-borrow="${b.id}">Borrow</button>` : ''}
              </div>
            </div></div>`).join('')}
        </div>`}
      </div>
      <div class="stack-6">
        ${card('Categories', 'Books per category', donutChart(catData), { titleSize: 'text-base' })}
        ${card(isStaff ? 'All Loans' : 'My Loans', '', myLoans.length ? myLoans.map((l) => {
          const overdueNow = l.status === 'Overdue' || new Date(l.dueDate) < new Date()
          return `<div class="row-card row gap-3">
            <span class="stat-ic" style="width:2.25rem;height:2.25rem;border-radius:.5rem;${overdueNow ? 'background:#fee2e2;color:#dc2626' : ''}">${icon('book-open', '', 14)}</span>
            <div class="flex-1" style="min-width:0"><p class="text-sm font-medium truncate">${esc(l.bookTitle)}</p>
              <p class="text-xs muted">Due ${new Date(l.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${isStaff ? ' · ' + esc(l.userName) : ''}</p></div>
            <span class="badge ${overdueNow ? 'badge-danger' : 'badge-soft'}">${overdueNow ? 'Overdue' : l.status}</span>
            ${isStaff ? `<button class="btn btn-outline btn-sm" data-return="${l.id}">Return</button>` : ''}
          </div>`
        }).join('') : empty('book-marked', 'No active loans.'), { titleSize: 'text-base' })}
      </div>
    </div>`

    root.querySelector('#lib-q').oninput = (e) => { q = e.target.value.toLowerCase(); paint() }
    root.querySelector('#lib-cat').onchange = (e) => { catF = e.target.value; paint() }
    root.querySelectorAll('[data-borrow]').forEach((b) => { b.onclick = () => {
      const book = DB.data.books.find((x) => x.id === b.dataset.borrow)
      book.available--
      DB.data.loans.push({ id: uid('ln'), bookId: book.id, bookTitle: book.title, bookAuthor: book.author, userId: store.user.id, userName: store.user.name, borrowDate: todayStr(), dueDate: dateOffset(14), returnDate: null, status: 'Borrowed' })
      DB.save(); toast('success', 'Book borrowed', `${book.title} — due ${dateOffset(14)}`); paint()
    } })
    root.querySelectorAll('[data-return]').forEach((b) => { b.onclick = () => {
      const loan = DB.data.loans.find((x) => x.id === b.dataset.return)
      loan.status = 'Returned'; loan.returnDate = todayStr()
      const book = DB.data.books.find((x) => x.id === loan.bookId)
      if (book) book.available = Math.min(book.copies, book.available + 1)
      DB.save(); toast('success', 'Book returned', loan.bookTitle); paint()
    } })
    root.querySelector('[data-add]')?.addEventListener('click', () => {
      const wrap = openDialog(`${dialogHead('Add Book')}
        <div class="form-grid">
          ${field('Title *', `<input class="input" id="bk-title">`)}
          ${field('Author *', `<input class="input" id="bk-author">`)}
          ${field('ISBN', `<input class="input" id="bk-isbn">`)}
          ${field('Category', sel('bk-cat', CATS, 'Fiction'))}
          ${field('Copies', `<input class="input" id="bk-copies" type="number" value="1" min="1">`)}
          ${field('Shelf', `<input class="input" id="bk-shelf" placeholder="e.g. F-12">`)}
        </div>
        ${dialogFoot('Cancel', `<button class="btn btn-brand" id="bk-save">${icon('plus', '', 14)} Add Book</button>`)}`)
      wrap.querySelector('#bk-save').onclick = () => {
        const v = (id) => wrap.querySelector('#' + id).value
        if (!v('bk-title').trim() || !v('bk-author').trim()) { toast('error', 'Title and author are required'); return }
        const copies = Number(v('bk-copies')) || 1
        DB.data.books.push({ id: uid('bok'), title: v('bk-title').trim(), author: v('bk-author').trim(), isbn: v('bk-isbn'), category: v('bk-cat'), copies, available: copies, shelf: v('bk-shelf') })
        DB.save(); closeDialog(); toast('success', 'Book added'); paint()
      }
    })
  }
  paint()
}

// ------------------------------------------------------------
// EVENTS
// ------------------------------------------------------------
function events(mount) {
  let cursor = new Date(); cursor.setDate(1)
  let selected = null
  const TYPE = { Event: 'var(--chart-1)', Exam: '#ef4444', Holiday: '#8b5cf6', Meeting: '#f59e0b' }
  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)

  function paint() {
    const evs = DB.data.events
    const y = cursor.getFullYear(), m = cursor.getMonth()
    const monthName = cursor.toLocaleString('en-US', { month: 'long' })
    const startWd = new Date(y, m, 1).getDay()
    const days = new Date(y, m + 1, 0).getDate()
    const cells = [...Array(startWd).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
    const iso = (d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayEvents = (d) => evs.filter((e) => e.date === iso(d))
    const today = new Date()
    const selEvents = selected ? dayEvents(selected) : []
    const upcoming = [...evs].filter((e) => e.date >= todayStr()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)

    root.innerHTML = `
    ${banner('calendar-days', 'Events Calendar', 'School events, exams and holidays.',
      `<button class="btn btn-white" data-add>${icon('plus', '', 16)} Add Event</button>`)}
    <div class="row gap-3 wrap">
      ${Object.entries(TYPE).map(([k, c]) => `<span class="legend-item text-xs"><span class="legend-swatch" style="background:${c}"></span>${k}</span>`).join('')}
    </div>
    <div class="cols-lg-3" style="grid-template-columns:1.6fr 1fr">
      ${card(`<span class="row gap-2" style="display:inline-flex">${icon('calendar', '', 16)} ${monthName} ${y}</span>`, '',
        `<div class="row between mb-3">
          <button class="btn btn-outline btn-sm" data-pm>${icon('chevron-left', '', 14)}</button>
          <button class="btn btn-outline btn-sm" data-today>Today</button>
          <button class="btn btn-outline btn-sm" data-nm>${icon('chevron-right', '', 14)}</button>
        </div>
        <div class="cal" style="gap:.375rem">
          ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((x) => `<div class="cal-dow">${x}</div>`).join('')}
          ${cells.map((d) => {
            if (d === null) return '<div></div>'
            const de = dayEvents(d)
            const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear()
            const isSel = selected === d
            return `<div class="cal-cell ${isToday ? 'today' : ''}" data-day="${d}"
              style="${isSel && !isToday ? 'box-shadow:inset 0 0 0 2px var(--brand)' : ''};cursor:pointer">${d}
              ${de.length ? `<span class="cal-dots">${de.slice(0, 3).map((e) => `<span class="cal-dot" style="background:${isToday ? '#fff' : (TYPE[e.type] || 'var(--chart-1)')}"></span>`).join('')}</span>` : ''}
            </div>`
          }).join('')}
        </div>`, { titleSize: 'text-base' })}
      <div class="stack-6">
        ${card(selected ? new Date(y, m, selected).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a day', '',
          selected === null ? '<p class="muted text-sm">Click a date to view its events.</p>'
            : selEvents.length === 0 ? '<p class="muted text-sm">No events on this day.</p>'
            : selEvents.map((e) => `
              <div class="row-card row gap-3">
                <span class="badge" style="background:color-mix(in srgb,${TYPE[e.type] || 'var(--chart-1)'} 12%,transparent);color:${TYPE[e.type] || 'var(--chart-1)'}">${esc(e.type)}</span>
                <div class="flex-1"><p class="text-sm font-medium">${esc(e.title)}</p>
                  ${e.description ? `<p class="text-xs muted">${esc(e.description)}</p>` : ''}</div>
                <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-evdel="${e.id}">${icon('trash-2', '', 14)}</button>
              </div>`).join(''), { titleSize: 'text-base' })}
        ${card('Upcoming', '', upcoming.length ? upcoming.map((e) => {
          const dd = new Date(e.date + 'T12:00:00')
          return `<div class="row gap-3 row-card">
            <div style="text-align:center;background:color-mix(in srgb,var(--brand) 10%,transparent);border-radius:.5rem;padding:.375rem .625rem;flex-shrink:0">
              <p class="text-xs font-bold" style="color:var(--brand)">${dd.toLocaleDateString('en-US', { month: 'short' })}</p>
              <p class="text-lg font-bold" style="line-height:1">${dd.getDate()}</p></div>
            <div class="flex-1"><p class="text-sm font-medium">${esc(e.title)}</p>
              <p class="text-xs muted">${esc(e.type)}</p></div>
          </div>`
        }).join('') : '<p class="muted text-sm">Nothing upcoming.</p>', { titleSize: 'text-base' })}
      </div>
    </div>`

    root.querySelectorAll('[data-day]').forEach((c) => { c.onclick = () => { selected = Number(c.dataset.day); paint() } })
    root.querySelector('[data-pm]').onclick = () => { cursor = new Date(y, m - 1, 1); selected = null; paint() }
    root.querySelector('[data-nm]').onclick = () => { cursor = new Date(y, m + 1, 1); selected = null; paint() }
    root.querySelector('[data-today]').onclick = () => { cursor = new Date(); cursor.setDate(1); selected = today.getDate(); paint() }
    root.querySelector('[data-add]').onclick = () => {
      const wrap = openDialog(`${dialogHead('Add Event')}
        <div class="form-grid">
          ${field('Title *', `<input class="input" id="ev-title">`)}
          ${field('Date *', `<input class="input" id="ev-date" type="date" value="${selected ? iso(selected) : todayStr()}">`)}
          ${field('Type', sel('ev-type', Object.keys(TYPE), 'Event'))}
          ${field('Description', `<input class="input" id="ev-desc">`)}
        </div>
        ${dialogFoot('Cancel', `<button class="btn btn-brand" id="ev-save">${icon('plus', '', 14)} Add Event</button>`)}`)
      wrap.querySelector('#ev-save').onclick = () => {
        const v = (id) => wrap.querySelector('#' + id).value
        if (!v('ev-title').trim()) { toast('error', 'Title is required'); return }
        DB.data.events.push({ id: uid('ev'), title: v('ev-title').trim(), date: v('ev-date'), type: v('ev-type'), description: v('ev-desc') || null })
        DB.save(); closeDialog(); toast('success', 'Event added'); paint()
      }
    }
    root.querySelectorAll('[data-evdel]').forEach((b) => { b.onclick = () => {
      DB.data.events = DB.data.events.filter((x) => x.id !== b.dataset.evdel)
      DB.save(); toast('success', 'Event deleted'); paint()
    } })
  }
  paint()
}

// ------------------------------------------------------------
// HEALTH
// ------------------------------------------------------------
function health(mount) {
  const d = DB.data
  let filter = 'All', q = ''
  const TYPE = {
    Allergy: { chip: 'badge-danger', bar: '#ef4444' }, Condition: { chip: 'badge-warn', bar: '#f59e0b' },
    Medication: { chip: 'badge-teal', bar: '#0d9488' }, Immunization: { chip: 'badge-soft', bar: 'var(--brand)' }, 'Clinic Visit': { chip: 'badge-info', bar: '#0ea5e9' },
  }
  const SEV = { Critical: 'badge-danger', High: 'sc-orange', Moderate: 'badge-warn', Low: 'badge-soft' }
  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)

  function paint() {
    const all = d.health
    const filtered = all.filter((r) => (filter === 'All' || r.type === filter) && (!q || r.title.toLowerCase().includes(q) || r.studentName.toLowerCase().includes(q)))
    const types = ['All', ...Object.keys(TYPE)]
    root.innerHTML = `
    ${banner('heart-pulse', 'Health Records', 'Medical notes kept by the school nurse.',
      `<button class="btn btn-white" data-add>${icon('plus', '', 16)} Add Record</button>`)}
    <div class="stat-grid stagger">
      ${statCard({ ic: 'clipboard-list', color: 'emerald', label: 'Total Records', value: String(all.length), trend: 'On file' })}
      ${statCard({ ic: 'alert-triangle', color: 'cyan', label: 'Critical Allergies', value: String(all.filter((r) => r.type === 'Allergy' && r.severity === 'Critical').length), trend: 'Requires EpiPen' })}
      ${statCard({ ic: 'pill', color: 'teal', label: 'Active Medications', value: String(all.filter((r) => r.type === 'Medication').length), trend: 'Administered daily' })}
      ${statCard({ ic: 'syringe', color: 'amber', label: 'Immunizations', value: String(all.filter((r) => r.type === 'Immunization').length), trend: 'On record' })}
    </div>
    <div class="card"><div class="card-c tight"><div class="toolbar" style="padding:0">
      <div class="input-wrap">${icon('search', 'input-ic', 16)}<input class="input has-ic" id="hlt-q" placeholder="Search records..." value="${esc(q)}"></div>
      <div class="chip-row">${types.map((t) => `<button class="subj-chip ${filter === t ? 'sc-brand' : 'sc-slate'}" data-f="${t}">${t}${t === 'All' ? ` (${all.length})` : ` (${all.filter((r) => r.type === t).length})`}</button>`).join('')}</div>
    </div></div></div>
    ${filtered.length === 0 ? `<div class="card">${empty('heart-pulse', 'No records found.')}</div>` : `
    <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem">
      ${filtered.map((r) => {
        const t = TYPE[r.type] || TYPE.Condition
        return `<div class="card" style="overflow:hidden"><div style="height:4px;background:${t.bar}"></div>
        <div class="card-c stack-3">
          <div class="row between gap-2"><p class="font-semibold text-sm">${esc(r.title)}</p>
            <div class="row gap-1"><span class="badge ${t.chip}">${esc(r.type)}</span>
            <span class="badge ${SEV[r.severity] || 'badge-muted'}">${esc(r.severity)}</span></div></div>
          <div class="row gap-2">${avatarHtml(r.studentName, 'Student', 'av-8')}<p class="text-sm">${esc(r.studentName)}</p></div>
          ${r.description ? `<p class="text-xs muted">${esc(r.description)}</p>` : ''}
          <div class="row between text-xs muted"><span>${r.date ? new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · by ' + esc(r.recordedByName || '') : ''}</span>
            <span class="row gap-1">
              <button class="btn btn-ghost btn-icon" data-edit="${r.id}">${icon('pencil', '', 14)}</button>
              <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-del="${r.id}">${icon('trash-2', '', 14)}</button></span></div>
        </div></div>`
      }).join('')}
    </div>`}`

    root.querySelector('#hlt-q').oninput = (e) => { q = e.target.value.toLowerCase(); paint() }
    root.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { filter = b.dataset.f; paint() } })
    root.querySelector('[data-add]').onclick = () => healthDialog(null, paint)
    root.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => healthDialog(all.find((x) => x.id === b.dataset.edit), paint) })
    root.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => {
      const r = all.find((x) => x.id === b.dataset.del)
      confirmDialog('Delete record?', `Remove "${r.title}"?`, 'Delete', () => {
        DB.data.health = all.filter((x) => x.id !== r.id); DB.save(); toast('success', 'Record deleted'); paint()
      })
    } })
  }
  paint()

  function healthDialog(r, onDone) {
    const wrap = openDialog(`${dialogHead(r ? 'Edit Record' : 'Add Health Record')}
      <div class="form-grid">
        ${field('Student', sel('hl-student', d.students.map((s) => [s.id, s.name]), r?.studentId || d.students[0]?.id))}
        ${field('Type', sel('hl-type', Object.keys(TYPE), r?.type || 'Allergy'))}
        ${field('Severity', sel('hl-sev', ['Critical', 'High', 'Moderate', 'Low'], r?.severity || 'Moderate'))}
        ${field('Title *', `<input class="input" id="hl-title" value="${esc(r?.title || '')}">`)}
        ${field('Description', `<textarea class="input" id="hl-desc" rows="3">${esc(r?.description || '')}</textarea>`)}
        ${field('Date', `<input class="input" id="hl-date" type="date" value="${r?.date || todayStr()}">`)}
      </div>
      ${dialogFoot('Cancel', `<button class="btn btn-brand" id="hl-save">${icon('check', '', 14)} Save Record</button>`)}`, { wide: true })
    wrap.querySelector('#hl-save').onclick = () => {
      const v = (id) => wrap.querySelector('#' + id).value
      if (!v('hl-title').trim()) { toast('error', 'Title is required'); return }
      const s = d.students.find((x) => x.id === v('hl-student'))
      const data = { studentId: s.id, studentName: s.name, type: v('hl-type'), severity: v('hl-sev'), title: v('hl-title').trim(), description: v('hl-desc'), date: v('hl-date') }
      if (r) Object.assign(r, data)
      else DB.data.health.push({ id: uid('hlt'), ...data, recordedByName: store.user.name, createdAt: nowIso() })
      DB.save(); closeDialog(); toast('success', 'Record saved'); onDone()
    }
  }
}

// ------------------------------------------------------------
// TRANSPORT
// ------------------------------------------------------------
function transport(mount) {
  const u = store.user
  const isStudent = u.role === 'Student'
  const d = DB.data

  if (isStudent) {
    const my = d.busAssignments.find((a) => a.studentId === u.id)
    const route = my ? d.routes.find((r) => r.id === my.routeId) : null
    mount.innerHTML = `
    ${banner('bus', 'Transportation', route ? `You ride ${esc(route.routeName)}` : 'No bus route assigned yet.')}
    ${!route ? `<div class="card">${empty('bus', 'You are not assigned to a bus route. Contact the office to register.')}</div>` : `
    ${card(route.routeName, `Driver: ${esc(route.driverName)}`, `
      <div class="row gap-3 mb-4">
        <span class="stat-ic ic-teal" style="border-radius:.75rem">${icon('user', '', 20)}</span>
        <div class="flex-1"><p class="font-semibold">${esc(route.driverName)}</p><p class="text-xs muted">${esc(route.driverPhone || '')}</p></div>
        ${route.driverPhone ? `<a class="btn btn-outline btn-sm" href="tel:${esc(route.driverPhone)}">${icon('phone', '', 14)} Call</a>` : ''}
      </div>
      <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);gap:.75rem">
        ${statCard({ ic: 'sun', color: 'amber', label: 'Morning Pickup', value: route.morningPickup || '—', trend: 'Daily' })}
        ${statCard({ ic: 'moon', color: 'cyan', label: 'Evening Drop-off', value: route.eveningDrop || '—', trend: 'Daily' })}
        ${statCard({ ic: 'bus', color: 'teal', label: 'Vehicle', value: route.vehicleNo || '—', trend: 'Bus' })}
        ${statCard({ ic: 'users', color: 'emerald', label: 'Capacity', value: String(route.capacity), trend: 'Seats' })}
      </div>
      <div class="mt-4"><p class="label-sm">Occupancy</p>
        <div class="row gap-3"><div class="progress flex-1"><div style="width:${Math.min(100, Math.round(d.busAssignments.filter((a) => a.routeId === route.id).length / route.capacity * 100))}%"></div></div>
        <span class="text-xs muted">${d.busAssignments.filter((a) => a.routeId === route.id).length}/${route.capacity}</span></div></div>
      <div class="mt-4"><p class="label-sm">Stops</p>
        <div class="chip-row">${route.stops.map((s, i) => `<span class="badge badge-outline">${i + 1}. ${esc(s)}</span>`).join('')}</div></div>`)}
    <div class="dropzone" style="border-color:#f59e0b;background:color-mix(in srgb,#f59e0b 8%,transparent)">
      ${icon('info', '', 18)}<p class="text-xs" style="color:#b45309">Need to change routes? Contact the school office at ${esc(d.settings.phone)}.</p></div>`}`
    return
  }

  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)
  function paint() {
    const routes = d.routes
    const asg = d.busAssignments
    const totalCap = routes.reduce((a, r) => a + r.capacity, 0)
    root.innerHTML = `
    ${banner('bus', 'Transportation', 'Routes, drivers and student assignments.',
      `<button class="btn btn-white" data-addroute>${icon('plus', '', 16)} Add Route</button>`)}
    <div class="stat-grid stagger">
      ${statCard({ ic: 'bus', color: 'emerald', label: 'Total Routes', value: String(routes.length), trend: 'Active' })}
      ${statCard({ ic: 'users', color: 'teal', label: 'Assignments', value: String(asg.length), trend: 'Students riding' })}
      ${statCard({ ic: 'layout-dashboard', color: 'amber', label: 'Total Capacity', value: String(totalCap), trend: 'Seats fleet-wide' })}
      ${statCard({ ic: 'percent', color: 'cyan', label: 'Utilization', value: totalCap ? Math.round(asg.length / totalCap * 100) + '%' : '0%', trend: 'Fleet average' })}
    </div>
    ${routes.length === 0 ? `<div class="card">${empty('bus', 'No routes yet.')}</div>` : `
    <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem">
      ${routes.map((r) => {
        const count = asg.filter((a) => a.routeId === r.id).length
        const full = count >= r.capacity
        return `<div class="card" style="overflow:hidden"><div style="height:4px;background:var(--brand)"></div>
        <div class="card-c stack-3">
          <div class="row between gap-2"><p class="font-semibold">${esc(r.routeName)}</p>
            <span class="badge ${full ? 'badge-danger' : 'badge-soft'}">${count}/${r.capacity}</span></div>
          <p class="text-xs muted">Driver: ${esc(r.driverName)} · ${esc(r.vehicleNo || '—')}</p>
          <div class="grid gap-2 text-xs muted" style="grid-template-columns:1fr 1fr">
            <span class="row gap-1">${icon('phone', '', 12)} ${esc(r.driverPhone || '—')}</span>
            <span class="row gap-1">${icon('clock', '', 12)} ${esc(r.morningPickup || '—')} → ${esc(r.eveningDrop || '—')}</span>
          </div>
          <div><div class="row between text-xs mb-1"><span>Utilization</span><span class="muted">${Math.round(count / r.capacity * 100)}%</span></div>
            <div class="progress"><div style="width:${Math.min(100, count / r.capacity * 100)}%;${full ? 'background:var(--destructive)' : ''}"></div></div></div>
          <div class="chip-row">${r.stops.map((s) => `<span class="badge badge-muted">${esc(s)}</span>`).join('')}</div>
          <div class="row gap-2" style="justify-content:flex-end">
            <button class="btn btn-outline btn-sm" data-assign="${r.id}">${icon('user-plus', '', 14)} Assign Students</button>
            <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-delroute="${r.id}">${icon('trash-2', '', 14)}</button>
          </div>
        </div></div>`
      }).join('')}
    </div>`}
    ${card('Student Assignments', '', asg.length ? `<div class="table-wrap"><table class="table"><thead><tr>
      <th>Student</th><th>Class</th><th>Route</th><th>Assigned</th><th style="text-align:right">Actions</th></tr></thead><tbody>
      ${asg.map((a) => `
      <tr>
        <td><div class="row gap-3">${avatarHtml(a.studentName, 'Student', 'av-8')}<p class="font-medium">${esc(a.studentName)}</p></div></td>
        <td><span class="badge badge-outline">${esc(a.studentClass || '—')}</span></td>
        <td><span class="row gap-1 text-sm">${icon('bus', 'muted', 12)} ${esc(a.routeName)}</span></td>
        <td class="hide-md-down"><p class="cell-sub">${timeAgo(a.createdAt)}</p></td>
        <td style="text-align:right"><button class="btn btn-ghost btn-icon" style="color:#ef4444" data-unassign="${a.id}">${icon('user-x', '', 16)}</button></td>
      </tr>`).join('')}
    </tbody></table></div>` : empty('users', 'No students assigned to routes yet.'), { titleSize: 'text-base', flush: true })}`

    root.querySelector('[data-addroute]').onclick = () => routeDialog(null, paint)
    root.querySelectorAll('[data-delroute]').forEach((b) => { b.onclick = () => {
      const r = routes.find((x) => x.id === b.dataset.delroute)
      confirmDialog('Delete route?', `Remove "${r.routeName}" and its assignments?`, 'Delete', () => {
        DB.data.routes = routes.filter((x) => x.id !== r.id)
        DB.data.busAssignments = asg.filter((a) => a.routeId !== r.id)
        DB.save(); toast('success', 'Route deleted'); paint()
      })
    } })
    root.querySelectorAll('[data-unassign]').forEach((b) => { b.onclick = () => {
      DB.data.busAssignments = asg.filter((a) => a.id !== b.dataset.unassign)
      DB.save(); toast('success', 'Student removed from route'); paint()
    } })
    root.querySelectorAll('[data-assign]').forEach((b) => { b.onclick = () => {
      const route = routes.find((x) => x.id === b.dataset.assign)
      const onRoute = new Set(asg.filter((a) => a.routeId === route.id).map((a) => a.studentId))
      const wrap = openDialog(`${dialogHead('Assign Students — ' + esc(route.routeName), 'Capacity ' + route.capacity)}
        <div class="stack-2 mt-3" style="max-height:320px;overflow-y:auto">
          ${d.students.map((s) => {
            const mine = asg.find((a) => a.studentId === s.id)
            return `<button class="search-item" data-asg="${s.id}" ${!mine && onRoute.size >= route.capacity ? 'disabled style="opacity:.4"' : ''}>
              ${avatarHtml(s.name, 'Student', 'av-8')}
              <div><p class="font-medium text-sm">${esc(s.name)}</p><p class="cell-sub">${esc(s.className ?? '')}</p></div>
              ${mine ? `<span class="badge ${mine.routeId === route.id ? 'badge-soft' : 'badge-muted'}">${mine.routeId === route.id ? 'On route' : 'On ' + esc(mine.routeName.split('—')[0])}</span>` : '<span class="badge badge-outline">Assign</span>'}
            </button>`
          }).join('')}
        </div>${dialogFoot('Close', '')}`, { noFocus: true })
      wrap.querySelectorAll('[data-asg]').forEach((btn) => { btn.onclick = () => {
        const s = d.students.find((x) => x.id === btn.dataset.asg)
        const mine = asg.find((a) => a.studentId === s.id)
        if (mine?.routeId === route.id) {
          DB.data.busAssignments = asg.filter((a) => a !== mine)
          toast('info', 'Removed from route', s.name)
        } else {
          if (mine) DB.data.busAssignments = DB.data.busAssignments.filter((a) => a !== mine)
          DB.data.busAssignments.push({ id: uid('bas'), routeId: route.id, routeName: route.routeName, studentId: s.id, studentName: s.name, studentClass: s.className, createdAt: nowIso() })
          toast('success', 'Assigned to route', `${s.name} → ${route.routeName}`)
        }
        DB.save(); closeDialog(); paint()
      } })
    } })
  }
  paint()
  function routeDialog(r, onDone) {
    const f = r || { routeName: '', driverName: '', driverPhone: '', vehicleNo: '', capacity: 30, morningPickup: '6:45 AM', eveningDrop: '3:30 PM', stops: [] }
    const wrap = openDialog(`${dialogHead(r ? 'Edit Route' : 'Add Route')}
      <div class="form-grid">
        ${field('Route Name *', `<input class="input" id="rt-name" value="${esc(f.routeName)}" placeholder="Route 1 — ...">`)}
        ${field('Driver Name *', `<input class="input" id="rt-driver" value="${esc(f.driverName)}">`)}
        ${field('Driver Phone', `<input class="input" id="rt-phone" value="${esc(f.driverPhone)}">`)}
        ${field('Vehicle No.', `<input class="input" id="rt-vehicle" value="${esc(f.vehicleNo)}">`)}
        ${field('Capacity', `<input class="input" id="rt-cap" type="number" value="${f.capacity}" min="1">`)}
        ${field('Morning Pickup', `<input class="input" id="rt-am" value="${esc(f.morningPickup)}">`)}
        ${field('Evening Drop-off', `<input class="input" id="rt-pm" value="${esc(f.eveningDrop)}">`)}
        ${field('Stops (comma separated)', `<input class="input" id="rt-stops" value="${esc(f.stops.join(', '))}">`)}
      </div>
      ${dialogFoot('Cancel', `<button class="btn btn-brand" id="rt-save">${icon('check', '', 14)} Save Route</button>`)}`, { wide: true })
    wrap.querySelector('#rt-save').onclick = () => {
      const v = (id) => wrap.querySelector('#' + id).value
      if (!v('rt-name').trim() || !v('rt-driver').trim()) { toast('error', 'Route and driver names are required'); return }
      const data = { routeName: v('rt-name').trim(), driverName: v('rt-driver').trim(), driverPhone: v('rt-phone'), vehicleNo: v('rt-vehicle'), capacity: Number(v('rt-cap')) || 30, morningPickup: v('rt-am'), eveningDrop: v('rt-pm'), stops: v('rt-stops').split(',').map((s) => s.trim()).filter(Boolean) }
      if (r) Object.assign(r, data)
      else DB.data.routes.push({ id: uid('rte'), ...data })
      DB.save(); closeDialog(); toast('success', 'Route saved'); onDone()
    }
  }
}

// ------------------------------------------------------------
// CAFETERIA
// ------------------------------------------------------------
function cafeteria(mount) {
  const u = store.user
  const isStudent = u.role === 'Student'
  const d = DB.data
  const PLAN = { Standard: 'badge-soft', Premium: 'badge-warn', Basic: 'badge-teal' }
  const TAGS = ['Vegetarian', 'Halal', 'Gluten-Free', 'Kosher', 'Dairy-Free', 'Nut-Free']

  if (isStudent) {
    const acct = d.mealAccounts.find((a) => a.userId === u.id)
    const menu = [
      { section: 'Breakfast', items: [{ name: 'Porridge & Toast', price: 250, tags: ['Vegetarian'] }, { name: 'Egg Sandwich', price: 350, tags: [] }] },
      { section: 'Lunch', items: [{ name: 'Jerk Chicken Bowl', price: 450, tags: ['Gluten-Free'] }, { name: 'Veggie Pasta', price: 400, tags: ['Vegetarian'] }, { name: 'Rice & Peas', price: 380, tags: ['Vegetarian', 'Gluten-Free'] }] },
      { section: 'Snacks', items: [{ name: 'Fruit Cup', price: 150, tags: ['Vegan'] }, { name: 'Patty', price: 200, tags: [] }] },
    ]
    const tx = d.mealTransactions.filter((t) => t.accountId === acct?.id)
    mount.innerHTML = `
    ${banner('utensils-crossed', 'Cafeteria', 'Your meal account and today\u2019s menu.')}
    ${!acct ? `<div class="card">${empty('utensils-crossed', 'No meal account yet. Ask the office to create one.')}</div>` : `
    <div class="banner" style="animation:none"><div class="banner-deco-a"></div><div class="banner-c">
      <div class="flex-1"><p class="banner-sub">Meal Account Balance</p>
        <p class="text-4xl font-bold mt-1">${fmtMoney(acct.balance)}</p>
        <div class="row gap-2 mt-2 wrap"><span class="badge ${PLAN[acct.mealPlan]}" style="border:1px solid rgba(255,255,255,.3)">${acct.mealPlan} Plan</span>
          ${acct.dietaryTags.map((t) => `<span class="badge" style="background:rgba(255,255,255,.2);color:#fff">${esc(t)}</span>`).join('')}</div>
        ${acct.balance < 1000 ? `<p class="text-xs mt-2" style="color:#fde68a">⚠ Low balance — top up soon.</p>` : ''}</div>
      <div class="row gap-2">
        <button class="btn btn-white" data-topup>${icon('wallet', '', 16)} Request Top-Up</button>
        <button class="btn btn-white" data-diet>${icon('utensils-crossed', '', 16)} Dietary Preferences</button>
      </div></div></div>`}
    ${menu.map((m) => `
    <div class="card"><div class="card-h"><h3 class="card-t text-base">${m.section}</h3></div>
      <div class="card-c grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.75rem">
        ${m.items.map((i) => `
        <div class="row-card row gap-3">
          <div class="flex-1"><p class="text-sm font-medium">${esc(i.name)}</p>
            <div class="chip-row mt-1">${i.tags.map((t) => `<span class="badge badge-muted" style="font-size:10px">${esc(t)}</span>`).join('')}</div></div>
          <div style="text-align:right"><p class="font-semibold">${fmtMoney(i.price)}</p>
            <button class="btn btn-outline btn-sm mt-1" data-buy="${i.name}" data-price="${i.price}">Buy Now</button></div>
        </div>`).join('')}
      </div></div>`).join('')}
    ${card('Recent Transactions', '', tx.length ? tx.map((t) => `
      <div class="row-card row gap-3">
        <span class="stat-ic" style="width:2.25rem;height:2.25rem;border-radius:9999px;${t.type === 'Topup' ? 'background:color-mix(in srgb,var(--brand) 12%,transparent);color:var(--brand)' : 'background:#fef3c7;color:#b45309'}">${icon(t.type === 'Topup' ? 'plus' : 'utensils-crossed', '', 14)}</span>
        <div class="flex-1"><p class="text-sm font-medium">${esc(t.description)}</p><p class="text-xs muted">${new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p></div>
        <p class="font-semibold" style="color:${t.type === 'Topup' ? 'var(--brand)' : '#b45309'}">${t.type === 'Topup' ? '+' : '−'}${fmtMoney(t.amount)}</p>
      </div>`).join('') : '<p class="muted text-sm">No transactions yet.</p>', { titleSize: 'text-base' })}`

    function refresh() { cafeteria(mount) }
    mount.querySelector('[data-topup]')?.addEventListener('click', () => {
      toast('info', 'Top-up requested', 'The cafeteria will add funds to your account.')
      acct.balance += 2000
      d.mealTransactions.push({ id: uid('mtr'), accountId: acct.id, type: 'Topup', amount: 2000, description: 'Top-up request (demo)', date: todayStr(), createdAt: nowIso() })
      DB.save(); setTimeout(refresh, 500)
    })
    mount.querySelector('[data-diet]')?.addEventListener('click', () => {
      const wrap = openDialog(`${dialogHead('Dietary Preferences')}
        <div class="stack-2 mt-3">${TAGS.map((t) => `
          <label class="row gap-2 text-sm" style="cursor:pointer"><input type="checkbox" data-tag="${t}" ${acct.dietaryTags.includes(t) ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--brand)"> ${t}</label>`).join('')}</div>
        ${dialogFoot('Cancel', `<button class="btn btn-brand" id="diet-save">Save</button>`)}`)
      wrap.querySelector('#diet-save').onclick = () => {
        acct.dietaryTags = Array.from(wrap.querySelectorAll('[data-tag]:checked')).map((c) => c.dataset.tag)
        DB.save(); closeDialog(); toast('success', 'Preferences saved'); refresh()
      }
    })
    mount.querySelectorAll('[data-buy]').forEach((b) => { b.onclick = () => {
      const price = Number(b.dataset.price)
      if (acct.balance < price) { toast('error', 'Insufficient balance', 'Top up your account first.'); return }
      acct.balance -= price
      d.mealTransactions.push({ id: uid('mtr'), accountId: acct.id, type: 'Purchase', amount: price, description: b.dataset.buy, date: todayStr(), createdAt: nowIso() })
      DB.save(); toast('success', 'Enjoy!', `${b.dataset.buy} — ${fmtMoney(price)}`); refresh()
    } })
    return
  }

  // staff
  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)
  function paint() {
    const accts = d.mealAccounts
    const totalBal = accts.reduce((a, x) => a + x.balance, 0)
    const restricted = accts.filter((a) => a.dietaryTags.length > 0).length
    root.innerHTML = `
    ${banner('utensils-crossed', 'Cafeteria', 'Meal accounts, balances and transactions.',
      `<button class="btn btn-white" data-create>${icon('plus', '', 16)} Create Account</button>`)}
    <div class="stat-grid stagger">
      ${statCard({ ic: 'users', color: 'emerald', label: 'Total Accounts', value: String(accts.length), trend: 'Active' })}
      ${statCard({ ic: 'wallet', color: 'teal', label: 'Total Balance', value: fmtMoney(totalBal), trend: 'Held funds' })}
      ${statCard({ ic: 'star', color: 'amber', label: 'Active Plans', value: String(new Set(accts.map((a) => a.mealPlan)).size), trend: 'Standard / Premium / Basic' })}
      ${statCard({ ic: 'heart', color: 'cyan', label: 'Dietary Restrictions', value: String(restricted), trend: 'Accommodated' })}
    </div>
    ${card('Meal Accounts', '', accts.length ? `<div class="table-wrap"><table class="table"><thead><tr>
      <th>Student</th><th>Meal Plan</th><th>Balance</th><th class="hide-md-down">Dietary Tags</th><th style="text-align:right">Actions</th>
    </tr></thead><tbody>
      ${accts.map((a) => `
      <tr>
        <td><div class="row gap-3">${avatarHtml(a.userName, 'Student', 'av-8')}<p class="font-medium">${esc(a.userName)}</p></div></td>
        <td><span class="badge ${PLAN[a.mealPlan] || 'badge-muted'}">${esc(a.mealPlan)}</span></td>
        <td><p class="font-semibold" style="color:${a.balance < 1000 ? '#b45309' : 'inherit'}">${fmtMoney(a.balance)}</p></td>
        <td class="hide-md-down"><div class="chip-row">${a.dietaryTags.length ? a.dietaryTags.map((t) => `<span class="badge badge-muted">${esc(t)}</span>`).join('') : '<span class="text-xs muted">—</span>'}</div></td>
        <td><div class="row gap-1" style="justify-content:flex-end">
          <button class="btn btn-outline btn-sm" data-top="${a.id}">Top Up</button>
          <button class="btn btn-ghost btn-sm" data-tx="${a.id}">Transactions</button>
        </div></td>
      </tr>`).join('')}
    </tbody></table></div>` : empty('utensils-crossed', 'No meal accounts yet.'), { titleSize: 'text-base', flush: true })}`

    root.querySelector('[data-create]').onclick = () => {
      const wrap = openDialog(`${dialogHead('Create Meal Account')}
        <div class="form-grid">
          ${field('Student', sel('ca-student', d.students.filter((s) => !accts.some((a) => a.userId === s.id)).map((s) => [s.id, s.name]), ''))}
          ${field('Meal Plan', sel('ca-plan', ['Standard', 'Premium', 'Basic'], 'Standard'))}
          ${field('Initial Balance (cents)', `<input class="input" id="ca-balance" type="number" value="0">`)}
        </div>
        ${dialogFoot('Cancel', `<button class="btn btn-brand" id="ca-save">${icon('plus', '', 14)} Create</button>`)}`)
      wrap.querySelector('#ca-save').onclick = () => {
        const sid = wrap.querySelector('#ca-student').value
        if (!sid) { toast('error', 'Pick a student'); return }
        const s = d.students.find((x) => x.id === sid)
        d.mealAccounts.push({ id: uid('mal'), userId: sid, userName: s.name, balance: Number(wrap.querySelector('#ca-balance').value) || 0, dietaryTags: [], mealPlan: wrap.querySelector('#ca-plan').value, updatedAt: nowIso() })
        DB.save(); closeDialog(); toast('success', 'Account created'); paint()
      }
    }
    root.querySelectorAll('[data-top]').forEach((b) => { b.onclick = () => {
      const acct = accts.find((x) => x.id === b.dataset.top)
      const wrap = openDialog(`${dialogHead('Top Up — ' + esc(acct.userName), 'Current balance ' + fmtMoney(acct.balance))}
        <div class="stack-3 mt-3">
          <input class="input" id="tp-amt" type="number" placeholder="Amount in cents (e.g. 1000 = $10)">
          <div class="chip-row">${[1000, 2000, 5000, 10000].map((v) => `<button class="subj-chip sc-brand" data-quick="${v}">$${v / 100}</button>`).join('')}</div>
        </div>
        ${dialogFoot('Cancel', `<button class="btn btn-brand" id="tp-save">${icon('plus', '', 14)} Add Funds</button>`)}`)
      wrap.querySelectorAll('[data-quick]').forEach((q) => { q.onclick = () => { wrap.querySelector('#tp-amt').value = q.dataset.quick } })
      wrap.querySelector('#tp-save').onclick = () => {
        const amt = Number(wrap.querySelector('#tp-amt').value)
        if (!amt) { toast('error', 'Enter an amount'); return }
        acct.balance += amt
        d.mealTransactions.push({ id: uid('mtr'), accountId: acct.id, type: 'Topup', amount: amt, description: 'Top-up', date: todayStr(), createdAt: nowIso() })
        DB.save(); closeDialog(); toast('success', 'Funds added', fmtMoney(amt) + ' to ' + acct.userName); paint()
      }
    } })
    root.querySelectorAll('[data-tx]').forEach((b) => { b.onclick = () => {
      const acct = accts.find((x) => x.id === b.dataset.tx)
      const tx = d.mealTransactions.filter((t) => t.accountId === acct.id)
      openDialog(`${dialogHead('Transactions — ' + esc(acct.userName), 'Balance ' + fmtMoney(acct.balance))}
        <div class="stack-2 mt-3" style="max-height:300px;overflow-y:auto">
          ${tx.length ? tx.map((t) => `
          <div class="row-card row gap-3"><div class="flex-1"><p class="text-sm font-medium">${esc(t.description)}</p>
            <p class="text-xs muted">${new Date(t.date + 'T12:00:00').toLocaleDateString()}</p></div>
            <p class="font-semibold" style="color:${t.type === 'Topup' ? 'var(--brand)' : '#b45309'}">${t.type === 'Topup' ? '+' : '−'}${fmtMoney(t.amount)}</p></div>`).join('')
          : '<p class="muted text-sm">No transactions yet.</p>'}
        </div>${dialogFoot('Close', '')}`, { noFocus: true })
    } })
  }
  paint()
}

// ------------------------------------------------------------
// INVENTORY
// ------------------------------------------------------------
function inventory(mount) {
  let q = '', catF = ''
  const CAT = { Equipment: 'badge-soft', Furniture: 'badge-teal', 'Lab Supply': 'badge-warn', Textbook: 'badge-violet', Stationery: 'badge-info' }
  const COND = { New: 'badge-soft', Good: 'badge-teal', Fair: 'badge-warn', Poor: 'badge-danger' }
  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)
  function paint() {
    const items = DB.data.inventory
    const filtered = items.filter((i) => (!catF || i.category === catF) && (!q || i.name.toLowerCase().includes(q)))
    const low = items.filter((i) => i.quantity <= i.minStock)
    const cats = ['All', ...Object.keys(CAT)]
    root.innerHTML = `
    ${banner('package-open', 'Inventory', 'Track school assets and supplies.',
      `<button class="btn btn-white" data-add>${icon('plus', '', 16)} Add Item</button>`)}
    <div class="stat-grid stagger">
      ${statCard({ ic: 'package-open', color: 'emerald', label: 'Total Items', value: String(items.length), trend: 'Tracked' })}
      ${statCard({ ic: 'alert-triangle', color: 'amber', label: 'Low Stock', value: String(low.length), trend: 'Needs reorder' })}
      ${statCard({ ic: 'layout-dashboard', color: 'teal', label: 'Categories', value: String(new Set(items.map((i) => i.category)).size), trend: 'In use' })}
      ${statCard({ ic: 'dollar-sign', color: 'cyan', label: 'Total Value', value: '$' + items.reduce((a, i) => a + i.quantity * 5, 0).toLocaleString(), trend: 'Estimated' })}
    </div>
    ${low.length ? `<div class="dropzone" style="border-color:#f59e0b;background:color-mix(in srgb,#f59e0b 8%,transparent)">
      ${icon('alert-triangle', '', 18)}<p class="text-xs" style="color:#b45309"><b>Low Stock Alert:</b>&nbsp;${low.map((i) => `${esc(i.name)} (${i.quantity}/${i.minStock})`).join(' · ')}</p></div>` : ''}
    <div class="card"><div class="card-c tight"><div class="toolbar" style="padding:0">
      <div class="input-wrap">${icon('search', 'input-ic', 16)}<input class="input has-ic" id="inv-q" placeholder="Search items..." value="${esc(q)}"></div>
      ${sel('inv-cat', cats.map((c) => [c === 'All' ? '' : c, c]), catF, 'style="width:11rem"')}
      <button class="btn btn-outline btn-sm" data-export>${icon('download', '', 14)} Export CSV</button>
    </div></div></div>
    <div class="card"><div class="card-c flush">
      ${filtered.length === 0 ? empty('package-open', 'No items found.') : `
      <div class="table-wrap"><table class="table"><thead><tr>
        <th>Item</th><th>Category</th><th>Quantity</th><th class="hide-md-down">Condition</th><th class="hide-md-down">Location</th><th class="hide-md-down">Min Stock</th><th style="text-align:right">Actions</th>
      </tr></thead><tbody>
        ${filtered.map((i) => {
          const isLow = i.quantity <= i.minStock
          return `<tr>
          <td><p class="font-medium">${esc(i.name)}</p>${i.notes ? `<p class="cell-sub">${esc(i.notes)}</p>` : ''}</td>
          <td><span class="badge ${CAT[i.category] || 'badge-muted'}">${esc(i.category)}</span></td>
          <td><div class="row gap-1">
            <button class="btn btn-ghost btn-icon" style="width:1.5rem;height:1.5rem" data-step="${i.id}" data-d="-1">${icon('x', '', 10)}</button>
            <span class="badge ${isLow ? 'badge-warn' : 'badge-muted'}" style="font-family:ui-monospace,monospace">${i.quantity} ${esc(i.unit)}</span>
            <button class="btn btn-ghost btn-icon" style="width:1.5rem;height:1.5rem" data-step="${i.id}" data-d="1">${icon('plus', '', 10)}</button>
          </div></td>
          <td class="hide-md-down"><span class="badge ${COND[i.condition] || 'badge-muted'}">${esc(i.condition)}</span></td>
          <td class="hide-md-down"><p class="text-sm">${esc(i.location || '—')}</p></td>
          <td class="hide-md-down"><p class="text-sm ${isLow ? 'font-semibold" style="color:#b45309' : 'muted'}">${i.minStock}${isLow ? ' ⚠' : ''}</p></td>
          <td><div class="row gap-1" style="justify-content:flex-end">
            <button class="btn btn-ghost btn-icon" data-edit="${i.id}">${icon('pencil', '', 16)}</button>
            <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-del="${i.id}">${icon('trash-2', '', 16)}</button>
          </div></td>
        </tr>`
        }).join('')}
      </tbody></table></div>`}
    </div></div>`
    root.querySelector('#inv-q').oninput = (e) => { q = e.target.value.toLowerCase(); paint() }
    root.querySelector('#inv-cat').onchange = (e) => { catF = e.target.value; paint() }
    root.querySelectorAll('[data-step]').forEach((b) => { b.onclick = () => {
      const item = DB.data.inventory.find((x) => x.id === b.dataset.step)
      item.quantity = Math.max(0, item.quantity + Number(b.dataset.d))
      DB.save(); paint()
    } })
    root.querySelector('[data-export]').onclick = () => {
      const rows = DB.data.inventory.map((i) => [i.name, i.category, i.quantity, i.unit, i.condition, i.location || ''])
      csvDownload([['name', 'category', 'quantity', 'unit', 'condition', 'location'], ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n'), 'inventory.csv')
      toast('success', 'Exported', 'Inventory exported to CSV.')
    }
    root.querySelector('[data-add]').onclick = () => invDialog(null, paint)
    root.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => invDialog(DB.data.inventory.find((x) => x.id === b.dataset.edit), paint) })
    root.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => {
      const i = DB.data.inventory.find((x) => x.id === b.dataset.del)
      confirmDialog('Delete item?', `Remove "${i.name}" from inventory?`, 'Delete', () => {
        DB.data.inventory = DB.data.inventory.filter((x) => x.id !== i.id); DB.save(); toast('success', 'Item deleted'); paint()
      })
    } })
  }
  paint()
  function invDialog(i, onDone) {
    const f = i || { name: '', category: 'Equipment', quantity: 1, unit: 'pcs', condition: 'New', location: '', minStock: 0, notes: '' }
    const wrap = openDialog(`${dialogHead(i ? 'Edit Item' : 'Add Item')}
      <div class="form-grid">
        ${field('Item Name *', `<input class="input" id="iv-name" value="${esc(f.name)}">`)}
        ${field('Category', sel('iv-cat', Object.keys(CAT), f.category))}
        ${field('Condition', sel('iv-cond', Object.keys(COND), f.condition))}
        ${field('Quantity', `<input class="input" id="iv-qty" type="number" value="${f.quantity}" min="0">`)}
        ${field('Unit', sel('iv-unit', ['pcs', 'boxes', 'sets', 'books'], f.unit))}
        ${field('Min Stock', `<input class="input" id="iv-min" type="number" value="${f.minStock}" min="0">`)}
        ${field('Location', `<input class="input" id="iv-loc" value="${esc(f.location)}">`)}
        ${field('Notes', `<input class="input" id="iv-notes" value="${esc(f.notes)}">`)}
      </div>
      ${dialogFoot('Cancel', `<button class="btn btn-brand" id="iv-save">${icon('check', '', 14)} Save Item</button>`)}`, { wide: true })
    wrap.querySelector('#iv-save').onclick = () => {
      const v = (id) => wrap.querySelector('#' + id).value
      if (!v('iv-name').trim()) { toast('error', 'Item name is required'); return }
      const data = { name: v('iv-name').trim(), category: v('iv-cat'), condition: v('iv-cond'), quantity: Number(v('iv-qty')) || 0, unit: v('iv-unit'), minStock: Number(v('iv-min')) || 0, location: v('iv-loc'), notes: v('iv-notes'), updatedAt: nowIso() }
      if (i) Object.assign(i, data)
      else DB.data.inventory.push({ id: uid('inv'), ...data })
      DB.save(); closeDialog(); toast('success', 'Item saved'); onDone()
    }
  }
}

// ------------------------------------------------------------
// FACILITIES
// ------------------------------------------------------------
function facilities(mount) {
  const d = DB.data
  const TYPE = { Room: { ic: 'door-open', chip: 'badge-soft' }, Lab: { ic: 'flask', chip: 'badge-teal' }, Hall: { ic: 'building', chip: 'badge-warn' }, Field: { ic: 'map-pin', chip: 'badge-info' }, Equipment: { ic: 'package-open', chip: 'badge-violet' } }
  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)
  function paint() {
    const facs = d.facilities
    const bks = d.bookings
    root.innerHTML = `
    ${banner('door-open', 'Facilities Booking', 'Reserve rooms, labs and grounds.',
      `<button class="btn btn-white" data-book>${icon('calendar', '', 16)} Book Facility</button>
       <button class="btn btn-brand" data-addfac>${icon('plus', '', 16)} Add Facility</button>`)}
    <div class="stat-grid stagger">
      ${statCard({ ic: 'door-open', color: 'emerald', label: 'Total Facilities', value: String(facs.length), trend: 'Available spaces' })}
      ${statCard({ ic: 'check', color: 'teal', label: 'Bookable', value: String(facs.filter((f) => f.isBookable).length), trend: 'Open for booking' })}
      ${statCard({ ic: 'calendar', color: 'amber', label: 'Active Bookings', value: String(bks.filter((b) => b.status === 'Approved').length), trend: 'Approved' })}
      ${statCard({ ic: 'clock', color: 'cyan', label: 'Pending Requests', value: String(bks.filter((b) => b.status === 'Pending').length), trend: 'Awaiting review' })}
    </div>
    <div class="cols-lg-3" style="grid-template-columns:1.5fr 1fr">
      <div class="stack-4">
        <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem">
          ${facs.map((f) => {
            const t = TYPE[f.type] || TYPE.Room
            const count = bks.filter((b) => b.facilityId === f.id).length
            return `<div class="card" style="overflow:hidden"><div style="height:4px;background:var(--brand)"></div>
            <div class="card-c stack-3">
              <div class="row gap-3"><span class="stat-ic ic-emerald" style="border-radius:.75rem">${icon(t.ic === 'flask' ? 'stethoscope' : t.ic, '', 18)}</span>
                <div class="flex-1"><p class="font-semibold">${esc(f.name)}</p><span class="badge ${t.chip}">${esc(f.type)}</span></div>
                <span class="row gap-1 text-xs ${f.isBookable ? '' : 'muted'}"><span class="legend-swatch" style="background:${f.isBookable ? 'var(--brand)' : 'var(--muted-foreground)'}"></span>${f.isBookable ? 'Bookable' : 'Closed'}</span></div>
              <div class="row gap-4 text-xs muted"><span>${icon('users', '', 12)} ${f.capacity}</span><span>${icon('map-pin', '', 12)} ${esc(f.location || '—')}</span><span>${icon('calendar', '', 12)} ${count} booking(s)</span></div>
              ${f.notes ? `<p class="text-xs muted">${esc(f.notes)}</p>` : ''}
              <div class="row gap-2" style="justify-content:flex-end">
                ${f.isBookable ? `<button class="btn btn-outline btn-sm" data-bookf="${f.id}">Book</button>` : ''}
                <button class="btn btn-ghost btn-icon" data-editfac="${f.id}">${icon('pencil', '', 14)}</button>
              </div>
            </div></div>`
          }).join('')}
        </div>
      </div>
      ${card('Bookings', '', bks.length ? bks.map((b) => `
        <div class="row-card stack-2">
          <div class="row between gap-2"><p class="text-sm font-semibold">${esc(b.title)}</p>
            <span class="badge ${b.status === 'Approved' ? 'badge-soft' : b.status === 'Pending' ? 'badge-warn' : 'badge-danger'}">${b.status}</span></div>
          <p class="text-xs muted">${esc(b.facilityName)} · ${new Date(b.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${esc(b.startTime)}–${esc(b.endTime)}</p>
          <p class="text-xs muted">by ${esc(b.requestedByName || '—')} · ${timeAgo(b.createdAt)}</p>
          ${b.status === 'Pending' ? `<div class="row gap-2" style="justify-content:flex-end">
            <button class="btn btn-outline btn-sm" data-approve="${b.id}">${icon('check', '', 12)} Approve</button>
            <button class="btn btn-ghost btn-sm" style="color:#ef4444" data-reject="${b.id}">${icon('x', '', 12)} Reject</button></div>` : ''}
        </div>`).join('') : empty('calendar', 'No bookings yet.'), { titleSize: 'text-base' })}
    </div>`

    root.querySelector('[data-book]').onclick = () => bookingDialog(null, paint)
    root.querySelectorAll('[data-bookf]').forEach((b) => { b.onclick = () => bookingDialog(d.facilities.find((x) => x.id === b.dataset.bookf), paint) })
    root.querySelector('[data-addfac]').onclick = () => facilityDialog(null, paint)
    root.querySelectorAll('[data-editfac]').forEach((b) => { b.onclick = () => facilityDialog(d.facilities.find((x) => x.id === b.dataset.editfac), paint) })
    root.querySelectorAll('[data-approve]').forEach((b) => { b.onclick = () => {
      const bk = d.bookings.find((x) => x.id === b.dataset.approve)
      bk.status = 'Approved'; bk.reviewedByName = store.user.name; DB.save(); toast('success', 'Booking approved'); paint()
    } })
    root.querySelectorAll('[data-reject]').forEach((b) => { b.onclick = () => {
      const bk = d.bookings.find((x) => x.id === b.dataset.reject)
      bk.status = 'Rejected'; bk.reviewedByName = store.user.name; DB.save(); toast('info', 'Booking rejected'); paint()
    } })
  }
  paint()
  function bookingDialog(fac, onDone) {
    const bookable = DB.data.facilities.filter((f) => f.isBookable)
    const wrap = openDialog(`${dialogHead('Book a Facility')}
      <div class="form-grid">
        ${field('Facility', sel('fb-fac', bookable.map((f) => [f.id, f.name]), fac?.id || bookable[0]?.id))}
        ${field('Title *', `<input class="input" id="fb-title">`)}
        ${field('Purpose', `<input class="input" id="fb-purpose" placeholder="What is it for?">`)}
        ${field('Date *', `<input class="input" id="fb-date" type="date" value="${dateOffset(1)}">`)}
        ${field('Start Time', `<input class="input" id="fb-start" type="time" value="09:00">`)}
        ${field('End Time', `<input class="input" id="fb-end" type="time" value="10:00">`)}
      </div>
      ${dialogFoot('Cancel', `<button class="btn btn-brand" id="fb-save">${icon('calendar', '', 14)} Request Booking</button>`)}`, { wide: true })
    wrap.querySelector('#fb-save').onclick = () => {
      const v = (id) => wrap.querySelector('#' + id).value
      const f = bookable.find((x) => x.id === v('fb-fac'))
      if (!v('fb-title').trim()) { toast('error', 'Title is required'); return }
      DB.data.bookings.push({ id: uid('bkg'), facilityId: f.id, facilityName: f.name, facilityType: f.type, requestedById: store.user.id, requestedByName: store.user.name, title: v('fb-title').trim(), purpose: v('fb-purpose'), date: v('fb-date'), startTime: v('fb-start'), endTime: v('fb-end'), status: 'Pending', reviewedByName: null, createdAt: nowIso() })
      DB.save(); closeDialog(); toast('success', 'Booking requested', `${f.name} — pending approval.`); onDone()
    }
  }
  function facilityDialog(f, onDone) {
    const fa = f || { name: '', type: 'Room', capacity: 20, location: '', isBookable: true, notes: '' }
    const wrap = openDialog(`${dialogHead(f ? 'Edit Facility' : 'Add Facility')}
      <div class="form-grid">
        ${field('Name *', `<input class="input" id="fc-name" value="${esc(fa.name)}">`)}
        ${field('Type', sel('fc-type', Object.keys(TYPE), fa.type))}
        ${field('Capacity', `<input class="input" id="fc-cap" type="number" value="${fa.capacity}">`)}
        ${field('Location', `<input class="input" id="fc-loc" value="${esc(fa.location)}">`)}
        <label class="row gap-2 text-sm" style="cursor:pointer"><input type="checkbox" id="fc-book" ${fa.isBookable ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--brand)"> Bookable</label>
        ${field('Notes', `<input class="input" id="fc-notes" value="${esc(fa.notes)}">`)}
      </div>
      ${dialogFoot('Cancel', `<button class="btn btn-brand" id="fc-save">${icon('check', '', 14)} Save Facility</button>`)}`)
    wrap.querySelector('#fc-save').onclick = () => {
      const v = (id) => wrap.querySelector('#' + id).value
      if (!v('fc-name').trim()) { toast('error', 'Name is required'); return }
      const data = { name: v('fc-name').trim(), type: v('fc-type'), capacity: Number(v('fc-cap')) || 0, location: v('fc-loc'), isBookable: wrap.querySelector('#fc-book').checked, notes: v('fc-notes') }
      if (f) Object.assign(f, data)
      else DB.data.facilities.push({ id: uid('fac'), ...data })
      DB.save(); closeDialog(); toast('success', 'Facility saved'); onDone()
    }
  }
}

// ------------------------------------------------------------
// ACTIVITIES
// ------------------------------------------------------------
function activities(mount) {
  const u = store.user
  const isStudent = u.role === 'Student'
  let filter = 'All'
  const TYPE = { Sports: 'badge-soft', Science: 'badge-teal', Cultural: 'badge-violet', Charity: 'badge-warn', Activity: 'badge-info' }
  const TYPE_BAR = { Sports: 'var(--brand)', Science: '#0d9488', Cultural: '#8b5cf6', Charity: '#f59e0b', Activity: '#0ea5e9' }
  const STATUS = { Planned: 'badge-warn', Ongoing: 'badge-soft', Completed: 'badge-muted', Cancelled: 'badge-danger' }
  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)

  function paint() {
    const evs = DB.data.schoolEvents
    const filtered = evs.filter((e) => filter === 'All' || e.type === filter)
    root.innerHTML = `
    ${banner('trophy', 'School Activities', 'Clubs, sports and special events.',
      `<button class="btn btn-white" data-add>${icon('plus', '', 16)} Add Event</button>`)}
    <div class="stat-grid stagger">
      ${statCard({ ic: 'trophy', color: 'emerald', label: 'Total Events', value: String(evs.length), trend: 'All time' })}
      ${statCard({ ic: 'clock', color: 'amber', label: 'Upcoming', value: String(evs.filter((e) => e.status === 'Planned').length), trend: 'Planned' })}
      ${statCard({ ic: 'check', color: 'teal', label: 'Completed', value: String(evs.filter((e) => e.status === 'Completed').length), trend: 'Done' })}
      ${statCard({ ic: 'users', color: 'cyan', label: 'Participants', value: String(DB.data.eventParticipants.length), trend: 'Sign-ups' })}
    </div>
    <div class="row gap-2 wrap">${['All', ...Object.keys(TYPE)].map((t) =>
      `<button class="subj-chip ${filter === t ? 'sc-brand' : 'sc-slate'}" data-f="${t}">${t}</button>`).join('')}</div>
    ${filtered.length === 0 ? `<div class="card">${empty('trophy', 'No events found.')}</div>` : `
    <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem">
      ${filtered.map((e) => `
      <div class="card" style="overflow:hidden"><div style="height:4px;background:${TYPE_BAR[e.type] || 'var(--brand)'}"></div>
      <div class="card-c stack-3">
        <div class="row between gap-2"><p class="font-semibold">${esc(e.title)}</p>
          <span class="badge ${STATUS[e.status] || 'badge-muted'}">${esc(e.status)}</span></div>
        <span class="subj-chip ${TYPE[e.type] || 'sc-slate'}" style="align-self:flex-start">${esc(e.type)}</span>
        <div class="stack-2 text-xs muted">
          <span class="row gap-1">${icon('calendar', '', 12)} ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}${e.startTime ? ' · ' + esc(e.startTime) : ''}</span>
          ${e.venue ? `<span class="row gap-1">${icon('map-pin', '', 12)} ${esc(e.venue)}</span>` : ''}
          <span class="row gap-1">${icon('users', '', 12)} ${e.participantCount} participant(s)</span>
        </div>
        <div class="row gap-2" style="justify-content:flex-end">
          <button class="btn btn-outline btn-sm" data-view="${e.id}">View Details</button>
          ${!isStudent ? `<button class="btn btn-ghost btn-icon" data-edit="${e.id}">${icon('pencil', '', 14)}</button>
            <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-del="${e.id}">${icon('trash-2', '', 14)}</button>` : ''}
        </div>
      </div></div>`).join('')}
    </div>`}`

    root.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { filter = b.dataset.f; paint() } })
    root.querySelector('[data-add]')?.addEventListener('click', () => actDialog(null, paint))
    root.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => actDialog(evs.find((x) => x.id === b.dataset.edit), paint) })
    root.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => {
      const e = evs.find((x) => x.id === b.dataset.del)
      confirmDialog('Delete event?', `Remove "${e.title}"?`, 'Delete', () => {
        DB.data.schoolEvents = evs.filter((x) => x.id !== e.id); DB.save(); toast('success', 'Event deleted'); paint()
      })
    } })
    root.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => {
      const e = evs.find((x) => x.id === b.dataset.view)
      const parts = DB.data.eventParticipants.filter((p) => p.eventId === e.id)
      const registered = parts.some((p) => p.userId === u.id)
      const wrap = openDialog(`${dialogHead(esc(e.title), `${esc(e.type)} · ${esc(e.status)}`)}
        <div class="stack-3 mt-3">
          <div class="form-grid" style="grid-template-columns:1fr 1fr">
            <div><p class="label-sm">Date</p><p class="text-sm">${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p></div>
            <div><p class="label-sm">Time</p><p class="text-sm">${esc(e.startTime || '—')} – ${esc(e.endTime || '—')}</p></div>
            <div><p class="label-sm">Venue</p><p class="text-sm">${esc(e.venue || '—')}</p></div>
            <div><p class="label-sm">Status</p><p class="text-sm">${esc(e.status)}</p></div>
          </div>
          ${e.description ? `<p class="text-sm muted">${esc(e.description)}</p>` : ''}
          <div><p class="label-sm">Participants (${parts.length})</p>
            <div class="stack-2 mt-1">${parts.map((p) => `
              <div class="row-card row gap-2">${avatarHtml(p.userName, p.userRole, 'av-6')}
                <span class="flex-1 text-sm">${esc(p.userName)}</span><span class="badge badge-muted">${esc(p.role)}</span>
                ${!isStudent ? `<button class="btn btn-ghost btn-icon" style="color:#ef4444" data-rm="${p.id}">${icon('x', '', 12)}</button>` : ''}</div>`).join('') || '<p class="text-xs muted">No participants yet.</p>'}</div></div>
          ${isStudent
            ? registered ? '<span class="badge badge-soft" style="align-self:flex-start">✓ You are registered</span>'
              : `<button class="btn btn-brand" data-register>${icon('check', '', 14)} Register for this Event</button>`
            : `<div class="row gap-2"><select class="input" id="pt-role" style="width:10rem">${['Participant', 'Organizer', 'Volunteer', 'Judge', 'Speaker'].map((r) => `<option>${r}</option>`).join('')}</select>
               <button class="btn btn-outline" data-addme>Add me</button></div>`}
        </div>${dialogFoot('Close', '')}`, { wide: true, noFocus: true })
      wrap.querySelectorAll('[data-rm]').forEach((x) => { x.onclick = () => {
        DB.data.eventParticipants = DB.data.eventParticipants.filter((p) => p.id !== x.dataset.rm)
        e.participantCount = Math.max(0, e.participantCount - 1); DB.save(); closeDialog(); toast('success', 'Participant removed'); paint()
      } })
      wrap.querySelector('[data-register]')?.addEventListener('click', () => {
        DB.data.eventParticipants.push({ id: uid('ept'), eventId: e.id, userId: u.id, userName: u.name, userRole: u.role, role: 'Participant', createdAt: nowIso() })
        e.participantCount++; DB.save(); closeDialog(); toast('success', 'Registered!', e.title); paint()
      })
      wrap.querySelector('[data-addme]')?.addEventListener('click', () => {
        const role = wrap.querySelector('#pt-role').value
        DB.data.eventParticipants.push({ id: uid('ept'), eventId: e.id, userId: u.id, userName: u.name, userRole: u.role, role, createdAt: nowIso() })
        e.participantCount++; DB.save(); closeDialog(); toast('success', 'Added as ' + role); paint()
      })
    } })
  }
  paint()
  function actDialog(e, onDone) {
    const f = e || { title: '', type: 'Sports', description: '', date: dateOffset(7), startTime: '09:00', endTime: '12:00', venue: '', status: 'Planned' }
    const wrap = openDialog(`${dialogHead(e ? 'Edit Event' : 'Add Event')}
      <div class="form-grid">
        ${field('Title *', `<input class="input" id="ac-title" value="${esc(f.title)}">`)}
        ${field('Type', sel('ac-type', Object.keys(TYPE), f.type))}
        ${field('Date', `<input class="input" id="ac-date" type="date" value="${f.date}">`)}
        ${field('Status', sel('ac-status', Object.keys(STATUS), f.status))}
        ${field('Start Time', `<input class="input" id="ac-start" type="time" value="${f.startTime}">`)}
        ${field('End Time', `<input class="input" id="ac-end" type="time" value="${f.endTime}">`)}
        ${field('Venue', `<input class="input" id="ac-venue" value="${esc(f.venue)}">`)}
        ${field('Description', `<textarea class="input" id="ac-desc" rows="3">${esc(f.description)}</textarea>`)}
      </div>
      ${dialogFoot('Cancel', `<button class="btn btn-brand" id="ac-save">${icon('check', '', 14)} Save Event</button>`)}`, { wide: true })
    wrap.querySelector('#ac-save').onclick = () => {
      const v = (id) => wrap.querySelector('#' + id).value
      if (!v('ac-title').trim()) { toast('error', 'Title is required'); return }
      const data = { title: v('ac-title').trim(), type: v('ac-type'), date: v('ac-date'), status: v('ac-status'), startTime: v('ac-start'), endTime: v('ac-end'), venue: v('ac-venue'), description: v('ac-desc') }
      if (e) Object.assign(e, data)
      else DB.data.schoolEvents.push({ id: uid('sev'), ...data, participantCount: 0, createdAt: nowIso() })
      DB.save(); closeDialog(); toast('success', 'Event saved'); onDone()
    }
  }
}

// ------------------------------------------------------------
// UNIFORM
// ------------------------------------------------------------
function uniform(mount) {
  const u = store.user
  const isStudent = u.role === 'Student'
  const d = DB.data
  const CAT = { Shirt: 'badge-soft', Pants: 'badge-teal', Skirt: 'badge-violet', Tie: 'badge-warn', Blazer: 'badge-info', Socks: 'badge-muted', Shoes: 'badge-danger', General: 'badge-muted' }
  const CAT_BAR = { Shirt: 'var(--brand)', Pants: '#0d9488', Skirt: '#8b5cf6', Tie: '#f59e0b', Blazer: '#0ea5e9', Socks: '#64748b', Shoes: '#f43f5e', General: '#64748b' }

  if (isStudent) {
    const mine = d.uniformAllocations.filter((a) => a.userId === u.id)
    mount.innerHTML = `
    ${banner('shirt', 'Uniform Management', 'Your issued uniforms and the school catalogue.')}
    ${card('My Uniforms', '', mine.length ? mine.map((a) => `
      <div class="row-card row gap-3">
        <span class="stat-ic ic-emerald" style="width:2.25rem;height:2.25rem;border-radius:.5rem">${icon('shirt', '', 14)}</span>
        <div class="flex-1"><p class="text-sm font-medium">${esc(a.uniformName)}</p><p class="text-xs muted">Size ${esc(a.size)} · Qty ${a.quantity}</p></div>
        <span class="badge ${a.status === 'Issued' ? 'badge-soft' : 'badge-muted'}">${a.status}</span>
      </div>`).join('') : empty('shirt', 'No uniforms issued yet.'), { titleSize: 'text-base' })}
    ${card('Uniform Catalog', '', d.uniformItems.map((i) => `
      <div class="row-card row gap-3">
        <div class="flex-1"><p class="text-sm font-medium">${esc(i.name)}</p>
          <div class="chip-row mt-1">${i.sizes.map((s) => `<span class="badge badge-outline" style="font-size:10px">${esc(s)}</span>`).join('')}</div></div>
        <p class="font-semibold">${fmtMoney(i.price)}</p>
      </div>`).join(''), { titleSize: 'text-base' })}`
    return
  }

  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)
  function paint() {
    const items = d.uniformItems
    const allocs = d.uniformAllocations
    const lowStock = items.filter((i) => i.stock < 5)
    root.innerHTML = `
    ${banner('shirt', 'Uniform Management', 'Stock, pricing and allocations.',
      `<button class="btn btn-white" data-additem>${icon('plus', '', 16)} Add Item</button>`)}
    <div class="stat-grid stagger">
      ${statCard({ ic: 'shirt', color: 'emerald', label: 'Total Items', value: String(items.length), trend: 'Catalogue' })}
      ${statCard({ ic: 'package-open', color: 'teal', label: 'Total Stock', value: String(items.reduce((a, i) => a + i.stock, 0)), trend: 'Units on hand' })}
      ${statCard({ ic: 'alert-triangle', color: 'amber', label: 'Low Stock', value: String(lowStock.length), trend: 'Fewer than 5' })}
      ${statCard({ ic: 'users', color: 'cyan', label: 'Allocated', value: String(allocs.filter((a) => a.status === 'Issued').length), trend: 'Issued items' })}
    </div>
    <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem">
      ${items.map((i) => {
        const issued = allocs.filter((a) => a.uniformId === i.id && a.status === 'Issued').length
        return `<div class="card" style="overflow:hidden"><div style="height:4px;background:${CAT_BAR[i.category] || 'var(--brand)'}"></div>
        <div class="card-c stack-3">
          <div class="row between gap-2"><p class="font-semibold">${esc(i.name)}</p><span class="badge ${CAT[i.category] || 'badge-muted'}">${esc(i.category)}</span></div>
          <p class="text-lg font-bold">${fmtMoney(i.price)}</p>
          <div class="chip-row">${i.sizes.map((s) => `<span class="badge badge-outline">${esc(s)}</span>`).join('')}</div>
          <p class="text-sm" style="color:${i.stock < 5 ? '#ef4444' : i.stock < 15 ? '#b45309' : 'inherit'};font-weight:600">Stock: ${i.stock}</p>
          <p class="text-xs muted">${issued} issued</p>
          ${i.stock < 5 ? '<p class="text-xs" style="color:#b45309">⚠ Low stock — reorder soon</p>' : ''}
          <div class="row gap-2" style="justify-content:flex-end">
            <button class="btn btn-outline btn-sm" data-issue="${i.id}">Issue</button>
            <button class="btn btn-ghost btn-icon" data-edit="${i.id}">${icon('pencil', '', 14)}</button>
            <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-del="${i.id}">${icon('trash-2', '', 14)}</button>
          </div>
        </div></div>`
      }).join('')}
    </div>
    ${card('Uniform Allocations', '', allocs.length ? `<div class="table-wrap"><table class="table"><thead><tr>
      <th>Student</th><th>Item</th><th>Size</th><th>Qty</th><th>Status</th><th class="hide-md-down">Date</th><th style="text-align:right">Actions</th>
    </tr></thead><tbody>
      ${allocs.map((a) => `
      <tr>
        <td><div class="row gap-3">${avatarHtml(a.userName, 'Student', 'av-8')}<p class="font-medium">${esc(a.userName)}</p></div></td>
        <td>${esc(a.uniformName)}</td>
        <td><span class="badge badge-outline">${esc(a.size)}</span></td>
        <td>${a.quantity}</td>
        <td><span class="badge ${a.status === 'Issued' ? 'badge-soft' : 'badge-muted'}">${a.status}</span></td>
        <td class="hide-md-down"><p class="cell-sub">${a.date}</p></td>
        <td><div class="row gap-1" style="justify-content:flex-end">
          ${a.status === 'Issued' ? `<button class="btn btn-outline btn-sm" data-return="${a.id}">Return</button>` : ''}
          <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-delal="${a.id}">${icon('trash-2', '', 14)}</button>
        </div></td>
      </tr>`).join('')}
    </tbody></table></div>` : empty('shirt', 'No allocations yet.'), { titleSize: 'text-base', flush: true })}`

    root.querySelector('[data-additem]').onclick = () => itemDialog(null, paint)
    root.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => itemDialog(items.find((x) => x.id === b.dataset.edit), paint) })
    root.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => {
      const i = items.find((x) => x.id === b.dataset.del)
      confirmDialog('Delete item?', `Remove "${i.name}" from the catalogue?`, 'Delete', () => {
        DB.data.uniformItems = items.filter((x) => x.id !== i.id); DB.save(); toast('success', 'Item deleted'); paint()
      })
    } })
    root.querySelectorAll('[data-issue]').forEach((b) => { b.onclick = () => issueDialog(items.find((x) => x.id === b.dataset.issue), paint) })
    root.querySelectorAll('[data-return]').forEach((b) => { b.onclick = () => {
      const a = allocs.find((x) => x.id === b.dataset.return)
      a.status = 'Returned'
      const item = items.find((x) => x.id === a.uniformId)
      if (item) item.stock += a.quantity
      DB.save(); toast('success', 'Marked returned'); paint()
    } })
    root.querySelectorAll('[data-delal]').forEach((b) => { b.onclick = () => {
      DB.data.uniformAllocations = allocs.filter((x) => x.id !== b.dataset.delal)
      DB.save(); toast('success', 'Allocation deleted'); paint()
    } })
  }
  paint()
  function itemDialog(i, onDone) {
    const f = i || { name: '', category: 'Shirt', sizes: 'S, M, L', price: 2000, stock: 10 }
    const wrap = openDialog(`${dialogHead(i ? 'Edit Item' : 'Add Uniform Item')}
      <div class="form-grid">
        ${field('Name *', `<input class="input" id="uf-name" value="${esc(f.name)}">`)}
        ${field('Category', sel('uf-cat', Object.keys(CAT), f.category))}
        ${field('Sizes (comma separated)', `<input class="input" id="uf-sizes" value="${esc(Array.isArray(f.sizes) ? f.sizes.join(', ') : f.sizes)}">`)}
        ${field('Price (cents)', `<input class="input" id="uf-price" type="number" value="${f.price}">`)}
        ${field('Stock', `<input class="input" id="uf-stock" type="number" value="${f.stock}">`)}
      </div>
      ${dialogFoot('Cancel', `<button class="btn btn-brand" id="uf-save">${icon('check', '', 14)} Save Item</button>`)}`)
    wrap.querySelector('#uf-save').onclick = () => {
      const v = (id) => wrap.querySelector('#' + id).value
      if (!v('uf-name').trim()) { toast('error', 'Name is required'); return }
      const data = { name: v('uf-name').trim(), category: v('uf-cat'), sizes: v('uf-sizes').split(',').map((s) => s.trim()).filter(Boolean), price: Number(v('uf-price')) || 0, stock: Number(v('uf-stock')) || 0 }
      if (i) Object.assign(i, data)
      else DB.data.uniformItems.push({ id: uid('uni'), ...data })
      DB.save(); closeDialog(); toast('success', 'Item saved'); onDone()
    }
  }
  function issueDialog(item, onDone) {
    const wrap = openDialog(`${dialogHead('Issue Uniform')}
      <div class="form-grid">
        ${field('Item', sel('is-item', DB.data.uniformItems.map((i) => [i.id, `${i.name} (${i.stock} in stock)`]), item?.id))}
        ${field('Student', sel('is-student', DB.data.students.map((s) => [s.id, s.name]), ''))}
        ${field('Size', sel('is-size', (item?.sizes || ['One size']), (item?.sizes || ['One size'])[0]))}
        ${field('Quantity', `<input class="input" id="is-qty" type="number" value="1" min="1" max="${item?.stock ?? 1}">`)}
      </div>
      ${dialogFoot('Cancel', `<button class="btn btn-brand" id="is-save">${icon('check', '', 14)} Issue</button>`)}`)
    wrap.querySelector('#is-save').onclick = () => {
      const v = (id) => wrap.querySelector('#' + id).value
      const it = DB.data.uniformItems.find((x) => x.id === v('is-item'))
      const s = DB.data.students.find((x) => x.id === v('is-student'))
      const qty = Number(v('is-qty')) || 1
      if (!it || !s) { toast('error', 'Pick an item and student'); return }
      if (qty > it.stock) { toast('error', 'Not enough stock'); return }
      it.stock -= qty
      DB.data.uniformAllocations.unshift({ id: uid('ual'), uniformId: it.id, uniformName: it.name, userId: s.id, userName: s.name, size: v('is-size'), quantity: qty, status: 'Issued', date: todayStr(), createdAt: nowIso() })
      DB.save(); closeDialog(); toast('success', 'Uniform issued', `${qty} × ${it.name} → ${s.name}`); onDone()
    }
  }
}

// ------------------------------------------------------------
// BULK IMPORT
// ------------------------------------------------------------
function importView(mount) {
  mount.innerHTML = `
  <div class="cols-lg-3" style="grid-template-columns:1fr 1fr">
    <div id="imp-students"></div><div id="imp-staff"></div>
  </div>`
  importCard(mount.querySelector('#imp-students'), 'students')
  importCard(mount.querySelector('#imp-staff'), 'staff')
}

function importCard(el, kind) {
  const isStu = kind === 'students'
  const TEMPLATE = isStu
    ? 'first_name,last_name,dob,grade,class_name,guardian_name,guardian_phone\nJohn,Doe,2008-05-12,10,10A,Jane Doe,555-0100'
    : 'name,email,role,department,phone\nJane Smith,jane@edu.edu,Teacher,Sciences,555-0105'
  el.innerHTML = `
  <div class="card stack-4">
    <div class="card-h row"><div class="row gap-2">
      <span class="stat-ic ${isStu ? 'ic-emerald' : 'ic-teal'}" style="border-radius:.75rem">${icon(isStu ? 'users' : 'badge-check', '', 18)}</span>
      <div><h3 class="card-t text-base">Import ${isStu ? 'Students' : 'Staff'}</h3>
        <p class="card-d">Upload a CSV with the correct columns.</p></div></div></div>
    <div class="card-c stack-3" style="padding-top:.75rem">
      <div class="row gap-2 wrap">
        <button class="btn btn-outline btn-sm" data-tpl>${icon('download', '', 14)} Download Template</button>
        <label style="cursor:pointer"><span class="btn btn-brand btn-sm">${icon('upload', '', 14)} Choose CSV File</span>
          <input type="file" accept=".csv" style="display:none"></label>
      </div>
      <div class="dropzone" data-empty>${icon('upload', 'muted', 20)}<p class="text-sm muted">Choose a CSV file to preview rows here.</p></div>
      <div data-preview style="display:none"><div class="table-wrap" style="max-height:240px;overflow-y:auto;border:1px solid var(--border);border-radius:.5rem"></div>
        <p class="text-xs muted mt-2" data-more></p></div>
      <button class="btn btn-brand btn-block" data-go style="display:none">Import 0 records</button>
      <div data-done style="display:none" class="stack-3" class="text-center">
        <span class="stat-ic ic-emerald mx-auto" style="width:3rem;height:3rem;border-radius:9999px">${icon('check', '', 24)}</span>
        <p class="font-semibold text-center"><span data-done-n>0</span> record(s) imported</p>
        <button class="btn btn-outline btn-sm mx-auto" data-again>Import more</button>
      </div>
    </div></div>`

  let rows = []
  const preview = el.querySelector('[data-preview]')
  const dropzone = el.querySelector('[data-empty]')
  const goBtn = el.querySelector('[data-go]')
  const doneBox = el.querySelector('[data-done]')

  el.querySelector('[data-tpl]').onclick = () => {
    csvDownload(TEMPLATE, `${kind}_template.csv`)
    toast('info', 'Template downloaded')
  }
  el.querySelector('input[type=file]').onchange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    f.text().then((text) => {
      const lines = text.split('\n').filter((l) => l.trim())
      if (lines.length < 2) { toast('warning', 'Empty CSV', 'No data rows found.'); return }
      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
      rows = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.replace(/"/g, '').trim())
        const o = {}; headers.forEach((h, i) => { o[h] = cols[i] || '' }); return o
      }).filter((o) => Object.values(o).some(Boolean))
      dropzone.style.display = 'none'
      preview.style.display = 'block'
      doneBox.style.display = 'none'
      const shown = rows.slice(0, 50)
      const cols = Object.keys(shown[0] || {})
      preview.querySelector('.table-wrap').innerHTML = `<table class="table"><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${shown.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      el.querySelector('[data-more]').textContent = rows.length > 50 ? `+ ${rows.length - 50} more rows` : ''
      goBtn.style.display = 'block'
      goBtn.textContent = `Import ${rows.length} ${kind}`
    })
  }
  goBtn.onclick = () => {
    let n = 0
    for (const o of rows) {
      if (isStu) {
        if (!o.first_name) continue
        DB.data.students.push({ id: uid('stu'), name: `${o.first_name} ${o.last_name || ''}`.trim(), email: `${o.first_name}.${(o.last_name || 'x').toLowerCase()}@edu.edu`, dob: o.dob || '', grade: Number(o.grade) || 7, className: o.class_name || '7A', guardian: o.guardian_name || '', phone: o.guardian_phone || '', gender: '', bloodGroup: '', admissionNo: 'EDU-' + String(DB.data.students.length + 1).padStart(3, '0'), status: 'Active', feeStatus: 'Pending' })
      } else {
        if (!o.name) continue
        DB.data.staff.push({ id: uid('staff'), name: o.name, email: o.email || '', role: o.role || 'Teacher', department: o.department || 'General', phone: o.phone || '', status: 'Active', subjects: [], bio: '', avatar: null, password: 'staff123', points: 0, level: 1, badges: 0 })
      }
      n++
    }
    DB.save()
    preview.style.display = 'none'; goBtn.style.display = 'none'
    doneBox.style.display = 'flex'
    el.querySelector('[data-done]').style.flexDirection = 'column'
    el.querySelector('[data-done-n]').textContent = n
    toast('success', 'Import complete', `${n} record(s) imported.`)
  }
  el.querySelector('[data-again]').onclick = () => {
    rows = []; doneBox.style.display = 'none'; dropzone.style.display = 'flex'
    el.querySelector('input[type=file]').value = ''
  }
}

// ------------------------------------------------------------
// SETTINGS
// ------------------------------------------------------------
function settings(mount) {
  const d = DB.data
  const s = d.settings
  const ACCENTS = [
    ['Emerald', '5,150,105|4,120,87|16,185,129'], ['Teal', '13,148,136|15,118,110|20,184,166'],
    ['Cyan', '6,182,212|8,145,178|34,211,238'], ['Sky', '14,165,233|2,132,199|56,189,248'],
    ['Blue', '37,99,235|29,78,216|59,130,246'], ['Indigo', '79,70,229|67,56,202|99,102,241'],
    ['Violet', '124,58,237|109,40,217|139,92,246'], ['Purple', '147,51,234|126,34,206|168,85,247'],
    ['Fuchsia', '192,38,211|162,28,175|217,70,239'], ['Pink', '219,39,119|190,24,93|236,72,153'],
    ['Rose', '225,29,72|190,18,60|244,63,94'], ['Red', '220,38,38|185,28,28|239,68,68'],
    ['Orange', '234,88,12|194,65,12|249,115,22'], ['Amber', '217,119,6|180,83,9|245,158,11'],
    ['Yellow', '202,138,4|161,98,7|234,179,8'], ['Lime', '132,204,22|101,163,13|163,230,53'],
  ]
  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)

  function paint() {
    const hideable = ['students', 'staff', 'grades', 'attendance', 'timetable', 'fees', 'announcements', 'discipline', 'messages', 'assignments', 'library', 'events', 'parent-portal', 'reports', 'analytics', 'exams', 'health', 'transport', 'cafeteria', 'alumni', 'visitors', 'inventory', 'facilities', 'admissions', 'terms', 'performance', 'finance', 'conference', 'activities', 'uniform', 'import']
    const visibleCount = Object.keys(s.features).filter((k) => s.features[k] === false).length
    root.innerHTML = `
    ${card(`<span class="row gap-2" style="display:inline-flex">${icon('shirt', '', 16)} School Branding</span>`, 'Name, tagline and logo shown across the app.', `
      <div class="form-grid">
        ${field('School Name', `<input class="input" id="set-name" value="${esc(s.name)}">`)}
        ${field('Tagline', `<input class="input" id="set-tagline" value="${esc(s.tagline)}">`)}
      </div>
      <div class="row gap-3 wrap mt-2">
        <span class="logo-badge" style="width:5rem;height:5rem;border-radius:1rem">${s.logo ? `<img src="${s.logo}" alt="">` : icon('graduation-cap', '', 40)}</span>
        <div class="stack-2">
          <label style="cursor:pointer"><span class="btn btn-outline btn-sm">${icon('upload', '', 14)} Upload Logo</span>
            <input type="file" accept="image/*" id="set-logo" style="display:none"></label>
          ${s.logo ? `<button class="btn btn-ghost btn-sm" style="color:#ef4444" id="set-logo-rm">${icon('trash-2', '', 14)} Remove</button>` : ''}
        </div>
      </div>
      <div style="text-align:right"><button class="btn btn-brand btn-sm" id="set-brand-save">${icon('save', '', 14)} Save Branding</button></div>`, { titleSize: 'text-base' })}

    ${card(`<span class="row gap-2" style="display:inline-flex">${icon('palette', '', 16)} Color Scheme</span>`, 'The accent color re-skins the entire app, live.', `
      <div class="dropzone mb-3" style="justify-content:center">
        <div style="height:2rem;border-radius:.5rem;width:100%;background:linear-gradient(90deg,var(--brand),var(--brand-strong))"></div>
      </div>
      <div class="grid gap-2" style="grid-template-columns:repeat(8,1fr);gap:.5rem">
        ${ACCENTS.map((a) => {
          const [p] = a[1].split('|')
          const active = s.accent === a[1]
          return `<button class="acc-swatch" data-accent="${a[1]}" title="${a[0]}"
            style="width:100%;aspect-ratio:1;border-radius:.5rem;background:rgb(${p});position:relative;box-shadow:${active ? '0 0 0 2px var(--card),0 0 0 4px var(--brand)' : 'inset 0 0 0 1px rgba(0,0,0,.08)'}">
            ${active ? `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff">${icon('check', '', 16)}</span>` : ''}</button>`
        }).join('')}
      </div>`, { titleSize: 'text-base' })}

    ${card(`<span class="row gap-2" style="display:inline-flex">${icon('eye', '', 16)} Feature Visibility</span>`, `${visibleCount} module(s) hidden — hidden modules disappear from every role's navigation.`, `
      <div class="stack-2" style="max-height:320px;overflow-y:auto">
        ${hideable.map((id) => {
          const item = ['students', 'Staff'].includes(id) ? null : null
          const navItem = { students: ['Students', 'users'], staff: ['Staff Management', 'badge-check'], grades: ['Academics & Grades', 'clipboard-list'], attendance: ['Attendance', 'clipboard-check'], timetable: ['Timetable', 'calendar-clock'], fees: ['Fee Management', 'dollar-sign'], announcements: ['Announcements', 'megaphone'], discipline: ['Discipline', 'gavel'], messages: ['Messages', 'mail'], assignments: ['Assignments', 'clipboard-check'], library: ['Library', 'library'], events: ['Events Calendar', 'calendar-days'], 'parent-portal': ['Parent Portal', 'heart-handshake'], reports: ['Reports', 'file-text'], analytics: ['Analytics', 'bar-chart-3'], exams: ['Exams', 'graduation-cap'], health: ['Health Records', 'heart-pulse'], transport: ['Transportation', 'bus'], cafeteria: ['Cafeteria', 'utensils-crossed'], alumni: ['Alumni', 'graduation-cap'], visitors: ['Visitors', 'user-check'], inventory: ['Inventory', 'package-open'], facilities: ['Facilities', 'door-open'], admissions: ['Admissions', 'clipboard-paste'], terms: ['Terms & Calendar', 'calendar-range'], performance: ['Performance', 'star'], finance: ['Finance', 'wallet'], conference: ['Conferences', 'calendar-clock'], activities: ['Activities', 'trophy'], uniform: ['Uniform', 'shirt'], import: ['Bulk Import', 'upload'] }[id]
          const enabled = s.features[id] !== false
          return `<div class="row-card row gap-3">
            ${icon(navItem[1], 'muted', 16)}
            <div class="flex-1"><p class="text-sm font-medium">${navItem[0]}</p></div>
            <button class="switch ${enabled ? 'on' : ''}" data-feature="${id}" role="switch" aria-checked="${enabled}" aria-label="Toggle ${navItem[0]}"></button>
          </div>`
        }).join('')}
      </div>`, { titleSize: 'text-base' })}

    ${card(`<span class="row gap-2" style="display:inline-flex">${icon('phone', '', 16)} School Contact</span>`, 'Shown on the Parent Portal and reports.', `
      <div class="form-grid">
        ${field('Email', `<input class="input" id="set-email" type="email" value="${esc(s.email)}">`)}
        ${field('Phone', `<input class="input" id="set-phone" value="${esc(s.phone)}">`)}
        ${field('Address', `<textarea class="input" id="set-address" rows="2">${esc(s.address)}</textarea>`)}
      </div>
      <div style="text-align:right"><button class="btn btn-brand btn-sm" id="set-contact-save">${icon('save', '', 14)} Save Contact</button></div>`, { titleSize: 'text-base' })}

    <div class="card" style="border-color:color-mix(in srgb,#f43f5e 35%,transparent)">
      <div class="card-h"><h3 class="card-t text-base" style="color:#f43f5e">Danger Zone</h3>
        <p class="card-d">Reset the database to the original demo seed. All changes will be lost.</p></div>
      <div class="card-c"><div class="dropzone" style="border-color:#f43f5e;background:color-mix(in srgb,#f43f5e 6%,transparent);justify-content:space-between">
        <p class="text-sm" style="color:#f43f5e">This cannot be undone.</p>
        <button class="btn btn-destructive btn-sm" id="set-reset">${icon('rotate-ccw', '', 14)} Reset Demo Data</button></div></div>
    </div>`

    root.querySelector('#set-brand-save').onclick = () => {
      s.name = root.querySelector('#set-name').value.trim() || s.name
      s.tagline = root.querySelector('#set-tagline').value
      s.version++
      DB.save()
      toast('success', 'Branding saved', 'The school name updates everywhere.')
      document.querySelector('.sidebar-school') && (document.querySelector('.sidebar-school').textContent = s.name)
    }
    root.querySelector('#set-logo').onchange = (e) => {
      const f = e.target.files?.[0]
      if (!f) return
      if (!f.type.startsWith('image/')) { toast('error', 'Images only'); return }
      if (f.size > 1.5 * 1024 * 1024) { toast('error', 'Max 1.5 MB'); return }
      const reader = new FileReader()
      reader.onload = () => { s.logo = reader.result; s.version++; DB.save(); toast('success', 'Logo updated'); settings(mount) }
      reader.readAsDataURL(f)
    }
    root.querySelector('#set-logo-rm')?.addEventListener('click', () => { s.logo = null; s.version++; DB.save(); toast('info', 'Logo removed'); settings(mount) })
    root.querySelectorAll('[data-accent]').forEach((b) => { b.onclick = () => {
      s.accent = b.dataset.accent; s.version++
      DB.save()
      applyAccent(s.accent)
      toast('success', 'Theme updated')
      paint()
    } })
    root.querySelectorAll('[data-feature]').forEach((b) => { b.onclick = () => {
      const id = b.dataset.feature
      s.features[id] = s.features[id] === false ? true : false
      s.version++
      DB.save()
      b.classList.toggle('on', s.features[id] !== false)
      toast('info', s.features[id] !== false ? 'Module visible' : 'Module hidden', 'Navigation updates for all users.')
    } })
    root.querySelector('#set-contact-save').onclick = () => {
      s.email = root.querySelector('#set-email').value
      s.phone = root.querySelector('#set-phone').value
      s.address = root.querySelector('#set-address').value
      s.version++
      DB.save(); toast('success', 'Contact info saved')
    }
    root.querySelector('#set-reset').onclick = () => {
      confirmDialog('Reset demo data?', 'The database returns to the original seed. Every change you made will be lost.', 'Reset Demo Data', () => {
        DB.reset()
        window.location.reload()
      })
    }
  }
  paint()
}

// ------------------------------------------------------------
// HELP
// ------------------------------------------------------------
function help(mount) {
  const u = store.user
  const d = DB.data
  const FEATURES = [
    ['students', 'Students', 'Browse, edit and manage student records', 'emerald', 'users'],
    ['grades', 'Academics & Grades', 'Enter scores and track performance', 'teal', 'clipboard-list'],
    ['attendance', 'Attendance', 'Mark daily attendance per class', 'amber', 'clipboard-check'],
    ['fees', 'Fee Management', 'Collect and track school fees', 'cyan', 'dollar-sign'],
    ['announcements', 'Announcements', 'Post school-wide news', 'emerald', 'megaphone'],
    ['messages', 'Messages', 'Direct messaging between users', 'teal', 'mail'],
    ['library', 'Library', 'Catalogue and loan tracking', 'amber', 'library'],
    ['events', 'Events Calendar', 'Exams, holidays and meetings', 'cyan', 'calendar-days'],
    ['reports', 'Reports', 'Print report cards and statements', 'emerald', 'file-text'],
    ['analytics', 'Analytics', 'Charts and auto-insights', 'teal', 'bar-chart-3'],
    ['exams', 'Exams', 'Schedule and publish exam timetables', 'amber', 'graduation-cap'],
    ['settings', 'System Settings', 'Branding, theme and visibility', 'cyan', 'settings'],
  ]
  const STEPS = {
    Admin: [
      ['Set your branding', 'System Settings → Branding: name, tagline, logo and accent color.'],
      ['Add staff & students', 'Use Add Record or Bulk Import to populate the system.'],
      ['Post an announcement', 'Share news with the whole school instantly.'],
      ['Tune visibility', 'Hide modules your school doesn\u2019t use in Settings.'],
      ['Explore analytics', 'Charts update live from your data.'],
    ],
    Teacher: [
      ['Check your subjects', 'My Subjects shows your classes and students.'],
      ['Enter grades', 'Academics & Grades → pick class, subject, enter scores.'],
      ['Take attendance', 'Mark Present/Late/Absent daily — quick fill helps.'],
      ['Create assignments', 'Students see and submit them in their portal.'],
      ['Print reports', 'Reports → pick a student → Generate & Print.'],
    ],
    Student: [
      ['View your timetable', 'Weekly schedule with subject colors.'],
      ['Check your grades', 'Academics & Grades shows scores per subject.'],
      ['Submit assignments', 'Assignments → Submit before the due date.'],
      ['Borrow books', 'Library → Borrow on any available title.'],
      ['Book conferences', 'Conferences → pick an open slot with your teacher.'],
    ],
  }
  const steps = STEPS[u.role] || STEPS.Student
  const FAQ = [
    ['How do I change the school name?', 'Admins can set it in System Settings → School Branding. It updates live for everyone.'],
    ['How do I change the theme color?', 'System Settings → Color Scheme: pick one of 16 accent swatches. Dark/light mode toggles in the header.'],
    ['How do I hide a module?', 'System Settings → Feature Visibility: flip the switch. Hidden modules leave everyone\u2019s navigation.'],
    ['How do I reset demo data?', 'System Settings → Danger Zone → Reset Demo Data. This restores the original seed.'],
    ['How do grades and letters work?', 'A ≥ 80, B ≥ 70, C ≥ 60, D ≥ 50, F below 50. Letter badges update live as you type scores.'],
    ['How do fee payments work here?', 'This replica stores everything locally in your browser — no real payments. Mark Paid / Pay Now just updates the record.'],
    ['Is my data real?', 'No. This is a front-end replica with seeded demo data persisted to localStorage only.'],
    ['What is the search shortcut?', 'Ctrl+K (or ⌘K) opens the global search — pages, students, staff and events.'],
    ['How do I print a report card?', 'Reports → Report Card → pick a student → Generate & Print opens a print-ready window.'],
    ['Who can I message?', 'Everyone — use Messages → New Message, or search recipients.'],
  ]

  mount.innerHTML = `
  ${banner('sparkles', 'Help Center & Onboarding', `Welcome, ${esc(u.name.split(' ')[0])} — here's how to get the most out of SIMS.`,
    `<button class="btn btn-white" data-go-dash>${icon('layout-dashboard', '', 16)} Go to Dashboard</button>
     <button class="btn btn-white" data-go-prof>${icon('circle-user', '', 16)} My Profile</button>`)}
  <div class="cols-lg-3" style="grid-template-columns:1.3fr 1fr">
    ${card(`Getting Started as a ${esc(u.role)}`, 'Five steps to power user', `
      <div class="stack-4">
        ${steps.map((s, i) => `
        <div class="row gap-3">
          <span class="stat-ic ic-emerald" style="width:2rem;height:2rem;border-radius:9999px;font-weight:700;font-size:.875rem;flex-shrink:0">${i + 1}</span>
          <div><p class="text-sm font-semibold">${esc(s[0])}</p><p class="text-xs muted">${esc(s[1])}</p></div>
        </div>`).join('')}
      </div>`, { titleSize: 'text-base' })}
    ${card('Your Role', '', `
      <div class="stack-3">
        <span class="badge badge-soft" style="align-self:flex-start">${icon('shield-check', '', 12)} Signed in as ${esc(u.role)}</span>
        <p class="text-sm muted">${u.role === 'Admin' ? 'You manage everything: people, money, settings and modules.' : u.role === 'Teacher' ? 'You manage classes, grades, attendance and assignments.' : u.role === 'Student' ? 'You see your classes, grades, fees, library and school life.' : 'You have a tailored view for your role.'}</p>
        <button class="btn btn-outline btn-sm" data-go-prof2 style="align-self:flex-start">${icon('circle-user', '', 14)} View Profile</button>
      </div>`, { titleSize: 'text-base' })}
  </div>
  ${card('Explore Features', 'Jump straight into any module', `
    <div class="grid gap-3" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.75rem">
      ${FEATURES.map((f) => `
      <button class="qa qa-${f[3]}" data-go-view="${f[0]}">
        <span class="qa-ic">${icon(f[4], '', 18)}</span>
        <span style="text-align:left"><span class="qa-label" style="display:block;font-weight:600">${f[1]}</span>
        <span class="text-xs muted">${f[2]}</span></span>
        ${icon('chevron-right', 'muted', 14)}
      </button>`).join('')}
    </div>`, { titleSize: 'text-base' })}
  <div class="cols-lg-3" style="grid-template-columns:1.4fr 1fr">
    ${card('Frequently Asked Questions', '', FAQ.map((f) => `
      <div class="acc-item"><button class="acc-q">${esc(f[0])}${icon('chevron-down', 'acc-chev', 16)}</button>
        <div class="acc-a"><div class="acc-a-inner">${esc(f[1])}</div></div></div>`).join(''), { titleSize: 'text-base', flush: true })}
    <div class="stack-4">
      ${card('Keyboard Shortcuts', '', `
        <div class="stack-2 text-sm">
          <div class="row between"><span>Open search</span><kbd>Ctrl K / ⌘K</kbd></div>
          <div class="row between"><span>Close dialog</span><kbd>Esc</kbd></div>
          <div class="row between"><span>Send message</span><kbd>↵ Enter</kbd></div>
        </div>`, { titleSize: 'text-base' })}
      ${card('Contact the School', '', `
        <div class="stack-3 text-sm">
          <span class="row gap-2">${icon('mail', 'muted', 14)} ${esc(d.settings.email)}</span>
          <span class="row gap-2">${icon('phone', 'muted', 14)} ${esc(d.settings.phone)}</span>
          <span class="row gap-2">${icon('map-pin', 'muted', 14)} ${esc(d.settings.address)}</span>
        </div>`, { titleSize: 'text-base' })}
    </div>
  </div>`

  mount.querySelector('[data-go-dash]').onclick = () => go('dashboard')
  mount.querySelectorAll('[data-go-prof],[data-go-prof2]').forEach((b) => { b.onclick = () => go('profile') })
  mount.querySelectorAll('[data-go-view]').forEach((b) => { b.onclick = () => go(b.dataset.goView) })
  mount.querySelectorAll('.acc-item .acc-q').forEach((q) => { q.onclick = () => q.parentElement.classList.toggle('open') })
}
