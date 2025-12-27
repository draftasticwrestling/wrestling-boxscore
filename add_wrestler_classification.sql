-- Add wrestler classification system
-- This adds classification (Active, Part-timer, Alumni, Celebrity Guests) and updates status handling

-- Add classification column to wrestlers table
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS classification VARCHAR(20);

-- Add check constraint to ensure valid classification values
ALTER TABLE wrestlers DROP CONSTRAINT IF EXISTS check_classification;
ALTER TABLE wrestlers ADD CONSTRAINT check_classification 
  CHECK (classification IS NULL OR classification IN ('Active', 'Part-timer', 'Alumni', 'Celebrity Guests'));

-- Update existing wrestlers based on current brand assignment
-- If they have a brand (RAW, SmackDown, NXT), they are Active
-- If they don't have a brand but have a status, they might be Part-timer or Alumni
-- For now, set default: if brand exists, set to Active; otherwise leave NULL for manual assignment

UPDATE wrestlers 
SET classification = 'Active' 
WHERE brand IN ('RAW', 'SmackDown', 'NXT', 'AAA') 
  AND (classification IS NULL OR classification = '');

-- Ensure status field exists and can handle 'Injured', 'On Hiatus', or NULL
-- Status should only be set for Active and Part-timer classifications
-- Alumni should not have status (they're released/retired)
-- Note: The status field should already exist, but we'll ensure it can handle 'On Hiatus'

-- Update any existing 'Inactive' status to 'On Hiatus' for consistency
-- Note: Using quoted identifier to handle case-sensitive column name
UPDATE wrestlers 
SET "Status" = 'On Hiatus' 
WHERE "Status" = 'Inactive' 
  AND classification IN ('Active', 'Part-timer');

-- Clear status for Alumni and Celebrity Guests (they shouldn't have status)
UPDATE wrestlers 
SET "Status" = NULL 
WHERE classification IN ('Alumni', 'Celebrity Guests') AND "Status" IS NOT NULL;

-- Add comment to clarify the classification system
COMMENT ON COLUMN wrestlers.classification IS 'Wrestler classification: Active (assigned to roster), Part-timer (signed but no roster), Alumni (released/retired), Celebrity Guests (occasional appearances)';
COMMENT ON COLUMN wrestlers."Status" IS 'Status for Active/Part-timer: Injured, On Hiatus, or NULL (active). Alumni and Celebrity Guests should have NULL status.';
COMMENT ON COLUMN wrestlers.brand IS 'Brand assignment (RAW, SmackDown, NXT, AAA). Only applicable for Active wrestlers.';

-- Create index for filtering by classification
CREATE INDEX IF NOT EXISTS idx_wrestlers_classification ON wrestlers(classification);

-- Create index for filtering by status (using quoted identifier for case-sensitive column)
CREATE INDEX IF NOT EXISTS idx_wrestlers_status ON wrestlers("Status");

