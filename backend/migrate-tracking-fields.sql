-- Migration script to add admin tracking control fields
-- Run this in your Supabase SQL editor

-- Add new tracking fields to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_tracking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_tracking_started TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_tracking_started_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_tracking_stopped TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_tracking_stopped_by VARCHAR(255);

-- Create index for better performance on tracking queries
CREATE INDEX IF NOT EXISTS idx_users_tracking ON users(is_tracking) WHERE is_active = true;

-- Update existing users to have tracking disabled by default
UPDATE users SET is_tracking = false WHERE is_tracking IS NULL;

-- Verify the changes
SELECT 
  name, 
  is_active, 
  is_tracking, 
  admin_tracking_started, 
  admin_tracking_started_by
FROM users 
LIMIT 5;

-- Check if the new columns were added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('is_tracking', 'admin_tracking_started', 'admin_tracking_started_by', 'admin_tracking_stopped', 'admin_tracking_stopped_by')
ORDER BY column_name;
