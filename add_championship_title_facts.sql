-- Add optional title facts / trivia for championship detail page
ALTER TABLE championships
ADD COLUMN IF NOT EXISTS title_facts TEXT;

COMMENT ON COLUMN championships.title_facts IS 'Optional freeform text: interesting facts, trivia, or notes about this championship.';
