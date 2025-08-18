import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/components/ui/use-toast'
import MonacoEditor from '@monaco-editor/react'
import { ScenePlanner } from './ScenePlanner'
import {
  PenTool,
  Sparkles,
  BookOpen,
  Target,
  Users,
  MapPin,
  Clock,
  Zap,
  ChevronLeft,
  ChevronRight,
  Save,
  Eye,
  Play,
  Pause,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Plus,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  StoryProject,
  ChapterOutline,
  SceneOutline
} from '@/lib/story-types'
import { useTheme } from '@/lib/theme'
import { streamText } from 'ai'
import { createAIProvider, getModel } from '@/lib/ai'

interface SceneWritingProps {
  project: StoryProject
  activeChapterId: string | null
  activeSceneId: string | null
  onChapterSelect: (chapterId: string) => void
  onSceneSelect: (sceneId: string) => void
  onUpdateChapter: (chapter: ChapterOutline) => void
}

export function SceneWriting({
  project,
  activeChapterId,
  activeSceneId,
  onChapterSelect,
  onSceneSelect,
  onUpdateChapter
}: SceneWritingProps) {
  const { theme } = useTheme()
  const { toast } = useToast()
  const [content, setContent] = useState('')
  const [direction, setDirection] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [isDirty, setIsDirty] = useState(false)
  const [writingMode, setWritingMode] = useState<'fresh' | 'continue' | 'compile'>('fresh')
  const [selectedText, setSelectedText] = useState('')
  const [selectionRange, setSelectionRange] = useState<{start: number, end: number} | null>(null)
  const [revisionDirection, setRevisionDirection] = useState('')
  const [showRevisionPanel, setShowRevisionPanel] = useState(false)
  const [addParagraphDirection, setAddParagraphDirection] = useState('')
  const [showAddParagraphPanel, setShowAddParagraphPanel] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [showScenePlanner, setShowScenePlanner] = useState(false)
  const [elaborationLevel, setElaborationLevel] = useState([3]) // 1-5 scale
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]) // Scene IDs for compilation
  const [compilationTitle, setCompilationTitle] = useState('')
  const streamRef = useRef<ReadableStreamDefaultReader<string> | null>(null)
  const editorRef = useRef<any>(null)

  // Get active chapter and scene
  const activeChapter = project.outline.chapters.find(ch => ch.id === activeChapterId)
  const activeScene = activeChapter?.scenes.find(s => s.id === activeSceneId)

  // Elaboration level helpers
  const getElaborationInfo = (level: number) => {
    switch (level) {
      case 1: return { label: 'Minimal', wordCount: 300, paragraphs: '2-3', description: 'Brief, essential beats only' }
      case 2: return { label: 'Concise', wordCount: 600, paragraphs: '3-5', description: 'Key moments with some detail' }
      case 3: return { label: 'Standard', wordCount: 900, paragraphs: '5-7', description: 'Balanced detail and pacing' }
      case 4: return { label: 'Detailed', wordCount: 1200, paragraphs: '7-10', description: 'Rich descriptions and dialogue' }
      case 5: return { label: 'Elaborate', wordCount: 1500, paragraphs: '10-15', description: 'Comprehensive, immersive prose' }
      default: return { label: 'Standard', wordCount: 900, paragraphs: '5-7', description: 'Balanced detail and pacing' }
    }
  }

  const currentElaboration = getElaborationInfo(elaborationLevel[0])

  // Get scenes to compile
  const getScenesToCompile = () => {
    if (!activeChapter) return ''
    
    const scenes = selectedScenes.length > 0 
      ? activeChapter.scenes.filter(s => selectedScenes.includes(s.id))
      : activeChapter.scenes.filter(s => s.content && s.content.trim().length > 0)
    
    return scenes.map((scene, idx) => 
      `\n=== SCENE ${scene.number}: ${scene.title} ===\n${scene.content || '[No content yet]'}\n`
    ).join('\n')
  }

  // Load scene content when scene changes
  useEffect(() => {
    if (activeScene?.content) {
      setContent(activeScene.content)
      setIsDirty(false)
    } else {
      setContent('')
      setIsDirty(false)
    }
  }, [activeSceneId])

  // Calculate word count
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0).length
    setWordCount(words)
  }, [content])

  // Handle text selection in editor
  const handleEditorMount = (editor: any) => {
    editorRef.current = editor
    
    editor.onDidChangeCursorSelection((e: any) => {
      const selection = editor.getSelection()
      const selectedText = editor.getModel()?.getValueInRange(selection)
      
      // Track cursor position for paragraph insertion
      const position = selection.getStartPosition()
      const offset = editor.getModel()?.getOffsetAt(position)
      setCursorPosition(offset || 0)
      
      if (selectedText && selectedText.trim().length > 0) {
        setSelectedText(selectedText)
        setSelectionRange({
          start: editor.getModel()?.getOffsetAt(selection.getStartPosition()),
          end: editor.getModel()?.getOffsetAt(selection.getEndPosition())
        })
      } else {
        setSelectedText('')
        setSelectionRange(null)
        setShowRevisionPanel(false)
      }
    })
  }

  // Build comprehensive context from all previous phases
  const buildWritingContext = () => {
    const context: string[] = []

    // 1. Story Foundation (Ideation)
    if (project.phaseDeliverables?.ideation?.synthesizedIdea) {
      const ideation = project.phaseDeliverables.ideation.synthesizedIdea
      context.push('=== STORY FOUNDATION ===')
      context.push(`PREMISE: ${ideation.corePremise}`)
      context.push(`CENTRAL CONFLICT: ${ideation.centralConflict}`)
      context.push(`THEMES: ${ideation.themes?.join(', ')}`)
      context.push(`TARGET AUDIENCE: ${ideation.targetAudience}`)
      context.push(`UNIQUE ELEMENTS: ${ideation.uniqueElements?.join(', ')}`)
      context.push('')
    }

    // 2. World Context (Worldbuilding)
    if (project.phaseDeliverables?.worldbuilding?.synthesizedIdea) {
      const world = project.phaseDeliverables.worldbuilding.synthesizedIdea
      context.push('=== WORLD CONTEXT ===')
      context.push(`WORLD: ${world.worldOverview}`)
      context.push(`RULES: ${world.worldRules?.join(', ')}`)
      if (world.keyLocations) {
        context.push('LOCATIONS:')
        world.keyLocations.forEach(loc => {
          context.push(`- ${loc.name}: ${loc.description}`)
        })
      }
      context.push('')
    }

    // 3. Character Context
    if (project.phaseDeliverables?.characters?.mainCharacters && activeScene) {
      const sceneCharacters = project.phaseDeliverables.characters.mainCharacters.filter(c =>
        activeScene.characters.includes(c.id)
      )
      if (sceneCharacters.length > 0) {
        context.push('=== SCENE CHARACTERS ===')
        sceneCharacters.forEach(char => {
          context.push(`${char.name} (${char.role}):`)
          context.push(`- Description: ${char.description}`)
          context.push(`- Motivation: ${char.motivation}`)
          context.push(`- Arc: ${char.arc}`)
          context.push(`- Traits: ${char.traits?.join(', ')}`)
          context.push('')
        })
      }
    }

    // 4. Chapter Context
    if (activeChapter) {
      context.push('=== CHAPTER CONTEXT ===')
      context.push(`Chapter ${activeChapter.number}: ${activeChapter.title}`)
      context.push(`Purpose: ${activeChapter.purpose}`)
      
      // Previous scenes for continuity
      if (activeScene) {
        const sceneIndex = activeChapter.scenes.findIndex(s => s.id === activeScene.id)
        if (sceneIndex > 0) {
          context.push('\nPREVIOUS SCENES:')
          activeChapter.scenes.slice(Math.max(0, sceneIndex - 2), sceneIndex).forEach((prevScene, idx) => {
            context.push(`Scene ${sceneIndex - 2 + idx + 1}: ${prevScene.title}`)
            if (prevScene.content) {
              // Include last paragraph for continuity
              const paragraphs = prevScene.content.split('\n\n')
              const lastParagraph = paragraphs[paragraphs.length - 1]
              context.push(`  Ending: ${lastParagraph.substring(0, 200)}...`)
            }
          })
        }
      }
      context.push('')
    }

    // 5. Current Scene Details
    if (activeScene) {
      context.push('=== CURRENT SCENE ===')
      context.push(`Scene ${activeScene.number}: ${activeScene.title}`)
      context.push(`Purpose: ${activeScene.purpose}`)
      context.push(`Setting: ${activeScene.setting}`)
      context.push(`Mood: ${activeScene.mood || 'Not specified'}`)
      
      // Scene Boundaries
      if (activeScene.openingLine || activeScene.synthesisData?.suggestedOpening) {
        context.push('\nSCENE OPENING:')
        context.push(activeScene.openingLine || activeScene.synthesisData?.suggestedOpening || 'Not specified')
      }
      
      if (activeScene.closingLine || activeScene.synthesisData?.suggestedClosing) {
        context.push('\nSCENE CLOSING:')
        context.push(activeScene.closingLine || activeScene.synthesisData?.suggestedClosing || 'Not specified')
      }

      // Scene Transitions
      if (activeScene.previousSceneConnection || activeScene.synthesisData?.transitionFromPrevious) {
        context.push('\nTRANSITION FROM PREVIOUS SCENE:')
        context.push(activeScene.previousSceneConnection || activeScene.synthesisData?.transitionFromPrevious || 'Not specified')
      }

      if (activeScene.nextSceneSetup || activeScene.synthesisData?.setupForNext) {
        context.push('\nSETUP FOR NEXT SCENE:')
        context.push(activeScene.nextSceneSetup || activeScene.synthesisData?.setupForNext || 'Not specified')
      }
      
      if (activeScene.beats.length > 0) {
        context.push('\nSTORY BEATS TO INCLUDE:')
        activeScene.beats.forEach((beat, idx) => {
          context.push(`${idx + 1}. ${beat.description} (${beat.type})`)
          
          // Include beat placement if available
          const beatPlacement = activeScene.synthesisData?.beatPlacement?.find(bp => bp.beatId === beat.id)
          if (beatPlacement) {
            context.push(`   → Position: ${beatPlacement.suggestedPosition} (${beatPlacement.rationale})`)
          }
        })
      }

      // AI Synthesis insights
      if (activeScene.synthesisData) {
        context.push('\nAI SCENE ANALYSIS:')
        context.push(`Overview: ${activeScene.synthesisData.sceneOverview}`)
        if (activeScene.synthesisData.keyBeats) {
          context.push('Key Beats: ' + activeScene.synthesisData.keyBeats.join(', '))
        }
        if (activeScene.synthesisData.visualElements) {
          context.push('Visual Elements: ' + activeScene.synthesisData.visualElements.join(', '))
        }
        if (activeScene.synthesisData.dialogueOpportunities) {
          context.push('Dialogue Opportunities: ' + activeScene.synthesisData.dialogueOpportunities.join(', '))
        }
      }
    }

    return context.join('\n')
  }

  // Generate scene content with AI
  const generateSceneContent = async () => {
    if (!activeScene || isGenerating) return

    setIsGenerating(true)
    setIsStreaming(true)
    setStreamingContent('')

    try {
      const contextText = buildWritingContext()
      
      let prompt = ''
      if (writingMode === 'fresh') {
        prompt = `Write this scene as a complete, engaging prose narrative. Follow the provided scene boundaries and beat placement precisely. Show, don't tell. Use vivid imagery and natural dialogue.

${direction ? `USER'S WRITING DIRECTION: ${direction}
↳ Apply this direction WITHIN the scene structure constraints below.\n\n` : ''}

SCENE STRUCTURE & CONTEXT:
${contextText}

Write the complete scene in ${project.settings?.tense || 'past'} tense from ${project.settings?.perspective || 'third person'} perspective.

ELABORATION LEVEL: ${currentElaboration.label} (${currentElaboration.wordCount} words, ${currentElaboration.paragraphs} paragraphs)
TARGET: ${currentElaboration.description}

CRITICAL REQUIREMENTS (MUST FOLLOW):
- START the scene with the specified opening line/hook (if provided in context)
- END the scene with the specified closing line/transition (if provided in context)  
- IMPLEMENT story beats at their designated positions (opening/early/middle/late/closing)
- MAINTAIN continuity from the previous scene connection (if specified)
- SET UP elements for the next scene (if specified)
- Follow the beat placement positions and rationales provided

Scene Structure Guidelines:
1. Opening (10%): Hook reader, establish immediate situation
2. Early (20%): Build on opening, introduce key elements
3. Middle (40%): Main action/conflict/development  
4. Late (20%): Climax/resolution of scene conflict
5. Closing (10%): Transition/setup for next scene

${direction ? 
`IMPORTANT: Incorporate the user's writing direction ("${direction}") throughout the scene while respecting the structural boundaries and beat placements above.` : 
'Write the scene following the structural boundaries and beat placements provided.'}

Write the scene now:`

      } else if (writingMode === 'continue') {
        const continueElaboration = getElaborationInfo(elaborationLevel[0])
        const continueWords = Math.ceil(continueElaboration.wordCount * 0.4) // 40% of target for continuation
        
        prompt = `Continue this scene naturally from where it left off. Follow the remaining story beats and maintain character voice and pacing.

${direction ? `CONTINUATION DIRECTION: ${direction}\n\n` : ''}

CONTEXT:
${contextText}

EXISTING SCENE CONTENT:
${content}

ELABORATION LEVEL: ${continueElaboration.label}
TARGET: Continue with approximately ${continueWords} words (${continueElaboration.description})

Continue the scene maintaining the established style and voice:`

      } else { // compile
        // Compilation mode - combine multiple scenes
        const scenesToCompile = getScenesToCompile()
        const compileElaboration = getElaborationInfo(elaborationLevel[0])
        
        prompt = `Compile and seamlessly combine multiple scenes into a cohesive narrative. Smooth transitions between scenes and ensure consistent voice throughout.

${direction ? `COMPILATION DIRECTION: ${direction}\n\n` : ''}

CONTEXT:
${contextText}

SCENES TO COMPILE:
${scenesToCompile}

ELABORATION LEVEL: ${compileElaboration.label} (${compileElaboration.wordCount} words per scene target)
TARGET: ${compileElaboration.description}

Create a seamless compilation that flows naturally from scene to scene:`
      }

      const provider = createAIProvider('lmstudio')
      const model = getModel('lmstudio')

      const { textStream } = streamText({
        model: provider(model),
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are a skilled fiction writer specializing in ${project.genre} stories. Write engaging, immersive prose that brings scenes to life while following the provided scene structure precisely. Focus on:
- Natural, character-appropriate dialogue
- Vivid sensory details and imagery  
- Strong scene structure and pacing
- Character development through action and dialogue
- Maintaining consistent voice and tone
- Show don't tell storytelling
- STRICT adherence to provided scene boundaries (opening/closing lines)
- PRECISE implementation of story beats at their designated positions
- SMOOTH transitions that connect scene to previous/next scenes

You must follow the scene boundaries and beat placement instructions exactly as provided. Start and end the scene where specified. Implement each story beat in its designated position (opening/early/middle/late/closing).

Write only the prose content - no explanations or meta-commentary.`
          },
          { role: 'user', content: prompt }
        ]
      })

      let accumulatedContent = ''
      for await (const chunk of textStream) {
        accumulatedContent += chunk
        setStreamingContent(accumulatedContent)
      }

      // Apply the generated content
      let finalContent = ''
      if (writingMode === 'fresh') {
        finalContent = accumulatedContent
        setContent(accumulatedContent)
      } else if (writingMode === 'continue') {
        finalContent = content + '\n\n' + accumulatedContent
        setContent(finalContent)
      } else { // compile
        finalContent = accumulatedContent
        setContent(accumulatedContent)
        // For compilation, also trigger export
        exportCompiledMarkdown(accumulatedContent)
      }
      
      setIsDirty(true)
      setDirection('')

      // Auto-save the generated content immediately (except for compilation)
      if (activeChapter && activeScene && writingMode !== 'compile') {
        const updatedScenes = activeChapter.scenes.map(s =>
          s.id === activeSceneId
            ? { ...s, content: finalContent, wordCount: finalContent.trim().split(/\s+/).filter(w => w.length > 0).length, status: 'written' as const, updatedAt: Date.now() }
            : s
        )

        onUpdateChapter({
          ...activeChapter,
          scenes: updatedScenes,
          currentWordCount: updatedScenes.reduce((acc, s) => acc + (s.wordCount || 0), 0)
        })

        setIsDirty(false)
      }

      if (writingMode !== 'compile') {
        toast({
          title: "Scene generated & saved",
          description: `Scene ${writingMode === 'continue' ? 'continued' : 'written'} and saved automatically`
        })
      }

    } catch (error) {
      console.error('Scene generation error:', error)
      toast({
        title: "Generation failed",
        description: "Could not generate scene content. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
      setIsStreaming(false)
      setStreamingContent('')
    }
  }

  // Revise selected text with AI
  const reviseSelectedText = async () => {
    if (!selectedText || !selectionRange || !revisionDirection.trim() || isGenerating) return

    setIsGenerating(true)

    try {
      const contextText = buildWritingContext()
      
      const prompt = `Revise the selected text based on the user's direction. Maintain the story context and character voice while implementing the requested changes.

REVISION DIRECTION: ${revisionDirection}

STORY CONTEXT:
${contextText}

SURROUNDING CONTENT (for context):
${content}

SELECTED TEXT TO REVISE:
"${selectedText}"

Provide only the revised version of the selected text, maintaining the same general length and style:`

      const provider = createAIProvider('lmstudio')
      const model = getModel('lmstudio')

      const { text } = await streamText({
        model: provider(model),
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are a skilled fiction editor. Revise text according to specific directions while maintaining story context, character voice, and narrative flow. Output only the revised text with no explanations.`
          },
          { role: 'user', content: prompt }
        ]
      })

      const revisedText = await text

      // Replace the selected text with the revised version
      const newContent = content.substring(0, selectionRange.start) + revisedText + content.substring(selectionRange.end)
      setContent(newContent)
      setIsDirty(true)

      // Auto-save the revision
      if (activeChapter && activeScene) {
        const updatedScenes = activeChapter.scenes.map(s =>
          s.id === activeSceneId
            ? { ...s, content: newContent, wordCount: newContent.trim().split(/\s+/).filter(w => w.length > 0).length, updatedAt: Date.now() }
            : s
        )

        onUpdateChapter({
          ...activeChapter,
          scenes: updatedScenes,
          currentWordCount: updatedScenes.reduce((acc, s) => acc + (s.wordCount || 0), 0)
        })

        setIsDirty(false)
      }

      // Clear selection and close panel
      setSelectedText('')
      setSelectionRange(null)
      setRevisionDirection('')
      setShowRevisionPanel(false)

      toast({
        title: "Text revised & saved",
        description: "Selected text has been revised and saved automatically"
      })

    } catch (error) {
      console.error('Text revision error:', error)
      toast({
        title: "Revision failed",
        description: "Could not revise the selected text. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Add paragraph with AI
  const addParagraphWithAI = async () => {
    if (!addParagraphDirection.trim() || isGenerating) return

    setIsGenerating(true)

    try {
      const contextText = buildWritingContext()
      
      // Get surrounding context around cursor position
      const beforeCursor = content.substring(Math.max(0, cursorPosition - 500), cursorPosition)
      const afterCursor = content.substring(cursorPosition, Math.min(content.length, cursorPosition + 500))
      
      const prompt = `Add a new paragraph at the current position based on the user's direction. The paragraph should flow naturally with the surrounding text and advance the story.

DIRECTION: ${addParagraphDirection}

STORY CONTEXT:
${contextText}

TEXT BEFORE CURSOR:
"${beforeCursor}"

TEXT AFTER CURSOR:
"${afterCursor}"

Write a paragraph (100-200 words) that fits naturally between the before and after text. Follow the established writing style and maintain character voice. Output only the paragraph content:`

      const provider = createAIProvider('lmstudio')
      const model = getModel('lmstudio')

      const { text } = await streamText({
        model: provider(model),
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are a skilled fiction writer. Create paragraphs that flow naturally with existing text while advancing the story. Match the established style, voice, and pacing. Output only the paragraph content with no explanations.`
          },
          { role: 'user', content: prompt }
        ]
      })

      const newParagraph = await text

      // Insert the paragraph at cursor position
      const newContent = content.substring(0, cursorPosition) + '\n\n' + newParagraph + '\n\n' + content.substring(cursorPosition)
      setContent(newContent)
      setIsDirty(true)

      // Auto-save the new content
      if (activeChapter && activeScene) {
        const updatedScenes = activeChapter.scenes.map(s =>
          s.id === activeSceneId
            ? { ...s, content: newContent, wordCount: newContent.trim().split(/\s+/).filter(w => w.length > 0).length, updatedAt: Date.now() }
            : s
        )

        onUpdateChapter({
          ...activeChapter,
          scenes: updatedScenes,
          currentWordCount: updatedScenes.reduce((acc, s) => acc + (s.wordCount || 0), 0)
        })

        setIsDirty(false)
      }

      // Clear and close panel
      setAddParagraphDirection('')
      setShowAddParagraphPanel(false)

      toast({
        title: "Paragraph added & saved",
        description: "New paragraph has been inserted and saved automatically"
      })

    } catch (error) {
      console.error('Paragraph generation error:', error)
      toast({
        title: "Generation failed",
        description: "Could not generate the paragraph. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Save scene content
  const saveScene = () => {
    if (!activeChapter || !activeScene) return

    const updatedScenes = activeChapter.scenes.map(s =>
      s.id === activeSceneId
        ? { ...s, content, wordCount, status: 'written' as const, updatedAt: Date.now() }
        : s
    )

    onUpdateChapter({
      ...activeChapter,
      scenes: updatedScenes,
      currentWordCount: updatedScenes.reduce((acc, s) => acc + (s.wordCount || 0), 0)
    })

    setIsDirty(false)
    toast({
      title: "Scene saved",
      description: `"${activeScene.title}" has been saved with ${wordCount} words.`
    })
  }

  // Navigation helpers
  const navigateScene = (direction: 'prev' | 'next') => {
    if (!activeChapter || !activeScene) return

    const currentIndex = activeChapter.scenes.findIndex(s => s.id === activeSceneId)
    if (direction === 'prev' && currentIndex > 0) {
      onSceneSelect(activeChapter.scenes[currentIndex - 1].id)
    } else if (direction === 'next' && currentIndex < activeChapter.scenes.length - 1) {
      onSceneSelect(activeChapter.scenes[currentIndex + 1].id)
    }
  }

  // Export single scene
  const exportScene = () => {
    if (!activeScene || !content) return

    const filename = `${project.title} - Chapter ${activeChapter?.number} Scene ${activeScene.number}.md`
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export compiled markdown
  const exportCompiledMarkdown = (compiledContent: string) => {
    if (!activeChapter) return

    const title = compilationTitle.trim() || `${project.title} - ${activeChapter.title}`
    const scenesUsed = selectedScenes.length > 0 
      ? selectedScenes.length 
      : activeChapter.scenes.filter(s => s.content && s.content.trim().length > 0).length

    // Create markdown with metadata
    const markdown = `# ${title}

**Project:** ${project.title}  
**Chapter:** ${activeChapter.title}  
**Scenes Compiled:** ${scenesUsed}  
**Generated:** ${new Date().toLocaleDateString()}  
**Word Count:** ~${compiledContent.trim().split(/\s+/).filter(w => w.length > 0).length}

---

${compiledContent}

---

*Compiled with Wordloom Story Writer*`

    const filename = `${title.replace(/[^a-zA-Z0-9\s-]/g, '')}.md`
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Compilation exported!",
      description: `"${title}" has been saved as ${filename}`
    })
  }

  if (!activeChapter || !activeScene) {
    return (
      <div className="h-full flex flex-col">
        {/* Scene Selector */}
        <div className="p-6 border-b">
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                Scene Writing
              </CardTitle>
              <CardDescription>
                Select a scene to start writing prose from your outlined story
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Chapter</label>
                  <Select value={activeChapterId || ''} onValueChange={onChapterSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {project.outline.chapters.map(chapter => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          Chapter {chapter.number}: {chapter.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activeChapterId && (
                  <div>
                    <label className="text-sm font-medium">Scene</label>
                    <Select value={activeSceneId || ''} onValueChange={onSceneSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a scene" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeChapter?.scenes.map(scene => (
                          <SelectItem key={scene.id} value={scene.id}>
                            <div className="flex items-center gap-2">
                              <span>Scene {scene.number}: {scene.title}</span>
                              {scene.status === 'written' && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {project.outline.chapters.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No chapters found. Complete the outline phase first to create chapters and scenes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              Select a chapter and scene to begin writing
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateScene('prev')}
                disabled={activeChapter.scenes[0]?.id === activeSceneId}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateScene('next')}
                disabled={activeChapter.scenes[activeChapter.scenes.length - 1]?.id === activeSceneId}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Title */}
            <div>
              <h2 className="font-semibold">
                Chapter {activeChapter.number}, Scene {activeScene.number}: {activeScene.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activeScene.purpose}
              </p>
            </div>

            {/* Status */}
            <Badge variant="outline" className={cn(
              activeScene.status === 'written' && "text-green-600 bg-green-500/10",
              activeScene.status === 'outlined' && "text-blue-600 bg-blue-500/10"
            )}>
              {activeScene.status}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                {wordCount.toLocaleString()} / {currentElaboration.wordCount.toLocaleString()} words
              </div>
              <div 
                className="w-16 h-2 bg-muted rounded-full overflow-hidden"
                title={`${Math.round((wordCount / currentElaboration.wordCount) * 100)}% of target`}
              >
                <div 
                  className={cn(
                    "h-full transition-all duration-300",
                    wordCount >= currentElaboration.wordCount ? "bg-green-500" : 
                    wordCount >= currentElaboration.wordCount * 0.8 ? "bg-yellow-500" : "bg-blue-500"
                  )}
                  style={{ width: `${Math.min(100, (wordCount / currentElaboration.wordCount) * 100)}%` }}
                />
              </div>
            </div>

            {selectedText && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <div className="text-xs text-muted-foreground">
                  {selectedText.length} chars selected
                </div>
              </>
            )}

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant={!(activeScene?.openingLine || activeScene?.closingLine) ? "default" : "outline"}
              size="sm"
              onClick={() => setShowScenePlanner(true)}
              disabled={isGenerating}
              className={!(activeScene?.openingLine || activeScene?.closingLine) ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              <Settings className="h-4 w-4 mr-2" />
              {!(activeScene?.openingLine || activeScene?.closingLine) ? "Set Boundaries" : "Plan Scene"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddParagraphPanel(true)}
              disabled={isGenerating}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Paragraph
            </Button>

            {selectedText && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRevisionPanel(true)}
                disabled={isGenerating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Edit Selection
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={saveScene}
              disabled={!isDirty}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>

            {writingMode === 'compile' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => content && exportCompiledMarkdown(content)}
                disabled={!content}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Compilation
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={exportScene}
                disabled={!content}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Scene
              </Button>
            )}
          </div>
        </div>

        {/* Scene Context Bar */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {activeScene.setting && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{activeScene.setting}</span>
            </div>
          )}

          {activeScene.characters.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{activeScene.characters.length} characters</span>
            </div>
          )}

          {activeScene.beats.length > 0 && (
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>{activeScene.beats.length} beats</span>
            </div>
          )}

          {activeScene.mood && (
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span>{activeScene.mood}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex">
        {/* AI Writing Panel */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm mb-3">AI Scene Writer</h3>
            
            {/* Writing Mode */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Writing Mode</label>
                <Select value={writingMode} onValueChange={(value: any) => setWritingMode(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fresh">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        <span>Write Fresh Scene</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="continue">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        <span>Continue Scene</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="compile">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        <span>Compile & Export</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Elaboration Level */}
              <div>
                <label className="text-xs font-medium flex items-center gap-2 mb-2">
                  Scene Length & Detail
                  <Badge variant="outline" className="text-xs">
                    {currentElaboration.label}
                  </Badge>
                </label>
                <Slider
                  value={elaborationLevel}
                  onValueChange={setElaborationLevel}
                  min={1}
                  max={5}
                  step={1}
                  className="mb-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Minimal</span>
                  <span>Standard</span>
                  <span>Elaborate</span>
                </div>
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  <p><span className="font-medium">{currentElaboration.wordCount} words</span> • {currentElaboration.paragraphs} paragraphs</p>
                  <p>{currentElaboration.description}</p>
                </div>
              </div>

              {/* Scene Selection for Compilation */}
              {writingMode === 'compile' && (
                <div>
                  <label className="text-xs font-medium mb-2 block">Select Scenes to Compile</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto bg-muted p-3 rounded">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="all-scenes"
                        checked={selectedScenes.length === 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedScenes([])
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor="all-scenes" className="text-xs">
                        All written scenes ({activeChapter?.scenes.filter(s => s.content && s.content.trim().length > 0).length || 0})
                      </label>
                    </div>
                    {activeChapter?.scenes.map(scene => (
                      <div key={scene.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`scene-${scene.id}`}
                          checked={selectedScenes.includes(scene.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedScenes(prev => [...prev, scene.id])
                            } else {
                              setSelectedScenes(prev => prev.filter(id => id !== scene.id))
                            }
                          }}
                          disabled={!scene.content || scene.content.trim().length === 0}
                          className="rounded"
                        />
                        <label htmlFor={`scene-${scene.id}`} className={cn(
                          "text-xs",
                          (!scene.content || scene.content.trim().length === 0) && "text-muted-foreground"
                        )}>
                          Scene {scene.number}: {scene.title}
                          {(!scene.content || scene.content.trim().length === 0) && " (No content)"}
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3">
                    <label className="text-xs font-medium mb-1 block">Compilation Title</label>
                    <input
                      type="text"
                      value={compilationTitle}
                      onChange={(e) => setCompilationTitle(e.target.value)}
                      placeholder={`${activeChapter?.title} - Complete Chapter`}
                      className="w-full px-2 py-1 text-xs border rounded"
                    />
                  </div>
                </div>
              )}

              {/* Direction */}
              <div>
                <label className="text-xs font-medium">Writing Direction (Optional)</label>
                <Textarea
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  placeholder={
                    writingMode === 'compile' 
                      ? "How should scenes be combined? (e.g., 'smooth transitions', 'chapter break style', 'seamless flow')..."
                      : (activeScene?.openingLine || activeScene?.closingLine) 
                        ? "Specific style/tone/focus for this scene (will be applied within the configured boundaries)..."
                        : "Any specific direction for the AI writer... (Tip: Use 'Set Boundaries' for better structure)"
                  }
                  className="min-h-[80px] text-sm"
                />
                {writingMode === 'compile' ? (
                  <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded text-xs text-purple-700">
                    <p className="font-medium">📚 Compilation Mode Active</p>
                    <p>AI will combine selected scenes into a seamless narrative and export to markdown.</p>
                  </div>
                ) : (activeScene?.openingLine || activeScene?.closingLine) ? (
                  <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-700">
                    <p className="font-medium">✅ Scene boundaries configured</p>
                    <p>AI will write within your planned structure while applying the direction above.</p>
                  </div>
                ) : (
                  <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-700">
                    <p className="font-medium">💡 Tip: Set scene boundaries first</p>
                    <p>Use "Set Boundaries" to define opening/closing lines for better AI output.</p>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateSceneContent}
                disabled={isGenerating}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Writing Scene...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {writingMode === 'fresh' ? 'Write Scene' : 
                     writingMode === 'continue' ? 'Continue Scene' : 'Compile & Export'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Scene Context */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              Scene Context
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                {currentElaboration.label}
              </Badge>
              {(activeScene?.openingLine || activeScene?.closingLine || activeScene?.beatSequence?.length) && (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                  Boundaries Set
                </Badge>
              )}
            </h4>
            <div className="space-y-3 text-sm">
              {/* Scene Boundaries */}
              {(activeScene?.openingLine || activeScene?.closingLine || 
                activeScene?.previousSceneConnection || activeScene?.nextSceneSetup) && (
                <div>
                  <label className="font-medium text-xs text-green-600">Scene Boundaries</label>
                  <div className="mt-1 space-y-1">
                    {activeScene.openingLine && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Opening:</span> {activeScene.openingLine.substring(0, 60)}...
                      </p>
                    )}
                    {activeScene.closingLine && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Closing:</span> {activeScene.closingLine.substring(0, 60)}...
                      </p>
                    )}
                    {activeScene.previousSceneConnection && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">From Previous:</span> Connected
                      </p>
                    )}
                    {activeScene.nextSceneSetup && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Sets Up Next:</span> Configured
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeScene.beats.length > 0 && (
                <div>
                  <label className="font-medium text-xs">Story Beats</label>
                  <ul className="mt-1 space-y-1">
                    {activeScene.beats.map((beat, idx) => (
                      <li key={beat.id} className="text-xs text-muted-foreground">
                        {idx + 1}. {beat.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeScene.synthesisData && (
                <div>
                  <label className="font-medium text-xs">AI Insights</label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeScene.synthesisData.sceneOverview}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0 relative">
          {isStreaming && (
            <div className="absolute inset-0 z-10 bg-background/95">
              <MonacoEditor
                value={streamingContent}
                language="markdown"
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  lineNumbers: 'off',
                  fontSize: 16,
                  fontFamily: 'Georgia, serif',
                  lineHeight: 28,
                  padding: { top: 20, bottom: 20 },
                  scrollBeyondLastLine: false
                }}
              />
              <div className="absolute top-4 right-4">
                <Badge variant="default" className="animate-pulse">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Writing...
                </Badge>
              </div>
            </div>
          )}

          <MonacoEditor
            value={content}
            onChange={(value) => {
              setContent(value || '')
              setIsDirty(true)
            }}
            onMount={handleEditorMount}
            language="markdown"
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              lineNumbers: 'off',
              fontSize: 16,
              fontFamily: 'Georgia, serif',
              lineHeight: 28,
              padding: { top: 20, bottom: 20 },
              scrollBeyondLastLine: false,
              renderLineHighlight: 'none',
              occurrencesHighlight: false,
              selectionHighlight: false,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              scrollbar: {
                vertical: 'auto',
                horizontal: 'hidden'
              }
            }}
          />

        </div>
      </div>

      {/* Revision Modal */}
      {showRevisionPanel && selectedText && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Edit Selected Text
              </CardTitle>
              <CardDescription>
                AI will rewrite the selected text based on your direction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Selected Text</label>
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded border-l-2 border-primary mt-1 max-h-32 overflow-y-auto">
                  "{selectedText}"
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Editing Direction</label>
                <Textarea
                  value={revisionDirection}
                  onChange={(e) => setRevisionDirection(e.target.value)}
                  placeholder="How should this text be rewritten? For example:&#10;• 'Make it more dramatic and intense'&#10;• 'Add more sensory details and imagery'&#10;• 'Improve the dialogue to sound more natural'&#10;• 'Increase the emotional impact'"
                  className="mt-1 min-h-[100px]"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={reviseSelectedText}
                  disabled={!revisionDirection.trim() || isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Revising Text...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Revise Text
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRevisionPanel(false)
                    setRevisionDirection('')
                  }}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Paragraph Modal */}
      {showAddParagraphPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Paragraph
              </CardTitle>
              <CardDescription>
                AI will create a new paragraph at your cursor position
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Paragraph Direction</label>
                <Textarea
                  value={addParagraphDirection}
                  onChange={(e) => setAddParagraphDirection(e.target.value)}
                  placeholder="What should this paragraph contain? For example:&#10;• 'Show the character's internal struggle'&#10;• 'Add a tense conversation between Sarah and John'&#10;• 'Describe the mysterious sound from the basement'&#10;• 'Reveal the protagonist's hidden motivation'&#10;• 'Build suspense before the confrontation'"
                  className="mt-1 min-h-[120px]"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={addParagraphWithAI}
                  disabled={!addParagraphDirection.trim() || isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating Paragraph...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Add Paragraph
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddParagraphPanel(false)
                    setAddParagraphDirection('')
                  }}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scene Planner Modal */}
      {showScenePlanner && activeScene && (
        <ScenePlanner
          scene={activeScene}
          onUpdateScene={(updatedScene) => {
            if (activeChapter) {
              const updatedScenes = activeChapter.scenes.map(s =>
                s.id === activeSceneId ? updatedScene : s
              )
              onUpdateChapter({
                ...activeChapter,
                scenes: updatedScenes
              })
            }
          }}
          onClose={() => setShowScenePlanner(false)}
        />
      )}
    </div>
  )
}