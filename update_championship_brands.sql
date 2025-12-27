-- Update championship brands to correct assignments
-- Women's World Championship -> RAW
-- Men's IC Championship -> RAW
-- Women's IC Championship -> RAW
-- Men's U.S. Championship -> SmackDown
-- Women's U.S. Championship -> SmackDown

UPDATE championships
SET brand = 'RAW'
WHERE title_name IN (
  'Women''s World Championship',
  'Men''s IC Championship',
  'Women''s IC Championship'
);

UPDATE championships
SET brand = 'SmackDown'
WHERE title_name IN (
  'Men''s U.S. Championship',
  'Women''s U.S. Championship'
);

