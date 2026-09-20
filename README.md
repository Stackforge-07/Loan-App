# ArthSetu — Self-Help Group Savings & Micro-Loan Tracker

> **Transparent Savings. Smarter Group Finance.**

ArthSetu ("Bridge of Finance") is a full-stack web application that helps Self-Help Groups (SHGs) digitally manage member savings, loans, repayments, and financial records in one simple platform.

⚠️ **Disclaimer:** This is an academic software project. It is not a bank, lender, financial institution, or regulated financial service. All loan/interest calculations are application-level examples for educational purposes.

---

## 🎯 Problem Statement

Build a web-based Self-Help Group Savings & Micro-Loan Tracker for managing member savings, loans, repayments, and group-level financial records transparently.

## ✨ Features

### Member Features
- ✅ Registration & Login (session-based auth)
- ✅ Personal Dashboard with real-time financial stats
- ✅ Digital Savings Passbook with filter & search
- ✅ Loan Request with live interest calculation
- ✅ Loan Status Tracking with installment schedules
- ✅ Repayment History
- ✅ In-App Notifications
- ✅ Profile Management

### Admin (Group Leader) Features
- ✅ Financial Dashboard with charts (Chart.js)
- ✅ Group Management (CRUD)
- ✅ Member Management (search, filter, paginate, deactivate)
- ✅ Record Monthly Savings Contributions
- ✅ Loan Review (Approve / Reject with reasons)
- ✅ Loan Disbursement with auto-generated installment schedules
- ✅ Repayment Recording with cascading installment updates
- ✅ Interest Calculation (Simple Interest)
- ✅ Overdue Repayment Tracking
- ✅ Reports with CSV Export
- ✅ In-App Notifications

---

## 👥 User Roles

| Role | Access |
|------|--------|
| **Member** | View savings, request loans, view repayments, manage profile |
| **Admin** | Manage groups, members, savings, loans, repayments, reports |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | EJS, HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Auth | Session-based (express-session + connect-mongo) |
| Security | bcryptjs, Helmet, express-validator |
| Charts | Chart.js |
| Icons | Inline SVG |
| Fonts | Inter (Google Fonts) |

---

## 📁 Architecture (MVC)

```
project/
├── app.js                    # Express app entry point
├── package.json
├── .env                      # Environment variables
├── .gitignore
│
├── config/
│   └── db.js                 # MongoDB connection
│
├── models/
│   ├── User.js               # User model with bcrypt
│   ├── Group.js              # SHG Group model
│   ├── SavingsTransaction.js # Monthly savings
│   ├── Loan.js               # Loan with interest calc
│   ├── Installment.js        # Repayment schedule
│   ├── Repayment.js          # Payment records
│   └── Notification.js       # In-app notifications
│
├── controllers/              # Business logic
├── routes/                   # Express route definitions
├── middleware/                # Auth, validation, errors
│
├── views/
│   ├── partials/             # Reusable EJS components
│   ├── auth/                 # Login & Register
│   ├── member/               # Member dashboard & pages
│   ├── admin/                # Admin dashboard & pages
│   └── errors/               # 404, 401, 403, 500
│
├── public/
│   ├── css/                  # Design system & responsive
│   └── js/                   # Client-side JavaScript
│
└── seed/
    └── seed.js               # Demo data seeder
```

---

## 📊 Database Schema

### User
`name, email, password, phone, role, groupId, address, joinDate, status, totalSavings`

### Group
`name, groupId, leaderId, location, description, status`

### SavingsTransaction
`memberId, groupId, amount, month, year, date, runningBalance, recordedBy`

### Loan
`loanId, memberId, groupId, principalAmount, purpose, tenure, interestRate, totalPayable, amountPaid, outstandingBalance, status, rejectionReason, requestedAt, approvedAt, disbursedAt, completedAt`

### Installment
`loanId, memberId, installmentNumber, dueDate, amount, paidAmount, status, paidAt`

### Repayment
`loanId, memberId, installmentId, amount, paymentDate, paymentMethod, notes, recordedBy`

### Notification
`userId, title, message, type, isRead, link`

---

## 🚀 Installation

### Prerequisites
- Node.js v16+
- MongoDB Atlas account (free tier works)

### Steps

1. **Clone the repository**
```bash
git clone <repo-url>
cd project
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root:
```env
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/arthsetu?retryWrites=true&w=majority
SESSION_SECRET=your_super_secret_session_key
PORT=5000
NODE_ENV=development
```

4. **Seed demo data** (optional but recommended)
```bash
npm run seed
```

5. **Start development server**
```bash
npm run dev
```

6. **Open in browser**
```
http://localhost:5000
```

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@arthsetu.com | Admin@123 |
| Member | priya@arthsetu.com | Member@123 |

> All demo members use password: `Member@123`

---

## 🛣️ Main Routes

### Authentication
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Landing page |
| GET/POST | `/login` | Login |
| GET/POST | `/register` | Register |
| POST | `/logout` | Logout |

### Member Routes (requires auth + member role)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/member/dashboard` | Dashboard |
| GET | `/member/profile` | Profile |
| GET | `/member/savings` | Savings passbook |
| GET | `/member/loans` | Loan list |
| GET | `/member/loans/request` | Loan request form |
| POST | `/member/loans/request` | Submit loan request |
| GET | `/member/loans/:id` | Loan detail |
| GET | `/member/repayments` | Repayment history |
| GET | `/member/notifications` | Notifications |

### Admin Routes (requires auth + admin role)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/dashboard` | Dashboard with charts |
| GET/POST | `/admin/groups` | Group management |
| GET | `/admin/members` | Member list |
| GET/POST | `/admin/savings` | Record savings |
| GET | `/admin/loans` | Loan management |
| POST | `/admin/loans/:id/status` | Approve/reject/disburse |
| GET/POST | `/admin/repayments` | Record repayments |
| GET | `/admin/overdue` | Overdue installments |
| GET | `/admin/reports` | Reports & CSV export |

---

## 🔒 Security

- bcrypt password hashing (12 rounds)
- Session-based authentication with MongoDB store
- Role-based route protection middleware
- Helmet security headers
- express-validator input validation
- Mongoose schema validation
- Environment variables for secrets
- No plain-text password storage

---

## 📱 Responsive Design

Fully responsive across:
- Desktop (fixed sidebar)
- Tablet (adapted grid layouts)
- Mobile (collapsible hamburger sidebar)

---

## 🚀 Deployment

### Production
```bash
npm start
```

### Environment
Set `NODE_ENV=production` and use a strong `SESSION_SECRET`.

Compatible with: **Render**, **Vercel**, **Railway**, **AWS**.

---

## 🔮 Future Scope

- SMS / Email notifications
- Multi-group admin support
- Meeting minutes tracking
- Document uploads (ID proof, photos)
- Hindi / regional language support
- Progressive Web App (PWA)
- Advanced analytics & predictions
- Audit trail / activity logs
- Member-to-member lending
- Group chat / communication

---

## 📝 License

MIT — Built for educational purposes.
