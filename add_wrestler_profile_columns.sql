-- Wrestler profile page: full-body image, accomplishments, and profile fields

-- Full-body image URL (displayed on wrestler profile page)
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS full_body_image_url TEXT;

-- Editable accomplishments (bullet list or free text for profile)
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS accomplishments TEXT;

-- Profile info: nickname, hometown and physical stats
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS billed_from TEXT;
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS height TEXT;
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS weight TEXT;

COMMENT ON COLUMN wrestlers.full_body_image_url IS 'Optional full-body image URL for wrestler profile page.';
COMMENT ON COLUMN wrestlers.accomplishments IS 'Editable accomplishments/career highlights for profile (plain text or line-separated).';
COMMENT ON COLUMN wrestlers.nickname IS 'Wrestler nickname or moniker (e.g., The American Nightmare), displayed under name on profile.';
COMMENT ON COLUMN wrestlers.billed_from IS 'Billed hometown / billed from (e.g., Atlanta, Georgia).';
COMMENT ON COLUMN wrestlers.height IS 'Billed height (e.g., 6ft 2in).';
COMMENT ON COLUMN wrestlers.weight IS 'Billed weight (e.g., 200 lbs).';
