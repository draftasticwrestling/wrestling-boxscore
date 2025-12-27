# Wrestler Classification System

This document describes the new wrestler classification system that has been implemented to better organize and categorize wrestlers in the database.

## Overview

Wrestlers are now classified into four main categories:

1. **Active** - Wrestlers who are actively wrestling and assigned to a specific roster (RAW, SmackDown, or NXT)
2. **Part-timer** - Wrestlers who are signed to WWE but not assigned to a specific roster (e.g., The Rock, Roman Reigns, Brock Lesnar)
3. **Celebrity Guests** - Celebrities who make occasional appearances in WWE (e.g., Bad Bunny, Logan Paul)
4. **Alumni** - Wrestlers who were previously on a WWE roster but have been released or retired. They remain in the database with all their previous stats.

## Status Options

For **Active** and **Part-timer** wrestlers, you can also set a status:

- **NULL** (or no status) - Wrestler is active and available
- **Injured** - Wrestler is currently injured
- **On Hiatus** - Wrestler is on hiatus (previously called "Inactive")

**Note:** Alumni and Celebrity Guests should not have a status set, as they are not regularly active wrestlers.

## Database Schema

### New Column: `classification`
- Type: `VARCHAR(20)`
- Values: `'Active'`, `'Part-timer'`, `'Celebrity Guests'`, `'Alumni'`, or `NULL`
- Constraint: Only allows the four valid values

### Existing Column: `status`
- Type: `VARCHAR` (existing)
- Values: `'Injured'`, `'On Hiatus'`, or `NULL`
- Note: Should only be set for Active and Part-timer wrestlers

### Existing Column: `brand`
- Type: `VARCHAR` (existing)
- Values: `'RAW'`, `'SmackDown'`, `'NXT'`, `'AAA'`, or `NULL`
- Note: Should only be set for Active wrestlers. AAA is WWE's affiliate in Mexico.

## Implementation

### Files Created/Modified

1. **`add_wrestler_classification.sql`** - SQL migration script to add the classification system
   - Adds the `classification` column
   - Adds constraints and indexes
   - Updates existing wrestlers (sets Active for those with brands)
   - Converts 'Inactive' status to 'On Hiatus'

2. **`update_wrestler_classification_examples.sql`** - Examples of how to update wrestler classifications
   - Contains SQL templates for all classification types
   - Includes bulk update examples
   - Includes query examples for checking classifications

3. **`src/components/WrestlersPage.jsx`** - Updated to display wrestlers by classification
   - Active wrestlers are grouped by brand (RAW, SmackDown, NXT)
   - Part-timers are shown in their own section
   - Celebrity Guests are shown in their own section
   - Alumni are shown in their own section
   - Status icons (Injured, On Hiatus) are displayed on wrestler cards

## Usage

### Running the Migration

1. Run the migration script in your Supabase SQL editor:
   ```sql
   -- Execute add_wrestler_classification.sql
   ```

2. This will:
   - Add the `classification` column
   - Set existing wrestlers with brands to 'Active'
   - Convert 'Inactive' status to 'On Hiatus'
   - Clear status for any Alumni wrestlers

### Updating Wrestler Classifications

Use the examples in `update_wrestler_classification_examples.sql` to update wrestlers. Here are some common scenarios:

#### Set a wrestler as Active on RAW
```sql
UPDATE wrestlers 
SET classification = 'Active',
    brand = 'RAW',
    status = NULL
WHERE id = 'wrestler-slug';
```

#### Set a wrestler as Part-timer (injured)
```sql
UPDATE wrestlers 
SET classification = 'Part-timer',
    brand = NULL,
    status = 'Injured'
WHERE id = 'wrestler-slug';
```

#### Set a wrestler as Celebrity Guest
```sql
UPDATE wrestlers 
SET classification = 'Celebrity Guests',
    brand = NULL,
    status = NULL
WHERE id = 'wrestler-slug';
```

#### Set a wrestler as Alumni
```sql
UPDATE wrestlers 
SET classification = 'Alumni',
    brand = NULL,
    status = NULL
WHERE id = 'wrestler-slug';
```

### Viewing Classifications

The Wrestlers page (`/wrestlers`) now displays wrestlers organized by:
1. Active wrestlers grouped by brand (RAW, SmackDown, NXT, AAA)
2. Part-timers section
3. Celebrity Guests section
4. Alumni section

Status indicators (Injured, On Hiatus) are shown as icons on wrestler cards.

## Rules and Constraints

1. **Active wrestlers**:
   - Must have a `brand` (RAW, SmackDown, NXT, or AAA)
   - Can have a `status` (Injured, On Hiatus, or NULL)

2. **Part-timer wrestlers**:
   - Should NOT have a `brand` (set to NULL)
   - Can have a `status` (Injured, On Hiatus, or NULL)

3. **Celebrity Guests**:
   - Should NOT have a `brand` (set to NULL)
   - Should NOT have a `status` (set to NULL)
   - Used for occasional celebrity appearances

4. **Alumni wrestlers**:
   - Should NOT have a `brand` (set to NULL)
   - Should NOT have a `status` (set to NULL)
   - All their historical stats remain in the system

## Backward Compatibility

- The system defaults to 'Active' for wrestlers without a classification (for backward compatibility)
- The status field still supports 'Inactive' for backward compatibility, but new entries should use 'On Hiatus'
- Wrestlers without a classification will be treated as Active and grouped by brand

## Future Enhancements

Potential future improvements:
- Admin UI for editing wrestler classifications
- Bulk import/export of classifications
- Automatic classification based on recent match activity
- Filtering by classification in match builders

