# Championship Tracking System Setup

This document explains how to set up and use the automatic championship tracking system.

## Overview

The championship tracking system automatically updates when new champions are crowned in matches. It tracks:
- Current champions for each title
- Championship history with reign durations
- Automatic updates when matches are saved with "New Champion" outcome

## Setup Steps

### 1. Create Database Tables

Run the SQL script to create the necessary tables:

```bash
# In your Supabase dashboard, run the contents of:
create_championships_table.sql
```

This creates:
- `championships` table - tracks current champions
- `championship_history` table - tracks all title changes
- Automatic triggers to update championships when matches change

### 2. Initialize Current Champions

Update the current champions list in `scripts/initialize_championships.js` with the current champions:

```javascript
const currentChampions = [
  {
    id: 'undisputed-wwe-championship',
    title_name: 'Undisputed WWE Championship',
    current_champion: 'Roman Reigns',
    current_champion_slug: 'roman-reigns',
    date_won: '2020-08-30',
    event_id: 'payback-2020',
    match_order: 1
  },
  // Add more championships...
];
```

Then run the initialization script:

```bash
node scripts/initialize_championships.js
```

### 3. Update Championship Names

Make sure the championship names in the initialization script match exactly with the titles in your match forms. The system uses exact string matching.

## How It Works

### Automatic Updates

When you save a match with:
- `title` set to a championship name
- `titleOutcome` set to "New Champion"

The system automatically:
1. Extracts the winner from the match result
2. Updates the championship record with the new champion
3. Records the date and event where they won
4. Closes the previous champion's reign in history
5. Adds the new reign to history

### Manual Updates

You can also manually update championships through the Supabase dashboard or by running SQL commands.

## Features

### Current Champions Display

- Navigate to `/championships` to see all current champions
- Shows champion images, names, and reign durations
- Automatically calculates how long each champion has held their title

### Championship History

The system tracks:
- All title changes
- Reign durations
- Events where titles changed hands
- Historical data for analytics

### Data Validation

The system includes:
- Foreign key constraints to ensure data integrity
- Automatic reign duration calculations
- Error handling for missing wrestlers

## Troubleshooting

### Championship Not Updating

1. Check that the title name in the match exactly matches the championship name
2. Verify the winner name matches a wrestler in the wrestlers table
3. Ensure the match has `titleOutcome: "New Champion"`

### Missing Champion Data

1. Run the initialization script to set up current champions
2. Check that all wrestlers referenced in championships exist in the wrestlers table
3. Verify the event IDs and dates are correct

### Database Errors

1. Check that all tables were created successfully
2. Verify RLS policies allow the necessary operations
3. Ensure foreign key constraints are satisfied

## Future Enhancements

Potential improvements:
- Championship statistics and analytics
- Longest reign tracking
- Most title changes tracking
- Championship lineage visualization
- Export championship data
- Championship defense tracking 