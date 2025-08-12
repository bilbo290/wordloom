import { SessionState, FolderItem, FileItem, ProjectContext, DocumentContext } from './types'
import { fileSystemManager } from './filesystem'

const SESSION_STORAGE_KEY = 'wordloom-session'

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function createDefaultProjectContext(name: string = 'My Project'): ProjectContext {
  return {
    id: generateId(),
    name,
    description: '',
    genre: 'other',
    style: 'casual',
    audience: 'general readers',
    systemPrompt: undefined,
    constraints: '',
    customFields: {},
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

export function createDocumentContext(fileId: string): DocumentContext {
  return {
    fileId,
    purpose: '',
    status: 'draft',
    documentNotes: '',
    customFields: {},
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

export function migrateSession(legacySession: any): SessionState {
  // Check if session already has new structure
  if (legacySession.projectContext && legacySession.documentContexts) {
    return legacySession as SessionState
  }

  // Migrate legacy session
  const projectContext = createDefaultProjectContext(
    legacySession.folders?.[0]?.name || 'My Project'
  )

  const documentContexts: Record<string, DocumentContext> = {}
  
  // Create document contexts for all existing files
  if (legacySession.folders) {
    legacySession.folders.forEach((folder: FolderItem) => {
      folder.files.forEach((file: FileItem) => {
        documentContexts[file.id] = createDocumentContext(file.id)
      })
    })
  }

  return {
    folders: legacySession.folders || [],
    activeFileId: legacySession.activeFileId || null,
    activeFolderId: legacySession.activeFolderId || null,
    projectContext,
    documentContexts
  }
}

export async function loadSession(): Promise<SessionState> {
  // Try to load from file system first
  try {
    const fileSystemSession = await fileSystemManager.loadSession()
    if (fileSystemSession) {
      return migrateSession(fileSystemSession)
    }
  } catch (error) {
    console.warn('Failed to load from file system:', error)
  }

  // Fallback to localStorage
  const stored = localStorage.getItem(SESSION_STORAGE_KEY)
  if (stored) {
    try {
      const parsedSession = JSON.parse(stored)
      return migrateSession(parsedSession)
    } catch (e) {
      console.error('Failed to parse session:', e)
    }
  }
  
  // Return default session with one folder and file
  const defaultFolderId = generateId()
  const defaultFileId = generateId()
  const projectContext = createDefaultProjectContext('My Project')
  const documentContexts: Record<string, DocumentContext> = {}
  
  documentContexts[defaultFileId] = createDocumentContext(defaultFileId)
  
  return {
    folders: [{
      id: defaultFolderId,
      name: 'My Project',
      files: [{
        id: defaultFileId,
        name: 'Untitled.txt',
        content: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }],
      createdAt: Date.now(),
      isExpanded: true
    }],
    activeFileId: defaultFileId,
    activeFolderId: defaultFolderId,
    projectContext,
    documentContexts
  }
}

export async function saveSession(session: SessionState): Promise<void> {
  // Save to file system (with localStorage fallback)
  await fileSystemManager.saveSession(session)
}

export function createFolder(name: string): FolderItem {
  const fileId = generateId()
  return {
    id: generateId(),
    name,
    files: [{
      id: fileId,
      name: 'Untitled.txt',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }],
    createdAt: Date.now(),
    isExpanded: true
  }
}

export function createFile(name: string): FileItem {
  return {
    id: generateId(),
    name,
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

// Helper functions for context management
export function updateProjectContext(session: SessionState, updates: Partial<ProjectContext>): SessionState {
  return {
    ...session,
    projectContext: {
      ...session.projectContext,
      ...updates,
      updatedAt: Date.now()
    }
  }
}

export function updateDocumentContext(
  session: SessionState,
  fileId: string,
  updates: Partial<DocumentContext>
): SessionState {
  const existingContext = session.documentContexts[fileId] || createDocumentContext(fileId)
  
  return {
    ...session,
    documentContexts: {
      ...session.documentContexts,
      [fileId]: {
        ...existingContext,
        ...updates,
        updatedAt: Date.now()
      }
    }
  }
}

export function ensureDocumentContext(session: SessionState, fileId: string): SessionState {
  if (!session.documentContexts[fileId]) {
    return updateDocumentContext(session, fileId, {})
  }
  return session
}