-- Server-authoritative price for each paid mock test, stored in paise (₹49 default).
alter table public.tests add column if not exists price_paise integer not null default 4900;
alter table public.tests drop constraint if exists tests_price_paise_positive_check;
alter table public.tests add constraint tests_price_paise_positive_check check (price_paise > 0);
