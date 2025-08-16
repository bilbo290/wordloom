import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { 
  Sparkles, 
  Globe, 
  Users, 
  FileText, 
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react'
import type { 
  StoryProject, 
  StoryPhase, 
  IdeationOutput,
  WorldBuildingOutput,
  CharacterDevelopmentOutput,
  OutlineOutput
} from '../../lib/story-types'

interface PhaseDeliverablesProps {
  project: StoryProject
  currentPhase: StoryPhase
  onSynthesizePhase: (phase: StoryPhase) => void
  onMoveToNextPhase: (phase: StoryPhase) => void
}

export function PhaseDeliverables({ 
  project, 
  currentPhase, 
  onSynthesizePhase,
  onMoveToNextPhase 
}: PhaseDeliverablesProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const getPhaseIcon = (phase: StoryPhase) => {
    switch (phase) {
      case 'ideation': return <Sparkles className="h-4 w-4" />
      case 'worldbuilding': return <Globe className="h-4 w-4" />
      case 'characters': return <Users className="h-4 w-4" />
      case 'outline': return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getPhaseTitle = (phase: StoryPhase) => {
    switch (phase) {
      case 'ideation': return 'Story Foundation'
      case 'worldbuilding': return 'World & Setting'
      case 'characters': return 'Character Profiles'
      case 'outline': return 'Story Structure'
      default: return 'Phase Output'
    }
  }

  const canSynthesize = (phase: StoryPhase) => {
    // Check if there's enough chat history for this phase
    const phaseMessages = project.chatHistory.filter(msg => 
      msg.phase === phase && msg.role === 'user'
    )
    return phaseMessages.length >= 2 // Need at least 2 user messages
  }

  const hasDeliverable = (phase: StoryPhase) => {
    return project.phaseDeliverables?.[phase] !== undefined
  }

  const getNextPhase = (phase: StoryPhase): StoryPhase | null => {
    const phases: StoryPhase[] = ['ideation', 'worldbuilding', 'characters', 'outline']
    const currentIndex = phases.indexOf(phase)
    return currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null
  }

  const renderIdeationOutput = (output: IdeationOutput) => (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-sm mb-2">Core Premise</h4>
        <p className="text-sm text-muted-foreground">{output.corePremise}</p>
      </div>
      
      <div>
        <h4 className="font-semibold text-sm mb-2">Central Conflict</h4>
        <p className="text-sm text-muted-foreground">{output.centralConflict}</p>
      </div>
      
      <div>
        <h4 className="font-semibold text-sm mb-2">Key Themes</h4>
        <div className="flex flex-wrap gap-1">
          {output.themes.map((theme, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {theme}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-2">Unique Elements</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          {output.uniqueElements.map((element, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-primary">•</span>
              {element}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )

  const renderWorldBuildingOutput = (output: WorldBuildingOutput) => (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-sm mb-2">World Overview</h4>
        <p className="text-sm text-muted-foreground">{output.worldOverview}</p>
      </div>
      
      <div>
        <h4 className="font-semibold text-sm mb-2">Key Rules & Systems</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          {output.worldRules.map((rule, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-primary">•</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-2">Important Locations</h4>
        <div className="space-y-2">
          {output.keyLocations.map((location, index) => (
            <div key={index} className="p-2 bg-muted/30 rounded text-xs">
              <div className="font-medium">{location.name}</div>
              <div className="text-muted-foreground">{location.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const getCurrentPhaseOutput = () => {
    const deliverable = project.phaseDeliverables?.[currentPhase]
    if (!deliverable) return null

    switch (currentPhase) {
      case 'ideation':
        return renderIdeationOutput(deliverable as IdeationOutput)
      case 'worldbuilding':
        return renderWorldBuildingOutput(deliverable as WorldBuildingOutput)
      default:
        return <p className="text-sm text-muted-foreground">Output format not implemented yet</p>
    }
  }

  const handleSynthesize = async () => {
    setIsGenerating(true)
    try {
      await onSynthesizePhase(currentPhase)
    } finally {
      setIsGenerating(false)
    }
  }

  const nextPhase = getNextPhase(currentPhase)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getPhaseIcon(currentPhase)}
            <CardTitle className="text-lg">{getPhaseTitle(currentPhase)}</CardTitle>
          </div>
          {hasDeliverable(currentPhase) && (
            <Badge variant="default" className="bg-green-500/20 text-green-300 border-green-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          )}
        </div>
        <CardDescription>
          {hasDeliverable(currentPhase) 
            ? "Synthesized insights from your discussions"
            : "Complete your discussion, then synthesize key insights"
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {hasDeliverable(currentPhase) ? (
          <div className="flex-1 space-y-4">
            <div className="flex-1 overflow-auto">
              {getCurrentPhaseOutput()}
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Synthesized {new Date(project.phaseDeliverables?.[currentPhase]?.synthesizedAt || 0).toLocaleString()}
              </p>
              {nextPhase && (
                <Button
                  onClick={() => onMoveToNextPhase(nextPhase)}
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/80"
                >
                  Continue to {getPhaseTitle(nextPhase)}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            {canSynthesize(currentPhase) ? (
              <>
                <AlertCircle className="h-12 w-12 text-primary/50" />
                <div>
                  <h3 className="font-semibold mb-2">Ready to Synthesize</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You've had a good discussion! Let the AI analyze your conversation 
                    and extract the key story elements.
                  </p>
                  <Button 
                    onClick={handleSynthesize}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-primary to-primary/80"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Synthesizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Synthesize Discussion
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 text-muted-foreground/30" />
                <div>
                  <h3 className="font-semibold mb-2">Keep Discussing</h3>
                  <p className="text-sm text-muted-foreground">
                    Continue your conversation with the AI to develop your ideas.
                    Once you've explored the concepts, you can synthesize them into structured insights.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}