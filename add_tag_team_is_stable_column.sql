-- Add is_stable column to tag_teams table
ALTER TABLE tag_teams ADD COLUMN IF NOT EXISTS is_stable BOOLEAN DEFAULT false;

COMMENT ON COLUMN tag_teams.is_stable IS 'Indicates if this tag team is also a stable/faction';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_tag_teams_is_stable ON tag_teams(is_stable);

-- Mark the specified tag teams as stables
UPDATE tag_teams SET is_stable = true WHERE name IN (
  'American Made',
  'The Green Regime',
  'The Judgment Day',
  'The MFTs',
  'The Wyatt Sicks'
);

