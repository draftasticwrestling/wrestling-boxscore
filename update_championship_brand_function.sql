-- Update the title_to_brand function with correct brand assignments
-- This will ensure future championship changes get the correct brand

CREATE OR REPLACE FUNCTION title_to_brand(title_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN title_name LIKE '%Raw%' 
         OR title_name = 'World Heavyweight Championship'
         OR title_name = 'Women''s World Championship'
         OR title_name = 'Men''s IC Championship'
         OR title_name = 'Women''s IC Championship' THEN 'RAW'
    WHEN title_name LIKE '%SmackDown%' 
         OR title_name = 'WWE Women''s Championship' 
         OR title_name = 'Undisputed WWE Championship'
         OR title_name = 'Men''s U.S. Championship'
         OR title_name = 'Women''s U.S. Championship' THEN 'SmackDown'
    WHEN title_name LIKE '%Speed%' THEN 'NXT'
    WHEN title_name LIKE '%Tag Team%' AND title_name NOT LIKE '%Raw%' AND title_name NOT LIKE '%SmackDown%' THEN 'Unassigned'
    ELSE 'Unassigned'
  END;
END;
$$ LANGUAGE plpgsql;

