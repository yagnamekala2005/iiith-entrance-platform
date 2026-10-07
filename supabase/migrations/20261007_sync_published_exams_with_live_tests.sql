-- Keep exam visibility consistent with already-published mock tests.
-- A published mock test is intended to be live for students, so its linked
-- competitive exam must also be visible through the published-exam RLS policy.
UPDATE public.exams e
SET published = true,
    updated_at = timezone('utc', now())
WHERE EXISTS (
  SELECT 1
  FROM public.tests t
  WHERE t.exam_id = e.id
    AND t.status = 'published'
);
