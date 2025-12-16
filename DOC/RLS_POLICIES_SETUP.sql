-- Row Level Security (RLS) Policies for SaloneFix
-- Run this in your Supabase SQL Editor to enable admin updates
-- IMPORTANT: These policies allow public read/write access for the hackathon
-- In production, you should restrict access based on user roles

-- ============================================
-- 1. ENABLE RLS ON REPORTS TABLE
-- ============================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. POLICY: Allow anyone to read reports (public access)
-- ============================================
DROP POLICY IF EXISTS "Allow public read access to reports" ON reports;
CREATE POLICY "Allow public read access to reports"
  ON reports
  FOR SELECT
  USING (true);

-- ============================================
-- 3. POLICY: Allow anyone to insert reports (public reporting)
-- ============================================
DROP POLICY IF EXISTS "Allow public insert access to reports" ON reports;
CREATE POLICY "Allow public insert access to reports"
  ON reports
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 4. POLICY: Allow anyone to update reports (for admin actions)
-- ============================================
DROP POLICY IF EXISTS "Allow public update access to reports" ON reports;
CREATE POLICY "Allow public update access to reports"
  ON reports
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 5. POLICY: Allow anyone to delete reports (for admin cleanup)
-- ============================================
DROP POLICY IF EXISTS "Allow public delete access to reports" ON reports;
CREATE POLICY "Allow public delete access to reports"
  ON reports
  FOR DELETE
  USING (true);

-- ============================================
-- 6. ENABLE RLS ON NOTIFICATIONS TABLE
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to read their own notifications
DROP POLICY IF EXISTS "Allow users to read their own notifications" ON notifications;
CREATE POLICY "Allow users to read their own notifications"
  ON notifications
  FOR SELECT
  USING (
    auth.uid()::text = user_id::text 
    OR device_id = current_setting('app.device_id', true)
  );

-- Policy: Allow system to create notifications
DROP POLICY IF EXISTS "Allow system to create notifications" ON notifications;
CREATE POLICY "Allow system to create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow users to update their own notifications
DROP POLICY IF EXISTS "Allow users to update their own notifications" ON notifications;
CREATE POLICY "Allow users to update their own notifications"
  ON notifications
  FOR UPDATE
  USING (
    auth.uid()::text = user_id::text 
    OR device_id = current_setting('app.device_id', true)
  );

-- ============================================
-- 7. ENABLE RLS ON ACTIVITY_LOG TABLE
-- ============================================
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to activity logs
DROP POLICY IF EXISTS "Allow public read access to activity_log" ON activity_log;
CREATE POLICY "Allow public read access to activity_log"
  ON activity_log
  FOR SELECT
  USING (true);

-- Policy: Allow system to create activity logs
DROP POLICY IF EXISTS "Allow system to create activity_log" ON activity_log;
CREATE POLICY "Allow system to create activity_log"
  ON activity_log
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 8. ENABLE RLS ON TEAMS TABLE
-- ============================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to teams
DROP POLICY IF EXISTS "Allow public read access to teams" ON teams;
CREATE POLICY "Allow public read access to teams"
  ON teams
  FOR SELECT
  USING (true);

-- Policy: Allow system to manage teams (for admin)
DROP POLICY IF EXISTS "Allow system to manage teams" ON teams;
CREATE POLICY "Allow system to manage teams"
  ON teams
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VERIFY POLICIES
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('reports', 'notifications', 'activity_log', 'teams')
ORDER BY tablename, policyname;
