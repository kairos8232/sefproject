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

2. **Install dotenv**:
   ```bash
   npm install dotenv
   ```

3. **Get the encryption key** from your team lead (shared privately)
   - Save `git-crypt-key` in the project root

4. **Unlock the encrypted files**:
   ```bash
   git-crypt unlock git-crypt-key
   ```

5. **Verify**:
   ```bash
   cat backend/.env
   cat frontend/.env
   ```
   
   If you see readable text, you're all set! Skip to **Step 2: Backend Setup**.

---

### Step 1: Database Setup

1. Create a new project at [Supabase](https://supabase.com)

2. Go to **SQL Editor** and run the entire `database/schema.sql` file
   - This creates all tables (users, sessions, faculties, venues, events, venue_bookings, event_invitations, event_participation, event_registration_fields/responses, resource_types/requests, etc.)
   - Includes sample data for testing (events, invitations, participations, custom forms, resources)

3. The schema automatically handles:
   - Row Level Security (RLS) policies
   - Indexes for performance
   - Sample users with different roles
   - Sample events, venue bookings, resource requests
   - Sample invitations, participations, and custom registration forms

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

| Email | Name | Role | Faculty | Staff ID |
|-------|------|------|---------|----------|
| `john.student@student.edu` | John Student | Student | Management | S001 |
| `emily.tan@student.edu` | Emily Tan | Student | Computing and Informatics | S004 |
| `michael.kumar@student.edu` | Michael Kumar | Student | Management | S005 |
| `lisa.chong@student.edu` | Lisa Chong | Student | Business | S006 |
| `david.lim@student.edu` | David Lim | Student | Applied Communication | S007 |
| `amy.chen@student.edu` | Amy Chen | Student | Computing and Informatics | S008 |
| `ryan.tan@student.edu` | Ryan Tan | Student | Business | S009 |
| `olivia.lee@student.edu` | Olivia Lee | Student | Applied Communication | S010 |
| `kevin.wong@student.edu` | Kevin Wong | Student | Business | S011 |
| `sarah.organizer@university.edu` | Sarah Organizer | Event Organizer | *(no faculty)* | EO001 |
| `daniel.organizer@university.edu` | Daniel Organizer | Event Organizer | *(no faculty)* | EO002 |
| `priya.organizer@university.edu` | Priya Organizer | Event Organizer | *(no faculty)* | EO003 |
| `alice.wong@fci.edu` | Dr. Alice Wong | Faculty Staff | Computing and Informatics | FM001 |
| `robert.chen@fom.edu` | Dr. Robert Chen | Faculty Staff | Management | FM003 |
| `maria.garcia@fob.edu` | Dr. Maria Garcia | Faculty Staff | Business | FM004 |
| `james.lee@fac.edu` | Dr. James Lee | Faculty Staff | Applied Communication | FM005 |
| `admin@university.edu` | System Administrator | Administrator | *(no faculty)* | ADM001 |
| `blocked.user@student.edu` | Blocked User | Student | *(inactive)* | S002 |
| `inactive.user@student.edu` | Inactive User | Student | *(inactive)* | S003 |

## 🎯 Features Implemented

### Core Features
- ✅ **User Authentication**: Login/logout with JWT and bcrypt, role-based access control
- ✅ **Session Management**: Sliding window sessions (15-min expiry, auto-extends on activity)
- ✅ **Event Management**: Create, browse, edit, cancel events with multiple types and statuses
- ✅ **Event Visibility Rules**: Campus-wide, faculty-only, and invite-only access control
- ✅ **Event Invitations**: Send, accept, decline invitations with messages and response notes
- ✅ **Participant Registration**: Track registrations with capacity limits and check-in status
- ✅ **Custom Registration Forms**: Add custom fields to events and collect participant responses
- ✅ **Venue Booking Management**: Request, approve, decline venue bookings with time slots
- ✅ **Resource Requests**: Request equipment/resources for events (projectors, mics, etc.)
- ✅ **Event Feedback**: Faculty staff can provide feedback on completed events
- ✅ **Profile Management**: Users can edit profile information and view their details
- ✅ **Faculty Management**: Organize users by faculties/departments

### 🎫 Event Visibility Rules

The system implements three visibility levels:

| Visibility | Who Can See | Access Rule | Use Cases |
|------------|-------------|-------------|-----------|
| **🌐 Campus-wide** | All logged-in users | No restrictions | Sports day, career fairs, orientation, general campus events |
| **🏫 Faculty Only** | Same faculty members only + admins | `user.faculty_id === event_organizer.faculty_id` | Department workshops, faculty seminars, internal meetings |
| **💌 Invite Only** | Invited users only + organizer + admins | Must have accepted invitation record | Private meetings, VIP events, exclusive networking |

**Key Rules:**
- Event organizers can see all their own events regardless of visibility
- Administrators can see all events across all visibility levels
- Faculty-only events are visible only to users in the same faculty as the organizer
- Invite-only events require an accepted invitation to appear in event listings
- Participant counts for invite-only events reflect accepted invitations only
- Event organizers are automatically registered as participants when creating events

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
