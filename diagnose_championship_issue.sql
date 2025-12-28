-- Diagnostic script to check championship data and identify issues
-- Run this first to see what's in your database

-- Check all championships and their previous champion data
SELECT 
  id,
  title_name,
  current_champion,
  current_champion_slug,
  previous_champion,
  previous_champion_slug,
  event_id,
  event_name,
  date_won
FROM championships
ORDER BY title_name;

-- Check which ones have "Unknown" or NULL previous_champion
SELECT 
  id,
  title_name,
  current_champion,
  previous_champion,
  previous_champion_slug,
  CASE 
    WHEN previous_champion_slug IS NULL THEN 'No slug stored'
    WHEN previous_champion_slug = 'unknown' THEN 'Slug is "unknown"'
    WHEN previous_champion_slug = 'vacant' THEN 'Slug is "vacant" (correct)'
    WHEN EXISTS (SELECT 1 FROM wrestlers WHERE id = previous_champion_slug) THEN 'Slug exists in wrestlers table'
    WHEN EXISTS (SELECT 1 FROM tag_teams WHERE id = previous_champion_slug) THEN 'Slug exists in tag_teams table'
    ELSE 'Slug not found in any table'
  END AS slug_status
FROM championships
WHERE previous_champion = 'Unknown' 
   OR previous_champion IS NULL
   OR previous_champion = ''
ORDER BY title_name;

-- Check if slugs can be resolved to names
SELECT 
  c.id,
  c.title_name,
  c.previous_champion AS current_value,
  c.previous_champion_slug,
  COALESCE(w.name, t.name) AS resolved_name,
  CASE 
    WHEN w.name IS NOT NULL THEN 'Can resolve from wrestlers'
    WHEN t.name IS NOT NULL THEN 'Can resolve from tag_teams'
    ELSE 'Cannot resolve'
  END AS resolution_status
FROM championships c
LEFT JOIN wrestlers w ON w.id = c.previous_champion_slug
LEFT JOIN tag_teams t ON t.id = c.previous_champion_slug
WHERE (c.previous_champion = 'Unknown' OR c.previous_champion IS NULL OR c.previous_champion = '')
  AND c.previous_champion_slug IS NOT NULL
  AND c.previous_champion_slug != 'unknown'
  AND c.previous_champion_slug != 'vacant'
ORDER BY c.title_name;

