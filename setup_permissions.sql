-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for authenticated and anonymous users
CREATE POLICY "Allow all operations for all users" ON events
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON events TO anon;
GRANT ALL ON events TO authenticated; 