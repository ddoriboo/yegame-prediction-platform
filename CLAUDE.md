# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YeGame (예겜) is a Korean prediction market platform where users predict outcomes on various issues (politics, sports, crypto, tech, etc.) using virtual currency called "Gam" (감). The platform features a glassmorphic design with real-time probability updates based on user participation.

## Development Commands

### Running the Server
```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure required environment variables (see Environment Variables section)
3. Run `npm install` to install dependencies

### Database
- SQLite database is auto-initialized on server start
- Location: `./database/yegame.db`
- Schema auto-created via `database/init.js`
- Initial seed data is inserted if database is empty

## Architecture

### Backend Structure

**Server Entry Point**: `server.js`
- Express app with Helmet security, CORS, session management
- Passport.js integration for OAuth
- Database initialization on startup
- Serves static frontend files

**Routes** (`/routes`):
- `auth.js`: User registration, login, OAuth callbacks, email verification
- `issues.js`: CRUD operations for prediction issues
- `bets.js`: Placing bets, viewing user bet history, bet statistics

**Database** (`/database`):
- `init.js`: Database initialization, table creation, seed data
- Tables: `users`, `issues`, `bets`, `admins`

**Middleware** (`/middleware`):
- `auth.js`: JWT token verification (`authMiddleware`), admin check (`adminMiddleware`)

**Config** (`/config`):
- `passport.js`: OAuth strategies (Google, GitHub) with conditional initialization
  - Strategies only register if credentials are provided in environment
  - Prevents startup errors when OAuth is not configured

### Frontend Structure

**HTML Pages** (root directory):
- `index.html`: Main landing page with trending predictions
- `login.html`: Authentication page (login, register, OAuth)
- `issues.html`: Browse all prediction issues
- `mypage.html`: User profile and bet history
- `admin.html`: Admin panel for issue management

**JavaScript Modules** (`/js`):
- `app.js`: Main application logic, UI rendering, issue display
- `auth.js`: Frontend authentication, session management
- `backend.js`: Client-side data management, sessionStorage interface
- `data.js`: Initial/fallback data for issues

**Note**: The frontend currently uses sessionStorage for client-side state but is designed to transition to backend API calls.

### Database Schema

**users**:
- OAuth support via `provider` ('local', 'google', 'github') and `provider_id`
- Password stored as bcrypt hash for local accounts
- Email verification with `verified` boolean and `verification_token`
- Virtual currency balance in `coins` (default: 10000)

**issues**:
- Prediction questions with `title`, `category`, `end_date`
- Betting pools: `yes_volume`, `no_volume`, `total_volume`
- Real-time probability in `yes_price` (0-100)
- Soft delete via `status` field ('active' or 'deleted')
- `is_popular` flag for featured issues

**bets**:
- Links `user_id` to `issue_id` with `choice` ('Yes' or 'No')
- Unique constraint: one bet per user per issue
- Amount tracked for probability calculations

**admins**:
- Simple relationship table linking admin users

## Authentication & Authorization

### JWT Authentication
- Tokens issued on login containing user id, username
- Secret key from `JWT_SECRET` environment variable
- Token passed as `Authorization: Bearer <token>` header

### OAuth Flow
1. User clicks "Login with Google/GitHub" on login page
2. Redirects to `/api/auth/google` or `/api/auth/github`
3. OAuth provider authenticates user
4. Callback to `/api/auth/google/callback` or `/api/auth/github/callback`
5. User created/retrieved from database
6. Session established, JWT token returned to frontend
7. Frontend redirects to main page with user logged in

### Middleware Usage
- `authMiddleware`: Verify JWT token, attach user to request
- `adminMiddleware`: Verify JWT + check admin status in database

## Environment Variables

Required for production (see `.env.example`):

**Core**:
- `NODE_ENV`: 'production' or 'development'
- `PORT`: Server port (default: 3000)
- `JWT_SECRET`: Secret key for JWT signing (minimum 32 chars)
- `SESSION_SECRET`: Express session encryption key

**OAuth** (optional, see OAuth-SETUP.md):
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `FRONTEND_URL`: Base URL for OAuth callbacks

**Email** (optional, for verification):
- `EMAIL_USER`: Gmail address
- `EMAIL_PASS`: Gmail app password (not regular password)

**Database**:
- `DB_PATH`: SQLite file path (default: `./database/yegame.db`)

## Key Implementation Details

### Probability Calculation
Issues track volumes for Yes/No choices. The `yes_price` is calculated as:
```
yes_price = (yes_volume / (yes_volume + no_volume)) * 100
```

This creates a market-based probability where more bets on one side increases that outcome's "price" (probability).

### OAuth Conditional Loading
The passport configuration (`config/passport.js`) only registers OAuth strategies when credentials are provided. This allows the app to run without OAuth configured, preventing startup errors.

### Frontend-Backend Transition
The codebase is in transition:
- `js/backend.js` manages sessionStorage (legacy client-only mode)
- API routes in `/routes` provide server-backed functionality
- Frontend pages need updating to call APIs instead of sessionStorage

### Admin Access
Admin panel (`admin.html`) uses simple password check client-side (legacy). Server routes use `adminMiddleware` to verify admin status from database.

## Common Patterns

### Adding a New API Route
1. Create route handler in appropriate file under `/routes`
2. Use `getDB()` to access database
3. Apply `authMiddleware` or `adminMiddleware` if authentication needed
4. Register route in `server.js` with `app.use('/api/path', routeModule)`

### Database Queries
Always use parameterized queries to prevent SQL injection:
```javascript
const db = getDB();
db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
  // handle result
});
```

### Error Handling
Return consistent JSON responses:
```javascript
res.status(500).json({
  success: false,
  message: '사용자 친화적 에러 메시지'
});
```

## OAuth Setup

Full OAuth setup instructions are in `OAuth-SETUP.md`. Key points:

1. Register OAuth apps with Google/GitHub
2. Configure callback URLs: `{FRONTEND_URL}/api/auth/{provider}/callback`
3. Add client ID/secret to environment variables
4. Strategies auto-register on server start if credentials present

## Deployment

The project is designed for Railway deployment:
- `server.js` respects `PORT` environment variable
- Static files served from root directory
- SQLite database persists in `./database/` directory (ensure volume mounted)
- Set all environment variables in Railway dashboard

## Security Notes

- JWT secrets must be strong random strings (32+ characters)
- OAuth callback URLs must exactly match registered URLs
- Session cookies use `secure: true` in production (HTTPS only)
- Helmet.js provides security headers with CSP for external resources
- Passwords hashed with bcryptjs (12 rounds)
- Admin actions protected by database-verified admin status
