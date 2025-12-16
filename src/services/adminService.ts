/**
 * Admin Service - Simplified and robust admin operations
 * This service handles all admin actions with better error handling
 */

import { supabase } from '../lib/supabase'

export interface AdminActionResult {
  success: boolean
  error?: string
  data?: any
}

/**
 * Update report status - Simplified version
 */
export async function updateReportStatusSimple(
  reportId: string,
  newStatus: 'Pending' | 'In Progress' | 'Resolved'
): Promise<AdminActionResult> {
  try {
    console.log(`[Admin] Updating report ${reportId.substring(0, 8)}... status to: ${newStatus}`)
    
    // Simple update without verification complexity
    const { error } = await supabase
      .from('reports')
      .update({ status: newStatus })
      .eq('id', reportId)

    if (error) {
      console.error('[Admin] Update error:', error)
      return {
        success: false,
        error: error.message || 'Failed to update report status',
      }
    }

    console.log(`[Admin] ✅ Status updated successfully`)
    return { success: true }
  } catch (error) {
    console.error('[Admin] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Assign team to report - Simplified version
 */
export async function assignTeamSimple(
  reportId: string,
  teamName: string
): Promise<AdminActionResult> {
  try {
    console.log(`[Admin] Assigning team "${teamName}" to report ${reportId.substring(0, 8)}...`)
    
    // Simple update without verification complexity
    const { error } = await supabase
      .from('reports')
      .update({ assigned_to: teamName })
      .eq('id', reportId)

    if (error) {
      console.error('[Admin] Assignment error:', error)
      
      // Check if it's a column issue
      if (error.message?.includes('assigned_to') || error.message?.includes('column')) {
        return {
          success: false,
          error: 'assigned_to column does not exist. Please run the database migration.',
        }
      }
      
      return {
        success: false,
        error: error.message || 'Failed to assign team',
      }
    }

    console.log(`[Admin] ✅ Team assigned successfully`)
    return { success: true }
  } catch (error) {
    console.error('[Admin] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test database connection and permissions
 */
export async function testAdminAccess(): Promise<{
  canRead: boolean
  canUpdate: boolean
  canAssign: boolean
  errors: string[]
}> {
  const result = {
    canRead: false,
    canUpdate: false,
    canAssign: false,
    errors: [] as string[],
  }

  try {
    // Test read access
    const { data: readData, error: readError } = await supabase
      .from('reports')
      .select('id, status')
      .limit(1)

    if (readError) {
      result.errors.push(`Read access failed: ${readError.message}`)
    } else {
      result.canRead = true
    }

    // Test update access (if we have a report)
    if (readData && readData.length > 0) {
      const testReportId = readData[0].id
      const originalStatus = readData[0].status

      const { error: updateError } = await supabase
        .from('reports')
        .update({ status: originalStatus }) // Update to same value (safe test)
        .eq('id', testReportId)

      if (updateError) {
        result.errors.push(`Update access failed: ${updateError.message}`)
      } else {
        result.canUpdate = true
      }

      // Test team assignment (if column exists)
      const { error: assignError } = await supabase
        .from('reports')
        .update({ assigned_to: 'Test Team' })
        .eq('id', testReportId)

      if (assignError) {
        if (assignError.message?.includes('assigned_to') || assignError.message?.includes('column')) {
          result.errors.push('assigned_to column does not exist')
        } else {
          result.errors.push(`Team assignment failed: ${assignError.message}`)
        }
      } else {
        result.canAssign = true
        // Clean up test assignment
        await supabase
          .from('reports')
          .update({ assigned_to: null })
          .eq('id', testReportId)
      }
    }
  } catch (error) {
    result.errors.push(`Test exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}
