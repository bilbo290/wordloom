import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3,
  BookOpen,
  PenTool,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StoryProject, StoryProgress } from '@/lib/story-types'

interface StoryProgressTrackerProps {
  project: StoryProject
}

export function StoryProgressTracker({ project }: StoryProgressTrackerProps) {
  // Calculate progress metrics
  const calculateProgress = (): StoryProgress => {
    const totalChapters = project.outline.chapters.length
    const completedChapters = project.outline.chapters.filter(ch => ch.status === 'complete').length
    const totalScenes = project.outline.chapters.reduce((acc, ch) => acc + ch.scenes.length, 0)
    const completedScenes = project.outline.chapters.reduce(
      (acc, ch) => acc + ch.scenes.filter(s => s.status === 'revised' || s.status === 'written').length,
      0
    )
    const totalWordCount = project.currentWordCount
    const targetWordCount = project.targetWordCount || 0
    const percentComplete = targetWordCount > 0 
      ? Math.min(100, Math.round((totalWordCount / targetWordCount) * 100))
      : 0

    return {
      totalChapters,
      completedChapters,
      totalScenes,
      completedScenes,
      totalWordCount,
      targetWordCount,
      percentComplete,
      lastUpdated: project.updatedAt
    }
  }

  const progress = calculateProgress()

  // Get word count targets by story type
  const getWordCountTarget = () => {
    switch (project.targetLength) {
      case 'short': return { min: 1000, max: 7500, label: 'Short Story' }
      case 'novella': return { min: 17500, max: 40000, label: 'Novella' }
      case 'novel': return { min: 50000, max: 120000, label: 'Novel' }
      default: return { min: 0, max: 0, label: 'Unknown' }
    }
  }

  const targetRange = getWordCountTarget()

  // Calculate daily writing pace
  const calculatePace = () => {
    const daysSinceStart = Math.floor((Date.now() - project.createdAt) / (1000 * 60 * 60 * 24)) || 1
    const wordsPerDay = Math.round(progress.totalWordCount / daysSinceStart)
    const remainingWords = Math.max(0, (progress.targetWordCount || targetRange.min) - progress.totalWordCount)
    const daysToComplete = wordsPerDay > 0 ? Math.ceil(remainingWords / wordsPerDay) : 0
    
    return { wordsPerDay, daysToComplete, daysSinceStart }
  }

  const pace = calculatePace()

  return (
    <div className="space-y-6">
      {/* Story Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {project.title}
          </CardTitle>
          <CardDescription>{project.premise}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Genre</p>
              <Badge variant="outline" className="mt-1">{project.genre}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Length</p>
              <Badge variant="outline" className="mt-1">{targetRange.label}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Perspective</p>
              <Badge variant="outline" className="mt-1">{project.settings.perspective}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tense</p>
              <Badge variant="outline" className="mt-1">{project.settings.tense}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Word Count Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Word Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current</span>
                <span className="font-semibold">{progress.totalWordCount.toLocaleString()}</span>
              </div>
              {progress.targetWordCount > 0 && (
                <>
                  <Progress value={progress.percentComplete} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progress.percentComplete}%</span>
                    <span>Target: {progress.targetWordCount.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chapter Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Chapters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-semibold">
                  {progress.completedChapters} / {progress.totalChapters}
                </span>
              </div>
              <Progress 
                value={progress.totalChapters > 0 
                  ? (progress.completedChapters / progress.totalChapters) * 100 
                  : 0
                } 
                className="h-2" 
              />
              <div className="text-xs text-muted-foreground">
                {progress.totalChapters - progress.completedChapters} chapters remaining
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scene Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Scenes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-semibold">
                  {progress.completedScenes} / {progress.totalScenes}
                </span>
              </div>
              <Progress 
                value={progress.totalScenes > 0 
                  ? (progress.completedScenes / progress.totalScenes) * 100 
                  : 0
                } 
                className="h-2" 
              />
              <div className="text-xs text-muted-foreground">
                {progress.totalScenes - progress.completedScenes} scenes remaining
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Writing Pace */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Writing Pace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Average per day</p>
              <p className="text-2xl font-semibold">{pace.wordsPerDay.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">words</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Days writing</p>
              <p className="text-2xl font-semibold">{pace.daysSinceStart}</p>
              <p className="text-xs text-muted-foreground">since start</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Est. completion</p>
              <p className="text-2xl font-semibold">
                {pace.daysToComplete > 0 ? pace.daysToComplete : '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                {pace.daysToComplete > 0 ? 'days at current pace' : 'Set a target'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chapter Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Chapter Status
          </CardTitle>
          <CardDescription>
            Overview of all chapters and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {project.outline.chapters.length > 0 ? (
            <div className="space-y-3">
              {project.outline.chapters.map(chapter => (
                <div key={chapter.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {chapter.status === 'complete' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : chapter.status === 'drafting' ? (
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">
                        Chapter {chapter.number}: {chapter.title}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          chapter.status === 'complete' && "text-green-600 bg-green-500/10",
                          chapter.status === 'drafting' && "text-blue-600 bg-blue-500/10"
                        )}
                      >
                        {chapter.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{chapter.scenes.length} scenes</span>
                      <span>{chapter.currentWordCount.toLocaleString()} words</span>
                      {chapter.targetWordCount && (
                        <span>
                          ({Math.round((chapter.currentWordCount / chapter.targetWordCount) * 100)}% of target)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No chapters created yet. Start by creating your story outline.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>
          Last updated: {new Date(project.updatedAt).toLocaleDateString()} at{' '}
          {new Date(project.updatedAt).toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}