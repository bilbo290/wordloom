import { useState, useEffect, useCallback } from 'react'
import { streamText } from 'ai'
import { BlockEditor } from '@/components/editor/BlockEditor'
import { SelectionToolbar } from '@/components/editor/SelectionToolbar'
import { Sidebar } from '@/components/Sidebar'
import { ContextTabs } from '@/components/ContextTabs'
import { ProjectSettingsModal } from '@/components/ProjectSettingsModal'
import { useToast } from '@/components/ui/use-toast'
import { createAIProvider, getModel, buildEnhancedPrompt, type AIProvider } from '@/lib/ai'
import { 
  loadSession, 
  saveSession, 
  createFolder, 
  createFile, 
  updateProjectContext,
  updateDocumentContext,
  ensureDocumentContext
} from '@/lib/session'
import { SessionState, ProjectContext, DocumentContext } from '@/lib/types'

const CONTEXT_CHARS = 800

export function EditorWithSidebar() {
  const [session, setSession] = useState<SessionState | null>(null)
  const [sessionContext, setSessionContext] = useState('')
  const [selectedLines, setSelectedLines] = useState({ start: -1, end: -1 })
  const [mode, setMode] = useState<'revise' | 'append'>('revise')
  const [temperature, setTemperature] = useState(0.7)
  const [isStreaming, setIsStreaming] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [aiProvider, setAiProvider] = useState<AIProvider>('lmstudio')
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false)
  const { toast } = useToast()

  // Load session on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const loadedSession = await loadSession()
        setSession(loadedSession)
      } catch (error) {
        console.error('Failed to load session:', error)
        toast({
          title: 'Failed to load session',
          description: 'Using default session',
          variant: 'destructive'
        })
      }
    }
    initializeSession()
  }, [toast])

  // Auto-save session
  useEffect(() => {
    if (!session) return
    
    const timeout = setTimeout(async () => {
      try {
        await saveSession(session)
      } catch (error) {
        console.error('Failed to save session:', error)
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [session])

  // Get current file content
  const getCurrentFile = useCallback(() => {
    if (!session || !session.activeFileId || !session.activeFolderId) return null
    const folder = session.folders.find(f => f.id === session.activeFolderId)
    if (!folder) return null
    return folder.files.find(f => f.id === session.activeFileId)
  }, [session])

  const currentFile = getCurrentFile()
  const content = currentFile?.content || ''

  const updateFileContent = (newContent: string) => {
    setSession(prev => {
      if (!prev) return null
      const newSession = { ...prev }
      const folder = newSession.folders.find(f => f.id === prev.activeFolderId)
      if (folder) {
        const file = folder.files.find(f => f.id === prev.activeFileId)
        if (file) {
          file.content = newContent
          file.updatedAt = Date.now()
        }
      }
      return newSession
    })
  }

  const handleFileSelect = (folderId: string, fileId: string) => {
    setSession(prev => {
      if (!prev) return null
      return {
        ...prev,
        activeFolderId: folderId,
        activeFileId: fileId
      }
    })
    setSelectedLines({ start: -1, end: -1 })
  }

  const handleFolderToggle = (folderId: string) => {
    setSession(prev => {
      if (!prev) return null
      const newSession = { ...prev }
      const folder = newSession.folders.find(f => f.id === folderId)
      if (folder) {
        folder.isExpanded = !folder.isExpanded
      }
      return newSession
    })
  }

  const handleFolderCreate = () => {
    const newFolder = createFolder('New Folder')
    setSession(prev => {
      if (!prev) return null
      return {
        ...prev,
        folders: [...prev.folders, newFolder],
        activeFolderId: newFolder.id,
        activeFileId: newFolder.files[0].id
      }
    })
  }

  const handleFileCreate = (folderId: string) => {
    const newFile = createFile('Untitled.txt')
    setSession(prev => {
      if (!prev) return null
      const newSession = { ...prev }
      const folder = newSession.folders.find(f => f.id === folderId)
      if (folder) {
        folder.files.push(newFile)
        newSession.activeFolderId = folderId
        newSession.activeFileId = newFile.id
      }
      return ensureDocumentContext(newSession, newFile.id)
    })
  }

  const handleFolderRename = (folderId: string, newName: string) => {
    setSession(prev => {
      if (!prev) return null
      const newSession = { ...prev }
      const folder = newSession.folders.find(f => f.id === folderId)
      if (folder) {
        folder.name = newName
      }
      return newSession
    })
  }

  const handleFileRename = (folderId: string, fileId: string, newName: string) => {
    setSession(prev => {
      if (!prev) return null
      const newSession = { ...prev }
      const folder = newSession.folders.find(f => f.id === folderId)
      if (folder) {
        const file = folder.files.find(f => f.id === fileId)
        if (file) {
          file.name = newName
          file.updatedAt = Date.now()
        }
      }
      return newSession
    })
  }

  const handleFolderDelete = (folderId: string) => {
    setSession(prev => {
      if (!prev) return null
      const newSession = { ...prev }
      newSession.folders = newSession.folders.filter(f => f.id !== folderId)
      
      // If we deleted the active folder, select another
      if (prev.activeFolderId === folderId && newSession.folders.length > 0) {
        const firstFolder = newSession.folders[0]
        newSession.activeFolderId = firstFolder.id
        newSession.activeFileId = firstFolder.files[0]?.id || null
      }
      
      return newSession
    })
  }

  const handleFileDelete = (folderId: string, fileId: string) => {
    setSession(prev => {
      if (!prev) return null
      const newSession = { ...prev }
      const folder = newSession.folders.find(f => f.id === folderId)
      if (folder) {
        folder.files = folder.files.filter(f => f.id !== fileId)
        
        // Remove document context for deleted file
        delete newSession.documentContexts[fileId]
        
        // If we deleted the active file, select another
        if (prev.activeFileId === fileId && folder.files.length > 0) {
          newSession.activeFileId = folder.files[0].id
        } else if (folder.files.length === 0) {
          // Create a new file if folder is empty
          const newFile = createFile('Untitled.txt')
          folder.files.push(newFile)
          newSession.activeFileId = newFile.id
        }
      }
      return newSession
    })
  }

  // Context management handlers
  const handleProjectContextUpdate = (updates: Partial<ProjectContext>) => {
    if (!session) return
    setSession(updateProjectContext(session, updates))
  }

  const handleDocumentContextUpdate = (updates: Partial<DocumentContext>) => {
    if (!session || !session.activeFileId) return
    setSession(updateDocumentContext(session, session.activeFileId, updates))
  }

  // Ensure document context exists when switching files
  useEffect(() => {
    if (session?.activeFileId) {
      setSession(prevSession => 
        prevSession ? ensureDocumentContext(prevSession, session.activeFileId!) : prevSession
      )
    }
  }, [session?.activeFileId])

  const getSelectedText = useCallback(() => {
    if (selectedLines.start === -1) return ''
    const lines = content.split('\n')
    return lines.slice(selectedLines.start, selectedLines.end + 1).join('\n')
  }, [content, selectedLines])

  const getContext = useCallback(() => {
    if (selectedLines.start === -1) return { left: '', right: '' }
    
    const lines = content.split('\n')
    const beforeLines = lines.slice(0, selectedLines.start)
    const afterLines = lines.slice(selectedLines.end + 1)
    
    let leftContext = beforeLines.join('\n')
    if (leftContext.length > CONTEXT_CHARS) {
      leftContext = '...' + leftContext.slice(-CONTEXT_CHARS)
    }
    
    let rightContext = afterLines.join('\n')
    if (rightContext.length > CONTEXT_CHARS) {
      rightContext = rightContext.slice(0, CONTEXT_CHARS) + '...'
    }
    
    return { left: leftContext, right: rightContext }
  }, [content, selectedLines])

  const handleRunAI = async () => {
    const selectedText = getSelectedText()
    if (!selectedText || !session) {
      toast({
        title: 'No selection',
        description: 'Please select some text first',
        variant: 'destructive'
      })
      return
    }

    setIsStreaming(true)
    setPreviewContent('')
    
    try {
      const { left, right } = getContext()
      const documentContext = session.activeFileId 
        ? session.documentContexts[session.activeFileId] 
        : undefined
      
      const { systemMessage, userPrompt } = buildEnhancedPrompt(
        session.projectContext,
        documentContext,
        sessionContext,
        left,
        selectedText,
        right,
        mode
      )

      const provider = createAIProvider(aiProvider)
      const model = getModel(aiProvider)
      
      const { textStream } = await streamText({
        model: provider.chat(model),
        temperature,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userPrompt }
        ]
      })

      let accumulated = ''
      for await (const chunk of textStream) {
        accumulated += chunk
        setPreviewContent(accumulated)
      }
    } catch (error) {
      console.error('AI streaming error:', error)
      toast({
        title: 'AI Error',
        description: `Failed to generate content. Is ${aiProvider === 'ollama' ? 'Ollama' : 'LM Studio'} running?`,
        variant: 'destructive'
      })
    } finally {
      setIsStreaming(false)
    }
  }

  const handleInsertPreview = () => {
    if (!previewContent) return
    
    const lines = content.split('\n')
    
    if (mode === 'revise') {
      const newLines = [
        ...lines.slice(0, selectedLines.start),
        ...previewContent.split('\n'),
        ...lines.slice(selectedLines.end + 1)
      ]
      updateFileContent(newLines.join('\n'))
    } else {
      const newLines = [
        ...lines.slice(0, selectedLines.end + 1),
        ...previewContent.split('\n'),
        ...lines.slice(selectedLines.end + 1)
      ]
      updateFileContent(newLines.join('\n'))
    }
    
    setPreviewContent('')
    setSelectedLines({ start: -1, end: -1 })
    toast({
      title: 'Applied',
      description: mode === 'revise' ? 'Text revised' : 'Text appended'
    })
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRunAI()
    }
  }, [handleRunAI])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Show loading while session is initializing
  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10">
        <div className="text-center glass rounded-2xl p-8 shadow-elegant animate-fade-in">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary mx-auto shadow-glow"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500/20 to-blue-500/20 animate-pulse"></div>
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-lg font-semibold text-gradient">Loading Wordloom</p>
            <p className="text-sm text-muted-foreground">Preparing your documents...</p>
          </div>
          <div className="flex justify-center gap-1 mt-4">
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{animationDelay: '0s'}}></div>
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          folders={session.folders}
          activeFileId={session.activeFileId}
          activeFolderId={session.activeFolderId}
          onFileSelect={handleFileSelect}
          onFolderToggle={handleFolderToggle}
          onFolderCreate={handleFolderCreate}
          onFileCreate={handleFileCreate}
          onFolderRename={handleFolderRename}
          onFileRename={handleFileRename}
          onFolderDelete={handleFolderDelete}
          onFileDelete={handleFileDelete}
        />

        {/* Main editor */}
        <div className="flex-1 flex flex-col border-r">
          {currentFile && (
            <div className="px-4 py-3 border-b bg-gradient-to-r from-muted/20 to-muted/40 backdrop-blur-sm animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {session.folders.find(f => f.id === session.activeFolderId)?.name}
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-sm text-gradient-subtle font-medium">
                    {currentFile.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="px-2 py-1 bg-accent/20 rounded-md">
                    {content.split(' ').filter(word => word.length > 0).length} words
                  </span>
                  <span className="px-2 py-1 bg-accent/20 rounded-md">
                    {content.length} characters
                  </span>
                  <span className="px-2 py-1 bg-accent/20 rounded-md">
                    {content.split('\n').length} lines
                  </span>
                </div>
              </div>
            </div>
          )}
          <BlockEditor
            value={content}
            onChange={updateFileContent}
            selectedLines={selectedLines}
            onSelectionChange={setSelectedLines}
          />
        </div>

        {/* Right panel - Context Tabs */}
        <div className="w-96 bg-gradient-to-b from-muted/10 to-muted/5 animate-fade-in">
          <ContextTabs
            projectContext={session.projectContext}
            onProjectSettingsClick={() => setIsProjectSettingsOpen(true)}
            documentContext={session.activeFileId ? session.documentContexts[session.activeFileId] : undefined}
            onDocumentContextUpdate={handleDocumentContextUpdate}
            sessionContext={sessionContext}
            onSessionContextChange={setSessionContext}
            previewContent={previewContent}
            isStreaming={isStreaming}
            onInsertPreview={handleInsertPreview}
            onClearPreview={() => setPreviewContent('')}
            currentFileName={currentFile?.name}
          />
        </div>
      </div>

      {/* Selection toolbar */}
      <SelectionToolbar
        mode={mode}
        temperature={temperature}
        aiProvider={aiProvider}
        onModeChange={setMode}
        onTemperatureChange={setTemperature}
        onAIProviderChange={setAiProvider}
        onRunAI={handleRunAI}
        hasSelection={selectedLines.start !== -1}
        isStreaming={isStreaming}
      />

      {/* Project Settings Modal */}
      <ProjectSettingsModal
        projectContext={session.projectContext}
        isOpen={isProjectSettingsOpen}
        onClose={() => setIsProjectSettingsOpen(false)}
        onSave={handleProjectContextUpdate}
      />
    </div>
  )
}