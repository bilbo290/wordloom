import { useState, useMemo, useEffect } from 'react'
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

  // Memoized synthesis check to ensure reactivity
  const canSynthesizeCurrentPhase = useMemo(() => {
    // Ensure we have the most recent chat history
    const chatHistory = project.chatHistory || []
    const phaseMessages = chatHistory.filter(msg => 
      msg.phase === currentPhase && msg.role === 'user'
    )
    const result = phaseMessages.length >= 2
    console.log(`[PhaseDeliverables] canSynthesize check for ${currentPhase}:`, {
      phaseMessages: phaseMessages.length,
      result,
      chatHistoryLength: chatHistory.length,
      allMessagePhases: chatHistory.map(msg => `${msg.role}:${msg.phase || 'NO_PHASE'}`),
      userMessagesForCurrentPhase: phaseMessages.length,
      currentPhase,
      projectId: project.id
    })
    return result
  }, [project.chatHistory, project.id, currentPhase])

  // Debug effect to track when project changes
  useEffect(() => {
    console.log(`[PhaseDeliverables] Project updated:`, {
      chatHistoryLength: project.chatHistory.length,
      currentPhase,
      canSynthesize: canSynthesizeCurrentPhase
    })
  }, [project.chatHistory, currentPhase, canSynthesizeCurrentPhase])

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


  const hasDeliverable = (phase: StoryPhase) => {
    return project.phaseDeliverables?.[phase] !== undefined
  }

  const getNextPhase = (phase: StoryPhase): StoryPhase | null => {
    const phases: StoryPhase[] = ['ideation', 'worldbuilding', 'characters', 'outline']
    const currentIndex = phases.indexOf(phase)
    return currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null
  }

  const renderIdeationOutput = (output: IdeationOutput) => (
    <div className="space-y-6">
      {/* Synthesized Ideas */}
      <div className="space-y-4">
        <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Synthesized Story Elements
        </h4>
        
        <div>
          <h5 className="font-semibold text-sm mb-2">Core Premise</h5>
          <p className="text-sm text-muted-foreground">{output.synthesizedIdea.corePremise}</p>
        </div>
        
        <div>
          <h5 className="font-semibold text-sm mb-2">Central Conflict</h5>
          <p className="text-sm text-muted-foreground">{output.synthesizedIdea.centralConflict}</p>
        </div>
        
        <div>
          <h5 className="font-semibold text-sm mb-2">Key Themes</h5>
          <div className="flex flex-wrap gap-1">
            {output.synthesizedIdea.themes.map((theme, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {theme}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h5 className="font-semibold text-sm mb-2">Unique Elements</h5>
          <ul className="text-sm text-muted-foreground space-y-1">
            {output.synthesizedIdea.uniqueElements.map((element, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {element}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Development Recommendations
        </h4>
        
        <div className="space-y-2">
          {output.recommendations.map((rec, index) => (
            <div key={index} className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-sm">{rec.area}</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {rec.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Score: {rec.score}/10
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{rec.suggestion}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderCharacterOutput = (output: CharacterDevelopmentOutput) => (
    <div className="space-y-6">
      {/* Main Characters */}
      <div className="space-y-4">
        <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Main Characters
        </h4>
        
        <div className="space-y-3">
          {output.mainCharacters.map((character, index) => (
            <div key={index} className="p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h5 className="font-semibold text-sm">{character.name}</h5>
                  <Badge variant="outline" className="text-xs mt-1">
                    {character.role}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{character.description}</p>
              {character.motivation && (
                <div className="text-sm">
                  <span className="font-medium">Motivation:</span> {character.motivation}
                </div>
              )}
              {character.arc && (
                <div className="text-sm">
                  <span className="font-medium">Arc:</span> {character.arc}
                </div>
              )}
              {character.traits.length > 0 && (
                <div className="mt-2">
                  <span className="font-medium text-sm">Traits:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {character.traits.map((trait, traitIndex) => (
                      <Badge key={traitIndex} variant="secondary" className="text-xs">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Relationship Dynamics */}
      {output.relationshipDynamics.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-base mb-3">Relationship Dynamics</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            {output.relationshipDynamics.map((dynamic, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {dynamic}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Character Arcs */}
      {output.characterArcs.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-base mb-3">Character Development Arcs</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            {output.characterArcs.map((arc, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {arc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {output.recommendations && output.recommendations.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Development Recommendations
          </h4>
          
          <div className="space-y-2">
            {output.recommendations.map((rec, index) => (
              <div key={index} className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-sm">{rec.area}</span>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {rec.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Score: {rec.score}/10
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{rec.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderWorldBuildingOutput = (output: WorldBuildingOutput) => (
    <div className="space-y-6">
      {/* Synthesized World */}
      <div className="space-y-4">
        <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Synthesized World Elements
        </h4>
        
        <div>
          <h5 className="font-semibold text-sm mb-2">World Overview</h5>
          <p className="text-sm text-muted-foreground">{output.synthesizedIdea.worldOverview}</p>
        </div>
        
        <div>
          <h5 className="font-semibold text-sm mb-2">Key Rules & Systems</h5>
          <ul className="text-sm text-muted-foreground space-y-1">
            {output.synthesizedIdea.worldRules.map((rule, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="font-semibold text-sm mb-2">Important Locations</h5>
          <div className="space-y-2">
            {output.synthesizedIdea.keyLocations.map((location, index) => (
              <div key={index} className="p-2 bg-muted/30 rounded text-xs">
                <div className="font-medium">{location.name}</div>
                <div className="text-muted-foreground">{location.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Development Recommendations
        </h4>
        
        <div className="space-y-2">
          {output.recommendations.map((rec, index) => (
            <div key={index} className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-sm">{rec.area}</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {rec.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Score: {rec.score}/10
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{rec.suggestion}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderOutlineOutput = (output: OutlineOutput) => (
    <div className="space-y-6">
      {/* Plot Structure */}
      <div className="space-y-4">
        <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Plot Structure
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-semibold text-sm mb-2">Exposition</h5>
            <p className="text-sm text-muted-foreground">{output.plotStructure.exposition}</p>
          </div>
          
          <div>
            <h5 className="font-semibold text-sm mb-2">Inciting Incident</h5>
            <p className="text-sm text-muted-foreground">{output.plotStructure.incitingIncident}</p>
          </div>
          
          <div>
            <h5 className="font-semibold text-sm mb-2">Climax</h5>
            <p className="text-sm text-muted-foreground">{output.plotStructure.climax}</p>
          </div>
          
          <div>
            <h5 className="font-semibold text-sm mb-2">Resolution</h5>
            <p className="text-sm text-muted-foreground">{output.plotStructure.resolution}</p>
          </div>
        </div>

        <div>
          <h5 className="font-semibold text-sm mb-2">Rising Action</h5>
          <ul className="text-sm text-muted-foreground space-y-1">
            {output.plotStructure.risingAction?.map((action, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {action}
              </li>
            ))}
          </ul>
        </div>

        {output.plotStructure.fallingAction && output.plotStructure.fallingAction.length > 0 && (
          <div>
            <h5 className="font-semibold text-sm mb-2">Falling Action</h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              {output.plotStructure.fallingAction.map((action, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Chapter Summaries */}
      {output.chapterSummaries.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-base mb-3">Chapter Summaries</h4>
          <div className="space-y-2">
            {output.chapterSummaries.map((summary, index) => (
              <div key={index} className="p-3 bg-muted/30 rounded-lg border">
                <div className="font-medium text-sm mb-1">Chapter {index + 1}</div>
                <div className="text-sm text-muted-foreground">{summary}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Plot Points */}
      {output.keyPlotPoints.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-base mb-3">Key Plot Points</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            {output.keyPlotPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pacing Notes */}
      {output.pacingNotes.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-base mb-3">Pacing Notes</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            {output.pacingNotes.map((note, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {output.recommendations && output.recommendations.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Development Recommendations
          </h4>
          
          <div className="space-y-2">
            {output.recommendations.map((rec, index) => (
              <div key={index} className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-sm">{rec.area}</span>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {rec.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Score: {rec.score}/10
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{rec.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
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
      case 'characters':
        return renderCharacterOutput(deliverable as CharacterDevelopmentOutput)
      case 'outline':
        return renderOutlineOutput(deliverable as OutlineOutput)
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
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  Synthesized {new Date(project.phaseDeliverables?.[currentPhase]?.synthesizedAt || 0).toLocaleString()}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSynthesize}
                  disabled={isGenerating}
                  className="text-xs h-6 px-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1" />
                      Re-synthesizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Re-synthesize
                    </>
                  )}
                </Button>
              </div>
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
            {canSynthesizeCurrentPhase ? (
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