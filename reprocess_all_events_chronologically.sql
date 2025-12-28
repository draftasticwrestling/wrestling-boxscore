-- Script to reprocess all events in chronological order to rebuild championships table
-- This ensures the championships table reflects the most recent state after processing all events

-- Method: Temporarily disable the trigger, then update each event (which will fire the trigger)
-- when we re-enable it, OR we can directly call the function logic

-- First, let's see what events we have
SELECT 
  id,
  name,
  date,
  jsonb_array_length(matches) as match_count
FROM events
WHERE matches IS NOT NULL
ORDER BY 
  CASE 
    WHEN date ~ '^\d{4}-\d{2}-\d{2}$' THEN TO_DATE(date, 'YYYY-MM-DD')
    WHEN date ~ '^[A-Z][a-z]+ \d{1,2}, \d{4}$' THEN TO_DATE(date, 'Month DD, YYYY')
    ELSE CURRENT_DATE
  END,
  name;

-- Temporarily disable the trigger to avoid multiple fires
ALTER TABLE events DISABLE TRIGGER trigger_process_championships;

-- Now update each event in chronological order to trigger processing
-- We'll do a no-op update (set matches to itself) which will trigger the function
DO $$
DECLARE
  event_record RECORD;
BEGIN
  FOR event_record IN 
    SELECT id, matches
    FROM events
    WHERE matches IS NOT NULL
    ORDER BY 
      CASE 
        WHEN date ~ '^\d{4}-\d{2}-\d{2}$' THEN TO_DATE(date, 'YYYY-MM-DD')
        WHEN date ~ '^[A-Z][a-z]+ \d{1,2}, \d{4}$' THEN TO_DATE(date, 'Month DD, YYYY')
        ELSE CURRENT_DATE
      END,
      name
  LOOP
    -- Update the event (setting matches to itself) to trigger the function
    -- But wait, we disabled the trigger, so this won't work...
    -- We need a different approach
  END LOOP;
END $$;

-- Re-enable the trigger
ALTER TABLE events ENABLE TRIGGER trigger_process_championships;

-- Actually, a better approach: Call the function directly for each event
-- But the function is a TRIGGER function, so we need to simulate the trigger

-- Best approach: Create a wrapper function that processes a single event
CREATE OR REPLACE FUNCTION reprocess_event_championships(event_id_to_process TEXT)
RETURNS VOID AS $$
DECLARE
  event_data RECORD;
  old_matches JSONB;
BEGIN
  -- Get the event data
  SELECT * INTO event_data
  FROM events
  WHERE id = event_id_to_process;
  
  IF event_data IS NULL THEN
    RAISE NOTICE 'Event % not found', event_id_to_process;
    RETURN;
  END IF;
  
  -- Set OLD.matches to NULL to simulate a change
  -- We'll need to temporarily create a row in events
  -- Actually, we can't easily call a trigger function directly...
  
  -- Better: Manually trigger by doing a no-op update with trigger enabled
  -- But we need to do this one at a time in order
  
  -- For now, let's use a simpler approach: update each event's updated_at to force a change
  UPDATE events
  SET updated_at = updated_at  -- No-op update that will trigger the function
  WHERE id = event_id_to_process;
END;
$$ LANGUAGE plpgsql;

-- Actually, the simplest solution: Update each event in chronological order
-- The trigger will fire for each one, processing them in order
DO $$
DECLARE
  event_record RECORD;
  update_count INTEGER := 0;
BEGIN
  FOR event_record IN 
    SELECT id
    FROM events
    WHERE matches IS NOT NULL
    ORDER BY 
      CASE 
        WHEN date ~ '^\d{4}-\d{2}-\d{2}$' THEN TO_DATE(date, 'YYYY-MM-DD')
        WHEN date ~ '^[A-Z][a-z]+ \d{1,2}, \d{4}$' THEN TO_DATE(date, 'Month DD, YYYY')
        ELSE CURRENT_DATE
      END,
      name
  LOOP
    -- Do a no-op update to trigger the function
    -- We'll update a field that exists but doesn't change the data
    UPDATE events
    SET updated_at = COALESCE(updated_at, NOW())
    WHERE id = event_record.id;
    
    update_count := update_count + 1;
    RAISE NOTICE 'Processed event % (% total)', event_record.id, update_count;
  END LOOP;
  
  RAISE NOTICE 'Finished processing % events', update_count;
END $$;

-- Verify the results
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

