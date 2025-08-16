import { useState, useEffect, useCallback } from 'react'
import { streamText } from 'ai'
import { BlockEditor } from '@/components/editor/BlockEditor'
// SelectionToolbar has been removed - this is legacy code
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { createAIProvider, getModel, SYSTEM_MESSAGE, buildUserPrompt, type AIProvider } from '@/lib/ai'

const CONTEXT_CHARS = 800
const STORAGE_KEY = 'wordloom-doc'

export function Editor() {
  const [content, setContent] = useState('')
  const [documentContext, setDocumentContext] = useState('')
  const [selectedLines, setSelectedLines] = useState({ start: -1, end: -1 })
  const [mode] = useState<'revise' | 'append'>('revise')
  const [temperature] = useState(0.7)
  const [isStreaming, setIsStreaming] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [aiProvider] = useState<AIProvider>('lmstudio')
  const { toast } = useToast()

  // Load saved content on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setContent(saved)
    }
  }, [])

  // Auto-save content with debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, content)
    }, 500)
    return () => clearTimeout(timeout)
  }, [content])

  const getSelectedText = useCallback(() => {
    if (selectedLines.start === -1) return ''
    const lines = content.split('\n')
    return lines.slice(selectedLines.start, selectedLines.end + 1).join('\n')
  }, [content, selectedLines])

  const getContext = useCallback(() => {
    if (selectedLines.start === -1) return { left: '', right: '' }
    
    const lines = content.split('\n')
    const beforeLines = lines.slice(0, selectedLines.start)
    const afterLines = lines.slice(selectedLines.end + 1)
    
    // Get left context (up to CONTEXT_CHARS)
    let leftContext = beforeLines.join('\n')
    if (leftContext.length > CONTEXT_CHARS) {
      leftContext = '...' + leftContext.slice(-CONTEXT_CHARS)
    }
    
    // Get right context (up to CONTEXT_CHARS)
    let rightContext = afterLines.join('\n')
    if (rightContext.length > CONTEXT_CHARS) {
      rightContext = rightContext.slice(0, CONTEXT_CHARS) + '...'
    }
    
    return { left: leftContext, right: rightContext }
  }, [content, selectedLines])

  const handleRunAI = async () => {
    const selectedText = getSelectedText()
    if (!selectedText) {
      toast({
        title: 'No selection',
        description: 'Please select some text first',
        variant: 'destructive'
      })
      return
    }

    setIsStreaming(true)
    setPreviewContent('')
    
    try {
      const { left, right } = getContext()
      const userPrompt = buildUserPrompt(
        documentContext,
        left,
        selectedText,
        right,
        mode
      )

      const provider = createAIProvider(aiProvider)
      const model = getModel(aiProvider)
      
      const { textStream } = await streamText({
        model: provider(model),
        temperature,
        messages: [
          { role: 'system', content: SYSTEM_MESSAGE },
          { role: 'user', content: userPrompt }
        ]
      })

      let accumulated = ''
      for await (const chunk of textStream) {
        accumulated += chunk
        setPreviewContent(accumulated)
      }
    } catch (error) {
      console.error('AI streaming error:', error)
      toast({
        title: 'AI Error',
        description: 'Failed to generate content. Is LM Studio running?',
        variant: 'destructive'
      })
    } finally {
      setIsStreaming(false)
    }
  }

  const handleInsertPreview = () => {
    if (!previewContent) return
    
    const lines = content.split('\n')
    
    if (mode === 'revise') {
      // Replace selected lines
      const newLines = [
        ...lines.slice(0, selectedLines.start),
        ...previewContent.split('\n'),
        ...lines.slice(selectedLines.end + 1)
      ]
      setContent(newLines.join('\n'))
    } else {
      // Append after selected lines
      const newLines = [
        ...lines.slice(0, selectedLines.end + 1),
        ...previewContent.split('\n'),
        ...lines.slice(selectedLines.end + 1)
      ]
      setContent(newLines.join('\n'))
    }
    
    setPreviewContent('')
    setSelectedLines({ start: -1, end: -1 })
    toast({
      title: 'Applied',
      description: mode === 'revise' ? 'Text revised' : 'Text appended'
    })
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRunAI()
    }
  }, [handleRunAI])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Main editor */}
        <div className="flex-1 flex flex-col border-r">
          <BlockEditor
            value={content}
            onChange={setContent}
            selectedLines={selectedLines}
            onSelectionChange={setSelectedLines}
          />
        </div>

        {/* Right panel */}
        <div className="w-96 flex flex-col p-4 gap-4 overflow-auto">
          <div>
            <Label htmlFor="context">Document Context</Label>
            <Textarea
              id="context"
              placeholder="Add context to guide AI output (optional)"
              value={documentContext}
              onChange={(e) => setDocumentContext(e.target.value)}
              className="mt-2 h-32"
            />
          </div>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-lg">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {previewContent ? (
                <div className="space-y-4">
                  <div className="whitespace-pre-wrap text-sm">
                    {previewContent}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleInsertPreview}
                      disabled={isStreaming}
                    >
                      Insert Preview
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setPreviewContent('')}
                      disabled={isStreaming}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {isStreaming ? 'Generating...' : 'AI output will appear here'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selection toolbar has been removed - this is legacy code */}
    </div>
  )
}