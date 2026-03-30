-- Rename wrestler slug and display name site-wide:
--   id/name: Ilija Dragunov / ilija-dragunov  ->  Ilja Dragunov / ilja-dragunov
--
-- Run in Supabase SQL Editor (or psql) after a backup.
-- Confirm first: SELECT id, name FROM wrestlers WHERE id = 'ilija-dragunov';
--
-- STORAGE (SQL does not move files): In Supabase Storage bucket wrestler-images,
-- rename objects whose path contains ilija-dragunov to ilja-dragunov so image_url
-- and full_body_image_url keep working after this script updates those columns.

BEGIN;

-- 1) Tables that FK to wrestlers(id) — update before changing wrestlers.id
UPDATE tag_team_members
SET wrestler_slug = 'ilja-dragunov'
WHERE wrestler_slug = 'ilija-dragunov';

UPDATE wrestlers
SET tag_team_partner_slug = 'ilja-dragunov'
WHERE tag_team_partner_slug = 'ilija-dragunov';

-- 2) Championships
UPDATE championships
SET current_champion_slug = 'ilja-dragunov'
WHERE current_champion_slug = 'ilija-dragunov';

UPDATE championships
SET previous_champion_slug = 'ilja-dragunov'
WHERE previous_champion_slug = 'ilija-dragunov';

UPDATE championships
SET current_champion = REPLACE(current_champion, 'Ilija Dragunov', 'Ilja Dragunov')
WHERE current_champion LIKE '%Ilija Dragunov%';

UPDATE championships
SET previous_champion = REPLACE(previous_champion, 'Ilija Dragunov', 'Ilja Dragunov')
WHERE previous_champion LIKE '%Ilija Dragunov%';

-- 3) Championship history (slugs + display strings)
UPDATE championship_history
SET champion_slug = 'ilja-dragunov'
WHERE champion_slug = 'ilija-dragunov';

UPDATE championship_history
SET previous_champion_slug = 'ilja-dragunov'
WHERE previous_champion_slug = 'ilija-dragunov';

UPDATE championship_history
SET champion = REPLACE(champion, 'Ilija Dragunov', 'Ilja Dragunov')
WHERE champion LIKE '%Ilija Dragunov%';

UPDATE championship_history
SET previous_champion = REPLACE(previous_champion, 'Ilija Dragunov', 'Ilja Dragunov')
WHERE previous_champion LIKE '%Ilija Dragunov%';

-- 4) Events: JSON matches (participants, winner, defendingChampion, etc.)
UPDATE events
SET matches = REPLACE(matches::text, 'ilija-dragunov', 'ilja-dragunov')::jsonb
WHERE matches::text LIKE '%ilija-dragunov%';

UPDATE events
SET matches = REPLACE(matches::text, 'Ilija Dragunov', 'Ilja Dragunov')::jsonb
WHERE matches::text LIKE '%Ilija Dragunov%';

-- Optional text columns on events (if used)
UPDATE events
SET preview = REPLACE(preview, 'ilija-dragunov', 'ilja-dragunov')
WHERE preview IS NOT NULL AND preview LIKE '%ilija-dragunov%';

UPDATE events
SET preview = REPLACE(preview, 'Ilija Dragunov', 'Ilja Dragunov')
WHERE preview IS NOT NULL AND preview LIKE '%Ilija Dragunov%';

UPDATE events
SET recap = REPLACE(recap, 'ilija-dragunov', 'ilja-dragunov')
WHERE recap IS NOT NULL AND recap LIKE '%ilija-dragunov%';

UPDATE events
SET recap = REPLACE(recap, 'Ilija Dragunov', 'Ilja Dragunov')
WHERE recap IS NOT NULL AND recap LIKE '%Ilija Dragunov%';

-- 5) Tag team descriptions (if slug appears in prose)
UPDATE tag_teams
SET description = REPLACE(description, 'ilija-dragunov', 'ilja-dragunov')
WHERE description IS NOT NULL AND description LIKE '%ilija-dragunov%';

UPDATE tag_teams
SET description = REPLACE(description, 'Ilija Dragunov', 'Ilja Dragunov')
WHERE description IS NOT NULL AND description LIKE '%Ilija Dragunov%';

-- 6) Wrestler row: URLs then PK + name (must be last)
UPDATE wrestlers
SET image_url = REPLACE(REPLACE(image_url, 'ilija-dragunov', 'ilja-dragunov'), 'Ilija Dragunov', 'Ilja Dragunov')
WHERE id = 'ilija-dragunov'
  AND image_url IS NOT NULL
  AND (image_url LIKE '%ilija-dragunov%' OR image_url LIKE '%Ilija Dragunov%');

UPDATE wrestlers
SET full_body_image_url = REPLACE(REPLACE(full_body_image_url, 'ilija-dragunov', 'ilja-dragunov'), 'Ilija Dragunov', 'Ilja Dragunov')
WHERE id = 'ilija-dragunov'
  AND full_body_image_url IS NOT NULL
  AND (full_body_image_url LIKE '%ilija-dragunov%' OR full_body_image_url LIKE '%Ilija Dragunov%');

UPDATE wrestlers
SET id = 'ilja-dragunov', name = 'Ilja Dragunov'
WHERE id = 'ilija-dragunov';

COMMIT;

-- Post-checks (run after commit):
-- SELECT id, name, image_url FROM wrestlers WHERE id = 'ilja-dragunov';
-- SELECT COUNT(*) FROM wrestlers WHERE id = 'ilija-dragunov';  -- expect 0
-- SELECT COUNT(*) FROM tag_team_members WHERE wrestler_slug = 'ilija-dragunov';  -- expect 0
-- SELECT COUNT(*) FROM events WHERE matches::text LIKE '%ilija-dragunov%';  -- expect 0
