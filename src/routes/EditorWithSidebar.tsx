import { useState, useEffect, useCallback } from 'react'
import { streamText } from 'ai'
import { MonacoEditor } from '@/components/editor/MonacoEditor'
import { Sidebar } from '@/components/Sidebar'
import { ContextTabs } from '@/components/ContextTabs'
import { ProjectSettingsModal } from '@/components/ProjectSettingsModal'
import { SplitPane } from '@/components/SplitPane'
import { AIPreviewPane } from '@/components/AIPreviewPane'
import { ContextPreview } from '@/components/ContextPreview'
import { useToast } from '@/components/ui/use-toast'
import { 
  createAIProvider, 
  getModel, 
  buildDocumentLevelPrompt, 
  buildEnhancedPrompt,
  buildSmartDocumentLevelPrompt,
  type AIProvider 
} from '@/lib/ai'
import {
  loadSession,
  saveSession,
  createFolder,
  createFile,
  updateProjectContext,
  updateDocumentContext,
  ensureDocumentContext
} from '@/lib/session'
import { SessionState, ProjectContext, DocumentContext, AIMode, SmartContextResult } from '@/lib/types'

// CONTEXT_CHARS removed since helper functions no longer need it

export function EditorWithSidebar() {
  const [session, setSession] = useState<SessionState | null>(null)
  const [sessionContext, setSessionContext] = useState('')
  const [selectedLines, setSelectedLines] = useState({ start: -1, end: -1 })
  const [selectedText, setSelectedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [promptHistory, setPromptHistory] = useState<string[]>([])
  const [favoritePrompts, setFavoritePrompts] = useState<string[]>([])
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false)
  const [isPreviewVisible, setIsPreviewVisible] = useState(false)
  const [lastAICallTime, setLastAICallTime] = useState(0)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [aiProvider, setAIProvider] = useState<AIProvider>('ollama')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [lastAIRequest, setLastAIRequest] = useState<{
    type: 'selection' | 'document'
    mode: string
    customPrompt?: string
    selectedText?: string
    selectedLines?: { start: number; end: number }
  } | null>(null)
  
  // Smart context management state
  const [useSmartContext, setUseSmartContext] = useState(true)
  const [lastContextInfo, setLastContextInfo] = useState<SmartContextResult | null>(null)
  const [contextPreviewVisible, setContextPreviewVisible] = useState(false)
  
  const { toast } = useToast()

  // Derived values
  const currentFile = session?.activeFileId 
    ? session.folders.find(f => f.id === session.activeFolderId)?.files.find(f => f.id === session.activeFileId)
    : null
  const content = currentFile?.content || ''

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

        // Load AI provider preference
        const savedProvider = localStorage.getItem('wordloom-ai-provider') as AIProvider
        if (savedProvider && (savedProvider === 'ollama' || savedProvider === 'lmstudio')) {
          setAIProvider(savedProvider)
        }

        // Load selected model preference
        const savedModel = localStorage.getItem('wordloom-selected-model')
        if (savedModel) {
          setSelectedModel(savedModel)
        } else {
          // Set default model based on provider
          setSelectedModel(savedProvider === 'ollama' ? 'llama3.2' : 'lmstudio')
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

  // Save AI provider preference to localStorage
  useEffect(() => {
    localStorage.setItem('wordloom-ai-provider', aiProvider)
  }, [aiProvider])

  // Save selected model preference to localStorage
  useEffect(() => {
    localStorage.setItem('wordloom-selected-model', selectedModel)
  }, [selectedModel])

  // Update model when provider changes
  useEffect(() => {
    if (aiProvider === 'ollama' && !selectedModel.includes(':') && selectedModel !== 'llama3.2' && selectedModel !== 'llama3.1' && selectedModel !== 'gemma2' && selectedModel !== 'mistral' && selectedModel !== 'codellama') {
      setSelectedModel('llama3.2')
    } else if (aiProvider === 'lmstudio' && selectedModel !== 'lmstudio' && selectedModel !== 'custom') {
      setSelectedModel('lmstudio')
    }
  }, [aiProvider, selectedModel])

  // Listen for provider changes from Settings page
  useEffect(() => {
    const checkProviderChange = () => {
      const currentProvider = localStorage.getItem('wordloom-ai-provider') as AIProvider
      if (currentProvider && currentProvider !== aiProvider) {
        setAIProvider(currentProvider)
        // Update model to default for the new provider
        setSelectedModel(currentProvider === 'ollama' ? 'llama3.2' : 'lmstudio')
      }
    }
    
    // Check every 500ms
    const interval = setInterval(checkProviderChange, 500)
    return () => clearInterval(interval)
  }, [aiProvider])

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
    setSelectedText('')
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

  // Helper functions for context extraction
  const getSelectedText = useCallback(() => {
    // Use the actual selected text from Monaco Editor
    return selectedText
  }, [selectedText])

  const getContext = useCallback(() => {
    if (!selectedText) return { left: '', right: '' }
    
    const CONTEXT_CHARS = 800
    
    // Find the position of selected text in the content
    const selectionStart = content.indexOf(selectedText)
    if (selectionStart === -1) return { left: '', right: '' }
    
    const selectionEnd = selectionStart + selectedText.length
    
    // Get left context (up to CONTEXT_CHARS before selection)
    let leftContext = content.substring(0, selectionStart)
    if (leftContext.length > CONTEXT_CHARS) {
      leftContext = '...' + leftContext.slice(-CONTEXT_CHARS)
    }
    
    // Get right context (up to CONTEXT_CHARS after selection)
    let rightContext = content.substring(selectionEnd)
    if (rightContext.length > CONTEXT_CHARS) {
      rightContext = rightContext.slice(0, CONTEXT_CHARS) + '...'
    }
    
    return { left: leftContext, right: rightContext }
  }, [content, selectedText])

  // Handler for selection-based AI requests (Continue Story, Revise, Append, Custom)
  const handleSelectionAI = useCallback(async (mode: 'continue' | 'revise' | 'append' | 'custom', customDirection?: string) => {
    const selectedText = getSelectedText()
    if (!selectedText.trim()) {
      toast({
        title: 'No selection',
        description: 'Please select some text first',
        variant: 'destructive'
      })
      return
    }

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

    // Save this request for regeneration
    setLastAIRequest({
      type: 'selection',
      mode,
      selectedText,
      selectedLines,
      customPrompt: customDirection
    })

    // Create new AbortController for this request
    const controller = new AbortController()
    setAbortController(controller)

    setIsStreaming(true)
    setPreviewContent('')
    setIsPreviewVisible(true)

    try {
      const documentContext = session.activeFileId
        ? session.documentContexts[session.activeFileId]
        : undefined

      const { left, right } = getContext()
      
      // For custom mode, use the custom direction as the prompt
      const aiMode = mode === 'custom' ? 'custom' : mode
      const customPrompt = mode === 'custom' && customDirection 
        ? `Revise the SELECTED passage with this direction: ${customDirection}. Output the revised passage ONLY.`
        : undefined
      
      const { systemMessage, userPrompt } = buildEnhancedPrompt(
        session.projectContext,
        documentContext,
        sessionContext,
        left,
        selectedText,
        right,
        aiMode,
        customPrompt
      )

      const provider = createAIProvider(aiProvider)
      const model = selectedModel || getModel(aiProvider)

      const { textStream } = await streamText({
        model: provider.chat(model),
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userPrompt }
        ],
        abortSignal: controller.signal
      })

      let accumulated = ''
      for await (const chunk of textStream) {
        accumulated += chunk
        setPreviewContent(accumulated)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('AI request aborted')
      } else {
        console.error('AI streaming error:', error)
        toast({
          title: 'AI Error',
          description: 'Failed to generate content. Check your AI provider connection.',
          variant: 'destructive'
        })
      }
    } finally {
      setIsStreaming(false)
      setAbortController(null)
    }
  }, [getSelectedText, toast, lastAICallTime, session, sessionContext, getContext, aiProvider, selectedModel, setIsStreaming, setAbortController, setPreviewContent, setIsPreviewVisible])

  const handleContinueStory = useCallback(() => handleSelectionAI('continue'), [handleSelectionAI])
  const handleContinueStoryWithDirection = useCallback((direction: string) => {
    // Use continue mode but with custom direction
    const customPrompt = `Continue the story from where the SELECTED passage ends. ${direction}. Write 100-200 words of new content that advances the narrative while incorporating this direction. Maintain consistent voice, POV, and tense. Output only the new continuation.`
    handleSelectionAI('custom', customPrompt)
  }, [handleSelectionAI])
  const handleWriteStoryFromOutline = useCallback((direction: string) => {
    // Write a full story based on the selected outline with custom direction
    const customPrompt = `The SELECTED text is an outline or summary for a story. Write a complete, engaging story based on this outline. ${direction}. Expand the outline into vivid scenes with dialogue, descriptions, and narrative flow. Maintain consistency with any character names, settings, and plot points mentioned. Output only the story text.`
    handleSelectionAI('custom', customPrompt)
  }, [handleSelectionAI])
  const handleReviseSelection = useCallback(() => handleSelectionAI('revise'), [handleSelectionAI])
  const handleAppendToSelection = useCallback(() => handleSelectionAI('append'), [handleSelectionAI])
  const handleCustomRevision = useCallback((direction: string) => handleSelectionAI('custom', direction), [handleSelectionAI])

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


  // This function is now replaced by handleRunDocumentAI which is called from the right panel

  const handleInsertPreview = () => {
    if (!previewContent) return

    const lines = content.split('\n')

    // Default to append behavior since mode is no longer tracked here
    const newLines = [
      ...lines.slice(0, selectedLines.end + 1),
      ...previewContent.split('\n'),
      ...lines.slice(selectedLines.end + 1)
    ]
    updateFileContent(newLines.join('\n'))

    setPreviewContent('')
    setSelectedLines({ start: -1, end: -1 })
    setSelectedText('')
    toast({
      title: 'Applied',
      description: 'Content applied'
    })
  }

  const handleAppendPreview = () => {
    if (!previewContent) return

    // Append to the end of the document
    const currentContent = content.trim()
    const newContent = currentContent + '\n\n' + previewContent
    updateFileContent(newContent)

    setPreviewContent('')
    setSelectedLines({ start: -1, end: -1 })
    setSelectedText('')
    toast({
      title: 'Content Appended',
      description: 'AI content added to the end of document'
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

    // Save this request for regeneration
    setLastAIRequest({
      type: 'document',
      mode: aiMode,
      customPrompt: customPromptText
    })

    // Create new AbortController for this request
    const controller = new AbortController()
    setAbortController(controller)

    // Mode and custom prompt are passed directly from the right panel

    // Clear selection for document-level requests
    setSelectedLines({ start: -1, end: -1 })
    setSelectedText('')

    setIsStreaming(true)
    setPreviewContent('')
    // Don't show preview immediately - wait for first content chunk

    try {
      const documentContext = session.activeFileId
        ? session.documentContexts[session.activeFileId]
        : undefined

      let systemMessage: string
      let userPrompt: string
      let contextInfo: SmartContextResult | undefined

      if (useSmartContext) {
        // Use smart context management
        const result = await buildSmartDocumentLevelPrompt(
          session.projectContext,
          documentContext,
          sessionContext,
          content,
          aiMode,
          customPromptText
        )
        systemMessage = result.systemMessage
        userPrompt = result.userPrompt
        contextInfo = result.contextInfo
        setLastContextInfo(contextInfo)
      } else {
        // Use traditional context management
        const result = buildDocumentLevelPrompt(
          session.projectContext,
          documentContext,
          sessionContext,
          content,
          aiMode,
          customPromptText
        )
        systemMessage = result.systemMessage
        userPrompt = result.userPrompt
        setLastContextInfo(null)
      }

      // Add to prompt history if using custom prompt
      if (customPromptText?.trim()) {
        setPromptHistory(prev => {
          const newHistory = [customPromptText.trim(), ...prev.filter(p => p !== customPromptText.trim())]
          return newHistory.slice(0, 10)
        })
      }

      const provider = createAIProvider(aiProvider)
      const model = selectedModel || getModel(aiProvider)

      const { textStream } = await streamText({
        model: provider.chat(model),
        temperature: 0.7, // Default temperature since toolbar is removed
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
          description: 'Failed to generate content. Is Ollama running?',
          variant: 'destructive'
        })
      }
    } finally {
      setIsStreaming(false)
      setAbortController(null)
    }
  }

  const handleRegenerateContent = useCallback(() => {
    if (!lastAIRequest) {
      toast({
        title: 'Nothing to regenerate',
        description: 'No previous AI request found',
        variant: 'default'
      })
      return
    }

    if (lastAIRequest.type === 'selection') {
      // For selection-based requests, restore the selection and call the selection handler
      if (lastAIRequest.selectedLines) {
        setSelectedLines(lastAIRequest.selectedLines)
      }
      
      if (lastAIRequest.mode === 'custom' && lastAIRequest.customPrompt) {
        // Extract the custom direction from the saved prompt
        const match = lastAIRequest.customPrompt.match(/Revise the SELECTED passage with this direction: (.+)\. Output/)
        const direction = match ? match[1] : lastAIRequest.customPrompt
        handleSelectionAI('custom', direction)
      } else {
        handleSelectionAI(lastAIRequest.mode as 'continue' | 'revise' | 'append')
      }
    } else {
      // For document-level requests, call the document handler
      handleRunDocumentAI(lastAIRequest.mode as any, lastAIRequest.customPrompt)
    }
  }, [lastAIRequest, handleSelectionAI, handleRunDocumentAI, toast])

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
    if (e.key === 'Escape' && isStreaming) {
      e.preventDefault()
      handleStopAI()
    }
  }, [handleStopAI, isStreaming])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Show loading while session is initializing
  if (!session) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10">
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
    <div className="h-full flex flex-col">
      <div className="flex-1 flex min-h-0">
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
                      <button
                        onClick={() => setUseSmartContext(!useSmartContext)}
                        className={`px-2 py-1 rounded-md transition-colors ${
                          useSmartContext 
                            ? 'bg-green-500/20 text-green-600 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-600 border border-red-500/30'
                        }`}
                        title={useSmartContext ? 'Smart Context: Enabled' : 'Smart Context: Disabled'}
                      >
                        {useSmartContext ? '🧠 Smart' : '📝 Classic'}
                      </button>
                      {lastContextInfo && (
                        <button
                          onClick={() => setContextPreviewVisible(!contextPreviewVisible)}
                          className="px-2 py-1 bg-blue-500/20 text-blue-600 border border-blue-500/30 rounded-md transition-colors"
                          title="Toggle Context Preview"
                        >
                          👁️ Context ({lastContextInfo.totalTokens} tokens)
                        </button>
                      )}
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
                  onTextSelectionChange={setSelectedText}
                  documentContext={sessionContext}
                  aiProvider={aiProvider}
                  selectedModel={selectedModel}
                  onContinueStory={handleContinueStory}
                  onContinueStoryWithDirection={handleContinueStoryWithDirection}
                  onWriteStoryFromOutline={handleWriteStoryFromOutline}
                  onReviseSelection={handleReviseSelection}
                  onAppendToSelection={handleAppendToSelection}
                  onCustomRevision={handleCustomRevision}
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
              onRegenerateContent={handleRegenerateContent}
              onAppendContent={handleAppendPreview}
              isVisible={isPreviewVisible}
            />
          </SplitPane>
        </div>

        {/* Right panel - Simplified ContextTabs */}
        <div className="w-96 bg-gradient-to-b from-muted/10 to-muted/5 animate-fade-in min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto enhanced-scrollbar">
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
              aiProvider={aiProvider}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          </div>
          
          {/* Context Preview */}
          {contextPreviewVisible && lastContextInfo && (
            <div className="p-4 border-t flex-shrink-0 max-h-96 overflow-y-auto enhanced-scrollbar">
              <ContextPreview
                contextInfo={lastContextInfo}
                totalPromptTokens={lastContextInfo.totalTokens + 100} // Rough estimate with system message
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>


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