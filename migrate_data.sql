-- Migration script to update existing data to new structure
-- This script moves championship data from stipulation to title field

-- Update existing matches to move championships from stipulation to title
UPDATE events 
SET matches = (
  SELECT jsonb_agg(
    CASE 
      WHEN match->>'stipulation' IN (
        'Undisputed WWE Championship',
        'World Heavyweight Championship',
        'Men''s IC Championship',
        'Men''s U.S. Championship',
        'Raw Tag Team Championship',
        'SmackDown Tag Team Championship',
        'Men''s Speed Championship',
        'WWE Women''s Championship',
        'Women''s World Championship',
        'Women''s IC Championship',
        'Women''s U.S. Championship',
        'Women''s Tag Team Championship',
        'Women''s Speed Championship'
      ) THEN 
        match || 
        jsonb_build_object('title', match->>'stipulation') ||
        jsonb_build_object('stipulation', 'None')
      ELSE 
        match || 
        jsonb_build_object('title', 'None')
    END
  )
  FROM jsonb_array_elements(matches) AS match
)
WHERE matches IS NOT NULL;

-- Clean up Money in the Bank winners and other special winners
UPDATE events
SET matches = (
  SELECT jsonb_agg(
    CASE
      -- Handle Money in the Bank winners
      WHEN match->>'stipulation' = 'Women''s Money in the Bank winner' THEN
        match || 
        jsonb_build_object('specialWinnerType', 'Women''s Money in the Bank winner') ||
        jsonb_build_object('stipulation', 'None')
      WHEN match->>'stipulation' = 'Men''s Money in the Bank winner' THEN
        match || 
        jsonb_build_object('specialWinnerType', 'Men''s Money in the Bank winner') ||
        jsonb_build_object('stipulation', 'None')
      -- Remove title from stipulation if it exists in both fields
      WHEN (match->>'stipulation' = match->>'title') AND (match->>'title' IS NOT NULL) AND (match->>'title' != 'None') THEN
        match || 
        jsonb_build_object('stipulation', 'None')
      ELSE match
    END
  )
  FROM jsonb_array_elements(matches) AS match
)
WHERE matches IS NOT NULL; 