-- Two-month all-mock-test subscription. One successful payment grants access for two calendar months.
create table if not exists public.mock_test_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','expired','failed','refunded')),
  amount_paise integer not null default 9900 check (amount_paise = 9900),
  provider_order_id text unique,
  provider_payment_id text unique,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mock_test_subscriptions_user_expiry_idx
  on public.mock_test_subscriptions(user_id, expires_at desc);
alter table public.mock_test_subscriptions enable row level security;
drop policy if exists "Users can read own mock test subscriptions" on public.mock_test_subscriptions;
create policy "Users can read own mock test subscriptions" on public.mock_test_subscriptions
  for select to authenticated using (auth.uid() = user_id or public.is_admin());

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
  v_has_access boolean := false;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Must be logged in to start a test attempt';
  end if;

  select * into v_test from public.tests where id = p_test_id;
  if not found then raise exception 'Test not found'; end if;
  if v_test.status <> 'published' and not public.is_admin() then
    raise exception 'Test is not published';
  end if;

  select id into v_existing_id
  from public.test_attempts
  where user_id = v_user_id and test_id = p_test_id and status = 'in_progress'
  order by created_at desc limit 1;
  if v_existing_id is not null then
    return jsonb_build_object('attempt_id', v_existing_id, 'is_resumed', true);
  end if;

  if not public.is_admin() and v_test.test_type = 'mock' and not coalesce(v_test.is_free, false) then
    select exists (
      select 1 from public.mock_test_subscriptions s
      where s.user_id = v_user_id and s.status = 'active'
        and s.starts_at <= now() and s.expires_at > now()
    ) into v_has_access;
    if not v_has_access then
      raise exception 'Subscription required. Pay ₹99 for two months of access to all mock tests.';
    end if;
  end if;

  select count(*), coalesce(sum(marks), 0.00)
    into v_total_questions, v_max_score
    from public.test_questions where test_id = p_test_id;
  if v_total_questions = 0 then raise exception 'This test has no configured questions'; end if;

  insert into public.test_attempts (
    user_id, test_id, status, score, max_score, total_questions,
    unanswered_count, correct_count, incorrect_count
  ) values (
    v_user_id, p_test_id, 'in_progress', 0.00, v_max_score,
    v_total_questions, v_total_questions, 0, 0
  ) returning id into v_new_attempt_id;

  for v_tq in
    select question_id, section_id, display_order, marks, negative_marks
    from public.test_questions where test_id = p_test_id order by display_order
  loop
    insert into public.attempt_questions (
      attempt_id, question_id, section_id, display_order, marks,
      negative_marks, status, marked_for_review
    ) values (
      v_new_attempt_id, v_tq.question_id, v_tq.section_id, v_tq.display_order,
      v_tq.marks, v_tq.negative_marks, 'unanswered', false
    );
  end loop;

  return jsonb_build_object('attempt_id', v_new_attempt_id, 'is_resumed', false);
end;
$$;
