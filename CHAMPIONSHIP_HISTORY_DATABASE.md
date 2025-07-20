# Enhanced Championship History Database Structure

This document describes the enhanced database structure for comprehensive championship tracking and history analysis.

## Overview

The enhanced championship system builds on the existing foundation to provide:
- **Comprehensive championship tracking** with defense counts and statistics
- **Wrestler achievement tracking** across all championships
- **Championship lineage** for complex title histories
- **Performance-optimized queries** with pre-calculated statistics
- **Automatic data maintenance** through triggers and functions

## Database Tables

### Core Tables (Enhanced)

#### 1. `championships` (Enhanced)
Tracks current champions with additional metadata.

**New Columns:**
- `brand` - RAW, SmackDown, NXT, or Unassigned
- `title_type` - Singles, Tag Team, Triple Crown, Grand Slam
- `is_active` - Whether the championship is currently active
- `defense_count` - Total number of defenses for current champion
- `last_defense_date` - Date of last defense
- `total_reigns` - Total number of reigns for this championship

**Example:**
```sql
SELECT title_name, current_champion, brand, defense_count, total_reigns
FROM championships 
WHERE is_active = true;
```

#### 2. `championship_history` (Enhanced)
Tracks all title changes with enhanced statistics.

**New Columns:**
- `defense_count` - Number of defenses during this reign
- `successful_defenses` - Number of successful defenses
- `reign_quality_score` - Calculated quality score for the reign
- `notes` - Additional notes about the reign

### New Tables

#### 3. `championship_defenses`
Tracks individual championship defenses.

**Columns:**
- `id` - Primary key
- `championship_id` - Reference to championship
- `champion_slug` - Current champion
- `challenger_slug` - Challenger (optional)
- `event_id` - Event where defense occurred
- `match_order` - Match order in event
- `defense_date` - Date of defense
- `result` - 'Successful Defense' or 'Title Change'
- `method` - How the match ended
- `match_time` - Duration of match
- `notes` - Additional notes

**Example:**
```sql
SELECT 
  c.title_name,
  w1.name as champion,
  w2.name as challenger,
  e.name as event,
  cd.defense_date,
  cd.result
FROM championship_defenses cd
JOIN championships c ON c.id = cd.championship_id
JOIN wrestlers w1 ON w1.id = cd.champion_slug
LEFT JOIN wrestlers w2 ON w2.id = cd.challenger_slug
JOIN events e ON e.id = cd.event_id
ORDER BY cd.defense_date DESC;
```

#### 4. `championship_stats`
Pre-calculated statistics for quick access.

**Columns:**
- `championship_id` - Reference to championship
- `total_reigns` - Total number of reigns
- `longest_reign_days` - Longest reign duration
- `longest_reign_champion` - Wrestler with longest reign
- `longest_reign_start_date` - Start date of longest reign
- `most_reigns_wrestler` - Wrestler with most reigns
- `most_reigns_count` - Number of reigns for most reigns wrestler
- `total_defenses` - Total defenses across all reigns
- `average_reign_days` - Average reign duration
- `last_updated` - When stats were last calculated

#### 5. `wrestler_championships`
Tracks wrestler achievements per championship.

**Columns:**
- `wrestler_slug` - Wrestler ID
- `championship_id` - Championship ID
- `total_reigns` - Number of reigns for this wrestler/championship
- `total_days_held` - Total days held across all reigns
- `longest_reign_days` - Longest single reign
- `first_win_date` - Date of first championship win
- `last_win_date` - Date of most recent championship win
- `total_defenses` - Total defenses across all reigns
- `successful_defenses` - Successful defenses across all reigns

#### 6. `championship_lineage`
Tracks championship evolution and relationships.

**Columns:**
- `championship_id` - Current championship
- `predecessor_championship_id` - Previous championship (if split/merge)
- `successor_championship_id` - Next championship (if split/merge)
- `lineage_date` - Date of lineage change
- `lineage_type` - Split, Merge, Rename, or Retire
- `notes` - Description of the change

## Views for Common Queries

### 1. `current_champions_with_stats`
Shows current champions with comprehensive statistics.

```sql
SELECT 
  title_name,
  current_champion,
  brand,
  title_type,
  defense_count,
  total_reigns,
  longest_reign_days,
  longest_reign_champion,
  current_reign_days
FROM current_champions_with_stats
ORDER BY brand, title_name;
```

### 2. `championship_history_detailed`
Shows championship history with event and wrestler details.

```sql
SELECT 
  title_name,
  champion_name,
  date_won,
  reign_days,
  defense_count,
  successful_defenses,
  event_name
FROM championship_history_detailed
ORDER BY date_won DESC;
```

### 3. `wrestler_achievements`
Shows wrestler championship achievements across all titles.

```sql
SELECT 
  wrestler_name,
  brand,
  championships_won,
  total_reigns,
  total_days_held,
  longest_single_reign,
  multi_time_champions
FROM wrestler_achievements
WHERE championships_won > 0
ORDER BY championships_won DESC;
```

## Helper Functions

### 1. `get_championship_lineage(champ_id)`
Returns the lineage history for a championship.

```sql
SELECT * FROM get_championship_lineage('undisputed-wwe-championship');
```

### 2. `get_wrestler_championships(wrestler_slug)`
Returns all championships won by a wrestler.

```sql
SELECT * FROM get_wrestler_championships('roman-reigns');
```

## Automatic Data Maintenance

### Triggers

1. **`trigger_update_championship_stats`**
   - Updates `championship_stats` when `championship_history` changes
   - Calculates longest reigns, most reigns, average reign duration

2. **`trigger_update_wrestler_championship_stats`**
   - Updates `wrestler_championships` when `championship_history` changes
   - Maintains wrestler statistics per championship

### Functions

1. **`update_championship_stats()`**
   - Calculates and updates championship statistics
   - Called automatically by triggers

2. **`update_wrestler_championship_stats()`**
   - Calculates and updates wrestler championship statistics
   - Called automatically by triggers

## Performance Optimizations

### Indexes
- Championship lookups by brand, type, and active status
- Defense tracking by date and champion
- Wrestler achievements by wrestler and championship
- Lineage tracking by date

### Pre-calculated Statistics
- Championship stats updated automatically via triggers
- Wrestler achievements maintained in real-time
- Views provide optimized query paths

## Data Migration

### Migration Steps

1. **Apply Schema Changes**
   ```sql
   -- Run enhanced_championship_schema.sql
   ```

2. **Populate New Tables**
   ```sql
   -- Run migrate_championship_data.sql
   ```

3. **Verify Migration**
   ```sql
   -- Check current champions with stats
   SELECT * FROM current_champions_with_stats;
   
   -- Check wrestler achievements
   SELECT * FROM wrestler_achievements LIMIT 10;
   ```

### Data Population

The migration script automatically:
- Populates championship stats from existing history
- Creates wrestler championship records
- Extracts defense data from existing matches
- Updates defense counts and dates
- Creates sample lineage data

## Usage Examples

### Find Current Champions by Brand
```sql
SELECT title_name, current_champion, defense_count, current_reign_days
FROM current_champions_with_stats
WHERE brand = 'RAW'
ORDER BY current_reign_days DESC;
```

### Find Wrestler's Championship History
```sql
SELECT 
  wc.championship_id,
  c.title_name,
  wc.total_reigns,
  wc.total_days_held,
  wc.longest_reign_days
FROM wrestler_championships wc
JOIN championships c ON c.id = wc.championship_id
WHERE wc.wrestler_slug = 'roman-reigns'
ORDER BY wc.total_days_held DESC;
```

### Find Championship Defenses
```sql
SELECT 
  c.title_name,
  w1.name as champion,
  w2.name as challenger,
  e.name as event,
  cd.defense_date,
  cd.result
FROM championship_defenses cd
JOIN championships c ON c.id = cd.championship_id
JOIN wrestlers w1 ON w1.id = cd.champion_slug
LEFT JOIN wrestlers w2 ON w2.id = cd.challenger_slug
JOIN events e ON e.id = cd.event_id
WHERE c.title_name = 'Undisputed WWE Championship'
ORDER BY cd.defense_date DESC;
```

### Find Longest Reigns
```sql
SELECT 
  title_name,
  champion_name,
  reign_days,
  defense_count,
  successful_defenses
FROM championship_history_detailed
WHERE reign_days IS NOT NULL
ORDER BY reign_days DESC
LIMIT 10;
```

## Security

### Row Level Security (RLS)
- Public read access to all championship data
- Authenticated users can manage all data
- Policies ensure data integrity

### Foreign Key Constraints
- Ensures data consistency across tables
- Cascading deletes where appropriate
- Prevents orphaned records

## Future Enhancements

### Potential Additions
1. **Championship Rankings** - Weekly/monthly rankings
2. **Defense Quality Scoring** - Based on opponent strength
3. **Championship Prestige** - Historical importance tracking
4. **Wrestler Hall of Fame** - Achievement-based induction
5. **Championship Analytics** - Advanced statistical analysis
6. **Export Functions** - Data export for external analysis

### API Endpoints
The database structure supports efficient API endpoints for:
- Current champions by brand
- Championship history with filters
- Wrestler achievements
- Defense tracking
- Statistical analysis

## Maintenance

### Regular Tasks
1. **Update Defense Data** - Manually add challenger information
2. **Verify Statistics** - Check trigger calculations
3. **Clean Historical Data** - Remove duplicate or incorrect records
4. **Update Lineage** - Track championship evolution

### Monitoring
- Check trigger performance
- Monitor index usage
- Verify data consistency
- Review query performance

This enhanced structure provides a solid foundation for comprehensive championship tracking and analysis while maintaining performance and data integrity. 