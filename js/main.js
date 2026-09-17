// Entry point — boot the replica SPA
import { DB } from './data.js'
import { store } from './ui.js'
import { renderLogin, renderApp, applyTheme, applyAccent } from './app.js'

DB.load()
store.load()
applyTheme(store.theme)
applyAccent(DB.data.settings.accent)

// announcements live in-memory only (kept out of localStorage to stay light)
import { uid, nowIso } from './data.js'
const staffFor = (id) => DB.data.staff.find((s) => s.id === id)
DB.data.__announcements = [
  { id: uid('ann'), title: 'Midterm Exams Approaching', body: 'Midterm examinations begin Monday. Please ensure all students are prepared and arrive 15 minutes early.', authorId: 'staff-admin', authorName: 'Dr. Admin', authorRole: 'Admin', createdAt: nowIso(3600) },
  { id: uid('ann'), title: 'Science Fair Registration Open', body: 'Sign up at the front office for the annual Science Fair. Prizes for top 3 projects!', authorId: 'staff-teacher', authorName: 'Ms. Teacher', authorRole: 'Teacher', createdAt: nowIso(7200) },
  { id: uid('ann'), title: 'PTA Meeting Scheduled', body: 'The next Parent-Teacher Association meeting is scheduled for the 20th at 5:30 PM in the main hall.', authorId: 'staff-principal', authorName: 'Mrs. principal', authorRole: 'Principal', createdAt: nowIso(86400) },
  { id: uid('ann'), title: 'Library Extended Hours', body: 'The library will now stay open until 6 PM on weekdays to support exam preparation.', authorId: 'staff-admin', authorName: 'Dr. Admin', authorRole: 'Admin', createdAt: nowIso(2 * 86400) },
]

if (store.user) {
  // re-hydrate session user against current data (ids/names may have been reseeded)
  const found = DB.data.staff.find((s) => s.id === store.user.id) || DB.data.students.find((s) => s.id === store.user.id)
  if (!found) { store.user = null; store.save() }
}

store.user ? renderApp() : renderLogin()
