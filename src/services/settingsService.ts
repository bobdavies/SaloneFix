/**
 * Settings Service
 * Handles persistence and retrieval of user preferences
 */

export type Theme = 'light' | 'dark' | 'system'
export type Language = 'en' | 'fr' | 'es' | 'krio'

export interface UserPreferences {
  theme: Theme
  language: Language
  timezone: string
  itemsPerPage: number
}

export interface UserSettings {
  preferences: UserPreferences
  notifications: {
    emailEnabled: boolean
    pushEnabled: boolean
    reportUpdates: boolean
    teamAssignments: boolean
    weeklyDigest: boolean
  }
  data: {
    autoBackup: boolean
    retentionDays: number
    exportFormat: 'csv' | 'json' | 'xlsx'
  }
}

const DEFAULT_SETTINGS: UserSettings = {
  preferences: {
    theme: 'system',
    language: 'en',
    timezone: 'Africa/Freetown',
    itemsPerPage: 10,
  },
  notifications: {
    emailEnabled: true,
    pushEnabled: true,
    reportUpdates: true,
    teamAssignments: true,
    weeklyDigest: false,
  },
  data: {
    autoBackup: true,
    retentionDays: 90,
    exportFormat: 'csv',
  },
}

const SETTINGS_STORAGE_KEY = 'salonefix_user_settings'

/**
 * Load settings from localStorage
 */
export function loadSettings(): UserSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS
  }

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults to handle missing properties
      return {
        preferences: { ...DEFAULT_SETTINGS.preferences, ...parsed.preferences },
        notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
        data: { ...DEFAULT_SETTINGS.data, ...parsed.data },
      }
    }
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error)
  }

  return DEFAULT_SETTINGS
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error)
    throw error
  }
}

/**
 * Get current theme preference
 */
export function getTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'system'
  }
  const settings = loadSettings()
  return settings.preferences.theme
}

/**
 * Get current language preference
 */
export function getLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'en'
  }
  const settings = loadSettings()
  return settings.preferences.language
}

/**
 * Language display names
 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  krio: 'Krio',
}

/**
 * Language native names (for better UX)
 */
export const LANGUAGE_NATIVE_NAMES: Record<Language, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  krio: 'Krio',
}

/**
 * Check if a specific notification type should be sent based on user preferences
 */
export function shouldSendNotification(notificationType: 'email' | 'push' | 'report-updates' | 'team-assignments' | 'weekly-digest'): boolean {
  if (typeof window === 'undefined') {
    return true // Default to true on server
  }

  const settings = loadSettings()

  switch (notificationType) {
    case 'email':
      return settings.notifications.emailEnabled
    case 'push':
      return settings.notifications.pushEnabled
    case 'report-updates':
      return settings.notifications.reportUpdates
    case 'team-assignments':
      return settings.notifications.teamAssignments
    case 'weekly-digest':
      return settings.notifications.weeklyDigest
    default:
      return true
  }
}

/**
 * Format date according to user's timezone preference
 */
export function formatDateInTimezone(date: Date | string, format: 'short' | 'long' | 'datetime' = 'short'): string {
  if (typeof window === 'undefined') {
    return new Date(date).toLocaleDateString()
  }

  const settings = loadSettings()
  const timezone = settings.preferences.timezone

  const dateObj = typeof date === 'string' ? new Date(date) : date

  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  }

  switch (format) {
    case 'long':
      options.year = 'numeric'
      options.month = 'long'
      options.day = 'numeric'
      break
    case 'datetime':
      options.year = 'numeric'
      options.month = 'short'
      options.day = 'numeric'
      options.hour = '2-digit'
      options.minute = '2-digit'
      break
    default: // 'short'
      options.year = 'numeric'
      options.month = 'short'
      options.day = 'numeric'
  }

  return dateObj.toLocaleDateString(settings.preferences.language === 'krio' ? 'en' : settings.preferences.language, options)
}

