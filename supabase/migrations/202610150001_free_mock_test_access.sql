-- Free mock-test access and purchase records. Apply this migration to Supabase before deploying this feature.
alter table public.tests
  add column if not exists is_free boolean not null default false;

create unique index if not exists tests_single_free_published_mock_idx
  on public.tests (test_type)
  where test_type = 'mock' and status = 'published' and is_free = true;

create table if not exists public.mock_test_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  amount_paise integer,
  provider_order_id text,
  provider_payment_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, test_id)
);

create index if not exists mock_test_purchases_test_status_idx
  on public.mock_test_purchases (test_id, status);

alter table public.mock_test_purchases enable row level security;

drop policy if exists "Users can read own mock test purchases" on public.mock_test_purchases;
create policy "Users can read own mock test purchases"
  on public.mock_test_purchases for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins can manage mock test purchases" on public.mock_test_purchases;
create policy "Admins can manage mock test purchases"
  on public.mock_test_purchases for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Called only by the authenticated admin server action through the service-role client.
create or replace function public.set_free_mock_test(p_test_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_test record;
begin
  perform pg_advisory_xact_lock(hashtext('iiith-single-free-mock-test'));

  select id, test_type, status
    into v_test
    from public.tests
    where id = p_test_id
    for update;

  if not found then
    raise exception 'Mock test not found';
  end if;

  if v_test.test_type <> 'mock' or v_test.status <> 'published' then
    raise exception 'Only a published mock test can be selected as free';
  end if;

  update public.tests
    set is_free = false
    where test_type = 'mock' and is_free = true;

  update public.tests
    set is_free = true
    where id = p_test_id;
end;
$$;

revoke all on function public.set_free_mock_test(uuid) from public, anon, authenticated;
grant execute on function public.set_free_mock_test(uuid) to service_role;

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
  v_has_paid_purchase boolean := false;
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

  -- Free/purchase guard runs after resume so legitimate existing attempts remain resumable.
  if not public.is_admin()
     and v_test.test_type = 'mock'
     and not coalesce(v_test.is_free, false) then
    select exists (
      select 1
      from public.mock_test_purchases p
      where p.user_id = v_user_id
        and p.test_id = p_test_id
        and p.status = 'paid'
    ) into v_has_paid_purchase;

    if not v_has_paid_purchase then
      raise exception 'This mock test is locked. Purchase access to continue.';
    end if;
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

