# Planify Life Backend

Planify Life Backend is the API layer for a personal productivity and finance tracking system. It powers authentication, dashboard analytics, workouts, habits, learning sessions, expense tracking, balances, loans, lending, savings, and income records.

The backend is built with TypeScript, Express, MongoDB, and Mongoose. It is designed for a real personal dashboard: fast enough for daily use, structured enough to grow, and friendly enough that API responses feel like part of the product instead of raw server noise.

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Authentication](#authentication)
- [API Response Contract](#api-response-contract)
- [API Reference](#api-reference)
- [Data Rules](#data-rules)
- [Performance Notes](#performance-notes)
- [Testing](#testing)
- [Deployment](#deployment)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

Planify Life is a full personal operating system for daily planning. This backend handles the persistent data and business rules behind the frontend experience.

It focuses on four major areas:

- `Identity`: secure user sessions using JWT and HTTP-only cookies.
- `Productivity`: workouts, score sections, dashboard stats, focus sessions, and weekly goals.
- `Learning`: study sessions, status tracking, summaries, streaks, and subject insights.
- `Finance`: balances, categories, expenses, salary, income, savings, loans, debts, lending, repayment flows, and summaries.

The API uses a friendly response style. Messages are clear and sometimes lightly witty, but still useful for forms, toasts, and debugging.

## Core Features

- User registration, login, logout, and current-user lookup
- JWT authentication stored in secure HTTP-only cookies
- Protected user-scoped routes
- Dashboard data for daily productivity tracking
- Workout CRUD
- Score section CRUD and progress updates
- Water intake, focus session, weekly goal, and weekly stats tracking
- Learning session CRUD with planned, active, paused, and completed states
- Learning summary with total minutes, completion rate, streaks, active session, top subjects, and recent sessions
- Finance dashboard with balance sources, categories, expenses, salary, income, savings, debts, summaries, and insights
- Loan debt records with payment tracking
- Lending records with repayment tracking
- Borrowed lending flow that can automatically create linked debt records
- Optional note/reason fields with consistent backend handling
- MongoDB indexes for common dashboard and list queries

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js |
| Framework | Express 5 |
| Language | TypeScript |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | JWT, HTTP-only cookies |
| Password Hashing | bcryptjs |
| Config | dotenv |
| Testing | Node test runner |
| Build Output | CommonJS in `dist/` |

## Architecture

```text
src/
  config/          Database connection
  controllers/     Express request and response handlers
  middleware/      Authentication middleware
  models/          Mongoose schemas, types, and indexes
  routes/          Route declarations grouped by domain
  services/        Business logic and database workflows
  utils/           Shared helpers, formatting, and API messages
  validation/      Request validation modules

tests/             Node test runner tests
dist/              Compiled JavaScript output
```

The project follows a simple domain-oriented structure:

- Routes define endpoint paths and middleware.
- Controllers validate request context and shape HTTP responses.
- Services own business logic and multi-model workflows.
- Models define persistence structure and query indexes.
- Validation modules keep request parsing consistent where flows are more complex.

## Getting Started

### Prerequisites

- Node.js 20 or newer recommended
- npm
- MongoDB database, local or hosted

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_SECRET=replace-with-a-long-random-secret
NODE_ENV=development
```

### Run Locally

```bash
npm run dev
```

The API will run at:

```text
http://localhost:5000
```

Health check:

```http
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "app": "Planify Life Backend"
}
```

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `5000` | Port used by the Express server. |
| `MONGODB_URI` | Yes | none | MongoDB connection string used by Mongoose. |
| `JWT_SECRET` | Yes | none | Secret used to sign and verify JWT session tokens. |
| `NODE_ENV` | No | `development` | Controls production cookie behavior. Use `production` in deployed environments. |

## Available Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with `ts-node-dev`. |
| `npm run build` | Compile TypeScript from `src/` into `dist/`. |
| `npm start` | Run the compiled app from `dist/server.js`. |
| `npm test` | Build the project and run the test suite. |
| `npm run vercel-build` | Build command used for Vercel deployment. |
| `npm run postinstall` | Compile TypeScript after dependency installation. |

## Authentication

Authentication is cookie-based.

- The server signs a JWT containing `userId`.
- The token is stored in an HTTP-only cookie named `token`.
- Protected routes read the cookie through `authMiddleware`.
- Invalid or expired tokens are cleared automatically.
- In production, cookies use `secure: true` and `sameSite: "none"` for cross-site frontend/backend deployment.

Auth endpoints:

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create a user account and start a session. |
| `POST` | `/api/auth/login` | Public | Log in with email and password. |
| `GET` | `/api/auth/me` | Protected | Return the authenticated user. |
| `POST` | `/api/auth/logout` | Public | Clear the auth cookie. |

## API Response Contract

Most successful responses use this shape:

```json
{
  "success": true,
  "message": "Saved. Future you just got a cleaner dashboard.",
  "data": {}
}
```

List endpoints can include pagination:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

Errors usually use this shape:

```json
{
  "success": false,
  "message": "Amount needs to be a positive number. Math said behave."
}
```

Some validation errors include a `field` value so the frontend can show inline form errors:

```json
{
  "message": "Amount needs to be a positive number. Math said behave.",
  "field": "amount"
}
```

## API Reference

### Health

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Check server status. |

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a new user. |
| `POST` | `/api/auth/login` | Log in and set the session cookie. |
| `GET` | `/api/auth/me` | Get the current authenticated user. |
| `POST` | `/api/auth/logout` | Clear the session cookie. |

### Workouts

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/workouts` | List workouts for the current user. |
| `POST` | `/api/workouts` | Create a workout. |
| `PATCH` | `/api/workouts/:id` | Update a workout. |
| `DELETE` | `/api/workouts/:id` | Delete a workout. |

### Dashboard

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/dashboard` | Get daily dashboard data. |
| `POST` | `/api/dashboard/water` | Update water intake. |
| `POST` | `/api/dashboard/focus` | Log a focus session. |
| `POST` | `/api/dashboard/weekly-goal` | Update weekly workout goals. |
| `GET` | `/api/dashboard/weekly-stats` | Fetch weekly stats. |
| `POST` | `/api/dashboard/weekly-stats` | Update weekly stats. |

### Score Sections

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/score-sections` | List today's score sections. |
| `POST` | `/api/score-sections` | Create a score section. |
| `PATCH` | `/api/score-sections/:id` | Update a score section. |
| `PATCH` | `/api/score-sections/:id/progress` | Update score section progress. |
| `DELETE` | `/api/score-sections/:id` | Delete a score section. |

### Learning

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/learning/session` | Create a learning session. |
| `PATCH` | `/api/learning/session/:id` | Update a learning session. |
| `DELETE` | `/api/learning/session/:id` | Delete a learning session. |
| `GET` | `/api/learning/sessions` | List sessions with pagination and filters. |
| `GET` | `/api/learning/summary` | Get learning totals, streaks, top subjects, and recent sessions. |

Learning session statuses:

```text
planned | active | paused | completed
```

Learning session filters:

| Query | Description |
| --- | --- |
| `page` | Page number. |
| `limit` | Page size, capped by backend validation. |
| `status` | Filter by session status. |
| `subject` | Case-insensitive subject search. |
| `startDate` | Start date in `YYYY-MM-DD` format. |
| `endDate` | End date in `YYYY-MM-DD` format. |

### Money

Mounted at `/api/money`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/categories` | List expense categories. |
| `POST` | `/category` | Create or upsert a category. |
| `DELETE` | `/category/:name` | Delete a category if no expenses use it. |
| `GET` | `/balance` | Get balance sources and total balance. |
| `POST` | `/balance/add` | Add a balance source. |
| `PATCH` | `/balance/update/:id` | Update a balance source amount. |
| `DELETE` | `/balance/:id` | Delete a balance source. |
| `GET` | `/expenses` | List expenses with pagination and filters. |
| `POST` | `/expenses` | Create an expense. |
| `PATCH` | `/expenses/:id` | Update an expense. |
| `DELETE` | `/expenses/:id` | Delete an expense and adjust balance. |
| `GET` | `/expenses/monthly-summary` | Get expense summary for a month. |
| `POST` | `/salary` | Add salary for a date. |
| `GET` | `/salary/current` | Get the current salary month. |
| `GET` | `/salary/history` | List salary history. |
| `POST` | `/loans` | Create a finance loan record. |
| `POST` | `/loans/:id/repay` | Record repayment for a finance loan. |
| `GET` | `/loans` | List finance loans. |
| `GET` | `/debts` | List external debts. |
| `POST` | `/income` | Record external income. |
| `POST` | `/savings` | Record savings. |
| `GET` | `/summary` | Get finance summary. |
| `GET` | `/insights` | Get monthly spending insights. |

Expense list filters:

| Query | Description |
| --- | --- |
| `page` | Page number. |
| `limit` | Page size. |
| `category` | Filter by category. |
| `startDate` | Start date filter. |
| `endDate` | End date filter. |

Balance source types:

```text
CASH | BANK | SALARY | EXTERNAL
```

### Loan Debt

Mounted at `/api/loans`.

These routes track money you borrowed from someone else.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/` | Create a loan/debt record. |
| `GET` | `/` | List loan/debt records. |
| `PATCH` | `/:id/pay` | Pay toward a loan/debt record. |
| `DELETE` | `/:id` | Delete a loan/debt record. |

Loan debt statuses:

```text
ACTIVE | PARTIALLY_PAID | PAID
```

### Lending

Mounted at `/api/lending`.

These routes track money you lent to another person.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/` | Create a lending record. |
| `GET` | `/` | List lending records. |
| `PATCH` | `/:id/repaid` | Record repayment toward a lending record. |
| `DELETE` | `/:id` | Delete a lending record. |

Lending statuses:

```text
ACTIVE | PARTIALLY_REPAID | REPAID
```

Funding sources:

```text
PERSONAL | BORROWED
```

When a lending record uses `BORROWED` funding, the backend can create a linked loan/debt record automatically so the borrowed liability is still tracked.

### Finance Summary Alias

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/finance/summary` | Summary endpoint for loan/lending financial position. |

## Data Rules

### Optional Text Fields

The backend accepts missing, `null`, `undefined`, and empty strings for note-style text fields.

| Domain | Field | Behavior |
| --- | --- | --- |
| Expenses | `note` | Optional. Stored as a trimmed string or empty string. |
| Income | `note` | Optional. Stored as a trimmed string or empty string. |
| Savings | `note` | Optional. Stored as a trimmed string or empty string. |
| Learning sessions | `notes` | Optional. Missing and `null` are accepted. |
| Loan debts | `reason` | Optional. Defaults to `No reason provided.` when blank or omitted. |

### Finance Behavior

- Expenses deduct from available balance.
- Deleted expenses refund the amount back to cash balance.
- Salary and balance additions credit balance.
- Income and savings records credit external balance.
- Loan repayments update loan state and balance where applicable.
- Category deletion is blocked when expenses still reference the category.

### User Isolation

Most persisted records include `userId`, and protected endpoints only operate on the authenticated user's records.

## Performance Notes

The backend includes indexes for common access patterns:

- `BalanceAccount`: user and type sorting
- `Expense`: user, category, date, and creation time
- `Loan`: user, status, and creation time
- `LoanDebt`: user, status, and creation time
- `Lending`: user, status, and creation time
- `LearningSession`: user, date, status, subject, and update time
- `SalaryMonth`: user, year, and month
- `ExternalDebt`: user, creditor, and update time

Read-heavy service methods use lean queries where Mongoose documents are not needed. Multi-step finance operations use Mongoose sessions and transactions where consistency matters.

## Testing

Run the full test command:

```bash
npm test
```

The test script currently:

- Builds TypeScript with `tsc`
- Runs Node test runner tests from `tests/financeUtils.test.js`
- Verifies finance utilities and optional note/reason model behavior

On Windows PowerShell, use this if execution policy blocks `npm`:

```bash
npm.cmd test
```

## Deployment

The backend is ready for deployment to Node-compatible platforms such as Vercel or a traditional Node server.

Production checklist:

- Set `MONGODB_URI`.
- Set a strong `JWT_SECRET`.
- Set `NODE_ENV=production`.
- Configure the frontend origin in `src/server.ts` CORS settings.
- Run `npm run build`.
- Start with `npm start` or the platform's Node start command.

The included Vercel build command is:

```bash
npm run vercel-build
```

## Development Workflow

Recommended workflow for backend changes:

1. Add or update the model/schema if persistence changes.
2. Add service logic for business rules.
3. Keep controller changes focused on HTTP parsing and responses.
4. Add route entries under `src/routes/`.
5. Update validation modules for complex request bodies.
6. Add or update tests for risky behavior.
7. Run `npm test` before shipping.

Code style guidance:

- Keep records user-scoped unless there is a clear reason not to.
- Keep response shapes consistent with `{ success, message, data }`.
- Prefer service functions for workflows that touch multiple models.
- Add indexes when introducing new filters or sort patterns.
- Keep user-facing messages helpful, friendly, and not harsh.

## Troubleshooting

### MongoDB connection failed

Check that `MONGODB_URI` exists in `.env`, points to the correct database, and that your IP/network is allowed by the MongoDB provider.

### Unauthorized responses

Protected routes require a valid `token` cookie. Log in again if the token is missing, invalid, or expired.

### Cookies work locally but not in production

Set `NODE_ENV=production`, use HTTPS, and make sure the frontend sends requests with credentials enabled. Also confirm the frontend origin is allowed in CORS.

### PowerShell blocks npm scripts

Use the Windows command shim:

```bash
npm.cmd test
```

## License

This project is licensed under the ISC license.
