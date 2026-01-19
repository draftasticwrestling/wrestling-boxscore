-- Championship Automation System
-- This file creates the database schema for automatically tracking championship changes

-- 1. Create championships table
CREATE TABLE IF NOT EXISTS championships (
  id TEXT PRIMARY KEY,  -- e.g., 'wwe-championship', 'mens-ic-championship'
  title_name TEXT NOT NULL UNIQUE,
  current_champion TEXT,  -- Name of current champion (can be "VACANT")
  current_champion_slug TEXT,  -- Slug of current champion (can be "vacant")
  previous_champion TEXT,  -- Name of previous champion
  previous_champion_slug TEXT,  -- Slug of previous champion
  date_won DATE,  -- Date title was won
  event_id TEXT,  -- ID of event where title changed
  event_name TEXT,  -- Name of event where title changed
  brand TEXT,  -- RAW, SmackDown, NXT, or Unassigned
  type TEXT,  -- World, Secondary, or Tag Team
  vacation_reason TEXT,  -- Reason for vacancy (if applicable)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_championships_brand ON championships(brand);
CREATE INDEX IF NOT EXISTS idx_championships_type ON championships(type);

-- 2. Helper function to normalize title name to championship ID
CREATE OR REPLACE FUNCTION title_to_championship_id(title_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE title_name
    WHEN 'Undisputed WWE Championship' THEN 'wwe-championship'
    WHEN 'World Heavyweight Championship' THEN 'world-heavyweight-championship'
    WHEN 'Men''s IC Championship' THEN 'mens-ic-championship'
    WHEN 'Men''s U.S. Championship' THEN 'mens-us-championship'
    WHEN 'Raw Tag Team Championship' THEN 'raw-tag-team-championship'
    WHEN 'SmackDown Tag Team Championship' THEN 'smackdown-tag-team-championship'
    WHEN 'Men''s Speed Championship' THEN 'mens-speed-championship'
    WHEN 'WWE Women''s Championship' THEN 'wwe-womens-championship'
    WHEN 'Women''s World Championship' THEN 'womens-world-championship'
    WHEN 'Women''s IC Championship' THEN 'womens-ic-championship'
    WHEN 'Women''s U.S. Championship' THEN 'womens-us-championship'
    WHEN 'Women''s Tag Team Championship' THEN 'womens-tag-team-championship'
    WHEN 'Women''s Speed Championship' THEN 'womens-speed-championship'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql;

-- 3. Helper function to determine brand from title
CREATE OR REPLACE FUNCTION title_to_brand(title_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN title_name LIKE '%Raw%' 
         OR title_name = 'World Heavyweight Championship'
         OR title_name = 'Women''s World Championship'
         OR title_name = 'Men''s IC Championship'
         OR title_name = 'Women''s IC Championship' THEN 'RAW'
    WHEN title_name LIKE '%SmackDown%' 
         OR title_name = 'WWE Women''s Championship' 
         OR title_name = 'Undisputed WWE Championship'
         OR title_name = 'Men''s U.S. Championship'
         OR title_name = 'Women''s U.S. Championship' THEN 'SmackDown'
    WHEN title_name LIKE '%Speed%' THEN 'NXT'
    WHEN title_name LIKE '%Tag Team%' AND title_name NOT LIKE '%Raw%' AND title_name NOT LIKE '%SmackDown%' THEN 'Unassigned'
    ELSE 'Unassigned'
  END;
END;
$$ LANGUAGE plpgsql;

-- 4. Helper function to determine title type
CREATE OR REPLACE FUNCTION title_to_type(title_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN title_name LIKE '%World%' OR title_name LIKE '%WWE Championship%' THEN 'World'
    WHEN title_name LIKE '%Tag Team%' THEN 'Tag Team'
    ELSE 'Secondary'
  END;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to extract winner from match result
-- This handles various formats: "Winner def. Loser", "Winner won", etc.
CREATE OR REPLACE FUNCTION extract_winner_from_result(
  result_text TEXT,
  participants_text TEXT
) RETURNS TEXT AS $$
DECLARE
  winner TEXT;
BEGIN
  IF result_text IS NULL OR result_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Extract winner from "Winner def. Loser" format
  IF result_text LIKE '% def. %' THEN
    winner := TRIM(SPLIT_PART(result_text, ' def. ', 1));
  -- Extract from "Winner won" format
  ELSIF result_text LIKE '% won %' THEN
    winner := TRIM(SPLIT_PART(result_text, ' won ', 1));
  -- Extract from "Winner defeats Loser" format
  ELSIF result_text LIKE '% defeats %' THEN
    winner := TRIM(SPLIT_PART(result_text, ' defeats ', 1));
  ELSE
    -- Try to get first part before any common separators
    winner := TRIM(SPLIT_PART(result_text, ' ', 1));
  END IF;
  
  RETURN winner;
END;
$$ LANGUAGE plpgsql;

-- 5b. Function to extract loser from match result
-- This extracts who was defeated from the match result
CREATE OR REPLACE FUNCTION extract_loser_from_result(
  result_text TEXT,
  participants_text TEXT,
  winner_name TEXT
) RETURNS TEXT AS $$
DECLARE
  loser TEXT;
  participants_array TEXT[];
  participant TEXT;
BEGIN
  IF result_text IS NULL OR result_text = '' OR winner_name IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Extract loser from "Winner def. Loser" format
  IF result_text LIKE '% def. %' THEN
    loser := TRIM(SPLIT_PART(result_text, ' def. ', 2));
    -- Remove method/time info if present (e.g., "Loser (Pinfall)" or "Loser, 12:34")
    loser := TRIM(SPLIT_PART(loser, ' (', 1));
    loser := TRIM(SPLIT_PART(loser, ', ', 1));
    RETURN loser;
  END IF;
  
  -- If we have participants, find who wasn't the winner
  IF participants_text IS NOT NULL AND participants_text != '' THEN
    -- Split participants by " vs " or " & "
    participants_array := string_to_array(REPLACE(REPLACE(participants_text, ' vs ', '|'), ' & ', '|'), '|');
    
    FOREACH participant IN ARRAY participants_array
    LOOP
      participant := TRIM(participant);
      -- Check if this participant is not the winner
      IF participant != winner_name AND 
         NOT (participant LIKE '%' || winner_name || '%') AND
         NOT (winner_name LIKE '%' || participant || '%') THEN
        -- This might be the loser, but we need to check if it's a valid participant
        -- For now, return the first non-winner we find
        RETURN participant;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to find wrestler slug from name
-- This tries to match the winner name to a wrestler in the database
CREATE OR REPLACE FUNCTION find_wrestler_slug(winner_name TEXT)
RETURNS TEXT AS $$
DECLARE
  wrestler_slug TEXT;
  normalized_name TEXT;
BEGIN
  IF winner_name IS NULL OR winner_name = '' THEN
    RETURN NULL;
  END IF;
  
  -- Try exact match on name
  SELECT id INTO wrestler_slug
  FROM wrestlers
  WHERE name = winner_name
  LIMIT 1;
  
  IF wrestler_slug IS NOT NULL THEN
    RETURN wrestler_slug;
  END IF;
  
  -- Try case-insensitive match
  SELECT id INTO wrestler_slug
  FROM wrestlers
  WHERE LOWER(name) = LOWER(winner_name)
  LIMIT 1;
  
  IF wrestler_slug IS NOT NULL THEN
    RETURN wrestler_slug;
  END IF;
  
  -- Try to match if winner_name is already a slug
  SELECT id INTO wrestler_slug
  FROM wrestlers
  WHERE id = winner_name
  LIMIT 1;
  
  IF wrestler_slug IS NOT NULL THEN
    RETURN wrestler_slug;
  END IF;
  
  -- Try to find tag team match
  SELECT id INTO wrestler_slug
  FROM tag_teams
  WHERE name = winner_name OR LOWER(name) = LOWER(winner_name)
  LIMIT 1;
  
  IF wrestler_slug IS NOT NULL THEN
    RETURN wrestler_slug;
  END IF;
  
  -- If no match found, create a slug from the name
  normalized_name := LOWER(REGEXP_REPLACE(winner_name, '[^a-z0-9]+', '-', 'gi'));
  normalized_name := TRIM(BOTH '-' FROM normalized_name);
  
  RETURN normalized_name;
END;
$$ LANGUAGE plpgsql;

-- 6b. Function to get wrestler name from slug
CREATE OR REPLACE FUNCTION get_wrestler_name_from_slug(wrestler_slug TEXT)
RETURNS TEXT AS $$
DECLARE
  wrestler_name TEXT;
BEGIN
  IF wrestler_slug IS NULL OR wrestler_slug = '' THEN
    RETURN NULL;
  END IF;
  
  -- Try to get name from wrestlers table
  SELECT name INTO wrestler_name
  FROM wrestlers
  WHERE id = wrestler_slug
  LIMIT 1;
  
  IF wrestler_name IS NOT NULL THEN
    RETURN wrestler_name;
  END IF;
  
  -- Try to get name from tag_teams table
  SELECT name INTO wrestler_name
  FROM tag_teams
  WHERE id = wrestler_slug
  LIMIT 1;
  
  IF wrestler_name IS NOT NULL THEN
    RETURN wrestler_name;
  END IF;
  
  -- If no match found, return NULL
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. Main trigger function to process championship changes
CREATE OR REPLACE FUNCTION process_championship_changes()
RETURNS TRIGGER AS $$
DECLARE
  match_record JSONB;
  title_name TEXT;
  title_outcome TEXT;
  match_result TEXT;
  winner_name TEXT;
  winner_slug TEXT;
  defending_champion_slug TEXT;
  championship_id TEXT;
  event_date DATE;
  current_champ_record RECORD;
  match_participants TEXT;
  loser_name TEXT;
  loser_slug TEXT;
  match_notes TEXT;
  vacation_reason_text TEXT;
  actual_wrestler_name TEXT;
BEGIN
  -- Only process if matches array changed
  IF OLD.matches IS NOT DISTINCT FROM NEW.matches THEN
    RETURN NEW;
  END IF;
  
  -- Parse event date - try multiple formats
  BEGIN
    event_date := TO_DATE(NEW.date, 'Month DD, YYYY');
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      event_date := TO_DATE(NEW.date, 'YYYY-MM-DD');
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        event_date := TO_DATE(NEW.date, 'Mon DD, YYYY');
      EXCEPTION WHEN OTHERS THEN
        event_date := CURRENT_DATE;
      END;
    END;
  END;
  
  -- Loop through each match in the matches array
  FOR match_record IN SELECT * FROM jsonb_array_elements(NEW.matches)
  LOOP
    title_name := match_record->>'title';
    title_outcome := match_record->>'titleOutcome';
    match_result := match_record->>'result';
    defending_champion_slug := match_record->>'defendingChampion';
    match_participants := match_record->>'participants';
    
    -- Skip if no title or title is "None"
    IF title_name IS NULL OR title_name = 'None' OR title_name = '' THEN
      CONTINUE;
    END IF;
    
    -- Skip if titleOutcome is not relevant
    IF title_outcome IS NULL OR title_outcome = 'None' OR title_outcome = '' OR title_outcome = 'No. 1 Contender' THEN
      CONTINUE;
    END IF;
    
    -- Get championship ID
    championship_id := title_to_championship_id(title_name);
    IF championship_id IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Handle different title outcomes
    IF title_outcome = 'New Champion' THEN
      -- Extract winner from match result
      winner_name := extract_winner_from_result(match_result, match_participants);
      
      IF winner_name IS NULL OR winner_name = '' THEN
        -- Log error but continue
        RAISE WARNING 'Could not extract winner from result: %', match_result;
        CONTINUE;
      END IF;
      
      -- Try to find wrestler slug
      winner_slug := find_wrestler_slug(winner_name);
      
      -- If the extracted winner_name looks like a slug (contains hyphens and is lowercase),
      -- try to get the actual name from slug
      -- This handles cases where match results store slugs like "john-cena" instead of names
      IF winner_name LIKE '%-%' AND winner_name = LOWER(winner_name) THEN
        actual_wrestler_name := get_wrestler_name_from_slug(winner_slug);
        IF actual_wrestler_name IS NOT NULL THEN
          winner_name := actual_wrestler_name;
        END IF;
      END IF;
      
      -- Extract loser from match result (this is who they defeated)
      loser_name := extract_loser_from_result(match_result, match_participants, winner_name);
      
      -- Check current championship record BEFORE processing
      SELECT 
        current_champion, 
        current_champion_slug, 
        previous_champion, 
        previous_champion_slug,
        date_won,
        event_id
      INTO current_champ_record
      FROM championships
      WHERE id = championship_id;
      
      -- If this event is strictly earlier than the existing reign start
      -- and is not the same event, do NOT overwrite the current champion.
      -- This prevents backfilled historical events from reverting titles.
      IF current_champ_record.date_won IS NOT NULL
         AND event_date < current_champ_record.date_won
         AND (current_champ_record.event_id IS NULL OR current_champ_record.event_id <> NEW.id) THEN
        CONTINUE;
      END IF;
      
      -- If title is currently vacant, the new champion is winning it from vacant status
      -- Set previous_champion_slug to 'vacant' to indicate this
      IF current_champ_record.current_champion = 'VACANT' THEN
        loser_name := 'VACANT';
        loser_slug := 'vacant';
      ELSIF loser_name IS NULL OR loser_name = '' THEN
        -- If we couldn't extract loser from result, use current champion (who they defeated)
        loser_name := COALESCE(current_champ_record.current_champion, 'Unknown');
        loser_slug := COALESCE(current_champ_record.current_champion_slug, 'unknown');
      ELSE
        -- Check if the extracted loser_name looks like a slug (contains hyphens and is lowercase)
        -- This handles cases where match results store slugs like "dominik-mysterio" instead of names
        IF loser_name LIKE '%-%' AND loser_name = LOWER(loser_name) THEN
          -- loser_name is likely a slug, use it as the slug and look up the actual name
          loser_slug := loser_name;
          actual_wrestler_name := get_wrestler_name_from_slug(loser_slug);
          IF actual_wrestler_name IS NOT NULL THEN
            loser_name := actual_wrestler_name;
          END IF;
        ELSE
          -- Resolve loser slug from extracted name
          loser_slug := find_wrestler_slug(loser_name);
          IF loser_slug IS NULL THEN
            loser_slug := LOWER(REGEXP_REPLACE(loser_name, '[^a-z0-9]+', '-', 'gi'));
          END IF;
        END IF;
      END IF;
      
      -- Update or insert championship record
      INSERT INTO championships (
        id, title_name, current_champion, current_champion_slug,
        previous_champion, previous_champion_slug,
        date_won, event_id, event_name, brand, type
      )
      VALUES (
        championship_id, title_name, winner_name, COALESCE(winner_slug, LOWER(REGEXP_REPLACE(winner_name, '[^a-z0-9]+', '-', 'gi'))),
        loser_name,
        loser_slug,
        event_date, NEW.id, NEW.name,
        title_to_brand(title_name), title_to_type(title_name)
      )
      ON CONFLICT (id) DO UPDATE SET
        previous_champion = COALESCE(loser_name, championships.current_champion),
        previous_champion_slug = COALESCE(loser_slug, championships.current_champion_slug),
        current_champion = EXCLUDED.current_champion,
        current_champion_slug = EXCLUDED.current_champion_slug,
        date_won = EXCLUDED.date_won,
        event_id = EXCLUDED.event_id,
        event_name = EXCLUDED.event_name,
        updated_at = NOW();
        
    ELSIF title_outcome = 'Vacant' THEN
      -- Set title to vacant
      -- Get current champion before vacating
      SELECT 
        current_champion, 
        current_champion_slug,
        date_won,
        event_id
      INTO current_champ_record
      FROM championships
      WHERE id = championship_id;
      
      -- If this event is strictly earlier than the existing reign start
      -- and is not the same event, do NOT overwrite the current champion.
      IF current_champ_record.date_won IS NOT NULL
         AND event_date < current_champ_record.date_won
         AND (current_champ_record.event_id IS NULL OR current_champ_record.event_id <> NEW.id) THEN
        CONTINUE;
      END IF;
      
      -- Extract vacation reason from match notes if present
      match_notes := match_record->>'notes';
      IF match_notes IS NOT NULL AND match_notes LIKE 'Vacated due to: %' THEN
        vacation_reason_text := SUBSTRING(match_notes FROM 'Vacated due to: (.+)');
      ELSIF match_notes IS NOT NULL AND match_notes != '' THEN
        -- Fallback: use notes as reason if it doesn't match the pattern
        vacation_reason_text := match_notes;
      ELSE
        vacation_reason_text := NULL;
      END IF;
      
      -- If we have a participant (previous champion) from the match, use it
      IF match_participants IS NOT NULL AND match_participants != '' THEN
        loser_name := match_participants;
        loser_slug := find_wrestler_slug(match_participants);
        IF loser_slug IS NULL THEN
          loser_slug := LOWER(REGEXP_REPLACE(match_participants, '[^a-z0-9]+', '-', 'gi'));
        END IF;
      ELSE
        loser_name := COALESCE(current_champ_record.current_champion, 'Unknown');
        loser_slug := COALESCE(current_champ_record.current_champion_slug, 'unknown');
      END IF;
      
      INSERT INTO championships (
        id, title_name, current_champion, current_champion_slug,
        previous_champion, previous_champion_slug,
        date_won, event_id, event_name, brand, type, vacation_reason
      )
      VALUES (
        championship_id, title_name, 'VACANT', 'vacant',
        loser_name,
        loser_slug,
        event_date, NEW.id, NEW.name,
        title_to_brand(title_name), title_to_type(title_name),
        vacation_reason_text
      )
      ON CONFLICT (id) DO UPDATE SET
        previous_champion = COALESCE(loser_name, championships.current_champion),
        previous_champion_slug = COALESCE(loser_slug, championships.current_champion_slug),
        current_champion = 'VACANT',
        current_champion_slug = 'vacant',
        date_won = EXCLUDED.date_won,
        event_id = EXCLUDED.event_id,
        event_name = EXCLUDED.event_name,
        vacation_reason = EXCLUDED.vacation_reason,
        updated_at = NOW();
        
    ELSIF title_outcome = 'Champion Retains' THEN
      -- No change needed, but ensure the championship record exists
      INSERT INTO championships (
        id, title_name, brand, type
      )
      VALUES (
        championship_id, title_name,
        title_to_brand(title_name), title_to_type(title_name)
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger
DROP TRIGGER IF EXISTS trigger_process_championships ON events;
CREATE TRIGGER trigger_process_championships
AFTER INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION process_championship_changes();

-- 9. Grant permissions (adjust based on your RLS policies)
ALTER TABLE championships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Enable read access for all users" ON championships;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON championships;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON championships;

-- Create policy for read access (all users can read)
CREATE POLICY "Enable read access for all users" ON championships
  FOR SELECT
  USING (true);

-- Create policy for authenticated users to insert/update (adjust as needed)
CREATE POLICY "Enable insert for authenticated users" ON championships
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON championships
  FOR UPDATE
  USING (true);

