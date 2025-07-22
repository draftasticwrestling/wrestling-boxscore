-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wrestlers_tag_team_id ON wrestlers(tag_team_id);
CREATE INDEX IF NOT EXISTS idx_wrestlers_tag_team_partner ON wrestlers(tag_team_partner_slug);
CREATE INDEX IF NOT EXISTS idx_tag_team_members_team ON tag_team_members(tag_team_id);
CREATE INDEX IF NOT EXISTS idx_tag_team_members_wrestler ON tag_team_members(wrestler_slug); 