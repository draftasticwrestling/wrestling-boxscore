-- Update initial wrestler classifications based on analysis
-- Run this after the migration to set up common classifications

-- ============================================
-- PART-TIMERS
-- ============================================
-- The Rock - Part-timer (on hiatus)
UPDATE wrestlers 
SET classification = 'Part-timer',
    brand = NULL,
    "Status" = 'On Hiatus'
WHERE id = 'the-rock';

-- Brock Lesnar - Part-timer
UPDATE wrestlers 
SET classification = 'Part-timer',
    brand = NULL,
    "Status" = NULL
WHERE id = 'brock-lesnar';

-- ============================================
-- ALUMNI (Released/Retired)
-- ============================================
-- Dolph Ziggler - Alumni (released)
UPDATE wrestlers 
SET classification = 'Alumni',
    brand = NULL,
    "Status" = NULL
WHERE id = 'dolph-ziggler';

-- Zack Ryder - Alumni (released)
UPDATE wrestlers 
SET classification = 'Alumni',
    brand = NULL,
    "Status" = NULL
WHERE id = 'zack-ryder';

-- ============================================
-- CELEBRITY GUESTS
-- ============================================
-- Jelly Roll - Celebrity Guest
UPDATE wrestlers 
SET classification = 'Celebrity Guests',
    brand = NULL,
    "Status" = NULL
WHERE id = 'jelly-roll';

-- ============================================
-- AAA ROSTER (WWE Affiliate in Mexico)
-- ============================================
-- Mr. Iguana - Active on AAA
UPDATE wrestlers 
SET classification = 'Active',
    brand = 'AAA',
    "Status" = NULL
WHERE id = 'mr-iguana';

-- Octagon Jr - Active on AAA
UPDATE wrestlers 
SET classification = 'Active',
    brand = 'AAA',
    "Status" = NULL
WHERE id = 'octagon-jr';

-- Psycho Clown - Active on AAA
UPDATE wrestlers 
SET classification = 'Active',
    brand = 'AAA',
    "Status" = NULL
WHERE id = 'psycho-clown';

-- ============================================
-- WRESTLERS THAT NEED REVIEW
-- ============================================
-- These wrestlers need manual review to determine correct classification:
-- - Omos (omos) - Brand: N/A, Status: Active
-- - Trish Stratus (trish-stratus) - Brand: N/A, Status: Active

-- For now, setting these as Active (you can update later if needed)
-- If they're not on a WWE roster, you may want to set them as Alumni or Part-timer

-- Example: If Trish Stratus is a part-timer, uncomment this:
-- UPDATE wrestlers 
-- SET classification = 'Part-timer',
--     brand = NULL,
--     "Status" = NULL
-- WHERE id = 'trish-stratus';

-- Example: If Omos is released, uncomment this:
-- UPDATE wrestlers 
-- SET classification = 'Alumni',
--     brand = NULL,
--     "Status" = NULL
-- WHERE id = 'omos';

-- ============================================
-- VERIFY UPDATES
-- ============================================
-- Check the updated classifications
SELECT id, name, brand, "Status", classification 
FROM wrestlers 
WHERE id IN ('the-rock', 'brock-lesnar', 'dolph-ziggler', 'zack-ryder', 'jelly-roll', 'mr-iguana', 'octagon-jr', 'psycho-clown')
ORDER BY classification, brand, name;

-- Check remaining unclassified wrestlers
SELECT id, name, brand, "Status", classification 
FROM wrestlers 
WHERE classification IS NULL 
ORDER BY name;

