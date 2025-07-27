-- Comprehensive championship cleanup script
-- This will find and remove ALL championship-related objects

-- 1. Drop any remaining championship-related tables
DROP TABLE IF EXISTS championship_stats CASCADE;
DROP TABLE IF EXISTS championships CASCADE;
DROP TABLE IF EXISTS championship_history CASCADE;

-- 2. Drop any championship-related views
DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN 
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
          AND (viewname LIKE '%championship%' OR viewname LIKE '%champion%')
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || view_record.viewname || ' CASCADE';
    END LOOP;
END $$;

-- 3. Drop any championship-related functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
          AND (routine_name LIKE '%championship%' OR routine_name LIKE '%champion%')
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.routine_name || ' CASCADE';
    END LOOP;
END $$;

-- 4. Drop any championship-related triggers
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
          AND (trigger_name LIKE '%championship%' OR trigger_name LIKE '%champion%')
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON ' || trigger_record.event_object_table || ' CASCADE';
    END LOOP;
END $$;

-- 5. Drop any championship-related indexes
DO $$
DECLARE
    index_record RECORD;
BEGIN
    FOR index_record IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND (indexname LIKE '%championship%' OR indexname LIKE '%champion%')
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || index_record.indexname || ' CASCADE';
    END LOOP;
END $$;

-- 6. Drop any championship-related policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND (policyname LIKE '%championship%' OR policyname LIKE '%champion%')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || policy_record.policyname || ' ON ' || policy_record.tablename;
    END LOOP;
END $$;

-- 7. Check for any remaining championship-related objects
SELECT 'Tables' as object_type, tablename as object_name
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE '%championship%'
UNION ALL
SELECT 'Views' as object_type, viewname as object_name
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname LIKE '%championship%'
UNION ALL
SELECT 'Functions' as object_type, routine_name as object_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%championship%'
UNION ALL
SELECT 'Triggers' as object_type, trigger_name as object_name
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND trigger_name LIKE '%championship%'
UNION ALL
SELECT 'Indexes' as object_type, indexname as object_name
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE '%championship%'
UNION ALL
SELECT 'Policies' as object_type, policyname as object_name
FROM pg_policies 
WHERE schemaname = 'public' 
  AND policyname LIKE '%championship%';

-- 8. Check for any objects that reference 'championships' in their definition
SELECT 'Views with championship refs' as object_type, viewname as object_name, definition
FROM pg_views 
WHERE schemaname = 'public' 
  AND definition LIKE '%championships%';

SELECT 'Functions with championship refs' as object_type, routine_name as object_name, routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_definition LIKE '%championships%'; 