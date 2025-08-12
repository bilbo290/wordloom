import { ProjectContext, DocumentContext } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { 
  FolderOpen, 
  FileText, 
  MessageSquare, 
  ArrowDown, 
  Info 
} from 'lucide-react'

interface ContextHierarchyProps {
  projectContext: ProjectContext
  documentContext?: DocumentContext
  sessionContext: string
  currentFileName?: string
}

export function ContextHierarchy({ 
  projectContext, 
  documentContext, 
  sessionContext,
  currentFileName 
}: ContextHierarchyProps) {
  
  const hasProjectContent = !!(
    projectContext.description || 
    projectContext.constraints ||
    (projectContext.genre && projectContext.genre !== 'other') ||
    (projectContext.audience && projectContext.audience !== 'general readers') ||
    projectContext.systemPrompt
  )

  const hasDocumentContent = !!(
    documentContext?.purpose ||
    documentContext?.documentNotes ||
    (documentContext?.status && documentContext.status !== 'draft') ||
    (documentContext?.customFields && Object.keys(documentContext.customFields).length > 0)
  )

  const hasSessionContent = !!sessionContext.trim()

  const ContextLevel = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    hasContent, 
    color, 
    children 
  }: {
    icon: any
    title: string
    subtitle?: string
    hasContent: boolean
    color: string
    children?: React.ReactNode
  }) => (
    <div className={`flex items-start space-x-3 p-3 rounded-lg border ${
      hasContent 
        ? `border-${color}-200/50 bg-${color}-50/30 dark:border-${color}-800/50 dark:bg-${color}-950/30` 
        : 'border-border/30 bg-muted/20'
    }`}>
      <div className={`mt-0.5 p-1.5 rounded-full ${
        hasContent 
          ? `bg-${color}-100 text-${color}-700 dark:bg-${color}-900/50 dark:text-${color}-400` 
          : 'bg-muted text-muted-foreground'
      }`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium">{title}</h4>
          {subtitle && (
            <span className="text-xs text-muted-foreground">• {subtitle}</span>
          )}
          {hasContent && (
            <div className={`w-2 h-2 rounded-full bg-${color}-500`} />
          )}
        </div>
        {children && (
          <div className="mt-1 text-xs text-muted-foreground">
            {children}
          </div>
        )}
      </div>
    </div>
  )

  const Arrow = () => (
    <div className="flex justify-center my-2">
      <ArrowDown className="h-4 w-4 text-muted-foreground/50" />
    </div>
  )

  return (
    <Card className="glass border-border/30 mb-4">
      <CardContent className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Context Flow</h3>
        </div>
        
        <div className="space-y-1">
          {/* Project Level */}
          <ContextLevel
            icon={FolderOpen}
            title="Project"
            subtitle={projectContext.name}
            hasContent={hasProjectContent}
            color="amber"
          >
            {hasProjectContent && (
              <div className="space-y-1">
                {projectContext.genre && projectContext.genre !== 'other' && (
                  <div>Genre: {projectContext.genre}</div>
                )}
                {projectContext.style && (
                  <div>Style: {projectContext.style}</div>
                )}
                {projectContext.audience && projectContext.audience !== 'general readers' && (
                  <div>Audience: {projectContext.audience}</div>
                )}
                {projectContext.constraints && (
                  <div>Guidelines: {projectContext.constraints.slice(0, 50)}
                    {projectContext.constraints.length > 50 ? '...' : ''}
                  </div>
                )}
                {projectContext.systemPrompt && (
                  <div>Custom system prompt configured</div>
                )}
              </div>
            )}
            {!hasProjectContent && (
              <div className="text-muted-foreground">No project-specific context configured</div>
            )}
          </ContextLevel>

          <Arrow />

          {/* Document Level */}
          <ContextLevel
            icon={FileText}
            title="Document"
            subtitle={currentFileName}
            hasContent={hasDocumentContent}
            color="blue"
          >
            {hasDocumentContent && documentContext && (
              <div className="space-y-1">
                {documentContext.purpose && (
                  <div>Purpose: {documentContext.purpose}</div>
                )}
                {documentContext.status && documentContext.status !== 'draft' && (
                  <div>Status: {documentContext.status}</div>
                )}
                {documentContext.documentNotes && (
                  <div>Notes: {documentContext.documentNotes.slice(0, 50)}
                    {documentContext.documentNotes.length > 50 ? '...' : ''}
                  </div>
                )}
                {documentContext.customFields && Object.keys(documentContext.customFields).length > 0 && (
                  <div>
                    Custom fields: {Object.keys(documentContext.customFields).join(', ')}
                  </div>
                )}
              </div>
            )}
            {!hasDocumentContent && (
              <div className="text-muted-foreground">No document-specific context</div>
            )}
          </ContextLevel>

          <Arrow />

          {/* Session Level */}
          <ContextLevel
            icon={MessageSquare}
            title="Session Notes"
            subtitle="Current editing session"
            hasContent={hasSessionContent}
            color="green"
          >
            {hasSessionContent ? (
              <div>
                {sessionContext.slice(0, 80)}
                {sessionContext.length > 80 ? '...' : ''}
              </div>
            ) : (
              <div className="text-muted-foreground">No session notes added</div>
            )}
          </ContextLevel>
        </div>

        {/* Summary */}
        <div className="mt-4 p-3 bg-background/30 rounded-lg border border-border/20">
          <div className="text-xs text-muted-foreground">
            <strong>AI Context:</strong> {[
              hasProjectContent && 'Project guidelines',
              hasDocumentContent && 'Document context', 
              hasSessionContent && 'Session notes'
            ].filter(Boolean).join(' + ') || 'Basic system prompt only'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}