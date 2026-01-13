-- Setup permissions for wrestlers table to allow authenticated users to update
-- Run this in Supabase SQL Editor if updates aren't working

-- First, drop existing policies if they exist (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Allow read access to wrestlers" ON wrestlers;
DROP POLICY IF EXISTS "Allow authenticated users to update wrestlers" ON wrestlers;
DROP POLICY IF EXISTS "Allow authenticated users to insert wrestlers" ON wrestlers;
DROP POLICY IF EXISTS "Allow all access to wrestlers" ON wrestlers;

-- Enable RLS if not already enabled
ALTER TABLE wrestlers ENABLE ROW LEVEL SECURITY;

-- DEV/ADMIN SETUP: Allow all operations on wrestlers for any role
-- This relies on the UI to gate who can actually edit wrestlers.
-- If you want to lock this down later, you can replace this with more specific policies.
CREATE POLICY "Allow all access to wrestlers" ON wrestlers
    FOR ALL
    USING (true)
    WITH CHECK (true);

