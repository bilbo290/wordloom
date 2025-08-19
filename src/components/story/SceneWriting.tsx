import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  Settings,
  Square
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
  const abortControllerRef = useRef<AbortController | null>(null)
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

  // Build comprehensive context with enhanced continuity tracking
  const buildWritingContext = () => {
    const context: string[] = []

    // 1. Story Foundation (Ideation) - For tone consistency
    if (project.phaseDeliverables?.ideation?.synthesizedIdea) {
      const ideation = project.phaseDeliverables.ideation.synthesizedIdea
      context.push('=== STORY FOUNDATION ===')
      context.push(`PREMISE: ${ideation.corePremise}`)
      context.push(`CENTRAL CONFLICT: ${ideation.centralConflict}`)
      context.push(`THEMES: ${ideation.themes?.join(', ')}`)
      context.push(`TARGET AUDIENCE: ${ideation.targetAudience}`)
      context.push(`GENRE CONVENTIONS: ${ideation.genreConventions?.join(', ')}`)
      context.push(`UNIQUE ELEMENTS: ${ideation.uniqueElements?.join(', ')}`)
      context.push('')
    }

    // 2. Writing Style & Voice Analysis
    const establishedVoice = analyzeEstablishedVoice()
    if (establishedVoice) {
      context.push('=== ESTABLISHED WRITING STYLE ===')
      context.push(`NARRATIVE VOICE: ${establishedVoice.narrativeVoice}`)
      context.push(`SENTENCE STRUCTURE: ${establishedVoice.sentenceStyle}`)
      context.push(`DIALOGUE STYLE: ${establishedVoice.dialogueStyle}`)
      context.push(`PACING: ${establishedVoice.pacing}`)
      context.push(`TONE KEYWORDS: ${establishedVoice.toneKeywords.join(', ')}`)
      context.push('')
    }

    // 3. Chapter Arc & Progression
    if (activeChapter && activeScene) {
      const chapterProgression = analyzeChapterProgression()
      context.push('=== CHAPTER STORY ARC ===')
      context.push(`Chapter ${activeChapter.number}: ${activeChapter.title}`)
      context.push(`Chapter Purpose: ${activeChapter.purpose}`)
      context.push(`Current Scene Position: ${chapterProgression.currentPosition} of ${chapterProgression.totalScenes}`)
      context.push(`Chapter Arc Stage: ${chapterProgression.arcStage}`)
      context.push(`Emotional Trajectory: ${chapterProgression.emotionalTrajectory}`)
      context.push(`Plot Momentum: ${chapterProgression.plotMomentum}`)
      context.push('')
    }

    // 4. World Context (Worldbuilding)
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

    // 5. Character Context with Relationship Dynamics
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
          context.push(`- Current Arc State: ${char.arc}`)
          context.push(`- Voice/Personality: ${char.traits?.join(', ')}`)
          if (char.relationships) {
            context.push(`- Key Relationships: ${char.relationships.map(r => `${r.characterName} (${r.type})`).join(', ')}`)
          }
          context.push('')
        })

        // Add relationship dynamics for multi-character scenes
        if (sceneCharacters.length > 1) {
          context.push('RELATIONSHIP DYNAMICS:')
          const dynamics = project.phaseDeliverables.characters.relationshipDynamics || []
          dynamics.forEach(dynamic => {
            context.push(`- ${dynamic}`)
          })
          context.push('')
        }
      }
    }

    // 6. Enhanced Scene Continuity Context
    if (activeScene) {
      const continuityContext = buildEnhancedContinuityContext()
      context.push('=== SCENE CONTINUITY CONTEXT ===')
      context.push(continuityContext)
      
      // Add explicit transition instructions
      const transitionInstructions = buildTransitionInstructions()
      if (transitionInstructions) {
        context.push('\\n\\n=== SCENE TRANSITION INSTRUCTIONS ===')
        context.push(transitionInstructions)
      }
    }

    // 7. Current Scene Details
    if (activeScene) {
      context.push('=== CURRENT SCENE DETAILS ===')
      context.push(`Scene ${activeScene.number}: ${activeScene.title}`)
      context.push(`Purpose: ${activeScene.purpose}`)
      context.push(`Setting: ${activeScene.setting}`)
      context.push(`Mood/Tone: ${activeScene.mood || 'Not specified'}`)
      
      // Scene Boundaries
      if (activeScene.openingLine || activeScene.synthesisData?.suggestedOpening) {
        context.push('\nSCENE OPENING:')
        context.push(activeScene.openingLine || activeScene.synthesisData?.suggestedOpening || 'Not specified')
      }
      
      if (activeScene.closingLine || activeScene.synthesisData?.suggestedClosing) {
        context.push('\nSCENE CLOSING:')
        context.push(activeScene.closingLine || activeScene.synthesisData?.suggestedClosing || 'Not specified')
      }

      // Enhanced Scene Transitions
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

  // Analyze established writing voice from previous scenes
  const analyzeEstablishedVoice = () => {
    if (!activeChapter) return null

    const writtenScenes = activeChapter.scenes.filter(s => s.content && s.content.trim().length > 200)
    if (writtenScenes.length === 0) return null

    // Extract style patterns from existing content
    const allContent = writtenScenes.map(s => s.content).join('\n\n')
    const sentences = allContent.split(/[.!?]+/).filter(s => s.trim().length > 10)
    
    // Analyze sentence patterns
    const avgSentenceLength = sentences.reduce((acc, s) => acc + s.split(' ').length, 0) / sentences.length
    const shortSentences = sentences.filter(s => s.split(' ').length < 10).length
    const longSentences = sentences.filter(s => s.split(' ').length > 20).length
    
    // Determine sentence style
    let sentenceStyle = 'balanced'
    if (shortSentences > sentences.length * 0.4) sentenceStyle = 'crisp and punchy'
    else if (longSentences > sentences.length * 0.3) sentenceStyle = 'flowing and elaborate'
    
    // Analyze dialogue patterns
    const dialogueMatches = allContent.match(/"[^"]*"/g) || []
    const hasDialogue = dialogueMatches.length > 0
    
    let dialogueStyle = 'minimal dialogue'
    if (hasDialogue) {
      const avgDialogueLength = dialogueMatches.reduce((acc, d) => acc + d.length, 0) / dialogueMatches.length
      if (avgDialogueLength < 50) dialogueStyle = 'sharp, concise exchanges'
      else if (avgDialogueLength > 100) dialogueStyle = 'detailed, expressive conversations'
      else dialogueStyle = 'natural, conversational tone'
    }
    
    // Determine pacing
    const actionWords = (allContent.match(/\b(ran|jumped|grabbed|shouted|rushed|burst|slammed)\b/gi) || []).length
    const contemplativeWords = (allContent.match(/\b(wondered|thought|remembered|considered|reflected)\b/gi) || []).length
    
    let pacing = 'moderate'
    if (actionWords > contemplativeWords * 2) pacing = 'fast-paced with dynamic action'
    else if (contemplativeWords > actionWords * 2) pacing = 'contemplative and introspective'
    
    // Extract tone keywords
    const toneIndicators = {
      dark: /\b(shadow|darkness|grim|ominous|foreboding|dread)\b/gi,
      light: /\b(bright|warm|hope|joy|laughter|sunshine)\b/gi,
      tense: /\b(tension|anxiety|fear|worry|nervous|edge)\b/gi,
      mysterious: /\b(mystery|secret|hidden|unknown|strange)\b/gi,
      emotional: /\b(heart|emotion|feeling|soul|passion|love)\b/gi
    }
    
    const toneKeywords: string[] = []
    Object.entries(toneIndicators).forEach(([tone, regex]) => {
      if ((allContent.match(regex) || []).length > 2) {
        toneKeywords.push(tone)
      }
    })
    
    // Determine narrative voice
    let narrativeVoice = project.settings?.perspective || 'third person'
    if (narrativeVoice === 'third person') {
      const intimate = (allContent.match(/\b(he felt|she thought|his heart|her mind)\b/gi) || []).length
      const distant = (allContent.match(/\b(the man|the woman|the figure)\b/gi) || []).length
      if (intimate > distant) narrativeVoice += ' intimate'
      else if (distant > intimate) narrativeVoice += ' distant'
      else narrativeVoice += ' balanced'
    }
    
    return {
      narrativeVoice,
      sentenceStyle,
      dialogueStyle,
      pacing,
      toneKeywords
    }
  }

  // Analyze chapter progression and story arc position
  const analyzeChapterProgression = () => {
    if (!activeChapter || !activeScene) {
      return {
        currentPosition: 1,
        totalScenes: 1,
        arcStage: 'opening',
        emotionalTrajectory: 'establishing',
        plotMomentum: 'building'
      }
    }

    const currentSceneIndex = activeChapter.scenes.findIndex(s => s.id === activeScene.id)
    const totalScenes = activeChapter.scenes.length
    const progressPercent = (currentSceneIndex + 1) / totalScenes
    
    // Determine arc stage based on position
    let arcStage = 'middle'
    if (progressPercent <= 0.25) arcStage = 'opening'
    else if (progressPercent <= 0.75) arcStage = 'development'
    else arcStage = 'climax/resolution'
    
    // Analyze emotional trajectory
    const writtenScenes = activeChapter.scenes.slice(0, currentSceneIndex + 1).filter(s => s.content)
    let emotionalTrajectory = 'establishing'
    
    if (writtenScenes.length > 1) {
      const lastScene = writtenScenes[writtenScenes.length - 2]
      if (lastScene?.mood && activeScene.mood) {
        const moodTransition = `${lastScene.mood} → ${activeScene.mood}`
        if (moodTransition.includes('calm') && moodTransition.includes('tense')) {
          emotionalTrajectory = 'building tension'
        } else if (moodTransition.includes('tense') && moodTransition.includes('calm')) {
          emotionalTrajectory = 'releasing tension'
        } else if (moodTransition.includes('sad') && moodTransition.includes('hope')) {
          emotionalTrajectory = 'rising hope'
        } else {
          emotionalTrajectory = 'developing complexity'
        }
      }
    }
    
    // Determine plot momentum based on scene purposes
    const plotMomentumIndicators = {
      building: ['introduce', 'establish', 'setup'],
      accelerating: ['reveal', 'confront', 'challenge'],
      climactic: ['resolve', 'climax', 'decision'],
      concluding: ['wrap', 'conclude', 'reflection']
    }
    
    let plotMomentum = 'building'
    const scenePurpose = activeScene.purpose.toLowerCase()
    
    for (const [momentum, keywords] of Object.entries(plotMomentumIndicators)) {
      if (keywords.some(keyword => scenePurpose.includes(keyword))) {
        plotMomentum = momentum
        break
      }
    }
    
    return {
      currentPosition: currentSceneIndex + 1,
      totalScenes,
      arcStage,
      emotionalTrajectory,
      plotMomentum
    }
  }

  // Build enhanced continuity context with more comprehensive scene connections
  const buildEnhancedContinuityContext = () => {
    if (!activeChapter || !activeScene) return 'No continuity context available.'

    const context: string[] = []
    const sceneIndex = activeChapter.scenes.findIndex(s => s.id === activeScene.id)
    
    // Previous scenes context (expanded to include more scenes and better analysis)
    if (sceneIndex > 0) {
      context.push('PREVIOUS SCENES FOR CONTINUITY:')
      
      // Include up to 3 previous scenes with different levels of detail
      const relevantPreviousScenes = activeChapter.scenes.slice(Math.max(0, sceneIndex - 3), sceneIndex)
      
      relevantPreviousScenes.forEach((prevScene, idx) => {
        const sceneNumber = sceneIndex - relevantPreviousScenes.length + idx + 1
        context.push(`\nScene ${sceneNumber}: ${prevScene.title}`)
        
        if (prevScene.content) {
          const paragraphs = prevScene.content.split('\n\n').filter(p => p.trim())
          
          if (idx === relevantPreviousScenes.length - 1) {
            // Most recent scene - include ending and key emotional state
            const ending = paragraphs[paragraphs.length - 1]
            context.push(`  Recent ending: ${ending.substring(0, 300)}${ending.length > 300 ? '...' : ''}`)
            
            // Extract emotional state from the ending
            const emotionalCues = extractEmotionalState(ending)
            if (emotionalCues.length > 0) {
              context.push(`  Emotional state: ${emotionalCues.join(', ')}`)
            }
            
            // Check for unresolved elements or cliffhangers
            const unresolvedElements = extractUnresolvedElements(ending)
            if (unresolvedElements.length > 0) {
              context.push(`  Unresolved: ${unresolvedElements.join(', ')}`)
            }
          } else {
            // Earlier scenes - just key outcomes and character states
            context.push(`  Key outcome: ${prevScene.purpose}`)
            if (paragraphs.length > 0) {
              const lastLine = paragraphs[paragraphs.length - 1]
              context.push(`  Final note: ${lastLine.substring(0, 150)}...`)
            }
          }
        } else {
          context.push(`  Status: Not yet written (${prevScene.purpose})`)
        }
      })
      
      context.push('')
    }
    
    // Next scenes context for foreshadowing and setup
    const nextScenes = activeChapter.scenes.slice(sceneIndex + 1, Math.min(activeChapter.scenes.length, sceneIndex + 3))
    if (nextScenes.length > 0) {
      context.push('UPCOMING SCENES (for foreshadowing/setup):')
      nextScenes.forEach((nextScene, idx) => {
        context.push(`Scene ${sceneIndex + idx + 2}: ${nextScene.title}`)
        context.push(`  Purpose: ${nextScene.purpose}`)
        if (nextScene.mood && nextScene.mood !== activeScene.mood) {
          context.push(`  Mood shift: ${activeScene.mood || 'current'} → ${nextScene.mood}`)
        }
      })
      context.push('')
    }
    
    // Chapter-level story threads and their current status
    const chapterThemes = extractChapterThemes()
    if (chapterThemes.length > 0) {
      context.push('CHAPTER STORY THREADS:')
      chapterThemes.forEach(theme => {
        context.push(`- ${theme}`)
      })
      context.push('')
    }
    
    return context.join('\n')
  }

  // Extract emotional state from text
  const extractEmotionalState = (text: string): string[] => {
    const emotions: string[] = []
    const emotionPatterns = {
      'tension/anxiety': /\b(tense|anxious|worried|nervous|on edge|uncomfortable)\b/gi,
      'fear/dread': /\b(afraid|scared|terrified|dread|ominous|foreboding)\b/gi,
      'anger/frustration': /\b(angry|furious|frustrated|irritated|rage|fury)\b/gi,
      'sadness/melancholy': /\b(sad|melancholy|sorrowful|grief|despair|mourn)\b/gi,
      'hope/optimism': /\b(hope|optimistic|bright|promising|uplifting)\b/gi,
      'confusion/uncertainty': /\b(confused|uncertain|puzzled|bewildered|lost)\b/gi,
      'determination/resolve': /\b(determined|resolved|firm|decisive|steady)\b/gi
    }
    
    Object.entries(emotionPatterns).forEach(([emotion, pattern]) => {
      if (pattern.test(text)) {
        emotions.push(emotion)
      }
    })
    
    return emotions
  }

  // Extract unresolved elements that need continuation
  const extractUnresolvedElements = (text: string): string[] => {
    const unresolved: string[] = []
    
    // Check for questions
    if (text.includes('?')) {
      unresolved.push('unanswered questions')
    }
    
    // Check for interruptions or incomplete actions
    if (text.match(/\b(suddenly|interrupted|cut off|before .* could)\b/gi)) {
      unresolved.push('interrupted action')
    }
    
    // Check for cliffhanger indicators
    if (text.match(/\b(but then|however|until|before|just as)\b/gi) && text.trim().endsWith('.')) {
      unresolved.push('potential cliffhanger')
    }
    
    // Check for mysteries or secrets mentioned
    if (text.match(/\b(secret|mystery|hidden|unknown|strange|curious)\b/gi)) {
      unresolved.push('mystery/secret elements')
    }
    
    return unresolved
  }

  // Extract chapter themes and ongoing story threads
  const extractChapterThemes = (): string[] => {
    if (!activeChapter) return []
    
    const themes: string[] = []
    
    // Analyze chapter purpose for main themes
    const purpose = activeChapter.purpose.toLowerCase()
    if (purpose.includes('relationship')) themes.push('Character relationships development')
    if (purpose.includes('reveal')) themes.push('Mystery/revelation elements')
    if (purpose.includes('conflict')) themes.push('Central conflict progression')
    if (purpose.includes('character')) themes.push('Character growth/change')
    
    // Analyze scene purposes for recurring themes
    const scenePurposes = activeChapter.scenes.map(s => s.purpose.toLowerCase()).join(' ')
    if (scenePurposes.includes('trust') || scenePurposes.includes('betray')) {
      themes.push('Trust and betrayal dynamics')
    }
    if (scenePurposes.includes('past') || scenePurposes.includes('memory')) {
      themes.push('Past events influencing present')
    }
    
    return themes.length > 0 ? themes : [`Chapter focus: ${activeChapter.purpose}`]
  }

  // Build explicit transition instructions for scene continuity
  const buildTransitionInstructions = (): string | null => {
    if (!activeChapter || !activeScene) return null

    const sceneIndex = activeChapter.scenes.findIndex(s => s.id === activeScene.id)
    if (sceneIndex === 0) {
      // First scene in chapter
      return `This is the FIRST SCENE in the chapter. You may begin with a new setting or continuation from previous chapter, but avoid generic openings like "rain on windows" unless specifically relevant to the story.`
    }

    // Find the most recent scene with content
    const previousWrittenScenes = activeChapter.scenes.slice(0, sceneIndex).filter(s => s.content && s.content.trim().length > 100)
    
    if (previousWrittenScenes.length === 0) {
      return `This scene follows unwritten scenes in the chapter. Begin appropriately for the scene's purpose while avoiding generic story openings.`
    }

    const lastWrittenScene = previousWrittenScenes[previousWrittenScenes.length - 1]
    const lastParagraphs = lastWrittenScene.content.split('\\n\\n').filter(p => p.trim())
    const lastParagraph = lastParagraphs[lastParagraphs.length - 1]
    
    // Analyze the ending for continuation cues
    const instructions: string[] = []
    
    instructions.push(`CRITICAL: This scene must continue directly from the previous scene's ending state.`)
    instructions.push(`\\nLast scene ended with: "${lastParagraph.substring(0, 400)}${lastParagraph.length > 400 ? '...' : ''}"`)
    
    // Determine the type of transition needed
    const immediateSceneIndex = activeChapter.scenes.findIndex(s => s.id === lastWrittenScene.id)
    const sceneGap = sceneIndex - immediateSceneIndex - 1
    
    if (sceneGap === 0) {
      // Immediate continuation
      instructions.push('\\n🎯 IMMEDIATE CONTINUATION: This scene happens right after the previous scene.')
      instructions.push('- DO NOT start with generic scene openings (weather, time jumps, etc.)')
      instructions.push('- Continue from the exact emotional and physical state where the last scene ended')
      instructions.push('- Maintain the same characters, location, and momentum unless the scene plan specifies otherwise')
      instructions.push('- If characters were in dialogue, continue the conversation or show immediate reactions')
      instructions.push('- If action was happening, continue that action or show its immediate aftermath')
    } else {
      // Some scenes skipped
      instructions.push(`\\n⏳ TIME/SCENE TRANSITION: ${sceneGap} scene(s) between this and the last written scene.`)
      instructions.push('- You may transition in time/location, but connect to the previous scene outcome')
      instructions.push('- Reference or acknowledge what happened in the previous scene')
      instructions.push('- Show how characters have been affected by previous events')
      instructions.push('- Avoid completely disconnected new beginnings')
    }

    // Check for specific transition guidance
    if (activeScene.previousSceneConnection) {
      instructions.push(`\\n📋 PLANNED TRANSITION: ${activeScene.previousSceneConnection}`)
    }

    // Analyze emotional state for continuity
    const emotionalCues = extractEmotionalState(lastParagraph)
    if (emotionalCues.length > 0) {
      instructions.push(`\\n😊 EMOTIONAL STATE: Previous scene ended with ${emotionalCues.join(', ')}.`)
      instructions.push('- Honor this emotional state in your opening')
      instructions.push('- Characters should still be affected by these emotions unless time has passed')
    }

    // Check for unresolved elements
    const unresolvedElements = extractUnresolvedElements(lastParagraph)
    if (unresolvedElements.length > 0) {
      instructions.push(`\\n❓ UNRESOLVED ELEMENTS: ${unresolvedElements.join(', ')}`)
      instructions.push('- Address or acknowledge these unresolved elements')
      instructions.push('- Don\\'t ignore cliffhangers or interrupted actions')
    }

    return instructions.join('\\n')
  }

  // Stop scene generation
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsGenerating(false)
    setIsStreaming(false)
    
    toast({
      title: "Generation stopped",
      description: "Scene generation has been halted. Current progress has been preserved."
    })
  }

  // Calculate continuity readiness score for the current scene
  const calculateContinuityScore = (): number => {
    if (!activeScene || !activeChapter) return 50

    let score = 0
    let maxScore = 0

    // 1. Previous scene context availability (25 points)
    maxScore += 25
    const sceneIndex = activeChapter.scenes.findIndex(s => s.id === activeScene.id)
    if (sceneIndex > 0) {
      const previousScenes = activeChapter.scenes.slice(Math.max(0, sceneIndex - 2), sceneIndex)
      const writtenPrevious = previousScenes.filter(s => s.content && s.content.trim().length > 200)
      score += Math.min(25, writtenPrevious.length * 12.5) // Up to 2 previous scenes
    } else {
      score += 15 // First scene gets partial credit
    }

    // 2. Scene boundaries and transitions (20 points)
    maxScore += 20
    if (activeScene.openingLine || activeScene.synthesisData?.suggestedOpening) score += 5
    if (activeScene.closingLine || activeScene.synthesisData?.suggestedClosing) score += 5
    if (activeScene.previousSceneConnection || activeScene.synthesisData?.transitionFromPrevious) score += 5
    if (activeScene.nextSceneSetup || activeScene.synthesisData?.setupForNext) score += 5

    // 3. Character context and consistency (15 points)
    maxScore += 15
    if (project.phaseDeliverables?.characters?.mainCharacters) {
      const sceneCharacters = project.phaseDeliverables.characters.mainCharacters.filter(c =>
        activeScene.characters.includes(c.id)
      )
      if (sceneCharacters.length > 0) score += 10
      if (project.phaseDeliverables.characters.relationshipDynamics?.length > 0) score += 5
    }

    // 4. Story foundation and world context (15 points)
    maxScore += 15
    if (project.phaseDeliverables?.ideation?.synthesizedIdea) score += 8
    if (project.phaseDeliverables?.worldbuilding?.synthesizedIdea) score += 7

    // 5. Beat structure and scene planning (10 points)
    maxScore += 10
    if (activeScene.beats && activeScene.beats.length > 0) score += 5
    if (activeScene.synthesisData || activeScene.beatSequence) score += 5

    // 6. Voice consistency data availability (15 points)
    maxScore += 15
    const establishedVoice = analyzeEstablishedVoice()
    if (establishedVoice) {
      score += 15 // Full points if we have established voice patterns
    } else if (sceneIndex === 0) {
      score += 10 // First scene gets some credit
    }

    // Convert to percentage and ensure reasonable range
    const percentage = Math.round((score / maxScore) * 100)
    return Math.max(30, Math.min(100, percentage)) // Keep between 30-100
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
        prompt = `Write this scene as a complete, engaging prose narrative that maintains perfect continuity with the established story. Follow all structural guidelines while preserving the established voice and advancing the story arc meaningfully.

${direction ? `USER'S WRITING DIRECTION: ${direction}
↳ Apply this direction while maintaining story continuity and established voice.\n\n` : ''}

COMPREHENSIVE STORY CONTEXT:
${contextText}

WRITING REQUIREMENTS:
- Tense: ${project.settings?.tense || 'past'} tense
- Perspective: ${project.settings?.perspective || 'third person'} perspective  
- Target Length: ${currentElaboration.wordCount} words (${currentElaboration.paragraphs} paragraphs)
- Elaboration Style: ${currentElaboration.description}

CRITICAL CONTINUITY REQUIREMENTS (MUST FOLLOW):
1. VOICE CONSISTENCY: Match the established writing style exactly:
   - Maintain the same narrative voice, sentence structure, and dialogue patterns
   - Use the same tone keywords and pacing established in previous scenes
   - Preserve character voice patterns and relationship dynamics

2. STORY ARC INTEGRATION:
   - Understand your position in the chapter arc (see chapter progression above)
   - Advance the plot momentum appropriately for this story stage  
   - Maintain emotional trajectory consistency with previous scenes

3. SEAMLESS TRANSITIONS:
   - BEGIN with smooth continuation from previous scene's ending state
   - NEVER start with generic openings like "rain on windows", "morning sun", or "time passed" unless specifically relevant
   - Honor all previous scene emotional states and unresolved elements  
   - END with appropriate setup for upcoming scenes and mood shifts

4. STRUCTURAL BOUNDARIES:
   - START with specified opening line/hook (if provided)
   - END with specified closing line/transition (if provided)
   - IMPLEMENT story beats at designated positions (opening/early/middle/late/closing)
   - Follow beat placement rationales provided in context

Scene Structure Guidelines:
1. Opening (10%): DIRECT continuation from previous scene OR purposeful new beginning (NO generic weather/time transitions)
2. Early (20%): Build on opening while maintaining established voice and pacing  
3. Middle (40%): Advance main plot/character development per chapter arc stage
4. Late (20%): Scene climax/resolution that serves larger story momentum
5. Closing (10%): Setup for next scene while maintaining emotional trajectory

🚫 AVOID THESE GENERIC OPENINGS:
- Weather descriptions (rain, sun, wind) unless plot-relevant
- Time transitions ("Later that day", "The next morning") unless specified
- Generic setting descriptions that don't connect to previous scene
- Character waking up or looking out windows unless story-relevant

TONE & STYLE DIRECTIVES:
- Maintain exact consistency with established writing voice patterns
- Preserve all character voice distinctions and relationship dynamics
- Continue established emotional and plot momentum without jarring shifts
- Use the same level of sensory detail and imagery density as previous scenes

${direction ? 
`Apply the user's direction ("${direction}") while strictly maintaining all continuity requirements above.` : 
'Write the scene maintaining perfect story continuity and voice consistency.'}

Write the complete scene now:`

      } else if (writingMode === 'continue') {
        const continueElaboration = getElaborationInfo(elaborationLevel[0])
        const continueWords = Math.ceil(continueElaboration.wordCount * 0.4) // 40% of target for continuation
        
        prompt = `Continue this scene with perfect voice consistency and natural story flow. Analyze the existing content deeply to match its exact style, pacing, and character voice patterns.

${direction ? `CONTINUATION DIRECTION: ${direction}
↳ Apply while maintaining perfect consistency with existing content.\n\n` : ''}

COMPREHENSIVE STORY CONTEXT:
${contextText}

EXISTING SCENE CONTENT TO CONTINUE:
${content}

VOICE MATCHING REQUIREMENTS:
1. ANALYZE the existing content for:
   - Sentence structure patterns (length, rhythm, complexity)
   - Narrative voice intimacy/distance
   - Dialogue style and character speech patterns
   - Pacing and paragraph structure
   - Vocabulary level and tone keywords
   - Sensory detail density and imagery style

2. CONTINUE with:
   - Identical writing voice and style
   - Same character voice patterns established above
   - Natural progression of any ongoing dialogue or action
   - Consistent emotional state and story momentum
   - Same level of descriptive detail and pacing

TARGET: Continue with approximately ${continueWords} words (${continueElaboration.description})
CRITICAL: The continuation must feel like it was written by the same author in the same writing session.

Continue the scene seamlessly:`

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

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController()
      
      const provider = createAIProvider('lmstudio')
      const model = getModel('lmstudio')

      const { textStream } = streamText({
        model: provider(model),
        temperature: 0.7,
        abortSignal: abortControllerRef.current.signal,
        messages: [
          {
            role: 'system',
            content: `You are a masterful fiction writer specializing in ${project.genre} stories with exceptional expertise in maintaining story continuity and consistent voice across scenes. Your primary objectives are:

CONTINUITY MASTERY:
- Analyze the established writing voice and replicate it exactly (sentence structure, rhythm, tone, vocabulary patterns)
- Maintain seamless story flow by understanding each scene's position in the larger narrative arc
- Preserve character voice consistency and relationship dynamics established in previous scenes
- Honor emotional states and unresolved elements from previous scenes
- CRITICAL: Never start scenes with generic weather, time transitions, or disconnected new beginnings

STORY ARC INTEGRATION:
- Understand your exact position in the chapter progression (opening/development/climax)
- Advance plot momentum appropriately for the current story stage
- Maintain consistent emotional trajectory while allowing natural character development
- Balance individual scene goals with overall chapter purpose

TECHNICAL EXCELLENCE:
- Natural, character-appropriate dialogue that matches established speech patterns
- Vivid sensory details and imagery consistent with previous scene density
- Show don't tell storytelling with the same sophistication level
- STRICT adherence to provided scene boundaries (opening/closing lines)
- PRECISE implementation of story beats at designated positions (opening/early/middle/late/closing)
- SMOOTH transitions that create seamless reading experience
- AVOID generic scene openings: NO weather, time jumps, or disconnected descriptions unless plot-essential

VOICE CONSISTENCY PRIORITY:
Your #1 priority is maintaining perfect consistency with the established writing voice. Every sentence should feel like it was written by the same author who wrote previous scenes. Match:
- Narrative voice intimacy/distance
- Sentence length patterns and rhythm
- Dialogue style and character speech patterns  
- Pacing and scene structure approach
- Tone keywords and emotional vocabulary
- Level of sensory detail and imagery

You must follow ALL structural requirements while making the scene feel like a natural continuation of the established story. 

🎯 CRITICAL RULE: If there are previous scenes, BEGIN this scene by continuing directly from where the story left off. Do not start with weather, time transitions, or scene-setting unless the context explicitly requires it. The reader should feel they are continuing the same story, not starting a new one.

Write only the prose content - no explanations or meta-commentary.`
          },
          { role: 'user', content: prompt }
        ]
      })

      let accumulatedContent = ''
      try {
        for await (const chunk of textStream) {
          // Check if generation was aborted
          if (abortControllerRef.current?.signal.aborted) {
            break
          }
          accumulatedContent += chunk
          setStreamingContent(accumulatedContent)
        }
      } catch (error: any) {
        // Handle abort error
        if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
          // Keep the current streamed content
          console.log('Generation aborted, keeping current progress')
          return // Exit early without applying final content
        }
        throw error // Re-throw other errors
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
      abortControllerRef.current = null
    }
  }

  // Revise selected text with AI
  const reviseSelectedText = async () => {
    if (!selectedText || !selectionRange || !revisionDirection.trim() || isGenerating) return

    setIsGenerating(true)

    try {
      const contextText = buildWritingContext()
      
      const prompt = `Revise the selected text while maintaining perfect voice consistency and story continuity. The revision must feel seamlessly integrated with the surrounding content.

REVISION DIRECTION: ${revisionDirection}

COMPREHENSIVE STORY CONTEXT:
${contextText}

FULL SCENE CONTENT (for voice analysis):
${content}

SELECTED TEXT TO REVISE:
"${selectedText}"

VOICE CONSISTENCY REQUIREMENTS:
1. Analyze the surrounding content to understand:
   - Established narrative voice and intimacy level
   - Character speech patterns and dialogue style
   - Sentence structure and rhythm patterns
   - Vocabulary level and tone keywords
   - Pacing and descriptive detail density

2. Apply the revision direction while:
   - Maintaining identical writing voice and style
   - Preserving character voice consistency
   - Keeping the same emotional tone and momentum
   - Using similar sentence structures and vocabulary patterns
   - Maintaining consistency with the story's established voice

3. Ensure the revised text:
   - Flows seamlessly with surrounding paragraphs
   - Matches the sophistication level of adjacent content
   - Preserves any character development or plot elements
   - Maintains the same narrative perspective and tense

Provide only the revised text that integrates perfectly with the existing scene voice:`

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
      
      const prompt = `Create a new paragraph that seamlessly integrates with the existing scene while advancing the story. The paragraph must perfectly match the established voice and flow naturally between the surrounding content.

DIRECTION: ${addParagraphDirection}

COMPREHENSIVE STORY CONTEXT:
${contextText}

TEXT BEFORE CURSOR:
"${beforeCursor}"

TEXT AFTER CURSOR:
"${afterCursor}"

VOICE INTEGRATION REQUIREMENTS:
1. Analyze the surrounding text for:
   - Narrative voice patterns and intimacy level
   - Sentence structure and rhythm established
   - Character voice consistency (if dialogue involved)
   - Pacing and paragraph transition style
   - Vocabulary sophistication and tone keywords
   - Sensory detail density and imagery style

2. Create a paragraph that:
   - Matches the exact writing voice and style patterns
   - Flows naturally from the "before" text to the "after" text
   - Maintains the same emotional tone and story momentum
   - Uses consistent vocabulary level and narrative approach
   - Follows established character voice patterns (if applicable)
   - Advances the story direction while preserving continuity

3. Ensure seamless integration:
   - The paragraph should feel like it was always part of the original text
   - Maintain consistent perspective, tense, and narrative distance
   - Use similar sentence structures and rhythmic patterns
   - Preserve the established mood and pacing

Target Length: 100-200 words
Output only the paragraph content that perfectly bridges the surrounding text:`

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
              <div className="flex gap-2">
                <Button
                  onClick={generateSceneContent}
                  disabled={isGenerating}
                  className="flex-1 bg-primary hover:bg-primary/90"
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
                
                {isStreaming && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={stopGeneration}
                          variant="destructive"
                          size="default"
                          className="px-3"
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Stop generation</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
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
              {(() => {
                const continuityScore = calculateContinuityScore()
                return (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      continuityScore >= 80 ? "bg-green-500/10 text-green-600 border-green-500/20" :
                      continuityScore >= 60 ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                      "bg-red-500/10 text-red-600 border-red-500/20"
                    )}
                  >
                    Continuity: {continuityScore >= 80 ? 'Strong' : continuityScore >= 60 ? 'Good' : 'Needs Work'}
                  </Badge>
                )
              })()}
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
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <Badge variant="default" className="animate-pulse">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Writing...
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={stopGeneration}
                        variant="destructive"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <Square className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Stop generation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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