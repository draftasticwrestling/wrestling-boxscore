# Next Steps: Wrestler Classification Implementation

## Step 1: Run the Database Migration ⚠️ IMPORTANT

### 1.1 Backup Your Database
Before making any changes, **backup your database** in the Supabase dashboard:
- Go to your Supabase project dashboard
- Navigate to Database → Backups
- Create a manual backup (or verify automatic backups are enabled)

### 1.2 Run the Migration Script
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open the file: `add_wrestler_classification.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** to execute

This will:
- ✅ Add the `classification` column to the `wrestlers` table
- ✅ Add constraints to ensure valid values
- ✅ Set existing wrestlers with brands to 'Active'
- ✅ Convert 'Inactive' status to 'On Hiatus'
- ✅ Create indexes for better performance

### 1.3 Verify the Migration
Run this query to verify the migration worked:

```sql
-- Check that the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wrestlers' 
  AND column_name = 'classification';

-- Check current classifications
SELECT classification, COUNT(*) as count 
FROM wrestlers 
GROUP BY classification;
```

## Step 2: Update Wrestler Classifications

### 2.1 Review Current Wrestlers
First, see what wrestlers need classification updates:

```sql
-- View wrestlers without classification
SELECT id, name, brand, status 
FROM wrestlers 
WHERE classification IS NULL 
ORDER BY name;

-- View all wrestlers and their current classification
SELECT id, name, brand, status, classification 
FROM wrestlers 
ORDER BY classification NULLS LAST, brand, name;
```

### 2.2 Update Classifications Manually
Use the examples in `update_wrestler_classification_examples.sql` to update wrestlers. Common updates:

#### Set Part-timers (e.g., The Rock, Roman Reigns, Brock Lesnar)
```sql
UPDATE wrestlers 
SET classification = 'Part-timer',
    brand = NULL,
    status = NULL  -- or 'Injured' or 'On Hiatus' if applicable
WHERE id IN ('the-rock', 'roman-reigns', 'brock-lesnar');
```

#### Set Celebrity Guests (e.g., Bad Bunny, Logan Paul)
```sql
UPDATE wrestlers 
SET classification = 'Celebrity Guests',
    brand = NULL,
    status = NULL
WHERE id IN ('bad-bunny', 'logan-paul');
```

#### Set Alumni (released/retired wrestlers)
```sql
UPDATE wrestlers 
SET classification = 'Alumni',
    brand = NULL,
    status = NULL
WHERE id IN ('wrestler-1', 'wrestler-2');
```

### 2.3 Bulk Update Active Wrestlers
If you have many wrestlers already assigned to brands, they should already be set to 'Active' by the migration. Verify:

```sql
-- Check Active wrestlers by brand
SELECT brand, COUNT(*) as count 
FROM wrestlers 
WHERE classification = 'Active' 
GROUP BY brand;
```

## Step 3: Test the UI Changes

### 3.1 Start Your Development Server
```bash
npm run dev
```

### 3.2 Visit the Wrestlers Page
Navigate to `/wrestlers` in your application and verify:
- ✅ Active wrestlers are grouped by brand (RAW, SmackDown, NXT)
- ✅ Part-timers appear in their own section
- ✅ Celebrity Guests appear in their own section
- ✅ Alumni appear in their own section
- ✅ Status icons (Injured, On Hiatus) display correctly

### 3.3 Test Status Icons
Verify that wrestlers with status show the correct icons:
- Injured wrestlers show the medical cross icon
- Wrestlers on hiatus show the inactive icon

## Step 4: Optional - Create Helper Script

If you have many wrestlers to update, you could create a Node.js script to help with bulk updates. Here's a template:

```javascript
// scripts/update_wrestler_classifications.js
import { supabase } from '../src/supabaseClient.js';

// Example: Update multiple wrestlers at once
const updates = [
  { id: 'the-rock', classification: 'Part-timer', brand: null, status: null },
  { id: 'bad-bunny', classification: 'Celebrity Guests', brand: null, status: null },
  // Add more updates here
];

async function updateClassifications() {
  for (const update of updates) {
    const { error } = await supabase
      .from('wrestlers')
      .update({
        classification: update.classification,
        brand: update.brand,
        status: update.status
      })
      .eq('id', update.id);
    
    if (error) {
      console.error(`Error updating ${update.id}:`, error);
    } else {
      console.log(`Updated ${update.id} to ${update.classification}`);
    }
  }
}

updateClassifications();
```

## Step 5: Verify Everything Works

### 5.1 Database Verification
```sql
-- Check classification distribution
SELECT 
  classification,
  COUNT(*) as total,
  COUNT(CASE WHEN status IS NOT NULL THEN 1 END) as with_status,
  COUNT(CASE WHEN brand IS NOT NULL THEN 1 END) as with_brand
FROM wrestlers
GROUP BY classification
ORDER BY classification;
```

### 5.2 Application Verification
- ✅ Wrestlers page loads without errors
- ✅ All classifications display correctly
- ✅ No console errors in browser
- ✅ Status icons display correctly
- ✅ Wrestlers are sorted alphabetically within each section

## Step 6: Production Deployment

Once everything is tested and working:

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add wrestler classification system (Active, Part-timer, Celebrity Guests, Alumni)"
   ```

2. **Push to your repository:**
   ```bash
   git push
   ```

3. **Deploy to production** (if using Netlify, Vercel, etc.)

4. **Run the migration in production Supabase** (same as Step 1.2)

## Troubleshooting

### Issue: Migration fails with constraint error
**Solution:** Some wrestlers might have invalid data. Check for wrestlers with brands but invalid status:
```sql
SELECT id, name, brand, status 
FROM wrestlers 
WHERE brand IS NOT NULL 
  AND status NOT IN ('Injured', 'On Hiatus', NULL);
```

### Issue: Wrestlers page shows errors
**Solution:** Check browser console for errors. Verify that:
- The `classification` column exists in the database
- Wrestlers are being fetched correctly (check Network tab)

### Issue: Status icons not showing
**Solution:** Verify the status values match exactly:
- 'Injured' (case-sensitive)
- 'On Hiatus' (case-sensitive)
- NULL (no status)

## Need Help?

Refer to:
- `WRESTLER_CLASSIFICATION_SYSTEM.md` - Full documentation
- `update_wrestler_classification_examples.sql` - SQL examples
- `add_wrestler_classification.sql` - Migration script

