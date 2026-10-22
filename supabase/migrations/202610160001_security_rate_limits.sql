create table if not exists public.security_rate_limit_buckets (
  bucket_key text primary key check (length(bucket_key) = 64),
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  expires_at timestamptz not null
);
create index if not exists security_rate_limit_buckets_expiry_idx
  on public.security_rate_limit_buckets (expires_at);

alter table public.security_rate_limit_buckets enable row level security;

create or replace function public.consume_security_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_bucket_key is null or p_bucket_key !~ '^[0-9a-f]{64}$'
     or p_limit < 1 or p_limit > 10000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit parameters';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into public.security_rate_limit_buckets (
    bucket_key, window_start, request_count, expires_at
  ) values (
    p_bucket_key, v_window_start, 1, v_window_start + make_interval(secs => p_window_seconds)
  )
  on conflict (bucket_key) do update
    set window_start = excluded.window_start,
        request_count = case
          when security_rate_limit_buckets.window_start = excluded.window_start
            then security_rate_limit_buckets.request_count + 1
          else 1
        end,
        expires_at = excluded.expires_at
  returning request_count into v_count;

  if mod(floor(extract(epoch from v_now))::bigint, 100) = 0
     and pg_try_advisory_xact_lock(hashtext('security-rate-limit-gc')) then
    delete from public.security_rate_limit_buckets
    where expires_at < v_now - interval '1 day';
  end if;

  return query select
    v_count <= p_limit,
    greatest(1, ceil(extract(epoch from (
      v_window_start + make_interval(secs => p_window_seconds) - v_now
    )))::integer);
end;
$$;

revoke all on public.security_rate_limit_buckets from public, anon, authenticated;
revoke all on function public.consume_security_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text, integer, integer)
  to service_role;

do $$
begin
  if exists (
    select provider_order_id from public.mock_test_purchases
    where provider_order_id is not null
    group by provider_order_id having count(*) > 1
  ) or exists (
    select provider_payment_id from public.mock_test_purchases
    where provider_payment_id is not null
    group by provider_payment_id having count(*) > 1
  ) then
    raise exception 'Duplicate Razorpay purchase identifiers must be resolved before applying security indexes.';
  end if;
end;
$$;

create unique index if not exists mock_test_purchases_provider_order_uidx
  on public.mock_test_purchases (provider_order_id)
  where provider_order_id is not null;

create unique index if not exists mock_test_purchases_provider_payment_uidx
  on public.mock_test_purchases (provider_payment_id)
  where provider_payment_id is not null;
