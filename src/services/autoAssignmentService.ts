import { assignTeamToReport } from './reportService'
import { fetchAllTeams, convertTeamFromDB, type TeamFromDB } from './teamService'
import type { Report, ReportCategory, ReportPriority, Team } from '@/lib/types'

/**
 * Auto-Assignment Rule Types
 */
export type AssignmentRuleType = 
  | 'category-based'      // Assign based on report category
  | 'priority-based'      // Assign based on priority level
  | 'workload-balance'    // Assign to team with least workload
  | 'round-robin'         // Assign in rotation
  | 'geographic'          // Assign based on location (future)

export interface AssignmentRule {
  id: string
  name: string
  type: AssignmentRuleType
  enabled: boolean
  priority: number // Lower number = higher priority
  conditions: {
    category?: ReportCategory[]
    priority?: ReportPriority[]
    severity?: ('low' | 'medium' | 'high')[]
  }
  assignment: {
    teamName?: string // Specific team
    department?: string // Assign to any team in department
    strategy?: 'workload-balance' | 'round-robin'
  }
}

/**
 * Default assignment rules
 */
const DEFAULT_RULES: AssignmentRule[] = [
  {
    id: 'roads-category',
    name: 'Roads Category → Roads Team',
    type: 'category-based',
    enabled: true,
    priority: 1,
    conditions: {
      category: ['roads'],
    },
    assignment: {
      teamName: 'Roads Team Alpha',
    },
  },
  {
    id: 'sanitation-category',
    name: 'Sanitation Category → Sanitation Team',
    type: 'category-based',
    enabled: true,
    priority: 1,
    conditions: {
      category: ['sanitation'],
    },
    assignment: {
      teamName: 'Sanitation Unit B',
    },
  },
  {
    id: 'water-category',
    name: 'Water Category → Water Team',
    type: 'category-based',
    enabled: true,
    priority: 1,
    conditions: {
      category: ['water'],
    },
    assignment: {
      teamName: 'GUMA Valley Team',
    },
  },
  {
    id: 'electrical-category',
    name: 'Electrical Category → Electrical Team',
    type: 'category-based',
    enabled: true,
    priority: 1,
    conditions: {
      category: ['electrical'],
    },
    assignment: {
      teamName: 'Electrical Response',
    },
  },
  {
    id: 'critical-priority',
    name: 'Critical Priority → Emergency Team',
    type: 'priority-based',
    enabled: true,
    priority: 0, // Highest priority
    conditions: {
      priority: ['critical'],
    },
    assignment: {
      teamName: 'Emergency Response',
    },
  },
  {
    id: 'workload-balance-fallback',
    name: 'Workload Balance (Fallback)',
    type: 'workload-balance',
    enabled: true,
    priority: 100, // Lowest priority (fallback)
    conditions: {},
    assignment: {
      strategy: 'workload-balance',
    },
  },
]

/**
 * Get assignment rules from localStorage (or use defaults)
 */
export function getAssignmentRules(): AssignmentRule[] {
  if (typeof window === 'undefined') return DEFAULT_RULES
  
  try {
    const stored = localStorage.getItem('autoAssignmentRules')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.length > 0 ? parsed : DEFAULT_RULES
    }
  } catch (error) {
    console.warn('Failed to load assignment rules from localStorage:', error)
  }
  
  return DEFAULT_RULES
}

/**
 * Save assignment rules to localStorage
 */
export function saveAssignmentRules(rules: AssignmentRule[]): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('autoAssignmentRules', JSON.stringify(rules))
  } catch (error) {
    console.error('Failed to save assignment rules to localStorage:', error)
  }
}

/**
 * Check if a report matches rule conditions
 */
function matchesRuleConditions(report: Report, rule: AssignmentRule): boolean {
  // Check category condition
  if (rule.conditions.category && rule.conditions.category.length > 0) {
    if (!rule.conditions.category.includes(report.category)) {
      return false
    }
  }

  // Check priority condition
  if (rule.conditions.priority && rule.conditions.priority.length > 0) {
    const reportPriority = report.priority || 'medium'
    if (!rule.conditions.priority.includes(reportPriority)) {
      return false
    }
  }

  // Check severity condition
  if (rule.conditions.severity && rule.conditions.severity.length > 0) {
    if (!rule.conditions.severity.includes(report.severity)) {
      return false
    }
  }

  return true
}

/**
 * Find the best team using workload balancing
 */
function findTeamByWorkload(teams: Team[], department?: string): Team | null {
  let eligibleTeams = teams.filter(t => t.activeJobs !== undefined)
  
  if (department) {
    eligibleTeams = eligibleTeams.filter(t => t.department === department)
  }

  if (eligibleTeams.length === 0) {
    return teams.length > 0 ? teams[0] : null
  }

  // Sort by active jobs (ascending) and return the team with least workload
  eligibleTeams.sort((a, b) => (a.activeJobs || 0) - (b.activeJobs || 0))
  return eligibleTeams[0]
}

/**
 * Find team using round-robin strategy
 */
let roundRobinIndex: Record<string, number> = {}

function findTeamByRoundRobin(teams: Team[], department?: string): Team | null {
  let eligibleTeams = teams
  
  if (department) {
    eligibleTeams = teams.filter(t => t.department === department)
  }

  if (eligibleTeams.length === 0) {
    return teams.length > 0 ? teams[0] : null
  }

  const key = department || 'all'
  if (!roundRobinIndex[key]) {
    roundRobinIndex[key] = 0
  }

  const team = eligibleTeams[roundRobinIndex[key] % eligibleTeams.length]
  roundRobinIndex[key] = (roundRobinIndex[key] + 1) % eligibleTeams.length
  
  return team
}

/**
 * Auto-assign a report to a team based on rules
 */
export async function autoAssignReport(
  report: Report,
  rules?: AssignmentRule[]
): Promise<{ success: boolean; teamName: string | null; reason: string }> {
  try {
    // Get rules (use provided or load from storage)
    const assignmentRules = rules || getAssignmentRules()
    
    // Filter to only enabled rules, sorted by priority
    const enabledRules = assignmentRules
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority)

    // Fetch teams
    const dbTeams = await fetchAllTeams()
    const teams = dbTeams.map(convertTeamFromDB)

    if (teams.length === 0) {
      return {
        success: false,
        teamName: null,
        reason: 'No teams available',
      }
    }

    // Try each rule in priority order
    for (const rule of enabledRules) {
      if (!matchesRuleConditions(report, rule)) {
        continue
      }

      let assignedTeam: Team | null = null
      let reason = ''

      // Apply assignment strategy
      if (rule.assignment.teamName) {
        // Specific team assignment
        assignedTeam = teams.find(t => t.name === rule.assignment.teamName) || null
        reason = `Rule: ${rule.name} (specific team)`
      } else if (rule.assignment.department) {
        // Department-based assignment
        if (rule.assignment.strategy === 'workload-balance') {
          assignedTeam = findTeamByWorkload(teams, rule.assignment.department)
          reason = `Rule: ${rule.name} (workload balance in ${rule.assignment.department})`
        } else {
          assignedTeam = findTeamByRoundRobin(teams, rule.assignment.department)
          reason = `Rule: ${rule.name} (round-robin in ${rule.assignment.department})`
        }
      } else if (rule.assignment.strategy === 'workload-balance') {
        // Workload balance across all teams
        assignedTeam = findTeamByWorkload(teams)
        reason = `Rule: ${rule.name} (workload balance)`
      } else {
        // Round-robin across all teams
        assignedTeam = findTeamByRoundRobin(teams)
        reason = `Rule: ${rule.name} (round-robin)`
      }

      if (assignedTeam) {
        // Assign the team
        try {
          await assignTeamToReport(report.id, assignedTeam.name, 'Auto-Assignment System')
          return {
            success: true,
            teamName: assignedTeam.name,
            reason,
          }
        } catch (error) {
          console.error(`Failed to assign team ${assignedTeam.name}:`, error)
          // Continue to next rule
          continue
        }
      }
    }

    // No rule matched or all assignments failed
    return {
      success: false,
      teamName: null,
      reason: 'No matching rule or assignment failed',
    }
  } catch (error) {
    console.error('Auto-assignment error:', error)
    return {
      success: false,
      teamName: null,
      reason: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get suggested team for a report (without assigning)
 */
export async function suggestTeamForReport(
  report: Report,
  rules?: AssignmentRule[]
): Promise<{ teamName: string | null; reason: string; confidence: 'high' | 'medium' | 'low' }> {
  try {
    const assignmentRules = rules || getAssignmentRules()
    const enabledRules = assignmentRules
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority)

    const dbTeams = await fetchAllTeams()
    const teams = dbTeams.map(convertTeamFromDB)

    if (teams.length === 0) {
      return {
        teamName: null,
        reason: 'No teams available',
        confidence: 'low',
      }
    }

    for (const rule of enabledRules) {
      if (!matchesRuleConditions(report, rule)) {
        continue
      }

      let suggestedTeam: Team | null = null
      let reason = ''

      if (rule.assignment.teamName) {
        suggestedTeam = teams.find(t => t.name === rule.assignment.teamName) || null
        reason = `Rule: ${rule.name}`
      } else if (rule.assignment.department) {
        if (rule.assignment.strategy === 'workload-balance') {
          suggestedTeam = findTeamByWorkload(teams, rule.assignment.department)
        } else {
          suggestedTeam = findTeamByRoundRobin(teams, rule.assignment.department)
        }
        reason = `Rule: ${rule.name}`
      } else if (rule.assignment.strategy === 'workload-balance') {
        suggestedTeam = findTeamByWorkload(teams)
        reason = `Rule: ${rule.name}`
      } else {
        suggestedTeam = findTeamByRoundRobin(teams)
        reason = `Rule: ${rule.name}`
      }

      if (suggestedTeam) {
        // High confidence for specific team rules, medium for others
        const confidence = rule.assignment.teamName ? 'high' : 
                          rule.assignment.department ? 'medium' : 'low'
        return {
          teamName: suggestedTeam.name,
          reason,
          confidence,
        }
      }
    }

    return {
      teamName: null,
      reason: 'No matching rule',
      confidence: 'low',
    }
  } catch (error) {
    console.error('Team suggestion error:', error)
    return {
      teamName: null,
      reason: error instanceof Error ? error.message : 'Unknown error',
      confidence: 'low',
    }
  }
}

/**
 * Check if auto-assignment is enabled
 */
export function isAutoAssignmentEnabled(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const stored = localStorage.getItem('autoAssignmentEnabled')
    return stored === 'true'
  } catch {
    return false
  }
}

/**
 * Enable/disable auto-assignment
 */
export function setAutoAssignmentEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('autoAssignmentEnabled', String(enabled))
  } catch (error) {
    console.error('Failed to save auto-assignment setting:', error)
  }
}

