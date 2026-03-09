-- Add event_lost to championship_history (event where champion lost the title)
ALTER TABLE championship_history
  ADD COLUMN IF NOT EXISTS event_lost TEXT;

COMMENT ON COLUMN championship_history.event_lost IS 'Name of event where champion lost the title';
