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

export interface ProjectContext {
  id: string
  name: string
  description?: string
  genre?: 'fiction' | 'non-fiction' | 'technical' | 'blog' | 'academic' | 'business' | 'other'
  style?: 'formal' | 'casual' | 'technical' | 'creative' | 'journalistic' | 'conversational'
  audience?: string
  systemPrompt?: string
  constraints?: string
  customFields?: Record<string, string>
  createdAt: number
  updatedAt: number
}

export interface DocumentContext {
  fileId: string
  purpose?: string
  status?: 'draft' | 'review' | 'final' | 'archived'
  documentNotes?: string
  customFields?: Record<string, string>
  createdAt: number
  updatedAt: number
}

export interface SessionState {
  folders: FolderItem[]
  activeFileId: string | null
  activeFolderId: string | null
  projectContext: ProjectContext
  documentContexts: Record<string, DocumentContext>
}

// Enhanced AI interaction types
export type AIMode = 
  | 'revise'         // Improve existing text
  | 'append'         // Continue existing text
  | 'continue'       // Continue story/narrative
  | 'ideas'          // Generate ideas and suggestions
  | 'summarize'      // Create summary
  | 'focus'          // Tighten and clarify
  | 'enhance'        // Add details and descriptions
  | 'custom'         // User-defined prompt

export interface CustomPromptRequest {
  mode: AIMode
  customPrompt?: string
  selectedText?: string
  requiresSelection: boolean
}

export interface PromptTemplate {
  id: string
  name: string
  description: string
  mode: AIMode
  promptText: string
  requiresSelection: boolean
  category: 'writing' | 'editing' | 'brainstorming' | 'analysis'
}

export interface AIAssistantState {
  isActive: boolean
  currentMode: AIMode
  customPrompt: string
  promptHistory: string[]
  favoriteTemplates: string[] // template IDs
}