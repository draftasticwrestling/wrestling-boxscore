-- Fix missing tag teams
-- Add teams that are referenced in tag_team_members but missing from tag_teams

INSERT INTO tag_teams (id, name, description, brand) VALUES
('judgment-day', 'The Judgment Day', 'The most dominant faction in WWE', 'RAW'),
('mfts', 'The MFTs', 'My Family Tree - Solo Sikoa''s group', 'SmackDown')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    brand = EXCLUDED.brand;

-- Also clean up the duplicate Secret Hervice entries
-- Keep the correct one (secret-hervice) and remove the old one (secret-service)
DELETE FROM tag_team_members WHERE tag_team_id = 'secret-service';
DELETE FROM tag_teams WHERE id = 'secret-service';
