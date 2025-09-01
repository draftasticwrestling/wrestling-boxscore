-- Update Tag Team Members Table
-- This script will clear existing data and insert current, accurate WWE tag team memberships

-- First, ensure all teams exist in the tag_teams table
INSERT INTO tag_teams (id, name, description, brand) VALUES
('mfts', 'The MFTs', 'My Family Tree - Solo Sikoa''s group', 'SmackDown'),
('secret-hervice', 'The Secret Hervice', 'Alba Fyre and Piper Niven', 'SmackDown')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    brand = EXCLUDED.brand;

-- Clear all existing tag team memberships (this will handle the duplicate key issue)
DELETE FROM tag_team_members;

-- Reset the sequence for the id column
ALTER SEQUENCE tag_team_members_id_seq RESTART WITH 1;

-- Insert current WWE tag team memberships (as of 2024)
INSERT INTO tag_team_members (tag_team_id, wrestler_slug, member_order) VALUES

-- RAW Tag Teams
-- The Judgment Day (6 members - mixed gender)
('judgment-day', 'finn-balor', 1),
('judgment-day', 'jd-mcdonagh', 2),
('judgment-day', 'dominik-mysterio', 3),
('judgment-day', 'raquel-rodriguez', 4),
('judgment-day', 'roxanne-perez', 5),
('judgment-day', 'liv-morgan', 6),

-- The New Day (2 members)
('new-day', 'kofi-kingston', 1),
('new-day', 'xavier-woods', 2),

-- The War Raiders (2 members)
('war-raiders', 'erik', 1),
('war-raiders', 'ivar', 2),

-- Alpha Academy (2 members)
('alpha-academy', 'akira-tozawa', 1),
('alpha-academy', 'otis', 2),

-- American Made (3 members)
('american-made', 'julius-creed', 1),
('american-made', 'brutus-creed', 2),
('american-made', 'chad-gable', 3),

-- A-Town Down Under (2 members)
('a-town-down-under', 'austin-theory', 1),
('a-town-down-under', 'grayson-waller', 2),

-- The Kabuki Warriors (2 members)
('kabuki-warriors', 'asuka', 1),
('kabuki-warriors', 'kairi-sane', 2),

-- LWO (4 members)
('lwo', 'cruz-del-toro', 1),
('lwo', 'dragon-lee', 2),
('lwo', 'joaquin-wilde', 3),
('lwo', 'rey-mysterio', 4),

-- SmackDown Tag Teams
-- #DIY (2 members)
('diy', 'tommaso-ciampa', 1),
('diy', 'johnny-gargano', 2),

-- The Motor City Machine Guns (2 members)
('motor-city-machine-guns', 'chris-sabin', 1),
('motor-city-machine-guns', 'alex-shelley', 2),

-- Fraxiom (2 members)
('fraxiom', 'nathan-frazer', 1),
('fraxiom', 'axiom', 2),

-- Pretty Deadly (2 members)
('pretty-deadly', 'elton-prince', 1),
('pretty-deadly', 'kit-wilson', 2),

-- The Green Regime (3 members)
('green-regime', 'chelsea-green', 1),
('green-regime', 'alba-fyre', 2),
('green-regime', 'piper-niven', 3),

-- The Secret Hervice (2 members - subset of Green Regime)
('secret-hervice', 'alba-fyre', 1),
('secret-hervice', 'piper-niven', 2),

-- Legado del Fantasma (3 members)
('legado-del-fantasma', 'angel', 1),
('legado-del-fantasma', 'berto', 2),
('legado-del-fantasma', 'santos-escobar', 3),

-- The Tongans (3 members)
('tongans', 'tama-tonga', 1),
('tongans', 'tonga-loa', 2),
('tongans', 'talla-tonga', 3),

-- Melo Don't Miz (2 members)
('melo-dont-miz', 'carmelo-hayes', 1),
('melo-dont-miz', 'the-miz', 2),

-- The Wyatt Sicks (4 members)
('wyatt-sicks', 'dexter-lumis', 1),
('wyatt-sicks', 'joe-gacy', 2),
('wyatt-sicks', 'erick-rowan', 3),
('wyatt-sicks', 'uncle-howdy', 4),

-- The Street Profits (2 members)
('street-profits', 'angelo-dawkins', 1),
('street-profits', 'montez-ford', 2),

-- The MFTs (4 members - Solo Sikoa's group)
('mfts', 'solo-sikoa', 1),
('mfts', 'jc-mateo', 2),
('mfts', 'talla-tonga', 3),
('mfts', 'tonga-loa', 4),

-- NXT Tag Teams
-- Zaruca (2 members)
('zaruca', 'sol-ruca', 1),
('zaruca', 'zaria', 2),

-- Unassigned Teams
-- The Usos (2 members)
('usos', 'jey-uso', 1),
('usos', 'jimmy-uso', 2);

-- Verify the data was inserted correctly
SELECT 
    tt.name as team_name,
    tt.brand,
    COUNT(ttm.wrestler_slug) as member_count,
    STRING_AGG(w.name, ', ' ORDER BY ttm.member_order) as members
FROM tag_teams tt
LEFT JOIN tag_team_members ttm ON tt.id = ttm.tag_team_id
LEFT JOIN wrestlers w ON ttm.wrestler_slug = w.id
GROUP BY tt.id, tt.name, tt.brand
ORDER BY tt.brand, tt.name;
