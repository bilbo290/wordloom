import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Brain,
  BookOpen,
  Users,
  BarChart3,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Wand2,
  Clock,
  Star,
  Edit,
  Trash2
} from 'lucide-react'
import { DEFAULT_PROMPT_TEMPLATES } from '@/lib/ai'
import type { PromptTemplate, AIMode } from '@/lib/types'

interface AIAssistantPanelProps {
  currentFileName?: string
  documentContent: string
  onRunDocumentAI: (mode: AIMode, customPrompt?: string) => void
  isStreaming: boolean
  promptHistory: string[]
  favoritePrompts?: string[]
  onAddToFavorites?: (prompt: string) => void
  onRemoveFromFavorites?: (prompt: string) => void
}

export function AIAssistantPanel({
  currentFileName,
  documentContent,
  onRunDocumentAI,
  isStreaming,
  promptHistory,
  favoritePrompts = [],
  onAddToFavorites,
  onRemoveFromFavorites
}: AIAssistantPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  // Filter templates for document-level assistance
  const documentTemplates = DEFAULT_PROMPT_TEMPLATES.filter(template => !template.requiresSelection)
  const selectionTemplates = DEFAULT_PROMPT_TEMPLATES.filter(template => template.requiresSelection)

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'none') {
      setSelectedTemplate('')
      setCustomPrompt('')
      return
    }
    
    const template = DEFAULT_PROMPT_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      setCustomPrompt(template.promptText)
    }
  }

  const handleRunTemplate = (template: PromptTemplate) => {
    onRunDocumentAI(template.mode, template.promptText)
  }

  const handleRunCustom = () => {
    if (customPrompt.trim()) {
      onRunDocumentAI('custom', customPrompt.trim())
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'writing': return <BookOpen className="h-4 w-4" />
      case 'brainstorming': return <Lightbulb className="h-4 w-4" />
      case 'analysis': return <BarChart3 className="h-4 w-4" />
      case 'editing': return <MessageSquare className="h-4 w-4" />
      default: return <Brain className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'writing': return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20'
      case 'brainstorming': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'analysis': return 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20'
      case 'editing': return 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20'
      default: return 'text-muted-foreground bg-muted/30 border-muted-foreground/20'
    }
  }

  return (
    <div className="space-y-4 relative">
      {/* Header */}
      <Card className="glass border-border/30 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center space-x-2">
            <Brain className="h-4 w-4 text-primary" />
            <span>AI Assistant</span>
            {currentFileName && (
              <span className="text-xs text-muted-foreground font-normal">
                • {currentFileName}
              </span>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Get AI help with your entire document - no text selection needed
          </p>
        </CardHeader>
      </Card>

      {/* Quick Document Actions */}
      <Card className="glass border-border/30 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-1 gap-2">
            {documentTemplates.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                size="sm"
                onClick={() => handleRunTemplate(template)}
                disabled={isStreaming || !documentContent.trim()}
                className="h-auto p-3 flex flex-col items-start space-y-1 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center space-x-2 w-full">
                  {getCategoryIcon(template.category)}
                  <span className="font-medium text-xs">{template.name}</span>
                  <Badge 
                    variant="secondary" 
                    className={`ml-auto text-xs ${getCategoryColor(template.category)}`}
                  >
                    {template.category}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  {template.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Prompt Section */}
      <Card className="glass border-border/30 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span>Custom Assistant</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Template Selector */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Start with a template (optional):
            </Label>
            <Select 
              value={selectedTemplate} 
              onValueChange={handleTemplateSelect}
              disabled={isStreaming}
            >
              <SelectTrigger className="bg-background/50 border-border/50">
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border/50 backdrop-blur-md">
                <SelectItem value="none">
                  <span className="text-muted-foreground">No template</span>
                </SelectItem>
                {DEFAULT_PROMPT_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(template.category)}
                      <span>{template.name}</span>
                      <Badge 
                        variant="secondary" 
                        className={`ml-2 text-xs ${getCategoryColor(template.category)}`}
                      >
                        {template.category}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Prompt Input */}
          <div className="space-y-2">
            <Label htmlFor="document-prompt" className="text-xs text-muted-foreground">
              Your instructions:
            </Label>
            <Textarea
              id="document-prompt"
              placeholder="e.g., Help me brainstorm character backgrounds, Create an outline for this story, Analyze the themes in this content..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="h-24 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300 resize-none text-sm"
              disabled={isStreaming}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleRunCustom}
              disabled={!customPrompt.trim() || isStreaming || !documentContent.trim()}
              className="flex-1 bg-primary hover:bg-primary/90 text-sm"
            >
              <Wand2 className="h-3 w-3 mr-2" />
              {isStreaming ? 'Processing...' : 'Ask AI'}
            </Button>
            
            {customPrompt.trim() && onAddToFavorites && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddToFavorites(customPrompt)}
                disabled={isStreaming}
                className="px-3"
              >
                <Star className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selection-Based Templates */}
      {selectionTemplates.length > 0 && (
        <Card className="glass border-border/30 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span>Selection-Based Templates</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              These require text selection in the editor
            </p>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {selectionTemplates.map((template) => (
              <div
                key={template.id}
                className="p-3 border border-border/50 rounded-lg bg-background/30 opacity-60"
              >
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(template.category)}
                  <span className="font-medium text-xs">{template.name}</span>
                  <Badge 
                    variant="secondary" 
                    className={`ml-auto text-xs ${getCategoryColor(template.category)}`}
                  >
                    {template.category}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground block mt-1">
                  {template.description}
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center pt-2">
              Select text in the editor to use these templates
            </p>
          </CardContent>
        </Card>
      )}

      {/* Favorite Prompts */}
      {favoritePrompts.length > 0 && (
        <Card className="glass border-border/30 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>Favorite Prompts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {favoritePrompts.slice(0, 5).map((prompt, index) => (
              <div
                key={index}
                className="group p-2 border border-border/50 rounded bg-background/30 hover:bg-accent/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p 
                    className="text-xs text-foreground line-clamp-2 cursor-pointer flex-1"
                    onClick={() => setCustomPrompt(prompt)}
                  >
                    {prompt}
                  </p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCustomPrompt(prompt)}
                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    {onRemoveFromFavorites && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveFromFavorites(prompt)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {favoritePrompts.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                and {favoritePrompts.length - 5} more...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Prompts */}
      {promptHistory.length > 0 && (
        <Card className="glass border-border/30 bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>Recent Prompts</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs h-6 px-2"
              >
                {showHistory ? 'Hide' : 'Show'}
              </Button>
            </div>
          </CardHeader>
          {showHistory && (
            <CardContent className="pt-0 space-y-2">
              {promptHistory.slice(-5).reverse().map((prompt, index) => (
                <div
                  key={index}
                  className="group p-2 border border-border/50 rounded bg-background/30 hover:bg-accent/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p 
                      className="text-xs text-foreground line-clamp-2 cursor-pointer flex-1"
                      onClick={() => setCustomPrompt(prompt)}
                    >
                      {prompt}
                    </p>
                    {onAddToFavorites && !favoritePrompts.includes(prompt) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAddToFavorites(prompt)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-yellow-600 hover:text-yellow-700"
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Status */}
      {!documentContent.trim() && (
        <div className="text-center py-8 text-muted-foreground">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Start writing to enable AI assistance</p>
        </div>
      )}
    </div>
  )
}