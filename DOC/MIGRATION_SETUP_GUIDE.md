# Database Migration Setup Guide

This guide will help you set up the database tables, triggers, and RLS policies for SaloneFix.

## ✅ Migration Script Status

All migration scripts have been updated to be **idempotent** (safe to run multiple times):
- ✅ All triggers use `DROP TRIGGER IF EXISTS` before creation
- ✅ All policies use `DROP POLICY IF EXISTS` before creation
- ✅ All tables use `CREATE TABLE IF NOT EXISTS`
- ✅ All indexes use `CREATE INDEX IF NOT EXISTS`
- ✅ All functions use `CREATE OR REPLACE FUNCTION`

## 📋 Setup Order

Run these scripts in order in your Supabase SQL Editor:

### Step 1: Basic Database Schema
**File:** `DOC/database_migration.sql`
- Adds optional columns to the `reports` table:
  - `reporter_id` (for authenticated users)
  - `device_id` (for anonymous users)
  - `assigned_to` (for team assignment)
  - `resolved_at` (for resolution tracking)
  - `priority` (for priority management)
- Creates `report_notes` table (for admin comments)

**Run this first if you haven't already.**

### Step 2: Admin Features (Tables, Functions, Triggers)
**File:** `DOC/admin_features_migration.sql`
- Creates `notifications` table
- Creates `activity_log` table
- Creates `teams` table
- Creates database functions for triggers
- Creates triggers for automatic notifications and team job counts
- Inserts default teams

**⚠️ Important:** This script is now fixed to handle existing triggers. It's safe to run even if you've run it before.

### Step 3: Row Level Security Policies
**File:** `DOC/RLS_POLICIES_SETUP.sql`
- Enables RLS on all tables
- Creates policies for public access (read/write)
- Creates policies for notifications (user-specific)
- Creates policies for activity logs
- Creates policies for teams

**⚠️ Important:** Run this **AFTER** running the admin features migration, as it references the tables created in Step 2.

## 🔍 Verification Queries

After running the migrations, verify everything was created correctly:

### Check Tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('reports', 'notifications', 'activity_log', 'teams', 'report_notes')
ORDER BY table_name;
```

### Check Triggers
```sql
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('reports', 'teams')
ORDER BY event_object_table, trigger_name;
```

### Check RLS Policies
```sql
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('reports', 'notifications', 'activity_log', 'teams')
ORDER BY tablename, policyname;
```

### Check Functions
```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_teams_updated_at',
    'update_team_active_jobs',
    'create_notification_on_status_change',
    'create_notification_on_team_assignment'
  )
ORDER BY routine_name;
```

## 🐛 Troubleshooting

### Error: "trigger already exists"
**Solution:** This has been fixed! The migration script now uses `DROP TRIGGER IF EXISTS` before creating triggers. If you still see this error, make sure you're running the latest version of `admin_features_migration.sql`.

### Error: "relation does not exist"
**Solution:** Make sure you've run the migrations in the correct order:
1. First: `database_migration.sql` (creates base schema)
2. Second: `admin_features_migration.sql` (creates new tables)
3. Third: `RLS_POLICIES_SETUP.sql` (creates policies on those tables)

### Error: "permission denied" or RLS policy errors
**Solution:** Run `RLS_POLICIES_SETUP.sql` to set up the necessary policies. The notification creation will fail if RLS policies aren't set up correctly.

### Notifications still not working
1. **Check if table exists:**
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_name = 'notifications'
   );
   ```

2. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'notifications';
   ```
   You should see a policy named "Allow system to create notifications" with `WITH CHECK (true)`.

3. **Check triggers:**
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE event_object_table = 'reports' 
     AND trigger_name LIKE '%notification%';
   ```

## 📝 Quick Setup Checklist

- [ ] Run `DOC/database_migration.sql`
- [ ] Run `DOC/admin_features_migration.sql`
- [ ] Run `DOC/RLS_POLICIES_SETUP.sql`
- [ ] Verify tables exist (use verification queries above)
- [ ] Verify triggers exist
- [ ] Verify RLS policies exist
- [ ] Test notification creation by updating a report status

## 🔄 Re-running Migrations

All scripts are now **idempotent** - you can safely run them multiple times:
- Tables won't be recreated if they exist
- Triggers will be dropped and recreated (safe)
- Policies will be dropped and recreated (safe)
- Functions will be replaced (safe)
- Default teams will only be inserted if they don't exist (ON CONFLICT DO NOTHING)

## 🎯 Expected Result

After completing all migrations, you should have:
- ✅ `notifications` table with proper schema and indexes
- ✅ `activity_log` table with proper schema and indexes
- ✅ `teams` table with 5 default teams
- ✅ 4 database triggers working correctly
- ✅ RLS policies allowing public read/write where needed
- ✅ RLS policies allowing notification creation from application

---

**Last Updated:** After fixing trigger creation issues
**Status:** ✅ Ready to run - All scripts are idempotent

