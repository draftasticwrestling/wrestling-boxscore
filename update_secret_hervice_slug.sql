-- Update Secret Service to Secret Hervice (name and description only)
-- We'll use the new ID 'secret-hervice' in the final memberships script
UPDATE tag_teams 
SET name = 'The Secret Hervice', 
    description = 'Alba Fyre and Piper Niven'
WHERE id = 'secret-service';
