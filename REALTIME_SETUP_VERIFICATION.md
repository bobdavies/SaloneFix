# Real-time Setup Verification Guide

## ✅ What You've Done

1. ✅ Ran database migration script (`DOC/database_migration.sql`)
2. ✅ Enabled Supabase Realtime

## 🔍 Verification Steps

### 1. Verify Database Columns

Run this query in your Supabase SQL Editor to verify all columns exist:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reports'
ORDER BY ordinal_position;
```

You should see these columns:
- `id` (uuid)
- `created_at` (timestamptz)
- `image_url` (text)
- `latitude` (float)
- `longitude` (float)
- `category` (text)
- `description` (text)
- `severity` (text)
- `status` (text)
- `reporter_id` (uuid) - ✅ NEW
- `device_id` (text) - ✅ NEW
- `assigned_to` (text) - ✅ NEW
- `resolved_at` (timestamptz) - ✅ NEW

### 2. Verify Realtime is Enabled

In Supabase Dashboard:
1. Go to **Database** → **Replication**
2. Find the `reports` table
3. Ensure the toggle is **ON** (green)
4. All events should be enabled: INSERT, UPDATE, DELETE

### 3. Test Admin Actions Persist

1. **Login to Admin Panel** (`/admin`)
2. **Change a report status** (Pending → In Progress → Resolved)
3. **Refresh the page** (F5 or Ctrl+R)
4. ✅ **Expected**: Status should remain changed (not revert to original)

### 4. Test Team Assignment

1. **Open a report** in Admin Panel
2. **Assign a team** from the dropdown
3. **Refresh the page**
4. ✅ **Expected**: Team assignment should persist

### 5. Test Notifications for Anonymous Users

1. **Open Citizen Portal** in a browser (or incognito)
2. **Submit a report** (this creates an anonymous report)
3. **Open Admin Panel** in another browser/tab
4. **Change the report status** to "In Progress"
5. ✅ **Expected**: 
   - Citizen Portal should show notification badge
   - Click notification bell → Should see "Your report is now in progress!"
   - Toast notification should appear

6. **Change status to "Resolved"**
7. ✅ **Expected**:
   - New notification appears
   - Shows "Your report has been resolved! 🎉"

### 6. Test Real-time Updates

1. **Open Citizen Portal** (Browser 1)
2. **Open Admin Panel** (Browser 2)
3. **In Admin Panel**: Change a report status
4. ✅ **Expected**: 
   - Citizen Portal updates **without page refresh**
   - Notification appears immediately
   - Report status updates in "My Reports" tab

## 🐛 Troubleshooting

### Issue: Actions don't persist after refresh

**Check:**
- Database columns exist (run verification query above)
- No errors in browser console (F12)
- Check Supabase logs for errors

**Solution:**
- Verify migration script ran successfully
- Check that `updateReportStatus` and `assignTeamToReport` functions are working
- Look for error messages in browser console

### Issue: Notifications not appearing

**Check:**
- Real-time subscription status in browser console
- Look for: "Successfully subscribed to my reports changes"
- Check if `useNotifications` hook is detecting status changes

**Solution:**
- Ensure Realtime is enabled in Supabase Dashboard
- Check browser console for subscription errors
- Verify device_id is being stored (check localStorage)

### Issue: Real-time updates not working

**Check:**
- Supabase Realtime is enabled for `reports` table
- Browser console shows: "Real-time update received"
- Network tab shows WebSocket connection

**Solution:**
- Enable Realtime in Supabase Dashboard → Database → Replication
- Check Supabase project settings for Realtime limits
- Verify WebSocket connections are allowed (not blocked by firewall)

## 📊 Expected Console Logs

When everything works, you should see:

```
✅ Loaded X reports for "My Reports"
🔄 Loading reports with deviceId/userId
My reports subscription status: SUBSCRIBED
Successfully subscribed to my reports changes
Real-time update for my reports: {eventType: 'UPDATE', ...}
My report updated via real-time: {id: '...', oldStatus: 'pending', newStatus: 'in-progress'}
```

## 🎯 Quick Test Checklist

- [ ] Database columns exist (reporter_id, device_id, assigned_to, resolved_at)
- [ ] Realtime enabled for `reports` table
- [ ] Admin status changes persist after refresh
- [ ] Team assignments persist after refresh
- [ ] Notifications appear for anonymous users
- [ ] Real-time updates work without refresh
- [ ] No errors in browser console

## 📝 Next Steps

Once verified:
1. Test with multiple anonymous users
2. Test with authenticated users
3. Monitor Supabase logs for any issues
4. Check notification system is working correctly

---

**Need Help?** Check the browser console (F12) for detailed error messages and logs.
