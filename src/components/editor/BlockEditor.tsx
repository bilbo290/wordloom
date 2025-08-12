import { useState, useEffect, useCallback, useRef } from 'react'
import { LineNumber } from './LineNumber'
import { cn } from '@/lib/utils'

interface BlockEditorProps {
  value: string
  onChange: (value: string) => void
  selectedLines: { start: number; end: number }
  onSelectionChange: (selection: { start: number; end: number }) => void
}

export function BlockEditor({ 
  value, 
  onChange, 
  selectedLines,
  onSelectionChange
}: BlockEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [lines, setLines] = useState<string[]>(() => value.split('\n'))

  useEffect(() => {
    const newLines = value.split('\n')
    setLines(newLines)
  }, [value])

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setLines(newValue.split('\n'))
    
    // Don't auto-update line selection on text change to avoid cursor conflicts
  }, [onChange])

  const handleLineNumberClick = useCallback((index: number, e: React.MouseEvent) => {
    if (e.shiftKey && selectedLines.start !== -1) {
      // Extend selection
      const start = Math.min(selectedLines.start, index)
      const end = Math.max(selectedLines.end, index)
      onSelectionChange({ start, end })
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle line selection
      if (index >= selectedLines.start && index <= selectedLines.end) {
        onSelectionChange({ start: -1, end: -1 })
      } else {
        onSelectionChange({ start: index, end: index })
      }
    } else {
      // Single line selection - don't move cursor automatically
      onSelectionChange({ start: index, end: index })
      
      // Just focus the textarea without moving cursor
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }, [selectedLines, onSelectionChange])

  const handleTextareaClick = useCallback(() => {
    // Clear line selection when user clicks directly in textarea
    // This allows natural text editing without interference
    if (selectedLines.start !== -1) {
      onSelectionChange({ start: -1, end: -1 })
    }
  }, [selectedLines, onSelectionChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Let the textarea handle all text input naturally
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      onChange(newValue)
      
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.setSelectionRange(start + 2, start + 2)
      }, 0)
    }
  }, [value, onChange])

  const getLineBackgroundClass = (index: number) => {
    return index >= selectedLines.start && index <= selectedLines.end ? 'line-selected' : ''
  }

  return (
    <div className="flex h-full overflow-hidden animate-fade-in resizable-both bg-gradient-to-br from-background via-background to-muted/5 border border-border/30 rounded-lg">
      {/* Line numbers */}
      <div className="flex flex-col bg-gradient-to-b from-muted/40 to-muted/20 border-r border-border/50 shadow-inner rounded-l-lg">
        {lines.map((_, index) => (
          <div 
            key={index} 
            className={cn(
              'flex items-center h-6 hover:bg-accent/10 transition-all duration-150 group',
              getLineBackgroundClass(index)
            )}
          >
            <LineNumber
              lineNumber={index + 1}
              isSelected={index >= selectedLines.start && index <= selectedLines.end}
              onClick={(e: any) => handleLineNumberClick(index, e)}
            />
          </div>
        ))}
        {lines.length === 0 && (
          <div className="flex items-center h-6">
            <LineNumber
              lineNumber={1}
              isSelected={false}
              onClick={() => onSelectionChange({ start: 0, end: 0 })}
            />
          </div>
        )}
      </div>

      {/* Textarea overlay */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onClick={handleTextareaClick}
          onKeyDown={handleKeyDown}
          className="w-full h-full p-4 pt-1 resize-none bg-transparent border-none outline-none editor-textarea text-sm leading-6 overflow-auto enhanced-scrollbar focus:bg-accent/5 transition-colors duration-300 rounded-r-lg"
          style={{ lineHeight: '1.5rem' }}
          placeholder="Start typing..."
        />
        
        {/* Selection highlight overlay */}
        {selectedLines.start !== -1 && (
          <div 
            className="absolute inset-0 p-4 pt-1 pointer-events-none font-mono text-sm leading-6"
            style={{ lineHeight: '1.5rem' }}
          >
            {lines.map((line, index) => (
              <div
                key={index}
                className={cn(
                  'h-6 relative',
                  getLineBackgroundClass(index)
                )}
              >
                <span className="opacity-0">{line || ' '}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}