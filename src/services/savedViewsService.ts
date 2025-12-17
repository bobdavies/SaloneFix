/**
 * Saved Views Service
 * Handles saving and loading custom filter combinations
 */

export interface SavedView {
  id: string
  name: string
  filters: {
    status?: string
    category?: string
    priority?: string
    searchQuery?: string
    sortBy?: string
  }
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'salonefix_saved_views'

/**
 * Get all saved views
 */
export function getSavedViews(): SavedView[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Failed to load saved views:', error)
  }
  
  return []
}

/**
 * Save a new view
 */
export function saveView(view: Omit<SavedView, 'id' | 'createdAt' | 'updatedAt'>): SavedView {
  if (typeof window === 'undefined') {
    throw new Error('Cannot save view on server side')
  }

  const views = getSavedViews()
  const newView: SavedView = {
    ...view,
    id: `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  views.push(newView)
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch (error) {
    console.error('Failed to save view:', error)
    throw error
  }

  return newView
}

/**
 * Update an existing view
 */
export function updateView(viewId: string, updates: Partial<Omit<SavedView, 'id' | 'createdAt'>>): SavedView | null {
  if (typeof window === 'undefined') {
    throw new Error('Cannot update view on server side')
  }

  const views = getSavedViews()
  const index = views.findIndex(v => v.id === viewId)
  
  if (index === -1) {
    return null
  }

  views[index] = {
    ...views[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch (error) {
    console.error('Failed to update view:', error)
    throw error
  }

  return views[index]
}

/**
 * Delete a saved view
 */
export function deleteView(viewId: string): boolean {
  if (typeof window === 'undefined') {
    throw new Error('Cannot delete view on server side')
  }

  const views = getSavedViews()
  const filtered = views.filter(v => v.id !== viewId)

  if (filtered.length === views.length) {
    return false // View not found
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Failed to delete view:', error)
    throw error
  }
}

/**
 * Get a specific view by ID
 */
export function getView(viewId: string): SavedView | null {
  const views = getSavedViews()
  return views.find(v => v.id === viewId) || null
}

