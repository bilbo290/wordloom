import { SessionState, FolderItem, FileItem } from './types'
import { generateId } from './session'

// Check if File System Access API is supported
export const isFileSystemSupported = () => {
  const hasAPI = 'showDirectoryPicker' in window && 'showOpenFilePicker' in window && 'showSaveFilePicker' in window
  const isSecureContext = window.isSecureContext
  const isChromiumBrowser = navigator.userAgent.includes('Chrome') || navigator.userAgent.includes('Chromium') || navigator.userAgent.includes('Edge')
  
  console.log('File System API Debug:', {
    hasAPI,
    isSecureContext,
    isChromiumBrowser,
    userAgent: navigator.userAgent,
    location: window.location.href
  })
  
  return hasAPI && isSecureContext && isChromiumBrowser
}

// OS Detection
export const getOS = (): 'windows' | 'macos' | 'linux' | 'unknown' => {
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes('win')) return 'windows'
  if (userAgent.includes('mac')) return 'macos'
  if (userAgent.includes('linux')) return 'linux'
  return 'unknown'
}

// Get default document folder name based on OS
export const getDefaultDocumentPath = (): string => {
  const os = getOS()
  switch (os) {
    case 'windows':
      return 'C:\\Users\\<username>\\Documents\\Wordloom'
    case 'macos':
      return '~/Documents/Wordloom'
    case 'linux':
      return '~/Documents/Wordloom'
    default:
      return '~/Documents/Wordloom'
  }
}

export class FileSystemManager {
  private directoryHandle: FileSystemDirectoryHandle | null = null
  private fallbackToLocalStorage = false

  constructor() {
    this.fallbackToLocalStorage = !isFileSystemSupported()
  }

  // Initialize or select document directory
  async initializeDirectory(): Promise<boolean> {
    if (this.fallbackToLocalStorage) {
      console.log('File System Access API not supported, using localStorage')
      return false
    }

    try {
      console.log('Attempting to initialize file system directory...')
      
      // Show directory picker with better options
      const pickerOptions: any = {
        id: 'wordloom-docs',
        mode: 'readwrite'
      }
      
      // Try to set startIn to documents, fallback if not supported
      try {
        pickerOptions.startIn = 'documents'
      } catch (e) {
        console.log('startIn documents not supported, using default')
      }
      
      console.log('Showing directory picker with options:', pickerOptions)
      this.directoryHandle = await window.showDirectoryPicker(pickerOptions)
      console.log('Directory selected:', this.directoryHandle.name)

      // Verify permissions
      const permission = await this.directoryHandle.queryPermission({ mode: 'readwrite' })
      console.log('Current permission:', permission)
      
      if (permission !== 'granted') {
        console.log('Requesting permission...')
        const newPermission = await this.directoryHandle.requestPermission({ mode: 'readwrite' })
        console.log('New permission:', newPermission)
        
        if (newPermission !== 'granted') {
          throw new Error('Write permission denied by user')
        }
      }

      localStorage.setItem('wordloom-directory-selected', 'true')
      console.log('File system directory initialized successfully')
      return true
    } catch (error: any) {
      console.error('Failed to initialize directory:', error)
      
      if (error.name === 'AbortError') {
        console.log('User cancelled directory selection')
      } else if (error.name === 'NotAllowedError') {
        console.log('Permission denied for directory access')
      } else {
        console.log('Unexpected error:', error.message)
      }
      
      this.fallbackToLocalStorage = true
      return false
    }
  }

  // Get current directory path for display
  getCurrentPath(): string {
    if (this.fallbackToLocalStorage || !this.directoryHandle) {
      return 'Browser Storage (localStorage)'
    }
    return this.directoryHandle.name || 'Selected Folder'
  }

  // Save session to file system
  async saveSession(session: SessionState): Promise<void> {
    if (this.fallbackToLocalStorage || !this.directoryHandle) {
      // Fallback to localStorage
      localStorage.setItem('wordloom-session', JSON.stringify(session))
      return
    }

    try {
      // Save session metadata
      const sessionFile = await this.directoryHandle.getFileHandle('wordloom-session.json', { create: true })
      const sessionData = {
        folders: session.folders.map(f => ({
          id: f.id,
          name: f.name,
          createdAt: f.createdAt,
          isExpanded: f.isExpanded,
          fileCount: f.files.length
        })),
        activeFileId: session.activeFileId,
        activeFolderId: session.activeFolderId
      }
      
      const writable = await sessionFile.createWritable()
      await writable.write(JSON.stringify(sessionData, null, 2))
      await writable.close()

      // Save each folder and its files
      for (const folder of session.folders) {
        await this.saveFolder(folder)
      }

      // Also save to localStorage as backup
      localStorage.setItem('wordloom-session', JSON.stringify(session))
    } catch (error) {
      console.error('Failed to save to file system, falling back to localStorage:', error)
      localStorage.setItem('wordloom-session', JSON.stringify(session))
    }
  }

  // Load session from file system
  async loadSession(): Promise<SessionState | null> {
    if (this.fallbackToLocalStorage || !this.directoryHandle) {
      // Fallback to localStorage
      const stored = localStorage.getItem('wordloom-session')
      return stored ? JSON.parse(stored) : null
    }

    try {
      // Load session metadata
      const sessionFile = await this.directoryHandle.getFileHandle('wordloom-session.json')
      const file = await sessionFile.getFile()
      const sessionData = JSON.parse(await file.text())

      // Load folders and files
      const folders: FolderItem[] = []
      for (const folderMeta of sessionData.folders) {
        const folder = await this.loadFolder(folderMeta.name, folderMeta)
        if (folder) folders.push(folder)
      }

      // Use migration logic from session.ts  
      const { migrateSession } = await import('./session')
      return migrateSession({
        folders,
        activeFileId: sessionData.activeFileId,
        activeFolderId: sessionData.activeFolderId
      })
    } catch (error) {
      console.warn('Failed to load from file system, falling back to localStorage:', error)
      const stored = localStorage.getItem('wordloom-session')
      return stored ? JSON.parse(stored) : null
    }
  }

  // Save individual folder
  private async saveFolder(folder: FolderItem): Promise<void> {
    if (!this.directoryHandle) return

    try {
      // Create folder directory
      const folderHandle = await this.directoryHandle.getDirectoryHandle(folder.name, { create: true })
      
      // Save each file in the folder
      for (const file of folder.files) {
        const fileName = this.sanitizeFileName(file.name)
        const fileHandle = await folderHandle.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(file.content)
        await writable.close()

        // Save file metadata
        const metaFileName = fileName + '.meta.json'
        const metaHandle = await folderHandle.getFileHandle(metaFileName, { create: true })
        const metaWritable = await metaHandle.createWritable()
        await metaWritable.write(JSON.stringify({
          id: file.id,
          name: file.name,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt
        }, null, 2))
        await metaWritable.close()
      }
    } catch (error) {
      console.error('Failed to save folder:', folder.name, error)
    }
  }

  // Load individual folder
  private async loadFolder(folderName: string, meta: any): Promise<FolderItem | null> {
    if (!this.directoryHandle) return null

    try {
      const folderHandle = await this.directoryHandle.getDirectoryHandle(folderName)
      const files: FileItem[] = []

      for await (const [name, handle] of folderHandle.entries()) {
        if (handle.kind === 'file' && !name.endsWith('.meta.json')) {
          // Load file content
          const fileHandle = handle as FileSystemFileHandle
          const file = await fileHandle.getFile()
          const content = await file.text()

          // Load file metadata
          let fileMeta
          try {
            const metaHandle = await folderHandle.getFileHandle(name + '.meta.json')
            const metaFile = await metaHandle.getFile()
            fileMeta = JSON.parse(await metaFile.text())
          } catch {
            // Create metadata if missing
            fileMeta = {
              id: generateId(),
              name: name,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
          }

          files.push({
            id: fileMeta.id,
            name: fileMeta.name,
            content,
            createdAt: fileMeta.createdAt,
            updatedAt: fileMeta.updatedAt
          })
        }
      }

      return {
        id: meta.id || generateId(),
        name: folderName,
        files,
        createdAt: meta.createdAt || Date.now(),
        isExpanded: meta.isExpanded
      }
    } catch (error) {
      console.error('Failed to load folder:', folderName, error)
      return null
    }
  }

  // Sanitize file name for file system
  private sanitizeFileName(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_')
  }

  // Export session as zip (optional enhancement)
  async exportSession(session: SessionState): Promise<void> {
    if (!isFileSystemSupported()) {
      throw new Error('File system export not supported')
    }

    try {
      const options = {
        types: [{
          description: 'Wordloom backup',
          accept: { 'application/json': ['.json'] }
        }]
      }

      const fileHandle = await window.showSaveFilePicker(options)
      const writable = await fileHandle.createWritable()
      await writable.write(JSON.stringify(session, null, 2))
      await writable.close()
    } catch (error) {
      console.error('Export failed:', error)
      throw error
    }
  }

  // Import session from file
  async importSession(): Promise<SessionState | null> {
    if (!isFileSystemSupported()) {
      throw new Error('File system import not supported')
    }

    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'Wordloom backup',
          accept: { 'application/json': ['.json'] }
        }]
      })

      const file = await fileHandle.getFile()
      const content = await file.text()
      return JSON.parse(content)
    } catch (error) {
      console.error('Import failed:', error)
      return null
    }
  }
}

export const fileSystemManager = new FileSystemManager()