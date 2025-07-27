-- Check for any triggers on the events table
SELECT 
    trigger_name,
    event_object_table,
    action_statement,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'events'
  AND trigger_schema = 'public';

-- Check for any views that reference the events table
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
  AND definition LIKE '%events%';

-- Check for any RLS policies on the events table
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'events';

-- Check for any functions that might be called by triggers
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition LIKE '%events%'; 