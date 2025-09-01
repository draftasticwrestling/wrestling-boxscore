-- Fix missing wrestler image URLs
-- Update wrestlers that have image files but missing image_url in database

UPDATE wrestlers 
SET image_url = '/images/jelly-roll.jpeg'
WHERE id = 'jelly-roll' AND (image_url IS NULL OR image_url = '');

UPDATE wrestlers 
SET image_url = '/images/mr-iguana.png'
WHERE id = 'mr-iguana' AND (image_url IS NULL OR image_url = '');

UPDATE wrestlers 
SET image_url = '/images/psycho-clown.png'
WHERE id = 'psycho-clown' AND (image_url IS NULL OR image_url = '');

-- Verify the updates
SELECT id, name, image_url 
FROM wrestlers 
WHERE id IN ('jelly-roll', 'mr-iguana', 'psycho-clown');
