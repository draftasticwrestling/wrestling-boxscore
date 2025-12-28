# Championship History Setup

## Overview

The championship history system tracks the complete lineage of each championship, recording every title change with dates, events, and reign durations.

## What Gets Tracked

For each championship change, the system records:
- **Champion name and slug**
- **Previous champion** (who they defeated)
- **Date won** (when they won the title)
- **Date lost** (when they lost the title - calculated automatically)
- **Event information** (event ID and name)
- **Days held** (calculated automatically when they lose)

## Setup

### Step 1: Create History Table

Run the SQL file in Supabase SQL Editor:

```sql
-- Copy and paste contents of create_championship_history.sql
```

This will:
- Create the `championship_history` table
- Create a trigger that automatically records history when championships change
- Backfill initial history records for current champions

### Step 2: Verify History Records

Check that history records were created:

```sql
SELECT 
  ch.championship_id,
  c.title_name,
  ch.champion,
  ch.date_won,
  ch.date_lost,
  ch.days_held,
  ch.event_name
FROM championship_history ch
JOIN championships c ON c.id = ch.championship_id
ORDER BY ch.championship_id, ch.date_won DESC;
```

## How It Works

### Automatic History Tracking

When a championship changes hands:
1. The `championships` table is updated with the new champion
2. The trigger `trigger_update_championship_history` fires
3. The previous champion's history record is updated with:
   - `date_lost` = date the new champion won
   - `days_held` = calculated automatically
4. A new history record is created for the new champion

### Current Reigns

Champions who currently hold titles will have:
- `date_lost` = NULL
- `days_held` = NULL (will be calculated when they lose)

## Querying History

### Get Full Lineage of a Championship

```sql
SELECT 
  champion,
  date_won,
  date_lost,
  days_held,
  event_name
FROM championship_history
WHERE championship_id = 'wwe-championship'
ORDER BY date_won DESC;
```

### Get All Reigns for a Wrestler

```sql
SELECT 
  c.title_name,
  ch.date_won,
  ch.date_lost,
  ch.days_held,
  ch.event_name
FROM championship_history ch
JOIN championships c ON c.id = ch.championship_id
WHERE ch.champion_slug = 'cody-rhodes'
ORDER BY ch.date_won DESC;
```

### Get Longest Reigns

```sql
SELECT 
  c.title_name,
  ch.champion,
  ch.days_held,
  ch.date_won,
  ch.date_lost
FROM championship_history ch
JOIN championships c ON c.id = ch.championship_id
WHERE ch.days_held IS NOT NULL
ORDER BY ch.days_held DESC
LIMIT 10;
```

## Future Enhancements

Potential features to add:
- Championship history page in the frontend
- Statistics (most reigns, longest reign, etc.)
- Visual timeline of championship changes
- Export championship history to CSV/JSON

