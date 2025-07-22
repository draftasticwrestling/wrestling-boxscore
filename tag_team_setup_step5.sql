-- Step 5: Add RLS policies for tag teams
ALTER TABLE tag_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_team_members ENABLE ROW LEVEL SECURITY;

-- Allow read access to tag teams
CREATE POLICY "Allow read access to tag teams" ON tag_teams
    FOR SELECT USING (true);

-- Allow read access to tag team members
CREATE POLICY "Allow read access to tag team members" ON tag_team_members
    FOR SELECT USING (true);

-- Allow authenticated users to manage tag teams (for admin purposes)
CREATE POLICY "Allow authenticated users to manage tag teams" ON tag_teams
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage tag team members" ON tag_team_members
    FOR ALL USING (auth.role() = 'authenticated'); 