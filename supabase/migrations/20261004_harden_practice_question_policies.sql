create policy "Admins can view practice answer keys"
on public.practice_question_answers for select to authenticated
using (public.is_admin());

alter function public.update_practice_question_updated_at()
set search_path = public;
