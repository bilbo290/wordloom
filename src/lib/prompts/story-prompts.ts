import type { StoryPromptConfig, StoryPhase } from './types'

// Base system message for Story Writer Mode
export const STORY_WRITER_BASE_MESSAGE = 'You are a creative writing assistant helping to develop and write'

// Phase-specific guidance and prompts
export const STORY_PHASE_CONFIGS: Record<StoryPhase, StoryPromptConfig> = {
  ideation: {
    id: 'ideation',
    name: 'Story Ideation',
    description: 'Collaborative story development and idea generation',
    phase: 'ideation',
    systemMessage: `${STORY_WRITER_BASE_MESSAGE} a story.

As a story collaborator in the ideation phase: Ask ONE specific question at a time to help develop the story. Keep responses to 1-2 sentences maximum. Be encouraging and conversational. Focus on one aspect at a time: plot, character, setting, or theme.`,
    temperature: 0.8
  },
  
  worldbuilding: {
    id: 'worldbuilding',
    name: 'World Building',
    description: 'Develop rich story worlds and settings',
    phase: 'worldbuilding',
    systemMessage: `${STORY_WRITER_BASE_MESSAGE} a story.

As a worldbuilding assistant: Help build the story world collaboratively. Ask focused questions about setting, atmosphere, rules, or culture. Keep responses conversational and to 1-2 sentences when discussing.`,
    temperature: 0.7
  },

  characters: {
    id: 'characters',
    name: 'Character Development',
    description: 'Create compelling characters and relationships',
    phase: 'characters',
    systemMessage: `${STORY_WRITER_BASE_MESSAGE} a story.

As a character development assistant: Help develop compelling characters through conversation. Ask one focused question at a time about personality, backstory, or motivations. Keep responses short and engaging.`,
    temperature: 0.7
  },

  outline: {
    id: 'outline',
    name: 'Story Outline',
    description: 'Structure the narrative with chapters and scenes',
    phase: 'outline',
    systemMessage: `${STORY_WRITER_BASE_MESSAGE} a story.

As an outline assistant: Help create a story outline through guided conversation. Ask about plot structure, pacing, or specific chapters one at a time. Be concise and focused.`,
    temperature: 0.6
  },

  chapter: {
    id: 'chapter',
    name: 'Chapter Writing',
    description: 'Write engaging chapter content',
    phase: 'chapter',
    systemMessage: `${STORY_WRITER_BASE_MESSAGE} a story.

As a chapter writing assistant: Help write engaging chapter content that advances the story.`,
    temperature: 0.7
  },

  scene: {
    id: 'scene',
    name: 'Scene Writing',
    description: 'Craft vivid scenes with strong imagery',
    phase: 'scene',
    systemMessage: `${STORY_WRITER_BASE_MESSAGE} a story.

As a scene writing assistant: Help write vivid scenes with strong imagery and character development.`,
    temperature: 0.7
  },

  revision: {
    id: 'revision',
    name: 'Story Revision',
    description: 'Improve and refine the story',
    phase: 'revision',
    systemMessage: `${STORY_WRITER_BASE_MESSAGE} a story.

As a revision assistant: Help revise and improve the story for clarity, pacing, and impact.`,
    temperature: 0.6
  },

  compilation: {
    id: 'compilation',
    name: 'Story Compilation',
    description: 'Compile and finalize the story',
    phase: 'compilation',
    systemMessage: `${STORY_WRITER_BASE_MESSAGE} a story.

As a compilation assistant: Help compile and finalize the complete story.`,
    temperature: 0.5
  }
}

// Build system message with project context
export function buildStorySystemMessage(
  project: any,
  phase: StoryPhase,
  previousPhaseContext: string = '',
  activeChapterId?: string,
  activeSceneId?: string
): string {
  // Safety check
  if (!project || !project.settings) {
    return 'You are a creative writing assistant helping to develop and write a story.'
  }

  let systemMessage = `You are a creative writing assistant helping to develop and write a ${project.genre || 'creative'} story.

Story Details:
- Title: ${project.title || 'Untitled'}
- Premise: ${project.premise || 'No premise set'}
- Target Length: ${project.targetLength || 'unspecified'}
- Tone: ${project.settings.tone || 'mixed'}
- Perspective: ${project.settings.perspective || 'third-limited'}
- Tense: ${project.settings.tense || 'past'}
- Target Audience: ${project.settings.targetAudience || 'general'}`

  // Add previous phase context if available
  if (previousPhaseContext) {
    systemMessage += `\n\n${previousPhaseContext}`
  }

  if (project.settings.themes && project.settings.themes.length > 0) {
    systemMessage += `\n- Themes: ${project.settings.themes.join(', ')}`
  }

  // Add phase-specific guidance
  const phaseConfig = STORY_PHASE_CONFIGS[phase]
  if (phaseConfig) {
    systemMessage += `\n\n${phaseConfig.systemMessage.split('\n\n')[1]}` // Get the specific guidance part
  }

  // Add context-specific information
  switch (phase) {
    case 'worldbuilding':
      if (project.outline && project.outline.worldBuilding) {
        systemMessage += `\n\nCurrent world-building:\n${JSON.stringify(project.outline.worldBuilding, null, 2)}`
      }
      break

    case 'characters':
      if (project.outline && project.outline.characters && project.outline.characters.length > 0) {
        systemMessage += `\n\nCurrent characters:\n${project.outline.characters.map((c: any) =>
          `- ${c.name || 'Unnamed'} (${c.role || 'unknown'}): ${c.description || 'No description'}`
        ).join('\n')}`
      }
      break

    case 'outline':
      if (project.outline && project.outline.chapters && project.outline.chapters.length > 0) {
        systemMessage += `\n\nCurrent outline:\n${project.outline.chapters.map((ch: any) =>
          `Chapter ${ch.number}: ${ch.title || 'Untitled'}\n  ${ch.summary || 'No summary'}`
        ).join('\n\n')}`
      }
      break

    case 'chapter':
      if (activeChapterId && project.outline && project.outline.chapters) {
        const chapter = project.outline.chapters.find((ch: any) => ch.id === activeChapterId)
        if (chapter) {
          systemMessage += `\n\nWorking on Chapter ${chapter.number}: ${chapter.title || ''}\n${chapter.summary || ''}`
          if (chapter.purpose) {
            systemMessage += `\nPurpose: ${chapter.purpose}`
          }
        }
      }
      break

    case 'scene':
      if (activeSceneId && activeChapterId && project.outline && project.outline.chapters) {
        const chapter = project.outline.chapters.find((ch: any) => ch.id === activeChapterId)
        const scene = chapter?.scenes?.find((s: any) => s.id === activeSceneId)
        if (scene) {
          systemMessage += `\n\nWorking on Scene ${scene.number}: ${scene.title || ''}\n${scene.summary || ''}`
          if (scene.setting) {
            systemMessage += `\nSetting: ${scene.setting}`
          }
        }
      }
      break
  }

  return systemMessage
}

// Helper function to build context from previous phases for chat system message
export function buildPreviousPhaseContextForChat(project: any, currentPhase: StoryPhase): string {
  if (!project.phaseDeliverables) return ""
  
  const context: string[] = []
  const phases: StoryPhase[] = ['ideation', 'worldbuilding', 'characters', 'outline']
  const currentIndex = phases.indexOf(currentPhase)
  
  // Include context from all previous completed phases
  for (let i = 0; i < currentIndex; i++) {
    const phase = phases[i]
    const deliverable = project.phaseDeliverables[phase]
    
    if (deliverable && deliverable.synthesizedIdea) {
      switch (phase) {
        case 'ideation':
          const idea = deliverable.synthesizedIdea
          context.push(`Core Premise: ${idea.corePremise}`)
          context.push(`Central Conflict: ${idea.centralConflict}`)
          context.push(`Key Themes: ${idea.keyThemes?.join(', ')}`)
          break
          
        case 'worldbuilding':
          const world = deliverable.synthesizedIdea
          context.push(`World Overview: ${world.worldOverview}`)
          context.push(`World Rules: ${world.worldRules?.join(', ')}`)
          context.push(`Key Locations: ${world.keyLocations?.map((l: any) => l.name).join(', ')}`)
          break
          
        case 'characters':
          const chars = deliverable.synthesizedIdea
          context.push(`Main Characters: ${chars.mainCharacters?.map((c: any) => `${c.name} (${c.role})`).join(', ')}`)
          context.push(`Character Arcs: ${chars.characterArcs?.join(', ')}`)
          context.push(`Relationship Dynamics: ${chars.relationshipDynamics?.join(', ')}`)
          break
      }
    }
  }
  
  return context.length > 0 ? `Previous Phase Context:\n${context.join('\n')}\n` : ""
}

// Get the appropriate system message for a story writing phase
export function getStoryPhaseSystemMessage(phase: StoryPhase): string {
  const config = STORY_PHASE_CONFIGS[phase]
  return config ? config.systemMessage : STORY_WRITER_BASE_MESSAGE + ' a story.'
}

// Get temperature for a specific story phase
export function getStoryPhaseTemperature(phase: StoryPhase): number {
  const config = STORY_PHASE_CONFIGS[phase]
  return config ? config.temperature || 0.7 : 0.7
}