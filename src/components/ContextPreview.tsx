import { useState } from 'react'
import { Eye, EyeOff, Info, Zap, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { SmartContextResult } from '@/lib/types'

interface ContextPreviewProps {
  contextInfo: SmartContextResult
  totalPromptTokens: number
  className?: string
}

export function ContextPreview({ contextInfo, totalPromptTokens, className }: ContextPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const getStrategyInfo = (strategy: string) => {
    switch (strategy) {
      case 'short-doc':
        return { label: 'Short Document', color: 'bg-green-100 text-green-800', description: 'Using expanded context' }
      case 'medium-doc':
        return { label: 'Medium Document', color: 'bg-yellow-100 text-yellow-800', description: 'Balanced context + summary' }
      case 'long-doc':
        return { label: 'Large Document', color: 'bg-red-100 text-red-800', description: 'Smart summary + targeted context' }
      default:
        return { label: strategy, color: 'bg-gray-100 text-gray-800', description: 'Unknown strategy' }
    }
  }

  const getContentTypeInfo = (contentType: string) => {
    switch (contentType) {
      case 'fiction':
        return { label: 'Fiction', icon: '📚', description: 'Optimized for narrative content' }
      case 'technical':
        return { label: 'Technical', icon: '⚙️', description: 'Optimized for technical documentation' }
      case 'blog':
        return { label: 'Blog Post', icon: '📝', description: 'Optimized for blog content' }
      case 'academic':
        return { label: 'Academic', icon: '🎓', description: 'Optimized for academic writing' }
      case 'business':
        return { label: 'Business', icon: '💼', description: 'Optimized for business documents' }
      case 'notes':
        return { label: 'Notes', icon: '📋', description: 'Optimized for note-taking' }
      default:
        return { label: contentType, icon: '📄', description: 'General content optimization' }
    }
  }

  const strategyInfo = getStrategyInfo(contextInfo.strategy)
  const contentTypeInfo = getContentTypeInfo(contextInfo.contentType)

  const contextSections = [
    { 
      key: 'project', 
      title: 'Project Context', 
      content: contextInfo.projectContext, 
      tokens: Math.ceil(contextInfo.projectContext.length / 4),
      description: 'Global project settings and guidelines'
    },
    { 
      key: 'document', 
      title: 'Document Context', 
      content: contextInfo.documentContext, 
      tokens: Math.ceil(contextInfo.documentContext.length / 4),
      description: 'File-specific metadata and notes'
    },
    { 
      key: 'session', 
      title: 'Session Context', 
      content: contextInfo.sessionContext, 
      tokens: Math.ceil(contextInfo.sessionContext.length / 4),
      description: 'Current session notes and temporary context'
    },
    { 
      key: 'summary', 
      title: 'Document Summary', 
      content: contextInfo.documentSummary, 
      tokens: Math.ceil(contextInfo.documentSummary.length / 4),
      description: 'AI-generated summary of the full document'
    },
    { 
      key: 'immediate', 
      title: 'Immediate Context', 
      content: `BEFORE: ${contextInfo.immediateContext.before}\n\nAFTER: ${contextInfo.immediateContext.after}`, 
      tokens: contextInfo.immediateContext.tokens,
      description: 'Text surrounding the current selection'
    }
  ].filter(section => section.content && section.content.trim())

  if (contextInfo.semanticChunks.length > 0) {
    contextSections.push({
      key: 'semantic',
      title: 'Related Sections',
      content: contextInfo.semanticChunks.join('\n\n---\n\n'),
      tokens: Math.ceil(contextInfo.semanticChunks.join('').length / 4),
      description: 'Semantically similar content from other parts of the document'
    })
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <CardTitle className="text-sm">Context Preview</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-auto p-1"
          >
            {isOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <CardDescription className="text-xs">
          Smart context management with {contextInfo.totalTokens} tokens
        </CardDescription>
      </CardHeader>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Context Strategy Info */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary" className={strategyInfo.color}>
                  {strategyInfo.label}
                </Badge>
                <span className="text-muted-foreground">{strategyInfo.description}</span>
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                <span className={contentTypeInfo.icon}>{contentTypeInfo.icon}</span>
                <span className="font-medium">{contentTypeInfo.label}</span>
                <span className="text-muted-foreground">{contentTypeInfo.description}</span>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span>{contextInfo.totalTokens} context tokens</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>{totalPromptTokens} total prompt tokens</span>
                </div>
              </div>
            </div>

            {/* Context Sections */}
            <div className="space-y-2">
              {contextSections.map((section) => (
                <div key={section.key} className="border border-border/50 rounded-md">
                  <button
                    onClick={() => toggleSection(section.key)}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-accent/50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{section.title}</span>
                      <Badge variant="outline" className="text-[10px] h-4">
                        {section.tokens} tokens
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-[10px]">
                        {section.description}
                      </span>
                      {expandedSections.has(section.key) ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </div>
                  </button>
                  
                  {expandedSections.has(section.key) && (
                    <div className="px-3 pb-3 border-t border-border/50 bg-muted/30">
                      <pre className="text-[10px] whitespace-pre-wrap font-mono text-muted-foreground mt-2 max-h-48 overflow-y-auto">
                        {section.content.substring(0, 1000)}
                        {section.content.length > 1000 && '\n... (truncated)'}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Token Budget Visualization */}
            <div className="mt-4 p-3 bg-muted/30 rounded-md">
              <div className="text-xs font-medium mb-2">Token Budget Allocation</div>
              <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                <div className="flex h-full">
                  <div 
                    className="bg-blue-500" 
                    style={{ width: `${(contextInfo.immediateContext.tokens / contextInfo.totalTokens) * 100}%` }}
                    title="Immediate Context"
                  />
                  <div 
                    className="bg-green-500" 
                    style={{ width: `${(Math.ceil(contextInfo.documentSummary.length / 4) / contextInfo.totalTokens) * 100}%` }}
                    title="Document Summary"
                  />
                  <div 
                    className="bg-purple-500" 
                    style={{ width: `${(Math.ceil((contextInfo.projectContext + contextInfo.documentContext + contextInfo.sessionContext).length / 4) / contextInfo.totalTokens) * 100}%` }}
                    title="Metadata"
                  />
                  {contextInfo.semanticChunks.length > 0 && (
                    <div 
                      className="bg-orange-500" 
                      style={{ width: `${(Math.ceil(contextInfo.semanticChunks.join('').length / 4) / contextInfo.totalTokens) * 100}%` }}
                      title="Semantic Chunks"
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>0</span>
                <span>{contextInfo.totalTokens} tokens</span>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

// Utility hook for context preview
export function useContextPreview() {
  const [showPreview, setShowPreview] = useState(false)
  const [contextInfo, setContextInfo] = useState<SmartContextResult | null>(null)

  const updateContextInfo = (info: SmartContextResult) => {
    setContextInfo(info)
  }

  const togglePreview = () => {
    setShowPreview(!showPreview)
  }

  return {
    showPreview,
    contextInfo,
    updateContextInfo,
    togglePreview,
    setShowPreview
  }
}