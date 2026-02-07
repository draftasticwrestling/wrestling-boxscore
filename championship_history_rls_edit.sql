-- Allow authenticated users to insert, update, and delete championship_history
-- (so the championship detail page can add/edit/remove reigns).
-- Run this in Supabase SQL Editor if you get permission errors when saving title history.

DROP POLICY IF EXISTS "Enable insert for authenticated" ON championship_history;
CREATE POLICY "Enable insert for authenticated" ON championship_history
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated" ON championship_history;
CREATE POLICY "Enable update for authenticated" ON championship_history
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated" ON championship_history;
CREATE POLICY "Enable delete for authenticated" ON championship_history
  FOR DELETE
  USING (true);
