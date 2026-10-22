-- Dedicated storage for My Learning topic practice questions.
-- Practice questions are intentionally independent from mock-test questions.

drop table if exists public.practice_attempts cascade;
drop table if exists public.practice_results cascade;
drop table if exists public.practice_sessions cascade;

create table public.practice_questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  question_text text not null,
  difficulty text not null default 'medium'
    check (difficulty = any (array['easy','medium','hard'])),
  explanation text,
  marks numeric not null default 1,
  status text not null default 'published'
    check (status = any (array['draft','published','archived'])),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.practice_question_options (
  id uuid primary key default gen_random_uuid(),
  practice_question_id uuid not null
    references public.practice_questions(id) on delete cascade,
  option_label text not null
    check (option_label = any (array['A','B','C','D'])),
  option_text text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (practice_question_id, option_label)
);

create table public.practice_question_answers (
  practice_question_id uuid primary key
    references public.practice_questions(id) on delete cascade,
  correct_option_id uuid not null
    references public.practice_question_options(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index practice_questions_subject_id_idx
  on public.practice_questions(subject_id);
create index practice_questions_chapter_id_idx
  on public.practice_questions(chapter_id);
create index practice_questions_topic_id_idx
  on public.practice_questions(topic_id);
create index practice_questions_status_idx
  on public.practice_questions(status);
create index practice_question_options_question_id_idx
  on public.practice_question_options(practice_question_id);

alter table public.practice_questions enable row level security;
alter table public.practice_question_options enable row level security;
alter table public.practice_question_answers enable row level security;

create policy "Authenticated users can view published practice questions"
on public.practice_questions for select to authenticated
using (status = 'published');

create policy "Authenticated users can view published practice options"
on public.practice_question_options for select to authenticated
using (
  exists (
    select 1
    from public.practice_questions pq
    where pq.id = practice_question_id
      and pq.status = 'published'
  )
);

create or replace function public.update_practice_question_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger practice_questions_updated_at
before update on public.practice_questions
for each row
execute function public.update_practice_question_updated_at();

create trigger practice_question_answers_updated_at
before update on public.practice_question_answers
for each row
execute function public.update_practice_question_updated_at();
