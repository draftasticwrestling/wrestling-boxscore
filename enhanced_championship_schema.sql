-- Enhanced Championship Database Schema
-- This builds on the existing championship tracking system

-- 1. ENHANCE EXISTING TABLES

-- Add new columns to championships table for better tracking
ALTER TABLE championships ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE championships ADD COLUMN IF NOT EXISTS title_type TEXT CHECK (title_type IN ('Singles', 'Tag Team', 'Triple Crown', 'Grand Slam'));
ALTER TABLE championships ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE championships ADD COLUMN IF NOT EXISTS defense_count INTEGER DEFAULT 0;
ALTER TABLE championships ADD COLUMN IF NOT EXISTS last_defense_date DATE;
ALTER TABLE championships ADD COLUMN IF NOT EXISTS total_reigns INTEGER DEFAULT 1;

-- Add new columns to championship_history table
ALTER TABLE championship_history ADD COLUMN IF NOT EXISTS defense_count INTEGER DEFAULT 0;
ALTER TABLE championship_history ADD COLUMN IF NOT EXISTS successful_defenses INTEGER DEFAULT 0;
ALTER TABLE championship_history ADD COLUMN IF NOT EXISTS reign_quality_score DECIMAL(5,2);
ALTER TABLE championship_history ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. CREATE NEW TABLES FOR ENHANCED FEATURES

-- Championship defenses tracking
CREATE TABLE IF NOT EXISTS championship_defenses (
  id SERIAL PRIMARY KEY,
  championship_id TEXT NOT NULL,
  champion_slug TEXT NOT NULL,
  challenger_slug TEXT,
  event_id TEXT NOT NULL,
  match_order INTEGER NOT NULL,
  defense_date DATE NOT NULL,
  result TEXT NOT NULL, -- 'Successful Defense', 'Title Change'
  method TEXT,
  match_time TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (championship_id) REFERENCES championships(id) ON DELETE CASCADE,
  FOREIGN KEY (champion_slug) REFERENCES wrestlers(id) ON DELETE SET NULL,
  FOREIGN KEY (challenger_slug) REFERENCES wrestlers(id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Championship statistics for quick access
CREATE TABLE IF NOT EXISTS championship_stats (
  id SERIAL PRIMARY KEY,
  championship_id TEXT NOT NULL UNIQUE,
  total_reigns INTEGER DEFAULT 0,
  longest_reign_days INTEGER DEFAULT 0,
  longest_reign_champion TEXT,
  longest_reign_start_date DATE,
  most_reigns_wrestler TEXT,
  most_reigns_count INTEGER DEFAULT 0,
  total_defenses INTEGER DEFAULT 0,
  average_reign_days DECIMAL(5,2) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (championship_id) REFERENCES championships(id) ON DELETE CASCADE
);

-- Wrestler championship achievements
CREATE TABLE IF NOT EXISTS wrestler_championships (
  id SERIAL PRIMARY KEY,
  wrestler_slug TEXT NOT NULL,
  championship_id TEXT NOT NULL,
  total_reigns INTEGER DEFAULT 0,
  total_days_held INTEGER DEFAULT 0,
  longest_reign_days INTEGER DEFAULT 0,
  first_win_date DATE,
  last_win_date DATE,
  total_defenses INTEGER DEFAULT 0,
  successful_defenses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (wrestler_slug) REFERENCES wrestlers(id) ON DELETE CASCADE,
  FOREIGN KEY (championship_id) REFERENCES championships(id) ON DELETE CASCADE,
  UNIQUE(wrestler_slug, championship_id)
);

-- Championship lineage tracking (for complex title histories)
CREATE TABLE IF NOT EXISTS championship_lineage (
  id SERIAL PRIMARY KEY,
  championship_id TEXT NOT NULL,
  predecessor_championship_id TEXT,
  successor_championship_id TEXT,
  lineage_date DATE NOT NULL,
  lineage_type TEXT CHECK (lineage_type IN ('Split', 'Merge', 'Rename', 'Retire')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (championship_id) REFERENCES championships(id) ON DELETE CASCADE,
  FOREIGN KEY (predecessor_championship_id) REFERENCES championships(id) ON DELETE SET NULL,
  FOREIGN KEY (successor_championship_id) REFERENCES championships(id) ON DELETE SET NULL
);

-- 3. CREATE INDEXES FOR PERFORMANCE

CREATE INDEX IF NOT EXISTS idx_championship_defenses_championship ON championship_defenses(championship_id);
CREATE INDEX IF NOT EXISTS idx_championship_defenses_champion ON championship_defenses(champion_slug);
CREATE INDEX IF NOT EXISTS idx_championship_defenses_date ON championship_defenses(defense_date);
CREATE INDEX IF NOT EXISTS idx_championship_defenses_event ON championship_defenses(event_id);

CREATE INDEX IF NOT EXISTS idx_wrestler_championships_wrestler ON wrestler_championships(wrestler_slug);
CREATE INDEX IF NOT EXISTS idx_wrestler_championships_championship ON wrestler_championships(championship_id);

CREATE INDEX IF NOT EXISTS idx_championship_lineage_championship ON championship_lineage(championship_id);
CREATE INDEX IF NOT EXISTS idx_championship_lineage_date ON championship_lineage(lineage_date);

-- 4. ENABLE ROW LEVEL SECURITY

ALTER TABLE championship_defenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE championship_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrestler_championships ENABLE ROW LEVEL SECURITY;
ALTER TABLE championship_lineage ENABLE ROW LEVEL SECURITY;

-- 5. CREATE SECURITY POLICIES

-- Public read access
CREATE POLICY "Allow public read access to championship defenses" ON championship_defenses
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to championship stats" ON championship_stats
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to wrestler championships" ON wrestler_championships
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to championship lineage" ON championship_lineage
  FOR SELECT USING (true);

-- Authenticated user management
CREATE POLICY "Allow authenticated users to manage championship defenses" ON championship_defenses
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage championship stats" ON championship_stats
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage wrestler championships" ON wrestler_championships
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage championship lineage" ON championship_lineage
  FOR ALL USING (auth.role() = 'authenticated');

-- 6. ENHANCED TRIGGER FUNCTIONS

-- Function to update championship stats when history changes
CREATE OR REPLACE FUNCTION update_championship_stats()
RETURNS TRIGGER AS $$
DECLARE
  longest_reign RECORD;
  most_reigns RECORD;
  avg_reign DECIMAL(5,2);
BEGIN
  -- Calculate longest reign
  SELECT champion, date_won, reign_days INTO longest_reign
  FROM championship_history 
  WHERE championship_id = COALESCE(NEW.championship_id, OLD.championship_id)
  ORDER BY reign_days DESC NULLS LAST
  LIMIT 1;

  -- Calculate wrestler with most reigns
  SELECT champion, COUNT(*) as reign_count INTO most_reigns
  FROM championship_history 
  WHERE championship_id = COALESCE(NEW.championship_id, OLD.championship_id)
  GROUP BY champion
  ORDER BY reign_count DESC
  LIMIT 1;

  -- Calculate average reign duration
  SELECT AVG(reign_days) INTO avg_reign
  FROM championship_history 
  WHERE championship_id = COALESCE(NEW.championship_id, OLD.championship_id)
  AND reign_days IS NOT NULL;

  -- Update or insert stats
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
  ) VALUES (
    COALESCE(NEW.championship_id, OLD.championship_id),
    (SELECT COUNT(*) FROM championship_history WHERE championship_id = COALESCE(NEW.championship_id, OLD.championship_id)),
    longest_reign.reign_days,
    longest_reign.champion,
    longest_reign.date_won,
    most_reigns.champion,
    most_reigns.reign_count,
    avg_reign,
    NOW()
  )
  ON CONFLICT (championship_id) DO UPDATE SET
    total_reigns = EXCLUDED.total_reigns,
    longest_reign_days = EXCLUDED.longest_reign_days,
    longest_reign_champion = EXCLUDED.longest_reign_champion,
    longest_reign_start_date = EXCLUDED.longest_reign_start_date,
    most_reigns_wrestler = EXCLUDED.most_reigns_wrestler,
    most_reigns_count = EXCLUDED.most_reigns_count,
    average_reign_days = EXCLUDED.average_reign_days,
    last_updated = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update wrestler championship stats
CREATE OR REPLACE FUNCTION update_wrestler_championship_stats()
RETURNS TRIGGER AS $$
DECLARE
  wrestler_stats RECORD;
BEGIN
  -- Calculate wrestler stats for this championship
  SELECT 
    COUNT(*) as total_reigns,
    SUM(COALESCE(reign_days, 0)) as total_days,
    MAX(reign_days) as longest_reign,
    MIN(date_won) as first_win,
    MAX(date_won) as last_win
  INTO wrestler_stats
  FROM championship_history 
  WHERE championship_id = COALESCE(NEW.championship_id, OLD.championship_id)
  AND champion_slug = COALESCE(NEW.champion_slug, OLD.champion_slug);

  -- Update or insert wrestler championship record
  INSERT INTO wrestler_championships (
    wrestler_slug,
    championship_id,
    total_reigns,
    total_days_held,
    longest_reign_days,
    first_win_date,
    last_win_date,
    updated_at
  ) VALUES (
    COALESCE(NEW.champion_slug, OLD.champion_slug),
    COALESCE(NEW.championship_id, OLD.championship_id),
    wrestler_stats.total_reigns,
    wrestler_stats.total_days,
    wrestler_stats.longest_reign,
    wrestler_stats.first_win,
    wrestler_stats.last_win,
    NOW()
  )
  ON CONFLICT (wrestler_slug, championship_id) DO UPDATE SET
    total_reigns = EXCLUDED.total_reigns,
    total_days_held = EXCLUDED.total_days_held,
    longest_reign_days = EXCLUDED.longest_reign_days,
    first_win_date = EXCLUDED.first_win_date,
    last_win_date = EXCLUDED.last_win_date,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 7. CREATE TRIGGERS

-- Trigger to update championship stats when history changes
CREATE TRIGGER trigger_update_championship_stats
  AFTER INSERT OR UPDATE OR DELETE ON championship_history
  FOR EACH ROW
  EXECUTE FUNCTION update_championship_stats();

-- Trigger to update wrestler stats when history changes
CREATE TRIGGER trigger_update_wrestler_championship_stats
  AFTER INSERT OR UPDATE OR DELETE ON championship_history
  FOR EACH ROW
  EXECUTE FUNCTION update_wrestler_championship_stats();

-- 8. HELPER FUNCTIONS

-- Function to get championship lineage
CREATE OR REPLACE FUNCTION get_championship_lineage(champ_id TEXT)
RETURNS TABLE (
  championship_id TEXT,
  title_name TEXT,
  start_date DATE,
  end_date DATE,
  lineage_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.championship_id,
    c.title_name,
    cl.lineage_date as start_date,
    LEAD(cl.lineage_date) OVER (ORDER BY cl.lineage_date) as end_date,
    cl.lineage_type
  FROM championship_lineage cl
  JOIN championships c ON c.id = cl.championship_id
  WHERE cl.championship_id = champ_id
  ORDER BY cl.lineage_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get wrestler's championship history
CREATE OR REPLACE FUNCTION get_wrestler_championships(wrestler_slug TEXT)
RETURNS TABLE (
  championship_id TEXT,
  title_name TEXT,
  total_reigns INTEGER,
  total_days INTEGER,
  longest_reign INTEGER,
  first_win DATE,
  last_win DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wc.championship_id,
    c.title_name,
    wc.total_reigns,
    wc.total_days_held,
    wc.longest_reign_days,
    wc.first_win_date,
    wc.last_win_date
  FROM wrestler_championships wc
  JOIN championships c ON c.id = wc.championship_id
  WHERE wc.wrestler_slug = wrestler_slug
  ORDER BY wc.total_days_held DESC;
END;
$$ LANGUAGE plpgsql;

-- 9. VIEWS FOR COMMON QUERIES

-- View for current champions with stats
CREATE OR REPLACE VIEW current_champions_with_stats AS
SELECT 
  c.*,
  cs.total_reigns,
  cs.longest_reign_days,
  cs.longest_reign_champion,
  cs.most_reigns_wrestler,
  cs.most_reigns_count,
  cs.average_reign_days,
  CURRENT_DATE - c.date_won as current_reign_days
FROM championships c
LEFT JOIN championship_stats cs ON cs.championship_id = c.id
WHERE c.is_active = true;

-- View for championship history with details
CREATE OR REPLACE VIEW championship_history_detailed AS
SELECT 
  ch.*,
  c.title_name,
  c.brand,
  c.title_type,
  e.name as event_name,
  e.date as event_date,
  w.name as champion_name,
  w.image_url as champion_image
FROM championship_history ch
JOIN championships c ON c.id = ch.championship_id
LEFT JOIN events e ON e.id = ch.event_id
LEFT JOIN wrestlers w ON w.id = ch.champion_slug
ORDER BY ch.date_won DESC;

-- View for wrestler championship achievements
CREATE OR REPLACE VIEW wrestler_achievements AS
SELECT 
  w.id as wrestler_slug,
  w.name as wrestler_name,
  w.image_url,
  w.brand,
  COUNT(DISTINCT wc.championship_id) as championships_won,
  SUM(wc.total_reigns) as total_reigns,
  SUM(wc.total_days_held) as total_days_held,
  MAX(wc.longest_reign_days) as longest_single_reign,
  COUNT(CASE WHEN wc.total_reigns > 1 THEN 1 END) as multi_time_champions
FROM wrestlers w
LEFT JOIN wrestler_championships wc ON wc.wrestler_slug = w.id
GROUP BY w.id, w.name, w.image_url, w.brand
ORDER BY championships_won DESC, total_days_held DESC; 