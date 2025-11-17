-- Update Tag Teams - November 2025
-- Add Allies of Convenience and update The MFTs

-- Add Allies of Convenience tag team
INSERT INTO tag_teams (id, name, description, brand) VALUES
('allies-of-convenience', 'Allies of Convenience', 'Charlotte Flair and Alexa Bliss', 'SmackDown')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    brand = EXCLUDED.brand;

-- Update The MFTs team name and description
INSERT INTO tag_teams (id, name, description, brand) VALUES
('mfts', 'The MFTs', 'My Family Tree - Solo Sikoa''s faction', 'SmackDown'),
('jc-mateo-tama-tonga', 'The MFTs', 'The MFTs primary tag team partnership', 'SmackDown')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    brand = EXCLUDED.brand;

-- Remove existing MFTs members (to update the list)
DELETE FROM tag_team_members WHERE tag_team_id = 'mfts';

-- Add all MFTs members (Solo Sikoa is the leader, JC Mateo & Tama Tonga are the primary tag team)
INSERT INTO tag_team_members (tag_team_id, wrestler_slug, member_order) VALUES
('mfts', 'solo-sikoa', 1),      -- Leader
('mfts', 'jc-mateo', 2),        -- Primary tag team member 1
('mfts', 'tama-tonga', 3),      -- Primary tag team member 2
('mfts', 'tonga-loa', 4),       -- Faction member
('mfts', 'talla-tonga', 5)      -- Faction member
ON CONFLICT (tag_team_id, wrestler_slug) DO NOTHING;

-- Add Allies of Convenience members
INSERT INTO tag_team_members (tag_team_id, wrestler_slug, member_order) VALUES
('allies-of-convenience', 'charlotte-flair', 1),
('allies-of-convenience', 'alexa-bliss', 2)
ON CONFLICT (tag_team_id, wrestler_slug) DO NOTHING;

-- Add JC Mateo & Tama Tonga as the primary tag team partnership
INSERT INTO tag_team_members (tag_team_id, wrestler_slug, member_order) VALUES
('jc-mateo-tama-tonga', 'jc-mateo', 1),
('jc-mateo-tama-tonga', 'tama-tonga', 2)
ON CONFLICT (tag_team_id, wrestler_slug) DO NOTHING;

-- Update wrestlers table with tag team info for primary partnerships
-- Allies of Convenience
UPDATE wrestlers 
SET tag_team_id = 'allies-of-convenience',
    tag_team_name = 'Allies of Convenience',
    tag_team_partner_slug = CASE 
        WHEN id = 'charlotte-flair' THEN 'alexa-bliss'
        WHEN id = 'alexa-bliss' THEN 'charlotte-flair'
    END
WHERE id IN ('charlotte-flair', 'alexa-bliss');

-- JC Mateo & Tama Tonga (primary tag team partnership - display name is "The MFTs")
UPDATE wrestlers 
SET tag_team_id = 'jc-mateo-tama-tonga',
    tag_team_name = 'The MFTs',
    tag_team_partner_slug = CASE 
        WHEN id = 'jc-mateo' THEN 'tama-tonga'
        WHEN id = 'tama-tonga' THEN 'jc-mateo'
    END
WHERE id IN ('jc-mateo', 'tama-tonga');

-- Update MFTs faction members (they're in the faction but not primary partners)
-- Solo Sikoa, Tonga Loa, and Talla Tonga are faction members but not primary tag partners
-- Note: JC Mateo and Tama Tonga are also in the faction (via tag_team_members) but their primary tag_team_id is their partnership
UPDATE wrestlers 
SET tag_team_id = 'mfts',
    tag_team_name = 'The MFTs',
    tag_team_partner_slug = NULL
WHERE id IN ('solo-sikoa', 'tonga-loa', 'talla-tonga');

-- Verify the updates
SELECT 
    tt.id,
    tt.name as team_name,
    tt.brand,
    COUNT(ttm.wrestler_slug) as member_count,
    STRING_AGG(w.name, ', ' ORDER BY ttm.member_order) as members
FROM tag_teams tt
LEFT JOIN tag_team_members ttm ON tt.id = ttm.tag_team_id
LEFT JOIN wrestlers w ON ttm.wrestler_slug = w.id
WHERE tt.id IN ('mfts', 'allies-of-convenience', 'jc-mateo-tama-tonga')
GROUP BY tt.id, tt.name, tt.brand
ORDER BY tt.name;

