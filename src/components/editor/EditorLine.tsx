import { cn } from '@/lib/utils'

interface EditorLineProps {
  content: string
  isSelected: boolean
  onContentChange: (content: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
}

export function EditorLine({ 
  content, 
  isSelected, 
  onContentChange,
  onKeyDown
}: EditorLineProps) {
  return (
    <div
      className={cn(
        'flex-1 py-1 px-4 min-h-[1.75rem] outline-none',
        isSelected && 'line-selected'
      )}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onContentChange(e.currentTarget.textContent || '')}
      onKeyDown={onKeyDown}
      dangerouslySetInnerHTML={{ __html: content || '<br/>' }}
    />
  )
}