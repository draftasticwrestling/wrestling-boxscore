-- Migration script to insert initial champions data
-- This migrates the current hardcoded champions from ChampionshipsPage.jsx to the database

INSERT INTO championships (id, title_name, current_champion, current_champion_slug, previous_champion, previous_champion_slug, date_won, event_name, brand, type) VALUES
('wwe-championship', 'WWE Championship', 'Cody Rhodes', 'cody-rhodes', 'John Cena', 'john-cena', '2025-08-03', 'Summer Slam Night 2', 'SmackDown', 'World'),
('world-heavyweight-championship', 'World Heavyweight Championship', 'Seth Rollins', 'seth-rollins', 'CM Punk', 'cm-punk', '2025-08-02', 'Summer Slam Night 1', 'RAW', 'World'),
('mens-us-championship', 'Men''s United States Championship', 'Sami Zayn', 'sami-zayn', 'Solo Sikoa', 'solo-sikoa', '2025-08-29', 'SmackDown', 'SmackDown', 'Secondary'),
('mens-ic-championship', 'Men''s Intercontinental Championship', 'Dominik Mysterio', 'dominik-mysterio', 'Bron Breakker', 'bron-breakker', '2025-04-20', 'Wrestlemania Night 2', 'RAW', 'Secondary'),
('raw-tag-team-championship', 'RAW Tag Team Championship', 'The Judgment Day (Finn Balor & JD McDonagh)', 'the-judgment-day', 'The New Day (Kofi Kingston & Xavier Woods)', 'the-new-day', '2025-06-30', 'RAW', 'RAW', 'Tag Team'),
('smackdown-tag-team-championship', 'SmackDown Tag Team Championship', 'The Wyatt Sicks (Joe Gacy & Dexter Lumis)', 'the-wyatt-sicks', 'The Street Profits (Angelo Dawkins & Montez Ford)', 'the-street-profits', '2025-07-11', 'SmackDown', 'SmackDown', 'Tag Team'),
('wwe-womens-championship', 'WWE Women''s Championship', 'Tiffany Stratton', 'tiffany-stratton', 'Nia Jax', 'nia-jax', '2025-01-03', 'SmackDown', 'SmackDown', 'World'),
('womens-world-championship', 'Women''s World Championship', 'VACANT', 'vacant', 'Naomi', 'naomi', '2025-08-18', 'RAW', 'RAW', 'World'),
('womens-ic-championship', 'Women''s Intercontinental Championship', 'Becky Lynch', 'becky-lynch', 'Lyra Valkyria', 'lyra-valkyria', '2025-06-07', 'Money in the Bank', 'RAW', 'Secondary'),
('womens-us-championship', 'Women''s United States Championship', 'Giulia', 'giulia', 'Zelina Vega', 'zelina-vega', '2025-06-27', 'SmackDown', 'SmackDown', 'Secondary'),
('womens-tag-team-championship', 'Women''s Tag Team Championship', 'Charlotte Flair & Alexa Bliss', 'charlotte-flair-alexa-bliss', 'The Judgment Day (Roxanne Perez & Raquel Rodriguez)', 'the-judgment-day', '2025-08-02', 'Summer Slam Night 1', 'Unassigned', 'Tag Team')
ON CONFLICT (id) DO UPDATE SET
  current_champion = EXCLUDED.current_champion,
  current_champion_slug = EXCLUDED.current_champion_slug,
  previous_champion = EXCLUDED.previous_champion,
  previous_champion_slug = EXCLUDED.previous_champion_slug,
  date_won = EXCLUDED.date_won,
  event_name = EXCLUDED.event_name,
  brand = EXCLUDED.brand,
  type = EXCLUDED.type,
  updated_at = NOW();

