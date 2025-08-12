import { useState, useEffect, useCallback } from 'react'
import { streamText } from 'ai'
import { BlockEditor } from '@/components/editor/BlockEditor'
import { SelectionToolbar } from '@/components/editor/SelectionToolbar'
import { Sidebar } from '@/components/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { createAIProvider, getModel, SYSTEM_MESSAGE, buildUserPrompt, type AIProvider } from '@/lib/ai'
import { Sparkles, Wand2 } from 'lucide-react'
import { 
  loadSession, 
  saveSession, 
  createFolder, 
  createFile, 
  generateId 
} from '@/lib/session'
import { SessionState } from '@/lib/types'

const CONTEXT_CHARS = 800

export function EditorWithSidebar() {
  const [session, setSession] = useState<SessionState | null>(null)
  const [documentContext, setDocumentContext] = useState('')
  const [selectedLines, setSelectedLines] = useState({ start: -1, end: -1 })
  const [mode, setMode] = useState<'revise' | 'append'>('revise')
  const [temperature, setTemperature] = useState(0.7)
  const [isStreaming, setIsStreaming] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [aiProvider, setAiProvider] = useState<AIProvider>('lmstudio')
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
    setSession(prev => ({
      ...prev,
      activeFolderId: folderId,
      activeFileId: fileId
    }))
    setSelectedLines({ start: -1, end: -1 })
  }

  const handleFolderToggle = (folderId: string) => {
    setSession(prev => {
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
    setSession(prev => ({
      ...prev,
      folders: [...prev.folders, newFolder],
      activeFolderId: newFolder.id,
      activeFileId: newFolder.files[0].id
    }))
  }

  const handleFileCreate = (folderId: string) => {
    const newFile = createFile('Untitled.txt')
    setSession(prev => {
      const newSession = { ...prev }
      const folder = newSession.folders.find(f => f.id === folderId)
      if (folder) {
        folder.files.push(newFile)
        newSession.activeFolderId = folderId
        newSession.activeFileId = newFile.id
      }
      return newSession
    })
  }

  const handleFolderRename = (folderId: string, newName: string) => {
    setSession(prev => {
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
      const newSession = { ...prev }
      const folder = newSession.folders.find(f => f.id === folderId)
      if (folder) {
        folder.files = folder.files.filter(f => f.id !== fileId)
        
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
    if (!selectedText) {
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
      const userPrompt = buildUserPrompt(
        documentContext,
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
          { role: 'system', content: SYSTEM_MESSAGE },
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

        {/* Right panel */}
        <div className="w-96 flex flex-col p-4 gap-6 overflow-auto bg-gradient-to-b from-muted/10 to-muted/5 animate-fade-in">
          <div className="glass rounded-xl p-4 shadow-elegant animate-slide-up">
            <Label htmlFor="context" className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Document Context
            </Label>
            <Textarea
              id="context"
              placeholder="Add context to guide AI output (optional)"
              value={documentContext}
              onChange={(e) => setDocumentContext(e.target.value)}
              className="h-32 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300 resize-none"
            />
          </div>

          <Card className="flex-1 glass-strong shadow-card border-border/30 animate-slide-up" style={{animationDelay: '0.1s'}}>
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-lg text-gradient flex items-center gap-2">
                <div className="p-1 rounded-md bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                  <Wand2 className="h-4 w-4" />
                </div>
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {previewContent ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed p-4 bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg border border-border/30 shadow-inner">
                    {previewContent}
                    {isStreaming && (
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1"></span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleInsertPreview}
                      disabled={isStreaming}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-glow transition-all duration-200 hover:scale-105"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Insert Preview
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setPreviewContent('')}
                      disabled={isStreaming}
                      className="hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-all duration-200"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center animate-pulse-subtle">
                  <div className="p-4 rounded-full bg-gradient-to-br from-muted/40 to-muted/20 mb-4">
                    <Wand2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {isStreaming ? (
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        Generating...
                      </span>
                    ) : (
                      'AI output will appear here'
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
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
    </div>
  )
}