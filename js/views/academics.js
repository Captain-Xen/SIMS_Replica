// ============================================================
// Views: grades, attendance, timetable, subjects, exams, assignments,
//        reports, analytics, performance, conference, parent-portal, terms
// ============================================================
import { icon } from '../icons.js'
import { DB, uid, gradeToForm, scoreToLetter, letterClass, timeAgo, todayStr, dateOffset, nowIso, printHtml, initials } from '../data.js'
import { esc, toast, banner, card, empty, avatarHtml, openDialog, closeDialog, confirmDialog, dialogHead, dialogFoot, field, barChart, donutChart, lineChart, statCard, store, go, btnWhite } from '../ui.js'

const CLASSES = ['7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B']
const SUBJECTS_ALL = ['Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Spanish', 'Physical Education', 'Information Technology']
const SUBJ_COLOR = { Mathematics: 'sc-brand', English: 'sc-teal', Biology: 'sc-lime', History: 'sc-amber', Physics: 'sc-cyan', Spanish: 'sc-rose', Chemistry: 'sc-violet', French: 'sc-pink', Geography: 'sc-orange' }
const subjColor = (s) => SUBJ_COLOR[s] || SUBJ_COLOR[s.split(' ')[0]] || 'sc-slate'
const sel = (id, options, value, extra = '') => `<select id="${id}" class="input" ${extra}>${options.map((o) => { const v = o[0], l = o[1] ?? o[0]; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>` }).join('')}</select>`

export function render(view, mount) {
  const map = { grades, attendance, timetable, subjects, exams, assignments, reports, analytics, performance, conference, 'parent-portal': parentPortal, terms }
  map[view](mount)
}

// ------------------------------------------------------------
// GRADES
// ------------------------------------------------------------
function grades(mount) {
  const u = store.user
  const isTeacher = u.role === 'Teacher'
  const isStudent = u.role === 'Student'
  if (isStudent) return gradesStudent(mount)

  let classF = '10A', subjectF = 'Mathematics', termF = 'Term 1'
  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)

  function paint() {
    const list = DB.data.students.filter((s) => s.className === classF)
    const gradesFor = (sid) => DB.data.grades.find((g) => g.studentId === sid && g.subject === subjectF && g.term === termF)
    const graded = list.filter((s) => gradesFor(s.id)).length
    const scores = list.map((s) => gradesFor(s.id)?.score).filter((x) => x != null)
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    root.innerHTML = `
    ${banner('clipboard-list', 'Academics & Grades', 'Enter and manage student grades.')}
    <div class="card"><div class="card-c tight"><div class="toolbar" style="padding:0">
      ${sel('g-class', CLASSES, classF, 'style="width:8rem"')}
      ${sel('g-subject', SUBJECTS_ALL, subjectF, 'style="width:12rem"')}
      ${sel('g-term', ['Term 1', 'Term 2', 'Term 3'], termF, 'style="width:8rem"')}
      <span class="flex-1"></span>
      <button class="btn btn-brand" data-save>${icon('save', '', 14)} Save Grades</button>
    </div></div></div>
    <div class="stat-grid stagger" style="grid-template-columns:repeat(3,1fr)">
      ${statCard({ ic: 'check-square', color: 'emerald', label: 'Graded Students', value: `${graded}/${list.length}`, trend: subjectF })}
      ${statCard({ ic: 'trending-up', color: 'teal', label: 'Class Average', value: avg != null ? avg + '%' : '—', trend: termF })}
      ${statCard({ ic: 'book-open', color: 'amber', label: 'Subject', value: subjectF.length > 10 ? subjectF.slice(0, 10) : subjectF, trend: termF })}
    </div>
    ${card('Enter Grades', `${gradeToForm(DB.data.students.find((s) => s.className === classF)?.grade)} · ${classF}`,
      list.length === 0 ? empty('users', 'No students in this class.') : `
      <div class="table-wrap"><table class="table"><thead><tr>
        <th>Student</th><th class="hide-md-down">Admission No.</th><th style="width:8rem">Score (0–100)</th><th>Letter</th>
      </tr></thead><tbody>
        ${list.map((s) => {
          const g = gradesFor(s.id)
          const sc = g?.score ?? ''
          const l = sc === '' ? '' : scoreToLetter(Number(sc))
          return `<tr>
            <td><div class="row gap-3">${avatarHtml(s.name, 'Student', 'av-8')}
              <span><p class="font-medium">${esc(s.name)}</p></span></div></td>
            <td class="hide-md-down"><p class="cell-sub">${esc(s.admissionNo)}</p></td>
            <td><input class="input g-score" data-sid="${s.id}" type="number" min="0" max="100" value="${sc}" style="width:6rem;padding:.375rem .5rem"></td>
            <td><span class="badge ${l ? letterClass(l) : 'badge-muted'}">${l || '—'}</span></td>
          </tr>`
        }).join('')}
      </tbody></table></div>`, { titleSize: 'text-base' })}`

    root.querySelectorAll('.g-score').forEach((inp) => {
      inp.oninput = () => {
        const badge = inp.closest('tr').querySelector('.badge')
        const v = inp.value
        const l = v === '' ? '' : scoreToLetter(Number(v))
        badge.className = 'badge ' + (l ? letterClass(l) : 'badge-muted')
        badge.textContent = l || '—'
      }
    })
    root.querySelector('#g-class').onchange = (e) => { classF = e.target.value; paint() }
    root.querySelector('#g-subject').onchange = (e) => { subjectF = e.target.value; paint() }
    root.querySelector('#g-term').onchange = (e) => { termF = e.target.value; paint() }
    root.querySelector('[data-save]').onclick = () => {
      let n = 0
      root.querySelectorAll('.g-score').forEach((inp) => {
        const v = inp.value
        if (v === '') return
        const sid = inp.dataset.sid
        const s = DB.data.students.find((x) => x.id === sid)
        let g = DB.data.grades.find((x) => x.studentId === sid && x.subject === subjectF && x.term === termF)
        const score = Math.max(0, Math.min(100, Number(v)))
        if (g) g.score = score
        else DB.data.grades.push({ id: uid('gr'), studentId: sid, studentName: s.name, teacherId: store.user.id, subject: subjectF, score, term: termF, createdAt: nowIso() })
        n++
      })
      DB.save()
      toast('success', 'Grades saved', `${n} grade(s) for ${subjectF} · ${classF}.`)
      paint()
    }
  }
  paint()
}

function gradesStudent(mount) {
  const u = store.user
  const my = DB.data.grades.filter((g) => g.studentId === u.id)
  const avg = my.length ? Math.round(my.reduce((a, g) => a + g.score, 0) / my.length) : 0
  const bySubject = new Map()
  for (const g of my) bySubject.set(g.subject, g.score)
  mount.innerHTML = `
  ${banner('clipboard-list', 'Academics & Grades', 'Your academic performance at a glance.')}
  <div class="stat-grid stagger">
    ${statCard({ ic: 'book-open', color: 'emerald', label: 'Subjects Graded', value: String(my.length), trend: 'Term 1' })}
    ${statCard({ ic: 'trending-up', color: 'teal', label: 'Overall Average', value: avg + '%', trend: avg >= 80 ? 'Excellent' : avg >= 60 ? 'Good' : 'Keep pushing' })}
    ${statCard({ ic: 'award', color: 'amber', label: 'Letter Grade', value: my.length ? scoreToLetter(avg) : '—', trend: 'Overall' })}
  </div>
  ${my.length ? card('Performance by Subject', 'Score per subject',
    barChart(Array.from(bySubject.entries()).map(([s, v]) => ({ label: s, value: v })), { max: 100 }), { titleSize: 'text-base' }) : ''}
  ${card('My Grades', 'All recorded scores',
    my.length ? `<div class="table-wrap"><table class="table"><thead><tr>
      <th>Subject</th><th>Term</th><th>Score</th><th>Letter</th></tr></thead><tbody>
      ${my.map((g) => { const l = scoreToLetter(g.score); return `<tr>
        <td class="font-medium">${esc(g.subject)}</td><td>${esc(g.term)}</td><td>${g.score}%</td>
        <td><span class="badge ${letterClass(l)}">${l}</span></td></tr>` }).join('')}
    </tbody></table></div>` : empty('clipboard-list', 'No grades recorded yet.'),
    { titleSize: 'text-base' })}`
}

// ------------------------------------------------------------
// ATTENDANCE
// ------------------------------------------------------------
function attendance(mount) {
  const u = store.user
  if (u.role === 'Student') return attendanceStudent(mount)

  let date = todayStr()
  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)

  function paint() {
    const students = DB.data.students
    const recs = DB.data.attendance.filter((a) => a.date === date)
    const get = (sid) => recs.find((a) => a.studentId === sid)
    const counts = { Present: 0, Late: 0, Absent: 0, Excused: 0 }
    for (const r of recs) counts[r.status] = (counts[r.status] || 0) + 1
    const total = recs.length || 1
    const pct = Math.round((counts.Present / total) * 100)
    const STATUS_BADGE = { Present: 'badge-soft', Late: 'badge-warn', Absent: 'badge-danger', Excused: 'badge-violet' }
    root.innerHTML = `
    ${banner('clipboard-check', 'Attendance Tracking', 'Mark and monitor daily attendance.',
      `<input type="date" class="input" id="att-date" value="${date}" style="width:10rem;background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);color:#fff">`)}
    <div class="cols-lg-3" style="grid-template-columns:1fr 1.6fr">
      ${card('Summary', '', `
        <div class="stat-grid" style="grid-template-columns:repeat(2,1fr);gap:.75rem">
          ${statCard({ ic: 'check', color: 'emerald', label: 'Present', value: String(counts.Present), trend: Math.round((counts.Present / total) * 100) + '%' })}
          ${statCard({ ic: 'clock', color: 'amber', label: 'Late', value: String(counts.Late), trend: Math.round((counts.Late / total) * 100) + '%' })}
          ${statCard({ ic: 'x', color: 'cyan', label: 'Absent', value: String(counts.Absent), trend: Math.round((counts.Absent / total) * 100) + '%' })}
          ${statCard({ ic: 'info', color: 'teal', label: 'Excused', value: String(counts.Excused), trend: Math.round((counts.Excused / total) * 100) + '%' })}
        </div>
        <div class="mt-4">${donutChart([
          { name: 'Present', value: counts.Present, color: 'var(--chart-1)' },
          { name: 'Late', value: counts.Late, color: '#f59e0b' },
          { name: 'Absent', value: counts.Absent, color: '#ef4444' },
          { name: 'Excused', value: counts.Excused, color: '#8b5cf6' },
        ], { center: [pct + '%', 'present'] })}</div>`, { titleSize: 'text-base' })}
      ${card('Mark Attendance', 'Set a status for each student', `
        <div class="row wrap gap-2 mb-3">
          <span class="text-xs muted" style="margin-right:auto">Quick fill:</span>
          ${['Present', 'Late', 'Absent', 'Excused'].map((s) => `<button class="btn btn-outline btn-sm" data-fill="${s}">${s}</button>`).join('')}
          <button class="btn btn-brand btn-sm" data-save>${icon('save', '', 14)} Save</button>
        </div>
        <div class="table-wrap" style="max-height:420px;overflow-y:auto"><table class="table"><thead><tr>
          <th>Student</th><th class="hide-md-down">Class</th><th style="text-align:right">Status</th></tr></thead><tbody>
          ${students.map((s) => {
            const r = get(s.id)
            const st = r?.status ?? ''
            return `<tr>
              <td><div class="row gap-3">${avatarHtml(s.name, 'Student', 'av-8')}
                <span><p class="font-medium text-sm">${esc(s.name)}</p><p class="cell-sub">${esc(s.admissionNo)}</p></span></div></td>
              <td class="hide-md-down"><span class="badge badge-outline">${esc(s.className ?? '')}</span></td>
              <td><div class="row gap-2" style="justify-content:flex-end">
                ${st ? `<span class="badge ${STATUS_BADGE[st]}">${st}</span>` : ''}
                ${sel('att-' + s.id, [['', '—'], ['Present', 'Present'], ['Late', 'Late'], ['Absent', 'Absent'], ['Excused', 'Excused']], st, `data-st="${s.id}" style="width:7.5rem"`)}
              </div></td>
            </tr>`
          }).join('')}
        </tbody></table></div>`, { titleSize: 'text-base', flush: true })}
    </div>`

    root.querySelector('#att-date').onchange = (e) => { date = e.target.value || todayStr(); paint() }
    root.querySelectorAll('[data-fill]').forEach((b) => {
      b.onclick = () => {
        root.querySelectorAll('select[data-st]').forEach((s) => { s.value = b.dataset.fill })
        applyStatuses()
        toast('info', 'Quick fill applied', `All students marked ${b.dataset.fill}. Press Save to persist.`)
      }
    })
    root.querySelectorAll('select[data-st]').forEach((s) => { s.onchange = () => paint() })
    root.querySelector('[data-save]').onclick = saveAll

    function applyStatuses() {
      root.querySelectorAll('select[data-st]').forEach((s) => {
        const sid = s.dataset.st, v = s.value
        let r = DB.data.attendance.find((a) => a.studentId === sid && a.date === date)
        const sName = DB.data.students.find((x) => x.id === sid)?.name || ''
        if (!v) { if (r) DB.data.attendance = DB.data.attendance.filter((a) => a !== r); return }
        if (r) r.status = v
        else DB.data.attendance.push({ id: uid('att'), studentId: sid, studentName: sName, date, status: v })
      })
    }
    function saveAll() {
      applyStatuses()
      DB.save()
      toast('success', 'Attendance saved', `Records saved for ${date}.`)
      paint()
    }
  }
  paint()
}

function attendanceStudent(mount) {
  const u = store.user
  const my = DB.data.attendance.filter((a) => a.studentId === u.id)
  const c = { Present: 0, Late: 0, Absent: 0, Excused: 0 }
  for (const r of my) c[r.status] = (c[r.status] || 0) + 1
  const total = my.length || 1
  const pct = Math.round((c.Present / total) * 100)
  mount.innerHTML = `
  ${banner('clipboard-check', 'Attendance', 'Your attendance record.')}
  <div class="stat-grid stagger">
    ${statCard({ ic: 'check', color: 'emerald', label: 'Present', value: String(c.Present), trend: Math.round((c.Present / total) * 100) + '%' })}
    ${statCard({ ic: 'clock', color: 'amber', label: 'Late', value: String(c.Late), trend: 'Arrived late' })}
    ${statCard({ ic: 'x', color: 'cyan', label: 'Absent', value: String(c.Absent), trend: 'Missed days' })}
    ${statCard({ ic: 'trending-up', color: 'teal', label: 'Attendance Rate', value: pct + '%', trend: 'Overall' })}
  </div>
  <div class="cols-lg-3" style="grid-template-columns:1fr 1.6fr">
    ${card('Attendance Rate', '', donutChart([
      { name: 'Present', value: c.Present, color: 'var(--chart-1)' },
      { name: 'Late', value: c.Late, color: '#f59e0b' },
      { name: 'Absent', value: c.Absent, color: '#ef4444' },
      { name: 'Excused', value: c.Excused, color: '#8b5cf6' },
    ], { center: [pct + '%', 'present'] }), { titleSize: 'text-base' })}
    ${card('My Attendance History', 'Most recent first',
      my.length ? `<div class="table-wrap" style="max-height:400px;overflow-y:auto"><table class="table"><thead><tr><th>Date</th><th>Status</th></tr></thead>
      <tbody>${my.map((r) => `<tr><td>${new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
        <td><span class="badge ${r.status === 'Present' ? 'badge-soft' : r.status === 'Late' ? 'badge-warn' : r.status === 'Absent' ? 'badge-danger' : 'badge-violet'}">${r.status}</span></td></tr>`).join('')}</tbody></table></div>`
      : empty('clipboard-check', 'No attendance records yet.'), { titleSize: 'text-base', flush: true })}
  </div>`
}

// ------------------------------------------------------------
// TIMETABLE
// ------------------------------------------------------------
function timetable(mount) {
  const u = store.user
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const SLOTS = [
    { time: '08:00 – 09:00' }, { time: '09:00 – 10:00' }, { time: '10:00 – 11:00' }, { time: '11:00 – 11:45' },
    { time: '11:45 – 12:30', isBreak: true, label: 'Lunch Break' },
    { time: '12:30 – 13:30' }, { time: '13:30 – 14:30' },
  ]
  const subjects = u.role === 'Student'
    ? ['Mathematics', 'English', 'Biology', 'History', 'Physics', 'Spanish']
    : (u.subjects && u.subjects.length ? u.subjects : ['Mathematics', 'Physics', 'Chemistry'])
  const seedHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return Math.abs(h) }
  const schedule = SLOTS.map((slot, sIdx) => DAYS.map((_, dIdx) => {
    if (slot.isBreak) return null
    const h = seedHash(`${u.id}|${subjects.join(',')}|${dIdx}|${sIdx}`)
    if (h % 10 === 0) return null
    return subjects[h % subjects.length]
  }))
  const unique = Array.from(new Set(schedule.flat().filter(Boolean)))
  mount.innerHTML = `
  ${banner('calendar-clock', 'Weekly Timetable', u.role === 'Student' ? 'Your class schedule' : `Teaching schedule for ${esc(u.name.split(' ')[0])}`,
    `<span class="row gap-2 text-sm" style="background:rgba(255,255,255,.15);border-radius:.5rem;padding:.5rem .75rem;backdrop-filter:blur(8px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)">${icon('calendar-clock', '', 16)} Monday – Friday</span>`)}
  ${card('Subjects this week', `${unique.length} subjects scheduled`,
    unique.length ? `<div class="chip-row">${unique.map((s) => `<span class="subj-chip ${subjColor(s)}"><span class="subj-dot"></span>${esc(s)}</span>`).join('')}</div>` : '<p class="muted text-sm">No subjects scheduled.</p>',
    { titleSize: 'text-base' })}
  <div class="card"><div class="card-c flush"><div class="table-wrap"><table class="tt">
    <thead><tr><th style="text-align:left;text-transform:uppercase;font-size:11px;color:var(--muted-foreground)">Time</th>
      ${DAYS.map((d, i) => `<th><div class="tt-th-dow">${d}</div><div class="tt-th-dow-short" style="font-weight:600">${DAYS_SHORT[i]}</div></th>`).join('')}
    </tr></thead>
    <tbody>
      ${SLOTS.map((slot, sIdx) => `
      <tr>
        <td class="tt-time ${slot.isBreak ? 'break' : ''}">
          <div class="row gap-1">${slot.isBreak ? icon('coffee', '', 12) : ''}<span>${slot.time}</span></div>
          ${slot.isBreak ? `<div class="mt-1" style="font-size:10px;text-transform:uppercase">${slot.label}</div>` : ''}
        </td>
        ${DAYS.map((_, dIdx) => {
          const subj = schedule[sIdx][dIdx]
          if (slot.isBreak) return `<td class="tt-cell break"><div class="stack-2" style="align-items:center">${icon('coffee', '', 14)}<span class="hide-md-down">Lunch</span></div></td>`
          if (!subj) return `<td class="tt-cell free">Free</td>`
          const room = u.role === 'Student' ? (u.className ?? 'Class') : 'Room ' + ((sIdx + dIdx) % 8 + 101)
          return `<td style="padding:2px"><div class="tt-cell ${subjColor(subj)}" style="min-height:56px;display:flex;flex-direction:column;justify-content:center;transition:box-shadow .2s">
            <p class="tt-subj">${esc(subj)}</p><p class="tt-room hide-md-down">${esc(room)}</p></div></td>`
        }).join('')}
      </tr>`).join('')}
    </tbody></table></div></div></div>`
}

// ------------------------------------------------------------
// SUBJECTS (teacher)
// ------------------------------------------------------------
function subjects(mount) {
  const u = store.user
  const list = (u.subjects && u.subjects.length) ? u.subjects : ['Mathematics', 'Physics', 'Chemistry']
  // deterministic hash → 3 classes per subject
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return Math.abs(h) }
  const classesFor = (s) => [0, 1, 2].map((i) => CLASSES[(hash(s) + i * 5) % CLASSES.length])
  const studentCount = (cls) => DB.data.students.filter((s) => s.className === cls).length
  const totalClasses = list.reduce((a, s) => a + classesFor(s).length, 0)
  mount.innerHTML = `
  ${banner('book-open', 'My Subjects', `${list.length} subjects · ${totalClasses} class sections`)}
  <div class="stat-grid stagger" style="grid-template-columns:repeat(3,1fr)">
    ${statCard({ ic: 'book-open', color: 'emerald', label: 'Subjects', value: String(list.length), trend: 'Assigned to you' })}
    ${statCard({ ic: 'layout-dashboard', color: 'teal', label: 'Class Sections', value: String(totalClasses), trend: 'Across all subjects' })}
    ${statCard({ ic: 'users', color: 'amber', label: 'Students Taught', value: String(DB.data.students.length), trend: 'Approximate reach' })}
  </div>
  ${list.length === 0 ? `<div class="card">${empty('book-open', 'No subjects assigned.')}</div>` : `
  <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.5rem">
    ${list.map((s) => `
    <div class="card"><div class="card-c">
      <div class="row gap-3 mb-3">
        <span class="stat-ic ic-emerald" style="border-radius:.75rem">${icon('book-open', '', 20)}</span>
        <div class="flex-1"><p class="font-semibold">${esc(s)}</p>
          <p class="text-xs muted">${classesFor(s).length} classes · ~${classesFor(s).reduce((a, c) => a + studentCount(c), 0)} students</p></div>
        <button class="btn btn-outline btn-sm" data-grades>${icon('chevron-right', '', 14)} Grades</button>
      </div>
      ${classesFor(s).map((c) => `
        <div class="row-card row gap-3 hover-dim" data-goto>
          <span class="class-chip-badge" style="width:2.25rem;height:2.25rem">${c}</span>
          <div class="flex-1"><p class="text-sm font-medium">Class ${c}</p><p class="text-xs muted">${studentCount(c)} students</p></div>
          <span class="badge badge-soft">View grades</span>
        </div>`).join('')}
    </div></div>`).join('')}
  </div>`}`
  mount.querySelectorAll('[data-grades],[data-goto]').forEach((b) => { b.onclick = () => go('grades') })
}

// ------------------------------------------------------------
// EXAMS
// ------------------------------------------------------------
function exams(mount) {
  const u = store.user
  const isStudent = u.role === 'Student'
  if (isStudent) {
    const all = [...DB.data.exams].sort((a, b) => a.date.localeCompare(b.date))
    const upcoming = all.filter((e) => e.date >= todayStr() && e.className === u.className)
    const next = upcoming[0]
    mount.innerHTML = `
    ${banner('graduation-cap', 'Exam Management', 'Your upcoming exams.',
      next ? `<span class="row gap-2 text-sm" style="background:rgba(255,255,255,.15);border-radius:.5rem;padding:.5rem .75rem">${icon('clock', '', 16)} Next exam: ${esc(next.title)}</span>` : '')}
    ${upcoming.length === 0 ? `<div class="card">${empty('graduation-cap', 'No upcoming exams for your class.')}</div>` : `
    <div class="stack-3">
      ${upcoming.map((e) => {
        const days = Math.ceil((new Date(e.date + 'T12:00:00') - new Date()) / 864e5)
        const urgent = days <= 3
        return `<div class="card" style="border-left:4px solid ${urgent ? '#f59e0b' : 'var(--brand)'}"><div class="card-c">
          <div class="row between gap-2 wrap">
            <div><p class="font-semibold">${esc(e.title)}</p>
              <p class="text-xs muted mt-1">${esc(e.subject)} · ${esc(e.className)} · ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p></div>
            <span class="badge ${urgent ? 'badge-warn' : 'badge-soft'}">${days === 0 ? 'Today' : 'In ' + days + ' days'}</span>
          </div>
          <div class="row wrap gap-4 mt-3 text-xs muted">
            <span class="row gap-1">${icon('clock', '', 12)} ${esc(e.startTime)} · ${e.duration} min</span>
            <span class="row gap-1">${icon('map-pin', '', 12)} ${esc(e.room || 'TBA')}</span>
            <span class="row gap-1">${icon('target', '', 12)} ${e.totalMarks} marks · pass ${e.passingMarks}</span>
          </div>
          ${e.notes ? `<p class="text-xs muted mt-2" style="font-style:italic">${esc(e.notes)}</p>` : ''}
        </div></div>`
      }).join('')}
    </div>`}`
    return
  }

  let classF = ''
  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)
  function paint() {
    const all = [...DB.data.exams].sort((a, b) => a.date.localeCompare(b.date))
    const filtered = all.filter((e) => !classF || e.className === classF)
    const upcoming = all.filter((e) => e.date >= todayStr())
    root.innerHTML = `
    ${banner('graduation-cap', 'Exam Management', 'Schedule exams and publish timetables.',
      `<button class="btn btn-white" data-print>${icon('printer', '', 16)} Print Timetable</button>
       <button class="btn btn-brand" data-new>${icon('plus', '', 16)} Schedule Exam</button>`)}
    <div class="stat-grid stagger">
      ${statCard({ ic: 'graduation-cap', color: 'emerald', label: 'Total Exams', value: String(all.length), trend: 'All classes' })}
      ${statCard({ ic: 'clock', color: 'teal', label: 'Upcoming', value: String(upcoming.length), trend: 'Scheduled ahead' })}
      ${statCard({ ic: 'book-open', color: 'amber', label: 'Subjects', value: String(new Set(all.map((e) => e.subject)).size), trend: 'Covered' })}
      ${statCard({ ic: 'layout-dashboard', color: 'cyan', label: 'Classes Affected', value: String(new Set(all.map((e) => e.className)).size), trend: 'Distinct classes' })}
    </div>
    <div class="card"><div class="card-c tight"><div class="row gap-2 wrap" style="padding:0">
      <span class="text-sm muted" style="margin-right:.5rem">Filter by class:</span>
      <div class="chip-row">${['', ...CLASSES].map((c) => `<button class="subj-chip ${classF === c ? 'sc-brand' : 'sc-slate'}" data-cf="${c}">${c || 'All'}</button>`).join('')}</div>
    </div></div></div>
    ${card('Exam Timetable', 'All scheduled exams',
      filtered.length === 0 ? empty('graduation-cap', 'No exams scheduled.') : `
      <div class="table-wrap"><table class="table"><thead><tr>
        <th>Exam</th><th>Subject</th><th>Class</th><th>Date</th><th class="hide-md-down">Time</th><th class="hide-md-down">Room</th><th class="hide-md-down">Marks</th><th style="text-align:right">Actions</th>
      </tr></thead><tbody>
        ${filtered.map((e) => {
          const days = Math.ceil((new Date(e.date + 'T12:00:00') - new Date()) / 864e5)
          return `<tr>
          <td><p class="font-medium">${esc(e.title)}</p>${e.notes ? `<p class="cell-sub clamp-2" style="max-width:200px">${esc(e.notes)}</p>` : ''}</td>
          <td><span class="badge badge-outline">${esc(e.subject)}</span></td>
          <td><span class="badge ${e.date >= todayStr() ? 'badge-teal' : 'badge-muted'}">${esc(e.className)}</span></td>
          <td><p class="text-sm">${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            <p class="cell-sub">${days < 0 ? 'Past' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : 'in ' + days + ' days'}</p></td>
          <td class="hide-md-down"><p class="text-sm">${esc(e.startTime)}</p><p class="cell-sub">${e.duration} min</p></td>
          <td class="hide-md-down"><p class="text-sm">${esc(e.room || '—')}</p></td>
          <td class="hide-md-down"><p class="text-sm">${e.totalMarks}</p><p class="cell-sub">pass ${e.passingMarks}</p></td>
          <td><div class="row gap-1" style="justify-content:flex-end">
            <button class="btn btn-ghost btn-icon" data-edit="${e.id}">${icon('pencil', '', 16)}</button>
            <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-del="${e.id}">${icon('trash-2', '', 16)}</button>
          </div></td></tr>`
        }).join('')}
      </tbody></table></div>`, { titleSize: 'text-base', flush: true })}`
    root.querySelectorAll('[data-cf]').forEach((b) => { b.onclick = () => { classF = b.dataset.cf; paint() } })
    root.querySelector('[data-new]').onclick = () => examDialog(null, paint)
    root.querySelector('[data-print]').onclick = () => {
      printHtml('Exam Timetable', `<h1>Exam Timetable</h1><p class="sub">${esc(DB.data.settings.name || 'School Name')}</p><div class="rule"></div>
        <table><tr><th>Date</th><th>Time</th><th>Exam</th><th>Class</th><th>Room</th></tr>
        ${filtered.map((e) => `<tr><td>${e.date}</td><td>${e.startTime}</td><td>${esc(e.title)}</td><td>${e.className}</td><td>${esc(e.room || '—')}</td></tr>`).join('')}</table>`)
    }
    root.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => examDialog(DB.data.exams.find((x) => x.id === b.dataset.edit), paint) })
    root.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => {
      const e = DB.data.exams.find((x) => x.id === b.dataset.del)
      confirmDialog('Delete exam?', `Remove "${e.title}" from the timetable?`, 'Delete', () => {
        DB.data.exams = DB.data.exams.filter((x) => x.id !== e.id); DB.save(); toast('success', 'Exam deleted'); paint()
      })
    } })
  }
  paint()
}

function examDialog(e, onDone) {
  const f = e || { title: '', subject: 'Mathematics', className: '10A', date: dateOffset(7), startTime: '09:00', duration: 90, room: '', totalMarks: 100, passingMarks: 40, notes: '' }
  const wrap = openDialog(`${dialogHead(e ? 'Edit Exam' : 'Schedule Exam')}
    <div class="form-grid">
      ${field('Exam Title *', `<input class="input" id="ex-title" value="${esc(f.title)}">`)}
      ${field('Subject', sel('ex-subject', SUBJECTS_ALL, f.subject))}
      ${field('Class', sel('ex-class', CLASSES, f.className))}
      ${field('Date *', `<input class="input" id="ex-date" type="date" value="${f.date}">`)}
      ${field('Start Time', `<input class="input" id="ex-time" type="time" value="${f.startTime}">`)}
      ${field('Duration (minutes)', `<input class="input" id="ex-dur" type="number" value="${f.duration}" min="15">`)}
      ${field('Room', `<input class="input" id="ex-room" value="${esc(f.room || '')}">`)}
      ${field('Total Marks', `<input class="input" id="ex-total" type="number" value="${f.totalMarks}">`)}
      ${field('Passing Marks', `<input class="input" id="ex-pass" type="number" value="${f.passingMarks}">`)}
      ${field('Notes', `<input class="input" id="ex-notes" value="${esc(f.notes || '')}" placeholder="Instructions for students">`)}
    </div>
    ${dialogFoot('Cancel', `<button class="btn btn-brand" id="ex-save">${icon('plus', '', 14)} Save Exam</button>`)}`, { wide: true })
  wrap.querySelector('#ex-save').onclick = () => {
    const v = (id) => wrap.querySelector('#' + id).value
    if (!v('ex-title').trim() || !v('ex-date')) { toast('error', 'Title and date are required'); return }
    const data = { title: v('ex-title').trim(), subject: v('ex-subject'), className: v('ex-class'), date: v('ex-date'), startTime: v('ex-time'), duration: Number(v('ex-dur')) || 90, room: v('ex-room'), totalMarks: Number(v('ex-total')) || 100, passingMarks: Number(v('ex-pass')) || 40, notes: v('ex-notes') }
    if (e) Object.assign(e, data)
    else DB.data.exams.push({ id: uid('exm'), ...data, createdByName: store.user.name })
    DB.save(); closeDialog(); toast('success', e ? 'Exam updated' : 'Exam scheduled'); onDone()
  }
}

// ------------------------------------------------------------
// ASSIGNMENTS
// ------------------------------------------------------------
function assignments(mount) {
  const u = store.user
  const isStudent = u.role === 'Student'
  const all = DB.data.assignments
  if (isStudent) {
    const mine = all.filter((a) => a.className === u.className)
    const sub = (a) => DB.data.submissions.find((s) => s.assignmentId === a.id && s.studentId === u.id)
    const groups = [
      { label: 'Due Soon', color: '#f59e0b', items: mine.filter((a) => { const d = Math.ceil((new Date(a.dueDate) - Date.now()) / 864e5); return d >= 0 && d <= 3 && !sub(a) }) },
      { label: 'Upcoming', color: 'var(--brand)', items: mine.filter((a) => Math.ceil((new Date(a.dueDate) - Date.now()) / 864e5) > 3 && !sub(a)) },
      { label: 'Past Due', color: '#ef4444', items: mine.filter((a) => new Date(a.dueDate) < new Date() && !sub(a)) },
      { label: 'Submitted / Graded', color: 'var(--muted-foreground)', items: mine.filter((a) => sub(a)) },
    ]
    mount.innerHTML = `
    ${banner('clipboard-check', 'Assignments', 'Your class work and submissions.')}
    <div class="stat-grid stagger">
      ${statCard({ ic: 'clock', color: 'amber', label: 'Due Soon', value: String(groups[0].items.length), trend: 'Next 3 days' })}
      ${statCard({ ic: 'calendar', color: 'emerald', label: 'Upcoming', value: String(groups[1].items.length), trend: 'Later' })}
      ${statCard({ ic: 'alert-circle', color: 'cyan', label: 'Past Due', value: String(groups[2].items.length), trend: 'Needs attention' })}
      ${statCard({ ic: 'check', color: 'teal', label: 'Submitted', value: String(groups[3].items.length), trend: 'Turned in' })}
    </div>
    ${groups.map((g) => g.items.length === 0 ? '' : `
    <div class="stack-3">
      <div class="row gap-2"><span class="legend-swatch" style="background:${g.color};width:10px;height:10px"></span>
        <h3 class="font-semibold">${g.label}</h3><span class="badge badge-muted">${g.items.length}</span></div>
      ${g.items.map((a) => {
        const s = sub(a)
        return `<div class="card" style="border-left:4px solid ${g.color}"><div class="card-c">
          <div class="row between gap-2 wrap">
            <div><p class="font-semibold">${esc(a.title)}</p><p class="text-xs muted mt-1">By ${esc(a.teacherName)}</p></div>
            <div class="row gap-2">${a.subject ? `<span class="badge badge-outline">${esc(a.subject)}</span>` : ''}<span class="badge badge-muted">${esc(a.className)}</span></div>
          </div>
          <p class="text-sm mt-2">${esc(a.description)}</p>
          <div class="row between gap-2 mt-3 wrap">
            <span class="text-xs muted row gap-1">${icon('calendar', '', 12)} Due ${new Date(a.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            ${s ? `<span class="badge ${s.grade != null ? 'badge-soft' : 'badge-teal'}">${s.grade != null ? `Graded · ${s.grade}/100` : 'Submitted'}</span>`
              : `<button class="btn btn-brand btn-sm" data-submit="${a.id}">${icon('upload', '', 14)} Submit</button>`}
          </div>
        </div></div>`
      }).join('')}
    </div>`).join('')}`
    mount.querySelectorAll('[data-submit]').forEach((b) => {
      b.onclick = () => {
        const a = all.find((x) => x.id === b.dataset.submit)
        const wrap = openDialog(`${dialogHead('Submit — ' + esc(a.title), esc(a.subject) + ' · Due ' + a.dueDate)}
          <div class="dropzone" style="margin-top:1rem">${icon('info', '', 16)}<p class="text-xs muted">Attach your work as text. Files are not stored in this demo.</p></div>
          <div class="field mt-3"><label class="label-sm">Your Submission</label><textarea class="input" id="sub-text" rows="5" placeholder="Type or paste your answer here..."></textarea></div>
          ${dialogFoot('Cancel', `<button class="btn btn-brand" id="sub-save">${icon('send', '', 14)} Turn In</button>`)}`, { wide: true })
        wrap.querySelector('#sub-save').onclick = () => {
          const text = wrap.querySelector('#sub-text').value.trim()
          if (!text) { toast('error', 'Submission is empty'); return }
          DB.data.submissions.push({ id: uid('sub'), assignmentId: a.id, studentId: u.id, studentName: u.name, text, submittedAt: nowIso(), grade: null })
          DB.save(); closeDialog(); toast('success', 'Assignment submitted', a.title); assignments(mount)
        }
      }
    })
    return
  }

  // teacher view
  mount.innerHTML = `
  ${banner('clipboard-check', 'Assignments', 'Create and track class assignments.',
    `<button class="btn btn-white" data-new>${icon('plus', '', 16)} Create Assignment</button>`)}
  <div class="stat-grid stagger">
    ${statCard({ ic: 'clipboard-check', color: 'emerald', label: 'Total Assignments', value: String(all.length), trend: 'All classes' })}
    ${statCard({ ic: 'clock', color: 'amber', label: 'Due This Week', value: String(all.filter((a) => Math.ceil((new Date(a.dueDate) - Date.now()) / 864e5) <= 7 && new Date(a.dueDate) >= new Date()).length), trend: 'Upcoming deadlines' })}
    ${statCard({ ic: 'upload', color: 'teal', label: 'Submissions', value: String(DB.data.submissions.length), trend: 'Received' })}
  </div>
  <div id="tch-list" class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem"></div>`
  const list = mount.querySelector('#tch-list')
  function paintList() {
    list.innerHTML = all.length === 0 ? '' : all.map((a) => {
      const subs = DB.data.submissions.filter((s) => s.assignmentId === a.id)
      const overdue = new Date(a.dueDate) < new Date()
      return `<div class="card"><div class="card-c stack-3">
        <div class="row between gap-2"><p class="font-semibold">${esc(a.title)}</p><span class="text-xs muted">${timeAgo(a.createdAt)}</span></div>
        <div class="row gap-2 wrap"><span class="badge badge-outline">${esc(a.subject)}</span><span class="badge badge-muted">${esc(a.className)}</span>
          <span class="badge ${overdue ? 'badge-danger' : 'badge-teal'}">Due ${a.dueDate}</span></div>
        <p class="text-sm muted clamp-2">${esc(a.description)}</p>
        <div class="row between">
          <span class="text-xs muted">${subs.length} submission(s)</span>
          <button class="btn btn-ghost btn-sm" data-expand="${a.id}">View details ${icon('chevron-down', '', 12)}</button>
        </div>
        <div class="acc-a" data-panel="${a.id}"><div class="acc-a-inner" style="padding:0">
          ${subs.length ? subs.map((s) => `<div class="row-card row gap-2"><span class="avatar av-6 staff">${initials(s.studentName)}</span>
            <span class="flex-1 text-sm">${esc(s.studentName)}</span>
            <span class="badge badge-teal">Submitted</span></div>`).join('') : '<p class="text-xs muted" style="padding:.5rem 0">No submissions yet.</p>'}
        </div></div>
      </div></div>`
    }).join('')
    list.querySelectorAll('[data-expand]').forEach((b) => {
      b.onclick = () => {
        const panel = list.querySelector(`[data-panel="${b.dataset.expand}"]`)
        panel.style.maxHeight = panel.style.maxHeight ? '' : '400px'
      }
    })
  }
  paintList()
  mount.querySelector('[data-new]').onclick = () => {
    const wrap = openDialog(`${dialogHead('Create Assignment')}
      <div class="form-grid">
        ${field('Title *', `<input class="input" id="as-title">`)}
        ${field('Subject', sel('as-subject', SUBJECTS_ALL, 'Mathematics'))}
        ${field('Class', sel('as-class', CLASSES, '10A'))}
        ${field('Due Date *', `<input class="input" id="as-due" type="date" value="${dateOffset(7)}">`)}
        ${field('Description', `<textarea class="input" id="as-desc" rows="4" placeholder="Instructions for students..."></textarea>`)}
      </div>
      ${dialogFoot('Cancel', `<button class="btn btn-brand" id="as-save">${icon('send', '', 14)} Create</button>`)}`, { wide: true })
    wrap.querySelector('#as-save').onclick = () => {
      const v = (id) => wrap.querySelector('#' + id).value
      if (!v('as-title').trim()) { toast('error', 'Title is required'); return }
      DB.data.assignments.push({ id: uid('asg'), teacherId: store.user.id, teacherName: store.user.name, title: v('as-title').trim(), description: v('as-desc'), subject: v('as-subject'), className: v('as-class'), dueDate: v('as-due'), createdAt: nowIso() })
      DB.save(); closeDialog(); toast('success', 'Assignment created'); assignments(mount)
    }
  }
}

// ------------------------------------------------------------
// REPORTS
// ------------------------------------------------------------
function reports(mount) {
  const u = store.user
  if (u.role === 'Student') return reportsStudent(mount)
  let tab = 'card', studentId = DB.data.students[0]?.id || '', classF = '10A'
  const root = document.createElement('div')
  root.className = 'stack-6'
  mount.appendChild(root)

  function reportCardHtml(s) {
    const g = DB.data.grades.filter((x) => x.studentId === s.id)
    const avg = g.length ? Math.round(g.reduce((a, x) => a + x.score, 0) / g.length) : 0
    return `<h1>Report Card</h1><p class="sub">${esc(DB.data.settings.name || 'School Name')} · Term 1</p><div class="rule"></div>
      <div class="grid"><div><b>Student</b><br>${esc(s.name)}</div><div><b>Admission No.</b><br>${esc(s.admissionNo)}</div>
      <div><b>Class</b><br>${gradeToForm(s.grade)} · ${esc(s.className)}</div><div><b>Average</b><br>${avg}% (${scoreToLetter(avg)})</div></div>
      <table><tr><th>Subject</th><th>Score</th><th>Letter</th><th>Remark</th></tr>
      ${g.map((x) => `<tr><td>${esc(x.subject)}</td><td>${x.score}%</td><td>${scoreToLetter(x.score)}</td><td>${x.score >= 80 ? 'Excellent' : x.score >= 60 ? 'Good' : 'Needs improvement'}</td></tr>`).join('')}</table>
      <div class="remark"><b>Class Teacher's Remarks:</b> ${avg >= 80 ? 'An outstanding term. Keep up the excellent work.' : avg >= 60 ? 'A good term overall with room to grow.' : 'Greater effort is needed next term.'}</div>
      <div class="sign"><span>Class Teacher</span><span>Principal</span></div>`
  }
  function attendanceReportHtml(s) {
    const recs = DB.data.attendance.filter((a) => a.studentId === s.id)
    const c = { Present: 0, Late: 0, Absent: 0 }
    recs.forEach((r) => c[r.status] = (c[r.status] || 0) + 1)
    return `<h1>Attendance Report</h1><p class="sub">${esc(s.name)} · ${esc(s.admissionNo)}</p><div class="rule"></div>
      <table><tr><th>Date</th><th>Status</th></tr>
      ${recs.map((r) => `<tr><td>${r.date}</td><td>${r.status}</td></tr>`).join('')}</table>
      <div class="remark">Present: ${c.Present} · Late: ${c.Late} · Absent: ${c.Absent}</div>
      <div class="sign"><span>Class Teacher</span><span>Principal</span></div>`
  }
  function feeStatementHtml(s) {
    const fees = DB.data.fees.filter((f) => f.studentId === s.id)
    return `<h1>Fee Statement</h1><p class="sub">${esc(s.name)} · ${esc(s.admissionNo)}</p><div class="rule"></div>
      <table><tr><th>Term</th><th>Amount</th><th>Due Date</th><th>Status</th></tr>
      ${fees.map((f) => `<tr><td>${esc(f.term)}</td><td>$${f.amount.toLocaleString()}</td><td>${f.dueDate}</td><td>${f.status}</td></tr>`).join('')}</table>
      <div class="sign"><span>Bursar</span><span>Principal</span></div>`
  }
  function classSummaryHtml(cls) {
    const list = DB.data.students.filter((s) => s.className === cls)
    const rows = list.map((s) => {
      const g = DB.data.grades.filter((x) => x.studentId === s.id)
      const avg = g.length ? Math.round(g.reduce((a, x) => a + x.score, 0) / g.length) : 0
      return `<tr><td>${esc(s.name)}</td><td>${esc(s.admissionNo)}</td><td>${g.length}</td><td>${avg}%</td><td>${scoreToLetter(avg)}</td></tr>`
    }).join('')
    return `<h1>Class Summary — ${cls}</h1><p class="sub">${esc(DB.data.settings.name || 'School Name')} · Term 1</p><div class="rule"></div>
      <table><tr><th>Student</th><th>Admission No.</th><th>Subjects</th><th>Average</th><th>Grade</th></tr>${rows}</table>
      <div class="sign"><span>Class Teacher</span><span>Principal</span></div>`
  }

  function previewHtml() {
    if (tab === 'card') {
      const s = DB.data.students.find((x) => x.id === studentId)
      if (!s) return empty('users', 'No students available.')
      const g = DB.data.grades.filter((x) => x.studentId === s.id)
      const avg = g.length ? Math.round(g.reduce((a, x) => a + x.score, 0) / g.length) : 0
      return `<div class="stack-3">
        <div class="row gap-3">${avatarHtml(s.name, 'Student', 'av-10')}
          <div><p class="font-semibold">${esc(s.name)}</p><p class="text-xs muted">${esc(s.admissionNo)} · ${gradeToForm(s.grade)} · ${esc(s.className)}</p></div></div>
        <div class="row-card row gap-3">${g.map((x) => `<span class="badge ${letterClass(scoreToLetter(x.score))}">${esc(x.subject.slice(0, 3))} ${x.score}%</span>`).join('') || '<span class="text-xs muted">No grades yet</span>'}</div>
        <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
          ${statCard({ ic: 'trending-up', color: 'emerald', label: 'Average', value: avg + '%', trend: scoreToLetter(avg) })}
          ${statCard({ ic: 'book-open', color: 'teal', label: 'Subjects', value: String(g.length), trend: 'Graded' })}
          ${statCard({ ic: 'award', color: 'amber', label: 'Grade', value: scoreToLetter(avg), trend: 'Overall' })}
        </div></div>`
    }
    if (tab === 'class') {
      const list = DB.data.students.filter((s) => s.className === classF)
      const rows = list.slice(0, 8).map((s) => {
        const g = DB.data.grades.filter((x) => x.studentId === s.id)
        const avg = g.length ? Math.round(g.reduce((a, x) => a + x.score, 0) / g.length) : 0
        return `<tr><td>${esc(s.name)}</td><td>${esc(s.admissionNo)}</td><td>${avg}%</td><td>${scoreToLetter(avg)}</td></tr>`
      }).join('')
      return `<div class="table-wrap"><table class="table"><thead><tr><th>Student</th><th>Admission No.</th><th>Average</th><th>Grade</th></tr></thead><tbody>${rows}</tbody></table></div>
        ${list.length > 8 ? `<p class="text-xs muted mt-2">+ ${list.length - 8} more in preview — print for the full list.</p>` : ''}`
    }
    return `<p class="muted text-sm">Configure the report on the left, then use "Generate & Print" below. The printable document opens in a new window.</p>`
  }

  function paint() {
    root.innerHTML = `
    ${banner('file-text', 'Report Generation Center', 'Generate report cards, attendance records and fee statements.')}
    <div class="stat-grid stagger">
      ${statCard({ ic: 'users', color: 'emerald', label: 'Students', value: String(DB.data.students.length), trend: 'On roll' })}
      ${statCard({ ic: 'file-text', color: 'teal', label: 'Grades Recorded', value: String(DB.data.grades.length), trend: 'Term 1' })}
      ${statCard({ ic: 'clipboard-check', color: 'amber', label: 'Attendance Records', value: String(DB.data.attendance.length), trend: 'Today' })}
      ${statCard({ ic: 'dollar-sign', color: 'cyan', label: 'Fee Records', value: String(DB.data.fees.length), trend: 'Term 1' })}
    </div>
    <div class="utabs">
      ${[['card', 'Report Card'], ['attendance', 'Attendance'], ['fees', 'Fee Statement'], ['class', 'Class Summary']].map((t) => `<button class="utab ${tab === t[0] ? 'active' : ''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}
    </div>
    <div class="cols-lg-3" style="grid-template-columns:1fr 1.4fr">
      <div class="stack-4">
        ${tab !== 'class' ? card('Select Student', 'Pick the student for this report',
          `<div class="input-wrap mb-2">${icon('search', 'input-ic', 16)}<input class="input has-ic" id="rep-q" placeholder="Search students..."></div>
           <div style="max-height:260px;overflow-y:auto" class="stack-2">
            ${DB.data.students.map((s) => `<button class="search-item" data-sid="${s.id}">
              ${avatarHtml(s.name, 'Student', 'av-8')}
              <div><p class="font-medium text-sm">${esc(s.name)}</p><p class="cell-sub">${esc(s.className ?? '')} · ${esc(s.admissionNo)}</p></div>
              ${s.id === studentId ? icon('check', 'brand-text', 16) : ''}
            </button>`).join('')}
           </div>`, { titleSize: 'text-base', flush: true })
        : card('Select Class', '', sel('rep-class', CLASSES, classF, 'style="width:100%"'), { titleSize: 'text-base' })}
      </div>
      ${card('Preview', 'What the printed report will contain', previewHtml(), { titleSize: 'text-base' })}
    </div>
    ${card('Generate & Print', '', `
      <div class="row between wrap gap-2">
        <p class="text-sm muted">${tab === 'class' ? `Full class summary for ${classF} (${DB.data.students.filter((s) => s.className === classF).length} students).` : 'Branded, print-ready document.'}</p>
        <button class="btn btn-brand" data-print>${icon('printer', '', 16)} Generate & Print</button>
      </div>`, { titleSize: 'text-base' })}`

    root.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; paint() } })
    root.querySelectorAll('[data-sid]').forEach((b) => { b.onclick = () => { studentId = b.dataset.sid; paint() } })
    root.querySelector('#rep-q').oninput = (e) => {
      const q = e.target.value.toLowerCase()
      root.querySelectorAll('[data-sid]').forEach((b) => {
        const s = DB.data.students.find((x) => x.id === b.dataset.sid)
        b.style.display = s.name.toLowerCase().includes(q) ? '' : 'none'
      })
    }
    root.querySelector('#rep-class')?.addEventListener('change', (e) => { classF = e.target.value; paint() })
    root.querySelector('[data-print]').onclick = () => {
      const s = DB.data.students.find((x) => x.id === studentId)
      if (tab === 'card') printHtml('Report Card — ' + s.name, reportCardHtml(s))
      else if (tab === 'attendance') printHtml('Attendance Report — ' + s.name, attendanceReportHtml(s))
      else if (tab === 'fees') printHtml('Fee Statement — ' + s.name, feeStatementHtml(s))
      else printHtml('Class Summary — ' + classF, classSummaryHtml(classF))
      toast('success', 'Report generated', 'Print dialog opened in a new window.')
    }
  }
  paint()
}

function reportsStudent(mount) {
  const u = store.user
  const g = DB.data.grades.filter((x) => x.studentId === u.id)
  const avg = g.length ? Math.round(g.reduce((a, x) => a + x.score, 0) / g.length) : 0
  const att = DB.data.attendance.filter((a) => a.studentId === u.id)
  const attPct = att.length ? Math.round(att.filter((a) => a.status === 'Present').length / att.length * 100) : 0
  const fees = DB.data.fees.filter((f) => f.studentId === u.id)
  mount.innerHTML = `
  ${banner('file-text', 'My Academic Reports', 'Your records, ready to view or print.')}
  <div class="stat-grid stagger">
    ${statCard({ ic: 'trending-up', color: 'emerald', label: 'Average Score', value: avg + '%', trend: scoreToLetter(avg) + ' overall' })}
    ${statCard({ ic: 'clipboard-check', color: 'teal', label: 'Attendance Rate', value: attPct + '%', trend: att.length + ' days recorded' })}
    ${statCard({ ic: 'dollar-sign', color: 'amber', label: 'Fee Status', value: fees.every((f) => f.status === 'Paid') ? 'Clear' : 'Pending', trend: fees.length + ' record(s)' })}
  </div>
  ${card('Academic Overview', 'Subject scores for Term 1',
    g.length ? g.map((x) => `
      <div class="row-card row gap-3">
        <span class="stat-ic" style="width:2.5rem;height:2.5rem;font-weight:700;border-radius:.5rem">${x.score}</span>
        <div class="flex-1"><p class="text-sm font-medium">${esc(x.subject)}</p><p class="text-xs muted">${esc(x.term)}</p></div>
        <span class="badge ${letterClass(scoreToLetter(x.score))}">${scoreToLetter(x.score)}</span>
      </div>`).join('') : empty('file-text', 'No grades yet.'),
    { titleSize: 'text-base' })}
  ${card('Download Center', 'Print-ready documents for your records', `
    <div class="stack-2">
      <button class="btn btn-outline" data-dl="card" style="justify-content:flex-start">${icon('file-text', '', 16)} Report Card (Term 1)</button>
      <button class="btn btn-outline" data-dl="att" style="justify-content:flex-start">${icon('clipboard-check', '', 16)} Attendance Report</button>
      <button class="btn btn-outline" data-dl="fee" style="justify-content:flex-start">${icon('dollar-sign', '', 16)} Fee Statement</button>
    </div>`, { titleSize: 'text-base' })}
  ${card('Account Summary', '', `
    <div class="info-row"><span class="info-k">Student</span><span class="info-v">${esc(u.name)}</span></div>
    <div class="info-row"><span class="info-k">Admission No.</span><span class="info-v">${esc(u.admissionNo || '—')}</span></div>
    <div class="info-row"><span class="info-k">Class</span><span class="info-v">${gradeToForm(u.grade)} · ${esc(u.className ?? '')}</span></div>`, { titleSize: 'text-base' })}`

  mount.querySelectorAll('[data-dl]').forEach((b) => {
    b.onclick = () => {
      const kind = b.dataset.dl
      if (kind === 'card') printHtml('Report Card — ' + u.name, `<h1>Report Card</h1><p class="sub">${esc(DB.data.settings.name)} · Term 1</p><div class="rule"></div>
        <div class="grid"><div><b>Student</b><br>${esc(u.name)}</div><div><b>Admission No.</b><br>${esc(u.admissionNo)}</div></div>
        <table><tr><th>Subject</th><th>Score</th><th>Letter</th></tr>${g.map((x) => `<tr><td>${esc(x.subject)}</td><td>${x.score}%</td><td>${scoreToLetter(x.score)}</td></tr>`).join('')}</table>
        <div class="sign"><span>Class Teacher</span><span>Principal</span></div>`)
      else if (kind === 'att') printHtml('Attendance Report', `<h1>Attendance Report</h1><p class="sub">${esc(u.name)}</p><div class="rule"></div>
        <table><tr><th>Date</th><th>Status</th></tr>${att.map((r) => `<tr><td>${r.date}</td><td>${r.status}</td></tr>`).join('')}</table>`)
      else printHtml('Fee Statement', `<h1>Fee Statement</h1><p class="sub">${esc(u.name)}</p><div class="rule"></div>
        <table><tr><th>Term</th><th>Amount</th><th>Status</th></tr>${fees.map((f) => `<tr><td>${esc(f.term)}</td><td>$${f.amount.toLocaleString()}</td><td>${f.status}</td></tr>`).join('')}</table>
        <div class="sign"><span>Bursar</span></div>`)
    }
  })
}

// ------------------------------------------------------------
// ANALYTICS
// ------------------------------------------------------------
function analytics(mount) {
  const d = DB.data
  const students = d.students
  const avgScore = (() => { const s = d.grades; return s.length ? Math.round(s.reduce((a, g) => a + g.score, 0) / s.length) : 0 })()
  const att = d.attendance
  const attRate = att.length ? Math.round(att.filter((a) => a.status === 'Present').length / att.length * 100) : 0
  const byForm = [7, 8, 9, 10, 11, 12].map((g) => ({ label: 'Form ' + (g - 6), value: students.filter((s) => s.grade === g).length }))
  const gradeBuckets = [80, 60, 40, 0]
  const gradeColors = ['var(--chart-1)', 'oklch(0.7 0.18 85)', 'oklch(0.65 0.2 30)', '#ef4444']
  const dist = bySubjectData().map((s) => ({ ...s, color: s.avg >= 80 ? gradeColors[0] : s.avg >= 60 ? gradeColors[1] : s.avg >= 40 ? gradeColors[2] : gradeColors[3] }))
  const collected = d.fees.filter((f) => f.status === 'Paid').reduce((a, f) => a + f.amount, 0)
  const pending = d.fees.filter((f) => f.status === 'Pending').reduce((a, f) => a + f.amount, 0)
  const males = students.filter((s) => s.gender === 'Male').length
  const females = students.filter((s) => s.gender === 'Female').length

  function bySubjectData() {
    const m = new Map()
    for (const g of d.grades) { if (!m.has(g.subject)) m.set(g.subject, []); m.get(g.subject).push(g.score) }
    return Array.from(m.entries()).map(([s, arr]) => ({ label: s.length > 12 ? s.slice(0, 11) + '…' : s, avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) }))
  }
  const trendTerms = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb']
  const trend = trendTerms.map((t, i) => ({ label: t, value: Math.min(98, avgScore - 6 + i * 2 + ((i * 13) % 5)) }))

  const insights = [
    { ic: 'lightbulb', tone: 'badge-soft', text: `Attendance is ${attRate}% — ${attRate >= 90 ? 'excellent consistency across the school.' : 'below the 90% target; follow up with form teachers.'}` },
    { ic: 'trending-up', tone: 'badge-info', text: `Average grade score is ${avgScore}%. ${avgScore >= 70 ? 'Strong overall performance this term.' : 'Consider targeted tutoring in weaker subjects.'}` },
    { ic: 'dollar-sign', tone: 'badge-warn', text: `Fee collection is at ${Math.round((collected / (collected + pending || 1)) * 100)}% — $${pending.toLocaleString()} still outstanding.` },
    { ic: 'users', tone: 'badge-teal', text: `Largest form is ${byForm.reduce((a, b) => (b.value > a.value ? b : a)).label} with ${byForm.reduce((a, b) => (b.value > a.value ? b : a)).value} students.` },
  ]

  mount.innerHTML = `
  ${banner('bar-chart-3', 'School Analytics', 'Live snapshot', `<span class="row gap-2 text-xs" style="background:rgba(255,255,255,.15);border-radius:9999px;padding:.375rem .75rem"><span class="pulse-dot" style="display:inline-block;height:6px;width:6px;border-radius:9999px;background:#4ade80"></span> Live data</span>`)}
  <div class="stat-grid stagger">
    ${statCard({ ic: 'users', color: 'emerald', label: 'Total Students', value: String(students.length), trend: '+12 this term', view: 'students' })}
    ${statCard({ ic: 'badge-check', color: 'teal', label: 'Total Staff', value: String(d.staff.length), trend: 'All departments', view: 'staff' })}
    ${statCard({ ic: 'trending-up', color: 'amber', label: 'Avg Grade Score', value: avgScore + '%', trend: 'All subjects', view: 'grades' })}
    ${statCard({ ic: 'clipboard-check', color: 'cyan', label: 'Attendance Rate', value: attRate + '%', trend: 'Today', view: 'attendance' })}
  </div>
  <div class="grid gap-6" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1.5rem">
    ${card('Enrollment by Form', 'Students per year group', barChart(byForm, { max: Math.max(...byForm.map((b) => b.value)) + 2 }), { titleSize: 'text-base' })}
    ${card('Grade Distribution by Subject', 'Average score per subject', barChart(dist.map((x) => ({ label: x.label, value: x.avg, color: x.color })), { max: 100 }), { titleSize: 'text-base' })}
    ${card('Attendance Breakdown', 'Today', donutChart([
      { name: 'Present', value: att.filter((a) => a.status === 'Present').length, color: 'var(--chart-1)' },
      { name: 'Late', value: att.filter((a) => a.status === 'Late').length, color: '#f59e0b' },
      { name: 'Absent', value: att.filter((a) => a.status === 'Absent').length, color: '#ef4444' },
    ]), { titleSize: 'text-base' })}
    ${card('Performance Trend', 'Average score by month', lineChart(trend, { max: 100 }), { titleSize: 'text-base' })}
    ${card('Gender Distribution', '', donutChart([
      { name: 'Male', value: males, color: '#0d9488' },
      { name: 'Female', value: females, color: '#67e8f9' },
    ]), { titleSize: 'text-base' })}
    ${card('Fee Collection Status', '', barChart([
      { label: 'Collected', value: collected, color: 'var(--chart-1)' },
      { label: 'Pending', value: pending, color: '#f59e0b' },
    ], { max: collected + pending }), { titleSize: 'text-base' })}
  </div>
  ${card(`<span class="row gap-2" style="display:inline-flex;color:#f59e0b">${icon('lightbulb', '', 16)} Auto-Generated Insights</span>`, 'Generated from your live school data',
    `<div class="stack-3">${insights.map((i) => `
      <div class="row-card row gap-3"><span class="badge ${i.tone}">${icon(i.ic, '', 12)}</span><p class="text-sm flex-1">${esc(i.text)}</p></div>`).join('')}</div>`,
    { titleSize: 'text-base' })}`
  mount.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go) })
}

// ------------------------------------------------------------
// PERFORMANCE
// ------------------------------------------------------------
function performance(mount) {
  const u = store.user
  const isTeacher = u.role === 'Teacher'
  const reviews = DB.data.reviews
  const STAR = (n) => Array.from({ length: 5 }, (_, i) => `<span style="color:${i < n ? '#f59e0b' : 'var(--border)'}">${icon('star', '', 14)}</span>`).join('')

  if (isTeacher) {
    const mine = reviews.filter((r) => r.subjectId === u.id)
    const avg = mine.length ? (mine.reduce((a, r) => a + r.rating, 0) / mine.length).toFixed(1) : '—'
    mount.innerHTML = `
    ${banner('star', 'Staff Performance', 'Your reviews and professional growth.')}
    <div class="cols-lg-3" style="grid-template-columns:1fr 1.4fr">
      ${card('My Performance', '', `
        <div class="row gap-3"><p class="text-4xl font-bold">${avg}</p>
          <div><div class="row">${STAR(mine.length ? Math.round(mine.reduce((a, r) => a + r.rating, 0) / mine.length) : 0)}</div>
          <p class="text-xs muted">${mine.length} review(s)</p></div></div>
        ${mine[0] ? `<div class="stack-3 mt-4">
          ${[['Teaching', mine[0].teaching], ['Punctuality', mine[0].punctuality], ['Professionalism', mine[0].professionalism], ['Student Engagement', mine[0].studentEngagement]].map(([k, v]) => `
            <div><div class="row between text-xs mb-1"><span>${k}</span><span class="muted">${v}/5</span></div>
            <div class="progress"><div style="width:${v * 20}%"></div></div></div>`).join('')}
        </div>` : '<p class="muted text-sm mt-3">No reviews yet.</p>'}`, { titleSize: 'text-base' })}
      ${card('My Reviews', '', mine.length ? mine.map((r) => `
        <div class="row-card"><div class="row between gap-2">
          <p class="text-sm font-semibold">${esc(r.period)}</p><div class="row gap-1">${STAR(r.rating)}</div></div>
          <p class="text-xs muted mt-1">Reviewed by ${esc(r.reviewerName)} · ${timeAgo(r.createdAt)}</p>
          ${r.comments ? `<p class="text-sm mt-2" style="font-style:italic">"${esc(r.comments)}"</p>` : ''}
          ${r.goals ? `<p class="text-xs mt-1"><b>Goals:</b> ${esc(r.goals)}</p>` : ''}
        </div>`).join('') : empty('star', 'No reviews yet.'), { titleSize: 'text-base', flush: true })}
    </div>`
    return
  }

  const allR = reviews
  const avgCat = (k) => allR.length ? (allR.reduce((a, r) => a + r[k], 0) / allR.length).toFixed(1) : 0
  const top = allR.length ? allR.reduce((a, r) => (r.rating > a.rating ? r : a)) : null
  mount.innerHTML = `
  ${banner('star', 'Staff Performance', 'Review and evaluate staff performance.',
    `<button class="btn btn-white" data-new>${icon('plus', '', 16)} Add Review</button>`)}
  <div class="stat-grid stagger">
    ${statCard({ ic: 'file-text', color: 'emerald', label: 'Total Reviews', value: String(allR.length), trend: 'All time' })}
    ${statCard({ ic: 'star', color: 'amber', label: 'Average Rating', value: allR.length ? (allR.reduce((a, r) => a + r.rating, 0) / allR.length).toFixed(1) + '/5' : '—', trend: 'Overall' })}
    ${statCard({ ic: 'award', color: 'teal', label: 'Top Performer', value: top ? top.subjectName.split(' ')[0] : '—', trend: top ? top.rating + '/5 in ' + top.period : '' })}
    ${statCard({ ic: 'clock', color: 'cyan', label: 'This Term', value: String(allR.filter((r) => r.period === 'Term 1').length), trend: 'Term 1' })}
  </div>
  ${card('Performance Overview', 'Average category scores across all reviews',
    barChart([
      { label: 'Teaching', value: Number(avgCat('teaching')) }, { label: 'Punctuality', value: Number(avgCat('punctuality')) },
      { label: 'Professionalism', value: Number(avgCat('professionalism')) }, { label: 'Engagement', value: Number(avgCat('studentEngagement')) },
    ], { max: 5 }), { titleSize: 'text-base' })}
  ${card('All Reviews', '', allR.length ? `<div class="table-wrap"><table class="table"><thead><tr>
      <th>Staff</th><th>Period</th><th>Overall</th><th class="hide-md-down">Teach</th><th class="hide-md-down">Punct.</th><th class="hide-md-down">Prof.</th><th class="hide-md-down">Engage</th><th style="text-align:right">Actions</th>
    </tr></thead><tbody>
      ${allR.map((r) => `
      <tr>
        <td><div class="row gap-3">${avatarHtml(r.subjectName, r.subjectRole, 'av-8')}
          <span><p class="font-medium">${esc(r.subjectName)}</p><p class="cell-sub">${esc(r.subjectRole)}</p></span></div></td>
        <td>${esc(r.period)}</td>
        <td><div class="row gap-1">${STAR(r.rating)}</div></td>
        ${['teaching', 'punctuality', 'professionalism', 'studentEngagement'].map((k) => `<td class="hide-md-down"><span class="badge ${r[k] >= 5 ? 'badge-soft' : r[k] >= 4 ? 'badge-teal' : r[k] >= 3 ? 'badge-warn' : 'badge-danger'}">${r[k]}</span></td>`).join('')}
        <td><div class="row gap-1" style="justify-content:flex-end">
          <button class="btn btn-ghost btn-icon" data-view="${r.id}">${icon('eye', '', 16)}</button>
          <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-del="${r.id}">${icon('trash-2', '', 16)}</button>
        </div></td>
      </tr>`).join('')}
    </tbody></table></div>` : empty('star', 'No reviews recorded yet.'), { titleSize: 'text-base', flush: true })}`

  mount.querySelector('[data-new]').onclick = () => performanceDialog(null, () => performance(mount))
  mount.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => {
    const r = DB.data.reviews.find((x) => x.id === b.dataset.view)
    openDialog(`${dialogHead(esc(r.subjectName) + ' — ' + esc(r.period), 'Reviewed by ' + esc(r.reviewerName))}
      <div class="stack-3 mt-3">
        <div class="row gap-2">${STAR(r.rating)}<span class="font-semibold">${r.rating}/5</span></div>
        ${[['Teaching', r.teaching], ['Punctuality', r.punctuality], ['Professionalism', r.professionalism], ['Student Engagement', r.studentEngagement]].map(([k, v]) => `
          <div><div class="row between text-xs mb-1"><span>${k}</span><span class="muted">${v}/5</span></div>
          <div class="progress"><div style="width:${v * 20}%"></div></div></div>`).join('')}
        ${r.comments ? `<p class="text-sm" style="font-style:italic">"${esc(r.comments)}"</p>` : ''}
        ${r.goals ? `<p class="text-xs"><b>Goals:</b> ${esc(r.goals)}</p>` : ''}
      </div>${dialogFoot('Close', '')}`, { noFocus: true })
  } })
  mount.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => {
    confirmDialog('Delete review?', 'This review will be permanently removed.', 'Delete', () => {
      DB.data.reviews = DB.data.reviews.filter((x) => x.id !== b.dataset.del); DB.save(); toast('success', 'Review deleted'); performance(mount)
    })
  } })
}

function performanceDialog(r, onDone) {
  const staffList = DB.data.staff.filter((s) => s.role !== 'Admin')
  const RATINGS = [['5', 'Excellent'], ['4', 'Very Good'], ['3', 'Good'], ['2', 'Fair'], ['1', 'Poor']]
  const wrap = openDialog(`${dialogHead(r ? 'Edit Review' : 'Add Review')}
    <div class="form-grid">
      ${field('Staff Member', sel('pr-staff', staffList.map((s) => [s.id, `${s.name} (${s.role})`]), r?.subjectId || staffList[0]?.id))}
      ${field('Period *', sel('pr-period', ['Term 1', 'Term 2', 'Term 3'], r?.period || 'Term 1'))}
      ${field('Overall Rating', sel('pr-rating', RATINGS, r?.rating ?? 4))}
      ${field('Teaching', sel('pr-teach', [5, 4, 3, 2, 1], r?.teaching ?? 4))}
      ${field('Punctuality', sel('pr-punct', [5, 4, 3, 2, 1], r?.punctuality ?? 4))}
      ${field('Professionalism', sel('pr-prof', [5, 4, 3, 2, 1], r?.professionalism ?? 4))}
      ${field('Student Engagement', sel('pr-eng', [5, 4, 3, 2, 1], r?.studentEngagement ?? 4))}
      ${field('Comments', `<textarea class="input" id="pr-comments" rows="3">${esc(r?.comments || '')}</textarea>`)}
      ${field('Goals for next period', `<input class="input" id="pr-goals" value="${esc(r?.goals || '')}">`)}
    </div>
    ${dialogFoot('Cancel', `<button class="btn btn-brand" id="pr-save">${icon('check', '', 14)} Save Review</button>`)}`, { wide: true })
  wrap.querySelector('#pr-save').onclick = () => {
    const v = (id) => wrap.querySelector('#' + id).value
    const st = DB.data.staff.find((s) => s.id === v('pr-staff'))
    const data = { subjectId: st.id, subjectName: st.name, subjectRole: st.role, reviewerId: store.user.id, reviewerName: store.user.name, period: v('pr-period'), rating: Number(v('pr-rating')), teaching: Number(v('pr-teach')), punctuality: Number(v('pr-punct')), professionalism: Number(v('pr-prof')), studentEngagement: Number(v('pr-eng')), comments: v('pr-comments'), goals: v('pr-goals') }
    if (r) Object.assign(r, data)
    else DB.data.reviews.push({ id: uid('prf'), ...data, createdAt: nowIso() })
    DB.save(); closeDialog(); toast('success', 'Review saved'); onDone()
  }
}

// ------------------------------------------------------------
// CONFERENCE
// ------------------------------------------------------------
function conference(mount) {
  const u = store.user
  const isStudent = u.role === 'Student'
  const slots = DB.data.conferenceSlots
  const bookings = DB.data.conferenceBookings

  if (isStudent) {
    const byTeacher = new Map()
    for (const s of slots.filter((x) => !x.isBooked)) {
      if (!byTeacher.has(s.teacherName)) byTeacher.set(s.teacherName, [])
      byTeacher.get(s.teacherName).push(s)
    }
    const my = bookings.filter((b) => b.parentId === u.id)
    mount.innerHTML = `
    ${banner('calendar-clock', 'Parent-Teacher Conferences', 'Book a meeting with your teachers.')}
    ${card('Available Slots', 'Grouped by teacher',
      byTeacher.size === 0 ? empty('calendar-clock', 'No open slots right now.') :
      Array.from(byTeacher.entries()).map(([t, list]) => `
        <div class="stack-3 mb-3">
          <div class="row gap-2"><span class="avatar av-8 staff">${initials(t)}</span><p class="font-semibold">${esc(t)}</p>
            <span class="badge badge-soft">${list.length} open</span></div>
          <div class="chip-row">${list.map((s) => `
            <button class="subj-chip sc-brand" data-book="${s.id}">${icon('clock', '', 12)} ${new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${esc(s.startTime)} – ${esc(s.endTime)}</button>`).join('')}
          </div>
        </div>`).join(''), { titleSize: 'text-base', flush: true })}
    ${card('My Bookings', '', my.length ? my.map((b) => `
      <div class="row-card row gap-3">
        <span class="stat-ic ic-emerald" style="width:2.25rem;height:2.25rem;border-radius:.5rem">${icon('calendar', '', 14)}</span>
        <div class="flex-1"><p class="text-sm font-medium">${esc(b.teacherName)}</p>
          <p class="text-xs muted">${new Date(b.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · ${esc(b.startTime)} – ${esc(b.endTime)}</p></div>
        <span class="badge ${b.status === 'Confirmed' ? 'badge-soft' : 'badge-muted'}">${esc(b.status)}</span>
        <button class="btn btn-outline btn-sm" data-cancel="${b.id}">Cancel</button>
      </div>`).join('') : empty('calendar', 'No bookings yet.'), { titleSize: 'text-base' })}`
    mount.querySelectorAll('[data-book]').forEach((b) => { b.onclick = () => {
      const s = slots.find((x) => x.id === b.dataset.book)
      const wrap = openDialog(`${dialogHead('Book Conference', `${esc(s.teacherName)} · ${new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · ${esc(s.startTime)} – ${esc(s.endTime)}`)}
        <div class="form-grid" style="margin-top:1rem">
          ${field('Student Name *', `<input class="input" id="cb-student" value="${esc(store.user.name)}">`)}
          ${field('Notes for the teacher', `<textarea class="input" id="cb-notes" rows="3" placeholder="Anything the teacher should know..."></textarea>`)}
        </div>
        ${dialogFoot('Cancel', `<button class="btn btn-brand" id="cb-save">${icon('check', '', 14)} Confirm Booking</button>`)}`)
      wrap.querySelector('#cb-save').onclick = () => {
        const name = wrap.querySelector('#cb-student').value.trim()
        if (!name) { toast('error', 'Student name is required'); return }
        s.isBooked = true; s.bookingStudentName = name; s.bookingParentName = store.user.name; s.bookingStatus = 'Confirmed'
        DB.data.conferenceBookings.push({ id: uid('cbk'), slotId: s.id, teacherName: s.teacherName, date: s.date, startTime: s.startTime, endTime: s.endTime, parentId: store.user.id, parentName: store.user.name, studentName: name, notes: wrap.querySelector('#cb-notes').value, status: 'Confirmed', createdAt: nowIso() })
        DB.save(); closeDialog(); toast('success', 'Conference booked', `${s.teacherName} · ${s.startTime}`); conference(mount)
      }
    } })
    mount.querySelectorAll('[data-cancel]').forEach((b) => { b.onclick = () => {
      const bk = bookings.find((x) => x.id === b.dataset.cancel)
      const slot = slots.find((s) => s.id === bk.slotId)
      if (slot) { slot.isBooked = false; slot.bookingStudentName = null; slot.bookingParentName = null; slot.bookingStatus = null }
      DB.data.conferenceBookings = bookings.filter((x) => x.id !== bk.id)
      DB.save(); toast('info', 'Booking cancelled'); conference(mount)
    } })
    return
  }

  // staff
  mount.innerHTML = `
  ${banner('calendar-clock', 'Parent-Teacher Conferences', 'Open meeting slots and manage bookings.',
    `<button class="btn btn-white" data-create>${icon('plus', '', 16)} Create Slots</button>`)}
  <div class="stat-grid stagger">
    ${statCard({ ic: 'calendar-clock', color: 'emerald', label: 'Total Slots', value: String(slots.length), trend: 'All teachers' })}
    ${statCard({ ic: 'check', color: 'teal', label: 'Available', value: String(slots.filter((s) => !s.isBooked).length), trend: 'Open for booking' })}
    ${statCard({ ic: 'calendar', color: 'amber', label: 'Booked', value: String(slots.filter((s) => s.isBooked).length), trend: 'Confirmed meetings' })}
    ${statCard({ ic: 'users', color: 'cyan', label: 'Teachers', value: String(new Set(slots.map((s) => s.teacherName)).size), trend: 'Participating' })}
  </div>
  ${card('Conference Slots', '', slots.length ? `<div class="table-wrap"><table class="table"><thead><tr>
      <th>Date</th><th>Time</th><th>Teacher</th><th>Status</th><th class="hide-md-down">Booked For</th><th style="text-align:right">Actions</th>
    </tr></thead><tbody>
      ${slots.map((s) => `
      <tr>
        <td>${new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
        <td>${esc(s.startTime)} – ${esc(s.endTime)}</td>
        <td><p class="text-sm font-medium">${esc(s.teacherName)}</p></td>
        <td><span class="badge ${s.isBooked ? 'badge-warn' : 'badge-soft'}">${s.isBooked ? 'Booked' : 'Available'}</span></td>
        <td class="hide-md-down"><p class="text-sm">${s.bookingStudentName ? esc(s.bookingStudentName) + ' · ' + esc(s.bookingParentName || '') : '—'}</p></td>
        <td><div class="row gap-1" style="justify-content:flex-end">
          <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-del="${s.id}">${icon('trash-2', '', 16)}</button>
        </div></td>
      </tr>`).join('')}
    </tbody></table></div>` : empty('calendar-clock', 'No slots created yet.'), { titleSize: 'text-base', flush: true })}
  ${card(bookings.length ? 'Recent Bookings' : '', '', bookings.length ? bookings.map((b) => `
    <div class="row-card row gap-3">
      <span class="avatar av-8 staff">${initials(b.parentName)}</span>
      <div class="flex-1"><p class="text-sm font-medium">${esc(b.parentName)} <span class="muted">for ${esc(b.studentName)}</span></p>
        <p class="text-xs muted">${esc(b.teacherName)} · ${new Date(b.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${esc(b.startTime)}</p></div>
      <span class="badge badge-soft">${esc(b.status)}</span>
    </div>`).join('') : '', { titleSize: 'text-base' })}`

  mount.querySelector('[data-create]').onclick = () => {
    const teachers = DB.data.staff.filter((s) => ['Teacher', 'Admin', 'Principal'].includes(s.role))
    const wrap = openDialog(`${dialogHead('Create Conference Slots')}
      <div class="form-grid">
        ${field('Teacher', sel('cs-teacher', teachers.map((t) => [t.id, t.name]), teachers[0]?.id))}
        ${field('Date *', `<input class="input" id="cs-date" type="date" value="${dateOffset(4)}">`)}
        ${field('Start Time', `<input class="input" id="cs-start" type="time" value="15:00">`)}
        ${field('End Time', `<input class="input" id="cs-end" type="time" value="16:00">`)}
        <div class="field"><label class="row gap-2 text-sm" style="cursor:pointer"><input type="checkbox" id="cs-split" checked style="width:16px;height:16px;accent-color:var(--brand)"> Split into 15-minute slots</label>
          <p class="text-xs muted mt-1">Uncheck to create a single slot for the whole window.</p></div>
      </div>
      ${dialogFoot('Cancel', `<button class="btn btn-brand" id="cs-save">${icon('plus', '', 14)} Create Slots</button>`)}`)
    wrap.querySelector('#cs-save').onclick = () => {
      const v = (id) => wrap.querySelector('#' + id).value
      const t = teachers.find((x) => x.id === v('cs-teacher'))
      const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5))
      const start = toMin(v('cs-start')), end = toMin(v('cs-end'))
      const mk = (a, b) => {
        const f = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')
        DB.data.conferenceSlots.push({ id: uid('csl'), teacherId: t.id, teacherName: t.name, date: v('cs-date'), startTime: f(a), endTime: f(b), isBooked: false, bookingStudentName: null, bookingParentName: null, bookingStatus: null })
      }
      if (wrap.querySelector('#cs-split').checked) for (let m = start; m + 15 <= end; m += 15) mk(m, m + 15)
      else mk(start, end)
      DB.save(); closeDialog(); toast('success', 'Slots created'); conference(mount)
    }
  }
  mount.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => {
    DB.data.conferenceSlots = DB.data.conferenceSlots.filter((x) => x.id !== b.dataset.del)
    DB.save(); toast('success', 'Slot removed'); conference(mount)
  } })
}

// ------------------------------------------------------------
// PARENT PORTAL
// ------------------------------------------------------------
function parentPortal(mount) {
  const u = store.user
  const d = DB.data
  const grades = d.grades.filter((g) => g.studentId === u.id)
  const avg = grades.length ? Math.round(grades.reduce((a, g) => a + g.score, 0) / grades.length) : 0
  const att = d.attendance.filter((a) => a.studentId === u.id)
  const todayRec = att.find((a) => a.date === todayStr())
  const attPct = att.length ? Math.round(att.filter((a) => a.status === 'Present').length / att.length * 100) : 0
  const fee = d.fees.find((f) => f.studentId === u.id) || { status: 'Paid', amount: 1200, term: 'Term 1', dueDate: dateOffset(30) }
  const anns = (DB.data.__announcements || []).slice(0, 3)
  const asgs = d.assignments.filter((a) => a.className === u.className).slice(0, 3)
  const praise = avg >= 80 ? 'Outstanding work — keep it up!' : avg >= 60 ? 'Good progress this term!' : 'Let\u2019s work together on improvement.'

  mount.innerHTML = `
  ${banner('heart-handshake', 'Parent Portal', `A daily snapshot of ${esc(u.name.split(' ')[0])}'s school life.`,
    `<div style="background:rgba(255,255,255,.15);border-radius:.75rem;padding:.625rem 1rem;backdrop-filter:blur(8px);text-align:center">
      <p class="text-xs" style="opacity:.85">Today's Status</p>
      <p class="font-bold">${todayRec?.status ?? 'Not marked'}</p></div>`)}
  <div class="card"><div class="card-c row gap-3 wrap">
    ${avatarHtml(u.name, 'Student', 'av-14')}
    <div class="flex-1"><p class="font-semibold text-lg">${esc(u.name)}</p>
      <div class="row gap-2 wrap mt-1">
        <span class="badge badge-outline">${gradeToForm(u.grade)}</span>
        <span class="badge badge-outline">${esc(u.className ?? '')}</span>
        <span class="badge badge-muted">${esc(u.admissionNo || '')}</span>
        <span class="badge badge-muted">Guardian: ${esc(u.guardian || '—')}</span>
      </div></div>
  </div></div>
  <div class="grid gap-6" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.5rem">
    ${card('Academic Snapshot', '', `
      <p class="text-3xl font-bold" style="color:var(--brand)">${avg}%</p>
      <p class="text-xs muted mb-3">Average across ${grades.length} subjects</p>
      ${barChart(grades.map((g) => ({ label: g.subject, value: g.score })), { max: 100, height: 160 })}`, { titleSize: 'text-base' })}
    ${card('Attendance Today', '', `
      <div class="row gap-3">
        <span class="stat-ic ${todayRec?.status === 'Present' ? 'ic-emerald' : todayRec?.status === 'Late' ? 'ic-amber' : 'ic-cyan'}" style="border-radius:9999px">
          ${icon(todayRec?.status === 'Present' ? 'check' : todayRec?.status === 'Late' ? 'clock' : 'x', '', 22)}</span>
        <div><p class="text-xl font-bold">${todayRec?.status ?? '—'}</p><p class="text-xs muted">Overall rate ${attPct}%</p></div>
      </div>
      <div class="mt-4"><div class="row between text-xs mb-1"><span>Attendance rate</span><span class="muted">${attPct}%</span></div>
      <div class="progress"><div style="width:${attPct}%"></div></div></div>`, { titleSize: 'text-base' })}
    ${card('Fee Status', '', `
      <p class="text-2xl font-bold">$${fee.amount.toLocaleString()}</p>
      <p class="text-xs muted">${esc(fee.term)} · Due ${new Date(fee.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
      <div class="mt-3"><span class="badge ${fee.status === 'Paid' ? 'badge-soft' : 'badge-warn'}">${fee.status === 'Paid' ? icon('check', '', 12) + ' Paid' : 'Pending'}</span></div>`, { titleSize: 'text-base' })}
  </div>
  <div class="cols-lg-3" style="grid-template-columns:1fr 1fr">
    ${card('Recent Announcements', '', anns.map((a) => `
      <div class="row-card"><div class="row between gap-2"><p class="text-sm font-semibold">${esc(a.title)}</p>
        <span class="text-xs muted">${timeAgo(a.createdAt)}</span></div>
      <p class="text-xs muted mt-1">— ${esc(a.authorName)}</p></div>`).join(''), { titleSize: 'text-base' })}
    ${card('Upcoming Assignments', '', asgs.length ? asgs.map((a) => {
      const days = Math.ceil((new Date(a.dueDate) - Date.now()) / 864e5)
      return `<div class="row-card row gap-2">
        <span class="flex-1 text-sm font-medium">${esc(a.title)}</span>
        <span class="badge ${days <= 2 ? 'badge-warn' : 'badge-muted'}">${days < 0 ? 'Overdue' : days === 0 ? 'Today' : days + 'd'}</span></div>`
    }).join('') : '<p class="muted text-sm">Nothing due soon.</p>', { titleSize: 'text-base' })}
  </div>
  ${card('', '', `
    <div class="row gap-3 wrap">
      <span class="stat-ic ic-emerald" style="border-radius:9999px">${icon('heart', '', 20)}</span>
      <div class="flex-1"><p class="font-semibold">${praise}</p>
        <p class="text-xs muted mt-1">Contact the school: ${esc(DB.data.settings.email)} · ${esc(DB.data.settings.phone)}</p></div>
    </div>`, { flush: true })}`
}

// ------------------------------------------------------------
// TERMS
// ------------------------------------------------------------
function terms(mount) {
  const d = DB.data
  const all = d.terms
  const active = all.find((t) => t.isActive)
  const activePct = active ? Math.min(100, Math.max(0, Math.round((Date.now() - new Date(active.startDate)) / (new Date(active.endDate) - new Date(active.startDate)) * 100))) : 0
  const activeDays = active ? Math.max(0, Math.ceil((new Date(active.endDate) - new Date()) / 864e5)) : 0
  mount.innerHTML = `
  ${banner('calendar-range', 'Terms & Calendar', 'Academic terms, holidays and exam weeks.',
    `<button class="btn btn-white" data-new>${icon('plus', '', 16)} Add Term</button>`)}
  <div class="stat-grid stagger">
    ${statCard({ ic: 'calendar-range', color: 'emerald', label: 'Total Terms', value: String(all.length), trend: 'This year' })}
    ${statCard({ ic: 'check', color: 'teal', label: 'Active Term', value: active ? active.name : '—', trend: active ? activeDays + ' days left' : 'None active' })}
    ${statCard({ ic: 'sun', color: 'amber', label: 'Holidays', value: String(all.reduce((a, t) => a + t.holidays.length, 0)), trend: 'Scheduled breaks' })}
    ${statCard({ ic: 'graduation-cap', color: 'cyan', label: 'Exam Weeks', value: String(all.reduce((a, t) => a + t.examWeeks.length, 0)), trend: 'Assessment periods' })}
  </div>
  ${active ? `<div class="banner" style="animation:none"><div class="banner-deco-a"></div><div class="banner-c">
      <div class="flex-1">
        <p class="banner-date"><span class="pulse-dot" style="display:inline-block;height:6px;width:6px;border-radius:9999px;background:#4ade80"></span>Active Term</p>
        <h2 class="banner-title">${esc(active.name)}</h2>
        <p class="banner-sub">${new Date(active.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${new Date(active.endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · ${activeDays} days remaining</p>
      </div>
      <div style="text-align:right;min-width:140px"><p class="text-3xl font-bold">${activePct}%</p>
        <div class="progress" style="margin-top:.5rem;background:rgba(255,255,255,.25)"><div style="width:${activePct}%;background:#fff"></div></div></div>
    </div></div>` : ''}
  <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem">
    ${all.map((t) => `
    <div class="card" style="overflow:hidden"><div style="height:4px;background:${t.isActive ? 'var(--brand)' : 'var(--border)'}"></div>
      <div class="card-c stack-3">
        <div class="row between gap-2"><p class="font-semibold">${esc(t.name)}</p>
          ${t.isActive ? '<span class="badge badge-soft">Active</span>' : ''}</div>
        <p class="text-xs muted">${new Date(t.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(t.endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        ${t.holidays.length ? `<div><p class="label-sm">Holidays (${t.holidays.length})</p>
          <div class="chip-row">${t.holidays.map((h) => `<span class="badge badge-warn">${new Date(h.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${esc(h.name)}</span>`).join('')}</div></div>` : ''}
        ${t.examWeeks.length ? `<div><p class="label-sm">Exam Weeks (${t.examWeeks.length})</p>
          <div class="chip-row">${t.examWeeks.map((w) => `<span class="badge badge-danger">${esc(w.name)}: ${w.startDate} → ${w.endDate}</span>`).join('')}</div></div>` : ''}
        <div class="row gap-2" style="justify-content:flex-end">
          <button class="btn btn-ghost btn-icon" data-edit="${t.id}">${icon('pencil', '', 16)}</button>
          <button class="btn btn-ghost btn-icon" style="color:#ef4444" data-del="${t.id}">${icon('trash-2', '', 16)}</button>
        </div>
      </div></div>`).join('')}
  </div>`
  mount.querySelector('[data-new]').onclick = () => termDialog(null, () => terms(mount))
  mount.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => termDialog(all.find((t) => t.id === b.dataset.edit), () => terms(mount)) })
  mount.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => {
    const t = all.find((x) => x.id === b.dataset.del)
    confirmDialog('Delete term?', `Remove "${t.name}" and its calendar data?`, 'Delete', () => {
      DB.data.terms = all.filter((x) => x.id !== t.id); DB.save(); toast('success', 'Term deleted'); terms(mount)
    })
  } })
}

function termDialog(t, onDone) {
  const f = t || { name: '', startDate: dateOffset(1), endDate: dateOffset(90), isActive: false, holidays: [], examWeeks: [] }
  const wrap = openDialog(`${dialogHead(t ? 'Edit Term' : 'Add Term')}
    <div class="form-grid">
      ${field('Term Name *', `<input class="input" id="tm-name" value="${esc(f.name)}" placeholder="Term 1">`)}
      ${field('Start Date', `<input class="input" id="tm-start" type="date" value="${f.startDate}">`)}
      ${field('End Date', `<input class="input" id="tm-end" type="date" value="${f.endDate}">`)}
    </div>
    <label class="row gap-2 text-sm mb-3" style="cursor:pointer"><input type="checkbox" id="tm-active" ${f.isActive ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--brand)"> Set as active term</label>
    <div id="tm-holidays"></div>
    <button class="btn btn-outline btn-sm mb-3" id="tm-add-h">${icon('plus', '', 12)} Add Holiday</button>
    <div id="tm-exams"></div>
    <button class="btn btn-outline btn-sm" id="tm-add-e">${icon('plus', '', 12)} Add Exam Week</button>
    ${dialogFoot('Cancel', `<button class="btn btn-brand" id="tm-save">${icon('save', '', 14)} Save Term</button>`)}`, { wide: true })

  const hCont = wrap.querySelector('#tm-holidays'), eCont = wrap.querySelector('#tm-exams')
  const addHoliday = (h = { date: todayStr(), name: '' }) => {
    const row = document.createElement('div')
    row.className = 'row gap-2 mb-2'
    row.innerHTML = `<input class="input" type="date" value="${h.date}" style="width:10rem" data-hd><input class="input" placeholder="Holiday name" value="${esc(h.name)}" data-hn>
      <button class="btn btn-ghost btn-icon" style="color:#ef4444">${icon('x', '', 14)}</button>`
    row.querySelector('button').onclick = () => row.remove()
    hCont.appendChild(row)
  }
  const addExam = (w = { startDate: todayStr(), endDate: dateOffset(5), name: '' }) => {
    const row = document.createElement('div')
    row.className = 'row gap-2 mb-2'
    row.innerHTML = `<input class="input" placeholder="e.g. Midterms" value="${esc(w.name)}" data-wn><input class="input" type="date" value="${w.startDate}" data-ws style="width:9.5rem"><input class="input" type="date" value="${w.endDate}" data-we style="width:9.5rem">
      <button class="btn btn-ghost btn-icon" style="color:#ef4444">${icon('x', '', 14)}</button>`
    row.querySelector('button').onclick = () => row.remove()
    eCont.appendChild(row)
  }
  f.holidays.forEach(addHoliday); f.examWeeks.forEach(addExam)
  wrap.querySelector('#tm-add-h').onclick = () => addHoliday()
  wrap.querySelector('#tm-add-e').onclick = () => addExam()

  wrap.querySelector('#tm-save').onclick = () => {
    const v = (id) => wrap.querySelector('#' + id).value
    if (!v('tm-name').trim()) { toast('error', 'Term name is required'); return }
    const holidays = Array.from(hCont.children).map((r) => ({ date: r.querySelector('[data-hd]').value, name: r.querySelector('[data-hn]').value })).filter((h) => h.date)
    const examWeeks = Array.from(eCont.children).map((r) => ({ name: r.querySelector('[data-wn]').value, startDate: r.querySelector('[data-ws]').value, endDate: r.querySelector('[data-we]').value })).filter((w) => w.startDate)
    const isActive = wrap.querySelector('#tm-active').checked
    if (isActive) DB.data.terms.forEach((x) => { x.isActive = false })
    const data = { name: v('tm-name').trim(), startDate: v('tm-start'), endDate: v('tm-end'), isActive, holidays, examWeeks }
    if (t) Object.assign(t, data)
    else DB.data.terms.push({ id: uid('trm'), ...data })
    DB.save(); closeDialog(); toast('success', 'Term saved'); onDone()
  }
}
