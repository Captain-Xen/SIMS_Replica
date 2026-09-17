// ============================================================
// Mock data store — mirrors src/lib/seed.ts of the original app.
// Persisted to localStorage; every module reads/writes through DB.
// ============================================================
const KEY = 'sims_replica_db_v1'

const FIRST = ['Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Joshua', 'Aaliyah', 'Tyrone', 'Kesha', 'Andre', 'Roshane', 'Tanya', 'Malik', 'Khadijah', 'Devon', 'Shanice', 'Jevonte', 'Asha', 'Ricardo', 'Petra']
const LAST = ['Doe', 'Brown', 'Williams', 'Cameron', 'Stewart', 'Haye', 'Reid', 'Grant', 'Bennett', 'Foster', 'Miller', 'Thompson', 'Gordon', 'Henry', 'Parker', 'Sinclair', 'Wright', 'Clarke', 'Lawson', 'Morris']
const BLOOD = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-']
const pick = (arr, i) => arr[i % arr.length]
const today = () => new Date().toISOString().slice(0, 10)
const dOff = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
export const nowIso = (minAgo = 0) => new Date(Date.now() - minAgo * 6e4).toISOString()

export const uid = (prefix) => prefix + '-' + Math.random().toString(36).slice(2, 9)

function buildStudents() {
  const list = []
  let n = 0
  for (let g = 7; g <= 11; g++) for (const cls of [g + 'A', g + 'B']) for (let i = 0; i < 4; i++) {
    n++
    const name = pick(FIRST, n) + ' ' + pick(LAST, n + 3)
    list.push({
      id: 'stu-' + n, email: name.toLowerCase().replace(/\s+/g, '.') + '.' + n + '@edu.edu',
      name, dob: `200${g - 2}-0${(i % 9) + 1}-1${i % 9}`, gender: n % 2 === 0 ? 'Male' : 'Female',
      bloodGroup: pick(BLOOD, n), admissionNo: 'EDU-' + String(n).padStart(3, '0'),
      grade: g, className: cls, guardian: pick(FIRST, n + 5) + ' ' + pick(LAST, n + 1),
      phone: '555-0' + (100 + n), status: 'Active', feeStatus: n % 3 === 0 ? 'Paid' : 'Pending',
    })
  }
  // two extra to reach 43 (matches the original demo screenshots)
  for (let k = 42; k <= 43; k++) {
    const name = pick(FIRST, k + 7) + ' ' + pick(LAST, k + 11)
    list.push({
      id: 'stu-' + k, email: name.toLowerCase().replace(/\s+/g, '.') + '.' + k + '@edu.edu',
      name, dob: '2009-03-14', gender: k % 2 === 0 ? 'Male' : 'Female', bloodGroup: pick(BLOOD, k),
      admissionNo: 'EDU-' + String(k).padStart(3, '0'), grade: 12, className: '12A',
      guardian: pick(FIRST, k + 2) + ' ' + pick(LAST, k), phone: '555-0' + (100 + k),
      status: 'Active', feeStatus: k % 3 === 0 ? 'Paid' : 'Pending',
    })
  }
  list.push({
    id: 'stu-demo', email: 'student@edu.edu', name: 'Jane Doe', dob: '2008-05-12', gender: 'Female',
    bloodGroup: 'O+', admissionNo: 'EDU-001', grade: 10, className: '10A', guardian: 'Alice Doe',
    phone: '555-0100', status: 'Active', feeStatus: 'Pending',
  })
  return list
}

function fresh() {
  const students = buildStudents()
  const staffUsers = [
    { id: 'staff-admin', email: 'admin@edu.edu', name: 'Dr. Admin', password: 'admin123', role: 'Admin', department: 'Administration', phone: '555-0100', bio: 'System Administrator overseeing all school operations.', points: 196, level: 2, badges: 3 },
    { id: 'staff-principal', email: 'principal@edu.edu', name: 'Mrs. principal', password: 'principal123', role: 'Principal', department: 'Administration', phone: '555-0101', bio: 'Principal of the school.', points: 120, level: 2, badges: 1 },
    { id: 'staff-teacher', email: 'staff@edu.edu', name: 'Ms. Teacher', password: 'staff123', role: 'Teacher', department: 'Sciences', phone: '555-0102', bio: 'Mathematics & Physics educator passionate about STEM.', subjects: ['Mathematics', 'Physics'], points: 142, level: 2, badges: 2 },
    { id: 'staff-teacher2', email: 'english@edu.edu', name: 'Mr. Shakespeare', password: 'staff123', role: 'Teacher', department: 'Languages', phone: '555-0103', bio: 'English Language & Literature teacher.', subjects: ['English Language', 'History'], points: 110, level: 1, badges: 1 },
    { id: 'staff-nurse', email: 'nurse@edu.edu', name: 'Nurse Betty', password: 'nurse123', role: 'Nurse', department: 'Health', phone: '555-0104', bio: 'School nurse.', points: 90, level: 1, badges: 0 },
  ]
  const staff = staffUsers.map((s, i) => ({ ...s, status: 'Active', avatar: null }))

  // attendance: deterministic 93% present, ~2% late (43 students → 40/1/2)
  const attendance = students.map((s, i) => {
    const r = (i * 7) % 43
    const status = r === 0 || r === 22 ? 'Absent' : r === 13 ? 'Late' : 'Present'
    return { id: 'att-' + i, studentId: s.id, studentName: s.name, date: today(), status }
  })

  const grades = []
  let gi = 0
  for (const s of students) for (const subject of ['Mathematics', 'English Language', 'Biology']) {
    grades.push({ id: 'gr-' + gi++, studentId: s.id, studentName: s.name, teacherId: 'staff-teacher', subject, score: 60 + ((gi * 37) % 40), term: 'Term 1', createdAt: nowIso(gi * 30) })
  }

  const fees = students.map((s, i) => ({ id: 'fee-' + i, studentId: s.id, studentName: s.name, amount: 1200, status: s.feeStatus, dueDate: new Date().getFullYear() + '-12-15', term: 'Term 1' }))

  const yr = new Date().getFullYear()
  const mo = String(new Date().getMonth() + 1).padStart(2, '0')
  const d = (day) => `${yr}-${mo}-${String(day).padStart(2, '0')}`
  const events = [
    { id: 'ev-1', title: 'Math Exam', date: d(5), type: 'Exam' },
    { id: 'ev-2', title: 'Science Fair', date: d(12), type: 'Event' },
    { id: 'ev-3', title: 'Public Holiday', date: d(15), type: 'Holiday' },
    { id: 'ev-4', title: 'PTA Meeting', date: d(20), type: 'Meeting' },
    { id: 'ev-5', title: 'Sports Day', date: d(25), type: 'Event' },
  ]

  const assignments = [
    { id: 'asg-1', teacherId: 'staff-teacher', teacherName: 'Ms. Teacher', title: 'Algebra Worksheet 4', description: 'Complete problems 1-20 on solving linear equations. Show all working.', subject: 'Mathematics', className: '10A', dueDate: dOff(3), createdAt: nowIso(2 * 1440) },
    { id: 'asg-2', teacherId: 'staff-teacher', teacherName: 'Ms. Teacher', title: "Newton's Laws Lab Report", description: 'Write a 2-page lab report on the pendulum experiment conducted in class.', subject: 'Physics', className: '10A', dueDate: dOff(7), createdAt: nowIso(3 * 1440) },
    { id: 'asg-3', teacherId: 'staff-teacher2', teacherName: 'Mr. Shakespeare', title: 'Shakespeare Essay', description: 'Write a 500-word essay analyzing the theme of ambition in Macbeth.', subject: 'English Language', className: '10A', dueDate: d(10), createdAt: nowIso(5 * 1440) },
  ]

  const exams = [
    { id: 'exm-1', title: 'Mathematics Midterm', subject: 'Mathematics', className: '10A', date: d(5), startTime: '09:00', duration: 120, room: 'Hall A', totalMarks: 100, passingMarks: 40, notes: 'Bring calculator and geometry set.', createdByName: 'Dr. Admin' },
    { id: 'exm-2', title: 'English Language Midterm', subject: 'English Language', className: '10A', date: d(7), startTime: '09:00', duration: 150, room: 'Hall B', totalMarks: 100, passingMarks: 40, notes: 'Essay + comprehension sections.', createdByName: 'Dr. Admin' },
    { id: 'exm-3', title: 'Biology Midterm', subject: 'Biology', className: '10A', date: d(9), startTime: '13:00', duration: 90, room: 'Lab 1', totalMarks: 80, passingMarks: 32, notes: 'Lab coat required.', createdByName: 'Dr. Admin' },
    { id: 'exm-4', title: 'Physics Midterm', subject: 'Physics', className: '10A', date: d(11), startTime: '09:00', duration: 120, room: 'Hall A', totalMarks: 100, passingMarks: 40, notes: 'Formula sheet provided.', createdByName: 'Dr. Admin' },
    { id: 'exm-5', title: 'History Midterm', subject: 'History', className: '9A', date: d(6), startTime: '10:00', duration: 90, room: 'Room 204', totalMarks: 60, passingMarks: 24, notes: '', createdByName: 'Dr. Admin' },
  ]

  const discipline = [
    { id: 'dis-1', studentId: students[2].id, studentName: students[2].name, type: 'Detention', reason: 'Repeated lateness', date: today(), issuerName: 'Mrs. principal' },
    { id: 'dis-2', studentId: students[5].id, studentName: students[5].name, type: 'Warning', reason: 'Uniform violation', date: today(), issuerName: 'Mrs. principal' },
  ]

  const books = [
    { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', category: 'Fiction', copies: 5, shelf: 'F-12' },
    { title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '9780553380163', category: 'Science', copies: 3, shelf: 'S-08' },
    { title: 'Calculus: Early Transcendentals', author: 'James Stewart', isbn: '9781285741550', category: 'Mathematics', copies: 8, shelf: 'M-03' },
    { title: 'The Diary of a Young Girl', author: 'Anne Frank', isbn: '9780553296983', category: 'History', copies: 4, shelf: 'H-15' },
    { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', category: 'Fiction', copies: 6, shelf: 'F-07' },
    { title: 'Chemistry: The Central Science', author: 'Theodore L. Brown', isbn: '9780321910417', category: 'Science', copies: 5, shelf: 'S-11' },
    { title: '1984', author: 'George Orwell', isbn: '9780451524935', category: 'Fiction', copies: 7, shelf: 'F-21' },
    { title: 'The Oxford English Dictionary', author: 'Oxford University Press', isbn: '9780198610498', category: 'Reference', copies: 2, shelf: 'R-01' },
    { title: 'Things Fall Apart', author: 'Chinua Achebe', isbn: '9780385474542', category: 'Fiction', copies: 4, shelf: 'F-14' },
    { title: 'Physics for Scientists and Engineers', author: 'Serway & Jewett', isbn: '9781285073839', category: 'Science', copies: 4, shelf: 'S-05' },
    { title: 'The Caribbean: A History of the Region', author: 'Bridget Brereton', isbn: '9789766402005', category: 'History', copies: 3, shelf: 'H-09' },
    { title: 'Advanced Mathematics', author: 'R. R. Sharma', isbn: '9788121923456', category: 'Mathematics', copies: 6, shelf: 'M-07' },
  ].map((b, i) => ({ id: 'bok-' + i, ...b, available: b.copies }))

  const loans = [
    { id: 'ln-1', bookId: 'bok-6', bookTitle: '1984', bookAuthor: 'George Orwell', userId: 'stu-demo', userName: 'Jane Doe', borrowDate: today(), dueDate: dOff(14), returnDate: null, status: 'Borrowed' },
    { id: 'ln-2', bookId: 'bok-8', bookTitle: 'Things Fall Apart', bookAuthor: 'Chinua Achebe', userId: 'stu-1', userName: students[0].name, borrowDate: dOff(-16), dueDate: dOff(-2), returnDate: null, status: 'Overdue' },
  ]

  // extra modules — sample data so every view is alive
  const health = [
    { id: 'hlt-1', studentId: 'stu-3', studentName: students[2].name, type: 'Allergy', title: 'Peanut allergy', description: 'Severe reaction — EpiPen kept in clinic.', severity: 'Critical', date: dOff(-40), recordedByName: 'Nurse Betty', createdAt: nowIso(6000) },
    { id: 'hlt-2', studentId: 'stu-8', studentName: students[7].name, type: 'Condition', title: 'Mild asthma', description: 'Inhaler needed during PE.', severity: 'Moderate', date: dOff(-90), recordedByName: 'Nurse Betty', createdAt: nowIso(9000) },
    { id: 'hlt-3', studentId: 'stu-12', studentName: students[11].name, type: 'Medication', title: 'Daily multivitamin', description: 'Administered at lunch.', severity: 'Low', date: dOff(-10), recordedByName: 'Nurse Betty', createdAt: nowIso(2000) },
    { id: 'hlt-4', studentId: 'stu-demo', studentName: 'Jane Doe', type: 'Immunization', title: 'TDAP booster', description: 'No adverse reactions.', severity: 'Low', date: dOff(-200), recordedByName: 'Nurse Betty', createdAt: nowIso(12000) },
    { id: 'hlt-5', studentId: 'stu-15', studentName: students[14].name, type: 'Clinic Visit', title: 'Fever, sent home', description: 'Temperature 101°F, guardian notified.', severity: 'High', date: dOff(-3), recordedByName: 'Nurse Betty', createdAt: nowIso(800) },
  ]
  const routes = [
    { id: 'rte-1', routeName: 'Route 1 — Kingston Hills', driverName: 'Mr. Brown', driverPhone: '555-0201', vehicleNo: 'BUS-101', capacity: 30, morningPickup: '6:45 AM', eveningDrop: '3:30 PM', stops: ['Half Way Tree', 'Cross Roads', 'Liguanea'] },
    { id: 'rte-2', routeName: 'Route 2 — Harbour View', driverName: 'Mr. Green', driverPhone: '555-0202', vehicleNo: 'BUS-102', capacity: 24, morningPickup: '6:30 AM', eveningDrop: '3:30 PM', stops: ['Papine', 'August Town'] },
  ]
  const busAssignments = [
    { id: 'bas-1', routeId: 'rte-1', routeName: routes[0].routeName, studentId: 'stu-1', studentName: students[0].name, studentClass: students[0].className, createdAt: nowIso(5000) },
    { id: 'bas-2', routeId: 'rte-1', routeName: routes[0].routeName, studentId: 'stu-2', studentName: students[1].name, studentClass: students[1].className, createdAt: nowIso(4800) },
    { id: 'bas-3', routeId: 'rte-2', routeName: routes[1].routeName, studentId: 'stu-demo', studentName: 'Jane Doe', studentClass: '10A', createdAt: nowIso(4000) },
  ]
  const mealAccounts = [
    { id: 'mal-1', userId: 'stu-demo', userName: 'Jane Doe', balance: 2450, dietaryTags: ['Vegetarian'], mealPlan: 'Premium', updatedAt: nowIso(100) },
    { id: 'mal-2', userId: 'stu-1', userName: students[0].name, balance: 850, dietaryTags: [], mealPlan: 'Standard', updatedAt: nowIso(300) },
    { id: 'mal-3', userId: 'stu-2', userName: students[1].name, balance: 4100, dietaryTags: ['Halal'], mealPlan: 'Standard', updatedAt: nowIso(700) },
  ]
  const mealTransactions = [
    { id: 'mtr-1', accountId: 'mal-1', type: 'Topup', amount: 2500, description: 'Online top-up', date: dOff(-4), createdAt: nowIso(5800) },
    { id: 'mtr-2', accountId: 'mal-1', type: 'Purchase', amount: 450, description: 'Lunch — jerk chicken bowl', date: dOff(-1), createdAt: nowIso(200) },
  ]
  const visitors = [
    { id: 'vis-1', name: 'Carol Simpson', phone: '555-0301', email: 'carol@example.com', purpose: 'Parent Visit', visitingWhom: students[3].name, checkInTime: nowIso(45), checkOutTime: null, status: 'Checked In', gatePassNo: 'GP-0142', checkedInByName: 'Dr. Admin', createdAt: nowIso(45) },
    { id: 'vis-2', name: 'Peter Grant', phone: '555-0302', email: '', purpose: 'Delivery', visitingWhom: 'Front Office', checkInTime: nowIso(180), checkOutTime: nowIso(120), status: 'Checked Out', gatePassNo: 'GP-0141', checkedInByName: 'Dr. Admin', createdAt: nowIso(180) },
    { id: 'vis-3', name: 'Michelle Reid', phone: '555-0303', email: 'michelle@example.com', purpose: 'Meeting', visitingWhom: 'Principal', checkInTime: nowIso(25), checkOutTime: null, status: 'Checked In', gatePassNo: 'GP-0143', checkedInByName: 'Dr. Admin', createdAt: nowIso(25) },
  ]
  const inventory = [
    { id: 'inv-1', name: 'Projector (Epson)', category: 'Equipment', quantity: 6, unit: 'pcs', condition: 'Good', location: 'Block B', minStock: 2, notes: '', updatedAt: nowIso(3000) },
    { id: 'inv-2', name: 'Whiteboard Markers', category: 'Stationery', quantity: 4, unit: 'boxes', condition: 'New', location: 'Store Room', minStock: 10, notes: 'Reorder soon', updatedAt: nowIso(2000) },
    { id: 'inv-3', name: 'Lab Goggles', category: 'Lab Supply', quantity: 45, unit: 'pcs', condition: 'Good', location: 'Lab 1', minStock: 20, notes: '', updatedAt: nowIso(8000) },
    { id: 'inv-4', name: 'Student Desks', category: 'Furniture', quantity: 120, unit: 'pcs', condition: 'Fair', location: 'Various', minStock: 0, notes: '', updatedAt: nowIso(20000) },
    { id: 'inv-5', name: 'CSEC Math Textbooks', category: 'Textbook', quantity: 30, unit: 'books', condition: 'New', location: 'Library', minStock: 15, notes: '', updatedAt: nowIso(9000) },
  ]
  const facilities = [
    { id: 'fac-1', name: 'Main Hall', type: 'Hall', capacity: 300, location: 'Block A', isBookable: true, notes: '' },
    { id: 'fac-2', name: 'Science Lab 1', type: 'Lab', capacity: 30, location: 'Block C', isBookable: true, notes: 'Book with HOD.' },
    { id: 'fac-3', name: 'Football Field', type: 'Field', capacity: 100, location: 'East Grounds', isBookable: true, notes: '' },
    { id: 'fac-4', name: 'Meeting Room 2', type: 'Room', capacity: 12, location: 'Admin Block', isBookable: true, notes: '' },
  ]
  const bookings = [
    { id: 'bkg-1', facilityId: 'fac-1', facilityName: 'Main Hall', facilityType: 'Hall', requestedById: 'staff-teacher', requestedByName: 'Ms. Teacher', title: 'Science Fair setup', purpose: 'Science Fair', date: d(12), startTime: '08:00', endTime: '15:00', status: 'Approved', reviewedByName: 'Dr. Admin', createdAt: nowIso(4000) },
    { id: 'bkg-2', facilityId: 'fac-4', facilityName: 'Meeting Room 2', facilityType: 'Room', requestedById: 'staff-teacher2', requestedByName: 'Mr. Shakespeare', title: 'Literacy committee', purpose: 'Planning', date: dOff(2), startTime: '13:00', endTime: '14:00', status: 'Pending', reviewedByName: null, createdAt: nowIso(60) },
  ]
  const admissions = [
    { id: 'adm-1', applicantName: 'Kemar Walker', email: 'kemar.w@example.com', phone: '555-0401', dob: '2013-04-11', gender: 'Male', gradeApplied: 7, parentName: 'Olive Walker', parentPhone: '555-0402', parentEmail: 'olive@example.com', address: '12 Cross Roads, Kingston', previousSchool: 'Half Way Tree Primary', status: 'Pending', notes: '', reviewedByName: null, createdAt: nowIso(3000) },
    { id: 'adm-2', applicantName: 'Sasha Bell', email: 'sasha.bell@example.com', phone: '555-0403', dob: '2012-09-02', gender: 'Female', gradeApplied: 8, parentName: 'Rita Bell', parentPhone: '555-0404', parentEmail: 'rita@example.com', address: '8 Harbour View', previousSchool: 'Vauxhall Primary', status: 'Reviewing', notes: 'Strong math scores.', reviewedByName: 'Dr. Admin', createdAt: nowIso(8000) },
    { id: 'adm-3', applicantName: 'Jordan Pinnock', email: 'jordan.p@example.com', phone: '555-0405', dob: '2011-01-23', gender: 'Male', gradeApplied: 9, parentName: 'Dean Pinnock', parentPhone: '555-0406', parentEmail: 'dean@example.com', address: '5 Constant Spring Rd', previousSchool: 'St. Hugh\u2019s Prep', status: 'Accepted', notes: '', reviewedByName: 'Dr. Admin', createdAt: nowIso(20000) },
  ]
  const terms = [
    { id: 'trm-1', name: 'Term 1', startDate: yr + '-09-01', endDate: yr + '-12-12', isActive: true, holidays: [{ date: d(15), name: 'Heroes Day' }, { date: yr + '-11-03', name: 'Mid-term Break' }], examWeeks: [{ startDate: d(5), endDate: d(9), name: 'Midterms' }] },
    { id: 'trm-2', name: 'Term 2', startDate: (yr + 1) + '-01-05', endDate: (yr + 1) + '-04-02', isActive: false, holidays: [], examWeeks: [] },
  ]
  const reviews = [
    { id: 'prf-1', subjectId: 'staff-teacher', subjectName: 'Ms. Teacher', subjectRole: 'Teacher', reviewerId: 'staff-admin', reviewerName: 'Dr. Admin', period: 'Term 1', rating: 5, teaching: 5, punctuality: 4, professionalism: 5, studentEngagement: 5, comments: 'Outstanding classroom management.', goals: 'Lead a STEM club.', createdAt: nowIso(9000) },
    { id: 'prf-2', subjectId: 'staff-teacher2', subjectName: 'Mr. Shakespeare', subjectRole: 'Teacher', reviewerId: 'staff-admin', reviewerName: 'Dr. Admin', period: 'Term 1', rating: 4, teaching: 4, punctuality: 5, professionalism: 4, studentEngagement: 3, comments: 'Consistent and reliable.', goals: 'More interactive lessons.', createdAt: nowIso(9001) },
  ]
  const budgets = [
    { id: 'bud-1', category: 'Salaries', allocated: 4800000, spent: 1600000, period: 'Term 1' },
    { id: 'bud-2', category: 'Supplies', allocated: 300000, spent: 145000, period: 'Term 1' },
    { id: 'bud-3', category: 'Maintenance', allocated: 150000, spent: 92000, period: 'Term 1' },
    { id: 'bud-4', category: 'Events', allocated: 80000, spent: 18500, period: 'Term 1' },
  ]
  const expenses = [
    { id: 'exp-1', budgetId: 'bud-2', description: 'Printer paper & toner', amount: 45000, category: 'Supplies', date: dOff(-5), recordedByName: 'Dr. Admin', createdAt: nowIso(7000) },
    { id: 'exp-2', budgetId: 'bud-3', description: 'Plumbing repairs — Block B', amount: 32000, category: 'Maintenance', date: dOff(-9), recordedByName: 'Dr. Admin', createdAt: nowIso(14000) },
    { id: 'exp-3', budgetId: null, description: 'Sports day refreshments', amount: 18500, category: 'Events', date: dOff(-2), recordedByName: 'Mrs. principal', createdAt: nowIso(2900) },
  ]
  const conferenceSlots = [
    { id: 'csl-1', teacherId: 'staff-teacher', teacherName: 'Ms. Teacher', date: dOff(4), startTime: '15:00', endTime: '15:15', isBooked: false, bookingStudentName: null, bookingParentName: null, bookingStatus: null },
    { id: 'csl-2', teacherId: 'staff-teacher', teacherName: 'Ms. Teacher', date: dOff(4), startTime: '15:15', endTime: '15:30', isBooked: true, bookingStudentName: 'Jane Doe', bookingParentName: 'Alice Doe', bookingStatus: 'Confirmed' },
    { id: 'csl-3', teacherId: 'staff-teacher', teacherName: 'Ms. Teacher', date: dOff(4), startTime: '15:30', endTime: '15:45', isBooked: false, bookingStudentName: null, bookingParentName: null, bookingStatus: null },
    { id: 'csl-4', teacherId: 'staff-teacher2', teacherName: 'Mr. Shakespeare', date: dOff(5), startTime: '15:00', endTime: '15:15', isBooked: false, bookingStudentName: null, bookingParentName: null, bookingStatus: null },
  ]
  const schoolEvents = [
    { id: 'sev-1', title: 'Inter-house Sports Day', type: 'Sports', description: 'Annual track & field championship.', date: d(25), startTime: '09:00', endTime: '15:00', venue: 'Football Field', status: 'Planned', participantCount: 2, createdAt: nowIso(9000) },
    { id: 'sev-2', title: 'Science Fair', type: 'Science', description: 'Students present STEM projects.', date: d(12), startTime: '10:00', endTime: '14:00', venue: 'Main Hall', status: 'Planned', participantCount: 1, createdAt: nowIso(9001) },
    { id: 'sev-3', title: 'Culture Day', type: 'Cultural', description: 'Food, music and dance.', date: dOff(20), startTime: '11:00', endTime: '16:00', venue: 'Courtyard', status: 'Planned', participantCount: 0, createdAt: nowIso(9002) },
  ]
  const eventParticipants = [
    { id: 'ept-1', eventId: 'sev-1', userId: 'stu-1', userName: students[0].name, userRole: 'Student', role: 'Participant', createdAt: nowIso(800) },
    { id: 'ept-2', eventId: 'sev-1', userId: 'stu-demo', userName: 'Jane Doe', userRole: 'Student', role: 'Participant', createdAt: nowIso(700) },
    { id: 'ept-3', eventId: 'sev-2', userId: 'stu-3', userName: students[2].name, userRole: 'Student', role: 'Participant', createdAt: nowIso(600) },
  ]
  const uniformItems = [
    { id: 'uni-1', name: 'School Shirt', category: 'Shirt', sizes: ['S', 'M', 'L', 'XL'], price: 2500, stock: 48 },
    { id: 'uni-2', name: 'School Pants', category: 'Pants', sizes: ['28', '30', '32', '34'], price: 3800, stock: 22 },
    { id: 'uni-3', name: 'School Skirt', category: 'Skirt', sizes: ['S', 'M', 'L'], price: 3600, stock: 3 },
    { id: 'uni-4', name: 'School Tie', category: 'Tie', sizes: ['One size'], price: 900, stock: 60 },
  ]
  const uniformAllocations = [
    { id: 'ual-1', uniformId: 'uni-1', uniformName: 'School Shirt', userId: 'stu-demo', userName: 'Jane Doe', size: 'M', quantity: 2, status: 'Issued', date: dOff(-30), createdAt: nowIso(44000) },
    { id: 'ual-2', uniformId: 'uni-4', uniformName: 'School Tie', userId: 'stu-1', userName: students[0].name, size: 'One size', quantity: 1, status: 'Issued', date: dOff(-25), createdAt: nowIso(36000) },
  ]
  const alumni = [
    { id: 'alm-1', name: 'Christopher Martin', email: 'chris.m@example.com', admissionNo: 'EDU-2015-044', gradYear: 2015, lastGrade: 11, lastClass: '11A', avatar: null, bio: 'Software engineer in Kingston.', phone: '555-0501', status: 'Active' },
    { id: 'alm-2', name: 'Simone Edwards', email: 'simone.e@example.com', admissionNo: 'EDU-2016-051', gradYear: 2016, lastGrade: 11, lastClass: '11B', avatar: null, bio: 'Registered nurse.', phone: '555-0502', status: 'Active' },
    { id: 'alm-3', name: 'Dwayne Fraser', email: 'dwayne.f@example.com', admissionNo: 'EDU-2018-037', gradYear: 2018, lastGrade: 11, lastClass: '11A', avatar: null, bio: 'Studying architecture.', phone: '', status: 'Active' },
  ]

  const notifications = [
    { id: 'ntf-1', userId: 'staff-teacher', title: 'Grades due Friday', body: 'Term 1 grade submission closes this Friday.', type: 'warning', read: false, createdAt: nowIso(300) },
    { id: 'ntf-2', userId: 'staff-teacher', title: 'New assignment submitted', body: 'A student turned in "Algebra Worksheet 4".', type: 'success', read: false, createdAt: nowIso(90) },
    { id: 'ntf-3', userId: 'staff-teacher', title: 'Staff meeting at 3 PM', body: 'Short agenda: midterm schedule.', type: 'info', read: false, createdAt: nowIso(60) },
    { id: 'ntf-4', userId: 'staff-teacher', title: 'Message from Dr. Admin', body: 'Reminder: grade submission deadline.', type: 'message', read: false, createdAt: nowIso(240) },
    { id: 'ntf-5', userId: 'staff-teacher', title: 'Exam timetable published', body: 'Midterm timetable is now visible to students.', type: 'assignment', read: false, createdAt: nowIso(20) },
    { id: 'ntf-6', userId: 'staff-admin', title: 'New student registered', body: 'A new admission form was submitted.', type: 'info', read: true, createdAt: nowIso(1000) },
    { id: 'ntf-7', userId: 'stu-demo', title: 'New assignment', body: 'Algebra Worksheet 4 is now due.', type: 'assignment', read: true, createdAt: nowIso(2000) },
    { id: 'ntf-8', userId: 'stu-demo', title: 'Message from Ms. Teacher', body: 'Welcome to the new school term!', type: 'message', read: true, createdAt: nowIso(2001) },
  ]

  const messages = [
    { id: 'msg-1', fromId: 'staff-teacher', fromName: 'Ms. Teacher', fromRole: 'Teacher', toId: 'stu-demo', toName: 'Jane Doe', toRole: 'Student', body: 'Welcome to the new school term, Jane! Let me know if you need help with the algebra worksheet.', read: true, createdAt: nowIso(2880) },
    { id: 'msg-2', fromId: 'staff-admin', fromName: 'Dr. Admin', fromRole: 'Admin', toId: 'staff-teacher', toName: 'Ms. Teacher', toRole: 'Teacher', body: 'Reminder: grade submission deadline is this Friday.', read: false, createdAt: nowIso(120) },
  ]

  const submissions = []

  return {
    settings: {
      id: 'singleton', name: 'School Name', tagline: 'School Information Management System (SIMS)',
      accent: '5,150,105|4,120,87|16,185,129', email: 'info@educenter.edu', phone: '+1 876 555 0100',
      address: '123 Education Lane, Kingston, Jamaica', logo: null, features: {}, version: 1,
    },
    staff, students, attendance, grades, fees, discipline, events, assignments, exams,
    messages, notifications, books, loans, health, routes, busAssignments, mealAccounts,
    mealTransactions, visitors, inventory, facilities, bookings, admissions, terms, reviews,
    budgets, expenses, conferenceSlots, conferenceBookings: [], schoolEvents, eventParticipants,
    uniformItems, uniformAllocations, alumni, submissions,
  }
}

export const DB = {
  data: null,
  load() {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) { this.data = JSON.parse(raw); return }
    } catch { /* corrupted — reseed */ }
    this.data = fresh()
    this.save()
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)) } catch { /* quota */ } },
  reset() { this.data = fresh(); this.save() },
}

// ---------- shared formatting helpers ----------
export const initials = (name) => (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
export function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h ago'
  const d = Math.floor(h / 24)
  if (d < 7) return d + 'd ago'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
export function gradeToForm(g) {
  if (!g) return '-'
  const map = { 7: '1st Form', 8: '2nd Form', 9: '3rd Form', 10: '4th Form', 11: '5th Form', 12: 'Lower 6th', 13: 'Upper 6th' }
  return map[g] || `${g}th`
}
export function scoreToLetter(score) {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 75) return 'A-'
  if (score >= 70) return 'B+'
  if (score >= 65) return 'B'
  if (score >= 60) return 'B-'
  if (score >= 55) return 'C+'
  if (score >= 50) return 'C'
  if (score >= 45) return 'C-'
  if (score >= 40) return 'D'
  return 'F'
}
export const letterClass = (l) => (l?.startsWith('A') ? 'badge-soft' : l?.startsWith('B') ? 'badge-teal' : l?.startsWith('C') || l === 'D' ? 'badge-warn' : l === 'F' ? 'badge-danger' : 'badge-muted')
export const fmtDate = (iso, opts) => new Date(iso + (iso && iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric', year: 'numeric' })
export const fmtMoney = (cents) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const todayStr = today
export const dateOffset = dOff
export function nowTime() { return new Date().toTimeString().slice(0, 5) }
export function csvDownload(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
export function printHtml(title, bodyHtml) {
  const w = window.open('', '_blank', 'width=800,height=900')
  if (!w) return
  w.document.write(`<!doctype html><html><head><title>${title}</title><style>
    body{font-family:Georgia,serif;margin:40px;color:#111}
    h1{font-size:22px;margin:0} .sub{color:#666;font-size:13px;margin-top:4px}
    .rule{border-top:3px solid #10b981;margin:14px 0 20px}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th,td{border:1px solid #ddd;padding:8px 10px;text-align:left}
    th{background:#f2f7f5}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-size:14px;margin:14px 0}
    .sign{display:flex;justify-content:space-between;margin-top:56px;font-size:13px}
    .sign span{border-top:1px solid #999;padding-top:4px;width:200px;text-align:center}
    .remark{background:#f6faf8;border:1px solid #d9e8e1;padding:12px;margin-top:16px;font-size:14px}
    .center{text-align:center}
  </style></head><body>${bodyHtml}</body></html>`)
  w.document.close()
  setTimeout(() => w.print(), 400)
}
