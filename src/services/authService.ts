import { supabase } from '../lib/supabase'

export interface AuthUser {
  id: string
  email?: string
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    return {
      user: data.user,
      session: data.session,
    }
  } catch (error) {
    console.error('Sign in error:', error)
    throw error
  }
}

// Sign out
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

// Get current user
export async function getCurrentUser() {
  try {
    // Use getSession() which is more lenient and doesn't throw on missing session
    const session = await getSession()
    return session?.user ?? null
  } catch (error: any) {
    // Handle any errors gracefully (for anonymous users)
    if (error?.message?.includes('session') || error?.message?.includes('JWT') || error?.message?.includes('Auth session missing')) {
      return null
    }
    console.error('Get user error:', error)
    return null
  }
}

// Get current session
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      throw new Error(error.message)
    }
    return session
  } catch (error) {
    console.error('Get session error:', error)
    return null
  }
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
}


