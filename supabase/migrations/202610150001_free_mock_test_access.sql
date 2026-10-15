-- Free mock test and paid-test access foundation.
-- Prices and payment provider are intentionally not configured yet.

alter table public.tests
  add column if not exists is_free boolean not null default false;

-- The platform design allows one designated free mock test at a time.
create unique index if not exists idx_tests_single_free_mock
  on public.tests (is_free)
  where is_free = true and test_type = 'mock' and status = 'published';

create table if not exists public.mock_test_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  provider text,
  provider_order_id text,
  provider_payment_id text,
  amount_paise integer check (amount_paise is null or amount_paise >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, test_id)
);

create index if not exists idx_mock_test_purchases_user_status
  on public.mock_test_purchases(user_id, status, test_id);

alter table public.mock_test_purchases enable row level security;

drop policy if exists "Students can read their own mock test purchases" on public.mock_test_purchases;
create policy "Students can read their own mock test purchases"
  on public.mock_test_purchases for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can manage mock test purchases" on public.mock_test_purchases;
create policy "Admins can manage mock test purchases"
  on public.mock_test_purchases for all
  using (public.is_admin())
  with check (public.is_admin());

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

  -- 5. Calculate total questions and max marks from test_questions
  select count(*), coalesce(sum(marks), 0.00)
  into v_total_questions, v_max_score
  from public.test_questions
  where test_id = p_test_id;

  if v_total_questions = 0 then
    raise exception 'This test has no configured questions';
  end if;

  -- 6. Create test_attempts record
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

  -- 7. Snapshot questions into attempt_questions
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
