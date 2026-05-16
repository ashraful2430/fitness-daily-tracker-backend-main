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

Copy the example file and create a real `.env` file in the project root:

```bash
cp .env.example .env
```

Use this for local development:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
COOKIE_SECURE=false
```

`.env.example` is safe to commit as documentation. `.env` contains real secrets and must stay ignored by Git.

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
| `NODE_ENV` | No | `development` | Runtime environment. Use `production` on cloud servers. |
| `FRONTEND_URL` | Yes | none | Main frontend origin, for example `http://localhost:3000` or `http://54.226.53.255:3000`. |
| `CORS_ALLOWED_ORIGINS` | No | local frontend origins | Comma-separated extra origins allowed by CORS. Useful for EC2 IPs, domains, and direct API testing. |
| `COOKIE_SECURE` | No | inferred from `FRONTEND_URL` | Use `false` for HTTP testing and `true` for real HTTPS production. |

## Available Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with `ts-node-dev`. |
| `npm run build` | Compile TypeScript from `src/` into `dist/`. |
| `npm start` | Run the compiled app from `dist/server.js`. |
| `npm test` | Build the project and run the test suite. |

## Authentication

Authentication is cookie-based.

- The server signs a JWT containing `userId`.
- The token is stored in an HTTP-only cookie named `token`.
- Protected routes read either the `token` cookie or an `Authorization: Bearer <token>` header.
- Invalid or expired tokens are cleared automatically.
- Cookies do not set a `Domain` attribute.
- For HTTP testing on localhost or an EC2 IP, use `COOKIE_SECURE=false`.
- For real HTTPS production, use `COOKIE_SECURE=true`.
- Cookies use `sameSite: "lax"` so frontend proxy routes can work cleanly with HTTP-only auth.

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

The backend can run on any Node-compatible cloud server: AWS EC2, DigitalOcean, Render, Railway, a VPS, or a container platform. The app listens on `0.0.0.0`, so it can receive traffic from outside the machine when the cloud firewall/security group allows the port.

### Local Development

Backend `.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
COOKIE_SECURE=false
```

Run:

```bash
npm install
npm run dev
```

Local frontend should call this backend through its own proxy/API routes. If the frontend and backend are both local, the frontend server-side API proxy can use:

```env
EXTERNAL_API_URL=http://127.0.0.1:5000
```

### Cloud / EC2 HTTP Testing

Use this when the frontend is reachable at an IP address such as `http://54.226.53.255:3000` and the backend runs on port `5000`.

Backend `.env`:

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://54.226.53.255:3000
CORS_ALLOWED_ORIGINS=http://54.226.53.255:3000,http://127.0.0.1:3000
COOKIE_SECURE=false
```

Install, build, and start:

```bash
git pull origin master
npm ci
npm run build
npm start
```

`npm ci` installs exactly from `package-lock.json`; use `npm install` instead only when you are changing dependencies.

Cloud checklist:

- Allow inbound traffic to the frontend port, usually `3000`.
- Allow inbound traffic to backend port `5000` only if you need direct API testing from outside the server.
- If using MongoDB Atlas, allow the cloud server public IP in Atlas Network Access.
- Keep `.env` on the server and never commit it.
- Use a process manager such as `pm2`, `systemd`, Docker, or your platform's native process runner for long-running production use.

### HTTPS Production

When you move to a real domain with HTTPS, change the cookie setting:

```env
FRONTEND_URL=https://your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
COOKIE_SECURE=true
```

Rebuild and restart after changing deployed code:

```bash
npm run build
npm start
```

### Frontend Proxy Contract

The frontend should not use `MONGODB_URI`, `JWT_SECRET`, or any backend secret. It should keep only a server-side backend URL such as:

```env
EXTERNAL_API_URL=http://127.0.0.1:5000
```

Browser code should call relative frontend routes like `/api/auth/login`, `/api/auth/me`, `/api/workouts`, and `/api/learning/alarm-sounds`. The frontend API routes then proxy those requests to `EXTERNAL_API_URL`, forwarding `Cookie`, `Set-Cookie`, and `Authorization` headers.

With this shape, CORS usually does not affect browser requests because the browser talks to the frontend origin, not directly to the backend origin.
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

You can also test the live database connection:

```http
GET /api/test-db
```

### Unauthorized responses

Protected routes require a valid `token` cookie or `Authorization: Bearer <token>` header. Log in again if the token is missing, invalid, or expired.

### Cookies do not work on EC2 HTTP

For plain HTTP testing on an EC2 IP, use:

```env
COOKIE_SECURE=false
FRONTEND_URL=http://your-ec2-public-ip:3000
```

If frontend browser code calls `fetch`, use `credentials: "include"` for auth requests.

### Cookies do not work on HTTPS production

For a real HTTPS domain, use:

```env
COOKIE_SECURE=true
FRONTEND_URL=https://your-domain.com
```

Make sure the frontend proxy forwards `Set-Cookie` from the backend response back to the browser.

### CORS blocked for origin

First check whether the frontend is directly calling the backend from browser code. The preferred setup is browser -> frontend `/api/*` route -> backend, using `EXTERNAL_API_URL` on the frontend server.

If you intentionally call the backend directly, add the exact browser origin to backend `.env`:

```env
CORS_ALLOWED_ORIGINS=http://your-frontend-host:3000
```

### PowerShell blocks npm scripts

Use the Windows command shim:

```bash
npm.cmd test
```

The same applies to build and dev commands:

```bash
npm.cmd run build
npm.cmd run dev
```

## License

This project is licensed under the ISC license.
