import { useRef, useEffect, useCallback, useState } from 'react'
import Editor from '@monaco-editor/react'
import { getAutocompleteService } from '@/lib/autocomplete'
import type { AIProvider } from '@/lib/ai'
import { Loader2, BookOpen, RefreshCw, Plus, Wand2, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface MonacoEditorProps {
  value: string
  onChange: (value: string) => void
  selectedLines: { start: number; end: number }
  onSelectionChange: (selection: { start: number; end: number }) => void
  documentContext?: string
  aiProvider?: AIProvider
  selectedModel?: string
  onContinueStory?: () => void
  onContinueStoryWithDirection?: (direction: string) => void
  onReviseSelection?: () => void
  onAppendToSelection?: () => void
  onCustomRevision?: (direction: string) => void
}

export function MonacoEditor({ 
  value, 
  onChange, 
  selectedLines,
  onSelectionChange,
  documentContext,
  aiProvider = 'ollama',
  selectedModel,
  onContinueStory,
  onContinueStoryWithDirection,
  onReviseSelection,
  onAppendToSelection,
  onCustomRevision
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const decorationsRef = useRef<string[]>([])
  const [isLoadingCompletion, setIsLoadingCompletion] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(true)
  const [showCustomRevision, setShowCustomRevision] = useState(false)
  const [customDirection, setCustomDirection] = useState('')
  const [showCustomContinue, setShowCustomContinue] = useState(false)
  const [continueDirection, setContinueDirection] = useState('')
  
  // Debug state will be logged after hasSelection is defined
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const completionProviderRef = useRef<any>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Helper to add debug messages
  const addDebugMessage = (message: string) => {
    setDebugInfo(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const handleEditorDidMount = useCallback((monacoEditor: any, monaco: any) => {
    editorRef.current = monacoEditor
    monacoRef.current = monaco

    // Set theme based on current mode
    const isDark = document.documentElement.classList.contains('dark')
    monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs')

    // Enhanced configuration with inline suggestions
    monacoEditor.updateOptions({
      lineNumbers: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      fontSize: 14,
      lineHeight: 24,
      automaticLayout: true,
      // Completely disable the regular suggestion widget
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      wordBasedSuggestions: false,
      acceptSuggestionOnCommitCharacter: false,
      acceptSuggestionOnEnter: 'off',
      suggest: {
        enabled: false, // Disable the suggest widget completely
        showWords: false,
        showSnippets: false,
        showIcons: false
      },
      // Enable inline suggestions for AI completions
      inlineSuggest: {
        enabled: true,
        mode: 'prefix', // Changed from 'subword' to 'prefix'
        showToolbar: 'onHover',
        suppressSuggestions: true // Suppress regular suggestions when inline is shown
      }
    })

    // Monitor inline suggestion events
    monacoEditor.onDidChangeModelContent(() => {
      const currentContent = monacoEditor.getValue()
      if (currentContent.includes('test completion')) {
        console.log('[Monaco] ✅ Test completion was ACCEPTED by user')
        addDebugMessage('✅ Completion accepted!')
      }
    })

    // Register inline completions provider
    if (completionProviderRef.current) {
      completionProviderRef.current.dispose()
    }

    console.log('[Monaco] Registering inline completions provider')
    addDebugMessage('Registered inline completions provider')
    
    completionProviderRef.current = monaco.languages.registerInlineCompletionsProvider('plaintext', {
      provideInlineCompletions: async (model: any, position: any, context: any, token: any) => {
        console.log('[Monaco] provideInlineCompletions called at position:', position)
        console.log('[Monaco] Context:', context)
        console.log('[Monaco] Trigger kind:', context.triggerKind)
        addDebugMessage(`Completion triggered at line ${position.lineNumber}, col ${position.column}`)
        
        // Get service and check if enabled
        console.log('[Monaco] AI Provider:', aiProvider)
        console.log('[Monaco] Selected Model from props:', selectedModel)
        
        const service = getAutocompleteService({
          provider: aiProvider,
          model: selectedModel || undefined
        })

        if (!service.isEnabled()) {
          console.log('[Monaco] Service disabled, returning empty immediately')
          addDebugMessage('Autocomplete disabled in settings')
          return { items: [] }
        }

        // Get text context
        const offset = model.getOffsetAt(position)
        const textBefore = model.getValue().substring(0, offset)
        const textAfter = model.getValue().substring(offset)
        
        // Don't trigger on very short text 
        if (textBefore.length < 3) {
          console.log('[Monaco] Text too short (<3 chars)')
          return { items: [] }
        }
        
        // For the test, be more lenient
        if (!textBefore.endsWith('test123')) {
          const lastChar = textBefore[textBefore.length - 1]
          if (!lastChar || lastChar === '\n') {
            console.log('[Monaco] Skipping - ends with newline')
            return { items: [] }
          }
        }

        // Cancel any existing debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
          console.log('[Monaco] Cleared existing debounce timer')
        }

        // Cancel any existing API request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
          console.log('[Monaco] Aborted existing request')
        }

        // Add debug info about what text we're checking
        console.log('[Monaco] Text before (last 20 chars):', textBefore.slice(-20))
        addDebugMessage(`Text: "${textBefore.slice(-10)}" (${textBefore.length} chars)`)
        
        // OPTIONAL TEST: Uncomment to test with static completion
        /*
        if (textBefore.endsWith('test123')) {
          console.log('[Monaco] Test completion triggered!')
          addDebugMessage('🎯 Test completion: returning static text')
          return {
            items: [{
              insertText: ' - this is a test completion!',
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
              }
            }]
          }
        }
        */

        // For automatic triggers (typing), use debouncing
        // InlineCompletionTriggerKind: 0 = Automatic, 1 = Explicit
        if (!context.triggerKind || context.triggerKind === 0) {
          return new Promise((resolve) => {
            debounceTimerRef.current = setTimeout(async () => {
            console.log('[Monaco] Debounce timer fired, starting completion request')
            addDebugMessage('Requesting AI completion...')
            setIsLoadingCompletion(true)
            abortControllerRef.current = new AbortController()

            try {
              const completion = await service.getCompletion(
                textBefore,
                textAfter,
                documentContext,
                abortControllerRef.current.signal
              )

              console.log('[Monaco] Got completion:', completion)
              
              if (completion) {
                addDebugMessage(`Got completion: "${completion.slice(0, 30)}..."`)
                const result = {
                  items: [{
                    insertText: completion,
                    range: {
                      startLineNumber: position.lineNumber,
                      startColumn: position.column,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column
                    },
                    command: {
                      id: 'editor.action.inlineSuggest.commit',
                      title: 'Accept Suggestion'
                    }
                  }],
                  enableForwardStability: true
                }
                console.log('[Monaco] Returning completion result:', result)
                resolve(result)
              } else {
                console.log('[Monaco] No completion, returning empty')
                addDebugMessage('No completion returned')
                resolve({ items: [] })
              }
            } catch (error: any) {
              console.error('[Monaco] Inline completion error:', error)
              addDebugMessage(`Error: ${error.message}`)
              resolve({ items: [] })
            } finally {
              setIsLoadingCompletion(false)
              abortControllerRef.current = null
            }
            }, service.getTriggerDelay())
            
            console.log('[Monaco] Set debounce timer for', service.getTriggerDelay(), 'ms')
          })
        } else {
          // For explicit triggers, run immediately
          console.log('[Monaco] Explicit trigger, running immediately')
          addDebugMessage('Manual trigger - requesting immediately')
          setIsLoadingCompletion(true)
          
          try {
            const completion = await service.getCompletion(
              textBefore,
              textAfter,
              documentContext
            )
            
            if (completion) {
              addDebugMessage(`Got completion: "${completion.slice(0, 30)}..."`)
              return {
                items: [{
                  insertText: completion,
                  range: {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                  }
                }]
              }
            }
          } catch (error: any) {
            console.error('[Monaco] Error:', error)
            addDebugMessage(`Error: ${error.message}`)
          } finally {
            setIsLoadingCompletion(false)
          }
          
          return { items: [] }
        }
      },
      freeInlineCompletions: () => {
        // Cleanup if needed
      }
    })

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark')
          monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs')
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    // Store observer for cleanup
    ;(monacoEditor as any)._themeObserver = observer
    
    // Override the default Ctrl+Space behavior
    monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      console.log('[Monaco] Manual trigger via keyboard shortcut')
      addDebugMessage('Manual trigger: Ctrl/Cmd+Space')
      
      // Try multiple ways to trigger inline suggestions
      monacoEditor.trigger('wordloom', 'editor.action.inlineSuggest.trigger', {})
      
      // Also try to force show inline suggestions
      setTimeout(() => {
        const position = monacoEditor.getPosition()
        console.log('[Monaco] Force triggering at position:', position)
        monacoEditor.trigger('wordloom', 'editor.action.inlineSuggest.show', {})
      }, 100)
    })
    
    // Also add Alt+\ as an alternative trigger  
    monacoEditor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Backslash, () => {
      console.log('[Monaco] Manual trigger via Alt+\\')
      addDebugMessage('Manual trigger: Alt+\\')
      
      // Insert a simple test to see if Monaco can show ANY inline content
      const position = monacoEditor.getPosition()
      console.log('[Monaco] Inserting test at position:', position)
      
      // Try to force show a suggestion
      monacoEditor.trigger('wordloom', 'editor.action.inlineSuggest.trigger', {})
    })

    // Handle cursor position changes
    monacoEditor.onDidChangeCursorPosition((e: any) => {
      const position = e.position
      const lineNumber = position.lineNumber - 1
      
      if (selectedLines.start === -1 || selectedLines.start === selectedLines.end) {
        onSelectionChange({ start: lineNumber, end: lineNumber })
      }
    })

    // Handle line number clicks
    monacoEditor.onMouseDown((e: any) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
        const lineNumber = e.target.position?.lineNumber
        if (lineNumber) {
          const index = lineNumber - 1
          
          if (e.event.shiftKey && selectedLines.start !== -1) {
            const start = Math.min(selectedLines.start, index)
            const end = Math.max(selectedLines.end, index)
            onSelectionChange({ start, end })
          } else {
            onSelectionChange({ start: index, end: index })
          }
          
          e.event.preventDefault()
        }
      }
    })
  }, [selectedLines, onSelectionChange, documentContext, aiProvider, selectedModel, addDebugMessage])

  // Update line decorations when selection changes
  useEffect(() => {
    if (!editorRef.current) return

    const monacoEditor = editorRef.current
    decorationsRef.current = monacoEditor.deltaDecorations(decorationsRef.current, [])

    if (selectedLines.start !== -1) {
      const newDecorations: any[] = []
      
      for (let i = selectedLines.start; i <= selectedLines.end; i++) {
        newDecorations.push({
          range: { 
            startLineNumber: i + 1, 
            startColumn: 1, 
            endLineNumber: i + 1, 
            endColumn: Number.MAX_SAFE_INTEGER 
          },
          options: {
            isWholeLine: true,
            className: 'wordloom-selected-line',
          }
        })
      }
      
      decorationsRef.current = monacoEditor.deltaDecorations(decorationsRef.current, newDecorations)
    }
  }, [selectedLines])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup theme observer
      if (editorRef.current && (editorRef.current as any)._themeObserver) {
        ;(editorRef.current as any)._themeObserver.disconnect()
      }
      
      // Cleanup completion provider
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose()
      }
      
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleEditorChange = useCallback((newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue)
    }
  }, [onChange])

  const hasSelection = selectedLines.start !== -1
  
  // Debug state
  console.log('MonacoEditor state:', { 
    hasSelection, 
    showCustomRevision, 
    showCustomContinue,
    onContinueStoryWithDirection: !!onContinueStoryWithDirection 
  })

  const handleCustomRevisionClick = () => {
    setShowCustomRevision(true)
    setCustomDirection('')
  }

  const handleCustomRevisionSubmit = () => {
    if (customDirection.trim() && onCustomRevision) {
      onCustomRevision(customDirection.trim())
      setShowCustomRevision(false)
      setCustomDirection('')
    }
  }

  const handleCustomRevisionCancel = () => {
    setShowCustomRevision(false)
    setCustomDirection('')
  }

  const handleCustomContinueClick = () => {
    console.log('Custom Continue clicked, setting showCustomContinue to true')
    // Make sure other dialogs are closed
    setShowCustomRevision(false)
    setShowCustomContinue(true)
    setContinueDirection('')
  }

  const handleCustomContinueSubmit = () => {
    if (continueDirection.trim() && onContinueStoryWithDirection) {
      onContinueStoryWithDirection(continueDirection.trim())
      setShowCustomContinue(false)
      setContinueDirection('')
    }
  }

  const handleCustomContinueCancel = () => {
    setShowCustomContinue(false)
    setContinueDirection('')
  }

  const handleRevisionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCustomRevisionSubmit()
    } else if (e.key === 'Escape') {
      handleCustomRevisionCancel()
    }
  }

  const handleContinueKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCustomContinueSubmit()
    } else if (e.key === 'Escape') {
      handleCustomContinueCancel()
    }
  }

  return (
    <div className="flex-1 relative h-full w-full">
      <Editor
        height="100%"
        width="100%"
        defaultLanguage="plaintext"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        loading={<div className="flex items-center justify-center h-full text-muted-foreground">Loading editor...</div>}
        options={{
          automaticLayout: true,
        }}
      />
      
      {/* Floating Selection Toolbar */}
      {hasSelection && (onContinueStory || onContinueStoryWithDirection || onReviseSelection || onAppendToSelection || onCustomRevision) && !showCustomRevision && !showCustomContinue && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-2">Quick Actions:</span>
            
            {onContinueStory && (
              <Button
                size="sm"
                variant="outline"
                onClick={onContinueStory}
                className="flex items-center gap-2 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/20"
              >
                <BookOpen className="h-3 w-3" />
                Continue Story
              </Button>
            )}
            
            {onContinueStoryWithDirection && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCustomContinueClick}
                className="flex items-center gap-2 text-xs hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/20"
              >
                <BookOpen className="h-3 w-3" />
                <span className="text-[10px] opacity-75">+</span>
                Continue with Direction
              </Button>
            )}
            
            {onReviseSelection && (
              <Button
                size="sm"
                variant="outline"
                onClick={onReviseSelection}
                className="flex items-center gap-2 text-xs hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/20"
              >
                <RefreshCw className="h-3 w-3" />
                Revise
              </Button>
            )}
            
            {onCustomRevision && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCustomRevisionClick}
                className="flex items-center gap-2 text-xs hover:bg-purple-500/10 hover:text-purple-600 hover:border-purple-500/20"
              >
                <Wand2 className="h-3 w-3" />
                Custom Revise
              </Button>
            )}
            
            {onAppendToSelection && (
              <Button
                size="sm"
                variant="outline"
                onClick={onAppendToSelection}
                className="flex items-center gap-2 text-xs hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/20"
              >
                <Plus className="h-3 w-3" />
                Append
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Custom Revision Input */}
      {hasSelection && showCustomRevision && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 animate-fade-in w-96">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Custom Revision Direction</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCustomRevisionCancel}
                className="h-6 w-6 p-0 hover:bg-red-500/10 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <Input
              placeholder="e.g., make it more formal, add more emotion, simplify the language..."
              value={customDirection}
              onChange={(e) => setCustomDirection(e.target.value)}
              onKeyDown={handleRevisionKeyDown}
              className="text-sm"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleCustomRevisionSubmit}
                disabled={!customDirection.trim()}
                className="flex items-center gap-2 text-xs"
              >
                <Send className="h-3 w-3" />
                Revise with Direction
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCustomRevisionCancel}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Continue Input */}
      {hasSelection && showCustomContinue && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-amber-50/95 dark:bg-amber-950/95 backdrop-blur-sm border-2 border-amber-200 dark:border-amber-800 rounded-lg shadow-lg p-4 animate-fade-in w-96 z-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Continue Story Direction</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCustomContinueCancel}
                className="h-6 w-6 p-0 hover:bg-red-500/10 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <Input
              placeholder="e.g., add more action, introduce a new character, create tension, add romance..."
              value={continueDirection}
              onChange={(e) => setContinueDirection(e.target.value)}
              onKeyDown={handleContinueKeyDown}
              className="text-sm"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleCustomContinueSubmit}
                disabled={!continueDirection.trim()}
                className="flex items-center gap-2 text-xs"
              >
                <Send className="h-3 w-3" />
                Continue with Direction
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCustomContinueCancel}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Debug panel */}
      {showDebug && (
        <div className="absolute top-4 right-4 w-96 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="text-sm font-medium">Autocomplete Debug</span>
            <button
              onClick={() => setShowDebug(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
          <div className="p-2 max-h-48 overflow-y-auto">
            {debugInfo.length === 0 ? (
              <p className="text-xs text-muted-foreground">Waiting for activity...</p>
            ) : (
              <div className="space-y-1">
                {debugInfo.map((msg, i) => (
                  <p key={i} className="text-xs font-mono text-muted-foreground">
                    {msg}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="p-2 border-t text-xs text-muted-foreground">
            <p>Provider: {aiProvider}</p>
            <p>Model: {selectedModel || 'default'}</p>
            <p>Model passed: {selectedModel ? `"${selectedModel}"` : 'undefined'}</p>
            <p>Status: {isLoadingCompletion ? 'Loading...' : 'Ready'}</p>
            <p className="mt-2 font-semibold">Shortcuts:</p>
            <p>• Ctrl/Cmd+Space: Trigger suggestion</p>
            <p>• Alt+\: Alternative trigger</p>
            <p>• Tab: Accept suggestion</p>
            <p>• Esc: Dismiss suggestion</p>
            <p className="mt-2 font-semibold">Test:</p>
            <p>Type "test123" to see test completion</p>
          </div>
        </div>
      )}
      
      {/* Loading indicator for AI completions */}
      {isLoadingCompletion && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>AI thinking...</span>
        </div>
      )}
      
      {/* Debug toggle button */}
      {!showDebug && (
        <button
          onClick={() => setShowDebug(true)}
          className="absolute top-4 right-4 px-2 py-1 text-xs bg-background/90 backdrop-blur-sm border rounded text-muted-foreground hover:text-foreground"
        >
          Show Debug
        </button>
      )}
    </div>
  )
}