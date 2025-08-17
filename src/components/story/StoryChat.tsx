import { useRef, useEffect, useState } from 'react'
import { streamText } from 'ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Send,
  Sparkles,
  User,
  Bot,
  Loader2,
  Copy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createAIProvider, getModel } from '@/lib/ai'
import type {
  StoryProject,
  StoryPhase,
  ChatMessage,
  StoryAction
} from '@/lib/story-types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface StoryChatProps {
  project: StoryProject
  phase: StoryPhase
  onSendMessage: (message: ChatMessage) => void
  onGeneratingChange: (generating: boolean) => void
  activeChapterId?: string | null
  activeSceneId?: string | null
}

export function StoryChat({
  project,
  phase,
  onSendMessage,
  onGeneratingChange,
  activeChapterId,
  activeSceneId
}: StoryChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>(() => 
    project.chatHistory
      ?.filter(msg => msg.phase === phase) // Only show messages from current phase
      ?.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })) || []
  )
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Update messages when phase changes or project chat history updates
  useEffect(() => {
    const phaseMessages = project.chatHistory
      ?.filter(msg => msg.phase === phase)
      ?.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })) || []
    setMessages(phaseMessages)
  }, [project.chatHistory, phase])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Sync loading state with parent component
  useEffect(() => {
    onGeneratingChange(isLoading)
  }, [isLoading])

  const getActionForPhase = (phase: StoryPhase): StoryAction => {
    switch (phase) {
      case 'ideation': return 'discuss_premise'
      case 'worldbuilding': return 'expand_worldbuilding'
      case 'characters': return 'develop_character'
      case 'outline': return 'generate_outline'
      case 'chapter': return 'write_chapter'
      case 'scene': return 'write_scene'
      case 'revision': return 'revise_content'
      default: return 'brainstorm_ideas'
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Send user message to parent
    const userChatMessage: ChatMessage = {
      id: userMessage.id,
      role: 'user',
      content: userMessage.content,
      timestamp: Date.now(),
      phase,
      metadata: {
        chapterId: activeChapterId || undefined,
        sceneId: activeSceneId || undefined
      }
    }
    onSendMessage(userChatMessage)

    try {
      const systemMessage = buildStorySystemMessage(project, phase, activeChapterId, activeSceneId)
      const provider = createAIProvider('lmstudio')
      const model = getModel('lmstudio')

      // Get current phase messages for conversation context
      const phaseMessages = project.chatHistory
        ?.filter(msg => msg.phase === phase)
        ?.map(msg => ({ role: msg.role, content: msg.content })) || []
      
      // Ensure proper user/assistant alternation by filtering messages
      const filteredMessages = []
      let expectedRole = 'user' // Start expecting user message after system
      
      for (const msg of phaseMessages) {
        if (msg.role === expectedRole) {
          filteredMessages.push(msg)
          expectedRole = expectedRole === 'user' ? 'assistant' : 'user'
        }
        // Skip messages that don't alternate properly
      }
      
      // Add the new user message only if the last message was from assistant (or no messages)
      if (filteredMessages.length === 0 || filteredMessages[filteredMessages.length - 1].role === 'assistant') {
        filteredMessages.push({ role: 'user', content: text })
      }
      
      const messagesForAI = [
        { role: 'system', content: systemMessage },
        ...filteredMessages
      ]
      
      
      const { textStream } = await streamText({
        model: provider(model),
        temperature: 0.8,
        messages: messagesForAI
      })

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: ''
      }

      setMessages(prev => [...prev, assistantMessage])

      for await (const chunk of textStream) {
        assistantMessage.content += chunk
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id ? { ...msg, content: assistantMessage.content } : msg
        ))
      }

      // Send assistant message to parent
      const assistantChatMessage: ChatMessage = {
        id: assistantMessage.id,
        role: 'assistant',
        content: assistantMessage.content,
        timestamp: Date.now(),
        phase,
        metadata: {
          chapterId: activeChapterId || undefined,
          sceneId: activeSceneId || undefined,
          action: getActionForPhase(phase)
        }
      }
      onSendMessage(assistantChatMessage)

    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyMessage = (messageContent: string) => {
    navigator.clipboard.writeText(messageContent)
  }


  const getPhaseDescription = () => {
    switch (phase) {
      case 'ideation':
        return "Let's discuss your story idea. Tell me about your premise, themes, or any initial concepts."
      case 'worldbuilding':
        return "Let's build your story world. Describe the setting, time period, rules, and atmosphere."
      case 'characters':
        return "Let's develop your characters. Who are they? What drives them?"
      case 'outline':
        return "Let's create your story outline. We'll structure chapters and scenes."
      case 'chapter':
        return `Working on ${activeChapterId ? 'this chapter' : 'chapter development'}. What would you like to focus on?`
      case 'scene':
        return `Crafting ${activeSceneId ? 'this scene' : 'scene details'}. How should this scene unfold?`
      case 'revision':
        return "Let's refine your story. What aspects need improvement?"
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      sendMessage(input)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm mb-1">Story Assistant</h3>
        <p className="text-xs text-muted-foreground">
          {getPhaseDescription()}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <Card className="p-6 text-center border-dashed">
            <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Start the conversation about your story.
              I'm here to help you develop and write it.
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
                    {new Date().toLocaleTimeString()}
                  </span>
                  {message.role === 'assistant' && (
                    <Badge variant="outline" className="text-xs">
                      {getActionForPhase(phase).replace(/_/g, ' ')}
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
                    <User className="h-4 w-4" />
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <Card className="p-3 bg-muted">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generating response...</span>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4 space-y-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          placeholder="Describe your story ideas, ask questions, or request assistance..."
          className="min-h-[80px] resize-none"
          disabled={isLoading}
        />

        <div className="flex justify-between">
          <div className="text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Build story-specific system message
function buildStorySystemMessage(
  project: StoryProject,
  phase: StoryPhase,
  activeChapterId?: string | null,
  activeSceneId?: string | null
): string {

  // Safety checks
  if (!project || !project.settings) {
    return 'You are a creative writing assistant helping to develop and write a story.'
  }

  let systemMessage = `You are a creative writing assistant helping to develop and write a ${project.genre || 'creative'} story.

Story Details:
- Title: ${project.title || 'Untitled'}
- Premise: ${project.premise || 'No premise set'}
- Target Length: ${project.targetLength || 'unspecified'}
- Tone: ${project.settings.tone || 'mixed'}
- Perspective: ${project.settings.perspective || 'third-limited'}
- Tense: ${project.settings.tense || 'past'}
- Target Audience: ${project.settings.targetAudience || 'general'}`

  // Add previous phase context if available
  const previousPhaseContext = buildPreviousPhaseContextForChat(project, phase)
  if (previousPhaseContext) {
    systemMessage += `\n\n${previousPhaseContext}`
  }

  if (project.settings.themes && project.settings.themes.length > 0) {
    systemMessage += `\n- Themes: ${project.settings.themes.join(', ')}`
  }

  // Add phase-specific guidance
  switch (phase) {
    case 'ideation':
      systemMessage += '\n\nAs a story collaborator in the ideation phase: Ask ONE specific question at a time to help develop the story. Keep responses to 1-2 sentences maximum. Be encouraging and conversational. Focus on one aspect at a time: plot, character, setting, or theme.'
      break

    case 'worldbuilding':
      systemMessage += '\n\nAs a worldbuilding assistant: Help build the story world collaboratively. Ask focused questions about setting, atmosphere, rules, or culture. Keep responses conversational and to 1-2 sentences when discussing.'
      if (project.outline && project.outline.worldBuilding) {
        systemMessage += `\n\nCurrent world-building:\n${JSON.stringify(project.outline.worldBuilding, null, 2)}`
      }
      break

    case 'characters':
      systemMessage += '\n\nAs a character development assistant: Help develop compelling characters through conversation. Ask one focused question at a time about personality, backstory, or motivations. Keep responses short and engaging.'
      if (project.outline && project.outline.characters && project.outline.characters.length > 0) {
        systemMessage += `\n\nCurrent characters:\n${project.outline.characters.map(c =>
          `- ${c.name || 'Unnamed'} (${c.role || 'unknown'}): ${c.description || 'No description'}`
        ).join('\n')}`
      }
      break

    case 'outline':
      systemMessage += '\n\nAs an outline assistant: Help create a story outline through guided conversation. Ask about plot structure, pacing, or specific chapters one at a time. Be concise and focused.'
      if (project.outline && project.outline.chapters && project.outline.chapters.length > 0) {
        systemMessage += `\n\nCurrent outline:\n${project.outline.chapters.map(ch =>
          `Chapter ${ch.number}: ${ch.title || 'Untitled'}\n  ${ch.summary || 'No summary'}`
        ).join('\n\n')}`
      }
      break

    case 'chapter':
      systemMessage += '\n\nAs a chapter writing assistant: Help write engaging chapter content that advances the story.'
      if (activeChapterId && project.outline && project.outline.chapters) {
        const chapter = project.outline.chapters.find(ch => ch.id === activeChapterId)
        if (chapter) {
          systemMessage += `\n\nWorking on Chapter ${chapter.number}: ${chapter.title || ''}\n${chapter.summary || ''}`
          if (chapter.purpose) {
            systemMessage += `\nPurpose: ${chapter.purpose}`
          }
        }
      }
      break

    case 'scene':
      systemMessage += '\n\nAs a scene writing assistant: Help write vivid scenes with strong imagery and character development.'
      if (activeSceneId && activeChapterId && project.outline && project.outline.chapters) {
        const chapter = project.outline.chapters.find(ch => ch.id === activeChapterId)
        const scene = chapter?.scenes?.find(s => s.id === activeSceneId)
        if (scene) {
          systemMessage += `\n\nWorking on Scene ${scene.number}: ${scene.title || ''}\n${scene.summary || ''}`
          if (scene.setting) {
            systemMessage += `\nSetting: ${scene.setting}`
          }
        }
      }
      break

    case 'revision':
      systemMessage += '\n\nAs a revision assistant: Help revise and improve the story for clarity, pacing, and impact.'
      break
  }

  return systemMessage
}

// Build context from previous phases for chat system message
function buildPreviousPhaseContextForChat(project: StoryProject, currentPhase: StoryPhase): string {
  if (!project.phaseDeliverables) return ""
  
  const context: string[] = []
  const phases: StoryPhase[] = ['ideation', 'worldbuilding', 'characters', 'outline']
  const currentIndex = phases.indexOf(currentPhase)
  
  // Include all previous completed phases
  for (let i = 0; i < currentIndex; i++) {
    const phase = phases[i]
    const deliverable = project.phaseDeliverables[phase]
    
    if (deliverable) {
      context.push(`\n=== ${phase.toUpperCase()} PHASE SYNTHESIS ===`)
      
      switch (phase) {
        case 'ideation':
          const ideation = deliverable as any
          context.push(`Core Premise: ${ideation.synthesizedIdea?.corePremise}`)
          context.push(`Central Conflict: ${ideation.synthesizedIdea?.centralConflict}`)
          context.push(`Themes: ${ideation.synthesizedIdea?.themes?.join(', ')}`)
          context.push(`Unique Elements: ${ideation.synthesizedIdea?.uniqueElements?.join(', ')}`)
          break
          
        case 'worldbuilding':
          const world = deliverable as any
          context.push(`World Overview: ${world.synthesizedIdea?.worldOverview}`)
          context.push(`World Rules: ${world.synthesizedIdea?.worldRules?.join(', ')}`)
          context.push(`Key Locations: ${world.synthesizedIdea?.keyLocations?.map((l: any) => `${l.name} - ${l.description}`).join('; ')}`)
          break
          
        case 'characters':
          const chars = deliverable as any
          context.push(`Main Characters: ${chars.mainCharacters?.map((c: any) => `${c.name} (${c.role}) - ${c.description}`).join('; ')}`)
          context.push(`Character Arcs: ${chars.characterArcs?.join(', ')}`)
          context.push(`Relationship Dynamics: ${chars.relationshipDynamics?.join(', ')}`)
          break
      }
    }
  }
  
  return context.length > 0 ? `PREVIOUS PHASE CONTEXT:\n${context.join('\n')}` : ""
}