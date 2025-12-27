# Championship Automation Plan

## Current State Analysis

### How Champions Are Currently Stored
- **ChampionshipsPage.jsx** uses a hardcoded `currentChampions` array
- Data must be manually updated when title changes occur
- No connection to match results in the database

### How Match Results Are Stored
- Matches are stored in the `events` table with a JSONB `matches` field
- Each match can contain:
  - `title`: Championship name (e.g., "Men's IC Championship", "World Heavyweight Championship")
  - `titleOutcome`: One of:
    - "Champion Retains" - Current champion keeps the title
    - "New Champion" - Title changes hands
    - "Vacant" - Title becomes vacant
    - "No. 1 Contender" - Not a title match
    - "None" - No title involved
  - `defendingChampion`: Slug of the defending champion (optional)
  - `result`: Match result string (e.g., "Sami Zayn def. Bronson Reed")
  - `participants`: Match participants string

### Title Options Available
From `src/options.js`:
- Undisputed WWE Championship
- World Heavyweight Championship
- Men's IC Championship
- Men's U.S. Championship
- Raw Tag Team Championship
- SmackDown Tag Team Championship
- Men's Speed Championship
- WWE Women's Championship
- Women's World Championship
- Women's IC Championship
- Women's U.S. Championship
- Women's Tag Team Championship
- Women's Speed Championship

## Automation Strategy

### Phase 1: Database Schema

#### 1.1 Create `championships` Table
```sql
CREATE TABLE championships (
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
```

#### 1.2 Create `championship_history` Table (Optional - for tracking history)
```sql
CREATE TABLE championship_history (
  id SERIAL PRIMARY KEY,
  championship_id TEXT NOT NULL REFERENCES championships(id),
  champion TEXT NOT NULL,
  champion_slug TEXT,
  date_won DATE NOT NULL,
  date_lost DATE,
  event_id TEXT,
  event_name TEXT,
  match_order INTEGER,
  days_held INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.3 Create Helper Functions

**Function to extract winner from match result:**
```sql
CREATE OR REPLACE FUNCTION extract_winner_from_result(
  result_text TEXT,
  participants_text TEXT
) RETURNS TEXT AS $$
DECLARE
  winner TEXT;
BEGIN
  -- Extract winner from "Winner def. Loser" format
  IF result_text LIKE '% def. %' THEN
    winner := TRIM(SPLIT_PART(result_text, ' def. ', 1));
  ELSIF result_text LIKE '% won %' THEN
    winner := TRIM(SPLIT_PART(result_text, ' won ', 1));
  END IF;
  
  RETURN winner;
END;
$$ LANGUAGE plpgsql;
```

**Function to normalize title name to championship ID:**
```sql
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
```

**Function to determine brand from title:**
```sql
CREATE OR REPLACE FUNCTION title_to_brand(title_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN title_name LIKE '%Raw%' OR title_name = 'World Heavyweight Championship' THEN 'RAW'
    WHEN title_name LIKE '%SmackDown%' OR title_name = 'WWE Women''s Championship' OR title_name = 'Undisputed WWE Championship' THEN 'SmackDown'
    WHEN title_name LIKE '%Speed%' THEN 'NXT'
    WHEN title_name LIKE '%Tag Team%' AND title_name NOT LIKE '%Raw%' AND title_name NOT LIKE '%SmackDown%' THEN 'Unassigned'
    ELSE 'Unassigned'
  END;
END;
$$ LANGUAGE plpgsql;
```

**Function to determine title type:**
```sql
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
```

#### 1.4 Create Trigger Function to Process Championship Changes

```sql
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
BEGIN
  -- Only process if matches array changed
  IF OLD.matches IS NOT DISTINCT FROM NEW.matches THEN
    RETURN NEW;
  END IF;
  
  -- Parse event date
  BEGIN
    event_date := TO_DATE(NEW.date, 'Month DD, YYYY');
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      event_date := TO_DATE(NEW.date, 'YYYY-MM-DD');
    EXCEPTION WHEN OTHERS THEN
      event_date := CURRENT_DATE;
    END;
  END;
  
  -- Loop through each match in the matches array
  FOR match_record IN SELECT * FROM jsonb_array_elements(NEW.matches)
  LOOP
    title_name := match_record->>'title';
    title_outcome := match_record->>'titleOutcome';
    match_result := match_record->>'result';
    defending_champion_slug := match_record->>'defendingChampion';
    
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
      winner_name := extract_winner_from_result(match_result, match_record->>'participants');
      
      -- Try to find winner slug from wrestlers table or use name as slug
      -- For now, we'll need to slugify the name
      winner_slug := LOWER(REGEXP_REPLACE(winner_name, '[^a-z0-9]+', '-', 'gi'));
      winner_slug := TRIM(BOTH '-' FROM winner_slug);
      
      -- Get current champion info
      SELECT current_champion, current_champion_slug INTO current_champ_record
      FROM championships
      WHERE id = championship_id;
      
      -- Update or insert championship record
      INSERT INTO championships (
        id, title_name, current_champion, current_champion_slug,
        previous_champion, previous_champion_slug,
        date_won, event_id, event_name, brand, type
      )
      VALUES (
        championship_id, title_name, winner_name, winner_slug,
        COALESCE(current_champ_record.current_champion, 'Unknown'),
        COALESCE(current_champ_record.current_champion_slug, 'unknown'),
        event_date, NEW.id, NEW.name,
        title_to_brand(title_name), title_to_type(title_name)
      )
      ON CONFLICT (id) DO UPDATE SET
        previous_champion = championships.current_champion,
        previous_champion_slug = championships.current_champion_slug,
        current_champion = EXCLUDED.current_champion,
        current_champion_slug = EXCLUDED.current_champion_slug,
        date_won = EXCLUDED.date_won,
        event_id = EXCLUDED.event_id,
        event_name = EXCLUDED.event_name,
        updated_at = NOW();
        
    ELSIF title_outcome = 'Vacant' THEN
      -- Set title to vacant
      INSERT INTO championships (
        id, title_name, current_champion, current_champion_slug,
        previous_champion, previous_champion_slug,
        date_won, event_id, event_name, brand, type
      )
      VALUES (
        championship_id, title_name, 'VACANT', 'vacant',
        COALESCE((SELECT current_champion FROM championships WHERE id = championship_id), 'Unknown'),
        COALESCE((SELECT current_champion_slug FROM championships WHERE id = championship_id), 'unknown'),
        event_date, NEW.id, NEW.name,
        title_to_brand(title_name), title_to_type(title_name)
      )
      ON CONFLICT (id) DO UPDATE SET
        previous_champion = championships.current_champion,
        previous_champion_slug = championships.current_champion_slug,
        current_champion = 'VACANT',
        current_champion_slug = 'vacant',
        date_won = EXCLUDED.date_won,
        event_id = EXCLUDED.event_id,
        event_name = EXCLUDED.event_name,
        updated_at = NOW();
        
    ELSIF title_outcome = 'Champion Retains' THEN
      -- No change needed, but we could update the event_id to track defenses
      -- For now, we'll just ensure the championship record exists
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

-- Create trigger
CREATE TRIGGER trigger_process_championships
AFTER INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION process_championship_changes();
```

### Phase 2: Initial Data Migration

#### 2.1 Migrate Current Champions to Database
Create a script to insert the current hardcoded champions into the database:

```sql
-- Insert current champions from ChampionshipsPage.jsx
INSERT INTO championships (id, title_name, current_champion, current_champion_slug, previous_champion, date_won, event_name, brand, type) VALUES
('wwe-championship', 'WWE Championship', 'Cody Rhodes', 'cody-rhodes', 'John Cena', '2025-08-03', 'Summer Slam Night 2', 'SmackDown', 'World'),
('world-heavyweight-championship', 'World Heavyweight Championship', 'Seth Rollins', 'seth-rollins', 'CM Punk', '2025-08-02', 'Summer Slam Night 1', 'RAW', 'World'),
('mens-us-championship', 'Men''s United States Championship', 'Sami Zayn', 'sami-zayn', 'Solo Sikoa', '2025-08-29', 'SmackDown', 'SmackDown', 'Secondary'),
('mens-ic-championship', 'Men''s Intercontinental Championship', 'Dominik Mysterio', 'dominik-mysterio', 'Bron Breakker', '2025-04-20', 'Wrestlemania Night 2', 'RAW', 'Secondary'),
('raw-tag-team-championship', 'RAW Tag Team Championship', 'The Judgment Day (Finn Balor & JD McDonagh)', 'the-judgment-day', 'The New Day (Kofi Kingston & Xavier Woods)', '2025-06-30', 'RAW', 'RAW', 'Tag Team'),
('smackdown-tag-team-championship', 'SmackDown Tag Team Championship', 'The Wyatt Sicks (Joe Gacy & Dexter Lumis)', 'the-wyatt-sicks', 'The Street Profits (Angelo Dawkins & Montez Ford)', '2025-07-11', 'SmackDown', 'SmackDown', 'Tag Team'),
('wwe-womens-championship', 'WWE Women''s Championship', 'Tiffany Stratton', 'tiffany-stratton', 'Nia Jax', '2025-01-03', 'SmackDown', 'SmackDown', 'World'),
('womens-world-championship', 'Women''s World Championship', 'VACANT', 'vacant', 'Naomi', '2025-08-18', 'RAW', 'RAW', 'World'),
('womens-ic-championship', 'Women''s Intercontinental Championship', 'Becky Lynch', 'becky-lynch', 'Lyra Valkyria', '2025-06-07', 'Money in the Bank', 'RAW', 'Secondary'),
('womens-us-championship', 'Women''s United States Championship', 'Giulia', 'giulia', 'Zelina Vega', '2025-06-27', 'SmackDown', 'SmackDown', 'Secondary'),
('womens-tag-team-championship', 'Women''s Tag Team Championship', 'Charlotte Flair & Alexa Bliss', 'charlotte-flair-alexa-bliss', 'The Judgment Day (Roxanne Perez & Raquel Rodriguez)', '2025-08-02', 'Summer Slam Night 1', 'Unassigned', 'Tag Team')
ON CONFLICT (id) DO UPDATE SET
  current_champion = EXCLUDED.current_champion,
  current_champion_slug = EXCLUDED.current_champion_slug,
  previous_champion = EXCLUDED.previous_champion,
  date_won = EXCLUDED.date_won,
  event_name = EXCLUDED.event_name,
  brand = EXCLUDED.brand,
  type = EXCLUDED.type;
```

### Phase 3: Frontend Updates

#### 3.1 Update ChampionshipsPage.jsx
Replace hardcoded data with database fetch:

```jsx
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '../supabaseClient';

export default function ChampionshipsPage({ wrestlers = [] }) {
  const [champions, setChampions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState('all');

  useEffect(() => {
    fetchChampions();
  }, []);

  const fetchChampions = async () => {
    try {
      const { data, error } = await supabase
        .from('championships')
        .select('*')
        .order('brand', { ascending: true })
        .order('type', { ascending: true });

      if (error) throw error;
      setChampions(data || []);
    } catch (error) {
      console.error('Error fetching champions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Rest of component logic...
}
```

#### 3.2 Handle Winner Extraction for Tag Teams
The winner extraction function needs to handle tag teams properly. We may need to:
- Check if winner matches a tag team name from the `tag_teams` table
- Extract individual wrestler slugs for tag team championships
- Handle special cases like "The Judgment Day (Finn Balor & JD McDonagh)"

### Phase 4: Edge Cases & Improvements

#### 4.1 Tag Team Championship Handling
- Tag teams may be stored as team names or individual wrestler combinations
- Need to check `tag_teams` table to resolve team names to member slugs
- Handle cases where tag team name doesn't match exactly

#### 4.2 Winner Name Normalization
- Match results may use display names vs slugs
- Need to cross-reference with `wrestlers` table to get correct slug
- Handle variations in name formatting

#### 4.3 Historical Data Processing
- Process existing events to backfill championship history
- Create a migration script to scan all past events and update championships

#### 4.4 Real-time Updates
- Consider using Supabase real-time subscriptions to update ChampionshipsPage when championships change
- Or refresh on navigation to championships page

## Implementation Steps

1. **Create database schema** (championships table, functions, triggers)
2. **Test trigger with sample data** to ensure it works correctly
3. **Migrate current champions** to database
4. **Update ChampionshipsPage** to fetch from database
5. **Test with new event** - create a test event with a title change
6. **Process historical events** - run script to backfill from existing events
7. **Handle edge cases** - tag teams, name variations, etc.
8. **Add error handling** - log errors, handle missing data gracefully

## Testing Checklist

- [ ] New champion is set when `titleOutcome = "New Champion"`
- [ ] Title becomes vacant when `titleOutcome = "Vacant"`
- [ ] No change when `titleOutcome = "Champion Retains"`
- [ ] Tag team championships work correctly
- [ ] Winner extraction works for various result formats
- [ ] ChampionshipsPage displays data from database
- [ ] Historical events can be processed
- [ ] Edge cases handled (missing data, invalid formats, etc.)

## Future Enhancements

1. **Championship History Page** - Show full lineage of each title
2. **Defense Tracking** - Track number of successful defenses
3. **Reign Statistics** - Days held, number of reigns, etc.
4. **Automatic Brand Detection** - Improve brand assignment logic
5. **Notification System** - Alert when titles change
6. **Championship Images** - Store belt images in database/storage

