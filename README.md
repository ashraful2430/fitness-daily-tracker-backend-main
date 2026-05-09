# Planify Life Backend

A TypeScript/Express backend for a personal life dashboard that tracks fitness, learning, money, loans, lending, daily score sections, dashboard stats, and authentication.

The project is built for personal use, so responses are practical but friendly. Success and error messages are intentionally clear with a light, witty tone.

## Features

- Cookie-based JWT authentication
- User registration, login, logout, and current-user lookup
- Workout tracking
- Daily dashboard data
- Water intake, focus sessions, weekly goals, and weekly stats
- Score sections for daily habits or tasks
- Learning sessions with status, notes, summaries, and streaks
- Money management:
  - balance sources
  - categories
  - expenses
  - salary records
  - income
  - savings
  - loans and debts
  - finance summaries and insights
- Loan and lending workflows with repayment tracking
- MongoDB persistence through Mongoose
- Optimized read queries using indexes and lean reads where useful

## Tech Stack

- Node.js
- Express 5
- TypeScript
- MongoDB
- Mongoose
- JWT
- bcryptjs
- cookie-parser
- CORS

## Project Structure

```text
src/
  config/          MongoDB connection
  controllers/     Request handlers and response logic
  middleware/      Auth middleware
  models/          Mongoose schemas and indexes
  routes/          API route definitions
  services/        Business logic and database operations
  utils/           Shared helpers and API messages
  validation/      Request validation helpers
tests/             Node test runner tests
dist/              Compiled JavaScript output
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

Create a `.env` file in the project root:

```env
PORT=5000
MONGODB_URI=mongodb+srv://your-mongo-uri
JWT_SECRET=your-long-random-secret
NODE_ENV=development
```

### 3. Run in development

```bash
npm run dev
```

The server starts on `http://localhost:5000` by default.

### 4. Build for production

```bash
npm run build
```

### 5. Start compiled server

```bash
npm start
```

### 6. Run tests

```bash
npm test
```

On Windows PowerShell, if script execution blocks `npm`, use:

```bash
npm.cmd test
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Server port. Defaults to `5000`. |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Secret used to sign JWT auth tokens. |
| `NODE_ENV` | No | Use `production` for secure cross-site cookies. |

## Authentication

Authentication uses an HTTP-only cookie named `token`.

- `POST /api/auth/register` creates a user and sets the cookie.
- `POST /api/auth/login` verifies credentials and sets the cookie.
- `GET /api/auth/me` returns the authenticated user.
- `POST /api/auth/logout` clears the cookie.

Protected routes require the `token` cookie.

## API Overview

### Health

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Check if the API is running. |

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create a new account. |
| `POST` | `/api/auth/login` | Log in and set auth cookie. |
| `GET` | `/api/auth/me` | Get current authenticated user. |
| `POST` | `/api/auth/logout` | Log out and clear auth cookie. |

### Workouts

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/workouts` | List workouts. |
| `POST` | `/api/workouts` | Create a workout. |
| `PATCH` | `/api/workouts/:id` | Update a workout. |
| `DELETE` | `/api/workouts/:id` | Delete a workout. |

### Dashboard

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/dashboard` | Get dashboard data. |
| `POST` | `/api/dashboard/water` | Update water intake. |
| `POST` | `/api/dashboard/focus` | Log a focus session. |
| `POST` | `/api/dashboard/weekly-goal` | Update weekly goal. |
| `GET` | `/api/dashboard/weekly-stats` | Get weekly stats. |
| `POST` | `/api/dashboard/weekly-stats` | Update weekly stats. |

### Score Sections

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/score-sections` | List today's score sections. |
| `POST` | `/api/score-sections` | Create a score section. |
| `PATCH` | `/api/score-sections/:id` | Update a score section. |
| `PATCH` | `/api/score-sections/:id/progress` | Update section progress. |
| `DELETE` | `/api/score-sections/:id` | Delete a score section. |

### Learning

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/learning/session` | Create a learning session. |
| `PATCH` | `/api/learning/session/:id` | Update a learning session. |
| `DELETE` | `/api/learning/session/:id` | Delete a learning session. |
| `GET` | `/api/learning/sessions` | List learning sessions with filters and pagination. |
| `GET` | `/api/learning/summary` | Get learning summary and streak data. |

### Money

Mounted at `/api/money`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/categories` | List categories. |
| `POST` | `/category` | Create or save a category. |
| `DELETE` | `/category/:name` | Delete an unused category. |
| `GET` | `/balance` | Get balance sources and total balance. |
| `POST` | `/balance/add` | Add a balance source. |
| `PATCH` | `/balance/update/:id` | Update a balance source. |
| `DELETE` | `/balance/:id` | Delete a balance source. |
| `GET` | `/expenses` | List expenses with pagination and filters. |
| `POST` | `/expenses` | Create an expense. |
| `PATCH` | `/expenses/:id` | Update an expense. |
| `DELETE` | `/expenses/:id` | Delete an expense. |
| `GET` | `/expenses/monthly-summary` | Get monthly expense summary. |
| `POST` | `/salary` | Add salary. |
| `GET` | `/salary/current` | Get current salary month. |
| `GET` | `/salary/history` | Get salary history. |
| `POST` | `/loans` | Create a finance loan. |
| `POST` | `/loans/:id/repay` | Record loan repayment. |
| `GET` | `/loans` | List finance loans. |
| `GET` | `/debts` | List external debts. |
| `POST` | `/income` | Record income. |
| `POST` | `/savings` | Record savings. |
| `GET` | `/summary` | Get finance summary. |
| `GET` | `/insights` | Get finance insights. |

### Loans

Mounted at `/api/loans`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/` | Create a loan/debt record. |
| `GET` | `/` | List loan/debt records. |
| `PATCH` | `/:id/pay` | Pay toward a loan/debt record. |
| `DELETE` | `/:id` | Delete a loan/debt record. |

### Lending

Mounted at `/api/lending`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/` | Create a lending record. |
| `GET` | `/` | List lending records. |
| `PATCH` | `/:id/repaid` | Record lending repayment. |
| `DELETE` | `/:id` | Delete a lending record. |

### Finance Summary Alias

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/finance/summary` | Summary endpoint backed by loan/lending finance data. |

## Response Format

Most endpoints follow this shape:

```json
{
  "success": true,
  "message": "Saved. Future you just got a cleaner dashboard.",
  "data": {}
}
```

List endpoints may also include pagination:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

Errors usually follow:

```json
{
  "success": false,
  "message": "Amount needs to be a positive number. Math said behave."
}
```

Some validation errors may include a `field` key:

```json
{
  "message": "Amount needs to be a positive number. Math said behave.",
  "field": "amount"
}
```

## Notes on Optional Text Fields

The backend accepts missing, `null`, `undefined`, and empty strings for optional note-style fields.

- Expense `note` is optional.
- Income `note` is optional.
- Savings `note` is optional.
- Learning session `notes` are optional.
- Loan `reason` is optional and defaults to `No reason provided.` when omitted.

## Performance Notes

The backend includes indexes for common user-scoped queries, including:

- expenses by user, category, and date
- loans by user, status, and creation date
- lending by user and creation date
- salary months by user, year, and month
- learning sessions by user, date, status, subject, and update time

Read-heavy endpoints use lean queries where full Mongoose documents are not needed.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start development server with `ts-node-dev`. |
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm start` | Run compiled server from `dist/server.js`. |
| `npm test` | Build and run tests. |
| `npm run vercel-build` | Build command intended for Vercel. |

## CORS

Allowed origins are configured in `src/server.ts`:

- `http://localhost:3000`
- `https://fitness-daily-tracker.vercel.app`

Cookies are sent with credentials enabled.

## Development Notes

- Source code lives in `src/`.
- Compiled output is written to `dist/`.
- Keep business logic in services where possible.
- Keep request/response handling in controllers.
- Add new route modules under `src/routes/`.
- Add or update model indexes when introducing new list filters or sort patterns.

## License

ISC
