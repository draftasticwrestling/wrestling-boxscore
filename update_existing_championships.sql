-- Script to update existing championship records with correct previous_champion names
-- This script fixes "Unknown" entries by looking up names from existing slugs
-- Run this AFTER applying the updated create_championships_schema.sql

-- First, let's see what needs to be fixed
SELECT 
  id,
  title_name,
  current_champion,
  previous_champion,
  previous_champion_slug,
  event_id
FROM championships
WHERE (previous_champion = 'Unknown' OR previous_champion IS NULL OR previous_champion = '')
  AND previous_champion_slug IS NOT NULL 
  AND previous_champion_slug != 'unknown'
  AND previous_champion_slug != 'vacant'
ORDER BY title_name;

-- Fix records where previous_champion_slug exists and maps to a wrestler
UPDATE championships 
SET previous_champion = (SELECT name FROM wrestlers WHERE id = championships.previous_champion_slug)
WHERE (previous_champion = 'Unknown' OR previous_champion IS NULL OR previous_champion = '')
  AND previous_champion_slug IS NOT NULL 
  AND previous_champion_slug != 'unknown'
  AND previous_champion_slug != 'vacant'
  AND EXISTS (SELECT 1 FROM wrestlers WHERE id = championships.previous_champion_slug);

-- Fix records where previous_champion_slug exists and maps to a tag team
UPDATE championships 
SET previous_champion = (SELECT name FROM tag_teams WHERE id = championships.previous_champion_slug)
WHERE (previous_champion = 'Unknown' OR previous_champion IS NULL OR previous_champion = '')
  AND previous_champion_slug IS NOT NULL 
  AND previous_champion_slug != 'unknown'
  AND previous_champion_slug != 'vacant'
  AND NOT EXISTS (SELECT 1 FROM wrestlers WHERE id = championships.previous_champion_slug)
  AND EXISTS (SELECT 1 FROM tag_teams WHERE id = championships.previous_champion_slug);

-- Verify the fixes
SELECT 
  id,
  title_name,
  current_champion,
  previous_champion,
  previous_champion_slug,
  event_id
FROM championships
WHERE previous_champion_slug IS NOT NULL 
  AND previous_champion_slug != 'unknown'
  AND previous_champion_slug != 'vacant'
ORDER BY title_name;

