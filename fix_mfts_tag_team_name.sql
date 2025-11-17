-- Fix The MFTs tag team name for JC Mateo & Tama Tonga
-- Run this after the initial update_tag_teams_nov_2025.sql

-- Update the tag_teams table entry
UPDATE tag_teams 
SET name = 'The MFTs'
WHERE id = 'jc-mateo-tama-tonga';

-- Update wrestlers table to use "The MFTs" as the tag team name
UPDATE wrestlers 
SET tag_team_name = 'The MFTs'
WHERE id IN ('jc-mateo', 'tama-tonga');

-- Verify the update
SELECT 
    id,
    name,
    tag_team_id,
    tag_team_name,
    tag_team_partner_slug
FROM wrestlers
WHERE id IN ('jc-mateo', 'tama-tonga');

