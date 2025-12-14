"use client"

import { useState, useEffect } from 'react'
import { getCurrentUser, getSession, onAuthStateChange, signIn, signOut } from '../src/services/authService'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        const session = await getSession()
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Auth init error:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // Listen to auth state changes
    const { data: { subscription } } = onAuthStateChange((user) => {
      setUser(user)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const { user } = await signIn(email, password)
      setUser(user)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await signOut()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  }
}


