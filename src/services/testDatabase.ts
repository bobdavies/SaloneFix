/**
 * Test functions to verify database connectivity and permissions
 * Run these from browser console to diagnose issues
 */

import { supabase } from '../lib/supabase'

/**
 * Test if we can read from the reports table
 */
export async function testReadReports() {
  try {
    console.log('🧪 Testing read access to reports table...')
    const { data, error } = await supabase
      .from('reports')
      .select('id, status, assigned_to')
      .limit(5)
    
    if (error) {
      console.error('❌ Read test failed:', error)
      return { success: false, error }
    }
    
    console.log('✅ Read test passed:', data?.length || 0, 'reports found')
    return { success: true, data }
  } catch (error) {
    console.error('❌ Read test exception:', error)
    return { success: false, error }
  }
}

/**
 * Test if we can update a report (use a test report ID)
 */
export async function testUpdateReport(reportId: string) {
  try {
    console.log('🧪 Testing update access to reports table...')
    
    // First, get current status
    const { data: current, error: fetchError } = await supabase
      .from('reports')
      .select('status')
      .eq('id', reportId)
      .single()
    
    if (fetchError) {
      console.error('❌ Cannot fetch report:', fetchError)
      return { success: false, error: fetchError }
    }
    
    const originalStatus = current?.status
    console.log('📋 Current status:', originalStatus)
    
    // Try to update
    const { data: updated, error: updateError } = await supabase
      .from('reports')
      .update({ status: originalStatus }) // Update to same value (safe test)
      .eq('id', reportId)
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Update test failed:', updateError)
      console.error('💡 This might be a Row Level Security (RLS) policy issue')
      console.error('💡 Check Supabase Dashboard → Authentication → Policies')
      return { success: false, error: updateError }
    }
    
    console.log('✅ Update test passed')
    return { success: true, data: updated }
  } catch (error) {
    console.error('❌ Update test exception:', error)
    return { success: false, error }
  }
}

/**
 * Test real-time subscription
 */
export function testRealtimeSubscription() {
  console.log('🧪 Testing real-time subscription...')
  
  const channel = supabase
    .channel('test-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reports',
      },
      (payload) => {
        console.log('✅ Real-time event received:', payload.eventType)
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Real-time subscription working!')
      } else {
        console.error('❌ Real-time subscription failed:', status)
      }
    })
  
  // Clean up after 10 seconds
  setTimeout(() => {
    supabase.removeChannel(channel)
    console.log('🧹 Test channel cleaned up')
  }, 10000)
  
  return channel
}

/**
 * Verify a specific report's status in database
 */
export async function verifyReportStatus(reportId: string) {
  try {
    console.log('🔍 Verifying report status in database...')
    const { data, error } = await supabase
      .from('reports')
      .select('id, status, assigned_to, updated_at')
      .eq('id', reportId)
      .single()
    
    if (error) {
      console.error('❌ Verification failed:', error)
      return { success: false, error }
    }
    
    console.log('✅ Report status in database:', {
      id: data.id.substring(0, 8) + '...',
      status: data.status,
      assigned_to: data.assigned_to,
      updated_at: data.updated_at
    })
    
    return { success: true, data }
  } catch (error) {
    console.error('❌ Verification exception:', error)
    return { success: false, error }
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testDatabase = {
    testReadReports,
    testUpdateReport,
    testRealtimeSubscription,
    verifyReportStatus,
  }
  console.log('🧪 Database test functions available. Use: window.testDatabase.testReadReports()')
}


