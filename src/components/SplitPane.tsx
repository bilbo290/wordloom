import { useState, useRef, useCallback, ReactNode } from 'react'

interface SplitPaneProps {
  children: [ReactNode, ReactNode]
  split?: 'vertical' | 'horizontal'
  minSize?: number
  maxSize?: number
  defaultSize?: number | string
  disabled?: boolean
  className?: string
}

export function SplitPane({
  children,
  split = 'vertical',
  minSize = 100,
  maxSize = Infinity,
  defaultSize = '50%',
  disabled = false,
  className = ''
}: SplitPaneProps) {
  const [size, setSize] = useState(defaultSize)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const resizerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return
    
    e.preventDefault()
    setIsDragging(true)
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      
      const containerRect = containerRef.current.getBoundingClientRect()
      let newSize: number
      
      if (split === 'vertical') {
        newSize = e.clientX - containerRect.left
      } else {
        newSize = e.clientY - containerRect.top
      }
      
      const containerSize = split === 'vertical' 
        ? containerRect.width 
        : containerRect.height
      
      newSize = Math.min(Math.max(newSize, minSize), Math.min(maxSize, containerSize - minSize))
      
      setSize(newSize)
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [disabled, split, minSize, maxSize])

  const paneStyle = {
    [split === 'vertical' ? 'width' : 'height']: 
      typeof size === 'string' ? size : `${size}px`
  }

  const resizerStyle = split === 'vertical' 
    ? 'w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50' 
    : 'h-1 cursor-row-resize hover:bg-primary/30 active:bg-primary/50'

  return (
    <div 
      ref={containerRef}
      className={`flex ${split === 'vertical' ? 'flex-row' : 'flex-col'} h-full ${className}`}
    >
      {/* First pane */}
      <div style={paneStyle} className="min-h-0 min-w-0">
        {children[0]}
      </div>
      
      {/* Resizer */}
      {!disabled && (
        <div
          ref={resizerRef}
          className={`bg-border/50 transition-colors duration-200 ${resizerStyle} ${
            isDragging ? 'bg-primary/50' : ''
          }`}
          onMouseDown={handleMouseDown}
        />
      )}
      
      {/* Second pane */}
      <div className="flex-1 min-h-0 min-w-0">
        {children[1]}
      </div>
    </div>
  )
}