import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Wand2, 
  Cpu, 
  Server, 
  RefreshCw, 
  Plus, 
  BookOpen,
  Lightbulb,
  FileText,
  Target,
  Sparkles,
  Zap
} from 'lucide-react'
import type { AIProvider } from '@/lib/ai'
import type { AIMode } from '@/lib/types'
import { getModeInfo } from '@/lib/ai'

interface SelectionToolbarProps {
  mode: AIMode
  temperature: number
  aiProvider: AIProvider
  customPrompt: string
  onModeChange: (mode: AIMode) => void
  onTemperatureChange: (temp: number) => void
  onAIProviderChange: (provider: AIProvider) => void
  onCustomPromptChange: (prompt: string) => void
  onRunAI: () => void
  hasSelection: boolean
  isStreaming: boolean
}

export function SelectionToolbar({
  mode,
  temperature,
  aiProvider,
  customPrompt,
  onModeChange,
  onTemperatureChange,
  onAIProviderChange,
  onCustomPromptChange,
  onRunAI,
  hasSelection,
  isStreaming
}: SelectionToolbarProps) {
  
  const modeInfo = getModeInfo(mode)
  
  const quickModes: Array<{ mode: AIMode; icon: typeof RefreshCw; label: string }> = [
    { mode: 'revise', icon: RefreshCw, label: 'Revise' },
    { mode: 'continue', icon: BookOpen, label: 'Continue' },
    { mode: 'ideas', icon: Lightbulb, label: 'Ideas' },
    { mode: 'focus', icon: Target, label: 'Focus' },
    { mode: 'enhance', icon: Sparkles, label: 'Enhance' }
  ]
  return (
    <div className="space-y-2 p-3 bg-gradient-to-r from-background/98 via-background/95 to-background/98 backdrop-blur-md shadow-elegant animate-slide-up">
      
      {/* Quick Action Modes Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-muted-foreground">Quick Actions:</Label>
          <div className="flex items-center bg-muted/30 rounded-lg p-1 border border-border/50">
            {quickModes.map(({ mode: quickMode, icon: Icon, label }) => (
              <Button
                key={quickMode}
                variant={mode === quickMode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onModeChange(quickMode)}
                disabled={isStreaming}
                className={`px-3 text-xs ${
                  mode === quickMode 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-glow' 
                    : 'hover:bg-accent/50'
                }`}
              >
                <Icon className="w-3 h-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Advanced Mode Selector */}
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-muted-foreground">Mode:</Label>
          <Select value={mode} onValueChange={onModeChange} disabled={isStreaming}>
            <SelectTrigger className="w-40 h-8 bg-background/50 border-border/50 hover:bg-background/80 transition-colors duration-200">
              <div className="flex items-center gap-2">
                <modeInfo.icon className="h-3 w-3" />
                <span className="text-xs">{modeInfo.label}</span>
              </div>
            </SelectTrigger>
            <SelectContent className="glass">
              <SelectItem value="revise" className="hover:bg-accent/50">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 text-blue-500" />
                  <span>Revise Selection</span>
                </div>
              </SelectItem>
              <SelectItem value="append" className="hover:bg-accent/50">
                <div className="flex items-center gap-2">
                  <Plus className="h-3 w-3 text-green-500" />
                  <span>Append to Selection</span>
                </div>
              </SelectItem>
              <SelectItem value="continue" className="hover:bg-accent/50">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3 w-3 text-purple-500" />
                  <span>Continue Story</span>
                </div>
              </SelectItem>
              <SelectItem value="ideas" className="hover:bg-accent/50">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-3 w-3 text-yellow-500" />
                  <span>Generate Ideas</span>
                </div>
              </SelectItem>
              <SelectItem value="summarize" className="hover:bg-accent/50">
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3 text-gray-500" />
                  <span>Summarize</span>
                </div>
              </SelectItem>
              <SelectItem value="focus" className="hover:bg-accent/50">
                <div className="flex items-center gap-2">
                  <Target className="h-3 w-3 text-red-500" />
                  <span>Focus & Clarify</span>
                </div>
              </SelectItem>
              <SelectItem value="enhance" className="hover:bg-accent/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-pink-500" />
                  <span>Add Details</span>
                </div>
              </SelectItem>
              <SelectItem value="custom" className="hover:bg-accent/50">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-orange-500" />
                  <span>Custom Prompt</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Prompt Input (shown when custom mode is selected) */}
      {mode === 'custom' && (
        <div className="space-y-2">
          <Label htmlFor="custom-prompt" className="text-xs font-medium text-muted-foreground">
            Custom Instructions:
          </Label>
          <Textarea
            id="custom-prompt"
            placeholder="e.g., Make this more suspenseful, Add technical details, Rewrite from first person..."
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            className="h-16 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300 text-sm resize-none"
            disabled={isStreaming}
          />
        </div>
      )}

      {/* Settings and Run Button Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* AI Provider */}
          <div className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2 border border-border/30">
            <Label className="text-xs font-medium text-muted-foreground">Provider:</Label>
            <Select value={aiProvider} onValueChange={onAIProviderChange} disabled={isStreaming}>
              <SelectTrigger className="w-28 h-7 bg-background/50 border-border/50 hover:bg-background/80 transition-colors duration-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass">
                <SelectItem value="lmstudio" className="hover:bg-accent/50">
                  <div className="flex items-center gap-2">
                    <Server className="h-3 w-3 text-blue-500" />
                    LM Studio
                  </div>
                </SelectItem>
                <SelectItem value="ollama" className="hover:bg-accent/50">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-3 w-3 text-green-500" />
                    Ollama
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Temperature */}
          <div className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2 border border-border/30">
            <Label htmlFor="temperature" className="text-xs font-medium text-muted-foreground">Temp:</Label>
            <Input
              id="temperature"
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
              className="w-16 h-7 bg-background/50 border-border/50 focus:border-primary/50 transition-colors duration-200 text-xs"
              disabled={isStreaming}
            />
          </div>
        </div>

        {/* Run AI Button */}
        <Button
          onClick={onRunAI}
          disabled={(!hasSelection && mode !== 'ideas') || isStreaming}
          className={`transition-all duration-300 ${
            (hasSelection || mode === 'ideas') && !isStreaming
              ? 'bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 shadow-glow hover:shadow-lg hover:scale-105'
              : ''
          }`}
          size="lg"
        >
          <Wand2 className="w-4 h-4 mr-2" />
          {isStreaming ? (
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              Processing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <modeInfo.icon className="h-4 w-4" />
              {modeInfo.label}
            </span>
          )}
        </Button>
      </div>
      
      {/* Mode Description */}
      {modeInfo.description && (
        <div className="text-xs text-muted-foreground text-center">
          {modeInfo.description}
          {mode === 'ideas' && ' • No text selection required'}
          {!hasSelection && mode !== 'ideas' && ' • Select text to enable'}
        </div>
      )}
    </div>
  )
}