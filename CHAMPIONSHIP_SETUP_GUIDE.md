# Championship Automation Setup Guide

This guide will help you set up the automated championship tracking system.

## Overview

The championship automation system automatically updates the Champions Page whenever new match results are entered. When an event is saved with a match that has:
- A `title` field (championship name)
- A `titleOutcome` of "New Champion" or "Vacant"

The system will automatically:
1. Extract the winner from the match result
2. Update the championship record in the database
3. Track the previous champion
4. Update the Champions Page display

## Setup Steps

### Step 1: Create Database Schema

Run the SQL file to create the championships table, helper functions, and triggers:

```sql
-- In Supabase SQL Editor, run:
```

Copy and paste the contents of `create_championships_schema.sql` into the Supabase SQL Editor and execute it.

This will create:
- `championships` table
- Helper functions for title normalization, brand/type detection, winner extraction
- Trigger function that processes championship changes automatically
- Database trigger that fires when events are inserted/updated

### Step 2: Migrate Initial Champions Data

Run the migration script to populate the database with current champions:

```sql
-- In Supabase SQL Editor, run:
```

Copy and paste the contents of `migrate_initial_champions.sql` and execute it.

This will insert the current champions from the hardcoded data in ChampionshipsPage.jsx.

### Step 3: Verify Setup

1. Check that the `championships` table exists and has data:
   ```sql
   SELECT * FROM championships ORDER BY brand, type;
   ```

2. Test the trigger by creating a test event with a title match:
   - Create a new event
   - Add a match with a title (e.g., "Men's IC Championship")
   - Set `titleOutcome` to "New Champion"
   - Save the event
   - Check if the championship was updated in the database

3. Visit the Champions Page (`/championships`) and verify it displays data from the database

### Step 4: Process Historical Events (Optional)

If you want to backfill championship history from existing events, run:

```bash
node scripts/process_historical_championships.js
```

This script will:
- Scan all existing events chronologically
- Process matches with title outcomes
- Update championship records based on historical data

**Note:** Make sure you have the correct Supabase credentials in your environment or update the script with your credentials.

## How It Works

### When an Event is Saved

1. The `trigger_process_championships` trigger fires after an event is inserted or updated
2. The trigger function loops through all matches in the event
3. For each match with a title and relevant `titleOutcome`:
   - **"New Champion"**: Extracts winner, updates championship record
   - **"Vacant"**: Sets championship to VACANT
   - **"Champion Retains"**: No change (but ensures record exists)

### Winner Extraction

The system extracts winners from match results in various formats:
- "Winner def. Loser"
- "Winner won..."
- "Winner defeats Loser"

It then tries to match the winner name to:
1. Exact match in `wrestlers` table
2. Case-insensitive match
3. Tag team match in `tag_teams` table
4. Falls back to creating a slug from the name

### Frontend Updates

The `ChampionshipsPage.jsx` component now:
- Fetches champions from the `championships` table
- Displays loading state while fetching
- Shows error message if fetch fails
- Automatically updates when database changes (on page refresh)

## Supported Championships

The system currently supports these championships:

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

## Troubleshooting

### Champions Page Shows "No champions found"

1. Check that the `championships` table has data:
   ```sql
   SELECT COUNT(*) FROM championships;
   ```

2. Check browser console for errors
3. Verify RLS policies allow read access

### Championship Not Updating When Event is Saved

1. Check that the trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_process_championships';
   ```

2. Check trigger function exists:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'process_championship_changes';
   ```

3. Verify match has:
   - `title` field set (not "None")
   - `titleOutcome` set to "New Champion" or "Vacant"
   - `result` field with winner information

4. Check Supabase logs for trigger errors

### Winner Not Matching Correctly

The system tries multiple methods to match winner names to wrestler slugs. If a winner isn't matching:

1. Check if the wrestler exists in the `wrestlers` table
2. Verify the name in the match result matches the wrestler's name
3. For tag teams, check if the team exists in `tag_teams` table
4. The system will create a slug from the name as a fallback

## Future Enhancements

Potential improvements:
- Real-time updates using Supabase subscriptions
- Championship history page showing full lineage
- Defense tracking (number of successful defenses)
- Reign statistics (days held, number of reigns)
- Better tag team member extraction
- Automatic brand detection improvements

## Files Created

- `create_championships_schema.sql` - Database schema and triggers
- `migrate_initial_champions.sql` - Initial data migration
- `scripts/process_historical_championships.js` - Historical data processor
- `CHAMPIONSHIP_AUTOMATION_PLAN.md` - Detailed implementation plan
- Updated `src/components/ChampionshipsPage.jsx` - Now fetches from database

