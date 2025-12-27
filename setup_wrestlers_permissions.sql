-- Setup permissions for wrestlers table to allow authenticated users to update
-- Run this in Supabase SQL Editor if updates aren't working

-- First, drop existing policies if they exist (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Allow read access to wrestlers" ON wrestlers;
DROP POLICY IF EXISTS "Allow authenticated users to update wrestlers" ON wrestlers;
DROP POLICY IF EXISTS "Allow authenticated users to insert wrestlers" ON wrestlers;

-- Enable RLS if not already enabled
ALTER TABLE wrestlers ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users (public)
CREATE POLICY "Allow read access to wrestlers" ON wrestlers
    FOR SELECT USING (true);

-- Allow authenticated users to update wrestlers
CREATE POLICY "Allow authenticated users to update wrestlers" ON wrestlers
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert wrestlers (if needed)
CREATE POLICY "Allow authenticated users to insert wrestlers" ON wrestlers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

