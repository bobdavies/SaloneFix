import { supabase } from '../lib/supabase'

export interface ActivityLogEntryFromDB {
  id: string
  report_id: string
  action: string
  performed_by: string
  performed_by_type: 'admin' | 'team' | 'system'
  details?: string | null
  metadata?: Record<string, any> | null
  created_at: string
}

export interface CreateActivityLogParams {
  reportId: string
  action: string
  performedBy: string
  performedByType?: 'admin' | 'team' | 'system'
  details?: string
  metadata?: Record<string, any>
}

/**
 * Create an activity log entry
 */
export async function createActivityLog(params: CreateActivityLogParams): Promise<ActivityLogEntryFromDB | null> {
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        report_id: params.reportId,
        action: params.action,
        performed_by: params.performedBy,
        performed_by_type: params.performedByType || 'admin',
        details: params.details || null,
        metadata: params.metadata || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating activity log:', error)
      // If table doesn't exist, return null (graceful degradation)
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Activity log table does not exist. Skipping activity log creation.')
        return null
      }
      throw new Error(`Failed to create activity log: ${error.message}`)
    }

    console.log('✅ Activity log created:', data.id)
    return data as ActivityLogEntryFromDB
  } catch (error) {
    console.error('Error creating activity log:', error)
    // Don't throw - activity logs are not critical
    return null
  }
}

/**
 * Fetch activity log entries for a report
 */
export async function fetchActivityLogForReport(reportId: string): Promise<ActivityLogEntryFromDB[]> {
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      // If table doesn't exist, return empty array
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Activity log table does not exist.')
        return []
      }
      throw new Error(`Failed to fetch activity log: ${error.message}`)
    }

    return (data || []) as ActivityLogEntryFromDB[]
  } catch (error) {
    console.error('Error fetching activity log:', error)
    return []
  }
}

/**
 * Fetch all activity log entries (for admin dashboard)
 */
export async function fetchAllActivityLogs(limit: number = 100): Promise<ActivityLogEntryFromDB[]> {
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Activity log table does not exist.')
        return []
      }
      throw new Error(`Failed to fetch activity logs: ${error.message}`)
    }

    return (data || []) as ActivityLogEntryFromDB[]
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return []
  }
}
