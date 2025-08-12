export interface FileItem {
  id: string
  name: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface FolderItem {
  id: string
  name: string
  files: FileItem[]
  createdAt: number
  isExpanded?: boolean
}

export interface SessionState {
  folders: FolderItem[]
  activeFileId: string | null
  activeFolderId: string | null
}