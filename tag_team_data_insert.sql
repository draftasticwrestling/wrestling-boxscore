-- Insert tag team data
-- Only includes wrestlers that are likely to exist in the database

-- Insert tag teams
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

-- Insert tag team members (conservative approach - only core members)
INSERT INTO tag_team_members (tag_team_id, wrestler_slug, member_order) VALUES
-- RAW Teams
('new-day', 'kofi-kingston', 1),
('new-day', 'xavier-woods', 2),

('judgment-day', 'finn-balor', 1),
('judgment-day', 'jd-mcdonagh', 2),
('judgment-day', 'dominik-mysterio', 3),

('war-raiders', 'erik', 1),
('war-raiders', 'ivar', 2),

('alpha-academy', 'akira-tozawa', 1),
('alpha-academy', 'otis', 2),

('american-made', 'julius-creed', 1),
('american-made', 'brutus-creed', 2),

('a-town-down-under', 'austin-theory', 1),
('a-town-down-under', 'grayson-waller', 2),

('kabuki-warriors', 'asuka', 1),
('kabuki-warriors', 'kairi-sane', 2),

('lwo', 'cruz-del-toro', 1),
('lwo', 'dragon-lee', 2),
('lwo', 'joaquin-wilde', 3),
('lwo', 'rey-mysterio', 4),

-- SmackDown Teams
('diy', 'tommaso-ciampa', 1),
('diy', 'johnny-gargano', 2),

('motor-city-machine-guns', 'chris-sabin', 1),
('motor-city-machine-guns', 'alex-shelley', 2),

('fraxiom', 'nathan-frazer', 1),
('fraxiom', 'axiom', 2),

('pretty-deadly', 'elton-prince', 1),
('pretty-deadly', 'kit-wilson', 2),

('green-regime', 'chelsea-green', 1),

('secret-service', 'alba-fyre', 1),

('legado-del-fantasma', 'angel', 1),
('legado-del-fantasma', 'berto', 2),

('tongans', 'tama-tonga', 1),
('tongans', 'tonga-loa', 2),

('melo-dont-miz', 'carmelo-hayes', 1),
('melo-dont-miz', 'the-miz', 2),

('wyatt-sicks', 'dexter-lumis', 1),
('wyatt-sicks', 'joe-gacy', 2),

('street-profits', 'angelo-dawkins', 1),
('street-profits', 'montez-ford', 2),

-- NXT Teams
('zaruca', 'sol-ruca', 1),
('zaruca', 'zaria', 2),

-- Unassigned Teams
('usos', 'jey-uso', 1),
('usos', 'jimmy-uso', 2)
ON CONFLICT (tag_team_id, wrestler_slug) DO NOTHING; 