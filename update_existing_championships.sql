-- Script to update existing championship records with correct previous_champion names
-- This script reprocesses existing championship records to fix "Unknown" entries
-- Run this AFTER applying the updated create_championships_schema.sql

-- First, let's see what needs to be fixed
SELECT 
  id,
  title_name,
  current_champion,
  previous_champion,
  previous_champion_slug,
  event_id
FROM championships
WHERE previous_champion = 'Unknown' OR previous_champion_slug = 'unknown'
ORDER BY title_name;

-- Note: The actual fix will happen automatically when you re-save events
-- because the trigger will fire and use the new logic.
-- 
-- To manually fix existing records, you can:
-- 1. Re-save the event that contains the championship change in the UI
-- OR
-- 2. Update the event's matches array slightly (e.g., add/remove a space) to trigger the function
-- OR  
-- 3. Manually update the championship records using the queries below:

-- Example: If you know that a championship's previous_champion_slug should map to a specific name:
-- UPDATE championships 
-- SET previous_champion = (SELECT name FROM wrestlers WHERE id = previous_champion_slug)
-- WHERE previous_champion = 'Unknown' 
--   AND previous_champion_slug IS NOT NULL 
--   AND previous_champion_slug != 'unknown'
--   AND EXISTS (SELECT 1 FROM wrestlers WHERE id = previous_champion_slug);

-- For tag teams:
-- UPDATE championships 
-- SET previous_champion = (SELECT name FROM tag_teams WHERE id = previous_champion_slug)
-- WHERE previous_champion = 'Unknown' 
--   AND previous_champion_slug IS NOT NULL 
--   AND previous_champion_slug != 'unknown'
--   AND EXISTS (SELECT 1 FROM tag_teams WHERE id = previous_champion_slug);

