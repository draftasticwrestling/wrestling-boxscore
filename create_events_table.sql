-- Create the events table
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    location TEXT NOT NULL,
    matches JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Add some sample data
INSERT INTO events (id, name, date, location, matches)
VALUES (
    'raw-2025-06-09',
    'WWE Monday Night RAW',
    'June 9, 2025',
    'Capital One Arena, Washington, DC',
    '[
        {
            "order": 1,
            "participants": "Sami Zayn vs. Bronson Reed",
            "result": "Sami Zayn def. Bronson Reed",
            "method": "Pinfall",
            "time": "12:34",
            "stipulation": "WWE Intercontinental Championship",
            "titleOutcome": "Successful Defense"
        },
        {
            "order": 2,
            "participants": "Becky Lynch vs. Liv Morgan",
            "result": "Liv Morgan def. Becky Lynch",
            "method": "Pinfall",
            "time": "10:21",
            "stipulation": "Non-title Match",
            "titleOutcome": ""
        },
        {
            "order": 3,
            "participants": "Cody Rhodes & Jey Uso vs. The Judgment Day",
            "result": "Cody Rhodes & Jey Uso def. The Judgment Day",
            "method": "Pinfall",
            "time": "15:02",
            "stipulation": "Tag Team Match",
            "titleOutcome": ""
        }
    ]'::jsonb
); 