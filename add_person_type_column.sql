-- Person type: Wrestler (full profile) vs GM, Manager, Announcer (simplified profile for promos/rare matches)
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS person_type TEXT DEFAULT 'Wrestler';

COMMENT ON COLUMN wrestlers.person_type IS 'Wrestler (default, full profile) | Head of Creative | GM | Manager | Announcer (simplified profile, used in promos and rarely in matches).';

-- Optional: constrain to known values (PostgreSQL)
-- ALTER TABLE wrestlers ADD CONSTRAINT wrestlers_person_type_check
--   CHECK (person_type IS NULL OR person_type IN ('Wrestler', 'GM', 'Manager', 'Announcer'));
