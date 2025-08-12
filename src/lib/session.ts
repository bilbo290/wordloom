import { SessionState, FolderItem, FileItem } from './types'
import { fileSystemManager } from './filesystem'

const SESSION_STORAGE_KEY = 'wordloom-session'

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export async function loadSession(): Promise<SessionState> {
  // Try to load from file system first
  try {
    const fileSystemSession = await fileSystemManager.loadSession()
    if (fileSystemSession) {
      return fileSystemSession
    }
  } catch (error) {
    console.warn('Failed to load from file system:', error)
  }

  // Fallback to localStorage
  const stored = localStorage.getItem(SESSION_STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('Failed to parse session:', e)
    }
  }
  
  // Return default session with one folder and file
  const defaultFolderId = generateId()
  const defaultFileId = generateId()
  
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
    activeFolderId: defaultFolderId
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