-- Update check_classification to allow Non-wrestlers and Inactive
-- Run this in Supabase SQL Editor after adding those options in the app.
-- Fixes: new row for relation "wrestlers" violates check constraint "check_classification"

ALTER TABLE wrestlers DROP CONSTRAINT IF EXISTS check_classification;
ALTER TABLE wrestlers ADD CONSTRAINT check_classification
  CHECK (classification IS NULL OR classification IN (
    'Active',
    'Part-timer',
    'Alumni',
    'Celebrity Guests',
    'Non-wrestlers',
    'Inactive'
  ));
