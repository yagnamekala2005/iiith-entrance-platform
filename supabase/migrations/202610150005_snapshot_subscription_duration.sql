-- Snapshot plan duration on each order so editing a plan cannot change a pending purchase.
alter table public.mock_test_subscriptions
  add column if not exists duration_months integer not null default 2 check (duration_months between 1 and 24);

update public.mock_test_subscriptions s
set duration_months = coalesce(p.duration_months, 2)
from public.mock_test_subscription_plans p
where s.plan_id = p.id and s.duration_months = 2;
