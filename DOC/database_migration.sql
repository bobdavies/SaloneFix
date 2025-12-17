-- Optional Database Migration Script
-- Run this in your Supabase SQL Editor if you want to enable:
-- 1. User tracking (reporter_id for authenticated users)
-- 2. Anonymous user tracking (device_id for anonymous users)
-- 3. Team assignment (assigned_to)
-- 4. Resolution tracking (resolved_at)

-- Add reporter_id column (for authenticated user tracking)
-- This allows tracking which user submitted each report
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'reporter_id'
  ) THEN
    ALTER TABLE reports ADD COLUMN reporter_id UUID;
    COMMENT ON COLUMN reports.reporter_id IS 'UUID of authenticated user who submitted the report';
  END IF;
END $$;

-- Add device_id column (for anonymous user tracking)
-- This allows tracking reports from anonymous users via device ID
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'device_id'
  ) THEN
    ALTER TABLE reports ADD COLUMN device_id TEXT;
    COMMENT ON COLUMN reports.device_id IS 'Device ID for anonymous user tracking (stored in localStorage)';
  END IF;
END $$;

-- Add assigned_to column (for team assignment)
-- This allows assigning reports to specific teams
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE reports ADD COLUMN assigned_to TEXT;
    COMMENT ON COLUMN reports.assigned_to IS 'Name of team assigned to handle this report';
  END IF;
END $$;

-- Add resolved_at column (for resolution timestamp)
-- This tracks when a report was resolved
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE reports ADD COLUMN resolved_at TIMESTAMPTZ;
    COMMENT ON COLUMN reports.resolved_at IS 'Timestamp when the report was resolved';
  END IF;
END $$;

-- Optional: Create index on reporter_id for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);

-- Optional: Create index on device_id for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_device_id ON reports(device_id);

-- Optional: Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Optional: Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Add priority column (for priority management)
-- This allows auto-calculating and manually setting report priority
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'priority'
  ) THEN
    ALTER TABLE reports ADD COLUMN priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low'));
    COMMENT ON COLUMN reports.priority IS 'Auto-calculated or manually set priority level';
  END IF;
END $$;

-- Create report_notes table (for admin comments/notes)
CREATE TABLE IF NOT EXISTS report_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID, -- References auth.users(id) if authenticated
  author_name TEXT NOT NULL DEFAULT 'Admin', -- Fallback if no auth user
  is_public BOOLEAN DEFAULT FALSE, -- If true, visible to reporter
  mentions TEXT[], -- Array of mentioned user IDs or team names
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on report_id for faster queries
CREATE INDEX IF NOT EXISTS idx_report_notes_report_id ON report_notes(report_id);
CREATE INDEX IF NOT EXISTS idx_report_notes_created_at ON report_notes(created_at DESC);

-- Create index on priority for faster filtering
CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority);

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reports'
ORDER BY ordinal_position;







