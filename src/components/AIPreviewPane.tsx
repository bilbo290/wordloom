import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Sparkles, 
  Wand2, 
  Trash2,
  X,
  Eye,
  ArrowRight,
  Square
} from 'lucide-react'

interface AIPreviewPaneProps {
  previewContent: string
  isStreaming: boolean
  onInsertPreview: () => void
  onClearPreview: () => void
  onClose: () => void
  onStopGeneration?: () => void
  isVisible: boolean
}

export function AIPreviewPane({
  previewContent,
  isStreaming,
  onInsertPreview,
  onClearPreview,
  onClose,
  onStopGeneration,
  isVisible
}: AIPreviewPaneProps) {
  if (!isVisible) return null

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-muted/10 to-muted/5 border-l">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-muted/20 to-muted/40 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isStreaming ? 'bg-green-500 animate-pulse-subtle' : 'bg-gray-400'
          }`}></div>
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-gradient-subtle">AI Preview</span>
          {isStreaming && (
            <div className="flex items-center space-x-2 text-xs">
              <div className="flex items-center space-x-1 text-green-600">
                <Sparkles className="h-3 w-3 animate-writing" />
                <span className="font-medium">Generating</span>
              </div>
              <div className="flex space-x-0.5">
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {isStreaming && onStopGeneration && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onStopGeneration}
              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
              title="Stop AI Generation"
            >
              <Square className="h-3 w-3 fill-current" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-accent/50"
            title="Close Preview"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        <Card className="glass border-border/30 flex-1 flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Wand2 className="h-4 w-4 text-primary" />
                <span>Generated Content</span>
              </CardTitle>
              {previewContent && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="px-2 py-1 bg-accent/20 rounded-md">
                    {previewContent.split(' ').filter(word => word.length > 0).length} words
                  </span>
                  <span className="px-2 py-1 bg-accent/20 rounded-md">
                    {previewContent.length} chars
                  </span>
                  {isStreaming && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded-md">
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-600 font-medium">Live</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 flex-1 flex flex-col overflow-hidden">
            <div className="bg-background/30 border border-border/30 rounded-lg p-4 flex-1 overflow-y-auto enhanced-scrollbar resizable-both">
              {previewContent ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {previewContent}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center space-y-3">
                    <div className="relative">
                      <Wand2 className="h-12 w-12 mx-auto opacity-30" />
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-blue-500/10 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">AI Preview</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Generated content will appear here
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {previewContent && (
              <div className="flex gap-3 mt-4 pt-4 border-t border-border/20">
                <Button 
                  onClick={onInsertPreview} 
                  className="flex-1 bg-primary hover:bg-primary/90 text-sm shadow-md"
                  disabled={isStreaming}
                >
                  <ArrowRight className="h-3 w-3 mr-2" />
                  Insert into Editor
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onClearPreview}
                  className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 shadow-sm"
                  disabled={isStreaming}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}