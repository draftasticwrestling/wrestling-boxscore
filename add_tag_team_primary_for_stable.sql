-- Add primary_for_stable column to tag_teams table
ALTER TABLE tag_teams ADD COLUMN IF NOT EXISTS primary_for_stable VARCHAR(100);

COMMENT ON COLUMN tag_teams.primary_for_stable IS 'If set, this tag team is a primary tag team for the specified stable name. Allows multiple primary teams per stable (e.g., male and female teams)';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_tag_teams_primary_for_stable ON tag_teams(primary_for_stable);

