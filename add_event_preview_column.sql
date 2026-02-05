-- Add a preview column to events so we can store
-- short teaser text for upcoming/live shows.
-- Safe to run multiple times because of IF NOT EXISTS.

ALTER TABLE events
ADD COLUMN IF NOT EXISTS preview TEXT;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS recap TEXT;

