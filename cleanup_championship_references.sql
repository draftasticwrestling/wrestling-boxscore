-- Cleanup script to remove championship system references
-- This will remove any remaining views, triggers, or policies that reference championship_history

-- Drop any views that reference championship_history (these might still exist)
DROP VIEW IF EXISTS current_champions_with_stats;
DROP VIEW IF EXISTS championship_history_detailed;
DROP VIEW IF EXISTS wrestler_achievements;

-- Drop any triggers that might reference championship tables (ignore errors if they don't exist)
DO $$
BEGIN
    -- Try to drop triggers, but don't fail if they don't exist
    BEGIN
        DROP TRIGGER IF EXISTS trigger_update_championship_stats ON championship_history;
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, which is fine
        NULL;
    END;
    
    BEGIN
        DROP TRIGGER IF EXISTS trigger_update_wrestler_championship_stats ON championship_history;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    BEGIN
        DROP TRIGGER IF EXISTS trigger_update_wrestler_tag_team_info ON tag_teams;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
END $$;

-- Drop any functions that reference championship tables
DROP FUNCTION IF EXISTS update_championship_stats();
DROP FUNCTION IF EXISTS update_wrestler_championship_stats();

-- Drop any tables that might still exist (ignore errors if they don't exist)
DROP TABLE IF EXISTS championship_history CASCADE;
DROP TABLE IF EXISTS championships CASCADE;

-- Clean up any RLS policies that might reference championship tables (ignore errors if they don't exist)
DO $$
BEGIN
    BEGIN
        DROP POLICY IF EXISTS "Enable read access for all users" ON championship_history;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON championship_history;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable update for authenticated users only" ON championship_history;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON championship_history;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
END $$;

-- Check for any remaining database objects that might be causing issues
-- Look for any views that might be joining with championship tables
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
  AND (definition LIKE '%championship%' OR definition LIKE '%champion%' OR definition LIKE '%match_order%');

-- Check for any triggers that might be causing issues
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (action_statement LIKE '%championship%' OR action_statement LIKE '%champion%' OR action_statement LIKE '%match_order%');

-- Check for any functions that might be causing issues
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_definition LIKE '%championship%' OR routine_definition LIKE '%champion%' OR routine_definition LIKE '%match_order%');

-- Check for any RLS policies that might be causing issues
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%championship%' OR qual LIKE '%champion%' OR qual LIKE '%match_order%');

-- Check for any indexes that might be causing issues
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE (indexdef LIKE '%championship%' OR indexdef LIKE '%champion%' OR indexdef LIKE '%match_order%'); 