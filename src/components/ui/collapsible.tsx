import { createContext, useContext, useState, ReactNode } from "react"

interface CollapsibleContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CollapsibleContext = createContext<CollapsibleContextType | undefined>(undefined)

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

const Collapsible = ({ open: openProp, onOpenChange, children }: CollapsibleProps) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp !== undefined ? openProp : internalOpen
  const handleOpenChange = onOpenChange || setInternalOpen

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div>{children}</div>
    </CollapsibleContext.Provider>
  )
}

interface CollapsibleContentProps {
  children: ReactNode
}

const CollapsibleContent = ({ children }: CollapsibleContentProps) => {
  const context = useContext(CollapsibleContext)
  if (!context) throw new Error('CollapsibleContent must be used within Collapsible')
  
  if (!context.open) return null
  
  return <div>{children}</div>
}

interface CollapsibleTriggerProps {
  children: ReactNode
  className?: string
}

const CollapsibleTrigger = ({ children, className }: CollapsibleTriggerProps) => {
  const context = useContext(CollapsibleContext)
  if (!context) throw new Error('CollapsibleTrigger must be used within Collapsible')
  
  return (
    <button 
      onClick={() => context.onOpenChange(!context.open)}
      className={className}
      type="button"
    >
      {children}
    </button>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }