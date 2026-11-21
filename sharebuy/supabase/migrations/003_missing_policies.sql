-- Migration: missing UPDATE/DELETE policies (own rows only)
-- ROLLBACK:
--   DROP POLICY IF EXISTS messages_update_own ON public.messages;
--   DROP POLICY IF EXISTS messages_delete_own ON public.messages;
--   DROP POLICY IF EXISTS comments_update_own ON public.comments;
--   DROP POLICY IF EXISTS reviews_update_own ON public.reviews;
--   DROP POLICY IF EXISTS reviews_delete_own ON public.reviews;

-- The WITH CHECK also requires the (new) conversation to be one of mine, like
-- the INSERT policy does. Without it a sender could set conversation_id to a
-- conversation they are not part of and push a message into it.
DROP POLICY IF EXISTS messages_update_own ON public.messages;
CREATE POLICY messages_update_own ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS messages_delete_own ON public.messages;
CREATE POLICY messages_delete_own ON public.messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

DROP POLICY IF EXISTS comments_update_own ON public.comments;
CREATE POLICY comments_update_own ON public.comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS reviews_update_own ON public.reviews;
CREATE POLICY reviews_update_own ON public.reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS reviews_delete_own ON public.reviews;
CREATE POLICY reviews_delete_own ON public.reviews
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
