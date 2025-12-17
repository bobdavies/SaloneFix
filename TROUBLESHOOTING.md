# Troubleshooting Guide: Admin Actions Not Persisting

## Quick Diagnostic Steps

### 1. Check Browser Console

Open browser console (F12) and look for these logs when you change a report status:

**Expected logs:**
```
🔄 Updating report [id] status: pending → in-progress (DB: In Progress)
✅ Status updated and verified: {reportId: '...', status: 'In Progress'}
✅ Report status updated successfully in database. Real-time subscription will update UI.
📡 Reports subscription status: SUBSCRIBED
🔄 Report updated via real-time: [id] Status: in-progress
```

**If you see errors:**
- `Failed to update status` → Database connection issue
- `Status update verification failed` → Database update didn't work
- `CHANNEL_ERROR` → Real-time not enabled

### 2. Verify Database Update Actually Happened

Run this query in Supabase SQL Editor:

```sql
SELECT id, status, assigned_to, updated_at 
FROM reports 
WHERE id = 'YOUR_REPORT_ID'
ORDER BY created_at DESC;
```

Replace `YOUR_REPORT_ID` with the actual report ID from the console logs.

**Expected:** The `status` column should show the updated value (`In Progress` or `Resolved`).

### 3. Check Real-time Subscription

In browser console, you should see:
```
📡 Reports subscription status: SUBSCRIBED
✅ Successfully subscribed to reports changes (real-time enabled)
```

If you see `CHANNEL_ERROR` or `TIMED_OUT`, real-time is not working.

### 4. Test Database Update Directly

Run this in Supabase SQL Editor to manually update a report:

```sql
UPDATE reports 
SET status = 'In Progress' 
WHERE id = 'YOUR_REPORT_ID'
RETURNING id, status;
```

Then check if:
1. The update succeeds
2. The admin panel shows the change (without refresh)
3. The citizen portal shows a notification

## Common Issues and Fixes

### Issue: Status reverts after refresh

**Cause:** Database update not actually happening

**Fix:**
1. Check browser console for errors
2. Verify database columns exist (run migration script)
3. Check Supabase project settings for RLS (Row Level Security) policies
4. Ensure you have UPDATE permissions on the reports table

### Issue: Real-time updates not working

**Cause:** Realtime not enabled or subscription failed

**Fix:**
1. Go to Supabase Dashboard → Database → Replication
2. Find `reports` table
3. Toggle Realtime ON
4. Ensure all events are enabled (INSERT, UPDATE, DELETE)
5. Refresh the page and check console for subscription status

### Issue: Notifications not appearing

**Cause:** Notification hook not detecting changes

**Fix:**
1. Check console for: `🔔 Status change detected`
2. Verify `myReports` array is updating (check console logs)
3. Ensure device_id is being tracked (check localStorage for `salonefix_device_id`)
4. Check that the report belongs to the current device/user

### Issue: Team assignment not persisting

**Cause:** `assigned_to` column doesn't exist

**Fix:**
1. Run the migration script: `DOC/database_migration.sql`
2. Verify column exists: `SELECT column_name FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'assigned_to';`
3. Check console for warnings about missing column

## Manual Verification Script

Run this in Supabase SQL Editor to check your setup:

```sql
-- Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reports' 
AND column_name IN ('status', 'assigned_to', 'device_id', 'reporter_id', 'resolved_at')
ORDER BY column_name;

-- Check recent status updates
SELECT id, status, assigned_to, created_at
FROM reports
ORDER BY created_at DESC
LIMIT 10;

-- Check if real-time is enabled (requires admin access)
-- This is usually in Supabase Dashboard → Database → Replication
```

## Testing Checklist

- [ ] Database columns exist (status, assigned_to, device_id, reporter_id, resolved_at)
- [ ] Realtime enabled for `reports` table
- [ ] Browser console shows "SUBSCRIBED" status
- [ ] Database update succeeds (check console logs)
- [ ] Real-time update received (check console logs)
- [ ] UI updates without refresh
- [ ] Status persists after page refresh
- [ ] Notifications appear for anonymous users

## Still Not Working?

1. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Logs
   - Look for errors related to updates

2. **Check Network Tab:**
   - Open browser DevTools → Network
   - Filter for "reports"
   - Check if UPDATE requests are being sent
   - Check response status (should be 200)

3. **Verify RLS Policies:**
   - Supabase Dashboard → Authentication → Policies
   - Ensure UPDATE policy exists for reports table
   - For testing, you can temporarily disable RLS

4. **Test with Direct SQL:**
   ```sql
   -- Update directly in database
   UPDATE reports SET status = 'In Progress' WHERE id = 'test-id';
   -- Then check if it appears in the UI
   ```

## Debug Mode

Add this to your browser console to enable verbose logging:

```javascript
localStorage.setItem('debug', 'true')
```

Then refresh the page and check console for detailed logs.






