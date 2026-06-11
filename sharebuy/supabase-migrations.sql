-- 1. Columna image_urls (múltiples fotos en posts)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

-- 2. Tabla saves (bookmarks / guardar posts)
CREATE TABLE IF NOT EXISTS saves (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 3. Chat: columna is_image (fotos en mensajes)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_image boolean DEFAULT false;

-- 4. Chat: columna read_at (leído)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- 5. RLS para saves
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY saves_select ON saves FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY saves_insert ON saves FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY saves_delete ON saves FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6. Política DELETE para posts (para que el dueño pueda borrar su publicación)
DROP POLICY IF EXISTS posts_delete ON posts;
CREATE POLICY posts_delete ON posts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 7. Chat: columna updated_at (para editar mensajes)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- 8. Tabla reports (reportar publicaciones)
CREATE TABLE IF NOT EXISTS reports (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  reported_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_insert ON reports FOR INSERT TO authenticated WITH CHECK (reported_by = auth.uid());

-- 9. Tabla blocked_users (bloquear usuarios)
CREATE TABLE IF NOT EXISTS blocked_users (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  blocker_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY blocked_users_select ON blocked_users FOR SELECT TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY blocked_users_insert ON blocked_users FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
CREATE POLICY blocked_users_delete ON blocked_users FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- 10. Columna setup_complete en profiles (para onboarding)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS setup_complete boolean DEFAULT false;

-- 11. Políticas Storage para chat (después de crear el bucket manualmente)
-- CREATE POLICY chat_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat');
-- CREATE POLICY chat_select ON storage.objects FOR SELECT TO public USING (bucket_id = 'chat');
-- CREATE POLICY chat_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'chat');
