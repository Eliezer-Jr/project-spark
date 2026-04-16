-- ArtisanCRM Database Schema
-- Run this against your local Supabase instance

-- Enums
create type public.app_role as enum ('admin', 'artisan', 'customer');
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  location text,
  specialization text,
  bio text,
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User Roles (separate table for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

-- Service Categories
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon text,
  created_at timestamptz default now()
);

-- Customers (artisan-managed)
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Appointments
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references auth.users(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_user_id uuid references auth.users(id) on delete set null,
  category_id uuid references public.service_categories(id) on delete set null,
  title text not null,
  description text,
  scheduled_date date not null,
  scheduled_time time not null,
  status appointment_status default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Service Records
create table public.service_records (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references auth.users(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade not null,
  category_id uuid references public.service_categories(id) on delete set null,
  description text not null,
  cost numeric(10,2),
  status text default 'completed',
  service_date date not null,
  created_at timestamptz default now()
);

-- Feedback
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references auth.users(id) on delete cascade not null,
  customer_user_id uuid references auth.users(id) on delete cascade not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.service_categories enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.service_records enable row level security;
alter table public.feedback enable row level security;

-- Security definer function for role checking
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- RLS Policies

-- Profiles: users can read all active profiles, update own
create policy "Anyone can view active profiles" on public.profiles for select using (is_active = true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Admins can manage all profiles" on public.profiles for all using (public.has_role(auth.uid(), 'admin'));

-- User Roles: users can read own, admins can manage
create policy "Users can view own role" on public.user_roles for select using (auth.uid() = user_id);
create policy "Users can insert own role" on public.user_roles for insert with check (auth.uid() = user_id);
create policy "Admins can view all roles" on public.user_roles for select using (public.has_role(auth.uid(), 'admin'));

-- Service Categories: anyone can read, admins can manage
create policy "Anyone can view categories" on public.service_categories for select to authenticated using (true);
create policy "Admins can manage categories" on public.service_categories for all using (public.has_role(auth.uid(), 'admin'));

-- Customers: artisans manage own customers
create policy "Artisans can manage own customers" on public.customers for all using (auth.uid() = artisan_id);
create policy "Admins can view all customers" on public.customers for select using (public.has_role(auth.uid(), 'admin'));

-- Appointments: artisans manage own, customers manage own bookings
create policy "Artisans can manage own appointments" on public.appointments for all using (auth.uid() = artisan_id);
create policy "Customers can view own appointments" on public.appointments for select using (auth.uid() = customer_user_id);
create policy "Customers can create appointments" on public.appointments for insert with check (auth.uid() = customer_user_id);
create policy "Admins can view all appointments" on public.appointments for select using (public.has_role(auth.uid(), 'admin'));

-- Service Records: artisans manage own
create policy "Artisans can manage own records" on public.service_records for all using (auth.uid() = artisan_id);
create policy "Admins can view all records" on public.service_records for select using (public.has_role(auth.uid(), 'admin'));

-- Feedback: customers create, artisans read own
create policy "Customers can create feedback" on public.feedback for insert with check (auth.uid() = customer_user_id);
create policy "Customers can view own feedback" on public.feedback for select using (auth.uid() = customer_user_id);
create policy "Artisans can view their feedback" on public.feedback for select using (auth.uid() = artisan_id);
create policy "Admins can view all feedback" on public.feedback for select using (public.has_role(auth.uid(), 'admin'));

-- Seed some service categories
insert into public.service_categories (name, description) values
  ('Plumbing', 'Pipe repairs, installations, and water system maintenance'),
  ('Electrical', 'Wiring, installations, and electrical repairs'),
  ('Carpentry', 'Furniture making, repairs, and wood installations'),
  ('Tailoring', 'Clothing design, alterations, and repairs'),
  ('Painting', 'Interior and exterior painting services'),
  ('Masonry', 'Bricklaying, concrete work, and construction'),
  ('Welding', 'Metal fabrication, repairs, and installations'),
  ('Auto Mechanic', 'Vehicle repairs and maintenance'),
  ('Hair Styling', 'Hairdressing, braiding, and beauty services'),
  ('Phone Repair', 'Mobile device repairs and maintenance');
