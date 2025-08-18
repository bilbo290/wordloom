import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  Target,
  Zap,
  ChevronRight,
  ChevronLeft,
  Save,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SceneOutline, BeatSequence } from '@/lib/story-types'

interface ScenePlannerProps {
  scene: SceneOutline
  onUpdateScene: (scene: SceneOutline) => void
  onClose?: () => void
}

export function ScenePlanner({ scene, onUpdateScene, onClose }: ScenePlannerProps) {
  const { toast } = useToast()
  
  const [openingLine, setOpeningLine] = useState(scene.openingLine || scene.synthesisData?.suggestedOpening || '')
  const [closingLine, setClosingLine] = useState(scene.closingLine || scene.synthesisData?.suggestedClosing || '')
  const [previousConnection, setPreviousConnection] = useState(scene.previousSceneConnection || scene.synthesisData?.transitionFromPrevious || '')
  const [nextSetup, setNextSetup] = useState(scene.nextSceneSetup || scene.synthesisData?.setupForNext || '')
  const [beatSequences, setBeatSequences] = useState<BeatSequence[]>(
    scene.beatSequence || scene.beats.map(beat => ({
      beatId: beat.id,
      position: 'middle' as const,
      mustInclude: [],
      targetWordCount: 200
    }))
  )

  const saveScenePlan = () => {
    const updatedScene: SceneOutline = {
      ...scene,
      openingLine: openingLine.trim() || undefined,
      closingLine: closingLine.trim() || undefined,
      previousSceneConnection: previousConnection.trim() || undefined,
      nextSceneSetup: nextSetup.trim() || undefined,
      beatSequence: beatSequences.filter(bs => bs.mustInclude.length > 0 || bs.targetWordCount)
    }

    onUpdateScene(updatedScene)
    
    toast({
      title: "Scene plan saved",
      description: `Boundaries and beat placement for "${scene.title}" have been updated.`
    })

    if (onClose) onClose()
  }

  const updateBeatSequence = (beatId: string, updates: Partial<BeatSequence>) => {
    setBeatSequences(prev => prev.map(bs => 
      bs.beatId === beatId ? { ...bs, ...updates } : bs
    ))
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'opening': return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'early': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'middle': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      case 'late': return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
      case 'closing': return 'bg-red-500/10 text-red-600 border-red-500/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Scene Structure Planner
          </CardTitle>
          <CardDescription>
            Define scene boundaries and beat placement for "{scene.title}"
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Scene Boundaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <ChevronRight className="h-4 w-4 text-green-600" />
                Opening Line/Hook
              </label>
              <Textarea
                value={openingLine}
                onChange={(e) => setOpeningLine(e.target.value)}
                placeholder="How should this scene begin? (First line or opening paragraph)"
                className="min-h-[80px]"
              />
              {scene.synthesisData?.suggestedOpening && (
                <p className="text-xs text-muted-foreground mt-1">
                  AI Suggestion: {scene.synthesisData.suggestedOpening}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <ChevronLeft className="h-4 w-4 text-red-600" />
                Closing Line/Transition
              </label>
              <Textarea
                value={closingLine}
                onChange={(e) => setClosingLine(e.target.value)}
                placeholder="How should this scene end? (Final line or closing paragraph)"
                className="min-h-[80px]"
              />
              {scene.synthesisData?.suggestedClosing && (
                <p className="text-xs text-muted-foreground mt-1">
                  AI Suggestion: {scene.synthesisData.suggestedClosing}
                </p>
              )}
            </div>
          </div>

          {/* Scene Connections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Connection from Previous Scene
              </label>
              <Textarea
                value={previousConnection}
                onChange={(e) => setPreviousConnection(e.target.value)}
                placeholder="How does this scene connect to the previous one?"
                className="min-h-[60px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Setup for Next Scene
              </label>
              <Textarea
                value={nextSetup}
                onChange={(e) => setNextSetup(e.target.value)}
                placeholder="What should this scene establish for the next one?"
                className="min-h-[60px]"
              />
            </div>
          </div>

          {/* Beat Placement */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Story Beat Placement
            </h3>
            
            <div className="space-y-4">
              {scene.beats.map(beat => {
                const sequence = beatSequences.find(bs => bs.beatId === beat.id)
                const aiPlacement = scene.synthesisData?.beatPlacement?.find(bp => bp.beatId === beat.id)
                
                return (
                  <Card key={beat.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium">{beat.description}</h4>
                        <p className="text-sm text-muted-foreground">
                          Type: {beat.type} • Impact: {beat.impact}
                        </p>
                        {aiPlacement && (
                          <p className="text-xs text-muted-foreground mt-1">
                            AI Suggests: {aiPlacement.suggestedPosition} - {aiPlacement.rationale}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Select 
                          value={sequence?.position || 'middle'}
                          onValueChange={(value: any) => updateBeatSequence(beat.id, { position: value })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="opening">Opening</SelectItem>
                            <SelectItem value="early">Early</SelectItem>
                            <SelectItem value="middle">Middle</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="closing">Closing</SelectItem>
                          </SelectContent>
                        </Select>

                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getPositionColor(sequence?.position || 'middle'))}
                        >
                          {sequence?.position || 'middle'}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="text-xs text-muted-foreground">Must Include Elements</label>
                      <Input
                        value={sequence?.mustInclude.join(', ') || ''}
                        onChange={(e) => updateBeatSequence(beat.id, { 
                          mustInclude: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                        placeholder="Specific dialogue, actions, or details that must appear..."
                        className="mt-1"
                      />
                    </div>
                  </Card>
                )
              })}

              {scene.beats.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No story beats defined for this scene. Add beats in the scene storyboard first.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button onClick={saveScenePlan} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Scene Plan
            </Button>
            
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}