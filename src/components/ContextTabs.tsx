import { useState } from 'react'
import { ProjectContext, DocumentContext } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DocumentContextForm } from './DocumentContextForm'
import { ContextHierarchy } from './ContextHierarchy'
import { AIAssistantPanel } from './AIAssistantPanel'
import { 
  FileText, 
  Eye, 
  Settings, 
  Sparkles, 
  Wand2, 
  Trash2,
  Brain
} from 'lucide-react'

interface ContextTabsProps {
  // Project context
  projectContext: ProjectContext
  onProjectSettingsClick: () => void
  
  // Document context
  documentContext?: DocumentContext
  onDocumentContextUpdate: (updates: Partial<DocumentContext>) => void
  
  // Session context
  sessionContext: string
  onSessionContextChange: (value: string) => void
  
  // Preview
  previewContent: string
  isStreaming: boolean
  onInsertPreview: () => void
  onClearPreview: () => void
  
  // Current file info
  currentFileName?: string
  
  // AI Assistant integration (optional)
  onRunDocumentAI?: (mode: any, customPrompt?: string) => void
  promptHistory?: string[]
  favoritePrompts?: string[]
  onAddToFavorites?: (prompt: string) => void
  onRemoveFromFavorites?: (prompt: string) => void
  documentContent?: string
}

type TabType = 'context' | 'preview' | 'assistant'

export function ContextTabs({
  projectContext,
  onProjectSettingsClick,
  documentContext,
  onDocumentContextUpdate,
  sessionContext,
  onSessionContextChange,
  previewContent,
  isStreaming,
  onInsertPreview,
  onClearPreview,
  currentFileName,
  onRunDocumentAI,
  promptHistory = [],
  favoritePrompts = [],
  onAddToFavorites,
  onRemoveFromFavorites,
  documentContent = ''
}: ContextTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('context')

  const TabButton = ({ 
    tab, 
    icon: Icon, 
    label, 
    count 
  }: { 
    tab: TabType; 
    icon: any; 
    label: string; 
    count?: number 
  }) => (
    <Button
      variant={activeTab === tab ? 'default' : 'ghost'}
      onClick={() => setActiveTab(tab)}
      className={`flex items-center space-x-2 text-sm ${
        activeTab === tab 
          ? 'bg-primary text-primary-foreground shadow-md' 
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count !== undefined && (
        <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </Button>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 flex border-b border-border/50 bg-background/30 backdrop-blur-sm p-1 space-x-1">
        <TabButton 
          tab="context" 
          icon={FileText} 
          label="Context"
          count={[
            projectContext.description || projectContext.genre !== 'other' || projectContext.constraints,
            documentContext?.documentNotes || documentContext?.purpose,
            sessionContext.trim()
          ].filter(Boolean).length}
        />
        <TabButton 
          tab="preview" 
          icon={Eye} 
          label="Preview" 
        />
        {onRunDocumentAI && (
          <TabButton 
            tab="assistant" 
            icon={Brain} 
            label="Assistant" 
          />
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0 enhanced-scrollbar">
        {activeTab === 'context' ? (
          <div className="p-4 space-y-4">
            {/* Context Hierarchy Visualization */}
            <ContextHierarchy
              projectContext={projectContext}
              documentContext={documentContext}
              sessionContext={sessionContext}
              currentFileName={currentFileName}
            />
            
            {/* Project Context Summary */}
            <Card className="glass border-border/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span>Project Context</span>
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onProjectSettingsClick}
                    className="text-xs h-7 px-2 hover:bg-primary/10"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="text-sm">
                  <span className="font-medium">{projectContext.name}</span>
                  {projectContext.genre && projectContext.genre !== 'other' && (
                    <span className="text-muted-foreground"> • {projectContext.genre}</span>
                  )}
                  {projectContext.style && (
                    <span className="text-muted-foreground"> • {projectContext.style}</span>
                  )}
                </div>
                {projectContext.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {projectContext.description}
                  </p>
                )}
                {projectContext.audience && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Audience:</span> {projectContext.audience}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Document Context Form */}
            <Card className="glass border-border/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>Document Context</span>
                  {currentFileName && (
                    <span className="text-xs text-muted-foreground font-normal">
                      • {currentFileName}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <DocumentContextForm
                  documentContext={documentContext}
                  onChange={onDocumentContextUpdate}
                />
              </CardContent>
            </Card>

            {/* Session Context */}
            <Card className="glass border-border/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Session Notes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <Label htmlFor="session-context" className="text-xs text-muted-foreground">
                  Add context to guide AI output for this editing session
                </Label>
                <Textarea
                  id="session-context"
                  placeholder="e.g., Focus on character development, improve flow, check grammar..."
                  value={sessionContext}
                  onChange={(e) => onSessionContextChange(e.target.value)}
                  className="h-24 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300 text-sm enhanced-scrollbar overflow-y-auto resizable"
                />
              </CardContent>
            </Card>
          </div>
        ) : activeTab === 'preview' ? (
          // Preview Tab
          <div className="p-4">
            <Card className="glass border-border/30 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isStreaming ? 'bg-green-500 animate-pulse-subtle' : 'bg-gray-400'
                  }`}></div>
                  <span>AI Preview</span>
                  {isStreaming && (
                    <div className="flex items-center space-x-1 text-xs text-green-600">
                      <Sparkles className="h-3 w-3 animate-writing" />
                      <span>Generating...</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4 h-full">
                <div className="bg-background/30 border border-border/30 rounded-lg p-3 min-h-[200px] overflow-y-auto enhanced-scrollbar resizable-both">
                  {previewContent ? (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {previewContent}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      <div className="text-center space-y-2">
                        <Wand2 className="h-8 w-8 mx-auto opacity-50" />
                        <p className="text-sm">AI output will appear here</p>
                      </div>
                    </div>
                  )}
                </div>

                {previewContent && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={onInsertPreview} 
                      className="flex-1 bg-primary hover:bg-primary/90 text-sm"
                      disabled={isStreaming}
                    >
                      <Wand2 className="h-3 w-3 mr-2" />
                      Insert Preview
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={onClearPreview}
                      className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                      disabled={isStreaming}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // Assistant Tab
          <div className="p-4">
            {onRunDocumentAI && (
              <AIAssistantPanel
                currentFileName={currentFileName}
                documentContent={documentContent}
                onRunDocumentAI={onRunDocumentAI}
                isStreaming={isStreaming}
                promptHistory={promptHistory}
                favoritePrompts={favoritePrompts}
                onAddToFavorites={onAddToFavorites}
                onRemoveFromFavorites={onRemoveFromFavorites}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}