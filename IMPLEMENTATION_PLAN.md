# Championship History Implementation Plan

## Overview

This plan outlines the step-by-step process to implement the enhanced championship history tracking system in your Pro Wrestling Boxscore application.

## Phase 1: Database Setup (Current)

### Step 1: Apply Enhanced Schema
1. **Backup your current database** in Supabase dashboard
2. **Run the enhanced schema** in Supabase SQL editor:
   ```sql
   -- Copy and paste the contents of enhanced_championship_schema.sql
   ```
3. **Verify schema changes** by checking new columns and tables

### Step 2: Migrate Existing Data
1. **Run the migration script** in Supabase SQL editor:
   ```sql
   -- Copy and paste the contents of migrate_championship_data.sql
   ```
2. **Verify data migration** using the verification queries at the end of the script
3. **Check for any errors** and resolve data inconsistencies

### Step 3: Test Database Functions
1. **Test helper functions**:
   ```sql
   -- Test championship lineage
   SELECT * FROM get_championship_lineage('undisputed-wwe-championship');
   
   -- Test wrestler championships
   SELECT * FROM get_wrestler_championships('roman-reigns');
   ```
2. **Verify triggers work** by updating a championship record
3. **Check views** return expected data

## Phase 2: Backend API Development

### Step 1: Create Championship API Functions
Create new functions in your Supabase project:

```sql
-- Function to get current champions by brand
CREATE OR REPLACE FUNCTION get_current_champions(brand_filter TEXT DEFAULT NULL)
RETURNS TABLE (
  id TEXT,
  title_name TEXT,
  current_champion TEXT,
  current_champion_slug TEXT,
  brand TEXT,
  title_type TEXT,
  defense_count INTEGER,
  total_reigns INTEGER,
  current_reign_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title_name,
    c.current_champion,
    c.current_champion_slug,
    c.brand,
    c.title_type,
    c.defense_count,
    c.total_reigns,
    CURRENT_DATE - c.date_won as current_reign_days
  FROM championships c
  WHERE c.is_active = true
    AND (brand_filter IS NULL OR c.brand = brand_filter)
  ORDER BY c.brand, c.title_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get championship history
CREATE OR REPLACE FUNCTION get_championship_history(champ_id TEXT)
RETURNS TABLE (
  champion TEXT,
  champion_slug TEXT,
  date_won DATE,
  date_lost DATE,
  reign_days INTEGER,
  defense_count INTEGER,
  successful_defenses INTEGER,
  event_name TEXT,
  event_date TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ch.champion,
    ch.champion_slug,
    ch.date_won,
    ch.date_lost,
    ch.reign_days,
    ch.defense_count,
    ch.successful_defenses,
    e.name as event_name,
    e.date as event_date
  FROM championship_history ch
  LEFT JOIN events e ON e.id = ch.event_id
  WHERE ch.championship_id = champ_id
  ORDER BY ch.date_won DESC;
END;
$$ LANGUAGE plpgsql;
```

### Step 2: Update Supabase Client
Add new functions to your `supabaseClient.js`:

```javascript
// Add these functions to your supabaseClient.js
export async function getCurrentChampions(brand = null) {
  const { data, error } = await supabase
    .rpc('get_current_champions', { brand_filter: brand });
  
  if (error) throw error;
  return data;
}

export async function getChampionshipHistory(championshipId) {
  const { data, error } = await supabase
    .rpc('get_championship_history', { champ_id: championshipId });
  
  if (error) throw error;
  return data;
}

export async function getWrestlerAchievements() {
  const { data, error } = await supabase
    .from('wrestler_achievements')
    .select('*')
    .order('championships_won', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getChampionshipDefenses(championshipId) {
  const { data, error } = await supabase
    .from('championship_defenses')
    .select(`
      *,
      championships(title_name),
      champion:wrestlers!champion_slug(name, image_url),
      challenger:wrestlers!challenger_slug(name, image_url),
      events(name, date)
    `)
    .eq('championship_id', championshipId)
    .order('defense_date', { ascending: false });
  
  if (error) throw error;
  return data;
}
```

## Phase 3: Frontend Components

### Step 1: Create Championship Pages Component
Create `src/components/ChampionshipsPage.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { getCurrentChampions, getWrestlerAchievements } from '../supabaseClient';
import BeltIcon from './BeltIcon';

export default function ChampionshipsPage() {
  const [champions, setChampions] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedBrand]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [champsData, achievementsData] = await Promise.all([
        getCurrentChampions(selectedBrand === 'all' ? null : selectedBrand),
        getWrestlerAchievements()
      ]);
      setChampions(champsData);
      setAchievements(achievementsData);
    } catch (error) {
      console.error('Error loading championship data:', error);
    } finally {
      setLoading(false);
    }
  };

  const brands = ['all', 'RAW', 'SmackDown', 'NXT'];
  const brandLabels = {
    all: 'All Brands',
    RAW: 'RAW',
    SmackDown: 'SmackDown',
    NXT: 'NXT'
  };

  if (loading) {
    return <div>Loading championships...</div>;
  }

  return (
    <div style={{ color: '#fff', padding: 40, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 32 }}>Championships</h1>
      
      {/* Brand Filter */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        {brands.map(brand => (
          <button
            key={brand}
            onClick={() => setSelectedBrand(brand)}
            style={{
              margin: '0 8px',
              padding: '8px 16px',
              background: selectedBrand === brand ? '#C6A04F' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            {brandLabels[brand]}
          </button>
        ))}
      </div>

      {/* Current Champions */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ marginBottom: 24 }}>Current Champions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {champions.map(champ => (
            <div key={champ.id} style={{ 
              background: '#222', 
              padding: 24, 
              borderRadius: 8,
              border: '1px solid #444'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <BeltIcon size={32} />
                <h3 style={{ margin: '0 0 0 12px' }}>{champ.title_name}</h3>
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Champion:</strong> {champ.current_champion}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Brand:</strong> {champ.brand}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Current Reign:</strong> {champ.current_reign_days} days
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Defenses:</strong> {champ.defense_count}
              </div>
              <div>
                <strong>Total Reigns:</strong> {champ.total_reigns}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wrestler Achievements */}
      <div>
        <h2 style={{ marginBottom: 24 }}>Wrestler Achievements</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {achievements.slice(0, 20).map(wrestler => (
            <div key={wrestler.wrestler_slug} style={{ 
              background: '#222', 
              padding: 16, 
              borderRadius: 8,
              border: '1px solid #444'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <img 
                  src={wrestler.image_url} 
                  alt={wrestler.wrestler_name}
                  style={{ width: 48, height: 48, borderRadius: '50%', marginRight: 12 }}
                />
                <div>
                  <div style={{ fontWeight: 'bold' }}>{wrestler.wrestler_name}</div>
                  <div style={{ fontSize: '14px', color: '#ccc' }}>{wrestler.brand}</div>
                </div>
              </div>
              <div style={{ fontSize: '14px' }}>
                <div>Championships: {wrestler.championships_won}</div>
                <div>Total Reigns: {wrestler.total_reigns}</div>
                <div>Days Held: {wrestler.total_days_held}</div>
                <div>Longest Reign: {wrestler.longest_single_reign} days</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Step 2: Create Championship History Component
Create `src/components/ChampionshipHistory.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { getChampionshipHistory, getChampionshipDefenses } from '../supabaseClient';

export default function ChampionshipHistory({ championshipId, championshipName }) {
  const [history, setHistory] = useState([]);
  const [defenses, setDefenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [championshipId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const [historyData, defensesData] = await Promise.all([
        getChampionshipHistory(championshipId),
        getChampionshipDefenses(championshipId)
      ]);
      setHistory(historyData);
      setDefenses(defensesData);
    } catch (error) {
      console.error('Error loading championship history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading history...</div>;
  }

  return (
    <div style={{ color: '#fff', padding: 24 }}>
      <h2 style={{ marginBottom: 24 }}>{championshipName} History</h2>
      
      {/* Championship History */}
      <div style={{ marginBottom: 48 }}>
        <h3 style={{ marginBottom: 16 }}>Title Changes</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#333' }}>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #444' }}>Champion</th>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #444' }}>Date Won</th>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #444' }}>Date Lost</th>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #444' }}>Reign Days</th>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #444' }}>Defenses</th>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #444' }}>Event</th>
              </tr>
            </thead>
            <tbody>
              {history.map((reign, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #444' }}>
                  <td style={{ padding: 12 }}>{reign.champion}</td>
                  <td style={{ padding: 12 }}>{reign.date_won}</td>
                  <td style={{ padding: 12 }}>{reign.date_lost || 'Current'}</td>
                  <td style={{ padding: 12 }}>{reign.reign_days || 'Ongoing'}</td>
                  <td style={{ padding: 12 }}>{reign.defense_count}</td>
                  <td style={{ padding: 12 }}>{reign.event_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Championship Defenses */}
      <div>
        <h3 style={{ marginBottom: 16 }}>Recent Defenses</h3>
        <div style={{ display: 'grid', gap: 16 }}>
          {defenses.slice(0, 10).map(defense => (
            <div key={defense.id} style={{ 
              background: '#222', 
              padding: 16, 
              borderRadius: 8,
              border: '1px solid #444'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{defense.champion?.name}</strong> vs {defense.challenger?.name || 'Unknown'}
                </div>
                <div style={{ 
                  padding: '4px 8px', 
                  borderRadius: 4, 
                  background: defense.result === 'Successful Defense' ? '#28a745' : '#dc3545',
                  fontSize: '12px'
                }}>
                  {defense.result}
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: '14px', color: '#ccc' }}>
                {defense.events?.name} • {defense.defense_date} • {defense.method}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Update App.jsx Routing
Add the new routes to your `App.jsx`:

```jsx
// Add import
import ChampionshipsPage from './components/ChampionshipsPage';
import ChampionshipHistory from './components/ChampionshipHistory';

// Add routes inside your Routes component
<Route path="/championships" element={<ChampionshipsPage />} />
<Route path="/championship/:championshipId" element={<ChampionshipHistory />} />
```

### Step 4: Update Navigation
Add championship links to your navigation menu in `Menu.jsx`:

```jsx
// Add to your navigation items
<Link to="/championships" style={linkStyle}>Championships</Link>
```

## Phase 4: Testing and Refinement

### Step 1: Test Database Functions
1. **Test all API functions** with real data
2. **Verify triggers work** correctly
3. **Check data consistency** across tables

### Step 2: Test UI Components
1. **Test championship pages** with different brands
2. **Verify responsive design** on mobile
3. **Test navigation** between pages

### Step 3: Performance Testing
1. **Check query performance** with large datasets
2. **Optimize slow queries** if needed
3. **Add caching** where appropriate

## Phase 5: Advanced Features (Future)

### Step 1: Championship Analytics
- Longest reigns tracking
- Most successful champions
- Championship prestige scoring

### Step 2: Interactive Features
- Championship lineage visualization
- Wrestler achievement badges
- Championship defense tracking

### Step 3: Data Export
- Export championship data
- Generate reports
- API endpoints for external use

## Implementation Checklist

- [ ] Apply enhanced database schema
- [ ] Run data migration script
- [ ] Test database functions
- [ ] Create API functions in Supabase
- [ ] Update supabaseClient.js
- [ ] Create ChampionshipsPage component
- [ ] Create ChampionshipHistory component
- [ ] Update routing in App.jsx
- [ ] Update navigation menu
- [ ] Test all functionality
- [ ] Optimize performance
- [ ] Deploy to production

## Next Steps

1. **Start with Phase 1** - Apply the database schema
2. **Test thoroughly** before moving to Phase 2
3. **Build incrementally** - one component at a time
4. **Get user feedback** early and often

This implementation plan provides a solid foundation for your championship history feature while maintaining the existing functionality of your Pro Wrestling Boxscore application.