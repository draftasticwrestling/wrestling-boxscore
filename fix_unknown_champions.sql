-- Quick fix script for "Unknown" previous_champion entries
-- This will update championships table where previous_champion is 'Unknown' but slug exists

-- First, check what needs to be fixed
SELECT 
  id,
  title_name,
  current_champion,
  previous_champion,
  previous_champion_slug,
  event_id,
  event_name,
  date_won
FROM championships
WHERE previous_champion = 'Unknown' 
   OR (previous_champion IS NULL AND previous_champion_slug IS NOT NULL)
ORDER BY title_name;

-- Fix records where previous_champion_slug exists and matches a wrestler
UPDATE championships 
SET previous_champion = (
  SELECT name FROM wrestlers WHERE id = championships.previous_champion_slug LIMIT 1
)
WHERE previous_champion = 'Unknown' 
  AND previous_champion_slug IS NOT NULL 
  AND previous_champion_slug != 'unknown'
  AND previous_champion_slug != 'vacant'
  AND EXISTS (SELECT 1 FROM wrestlers WHERE id = championships.previous_champion_slug);

-- Also fix records where previous_champion is NULL but slug exists
UPDATE championships 
SET previous_champion = (
  SELECT name FROM wrestlers WHERE id = championships.previous_champion_slug LIMIT 1
)
WHERE previous_champion IS NULL 
  AND previous_champion_slug IS NOT NULL 
  AND previous_champion_slug != 'unknown'
  AND previous_champion_slug != 'vacant'
  AND EXISTS (SELECT 1 FROM wrestlers WHERE id = championships.previous_champion_slug);

-- Fix tag teams
UPDATE championships 
SET previous_champion = (
  SELECT name FROM tag_teams WHERE id = championships.previous_champion_slug LIMIT 1
)
WHERE (previous_champion = 'Unknown' OR previous_champion IS NULL)
  AND previous_champion_slug IS NOT NULL 
  AND previous_champion_slug != 'unknown'
  AND previous_champion_slug != 'vacant'
  AND NOT EXISTS (SELECT 1 FROM wrestlers WHERE id = championships.previous_champion_slug)
  AND EXISTS (SELECT 1 FROM tag_teams WHERE id = championships.previous_champion_slug);

-- Check results
SELECT 
  id,
  title_name,
  current_champion,
  previous_champion,
  previous_champion_slug,
  event_id
FROM championships
WHERE previous_champion_slug IS NOT NULL 
  AND previous_champion_slug != 'unknown'
  AND previous_champion_slug != 'vacant'
ORDER BY title_name;

