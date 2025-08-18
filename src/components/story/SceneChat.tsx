import { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  Send,
  Bot,
  Copy,
  Camera,
  Sparkles,
  Target,
  Users,
  Heart,
  Zap,
  MessageSquare,
  Layers,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  StoryProject,
  SceneOutline,
  ChatMessage,
  StoryAction
} from '@/lib/story-types'
import { generateId } from '@/lib/session'
import { streamText } from 'ai'
import { createAIProvider, getModel } from '@/lib/ai'

interface SceneChatProps {
  project: StoryProject
  scene: SceneOutline
  onUpdateScene: (scene: SceneOutline) => void
  onSynthesizeScene?: (scene: SceneOutline) => Promise<void>
}

export function SceneChat({
  project,
  scene,
  onUpdateScene,
  onSynthesizeScene
}: SceneChatProps) {
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [sceneContext, setSceneContext] = useState<'storyboard' | 'beats' | 'dialogue' | 'visual' | 'pacing'>('storyboard')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get scene-specific chat history
  const messages = scene.chatHistory || []

  // Check if we can synthesize (2+ user messages)
  const canSynthesize = useMemo(() => {
    const userMessages = messages.filter(msg => msg.role === 'user')
    return userMessages.length >= 2
  }, [messages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGenerating])

  const getContextIcon = (context: string) => {
    switch (context) {
      case 'storyboard': return <Camera className="h-4 w-4" />
      case 'beats': return <Zap className="h-4 w-4" />
      case 'dialogue': return <MessageSquare className="h-4 w-4" />
      case 'visual': return <Layers className="h-4 w-4" />
      case 'pacing': return <Clock className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const getContextDescription = () => {
    switch (sceneContext) {
      case 'storyboard':
        return "Discuss the overall scene structure and flow. How should this scene unfold?"
      case 'beats':
        return "Plan specific story beats. What key moments need to happen in this scene?"
      case 'dialogue':
        return "Focus on character conversations. What do characters say and reveal?"
      case 'visual':
        return "Explore visual and cinematic elements. How should this scene look and feel?"
      case 'pacing':
        return "Examine scene timing and rhythm. How fast or slow should events unfold?"
    }
  }

  const getActionForContext = (context: string): StoryAction => {
    switch (context) {
      case 'beats': return 'develop_scene_beats'
      case 'dialogue': return 'craft_scene_dialogue'
      case 'visual': return 'establish_scene_mood'
      case 'pacing': return 'design_scene_flow'
      default: return 'plan_scene_structure'
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isGenerating) return

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
      phase: 'scene',
      metadata: {
        chapterId: scene.id.startsWith('ch-') ? scene.id.split('-scene-')[0] : undefined,
        sceneId: scene.id,
        action: getActionForContext(sceneContext),
        sceneContext
      }
    }

    // Add user message to scene chat history
    const updatedChatHistory = [...messages, userMessage]
    onUpdateScene({
      ...scene,
      chatHistory: updatedChatHistory
    })

    setInput('')
    setIsGenerating(true)

    try {
      // Build AI context for scene discussion
      const sceneContextText = buildSceneContext()

      const systemMessage = `You are a scene development assistant helping craft compelling story scenes. 

You are currently working on: Scene ${scene.number} - "${scene.title}"
Scene Purpose: ${scene.purpose}
Setting: ${scene.setting}
Characters: ${scene.characters.join(', ')}

Current Context Focus: ${sceneContext.toUpperCase()}
${getContextDescription()}

${sceneContextText}

Ask ONE focused question at a time to help develop this scene. Be conversational and specific. Build on what the user just shared. Keep responses to 1-2 sentences.`

      const provider = createAIProvider('lmstudio')
      const model = getModel('lmstudio')

      const { textStream } = streamText({
        model: provider(model),
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemMessage },
          ...updatedChatHistory.slice(-6).map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }))
        ]
      })

      let assistantContent = ''
      for await (const chunk of textStream) {
        assistantContent += chunk
        // Could add streaming UI here if desired
      }

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now(),
        phase: 'scene',
        metadata: {
          chapterId: scene.id.startsWith('ch-') ? scene.id.split('-scene-')[0] : undefined,
          sceneId: scene.id,
          action: getActionForContext(sceneContext),
          sceneContext
        }
      }

      // Update scene with assistant message
      onUpdateScene({
        ...scene,
        chatHistory: [...updatedChatHistory, assistantMessage]
      })

    } catch (error) {
      console.error('Scene chat error:', error)
      toast({
        title: "Chat error",
        description: "Could not send message. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const buildSceneContext = () => {
    const context: string[] = []

    // Project context
    if (project.phaseDeliverables?.ideation?.synthesizedIdea) {
      const ideation = project.phaseDeliverables.ideation.synthesizedIdea
      context.push(`STORY PREMISE: ${ideation.corePremise}`)
      context.push(`CENTRAL CONFLICT: ${ideation.centralConflict}`)
    }

    // Character context
    if (project.outline.characters) {
      const sceneCharacters = project.outline.characters.filter(c =>
        scene.characters.includes(c.id)
      )
      if (sceneCharacters.length > 0) {
        context.push(`\nSCENE CHARACTERS:`)
        sceneCharacters.forEach(char => {
          context.push(`- ${char.name} (${char.role}): ${char.description}`)
          if (char.motivation) context.push(`  Motivation: ${char.motivation}`)
        })
      }
    }

    // Previous scenes context
    const chapter = project.outline.chapters.find(ch =>
      ch.scenes.some(s => s.id === scene.id)
    )
    if (chapter) {
      const sceneIndex = chapter.scenes.findIndex(s => s.id === scene.id)
      if (sceneIndex > 0) {
        const previousScene = chapter.scenes[sceneIndex - 1]
        context.push(`\nPREVIOUS SCENE: ${previousScene.title}`)
        context.push(`Previous outcome: ${previousScene.outcome || 'Unknown'}`)
      }
    }

    // Existing scene elements
    if (scene.beats.length > 0) {
      context.push(`\nEXISTING BEATS:`)
      scene.beats.forEach(beat => {
        context.push(`- ${beat.description} (${beat.type})`)
      })
    }

    return context.join('\n')
  }

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast({
        title: "Copied",
        description: "Message copied to clipboard"
      })
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const handleSynthesize = () => {
    if (onSynthesizeScene) {
      onSynthesizeScene(scene)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      sendMessage(input)
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-4 border-b bg-background">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm">Scene Development</h3>
            <p className="text-xs text-muted-foreground">
              Scene {scene.number}: {scene.title}
            </p>
          </div>

          {canSynthesize && onSynthesizeScene && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSynthesize}
              disabled={isGenerating}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Synthesize
            </Button>
          )}
        </div>

        {/* Context Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium">Discussion Focus</label>
          <Select value={sceneContext} onValueChange={(value: any) => setSceneContext(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="storyboard">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  <span>Scene Structure</span>
                </div>
              </SelectItem>
              <SelectItem value="beats">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>Story Beats</span>
                </div>
              </SelectItem>
              <SelectItem value="dialogue">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Dialogue & Character</span>
                </div>
              </SelectItem>
              <SelectItem value="visual">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span>Visual & Mood</span>
                </div>
              </SelectItem>
              <SelectItem value="pacing">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Pacing & Flow</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {getContextDescription()}
          </p>
        </div>
      </div>

      {/* Messages - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <Card className="p-6 text-center border-dashed">
            <div className="flex items-center justify-center mb-3">
              {getContextIcon(sceneContext)}
            </div>
            <p className="text-sm text-muted-foreground">
              Start discussing this scene. I'll help you develop the structure, beats, and flow.
            </p>
          </Card>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
              )}

              <div className={cn(
                "max-w-[80%] space-y-2",
                message.role === 'user' ? "items-end" : "items-start"
              )}>
                <Card className={cn(
                  "p-3",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}>
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>
                </Card>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  {message.metadata?.sceneContext && (
                    <Badge variant="outline" className="text-xs">
                      {message.metadata.sceneContext}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => copyMessage(message.content)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {isGenerating && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary animate-pulse" />
              </div>
            </div>
            <Card className="p-3 bg-muted">
              <div className="text-sm text-muted-foreground">
                Thinking about your scene...
              </div>
            </Card>
          </div>
        )}

        {/* Scroll target */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Discuss ${sceneContext} for this scene...`}
            className="flex-1 min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}