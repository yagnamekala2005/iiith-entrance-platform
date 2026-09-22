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
