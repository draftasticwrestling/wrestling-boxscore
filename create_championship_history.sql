-- Championship History Tracking
-- This creates a table to track the full history of championship changes

-- 1. Create championship_history table
CREATE TABLE IF NOT EXISTS championship_history (
  id SERIAL PRIMARY KEY,
  championship_id TEXT NOT NULL,
  champion TEXT NOT NULL,
  champion_slug TEXT,
  previous_champion TEXT,
  previous_champion_slug TEXT,
  date_won DATE NOT NULL,
  date_lost DATE,
  event_id TEXT,
  event_name TEXT,
  match_order INTEGER,
  days_held INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(championship_id, champion_slug, date_won)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_championship_history_championship ON championship_history(championship_id);
CREATE INDEX IF NOT EXISTS idx_championship_history_date_won ON championship_history(date_won);
CREATE INDEX IF NOT EXISTS idx_championship_history_champion ON championship_history(champion_slug);

-- 2. Function to update history when championship changes
CREATE OR REPLACE FUNCTION update_championship_history()
RETURNS TRIGGER AS $$
DECLARE
  previous_record RECORD;
BEGIN
  -- Only process if the champion actually changed
  IF OLD.current_champion IS NOT DISTINCT FROM NEW.current_champion THEN
    RETURN NEW;
  END IF;
  
  -- If there was a previous champion, update their history record with date_lost
  IF OLD.current_champion IS NOT NULL AND OLD.current_champion != 'VACANT' THEN
    UPDATE championship_history
    SET date_lost = NEW.date_won,
        days_held = NEW.date_won - date_won
    WHERE championship_id = NEW.id
      AND champion_slug = OLD.current_champion_slug
      AND date_lost IS NULL;
  END IF;
  
  -- If title became vacant, we don't create a new history record for "VACANT"
  -- The previous champion's record is already updated above with date_lost
  -- When a new champion wins the vacant title, that will create a new history record
  
  -- Insert new history record for the new champion (only if not vacant)
  IF NEW.current_champion IS NOT NULL AND NEW.current_champion != 'VACANT' THEN
    INSERT INTO championship_history (
      championship_id,
      champion,
      champion_slug,
      previous_champion,
      previous_champion_slug,
      date_won,
      event_id,
      event_name,
      days_held
    )
    VALUES (
      NEW.id,
      NEW.current_champion,
      NEW.current_champion_slug,
      NEW.previous_champion,
      NEW.previous_champion_slug,
      NEW.date_won,
      NEW.event_id,
      NEW.event_name,
      NULL  -- Will be calculated when they lose the title
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to automatically update history
DROP TRIGGER IF EXISTS trigger_update_championship_history ON championships;
CREATE TRIGGER trigger_update_championship_history
AFTER UPDATE ON championships
FOR EACH ROW
WHEN (OLD.current_champion IS DISTINCT FROM NEW.current_champion)
EXECUTE FUNCTION update_championship_history();

-- 4. Grant permissions
ALTER TABLE championship_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON championship_history;
CREATE POLICY "Enable read access for all users" ON championship_history
  FOR SELECT
  USING (true);

-- Allow authenticated users (logged-in admins) to add/edit/delete title history
DROP POLICY IF EXISTS "Enable insert for authenticated" ON championship_history;
CREATE POLICY "Enable insert for authenticated" ON championship_history
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for authenticated" ON championship_history;
CREATE POLICY "Enable update for authenticated" ON championship_history
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable delete for authenticated" ON championship_history;
CREATE POLICY "Enable delete for authenticated" ON championship_history
  FOR DELETE TO authenticated USING (true);

-- 5. Function to backfill history from existing championships table
-- This will create initial history records for current champions
CREATE OR REPLACE FUNCTION backfill_championship_history()
RETURNS void AS $$
DECLARE
  champ_record RECORD;
BEGIN
  FOR champ_record IN 
    SELECT * FROM championships 
    WHERE current_champion IS NOT NULL 
      AND current_champion != 'VACANT'
      AND date_won IS NOT NULL
  LOOP
    -- Check if history record already exists
    IF NOT EXISTS (
      SELECT 1 FROM championship_history 
      WHERE championship_id = champ_record.id 
        AND champion_slug = champ_record.current_champion_slug
        AND date_won = champ_record.date_won
    ) THEN
      INSERT INTO championship_history (
        championship_id,
        champion,
        champion_slug,
        previous_champion,
        previous_champion_slug,
        date_won,
        event_id,
        event_name,
        days_held
      )
      VALUES (
        champ_record.id,
        champ_record.current_champion,
        champ_record.current_champion_slug,
        champ_record.previous_champion,
        champ_record.previous_champion_slug,
        champ_record.date_won,
        champ_record.event_id,
        champ_record.event_name,
        NULL  -- Current reign, will be calculated when they lose
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the backfill function to create initial history records
SELECT backfill_championship_history();

