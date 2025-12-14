import { supabase } from '../lib/supabase'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import type { Report, ReportCategory } from '../../lib/types'
import { addReportIdToDevice, getReportIdsForDevice } from '../lib/deviceId'

// --- CONFIGURATION ---

// Use Next.js environment variables (NEXT_PUBLIC_ prefix for client-side access)
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY
// Use environment variable for model name, fallback to gemini-pro for stability
// Supported models: gemini-pro, gemini-1.5-pro, gemini-1.5-flash-latest
const MODEL_NAME = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-pro'

// Initialize Gemini AI
const getGeminiClient = () => {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing NEXT_PUBLIC_GEMINI_API_KEY. Please check your .env.local file.')
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

  // Try each model until one works
  for (const modelName of modelsToTry) {
    try {
      const genAI = getGeminiClient()
      const model = genAI.getGenerativeModel({ model: modelName })

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }, imagePart] }],
        safetySettings,
      })

      const response = await result.response
      const text = response.text()

      // Parse JSON response - handle potential formatting issues
      let jsonText = text.trim()
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      // Try to extract JSON from text if it's wrapped
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      }

      const aiResponse = JSON.parse(jsonText)

      // Normalize severity
      const severity = aiResponse.severity || 'Medium'
      const normalizedSeverity = ['High', 'Medium', 'Low'].includes(severity) 
        ? severity as 'High' | 'Medium' | 'Low'
        : 'Medium'

      return {
        category: aiResponse.category || 'Other',
        severity: normalizedSeverity,
        description: aiResponse.description || 'No description provided',
      }
    } catch (error: any) {
      // If it's a 404 (model not found), try the next model
      if (error?.message?.includes('404') || error?.message?.includes('not found')) {
        console.warn(`Model ${modelName} not available, trying next model...`)
        continue
      }
      
      // For other errors, log and try next model
      console.error(`Error with model ${modelName}:`, error)
      continue
    }
  }

  // If all models failed, return default values
  console.error('All Gemini models failed. Using default values.')
  return {
    category: 'Uncategorized',
    severity: 'Medium' as const,
    description: 'AI analysis unavailable - please update manually',
  }
}

// --- UPDATE STATUS FUNCTION ---
export async function updateReportStatus(
  reportId: string, 
  newStatus: 'Pending' | 'In Progress' | 'Resolved'
) {
  try {
    const updateData: any = { status: newStatus }
    
    // Try to update resolved_at if the column exists
    // This will gracefully fail if the column doesn't exist, but status will still update
    try {
      if (newStatus === 'Resolved') {
        // Only try to set resolved_at if column exists (will be caught if it doesn't)
        updateData.resolved_at = new Date().toISOString()
      } else if (newStatus === 'Pending') {
        // Only try to clear resolved_at if column exists
        updateData.resolved_at = null
      }
    } catch (timestampError) {
      // Column doesn't exist, continue without it
      console.warn('resolved_at column not found, updating status only')
    }

    // Update and verify the update succeeded by selecting the updated row
    const { data, error } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId)
      .select()
      .single()

    if (error) {
      // If error is about resolved_at column, try again without it
      if (error.message?.includes('resolved_at') || error.message?.includes('column')) {
        console.warn('resolved_at column not found, updating status only')
        const { data: retryData, error: retryError } = await supabase
          .from('reports')
          .update({ status: newStatus })
          .eq('id', reportId)
          .select()
          .single()
        
        if (retryError) throw new Error(`Failed to update status: ${retryError.message}`)
        
        // Verify the update
        if (retryData && retryData.status !== newStatus) {
          throw new Error(`Status update verification failed. Expected ${newStatus}, got ${retryData.status}`)
        }
        
        console.log('✅ Status updated and verified:', { reportId, status: retryData?.status })
        return true
      }
      throw new Error(`Failed to update status: ${error.message}`)
    }
    
    // Verify the update actually happened
    if (!data) {
      console.error('❌ Update succeeded but no data returned')
      throw new Error('Update succeeded but no data returned')
    }
    
    if (data.status !== newStatus) {
      console.error('❌ Status update verification failed:', {
        expected: newStatus,
        actual: data.status,
        reportId
      })
      throw new Error(`Status update verification failed. Expected ${newStatus}, got ${data.status}`)
    }
    
    console.log('✅ Status updated and verified in database:', { 
      reportId: reportId.substring(0, 8) + '...', 
      status: data.status, 
      assigned_to: data.assigned_to,
      timestamp: new Date().toISOString()
    })
    return true
  } catch (error) {
    console.error('Error updating report status:', error)
    throw error
  }
}

// --- ASSIGN TEAM TO REPORT ---
export async function assignTeamToReport(
  reportId: string,
  teamName: string
) {
  try {
    // Update and verify the update succeeded by selecting the updated row
    const { data, error } = await supabase
      .from('reports')
      .update({ assigned_to: teamName })
      .eq('id', reportId)
      .select()
      .single()

    if (error) {
      // If error is about assigned_to column not existing, provide helpful message but don't fail completely
      const errorMsg = error.message || JSON.stringify(error) || ''
      if (errorMsg.includes('assigned_to') || errorMsg.includes('column') || errorMsg.includes('does not exist')) {
        console.warn(
          'Team assignment feature requires the "assigned_to" column. ' +
          'Please add it to your Supabase reports table (type: text, nullable: true). ' +
          'See DOC/database_migration.sql for the migration script.'
        )
        // Don't throw - just log warning and return false
        // This allows the UI to continue working even without the column
        return false
      }
      throw new Error(`Failed to assign team: ${errorMsg}`)
    }
    
    // Verify the update actually happened
    if (!data) {
      throw new Error('Team assignment succeeded but no data returned')
    }
    
    if (data.assigned_to !== teamName) {
      throw new Error(`Team assignment verification failed. Expected ${teamName}, got ${data.assigned_to}`)
    }
    
    console.log('✅ Team assigned and verified:', { reportId, team: data.assigned_to, status: data.status })
    return true
  } catch (error) {
    console.error('Error assigning team:', error)
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
      .single()

    if (fetchError) throw new Error(`Failed to fetch report: ${fetchError.message}`)
    
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
    const { data: currentReport } = await supabase
      .from('reports')
      .select('description')
      .eq('id', reportId)
      .single()

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
    const base64Image = await fileToBase64(file)
    const mimeType = file.type || 'image/jpeg'
    const aiAnalysis = await analyzeImageWithAI(base64Image, mimeType)

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
}

// --- HELPER FOR ADMIN DASHBOARD ---
export async function fetchAllReports(): Promise<ReportFromDB[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return (data || []) as ReportFromDB[]
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

// Convert database report to app Report type
export function convertReportFromDB(dbReport: ReportFromDB): Report {
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

  return {
    id: dbReport.id,
    title,
    location,
    category: normalizedCategory,
    status: normalizedStatus,
    severity: normalizedSeverity,
    description: dbReport.description || '',
    timestamp,
    // Use reporter_id for authenticated users, device_id for anonymous users
    reportedBy: dbReport.reporter_id || dbReport.device_id || undefined,
    assignedTo: dbReport.assigned_to || undefined,
    resolvedAt,
    imageUrl: dbReport.image_url || undefined,
    activityLog: [], // Activity log would need to be fetched separately if needed
  }
}