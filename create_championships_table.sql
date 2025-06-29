-- Create championships table to track current champions
CREATE TABLE IF NOT EXISTS championships (
  id TEXT PRIMARY KEY,
  title_name TEXT NOT NULL,
  current_champion TEXT,
  current_champion_slug TEXT,
  date_won DATE,
  event_id TEXT,
  match_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (current_champion_slug) REFERENCES wrestlers(id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);

-- Create championship history table to track all title changes
CREATE TABLE IF NOT EXISTS championship_history (
  id SERIAL PRIMARY KEY,
  championship_id TEXT NOT NULL,
  title_name TEXT NOT NULL,
  champion TEXT NOT NULL,
  champion_slug TEXT,
  date_won DATE NOT NULL,
  date_lost DATE,
  event_id TEXT,
  match_order INTEGER,
  reign_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (championship_id) REFERENCES championships(id) ON DELETE CASCADE,
  FOREIGN KEY (champion_slug) REFERENCES wrestlers(id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_championships_title ON championships(title_name);
CREATE INDEX IF NOT EXISTS idx_championships_champion ON championships(current_champion_slug);
CREATE INDEX IF NOT EXISTS idx_championship_history_championship ON championship_history(championship_id);
CREATE INDEX IF NOT EXISTS idx_championship_history_champion ON championship_history(champion_slug);
CREATE INDEX IF NOT EXISTS idx_championship_history_dates ON championship_history(date_won, date_lost);

-- Enable Row Level Security
ALTER TABLE championships ENABLE ROW LEVEL SECURITY;
ALTER TABLE championship_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to championships" ON championships
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to championship history" ON championship_history
  FOR SELECT USING (true);

-- Create policies for authenticated users to insert/update
CREATE POLICY "Allow authenticated users to manage championships" ON championships
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage championship history" ON championship_history
  FOR ALL USING (auth.role() = 'authenticated');

-- Create function to update championship when new champion is crowned
CREATE OR REPLACE FUNCTION update_championship_on_new_champion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is a new champion outcome
  IF NEW.titleOutcome = 'New Champion' AND NEW.title IS NOT NULL AND NEW.title != 'None' THEN
    -- Get the winner from the result
    DECLARE
      winner_name TEXT;
      winner_slug TEXT;
      championship_id TEXT;
      old_champion_slug TEXT;
    BEGIN
      -- Extract winner name from result (format: "Winner def. Loser")
      winner_name := SPLIT_PART(NEW.result, ' def. ', 1);
      
      -- Find the championship record
      SELECT id, current_champion_slug INTO championship_id, old_champion_slug
      FROM championships 
      WHERE title_name = NEW.title;
      
      -- If championship exists, update it
      IF championship_id IS NOT NULL THEN
        -- Find winner slug from wrestlers table
        SELECT id INTO winner_slug FROM wrestlers WHERE name = winner_name;
        
        -- Update championship record
        UPDATE championships 
        SET 
          current_champion = winner_name,
          current_champion_slug = winner_slug,
          date_won = (SELECT date FROM events WHERE id = NEW.event_id),
          event_id = NEW.event_id,
          match_order = NEW.order,
          updated_at = NOW()
        WHERE id = championship_id;
        
        -- Close the previous reign in history
        IF old_champion_slug IS NOT NULL THEN
          UPDATE championship_history 
          SET 
            date_lost = (SELECT date FROM events WHERE id = NEW.event_id),
            reign_days = (SELECT date FROM events WHERE id = NEW.event_id)::date - date_won
          WHERE championship_id = championship_id 
            AND date_lost IS NULL;
        END IF;
        
        -- Add new reign to history
        INSERT INTO championship_history (
          championship_id, 
          title_name, 
          champion, 
          champion_slug, 
          date_won, 
          event_id, 
          match_order
        ) VALUES (
          championship_id,
          NEW.title,
          winner_name,
          winner_slug,
          (SELECT date FROM events WHERE id = NEW.event_id),
          NEW.event_id,
          NEW.order
        );
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update championships when matches are updated
CREATE TRIGGER trigger_update_championship
  AFTER UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_championship_on_new_champion(); 