-- Tag Team Database Schema
-- This adds tag team relationships and team names to the wrestler database

-- Add tag team columns to wrestlers table
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS tag_team_id VARCHAR(50);
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS tag_team_name VARCHAR(100);
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS tag_team_partner_slug VARCHAR(50);

-- Create tag teams table to store team information
CREATE TABLE IF NOT EXISTS tag_teams (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    brand VARCHAR(20),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tag team members table for many-to-many relationship
CREATE TABLE IF NOT EXISTS tag_team_members (
    id SERIAL PRIMARY KEY,
    tag_team_id VARCHAR(50) REFERENCES tag_teams(id) ON DELETE CASCADE,
    wrestler_slug VARCHAR(50) REFERENCES wrestlers(id) ON DELETE CASCADE,
    member_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tag_team_id, wrestler_slug)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wrestlers_tag_team_id ON wrestlers(tag_team_id);
CREATE INDEX IF NOT EXISTS idx_wrestlers_tag_team_partner ON wrestlers(tag_team_partner_slug);
CREATE INDEX IF NOT EXISTS idx_tag_team_members_team ON tag_team_members(tag_team_id);
CREATE INDEX IF NOT EXISTS idx_tag_team_members_wrestler ON tag_team_members(wrestler_slug);

-- Function to update wrestler tag team info when team membership changes
CREATE OR REPLACE FUNCTION update_wrestler_tag_team_info()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update wrestler with team info
        UPDATE wrestlers 
        SET tag_team_id = NEW.tag_team_id,
            tag_team_name = (SELECT name FROM tag_teams WHERE id = NEW.tag_team_id),
            tag_team_partner_slug = (
                SELECT wrestler_slug 
                FROM tag_team_members 
                WHERE tag_team_id = NEW.tag_team_id 
                AND wrestler_slug != NEW.wrestler_slug 
                AND active = true
                LIMIT 1
            )
        WHERE id = NEW.wrestler_slug;
        
        -- Update partner's partner reference
        UPDATE wrestlers 
        SET tag_team_partner_slug = NEW.wrestler_slug
        WHERE id = (
            SELECT wrestler_slug 
            FROM tag_team_members 
            WHERE tag_team_id = NEW.tag_team_id 
            AND wrestler_slug != NEW.wrestler_slug 
            AND active = true
            LIMIT 1
        );
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Clear wrestler team info
        UPDATE wrestlers 
        SET tag_team_id = NULL,
            tag_team_name = NULL,
            tag_team_partner_slug = NULL
        WHERE id = OLD.wrestler_slug;
        
        -- Update partner's partner reference
        UPDATE wrestlers 
        SET tag_team_partner_slug = NULL
        WHERE id = OLD.wrestler_slug;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle team changes
        IF OLD.tag_team_id != NEW.tag_team_id THEN
            -- Clear old team info
            UPDATE wrestlers 
            SET tag_team_id = NULL,
                tag_team_name = NULL,
                tag_team_partner_slug = NULL
            WHERE id = OLD.wrestler_slug;
            
            -- Set new team info
            UPDATE wrestlers 
            SET tag_team_id = NEW.tag_team_id,
                tag_team_name = (SELECT name FROM tag_teams WHERE id = NEW.tag_team_id),
                tag_team_partner_slug = (
                    SELECT wrestler_slug 
                    FROM tag_team_members 
                    WHERE tag_team_id = NEW.tag_team_id 
                    AND wrestler_slug != NEW.wrestler_slug 
                    AND active = true
                    LIMIT 1
                )
            WHERE id = NEW.wrestler_slug;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update wrestler tag team info
CREATE TRIGGER trigger_update_wrestler_tag_team_info
    AFTER INSERT OR UPDATE OR DELETE ON tag_team_members
    FOR EACH ROW EXECUTE FUNCTION update_wrestler_tag_team_info();

-- Function to get tag team members
CREATE OR REPLACE FUNCTION get_tag_team_members(team_id VARCHAR(50))
RETURNS TABLE(wrestler_slug VARCHAR(50), wrestler_name VARCHAR(100), member_order INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT w.id, w.name, ttm.member_order
    FROM tag_team_members ttm
    JOIN wrestlers w ON ttm.wrestler_slug = w.id
    WHERE ttm.tag_team_id = team_id AND ttm.active = true
    ORDER BY ttm.member_order, w.name;
END;
$$ LANGUAGE plpgsql;

-- Function to check if two wrestlers are tag team partners
CREATE OR REPLACE FUNCTION are_tag_team_partners(wrestler1 VARCHAR(50), wrestler2 VARCHAR(50))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM wrestlers w1, wrestlers w2
        WHERE w1.id = wrestler1 
        AND w2.id = wrestler2
        AND w1.tag_team_id = w2.tag_team_id
        AND w1.tag_team_id IS NOT NULL
        AND w1.tag_team_partner_slug = wrestler2
        AND w2.tag_team_partner_slug = wrestler1
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get tag team name for two wrestlers
CREATE OR REPLACE FUNCTION get_tag_team_name(wrestler1 VARCHAR(50), wrestler2 VARCHAR(50))
RETURNS VARCHAR(100) AS $$
BEGIN
    RETURN (
        SELECT w1.tag_team_name
        FROM wrestlers w1, wrestlers w2
        WHERE w1.id = wrestler1 
        AND w2.id = wrestler2
        AND w1.tag_team_id = w2.tag_team_id
        AND w1.tag_team_id IS NOT NULL
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

-- Sample tag team data
INSERT INTO tag_teams (id, name, description, brand) VALUES
('new-day', 'The New Day', 'Power of positivity', 'RAW'),
('usos', 'The Usos', 'Uso Penitentiary', 'SmackDown'),
('street-profits', 'The Street Profits', 'We want the smoke', 'RAW'),
('imperium', 'Imperium', 'WWE''s most dominant faction', 'RAW'),
('damage-ctrl', 'Damage CTRL', 'We run this', 'SmackDown'),
('judgment-day', 'The Judgment Day', 'The most dominant faction in WWE', 'RAW'),
('legado-del-fantasma', 'Legado del Fantasma', 'The ghost legacy', 'SmackDown'),
('alpha-academy', 'Alpha Academy', 'Acknowledge the academy', 'RAW'),
('brawling-brats', 'The Brawling Brats', 'NXT tag team', 'NXT'),
('trick-williams-carmelo-hayes', 'Trick Williams & Carmelo Hayes', 'NXT duo', 'NXT');

-- Sample tag team memberships
INSERT INTO tag_team_members (tag_team_id, wrestler_slug, member_order) VALUES
-- The New Day
('new-day', 'kofi-kingston', 1),
('new-day', 'xavier-woods', 2),

-- The Usos
('usos', 'jimmy-uso', 1),
('usos', 'jey-uso', 2),

-- The Street Profits
('street-profits', 'montez-ford', 1),
('street-profits', 'angelo-dawkins', 2),

-- Imperium
('imperium', 'gunther', 1),
('imperium', 'ludwig-kaiser', 2),

-- The Judgment Day
('judgment-day', 'finn-balor', 1),
('judgment-day', 'jd-mcdonagh', 2),
('judgment-day', 'dominik-mysterio', 3),

-- Legado del Fantasma
('legado-del-fantasma', 'santos-escobar', 1),
('legado-del-fantasma', 'joaquin-wilde', 2),
('legado-del-fantasma', 'cruz-del-toro', 3),

-- Alpha Academy
('alpha-academy', 'akira-tozawa', 1),
('alpha-academy', 'otis', 2),

-- Add RLS policies for tag teams
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