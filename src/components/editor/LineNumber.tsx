import { cn } from '@/lib/utils'

interface LineNumberProps {
  lineNumber: number
  isSelected: boolean
  onClick: () => void
}

export function LineNumber({ lineNumber, isSelected, onClick }: LineNumberProps) {
  return (
    <div
      className={cn(
        'line-number w-12 text-right pr-4 py-1 text-xs',
        isSelected && 'text-foreground font-medium'
      )}
      onClick={onClick}
    >
      {lineNumber}
    </div>
  )
}