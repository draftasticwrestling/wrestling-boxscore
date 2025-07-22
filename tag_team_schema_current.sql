-- Current Tag Team Database Schema
-- Based on actual current WWE tag teams with correct brand assignments

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

-- Current tag team data with correct brand assignments
INSERT INTO tag_teams (id, name, description, brand) VALUES
-- RAW
('new-day', 'The New Day', 'Power of positivity', 'RAW'),
('judgment-day', 'The Judgment Day', 'The most dominant faction in WWE', 'RAW'),
('war-raiders', 'The War Raiders', 'Viking warriors', 'RAW'),
('alpha-academy', 'Alpha Academy', 'Acknowledge the academy', 'RAW'),
('american-made', 'American Made', 'Creed brothers', 'RAW'),
('a-town-down-under', 'A-Town Down Under', 'Australian excellence', 'RAW'),
('kabuki-warriors', 'The Kabuki Warriors', 'Japanese excellence', 'RAW'),
('lwo', 'LWO', 'Latino World Order', 'RAW'),

-- SmackDown
('diy', '#DIY', 'Rebel hearts', 'SmackDown'),
('motor-city-machine-guns', 'The Motor City Machine Guns', 'Speed and precision', 'SmackDown'),
('fraxiom', 'Fraxiom', 'NXT tag team', 'SmackDown'),
('pretty-deadly', 'Pretty Deadly', 'Absolutely gorgeous', 'SmackDown'),
('green-regime', 'The Green Regime', 'Chelsea Green''s team', 'SmackDown'),
('secret-service', 'The Secret Service', 'Alba Fyre and Piper Niven', 'SmackDown'),
('legado-del-fantasma', 'Legado del Fantasma', 'The ghost legacy', 'SmackDown'),
('tongans', 'The Tongans', 'Island warriors', 'SmackDown'),
('melo-dont-miz', 'Melo Don''t Miz', 'Carmelo Hayes and The Miz', 'SmackDown'),
('wyatt-sicks', 'The Wyatt Sicks', 'Dark faction', 'SmackDown'),
('street-profits', 'The Street Profits', 'We want the smoke', 'SmackDown'),

-- NXT
('zaruca', 'Zaruca', 'Sol Ruca and Zaria', 'NXT'),

-- Unassigned
('usos', 'The Usos', 'Uso Penitentiary', NULL)
ON CONFLICT (id) DO NOTHING;

-- Tag team memberships with correct brand assignments
INSERT INTO tag_team_members (tag_team_id, wrestler_slug, member_order) VALUES
-- RAW Teams
-- The New Day
('new-day', 'kofi-kingston', 1),
('new-day', 'xavier-woods', 2),

-- The Judgment Day
('judgment-day', 'finn-balor', 1),
('judgment-day', 'jd-mcdonagh', 2),
('judgment-day', 'dominik-mysterio', 3),
('judgment-day', 'raquel-rodriguez', 4),
('judgment-day', 'roxanne-perez', 5),
('judgment-day', 'liv-morgan', 6),

-- The War Raiders
('war-raiders', 'erik', 1),
('war-raiders', 'ivar', 2),

-- Alpha Academy
('alpha-academy', 'akira-tozawa', 1),
('alpha-academy', 'otis', 2),

-- American Made
('american-made', 'julius-creed', 1),
('american-made', 'brutus-creed', 2),
('american-made', 'chad-gable', 3),

-- A-Town Down Under
('a-town-down-under', 'austin-theory', 1),
('a-town-down-under', 'grayson-waller', 2),

-- The Kabuki Warriors
('kabuki-warriors', 'asuka', 1),
('kabuki-warriors', 'kairi-sane', 2),

-- LWO
('lwo', 'cruz-del-toro', 1),
('lwo', 'dragon-lee', 2),
('lwo', 'joaquin-wilde', 3),
('lwo', 'rey-mysterio', 4),

-- SmackDown Teams
-- #DIY
('diy', 'tommaso-ciampa', 1),
('diy', 'johnny-gargano', 2),

-- The Motor City Machine Guns
('motor-city-machine-guns', 'chris-sabin', 1),
('motor-city-machine-guns', 'alex-shelley', 2),

-- Fraxiom
('fraxiom', 'nathan-frazer', 1),
('fraxiom', 'axiom', 2),

-- Pretty Deadly
('pretty-deadly', 'elton-prince', 1),
('pretty-deadly', 'kit-wilson', 2),

-- The Green Regime
('green-regime', 'chelsea-green', 1),
('green-regime', 'alba-fyre', 2),
('green-regime', 'piper-niven', 3),

-- The Secret Service
('secret-service', 'alba-fyre', 1),
('secret-service', 'piper-niven', 2),

-- Legado del Fantasma
('legado-del-fantasma', 'angel', 1),
('legado-del-fantasma', 'berto', 2),
('legado-del-fantasma', 'santos-escobar', 3),

-- The Tongans
('tongans', 'tama-tonga', 1),
('tongans', 'tonga-loa', 2),
('tongans', 'talla-tonga', 3),

-- Melo Don't Miz
('melo-dont-miz', 'carmelo-hayes', 1),
('melo-dont-miz', 'the-miz', 2),

-- The Wyatt Sicks
('wyatt-sicks', 'dexter-lumis', 1),
('wyatt-sicks', 'joe-gacy', 2),
('wyatt-sicks', 'erick-rowan', 3),

-- The Street Profits
('street-profits', 'angelo-dawkins', 1),
('street-profits', 'montez-ford', 2),

-- NXT Teams
-- Zaruca
('zaruca', 'sol-ruca', 1),
('zaruca', 'zaria', 2),

-- Unassigned Teams
-- The Usos
('usos', 'jey-uso', 1),
('usos', 'jimmy-uso', 2)
ON CONFLICT (tag_team_id, wrestler_slug) DO NOTHING;

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