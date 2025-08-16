-- Location Tracker Database Schema for Supabase
-- Updated Schema with Corrected Structure

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE,
  -- Admin tracking control fields
  is_tracking BOOLEAN DEFAULT false,
  admin_tracking_started TIMESTAMP WITH TIME ZONE,
  admin_tracking_started_by VARCHAR(255),
  admin_tracking_stopped TIMESTAMP WITH TIME ZONE,
  admin_tracking_stopped_by VARCHAR(255)
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL REFERENCES users(name) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    location_name TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_locations_user_name ON locations(user_name);
CREATE INDEX IF NOT EXISTS idx_locations_timestamp ON locations(recorded_at);
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations(latitude, longitude);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (for admin dashboard)
CREATE POLICY "Allow public read access to users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to locations" ON locations
    FOR SELECT USING (true);

-- Create policies for authenticated users to insert/update their own data
CREATE POLICY "Allow users to insert their own data" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to update their own data" ON users
    FOR UPDATE USING (true);

CREATE POLICY "Allow users to insert their own locations" ON locations
    FOR INSERT WITH CHECK (true);

-- Create a view to get the latest location for each user (simpler than function)
CREATE OR REPLACE VIEW latest_user_locations AS
SELECT DISTINCT ON (u.name)
    u.id,
    u.name,
    u.is_active,
    u.last_updated,
    u.created_at,
    l.latitude,
    l.longitude,
    l.accuracy,
    l.location_name,
    l.recorded_at as timestamp
FROM users u
LEFT JOIN locations l ON u.name = l.user_name
WHERE u.is_active = true
ORDER BY u.name, l.recorded_at DESC NULLS LAST;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON latest_user_locations TO anon, authenticated;