-- Remove orphaned championship-related indexes and tables
-- These objects are referencing tables that no longer exist

-- First, check if championship_stats table exists and drop it if it does
DROP TABLE IF EXISTS championship_stats CASCADE;

-- Drop any remaining championship-related indexes
DROP INDEX IF EXISTS championship_stats_pkey;
DROP INDEX IF EXISTS idx_championship_stats_championship;

-- Check for any other championship-related indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (indexname LIKE '%championship%' OR indexdef LIKE '%championship%');

-- Check for any remaining championship-related objects
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (indexname LIKE '%champion%' OR indexdef LIKE '%champion%');

-- Check for any championship-related tables
SELECT 
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%championship%'; 