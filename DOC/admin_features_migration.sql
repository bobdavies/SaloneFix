-- Admin Features Database Migration Script
-- Run this in your Supabase SQL Editor to enable:
-- 1. Notifications table (for sending notifications to users)
-- 2. Activity log table (for tracking all admin actions)
-- 3. Teams table (for managing response teams)

-- ============================================
-- 1. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID, -- For authenticated users (reporter_id)
  device_id TEXT, -- For anonymous users
  type TEXT NOT NULL DEFAULT 'status-change', -- 'status-change', 'team-assigned', 'comment', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT, -- Current report status
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT notifications_user_or_device CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_report_id ON notifications(report_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_device_id ON notifications(device_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- 2. ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'status-changed', 'team-assigned', 'comment-added', etc.
  performed_by TEXT NOT NULL, -- Admin username or team name
  performed_by_type TEXT DEFAULT 'admin', -- 'admin', 'team', 'system'
  details TEXT, -- Additional details about the action
  metadata JSONB, -- Flexible JSON for storing additional data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity log
CREATE INDEX IF NOT EXISTS idx_activity_log_report_id ON activity_log(report_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);

-- ============================================
-- 3. TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  description TEXT,
  members_count INTEGER DEFAULT 0,
  active_jobs_count INTEGER DEFAULT 0,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for teams
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

-- ============================================
-- 4. INSERT DEFAULT TEAMS
-- ============================================
INSERT INTO teams (name, department, description, members_count, active_jobs_count) VALUES
  ('Roads Team Alpha', 'Public Works', 'Handles road repairs, potholes, and infrastructure issues', 8, 0),
  ('Sanitation Unit B', 'Environment', 'Manages waste collection and sanitation issues', 12, 0),
  ('GUMA Valley Team', 'Water Services', 'Handles water supply and drainage problems', 6, 0),
  ('Electrical Response', 'EDSA', 'Addresses electrical issues and street lighting', 10, 0),
  ('Emergency Response', 'City Council', 'Handles urgent and emergency situations', 15, 0)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 5. FUNCTION TO UPDATE TEAM ACTIVE JOBS COUNT
-- ============================================
CREATE OR REPLACE FUNCTION update_team_active_jobs()
RETURNS TRIGGER AS $$
BEGIN
  -- Update active jobs count when a report is assigned/unassigned
  IF TG_OP = 'UPDATE' THEN
    -- If assigned_to changed
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      -- Decrease count for old team
      IF OLD.assigned_to IS NOT NULL THEN
        UPDATE teams 
        SET active_jobs_count = GREATEST(0, active_jobs_count - 1)
        WHERE name = OLD.assigned_to AND status = 'In Progress';
      END IF;
      
      -- Increase count for new team
      IF NEW.assigned_to IS NOT NULL THEN
        UPDATE teams 
        SET active_jobs_count = active_jobs_count + 1
        WHERE name = NEW.assigned_to;
      END IF;
    END IF;
    
    -- If status changed to resolved, decrease count
    IF OLD.status != 'Resolved' AND NEW.status = 'Resolved' AND NEW.assigned_to IS NOT NULL THEN
      UPDATE teams 
      SET active_jobs_count = GREATEST(0, active_jobs_count - 1)
      WHERE name = NEW.assigned_to;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update team active jobs count
DROP TRIGGER IF EXISTS update_team_active_jobs_trigger ON reports;
CREATE TRIGGER update_team_active_jobs_trigger
  AFTER UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_team_active_jobs();

-- ============================================
-- 6. FUNCTION TO CREATE NOTIFICATION ON STATUS CHANGE
-- ============================================
CREATE OR REPLACE FUNCTION create_notification_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  report_user_id UUID;
  report_device_id TEXT;
BEGIN
  -- Only create notification if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get user_id or device_id from the report
    report_user_id := NEW.reporter_id;
    report_device_id := NEW.device_id;
    
    -- Determine notification title and message based on status change
    IF NEW.status = 'In Progress' THEN
      notification_title := 'Report In Progress';
      notification_message := 'Your report has been assigned and work has begun.';
    ELSIF NEW.status = 'Resolved' THEN
      notification_title := 'Report Resolved';
      notification_message := 'Your report has been successfully resolved!';
    ELSE
      notification_title := 'Report Status Updated';
      notification_message := 'The status of your report has been updated.';
    END IF;
    
    -- Create notification if we have a user_id or device_id
    IF report_user_id IS NOT NULL OR report_device_id IS NOT NULL THEN
      INSERT INTO notifications (report_id, user_id, device_id, type, title, message, status)
      VALUES (NEW.id, report_user_id, report_device_id, 'status-change', notification_title, notification_message, NEW.status);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notification on status change
DROP TRIGGER IF EXISTS create_notification_on_status_change_trigger ON reports;
CREATE TRIGGER create_notification_on_status_change_trigger
  AFTER UPDATE ON reports
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION create_notification_on_status_change();

-- ============================================
-- 7. FUNCTION TO CREATE NOTIFICATION ON TEAM ASSIGNMENT
-- ============================================
CREATE OR REPLACE FUNCTION create_notification_on_team_assignment()
RETURNS TRIGGER AS $$
DECLARE
  report_user_id UUID;
  report_device_id TEXT;
BEGIN
  -- Only create notification if team assignment changed
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    -- Get user_id or device_id from the report
    report_user_id := NEW.reporter_id;
    report_device_id := NEW.device_id;
    
    -- Create notification if we have a user_id or device_id
    IF report_user_id IS NOT NULL OR report_device_id IS NOT NULL THEN
      INSERT INTO notifications (report_id, user_id, device_id, type, title, message, status)
      VALUES (
        NEW.id, 
        report_user_id, 
        report_device_id, 
        'team-assigned', 
        'Team Assigned to Your Report',
        'A team (' || NEW.assigned_to || ') has been assigned to handle your report.',
        NEW.status
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notification on team assignment
DROP TRIGGER IF EXISTS create_notification_on_team_assignment_trigger ON reports;
CREATE TRIGGER create_notification_on_team_assignment_trigger
  AFTER UPDATE ON reports
  FOR EACH ROW
  WHEN (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL)
  EXECUTE FUNCTION create_notification_on_team_assignment();

-- ============================================
-- 8. VERIFY TABLES WERE CREATED
-- ============================================
SELECT 'notifications' as table_name, COUNT(*) as row_count FROM notifications
UNION ALL
SELECT 'activity_log' as table_name, COUNT(*) as row_count FROM activity_log
UNION ALL
SELECT 'teams' as table_name, COUNT(*) as row_count FROM teams;
