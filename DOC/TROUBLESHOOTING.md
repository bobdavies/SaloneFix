# Troubleshooting Guide - Admin Actions Not Working

## Quick Diagnosis

If admin actions (status updates, team assignments) are not working, follow these steps:

### Step 1: Check Database Columns

Run this in Supabase SQL Editor to verify columns exist:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reports'
AND column_name IN ('status', 'assigned_to', 'resolved_at')
ORDER BY column_name;
```

**Expected Result:**
- `status` (text, not null)
- `assigned_to` (text, nullable) - Optional but recommended
- `resolved_at` (timestamptz, nullable) - Optional but recommended

**If columns are missing:**
Run `DOC/database_migration.sql` to add them.

### Step 2: Check RLS Policies

Run this in Supabase SQL Editor to check RLS status:

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'reports';
```

**If no policies exist or updates are blocked:**
Run `DOC/RLS_POLICIES_SETUP.sql` to create permissive policies.

### Step 3: Test Database Access

In the admin dashboard, click the "Test DB" button in the header. Check the browser console for results.

**Expected Output:**
```
🔍 Database Access Test Results: {
  canRead: true,
  canUpdate: true,
  canAssign: true,
  errors: []
}
```

**If any are false:**
- Check RLS policies (Step 2)
- Verify you're using the correct Supabase credentials
- Check browser console for detailed error messages

### Step 4: Check Browser Console

Open browser DevTools (F12) and look for:
- `[updateReportStatus]` logs
- `[assignTeamToReport]` logs
- `[handleStatusChange]` logs
- `[handleTeamAssigned]` logs

**Common Error Messages:**

1. **"Permission denied" or "policy"**
   - **Solution:** Run `DOC/RLS_POLICIES_SETUP.sql`

2. **"column does not exist"**
   - **Solution:** Run `DOC/database_migration.sql`

3. **"Cannot coerce the result to a single JSON object"**
   - **Solution:** This is handled automatically now, but if it persists, check database triggers

4. **"Failed to update status"**
   - **Solution:** Check RLS policies and ensure you have UPDATE permissions

## Common Issues and Solutions

### Issue 1: Updates Return Success But Don't Persist

**Symptoms:**
- No error messages
- UI updates temporarily
- Changes revert after refresh

**Cause:** RLS policies blocking updates

**Solution:**
```sql
-- Run this in Supabase SQL Editor
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public update access to reports" ON reports;
CREATE POLICY "Allow public update access to reports"
  ON reports
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
```

### Issue 2: Team Assignment Returns null

**Symptoms:**
- Team assignment appears to work
- Verification shows `assigned_to` is null

**Cause:** 
- `assigned_to` column doesn't exist
- RLS policy blocking updates
- Database trigger interfering

**Solution:**
1. Add the column:
```sql
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_to TEXT;
```

2. Check RLS policies (see Issue 1)

3. Check for triggers:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'reports';
```

### Issue 3: Status Updates Fail Silently

**Symptoms:**
- Click status button
- No error shown
- Status doesn't change

**Cause:** RLS policies or missing permissions

**Solution:**
1. Run RLS setup script
2. Check browser console for detailed errors
3. Verify Supabase credentials in `.env.local`

## Database Setup Checklist

- [ ] Run `DOC/database_migration.sql` (adds optional columns)
- [ ] Run `DOC/admin_features_migration.sql` (adds notifications, activity_log, teams tables)
- [ ] Run `DOC/RLS_POLICIES_SETUP.sql` (enables updates)
- [ ] Verify columns exist (Step 1 above)
- [ ] Verify RLS policies exist (Step 2 above)
- [ ] Test database access (Step 3 above)

## Testing Admin Actions

1. **Open Admin Dashboard**
2. **Click "Test DB" button** - Should show all green checkmarks
3. **Try changing a report status** - Should work without errors
4. **Try assigning a team** - Should work without errors
5. **Check browser console** - Should see success logs

## Still Not Working?

1. **Check Supabase Dashboard:**
   - Go to Table Editor → reports
   - Try manually updating a row
   - If that fails, it's an RLS issue

2. **Check Environment Variables:**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
   - Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct

3. **Check Network Tab:**
   - Open DevTools → Network
   - Try an admin action
   - Look for failed requests to Supabase
   - Check response for error details

4. **Enable Detailed Logging:**
   - All functions now log with `[functionName]` prefix
   - Check console for detailed execution flow

## Emergency Workaround

If nothing works, you can temporarily disable RLS (NOT RECOMMENDED FOR PRODUCTION):

```sql
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
```

**⚠️ WARNING:** Only use this for testing. Re-enable RLS before production deployment.
