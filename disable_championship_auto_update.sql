-- Disable automatic championship updates from events.
-- Run this in the Supabase SQL editor if you want championships to be updated
-- only via Title History (+ Add reign / Edit reign) or Edit Championship.
-- Events (and match result edits) will no longer change the championships table.

ALTER TABLE events DISABLE TRIGGER trigger_process_championships;
