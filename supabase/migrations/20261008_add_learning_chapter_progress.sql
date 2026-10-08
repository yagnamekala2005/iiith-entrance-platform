-- Student My Learning chapter completion tracking
create table if not exists public.user_learning_chapter_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  completed_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, chapter_id)
);

create index if not exists idx_user_learning_progress_user
  on public.user_learning_chapter_progress(user_id);

alter table public.user_learning_chapter_progress enable row level security;

drop policy if exists "Users can read their own learning progress"
  on public.user_learning_chapter_progress;
create policy "Users can read their own learning progress"
on public.user_learning_chapter_progress
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their own learning progress"
  on public.user_learning_chapter_progress;
create policy "Users can create their own learning progress"
on public.user_learning_chapter_progress
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own learning progress"
  on public.user_learning_chapter_progress;
create policy "Users can update their own learning progress"
on public.user_learning_chapter_progress
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own learning progress"
  on public.user_learning_chapter_progress;
create policy "Users can delete their own learning progress"
on public.user_learning_chapter_progress
for delete
using (auth.uid() = user_id);
