-- Add stable/affiliation column to wrestlers table
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS stable VARCHAR(100);

-- Add comment to clarify the column
COMMENT ON COLUMN wrestlers.stable IS 'Stable or faction affiliation (e.g., The Judgment Day, The Bloodline)';

-- Create index for filtering by stable
CREATE INDEX IF NOT EXISTS idx_wrestlers_stable ON wrestlers(stable);

