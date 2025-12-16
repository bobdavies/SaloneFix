import { supabase } from '../lib/supabase'
import type { Team } from '@/lib/types'

export interface TeamFromDB {
  id: string
  name: string
  department: string
  description?: string | null
  members_count: number
  active_jobs_count: number
  contact_email?: string | null
  contact_phone?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Fetch all teams from database
 */
export async function fetchAllTeams(): Promise<TeamFromDB[]> {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      // If table doesn't exist, return empty array
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Teams table does not exist. Using mock teams.')
        return []
      }
      throw new Error(`Failed to fetch teams: ${error.message}`)
    }

    return (data || []) as TeamFromDB[]
  } catch (error) {
    console.error('Error fetching teams:', error)
    return []
  }
}

/**
 * Convert TeamFromDB to Team type
 */
export function convertTeamFromDB(dbTeam: TeamFromDB): Team {
  return {
    id: dbTeam.id,
    name: dbTeam.name,
    department: dbTeam.department,
    members: dbTeam.members_count,
    activeJobs: dbTeam.active_jobs_count,
  }
}

/**
 * Create a new team
 */
export async function createTeam(params: {
  name: string
  department: string
  description?: string
  membersCount?: number
  contactEmail?: string
  contactPhone?: string
}): Promise<TeamFromDB | null> {
  try {
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: params.name,
        department: params.department,
        description: params.description || null,
        members_count: params.membersCount || 0,
        contact_email: params.contactEmail || null,
        contact_phone: params.contactPhone || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Teams table does not exist.')
        return null
      }
      throw new Error(`Failed to create team: ${error.message}`)
    }

    return data as TeamFromDB
  } catch (error) {
    console.error('Error creating team:', error)
    throw error
  }
}

/**
 * Update a team
 */
export async function updateTeam(
  teamId: string,
  updates: Partial<{
    name: string
    department: string
    description: string
    membersCount: number
    contactEmail: string
    contactPhone: string
    isActive: boolean
  }>
): Promise<TeamFromDB | null> {
  try {
    const updateData: any = {}
    
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.department !== undefined) updateData.department = updates.department
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.membersCount !== undefined) updateData.members_count = updates.membersCount
    if (updates.contactEmail !== undefined) updateData.contact_email = updates.contactEmail
    if (updates.contactPhone !== undefined) updateData.contact_phone = updates.contactPhone
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive

    const { data, error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', teamId)
      .select()
      .single()

    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Teams table does not exist.')
        return null
      }
      throw new Error(`Failed to update team: ${error.message}`)
    }

    return data as TeamFromDB
  } catch (error) {
    console.error('Error updating team:', error)
    throw error
  }
}

/**
 * Delete a team (soft delete by setting is_active to false)
 */
export async function deleteTeam(teamId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('teams')
      .update({ is_active: false })
      .eq('id', teamId)

    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Teams table does not exist.')
        return false
      }
      throw new Error(`Failed to delete team: ${error.message}`)
    }

    return true
  } catch (error) {
    console.error('Error deleting team:', error)
    throw error
  }
}
