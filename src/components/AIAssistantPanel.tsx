import { useState, useEffect } from 'react'
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
  Trash2,
  RefreshCw
} from 'lucide-react'
import { DEFAULT_PROMPT_TEMPLATES, type AIProvider, fetchOllamaModels, getModelDisplayInfo, type OllamaModel } from '@/lib/ai'
import type { PromptTemplate, AIMode } from '@/lib/types'

interface AIAssistantPanelProps {
  currentFileName?: string
  documentContent: string
  onRunDocumentAI: (mode: AIMode, customPrompt?: string) => void
  isStreaming?: boolean
  promptHistory: string[]
  favoritePrompts?: string[]
  onAddToFavorites?: (prompt: string) => void
  onRemoveFromFavorites?: (prompt: string) => void
  aiProvider?: AIProvider
  selectedModel?: string
  onModelChange?: (model: string) => void
}

export function AIAssistantPanel({
  currentFileName,
  documentContent,
  onRunDocumentAI,
  isStreaming = false,
  promptHistory,
  favoritePrompts = [],
  onAddToFavorites,
  onRemoveFromFavorites,
  aiProvider = 'ollama',
  selectedModel,
  onModelChange
}: AIAssistantPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)

  // Fetch available Ollama models when provider is ollama
  useEffect(() => {
    if (aiProvider === 'ollama') {
      const fetchModels = async () => {
        setIsLoadingModels(true)
        setModelError(null)
        try {
          const models = await fetchOllamaModels()
          setAvailableModels(models)
        } catch (error) {
          setModelError('Failed to fetch models. Is Ollama running?')
          setAvailableModels([])
        } finally {
          setIsLoadingModels(false)
        }
      }
      
      fetchModels()
    } else {
      setAvailableModels([])
      setModelError(null)
    }
  }, [aiProvider])

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

      {/* Model Selection */}
      {onModelChange && (
        <Card className="glass border-border/30 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Brain className="h-4 w-4 text-blue-500" />
              <span>AI Model</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Current Model ({aiProvider}):
              </Label>
              <Select 
                value={selectedModel || ''} 
                onValueChange={(value: string) => onModelChange(value)}
                disabled={isStreaming || (aiProvider === 'ollama' && isLoadingModels)}
              >
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue placeholder={
                    isLoadingModels ? 'Loading models...' : `Select ${aiProvider} model...`
                  } />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border/50 backdrop-blur-md">
                  {aiProvider === 'ollama' ? (
                    <>
                      {isLoadingModels && (
                        <div className="flex items-center space-x-2 px-2 py-1.5 text-sm">
                          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading models...</span>
                        </div>
                      )}
                      {modelError && (
                        <div className="flex items-center space-x-2 text-red-500 px-2 py-1.5 text-sm">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span className="text-xs">{modelError}</span>
                        </div>
                      )}
                      {!isLoadingModels && !modelError && availableModels.map((model) => {
                        const info = getModelDisplayInfo(model)
                        return (
                          <SelectItem key={info.name} value={info.name}>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span>{info.displayName}</span>
                              {info.variant !== 'latest' && (
                                <Badge variant="secondary" className="ml-1 text-xs">
                                  {info.variant}
                                </Badge>
                              )}
                              <Badge variant="outline" className="ml-1 text-xs">
                                {info.sizeGB}
                              </Badge>
                            </div>
                          </SelectItem>
                        )
                      })}
                      {!isLoadingModels && !modelError && availableModels.length === 0 && (
                        <div className="flex items-center space-x-2 text-muted-foreground px-2 py-1.5 text-sm">
                          <span className="text-xs">No models found. Pull models with: ollama pull llama3.2</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <SelectItem value="lmstudio">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span>Default LM Studio Model</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="custom">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                          <span>Custom Model</span>
                        </div>
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {aiProvider === 'ollama' && availableModels.length > 0 
                    ? `${availableModels.length} models available`
                    : 'Select different models for varied capabilities. Change provider in Settings.'
                  }
                </p>
                {aiProvider === 'ollama' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Trigger a refresh of models
                      if (!isLoadingModels) {
                        const fetchModels = async () => {
                          setIsLoadingModels(true)
                          setModelError(null)
                          try {
                            const models = await fetchOllamaModels()
                            setAvailableModels(models)
                          } catch (error) {
                            setModelError('Failed to fetch models. Is Ollama running?')
                            setAvailableModels([])
                          } finally {
                            setIsLoadingModels(false)
                          }
                        }
                        fetchModels()
                      }
                    }}
                    disabled={isLoadingModels}
                    className="h-6 px-2 text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                className={`h-auto p-3 flex flex-col items-start space-y-1 transition-all duration-200 ${
                  isStreaming 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-accent/50 hover:scale-[1.02]'
                }`}
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
              disabled={isStreaming || !customPrompt.trim() || !documentContent.trim()}
              className={`flex-1 text-sm transition-all duration-200 ${
                isStreaming || !customPrompt.trim() || !documentContent.trim()
                  ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                  : 'bg-primary hover:bg-primary/90 hover:scale-105 shadow-md hover:shadow-lg'
              }`}
            >
              {isStreaming ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3 mr-2" />
                  Ask AI
                </>
              )}
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