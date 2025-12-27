-- Examples of how to update wrestler classifications
-- Use these as templates for updating wrestlers in your database

-- ============================================
-- SET WRESTLER AS ACTIVE (with brand assignment)
-- ============================================
-- Active wrestlers must have a brand (RAW, SmackDown, or NXT)
UPDATE wrestlers 
SET classification = 'Active',
    brand = 'RAW',  -- or 'SmackDown' or 'NXT'
    status = NULL   -- or 'Injured' or 'On Hiatus' if applicable
WHERE id = 'wrestler-slug-here';

-- Example: Set multiple wrestlers as Active on RAW
UPDATE wrestlers 
SET classification = 'Active',
    brand = 'RAW',
    status = NULL
WHERE id IN ('wrestler-1', 'wrestler-2', 'wrestler-3');

-- ============================================
-- SET WRESTLER AS ACTIVE WITH STATUS
-- ============================================
-- Active wrestler who is injured
UPDATE wrestlers 
SET classification = 'Active',
    brand = 'SmackDown',
    status = 'Injured'
WHERE id = 'wrestler-slug-here';

-- Active wrestler on hiatus
UPDATE wrestlers 
SET classification = 'Active',
    brand = 'NXT',
    status = 'On Hiatus'
WHERE id = 'wrestler-slug-here';

-- ============================================
-- SET WRESTLER AS PART-TIMER
-- ============================================
-- Part-timers are signed but not assigned to a specific roster
-- They can have status (Injured or On Hiatus) but no brand
UPDATE wrestlers 
SET classification = 'Part-timer',
    brand = NULL,
    status = NULL  -- or 'Injured' or 'On Hiatus' if applicable
WHERE id = 'wrestler-slug-here';

-- Example: Set The Rock as Part-timer
UPDATE wrestlers 
SET classification = 'Part-timer',
    brand = NULL,
    status = NULL
WHERE id = 'the-rock';

-- Part-timer who is injured
UPDATE wrestlers 
SET classification = 'Part-timer',
    brand = NULL,
    status = 'Injured'
WHERE id = 'wrestler-slug-here';

-- Part-timer on hiatus
UPDATE wrestlers 
SET classification = 'Part-timer',
    brand = NULL,
    status = 'On Hiatus'
WHERE id = 'wrestler-slug-here';

-- ============================================
-- SET WRESTLER AS ALUMNI
-- ============================================
-- Alumni are released or retired wrestlers
-- They should NOT have a brand or status
UPDATE wrestlers 
SET classification = 'Alumni',
    brand = NULL,
    status = NULL
WHERE id = 'wrestler-slug-here';

-- Example: Set multiple released wrestlers as Alumni
UPDATE wrestlers 
SET classification = 'Alumni',
    brand = NULL,
    status = NULL
WHERE id IN ('wrestler-1', 'wrestler-2', 'wrestler-3');

-- ============================================
-- SET WRESTLER AS CELEBRITY GUEST
-- ============================================
-- Celebrity Guests are occasional appearances (e.g., Bad Bunny, Logan Paul)
-- They should NOT have a brand or status
UPDATE wrestlers 
SET classification = 'Celebrity Guests',
    brand = NULL,
    status = NULL
WHERE id = 'wrestler-slug-here';

-- Example: Set Bad Bunny as Celebrity Guest
UPDATE wrestlers 
SET classification = 'Celebrity Guests',
    brand = NULL,
    status = NULL
WHERE id = 'bad-bunny';

-- Example: Set multiple celebrity guests
UPDATE wrestlers 
SET classification = 'Celebrity Guests',
    brand = NULL,
    status = NULL
WHERE id IN ('celebrity-1', 'celebrity-2', 'celebrity-3');

-- ============================================
-- BULK UPDATES BY CURRENT BRAND
-- ============================================
-- Set all RAW wrestlers as Active (if not already set)
UPDATE wrestlers 
SET classification = 'Active'
WHERE brand = 'RAW' 
  AND (classification IS NULL OR classification != 'Active');

-- Set all SmackDown wrestlers as Active
UPDATE wrestlers 
SET classification = 'Active'
WHERE brand = 'SmackDown' 
  AND (classification IS NULL OR classification != 'Active');

-- Set all NXT wrestlers as Active
UPDATE wrestlers 
SET classification = 'Active'
WHERE brand = 'NXT' 
  AND (classification IS NULL OR classification != 'Active');

-- ============================================
-- QUERIES TO CHECK CURRENT CLASSIFICATIONS
-- ============================================
-- View all Active wrestlers by brand
SELECT id, name, brand, status, classification 
FROM wrestlers 
WHERE classification = 'Active' 
ORDER BY brand, name;

-- View all Part-timers
SELECT id, name, status, classification 
FROM wrestlers 
WHERE classification = 'Part-timer' 
ORDER BY name;

-- View all Alumni
SELECT id, name, classification 
FROM wrestlers 
WHERE classification = 'Alumni' 
ORDER BY name;

-- View all Celebrity Guests
SELECT id, name, classification 
FROM wrestlers 
WHERE classification = 'Celebrity Guests' 
ORDER BY name;

-- View wrestlers without classification
SELECT id, name, brand, status 
FROM wrestlers 
WHERE classification IS NULL 
ORDER BY name;

-- View Active wrestlers with status
SELECT id, name, brand, status 
FROM wrestlers 
WHERE classification = 'Active' 
  AND status IS NOT NULL 
ORDER BY brand, name;

