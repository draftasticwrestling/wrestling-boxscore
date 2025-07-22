-- Step 1: Add tag team columns to wrestlers table
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS tag_team_id VARCHAR(50);
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS tag_team_name VARCHAR(100);
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS tag_team_partner_slug VARCHAR(50); 