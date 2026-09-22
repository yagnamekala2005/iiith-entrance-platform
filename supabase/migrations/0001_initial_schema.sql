create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id)
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  negative_marking_ratio numeric(6, 4),
  published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exam_sections (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  default_duration_seconds integer not null check (default_duration_seconds > 0),
  display_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (exam_id, slug)
);

create index if not exists exams_published_idx on public.exams (published);
create index if not exists exam_sections_exam_order_idx on public.exam_sections (exam_id, display_order);

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case 
    when check_user_id is null then false
    else exists (
      select 1 from public.admin_users where user_id = check_user_id
    )
  end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.exams enable row level security;
alter table public.exam_sections enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Admins can read admin membership" on public.admin_users;
create policy "Admins can read admin membership"
on public.admin_users for select
using (public.is_admin());

drop policy if exists "Anyone can read published exams" on public.exams;
create policy "Anyone can read published exams"
on public.exams for select
using (published = true or public.is_admin());

drop policy if exists "Anyone can read published sections" on public.exam_sections;
create policy "Anyone can read published sections"
on public.exam_sections for select
using (published = true or public.is_admin());

drop policy if exists "Admins can create exams" on public.exams;
create policy "Admins can create exams"
on public.exams for insert
with check (public.is_admin());

drop policy if exists "Admins can update exams" on public.exams;
create policy "Admins can update exams"
on public.exams for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can create sections" on public.exam_sections;
create policy "Admins can create sections"
on public.exam_sections for insert
with check (public.is_admin());

drop policy if exists "Admins can update sections" on public.exam_sections;
create policy "Admins can update sections"
on public.exam_sections for update
using (public.is_admin())
with check (public.is_admin());
