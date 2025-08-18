import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  Download, 
  FileText, 
  Globe, 
  BookOpen,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StoryProject, ChapterOutline, SceneOutline } from '@/lib/story-types'

interface CompilationPhaseProps {
  project: StoryProject
  onUpdateProject: (project: StoryProject) => void
}

export function CompilationPhase({ project, onUpdateProject }: CompilationPhaseProps) {
  const { toast } = useToast()
  
  const [compilationTitle, setCompilationTitle] = useState(project.title)
  const [subtitle, setSubtitle] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  // Get all chapters with written scenes
  const availableChapters = project.outline.chapters.filter(chapter => 
    chapter.scenes.some(scene => scene.content && scene.content.trim().length > 0)
  )

  // Get total word count for selected chapters
  const getTotalWordCount = () => {
    const chapters = selectedChapters.length > 0 
      ? project.outline.chapters.filter(ch => selectedChapters.includes(ch.id))
      : availableChapters
    
    return chapters.reduce((total, chapter) => 
      total + chapter.scenes.reduce((chTotal, scene) => 
        chTotal + (scene.content ? scene.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0), 0
      ), 0
    )
  }

  // Generate HTML content
  const generateHTMLContent = () => {
    const chapters = selectedChapters.length > 0 
      ? project.outline.chapters.filter(ch => selectedChapters.includes(ch.id))
      : availableChapters

    const metadata = includeMetadata ? `
      <div class="metadata">
        <h1>${compilationTitle}</h1>
        ${subtitle ? `<h2 class="subtitle">${subtitle}</h2>` : ''}
        ${authorName ? `<p class="author">by ${authorName}</p>` : ''}
        <div class="stats">
          <p><strong>Chapters:</strong> ${chapters.length}</p>
          <p><strong>Scenes:</strong> ${chapters.reduce((total, ch) => total + ch.scenes.filter(s => s.content).length, 0)}</p>
          <p><strong>Word Count:</strong> ~${getTotalWordCount().toLocaleString()}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <hr />
      </div>
    ` : ''

    const chapterContent = chapters.map(chapter => {
      const writtenScenes = chapter.scenes.filter(scene => scene.content && scene.content.trim().length > 0)
      
      if (writtenScenes.length === 0) return ''

      const sceneContent = writtenScenes.map(scene => `
        <div class="scene">
          <h3 class="scene-title">Scene ${scene.number}: ${scene.title}</h3>
          <div class="scene-content">
            ${scene.content!.split('\n\n').map(paragraph => 
              `<p>${paragraph.trim()}</p>`
            ).join('\n            ')}
          </div>
        </div>
      `).join('\n      ')

      return `
    <div class="chapter">
      <h2 class="chapter-title">Chapter ${chapter.number}: ${chapter.title}</h2>
      <div class="chapter-summary">
        <em>${chapter.summary || chapter.purpose}</em>
      </div>
      ${sceneContent}
    </div>`
    }).join('\n    ')

    const css = `
      <style>
        body {
          font-family: Georgia, serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          color: #333;
          background: #fff;
        }
        
        .metadata {
          text-align: center;
          margin-bottom: 60px;
          padding-bottom: 40px;
          border-bottom: 2px solid #eee;
        }
        
        .metadata h1 {
          font-size: 2.5em;
          margin-bottom: 10px;
          color: #2c3e50;
        }
        
        .subtitle {
          font-size: 1.3em;
          color: #7f8c8d;
          font-style: italic;
          margin-bottom: 20px;
        }
        
        .author {
          font-size: 1.1em;
          margin-bottom: 30px;
          color: #34495e;
        }
        
        .stats {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .stats p {
          margin: 5px 0;
          font-size: 0.9em;
        }
        
        .chapter {
          margin-bottom: 60px;
          page-break-before: always;
        }
        
        .chapter-title {
          font-size: 2em;
          margin-bottom: 20px;
          color: #2c3e50;
          border-bottom: 1px solid #bdc3c7;
          padding-bottom: 10px;
        }
        
        .chapter-summary {
          margin-bottom: 30px;
          padding: 15px;
          background: #ecf0f1;
          border-radius: 5px;
          font-size: 0.95em;
        }
        
        .scene {
          margin-bottom: 40px;
        }
        
        .scene-title {
          font-size: 1.2em;
          margin-bottom: 15px;
          color: #34495e;
          font-weight: normal;
          font-style: italic;
        }
        
        .scene-content p {
          margin-bottom: 15px;
          text-indent: 1.5em;
          text-align: justify;
        }
        
        .scene-content p:first-child {
          text-indent: 0;
        }
        
        hr {
          border: none;
          border-top: 1px solid #bdc3c7;
          margin: 40px 0;
        }
        
        @media print {
          body { padding: 20px; }
          .chapter { page-break-before: always; }
          .scene { page-break-inside: avoid; }
        }
      </style>
    `

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${compilationTitle}</title>
  ${css}
</head>
<body>
  ${metadata}
  ${chapterContent}
  
  <footer style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 0.8em; color: #7f8c8d;">
    <p>Generated with Wordloom Story Writer • ${new Date().toLocaleDateString()}</p>
  </footer>
</body>
</html>`
  }

  // Export as HTML
  const exportAsHTML = () => {
    setIsExporting(true)
    
    try {
      const htmlContent = generateHTMLContent()
      const filename = `${compilationTitle.replace(/[^a-zA-Z0-9\s-]/g, '')}.html`
      
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Story exported!",
        description: `"${compilationTitle}" has been exported as ${filename}`
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export the story. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3 mb-4">
          <Download className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Story Compilation</h2>
            <p className="text-sm text-muted-foreground">
              Combine your written scenes into a complete story and export as HTML
            </p>
          </div>
        </div>

        {availableChapters.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">No content ready for compilation</p>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Write some scenes first using the Scene Writing phase, then return here to compile your story.
            </p>
          </div>
        )}
      </div>

      {availableChapters.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Export Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Export Settings
                </CardTitle>
                <CardDescription>
                  Configure how your story will be compiled and exported
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={compilationTitle}
                      onChange={(e) => setCompilationTitle(e.target.value)}
                      placeholder="Story title"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Subtitle (Optional)</label>
                    <Input
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="A captivating story..."
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Author</label>
                  <Input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="include-metadata"
                    checked={includeMetadata}
                    onChange={(e) => setIncludeMetadata(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="include-metadata" className="text-sm">
                    Include title page and metadata
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Chapter Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Chapter Selection
                </CardTitle>
                <CardDescription>
                  Choose which chapters to include in your compilation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded">
                    <input
                      type="checkbox"
                      id="all-chapters"
                      checked={selectedChapters.length === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedChapters([])
                        }
                      }}
                      className="rounded"
                    />
                    <label htmlFor="all-chapters" className="text-sm font-medium">
                      All Available Chapters ({availableChapters.length})
                    </label>
                  </div>

                  {availableChapters.map(chapter => {
                    const writtenScenes = chapter.scenes.filter(s => s.content && s.content.trim().length > 0)
                    const chapterWordCount = writtenScenes.reduce((total, scene) => 
                      total + (scene.content ? scene.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0), 0
                    )

                    return (
                      <div key={chapter.id} className="flex items-start gap-3 p-3 border rounded">
                        <input
                          type="checkbox"
                          id={`chapter-${chapter.id}`}
                          checked={selectedChapters.includes(chapter.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChapters(prev => [...prev, chapter.id])
                            } else {
                              setSelectedChapters(prev => prev.filter(id => id !== chapter.id))
                            }
                          }}
                          className="rounded mt-1"
                        />
                        <div className="flex-1">
                          <label htmlFor={`chapter-${chapter.id}`} className="font-medium cursor-pointer">
                            Chapter {chapter.number}: {chapter.title}
                          </label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {writtenScenes.length} scenes • {chapterWordCount.toLocaleString()} words
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {writtenScenes.map(scene => (
                              <Badge key={scene.id} variant="outline" className="text-xs">
                                {scene.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Export Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Export Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-muted rounded">
                    <div className="text-lg font-bold text-primary">{getTotalWordCount().toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Words</div>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <div className="text-lg font-bold text-primary">
                      {(selectedChapters.length > 0 ? selectedChapters.length : availableChapters.length)}
                    </div>
                    <div className="text-xs text-muted-foreground">Chapters</div>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <div className="text-lg font-bold text-primary">
                      {(selectedChapters.length > 0 
                        ? project.outline.chapters.filter(ch => selectedChapters.includes(ch.id))
                        : availableChapters
                      ).reduce((total, ch) => total + ch.scenes.filter(s => s.content).length, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Scenes</div>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <div className="text-lg font-bold text-primary">HTML</div>
                    <div className="text-xs text-muted-foreground">Format</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Actions */}
            <div className="flex items-center justify-center gap-4 py-6">
              <Button
                onClick={exportAsHTML}
                disabled={isExporting || availableChapters.length === 0}
                size="lg"
                className="bg-primary hover:bg-primary/90"
              >
                {isExporting ? (
                  <>
                    <Globe className="h-5 w-5 mr-2 animate-spin" />
                    Exporting Story...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Export as HTML
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}