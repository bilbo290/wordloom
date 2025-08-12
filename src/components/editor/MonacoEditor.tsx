import { useRef, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'

interface MonacoEditorProps {
  value: string
  onChange: (value: string) => void
  selectedLines: { start: number; end: number }
  onSelectionChange: (selection: { start: number; end: number }) => void
}

export function MonacoEditor({ 
  value, 
  onChange, 
  selectedLines,
  onSelectionChange
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null)
  const decorationsRef = useRef<string[]>([])

  const handleEditorDidMount = useCallback((monacoEditor: any, monaco: any) => {
    editorRef.current = monacoEditor

    // Set theme based on current mode
    const isDark = document.documentElement.classList.contains('dark')
    monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs')

    // Simple configuration
    monacoEditor.updateOptions({
      lineNumbers: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      fontSize: 14,
      lineHeight: 24,
      automaticLayout: true,
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
  }, [selectedLines, onSelectionChange])

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

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current && (editorRef.current as any)._themeObserver) {
        ;(editorRef.current as any)._themeObserver.disconnect()
      }
    }
  }, [])

  const handleEditorChange = useCallback((newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue)
    }
  }, [onChange])

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
      
    </div>
  )
}