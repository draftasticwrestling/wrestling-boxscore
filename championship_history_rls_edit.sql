-- Allow authenticated users to insert, update, and delete championship_history
-- (so the championship detail page can add/edit/remove reigns).
-- Run this in Supabase SQL Editor if you get "new row violates row-level security policy" when adding title history.

-- Insert: only authenticated users (logged-in admins)
DROP POLICY IF EXISTS "Enable insert for authenticated" ON championship_history;
CREATE POLICY "Enable insert for authenticated" ON championship_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update: only authenticated users
DROP POLICY IF EXISTS "Enable update for authenticated" ON championship_history;
CREATE POLICY "Enable update for authenticated" ON championship_history
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Delete: only authenticated users
DROP POLICY IF EXISTS "Enable delete for authenticated" ON championship_history;
CREATE POLICY "Enable delete for authenticated" ON championship_history
  FOR DELETE
  TO authenticated
  USING (true);
