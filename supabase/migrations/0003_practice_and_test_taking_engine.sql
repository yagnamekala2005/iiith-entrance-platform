-- Phase 3: Practice and Test-Taking Engine Migration

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

-- 4. Triggers for Immutable Submitted Attempts Guard
create or replace function public.check_attempt_status_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  -- Prevent altering submitted attempts back to in_progress
  if TG_TABLE_NAME = 'test_attempts' then
    if OLD.status = 'submitted' and NEW.status <> 'submitted' and not public.is_admin() then
      raise exception 'Cannot modify or reopen an already submitted attempt';
    end if;
    NEW.updated_at = timezone('utc', now());
    return NEW;
  end if;

  -- Prevent modifying attempt_questions if parent attempt is submitted
  if TG_TABLE_NAME = 'attempt_questions' then
    select status into v_status from public.test_attempts where id = coalesce(NEW.attempt_id, OLD.attempt_id);
    if v_status = 'submitted' and not public.is_admin() then
      raise exception 'Cannot modify answers of an already submitted attempt';
    end if;
    if TG_OP <> 'DELETE' then
      NEW.updated_at = timezone('utc', now());
      return NEW;
    end if;
    return OLD;
  end if;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_guard_test_attempts on public.test_attempts;
create trigger trg_guard_test_attempts
before update on public.test_attempts
for each row execute function public.check_attempt_status_guard();

drop trigger if exists trg_guard_attempt_questions on public.attempt_questions;
create trigger trg_guard_attempt_questions
before insert or update or delete on public.attempt_questions
for each row execute function public.check_attempt_status_guard();

-- 5. Enable Row Level Security (RLS)
alter table public.test_attempts enable row level security;
alter table public.attempt_questions enable row level security;

-- 6. RLS Policies for test_attempts
drop policy if exists "Users can read own attempts" on public.test_attempts;
create policy "Users can read own attempts"
on public.test_attempts for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert own attempts" on public.test_attempts;
create policy "Users can insert own attempts"
on public.test_attempts for insert
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can update own in-progress attempts" on public.test_attempts;
create policy "Users can update own in-progress attempts"
on public.test_attempts for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

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

drop policy if exists "Users can insert own attempt questions" on public.attempt_questions;
create policy "Users can insert own attempt questions"
on public.attempt_questions for insert
with check (
  exists (
    select 1 from public.test_attempts
    where test_attempts.id = attempt_questions.attempt_id
      and (test_attempts.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Users can update own attempt questions while in progress" on public.attempt_questions;
create policy "Users can update own attempt questions while in progress"
on public.attempt_questions for update
using (
  exists (
    select 1 from public.test_attempts
    where test_attempts.id = attempt_questions.attempt_id
      and (test_attempts.user_id = auth.uid() or public.is_admin())
      and test_attempts.status = 'in_progress'
  )
)
with check (
  exists (
    select 1 from public.test_attempts
    where test_attempts.id = attempt_questions.attempt_id
      and (test_attempts.user_id = auth.uid() or public.is_admin())
      and test_attempts.status = 'in_progress'
  )
);

-- 8. Server-Authoritative Secure Submission & Scoring Function
create or replace function public.submit_and_score_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
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
  select * into v_attempt from public.test_attempts where id = p_attempt_id;

  if not found then
    raise exception 'Attempt not found';
  end if;

  if v_attempt.user_id <> v_user_id and not public.is_admin() then
    raise exception 'Unauthorized attempt access';
  end if;

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

  -- Score each question in the attempt
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

  -- Update test_attempts to submitted
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

-- 9. Secure Review Data Function (strictly blocked for in-progress attempts)
create or replace function public.get_attempt_review_data(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_attempt record;
  v_test record;
  v_questions jsonb;
  v_sections jsonb;
begin
  v_user_id := auth.uid();
  select * into v_attempt from public.test_attempts where id = p_attempt_id;

  if not found then
    raise exception 'Attempt not found';
  end if;

  if v_attempt.user_id <> v_user_id and not public.is_admin() then
    raise exception 'Unauthorized attempt access';
  end if;

  if v_attempt.status <> 'submitted' and not public.is_admin() then
    raise exception 'Attempt is not submitted yet. Answer keys are protected.';
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

