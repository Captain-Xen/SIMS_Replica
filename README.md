# SIMS Replica (vanilla HTML/CSS/JS)

A front-end replica of the SIMS — School Information Management System, rebuilt with **only HTML, CSS and vanilla JavaScript** (no frameworks, no build step). All data is mocked in `js/data.js` and persisted to your browser's `localStorage`, so every module is mostly interactive. You can't click on some things, like the quick links in the library module.



## Run it

ES modules need to be served over HTTP (opening `index.html` via `file://` won't work in Chrome). From this folder run any static server, e.g.:

```bash
# Python - REMEMBER YOU DONT HAVE TO USE THIS SPECIFIC PORT, YOU CAN USE ANY PORT YOU WANT
python -m http.server 8741

# or Node
npx serve .
```

Then open <http://localhost:8741>.

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@edu.edu` | `admin123` |
| Teacher | `staff@edu.edu` | `staff123` |
| Student | `student@edu.edu` | `student123` |

The login screen has one-click autofill buttons for each.

## What's replicated

- Login (Staff/Student portals, register, forgot password, dark/light toggle)
- App shell: collapsible sidebar with role-based navigation, sticky header, ⌘K global search, notifications bell, idle-logout warning (7 min + 60 s countdown)
- All 38 views: dashboard, profile (Overview/Academic/Activity/Growth), students, staff, grades, attendance, timetable, fees, announcements, discipline, messages (chat), assignments, library, events calendar, parent portal, reports (print-ready), analytics (SVG charts), exams, health, transport, cafeteria, alumni, visitors, inventory, facilities, admissions, terms, performance, finance, conferences, activities, uniform, notifications, bulk import, settings, help
- Admin settings: branding, live accent re-skin (16 colors), feature visibility switches, danger-zone reseed
- Animations: staggered view transitions, animated charts, count-up stats, floating login blobs, toast/dialog transitions, View-Transitions API theme cross-fade

## Structure

```
index.html          shell + fonts
css/styles.css      full design system (oklch tokens mirror the original)
js/icons.js         inline Lucide-style SVG icon set
js/data.js          seeded mock database + helpers (localStorage)
js/ui.js            shared components: banner, cards, charts, dialogs, toasts
js/app.js           shell, router (lazy view loading), search, idle timer
js/main.js          boot
js/views/*.js       views grouped in 4 lazy-loaded modules
```
