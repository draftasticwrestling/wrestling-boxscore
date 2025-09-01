-- Check current wrestler image status
-- Look for wrestlers that might be missing images

-- Check if these specific wrestlers exist
SELECT id, name, image_url, brand 
FROM wrestlers 
WHERE id IN ('jelly-roll', 'mr-iguana', 'psycho-clown')
ORDER BY id;

-- Check all wrestlers with missing or empty image_url
SELECT id, name, image_url, brand 
FROM wrestlers 
WHERE image_url IS NULL OR image_url = '' OR image_url = '/images/placeholder.png'
ORDER BY name;

-- Count total wrestlers vs wrestlers with images
SELECT 
  COUNT(*) as total_wrestlers,
  COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' AND image_url != '/images/placeholder.png' THEN 1 END) as wrestlers_with_images,
  COUNT(CASE WHEN image_url IS NULL OR image_url = '' OR image_url = '/images/placeholder.png' THEN 1 END) as wrestlers_without_images
FROM wrestlers;
