# 🎓 Campus Event Management System

A full-stack web platform built to streamline how campus events are organised, discovered, and managed — all in one place.

Whether you're a student looking for what's happening around campus, an event organiser coordinating a seminar, or a faculty staff reviewing venue bookings and providing feedback — this system handles it all with role-based access, smart visibility rules, and a clean interface.

---

## ✨ What It Does

The platform serves four distinct user roles, each with their own experience:

| Role | What They Can Do |
|------|-----------------|
| 🎒 **Student** | Browse events, register for them, fill custom forms, manage invitations, view personal calendar |
| 📋 **Event Organiser** | Create and manage events, book venues, request resources, track registrations and attendance |
| 🏫 **Faculty Staff** | Review events within their faculty, approve/decline venue & resource requests, submit feedback |
| 🛡️ **Administrator** | Full system access — manage users, faculties, venues, resources, system settings, and view reports |

---

## 🔑 Core Features

### Events
- Create events with different types (workshop, seminar, sports, etc.) and statuses
- Three visibility levels: **Campus-wide**, **Faculty-only**, and **Invite-only**
- Send and manage event invitations
- Custom registration forms — organisers can add extra fields for participants to fill in
- Participant check-in and attendance recording

#### Event Visibility Rules

| Visibility | Who Can Access |
|------------|---------------|
| 🌐 **Campus-wide** | All logged-in users |
| 🏫 **Faculty-only** | Users in the same faculty as the organiser |
| 💌 **Invite-only** | Users with an accepted invitation |

> Admins can see all events regardless of visibility. Organisers always see their own events.

### Venues & Resources
- Browse venue availability with time-slot based booking
- Submit and track venue booking requests through an approval workflow
- Request equipment and resources (projectors, microphones, etc.) for events
- Faculty staff can approve, decline, or comment on requests

### People & Discovery
- Role-based dashboards tailored to each user type
- Personal calendar view for registered events
- Faculty-scoped access control — faculty events are visible only within the right department
- Profile management for all users

### Reporting
- Organisers can view participation stats and event reports
- Admins have access to analytics across the whole system

---

## 🏗️ Architecture

```
sefproject/
├── frontend/        # React 18 SPA (React Router)
├── backend/         # Node.js + Express REST API
└── database/        # Supabase (PostgreSQL) schema & seed data
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL) |
| Auth | JWT + bcrypt |
| Env security | git-crypt |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v14+
- npm or yarn
- A [Supabase](https://supabase.com) account
- `git-crypt` (only if you're a collaborator with an encrypted key)

---

### 1. Database Setup

1. Create a new project in Supabase
2. Open the **SQL Editor** and run the full `database/schema.sql` file

This sets up all tables, Row Level Security policies, indexes, and sample seed data (users, events, venues, bookings, resources, and more).

---

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
PORT=5001
```

Find these in your Supabase dashboard under **Settings → API**.

```bash
npm run dev
# Runs at http://localhost:5001
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5001
```

```bash
npm start
# Opens at http://localhost:3000
```

---

### Team Members (Encrypted Env Files)

If you were given a `git-crypt-key` file:

```bash
brew install git-crypt
git-crypt unlock git-crypt-key
```

Then jump straight to the backend/frontend setup steps above.

---

## 🧪 Test Accounts

All accounts use the password: `password123`

<details>
<summary><strong>Students</strong></summary>

| Email | Name | Faculty |
|-------|------|---------|
| `john.student@student.edu` | John Student | Management |
| `emily.tan@student.edu` | Emily Tan | Computing and Informatics |
| `michael.kumar@student.edu` | Michael Kumar | Management |
| `lisa.chong@student.edu` | Lisa Chong | Business |
| `david.lim@student.edu` | David Lim | Applied Communication |
| `amy.chen@student.edu` | Amy Chen | Computing and Informatics |
| `ryan.tan@student.edu` | Ryan Tan | Business |
| `olivia.lee@student.edu` | Olivia Lee | Applied Communication |
| `kevin.wong@student.edu` | Kevin Wong | Business |

</details>

<details>
<summary><strong>Event Organisers</strong></summary>

| Email | Name |
|-------|------|
| `sarah.organizer@university.edu` | Sarah Organizer |
| `daniel.organizer@university.edu` | Daniel Organizer |
| `priya.organizer@university.edu` | Priya Organizer |

</details>

<details>
<summary><strong>Faculty Staff</strong></summary>

| Email | Name | Faculty |
|-------|------|---------|
| `alice.wong@fci.edu` | Dr. Alice Wong | Computing and Informatics |
| `robert.chen@fom.edu` | Dr. Robert Chen | Management |
| `maria.garcia@fob.edu` | Dr. Maria Garcia | Business |
| `james.lee@fac.edu` | Dr. James Lee | Applied Communication |

</details>

<details>
<summary><strong>Administrator</strong></summary>

| Email | Name |
|-------|------|
| `admin@university.edu` | System Administrator |

</details>

---

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| `git-crypt: command not found` | `brew install git-crypt` |
| `.env` files unreadable | `git-crypt unlock git-crypt-key` |
| Port 5001 already in use | Change `PORT` in `backend/.env` and update `REACT_APP_API_URL` |
| `PGRST116` error | Re-run `database/schema.sql` (RLS policies missing) |
| Login fails | Check that seed data was inserted correctly |
| `401 Unauthorized` | Session expired — log in again |
| CORS errors | Make sure `REACT_APP_API_URL` matches the running backend port |
| Blank frontend page | Check browser console for JS errors |
| Redirect loops | Clear browser storage and cookies |

---

## 📝 License

This project is open for reference and learning purposes.
