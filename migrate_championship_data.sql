-- Migration script to populate enhanced championship tables
-- Run this after applying the enhanced_championship_schema.sql

-- 1. UPDATE EXISTING CHAMPIONSHIPS WITH BRAND AND TYPE INFO

UPDATE championships SET 
  brand = CASE 
    WHEN title_name LIKE '%Raw%' OR title_name LIKE '%RAW%' THEN 'RAW'
    WHEN title_name LIKE '%SmackDown%' OR title_name LIKE '%Smackdown%' THEN 'SmackDown'
    WHEN title_name LIKE '%NXT%' THEN 'NXT'
    ELSE 'Unassigned'
  END,
  title_type = CASE 
    WHEN title_name LIKE '%Tag Team%' THEN 'Tag Team'
    ELSE 'Singles'
  END
WHERE brand IS NULL OR title_type IS NULL;

-- 2. POPULATE CHAMPIONSHIP STATS FROM EXISTING HISTORY

INSERT INTO championship_stats (
  championship_id,
  total_reigns,
  longest_reign_days,
  longest_reign_champion,
  longest_reign_start_date,
  most_reigns_wrestler,
  most_reigns_count,
  average_reign_days,
  last_updated
)
SELECT 
  ch.championship_id,
  COUNT(*) as total_reigns,
  MAX(ch.reign_days) as longest_reign_days,
  (SELECT champion FROM championship_history 
   WHERE championship_id = ch.championship_id 
   ORDER BY reign_days DESC NULLS LAST LIMIT 1) as longest_reign_champion,
  (SELECT date_won FROM championship_history 
   WHERE championship_id = ch.championship_id 
   ORDER BY reign_days DESC NULLS LAST LIMIT 1) as longest_reign_start_date,
  (SELECT champion FROM (
    SELECT champion, COUNT(*) as reign_count 
    FROM championship_history 
    WHERE championship_id = ch.championship_id 
    GROUP BY champion 
    ORDER BY reign_count DESC 
    LIMIT 1
  ) subq) as most_reigns_wrestler,
  (SELECT COUNT(*) FROM (
    SELECT champion, COUNT(*) as reign_count 
    FROM championship_history 
    WHERE championship_id = ch.championship_id 
    GROUP BY champion 
    ORDER BY reign_count DESC 
    LIMIT 1
  ) subq) as most_reigns_count,
  AVG(ch.reign_days) as average_reign_days,
  NOW() as last_updated
FROM championship_history ch
GROUP BY ch.championship_id
ON CONFLICT (championship_id) DO UPDATE SET
  total_reigns = EXCLUDED.total_reigns,
  longest_reign_days = EXCLUDED.longest_reign_days,
  longest_reign_champion = EXCLUDED.longest_reign_champion,
  longest_reign_start_date = EXCLUDED.longest_reign_start_date,
  most_reigns_wrestler = EXCLUDED.most_reigns_wrestler,
  most_reigns_count = EXCLUDED.most_reigns_count,
  average_reign_days = EXCLUDED.average_reign_days,
  last_updated = NOW();

-- 3. POPULATE WRESTLER CHAMPIONSHIPS FROM EXISTING HISTORY

INSERT INTO wrestler_championships (
  wrestler_slug,
  championship_id,
  total_reigns,
  total_days_held,
  longest_reign_days,
  first_win_date,
  last_win_date,
  created_at,
  updated_at
)
SELECT 
  ch.champion_slug,
  ch.championship_id,
  COUNT(*) as total_reigns,
  SUM(COALESCE(ch.reign_days, 0)) as total_days_held,
  MAX(ch.reign_days) as longest_reign_days,
  MIN(ch.date_won) as first_win_date,
  MAX(ch.date_won) as last_win_date,
  NOW() as created_at,
  NOW() as updated_at
FROM championship_history ch
WHERE ch.champion_slug IS NOT NULL
GROUP BY ch.champion_slug, ch.championship_id
ON CONFLICT (wrestler_slug, championship_id) DO UPDATE SET
  total_reigns = EXCLUDED.total_reigns,
  total_days_held = EXCLUDED.total_days_held,
  longest_reign_days = EXCLUDED.longest_reign_days,
  first_win_date = EXCLUDED.first_win_date,
  last_win_date = EXCLUDED.last_win_date,
  updated_at = NOW();

-- 4. POPULATE CHAMPIONSHIP DEFENSES FROM EXISTING MATCHES
-- This extracts successful defenses from existing events

INSERT INTO championship_defenses (
  championship_id,
  champion_slug,
  challenger_slug,
  event_id,
  match_order,
  defense_date,
  result,
  method,
  match_time,
  notes,
  created_at
)
SELECT 
  c.id as championship_id,
  c.current_champion_slug as champion_slug,
  -- Extract challenger from match participants (simplified)
  NULL as challenger_slug, -- Will need manual population for historical data
  e.id as event_id,
  (match->>'order')::INTEGER as match_order,
  e.date::DATE as defense_date,
  CASE 
    WHEN match->>'titleOutcome' = 'Successful Defense' THEN 'Successful Defense'
    WHEN match->>'titleOutcome' = 'New Champion' THEN 'Title Change'
    ELSE 'Successful Defense' -- Default assumption for historical data
  END as result,
  match->>'method' as method,
  match->>'time' as match_time,
  match->>'notes' as notes,
  NOW() as created_at
FROM events e
CROSS JOIN LATERAL jsonb_array_elements(e.matches) AS match
JOIN championships c ON c.title_name = match->>'title'
WHERE match->>'title' IS NOT NULL 
  AND match->>'title' != 'None'
  AND match->>'titleOutcome' IN ('Successful Defense', 'New Champion')
  AND c.current_champion_slug IS NOT NULL;

-- 5. UPDATE CHAMPIONSHIP DEFENSE COUNTS

UPDATE championships c SET
  defense_count = (
    SELECT COUNT(*) 
    FROM championship_defenses cd 
    WHERE cd.championship_id = c.id
  ),
  last_defense_date = (
    SELECT MAX(defense_date) 
    FROM championship_defenses cd 
    WHERE cd.championship_id = c.id
  ),
  total_reigns = (
    SELECT COUNT(*) 
    FROM championship_history ch 
    WHERE ch.championship_id = c.id
  );

-- 6. UPDATE CHAMPIONSHIP HISTORY WITH DEFENSE COUNTS

UPDATE championship_history ch SET
  defense_count = (
    SELECT COUNT(*) 
    FROM championship_defenses cd 
    WHERE cd.championship_id = ch.championship_id 
    AND cd.champion_slug = ch.champion_slug
    AND cd.defense_date BETWEEN ch.date_won AND COALESCE(ch.date_lost, CURRENT_DATE)
  ),
  successful_defenses = (
    SELECT COUNT(*) 
    FROM championship_defenses cd 
    WHERE cd.championship_id = ch.championship_id 
    AND cd.champion_slug = ch.champion_slug
    AND cd.defense_date BETWEEN ch.date_won AND COALESCE(ch.date_lost, CURRENT_DATE)
    AND cd.result = 'Successful Defense'
  );

-- 7. CREATE SAMPLE CHAMPIONSHIP LINEAGE DATA
-- This is for demonstration - you'll want to populate with real lineage data

INSERT INTO championship_lineage (
  championship_id,
  predecessor_championship_id,
  successor_championship_id,
  lineage_date,
  lineage_type,
  notes
) VALUES 
-- Example: WWE Championship lineage
('undisputed-wwe-championship', NULL, NULL, '2022-04-03', 'Rename', 'WWE Championship renamed to Undisputed WWE Championship'),
-- Example: World Heavyweight Championship lineage  
('world-heavyweight-championship', NULL, NULL, '2023-04-28', 'Split', 'New World Heavyweight Championship created for RAW brand')
ON CONFLICT DO NOTHING;

-- 8. UPDATE WRESTLER CURRENT TITLE INFO

UPDATE wrestlers w SET
  currentTitle = (
    SELECT c.title_name 
    FROM championships c 
    WHERE c.current_champion_slug = w.id 
    AND c.is_active = true
    LIMIT 1
  )
WHERE w.currentTitle IS NULL OR w.currentTitle = '';

-- 9. CREATE INDEXES FOR PERFORMANCE (if not already created)

CREATE INDEX IF NOT EXISTS idx_championships_brand ON championships(brand);
CREATE INDEX IF NOT EXISTS idx_championships_title_type ON championships(title_type);
CREATE INDEX IF NOT EXISTS idx_championships_is_active ON championships(is_active);

CREATE INDEX IF NOT EXISTS idx_championship_history_defense_count ON championship_history(defense_count);
CREATE INDEX IF NOT EXISTS idx_championship_history_successful_defenses ON championship_history(successful_defenses);

-- 10. VERIFICATION QUERIES
-- Run these to verify the migration worked correctly

-- Check current champions with stats
SELECT 
  title_name,
  current_champion,
  brand,
  title_type,
  defense_count,
  total_reigns,
  current_reign_days
FROM current_champions_with_stats
ORDER BY brand, title_name;

-- Check wrestler achievements
SELECT 
  wrestler_name,
  brand,
  championships_won,
  total_reigns,
  total_days_held,
  longest_single_reign
FROM wrestler_achievements
WHERE championships_won > 0
ORDER BY championships_won DESC, total_days_held DESC
LIMIT 20;

-- Check championship history with details
SELECT 
  title_name,
  champion_name,
  date_won,
  reign_days,
  defense_count,
  successful_defenses
FROM championship_history_detailed
ORDER BY date_won DESC
LIMIT 20; 