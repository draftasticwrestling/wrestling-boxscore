-- Step 3: Create tag team members table
CREATE TABLE IF NOT EXISTS tag_team_members (
    id SERIAL PRIMARY KEY,
    tag_team_id VARCHAR(50) REFERENCES tag_teams(id) ON DELETE CASCADE,
    wrestler_slug VARCHAR(50) REFERENCES wrestlers(id) ON DELETE CASCADE,
    member_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tag_team_id, wrestler_slug)
); 