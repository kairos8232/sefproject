# Event Management System

A comprehensive campus event management platform with authentication, event browsing, and venue booking capabilities built with React, Node.js, and Supabase.

## 🚀 Tech Stack

- **Frontend**: React 18 with React Router
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with bcrypt
- **Security**: git-crypt for environment files

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account
- git-crypt (for team members accessing encrypted environment files)

## 🛠️ Setup Guide

### For Team Members (Environment Files)

If you're joining the team, you need to decrypt the environment files:

1. **Install git-crypt**:
   ```bash
   brew install git-crypt
   ```

2. **Get the encryption key** from your team lead (shared privately)
   - Save `git-crypt-key` in the project root

3. **Unlock the encrypted files**:
   ```bash
   git-crypt unlock git-crypt-key
   ```

4. **Verify**:
   ```bash
   cat backend/.env
   cat frontend/.env
   ```
   
   If you see readable text, you're all set! Skip to **Step 2: Backend Setup**.

---

### Step 1: Database Setup

1. Create a new project at [Supabase](https://supabase.com)

2. Go to **SQL Editor** and run the entire `database/schema.sql` file
   - This creates all tables: users, sessions, faculties, venues, events, venue_bookings
   - Includes sample data for testing

3. The schema automatically handles:
   - Row Level Security (RLS) policies
   - Indexes for performance
   - Sample users with different roles
   - Sample events and venue bookings

### Step 2: Backend Setup

```bash
cd backend
npm install
```

**If you're NOT a team member** (setting up fresh):
```bash
cp .env.example .env
```

Edit `backend/.env` with your Supabase credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
JWT_SECRET=your-jwt-secret
PORT=5001
```

Find these in Supabase:
- **SUPABASE_URL**: Settings > API > Project URL
- **SUPABASE_KEY**: Settings > API > Service Role Key (for backend)
- **JWT_SECRET**: Settings > API > JWT Settings > JWT Secret

**Start the backend**:
```bash
npm run dev
```

Backend runs on http://localhost:5001

### Step 3: Frontend Setup

```bash
cd frontend
npm install
```

**If you're NOT a team member**:
```bash
cp .env.example .env
```

Edit `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5001
```

**Start the frontend**:
```bash
npm start
```

Browser opens at http://localhost:3000

## 🧪 Test Accounts

All accounts use password: **password123**

### By Role:

**👨‍🎓 Students:**
- `john.student@student.edu` (no faculty)
- `emily.tan@student.edu` (Faculty of Computing and Informatics)
- `michael.kumar@student.edu` (Faculty of Management)
- `lisa.chong@student.edu` (Faculty of Business)
- `david.lim@student.edu` (Faculty of Applied Communication)

**🎪 Event Organizers:**
- `sarah.organizer@university.edu`

**👔 Faculty Managers:**
- `alice.wong@fci.edu` (Faculty of Computing and Informatics)
- `robert.chen@fom.edu` (Faculty of Management)
- `maria.garcia@fob.edu` (Faculty of Business)
- `james.lee@fac.edu` (Faculty of Applied Communication)

**🔑 Administrators:**
- `admin@university.edu`

**⚠️ Special Status (for testing errors):**
- `blocked.user@student.edu` - Account blocked
- `inactive.user@student.edu` - Account inactive

## 📁 Project Structure

```
sefproject/
├── backend/
│   ├── controllers/
│   │   ├── AuthController.js      # Login, logout, session management
│   │   └── EventController.js     # Event browsing
│   ├── models/
│   │   ├── User.js                # User database operations
│   │   ├── Session.js             # Session management
│   │   └── Event.js               # Event queries
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── eventRoutes.js
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.js       # Login interface
│   │   │   ├── HomePage.js        # Dashboard
│   │   │   ├── EventsPage.js      # Browse events with filters
│   │   │   └── EventDetailsPage.js # Event details
│   │   ├── services/
│   │   │   ├── authService.js     # Auth API calls
│   │   │   └── eventService.js    # Event API calls
│   │   └── App.js
│
└── database/
    └── schema.sql                 # Complete database schema
```

## 🎯 Features Implemented

- ✅ **UC-01**: User Login with role-based access
- ✅ **UC-02**: User Logout with session cleanup
- ✅ **UC-03**: Browse Events with filtering (status, visibility)
- ✅ Session expiration handling
- ✅ Protected routes
- ✅ Database schema with 6 tables and relationships

## 👥 Team Collaboration (For Team Lead)

### Adding New Team Members:
1. Send them the `git-crypt-key` file privately (WhatsApp/Telegram)
2. Have them follow the environment file setup steps above

### Updating Environment Variables:
Environment files are encrypted automatically when committed:
```bash
# Edit the files
nano backend/.env
nano frontend/.env

# Commit (auto-encrypts)
git add backend/.env frontend/.env
git commit -m "Update environment config"
git push
```

## 🐛 Troubleshooting

### git-crypt Issues
- **"git-crypt: command not found"**: Install with `brew install git-crypt`
- **".env files are encrypted/unreadable"**: Run `git-crypt unlock git-crypt-key`

### Port Conflicts
- **Port 5001 already in use**: Change `PORT` in `backend/.env`
- Update `REACT_APP_API_URL` in `frontend/.env` to match

### Database Issues
- **PGRST116 error**: RLS policies are missing - re-run `database/schema.sql`
- **Login fails**: Verify sample data was inserted correctly
- **Foreign key errors**: Drop tables and re-run schema (DROP statements included)

### API Issues
- **401 Unauthorized**: Check session hasn't expired (login again)
- **CORS errors**: Verify backend URL in `frontend/.env` matches running server
- **Connection refused**: Ensure backend is running on the correct port

### Frontend Issues
- **Blank page**: Check browser console for errors
- **Redirect loops**: Clear browser storage and cookies

## 📝 License

This project is for educational purposes.
