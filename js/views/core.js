// ============================================================
// Views: dashboard + profile
// ============================================================
import { icon } from '../icons.js'
import { DB, timeAgo, initials, scoreToLetter, letterClass, gradeToForm } from '../data.js'
import { esc, toast, banner, statCard, card, empty, avatarHtml, barChart, donutChart, go, store } from '../ui.js'

const EVENT_COLORS = { Exam: '#ef4444', Event: 'var(--chart-1)', Holiday: '#8b5cf6', Meeting: '#f59e0b' }

export function render(view, mount) {
  if (view === 'dashboard') dashboard(mount)
  else if (view === 'profile') profile(mount)
}

// ------------------------------------------------------------
// DASHBOARD
// ------------------------------------------------------------
function dashboard(mount) {
  const u = store.user
  const isStudent = u.role === 'Student'
  const d = DB.data
  const students = d.students
  const staff = d.staff
  const fees = d.fees
  const att = d.attendance
  const present = att.filter((a) => a.status === 'Present').length
  const absent = att.filter((a) => a.status === 'Absent').length
  const late = att.filter((a) => a.status === 'Late').length
  const total = att.length || 1
  const collected = fees.filter((f) => f.status === 'Paid').reduce((a, f) => a + f.amount, 0)
  const pending = fees.filter((f) => f.status === 'Pending').reduce((a, f) => a + f.amount, 0)
  const presentPct = Math.round((present / total) * 100)
  const latePct = Math.round((late / total) * 100)

  const bySubject = new Map()
  for (const g of d.grades) { if (!bySubject.has(g.subject)) bySubject.set(g.subject, []); bySubject.get(g.subject).push(g.score) }
  const gradeDist = Array.from(bySubject.entries()).map(([subject, scores]) => ({ subject, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))

  const anns = (DB.data.__announcements || []).slice(0, 4)
  const events = d.events
  const loans = d.loans.filter((l) => l.status !== 'Returned').filter((l) => isStudent ? l.userId === u.id : true)

  const cal = new Date()
  const year = cal.getFullYear(), month = cal.getMonth()
  const startWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const monthName = cal.toLocaleString('en-US', { month: 'long' })
  const eventsForDay = (day) => events.filter((e) => e.date === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)

  const attData = [
    { name: 'Present', value: presentPct, color: 'var(--chart-1)' },
    { name: 'Late', value: latePct, color: '#f59e0b' },
    { name: 'Absent', value: Math.round((absent / total) * 100), color: '#ef4444' },
  ].filter((x) => x.value > 0)

  const qaStudent = [
    { ic: 'clipboard-list', label: 'My Grades', color: 'emerald', view: 'grades' },
    { ic: 'book-open', label: 'Assignments', color: 'teal', view: 'assignments' },
    { ic: 'library', label: 'Borrow Book', color: 'amber', view: 'library' },
    { ic: 'file-text', label: 'Reports', color: 'cyan', view: 'reports' },
  ]
  const qaStaff = [
    { ic: 'users', label: 'Students', color: 'emerald', view: 'students' },
    { ic: 'clipboard-list', label: 'Grades', color: 'teal', view: 'grades' },
    { ic: 'megaphone', label: 'Announce', color: 'amber', view: 'announcements' },
    { ic: 'file-text', label: 'Reports', color: 'cyan', view: 'reports' },
  ]
  const qa = isStudent ? qaStudent : qaStaff

  mount.innerHTML = `
  <div class="stack-6">
    ${banner('', `Welcome back, ${esc(u.name.split(' ')[0])}! 👋`,
      isStudent ? "Here's what's happening in your classes today." : "Here's your school overview at a glance.",
      `<button class="btn btn-white" data-go="${isStudent ? 'assignments' : 'students'}">${icon(isStudent ? 'book-open' : 'users', '', 16)} ${isStudent ? 'My Assignments' : 'View Students'}</button>`,
      new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))}

    <div class="stat-grid stagger">
      ${statCard({ ic: 'users', color: 'emerald', label: 'Total Students', value: String(students.length), trend: '+12 this term', view: 'students' })}
      ${isStudent
        ? statCard({ ic: 'book-open', color: 'teal', label: 'My Subjects', value: '3', trend: 'Term 1', view: 'grades' })
        : statCard({ ic: 'graduation-cap', color: 'teal', label: 'Staff Members', value: String(staff.length), trend: 'All active', view: 'staff' })}
      ${statCard({ ic: 'dollar-sign', color: 'amber', label: 'Fees Collected', value: '$' + collected.toLocaleString(), trend: 'of $' + (collected + pending).toLocaleString(), view: 'fees' })}
      ${statCard({ ic: 'circle-check', color: 'cyan', label: 'Attendance Today', value: presentPct + '%', trend: latePct + '% late', view: 'attendance' })}
    </div>

    <div class="cols-lg-3">
      <div class="span-2 stack-6">
        ${!isStudent && gradeDist.length ? card(
          'Grade Distribution by Subject', 'Average scores across all students',
          barChart(gradeDist.map((g) => ({ label: g.subject, value: g.avg })), { max: 100, height: 260 }),
          { titleSize: 'text-base', actions: `<button class="btn btn-ghost btn-sm" data-go="grades">View all ${icon('arrow-right', '', 14)}</button>` }) : ''}
        ${card(
          `<span class="row gap-2" style="display:inline-flex">${icon('megaphone', '', 16)} Announcements</span>`, 'Latest news from the school',
          anns.length ? anns.map((a) => `
            <div class="row-card">
              <div class="row between gap-2"><p class="text-sm font-semibold">${esc(a.title)}</p><span class="text-xs muted" style="flex-shrink:0">${timeAgo(a.createdAt)}</span></div>
              <p class="mt-1 text-xs muted clamp-2">${esc(a.body)}</p>
              <p class="mt-2 text-xs font-medium brand-text">— ${esc(a.authorName)}</p>
            </div>`).join('') : '<p class="text-center muted text-sm" style="padding:1.5rem 0">No announcements yet.</p>',
          { titleSize: 'text-base', actions: `<button class="btn btn-ghost btn-sm" data-go="announcements">View all ${icon('arrow-right', '', 14)}</button>` })}
        ${card(
          `<span class="row gap-2" style="display:inline-flex;color:#f59e0b">${icon('zap', '', 16)} Quick Actions</span>`, 'Jump to common tasks',
          `<div class="qa-grid">${qa.map((q) => `
            <button class="qa qa-${q.color}" data-go="${q.view}">
              <span class="qa-ic">${icon(q.ic, '', 20)}</span><span class="qa-label">${q.label}</span>
            </button>`).join('')}</div>`, { titleSize: 'text-base' })}
      </div>
      <div class="stack-6">
        ${!isStudent && attData.length ? card('Attendance Today', '', donutChart(attData, { center: [presentPct + '%', 'present'] }), { titleSize: 'text-base' }) : ''}
        ${card(
          `<span class="row gap-2" style="display:inline-flex">${icon('calendar-days', '', 16)} ${monthName} ${year}</span>`, '',
          `<div class="cal">
            ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<div class="cal-dow">${x}</div>`).join('')}
            ${cells.map((day) => day === null ? '<div></div>' : (() => {
              const de = eventsForDay(day)
              const isToday = day === cal.getDate()
              return `<div class="cal-cell ${isToday ? 'today' : ''}">${day}
                ${de.length ? `<span class="cal-dots">${de.slice(0, 3).map((e) => `<span class="cal-dot" style="background:${isToday ? '#fff' : (EVENT_COLORS[e.type] || 'var(--chart-1)')}"></span>`).join('')}</span>` : ''}
              </div>`
            })()).join('')}
          </div>
          <div class="mt-3" style="height:1px;background:var(--border)"></div>
          <div class="mt-3 stack-2">
            ${events.slice(0, 4).map((e) => `
              <div class="cal-legend-row"><span class="cal-legend-dot" style="background:${EVENT_COLORS[e.type] || 'var(--chart-1)'}"></span>
                <span class="cal-legend-title">${esc(e.title)}</span>
                <span class="muted">${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div>`).join('')}
          </div>`, { titleSize: 'text-base' })}
        ${loans.length ? card(
          `<span class="row gap-2" style="display:inline-flex">${icon('book-marked', '', 16)} Library Due Dates</span>`, '',
          loans.slice(0, 4).map((l) => {
            const overdue = l.status === 'Overdue'
            const daysLeft = Math.ceil((new Date(l.dueDate + 'T12:00:00') - Date.now()) / 864e5)
            return `<div class="row gap-3 row-card">
              <span class="stat-ic" style="width:2.25rem;height:2.25rem;border-radius:.5rem;${overdue ? 'background:#fee2e2;color:#dc2626' : daysLeft <= 3 ? 'background:#fef3c7;color:#d97706' : ''}">${icon('book-open', '', 16)}</span>
              <div class="flex-1"><p class="text-sm font-medium truncate">${esc(l.bookTitle)}</p>
                <p class="text-xs muted">Due ${new Date(l.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p></div>
              <span class="badge ${overdue ? 'badge-danger' : daysLeft <= 3 ? 'badge-warn' : 'badge-soft'}" style="border:1px solid">${overdue ? 'Overdue' : daysLeft <= 0 ? 'Today' : daysLeft + 'd'}</span>
            </div>`
          }).join(''),
          { titleSize: 'text-base', actions: `<button class="btn btn-ghost btn-sm" data-go="library">All ${icon('arrow-right', '', 14)}</button>` }) : ''}
      </div>
    </div>
  </div>`

  mount.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go) })
}

// ------------------------------------------------------------
// PROFILE
// ------------------------------------------------------------
function profile(mount) {
  const d = DB.data
  let u = store.user
  const viewingOther = store.viewUserId && store.viewUserId !== u.id
  let role = u.role
  if (viewingOther) {
    const stu = d.students.find((s) => s.id === store.viewUserId)
    const stf = d.staff.find((s) => s.id === store.viewUserId)
    if (stu) { u = { ...u, ...stu, role: 'Student', id: stu.id, name: stu.name, email: stu.email, admissionNo: stu.admissionNo, grade: stu.grade, className: stu.className, guardian: stu.guardian, phone: stu.phone }; role = 'Student' }
    else if (stf) { u = { ...u, ...stf, id: stf.id, name: stf.name, email: stf.email, role: stf.role, department: stf.department, phone: stf.phone, subjects: stf.subjects, bio: stf.bio, points: stf.points, level: stf.level, badges: stf.badges } }
    store.viewUserId = null
  }
  const isStudent = role === 'Student'
  const grades = d.grades.filter((g) => g.studentId === u.id)
  const avg = grades.length ? Math.round(grades.reduce((a, g) => a + g.score, 0) / grades.length) : 0
  const myAssign = isStudent ? d.assignments.filter((a) => a.className === u.className) : d.assignments.filter((a) => a.teacherId === u.id)
  const points = u.points ?? 0, level = u.level ?? 1
  const nextLevel = level * 100
  const pct = Math.min(100, Math.round((points / (nextLevel + 100)) * 100))
  const canEdit = !viewingOther

  const tabs = [
    { id: 'overview', label: 'Overview' }, { id: 'academic', label: 'Academic' },
    { id: 'activity', label: 'Activity' }, { id: 'growth', label: 'Growth' },
  ]

  mount.innerHTML = `
  <div class="stack-6">
    <div class="card anim-view" style="overflow:hidden">
      <div class="profile-cover">
        <div class="profile-avatar-wrap">
          <span class="avatar av-28" style="border:6px solid var(--card)">${u.avatar ? `<img src="${u.avatar}">` : icon('user', '', 48)}</span>
          ${canEdit ? `<span class="profile-cam">${icon('pencil', '', 12)}</span>` : ''}
        </div>
      </div>
      <div class="profile-info">
        <div class="flex-1">
          <h2 class="profile-name">${esc(u.name)} <span class="badge badge-soft">${esc(role)}</span></h2>
          <p class="profile-dept">${esc(isStudent ? `Form ${u.grade - 6} · Class ${u.className}` : (u.department || 'Staff'))}</p>
        </div>
        ${canEdit ? `<button class="btn btn-outline" data-edit>${icon('pencil', '', 16)} Edit Profile</button>` : ''}
      </div>
    </div>

    <div class="tabs" id="prof-tabs">${tabs.map((t, i) => `<button class="tab ${i === 0 ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}</div>
    <div id="prof-body"></div>
  </div>`

  const body = mount.querySelector('#prof-body')
  function tab(id) {
    mount.querySelectorAll('#prof-tabs .tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === id))
    if (id === 'overview') body.innerHTML = overviewHtml()
    else if (id === 'academic') body.innerHTML = academicHtml()
    else if (id === 'activity') body.innerHTML = activityHtml()
    else body.innerHTML = growthHtml()
    bindTab(body)
  }

  function overviewHtml() {
    return `
    <div class="cols-lg-3" style="grid-template-columns:1.4fr 1fr">
      <div class="card">
        <div class="card-h"><h3 class="card-t text-base">Personal Information</h3></div>
        <div class="card-c">
          <div class="info-row">${icon('mail', 'ic-inline', 16)}<span class="info-k">Email</span><span class="info-v">${esc(u.email)}</span></div>
          <div class="info-row">${icon('phone', 'ic-inline', 16)}<span class="info-k">Phone</span><span class="info-v">${esc(u.phone || '—')}</span></div>
          <div class="info-row">${icon('credit-card', 'ic-inline', 16)}<span class="info-k">User ID</span><span class="info-v">${esc((u.id || '').toUpperCase())}</span></div>
          ${isStudent
            ? `<div class="info-row">${icon('graduation-cap', 'ic-inline', 16)}<span class="info-k">Form / Class</span><span class="info-v">${gradeToForm(u.grade)} · ${esc(u.className ?? '')}</span></div>
               <div class="info-row">${icon('heart-handshake', 'ic-inline', 16)}<span class="info-k">Guardian</span><span class="info-v">${esc(u.guardian || '—')}</span></div>`
            : `<div class="info-row">${icon('briefcase', 'ic-inline', 16)}<span class="info-k">Department</span><span class="info-v">${esc(u.department || '—')}</span></div>`}
          <div class="mt-3" style="height:1px;background:var(--border)"></div>
          <p class="label-sm mt-3">BIO</p>
          <p class="text-sm">${esc(u.bio || 'No bio yet.')}</p>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h3 class="card-t text-base">Gamification</h3></div>
        <div class="card-c">
          <div class="row gap-3">
            <span class="stat-ic ic-amber" style="border-radius:9999px">${icon('star', '', 22)}</span>
            <div><p class="text-2xl font-bold">${points}</p><p class="text-xs muted">Points · Level ${level}</p></div>
            <span class="badge badge-warn ml-auto">${icon('award', '', 12)} ${u.badges ?? 0} Badges</span>
          </div>
          <div class="mt-4">
            <div class="row between text-xs mb-2"><span>Level ${level}</span><span class="muted">${points} pts</span></div>
            <div class="progress"><div style="width:${pct}%"></div></div>
            <p class="text-xs muted mt-2">${Math.max(0, nextLevel + 100 - points)} points to Level ${level + 1}</p>
          </div>
        </div>
      </div>
    </div>`
  }

  function academicHtml() {
    if (!isStudent) {
      const subjects = u.subjects || []
      const myStudents = d.students.filter((s) => s.grade != null)
      return `<div class="stack-4">
        ${!viewingOther ? `<div class="stat-grid stagger">
          ${statCard({ ic: 'book-open', color: 'emerald', label: 'Subjects', value: String(subjects.length), trend: 'Assigned' })}
          ${statCard({ ic: 'users', color: 'teal', label: 'Students at school', value: String(myStudents.length), trend: 'All classes' })}
          ${statCard({ ic: 'award', color: 'cyan', label: 'Level', value: String(level), trend: points + ' pts' })}
        </div>` : ''}
        ${card('Subjects & Classes', 'Assigned teaching load',
          subjects.length ? `<div class="chip-row">${subjects.map((s) => `<span class="subj-chip sc-brand"><span class="subj-dot"></span>${esc(s)}</span>`).join('')}</div>` : '<p class="muted text-sm">No subjects assigned.</p>',
          { titleSize: 'text-base' })}
      </div>`
    }
    const top = grades.length ? grades.reduce((a, g) => (g.score > a.score ? g : a)) : null
    return `
    <div class="stack-4">
      <div class="stat-grid stagger">
        ${statCard({ ic: 'trending-up', color: 'emerald', label: 'Average Score', value: avg + '%', trend: grades.length + ' subjects graded' })}
        ${statCard({ ic: 'book-open', color: 'teal', label: 'Subjects', value: String(grades.length), trend: 'Term 1' })}
        ${statCard({ ic: 'award', color: 'cyan', label: 'Top Grade', value: top ? scoreToLetter(top.score) : '—', trend: top ? top.subject : '' })}
      </div>
      ${card('My Grades', 'Scores across all subjects',
        grades.length ? grades.map((g) => {
          const l = scoreToLetter(g.score)
          const col = g.score >= 80 ? 'background:color-mix(in srgb, var(--brand) 12%, transparent);color:var(--brand)' : g.score >= 60 ? 'background:#fef3c7;color:#b45309' : 'background:#fee2e2;color:#b91c1c'
          return `<div class="row gap-3 row-card">
            <span class="stat-ic" style="width:2.75rem;height:2.75rem;font-weight:700;${col}">${g.score}</span>
            <div class="flex-1"><p class="text-sm font-medium">${esc(g.subject)}</p><p class="text-xs muted">${esc(g.term)}</p></div>
            <span class="badge ${letterClass(l)}">${l}</span>
          </div>`
        }).join('') : empty('clipboard-list', 'No grades recorded yet.'),
        { titleSize: 'text-base' })}
    </div>`
  }

  function activityHtml() {
    return card('Recent Assignments', 'Latest class work',
      myAssign.length ? myAssign.map((a) => {
        const sub = d.submissions.find((s) => s.assignmentId === a.id && s.studentId === u.id)
        const status = sub ? (sub.grade != null ? 'Graded' : 'Submitted') : new Date(a.dueDate) < new Date() ? 'Overdue' : 'Assigned'
        const cls = status === 'Graded' ? 'badge-soft' : status === 'Submitted' ? 'badge-teal' : status === 'Overdue' ? 'badge-danger' : 'badge-muted'
        return `<div class="row-card">
          <div class="row between gap-2"><p class="text-sm font-semibold">${esc(a.title)}</p>
            <span class="badge ${cls}">${status}${sub?.grade != null ? ` · ${sub.grade}/100` : ''}</span></div>
          <p class="text-xs muted mt-1">${esc(a.subject)} · ${esc(a.className)} · Due ${new Date(a.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
        </div>`
      }).join('') : empty('clipboard-check', 'No assignments yet.'),
      { titleSize: 'text-base' })
  }

  function growthHtml() {
    const goals = [
      { label: 'Attendance above 90%', pct: 93 }, { label: 'Average score 80%+', pct: Math.min(100, avg) }, { label: 'Read 5 books this term', pct: 40 },
    ]
    const badgeDefs = [
      { ic: 'zap', label: 'Fast Starter' }, { ic: 'award', label: 'High Achiever' }, { ic: 'star', label: 'Star Student' },
      { ic: 'book-open', label: 'Bookworm' }, { ic: 'clock', label: 'Always On Time' }, { ic: 'target', label: 'Goal Getter' },
    ]
    return `
    <div class="cols-lg-3" style="grid-template-columns:1.4fr 1fr">
      <div class="card">
        <div class="card-h"><h3 class="card-t text-base">Growth Goals</h3></div>
        <div class="card-c stack-4">
          ${goals.map((g) => `
            <div><div class="row between text-sm mb-2"><span class="font-medium">${esc(g.label)}</span><span class="muted text-xs">${g.pct}%</span></div>
            <div class="progress"><div style="width:${g.pct}%"></div></div></div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h3 class="card-t text-base">Badges Earned</h3></div>
        <div class="card-c">
          <div class="qa-grid" style="grid-template-columns:repeat(3,1fr)">
            ${badgeDefs.map((b, i) => `
              <div class="qa ${i < (u.badges ?? 0) ? 'qa-emerald' : ''}" style="${i < (u.badges ?? 0) ? '' : 'opacity:.35;cursor:default'}">
                <span class="qa-ic">${icon(b.ic, '', 20)}</span><span class="qa-label">${b.label}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`
  }

  function bindTab(root) {
    root.querySelectorAll('[data-edit]').forEach((b) => {
      b.onclick = () => {
        const wrap = document.createElement('div')
        document.body.insertAdjacentHTML('beforeend', '')
        import('../ui.js').then(() => {})
        // simple inline edit dialog
        const ov = document.createElement('div')
        ov.className = 'dialog-overlay'
        ov.innerHTML = `<div class="dialog"><h3 class="dialog-title">Edit Profile</h3>
          <div class="form-grid">
            <div class="field" style="grid-column:1/-1"><label class="label-sm">Full Name</label><input class="input" id="ed-name" value="${esc(u.name)}"></div>
            <div class="field"><label class="label-sm">Phone</label><input class="input" id="ed-phone" value="${esc(u.phone || '')}"></div>
            <div class="field" style="grid-column:1/-1"><label class="label-sm">Bio</label><textarea class="input" id="ed-bio">${esc(u.bio || '')}</textarea></div>
          </div>
          <div class="dialog-foot"><button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-brand" id="ed-save">Save Changes</button></div></div>`
        ov.addEventListener('mousedown', (e) => { if (e.target === ov) ov.remove() })
        ov.querySelector('[data-close]').onclick = () => ov.remove()
        ov.querySelector('#ed-save').onclick = () => {
          const name = ov.querySelector('#ed-name').value.trim()
          const acct = DB.data.staff.find((s) => s.id === store.user.id) || DB.data.students.find((s) => s.id === store.user.id)
          if (acct) { acct.name = name || acct.name; acct.phone = ov.querySelector('#ed-phone').value; acct.bio = ov.querySelector('#ed-bio').value; DB.save() }
          store.user.name = name || store.user.name
          store.save()
          ov.remove()
          toast('success', 'Profile updated')
          profile(mount)
        }
        document.body.appendChild(ov)
      }
    })
  }

  mount.querySelectorAll('#prof-tabs .tab').forEach((b) => { b.onclick = () => tab(b.dataset.tab) })
  tab('overview')
}
