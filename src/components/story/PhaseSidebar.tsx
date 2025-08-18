import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { ScrollArea } from '../ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { 
  Sparkles, 
  Globe, 
  Users, 
  FileText, 
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Download,
  Clock
} from 'lucide-react'
import type { 
  StoryProject, 
  StoryPhase, 
  IdeationOutput,
  WorldBuildingOutput,
  CharacterDevelopmentOutput,
  OutlineOutput
} from '../../lib/story-types'

interface PhaseSidebarProps {
  project: StoryProject
  currentPhase: StoryPhase
  onPhaseClick?: (phase: StoryPhase) => void
  onResynthesizePhase?: (phase: StoryPhase) => void
}

export function PhaseSidebar({ project, currentPhase, onPhaseClick, onResynthesizePhase }: PhaseSidebarProps) {
  const [openSections, setOpenSections] = useState<Record<StoryPhase, boolean>>({
    ideation: true,
    worldbuilding: true,
    characters: true,
    outline: true,
    chapter: false,
    scene: false,
    compilation: false
  })

  const getPhaseIcon = (phase: StoryPhase) => {
    switch (phase) {
      case 'ideation': return <Sparkles className="h-4 w-4" />
      case 'worldbuilding': return <Globe className="h-4 w-4" />
      case 'characters': return <Users className="h-4 w-4" />
      case 'outline': return <FileText className="h-4 w-4" />
      case 'compilation': return <Download className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getPhaseTitle = (phase: StoryPhase) => {
    switch (phase) {
      case 'ideation': return 'Story Foundation'
      case 'worldbuilding': return 'World Building'
      case 'characters': return 'Character Development'
      case 'outline': return 'Story Outline'
      case 'compilation': return 'Compilation & Export'
      default: return 'Phase'
    }
  }

  const getPhaseStatus = (phase: StoryPhase): 'complete' | 'current' | 'upcoming' => {
    if (project.phaseDeliverables?.[phase]) return 'complete'
    if (phase === currentPhase) return 'current'
    return 'upcoming'
  }

  const toggleSection = (phase: StoryPhase) => {
    setOpenSections(prev => ({
      ...prev,
      [phase]: !prev[phase]
    }))
  }

  const renderIdeationSummary = (output: IdeationOutput) => (
    <div className="space-y-3 text-xs">
      <div>
        <div className="font-medium text-muted-foreground mb-1">Core Premise</div>
        <div className="text-foreground leading-relaxed">{output.synthesizedIdea.corePremise}</div>
      </div>
      
      <div>
        <div className="font-medium text-muted-foreground mb-1">Themes</div>
        <div className="flex flex-wrap gap-1">
          {output.synthesizedIdea.themes.slice(0, 3).map((theme, index) => (
            <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
              {theme}
            </Badge>
          ))}
          {output.synthesizedIdea.themes.length > 3 && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              +{output.synthesizedIdea.themes.length - 3}
            </Badge>
          )}
        </div>
      </div>

      <div>
        <div className="font-medium text-muted-foreground mb-1">Central Conflict</div>
        <div className="text-foreground leading-relaxed">{output.synthesizedIdea.centralConflict}</div>
      </div>

      {output.recommendations.length > 0 && (
        <div>
          <div className="font-medium text-muted-foreground mb-1">Top Recommendation</div>
          <div className="p-2 bg-muted/50 rounded border">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{output.recommendations[0].area}</span>
              <Badge variant={output.recommendations[0].priority === 'high' ? 'destructive' : 'secondary'} className="text-xs px-1 py-0">
                {output.recommendations[0].priority}
              </Badge>
            </div>
            <div className="text-muted-foreground">{output.recommendations[0].suggestion}</div>
          </div>
        </div>
      )}
    </div>
  )

  const renderCharacterSummary = (output: CharacterDevelopmentOutput) => (
    <div className="space-y-3 text-xs">
      <div>
        <div className="font-medium text-muted-foreground mb-1">Main Characters</div>
        <div className="space-y-1">
          {output.mainCharacters.slice(0, 3).map((character, index) => (
            <div key={index} className="p-1 bg-muted/30 rounded">
              <div className="font-medium">{character.name}</div>
              <div className="text-muted-foreground text-xs">{character.role} - {character.description}</div>
            </div>
          ))}
          {output.mainCharacters.length > 3 && (
            <div className="text-muted-foreground">
              +{output.mainCharacters.length - 3} more characters
            </div>
          )}
        </div>
      </div>
      
      <div>
        <div className="font-medium text-muted-foreground mb-1">Key Dynamics</div>
        <ul className="text-foreground space-y-1">
          {output.relationshipDynamics.slice(0, 2).map((dynamic, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-primary">•</span>
              {dynamic}
            </li>
          ))}
        </ul>
      </div>

      {output.recommendations && output.recommendations.length > 0 && (
        <div>
          <div className="font-medium text-muted-foreground mb-1">Top Recommendation</div>
          <div className="p-2 bg-muted/50 rounded border">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{output.recommendations[0].area}</span>
              <Badge variant={output.recommendations[0].priority === 'high' ? 'destructive' : 'secondary'} className="text-xs px-1 py-0">
                {output.recommendations[0].priority}
              </Badge>
            </div>
            <div className="text-muted-foreground">{output.recommendations[0].suggestion}</div>
          </div>
        </div>
      )}
    </div>
  )

  const renderWorldBuildingSummary = (output: WorldBuildingOutput) => (
    <div className="space-y-3 text-xs">
      <div>
        <div className="font-medium text-muted-foreground mb-1">World Overview</div>
        <div className="text-foreground leading-relaxed">{output.synthesizedIdea.worldOverview}</div>
      </div>
      
      <div>
        <div className="font-medium text-muted-foreground mb-1">Key Locations</div>
        <div className="space-y-1">
          {output.synthesizedIdea.keyLocations.slice(0, 2).map((location, index) => (
            <div key={index} className="p-1 bg-muted/30 rounded">
              <div className="font-medium">{location.name}</div>
              <div className="text-muted-foreground text-xs">{location.description}</div>
            </div>
          ))}
          {output.synthesizedIdea.keyLocations.length > 2 && (
            <div className="text-muted-foreground">
              +{output.synthesizedIdea.keyLocations.length - 2} more locations
            </div>
          )}
        </div>
      </div>

      {output.recommendations.length > 0 && (
        <div>
          <div className="font-medium text-muted-foreground mb-1">Top Recommendation</div>
          <div className="p-2 bg-muted/50 rounded border">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{output.recommendations[0].area}</span>
              <Badge variant={output.recommendations[0].priority === 'high' ? 'destructive' : 'secondary'} className="text-xs px-1 py-0">
                {output.recommendations[0].priority}
              </Badge>
            </div>
            <div className="text-muted-foreground">{output.recommendations[0].suggestion}</div>
          </div>
        </div>
      )}
    </div>
  )

  const renderOutlineSummary = (output: OutlineOutput) => (
    <div className="space-y-3 text-xs">
      <div>
        <div className="font-medium text-muted-foreground mb-1">Plot Structure</div>
        <div className="space-y-1">
          <div className="p-1 bg-muted/30 rounded">
            <div className="font-medium">Inciting Incident</div>
            <div className="text-muted-foreground text-xs">{output.plotStructure.incitingIncident}</div>
          </div>
          <div className="p-1 bg-muted/30 rounded">
            <div className="font-medium">Climax</div>
            <div className="text-muted-foreground text-xs">{output.plotStructure.climax}</div>
          </div>
        </div>
      </div>
      
      {output.chapterSummaries.length > 0 && (
        <div>
          <div className="font-medium text-muted-foreground mb-1">Chapters</div>
          <div className="text-foreground">
            {output.chapterSummaries.length} chapters planned
          </div>
        </div>
      )}

      {output.keyPlotPoints.length > 0 && (
        <div>
          <div className="font-medium text-muted-foreground mb-1">Key Plot Points</div>
          <ul className="text-foreground space-y-1">
            {output.keyPlotPoints.slice(0, 2).map((point, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {point}
              </li>
            ))}
          </ul>
          {output.keyPlotPoints.length > 2 && (
            <div className="text-muted-foreground">
              +{output.keyPlotPoints.length - 2} more plot points
            </div>
          )}
        </div>
      )}

      {output.recommendations && output.recommendations.length > 0 && (
        <div>
          <div className="font-medium text-muted-foreground mb-1">Top Recommendation</div>
          <div className="p-2 bg-muted/50 rounded border">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{output.recommendations[0].area}</span>
              <Badge variant={output.recommendations[0].priority === 'high' ? 'destructive' : 'secondary'} className="text-xs px-1 py-0">
                {output.recommendations[0].priority}
              </Badge>
            </div>
            <div className="text-muted-foreground">{output.recommendations[0].suggestion}</div>
          </div>
        </div>
      )}
    </div>
  )

  const renderPhaseContent = (phase: StoryPhase) => {
    const deliverable = project.phaseDeliverables?.[phase]
    if (!deliverable) return null

    switch (phase) {
      case 'ideation':
        return renderIdeationSummary(deliverable as IdeationOutput)
      case 'worldbuilding':
        return renderWorldBuildingSummary(deliverable as WorldBuildingOutput)
      case 'characters':
        return renderCharacterSummary(deliverable as CharacterDevelopmentOutput)
      case 'outline':
        return renderOutlineSummary(deliverable as OutlineOutput)
      default:
        return <div className="text-xs text-muted-foreground">Content summary not implemented yet</div>
    }
  }

  const relevantPhases: StoryPhase[] = ['ideation', 'worldbuilding', 'characters', 'outline']

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Phase Progress</CardTitle>
        <CardDescription className="text-xs">
          Previous phases inform current work
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden px-3">
        <ScrollArea className="h-full">
          <div className="space-y-3">
            {relevantPhases.map((phase) => {
              const status = getPhaseStatus(phase)
              const hasContent = project.phaseDeliverables?.[phase] !== undefined
              const isOpen = openSections[phase] && hasContent

              return (
                <div key={phase} className="space-y-2">
                  <Collapsible open={isOpen} onOpenChange={() => hasContent && toggleSection(phase)}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start p-2 h-auto ${
                          status === 'current' ? 'bg-primary/10 border border-primary/20' : ''
                        }`}
                        onClick={() => {
                          if (onPhaseClick && hasContent) {
                            onPhaseClick(phase)
                          }
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            {getPhaseIcon(phase)}
                            <span className="text-sm font-medium">{getPhaseTitle(phase)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {status === 'complete' && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                            {status === 'current' && (
                              <Clock className="h-3 w-3 text-primary" />
                            )}
                            {hasContent && (
                              isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-2">
                      <div className="ml-6 p-3 bg-muted/30 rounded-lg border">
                        {renderPhaseContent(phase)}
                        
                        {hasContent && (
                          <>
                            <Separator className="my-2" />
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-muted-foreground">
                                Synthesized {new Date(project.phaseDeliverables?.[phase]?.synthesizedAt || 0).toLocaleDateString()}
                              </div>
                              {onResynthesizePhase && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onResynthesizePhase(phase)
                                  }}
                                  className="text-xs h-5 px-1 text-muted-foreground hover:text-foreground"
                                >
                                  <Sparkles className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {!hasContent && status !== 'current' && (
                    <div className="ml-6 text-xs text-muted-foreground">
                      {status === 'upcoming' ? 'Not started' : 'In progress'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}