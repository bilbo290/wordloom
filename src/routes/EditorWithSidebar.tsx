import { useState, useEffect, useCallback } from 'react'
import { streamText } from 'ai'
import { MonacoEditor } from '@/components/editor/MonacoEditor'
import { SelectionToolbar } from '@/components/editor/SelectionToolbar'
import { Sidebar } from '@/components/Sidebar'
import { ContextTabs } from '@/components/ContextTabs'
import { ProjectSettingsModal } from '@/components/ProjectSettingsModal'
import { SplitPane } from '@/components/SplitPane'
import { AIPreviewPane } from '@/components/AIPreviewPane'
import { useToast } from '@/components/ui/use-toast'
import { createAIProvider, getModel, buildEnhancedPrompt, buildDocumentLevelPrompt, type AIProvider } from '@/lib/ai'
import {
  loadSession,
  saveSession,
  createFolder,
  createFile,
  updateProjectContext,
  updateDocumentContext,
  ensureDocumentContext
} from '@/lib/session'
import { SessionState, ProjectContext, DocumentContext, AIMode } from '@/lib/types'

const CONTEXT_CHARS = 800

export function EditorWithSidebar() {
  const [session, setSession] = useState<SessionState | null>(null)
  const [sessionContext, setSessionContext] = useState('')
  const [selectedLines, setSelectedLines] = useState({ start: -1, end: -1 })
  const [mode, setMode] = useState<AIMode>('revise')
  const [temperature, setTemperature] = useState(0.7)
  const [isStreaming, setIsStreaming] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [aiProvider, setAiProvider] = useState<AIProvider>('ollama')
  const [customPrompt, setCustomPrompt] = useState('')
  const [promptHistory, setPromptHistory] = useState<string[]>([])
  const [favoritePrompts, setFavoritePrompts] = useState<string[]>([])
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false)
  const [isPreviewVisible, setIsPreviewVisible] = useState(false)
  const [lastAICallTime, setLastAICallTime] = useState(0)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const { toast } = useToast()

  // Load session and prompt data on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const loadedSession = await loadSession()
        setSession(loadedSession)

        // Load prompt history and favorites from localStorage
        const savedHistory = localStorage.getItem('wordloom-prompt-history')
        if (savedHistory) {
          setPromptHistory(JSON.parse(savedHistory))
        }

        const savedFavorites = localStorage.getItem('wordloom-favorite-prompts')
        if (savedFavorites) {
          setFavoritePrompts(JSON.parse(savedFavorites))
        }
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

  // Save prompt history to localStorage
  useEffect(() => {
    if (promptHistory.length > 0) {
      localStorage.setItem('wordloom-prompt-history', JSON.stringify(promptHistory))
    }
  }, [promptHistory])

  // Save favorite prompts to localStorage
  useEffect(() => {
    if (favoritePrompts.length > 0) {
      localStorage.setItem('wordloom-favorite-prompts', JSON.stringify(favoritePrompts))
    }
  }, [favoritePrompts])

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

  const handleStopAI = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setIsStreaming(false)
      toast({
        title: 'AI Generation Stopped',
        description: 'The current AI request has been cancelled',
        variant: 'default'
      })
    }
  }

  const handleRunAI = async () => {
    // Prevent double-clicks - minimum 1 second between calls
    const now = Date.now()
    if (now - lastAICallTime < 1000) {
      toast({
        title: 'Please wait',
        description: 'AI request already in progress',
        variant: 'default'
      })
      return
    }
    setLastAICallTime(now)

    const selectedText = getSelectedText()

    // Check if selection is required for this mode
    const requiresSelection = !['ideas'].includes(mode)

    if (requiresSelection && !selectedText) {
      toast({
        title: 'No selection',
        description: 'Please select some text first',
        variant: 'destructive'
      })
      return
    }

    if (!session) return

    // Create new AbortController for this request
    const controller = new AbortController()
    setAbortController(controller)

    setIsStreaming(true)
    setPreviewContent('')
    // Don't show preview immediately - wait for first content chunk

    try {
      const documentContext = session.activeFileId
        ? session.documentContexts[session.activeFileId]
        : undefined

      let systemMessage: string
      let userPrompt: string

      if (requiresSelection && selectedText) {
        // Selection-based AI request
        const { left, right } = getContext()
        const result = buildEnhancedPrompt(
          session.projectContext,
          documentContext,
          sessionContext,
          left,
          selectedText,
          right,
          mode,
          mode === 'custom' ? customPrompt : undefined
        )
        systemMessage = result.systemMessage
        userPrompt = result.userPrompt
      } else {
        // Document-level AI request
        const result = buildDocumentLevelPrompt(
          session.projectContext,
          documentContext,
          sessionContext,
          content,
          mode,
          mode === 'custom' ? customPrompt : undefined
        )
        systemMessage = result.systemMessage
        userPrompt = result.userPrompt
      }

      // Add to prompt history if using custom prompt
      if (mode === 'custom' && customPrompt.trim()) {
        setPromptHistory(prev => {
          const newHistory = [customPrompt.trim(), ...prev.filter(p => p !== customPrompt.trim())]
          return newHistory.slice(0, 10) // Keep last 10 prompts
        })
      }

      const provider = createAIProvider(aiProvider)
      const model = getModel(aiProvider)

      const { textStream } = await streamText({
        model: provider.chat(model),
        temperature,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userPrompt }
        ],
        abortSignal: controller.signal
      })

      let accumulated = ''
      let isFirstChunk = true
      for await (const chunk of textStream) {
        accumulated += chunk
        setPreviewContent(accumulated)
        
        // Show preview pane on first chunk
        if (isFirstChunk) {
          setIsPreviewVisible(true)
          isFirstChunk = false
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, don't show error
        console.log('AI request aborted')
      } else {
        console.error('AI streaming error:', error)
        toast({
          title: 'AI Error',
          description: `Failed to generate content. Is ${aiProvider === 'ollama' ? 'Ollama' : 'LM Studio'} running?`,
          variant: 'destructive'
        })
      }
    } finally {
      setIsStreaming(false)
      setAbortController(null)
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

  // Handler for document-level AI requests from AI Assistant Panel
  const handleRunDocumentAI = async (aiMode: AIMode, customPromptText?: string) => {
    // Prevent double-clicks - minimum 1 second between calls
    const now = Date.now()
    if (now - lastAICallTime < 1000) {
      toast({
        title: 'Please wait',
        description: 'AI request already in progress',
        variant: 'default'
      })
      return
    }
    setLastAICallTime(now)

    if (!session) return

    // Create new AbortController for this request
    const controller = new AbortController()
    setAbortController(controller)

    // Set the mode and custom prompt, then run AI
    setMode(aiMode)
    if (customPromptText) {
      setCustomPrompt(customPromptText)
    }

    // Clear selection for document-level requests
    setSelectedLines({ start: -1, end: -1 })

    setIsStreaming(true)
    setPreviewContent('')
    // Don't show preview immediately - wait for first content chunk

    try {
      const documentContext = session.activeFileId
        ? session.documentContexts[session.activeFileId]
        : undefined

      const { systemMessage, userPrompt } = buildDocumentLevelPrompt(
        session.projectContext,
        documentContext,
        sessionContext,
        content,
        aiMode,
        customPromptText
      )

      // Add to prompt history if using custom prompt
      if (customPromptText?.trim()) {
        setPromptHistory(prev => {
          const newHistory = [customPromptText.trim(), ...prev.filter(p => p !== customPromptText.trim())]
          return newHistory.slice(0, 10)
        })
      }

      const provider = createAIProvider(aiProvider)
      const model = getModel(aiProvider)

      const { textStream } = await streamText({
        model: provider.chat(model),
        temperature,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userPrompt }
        ],
        abortSignal: controller.signal
      })

      let accumulated = ''
      let isFirstChunk = true
      for await (const chunk of textStream) {
        accumulated += chunk
        setPreviewContent(accumulated)
        
        // Show preview pane on first chunk
        if (isFirstChunk) {
          setIsPreviewVisible(true)
          isFirstChunk = false
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, don't show error
        console.log('AI request aborted')
      } else {
        console.error('AI streaming error:', error)
        toast({
          title: 'AI Error',
          description: `Failed to generate content. Is ${aiProvider === 'ollama' ? 'Ollama' : 'LM Studio'} running?`,
          variant: 'destructive'
        })
      }
    } finally {
      setIsStreaming(false)
      setAbortController(null)
    }
  }

  const handleAddToFavorites = (prompt: string) => {
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt || favoritePrompts.includes(trimmedPrompt)) {
      toast({
        title: 'Already in favorites',
        description: 'This prompt is already saved',
        variant: 'default'
      })
      return
    }

    setFavoritePrompts(prev => [trimmedPrompt, ...prev].slice(0, 20)) // Keep max 20 favorites
    toast({
      title: 'Added to favorites',
      description: 'Prompt saved for future use',
    })
  }

  const handleRemoveFromFavorites = (prompt: string) => {
    setFavoritePrompts(prev => prev.filter(p => p !== prompt))
    toast({
      title: 'Removed from favorites',
      description: 'Prompt removed successfully',
    })
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRunAI()
    } else if (e.key === 'Escape' && isStreaming) {
      e.preventDefault()
      handleStopAI()
    }
  }, [handleRunAI, handleStopAI, isStreaming])

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
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className={`flex-1 flex min-h-0 ${(selectedLines.start !== -1 || mode === 'ideas') ? 'pb-32' : ''}`}>
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

        {/* Main content area with split pane */}
        <div className="flex-1 min-h-0">
          <SplitPane 
            defaultSize="50%"
            minSize={300}
            disabled={!isPreviewVisible}
          >
            {/* Editor pane */}
            <div className="flex flex-col border-r min-h-0 h-full">
              {currentFile && (
                <div className="px-4 py-3 border-b bg-gradient-to-r from-muted/20 to-muted/40 backdrop-blur-sm animate-fade-in flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {session.folders.find(f => f.id === session.activeFolderId)?.name}
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-sm text-gradient-subtle font-medium">
                        {currentFile.name}
                      </span>
                      {isStreaming && (
                        <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-primary/10 rounded-md">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                          <span className="text-xs text-primary font-medium">AI Generating</span>
                        </div>
                      )}
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
              <div className="flex-1 min-h-0 h-full resizable-both overflow-hidden">
                <MonacoEditor
                  value={content}
                  onChange={updateFileContent}
                  selectedLines={selectedLines}
                  onSelectionChange={setSelectedLines}
                />
              </div>
            </div>

            {/* AI Preview pane */}
            <AIPreviewPane
              previewContent={previewContent}
              isStreaming={isStreaming}
              onInsertPreview={handleInsertPreview}
              onClearPreview={() => setPreviewContent('')}
              onClose={() => setIsPreviewVisible(false)}
              onStopGeneration={handleStopAI}
              isVisible={isPreviewVisible}
            />
          </SplitPane>
        </div>

        {/* Right panel - Simplified ContextTabs */}
        <div className="w-96 bg-gradient-to-b from-muted/10 to-muted/5 animate-fade-in min-h-0">
          <ContextTabs
            projectContext={session.projectContext}
            onProjectSettingsClick={() => setIsProjectSettingsOpen(true)}
            documentContext={session.activeFileId ? session.documentContexts[session.activeFileId] : undefined}
            onDocumentContextUpdate={handleDocumentContextUpdate}
            sessionContext={sessionContext}
            onSessionContextChange={setSessionContext}
            currentFileName={currentFile?.name}
            onRunDocumentAI={handleRunDocumentAI}
            isStreaming={isStreaming}
            promptHistory={promptHistory}
            favoritePrompts={favoritePrompts}
            onAddToFavorites={handleAddToFavorites}
            onRemoveFromFavorites={handleRemoveFromFavorites}
            documentContent={content}
          />
        </div>
      </div>

      {/* Selection toolbar - fixed position at bottom */}
      {(selectedLines.start !== -1 || mode === 'ideas') && (
        <div className="fixed bottom-2 left-2 right-2 border border-border/30 rounded-lg bg-background/95 backdrop-blur-sm shadow-lg z-50">
          <SelectionToolbar
            mode={mode}
            temperature={temperature}
            aiProvider={aiProvider}
            customPrompt={customPrompt}
            onModeChange={setMode}
            onTemperatureChange={setTemperature}
            onAIProviderChange={setAiProvider}
            onCustomPromptChange={setCustomPrompt}
            onRunAI={handleRunAI}
            onStopAI={handleStopAI}
            hasSelection={selectedLines.start !== -1}
            isStreaming={isStreaming}
          />
        </div>
      )}

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