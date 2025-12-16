# Admin Features Implementation Guide

## Overview
This document describes the comprehensive admin functionality that has been implemented for the SaloneFix application. The implementation includes team assignment, activity logging, notifications, and enhanced admin capabilities.

## Database Schema

### New Tables Created

#### 1. `notifications` Table
Stores notifications sent to users when actions are taken on their reports.

**Columns:**
- `id` (UUID, Primary Key)
- `report_id` (UUID, Foreign Key to reports)
- `user_id` (UUID, nullable - for authenticated users)
- `device_id` (TEXT, nullable - for anonymous users)
- `type` (TEXT) - 'status-change', 'team-assigned', 'comment', 'resolved'
- `title` (TEXT)
- `message` (TEXT)
- `status` (TEXT) - Current report status
- `read` (BOOLEAN) - Default false
- `created_at` (TIMESTAMPTZ)

**Indexes:**
- `idx_notifications_report_id`
- `idx_notifications_user_id`
- `idx_notifications_device_id`
- `idx_notifications_read`
- `idx_notifications_created_at`

#### 2. `activity_log` Table
Tracks all actions performed on reports by admins and teams.

**Columns:**
- `id` (UUID, Primary Key)
- `report_id` (UUID, Foreign Key to reports)
- `action` (TEXT) - 'status-changed', 'team-assigned', 'comment-added', etc.
- `performed_by` (TEXT) - Admin username or team name
- `performed_by_type` (TEXT) - 'admin', 'team', 'system'
- `details` (TEXT, nullable)
- `metadata` (JSONB, nullable) - Flexible JSON for additional data
- `created_at` (TIMESTAMPTZ)

**Indexes:**
- `idx_activity_log_report_id`
- `idx_activity_log_created_at`
- `idx_activity_log_action`

#### 3. `teams` Table
Manages response teams that handle reports.

**Columns:**
- `id` (UUID, Primary Key)
- `name` (TEXT, UNIQUE)
- `department` (TEXT)
- `description` (TEXT, nullable)
- `members_count` (INTEGER)
- `active_jobs_count` (INTEGER)
- `contact_email` (TEXT, nullable)
- `contact_phone` (TEXT, nullable)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexes:**
- `idx_teams_name`
- `idx_teams_department`
- `idx_teams_is_active`

### Database Triggers

1. **`create_notification_on_status_change_trigger`**
   - Automatically creates notifications when report status changes
   - Triggered on UPDATE of reports table when status changes

2. **`create_notification_on_team_assignment_trigger`**
   - Automatically creates notifications when a team is assigned
   - Triggered on UPDATE of reports table when assigned_to changes

3. **`update_team_active_jobs_trigger`**
   - Automatically updates team active_jobs_count when reports are assigned/unassigned
   - Triggered on UPDATE of reports table

## Services Implemented

### 1. Notification Service (`src/services/notificationService.ts`)

**Functions:**
- `createNotification(params)` - Create a new notification
- `fetchNotifications(userId, deviceId)` - Fetch notifications for a user
- `markNotificationAsRead(notificationId)` - Mark a notification as read
- `markAllNotificationsAsRead(userId, deviceId)` - Mark all notifications as read
- `deleteNotification(notificationId)` - Delete a notification
- `getUnreadNotificationCount(userId, deviceId)` - Get count of unread notifications

### 2. Activity Log Service (`src/services/activityLogService.ts`)

**Functions:**
- `createActivityLog(params)` - Create an activity log entry
- `fetchActivityLogForReport(reportId)` - Fetch activity log for a specific report
- `fetchAllActivityLogs(limit)` - Fetch all activity logs (for admin dashboard)

### 3. Team Service (`src/services/teamService.ts`)

**Functions:**
- `fetchAllTeams()` - Fetch all active teams
- `convertTeamFromDB(dbTeam)` - Convert database team to app Team type
- `createTeam(params)` - Create a new team
- `updateTeam(teamId, updates)` - Update a team
- `deleteTeam(teamId)` - Soft delete a team (sets is_active to false)

### 4. Updated Report Service (`src/services/reportService.ts`)

**Enhanced Functions:**
- `updateReportStatus()` - Now creates activity logs and notifications
- `assignTeamToReport()` - Now creates activity logs and notifications
- `convertReportFromDBWithActivityLog()` - Async version that includes activity logs

## Frontend Components Updated

### 1. Admin View (`components/admin-view.tsx`)

**New Features:**
- **Activity Log Display**: Shows complete activity log for each report in the triage modal
- **Team Management**: Fetches teams from database instead of using mock data
- **Real-time Updates**: Activity logs refresh when viewing report details
- **Team Refresh**: Button to refresh teams from database

**Enhanced Features:**
- Report Triage Modal now displays activity logs fetched from database
- Teams tab shows teams loaded from database with refresh capability
- Activity log entries show who performed the action and when

### 2. Notification Hook (`hooks/use-notifications.ts`)

**Updated Features:**
- Fetches notifications from database instead of client-side tracking
- Supports both authenticated users (user_id) and anonymous users (device_id)
- Auto-refreshes notifications every 30 seconds
- Marks notifications as read in database
- Falls back to client-side tracking if database is unavailable

### 3. Admin Page (`app/admin/page.tsx`)

**Updated Features:**
- Passes `performedBy` parameter when updating status or assigning teams
- Ensures activity logs and notifications are created for all admin actions

## How to Use

### 1. Database Setup

Run the migration script in your Supabase SQL Editor:

```sql
-- Run the script from DOC/admin_features_migration.sql
```

This will create:
- `notifications` table
- `activity_log` table
- `teams` table
- Default teams data
- Database triggers for automatic notifications

### 2. Admin Actions

#### Assigning Teams to Reports

1. Open a report in the admin dashboard
2. Click on the "Assign to Team" dropdown
3. Select a team from the list
4. Click "Assign & Start Progress" or "Update Assignment"
5. The system will:
   - Update the report's `assigned_to` field
   - Create an activity log entry
   - Send a notification to the user who reported the issue
   - Update the team's `active_jobs_count`

#### Changing Report Status

1. Open a report in the admin dashboard
2. Click on the status buttons (Pending, In Progress, Resolved)
3. The system will:
   - Update the report status
   - Create an activity log entry
   - Send a notification to the user
   - Update `resolved_at` timestamp if status is "Resolved"

#### Viewing Activity Logs

1. Open any report in the admin dashboard
2. Scroll to the "Activity Log" section
3. View all actions taken on the report, including:
   - Who performed the action
   - When it was performed
   - What action was taken
   - Additional details/metadata

#### Managing Teams

1. Navigate to the "Teams" tab in the admin dashboard
2. View all active teams with their:
   - Name and department
   - Member count
   - Active jobs count
3. Click "Refresh Teams" to reload from database

### 3. User Notifications

Users will automatically receive notifications when:
- Their report status changes (Pending → In Progress → Resolved)
- A team is assigned to their report
- Their report is resolved

Notifications are stored in the database and can be:
- Viewed in the notification dropdown
- Marked as read individually or all at once
- Deleted

## Features Summary

✅ **Team Assignment**: Admins can assign teams to reports with automatic notifications
✅ **Activity Logging**: All admin actions are logged with timestamps and performer information
✅ **Notifications**: Users receive notifications when actions are taken on their reports
✅ **Team Management**: Teams are managed in the database with active job tracking
✅ **Real-time Updates**: Activity logs and notifications update in real-time
✅ **Database Integration**: All features are fully integrated with Supabase backend
✅ **Graceful Degradation**: Features work even if some database tables don't exist

## Technical Notes

1. **Error Handling**: All services include graceful error handling. If database tables don't exist, the app continues to work with fallback behavior.

2. **Performance**: Activity logs are fetched on-demand when viewing report details, not on initial load.

3. **Notifications**: Notifications are created both via database triggers (automatic) and service functions (manual), ensuring reliability.

4. **Team Tracking**: Team active_jobs_count is automatically updated via database triggers when reports are assigned/unassigned.

5. **User Identification**: The system supports both authenticated users (via `user_id`) and anonymous users (via `device_id`).

## Future Enhancements

Potential future improvements:
- Email notifications
- SMS notifications
- Push notifications
- Admin comments on reports
- Report priority levels
- Team performance metrics
- Bulk operations on reports
- Export functionality for activity logs
