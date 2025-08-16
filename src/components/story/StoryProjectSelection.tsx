import { useState, useEffect } from 'react'
import { useToast } from '../ui/use-toast'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { BookOpen, Plus, Calendar, FileText, MoreHorizontal, Trash2, Sparkles } from 'lucide-react'
import { 
  StoryProject, 
  StoryProjectManager, 
  createEmptyStoryProject, 
  getStoryProjects, 
  saveStoryProjects, 
  deleteStoryProject 
} from '../../lib/story-types'

interface StoryProjectSelectionProps {
  onSelectProject: (project: StoryProject) => void
  onBack: () => void
}

export function StoryProjectSelection({ onSelectProject, onBack }: StoryProjectSelectionProps) {
  const { toast } = useToast()
  const [manager, setManager] = useState<StoryProjectManager>({ projects: [], activeProjectId: null })
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [newProjectForm, setNewProjectForm] = useState({
    title: '',
    premise: '',
    genre: 'other' as const,
    targetLength: 'novel' as const
  })

  useEffect(() => {
    setManager(getStoryProjects())
  }, [])

  const handleCreateProject = () => {
    if (!newProjectForm.title.trim()) return

    const newProject = createEmptyStoryProject(newProjectForm.title)
    newProject.premise = newProjectForm.premise
    newProject.genre = newProjectForm.genre
    newProject.targetLength = newProjectForm.targetLength

    const updatedManager = {
      ...manager,
      projects: [...manager.projects, newProject],
      activeProjectId: newProject.id
    }

    setManager(updatedManager)
    saveStoryProjects(updatedManager)
    setShowNewProjectDialog(false)
    setNewProjectForm({ title: '', premise: '', genre: 'other', targetLength: 'novel' })
    
    toast({
      title: "Story created",
      description: `"${newProject.title}" has been created successfully`
    })
    
    onSelectProject(newProject)
  }

  const handleDeleteProject = (projectId: string) => {
    const project = manager.projects.find(p => p.id === projectId)
    deleteStoryProject(projectId)
    setManager(getStoryProjects())
    
    toast({
      title: "Project deleted",
      description: project ? `"${project.title}" has been deleted` : "Project has been deleted"
    })
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const getGenreColor = (genre: string) => {
    const colors: Record<string, string> = {
      fantasy: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'sci-fi': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      mystery: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      romance: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      thriller: 'bg-red-500/20 text-red-300 border-red-500/30',
      literary: 'bg-green-500/20 text-green-300 border-green-500/30',
      horror: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      historical: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      other: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    }
    return colors[genre] || colors.other
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-foreground">
              ← Back to Editor
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Story Projects
              </h1>
            </div>
          </div>

          <Button 
            onClick={() => setShowNewProjectDialog(true)}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Story
          </Button>
        </div>

        {/* Projects Grid */}
        {manager.projects.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">No Stories Yet</h2>
            <p className="text-muted-foreground/70 mb-6 max-w-md mx-auto">
              Create your first story project to start writing with AI assistance. 
              Build outlines, develop characters, and craft compelling narratives.
            </p>
            <Button 
              onClick={() => setShowNewProjectDialog(true)}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Story
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {manager.projects.map((project) => (
              <Card 
                key={project.id} 
                className="glass hover:bg-accent/5 transition-all duration-200 cursor-pointer group"
                onClick={() => onSelectProject(project)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-1 truncate group-hover:text-primary transition-colors">
                        {project.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`text-xs ${getGenreColor(project.genre)}`}>
                          {project.genre}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {project.targetLength}
                        </Badge>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass">
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteProject(project.id)
                        }}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <CardDescription className="text-sm mb-4 line-clamp-3">
                    {project.premise || 'No premise set yet'}
                  </CardDescription>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(project.updatedAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {project.outline.chapters.length} chapters
                    </div>
                  </div>
                  
                  {project.currentWordCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{project.currentWordCount.toLocaleString()} words</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <div 
                          className="bg-gradient-to-r from-primary to-primary/70 h-1.5 rounded-full transition-all duration-300"
                          style={{ 
                            width: project.targetWordCount 
                              ? `${Math.min((project.currentWordCount / project.targetWordCount) * 100, 100)}%` 
                              : '0%' 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Create New Story Project
                  </CardTitle>
                  <CardDescription>
                    Start a new story project with AI-powered writing assistance
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewProjectDialog(false)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Story Title</Label>
                <Input
                  id="title"
                  value={newProjectForm.title}
                  onChange={(e) => setNewProjectForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter your story title..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="premise">Story Premise</Label>
                <Textarea
                  id="premise"
                  value={newProjectForm.premise}
                  onChange={(e) => setNewProjectForm(prev => ({ ...prev, premise: e.target.value }))}
                  placeholder="Describe your story idea in a few sentences..."
                  className="mt-1 min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Select value={newProjectForm.genre} onValueChange={(value: any) => setNewProjectForm(prev => ({ ...prev, genre: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                      <SelectItem value="sci-fi">Science Fiction</SelectItem>
                      <SelectItem value="mystery">Mystery</SelectItem>
                      <SelectItem value="romance">Romance</SelectItem>
                      <SelectItem value="thriller">Thriller</SelectItem>
                      <SelectItem value="literary">Literary Fiction</SelectItem>
                      <SelectItem value="horror">Horror</SelectItem>
                      <SelectItem value="historical">Historical</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="length">Target Length</Label>
                  <Select value={newProjectForm.targetLength} onValueChange={(value: any) => setNewProjectForm(prev => ({ ...prev, targetLength: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short Story</SelectItem>
                      <SelectItem value="novella">Novella</SelectItem>
                      <SelectItem value="novel">Novel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={!newProjectForm.title.trim()}>
                  Create Story
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}