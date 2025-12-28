-- Script to rebuild championships table by processing all events chronologically
-- This ensures the current champion reflects the most recent title change

-- First, let's see what events we have with championship matches
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
  END;

-- Function to rebuild a single championship from events
CREATE OR REPLACE FUNCTION rebuild_championship_from_events(champ_id TEXT)
RETURNS VOID AS $$
DECLARE
  event_record RECORD;
  match_record JSONB;
  title_name TEXT;
  title_outcome TEXT;
  match_result TEXT;
  winner_name TEXT;
  winner_slug TEXT;
  loser_name TEXT;
  loser_slug TEXT;
  event_date DATE;
  current_champ_name TEXT;
  current_champ_slug TEXT;
  prev_champ_name TEXT;
  prev_champ_slug TEXT;
  championship_id TEXT;
  match_participants TEXT;
  vacation_reason_text TEXT;
  match_notes TEXT;
BEGIN
  -- Get championship title name
  SELECT title_name INTO title_name
  FROM championships
  WHERE id = champ_id;
  
  IF title_name IS NULL THEN
    RAISE NOTICE 'Championship % not found', champ_id;
    RETURN;
  END IF;
  
  -- Initialize current champion as NULL (we'll build it up)
  current_champ_name := NULL;
  current_champ_slug := NULL;
  prev_champ_name := NULL;
  prev_champ_slug := NULL;
  
  -- Process all events in chronological order
  FOR event_record IN 
    SELECT id, name, date, matches
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
    -- Parse event date
    BEGIN
      event_date := TO_DATE(event_record.date, 'Month DD, YYYY');
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        event_date := TO_DATE(event_record.date, 'YYYY-MM-DD');
      EXCEPTION WHEN OTHERS THEN
        event_date := CURRENT_DATE;
      END;
    END;
    
    -- Loop through matches in this event
    FOR match_record IN SELECT * FROM jsonb_array_elements(event_record.matches)
    LOOP
      -- Check if this match is for our championship
      IF (match_record->>'title') = title_name AND match_record->>'title' IS NOT NULL AND match_record->>'title' != 'None' THEN
        title_outcome := match_record->>'titleOutcome';
        match_result := match_record->>'result';
        match_participants := match_record->>'participants';
        match_notes := match_record->>'notes';
        
        -- Skip if no relevant title outcome
        IF title_outcome IS NULL OR title_outcome = 'None' OR title_outcome = '' OR title_outcome = 'No. 1 Contender' THEN
          CONTINUE;
        END IF;
        
        -- Handle New Champion
        IF title_outcome = 'New Champion' THEN
          -- Extract winner (simplified - you may need to call the actual functions)
          -- For now, we'll use a simple approach
          IF match_result LIKE '% def. %' THEN
            winner_name := TRIM(SPLIT_PART(match_result, ' def. ', 1));
            loser_name := TRIM(SPLIT_PART(SPLIT_PART(match_result, ' def. ', 2), ' (', 1));
            loser_name := TRIM(SPLIT_PART(loser_name, ', ', 1));
          END IF;
          
          -- Update current and previous
          IF winner_name IS NOT NULL THEN
            prev_champ_name := current_champ_name;
            prev_champ_slug := current_champ_slug;
            current_champ_name := winner_name;
            current_champ_slug := find_wrestler_slug(winner_name);
            IF loser_name IS NOT NULL THEN
              prev_champ_name := loser_name;
              prev_champ_slug := find_wrestler_slug(loser_name);
            END IF;
          END IF;
          
        -- Handle Vacant
        ELSIF title_outcome = 'Vacant' THEN
          -- Extract vacation reason
          IF match_notes IS NOT NULL AND match_notes LIKE 'Vacated due to: %' THEN
            vacation_reason_text := SUBSTRING(match_notes FROM 'Vacated due to: (.+)');
          ELSIF match_notes IS NOT NULL AND match_notes != '' THEN
            vacation_reason_text := match_notes;
          END IF;
          
          prev_champ_name := current_champ_name;
          prev_champ_slug := current_champ_slug;
          current_champ_name := 'VACANT';
          current_champ_slug := 'vacant';
          
        -- Handle Champion Retains (no change)
        ELSIF title_outcome = 'Champion Retains' THEN
          -- No change needed
          CONTINUE;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  -- Update the championship record
  IF current_champ_name IS NOT NULL THEN
    UPDATE championships
    SET 
      current_champion = current_champ_name,
      current_champion_slug = COALESCE(current_champ_slug, 'unknown'),
      previous_champion = prev_champ_name,
      previous_champion_slug = COALESCE(prev_champ_slug, 'unknown'),
      date_won = (SELECT MAX(
        CASE 
          WHEN date ~ '^\d{4}-\d{2}-\d{2}$' THEN TO_DATE(date, 'YYYY-MM-DD')
          WHEN date ~ '^[A-Z][a-z]+ \d{1,2}, \d{4}$' THEN TO_DATE(date, 'Month DD, YYYY')
          ELSE CURRENT_DATE
        END
      ) FROM events WHERE matches IS NOT NULL),
      updated_at = NOW()
    WHERE id = champ_id;
    
    RAISE NOTICE 'Updated championship %: % (prev: %)', champ_id, current_champ_name, prev_champ_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Note: This is a simplified version. For a complete solution, we should
-- trigger the actual process_championship_changes function for each event
-- by temporarily updating the events table.

