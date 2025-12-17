import { supabase } from '../lib/supabase'
import type { AdminNote } from '../../lib/types'

export interface NoteFromDB {
  id: string
  report_id: string
  content: string
  author_id: string | null
  author_name: string
  is_public: boolean
  mentions: string[] | null
  created_at: string
  updated_at: string
}

// Convert database note to AdminNote type
export function convertNoteFromDB(note: NoteFromDB): AdminNote {
  return {
    id: note.id,
    content: note.content,
    author: note.author_name,
    timestamp: new Date(note.created_at),
    isPublic: note.is_public,
    mentions: note.mentions || undefined,
  }
}

// Fetch all notes for a report
export async function fetchNotesForReport(reportId: string): Promise<AdminNote[]> {
  try {
    const { data, error } = await supabase
      .from('report_notes')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[fetchNotesForReport] Error:', error)
      throw new Error(`Failed to fetch notes: ${error.message}`)
    }

    return (data || []).map(convertNoteFromDB)
  } catch (error) {
    console.error('[fetchNotesForReport] Exception:', error)
    throw error
  }
}

// Save a note to a report
export async function saveNoteToReport(
  reportId: string,
  note: {
    content: string
    authorId?: string | null
    authorName: string
    isPublic?: boolean
    mentions?: string[]
  }
): Promise<AdminNote> {
  try {
    const { data, error } = await supabase
      .from('report_notes')
      .insert({
        report_id: reportId,
        content: note.content.trim(),
        author_id: note.authorId || null,
        author_name: note.authorName,
        is_public: note.isPublic || false,
        mentions: note.mentions || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[saveNoteToReport] Error:', error)
      throw new Error(`Failed to save note: ${error.message}`)
    }

    return convertNoteFromDB(data)
  } catch (error) {
    console.error('[saveNoteToReport] Exception:', error)
    throw error
  }
}

// Delete a note
export async function deleteNote(noteId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('report_notes')
      .delete()
      .eq('id', noteId)

    if (error) {
      console.error('[deleteNote] Error:', error)
      throw new Error(`Failed to delete note: ${error.message}`)
    }

    return true
  } catch (error) {
    console.error('[deleteNote] Exception:', error)
    throw error
  }
}

// Update a note
export async function updateNote(
  noteId: string,
  updates: {
    content?: string
    isPublic?: boolean
  }
): Promise<AdminNote> {
  try {
    const updateData: any = {}
    if (updates.content !== undefined) {
      updateData.content = updates.content.trim()
    }
    if (updates.isPublic !== undefined) {
      updateData.is_public = updates.isPublic
    }
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('report_notes')
      .update(updateData)
      .eq('id', noteId)
      .select()
      .single()

    if (error) {
      console.error('[updateNote] Error:', error)
      throw new Error(`Failed to update note: ${error.message}`)
    }

    return convertNoteFromDB(data)
  } catch (error) {
    console.error('[updateNote] Exception:', error)
    throw error
  }
}

