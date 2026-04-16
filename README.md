# Project Spark CRM

Project Spark CRM is an artisan/customer relationship management system with a TanStack frontend and a separate Express + MySQL backend. It is designed for service businesses that need role-based access, customer management, appointment scheduling, service history, feedback tracking, and dashboard reporting.

## Current State

- The backend uses a real MySQL connection, migrations, and seed data.
- The frontend is still using the local browser data layer in `src/lib/app-db.ts`.
- Supabase is not used at runtime anymore.
- The backend is ready for frontend API integration through `/api/*`.

## Core Features

- Authentication with role-aware access for `admin`, `artisan`, and `customer`
- User profile management and admin user activation/deactivation
- Service category management
- Customer management per artisan
- Appointment scheduling with conflict prevention
- Service record management with customer-artisan ownership checks
- Feedback management with completed-appointment validation
- Dashboard endpoints for admin, artisan, customer, and current-user views
- Public system bootstrap endpoint for future frontend/API addons

## Backend Improvements Added

- Real MySQL pool connection with health checks
- SQL migrations in `backend/database/migrations`
- Seed files in `backend/database/seeds`
- Request IDs in API responses and error payloads
- Stronger validation for create and partial update flows
- Better role guards and ownership enforcement
- Appointment status transition rules
- Duplicate feedback protection per appointment/customer
- Cleaner bootstrap metadata for future integrations

## Project Structure

```text
project-spark/
|-- backend/
|   |-- database/
|   |   |-- migrations/
|   |   |-- seeds/
|   |   `-- schema.sql
|   |-- src/
|   |   |-- config/
|   |   |-- constants/
|   |   |-- constraints/
|   |   |-- controllers/
|   |   |-- database/
|   |   |-- exceptions/
|   |   |-- mail/
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- scripts/
|   |   |-- services/
|   |   |-- utils/
|   |   |-- app.js
|   |   `-- server.js
|   |-- .env.example
|   `-- package.json
|-- src/
|   |-- hooks/
|   |-- lib/
|   `-- routes/
`-- package.json
```

## Tech Stack

- Frontend: React 19, TanStack Router, TanStack Start, Vite, Tailwind
- Backend: Node.js, Express 5, MySQL2
- Database: MySQL
- Tooling: Nodemon, ESLint, Prettier

## Prerequisites

- Node.js 20+ or 22+
- npm
- MySQL 8+

## Environment Setup

Create `backend/.env` from `backend/.env.example` and set your local values:

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
APP_NAME=Project Spark Backend
APP_SECRET=change-me-in-production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=artisan_crm
DB_USER=root
DB_PASSWORD=
```

`DB_PASSWORD` should be your local MySQL password. If your MySQL user has no password, leave it empty.

## Installation

Install root dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
npm --prefix backend install
```

## Database Setup

Run migrations:

```bash
npm run migrate:backend
```

Seed sample data:

```bash
npm run seed:backend
```

Test the database connection:

```bash
npm run db:test:backend
```

You can also run the same scripts directly inside `backend/`:

```bash
npm run migrate
npm run seed
npm run db:test
```

## Running the App

Start the frontend:

```bash
npm run dev
```

Start the backend:

```bash
npm run dev:backend
```

Production-style backend run:

```bash
npm run start:backend
```

Frontend default URL:

- `http://localhost:5173`

Backend default URL:

- `http://localhost:4000`

## Seeded Accounts

All seeded users use the same password:

```text
password123
```

Accounts:

- `admin@artisancrm.local`
- `artisan@artisancrm.local`
- `customer@artisancrm.local`

## Main API Routes

Public:

- `GET /api/health`
- `GET /api/system/bootstrap`
- `POST /api/auth/login`
- `POST /api/auth/signup`

Authenticated:

- `GET /api/users/me`
- `PATCH /api/users/me/profile`
- `GET /api/dashboard/me`

Admin-focused:

- `GET /api/users`
- `PATCH /api/users/:id/status`
- `GET /api/dashboard/admin`
- `GET /api/dashboard/admin/analytics`
- `GET /api/dashboard/admin/activity`
- `POST/PATCH/DELETE /api/service-categories`

Shared business modules:

- `/api/customers`
- `/api/service-records`
- `/api/appointments`
- `/api/feedback`

## Important Business Rules

- Customers belong to a specific artisan.
- Service records must use a customer owned by the selected artisan.
- Appointments prevent duplicate active bookings for the same artisan/date/time slot.
- Feedback tied to an appointment must reference a completed appointment.
- The same customer cannot submit duplicate feedback for the same appointment.
- PATCH endpoints now support partial updates instead of forcing full payload resubmission.
- Customers can only access their own appointments and feedback.
- Artisans can only manage their own customers, appointments, service records, and artisan dashboard data.

## Notes About Frontend Integration

The backend is production-oriented, but the frontend is not yet wired to it end-to-end. Right now:

- backend data is real and stored in MySQL
- frontend data is still read/written through the local browser storage layer

If you want a fully connected app, the next step is replacing the frontend local data hooks with API calls to the backend.

## Future Addons

Recommended next improvements:

- connect the frontend to the backend API
- add refresh tokens and password reset flow
- add notifications, reminders, and email templates
- add artisan availability calendars and booking windows
- add file uploads for job photos, invoices, and attachments
- add audit logs and activity history
- add reports/export endpoints
- add payment tracking and invoice management

The `/api/system/bootstrap` endpoint was added to make future frontend and mobile clients easier to initialize from a single metadata source.

## Troubleshooting

If migrations fail:

- confirm MySQL is running
- confirm `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`
- ensure the MySQL user has permission to create and write to the database

If login fails:

- rerun `npm run seed:backend`
- confirm you are using one of the seeded emails above
- confirm the password is `password123`

If the frontend looks out of sync with backend data:

- that is expected until the frontend is rewired to use the backend API

## Verification Status

Verified locally:

- backend app imports successfully
- database connection test passes
- migrations run successfully
- seed script runs successfully
- live API smoke flow passes for bootstrap, login, `users/me`, `dashboard/me`, partial customer update, and appointment conflict validation
