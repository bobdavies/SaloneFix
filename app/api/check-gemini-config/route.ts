import { NextResponse } from 'next/server'

/**
 * API route to check if Gemini API key is configured
 * This helps diagnose configuration issues
 */
export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  
  // Don't expose the actual key, just check if it exists
  const hasKey = !!apiKey
  const keyLength = apiKey?.length || 0
  const keyPrefix = apiKey ? `${apiKey.substring(0, 10)}...` : 'N/A'
  
  return NextResponse.json({
    configured: hasKey,
    keyLength: hasKey ? keyLength : 0,
    keyPrefix: hasKey ? keyPrefix : null,
    environment: process.env.NODE_ENV,
    message: hasKey 
      ? 'Gemini API key is configured' 
      : 'Gemini API key is missing. Please set NEXT_PUBLIC_GEMINI_API_KEY in Vercel environment variables.',
  })
}
