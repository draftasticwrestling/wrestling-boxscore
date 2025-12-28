-- Simple script to reprocess all events chronologically
-- This temporarily modifies matches to force the trigger to process each event

-- Process each event in chronological order
-- We'll add a temporary marker to matches, which forces a change
-- Then remove it, which also forces a change
-- Each update triggers the championship processing

DO $$
DECLARE
  event_record RECORD;
  event_count INTEGER := 0;
BEGIN
  -- Process events in chronological order
  FOR event_record IN 
    SELECT id, matches
    FROM events
    WHERE matches IS NOT NULL AND jsonb_array_length(matches) > 0
    ORDER BY 
      CASE 
        WHEN date ~ '^\d{4}-\d{2}-\d{2}$' THEN TO_DATE(date, 'YYYY-MM-DD')
        WHEN date ~ '^[A-Z][a-z]+ \d{1,2}, \d{4}$' THEN TO_DATE(date, 'Month DD, YYYY')
        ELSE CURRENT_DATE
      END,
      name
  LOOP
    -- Force a change by modifying the JSONB structure
    -- Add a temp field to the first match (if it exists)
    IF event_record.matches IS NOT NULL AND jsonb_array_length(event_record.matches) > 0 THEN
      -- Modify the matches by adding then removing a temp field
      -- This causes the trigger to fire and process the event
      UPDATE events
      SET matches = (
        SELECT jsonb_agg(
          CASE 
            WHEN ordinality = 1 THEN match || '{"__reprocess": true}'::jsonb
            ELSE match
          END
        )
        FROM jsonb_array_elements(matches) WITH ORDINALITY AS t(match, ordinality)
      )
      WHERE id = event_record.id;
      
      -- Now remove the temp field - this also triggers processing
      UPDATE events
      SET matches = (
        SELECT jsonb_agg(match - '__reprocess')
        FROM jsonb_array_elements(matches) AS t(match)
      )
      WHERE id = event_record.id;
      
      event_count := event_count + 1;
      RAISE NOTICE 'Reprocessed event % (% total)', event_record.id, event_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Finished reprocessing % events', event_count;
END $$;

-- Verify the championship state
SELECT 
  id,
  title_name,
  current_champion,
  current_champion_slug,
  previous_champion,
  previous_champion_slug,
  date_won,
  event_name
FROM championships
ORDER BY title_name;

