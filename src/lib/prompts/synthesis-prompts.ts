import type { SynthesisPromptConfig, StoryPhase } from './types'

// Base system message for synthesis tasks
export const SYNTHESIS_SYSTEM_MESSAGE = 'You are a story development assistant. Analyze conversations and extract structured story elements with actionable recommendations. Always respond with valid JSON only.'

// Scene synthesis system message  
export const SCENE_SYNTHESIS_SYSTEM_MESSAGE = 'You are a scene development assistant. Analyze scene conversations and extract structured scene elements with specific recommendations. Always respond with valid JSON only.'

// Synthesis configurations for each story phase
export const SYNTHESIS_CONFIGS: Record<StoryPhase, SynthesisPromptConfig> = {
  ideation: {
    phase: 'ideation',
    systemMessage: SYNTHESIS_SYSTEM_MESSAGE,
    temperature: 0.3,
    jsonStructure: {
      synthesizedIdea: {
        corePremise: "string",
        centralConflict: "string", 
        keyThemes: ["theme1", "theme2"],
        targetAudience: "string",
        estimatedLength: "string",
        uniqueElements: ["element1", "element2"],
        emotionalCore: "string"
      },
      recommendations: [
        {
          area: "string",
          suggestion: "string",
          score: "number_1_to_10",
          priority: "low|medium|high"
        }
      ],
      synthesizedAt: "timestamp"
    },
    promptTemplate: `Analyze this story ideation conversation and synthesize the core creative elements. Focus on extracting the fundamental story idea, conflict, and themes.

{previousPhaseContext}

Return ONLY valid JSON with this exact structure:

{
  "synthesizedIdea": {
    "corePremise": "string",
    "centralConflict": "string", 
    "keyThemes": ["theme1", "theme2"],
    "targetAudience": "string",
    "estimatedLength": "string",
    "uniqueElements": ["element1", "element2"],
    "emotionalCore": "string"
  },
  "recommendations": [
    {
      "area": "string",
      "suggestion": "string",
      "score": number_1_to_10,
      "priority": "low|medium|high"
    }
  ],
  "synthesizedAt": {timestamp}
}

CONVERSATION:
{conversation}

Analyze the conversation and extract the core story elements. Provide 3-5 specific recommendations for areas that need development. Rate each area from 1-10 based on how well-developed it is. Return only the JSON object.`
  },

  worldbuilding: {
    phase: 'worldbuilding',
    systemMessage: SYNTHESIS_SYSTEM_MESSAGE,
    temperature: 0.3,
    jsonStructure: {
      synthesizedIdea: {
        worldOverview: "string",
        settingDetails: ["detail1", "detail2"],
        worldRules: ["rule1", "rule2"],
        keyLocations: [
          {
            id: "location-id",
            name: "Location Name",
            description: "description",
            significance: "significance"
          }
        ],
        culturalElements: ["element1", "element2"],
        historicalContext: "string"
      },
      recommendations: [
        {
          area: "string",
          suggestion: "string",
          score: "number_1_to_10",
          priority: "low|medium|high"
        }
      ],
      synthesizedAt: "timestamp"
    },
    promptTemplate: `Analyze this world building conversation and synthesize the key elements. Consider the story foundation from previous phases to ensure consistency.

{previousPhaseContext}

Return ONLY valid JSON with this exact structure:

{
  "synthesizedIdea": {
    "worldOverview": "string",
    "settingDetails": ["detail1", "detail2"],
    "worldRules": ["rule1", "rule2"],
    "keyLocations": [
      {
        "id": "location-id",
        "name": "Location Name",
        "description": "description",
        "significance": "significance"
      }
    ],
    "culturalElements": ["element1", "element2"],
    "historicalContext": "string"
  },
  "recommendations": [
    {
      "area": "string",
      "suggestion": "string",
      "score": number_1_to_10,
      "priority": "low|medium|high"
    }
  ],
  "synthesizedAt": {timestamp}
}

CONVERSATION:
{conversation}

Analyze the conversation and extract the world building elements. Ensure the world supports the core premise and themes from the ideation phase. Evaluate how well the world building serves the central conflict. Provide 3-5 specific recommendations for areas that need development. Rate each area from 1-10 based on how well-developed it is. Return only the JSON object.`
  },

  characters: {
    phase: 'characters',
    systemMessage: SYNTHESIS_SYSTEM_MESSAGE,
    temperature: 0.3,
    jsonStructure: {
      mainCharacters: [
        {
          id: "character-id",
          name: "Character Name", 
          role: "protagonist|antagonist|supporting|minor",
          description: "description",
          motivation: "motivation",
          arc: "character arc",
          traits: ["trait1", "trait2"],
          backstory: "character background",
          relationships: []
        }
      ],
      relationshipDynamics: ["dynamic1", "dynamic2"],
      characterArcs: ["arc1", "arc2"],
      voiceNotes: ["note1", "note2"],
      recommendations: [
        {
          area: "string",
          suggestion: "string", 
          score: "number_1_to_10",
          priority: "low|medium|high"
        }
      ],
      synthesizedAt: "timestamp"
    },
    promptTemplate: `Analyze this character development conversation and synthesize the key elements. Consider the story foundation and world from previous phases to ensure character consistency and relevance.

{previousPhaseContext}

Return ONLY valid JSON with this exact structure:

{
  "mainCharacters": [
    {
      "id": "character-id",
      "name": "Character Name", 
      "role": "protagonist|antagonist|supporting|minor",
      "description": "description",
      "motivation": "motivation",
      "arc": "character arc",
      "traits": ["trait1", "trait2"],
      "backstory": "character background",
      "relationships": []
    }
  ],
  "relationshipDynamics": ["dynamic1", "dynamic2"],
  "characterArcs": ["arc1", "arc2"],
  "voiceNotes": ["note1", "note2"],
  "recommendations": [
    {
      "area": "string",
      "suggestion": "string", 
      "score": number_1_to_10,
      "priority": "low|medium|high"
    }
  ],
  "synthesizedAt": {timestamp}
}

CONVERSATION:
{conversation}

Analyze the conversation and extract character development elements. Ensure characters serve the story premise, fit the world, and drive the central conflict. Evaluate character diversity, motivation clarity, and arc potential. Provide 3-5 specific recommendations. Return only the JSON object.`
  },

  outline: {
    phase: 'outline',
    systemMessage: SYNTHESIS_SYSTEM_MESSAGE,
    temperature: 0.3,
    jsonStructure: {
      plotStructure: {
        exposition: "string",
        incitingIncident: "string", 
        risingAction: ["action1", "action2"],
        climax: "string",
        fallingAction: ["action1", "action2"],
        resolution: "string"
      },
      chapterSummaries: ["Chapter 1 summary", "Chapter 2 summary", "Chapter 3 summary", "Chapter 4 summary", "Chapter 5 summary"],
      keyPlotPoints: ["plot point 1", "plot point 2"],
      pacingNotes: ["pacing note 1", "pacing note 2"],
      recommendations: [
        {
          area: "string",
          suggestion: "string",
          score: "number_1_to_10",
          priority: "low|medium|high"
        }
      ],
      synthesizedAt: "timestamp"
    },
    promptTemplate: `Analyze this story outline conversation and synthesize the key narrative structure. Consider the story foundation, world, and characters from previous phases to create a cohesive outline.

{previousPhaseContext}

Return ONLY valid JSON with this exact structure:

{
  "plotStructure": {
    "exposition": "string",
    "incitingIncident": "string", 
    "risingAction": ["action1", "action2"],
    "climax": "string",
    "fallingAction": ["action1", "action2"],
    "resolution": "string"
  },
  "chapterSummaries": ["Chapter 1 summary", "Chapter 2 summary", "Chapter 3 summary", "Chapter 4 summary", "Chapter 5 summary"],
  "keyPlotPoints": ["plot point 1", "plot point 2"],
  "pacingNotes": ["pacing note 1", "pacing note 2"],
  "recommendations": [
    {
      "area": "string",
      "suggestion": "string",
      "score": number_1_to_10,
      "priority": "low|medium|high"
    }
  ],
  "synthesizedAt": {timestamp}
}

CONVERSATION:
{conversation}

Analyze the conversation and extract the story structure elements. Ensure the outline serves the characters, world, and central conflict from previous phases. 

IMPORTANT: Generate an appropriate number of chapters based on the story content and scope discussed. Most stories need 8-15 chapters, but adjust based on the complexity and target length mentioned. Do not limit yourself to just 2 chapters - provide a full chapter breakdown that covers the complete story arc.

Evaluate plot coherence, pacing, and narrative arc. Provide 3-5 specific recommendations for areas that need development. Rate each area from 1-10 based on how well-developed it is. Return only the JSON object.`
  },

  scene: {
    phase: 'scene',
    systemMessage: SCENE_SYNTHESIS_SYSTEM_MESSAGE,
    temperature: 0.3,
    jsonStructure: {
      sceneElements: {
        purpose: "string",
        setting: "string",
        mood: "string",
        plotBeats: ["beat1", "beat2"],
        characterDevelopment: ["development1", "development2"],
        conflict: "string",
        resolution: "string"
      },
      technicalNotes: {
        pacing: "string",
        transitions: ["transition1", "transition2"],
        voice: "string",
        style: "string"
      },
      recommendations: [
        {
          area: "string",
          suggestion: "string",
          score: "number_1_to_10",
          priority: "low|medium|high"
        }
      ],
      synthesizedAt: "timestamp"
    },
    promptTemplate: `Analyze this scene development conversation and synthesize the key scene elements. Consider the chapter context and story progression to ensure scene coherence.

{previousPhaseContext}

{sceneContextText}

Return ONLY valid JSON with this exact structure:

{
  "sceneElements": {
    "purpose": "string",
    "setting": "string", 
    "mood": "string",
    "plotBeats": ["beat1", "beat2"],
    "characterDevelopment": ["development1", "development2"],
    "conflict": "string",
    "resolution": "string"
  },
  "technicalNotes": {
    "pacing": "string",
    "transitions": ["transition1", "transition2"],
    "voice": "string",
    "style": "string"
  },
  "recommendations": [
    {
      "area": "string",
      "suggestion": "string",
      "score": number_1_to_10,
      "priority": "low|medium|high"
    }
  ],
  "synthesizedAt": {timestamp}
}

CONVERSATION:
{conversation}

Analyze the conversation and extract scene development elements. Ensure the scene serves the chapter purpose and story progression. Evaluate scene structure, character dynamics, and plot advancement. Provide 3-5 specific recommendations for areas that need development. Rate each area from 1-10 based on how well-developed it is. Return only the JSON object.`
  },

  // Default case for other phases
  chapter: {
    phase: 'chapter',
    systemMessage: SYNTHESIS_SYSTEM_MESSAGE,
    temperature: 0.3,
    jsonStructure: {},
    promptTemplate: `Analyze this conversation and extract key insights with actionable recommendations. Consider previous phase outputs for context and consistency.

{previousPhaseContext}

Set synthesizedAt to {timestamp}.

CONVERSATION:
{conversation}`
  },

  revision: {
    phase: 'revision',
    systemMessage: SYNTHESIS_SYSTEM_MESSAGE,
    temperature: 0.3,
    jsonStructure: {},
    promptTemplate: `Analyze this revision conversation and extract key insights with actionable recommendations. Consider previous phase outputs for context and consistency.

{previousPhaseContext}

Set synthesizedAt to {timestamp}.

CONVERSATION:
{conversation}`
  },

  compilation: {
    phase: 'compilation',
    systemMessage: SYNTHESIS_SYSTEM_MESSAGE,
    temperature: 0.3,
    jsonStructure: {},
    promptTemplate: `Analyze this compilation conversation and extract key insights with actionable recommendations. Consider previous phase outputs for context and consistency.

{previousPhaseContext}

Set synthesizedAt to {timestamp}.

CONVERSATION:
{conversation}`
  }
}

// Build synthesis prompt for a specific phase
export function buildSynthesisPrompt(
  phase: StoryPhase,
  conversation: string,
  previousPhaseContext: string = ''
): string {
  const config = SYNTHESIS_CONFIGS[phase]
  if (!config) {
    return `Analyze this conversation and extract key insights: ${conversation}`
  }

  const timestamp = Date.now()
  
  return config.promptTemplate
    .replace('{previousPhaseContext}', previousPhaseContext)
    .replace('{conversation}', conversation)
    .replace(/{timestamp}/g, timestamp.toString())
}

// Build scene synthesis prompt (special case)
export function buildSceneSynthesisPrompt(
  scene: any,
  conversation: string,
  sceneContextText: string,
  previousPhaseContext: string = ''
): string {
  const config = SYNTHESIS_CONFIGS.scene
  const timestamp = Date.now()
  
  return config.promptTemplate
    .replace('{previousPhaseContext}', previousPhaseContext)
    .replace('{sceneContextText}', sceneContextText)
    .replace('{conversation}', conversation)
    .replace(/{timestamp}/g, timestamp.toString())
}

// Build context from previous phases for synthesis
export function buildPreviousPhaseContext(
  activeProject: any,
  currentPhase: StoryPhase
): string {
  if (!activeProject?.phaseDeliverables) return ""
  
  const context: string[] = []
  const phases: StoryPhase[] = ['ideation', 'worldbuilding', 'characters', 'outline']
  const currentIndex = phases.indexOf(currentPhase)
  
  // Include context from all previous completed phases
  for (let i = 0; i < currentIndex; i++) {
    const phase = phases[i]
    const deliverable = activeProject.phaseDeliverables[phase]
    
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

// Get synthesis configuration for a phase
export function getSynthesisConfig(phase: StoryPhase): SynthesisPromptConfig {
  return SYNTHESIS_CONFIGS[phase] || SYNTHESIS_CONFIGS.chapter
}

// Get synthesis system message for a phase
export function getSynthesisSystemMessage(phase: StoryPhase): string {
  const config = getSynthesisConfig(phase)
  return config.systemMessage
}

// Get synthesis temperature for a phase
export function getSynthesisTemperature(phase: StoryPhase): number {
  const config = getSynthesisConfig(phase)
  return config.temperature
}