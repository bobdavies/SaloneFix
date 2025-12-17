import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * API route to test Gemini API connection
 * This helps diagnose API key and connection issues
 */
export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'NEXT_PUBLIC_GEMINI_API_KEY is not set',
        details: {
          hasKey: false,
          environment: process.env.NODE_ENV,
          availableEnvVars: Object.keys(process.env)
            .filter(k => k.includes('GEMINI') || k.includes('API'))
            .map(k => ({ name: k, hasValue: !!process.env[k] }))
        }
      }, { status: 500 })
    }

    // Test the API connection with a simple request
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    
    const result = await model.generateContent('Say "API connection successful" in one word.')
    const response = await result.response
    const text = response.text()

    return NextResponse.json({
      success: true,
      message: 'Gemini API connection successful',
      response: text.trim(),
      details: {
        hasKey: true,
        keyLength: apiKey.length,
        keyPrefix: apiKey.substring(0, 10) + '...',
        model: 'gemini-pro',
        environment: process.env.NODE_ENV
      }
    })
  } catch (error: any) {
    console.error('[test-gemini] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      details: {
        message: error.message,
        code: error.code,
        status: error.status,
        statusText: error.statusText,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    }, { status: 500 })
  }
}
