-- Configurable subscription plans: admin-managed price and duration.
create table if not exists public.mock_test_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_paise integer not null check (price_paise >= 100),
  duration_months integer not null check (duration_months between 1 and 24),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.mock_test_subscription_plans enable row level security;
drop policy if exists "Anyone can read active subscription plans" on public.mock_test_subscription_plans;
create policy "Anyone can read active subscription plans" on public.mock_test_subscription_plans
  for select to anon, authenticated using (is_active = true or public.is_admin());

-- Remove the old fixed-₹99 constraint and attach each purchase to the selected plan.
alter table public.mock_test_subscriptions drop constraint if exists mock_test_subscriptions_amount_paise_check;
alter table public.mock_test_subscriptions drop constraint if exists mock_test_subscriptions_amount_paise_check1;
alter table public.mock_test_subscriptions drop constraint if exists mock_test_subscriptions_amount_paise_check2;
alter table public.mock_test_subscriptions
  add column if not exists plan_id uuid references public.mock_test_subscription_plans(id) on delete set null;

insert into public.mock_test_subscription_plans (name, price_paise, duration_months, is_active, display_order)
select '2 Months', 9900, 2, true, 1
where not exists (select 1 from public.mock_test_subscription_plans);

