# Login System

Authentication system with React, Node.js, and Supabase.

## Tech Stack
- **Frontend**: React
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)

## Quick Setup

### 1. Database Setup
1. Create Supabase project at https://supabase.com
2. Go to SQL Editor
3. Run the SQL from `database/schema.sql`
4. Fix RLS policies (if needed):
   ```sql
   DROP POLICY IF EXISTS users_select_policy ON users;
   DROP POLICY IF EXISTS sessions_select_policy ON sessions;
   
   CREATE POLICY "Backend can read users" ON users FOR SELECT USING (true);
   CREATE POLICY "Backend can update users" ON users FOR UPDATE USING (true);
   CREATE POLICY "Backend can read sessions" ON sessions FOR SELECT USING (true);
   CREATE POLICY "Backend can insert sessions" ON sessions FOR INSERT WITH CHECK (true);
   CREATE POLICY "Backend can delete sessions" ON sessions FOR DELETE USING (true);
   ```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` with your Supabase credentials:
- **SUPABASE_URL**: Settings > API > Project URL
- **SUPABASE_KEY**: Settings > API > anon public key  
- **JWT_SECRET**: Settings > API > JWT Settings > JWT Secret (Current)

Generate password hash for test users:
```bash
node scripts/generateHash.js
```
Update the hash in Supabase Table Editor for all test users.

Start backend:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm start
```

Browser opens at http://localhost:3000

## Test Accounts

| Email | Password | Result |
|-------|----------|--------|
| student@example.com | password123 | ✅ Login success |
| admin@example.com | password123 | ✅ Login success |
| blocked@example.com | password123 | ❌ Account blocked |
| inactive@example.com | password123 | ❌ Account inactive |

## Project Structure

- **LoginPage** → `frontend/src/pages/LoginPage.js`
- **AuthController** → `backend/controllers/AuthController.js`
- **User Model** → `backend/models/User.js`
- **Session Model** → `backend/models/Session.js`

## Troubleshooting

**Port 5000 in use**: Change to 5001 in `backend/.env` and `frontend/.env`

**Login fails**: Make sure you updated password hash in Supabase (see step 2)

**PGRST116 error**: Run RLS policy fix from step 1
