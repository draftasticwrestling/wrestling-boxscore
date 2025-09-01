-- Add The MFTs team to tag_teams table
INSERT INTO tag_teams (id, name, description, brand) VALUES
('mfts', 'The MFTs', 'My Family Tree - Solo Sikoa''s group', 'SmackDown'),
('secret-hervice', 'The Secret Hervice', 'Alba Fyre and Piper Niven', 'SmackDown')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    brand = EXCLUDED.brand;
