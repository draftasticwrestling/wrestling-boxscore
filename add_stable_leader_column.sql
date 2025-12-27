-- Add stable leader column to wrestlers table
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS is_stable_leader BOOLEAN DEFAULT false;

COMMENT ON COLUMN wrestlers.is_stable_leader IS 'Indicates if this wrestler is the leader of their stable';

-- Create index for filtering by stable leader
CREATE INDEX IF NOT EXISTS idx_wrestlers_stable_leader ON wrestlers(is_stable_leader);

