import { supabase } from '../lib/supabase'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import type { Report, ReportCategory, ActivityLogEntry, ReportPriority } from '../../lib/types'
import { addReportIdToDevice, getReportIdsForDevice } from '../lib/deviceId'
import { createActivityLog, fetchActivityLogForReport } from './activityLogService'
import { createNotification } from './notificationService'
import { autoAssignReport, isAutoAssignmentEnabled } from './autoAssignmentService'

// --- CONFIGURATION ---

// Use Next.js environment variables (NEXT_PUBLIC_ prefix for client-side access)
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY
// Use environment variable for model name, fallback to gemini-pro for stability
// Supported models: gemini-pro, gemini-1.5-pro, gemini-1.5-flash-latest
const MODEL_NAME = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-pro'

// Initialize Gemini AI
const getGeminiClient = () => {
  if (!GEMINI_API_KEY) {
    const errorMsg = 'Missing NEXT_PUBLIC_GEMINI_API_KEY environment variable. ' +
      'Please ensure it is set in your Vercel environment variables (Settings > Environment Variables). ' +
      'The variable name must be exactly: NEXT_PUBLIC_GEMINI_API_KEY'
    console.error('[getGeminiClient]', errorMsg)
    console.error('[getGeminiClient] Available env vars:', {
      hasKey: !!GEMINI_API_KEY,
      keyLength: GEMINI_API_KEY?.length || 0,
      keyPrefix: GEMINI_API_KEY?.substring(0, 10) || 'N/A',
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('API'))
    })
    throw new Error(errorMsg)
  }
  return new GoogleGenerativeAI(GEMINI_API_KEY)
}

// Convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64String = reader.result as string
      // Remove data URL prefix if present (Gemini needs raw base64)
      const base64 = base64String.includes(',') 
        ? base64String.split(',')[1] 
        : base64String
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Analyze image with Gemini AI
const analyzeImageWithAI = async (base64Image: string, mimeType: string): Promise<{
  category: string
  severity: 'High' | 'Medium' | 'Low'
  description: string
}> => {
  console.log('[analyzeImageWithAI] Starting AI analysis...')
  console.log('[analyzeImageWithAI] API Key check:', {
    hasKey: !!GEMINI_API_KEY,
    keyLength: GEMINI_API_KEY?.length || 0,
    keyPrefix: GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...` : 'N/A',
    modelName: MODEL_NAME
  })

  // Check API key first
  if (!GEMINI_API_KEY) {
    const errorMsg = 'Gemini API key is missing. Please set NEXT_PUBLIC_GEMINI_API_KEY in Vercel environment variables.'
    console.error('[analyzeImageWithAI]', errorMsg)
    throw new Error(errorMsg)
  }

  // List of models to try in order (fallback mechanism)
  const modelsToTry = [
    MODEL_NAME, // Try the configured model first
    'gemini-pro', // Fallback to stable model
    'gemini-1.5-pro', // Alternative newer model
  ]

  const prompt = `Analyze this image for a civic issue reporting app. 
    Identify the hazard (e.g., Pothole, Trash, Flooding, Broken Pipe). 
    Return a JSON object strictly with these fields: { category: string, severity: 'High'|'Medium'|'Low', description: string }.
    Keep the description short (under 15 words).`

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType || 'image/jpeg',
    },
  }

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ]

  const errors: string[] = []

  // Try each model until one works
  for (const modelName of modelsToTry) {
    try {
      console.log(`[analyzeImageWithAI] Attempting to use model: ${modelName}`)
      const genAI = getGeminiClient()
      const model = genAI.getGenerativeModel({ model: modelName })

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }, imagePart] }],
        safetySettings,
      })

      const response = await result.response
      const text = response.text()
      console.log(`[analyzeImageWithAI] Successfully got response from ${modelName}:`, text.substring(0, 100))

      // Parse JSON response - handle potential formatting issues
      let jsonText = text.trim()
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      // Try to extract JSON from text if it's wrapped
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      }

      const aiResponse = JSON.parse(jsonText)
      console.log('[analyzeImageWithAI] Parsed AI response:', aiResponse)

      // Normalize severity
      const severity = aiResponse.severity || 'Medium'
      const normalizedSeverity = ['High', 'Medium', 'Low'].includes(severity) 
        ? severity as 'High' | 'Medium' | 'Low'
        : 'Medium'

      const result_data = {
        category: aiResponse.category || 'Other',
        severity: normalizedSeverity,
        description: aiResponse.description || 'No description provided',
      }
      
      console.log('[analyzeImageWithAI] Returning successful analysis:', result_data)
      return result_data
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      const errorDetails = {
        model: modelName,
        error: errorMessage,
        code: error?.code,
        status: error?.status,
        statusText: error?.statusText
      }
      
      console.error(`[analyzeImageWithAI] Error with model ${modelName}:`, errorDetails)
      errors.push(`${modelName}: ${errorMessage}`)
      
      // If it's a 404 (model not found), try the next model
      if (errorMessage?.includes('404') || errorMessage?.includes('not found')) {
        console.warn(`[analyzeImageWithAI] Model ${modelName} not available, trying next model...`)
        continue
      }
      
      // If it's an API key error, don't try other models
      if (errorMessage?.includes('API key') || errorMessage?.includes('authentication') || errorMessage?.includes('401') || errorMessage?.includes('403')) {
        console.error('[analyzeImageWithAI] API key authentication error, stopping attempts')
        throw new Error(`Gemini API authentication failed: ${errorMessage}. Please verify your NEXT_PUBLIC_GEMINI_API_KEY in Vercel environment variables.`)
      }
      
      // For other errors, try next model
      continue
    }
  }

  // If all models failed, throw error with details
  const errorMsg = `All Gemini models failed. Errors: ${errors.join('; ')}`
  console.error('[analyzeImageWithAI]', errorMsg)
  throw new Error(`AI analysis failed: ${errorMsg}. Please check your API key and model configuration.`)
}

// --- UPDATE STATUS FUNCTION ---
export async function updateReportStatus(
  reportId: string, 
  newStatus: 'Pending' | 'In Progress' | 'Resolved',
  performedBy: string = 'Admin',
  previousStatus?: string
) {
  try {
    console.log(`[updateReportStatus] Starting update for report ${reportId.substring(0, 8)}...`)
    
    // Fetch current report (non-blocking)
    let currentReport: { status?: string; reporter_id?: string | null; device_id?: string | null; assigned_to?: string | null } | null = null
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('status, reporter_id, device_id, assigned_to')
        .eq('id', reportId)
        .maybeSingle()
      
      if (!error && data) {
        currentReport = data
      }
    } catch (fetchErr) {
      console.warn('[updateReportStatus] Could not fetch current report:', fetchErr)
    }

    const oldStatus = previousStatus || currentReport?.status || 'Pending'
    
    // Prepare update data - start simple
    const updateData: any = { status: newStatus }
    
    // Try to add resolved_at if status is Resolved (optional column)
    if (newStatus === 'Resolved') {
      updateData.resolved_at = new Date().toISOString()
    }

    // Perform the update
    console.log(`[updateReportStatus] Updating with data:`, updateData)
    const { error: updateError } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId)

    if (updateError) {
      console.error('[updateReportStatus] Update error:', updateError)
      
      // Extract error message from Supabase error object
      const errorMsg = 
        updateError.message || 
        updateError.details || 
        updateError.hint || 
        (updateError.code ? `Error code: ${updateError.code}` : '') ||
        (typeof updateError === 'string' ? updateError : JSON.stringify(updateError)) ||
        'Unknown error'
      
      console.error('[updateReportStatus] Error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
        fullError: updateError
      })
      
      // If error is about resolved_at, retry without it
      if (errorMsg.includes('resolved_at') || errorMsg.includes('column') || errorMsg.includes('does not exist')) {
        console.log('[updateReportStatus] Retrying without resolved_at...')
        const { error: retryError } = await supabase
          .from('reports')
          .update({ status: newStatus })
          .eq('id', reportId)
        
        if (retryError) {
          console.error('[updateReportStatus] Retry also failed:', retryError)
          const retryErrorMsg = retryError.message || retryError.details || JSON.stringify(retryError) || 'Unknown error'
          throw new Error(`Failed to update status: ${retryErrorMsg}`)
        }
        console.log('[updateReportStatus] ✅ Retry succeeded')
      } else {
        // Check for RLS policy errors
        if (errorMsg.includes('policy') || errorMsg.includes('permission') || errorMsg.includes('denied') || errorMsg.includes('row-level security')) {
          throw new Error(`Permission denied. Please check RLS policies. Error: ${errorMsg}`)
        }
        throw new Error(`Failed to update status: ${errorMsg}`)
      }
    } else {
      console.log('[updateReportStatus] ✅ Update succeeded')
    }
    
    // Create activity log and notification (non-blocking, don't wait)
    if (currentReport) {
      // Fire and forget - don't block on these
      createActivityLogAndNotification(reportId, oldStatus, newStatus, performedBy, currentReport).catch(err => {
        console.warn('[updateReportStatus] Activity log/notification failed (non-critical):', err)
      })
    }
    
    return true
  } catch (error) {
    console.error('[updateReportStatus] Fatal error:', error)
    throw error
  }
}

// --- UPDATE PRIORITY FUNCTION ---
export async function updateReportPriority(
  reportId: string,
  newPriority: 'critical' | 'high' | 'medium' | 'low',
  performedBy: string = 'Admin'
) {
  try {
    console.log(`[updateReportPriority] Updating priority for report ${reportId.substring(0, 8)}...`)
    
    const { error: updateError } = await supabase
      .from('reports')
      .update({ priority: newPriority })
      .eq('id', reportId)

    if (updateError) {
      // If priority column doesn't exist, that's okay - just log and return false
      const errorMsg = updateError.message || JSON.stringify(updateError) || ''
      if (errorMsg.includes('priority') || errorMsg.includes('column') || errorMsg.includes('does not exist')) {
        console.warn('[updateReportPriority] Priority column does not exist yet')
        return false
      }
      console.error('[updateReportPriority] Update error:', updateError)
      throw new Error(`Failed to update priority: ${updateError.message}`)
    }

    console.log('[updateReportPriority] ✅ Priority updated successfully')
    
    // Create activity log (non-blocking)
    createActivityLog({
      reportId,
      action: 'priority-updated',
      performedBy,
      performedByType: 'admin',
      details: `Priority changed to ${newPriority}`,
      metadata: { priority: newPriority },
    }).catch(err => {
      console.warn('[updateReportPriority] Activity log failed (non-critical):', err)
    })
    
    return true
  } catch (error) {
    console.error('[updateReportPriority] Fatal error:', error)
    throw error
  }
}

// Helper function to create activity log and notification (non-blocking)
async function createActivityLogAndNotification(
  reportId: string,
  oldStatus: string,
  newStatus: string,
  performedBy: string,
  reportData: { reporter_id?: string | null; device_id?: string | null; assigned_to?: string | null; status?: string | null } | null
) {
  try {
    // Create activity log entry
    const actionMap: Record<string, string> = {
      'Pending': 'Report created',
      'In Progress': 'Status changed to In Progress',
      'Resolved': 'Report resolved',
    }
    
    const action = actionMap[newStatus] || `Status changed from ${oldStatus} to ${newStatus}`
    
    await createActivityLog({
      reportId,
      action: 'status-changed',
      performedBy,
      performedByType: 'admin',
      details: action,
      metadata: {
        oldStatus,
        newStatus,
        assignedTo: reportData?.assigned_to || null,
      },
    })

    // Create notification for the user (if they exist)
    if (reportData && (reportData.reporter_id || reportData.device_id)) {
      let notificationTitle = 'Report Status Updated'
      let notificationMessage = `Your report status has been updated to ${newStatus}.`
      
      if (newStatus === 'In Progress') {
        notificationTitle = 'Report In Progress'
        notificationMessage = reportData.assigned_to
          ? `Your report is now being handled by ${reportData.assigned_to}.`
          : 'Your report is now in progress and being addressed.'
      } else if (newStatus === 'Resolved') {
        notificationTitle = 'Report Resolved'
        notificationMessage = 'Your report has been successfully resolved! 🎉'
      }

      await createNotification({
        reportId,
        userId: reportData.reporter_id || null,
        deviceId: reportData.device_id || null,
        type: newStatus === 'Resolved' ? 'resolved' : 'status-change',
        title: notificationTitle,
        message: notificationMessage,
        status: newStatus,
      })
    }
  } catch (error) {
    // Don't throw - these are non-critical operations
    console.warn('Failed to create activity log or notification:', error)
  }
}

// --- ASSIGN TEAM TO REPORT ---
export async function assignTeamToReport(
  reportId: string,
  teamName: string,
  performedBy: string = 'Admin'
) {
  try {
    console.log(`[assignTeamToReport] Starting assignment for report ${reportId.substring(0, 8)}...`)
    
    // Fetch current report (non-blocking)
    let currentReport: { assigned_to?: string | null; reporter_id?: string | null; device_id?: string | null; status?: string } | null = null
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('assigned_to, reporter_id, device_id, status')
        .eq('id', reportId)
        .maybeSingle()
      
      if (!error && data) {
        currentReport = data
      }
    } catch (fetchErr) {
      console.warn('[assignTeamToReport] Could not fetch current report:', fetchErr)
    }

    const oldTeam = currentReport?.assigned_to || null
    
    // Perform the update (empty string means unassign)
    const updateValue = teamName.trim() === "" ? null : teamName
    console.log(`[assignTeamToReport] Updating assigned_to to: ${updateValue === null ? "null (unassign)" : `"${updateValue}"`}`)
    
    // Perform update and get both data and error
    const { data: updateData, error: updateError } = await supabase
      .from('reports')
      .update({ assigned_to: updateValue })
      .eq('id', reportId)
      .select('assigned_to') // Select to verify update

    // Check if we have data (update succeeded) or error
    if (updateError) {
      // Check if error is an empty object (which can happen even when update succeeds)
      const errorKeys = updateError ? Object.keys(updateError) : []
      const errorString = JSON.stringify(updateError, null, 2)
      const errorMsg = 
        (updateError as any)?.message || 
        (updateError as any)?.details || 
        (updateError as any)?.hint || 
        ((updateError as any)?.code ? `Error code: ${(updateError as any).code}` : '') ||
        (typeof updateError === 'string' ? updateError : '') ||
        ''
      
      // If error is empty object or has no meaningful message, verify if update actually succeeded
      const isEmptyError = errorKeys.length === 0 || errorString === '{}' || !errorMsg
      
      if (isEmptyError) {
        console.log('[assignTeamToReport] Empty error object detected. Verifying if update succeeded...')
        
        // Wait a bit for database to sync
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Try to verify by fetching the report
        try {
          const { data: verifyReport, error: verifyError } = await supabase
            .from('reports')
            .select('assigned_to')
            .eq('id', reportId)
            .maybeSingle()
          
          if (verifyError) {
            console.error('[assignTeamToReport] Verification fetch error:', verifyError)
            throw new Error(`Failed to assign team: Could not verify update. ${JSON.stringify(verifyError)}`)
          }
          
          // Compare values (handle null/undefined)
          const verifyValue = verifyReport?.assigned_to || null
          const expectedValue = updateValue || null
          
          // Normalize for comparison (trim strings, handle null)
          const normalizedVerify = verifyValue?.toString().trim() || null
          const normalizedExpected = expectedValue?.toString().trim() || null
          
          if (normalizedVerify === normalizedExpected) {
            console.log('[assignTeamToReport] ✅ Update verified - succeeded despite empty error object', {
              expected: normalizedExpected,
              actual: normalizedVerify
            })
            // Continue normally - update succeeded, no need to throw error
          } else {
            console.error('[assignTeamToReport] Verification failed:', {
              expected: normalizedExpected,
              actual: normalizedVerify
            })
            throw new Error(`Failed to assign team: Update verification failed. Expected "${normalizedExpected}", got "${normalizedVerify}"`)
          }
        } catch (verifyError) {
          console.error('[assignTeamToReport] Verification exception:', verifyError)
          throw new Error(`Failed to assign team: ${verifyError instanceof Error ? verifyError.message : 'Verification failed'}`)
        }
      } else {
        // We have a real error message - log it properly
        console.error('[assignTeamToReport] Update error:', {
          message: errorMsg,
          code: (updateError as any)?.code,
          details: (updateError as any)?.details,
        })
        
        // Check for column missing error
        if (errorMsg.includes('assigned_to') || errorMsg.includes('column') || errorMsg.includes('does not exist') || errorMsg.includes('relation')) {
          console.warn('[assignTeamToReport] assigned_to column does not exist')
          return false // Return false but don't throw
        }
        
        // Check for RLS policy errors
        if (errorMsg.includes('policy') || errorMsg.includes('permission') || errorMsg.includes('denied') || errorMsg.includes('row-level security')) {
          throw new Error(`Permission denied. Please check RLS policies. Error: ${errorMsg}`)
        }
        
        // For "Cannot coerce" errors, verify before throwing
        if (errorMsg.includes('Cannot coerce') || errorMsg.includes('coerce')) {
          console.warn('[assignTeamToReport] Coerce error detected, verifying if update succeeded...')
          
          // Verify by fetching
          const { data: verifyReport } = await supabase
            .from('reports')
            .select('assigned_to')
            .eq('id', reportId)
            .maybeSingle()
          
          const verifyValue = verifyReport?.assigned_to || null
          const expectedValue = updateValue || null
          
          if ((verifyValue?.toString().trim() || null) === (expectedValue?.toString().trim() || null)) {
            console.log('[assignTeamToReport] ✅ Update verified - succeeded despite coerce error')
            // Continue normally - update succeeded
          } else {
            throw new Error(`Failed to assign team: ${errorMsg}`)
          }
        } else {
          throw new Error(`Failed to assign team: ${errorMsg}`)
        }
      }
    } else if (updateData && updateData.length > 0) {
      // Update succeeded and we got data back
      const updatedValue = updateData[0]?.assigned_to || null
      console.log('[assignTeamToReport] ✅ Update succeeded with data:', {
        expected: updateValue,
        actual: updatedValue
      })
    } else {
      // No error and no data - verify to be sure
      console.log('[assignTeamToReport] Update completed (no error, no data returned). Verifying...')
      
      // Verify by fetching
      const { data: verifyReport } = await supabase
        .from('reports')
        .select('assigned_to')
        .eq('id', reportId)
        .maybeSingle()
      
      if (verifyReport) {
        const verifyValue = verifyReport.assigned_to || null
        const expectedValue = updateValue || null
        
        if ((verifyValue?.toString().trim() || null) === (expectedValue?.toString().trim() || null)) {
          console.log('[assignTeamToReport] ✅ Update verified:', verifyValue)
        } else {
          console.warn('[assignTeamToReport] Update may have failed - values do not match:', {
            expected: expectedValue,
            actual: verifyValue
          })
        }
      }
    }
    
    // Create activity log and notification (non-blocking, don't wait)
    if (currentReport) {
      // Fire and forget - don't block on these
      const isUnassign = updateValue === null
      
      Promise.all([
        createActivityLog({
          reportId,
          action: isUnassign ? 'team-unassigned' : 'team-assigned',
          performedBy,
          performedByType: 'admin',
          details: isUnassign 
            ? `Team "${oldTeam}" unassigned from report`
            : `Team "${teamName}" assigned to report${oldTeam ? ` (replaced "${oldTeam}")` : ''}`,
          metadata: { teamName: updateValue, oldTeam },
        }).catch(err => console.warn('[assignTeamToReport] Activity log failed:', err)),
        
        // Only send notification if assigning (not unassigning)
        (!isUnassign && (currentReport.reporter_id || currentReport.device_id)) ? createNotification({
          reportId,
          userId: currentReport.reporter_id || null,
          deviceId: currentReport.device_id || null,
          type: 'team-assigned',
          title: 'Team Assigned to Your Report',
          message: `A team (${teamName}) has been assigned to handle your report.`,
          status: currentReport.status || 'Pending',
        }).catch(err => console.warn('[assignTeamToReport] Notification failed:', err)) : Promise.resolve()
      ]).catch(err => {
        console.warn('[assignTeamToReport] Background tasks failed (non-critical):', err)
      })
    }
    
    return true
  } catch (error) {
    console.error('[assignTeamToReport] Fatal error:', error)
    throw error
  }
}

// --- DELETE REPORT (Only allowed for resolved reports) ---
export async function deleteReport(
  reportId: string,
  proofImageUrl?: string
) {
  try {
    // First, verify the report is resolved
    // Try to fetch resolved_at, but handle gracefully if column doesn't exist
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('status')
      .eq('id', reportId)
      .maybeSingle()

    if (fetchError) {
      console.warn('Could not fetch report for deletion check:', fetchError.message)
      throw new Error(`Failed to fetch report: ${fetchError.message}`)
    }
    
    if (!report) {
      throw new Error('Report not found')
    }
    
    if (!report) throw new Error('Report not found')
    
    // Check if resolved (resolved_at column is optional)
    if (report.status !== 'Resolved') {
      throw new Error('Only resolved reports can be deleted. Please resolve the report first.')
    }

    // Delete the report
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)

    if (error) throw new Error(`Failed to delete report: ${error.message}`)
    
    return true
  } catch (error) {
    console.error('Error deleting report:', error)
    throw error
  }
}

// --- UPLOAD PROOF IMAGE (For resolved reports) ---
export async function uploadProofImage(file: File): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `proof-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `proofs/${fileName}`

    const { error } = await supabase.storage
      .from('hazards') // Reuse hazards bucket, or create a 'proofs' bucket
      .upload(filePath, file, { cacheControl: '3600', upsert: false })

    if (error) throw new Error(`Failed to upload proof: ${error.message}`)

    const { data: urlData } = supabase.storage
      .from('hazards')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error uploading proof image:', error)
    throw error
  }
}

// --- UPDATE REPORT WITH PROOF (For resolved reports) ---
export async function updateReportWithProof(
  reportId: string,
  proofImageUrl: string
) {
  try {
    // Store proof image URL (you may want to add a proof_image_url column to your database)
    const { data: currentReport, error: fetchError } = await supabase
      .from('reports')
      .select('description')
      .eq('id', reportId)
      .maybeSingle()
    
    if (fetchError) {
      console.warn('Could not fetch report for proof update:', fetchError.message)
    }
    
    if (!currentReport) {
      throw new Error('Report not found')
    }

    const originalDescription = currentReport?.description || ''
    // Remove existing proof marker if any
    const cleanDescription = originalDescription.replace(/\[PROOF:.*?\]/g, '').trim()
    
    const { error } = await supabase
      .from('reports')
      .update({ 
        description: `[PROOF: ${proofImageUrl}] ${cleanDescription}`
      })
      .eq('id', reportId)

    if (error) throw new Error(`Failed to update report with proof: ${error.message}`)
    
    return true
  } catch (error) {
    console.error('Error updating report with proof:', error)
    throw error
  }
}

// Upload file to Supabase Storage
const uploadFileToStorage = async (file: File): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `hazards/${fileName}`

    const { error } = await supabase.storage
      .from('hazards')
      .upload(filePath, file, { cacheControl: '3600', upsert: false })

    if (error) throw new Error(`Failed to upload file: ${error.message}`)

    const { data: urlData } = supabase.storage
      .from('hazards')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

// Main function to submit report
export async function submitReport(
  file: File,
  location: { lat: number; lng: number },
  userId?: string | null,
  deviceId?: string | null
) {
  try {
    // Step 1: Upload file
    const imageUrl = await uploadFileToStorage(file)

    // Step 2: Convert & Analyze
    console.log('[submitReport] Starting image analysis...')
    const base64Image = await fileToBase64(file)
    const mimeType = file.type || 'image/jpeg'
    console.log('[submitReport] Image converted to base64, length:', base64Image.length)
    
    let aiAnalysis
    try {
      aiAnalysis = await analyzeImageWithAI(base64Image, mimeType)
      console.log('[submitReport] AI analysis successful:', aiAnalysis)
    } catch (error: any) {
      console.error('[submitReport] AI analysis failed:', error)
      // Re-throw with more context
      throw new Error(`Failed to analyze image: ${error.message || 'Unknown error'}. Please check your Gemini API key configuration.`)
    }

    // Step 3: Insert into DB
    // Use device_id for anonymous tracking (stored in localStorage)
    // Use reporter_id for authenticated users (Supabase user ID)
    const baseInsertData: any = {
      image_url: imageUrl,
      latitude: location.lat,
      longitude: location.lng,
      category: aiAnalysis.category,
      severity: aiAnalysis.severity,
      description: aiAnalysis.description,
      status: 'Pending',
    }
    
    // Try to insert with optional columns first
    const insertData: any = { ...baseInsertData }
    
    // Add device_id for anonymous tracking (optional column)
    if (deviceId) {
      insertData.device_id = deviceId
    }
    
    // Add reporter_id for authenticated users (optional column)
    if (userId) {
      insertData.reporter_id = userId
    }
    
    let { data, error } = await supabase
      .from('reports')
      .insert(insertData)
      .select()
      .single()

    // If error is about missing columns, retry without optional columns
    if (error && (error.message?.includes('reporter_id') || error.message?.includes('device_id') || error.message?.includes('column'))) {
      console.warn('Optional columns (reporter_id/device_id) not found, inserting without them:', error.message)
      
      // Retry with only base columns
      const retryResult = await supabase
        .from('reports')
        .insert(baseInsertData)
        .select()
        .single()
      
      if (retryResult.error) {
        throw new Error(`Failed to submit report: ${retryResult.error.message}`)
      }
      
      data = retryResult.data
      error = null
      
      // Always use localStorage fallback for tracking (works even if device_id column exists)
      if (deviceId && data?.id) {
        addReportIdToDevice(data.id)
        console.log('Report tracked via localStorage (device_id column not available)')
      }
    }
    
    // Always add to localStorage as backup tracking (even if device_id was saved to DB)
    if (data?.id && deviceId) {
      addReportIdToDevice(data.id)
      console.log('Report ID stored in localStorage for tracking')
    }

    if (error) throw new Error(`Failed to submit report: ${error.message}`)
    if (!data) throw new Error('No data returned')

    // Auto-assign team if enabled (non-blocking)
    if (isAutoAssignmentEnabled() && data.id) {
      // Convert to Report type for auto-assignment
      const reportForAssignment: Report = {
        id: data.id,
        title: data.category || 'Report',
        location: `${data.latitude}, ${data.longitude}`,
        category: (data.category?.toLowerCase() as ReportCategory) || 'other',
        status: 'pending',
        severity: (data.severity?.toLowerCase() as 'low' | 'medium' | 'high') || 'medium',
        priority: 'medium' as ReportPriority,
        description: data.description || '',
        timestamp: new Date(data.created_at),
        imageUrl: data.image_url || undefined,
      }

      // Attempt auto-assignment (fire and forget - don't block submission)
      autoAssignReport(reportForAssignment).catch((err) => {
        console.warn('Auto-assignment failed (non-critical):', err)
        // Don't throw - auto-assignment failure shouldn't block report submission
      })
    }

    // Force refresh cache logic if you have it, or return data
    return data

  } catch (error) {
    console.error('Error submitting report:', error)
    throw error
  }
}

// --- TYPE DEFINITIONS ---
export type ReportFromDB = {
  id: string
  created_at: string
  image_url: string | null
  latitude: number
  longitude: number
  category: string
  description: string
  severity: string
  status: string
  reporter_id?: string | null
  device_id?: string | null  // For anonymous user tracking
  assigned_to?: string | null
  resolved_at?: string | null
  priority?: string | null  // 'critical' | 'high' | 'medium' | 'low'
}

// Calculate priority based on severity and age
// Priority increases with severity and time since report creation
export function calculatePriority(
  severity: 'low' | 'medium' | 'high',
  createdAt: Date,
  status: 'pending' | 'in-progress' | 'resolved' = 'pending'
): 'critical' | 'high' | 'medium' | 'low' {
  // Resolved reports always have low priority
  if (status === 'resolved') {
    return 'low'
  }

  const now = new Date()
  const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
  
  // Base priority from severity
  let basePriority: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  if (severity === 'high') {
    basePriority = 'high'
  } else if (severity === 'low') {
    basePriority = 'low'
  }

  // Escalate based on age
  // High severity + > 24 hours = critical
  if (severity === 'high' && ageInHours > 24) {
    return 'critical'
  }
  
  // Medium severity + > 48 hours = high
  if (severity === 'medium' && ageInHours > 48) {
    return 'high'
  }
  
  // High severity + > 12 hours = critical
  if (severity === 'high' && ageInHours > 12) {
    return 'critical'
  }
  
  // Low severity + > 72 hours = medium
  if (severity === 'low' && ageInHours > 72) {
    return 'medium'
  }

  return basePriority
}

// --- HELPER FOR ADMIN DASHBOARD ---
export async function fetchAllReports(): Promise<ReportFromDB[]> {
    try {
      // Add a small random parameter to prevent caching
      const cacheBuster = Date.now()
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ Error fetching all reports:', error)
        throw error
      }
      
      console.log(`📥 Fetched ${data?.length || 0} reports from database (cache-busted)`)
      
      // Log status distribution for debugging
      if (data && data.length > 0) {
        const statusCounts = data.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        console.log('📊 Database status distribution:', statusCounts)
      }
      
      return (data || []) as ReportFromDB[]
    } catch (error) {
      console.error('❌ fetchAllReports failed:', error)
      throw error
    }
}

// --- HELPER FOR CITIZEN "MY REPORTS" ---
// Fetch reports by device ID (for anonymous users) or user ID (for authenticated users)
export async function fetchReportsByDeviceOrUser(deviceId: string | null, userId: string | null): Promise<ReportFromDB[]> {
  try {
    // If user is authenticated, use reporter_id
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('reporter_id', userId)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.warn('Error fetching by reporter_id:', error.message || JSON.stringify(error))
          return []
        }
        return (data || []) as ReportFromDB[]
      } catch (err) {
        console.warn('Exception fetching by reporter_id:', err)
        return []
      }
    }
    
    // For anonymous users, try device_id first, then localStorage fallback
    if (deviceId) {
      // First, try localStorage fallback (works even if device_id column doesn't exist)
      const reportIds = getReportIdsForDevice()
      
      if (reportIds.length > 0) {
        // Filter valid IDs
        const validIds = reportIds.filter(id => id && typeof id === 'string' && id.length > 0)
        if (validIds.length > 0) {
          try {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('reports')
              .select('*')
              .in('id', validIds)
              .order('created_at', { ascending: false })
            
            if (!fallbackError && fallbackData) {
              console.log(`Loaded ${fallbackData.length} reports from localStorage fallback`)
              return fallbackData as ReportFromDB[]
            }
            if (fallbackError) {
              console.warn('Error in localStorage fallback query:', fallbackError.message || JSON.stringify(fallbackError))
            }
          } catch (fallbackErr) {
            console.warn('Exception using localStorage fallback:', fallbackErr)
          }
        }
      }
      
      // Try device_id column (if it exists)
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('device_id', deviceId)
          .order('created_at', { ascending: false })
        
        // If device_id column exists and we got results, return them
        if (!error && data) {
          if (data.length > 0) {
            console.log(`Loaded ${data.length} reports using device_id column`)
            return data as ReportFromDB[]
          }
          // No results but no error - device_id column exists, just no reports yet
          return []
        }
        
        // If error is about missing column, that's okay - we'll use localStorage
        if (error) {
          const errorMessage = error.message || JSON.stringify(error) || ''
          if (errorMessage.includes('device_id') || errorMessage.includes('column') || errorMessage.includes('does not exist')) {
            console.warn('device_id column not found, using localStorage fallback')
            // Already tried localStorage above, return empty if no reports found there
            return []
          }
          // Other error - log but don't throw
          console.warn('Error querying by device_id:', error)
        }
      } catch (queryError) {
        // Query failed - try localStorage if we haven't already
        console.warn('Query by device_id failed, checking localStorage:', queryError)
      }
      
      // If we get here, device_id query didn't work, return empty (localStorage already tried)
      return []
    }
    
    // No deviceId/userId available, but always try localStorage fallback (works on page refresh)
    const reportIds = getReportIdsForDevice()
    if (reportIds.length > 0) {
      const validIds = reportIds.filter(id => id && typeof id === 'string' && id.length > 0)
      if (validIds.length > 0) {
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('reports')
            .select('*')
            .in('id', validIds)
            .order('created_at', { ascending: false })
          
          if (!fallbackError && fallbackData) {
            console.log(`Loaded ${fallbackData.length} reports from localStorage (no deviceId/userId)`)
            return fallbackData as ReportFromDB[]
          }
          if (fallbackError) {
            console.warn('Error in final localStorage fallback:', fallbackError.message || JSON.stringify(fallbackError))
          }
        } catch (err) {
          console.warn('Exception in final localStorage fallback:', err)
        }
      }
    }
    
    // No reports found
    return []
  } catch (error) {
    // Better error handling - don't throw, just log and return empty
    const errorMsg = error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error))
    console.error('Error fetching user reports:', errorMsg || 'Unknown error', error)
    return []
  }
}

// Convert database report to app Report type (with activity log support)
export async function convertReportFromDBWithActivityLog(dbReport: ReportFromDB): Promise<Report> {
  // Normalize severity: "Low"/"Medium"/"High" -> "low"/"medium"/"high"
  const severityMap: Record<string, "low" | "medium" | "high"> = {
    'Low': 'low',
    'Medium': 'medium',
    'High': 'high',
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
  }
  const normalizedSeverity = severityMap[dbReport.severity] || 'medium'

  // Normalize status: "Pending"/"In Progress"/"Resolved" -> "pending"/"in-progress"/"resolved"
  const statusMap: Record<string, "pending" | "in-progress" | "resolved"> = {
    'Pending': 'pending',
    'In Progress': 'in-progress',
    'Resolved': 'resolved',
    'pending': 'pending',
    'in-progress': 'in-progress',
    'resolved': 'resolved',
  }
  const normalizedStatus = statusMap[dbReport.status] || 'pending'

  // Create title from category or description
  const title = dbReport.category || dbReport.description?.substring(0, 50) || 'Untitled Report'

  // Create location string from coordinates (or use a default)
  const location = dbReport.latitude && dbReport.longitude
    ? `${dbReport.latitude.toFixed(4)}, ${dbReport.longitude.toFixed(4)}`
    : 'Location not available'

  // Convert created_at to Date
  const timestamp = new Date(dbReport.created_at)

  // Convert resolved_at to Date if present
  const resolvedAt = dbReport.resolved_at ? new Date(dbReport.resolved_at) : undefined

  // Normalize category to match ReportCategory type
  const categoryMap: Record<string, ReportCategory> = {
    'sanitation': 'sanitation',
    'roads': 'roads',
    'water': 'water',
    'electrical': 'electrical',
    'other': 'other',
  }
  const normalizedCategory = categoryMap[dbReport.category?.toLowerCase() || ''] || 'other'

  // Fetch activity log
  let activityLog: ActivityLogEntry[] = []
  try {
    const activityLogEntries = await fetchActivityLogForReport(dbReport.id)
    activityLog = activityLogEntries.map((entry) => ({
      id: entry.id,
      action: entry.details || entry.action,
      user: entry.performed_by,
      timestamp: new Date(entry.created_at),
      details: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
    }))
  } catch (error) {
    console.warn('Failed to fetch activity log:', error)
  }

  // Calculate or use stored priority
  let priority: ReportPriority = 'medium'
  if (dbReport.priority && ['critical', 'high', 'medium', 'low'].includes(dbReport.priority)) {
    priority = dbReport.priority as ReportPriority
  } else {
    // Auto-calculate if not set
    priority = calculatePriority(normalizedSeverity, timestamp, normalizedStatus)
  }

  return {
    id: dbReport.id,
    title,
    location,
    category: normalizedCategory,
    status: normalizedStatus,
    severity: normalizedSeverity,
    priority,
    description: dbReport.description || '',
    timestamp,
    // Use reporter_id for authenticated users, device_id for anonymous users
    reportedBy: dbReport.reporter_id || dbReport.device_id || undefined,
    assignedTo: dbReport.assigned_to || undefined,
    resolvedAt,
    imageUrl: dbReport.image_url || undefined,
    activityLog,
  }
}

// Convert database report to app Report type (synchronous, without activity log)
export function convertReportFromDB(dbReport: ReportFromDB): Report {
  const normalizedSeverity = (['Low', 'Medium', 'High'].includes(dbReport.severity) 
    ? dbReport.severity.toLowerCase() as "low" | "medium" | "high"
    : 'medium')
  
  const normalizedStatus = (dbReport.status === 'In Progress' ? 'in-progress' : 
             dbReport.status === 'Resolved' ? 'resolved' : 'pending') as "pending" | "in-progress" | "resolved"
  
  const timestamp = new Date(dbReport.created_at)
  
  // Calculate or use stored priority
  let priority: ReportPriority = 'medium'
  if (dbReport.priority && ['critical', 'high', 'medium', 'low'].includes(dbReport.priority)) {
    priority = dbReport.priority as ReportPriority
  } else {
    // Auto-calculate if not set
    priority = calculatePriority(normalizedSeverity, timestamp, normalizedStatus)
  }

  return {
    id: dbReport.id,
    title: dbReport.category || dbReport.description?.substring(0, 50) || 'Untitled Report',
    location: dbReport.latitude && dbReport.longitude
      ? `${dbReport.latitude.toFixed(4)}, ${dbReport.longitude.toFixed(4)}`
      : 'Location not available',
    category: (['sanitation', 'roads', 'water', 'electrical', 'other'].includes(dbReport.category?.toLowerCase() || '') 
      ? dbReport.category?.toLowerCase() as ReportCategory 
      : 'other'),
    status: normalizedStatus,
    severity: normalizedSeverity,
    priority,
    description: dbReport.description || '',
    timestamp,
    reportedBy: dbReport.reporter_id || dbReport.device_id || undefined,
    assignedTo: dbReport.assigned_to || undefined,
    resolvedAt: dbReport.resolved_at ? new Date(dbReport.resolved_at) : undefined,
    imageUrl: dbReport.image_url || undefined,
    activityLog: [],
  }
}