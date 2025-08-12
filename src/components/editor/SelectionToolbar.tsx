import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wand2, Cpu, Server } from 'lucide-react'
import type { AIProvider } from '@/lib/ai'

interface SelectionToolbarProps {
  mode: 'revise' | 'append'
  temperature: number
  aiProvider: AIProvider
  onModeChange: (mode: 'revise' | 'append') => void
  onTemperatureChange: (temp: number) => void
  onAIProviderChange: (provider: AIProvider) => void
  onRunAI: () => void
  hasSelection: boolean
  isStreaming: boolean
}

export function SelectionToolbar({
  mode,
  temperature,
  aiProvider,
  onModeChange,
  onTemperatureChange,
  onAIProviderChange,
  onRunAI,
  hasSelection,
  isStreaming
}: SelectionToolbarProps) {
  return (
    <div className="flex items-center gap-6 p-4 border-t bg-gradient-to-r from-background/98 via-background/95 to-background/98 backdrop-blur-md shadow-elegant animate-slide-up">
      <div className="flex items-center bg-muted/30 rounded-lg p-1 border border-border/50">
        <Button
          variant={mode === 'revise' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('revise')}
          disabled={isStreaming}
          className={mode === 'revise' ? 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-glow' : 'hover:bg-accent/50'}
        >
          Revise Selection
        </Button>
        <Button
          variant={mode === 'append' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('append')}
          disabled={isStreaming}
          className={mode === 'append' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 shadow-glow' : 'hover:bg-accent/50'}
        >
          Append to Selection
        </Button>
      </div>
      
      <div className="flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2 border border-border/30">
        <Label className="text-xs font-medium text-muted-foreground">Provider:</Label>
        <Select value={aiProvider} onValueChange={onAIProviderChange} disabled={isStreaming}>
          <SelectTrigger className="w-28 h-8 bg-background/50 border-border/50 hover:bg-background/80 transition-colors duration-200">
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
      
      <div className="flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2 border border-border/30">
        <Label htmlFor="temperature" className="text-xs font-medium text-muted-foreground">Temperature:</Label>
        <Input
          id="temperature"
          type="number"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
          className="w-20 h-8 bg-background/50 border-border/50 focus:border-primary/50 transition-colors duration-200"
          disabled={isStreaming}
        />
      </div>
      
      <Button
        onClick={onRunAI}
        disabled={!hasSelection || isStreaming}
        className={`ml-auto transition-all duration-300 ${
          hasSelection && !isStreaming
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
          'Run AI'
        )}
      </Button>
    </div>
  )
}