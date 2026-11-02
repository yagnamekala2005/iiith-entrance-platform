-- ==========================================================================
-- ADD STUDENT PROFILE FIELDS TO PROFILES TABLE
-- ==========================================================================
-- Adds personal information, contact numbers, academic year (P1 / P2),
-- subscription plan, and completion status.

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists mobile_number text,
  add column if not exists dob text,
  add column if not exists gender text,
  add column if not exists location text,
  add column if not exists academic_year text,
  add column if not exists subscription text default 'Free',
  add column if not exists is_completed boolean default false;

-- Allow users to update all their profile columns
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Allow users to insert their own profile if not exists
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
with check (auth.uid() = id);

