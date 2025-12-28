-- Verification script for vacancy feature schema
-- Run this in Supabase SQL Editor to check if the schema is up to date

-- 1. Check if vacation_reason column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'championships' 
  AND column_name = 'vacation_reason';

-- 2. Check if process_championship_changes function handles 'Vacant' outcome
-- (This will show the function definition if it exists)
-- Look for 'Vacant' or 'vacation_reason' in the function source
SELECT 
  proname AS function_name,
  CASE 
    WHEN prosrc LIKE '%Vacant%' THEN 'Has Vacant handling'
    ELSE 'Missing Vacant handling'
  END AS vacancy_check,
  CASE 
    WHEN prosrc LIKE '%vacation_reason%' THEN 'Has vacation_reason'
    ELSE 'Missing vacation_reason'
  END AS vacation_reason_check
FROM pg_proc 
WHERE proname = 'process_championship_changes';

-- 3. To see the full function source code (click on the result to expand):
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'process_championship_changes';

-- If the vacation_reason column doesn't exist, run this:
-- ALTER TABLE championships ADD COLUMN IF NOT EXISTS vacation_reason TEXT;

-- If you need to update the function, you'll need to run the full create_championships_schema.sql file
-- (It uses CREATE OR REPLACE, so it's safe to run multiple times)

