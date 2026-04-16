

# CRM for Local Service Providers (Artisans)

A web-based CRM helping Ghanaian artisans manage customers, appointments, services, and feedback — with a customer-facing portal and admin dashboard.

## Authentication & Roles
- Email/password signup and login via Supabase Auth
- Three roles: **Artisan**, **Customer**, **Admin** (stored in a `user_roles` table with RLS)
- Profile creation on signup with role selection
- Protected routes per role using TanStack Router auth guards

## Artisan Portal
- **Dashboard** — overview of upcoming appointments, recent service requests, feedback stats
- **Customer Management** — add, view, edit, delete customers; search and filter
- **Service Records** — log services performed per customer, track history, categorize by service type (plumbing, electrical, tailoring, etc.)
- **Appointment Scheduling** — create/view/manage appointments with date, time, customer, and service type; calendar view
- **Feedback View** — see ratings and comments from customers
- **Profile Settings** — update business info, specialization, contact details

## Customer Portal
- **Browse Artisans** — search/filter artisans by service category and location
- **Book Appointments** — request service appointments with preferred date/time
- **Service History** — view past services received from artisans
- **Leave Feedback** — rate and comment on completed services
- **Profile Settings** — manage personal info and contact details

## Admin Dashboard
- **User Management** — view/manage all artisans and customers, activate/deactivate accounts
- **Analytics Overview** — total users, appointments, services completed, feedback stats with charts
- **Service Categories** — manage the list of artisan service types
- **System Monitoring** — view recent activity and flagged feedback

## Database Tables
- `profiles` — user details (name, phone, location, specialization)
- `user_roles` — role assignments (admin, artisan, customer)
- `service_categories` — types of artisan services
- `customers` — artisan-managed customer records
- `service_records` — completed service logs
- `appointments` — scheduled appointments with status tracking
- `feedback` — customer ratings and comments on services

## Design & UX
- Clean, simple UI designed for low-tech-literacy users (large buttons, clear labels)
- Responsive design for mobile-first usage
- Light theme with professional color scheme
- Sidebar navigation for artisan/admin views; simpler nav for customers

## Pages/Routes
- `/` — Landing page with app description and login/signup CTAs
- `/login`, `/signup` — Authentication pages
- `/artisan/dashboard`, `/artisan/customers`, `/artisan/appointments`, `/artisan/services`, `/artisan/feedback`
- `/customer/dashboard`, `/customer/browse`, `/customer/appointments`, `/customer/history`, `/customer/feedback`
- `/admin/dashboard`, `/admin/users`, `/admin/categories`, `/admin/activity`

