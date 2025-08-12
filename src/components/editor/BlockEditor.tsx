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
    
    // Auto-update selection based on cursor position
    const textarea = e.target
    const cursorPos = textarea.selectionStart
    const lineIndex = newValue.substring(0, cursorPos).split('\n').length - 1
    
    // Only update selection if we don't have a multi-line selection
    if (selectedLines.start === selectedLines.end || selectedLines.start === -1) {
      onSelectionChange({ start: lineIndex, end: lineIndex })
    }
  }, [onChange, selectedLines, onSelectionChange])

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
      // Single line selection
      onSelectionChange({ start: index, end: index })
      
      // Focus textarea and move cursor to start of selected line
      if (textareaRef.current) {
        textareaRef.current.focus()
        const lineStart = lines.slice(0, index).reduce((acc, line) => acc + line.length + 1, 0)
        textareaRef.current.setSelectionRange(lineStart, lineStart)
      }
    }
  }, [selectedLines, onSelectionChange, lines])

  const handleCursorPositionChange = useCallback(() => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const cursorPos = textarea.selectionStart
    const lineIndex = value.substring(0, cursorPos).split('\n').length - 1
    
    // Update selection to current line if no multi-line selection exists
    if (selectedLines.start === selectedLines.end || selectedLines.start === -1) {
      if (selectedLines.start !== lineIndex) {
        onSelectionChange({ start: lineIndex, end: lineIndex })
      }
    }
  }, [value, selectedLines, onSelectionChange])

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
    
    // Update line selection after key press
    setTimeout(handleCursorPositionChange, 0)
  }, [value, onChange, handleCursorPositionChange])

  const getLineBackgroundClass = (index: number) => {
    return index >= selectedLines.start && index <= selectedLines.end ? 'line-selected' : ''
  }

  return (
    <div className="flex h-full overflow-hidden animate-fade-in">
      {/* Line numbers */}
      <div className="flex flex-col bg-gradient-to-b from-muted/40 to-muted/20 border-r border-border/50 shadow-inner">
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
      <div className="flex-1 relative bg-gradient-to-br from-background via-background to-muted/5">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onClick={handleCursorPositionChange}
          onKeyUp={handleCursorPositionChange}
          className="w-full h-full p-4 pt-1 resize-none bg-transparent border-none outline-none editor-textarea text-sm leading-6 overflow-auto custom-scrollbar focus:bg-accent/5 transition-colors duration-300"
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