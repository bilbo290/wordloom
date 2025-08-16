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
import { StoryProgressTracker } from '@/components/story/StoryProgressTracker'
import { StoryProjectSettings } from '@/components/story/StoryProjectSettings'
import { NewProjectDialog } from '@/components/story/NewProjectDialog'
import { StoryProjectSelection } from '@/components/story/StoryProjectSelection'
import { PhaseDeliverables } from '@/components/story/PhaseDeliverables'
import type { 
  StoryProject, 
  StoryPhase, 
  StoryWriterState,
  ChatMessage
} from '@/lib/story-types'
import { getStoryProjects, saveStoryProjects } from '@/lib/story-types'
import { generateId } from '@/lib/session'
import { cn } from '@/lib/utils'


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

    setProjects(prev => prev.map(p => 
      p.id === updatedProject.id ? updatedProject : p
    ))
    setState(prev => ({ ...prev, activeProject: updatedProject }))
  }

  // Add chat message
  const addChatMessage = (message: ChatMessage) => {
    if (!state.activeProject) return

    updateActiveProject({
      chatHistory: [...state.activeProject.chatHistory, message]
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

  // Phase synthesis functionality
  const synthesizePhase = async (phase: StoryPhase) => {
    if (!state.activeProject) return

    // Get chat messages for this phase
    const phaseMessages = state.activeProject.chatHistory.filter(msg => msg.phase === phase)
    
    // Build synthesis prompt
    const conversationText = phaseMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n')

    const synthesisPrompt = getSynthesisPrompt(phase, conversationText)
    
    try {
      setState(prev => ({ ...prev, isGenerating: true }))
      
      // Call AI to synthesize the conversation
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a story development assistant. Analyze conversations and extract structured story elements.' },
            { role: 'user', content: synthesisPrompt }
          ],
          data: { provider: 'lmstudio', temperature: 0.3 }
        })
      })

      if (!response.ok) throw new Error('Failed to synthesize phase')
      
      const text = await response.text()
      const parsedOutput = parsePhaseOutput(phase, text)
      
      // Update project with synthesized output
      updateActiveProject({
        phaseDeliverables: {
          ...state.activeProject.phaseDeliverables,
          [phase]: parsedOutput
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

  const getSynthesisPrompt = (phase: StoryPhase, conversation: string) => {
    switch (phase) {
      case 'ideation':
        return `Analyze this story ideation conversation and extract key elements in JSON format:

CONVERSATION:
${conversation}

Please respond with a JSON object containing:
{
  "corePremise": "Main story concept in 1-2 sentences",
  "themes": ["theme1", "theme2", "theme3"],
  "keyMessages": ["message1", "message2"],
  "centralConflict": "Main conflict/tension",
  "targetAudience": "Intended readers",
  "genreConventions": ["convention1", "convention2"],
  "uniqueElements": ["unique aspect1", "unique aspect2"],
  "synthesizedAt": ${Date.now()}
}`

      case 'worldbuilding':
        return `Analyze this world building conversation and extract key elements in JSON format:

CONVERSATION:
${conversation}

Please respond with a JSON object containing:
{
  "worldOverview": "Summary of the world/setting",
  "settingDetails": ["detail1", "detail2", "detail3"],
  "worldRules": ["rule1", "rule2", "rule3"],
  "keyLocations": [{"id": "loc1", "name": "Location Name", "description": "Description", "significance": "Why it matters"}],
  "culturalElements": ["element1", "element2"],
  "historicalContext": "Relevant history/background",
  "synthesizedAt": ${Date.now()}
}`

      default:
        return `Analyze this conversation and extract key insights in JSON format.`
    }
  }

  const parsePhaseOutput = (phase: StoryPhase, text: string) => {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error('No JSON found in response')
    } catch (error) {
      console.error('Failed to parse phase output:', error)
      // Return a default structure if parsing fails
      return {
        synthesizedAt: Date.now(),
        error: 'Failed to parse AI response'
      }
    }
  }

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
      case 'revision': return <Target className="h-4 w-4" />
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
      case 'revision': return 'Revision'
    }
  }

  // Render phase navigation
  const renderPhaseNav = () => {
    const phases: StoryPhase[] = ['ideation', 'worldbuilding', 'characters', 'outline', 'chapter', 'scene', 'revision']
    
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
        {/* Left Panel - Chat */}
        {state.chatPanelOpen && (
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
          {state.activePhase === 'chapter' || state.activePhase === 'scene' ? (
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
            />
          ) : state.activePhase === 'ideation' || state.activePhase === 'worldbuilding' || state.activePhase === 'characters' ? (
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