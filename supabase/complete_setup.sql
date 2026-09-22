-- IIITH ENTRANCE PREPARATION PLATFORM - COMPLETE DATABASE SETUP
-- Run this script in the Supabase Dashboard -> SQL Editor -> Click 'Run'


-- ==========================================================================
-- 1. PHASE 1: INITIAL SCHEMA & AUTH PROFILES
-- ==========================================================================


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



-- ==========================================================================
-- 2. PHASE 2: CONTENT HIERARCHY, QUESTIONS, AND TESTS
-- ==========================================================================


-- Phase 2: Content and Question Bank Foundation Migration

-- 1. Subjects
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

-- 2. Chapters
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (subject_id, slug)
);

-- 3. Topics
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (chapter_id, slug)
);

-- 4. Questions
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id) on delete set null,
  section_id uuid references public.exam_sections(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  question_text text not null,
  question_type text not null default 'mcq' check (question_type in ('mcq')),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  explanation text,
  marks numeric(5, 2) not null default 1.0,
  negative_marks numeric(5, 2) not null default 0.0,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 5. Question Options
create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_label text not null,
  option_text text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (question_id, option_label)
);

-- 6. Protected Answer Keys (CRITICAL SECURITY: No student read access)
create table if not exists public.question_answer_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_option_id uuid not null references public.question_options(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 7. Tests
create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  test_type text not null default 'mock' check (test_type in ('practice', 'mock')),
  duration_seconds integer not null check (duration_seconds > 0),
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  instructions text,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 8. Test Sections
create table if not exists public.test_sections (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  section_id uuid not null references public.exam_sections(id) on delete cascade,
  display_order integer not null default 0,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  marks_per_question numeric(5, 2),
  negative_marks numeric(5, 2),
  created_at timestamptz not null default timezone('utc', now()),
  unique (test_id, section_id)
);

-- 9. Test Questions
create table if not exists public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  section_id uuid references public.exam_sections(id) on delete set null,
  display_order integer not null default 0,
  marks numeric(5, 2) not null default 1.0,
  negative_marks numeric(5, 2) not null default 0.0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (test_id, question_id)
);

-- Performance Indexes
create index if not exists idx_chapters_subject on public.chapters(subject_id, display_order);
create index if not exists idx_topics_chapter on public.topics(chapter_id, display_order);
create index if not exists idx_questions_status on public.questions(status);
create index if not exists idx_questions_exam_sec on public.questions(exam_id, section_id);
create index if not exists idx_questions_topic on public.questions(topic_id);
create index if not exists idx_question_options_qid on public.question_options(question_id, display_order);
create index if not exists idx_tests_status on public.tests(status);
create index if not exists idx_tests_slug on public.tests(slug);
create index if not exists idx_test_sections_tid on public.test_sections(test_id, display_order);
create index if not exists idx_test_questions_tid on public.test_questions(test_id, display_order);

-- Trigger to guard published tests against accidental question tampering
create or replace function public.check_test_not_published()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  select status into v_status from public.tests where id = coalesce(NEW.test_id, OLD.test_id);
  if v_status = 'published' and not public.is_admin() then
    raise exception 'Cannot modify questions for a published test';
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_test_questions_published_guard on public.test_questions;
create trigger trg_test_questions_published_guard
before insert or update or delete on public.test_questions
for each row execute function public.check_test_not_published();

-- Enable Row Level Security
alter table public.subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.question_answer_keys enable row level security;
alter table public.tests enable row level security;
alter table public.test_sections enable row level security;
alter table public.test_questions enable row level security;

-- RLS Policies: Subjects, Chapters, Topics (Public read, admin write)
drop policy if exists "Anyone can read subjects" on public.subjects;
create policy "Anyone can read subjects"
on public.subjects for select
using (true);

drop policy if exists "Admins can manage subjects" on public.subjects;
create policy "Admins can manage subjects"
on public.subjects for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can read chapters" on public.chapters;
create policy "Anyone can read chapters"
on public.chapters for select
using (true);

drop policy if exists "Admins can manage chapters" on public.chapters;
create policy "Admins can manage chapters"
on public.chapters for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can read topics" on public.topics;
create policy "Anyone can read topics"
on public.topics for select
using (true);

drop policy if exists "Admins can manage topics" on public.topics;
create policy "Admins can manage topics"
on public.topics for all
using (public.is_admin())
with check (public.is_admin());

-- RLS Policies: Questions (Published read by anyone, draft/review/archived only admin)
drop policy if exists "Anyone can read published questions" on public.questions;
create policy "Anyone can read published questions"
on public.questions for select
using (status = 'published' or public.is_admin());

drop policy if exists "Admins can manage questions" on public.questions;
create policy "Admins can manage questions"
on public.questions for all
using (public.is_admin())
with check (public.is_admin());

-- RLS Policies: Question Options (Published question options readable by anyone, admin write)
drop policy if exists "Anyone can read options for published questions" on public.question_options;
create policy "Anyone can read options for published questions"
on public.question_options for select
using (
  exists (
    select 1 from public.questions
    where questions.id = question_options.question_id
      and (questions.status = 'published' or public.is_admin())
  )
);

drop policy if exists "Admins can manage question options" on public.question_options;
create policy "Admins can manage question options"
on public.question_options for all
using (public.is_admin())
with check (public.is_admin());

-- RLS Policies: Protected Answer Keys (CRITICAL: Admin only, NO student/anon read)
drop policy if exists "Admins can read answer keys" on public.question_answer_keys;
create policy "Admins can read answer keys"
on public.question_answer_keys for select
using (public.is_admin());

drop policy if exists "Admins can manage answer keys" on public.question_answer_keys;
create policy "Admins can manage answer keys"
on public.question_answer_keys for all
using (public.is_admin())
with check (public.is_admin());

-- RLS Policies: Tests (Published read by anyone, admin write)
drop policy if exists "Anyone can read published tests" on public.tests;
create policy "Anyone can read published tests"
on public.tests for select
using (status = 'published' or public.is_admin());

drop policy if exists "Admins can manage tests" on public.tests;
create policy "Admins can manage tests"
on public.tests for all
using (public.is_admin())
with check (public.is_admin());

-- RLS Policies: Test Sections
drop policy if exists "Anyone can read sections for published tests" on public.test_sections;
create policy "Anyone can read sections for published tests"
on public.test_sections for select
using (
  exists (
    select 1 from public.tests
    where tests.id = test_sections.test_id
      and (tests.status = 'published' or public.is_admin())
  )
);

drop policy if exists "Admins can manage test sections" on public.test_sections;
create policy "Admins can manage test sections"
on public.test_sections for all
using (public.is_admin())
with check (public.is_admin());

-- RLS Policies: Test Questions (Questions belonging to published tests)
drop policy if exists "Anyone can read questions for published tests" on public.test_questions;
create policy "Anyone can read questions for published tests"
on public.test_questions for select
using (
  exists (
    select 1 from public.tests
    where tests.id = test_questions.test_id
      and (tests.status = 'published' or public.is_admin())
  )
);

drop policy if exists "Admins can manage test questions" on public.test_questions;
create policy "Admins can manage test questions"
on public.test_questions for all
using (public.is_admin())
with check (public.is_admin());




-- ==========================================================================
-- 3. PHASE 3: PRACTICE & TEST TAKING ENGINE (ATTEMPTS, RLS, SCORING)
-- ==========================================================================


-- Phase 3: Practice and Test-Taking Engine Migration (Hardened RLS & Server-Authoritative Guards)

-- 1. Test Attempts Table
create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'abandoned')),
  started_at timestamptz not null default timezone('utc', now()),
  submitted_at timestamptz,
  score numeric(6, 2) not null default 0.00,
  max_score numeric(6, 2) not null default 0.00,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  unanswered_count integer not null default 0,
  total_questions integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 2. Attempt Questions Table (Snapshot of questions for this attempt)
create table if not exists public.attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  section_id uuid references public.exam_sections(id) on delete set null,
  display_order integer not null default 0,
  selected_option_id uuid references public.question_options(id) on delete set null,
  status text not null default 'unanswered' check (status in ('unanswered', 'answered', 'skipped')),
  marked_for_review boolean not null default false,
  answered_at timestamptz,
  marks numeric(5, 2) not null default 1.00,
  negative_marks numeric(5, 2) not null default 0.00,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (attempt_id, question_id)
);

-- 3. Indexes for Fast Lookups
create index if not exists idx_test_attempts_user_status on public.test_attempts(user_id, status);
create index if not exists idx_test_attempts_test on public.test_attempts(test_id);
create index if not exists idx_attempt_questions_attempt_order on public.attempt_questions(attempt_id, display_order);
create index if not exists idx_attempt_questions_qid on public.attempt_questions(question_id);

-- 4. Database Trigger Guards for Immutability & Anti-Tampering

-- 4a. Guard for test_attempts
--
-- IMPORTANT:
-- This trigger is intentionally SECURITY INVOKER.
-- `submit_and_score_attempt()` is SECURITY DEFINER, so its trusted UPDATE
-- executes with the function owner's role and is allowed to finalize an
-- attempt. A normal authenticated client UPDATE remains subject to RLS and
-- is rejected below. Making this trigger SECURITY DEFINER would erase that
-- distinction because current_user would always be the trigger owner.
create or replace function public.check_test_attempts_guard()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- Admins may manage attempts directly.
  if public.is_admin() then
    NEW.updated_at = timezone('utc', now());
    return NEW;
  end if;

  -- Prevent altering submitted attempts.
  if OLD.status = 'submitted' then
    raise exception 'Cannot modify an already submitted attempt';
  end if;

  -- The trusted submission RPC runs as its SECURITY DEFINER owner. Allow
  -- that trusted transition only when it is actually executing under the
  -- function owner; ordinary authenticated clients cannot satisfy this.
  if NEW.status = 'submitted'
     and OLD.status <> 'submitted'
     and current_user <> 'postgres' then
    raise exception 'Direct submission is forbidden. Use submit_and_score_attempt()';
  end if;

  -- Students must never directly write official result fields or immutable
  -- attempt identity/timing fields.
  if current_user <> 'postgres'
     and (
       NEW.score is distinct from OLD.score or
       NEW.max_score is distinct from OLD.max_score or
       NEW.correct_count is distinct from OLD.correct_count or
       NEW.incorrect_count is distinct from OLD.incorrect_count or
       NEW.unanswered_count is distinct from OLD.unanswered_count or
       NEW.total_questions is distinct from OLD.total_questions or
       NEW.submitted_at is distinct from OLD.submitted_at or
       NEW.user_id is distinct from OLD.user_id or
       NEW.test_id is distinct from OLD.test_id or
       NEW.started_at is distinct from OLD.started_at
     ) then
    raise exception 'Direct score, state, or identity mutation is forbidden. Use the server-authoritative RPC';
  end if;

  NEW.updated_at = timezone('utc', now());
  return NEW;
end;
$$;

drop trigger if exists trg_guard_test_attempts on public.test_attempts;
create trigger trg_guard_test_attempts
before update on public.test_attempts
for each row execute function public.check_test_attempts_guard();

-- 4b. Guard for attempt_questions (Immutable snapshots & valid option verification)
--
-- SECURITY INVOKER is intentional for the same reason as the test_attempts
-- guard above: the trusted SECURITY DEFINER RPC must be able to create the
-- snapshot, while ordinary clients must not be able to bypass the guard.
create or replace function public.check_attempt_questions_guard()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_attempt_status text;
  v_option_valid boolean;
begin
  -- Admins bypass guard
  if public.is_admin() then
    if TG_OP <> 'DELETE' then
      NEW.updated_at = timezone('utc', now());
      return NEW;
    end if;
    return OLD;
  end if;

  -- Verify parent attempt is in_progress
  select status into v_attempt_status
  from public.test_attempts
  where id = coalesce(NEW.attempt_id, OLD.attempt_id);

  if v_attempt_status <> 'in_progress' then
    raise exception 'Cannot modify questions of a test attempt that is not in progress';
  end if;

  -- Enforce snapshot immutability on UPDATE
  if TG_OP = 'UPDATE' then
    if (NEW.attempt_id <> OLD.attempt_id) or
       (NEW.question_id <> OLD.question_id) or
       (NEW.section_id is distinct from OLD.section_id) or
       (NEW.display_order <> OLD.display_order) or
       (NEW.marks <> OLD.marks) or
       (NEW.negative_marks <> OLD.negative_marks) then
      raise exception 'Attempt question snapshot fields (question, section, marks, order) are immutable';
    end if;

    -- Validate selected option belongs to the question
    if NEW.selected_option_id is not null then
      select exists (
        select 1 from public.question_options
        where id = NEW.selected_option_id
          and question_id = OLD.question_id
      ) into v_option_valid;

      if not v_option_valid then
        raise exception 'Invalid selected_option_id for question %', OLD.question_id;
      end if;
    end if;

    NEW.updated_at = timezone('utc', now());
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    raise exception 'Students cannot delete attempt questions';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_guard_attempt_questions on public.attempt_questions;
create trigger trg_guard_attempt_questions
before insert or update or delete on public.attempt_questions
for each row execute function public.check_attempt_questions_guard();

-- 5. Enable Row Level Security (RLS)
alter table public.test_attempts enable row level security;
alter table public.attempt_questions enable row level security;

-- 6. RLS Policies for test_attempts
drop policy if exists "Users can read own attempts" on public.test_attempts;
create policy "Users can read own attempts"
on public.test_attempts for select
using (auth.uid() = user_id or public.is_admin());

-- Direct student INSERTs are disallowed: creation must go through start_test_attempt() RPC
drop policy if exists "Admins can insert attempts directly" on public.test_attempts;
drop policy if exists "Users can insert own attempts" on public.test_attempts;
create policy "Admins can insert attempts directly"
on public.test_attempts for insert
with check (public.is_admin());

-- Direct student UPDATEs are disallowed: modifications go through answer saves / submit RPC
drop policy if exists "Admins can update attempts directly" on public.test_attempts;
drop policy if exists "Users can update own in-progress attempts" on public.test_attempts;
create policy "Admins can update attempts directly"
on public.test_attempts for update
using (public.is_admin())
with check (public.is_admin());

-- 7. RLS Policies for attempt_questions
drop policy if exists "Users can read own attempt questions" on public.attempt_questions;
create policy "Users can read own attempt questions"
on public.attempt_questions for select
using (
  exists (
    select 1 from public.test_attempts
    where test_attempts.id = attempt_questions.attempt_id
      and (test_attempts.user_id = auth.uid() or public.is_admin())
  )
);

-- Direct student INSERTs are disallowed: created exclusively by start_test_attempt() RPC
drop policy if exists "Admins can insert attempt questions directly" on public.attempt_questions;
drop policy if exists "Users can insert own attempt questions" on public.attempt_questions;
create policy "Admins can insert attempt questions directly"
on public.attempt_questions for insert
with check (public.is_admin());

-- Students can update safe answer fields during in_progress (guarded by check_attempt_questions_guard trigger)
drop policy if exists "Users can update own attempt questions while in progress" on public.attempt_questions;
create policy "Users can update own attempt questions while in progress"
on public.attempt_questions for update
using (
  auth.uid() is not null and exists (
    select 1 from public.test_attempts
    where test_attempts.id = attempt_questions.attempt_id
      and (test_attempts.user_id = auth.uid() or public.is_admin())
      and test_attempts.status = 'in_progress'
  )
)
with check (
  auth.uid() is not null and exists (
    select 1 from public.test_attempts
    where test_attempts.id = attempt_questions.attempt_id
      and (test_attempts.user_id = auth.uid() or public.is_admin())
      and test_attempts.status = 'in_progress'
  )
);

-- 8. Server-Authoritative RPC: start_test_attempt
create or replace function public.start_test_attempt(p_test_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_test record;
  v_existing_id uuid;
  v_new_attempt_id uuid;
  v_total_questions integer := 0;
  v_max_score numeric(6, 2) := 0.00;
  v_tq record;
begin
  -- 1. Check authenticated user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Must be logged in to start a test attempt';
  end if;

  -- 2. Verify test exists and is published
  select * into v_test from public.tests where id = p_test_id;
  if not found then
    raise exception 'Test not found';
  end if;

  if v_test.status <> 'published' and not public.is_admin() then
    raise exception 'Test is not published';
  end if;

  -- 3. Check for existing in-progress attempt to resume
  select id into v_existing_id
  from public.test_attempts
  where user_id = v_user_id
    and test_id = p_test_id
    and status = 'in_progress'
  order by created_at desc
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object(
      'attempt_id', v_existing_id,
      'is_resumed', true
    );
  end if;

  -- 4. Calculate total questions and max marks from test_questions
  select count(*), coalesce(sum(marks), 0.00)
  into v_total_questions, v_max_score
  from public.test_questions
  where test_id = p_test_id;

  if v_total_questions = 0 then
    raise exception 'This test has no configured questions';
  end if;

  -- 5. Create test_attempts record
  insert into public.test_attempts (
    user_id,
    test_id,
    status,
    score,
    max_score,
    total_questions,
    unanswered_count,
    correct_count,
    incorrect_count
  ) values (
    v_user_id,
    p_test_id,
    'in_progress',
    0.00,
    v_max_score,
    v_total_questions,
    v_total_questions,
    0,
    0
  ) returning id into v_new_attempt_id;

  -- 6. Snapshot questions into attempt_questions
  for v_tq in 
    select question_id, section_id, display_order, marks, negative_marks
    from public.test_questions
    where test_id = p_test_id
    order by display_order
  loop
    insert into public.attempt_questions (
      attempt_id,
      question_id,
      section_id,
      display_order,
      marks,
      negative_marks,
      status,
      marked_for_review
    ) values (
      v_new_attempt_id,
      v_tq.question_id,
      v_tq.section_id,
      v_tq.display_order,
      v_tq.marks,
      v_tq.negative_marks,
      'unanswered',
      false
    );
  end loop;

  return jsonb_build_object(
    'attempt_id', v_new_attempt_id,
    'is_resumed', false
  );
end;
$$;

-- 9. Server-Authoritative RPC: submit_and_score_attempt
create or replace function public.submit_and_score_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_attempt record;
  v_aq record;
  v_correct_option_id uuid;
  v_total_score numeric(6, 2) := 0.00;
  v_max_score numeric(6, 2) := 0.00;
  v_correct_count integer := 0;
  v_incorrect_count integer := 0;
  v_unanswered_count integer := 0;
  v_total_questions integer := 0;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Must be logged in to submit a test';
  end if;

  select * into v_attempt from public.test_attempts where id = p_attempt_id;
  if not found then
    raise exception 'Attempt not found';
  end if;

  if v_attempt.user_id <> v_user_id and not public.is_admin() then
    raise exception 'Unauthorized attempt access';
  end if;

  -- Idempotency check: if already submitted, return the persisted score safely
  if v_attempt.status = 'submitted' then
    return jsonb_build_object(
      'status', 'already_submitted',
      'score', v_attempt.score,
      'max_score', v_attempt.max_score,
      'correct_count', v_attempt.correct_count,
      'incorrect_count', v_attempt.incorrect_count,
      'unanswered_count', v_attempt.unanswered_count,
      'total_questions', v_attempt.total_questions
    );
  end if;

  -- Compute official score by comparing selected_option_id with question_answer_keys
  for v_aq in select * from public.attempt_questions where attempt_id = p_attempt_id order by display_order loop
    v_total_questions := v_total_questions + 1;
    v_max_score := v_max_score + v_aq.marks;

    select correct_option_id into v_correct_option_id
    from public.question_answer_keys
    where question_id = v_aq.question_id;

    if v_aq.selected_option_id is null then
      v_unanswered_count := v_unanswered_count + 1;
    elsif v_aq.selected_option_id = v_correct_option_id then
      v_correct_count := v_correct_count + 1;
      v_total_score := v_total_score + v_aq.marks;
    else
      v_incorrect_count := v_incorrect_count + 1;
      v_total_score := v_total_score - v_aq.negative_marks;
    end if;
  end loop;

  -- Update test_attempts to submitted (direct SQL update in SECURITY DEFINER function)
  update public.test_attempts
  set
    status = 'submitted',
    submitted_at = timezone('utc', now()),
    score = v_total_score,
    max_score = v_max_score,
    correct_count = v_correct_count,
    incorrect_count = v_incorrect_count,
    unanswered_count = v_unanswered_count,
    total_questions = v_total_questions,
    updated_at = timezone('utc', now())
  where id = p_attempt_id;

  return jsonb_build_object(
    'status', 'submitted',
    'score', v_total_score,
    'max_score', v_max_score,
    'correct_count', v_correct_count,
    'incorrect_count', v_incorrect_count,
    'unanswered_count', v_unanswered_count,
    'total_questions', v_total_questions
  );
end;
$$;

-- 10. Server-Authoritative RPC: get_attempt_review_data (Strictly blocked for in-progress attempts)
create or replace function public.get_attempt_review_data(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_attempt record;
  v_test record;
  v_questions jsonb;
  v_sections jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Must be logged in to view attempt reviews';
  end if;

  select * into v_attempt from public.test_attempts where id = p_attempt_id;
  if not found then
    raise exception 'Attempt not found';
  end if;

  if v_attempt.user_id <> v_user_id and not public.is_admin() then
    raise exception 'Unauthorized attempt access';
  end if;

  if v_attempt.status <> 'submitted' and not public.is_admin() then
    raise exception 'Forbidden: Attempt is not submitted yet. Answer keys and explanations are protected.';
  end if;

  select * into v_test from public.tests where id = v_attempt.test_id;

  -- Build questions review payload with correct answers and explanations
  select jsonb_agg(
    jsonb_build_object(
      'id', aq.id,
      'question_id', q.id,
      'section_id', aq.section_id,
      'section_name', coalesce(es.name, 'General'),
      'display_order', aq.display_order,
      'question_text', q.question_text,
      'difficulty', q.difficulty,
      'marks', aq.marks,
      'negative_marks', aq.negative_marks,
      'selected_option_id', aq.selected_option_id,
      'correct_option_id', ak.correct_option_id,
      'is_correct', (aq.selected_option_id is not null and aq.selected_option_id = ak.correct_option_id),
      'is_unanswered', (aq.selected_option_id is null),
      'score_awarded', case
        when aq.selected_option_id is null then 0.00
        when aq.selected_option_id = ak.correct_option_id then aq.marks
        else -aq.negative_marks
      end,
      'explanation', q.explanation,
      'options', (
        select jsonb_agg(
          jsonb_build_object(
            'id', qo.id,
            'question_id', qo.question_id,
            'option_label', qo.option_label,
            'option_text', qo.option_text,
            'display_order', qo.display_order
          ) order by qo.display_order
        )
        from public.question_options qo
        where qo.question_id = q.id
      )
    ) order by aq.display_order
  ) into v_questions
  from public.attempt_questions aq
  join public.questions q on q.id = aq.question_id
  left join public.question_answer_keys ak on ak.question_id = q.id
  left join public.exam_sections es on es.id = aq.section_id
  where aq.attempt_id = p_attempt_id;

  -- Section wise results breakdown
  select jsonb_agg(
    jsonb_build_object(
      'section_id', coalesce(aq.section_id, '00000000-0000-0000-0000-000000000000'::uuid),
      'section_name', coalesce(es.name, 'General'),
      'total_questions', count(*),
      'correct_count', count(*) filter (where aq.selected_option_id is not null and aq.selected_option_id = ak.correct_option_id),
      'incorrect_count', count(*) filter (where aq.selected_option_id is not null and aq.selected_option_id <> ak.correct_option_id),
      'unanswered_count', count(*) filter (where aq.selected_option_id is null),
      'max_score', sum(aq.marks),
      'score', sum(
        case
          when aq.selected_option_id is null then 0.00
          when aq.selected_option_id = ak.correct_option_id then aq.marks
          else -aq.negative_marks
        end
      )
    )
  ) into v_sections
  from public.attempt_questions aq
  left join public.question_answer_keys ak on ak.question_id = aq.question_id
  left join public.exam_sections es on es.id = aq.section_id
  where aq.attempt_id = p_attempt_id
  group by coalesce(aq.section_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(es.name, 'General');

  return jsonb_build_object(
    'attempt', row_to_json(v_attempt),
    'test', row_to_json(v_test),
    'questions', coalesce(v_questions, '[]'::jsonb),
    'section_results', coalesce(v_sections, '[]'::jsonb)
  );
end;
$$;

-- 11. Explicit Permissions Configuration: Revoke anonymous access & Grant authenticated access
revoke all on function public.start_test_attempt(uuid) from public, anon;
grant execute on function public.start_test_attempt(uuid) to authenticated, service_role;

revoke all on function public.submit_and_score_attempt(uuid) from public, anon;
grant execute on function public.submit_and_score_attempt(uuid) to authenticated, service_role;

revoke all on function public.get_attempt_review_data(uuid) from public, anon;
grant execute on function public.get_attempt_review_data(uuid) to authenticated, service_role;



-- ==========================================================================
-- 4. SEED DATA: EXAMS, SECTIONS, 50 VERIFIED DEMO QUESTIONS & MOCK TESTS
-- ==========================================================================


-- Phase 2 Seed Data: Reference Structure, Verified Questions, Protected Answer Keys, and Demo Tests
-- Idempotent script: Safe to run repeatedly without creating duplicates.

do $$
declare
  -- Exams
  v_ugee_id uuid;
  v_spec_id uuid;

  -- Exam Sections
  v_supr_id uuid;
  v_reap_id uuid;
  v_spec_sec_id uuid;

  -- Subjects
  v_math_id uuid;
  v_phys_id uuid;
  v_chem_id uuid;
  v_apt_id uuid;

  -- Chapters
  v_algebra_id uuid;
  v_calculus_id uuid;
  v_mechanics_id uuid;
  v_electromag_id uuid;
  v_phys_chem_id uuid;
  v_org_chem_id uuid;
  v_logic_chap_id uuid;
  v_ling_chap_id uuid;

  -- Topics
  v_quad_top_id uuid;
  v_seq_top_id uuid;
  v_diff_top_id uuid;
  v_kin_top_id uuid;
  v_laws_top_id uuid;
  v_elect_top_id uuid;
  v_mole_top_id uuid;
  v_kinet_top_id uuid;
  v_org_top_id uuid;
  v_crit_top_id uuid;
  v_rule_top_id uuid;

  -- Test IDs
  v_test_ugee_id uuid;
  v_test_spec_id uuid;

  -- Helper function inside block to insert a question with 4 options and answer key
  -- We'll declare variables for question creation loop
  v_q_id uuid;
  v_opt_a uuid;
  v_opt_b uuid;
  v_opt_c uuid;
  v_opt_d uuid;
  v_correct_opt_id uuid;

begin
  ---------------------------------------------------------------------------
  -- 1. EXAMS & SECTIONS
  ---------------------------------------------------------------------------
  insert into public.exams (slug, name, description, negative_marking_ratio, published)
  values
    ('ugee', 'IIITH UGEE', 'Undergraduate Engineering Entrance Examination for Dual Degree programs (SUPR + REAP)', 0.2500, true)
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    negative_marking_ratio = excluded.negative_marking_ratio,
    published = excluded.published
  returning id into v_ugee_id;

  insert into public.exams (slug, name, description, negative_marking_ratio, published)
  values
    ('spec', 'IIITH SPEC', 'Special Channel of Admission for Single Degree B.Tech programs', 0.2500, true)
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    negative_marking_ratio = excluded.negative_marking_ratio,
    published = excluded.published
  returning id into v_spec_id;

  -- UGEE Sections
  insert into public.exam_sections (exam_id, slug, name, description, default_duration_seconds, display_order, published)
  values
    (v_ugee_id, 'supr', 'Subject Proficiency Test (SUPR)', 'Objective test evaluating XI and XII Mathematics, Physics, and Chemistry fundamentals.', 3600, 1, true)
  on conflict (exam_id, slug) do update set
    name = excluded.name,
    description = excluded.description,
    default_duration_seconds = excluded.default_duration_seconds,
    display_order = excluded.display_order,
    published = excluded.published
  returning id into v_supr_id;

  insert into public.exam_sections (exam_id, slug, name, description, default_duration_seconds, display_order, published)
  values
    (v_ugee_id, 'reap', 'Research Aptitude Test (REAP)', 'Tests critical thinking, logical reasoning, data interpretation, and linguistics rule induction.', 7200, 2, true)
  on conflict (exam_id, slug) do update set
    name = excluded.name,
    description = excluded.description,
    default_duration_seconds = excluded.default_duration_seconds,
    display_order = excluded.display_order,
    published = excluded.published
  returning id into v_reap_id;

  -- SPEC Section
  insert into public.exam_sections (exam_id, slug, name, description, default_duration_seconds, display_order, published)
  values
    (v_spec_id, 'subject-proficiency', 'Subject Proficiency Test', 'Covers Physics, Chemistry, and Mathematics for 12th standard syllabus.', 3600, 1, true)
  on conflict (exam_id, slug) do update set
    name = excluded.name,
    description = excluded.description,
    default_duration_seconds = excluded.default_duration_seconds,
    display_order = excluded.display_order,
    published = excluded.published
  returning id into v_spec_sec_id;

  ---------------------------------------------------------------------------
  -- 2. SUBJECTS
  ---------------------------------------------------------------------------
  insert into public.subjects (slug, name, description, display_order)
  values
    ('mathematics', 'Mathematics', 'Higher secondary Mathematics covering Algebra, Calculus, Coordinate Geometry, and Trigonometry.', 1)
  on conflict (slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_math_id;

  insert into public.subjects (slug, name, description, display_order)
  values
    ('physics', 'Physics', 'Core Physics concepts spanning Classical Mechanics, Electromagnetism, Modern Physics, and Waves.', 2)
  on conflict (slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_phys_id;

  insert into public.subjects (slug, name, description, display_order)
  values
    ('chemistry', 'Chemistry', 'Physical, Organic, and Inorganic Chemistry covering standard entrance syllabus.', 3)
  on conflict (slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_chem_id;

  insert into public.subjects (slug, name, description, display_order)
  values
    ('aptitude-reasoning', 'Aptitude & Reasoning', 'Logical puzzles, critical deduction, linguistic pattern deciphering, and research aptitude.', 4)
  on conflict (slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_apt_id;

  ---------------------------------------------------------------------------
  -- 3. CHAPTERS
  ---------------------------------------------------------------------------
  -- Math Chapters
  insert into public.chapters (subject_id, slug, name, description, display_order)
  values
    (v_math_id, 'algebra', 'Algebra', 'Quadratic equations, polynomials, complex numbers, sequences, and combinatorics.', 1)
  on conflict (subject_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_algebra_id;

  insert into public.chapters (subject_id, slug, name, description, display_order)
  values
    (v_math_id, 'calculus', 'Calculus', 'Limits, continuity, derivatives, and integral calculus applications.', 2)
  on conflict (subject_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_calculus_id;

  -- Physics Chapters
  insert into public.chapters (subject_id, slug, name, description, display_order)
  values
    (v_phys_id, 'mechanics', 'Mechanics', 'Kinematics, dynamics, work-energy, rotation, and gravitation.', 1)
  on conflict (subject_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_mechanics_id;

  insert into public.chapters (subject_id, slug, name, description, display_order)
  values
    (v_phys_id, 'electromagnetism', 'Electromagnetism', 'Electrostatics, current electricity, magnetostatics, and electromagnetic induction.', 2)
  on conflict (subject_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_electromag_id;

  -- Chemistry Chapters
  insert into public.chapters (subject_id, slug, name, description, display_order)
  values
    (v_chem_id, 'physical-chemistry', 'Physical Chemistry', 'Thermodynamics, kinetics, mole concept, and electrochemistry.', 1)
  on conflict (subject_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_phys_chem_id;

  insert into public.chapters (subject_id, slug, name, description, display_order)
  values
    (v_chem_id, 'organic-chemistry', 'Organic Chemistry', 'Reaction mechanisms, functional groups, and stereochemistry.', 2)
  on conflict (subject_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_org_chem_id;

  -- Aptitude Chapters
  insert into public.chapters (subject_id, slug, name, description, display_order)
  values
    (v_apt_id, 'logical-reasoning', 'Logical & Analytical Reasoning', 'Syllogisms, logical deductions, conditional statements, and relational graphs.', 1)
  on conflict (subject_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_logic_chap_id;

  insert into public.chapters (subject_id, slug, name, description, display_order)
  values
    (v_apt_id, 'linguistics-patterns', 'Linguistic & Pattern Analysis', 'Artificial grammar induction, cipher decoding, and visual matrix transformations.', 2)
  on conflict (subject_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_ling_chap_id;

  ---------------------------------------------------------------------------
  -- 4. TOPICS
  ---------------------------------------------------------------------------
  insert into public.topics (chapter_id, slug, name, description, display_order)
  values
    (v_algebra_id, 'quadratic-equations', 'Quadratic Equations', 'Roots, discriminant analysis, coefficients relations, and inequalities.', 1)
  on conflict (chapter_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_quad_top_id;

  insert into public.topics (chapter_id, slug, name, description, display_order)
  values
    (v_algebra_id, 'sequences-and-series', 'Sequences and Series', 'Arithmetic, geometric, and harmonic progressions and infinite series.', 2)
  on conflict (chapter_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_seq_top_id;

  insert into public.topics (chapter_id, slug, name, description, display_order)
  values
    (v_calculus_id, 'differential-calculus', 'Differential Calculus', 'Limits, derivatives, tangents, monotonicity, and maxima-minima.', 1)
  on conflict (chapter_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_diff_top_id;

  insert into public.topics (chapter_id, slug, name, description, display_order)
  values
    (v_mechanics_id, 'kinematics', 'Kinematics', '1D & 2D motion, projectile trajectories, relative velocity, and acceleration vectors.', 1)
  on conflict (chapter_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_kin_top_id;

  insert into public.topics (chapter_id, slug, name, description, display_order)
  values
    (v_mechanics_id, 'laws-of-motion', 'Laws of Motion', 'Newtonian mechanics, friction, pulleys, and constraint relations.', 2)
  on conflict (chapter_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_laws_top_id;

  insert into public.topics (chapter_id, slug, name, description, display_order)
  values
    (v_electromag_id, 'electrostatics', 'Electrostatics', 'Coulomb law, electric field, potential, Gauss law, and flux.', 1)
  on conflict (chapter_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_elect_top_id;

  insert into public.topics (chapter_id, slug, name, description, display_order)
  values
    (v_phys_chem_id, 'mole-concept', 'Mole Concept & Stoichiometry', 'Molar mass, empirical formulas, limiting reagents, and concentration terms.', 1)
  on conflict (chapter_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_mole_top_id;

  insert into public.topics (chapter_id, slug, name, description, display_order)
  values
    (v_phys_chem_id, 'chemical-kinetics', 'Chemical Kinetics', 'Rate laws, order of reaction, Arrhenius activation energy, and half-life.', 2)
  on conflict (chapter_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_kinet_top_id;

  insert into public.topics (chapter_id, slug, name, description, display_order)
  values
    (v_org_chem_id, 'basic-organic-mechanisms', 'Basic Reaction Mechanisms', 'Electrophilic addition, nucleophilic substitution (SN1/SN2), and elimination.', 1)
  on conflict (chapter_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_org_top_id;

  insert into public.topics (chapter_id, slug, name, description, display_order)
  values
    (v_logic_chap_id, 'critical-thinking', 'Critical Thinking & Deductions', 'Evaluating premises, detecting logical fallacies, and multi-step deduction.', 1)
  on conflict (chapter_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_crit_top_id;

  insert into public.topics (chapter_id, slug, name, description, display_order)
  values
    (v_ling_chap_id, 'rule-induction', 'Rule Induction & Grammar Systems', 'Deciphering unfamiliar language morphology, translation matrices, and syntactic rules.', 1)
  on conflict (chapter_id, slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order
  returning id into v_rule_top_id;

end $$;

-- 5. VERIFIED QUESTIONS SEEDING PROCEDURE
-- We'll create a temporary helper function to insert questions safely
create or replace function pg_temp.seed_question(
  p_q_key text,
  p_exam_slug text,
  p_sec_slug text,
  p_sub_slug text,
  p_chap_slug text,
  p_top_slug text,
  p_q_text text,
  p_diff text,
  p_explanation text,
  p_marks numeric,
  p_neg_marks numeric,
  p_opt_a text,
  p_opt_b text,
  p_opt_c text,
  p_opt_d text,
  p_correct_label text
) returns uuid as $$
declare
  v_exam_id uuid;
  v_sec_id uuid;
  v_sub_id uuid;
  v_chap_id uuid;
  v_top_id uuid;
  v_qid uuid;
  v_opta_id uuid;
  v_optb_id uuid;
  v_optc_id uuid;
  v_optd_id uuid;
  v_correct_id uuid;
begin
  select id into v_exam_id from public.exams where slug = p_exam_slug;
  select id into v_sec_id from public.exam_sections where exam_id = v_exam_id and slug = p_sec_slug;
  select id into v_sub_id from public.subjects where slug = p_sub_slug;
  select id into v_chap_id from public.chapters where subject_id = v_sub_id and slug = p_chap_slug;
  select id into v_top_id from public.topics where chapter_id = v_chap_id and slug = p_top_slug;

  -- Upsert question based on unique question_text + topic_id match
  select id into v_qid from public.questions where question_text = p_q_text and topic_id = v_top_id;
  if v_qid is null then
    insert into public.questions (
      exam_id, section_id, subject_id, chapter_id, topic_id,
      question_text, question_type, difficulty, explanation,
      marks, negative_marks, status
    ) values (
      v_exam_id, v_sec_id, v_sub_id, v_chap_id, v_top_id,
      p_q_text, 'mcq', p_diff, p_explanation,
      p_marks, p_neg_marks, 'published'
    ) returning id into v_qid;
  else
    update public.questions set
      exam_id = v_exam_id,
      section_id = v_sec_id,
      subject_id = v_sub_id,
      chapter_id = v_chap_id,
      difficulty = p_diff,
      explanation = p_explanation,
      marks = p_marks,
      negative_marks = p_neg_marks,
      status = 'published',
      updated_at = timezone('utc', now())
    where id = v_qid;
  end if;

  -- Insert/update options
  insert into public.question_options (question_id, option_label, option_text, display_order)
  values (v_qid, 'A', p_opt_a, 1)
  on conflict (question_id, option_label) do update set option_text = excluded.option_text
  returning id into v_opta_id;

  insert into public.question_options (question_id, option_label, option_text, display_order)
  values (v_qid, 'B', p_opt_b, 2)
  on conflict (question_id, option_label) do update set option_text = excluded.option_text
  returning id into v_optb_id;

  insert into public.question_options (question_id, option_label, option_text, display_order)
  values (v_qid, 'C', p_opt_c, 3)
  on conflict (question_id, option_label) do update set option_text = excluded.option_text
  returning id into v_optc_id;

  insert into public.question_options (question_id, option_label, option_text, display_order)
  values (v_qid, 'D', p_opt_d, 4)
  on conflict (question_id, option_label) do update set option_text = excluded.option_text
  returning id into v_optd_id;

  if p_correct_label = 'A' then v_correct_id := v_opta_id;
  elsif p_correct_label = 'B' then v_correct_id := v_optb_id;
  elsif p_correct_label = 'C' then v_correct_id := v_optc_id;
  elsif p_correct_label = 'D' then v_correct_id := v_optd_id;
  end if;

  -- Insert/update protected answer key
  insert into public.question_answer_keys (question_id, correct_option_id)
  values (v_qid, v_correct_id)
  on conflict (question_id) do update set correct_option_id = excluded.correct_option_id, updated_at = timezone('utc', now());

  return v_qid;
end;
$$ language plpgsql;

-- Populating 50 Verified Questions:
-- UGEE SUPR: 10 Math, 10 Physics, 10 Chemistry
-- UGEE REAP: 10 Questions
-- SPEC: 10 PCM Questions

--------------------------------------------------------------------------------
-- UGEE SUPR: 10 Mathematics Questions
--------------------------------------------------------------------------------
select pg_temp.seed_question(
  'supr-math-01', 'ugee', 'supr', 'mathematics', 'algebra', 'quadratic-equations',
  'If $\alpha$ and $\beta$ are the roots of the equation $x^2 - 6x + c = 0$, and $3\alpha + 2\beta = 20$, find the value of $c$.',
  'medium',
  'From Vieta formulas: \alpha + \beta = 6. Given 3\alpha + 2\beta = 20 \implies 2(\alpha + \beta) + \alpha = 20 \implies 12 + \alpha = 20 \implies \alpha = 8. Then \beta = 6 - 8 = -2. Thus c = \alpha\beta = 8 \times (-2) = -16.',
  1.0, 0.25,
  '-16', '16', '-12', '8',
  'A'
);

select pg_temp.seed_question(
  'supr-math-02', 'ugee', 'supr', 'mathematics', 'algebra', 'quadratic-equations',
  'Find the number of real solutions of the equation $e^x + e^{-x} = 2\cos(x)$.',
  'medium',
  'For any real x, by AM-GM inequality, e^x + e^{-x} \ge 2 with equality holding only when x = 0. Also, 2\cos(x) \le 2. At x = 0: LHS = 2 and RHS = 2\cos(0) = 2. For x \ne 0, e^x + e^{-x} > 2 \ge 2\cos(x). Hence exactly 1 real solution (x = 0).',
  1.0, 0.25,
  '0', '1', '2', 'Infinitely many',
  'B'
);

select pg_temp.seed_question(
  'supr-math-03', 'ugee', 'supr', 'mathematics', 'algebra', 'sequences-and-series',
  'If the sum of first $n$ terms of an AP is given by $S_n = 3n^2 + 5n$, what is its 10th term?',
  'easy',
  'T_n = S_n - S_{n-1} = (3n^2 + 5n) - (3(n-1)^2 + 5(n-1)) = 6n + 2. For n = 10, T_{10} = 6(10) + 2 = 62.',
  1.0, 0.25,
  '56', '62', '65', '70',
  'B'
);

select pg_temp.seed_question(
  'supr-math-04', 'ugee', 'supr', 'mathematics', 'algebra', 'sequences-and-series',
  'The sum of the infinite geometric series $1 + \frac{2}{3} + \frac{4}{9} + \frac{8}{27} + \dots$ is:',
  'easy',
  'First term a = 1, common ratio r = 2/3. Sum S = a / (1 - r) = 1 / (1 - 2/3) = 1 / (1/3) = 3.',
  1.0, 0.25,
  '2', '5/2', '3', '7/2',
  'C'
);

select pg_temp.seed_question(
  'supr-math-05', 'ugee', 'supr', 'mathematics', 'calculus', 'differential-calculus',
  'Evaluate the limit: $\lim_{x \to 0} \frac{\sin(3x) - 3x}{x^3}$.',
  'medium',
  'Using Taylor series expansion: \sin(3x) = 3x - \frac{(3x)^3}{6} + O(x^5) = 3x - \frac{27x^3}{6}. Then (\sin(3x) - 3x)/x^3 = -27/6 = -9/2 = -4.5.',
  1.0, 0.25,
  '-9/2', '-3/2', '0', '9/2',
  'A'
);

select pg_temp.seed_question(
  'supr-math-06', 'ugee', 'supr', 'mathematics', 'calculus', 'differential-calculus',
  'The maximum value of $f(x) = x(1-x)^2$ on the interval $[0, 1]$ is:',
  'medium',
  'f(x) = x(1 - 2x + x^2) = x - 2x^2 + x^3. f''(x) = 1 - 4x + 3x^2 = (3x - 1)(x - 1). Critical points in (0, 1) are x = 1/3. f(1/3) = (1/3)(2/3)^2 = 4/27.',
  1.0, 0.25,
  '1/4', '4/27', '2/9', '8/27',
  'B'
);

select pg_temp.seed_question(
  'supr-math-07', 'ugee', 'supr', 'mathematics', 'algebra', 'quadratic-equations',
  'For what real values of $k$ does the quadratic equation $x^2 + 2(k-1)x + (k+5) = 0$ have real and distinct roots?',
  'medium',
  'Distinct real roots require Discriminant D > 0. D = 4(k-1)^2 - 4(k+5) = 4(k^2 - 2k + 1 - k - 5) = 4(k^2 - 3k - 4) = 4(k - 4)(k + 1) > 0. Thus k < -1 or k > 4.',
  1.0, 0.25,
  '-1 < k < 4', 'k < -1 or k > 4', 'k \le -1 or k \ge 4', 'k > 4',
  'B'
);

select pg_temp.seed_question(
  'supr-math-08', 'ugee', 'supr', 'mathematics', 'algebra', 'sequences-and-series',
  'If $a, b, c$ are in Harmonic Progression (HP), then which of the following is true?',
  'easy',
  'By definition of HP, 1/a, 1/b, 1/c are in AP, so 2/b = 1/a + 1/c = (a+c)/(ac), which means b = 2ac/(a+c).',
  1.0, 0.25,
  'b = (a+c)/2', 'b = \sqrt{ac}', 'b = 2ac/(a+c)', 'b = (a^2+c^2)/2',
  'C'
);

select pg_temp.seed_question(
  'supr-math-09', 'ugee', 'supr', 'mathematics', 'calculus', 'differential-calculus',
  'What is the slope of the normal to the curve $y = x^3 - 3x + 2$ at the point where $x = 2$?',
  'medium',
  'dy/dx = 3x^2 - 3. At x = 2, dy/dx = 3(4) - 3 = 9 (tangent slope). Slope of normal = -1 / (dy/dx) = -1/9.',
  1.0, 0.25,
  '9', '-9', '-1/9', '1/9',
  'C'
);

select pg_temp.seed_question(
  'supr-math-10', 'ugee', 'supr', 'mathematics', 'calculus', 'differential-calculus',
  'If $y = \ln(\sec x + \tan x)$, then $\frac{dy}{dx}$ is equal to:',
  'easy',
  'dy/dx = \frac{1}{\sec x + \tan x} \cdot (\sec x \tan x + \sec^2 x) = \frac{\sec x(\tan x + \sec x)}{\sec x + \tan x} = \sec x.',
  1.0, 0.25,
  '\sec x', '\tan x', '\sec x \tan x', '\cos x',
  'A'
);

--------------------------------------------------------------------------------
-- UGEE SUPR: 10 Physics Questions
--------------------------------------------------------------------------------
select pg_temp.seed_question(
  'supr-phys-01', 'ugee', 'supr', 'physics', 'mechanics', 'kinematics',
  'A particle starts from rest and moves with uniform acceleration $a$. The ratio of distances travelled in the $n$-th second to that in $n$ seconds is:',
  'medium',
  'Distance in n-th second: S_{nth} = u + a/2(2n - 1) = a/2(2n - 1). Distance in n seconds: S_n = (1/2) a n^2. Ratio = \frac{a/2 (2n - 1)}{(1/2) a n^2} = \frac{2n - 1}{n^2}.',
  1.0, 0.25,
  '(2n - 1) / n^2', '2n / (n^2 + 1)', '(2n - 1) / n', '1 / n^2',
  'A'
);

select pg_temp.seed_question(
  'supr-phys-02', 'ugee', 'supr', 'physics', 'mechanics', 'kinematics',
  'A projectile is thrown with velocity $u$ at an angle $\theta$ with the horizontal. At the highest point of its trajectory, its radius of curvature is:',
  'hard',
  'At highest point, velocity is horizontal: v = u \cos\theta, and net acceleration is perpendicular downwards: a_n = g. Radius of curvature R = v^2 / a_n = (u^2 \cos^2\theta) / g.',
  1.0, 0.25,
  '(u^2 \sin^2\theta)/g', '(u^2 \cos^2\theta)/g', 'u^2/g', '(u^2 \cos\theta)/g',
  'B'
);

select pg_temp.seed_question(
  'supr-phys-03', 'ugee', 'supr', 'physics', 'mechanics', 'laws-of-motion',
  'A block of mass $m$ rests on a rough horizontal surface with coefficient of static friction $\mu$. The minimum force required to move the block is:',
  'medium',
  'Let force F be applied at angle \theta above horizontal. F \cos\theta = \mu N = \mu (mg - F \sin\theta) \implies F = \frac{\mu mg}{\cos\theta + \mu \sin\theta}. Maximum of denominator is \sqrt{1 + \mu^2}. Hence F_{min} = \frac{\mu mg}{\sqrt{1 + \mu^2}}.',
  1.0, 0.25,
  '\mu mg', '\frac{\mu mg}{\sqrt{1 + \mu^2}}', '\frac{\mu mg}{1 + \mu}', '\frac{mg}{\sqrt{1 + \mu^2}}',
  'B'
);

select pg_temp.seed_question(
  'supr-phys-04', 'ugee', 'supr', 'physics', 'mechanics', 'laws-of-motion',
  'A monkey of mass $m$ climbs up a light rope hanging over a frictionless pulley with an acceleration $a = g/2$ relative to rope. If the other end is held fixed, the tension in the rope is:',
  'medium',
  'Equation of motion: T - mg = m a \implies T = m(g + a) = m(g + g/2) = \frac{3}{2}mg.',
  1.0, 0.25,
  'mg/2', 'mg', '3mg/2', '2mg',
  'C'
);

select pg_temp.seed_question(
  'supr-phys-05', 'ugee', 'supr', 'physics', 'electromagnetism', 'electrostatics',
  'Two point charges $+q$ and $-q$ are placed at a distance $2a$ apart. The electric potential at a distance $r$ ($r \gg a$) on the axial line from the dipole center is proportional to:',
  'easy',
  'Electric potential due to a dipole on the axial line is V = \frac{1}{4\pi\varepsilon_0} \frac{p}{r^2}. Thus it is proportional to 1/r^2.',
  1.0, 0.25,
  '1/r', '1/r^2', '1/r^3', 'r',
  'B'
);

select pg_temp.seed_question(
  'supr-phys-06', 'ugee', 'supr', 'physics', 'electromagnetism', 'electrostatics',
  'A conducting spherical shell of radius $R$ carries a charge $Q$. The electric field at a distance $r < R$ from the center is:',
  'easy',
  'Inside a hollow charged spherical conductor in electrostatic equilibrium, charge resides entirely on the outer surface, so enclosed charge Q_{enc} = 0, meaning E = 0.',
  1.0, 0.25,
  '0', 'kQ/R^2', 'kQ/r^2', 'kQ/(R-r)^2',
  'A'
);

select pg_temp.seed_question(
  'supr-phys-07', 'ugee', 'supr', 'physics', 'mechanics', 'kinematics',
  'A car travels first half of the total distance at speed $v_1$ and the second half at speed $v_2$. The average speed over the entire journey is:',
  'easy',
  'Total distance = 2d. Total time = d/v_1 + d/v_2 = d(v_1 + v_2)/(v_1 v_2). Average speed = 2d / total time = 2 v_1 v_2 / (v_1 + v_2).',
  1.0, 0.25,
  '(v_1 + v_2)/2', '\sqrt{v_1 v_2}', '2 v_1 v_2 / (v_1 + v_2)', 'v_1 v_2 / (v_1 + v_2)',
  'C'
);

select pg_temp.seed_question(
  'supr-phys-08', 'ugee', 'supr', 'physics', 'mechanics', 'laws-of-motion',
  'When an elevator moves downwards with an acceleration $a = g$, the apparent weight of a person of mass $m$ standing inside is:',
  'easy',
  'Effective normal force N = m(g - a). When a = g, N = m(g - g) = 0 (weightlessness).',
  1.0, 0.25,
  '2 mg', 'mg', 'mg/2', '0',
  'D'
);

select pg_temp.seed_question(
  'supr-phys-09', 'ugee', 'supr', 'physics', 'electromagnetism', 'electrostatics',
  'If the distance between the plates of an isolated charged parallel plate capacitor is doubled, the stored electrostatic energy:',
  'medium',
  'For an isolated capacitor, charge Q is constant. Energy U = Q^2 / (2C). Since capacitance C = \varepsilon_0 A / d, doubling d halves C. Therefore, U becomes 2U (doubles).',
  1.0, 0.25,
  'Halves', 'Remains unchanged', 'Doubles', 'Quadruples',
  'C'
);

select pg_temp.seed_question(
  'supr-phys-10', 'ugee', 'supr', 'physics', 'mechanics', 'kinematics',
  'A ball is dropped from height $H$. At what height from the ground is its kinetic energy equal to twice its potential energy (taking ground as reference)?',
  'medium',
  'Total mechanical energy E = mgH. At height h, PE = mgh and KE = mg(H - h). Given KE = 2 PE \implies mg(H - h) = 2 mgh \implies H - h = 2h \implies 3h = H \implies h = H/3.',
  1.0, 0.25,
  'H/2', 'H/3', '2H/3', 'H/4',
  'B'
);

--------------------------------------------------------------------------------
-- UGEE SUPR: 10 Chemistry Questions
--------------------------------------------------------------------------------
select pg_temp.seed_question(
  'supr-chem-01', 'ugee', 'supr', 'chemistry', 'physical-chemistry', 'mole-concept',
  'How many moles of oxygen atoms are present in $4.4\text{ g}$ of $\text{CO}_2$ (molar mass = $44\text{ g/mol}$)?',
  'easy',
  'Moles of CO_2 = 4.4 / 44 = 0.1 mol. Each mole of CO_2 contains 2 moles of O atoms. Therefore, moles of O atoms = 0.1 \times 2 = 0.2 mol.',
  1.0, 0.25,
  '0.1 mol', '0.2 mol', '0.4 mol', '4.4 mol',
  'B'
);

select pg_temp.seed_question(
  'supr-chem-02', 'ugee', 'supr', 'chemistry', 'physical-chemistry', 'mole-concept',
  'The volume of $0.1\text{ M HCl}$ required to completely neutralize $25\text{ mL}$ of $0.2\text{ M NaOH}$ solution is:',
  'easy',
  'Using M_1 V_1 n_1 = M_2 V_2 n_2: 0.1 \times V_1 \times 1 = 0.2 \times 25 \times 1 \implies 0.1 V_1 = 5 \implies V_1 = 50\text{ mL}.',
  1.0, 0.25,
  '25 mL', '50 mL', '75 mL', '100 mL',
  'B'
);

select pg_temp.seed_question(
  'supr-chem-03', 'ugee', 'supr', 'chemistry', 'physical-chemistry', 'chemical-kinetics',
  'For a first-order reaction $A \to \text{Products}$, if the half-life is $20\text{ minutes}$, the time required for $75\%$ completion is:',
  'easy',
  'For a first order reaction, 75% completion corresponds to 2 half-lives: t_{75\%} = 2 \times t_{1/2} = 2 \times 20 = 40\text{ minutes}.',
  1.0, 0.25,
  '30 minutes', '40 minutes', '60 minutes', '80 minutes',
  'B'
);

select pg_temp.seed_question(
  'supr-chem-04', 'ugee', 'supr', 'chemistry', 'physical-chemistry', 'chemical-kinetics',
  'If the rate constant of a reaction is $k = 3.2 \times 10^{-3}\text{ L}\cdot\text{mol}^{-1}\cdot\text{s}^{-1}$, the overall order of the reaction is:',
  'easy',
  'The unit of rate constant is (mol/L)^{1-n} s^{-1}. Here the unit is L mol^{-1} s^{-1} = (mol/L)^{-1} s^{-1}. Comparing exponents: 1 - n = -1 \implies n = 2 (Second order).',
  1.0, 0.25,
  'Zero order', 'First order', 'Second order', 'Third order',
  'C'
);

select pg_temp.seed_question(
  'supr-chem-05', 'ugee', 'supr', 'chemistry', 'organic-chemistry', 'basic-organic-mechanisms',
  'Which of the following alkyl halides undergoes $\text{S}_\text{N}1$ solvolysis at the fastest rate?',
  'medium',
  'S_N1 reaction rate depends on carbocation stability. (CH_3)_3C-Br forms a tertiary carbocation with 9 hyperconjugative hydrogens, which is highly stable compared to secondary or primary carbocations.',
  1.0, 0.25,
  '\text{CH}_3\text{CH}_2\text{Br}', '(\text{CH}_3)_2\text{CHBr}', '(\text{CH}_3)_3\text{CBr}', '\text{CH}_3\text{Br}',
  'C'
);

select pg_temp.seed_question(
  'supr-chem-06', 'ugee', 'supr', 'chemistry', 'organic-chemistry', 'basic-organic-mechanisms',
  'The major product obtained when 2-bromobutane is heated with alcoholic $\text{KOH}$ is:',
  'medium',
  'Alcoholic KOH promotes E2 dehydrohalogenation following Saytzeff rule, yielding the more substituted, stable alkene: 2-butene (but-2-ene).',
  1.0, 0.25,
  'But-1-ene', 'But-2-ene', 'Butan-2-ol', 'Butan-1-ol',
  'B'
);

select pg_temp.seed_question(
  'supr-chem-07', 'ugee', 'supr', 'chemistry', 'physical-chemistry', 'mole-concept',
  'The oxidation state of Chromium in potassium dichromate ($\text{K}_2\text{Cr}_2\text{O}_7$) is:',
  'easy',
  '2(+1) + 2(x) + 7(-2) = 0 \implies 2 + 2x - 14 = 0 \implies 2x = 12 \implies x = +6.',
  1.0, 0.25,
  '+3', '+4', '+6', '+7',
  'C'
);

select pg_temp.seed_question(
  'supr-chem-08', 'ugee', 'supr', 'chemistry', 'physical-chemistry', 'chemical-kinetics',
  'According to Arrhenius equation $k = A e^{-E_a/RT}$, a plot of $\ln k$ versus $1/T$ gives a straight line with slope equal to:',
  'easy',
  'Taking natural log: \ln k = \ln A - \frac{E_a}{R} \left(\frac{1}{T}\right). This is in y = mx + c form, so the slope m is -E_a / R.',
  1.0, 0.25,
  '-E_a/R', 'E_a/R', '-E_a/(2.303 R)', 'A/R',
  'A'
);

select pg_temp.seed_question(
  'supr-chem-09', 'ugee', 'supr', 'chemistry', 'organic-chemistry', 'basic-organic-mechanisms',
  'Which reactive intermediate is generated during the acid-catalyzed dehydration of ethanol to ethene?',
  'medium',
  'Protonation of ethanol produces ethyl oxonium ion which loses water to form a carbocation intermediate (CH_3-CH_2^+), followed by deprotonation to give ethene.',
  1.0, 0.25,
  'Carbocation', 'Carbanion', 'Free radical', 'Carbene',
  'A'
);

select pg_temp.seed_question(
  'supr-chem-10', 'ugee', 'supr', 'chemistry', 'physical-chemistry', 'mole-concept',
  'What is the molality of a solution containing $18\text{ g}$ of glucose ($\text{C}_6\text{H}_{12}\text{O}_6$, molar mass = $180\text{ g/mol}$) dissolved in $500\text{ g}$ of water?',
  'easy',
  'Moles of solute = 18 / 180 = 0.1 mol. Mass of solvent = 500 g = 0.5 kg. Molality m = moles / kg solvent = 0.1 / 0.5 = 0.2 mol/kg (0.2 m).',
  1.0, 0.25,
  '0.1 m', '0.2 m', '0.5 m', '1.0 m',
  'B'
);

--------------------------------------------------------------------------------
-- UGEE REAP: 10 Questions (Aptitude, Critical Thinking & Linguistics)
--------------------------------------------------------------------------------
select pg_temp.seed_question(
  'reap-q-01', 'ugee', 'reap', 'aptitude-reasoning', 'logical-reasoning', 'critical-thinking',
  'Statement: All algorithms are deterministic procedures. Some deterministic procedures run in linear time. No linear time procedure causes stack overflow.\nConclusion I: Some algorithms do not cause stack overflow.\nConclusion II: All deterministic procedures are algorithms.\nWhich conclusion logically follows?',
  'medium',
  'From the premises: The subset of deterministic procedures that run in linear time do not cause stack overflow. However, we cannot guarantee these are the ones that overlap with algorithms. Conclusion II is an invalid conversion of "All A are B". Hence neither conclusion definitely follows.',
  2.0, 0.50,
  'Only Conclusion I follows', 'Only Conclusion II follows', 'Both follow', 'Neither follows',
  'D'
);

select pg_temp.seed_question(
  'reap-q-02', 'ugee', 'reap', 'aptitude-reasoning', 'linguistics-patterns', 'rule-induction',
  'In an artificial language system:\n• "keli tor" means "red flower"\n• "keli buma" means "red bird"\n• "soli buma" means "fast bird"\nWhat would most likely mean "fast flower"?',
  'easy',
  'Analyzing pairs: "keli" corresponds to "red", "buma" corresponds to "bird", "soli" corresponds to "fast", and "tor" corresponds to "flower". Therefore, "fast flower" is "soli tor".',
  2.0, 0.50,
  'soli tor', 'tor soli', 'buma tor', 'keli soli',
  'A'
);

select pg_temp.seed_question(
  'reap-q-03', 'ugee', 'reap', 'aptitude-reasoning', 'logical-reasoning', 'critical-thinking',
  'A researcher tests four cards showing [D], [3], [B], [8]. Rule: "If a card shows an even number on one side, its opposite side must show a vowel." Which cards MUST be turned over to verify the rule?',
  'hard',
  'By Wason Selection Task logic: For P \implies Q, we must test P (card with even number: [8]) to check if opposite is vowel, and \neg Q (card with consonant: [D] and [B]) to ensure opposite is not even. The card [8] (even number) and consonant cards [D], [B] test validity. Specifically, [8] and the consonant cards must be verified.',
  2.0, 0.50,
  '[8] only', '[8] and [D] and [B]', '[3] and [8]', '[D] and [3]',
  'B'
);

select pg_temp.seed_question(
  'reap-q-04', 'ugee', 'reap', 'aptitude-reasoning', 'linguistics-patterns', 'rule-induction',
  'Consider the morphological rule in Language X where verb negation prefixes "no-" and changes the root vowel: "pata" (run) \to "no-peti" (not run), "sala" (sing) \to "no-seli" (not sing). Following this grammar, what is the negated form of "kaba" (fly)?',
  'medium',
  'The rule prefixes "no-" and transforms internal vowels "a" into "e" and "i" systematically ("pata" \to "peti", "sala" \to "seli"). Applying this to "kaba" yields "no-kebi".',
  2.0, 0.50,
  'no-kaba', 'no-keba', 'no-kebi', 'kebi-no',
  'C'
);

select pg_temp.seed_question(
  'reap-q-05', 'ugee', 'reap', 'aptitude-reasoning', 'logical-reasoning', 'critical-thinking',
  'Five nodes A, B, C, D, E are connected such that: A is connected to B and C; C is connected to D and E; B is connected to E. What is the shortest distance (in hops) between A and D?',
  'easy',
  'Path 1: A -> C -> D takes 2 hops. Path 2: A -> B -> E -> C -> D takes 4 hops. The shortest path is A -> C -> D with length 2 hops.',
  2.0, 0.50,
  '1 hop', '2 hops', '3 hops', '4 hops',
  'B'
);

select pg_temp.seed_question(
  'reap-q-06', 'ugee', 'reap', 'aptitude-reasoning', 'linguistics-patterns', 'rule-induction',
  'In a substitution cipher: "HELLO" is encrypted as "KHOOR". How is the word "WORLD" encrypted under the same cipher?',
  'easy',
  'Each letter is shifted forward by +3 positions: H(+3)=K, E(+3)=H, L(+3)=O, O(+3)=R. For "WORLD": W(+3)=Z, O(+3)=R, R(+3)=U, L(+3)=O, D(+3)=G. Result: "ZRUOG".',
  2.0, 0.50,
  'ZRUOG', 'YQTOE', 'ZSVPH', 'XPSME',
  'A'
);

select pg_temp.seed_question(
  'reap-q-07', 'ugee', 'reap', 'aptitude-reasoning', 'logical-reasoning', 'critical-thinking',
  'If $X > Y$, $Y \ge Z$, and $W < Z$, which of the following inequalities must be strictly TRUE?',
  'easy',
  'From given relations: X > Y \ge Z > W. By transitivity, X > W strictly.',
  2.0, 0.50,
  'X > W', 'X = Z', 'Y \le W', 'W > X',
  'A'
);

select pg_temp.seed_question(
  'reap-q-08', 'ugee', 'reap', 'aptitude-reasoning', 'linguistics-patterns', 'rule-induction',
  'Given number sequence with hidden pattern: 3, 7, 15, 31, 63, ... What is the next term?',
  'easy',
  'Each term is T_n = 2 \times T_{n-1} + 1. For the next term: 2 \times 63 + 1 = 126 + 1 = 127 (or 2^{n+1} - 1: 2^7 - 1 = 127).',
  2.0, 0.50,
  '95', '125', '127', '129',
  'C'
);

select pg_temp.seed_question(
  'reap-q-09', 'ugee', 'reap', 'aptitude-reasoning', 'logical-reasoning', 'critical-thinking',
  'In a tournament with 8 teams where every team plays every other team exactly once, what is the total number of matches played?',
  'easy',
  'Total matches = \binom{8}{2} = \frac{8 \times 7}{2} = 28 matches.',
  2.0, 0.50,
  '24', '28', '32', '56',
  'B'
);

select pg_temp.seed_question(
  'reap-q-10', 'ugee', 'reap', 'aptitude-reasoning', 'linguistics-patterns', 'rule-induction',
  'In an alien numeral system: "ok" = 1, "ok-ok" = 2, "tu" = 5, "tu-ok" = 6, "ro" = 20. How would 27 be represented?',
  'medium',
  'Analyzing positional/additive tokens: 27 = 20 + 5 + 1 + 1 = "ro" + "tu" + "ok" + "ok" \implies "ro-tu-ok-ok".',
  2.0, 0.50,
  'ro-tu-ok-ok', 'ro-tu-ok', 'tu-ro-ok-ok', 'ro-ok-tu-ok',
  'A'
);

--------------------------------------------------------------------------------
-- SPEC: 10 Representative PCM Questions
--------------------------------------------------------------------------------
select pg_temp.seed_question(
  'spec-pcm-01', 'spec', 'subject-proficiency', 'mathematics', 'algebra', 'quadratic-equations',
  'Find the sum of all values of $x$ satisfying $|x^2 - 4x + 3| = 3$.',
  'medium',
  'Case 1: x^2 - 4x + 3 = 3 \implies x(x - 4) = 0 \implies x = 0, 4. Case 2: x^2 - 4x + 3 = -3 \implies x^2 - 4x + 6 = 0 (Discriminant = 16 - 24 < 0, no real roots). Sum of real roots = 0 + 4 = 4.',
  1.0, 0.25,
  '0', '3', '4', '7',
  'C'
);

select pg_temp.seed_question(
  'spec-pcm-02', 'spec', 'subject-proficiency', 'mathematics', 'calculus', 'differential-calculus',
  'If $f(x) = \frac{x}{\ln x}$, the local minimum of $f(x)$ occurs at $x = $:',
  'medium',
  'f''(x) = \frac{\ln x(1) - x(1/x)}{(\ln x)^2} = \frac{\ln x - 1}{(\ln x)^2}. Setting f''(x) = 0 gives \ln x = 1 \implies x = e.',
  1.0, 0.25,
  '1', 'e', 'e^2', '1/e',
  'B'
);

select pg_temp.seed_question(
  'spec-pcm-03', 'spec', 'subject-proficiency', 'mathematics', 'algebra', 'sequences-and-series',
  'The value of $\sum_{k=1}^{\infty} \frac{1}{k(k+1)}$ is:',
  'easy',
  'Telescoping series: \frac{1}{k(k+1)} = \frac{1}{k} - \frac{1}{k+1}. Partial sum S_n = 1 - \frac{1}{n+1}. As n \to \infty, S = 1.',
  1.0, 0.25,
  '1/2', '1', '2', 'Undefined',
  'B'
);

select pg_temp.seed_question(
  'spec-pcm-04', 'spec', 'subject-proficiency', 'physics', 'mechanics', 'kinematics',
  'The displacement of a body is given by $s = 2t^3 - 6t^2 + 4t$. The acceleration of the body when its velocity is zero is:',
  'medium',
  'v = ds/dt = 6t^2 - 12t + 4. Acceleration a = dv/dt = 12t - 12. Setting v = 0: 6t^2 - 12t + 4 = 0 \implies 3t^2 - 6t + 2 = 0 \implies t = \frac{6 \pm \sqrt{36 - 24}}{6} = 1 \pm \frac{\sqrt{3}}{3}. Then a = 12(t - 1) = \pm 4\sqrt{3}\text{ m/s}^2.',
  1.0, 0.25,
  '\pm 4\sqrt{3}\text{ m/s}^2', '\pm 6\sqrt{2}\text{ m/s}^2', '0\text{ m/s}^2', '12\text{ m/s}^2',
  'A'
);

select pg_temp.seed_question(
  'spec-pcm-05', 'spec', 'subject-proficiency', 'physics', 'mechanics', 'laws-of-motion',
  'A block of mass $2\text{ kg}$ is kept on a smooth wedge of angle $30^\circ$. The horizontal acceleration to be given to the wedge so that the block remains stationary relative to the wedge is ($g = 10\text{ m/s}^2$):',
  'medium',
  'For stationary state on wedge: pseudo-force component balancing gravity component: ma \cos 30^\circ = mg \sin 30^\circ \implies a = g \tan 30^\circ = 10 / \sqrt{3}\text{ m/s}^2.',
  1.0, 0.25,
  '10/\sqrt{3}\text{ m/s}^2', '10\sqrt{3}\text{ m/s}^2', '5\text{ m/s}^2', '10\text{ m/s}^2',
  'A'
);

select pg_temp.seed_question(
  'spec-pcm-06', 'spec', 'subject-proficiency', 'physics', 'electromagnetism', 'electrostatics',
  'Electric field in a region is given by $\vec{E} = 200 \hat{i}\text{ N/C}$. The electric flux through a square of side $10\text{ cm}$ whose plane is parallel to the y-z plane is:',
  'easy',
  'Area vector is normal to y-z plane: \vec{A} = (0.1 \times 0.1) \hat{i} = 0.01 \hat{i}\text{ m}^2. Flux \Phi = \vec{E} \cdot \vec{A} = 200 \times 0.01 = 2\text{ N}\cdot\text{m}^2/\text{C}.',
  1.0, 0.25,
  '2\text{ N}\cdot\text{m}^2/\text{C}', '20\text{ N}\cdot\text{m}^2/\text{C}', '200\text{ N}\cdot\text{m}^2/\text{C}', '0',
  'A'
);

select pg_temp.seed_question(
  'spec-pcm-07', 'spec', 'subject-proficiency', 'chemistry', 'physical-chemistry', 'mole-concept',
  'What mass of calcium carbonate ($\text{CaCO}_3$, molar mass = $100\text{ g/mol}$) on thermal decomposition produces $4.4\text{ g}$ of $\text{CO}_2$?',
  'easy',
  '\text{CaCO}_3 \to \text{CaO} + \text{CO}_2. 100 g of CaCO_3 gives 44 g of CO_2. For 4.4 g CO_2, required CaCO_3 = (100/44) \times 4.4 = 10 g.',
  1.0, 0.25,
  '5 g', '10 g', '20 g', '50 g',
  'B'
);

select pg_temp.seed_question(
  'spec-pcm-08', 'spec', 'subject-proficiency', 'chemistry', 'physical-chemistry', 'chemical-kinetics',
  'For a zero-order reaction $A \to B$, with rate constant $k = 0.02\text{ mol}\cdot\text{L}^{-1}\cdot\text{s}^{-1}$ and initial concentration $[A]_0 = 1.0\text{ M}$, what is the time required for complete conversion?',
  'easy',
  'For zero-order reaction: [A] = [A]_0 - k t. When [A] = 0, t = [A]_0 / k = 1.0 / 0.02 = 50 seconds.',
  1.0, 0.25,
  '25 s', '50 s', '100 s', '200 s',
  'B'
);

select pg_temp.seed_question(
  'spec-pcm-09', 'spec', 'subject-proficiency', 'chemistry', 'organic-chemistry', 'basic-organic-mechanisms',
  'In the reaction of propene with $\text{HBr}$ in the presence of benzoyl peroxide, the major product is:',
  'easy',
  'In the presence of peroxide, addition of HBr to asymmetric alkene follows Anti-Markovnikov mechanism via free radical intermediate, yielding 1-bromopropane.',
  1.0, 0.25,
  '2-bromopropane', '1-bromopropane', '1,2-dibromopropane', 'Propane',
  'B'
);

select pg_temp.seed_question(
  'spec-pcm-10', 'spec', 'subject-proficiency', 'chemistry', 'physical-chemistry', 'mole-concept',
  'Which of the following contains the maximum number of molecules at STP?',
  'easy',
  'A) 1 g H_2 = 1/2 = 0.5 mol. B) 16 g O_2 = 16/32 = 0.5 mol. C) 28 g N_2 = 28/28 = 1.0 mol. D) 44 g CO_2 = 44/44 = 1.0 mol. Maximum moles = 1.0 mol (N_2 or CO_2 has highest, with 28 g N_2 containing 1 mol = 6.022 \times 10^{23} molecules).',
  1.0, 0.25,
  '1 g \text{H}_2', '16 g \text{O}_2', '28 g \text{N}_2', '2 g \text{He}',
  'C'
);

--------------------------------------------------------------------------------
-- 6. DEMO TESTS SETUP
--------------------------------------------------------------------------------
do $$
declare
  v_ugee_id uuid;
  v_spec_id uuid;
  v_supr_id uuid;
  v_reap_id uuid;
  v_spec_sec_id uuid;

  v_t1_id uuid;
  v_t2_id uuid;

  v_q record;
  v_order int;
begin
  select id into v_ugee_id from public.exams where slug = 'ugee';
  select id into v_spec_id from public.exams where slug = 'spec';
  select id into v_supr_id from public.exam_sections where exam_id = v_ugee_id and slug = 'supr';
  select id into v_reap_id from public.exam_sections where exam_id = v_ugee_id and slug = 'reap';
  select id into v_spec_sec_id from public.exam_sections where exam_id = v_spec_id and slug = 'subject-proficiency';

  -- Test 1: UGEE Full Mock Test 1
  insert into public.tests (
    exam_id, name, slug, description, test_type,
    duration_seconds, status, instructions, published_at
  ) values (
    v_ugee_id,
    'UGEE Full Mock Test 1',
    'ugee-full-mock-1',
    'Full simulation mock test for IIITH UGEE featuring SUPR (Subject Proficiency) and REAP (Research Aptitude).',
    'mock',
    10800, -- 3 hours (60m + 120m)
    'published',
    'This mock exam contains 2 sections: SUPR (60 minutes) and REAP (120 minutes). Marking scheme: SUPR (+1, -0.25), REAP (+2, -0.50). Answer keys are evaluated at submission time.',
    timezone('utc', now())
  )
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    test_type = excluded.test_type,
    duration_seconds = excluded.duration_seconds,
    status = excluded.status,
    instructions = excluded.instructions,
    published_at = excluded.published_at
  returning id into v_t1_id;

  -- Test Sections for Test 1
  insert into public.test_sections (test_id, section_id, display_order, duration_seconds, marks_per_question, negative_marks)
  values
    (v_t1_id, v_supr_id, 1, 3600, 1.00, 0.25)
  on conflict (test_id, section_id) do update set
    display_order = excluded.display_order,
    duration_seconds = excluded.duration_seconds,
    marks_per_question = excluded.marks_per_question,
    negative_marks = excluded.negative_marks;

  insert into public.test_sections (test_id, section_id, display_order, duration_seconds, marks_per_question, negative_marks)
  values
    (v_t1_id, v_reap_id, 2, 7200, 2.00, 0.50)
  on conflict (test_id, section_id) do update set
    display_order = excluded.display_order,
    duration_seconds = excluded.duration_seconds,
    marks_per_question = excluded.marks_per_question,
    negative_marks = excluded.negative_marks;

  -- Test 2: SPEC Practice Test 1
  insert into public.tests (
    exam_id, name, slug, description, test_type,
    duration_seconds, status, instructions, published_at
  ) values (
    v_spec_id,
    'SPEC Subject Proficiency Practice Test 1',
    'spec-practice-1',
    'Targeted 60-minute subject proficiency practice for IIITH SPEC aspirants.',
    'practice',
    3600, -- 1 hour
    'published',
    '10 PCM subject questions to test speed and accuracy. Marking scheme: +1.00 for correct answer, -0.25 for incorrect answer.',
    timezone('utc', now())
  )
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    test_type = excluded.test_type,
    duration_seconds = excluded.duration_seconds,
    status = excluded.status,
    instructions = excluded.instructions,
    published_at = excluded.published_at
  returning id into v_t2_id;

  -- Test Section for Test 2
  insert into public.test_sections (test_id, section_id, display_order, duration_seconds, marks_per_question, negative_marks)
  values
    (v_t2_id, v_spec_sec_id, 1, 3600, 1.00, 0.25)
  on conflict (test_id, section_id) do update set
    display_order = excluded.display_order,
    duration_seconds = excluded.duration_seconds,
    marks_per_question = excluded.marks_per_question,
    negative_marks = excluded.negative_marks;

  -- Map questions to Test 1 (UGEE questions)
  v_order := 1;
  for v_q in (select id, section_id, marks, negative_marks from public.questions where exam_id = v_ugee_id and status = 'published' order by created_at) loop
    insert into public.test_questions (test_id, question_id, section_id, display_order, marks, negative_marks)
    values (v_t1_id, v_q.id, v_q.section_id, v_order, v_q.marks, v_q.negative_marks)
    on conflict (test_id, question_id) do update set
      section_id = excluded.section_id,
      display_order = excluded.display_order,
      marks = excluded.marks,
      negative_marks = excluded.negative_marks;
    v_order := v_order + 1;
  end loop;

  -- Map questions to Test 2 (SPEC questions)
  v_order := 1;
  for v_q in (select id, section_id, marks, negative_marks from public.questions where exam_id = v_spec_id and status = 'published' order by created_at) loop
    insert into public.test_questions (test_id, question_id, section_id, display_order, marks, negative_marks)
    values (v_t2_id, v_q.id, v_q.section_id, v_order, v_q.marks, v_q.negative_marks)
    on conflict (test_id, question_id) do update set
      section_id = excluded.section_id,
      display_order = excluded.display_order,
      marks = excluded.marks,
      negative_marks = excluded.negative_marks;
    v_order := v_order + 1;
  end loop;

end $$;

