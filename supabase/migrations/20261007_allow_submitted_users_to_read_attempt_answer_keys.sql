-- Allow students to evaluate their own submitted attempts.
-- Answer keys remain hidden during active tests and are only readable
-- for questions belonging to that student's submitted attempts.

CREATE POLICY "Users can read answer keys for submitted attempts"
ON public.question_answer_keys
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.attempt_questions aq
    INNER JOIN public.test_attempts ta
      ON ta.id = aq.attempt_id
    WHERE aq.question_id = question_answer_keys.question_id
      AND ta.user_id = auth.uid()
      AND ta.status = 'submitted'
  )
);
