# Real-Time Report Tracking System

## Overview

The SaloneFix application implements a comprehensive real-time tracking system that allows citizens to see status updates on their reports immediately when admins make changes in the admin panel.

## Architecture

### 1. Real-Time Subscriptions

#### For All Reports (Home Page)
- **Hook**: `useReportsSubscription()`
- **Location**: `hooks/use-reports-subscription.ts`
- **Purpose**: Fetches and subscribes to ALL reports for the public feed
- **Used in**: Citizen home page (`app/page.tsx`), Admin panel (`app/admin/page.tsx`)

#### For User's Reports (My Reports Page)
- **Hook**: `useMyReportsSubscription(deviceId, userId)`
- **Location**: `hooks/use-my-reports-subscription.ts`
- **Purpose**: Fetches and subscribes to reports belonging to a specific device/user
- **Used in**: Citizen "My Reports" tab (`components/citizen-view.tsx`)

### 2. How It Works

#### When Admin Updates Status:

1. **Admin Action** (`app/admin/page.tsx`):
   ```typescript
   handleStatusChange(reportId, newStatus)
   → updateReportStatusInDB(reportId, dbStatus)
   → Supabase database UPDATE
   ```

2. **Database Change**:
   - Supabase triggers `postgres_changes` event
   - Event contains: `eventType: 'UPDATE'`, `new: updatedReport`, `old: previousReport`

3. **Real-Time Subscription** (Citizen View):
   - `useMyReportsSubscription` receives the UPDATE event
   - Checks if report belongs to user (via device_id, reporter_id, or localStorage)
   - Updates local state: `setMyReports(prev => prev.map(...))`
   - UI automatically re-renders with new status

4. **Visual Update**:
   - Report card status badge updates
   - Status timeline in detail modal updates
   - Stats cards update (Pending/In Progress/Resolved counts)

### 3. Tracking Methods

#### Primary: Database Columns
- `reporter_id` (UUID) - For authenticated users
- `device_id` (TEXT) - For anonymous users

#### Fallback: localStorage
- Stores report IDs in `salonefix_my_report_ids`
- Works even if `device_id` column doesn't exist
- Ensures tracking works regardless of database schema

### 4. Status Update Flow

```
Admin Panel
    ↓
handleStatusChange()
    ↓
updateReportStatusInDB()
    ↓
Supabase UPDATE query
    ↓
Database change event
    ↓
Real-time subscription (all clients)
    ↓
Filter by device/user
    ↓
Update local state
    ↓
UI re-renders
    ↓
Citizen sees updated status
```

## Features

### ✅ Real-Time Status Updates
- Citizens see status changes immediately (no page refresh needed)
- Works for: Pending → In Progress → Resolved
- Updates appear in both "Recent Reports" and "My Reports"

### ✅ Team Assignment Tracking
- When admin assigns a team, citizens see it in report details
- Real-time subscription updates `assignedTo` field
- Works even if `assigned_to` column doesn't exist (graceful degradation)

### ✅ Report Deletion
- When admin deletes a resolved report, it disappears from citizen view
- Real-time subscription removes deleted reports from list

### ✅ New Report Submission
- When citizen submits report, it appears immediately
- Optimistic update + real-time confirmation
- Works with anonymous tracking (localStorage fallback)

## Admin Panel Functions

### Status Management
- ✅ Update status (Pending/In Progress/Resolved)
- ✅ Optimistic UI updates with error rollback
- ✅ Real-time sync across all clients
- ✅ Analytics tracking

### Team Assignment
- ✅ Assign reports to teams
- ✅ Auto-update status to "In Progress" when assigned
- ✅ Graceful handling if `assigned_to` column doesn't exist
- ✅ Real-time updates to all clients

### Report Deletion
- ✅ Delete resolved reports only
- ✅ Optional proof image upload
- ✅ Real-time removal from all clients
- ✅ Proper error handling

### Bulk Actions
- ✅ Select multiple reports
- ✅ Bulk status updates
- ✅ Real-time updates for all selected reports

## Testing Real-Time Updates

### Test Scenario 1: Status Update
1. Citizen submits a report
2. Open admin panel in another tab/window
3. Change report status to "In Progress"
4. **Expected**: Citizen view updates immediately without refresh

### Test Scenario 2: Team Assignment
1. Admin assigns team to report
2. **Expected**: Report status auto-updates to "In Progress"
3. **Expected**: Citizen sees team assignment in report details

### Test Scenario 3: Resolution
1. Admin marks report as "Resolved"
2. **Expected**: Citizen sees status change immediately
3. **Expected**: Stats cards update (Resolved count increases)

### Test Scenario 4: Multiple Devices
1. Submit report from Device A
2. View "My Reports" on Device A - should see report
3. View "My Reports" on Device B - should NOT see report
4. **Expected**: Anonymous tracking works per device

## Troubleshooting

### Reports Not Updating in Real-Time

**Check:**
1. Supabase real-time enabled? (Settings > API > Realtime)
2. Database has proper RLS policies for subscriptions
3. Console logs show subscription status: "SUBSCRIBED"
4. Network tab shows WebSocket connection active

**Solution:**
```sql
-- Enable real-time for reports table
ALTER PUBLICATION supabase_realtime ADD TABLE reports;
```

### "My Reports" Not Showing Updates

**Check:**
1. Device ID is set (check localStorage: `salonefix_device_id`)
2. Report IDs stored in localStorage: `salonefix_my_report_ids`
3. Console shows "Real-time update for my reports" logs

**Solution:**
- Reports are tracked via localStorage fallback
- Check browser console for subscription status
- Verify report belongs to device (check device_id or localStorage)

### Admin Updates Not Reflecting

**Check:**
1. Admin panel shows "Success" toast after update
2. Database actually updated (check Supabase dashboard)
3. Real-time subscription active (check console logs)

**Solution:**
- Refresh admin panel to verify database update
- Check Supabase logs for errors
- Verify real-time is enabled for reports table

## Performance Considerations

- Real-time subscriptions are lightweight (only metadata, not full data)
- Updates are batched and debounced where possible
- Optimistic updates provide instant feedback
- Fallback to polling if WebSocket fails (handled by Supabase client)

## Security

- Real-time subscriptions respect Row Level Security (RLS)
- Citizens only see their own reports in "My Reports"
- Admin panel requires authentication
- All database operations are validated server-side




