-- Fix Secret Service team name to Secret Hervice
UPDATE tag_teams 
SET name = 'The Secret Hervice', 
    description = 'Alba Fyre and Piper Niven'
WHERE id = 'secret-service';
