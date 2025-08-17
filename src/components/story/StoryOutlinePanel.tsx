import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  FileText,
  BookOpen,
  PenTool,
  Users,
  Globe,
  Target,
  MoreVertical,
  GripVertical,
  Sparkles
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { generateId } from '@/lib/session'
import type { 
  StoryProject,
  StoryOutline,
  ChapterOutline,
  SceneOutline,
  CharacterProfile
} from '@/lib/story-types'

interface StoryOutlinePanelProps {
  project: StoryProject
  activeChapterId?: string | null
  activeSceneId?: string | null
  onChapterSelect: (chapterId: string) => void
  onSceneSelect: (sceneId: string) => void
  onUpdateOutline: (outline: StoryOutline) => void
}

export function StoryOutlinePanel({
  project,
  activeChapterId,
  activeSceneId,
  onChapterSelect,
  onSceneSelect,
  onUpdateOutline
}: StoryOutlinePanelProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [showCharacters, setShowCharacters] = useState(true)
  const [showWorldBuilding, setShowWorldBuilding] = useState(false)

  // Toggle chapter expansion
  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters)
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId)
    } else {
      newExpanded.add(chapterId)
    }
    setExpandedChapters(newExpanded)
  }

  // Add new chapter
  const addChapter = () => {
    const newChapter: ChapterOutline = {
      id: generateId(),
      number: project.outline.chapters.length + 1,
      title: `Chapter ${project.outline.chapters.length + 1}`,
      summary: '',
      purpose: '',
      scenes: [],
      characters: [],
      currentWordCount: 0,
      status: 'planned'
    }

    onUpdateOutline({
      ...project.outline,
      chapters: [...project.outline.chapters, newChapter]
    })
  }

  // Generate chapters from synthesized outline
  const generateChaptersFromOutline = () => {
    if (!synthesizedOutline?.chapterSummaries) return

    const newChapters: ChapterOutline[] = synthesizedOutline.chapterSummaries.map((summary, index) => ({
      id: generateId(),
      number: index + 1,
      title: `Chapter ${index + 1}`,
      summary: summary,
      purpose: '', // Could be derived from outline data
      scenes: [],
      characters: synthesizedCharacters.map(c => c.id), // Include all main characters for now
      currentWordCount: 0,
      status: 'planned' as const
    }))

    onUpdateOutline({
      ...project.outline,
      chapters: [...project.outline.chapters, ...newChapters]
    })
  }

  // Add new scene to chapter
  const addScene = (chapterId: string) => {
    const chapter = project.outline.chapters.find(ch => ch.id === chapterId)
    if (!chapter) return

    const newScene: SceneOutline = {
      id: generateId(),
      number: chapter.scenes.length + 1,
      title: `Scene ${chapter.scenes.length + 1}`,
      summary: '',
      purpose: '',
      setting: '',
      characters: [],
      beats: [],
      status: 'planned'
    }

    const updatedChapters = project.outline.chapters.map(ch =>
      ch.id === chapterId
        ? { ...ch, scenes: [...ch.scenes, newScene] }
        : ch
    )

    onUpdateOutline({
      ...project.outline,
      chapters: updatedChapters
    })
  }

  // Delete chapter
  const deleteChapter = (chapterId: string) => {
    const updatedChapters = project.outline.chapters
      .filter(ch => ch.id !== chapterId)
      .map((ch, index) => ({ ...ch, number: index + 1 }))

    onUpdateOutline({
      ...project.outline,
      chapters: updatedChapters
    })
  }

  // Delete scene
  const deleteScene = (chapterId: string, sceneId: string) => {
    const updatedChapters = project.outline.chapters.map(ch => {
      if (ch.id === chapterId) {
        const updatedScenes = ch.scenes
          .filter(s => s.id !== sceneId)
          .map((s, index) => ({ ...s, number: index + 1 }))
        return { ...ch, scenes: updatedScenes }
      }
      return ch
    })

    onUpdateOutline({
      ...project.outline,
      chapters: updatedChapters
    })
  }

  // Start editing
  const startEditing = (id: string, value: string) => {
    setEditingId(id)
    setEditingValue(value)
  }

  // Save editing
  const saveEditing = (type: 'chapter' | 'scene', chapterId?: string) => {
    if (!editingValue.trim()) {
      setEditingId(null)
      return
    }

    if (type === 'chapter') {
      const updatedChapters = project.outline.chapters.map(ch =>
        ch.id === editingId
          ? { ...ch, title: editingValue.trim() }
          : ch
      )
      onUpdateOutline({
        ...project.outline,
        chapters: updatedChapters
      })
    } else if (type === 'scene' && chapterId) {
      const updatedChapters = project.outline.chapters.map(ch => {
        if (ch.id === chapterId) {
          const updatedScenes = ch.scenes.map(s =>
            s.id === editingId
              ? { ...s, title: editingValue.trim() }
              : s
          )
          return { ...ch, scenes: updatedScenes }
        }
        return ch
      })
      onUpdateOutline({
        ...project.outline,
        chapters: updatedChapters
      })
    }

    setEditingId(null)
    setEditingValue('')
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-500/10'
      case 'drafting': return 'text-blue-600 bg-blue-500/10'
      case 'revised': return 'text-purple-600 bg-purple-500/10'
      default: return 'text-muted-foreground bg-muted/30'
    }
  }

  // Get synthesized characters from phase deliverables
  const synthesizedCharacters = project.phaseDeliverables?.characters?.mainCharacters || []
  
  // Get synthesized outline data
  const synthesizedOutline = project.phaseDeliverables?.outline
  
  // Combine existing chapters with synthesized data for display
  const displayCharacters = synthesizedCharacters.length > 0 ? synthesizedCharacters : project.outline.characters

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Story Outline</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={addChapter}
            className="h-7"
          >
            <Plus className="h-3 w-3 mr-1" />
            Chapter
          </Button>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            {project.outline.chapters.length} Chapters
          </Badge>
          <Badge variant="outline" className="text-xs">
            {project.outline.chapters.reduce((acc, ch) => acc + ch.scenes.length, 0)} Scenes
          </Badge>
        </div>
      </div>

      {/* Outline Tree */}
      <div className="flex-1 overflow-y-auto">
        {/* Characters Section */}
        <Collapsible open={showCharacters} onOpenChange={setShowCharacters}>
          <CollapsibleTrigger className="w-full px-4 py-2 flex items-center justify-between hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Characters</span>
              <Badge variant="secondary" className="text-xs">
                {displayCharacters?.length || 0}
              </Badge>
            </div>
            {showCharacters ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-2 space-y-1">
              {displayCharacters?.map(character => (
                <div
                  key={character.id}
                  className="flex items-start justify-between py-2 px-2 rounded hover:bg-accent/30 text-sm border border-transparent hover:border-accent/20"
                >
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {character.role}
                      </Badge>
                      <span className="font-medium">{character.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {character.description}
                    </p>
                    {character.motivation && (
                      <p className="text-xs text-muted-foreground/80">
                        <span className="font-medium">Goal:</span> {character.motivation}
                      </p>
                    )}
                  </div>
                </div>
              )) || (
                <p className="text-xs text-muted-foreground italic">No characters yet</p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-7 text-xs"
                onClick={() => {/* TODO: Add character */}}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Character
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Chapters */}
        <div className="py-2">
          {project.outline.chapters.length === 0 ? (
            <div className="px-4 py-8 text-center space-y-3">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No chapters yet
              </p>
              
              {synthesizedOutline?.chapterSummaries && synthesizedOutline.chapterSummaries.length > 0 ? (
                <div className="space-y-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={generateChaptersFromOutline}
                    className="bg-gradient-to-r from-primary to-primary/80"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate from Outline
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {synthesizedOutline.chapterSummaries.length} chapters from synthesis
                  </p>
                  <Separator className="my-2" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addChapter}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Manually
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addChapter}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Chapter
                </Button>
              )}
            </div>
          ) : (
            project.outline.chapters.map(chapter => (
              <div key={chapter.id} className="border-b last:border-0">
                {/* Chapter Header */}
                <div
                  className={cn(
                    "flex items-center px-4 py-2 hover:bg-accent/30 transition-colors",
                    activeChapterId === chapter.id && "bg-accent/50"
                  )}
                >
                  <button
                    onClick={() => toggleChapter(chapter.id)}
                    className="mr-2"
                  >
                    {expandedChapters.has(chapter.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  
                  <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                  
                  {editingId === chapter.id ? (
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => saveEditing('chapter')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditing('chapter')
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="h-6 text-sm flex-1"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => onChapterSelect(chapter.id)}
                      className="flex-1 text-left"
                    >
                      <span className="text-sm font-medium">
                        {chapter.title}
                      </span>
                    </button>
                  )}
                  
                  <div className="flex items-center gap-2 ml-2">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getStatusColor(chapter.status))}
                    >
                      {chapter.status}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEditing(chapter.id, chapter.title)}>
                          <Edit2 className="h-3 w-3 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addScene(chapter.id)}>
                          <Plus className="h-3 w-3 mr-2" />
                          Add Scene
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteChapter(chapter.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Chapter Scenes */}
                {expandedChapters.has(chapter.id) && (
                  <div className="pl-8 pb-1">
                    {chapter.scenes.map(scene => (
                      <div
                        key={scene.id}
                        className={cn(
                          "flex items-center px-3 py-1.5 hover:bg-accent/20 transition-colors",
                          activeSceneId === scene.id && "bg-accent/40"
                        )}
                      >
                        <PenTool className="h-3 w-3 mr-2 text-muted-foreground" />
                        
                        {editingId === scene.id ? (
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => saveEditing('scene', chapter.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing('scene', chapter.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="h-5 text-xs flex-1"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => onSceneSelect(scene.id)}
                            className="flex-1 text-left"
                          >
                            <span className="text-xs">{scene.title}</span>
                          </button>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs scale-90", getStatusColor(scene.status))}
                          >
                            {scene.status}
                          </Badge>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEditing(scene.id, scene.title)}>
                                <Edit2 className="h-3 w-3 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => deleteScene(chapter.id, scene.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                    
                    {chapter.scenes.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground italic">
                        No scenes yet
                      </p>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-6 text-xs mt-1"
                      onClick={() => addScene(chapter.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Scene
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="border-t p-3 space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Total Words:</span>
          <span className="font-medium">{project.currentWordCount.toLocaleString()}</span>
        </div>
        {project.targetWordCount && (
          <div className="flex justify-between">
            <span>Target:</span>
            <span className="font-medium">{project.targetWordCount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Progress:</span>
          <span className="font-medium">
            {project.targetWordCount 
              ? `${Math.round((project.currentWordCount / project.targetWordCount) * 100)}%`
              : 'N/A'
            }
          </span>
        </div>
      </div>
    </div>
  )
}