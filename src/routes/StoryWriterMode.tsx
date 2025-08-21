import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  BookOpen, 
  FileText, 
  Users, 
  Globe, 
  Target,
  PenTool,
  Sparkles,
  ChevronRight,
  Plus,
  Settings,
  Download
} from 'lucide-react'
import { StoryChat } from '@/components/story/StoryChat'
import { StoryOutlinePanel } from '@/components/story/StoryOutlinePanel'
import { ChapterWorkspace } from '@/components/story/ChapterWorkspace'
import { SceneWriting } from '@/components/story/SceneWriting'
import { StoryProgressTracker } from '@/components/story/StoryProgressTracker'
import { StoryProjectSettings } from '@/components/story/StoryProjectSettings'
import { NewProjectDialog } from '@/components/story/NewProjectDialog'
import { StoryProjectSelection } from '@/components/story/StoryProjectSelection'
import { PhaseDeliverables } from '@/components/story/PhaseDeliverables'
import { PhaseSidebar } from '@/components/story/PhaseSidebar'
import { CompilationPhase } from '@/components/story/CompilationPhase'
import type { 
  StoryProject, 
  StoryPhase, 
  StoryWriterState,
  ChatMessage
} from '@/lib/story-types'
import { getStoryProjects, saveStoryProjects } from '@/lib/story-types'
import { generateId } from '@/lib/session'
import { cn } from '@/lib/utils'
import { streamText } from 'ai'
import { createAIProvider, getModel } from '@/lib/ai'
// Import centralized prompts
import {
  buildSynthesisPrompt,
  buildSceneSynthesisPrompt,
  buildPreviousPhaseContext,
  getSynthesisSystemMessage,
  getSynthesisTemperature,
  SCENE_SYNTHESIS_SYSTEM_MESSAGE,
  buildSceneContext
} from '@/lib/prompts'


export function StoryWriterMode() {
  const { toast } = useToast()
  
  // State management
  const [state, setState] = useState<StoryWriterState>({
    activeProject: null,
    activePhase: 'ideation',
    activeChapterId: null,
    activeSceneId: null,
    isGenerating: false,
    chatPanelOpen: true,
    outlinePanelOpen: true,
    sidebarCollapsed: false
  })
  
  const [chatPanelWidth, setChatPanelWidth] = useState(() => {
    const saved = localStorage.getItem('wordloom-chat-panel-width')
    return saved ? parseInt(saved, 10) : 30 // 30% default
  })
  
  const [projects, setProjects] = useState<StoryProject[]>([])
  const [showProjectSettings, setShowProjectSettings] = useState(false)
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [showProjectSelection, setShowProjectSelection] = useState(false)

  // Load projects from localStorage
  useEffect(() => {
    console.log('Loading projects from localStorage...')
    const manager = getStoryProjects()
    console.log('Loaded project manager:', manager)
    
    // Migrate all projects to ensure they have phaseDeliverables field
    const migratedProjects = (manager.projects || []).map(project => {
      if (!project.phaseDeliverables) {
        return { ...project, phaseDeliverables: {} }
      }
      return project
    })
    
    setProjects(migratedProjects)
    
    if (manager.activeProjectId && migratedProjects.length > 0) {
      const activeProject = migratedProjects.find(p => p.id === manager.activeProjectId)
      if (activeProject) {
        console.log('Setting active project from saved ID:', activeProject)
        setState(prev => ({ ...prev, activeProject }))
      }
    } else if (migratedProjects.length > 0) {
      // Default to first project if no active project saved
      const firstProject = migratedProjects[0]
      console.log('Setting active project to first project')
      setState(prev => ({ ...prev, activeProject: firstProject }))
      // Update the manager to remember this selection
      const updatedManager = { ...manager, activeProjectId: migratedProjects[0].id }
      saveStoryProjects(updatedManager)
    }
  }, [])

  // Save projects to localStorage
  useEffect(() => {
    if (projects.length > 0) {
      const manager = getStoryProjects()
      const updatedManager = {
        ...manager,
        projects,
        activeProjectId: state.activeProject?.id || manager.activeProjectId
      }
      saveStoryProjects(updatedManager)
    }
  }, [projects, state.activeProject])

  // Save chat panel width to localStorage
  useEffect(() => {
    localStorage.setItem('wordloom-chat-panel-width', chatPanelWidth.toString())
  }, [chatPanelWidth])

  // Create new project
  const createNewProject = (title: string, premise: string, genre: string, targetLength: string) => {
    console.log('Creating new project:', { title, premise, genre, targetLength })
    
    const newProject: StoryProject = {
      id: generateId(),
      title,
      premise,
      genre: genre as any,
      targetLength: targetLength as any,
      currentWordCount: 0,
      outline: {
        id: generateId(),
        title,
        summary: premise,
        chapters: [],
        characters: [],
        themes: []
      },
      chatHistory: [],
      settings: {
        tone: 'mixed',
        perspective: 'third-limited',
        tense: 'past',
        targetAudience: 'adult',
        themes: []
      },
      phaseDeliverables: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    console.log('New project created:', newProject)
    
    setProjects(prev => {
      const updated = [...prev, newProject]
      console.log('Updated projects list:', updated)
      return updated
    })
    
    setState(prev => {
      const updated = { ...prev, activeProject: newProject }
      console.log('Updated state:', updated)
      return updated
    })
    
    setShowNewProjectDialog(false)
    
    toast({
      title: "Story project created",
      description: `"${title}" has been created. Start by discussing your ideas!`
    })
  }

  // Update active project
  const updateActiveProject = (updates: Partial<StoryProject>) => {
    if (!state.activeProject) return

    const updatedProject = {
      ...state.activeProject,
      ...updates,
      updatedAt: Date.now()
    }

    // Debug chat history updates
    if (updates.chatHistory) {
      console.log('[StoryWriterMode] updateActiveProject - chat history update:', {
        oldHistoryLength: state.activeProject.chatHistory?.length || 0,
        newHistoryLength: updatedProject.chatHistory?.length || 0,
        lastMessage: updatedProject.chatHistory?.length > 0 ? {
          id: updatedProject.chatHistory[updatedProject.chatHistory.length - 1].id,
          phase: updatedProject.chatHistory[updatedProject.chatHistory.length - 1].phase,
          role: updatedProject.chatHistory[updatedProject.chatHistory.length - 1].role
        } : null
      })
    }

    setProjects(prev => prev.map(p => 
      p.id === updatedProject.id ? updatedProject : p
    ))
    setState(prev => ({ ...prev, activeProject: updatedProject }))
  }

  // Add chat message with functional state update to prevent race conditions
  const addChatMessage = (message: ChatMessage) => {
    if (!state.activeProject) return

    console.log('[StoryWriterMode] Adding message:', {
      messageId: message.id,
      role: message.role,
      phase: message.phase,
      hasPhaseField: message.hasOwnProperty('phase'),
      phaseType: typeof message.phase,
      content: message.content.substring(0, 50) + '...'
    })

    // Use functional state update to prevent race conditions
    setState(prevState => {
      if (!prevState.activeProject) return prevState
      
      const updatedChatHistory = [...prevState.activeProject.chatHistory, message]
      console.log('[StoryWriterMode] Updated chat history:', {
        totalMessages: updatedChatHistory.length,
        lastMessage: {
          id: updatedChatHistory[updatedChatHistory.length - 1].id,
          phase: updatedChatHistory[updatedChatHistory.length - 1].phase,
          role: updatedChatHistory[updatedChatHistory.length - 1].role
        }
      })

      const updatedProject = {
        ...prevState.activeProject,
        chatHistory: updatedChatHistory,
        updatedAt: Date.now()
      }

      // Update projects array
      const updatedProjects = projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      )
      setProjects(updatedProjects)

      return {
        ...prevState,
        activeProject: updatedProject
      }
    })
  }

  // Handle project selection
  const handleSelectProject = (project: StoryProject) => {
    // Ensure project has phaseDeliverables field (migration)
    if (!project.phaseDeliverables) {
      project.phaseDeliverables = {}
    }
    setState(prev => ({ ...prev, activeProject: project }))
    setShowProjectSelection(false)
    
    // Update the active project in storage
    const manager = getStoryProjects()
    const updatedManager = { ...manager, activeProjectId: project.id }
    saveStoryProjects(updatedManager)
    
    toast({
      title: "Project loaded",
      description: `"${project.title}" is now active`
    })
  }

  // Phase navigation
  const setPhase = (phase: StoryPhase) => {
    setState(prev => ({ ...prev, activePhase: phase }))
  }

  // Chapter/Scene selection
  const selectChapter = (chapterId: string) => {
    setState(prev => ({ ...prev, activeChapterId: chapterId, activeSceneId: null }))
  }

  const selectScene = (sceneId: string) => {
    setState(prev => ({ ...prev, activeSceneId: sceneId }))
  }

  // Scene synthesis functionality
  const synthesizeScene = async (scene: import('../lib/story-types').SceneOutline) => {
    if (!state.activeProject) return

    // Get scene-specific chat messages
    const sceneMessages = scene.chatHistory || []
    
    if (sceneMessages.filter(msg => msg.role === 'user').length < 2) {
      toast({
        title: "More discussion needed",
        description: "Have at least 2 back-and-forth exchanges about this scene before synthesizing",
        variant: "destructive"
      })
      return
    }

    // Build synthesis prompt for scene
    const conversationText = sceneMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n')

    const sceneContextText = buildSceneContext(scene, state.activeProject)
    const previousPhaseContext = buildPreviousPhaseContext(state.activeProject!, 'scene')
    const synthesisPrompt = buildSceneSynthesisPrompt(scene, conversationText, sceneContextText, previousPhaseContext)
    
    try {
      setState(prev => ({ ...prev, isGenerating: true }))
      
      const provider = createAIProvider('lmstudio')
      const model = getModel('lmstudio')
      
      const { text } = await streamText({
        model: provider(model),
        temperature: getSynthesisTemperature('scene'),
        messages: [
          { 
            role: 'system', 
            content: SCENE_SYNTHESIS_SYSTEM_MESSAGE
          },
          { role: 'user', content: synthesisPrompt }
        ]
      })
      
      // Parse scene synthesis
      const fullText = await text
      const cleanedText = fullText.replace(/```json\n?|\n?```/g, '').trim()
      const sceneSynthesis = JSON.parse(cleanedText)
      
      // Find and update the scene in the project
      const updatedChapters = state.activeProject.outline.chapters.map(chapter => {
        const updatedScenes = chapter.scenes.map(s => 
          s.id === scene.id 
            ? { ...s, synthesisData: sceneSynthesis, status: 'outlined' as const }
            : s
        )
        return { ...chapter, scenes: updatedScenes }
      })

      updateActiveProject({
        outline: {
          ...state.activeProject.outline,
          chapters: updatedChapters
        }
      })

      toast({
        title: "Scene synthesized",
        description: `Scene "${scene.title}" has been analyzed and structured`
      })

    } catch (error) {
      console.error('Scene synthesis error:', error)
      toast({
        title: "Synthesis failed",
        description: "Could not synthesize the scene discussion. Please try again.",
        variant: "destructive"
      })
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }))
    }
  }

  // Phase synthesis functionality
  const synthesizePhase = async (phase: StoryPhase) => {
    if (!state.activeProject) return

    // Get chat messages for this phase
    const phaseMessages = state.activeProject.chatHistory.filter(msg => msg.phase === phase)
    
    // Build synthesis prompt
    const conversationText = phaseMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n')

    const previousPhaseContext = buildPreviousPhaseContext(state.activeProject, phase)
    const synthesisPrompt = buildSynthesisPrompt(phase, conversationText, previousPhaseContext)
    
    try {
      setState(prev => ({ ...prev, isGenerating: true }))
      
      // Use AI SDK with streamText and JSON parsing
      const provider = createAIProvider('lmstudio')
      const model = getModel('lmstudio')
      
      const { text } = await streamText({
        model: provider(model),
        temperature: getSynthesisTemperature(phase),
        messages: [
          { 
            role: 'system', 
            content: getSynthesisSystemMessage(phase)
          },
          { role: 'user', content: synthesisPrompt }
        ]
      })
      
      // Wait for complete text and parse JSON
      const fullText = await text
      const cleanedText = fullText.replace(/```json\n?|\n?```/g, '').trim()
      const synthesizedOutput = JSON.parse(cleanedText)
      
      // Update project with synthesized output
      updateActiveProject({
        phaseDeliverables: {
          ...state.activeProject.phaseDeliverables,
          [phase]: synthesizedOutput
        }
      })

      toast({
        title: "Phase synthesized",
        description: `${getPhaseLabel(phase)} insights have been extracted from your discussion`
      })

    } catch (error) {
      console.error('Phase synthesis error:', error)
      toast({
        title: "Synthesis failed",
        description: "Could not synthesize the discussion. Please try again.",
        variant: "destructive"
      })
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }))
    }
  }


  // getSynthesisPrompt function is now imported from centralized prompts

  // buildPreviousPhaseContext function is now imported from centralized prompts

  // buildSceneContext function is now imported from centralized prompts

  // getSceneSynthesisPrompt function is now imported from centralized prompts


  const moveToNextPhase = (nextPhase: StoryPhase) => {
    setPhase(nextPhase)
    toast({
      title: "Phase changed",
      description: `Moved to ${getPhaseLabel(nextPhase)} phase`
    })
  }

  // Get phase icon
  const getPhaseIcon = (phase: StoryPhase) => {
    switch (phase) {
      case 'ideation': return <Sparkles className="h-4 w-4" />
      case 'worldbuilding': return <Globe className="h-4 w-4" />
      case 'characters': return <Users className="h-4 w-4" />
      case 'outline': return <FileText className="h-4 w-4" />
      case 'chapter': return <BookOpen className="h-4 w-4" />
      case 'scene': return <PenTool className="h-4 w-4" />
      case 'compilation': return <Download className="h-4 w-4" />
    }
  }

  // Get phase label
  const getPhaseLabel = (phase: StoryPhase) => {
    switch (phase) {
      case 'ideation': return 'Story Ideation'
      case 'worldbuilding': return 'World Building'
      case 'characters': return 'Character Development'
      case 'outline': return 'Story Outline'
      case 'chapter': return 'Chapter Writing'
      case 'scene': return 'Scene Writing'
      case 'compilation': return 'Compilation'
    }
  }

  // Render phase navigation
  const renderPhaseNav = () => {
    const phases: StoryPhase[] = ['ideation', 'worldbuilding', 'characters', 'outline', 'chapter', 'scene', 'compilation']
    
    return (
      <div className="flex items-center space-x-1 p-2 bg-muted/30 rounded-lg">
        {phases.map((phase, index) => (
          <div key={phase} className="flex items-center">
            <Button
              variant={state.activePhase === phase ? "default" : "ghost"}
              size="sm"
              onClick={() => setPhase(phase)}
              className={cn(
                "flex items-center gap-2",
                state.activePhase === phase && "shadow-glow"
              )}
            >
              {getPhaseIcon(phase)}
              <span className="hidden lg:inline">{getPhaseLabel(phase)}</span>
            </Button>
            {index < phases.length - 1 && (
              <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    )
  }

  // Show project selection if requested or no active project with existing projects
  if (showProjectSelection || (!state.activeProject && projects.length > 0)) {
    return (
      <StoryProjectSelection
        onSelectProject={handleSelectProject}
        onBack={() => setShowProjectSelection(false)}
      />
    )
  }

  // No project view
  if (!state.activeProject && projects.length === 0) {
    return (
      <>
        <div className="h-full flex items-center justify-center">
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Welcome to Story Writer Mode
              </CardTitle>
              <CardDescription>
                A guided experience for creating stories with AI assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <Sparkles className="h-8 w-8 text-yellow-500 mb-2" />
                    <h3 className="font-semibold">1. Ideation</h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Discuss your story idea with AI and refine the concept
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <FileText className="h-8 w-8 text-blue-500 mb-2" />
                    <h3 className="font-semibold">2. Outline</h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Generate a structured outline with chapters and scenes
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <PenTool className="h-8 w-8 text-green-500 mb-2" />
                    <h3 className="font-semibold">3. Write</h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Write each chapter with AI maintaining full context
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <Separator />
              
              <div className="flex justify-center">
                <Button 
                  size="lg"
                  onClick={() => {
                    console.log('Start New Story Project button clicked')
                    setShowNewProjectDialog(true)
                  }}
                  className="shadow-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Start New Story Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New Project Dialog - moved here so it's always rendered */}
        {showNewProjectDialog && (
          <NewProjectDialog
            onCreateProject={createNewProject}
            onClose={() => setShowNewProjectDialog(false)}
          />
        )}
      </>
    )
  }

  // Main story writer interface
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">{state.activeProject?.title || 'Story Writer'}</h1>
              {state.activeProject && (
                <>
                  <Badge variant="outline">{state.activeProject.genre}</Badge>
                  <Badge variant="secondary">{state.activeProject.targetLength}</Badge>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProjectSelection(true)}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Switch Project
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProjectSettings(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {/* TODO: Export story */}}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          {/* Phase Navigation */}
          {renderPhaseNav()}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Far Left Panel - Phase Progress */}
        <div className="w-72 border-r">
          <PhaseSidebar
            project={state.activeProject!}
            currentPhase={state.activePhase}
            onPhaseClick={(phase) => setPhase(phase)}
            onResynthesizePhase={synthesizePhase}
          />
        </div>

        {/* Left Panel - Chat */}
        {state.chatPanelOpen && state.activePhase !== 'chapter' && state.activePhase !== 'scene' && (
          <div 
            className="border-r flex flex-col relative"
            style={{ width: `${chatPanelWidth}%` }}
          >
            <StoryChat
              project={state.activeProject!}
              phase={state.activePhase}
              onSendMessage={addChatMessage}
              onGeneratingChange={(generating) => setState(prev => ({ ...prev, isGenerating: generating }))}
              activeChapterId={state.activeChapterId}
              activeSceneId={state.activeSceneId}
            />
            
            {/* Resize Handle */}
            <div
              className="absolute top-0 right-0 w-2 h-full cursor-col-resize bg-transparent hover:bg-primary/30 transition-colors group flex items-center justify-center"
              onMouseDown={(e) => {
                e.preventDefault()
                const startX = e.clientX
                const startWidth = chatPanelWidth
                
                const handleMouseMove = (e: MouseEvent) => {
                  const totalWidth = window.innerWidth
                  const deltaX = e.clientX - startX
                  const deltaPercent = (deltaX / totalWidth) * 100
                  const newWidth = Math.min(Math.max(startWidth + deltaPercent, 10), 50) // 10% to 50%
                  setChatPanelWidth(newWidth)
                }
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove)
                  document.removeEventListener('mouseup', handleMouseUp)
                }
                
                document.addEventListener('mousemove', handleMouseMove)
                document.addEventListener('mouseup', handleMouseUp)
              }}
            >
              {/* Visual grip indicator */}
              <div className="w-0.5 h-8 bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
            </div>
          </div>
        )}

        {/* Center - Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          {state.activePhase === 'chapter' ? (
            <ChapterWorkspace
              project={state.activeProject!}
              activeChapterId={state.activeChapterId}
              activeSceneId={state.activeSceneId}
              onChapterSelect={selectChapter}
              onSceneSelect={selectScene}
              onUpdateChapter={(chapter) => {
                if (!state.activeProject) return
                const updatedChapters = state.activeProject.outline.chapters.map(ch =>
                  ch.id === chapter.id ? chapter : ch
                )
                updateActiveProject({
                  outline: {
                    ...state.activeProject.outline,
                    chapters: updatedChapters
                  }
                })
              }}
              onSynthesizeScene={synthesizeScene}
              isGenerating={state.isGenerating}
            />
          ) : state.activePhase === 'scene' ? (
            <SceneWriting
              project={state.activeProject!}
              activeChapterId={state.activeChapterId}
              activeSceneId={state.activeSceneId}
              onChapterSelect={selectChapter}
              onSceneSelect={selectScene}
              onUpdateChapter={(chapter) => {
                if (!state.activeProject) return
                const updatedChapters = state.activeProject.outline.chapters.map(ch =>
                  ch.id === chapter.id ? chapter : ch
                )
                updateActiveProject({
                  outline: {
                    ...state.activeProject.outline,
                    chapters: updatedChapters
                  }
                })
              }}
            />
          ) : state.activePhase === 'compilation' ? (
            <CompilationPhase
              project={state.activeProject!}
              onUpdateProject={updateActiveProject}
            />
          ) : state.activePhase === 'ideation' || state.activePhase === 'worldbuilding' || state.activePhase === 'characters' || state.activePhase === 'outline' ? (
            <div className="flex-1 p-6 overflow-auto">
              <PhaseDeliverables
                project={state.activeProject!}
                currentPhase={state.activePhase}
                onSynthesizePhase={synthesizePhase}
                onMoveToNextPhase={moveToNextPhase}
              />
            </div>
          ) : (
            <div className="flex-1 p-6 overflow-auto">
              <StoryProgressTracker project={state.activeProject!} />
            </div>
          )}
        </div>

        {/* Right Panel - Outline */}
        {state.outlinePanelOpen && (
          <div className="w-80 border-l">
            <StoryOutlinePanel
              project={state.activeProject!}
              activeChapterId={state.activeChapterId}
              activeSceneId={state.activeSceneId}
              onChapterSelect={selectChapter}
              onSceneSelect={selectScene}
              onUpdateOutline={(outline) => updateActiveProject({ outline })}
            />
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showProjectSettings && state.activeProject && (
        <StoryProjectSettings
          project={state.activeProject}
          onSave={(settings) => {
            updateActiveProject({ settings })
            setShowProjectSettings(false)
          }}
          onClose={() => setShowProjectSettings(false)}
        />
      )}

      {/* New Project Dialog - for main interface when projects exist */}
      {showNewProjectDialog && (
        <NewProjectDialog
          onCreateProject={createNewProject}
          onClose={() => setShowNewProjectDialog(false)}
        />
      )}
    </div>
  )
}