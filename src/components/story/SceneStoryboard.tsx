import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { 
  Plus,
  GripVertical,
  Edit3,
  Trash2,
  Camera,
  Users,
  Target,
  Zap,
  Clock,
  Heart,
  MapPin,
  Eye,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { 
  SceneOutline,
  ChapterOutline,
  SceneType,
  StoryBeat,
  EmotionalBeat
} from '@/lib/story-types'
import { generateId } from '@/lib/session'

interface SceneStoryboardProps {
  chapter: ChapterOutline
  activeSceneId: string | null
  onSceneSelect: (sceneId: string) => void
  onUpdateChapter: (chapter: ChapterOutline) => void
  onAddScene?: () => void
}

interface SceneCardProps {
  scene: SceneOutline
  isActive: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggleExpanded: () => void
  onUpdate: (scene: SceneOutline) => void
  onDelete: () => void
  onDragStart: (e: React.DragEvent, sceneId: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetSceneId: string) => void
}

function SceneCard({
  scene,
  isActive,
  isExpanded,
  onSelect,
  onToggleExpanded,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop
}: SceneCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(scene.title)
  const [editPurpose, setEditPurpose] = useState(scene.purpose)

  const getSceneTypeColor = (type?: SceneType) => {
    switch (type) {
      case 'opening': return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'climax': return 'bg-red-500/10 text-red-600 border-red-500/20'
      case 'resolution': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'cliffhanger': return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      case 'transition': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concept': return 'text-gray-600 bg-gray-500/10'
      case 'outlined': return 'text-blue-600 bg-blue-500/10'
      case 'planned': return 'text-yellow-600 bg-yellow-500/10'
      case 'written': return 'text-green-600 bg-green-500/10'
      case 'revised': return 'text-purple-600 bg-purple-500/10'
      default: return 'text-muted-foreground bg-muted'
    }
  }

  const getTensionColor = (level?: number) => {
    if (!level) return 'bg-gray-300'
    if (level <= 3) return 'bg-green-400'
    if (level <= 6) return 'bg-yellow-400'
    if (level <= 8) return 'bg-orange-400'
    return 'bg-red-400'
  }

  const saveEdits = () => {
    onUpdate({
      ...scene,
      title: editTitle,
      purpose: editPurpose
    })
    setIsEditing(false)
  }

  const cancelEdits = () => {
    setEditTitle(scene.title)
    setEditPurpose(scene.purpose)
    setIsEditing(false)
  }

  return (
    <Card
      className={cn(
        "transition-all duration-200 cursor-pointer hover:shadow-md",
        isActive && "ring-2 ring-primary shadow-lg",
        "group relative"
      )}
      draggable
      onDragStart={(e) => onDragStart(e, scene.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, scene.id)}
    >
      {/* Drag Handle */}
      <div className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      </div>

      <CardHeader className="pb-3 pl-8">
        <div className="flex items-start justify-between">
          <div className="flex-1" onClick={onSelect}>
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-sm font-semibold mb-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdits()
                  if (e.key === 'Escape') cancelEdits()
                }}
                autoFocus
              />
            ) : (
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-xs text-muted-foreground">#{scene.number}</span>
                {scene.title}
              </CardTitle>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                if (isEditing) {
                  saveEdits()
                } else {
                  setIsEditing(true)
                }
              }}
            >
              <Edit3 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpanded()
              }}
            >
              {isExpanded ? 
                <ChevronDown className="h-3 w-3" /> : 
                <ChevronRight className="h-3 w-3" />
              }
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={getStatusColor(scene.status)}>
            {scene.status}
          </Badge>
          {scene.sceneType && (
            <Badge variant="outline" className={getSceneTypeColor(scene.sceneType)}>
              {scene.sceneType}
            </Badge>
          )}
          {scene.tensionLevel && (
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1 h-3 rounded-sm",
                      i < scene.tensionLevel 
                        ? getTensionColor(scene.tensionLevel)
                        : "bg-gray-200"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
          {/* Purpose */}
          <div>
            <label className="text-xs font-medium mb-1 block">Purpose</label>
            {isEditing ? (
              <Textarea
                value={editPurpose}
                onChange={(e) => setEditPurpose(e.target.value)}
                className="text-xs resize-none"
                rows={2}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                {scene.purpose || 'No purpose defined'}
              </p>
            )}
          </div>

          {/* Context Info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {scene.setting && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span>{scene.setting}</span>
              </div>
            )}
            {scene.characters.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>{scene.characters.length} chars</span>
              </div>
            )}
            {scene.mood && (
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-muted-foreground" />
                <span>{scene.mood}</span>
              </div>
            )}
            {scene.wordCount && (
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3 text-muted-foreground" />
                <span>{scene.wordCount} words</span>
              </div>
            )}
          </div>

          {/* Story Beats */}
          {scene.beats.length > 0 && (
            <div>
              <label className="text-xs font-medium mb-2 block">Story Beats</label>
              <div className="space-y-1">
                {scene.beats.slice(0, 3).map((beat, index) => (
                  <div key={beat.id} className="text-xs text-muted-foreground flex items-start gap-1">
                    <span className="text-primary">{index + 1}.</span>
                    <span className="flex-1">{beat.description}</span>
                  </div>
                ))}
                {scene.beats.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{scene.beats.length - 3} more beats...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Synthesis Status */}
          {scene.synthesisData && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Scene synthesized</span>
            </div>
          )}

          {/* Chat History Indicator */}
          {scene.chatHistory && scene.chatHistory.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>{scene.chatHistory.length} messages</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export function SceneStoryboard({
  chapter,
  activeSceneId,
  onSceneSelect,
  onUpdateChapter,
  onAddScene
}: SceneStoryboardProps) {
  const { toast } = useToast()
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set())
  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null)

  const toggleSceneExpanded = (sceneId: string) => {
    setExpandedScenes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sceneId)) {
        newSet.delete(sceneId)
      } else {
        newSet.add(sceneId)
      }
      return newSet
    })
  }

  const updateScene = (updatedScene: SceneOutline) => {
    const updatedScenes = chapter.scenes.map(s => 
      s.id === updatedScene.id ? updatedScene : s
    )
    onUpdateChapter({
      ...chapter,
      scenes: updatedScenes
    })
  }

  const deleteScene = (sceneId: string) => {
    const updatedScenes = chapter.scenes.filter(s => s.id !== sceneId)
    // Renumber remaining scenes
    const renumberedScenes = updatedScenes.map((scene, index) => ({
      ...scene,
      number: index + 1
    }))
    
    onUpdateChapter({
      ...chapter,
      scenes: renumberedScenes
    })

    toast({
      title: "Scene deleted",
      description: "Scene has been removed from the chapter"
    })
  }

  const addNewScene = () => {
    const newScene: SceneOutline = {
      id: generateId(),
      number: chapter.scenes.length + 1,
      title: `Scene ${chapter.scenes.length + 1}`,
      summary: '',
      purpose: '',
      setting: '',
      characters: [],
      beats: [],
      status: 'concept',
      storyboardPosition: chapter.scenes.length
    }

    onUpdateChapter({
      ...chapter,
      scenes: [...chapter.scenes, newScene]
    })

    // Auto-select the new scene
    onSceneSelect(newScene.id)
  }

  const handleDragStart = (e: React.DragEvent, sceneId: string) => {
    setDraggedSceneId(sceneId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetSceneId: string) => {
    e.preventDefault()
    
    if (!draggedSceneId || draggedSceneId === targetSceneId) {
      setDraggedSceneId(null)
      return
    }

    const scenes = [...chapter.scenes]
    const draggedIndex = scenes.findIndex(s => s.id === draggedSceneId)
    const targetIndex = scenes.findIndex(s => s.id === targetSceneId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Remove dragged scene and insert at target position
    const [draggedScene] = scenes.splice(draggedIndex, 1)
    scenes.splice(targetIndex, 0, draggedScene)

    // Renumber scenes and update storyboard positions
    const reorderedScenes = scenes.map((scene, index) => ({
      ...scene,
      number: index + 1,
      storyboardPosition: index
    }))

    onUpdateChapter({
      ...chapter,
      scenes: reorderedScenes
    })

    setDraggedSceneId(null)

    toast({
      title: "Scenes reordered",
      description: "Scene order has been updated"
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-sm">Scene Storyboard</h3>
            <p className="text-xs text-muted-foreground">
              Chapter {chapter.number}: {chapter.title}
            </p>
          </div>
          <Button size="sm" onClick={addNewScene || onAddScene}>
            <Plus className="h-4 w-4 mr-2" />
            Add Scene
          </Button>
        </div>

        {/* Chapter Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Camera className="h-3 w-3" />
            <span>{chapter.scenes.length} scenes</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{chapter.currentWordCount} words</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            <span>{chapter.status}</span>
          </div>
        </div>
      </div>

      {/* Scene Cards */}
      <div className="flex-1 overflow-y-auto p-4">
        {chapter.scenes.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Camera className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <h4 className="font-medium mb-2">No scenes yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Start building your chapter by adding the first scene
            </p>
            <Button onClick={addNewScene}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Scene
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {chapter.scenes
              .sort((a, b) => (a.storyboardPosition || a.number) - (b.storyboardPosition || b.number))
              .map((scene) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  isActive={scene.id === activeSceneId}
                  isExpanded={expandedScenes.has(scene.id)}
                  onSelect={() => onSceneSelect(scene.id)}
                  onToggleExpanded={() => toggleSceneExpanded(scene.id)}
                  onUpdate={updateScene}
                  onDelete={() => deleteScene(scene.id)}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}