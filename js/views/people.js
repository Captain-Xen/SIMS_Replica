// ============================================================
// Views: students, staff, add-record, admissions, alumni, visitors
// ============================================================
import { icon } from '../icons.js'
import { DB, uid, initials, gradeToForm, nowIso, timeAgo, todayStr, csvDownload, printHtml, dateOffset } from '../data.js'
import { esc, toast, banner, card, empty, avatarHtml, openDialog, closeDialog, confirmDialog, dialogHead, dialogFoot, field, btnWhite, btnBrand, statCard, store, go } from '../ui.js'

const CLASSES = ['7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B']
const GRADES = [7, 8, 9, 10, 11, 12, 13]
const DEPTS = ['Administration', 'Sciences', 'Languages', 'Mathematics', 'Humanities', 'Health', 'Physical Education', 'Guidance', 'Ancillary', 'Maintenance']
const ROLE_CHIP = { Admin: 'badge-soft', Principal: 'badge-teal', 'Vice Principal': 'badge-info', Teacher: 'badge-warn', Nurse: 'badge-danger', 'Ancillary Staff': 'badge-muted', Student: 'badge-soft' }
const ADM_STATUS = { Pending: 'badge-warn', Reviewing: 'badge-info', Accepted: 'badge-soft', Rejected: 'badge-danger', Enrolled: 'badge-teal' }
const sel = (id, options, value, extra = '') => `<select id="${id}" class="input" ${extra}>${options.map((o) => { const v = o[0], l = o[1] ?? o[0]; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>` }).join('')}</select>`

export function render(view, mount) {
  if (view === 'students') students(mount)
  else if (view === 'staff') staff(mount)
  else if (view === 'add') addRecord(mount)
  else if (view === 'admissions') admissions(mount)
  else if (view === 'alumni') alumni(mount)
  else if (view === 'visitors') visitors(mount)
}

// ------------------------------------------------------------
// STUDENTS
// ------------------------------------------------------------
function students(mount) {
  const u = store.user
  const canManage = ['Admin', 'Principal', 'Vice Principal', 'Teacher'].includes(u.role)
  let query = '', classFilter = '', selected = new Set(), carouselIdx = 0
  const state = { filter: '' }

  mount.innerHTML = `<div class="stack-6" id="stu-root"></div>`
  const root = mount.querySelector('#stu-root')

  function counts() {
    const map = new Map()
    for (const s of DB.data.students) map.set(s.className, (map.get(s.className) || 0) + 1)
    return CLASSES.filter((c) => map.has(c)).map((c) => ({ class: c, count: map.get(c) }))
  }

  function paint() {
    const cs = counts()
    const visible = cs.slice(carouselIdx, carouselIdx + 6)
    const filtered = DB.data.students.filter((s) =>
      (!state.filter || s.className === state.filter) &&
      (!query || s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query) || (s.admissionNo || '').toLowerCase().includes(query)))

    root.innerHTML = `
    ${card(`<span class="row gap-2" style="display:inline-flex">${icon('graduation-cap', '', 16)} Browse by Class</span>`, '',
      `<div class="row gap-3" style="overflow:hidden">
        ${visible.map((c) => `
          <button class="class-chip ${state.filter === c.class ? 'active' : ''}" data-class="${c.class}">
            <span class="class-chip-badge">${c.class}</span>
            <p class="class-chip-count">${c.count}</p><p class="class-chip-label">students</p>
          </button>`).join('')}
      </div>`,
      { titleSize: 'text-base', actions: `<div class="row gap-1">
        <button class="btn btn-ghost btn-icon btn-md" data-car="-1" ${carouselIdx === 0 ? 'disabled' : ''}>${icon('chevron-left', '', 16)}</button>
        <button class="btn btn-ghost btn-icon btn-md" data-car="1" ${carouselIdx + 6 >= cs.length ? 'disabled' : ''}>${icon('chevron-right', '', 16)}</button></div>` })}

    <div class="card"><div class="card-c tight">
      <div class="toolbar" style="padding:0">
        <div class="input-wrap">${icon('search', 'input-ic', 16)}
          <input class="input has-ic" id="stu-q" placeholder="Search by name, email, or ID..." value="${esc(query)}"></div>
        <div class="toolbar-row">
          ${sel('stu-class', [['', 'All classes'], ...CLASSES.map((c) => [c, c])], state.filter, 'style="width:10rem"')}
          <button class="btn btn-outline btn-sm" data-export>${icon('download', '', 14)} Export</button>
          <button class="btn btn-outline btn-sm" data-template>${icon('upload', '', 14)} Template</button>
          ${canManage ? `<button class="btn btn-brand btn-sm" data-add>${icon('plus', '', 14)} Add Student</button>` : ''}
        </div>
      </div></div></div>

    ${canManage ? `<div class="dropzone">${icon('upload', 'muted', 20)}
      <p class="flex-1 text-sm muted">Import students from a CSV file.</p>
      <label class="cursor-pointer" style="cursor:pointer"><span class="btn btn-outline btn-sm">${icon('upload', '', 14)} Choose file</span>
        <input type="file" accept=".csv" id="stu-csv" style="display:none"></label></div>` : ''}

    <div class="card"><div class="card-c flush">
      ${filtered.length === 0 ? empty('users', 'No students found.') : `
      <div class="table-wrap"><table class="table">
        <thead><tr>
          <th style="width:2.5rem"><button class="muted" id="sel-all">${selected.size === filtered.length && filtered.length > 0 ? icon('check-square', 'brand-text', 16) : icon('square', '', 16)}</button></th>
          <th>Student</th>
          <th class="hide-md-down">Form</th>
          <th class="hide-md-down">Guardian</th>
          <th class="hide-md-down">Fees</th>
          <th>Status</th>
          <th style="text-align:right">Actions</th>
        </tr></thead>
        <tbody>
          ${filtered.map((s) => `
          <tr>
            <td><button class="muted" data-sel="${s.id}">${selected.has(s.id) ? icon('check-square', 'brand-text', 16) : icon('square', '', 16)}</button></td>
            <td><button class="row gap-3" style="text-align:left" data-view="${s.id}">
              ${avatarHtml(s.name, 'Student', 'av-8')}
              <span><p class="font-medium">${esc(s.name)}</p><p class="cell-sub">${esc(s.admissionNo)} · ${esc(s.email)}</p></span></button></td>
            <td class="hide-md-down"><span class="badge badge-outline">${gradeToForm(s.grade)}</span><p class="cell-sub mt-1">${esc(s.className)}</p></td>
            <td class="hide-md-down"><p class="text-sm">${esc(s.guardian || '—')}</p><p class="cell-sub">${esc(s.phone || '')}</p></td>
            <td class="hide-md-down"><span class="badge ${s.feeStatus === 'Paid' ? 'badge-soft' : 'badge-warn'}">${s.feeStatus}</span></td>
            <td><span class="badge ${s.status === 'Active' ? 'badge-soft' : 'badge-danger'}">${esc(s.status)}</span></td>
            <td><div class="row gap-1" style="justify-content:flex-end">
              <button class="btn btn-ghost btn-icon" data-view="${s.id}" title="View">${icon('eye', '', 16)}</button>
              ${canManage ? `<button class="btn btn-ghost btn-icon" data-edit="${s.id}" title="Edit">${icon('pencil', '', 16)}</button>` : ''}
            </div></td>
          </tr>`).join('')}
        </tbody></table></div>`}
    </div></div>

    ${selected.size > 0 ? `<div class="bulk-bar"><span class="text-sm font-medium">${selected.size} selected</span>
      <button class="btn btn-ghost btn-sm" data-clear>${icon('x', '', 14)}</button>
      ${canManage ? `<button class="btn btn-destructive btn-sm" data-del>${icon('trash-2', '', 14)} Delete</button>` : ''}</div>` : ''}`

    // bindings
    root.querySelectorAll('[data-class]').forEach((b) => { b.onclick = () => { state.filter = state.filter === b.dataset.class ? '' : b.dataset.class; paint() } })
    root.querySelectorAll('[data-car]').forEach((b) => { b.onclick = () => { carouselIdx = Math.max(0, Math.min(carouselIdx + Number(b.dataset.car) * 6, Math.max(0, counts().length - 6))); paint() } })
    root.querySelector('#stu-q').oninput = (e) => { query = e.target.value.toLowerCase(); refreshTable() }
    root.querySelector('#stu-class').onchange = (e) => { state.filter = e.target.value; paint() }
    root.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => { store.viewUserId = b.dataset.view; go('profile') } })
    root.querySelectorAll('[data-sel]').forEach((b) => { b.onclick = () => { selected.has(b.dataset.sel) ? selected.delete(b.dataset.sel) : selected.add(b.dataset.sel); paint() } })
    root.querySelector('#sel-all')?.addEventListener('click', () => {
      if (selected.size === filtered.length) selected = new Set()
      else selected = new Set(filtered.map((s) => s.id))
      paint()
    })
    root.querySelector('[data-add]')?.addEventListener('click', () => studentDialog(null, paint))
    root.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => studentDialog(DB.data.students.find((s) => s.id === b.dataset.edit), paint) })
    root.querySelector('[data-export]')?.addEventListener('click', () => {
      const headers = ['first_name', 'last_name', 'email', 'dob', 'grade', 'class_name', 'guardian_name', 'guardian_phone', 'status']
      const rows = filtered.map((s) => { const [f, ...r] = s.name.split(' '); return [f, r.join(' '), s.email, s.dob || '', s.grade ?? '', s.className ?? '', s.guardian ?? '', s.phone ?? '', s.status] })
      csvDownload([headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'), 'students.csv')
      toast('success', 'Exported', `${filtered.length} students exported to CSV.`)
    })
    root.querySelector('[data-template]')?.addEventListener('click', () => {
      csvDownload('first_name,last_name,dob,grade,class_name,guardian_name,guardian_phone\nJohn,Doe,2008-05-12,10,10A,Jane Doe,555-0100', 'students_template.csv')
      toast('info', 'Template downloaded')
    })
    root.querySelector('#stu-csv')?.addEventListener('change', (e) => {
      const f = e.target.files?.[0]
      if (!f) return
      f.text().then((text) => {
        const lines = text.split('\n').filter((l) => l.trim())
        if (lines.length < 2) { toast('warning', 'Empty CSV', 'No data rows found.'); return }
        const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
        let count = 0
        for (const line of lines.slice(1)) {
          const cols = line.split(',').map((c) => c.replace(/"/g, '').trim())
          const o = {}; headers.forEach((h, i) => { o[h] = cols[i] || '' })
          if (!o.first_name) continue
          DB.data.students.push({ id: uid('stu'), name: `${o.first_name} ${o.last_name || ''}`.trim(), email: o.email || `${o.first_name}.${o.last_name || 'x'}@edu.edu`, dob: o.dob || '', grade: Number(o.grade) || 7, className: o.class_name || '7A', guardian: o.guardian_name || '', phone: o.guardian_phone || '', gender: '', bloodGroup: '', admissionNo: 'EDU-' + String(DB.data.students.length + 1).padStart(3, '0'), status: 'Active', feeStatus: 'Pending' })
          count++
        }
        DB.save()
        toast('success', 'Import complete', `${count} student(s) imported.`)
        paint()
      })
    })
    root.querySelector('[data-del]')?.addEventListener('click', () => {
      confirmDialog('Delete students?', `Delete ${selected.size} student(s)? This cannot be undone.`, 'Delete', () => {
        DB.data.students = DB.data.students.filter((s) => !selected.has(s.id))
        DB.save(); toast('success', 'Deleted', `${selected.size} student(s) removed.`); selected = new Set(); paint()
      })
    })
    root.querySelector('[data-clear]')?.addEventListener('click', () => { selected = new Set(); paint() })
  }
  function refreshTable() { paint() }
  paint()
}

function studentDialog(student, onDone) {
  const f = student || { name: '', email: '', dob: '', gender: 'Male', bloodGroup: 'O+', admissionNo: '', grade: 7, className: '7A', guardian: '', phone: '', status: 'Active' }
  const wrap = openDialog(`${dialogHead(student ? 'Edit Student' : 'Add New Student')}
    <div class="form-grid">
      ${field('Full Name', `<input class="input" id="sd-name" value="${esc(f.name)}">`)}
      ${field('Email', `<input class="input" id="sd-email" type="email" value="${esc(f.email)}">`)}
      ${field('Date of Birth', `<input class="input" id="sd-dob" type="date" value="${esc(f.dob)}">`)}
      ${field('Gender', sel('sd-gender', ['Male', 'Female', 'Other'], f.gender))}
      ${field('Blood Group', sel('sd-blood', ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'], f.bloodGroup))}
      ${field('Admission No.', `<input class="input" id="sd-adm" value="${esc(f.admissionNo)}" placeholder="Auto-generated if blank">`)}
      ${field('Grade/Form', sel('sd-grade', GRADES.map((g) => [g, gradeToForm(g)]), f.grade))}
      ${field('Class', sel('sd-class', CLASSES, f.className))}
      ${field('Guardian Name', `<input class="input" id="sd-guardian" value="${esc(f.guardian)}">`)}
      ${field('Guardian Phone', `<input class="input" id="sd-phone" value="${esc(f.phone)}">`)}
      ${field('Status', sel('sd-status', ['Active', 'Suspended', 'Expelled'], f.status))}
    </div>
    ${dialogFoot('Cancel', `<button class="btn btn-brand" id="sd-save">${student ? 'Save Changes' : 'Add Student'}</button>`)}`, { wide: true })
  wrap.querySelector('#sd-save').onclick = () => {
    const val = (id) => wrap.querySelector('#' + id).value
    const name = val('sd-name').trim()
    if (!name) { toast('error', 'Name is required'); return }
    const data = { name, email: val('sd-email'), dob: val('sd-dob'), gender: val('sd-gender'), bloodGroup: val('sd-blood'), admissionNo: val('sd-adm') || 'EDU-' + String(DB.data.students.length + 1).padStart(3, '0'), grade: Number(val('sd-grade')), className: val('sd-class'), guardian: val('sd-guardian'), phone: val('sd-phone'), status: val('sd-status') }
    if (student) { Object.assign(student, data); toast('success', 'Student updated') }
    else { DB.data.students.push({ id: uid('stu'), ...data, feeStatus: 'Pending' }); toast('success', 'Student added', `${name} was added.`) }
    DB.save(); closeDialog(); onDone()
  }
}

// ------------------------------------------------------------
// STAFF
// ------------------------------------------------------------
function staff(mount) {
  let query = '', roleF = ''
  mount.innerHTML = `<div class="stack-6" id="staff-root"></div>`
  const root = mount.querySelector('#staff-root')
  function paint() {
    const filtered = DB.data.staff.filter((s) =>
      (!roleF || s.role === roleF) &&
      (!query || s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query)))
    root.innerHTML = `
    ${banner('badge-check', 'Staff Management', 'Manage teachers, administrators, and support staff.',
      `<button class="btn btn-white" data-add>${icon('plus', '', 16)} Add Staff</button>`)}
    <div class="card"><div class="card-c tight"><div class="toolbar" style="padding:0">
      <div class="input-wrap">${icon('search', 'input-ic', 16)}<input class="input has-ic" id="stf-q" placeholder="Search staff by name or email..." value="${esc(query)}"></div>
      <div class="toolbar-row">
        ${sel('stf-role', [['', 'All roles'], ['Admin', 'Admin'], ['Principal', 'Principal'], ['Vice Principal', 'Vice Principal'], ['Teacher', 'Teacher'], ['Nurse', 'Nurse'], ['Ancillary Staff', 'Ancillary Staff']], roleF, 'style="width:11rem"')}
        <button class="btn btn-outline btn-sm" data-export>${icon('download', '', 14)} Export</button>
      </div></div></div></div>
    <div class="card"><div class="card-c flush">
      ${filtered.length === 0 ? empty('badge-check', 'No staff found.') : `
      <div class="table-wrap"><table class="table"><thead><tr>
        <th>Member</th><th>Role</th><th class="hide-md-down">Department</th><th class="hide-md-down">Contact</th><th>Status</th><th style="text-align:right">Actions</th>
      </tr></thead><tbody>
        ${filtered.map((s) => `
        <tr>
          <td><button class="row gap-3" style="text-align:left" data-view="${s.id}">
            ${avatarHtml(s.name, s.role, 'av-8')}
            <span><p class="font-medium">${esc(s.name)}</p><p class="cell-sub">${esc(s.email)}</p></span></button></td>
          <td><span class="badge ${ROLE_CHIP[s.role] || 'badge-muted'}">${esc(s.role)}</span></td>
          <td class="hide-md-down"><p class="text-sm">${esc(s.department || '—')}</p></td>
          <td class="hide-md-down"><p class="text-sm">${esc(s.phone || '—')}</p></td>
          <td><span class="badge ${s.status === 'Active' ? 'badge-soft' : 'badge-danger'}">${esc(s.status)}</span></td>
          <td><div class="row gap-1" style="justify-content:flex-end">
            <button class="btn btn-ghost btn-icon" data-view="${s.id}">${icon('eye', '', 16)}</button>
            <button class="btn btn-ghost btn-icon" data-edit="${s.id}">${icon('pencil', '', 16)}</button>
            <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-del="${s.id}">${icon('trash-2', '', 16)}</button>
          </div></td>
        </tr>`).join('')}
      </tbody></table></div>`}
    </div></div>`
    root.querySelector('#stf-q').oninput = (e) => { query = e.target.value.toLowerCase(); paint() }
    root.querySelector('#stf-role').onchange = (e) => { roleF = e.target.value; paint() }
    root.querySelector('[data-add]').onclick = () => staffDialog(null, paint)
    root.querySelector('[data-export]').onclick = () => {
      const rows = filtered.map((s) => [s.name, s.email, s.role, s.department || '', s.phone || '', s.status])
      csvDownload([['name', 'email', 'role', 'department', 'phone', 'status'], ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n'), 'staff.csv')
      toast('success', 'Exported', `${filtered.length} staff exported to CSV.`)
    }
    root.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => { store.viewUserId = b.dataset.view; go('profile') } })
    root.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => staffDialog(DB.data.staff.find((s) => s.id === b.dataset.edit), paint) })
    root.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => {
      const s = DB.data.staff.find((x) => x.id === b.dataset.del)
      if (s.id === store.user.id) { toast('error', 'Cannot delete your own account'); return }
      confirmDialog('Remove staff member?', `Remove ${s.name} from the system?`, 'Remove', () => {
        DB.data.staff = DB.data.staff.filter((x) => x.id !== s.id); DB.save(); toast('success', 'Staff removed'); paint()
      })
    } })
  }
  paint()
}

function staffDialog(member, onDone) {
  const f = member || { name: '', email: '', role: 'Teacher', department: 'Sciences', phone: '', status: 'Active', subjects: [] }
  const wrap = openDialog(`${dialogHead(member ? 'Edit Staff Member' : 'Add Staff Member')}
    <div class="form-grid">
      ${field('Full Name', `<input class="input" id="sf-name" value="${esc(f.name)}">`)}
      ${field('Email', `<input class="input" id="sf-email" type="email" value="${esc(f.email)}">`)}
      ${field('Role', sel('sf-role', ['Admin', 'Principal', 'Vice Principal', 'Teacher', 'Nurse', 'Ancillary Staff'], f.role))}
      ${field('Department', sel('sf-dept', DEPTS, f.department))}
      ${field('Phone', `<input class="input" id="sf-phone" value="${esc(f.phone)}">`)}
      ${field('Status', sel('sf-status', ['Active', 'On Leave', 'Suspended', 'Inactive'], f.status))}
      ${field('Subjects (comma separated)', `<input class="input" id="sf-subjects" value="${esc((f.subjects || []).join(', '))}" placeholder="Mathematics, Physics">`)}
    </div>
    ${dialogFoot('Cancel', `<button class="btn btn-brand" id="sf-save">${member ? 'Save Changes' : 'Add Staff'}</button>`)}`)
  wrap.querySelector('#sf-save').onclick = () => {
    const val = (id) => wrap.querySelector('#' + id).value
    const name = val('sf-name').trim()
    if (!name) { toast('error', 'Name is required'); return }
    const data = { name, email: val('sf-email'), role: val('sf-role'), department: val('sf-dept'), phone: val('sf-phone'), status: val('sf-status'), subjects: val('sf-subjects').split(',').map((x) => x.trim()).filter(Boolean) }
    if (member) { Object.assign(member, data); toast('success', 'Staff updated') }
    else { DB.data.staff.push({ id: uid('staff'), ...data, bio: '', avatar: null, points: 0, level: 1, badges: 0 }); toast('success', 'Staff added', `${name} was added.`) }
    DB.save(); closeDialog(); onDone()
  }
}

// ------------------------------------------------------------
// ADD RECORD
// ------------------------------------------------------------
function addRecord(mount) {
  let tab = 'student', added = null
  mount.innerHTML = `<div class="stack-6" style="max-width:56rem;margin:0 auto" id="add-root"></div>`
  const root = mount.querySelector('#add-root')
  function paint() {
    if (added) {
      root.innerHTML = `
      ${banner('user-plus', added.title, 'The record was saved successfully.')}
      <div class="card" style="max-width:28rem;margin:0 auto"><div class="card-c stack-4" style="align-items:center;text-align:center">
        <span class="stat-ic ic-emerald" style="width:4rem;height:4rem;border-radius:9999px">${icon('check', '', 32)}</span>
        <h3 class="text-xl font-bold">${esc(added.title)}</h3>
        <p class="muted text-sm">${esc(added.name)} has been added to the system.</p>
        <button class="btn btn-brand" data-again>${icon('plus', '', 16)} Add Another</button>
      </div></div>`
      root.querySelector('[data-again]').onclick = () => { added = null; paint() }
      return
    }
    const isStu = tab === 'student'
    root.innerHTML = `
    ${banner('user-plus', 'Add Record', 'Create a new student or staff record in the system.')}
    <div class="tabs">${[['student', 'Add Student'], ['staff', 'Add Staff']].map((t) => `<button class="tab ${tab === t[0] ? 'active' : ''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div>
    <div class="card"><div class="card-h"><h3 class="card-t text-base">New ${isStu ? 'Student' : 'Staff Member'}</h3></div>
      <div class="card-c"><div class="form-grid">
        ${field('Full Name', `<input class="input" id="ar-name" placeholder="Jane Doe">`)}
        ${field('Email', `<input class="input" id="ar-email" type="email" placeholder="jane@edu.edu">`)}
        ${isStu ? field('Date of Birth', `<input class="input" id="ar-dob" type="date">`) : ''}
        ${isStu ? field('Gender', sel('ar-gender', ['Male', 'Female', 'Other'], 'Male')) : field('Role', sel('ar-role', ['Admin', 'Principal', 'Vice Principal', 'Teacher', 'Nurse', 'Ancillary Staff'], 'Teacher'))}
        ${isStu ? field('Blood Group', sel('ar-blood', ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'], 'O+')) : field('Department', sel('ar-dept', DEPTS, 'Sciences'))}
        ${isStu ? field('Admission No.', `<input class="input" id="ar-adm" placeholder="Auto-generated if blank">`) : field('Phone', `<input class="input" id="ar-phone">`)}
        ${isStu ? field('Grade/Form', sel('ar-grade', GRADES.map((g) => [g, gradeToForm(g)]), 7)) : field('Status', sel('ar-status', ['Active', 'On Leave', 'Suspended', 'Inactive'], 'Active'))}
        ${isStu ? field('Class', sel('ar-class', CLASSES, '7A')) : field('Subjects (comma separated)', `<input class="input" id="ar-subjects" placeholder="Mathematics, Physics">`)}
        ${isStu ? field('Guardian Name', `<input class="input" id="ar-guardian">`) : ''}
        ${isStu ? field('Guardian Phone', `<input class="input" id="ar-gphone">`) : ''}
      </div>
      <div class="row gap-2 mt-4" style="justify-content:flex-end">
        <button class="btn btn-outline" data-reset>${icon('rotate-ccw', '', 14)} Reset</button>
        <button class="btn btn-brand" data-save>${icon('plus', '', 14)} Add ${isStu ? 'Student' : 'Staff'}</button>
      </div></div></div>`
    root.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; paint() } })
    root.querySelector('[data-reset]').onclick = () => paint()
    root.querySelector('[data-save]').onclick = () => {
      const v = (id) => root.querySelector('#' + id)?.value?.trim() || ''
      const name = v('ar-name'), email = v('ar-email')
      if (!name || !email) { toast('error', 'Missing fields', 'Name and email are required.'); return }
      if (isStu) {
        DB.data.students.push({ id: uid('stu'), name, email, dob: v('ar-dob'), gender: v('ar-gender'), bloodGroup: v('ar-blood'), admissionNo: v('ar-adm') || 'EDU-' + String(DB.data.students.length + 1).padStart(3, '0'), grade: Number(v('ar-grade')), className: v('ar-class'), guardian: v('ar-guardian'), phone: v('ar-gphone'), status: 'Active', feeStatus: 'Pending' })
        DB.data.fees.push({ id: uid('fee'), studentId: '', studentName: name, amount: 1200, status: 'Pending', dueDate: new Date().getFullYear() + '-12-15', term: 'Term 1' })
        added = { title: 'Student Added', name }
      } else {
        DB.data.staff.push({ id: uid('staff'), name, email, role: v('ar-role'), department: v('ar-dept'), phone: v('ar-phone'), status: v('ar-status'), subjects: v('ar-subjects').split(',').map((x) => x.trim()).filter(Boolean), bio: '', avatar: null, password: 'staff123', points: 0, level: 1, badges: 0 })
        added = { title: 'Staff Added', name }
      }
      DB.save(); toast('success', added.title, `${name} saved.`); paint()
    }
  }
  paint()
}

// ------------------------------------------------------------
// ADMISSIONS
// ------------------------------------------------------------
function admissions(mount) {
  let tab = 'All', query = ''
  mount.innerHTML = `<div class="stack-6" id="adm-root"></div>`
  const root = mount.querySelector('#adm-root')
  const STATUSES = ['Pending', 'Reviewing', 'Accepted', 'Rejected', 'Enrolled']

  function stats(list) {
    const c = (s) => list.filter((a) => a.status === s).length
    return `<div class="stat-grid stagger">
      ${statCard({ ic: 'clipboard-paste', color: 'emerald', label: 'Total Applications', value: String(list.length), trend: 'All time' })}
      ${statCard({ ic: 'clock', color: 'amber', label: 'Pending Review', value: String(c('Pending')), trend: 'Awaiting first review' })}
      ${statCard({ ic: 'check', color: 'teal', label: 'Accepted', value: String(c('Accepted')), trend: 'Ready to enroll' })}
      ${statCard({ ic: 'graduation-cap', color: 'cyan', label: 'Enrolled', value: String(c('Enrolled')), trend: 'Joined the school' })}
    </div>`
  }

  function paint() {
    const all = DB.data.admissions
    const filtered = all.filter((a) => (tab === 'All' || a.status === tab) && (!query || a.applicantName.toLowerCase().includes(query) || a.email.toLowerCase().includes(query)))
    root.innerHTML = `
    ${banner('clipboard-paste', 'Admissions', 'Review applications and enroll new students.',
      `<button class="btn btn-white" data-new>${icon('plus', '', 16)} New Application</button>`)}
    ${stats(all)}
    ${card('', '', `<div class="stack-3">
      <div class="tabs">${['All', ...STATUSES].map((s) => `<button class="tab ${tab === s ? 'active' : ''}" data-tab="${s}">${s}&nbsp;(${s === 'All' ? all.length : all.filter((a) => a.status === s).length})</button>`).join('')}</div>
      <div class="input-wrap" style="max-width:22rem">${icon('search', 'input-ic', 16)}<input class="input has-ic" id="adm-q" placeholder="Search applicants..." value="${esc(query)}"></div></div>`,
      { flush: true, cls: 'hide-h' })}
    <div class="card"><div class="card-c flush">
      ${filtered.length === 0 ? empty('clipboard-paste', 'No applications found.') : `
      <div class="table-wrap"><table class="table"><thead><tr>
        <th>Applicant</th><th>Grade</th><th class="hide-md-down">Parent / Guardian</th><th class="hide-md-down">Previous School</th><th>Status</th><th style="text-align:right">Actions</th>
      </tr></thead><tbody>
        ${filtered.map((a) => `
        <tr>
          <td><div class="row gap-3">
            <span class="avatar av-8 staff" style="font-size:10px">${esc(initials(a.applicantName))}</span>
            <span><p class="font-medium">${esc(a.applicantName)}</p><p class="cell-sub">${esc(a.email)}</p></span></div></td>
          <td><span class="badge badge-outline">Grade ${a.gradeApplied}</span></td>
          <td class="hide-md-down"><p class="text-sm">${esc(a.parentName || '—')}</p><p class="cell-sub">${esc(a.parentPhone || '')}</p></td>
          <td class="hide-md-down"><p class="text-sm">${esc(a.previousSchool || '—')}</p></td>
          <td><span class="badge ${ADM_STATUS[a.status]}">${a.status}</span></td>
          <td><div class="row gap-1" style="justify-content:flex-end">
            <button class="btn btn-ghost btn-icon" data-view="${a.id}" title="View">${icon('eye', '', 16)}</button>
            <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-del="${a.id}" title="Delete">${icon('trash-2', '', 16)}</button>
          </div></td>
        </tr>`).join('')}
      </tbody></table></div>`}
    </div></div>`

    root.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; paint() } })
    root.querySelector('#adm-q').oninput = (e) => { query = e.target.value.toLowerCase(); paint() }
    root.querySelector('[data-new]').onclick = () => admissionDialog(null, paint)
    root.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => admissionDetail(DB.data.admissions.find((a) => a.id === b.dataset.view), paint) })
    root.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => {
      const a = DB.data.admissions.find((x) => x.id === b.dataset.del)
      confirmDialog('Delete application?', `Remove ${a.applicantName}'s application?`, 'Delete', () => {
        DB.data.admissions = DB.data.admissions.filter((x) => x.id !== a.id); DB.save(); toast('success', 'Application deleted'); paint()
      })
    } })
  }
  paint()
}

function admissionDialog(a, onDone) {
  const f = a || { applicantName: '', email: '', phone: '', dob: '', gender: 'Male', gradeApplied: 7, parentName: '', parentPhone: '', parentEmail: '', address: '', previousSchool: '', notes: '' }
  const wrap = openDialog(`${dialogHead(a ? 'Edit Application' : 'New Application')}
    <div class="form-grid">
      ${field('Applicant Name *', `<input class="input" id="ad-name" value="${esc(f.applicantName)}">`)}
      ${field('Email', `<input class="input" id="ad-email" type="email" value="${esc(f.email)}">`)}
      ${field('Phone', `<input class="input" id="ad-phone" value="${esc(f.phone)}">`)}
      ${field('Date of Birth', `<input class="input" id="ad-dob" type="date" value="${esc(f.dob)}">`)}
      ${field('Gender', sel('ad-gender', ['Male', 'Female', 'Other'], f.gender))}
      ${field('Grade Applied For', sel('ad-grade', GRADES, f.gradeApplied))}
      ${field('Parent / Guardian Name', `<input class="input" id="ad-pname" value="${esc(f.parentName)}">`)}
      ${field('Parent Phone', `<input class="input" id="ad-pphone" value="${esc(f.parentPhone)}">`)}
      ${field('Previous School', `<input class="input" id="ad-prev" value="${esc(f.previousSchool)}">`)}
      ${field('Address', `<input class="input" id="ad-addr" value="${esc(f.address)}">`)}
    </div>
    ${dialogFoot('Cancel', `<button class="btn btn-brand" id="ad-save">${icon('send', '', 14)} Submit Application</button>`)}`, { wide: true })
  wrap.querySelector('#ad-save').onclick = () => {
    const v = (id) => wrap.querySelector('#' + id).value
    if (!v('ad-name').trim()) { toast('error', 'Applicant name is required'); return }
    const data = { applicantName: v('ad-name').trim(), email: v('ad-email'), phone: v('ad-phone'), dob: v('ad-dob'), gender: v('ad-gender'), gradeApplied: Number(v('ad-grade')), parentName: v('ad-pname'), parentPhone: v('ad-pphone'), previousSchool: v('ad-prev'), address: v('ad-addr') }
    if (a) Object.assign(a, data)
    else DB.data.admissions.push({ id: uid('adm'), ...data, parentEmail: '', status: 'Pending', notes: '', reviewedByName: null, createdAt: nowIso() })
    DB.save(); closeDialog(); toast('success', a ? 'Application updated' : 'Application submitted'); onDone()
  }
}

function admissionDetail(a, onDone) {
  const steps = ['Submitted', 'Under Review', 'Accepted', 'Enrolled']
  const stepIdx = { Pending: 0, Reviewing: 1, Accepted: 2, Rejected: 2, Enrolled: 3 }[a.status] ?? 0
  const nextAct = { Pending: ['Mark Reviewing', 'Reviewing'], Reviewing: ['Accept', 'Accepted'], Accepted: ['Enroll', 'Enrolled'] }
  const act = nextAct[a.status]
  const wrap = openDialog(`
    ${dialogHead(esc(a.applicantName), `Application received ${timeAgo(a.createdAt)} · Grade ${a.gradeApplied}`)}
    <div class="stack-4" style="margin-top:1rem">
      <div class="timeline">
        ${steps.map((s, i) => `
          <div class="tl-item" style="${i > stepIdx ? 'opacity:.4' : ''}">
            <p class="text-sm font-medium">${s}</p>
            <p class="text-xs muted">${i === 0 ? timeAgo(a.createdAt) : i <= stepIdx ? 'Done' : 'Pending'}</p>
          </div>`).join('')}
      </div>
      <div style="height:1px;background:var(--border)"></div>
      <div class="form-grid">
        ${field('Email', `<p class="text-sm" style="padding:.5rem 0">${esc(a.email || '—')}</p>`)}
        ${field('Phone', `<p class="text-sm" style="padding:.5rem 0">${esc(a.phone || '—')}</p>`)}
        ${field('Parent / Guardian', `<p class="text-sm" style="padding:.5rem 0">${esc(a.parentName || '—')} ${a.parentPhone ? '· ' + esc(a.parentPhone) : ''}</p>`)}
        ${field('Previous School', `<p class="text-sm" style="padding:.5rem 0">${esc(a.previousSchool || '—')}</p>`)}
        ${field('Address', `<p class="text-sm" style="padding:.5rem 0">${esc(a.address || '—')}</p>`)}
      </div>
      ${field('Internal Notes', `<textarea class="input" id="adm-notes" placeholder="Notes for the admissions team...">${esc(a.notes || '')}</textarea>`)}
      ${a.status === 'Accepted' ? `<div class="dropzone" style="border-color:#f59e0b;background:color-mix(in srgb,#f59e0b 8%,transparent)">
        ${icon('alert-triangle', '', 18)}<p class="text-xs" style="color:#b45309">Enrolling will <b>CREATE A STUDENT LOGIN ACCOUNT</b> for this applicant.</p></div>` : ''}
      <div class="row gap-2" style="justify-content:flex-end">
        <button class="btn btn-outline" data-status="Rejected" ${a.status === 'Enrolled' ? 'disabled' : ''}>Reject</button>
        ${act ? `<button class="btn btn-brand" data-advance>${act[0]}</button>` : ''}
      </div>
    </div>
    ${dialogFoot('Close', '')}`, { wide: true, noFocus: true })
  wrap.querySelector('#adm-notes').onchange = (e) => { a.notes = e.target.value; DB.save() }
  wrap.querySelectorAll('[data-status]').forEach((b) => { b.onclick = () => { a.status = b.dataset.status; a.reviewedByName = store.user.name; DB.save(); closeDialog(); toast('success', 'Status updated', a.applicantName + ' → ' + a.status); onDone() } })
  wrap.querySelector('[data-advance]')?.addEventListener('click', () => {
    if (act[1] === 'Enrolled') {
      DB.data.students.push({ id: uid('stu'), name: a.applicantName, email: a.email, dob: a.dob || '', gender: a.gender || '', bloodGroup: '', admissionNo: 'EDU-' + String(DB.data.students.length + 1).padStart(3, '0'), grade: a.gradeApplied, className: a.gradeApplied + 'A', guardian: a.parentName || '', phone: a.parentPhone || '', status: 'Active', feeStatus: 'Pending' })
      DB.data.fees.push({ id: uid('fee'), studentId: '', studentName: a.applicantName, amount: 1200, status: 'Pending', dueDate: new Date().getFullYear() + '-12-15', term: 'Term 1' })
    }
    a.status = act[1]; a.reviewedByName = store.user.name; DB.save(); closeDialog()
    toast('success', act[1] === 'Enrolled' ? 'Student enrolled' : 'Status updated', a.applicantName)
    onDone()
  })
}

// ------------------------------------------------------------
// ALUMNI
// ------------------------------------------------------------
function alumni(mount) {
  let query = ''
  mount.innerHTML = `<div class="stack-6" id="alm-root"></div>`
  const root = mount.querySelector('#alm-root')
  function paint() {
    const all = DB.data.alumni
    const filtered = all.filter((a) => !query || a.name.toLowerCase().includes(query) || (a.admissionNo || '').toLowerCase().includes(query))
    const withContact = all.filter((a) => a.email || a.phone).length
    root.innerHTML = `
    ${banner('graduation-cap', 'Alumni', 'Graduated students and their contact network.',
      `<button class="btn btn-white" data-export>${icon('download', '', 16)} Export</button>
       <button class="btn btn-brand" data-graduate>${icon('graduation-cap', '', 16)} Graduate Students</button>`)}
    <div class="stat-grid stagger">
      ${statCard({ ic: 'graduation-cap', color: 'emerald', label: 'Total Alumni', value: String(all.length), trend: 'Network growing' })}
      ${statCard({ ic: 'calendar', color: 'teal', label: 'This Year', value: String(all.filter((a) => a.gradYear === new Date().getFullYear()).length), trend: 'Class of ' + new Date().getFullYear() })}
      ${statCard({ ic: 'mail', color: 'amber', label: 'With Contact Info', value: String(withContact), trend: 'Reachable alumni' })}
      ${statCard({ ic: 'trending-up', color: 'cyan', label: 'Grad Studies', value: '33%', trend: 'Pursuing further study' })}
    </div>
    <div class="input-wrap" style="max-width:24rem">${icon('search', 'input-ic', 16)}
      <input class="input has-ic" id="alm-q" placeholder="Search alumni by name or admission number..." value="${esc(query)}"></div>
    ${filtered.length === 0 ? `<div class="card">${empty('graduation-cap', 'No alumni found.')}</div>` : `
    <div class="grid gap-4" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">
      ${filtered.map((a) => `
      <div class="card" style="overflow:hidden"><div style="height:4px;background:var(--brand)"></div>
        <div class="card-c stack-3">
          <div class="row gap-3">
            ${avatarHtml(a.name, 'Student', 'av-10')}
            <div class="flex-1"><p class="font-semibold">${esc(a.name)}</p>
              <p class="text-xs muted">${esc(a.admissionNo || '')}</p></div>
            <span class="badge badge-soft">Class of ${a.gradYear}</span>
          </div>
          <div class="row gap-2 text-xs muted">${icon('graduation-cap', '', 12)} ${gradeToForm(a.lastGrade)} · ${esc(a.lastClass || '')}</div>
          <div class="stack-2 text-xs">
            ${a.email ? `<a class="row gap-2 brand-text" href="mailto:${esc(a.email)}">${icon('mail', '', 12)} ${esc(a.email)}</a>` : ''}
            ${a.phone ? `<a class="row gap-2 brand-text" href="tel:${esc(a.phone)}">${icon('phone', '', 12)} ${esc(a.phone)}</a>` : ''}
          </div>
          <p class="text-xs muted clamp-2">${esc(a.bio || '')}</p>
          <button class="btn btn-outline btn-sm" data-mail="${a.id}">${icon('mail', '', 14)} View Profile</button>
        </div></div>`).join('')}
    </div>`}`
    root.querySelector('#alm-q').oninput = (e) => { query = e.target.value.toLowerCase(); paint() }
    root.querySelector('[data-export]').onclick = () => {
      const rows = all.map((a) => [a.name, a.email, a.admissionNo || '', a.gradYear, a.lastClass || '', a.phone || ''])
      csvDownload([['name', 'email', 'admission_no', 'grad_year', 'last_class', 'phone'], ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n'), 'alumni.csv')
      toast('success', 'Exported', `${all.length} alumni exported to CSV.`)
    }
    root.querySelector('[data-graduate]').onclick = () => graduateDialog(paint)
    root.querySelectorAll('[data-mail]').forEach((b) => { b.onclick = () => toast('info', 'Alumni profile', 'Contact info is shown on the card.') })
  }
  paint()
}

function graduateDialog(onDone) {
  const students = DB.data.students
  const wrap = openDialog(`${dialogHead('Graduate Students', 'Move a student to the alumni registry.')}
    <div class="stack-3" style="margin-top:1rem">
      <div class="input-wrap">${icon('search', 'input-ic', 16)}<input class="input has-ic" id="gr-q" placeholder="Search students..."></div>
      <div class="stack-2" id="gr-list" style="max-height:280px;overflow-y:auto">
        ${students.map((s) => `<button class="search-item" data-grad="${s.id}">${avatarHtml(s.name, 'Student', 'av-8')}
          <div><p class="font-medium">${esc(s.name)}</p><p class="cell-sub">${esc(s.className ?? '')} · ${esc(s.admissionNo)}</p></div></button>`).join('')}
      </div>
    </div>${dialogFoot('Cancel', '')}`, { noFocus: true })
  wrap.querySelector('#gr-q').oninput = (e) => {
    const q = e.target.value.toLowerCase()
    wrap.querySelectorAll('[data-grad]').forEach((b) => {
      const s = students.find((x) => x.id === b.dataset.grad)
      b.style.display = s.name.toLowerCase().includes(q) ? '' : 'none'
    })
  }
  wrap.querySelectorAll('[data-grad]').forEach((b) => {
    b.onclick = () => {
      const s = students.find((x) => x.id === b.dataset.grad)
      closeDialog()
      confirmDialog('Ready to graduate ' + s.name + '?', `${s.name} will be moved to the alumni registry and removed from the active student list.`, 'Mark as Graduated', () => {
        DB.data.alumni.push({ id: uid('alm'), name: s.name, email: s.email, admissionNo: s.admissionNo, gradYear: new Date().getFullYear(), lastGrade: s.grade, lastClass: s.className, avatar: null, bio: '', phone: s.phone || '', status: 'Active' })
        DB.data.students = DB.data.students.filter((x) => x.id !== s.id)
        DB.save(); toast('success', 'Graduated', s.name + ' is now an alumnus.'); onDone()
      }, false)
    }
  })
}

// ------------------------------------------------------------
// VISITORS
// ------------------------------------------------------------
function visitors(mount) {
  let tab = 'All'
  mount.innerHTML = `<div class="stack-6" id="vis-root"></div>`
  const root = mount.querySelector('#vis-root')
  const PURPOSE = { Meeting: 'badge-soft', Delivery: 'badge-teal', Maintenance: 'badge-warn', 'Parent Visit': 'badge-info', Other: 'badge-muted' }

  function paint() {
    const all = DB.data.visitors
    const today = todayStr()
    const inNow = all.filter((v) => v.status === 'Checked In')
    const todayList = all.filter((v) => v.checkInTime.slice(0, 10) === today)
    const outToday = all.filter((v) => v.status === 'Checked Out' && (v.checkOutTime || '').slice(0, 10) === today)
    const week = all.filter((v) => Date.now() - new Date(v.checkInTime).getTime() < 7 * 864e5)
    const filtered = all.filter((v) => tab === 'All' || (tab === 'Checked In' ? v.status === 'Checked In' : v.status === 'Checked Out'))
    root.innerHTML = `
    ${banner('user-check', 'Visitor Management', 'Track campus visitors and gate passes.',
      `<button class="btn btn-white" data-checkin>${icon('plus', '', 16)} Check In Visitor</button>`)}
    <div class="stat-grid stagger">
      ${statCard({ ic: 'user-check', color: 'emerald', label: 'Currently Checked In', value: String(inNow.length), trend: 'On campus now' })}
      ${statCard({ ic: 'clock', color: 'teal', label: 'Total Today', value: String(todayList.length), trend: 'Since midnight' })}
      ${statCard({ ic: 'log-out', color: 'amber', label: 'Checked Out Today', value: String(outToday.length), trend: 'Departed' })}
      ${statCard({ ic: 'calendar-days', color: 'cyan', label: 'Total This Week', value: String(week.length), trend: 'Last 7 days' })}
    </div>
    <div class="card"><div class="card-c flush"><div class="stack-3" style="padding:1rem 1.25rem">
      <div class="tabs">
        ${['All', 'Checked In', 'Checked Out'].map((t) => `<button class="tab ${tab === t ? 'active' : ''}" data-tab="${t}">${t}&nbsp;(${t === 'All' ? all.length : t === 'Checked In' ? inNow.length : all.length - inNow.length})</button>`).join('')}
      </div></div>
      ${filtered.length === 0 ? empty('user-check', 'No visitors found.') : `
      <div class="table-wrap"><table class="table"><thead><tr>
        <th>Visitor</th><th>Purpose</th><th class="hide-md-down">Visiting Whom</th><th>Check-In</th><th class="hide-md-down">Check-Out</th><th class="hide-md-down">Gate Pass</th><th>Status</th><th style="text-align:right">Actions</th>
      </tr></thead><tbody>
        ${filtered.map((v) => `
        <tr>
          <td><p class="font-medium">${esc(v.name)}</p><p class="cell-sub">${esc(v.phone || v.email || '')}</p></td>
          <td><span class="badge ${PURPOSE[v.purpose] || 'badge-muted'}">${esc(v.purpose)}</span></td>
          <td class="hide-md-down"><p class="text-sm">${esc(v.visitingWhom || '—')}</p></td>
          <td><p class="text-sm">${new Date(v.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p><p class="cell-sub">${timeAgo(v.checkInTime)}</p></td>
          <td class="hide-md-down"><p class="text-sm">${v.checkOutTime ? new Date(v.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</p></td>
          <td class="hide-md-down"><span class="badge badge-outline" style="font-family:ui-monospace,monospace">${esc(v.gatePassNo || '—')}</span></td>
          <td><span class="badge ${v.status === 'Checked In' ? 'badge-soft' : 'badge-muted'}">
            ${v.status === 'Checked In' ? '<span class="pulse-dot" style="display:inline-block;height:6px;width:6px;border-radius:9999px;background:#10b981;margin-right:4px"></span>' : ''}${v.status}</span></td>
          <td><div class="row gap-1" style="justify-content:flex-end">
            <button class="btn btn-ghost btn-icon" data-pass="${v.id}" title="Print gate pass">${icon('printer', '', 16)}</button>
            ${v.status === 'Checked In' ? `<button class="btn btn-outline btn-sm" data-out="${v.id}">Check Out</button>` : ''}
            <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-del="${v.id}">${icon('trash-2', '', 16)}</button>
          </div></td>
        </tr>`).join('')}
      </tbody></table></div>`}
    </div></div>`
    root.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; paint() } })
    root.querySelector('[data-checkin]').onclick = () => {
      const wrap = openDialog(`${dialogHead('Check In Visitor')}
        <div class="form-grid">
          ${field('Visitor Name *', `<input class="input" id="vs-name">`)}
          ${field('Phone', `<input class="input" id="vs-phone">`)}
          ${field('Email', `<input class="input" id="vs-email" type="email">`)}
          ${field('Purpose', sel('vs-purpose', ['Meeting', 'Delivery', 'Maintenance', 'Parent Visit', 'Other'], 'Meeting'))}
          ${field('Visiting Whom', `<input class="input" id="vs-whom" placeholder="Staff member or department">`)}
        </div>
        ${dialogFoot('Cancel', `<button class="btn btn-brand" id="vs-save">${icon('user-check', '', 14)} Check In</button>`)}`)
      wrap.querySelector('#vs-save').onclick = () => {
        const name = wrap.querySelector('#vs-name').value.trim()
        if (!name) { toast('error', 'Visitor name is required'); return }
        DB.data.visitors.unshift({
          id: uid('vis'), name, phone: wrap.querySelector('#vs-phone').value, email: wrap.querySelector('#vs-email').value,
          purpose: wrap.querySelector('#vs-purpose').value, visitingWhom: wrap.querySelector('#vs-whom').value,
          checkInTime: nowIso(), checkOutTime: null, status: 'Checked In',
          gatePassNo: 'GP-' + String(100 + DB.data.visitors.length + 1).slice(-4), checkedInByName: store.user.name, createdAt: nowIso(),
        })
        DB.save(); closeDialog(); toast('success', 'Visitor checked in', name); paint()
      }
    }
    root.querySelectorAll('[data-out]').forEach((b) => { b.onclick = () => {
      const v = DB.data.visitors.find((x) => x.id === b.dataset.out)
      v.status = 'Checked Out'; v.checkOutTime = nowIso(); DB.save(); toast('success', 'Checked out', v.name); paint()
    } })
    root.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => {
      const v = DB.data.visitors.find((x) => x.id === b.dataset.del)
      confirmDialog('Delete record?', `Remove ${v.name}'s visit record?`, 'Delete', () => {
        DB.data.visitors = DB.data.visitors.filter((x) => x.id !== v.id); DB.save(); paint()
      })
    } })
    root.querySelectorAll('[data-pass]').forEach((b) => { b.onclick = () => {
      const v = DB.data.visitors.find((x) => x.id === b.dataset.pass)
      printHtml('Gate Pass — ' + v.name, `
        <h1>Gate Pass</h1><p class="sub">${esc(DB.data.settings.name || 'School Name')} · Visitor Management</p><div class="rule"></div>
        <div style="border:2px dashed #999;padding:24px;text-align:center;margin-bottom:16px">
          <p style="font-size:12px;color:#666">GATE PASS</p>
          <h2 style="margin:8px 0">${esc(v.gatePassNo)}</h2>
          <p style="font-size:18px"><b>${esc(v.name)}</b></p>
          <p style="color:#555">${esc(v.purpose)} · Visiting ${esc(v.visitingWhom || '—')}</p>
        </div>
        <div class="grid"><div><b>Check-In</b><br>${new Date(v.checkInTime).toLocaleString()}</div>
        <div><b>Check-Out</b><br>${v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : '—'}</div></div>
        <div class="sign"><span>Visitor Signature</span><span>Security Signature</span></div>`)
    } })
  }
  paint()
}
