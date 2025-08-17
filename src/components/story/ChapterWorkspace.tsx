import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MonacoEditor from '@monaco-editor/react'
import { 
  BookOpen, 
  PenTool, 
  Save, 
  FileText, 
  Target,
  Users,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Edit3,
  Download,
  Camera,
  MessageSquare,
  Layout,
  Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { 
  StoryProject,
  ChapterOutline,
  SceneOutline
} from '@/lib/story-types'
import { useToast } from '@/components/ui/use-toast'
import { createFile, createFolder } from '@/lib/session'
import { useTheme } from '@/lib/theme'
import { SceneStoryboard } from './SceneStoryboard'
import { SceneChat } from './SceneChat'

interface ChapterWorkspaceProps {
  project: StoryProject
  activeChapterId: string | null
  activeSceneId: string | null
  onChapterSelect: (chapterId: string) => void
  onSceneSelect: (sceneId: string) => void
  onUpdateChapter: (chapter: ChapterOutline) => void
  onSynthesizeScene?: (scene: SceneOutline) => Promise<void>
}

export function ChapterWorkspace({
  project,
  activeChapterId,
  activeSceneId,
  onChapterSelect,
  onSceneSelect,
  onUpdateChapter,
  onSynthesizeScene
}: ChapterWorkspaceProps) {
  const { theme } = useTheme()
  const { toast } = useToast()
  const [content, setContent] = useState('')
  const [chapterNotes, setChapterNotes] = useState('')
  const [sceneNotes, setSceneNotes] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [isDirty, setIsDirty] = useState(false)
  const [activeTab, setActiveTab] = useState('storyboard')

  // Get active chapter and scene
  const activeChapter = project.outline.chapters.find(ch => ch.id === activeChapterId)
  const activeScene = activeChapter?.scenes.find(s => s.id === activeSceneId)

  // Load content when chapter/scene changes
  useEffect(() => {
    if (activeScene?.content) {
      setContent(activeScene.content)
      setSceneNotes(activeScene.summary || '')
    } else if (activeChapter) {
      // Load from file if exists
      // TODO: Load from actual file system
      setContent('')
      setChapterNotes(activeChapter.notes || '')
    }
  }, [activeChapterId, activeSceneId])

  // Calculate word count
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0).length
    setWordCount(words)
  }, [content])

  // Navigate chapters
  const navigateChapter = (direction: 'prev' | 'next') => {
    const currentIndex = project.outline.chapters.findIndex(ch => ch.id === activeChapterId)
    if (direction === 'prev' && currentIndex > 0) {
      onChapterSelect(project.outline.chapters[currentIndex - 1].id)
    } else if (direction === 'next' && currentIndex < project.outline.chapters.length - 1) {
      onChapterSelect(project.outline.chapters[currentIndex + 1].id)
    }
  }

  // Save content
  const saveContent = () => {
    if (!activeChapter) return

    if (activeScene) {
      // Update scene content
      const updatedScenes = activeChapter.scenes.map(s =>
        s.id === activeSceneId
          ? { ...s, content, wordCount, status: 'written' as const }
          : s
      )
      onUpdateChapter({
        ...activeChapter,
        scenes: updatedScenes,
        currentWordCount: updatedScenes.reduce((acc, s) => acc + (s.wordCount || 0), 0)
      })
    } else {
      // Update chapter
      onUpdateChapter({
        ...activeChapter,
        currentWordCount: wordCount,
        notes: chapterNotes,
        status: content.trim() ? 'drafting' : 'planned'
      })
    }

    setIsDirty(false)
    toast({
      title: "Content saved",
      description: `${activeScene ? 'Scene' : 'Chapter'} has been saved.`
    })
  }

  // Export chapter
  const exportChapter = () => {
    if (!activeChapter) return

    const filename = `${project.title} - ${activeChapter.title}.md`
    const fullContent = activeScene ? content : activeChapter.scenes
      .map(s => s.content || '')
      .join('\n\n---\n\n')

    const blob = new Blob([fullContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Get character list for current context
  const getCurrentCharacters = () => {
    if (activeScene) {
      return project.outline.characters?.filter(c => 
        activeScene.characters.includes(c.id)
      ) || []
    } else if (activeChapter) {
      return project.outline.characters?.filter(c => 
        activeChapter.characters.includes(c.id)
      ) || []
    }
    return []
  }

  if (!activeChapter) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Select a Chapter
            </CardTitle>
            <CardDescription>
              Choose a chapter from the outline to start writing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use the outline panel on the right to select a chapter,
              or create a new one if you haven't started yet.
            </p>
          </CardContent>
        </Card>
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
                onClick={() => navigateChapter('prev')}
                disabled={project.outline.chapters[0]?.id === activeChapterId}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateChapter('next')}
                disabled={project.outline.chapters[project.outline.chapters.length - 1]?.id === activeChapterId}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Title */}
            <div>
              <h2 className="font-semibold">
                Chapter {activeChapter.number}: {activeChapter.title}
              </h2>
              {activeScene && (
                <p className="text-sm text-muted-foreground">
                  Scene {activeScene.number}: {activeScene.title}
                </p>
              )}
            </div>

            {/* Status */}
            <Badge variant="outline" className={cn(
              activeChapter.status === 'complete' && "text-green-600 bg-green-500/10",
              activeChapter.status === 'drafting' && "text-blue-600 bg-blue-500/10"
            )}>
              {activeChapter.status}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {wordCount.toLocaleString()} words
              {activeChapter.targetWordCount && (
                <span> / {activeChapter.targetWordCount.toLocaleString()}</span>
              )}
            </div>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={saveContent}
              disabled={!isDirty}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={exportChapter}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Context Bar */}
        {activeScene && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {activeScene.setting && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{activeScene.setting}</span>
              </div>
            )}
            
            {getCurrentCharacters().length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{getCurrentCharacters().map(c => c.name).join(', ')}</span>
              </div>
            )}
            
            {activeScene.mood && (
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>{activeScene.mood}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content with Tabs */}
      <div className="flex-1 flex">
        {/* Left Panel - Storyboard/Development */}
        <div className="w-80 border-r">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="border-b px-3 py-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="storyboard" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  <span className="hidden lg:inline">Storyboard</span>
                </TabsTrigger>
                <TabsTrigger value="scene-chat" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden lg:inline">Scene Chat</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="storyboard" className="flex-1 mt-0 min-h-0 flex flex-col">
              <SceneStoryboard
                chapter={activeChapter}
                activeSceneId={activeSceneId}
                onSceneSelect={onSceneSelect}
                onUpdateChapter={onUpdateChapter}
              />
            </TabsContent>
            
            <TabsContent value="scene-chat" className="flex-1 mt-0 min-h-0 flex flex-col">
              {activeScene ? (
                <SceneChat
                  project={project}
                  scene={activeScene}
                  onUpdateScene={(updatedScene) => {
                    const updatedScenes = activeChapter.scenes.map(s =>
                      s.id === updatedScene.id ? updatedScene : s
                    )
                    onUpdateChapter({
                      ...activeChapter,
                      scenes: updatedScenes
                    })
                  }}
                  onSynthesizeScene={onSynthesizeScene}
                />
              ) : (
                <div className="h-full flex items-center justify-center p-6">
                  <Card className="text-center border-dashed">
                    <CardContent className="p-6">
                      <MessageSquare className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                      <h4 className="font-medium mb-2">Select a Scene</h4>
                      <p className="text-sm text-muted-foreground">
                        Choose a scene from the storyboard to start developing it with AI assistance
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Center - Editor */}
        <div className="flex-1 flex flex-col">
          {activeScene ? (
            <div className="flex-1 min-h-0">
              <MonacoEditor
                value={content}
                onChange={(value) => {
                  setContent(value || '')
                  setIsDirty(true)
                }}
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
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Card className="w-full max-w-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="h-5 w-5" />
                    Chapter Development
                  </CardTitle>
                  <CardDescription>
                    Plan your scenes before writing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border border-dashed rounded-lg">
                      <Camera className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <h4 className="font-medium mb-1">Storyboard</h4>
                      <p className="text-xs text-muted-foreground">
                        Create and organize scene cards
                      </p>
                    </div>
                    <div className="text-center p-4 border border-dashed rounded-lg">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <h4 className="font-medium mb-1">Scene Chat</h4>
                      <p className="text-xs text-muted-foreground">
                        Develop scenes with AI
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Start by creating scenes in the storyboard, then select one to begin writing.
                    </p>
                    <Button onClick={() => setActiveTab('storyboard')}>
                      <Camera className="h-4 w-4 mr-2" />
                      Open Storyboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Panel - Scene Details */}
        {activeScene && (
          <div className="w-80 border-l flex flex-col">
            {/* Scene Info */}
            <Card className="m-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Scene Purpose
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {activeScene.purpose || 'No purpose defined'}
                </p>
              </CardContent>
            </Card>

            {/* Scene Notes */}
            <Card className="mx-3 mb-3 flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Scene Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={sceneNotes}
                  onChange={(e) => {
                    setSceneNotes(e.target.value)
                    setIsDirty(true)
                  }}
                  placeholder="Add scene notes..."
                  className="min-h-[100px] resize-none"
                />
              </CardContent>
            </Card>

            {/* Story Beats */}
            {activeScene.beats.length > 0 && (
              <Card className="mx-3 mb-3">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    Story Beats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {activeScene.beats.map((beat, index) => (
                      <li key={beat.id} className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground">{index + 1}.</span>
                        <span>{beat.description}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Synthesis Results */}
            {activeScene.synthesisData && (
              <Card className="mx-3 mb-3">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Synthesis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">
                    {activeScene.synthesisData.sceneOverview}
                  </p>
                  {activeScene.synthesisData.recommendations.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Top Recommendations</label>
                      {activeScene.synthesisData.recommendations.slice(0, 2).map((rec, index) => (
                        <div key={index} className="text-xs p-2 bg-muted rounded">
                          <div className="font-medium">{rec.area}</div>
                          <div className="text-muted-foreground">{rec.suggestion}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}