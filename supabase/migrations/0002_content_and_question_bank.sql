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
set search_path = public
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

