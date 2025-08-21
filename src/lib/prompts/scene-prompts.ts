import type { SceneWritingConfig, SceneContext } from './types'

// Scene Writing Master System Message
export const SCENE_WRITING_SYSTEM_MESSAGE = `You are a masterful fiction writer specializing in {genre} stories with exceptional expertise in maintaining story continuity and consistent voice across scenes. Your primary objectives are:

CONTINUITY MASTERY:
- Analyze the established writing voice and replicate it exactly (sentence structure, rhythm, tone, vocabulary patterns)
- Maintain seamless story flow by understanding each scene's position in the larger narrative arc
- Preserve character voice consistency and relationship dynamics established in previous scenes
- Honor emotional states and unresolved elements from previous scenes
- CRITICAL: Never start scenes with generic weather, time transitions, or disconnected new beginnings

STORY ARC INTEGRATION:
- Understand your exact position in the chapter progression (opening/development/climax)
- Advance plot momentum appropriately for the current story stage
- Maintain consistent emotional trajectory while allowing natural character development
- Balance individual scene goals with overall chapter purpose

TECHNICAL EXCELLENCE:
- Natural, character-appropriate dialogue that matches established speech patterns
- Vivid sensory details and imagery consistent with previous scene density
- Show don't tell storytelling with the same sophistication level
- STRICT adherence to provided scene boundaries (opening/closing lines)
- PRECISE implementation of story beats at designated positions (opening/early/middle/late/closing)
- SMOOTH transitions that create seamless reading experience
- AVOID generic scene openings: NO weather, time jumps, or disconnected descriptions unless plot-essential

VOICE CONSISTENCY PRIORITY:
Your #1 priority is maintaining perfect consistency with the established writing voice. Every sentence should feel like it was written by the same author who wrote previous scenes. Match:
- Narrative voice intimacy/distance
- Sentence length patterns and rhythm
- Dialogue style and character speech patterns  
- Pacing and scene structure approach
- Tone keywords and emotional vocabulary
- Level of sensory detail and imagery

You must follow ALL structural requirements while making the scene feel like a natural continuation of the established story. 

🎯 CRITICAL RULE: If there are previous scenes, BEGIN this scene by continuing directly from where the story left off. Do not start with weather, time transitions, or scene-setting unless the context explicitly requires it. The reader should feel they are continuing the same story, not starting a new one.

Write only the prose content - no explanations or meta-commentary.`

// Scene Chat System Message
export const SCENE_CHAT_SYSTEM_MESSAGE = `You are a creative scene development collaborator helping craft compelling story scenes with strong continuity. 

You are currently working on: Scene {sceneNumber} - "{sceneTitle}"

Current Context Focus: {sceneContext}
{contextDescription}

{sceneContextText}

IMPORTANT SCENE CONTINUITY GUIDELINES:
- Always consider how this scene connects to what came before and what comes next
- Ensure emotional and narrative flow from the previous scene's ending
- Plan elements that will set up the next scene effectively  
- Maintain character consistency and development across scene transitions
- Consider pacing and tension progression within the chapter arc

CREATIVE COLLABORATION APPROACH:
- LEAD WITH CONCRETE SUGGESTIONS: Always start by offering specific, actionable ideas for the user's request
- Provide detailed creative options: plot beats, character actions, dialogue snippets, setting details, emotional moments
- Present multiple creative paths: "Here are three ways you could approach this..." followed by specific suggestions
- Build on user ideas with immediate creative extensions and possibilities
- Suggest specific techniques for enhancing drama, tension, pacing, or character development with examples
- Offer concrete solutions to story problems rather than just identifying them
- Include practical implementation tips: "To show this discovery, you could have her find..." or "The scene could open with..."
- Only ask questions after providing helpful suggestions, and make questions focused on refining the creative options you've presented

RESPONSE STRUCTURE: 
1. First, provide 2-3 concrete creative suggestions that directly address what the user wants
2. Then, if helpful, ask one targeted question to help choose between or refine these options
3. Focus on giving the user immediate creative material they can use or build upon

Be a proactive creative partner who immediately provides valuable ideas, not just guidance. Give the user specific content and suggestions they can implement right away.`

// Scene Revision System Message  
export const SCENE_REVISION_SYSTEM_MESSAGE = `You are a skilled fiction editor. Revise text according to specific directions while maintaining story context, character voice, and narrative flow. Output only the revised text with no explanations.`

// Scene Paragraph Addition System Message
export const SCENE_PARAGRAPH_SYSTEM_MESSAGE = `You are a skilled fiction writer. Create paragraphs that flow naturally with existing text while advancing the story. Match the established style, voice, and pacing. Output only the paragraph content with no explanations.`

// Scene context types and their descriptions
export const SCENE_CONTEXT_DESCRIPTIONS: Record<SceneContext, string> = {
  plot: 'Focus on story events, conflicts, and narrative progression',
  character: 'Explore character development, motivations, and relationships',
  setting: 'Develop the physical environment and atmosphere',
  dialogue: 'Craft natural conversations that reveal character and advance plot',
  action: 'Create dynamic sequences with tension and movement',
  emotion: 'Deepen emotional resonance and character internal states'
}

// Scene context actions for different contexts
export const SCENE_CONTEXT_ACTIONS: Record<SceneContext, string> = {
  plot: 'plot_development',
  character: 'character_development',
  setting: 'setting_development', 
  dialogue: 'dialogue_development',
  action: 'action_development',
  emotion: 'emotional_development'
}

// Build comprehensive scene context
export function buildSceneContext(scene: any, project?: any): string {
  const context: string[] = []

  // Project context
  if (project?.phaseDeliverables?.ideation?.synthesizedIdea) {
    const ideation = project.phaseDeliverables.ideation.synthesizedIdea
    context.push(`STORY PREMISE: ${ideation.corePremise}`)
    context.push(`CENTRAL CONFLICT: ${ideation.centralConflict}`)
  }

  // Character context
  if (project?.outline.characters && scene.characters) {
    const sceneCharacters = project.outline.characters.filter((c: any) =>
      scene.characters.includes(c.id)
    )
    if (sceneCharacters.length > 0) {
      context.push(`\nSCENE CHARACTERS:`)
      sceneCharacters.forEach((char: any) => {
        context.push(`- ${char.name} (${char.role}): ${char.description}`)
        if (char.motivation) context.push(`  Motivation: ${char.motivation}`)
      })
    }
  }

  // Previous scenes context
  if (project?.outline.chapters) {
    const chapter = project.outline.chapters.find((ch: any) =>
      ch.scenes.some((s: any) => s.id === scene.id)
    )
    if (chapter) {
      const sceneIndex = chapter.scenes.findIndex((s: any) => s.id === scene.id)
      const previousScenes = chapter.scenes.slice(0, sceneIndex)
      
      if (previousScenes.length > 0) {
        context.push(`\nPREVIOUS SCENES IN CHAPTER:`)
        previousScenes.forEach((prevScene: any, idx: number) => {
          context.push(`Scene ${idx + 1}: ${prevScene.title}`)
          if (prevScene.summary) context.push(`  ${prevScene.summary}`)
        })
      }
    }
  }

  return context.join('\n')
}

// Get context description for a scene context type
export function getContextDescription(sceneContext: SceneContext): string {
  return SCENE_CONTEXT_DESCRIPTIONS[sceneContext] || 'General scene development'
}

// Get action type for a scene context
export function getActionForContext(sceneContext: SceneContext): string {
  return SCENE_CONTEXT_ACTIONS[sceneContext] || 'scene_development'
}

// Build scene writing system message with genre substitution
export function buildSceneWritingSystemMessage(genre: string = 'fiction'): string {
  return SCENE_WRITING_SYSTEM_MESSAGE.replace('{genre}', genre)
}

// Build scene chat system message with enhanced context
export function buildSceneChatSystemMessage(
  scene: any,
  sceneContext: SceneContext,
  contextDescription: string,
  sceneContextText: string
): string {
  return SCENE_CHAT_SYSTEM_MESSAGE
    .replace('{sceneNumber}', scene.number?.toString() || 'Unknown')
    .replace('{sceneTitle}', scene.title || 'Untitled')
    .replace('{sceneContext}', sceneContext.toUpperCase())
    .replace('{contextDescription}', contextDescription)
    .replace('{sceneContextText}', sceneContextText)
}

// Build scene revision prompt with comprehensive context
export function buildSceneRevisionPrompt(
  selectedText: string,
  revisionDirection: string,
  contextText: string,
  fullContent: string
): string {
  return `Revise the selected text while maintaining perfect voice consistency and story continuity. The revision must feel seamlessly integrated with the surrounding content.

REVISION DIRECTION: ${revisionDirection}

COMPREHENSIVE STORY CONTEXT:
${contextText}

FULL SCENE CONTENT (for voice analysis):
${fullContent}

SELECTED TEXT TO REVISE:
"${selectedText}"

VOICE CONSISTENCY REQUIREMENTS:
1. Analyze the surrounding content to understand:
   - Established narrative voice and intimacy level
   - Character speech patterns and dialogue style
   - Sentence structure and rhythm patterns
   - Vocabulary level and tone keywords
   - Pacing and descriptive detail density

2. Apply the revision direction while:
   - Maintaining identical writing voice and style
   - Preserving character voice consistency
   - Keeping the same emotional tone and momentum
   - Using similar sentence structures and vocabulary patterns
   - Maintaining consistency with the story's established voice

3. Ensure the revised text:
   - Flows seamlessly with surrounding paragraphs
   - Matches the sophistication level of adjacent content
   - Preserves any character development or plot elements
   - Maintains the same narrative perspective and tense

Provide only the revised text that integrates perfectly with the existing scene voice:`
}

// Build different types of scene generation prompts
export function buildSceneGenerationPrompt(
  writingMode: 'fresh' | 'continue' | 'compile',
  direction: string,
  contextText: string,
  existingContent: string = ''
): string {
  switch (writingMode) {
    case 'fresh':
      return `Write a complete scene based on the following requirements and context. Follow the established story elements and voice consistency guidelines.

WRITING DIRECTION:
${direction}

COMPREHENSIVE STORY CONTEXT:
${contextText}

Create a seamless scene that flows naturally with the established story elements and voice:`

    case 'continue':
      return `Continue this scene naturally from where it currently ends. Maintain perfect voice consistency and story continuity.

CONTINUATION DIRECTION:
${direction}

COMPREHENSIVE STORY CONTEXT:
${contextText}

EXISTING SCENE CONTENT:
${existingContent}

Continue the scene naturally, maintaining the established voice and advancing the narrative:`

    case 'compile':
      return `Compile and seamlessly integrate multiple scene elements into a cohesive final scene. Ensure smooth transitions and consistent voice throughout.

COMPILATION DIRECTION:
${direction}

COMPREHENSIVE STORY CONTEXT:
${contextText}

SCENE ELEMENTS TO COMPILE:
${existingContent}

Create a seamless compilation that flows naturally from scene to scene:`

    default:
      return `Write scene content based on the provided context and direction.

DIRECTION: ${direction}
CONTEXT: ${contextText}`
  }
}

// Export scene writing configurations
export const SCENE_WRITING_CONFIGS: Record<string, SceneWritingConfig> = {
  fresh: {
    id: 'scene-fresh',
    name: 'Fresh Scene Writing',
    description: 'Write a new scene from scratch',
    writingMode: 'fresh',
    systemMessage: SCENE_WRITING_SYSTEM_MESSAGE,
    continuityRules: [
      'Maintain story continuity',
      'Match established voice',
      'Preserve character consistency',
      'Honor emotional states'
    ],
    voiceConsistencyRules: [
      'Analyze and match narrative voice',
      'Preserve sentence patterns',
      'Maintain dialogue style',
      'Keep tense and POV consistent'
    ],
    temperature: 0.7
  },
  continue: {
    id: 'scene-continue',
    name: 'Continue Scene',
    description: 'Continue an existing scene',
    writingMode: 'continue',
    systemMessage: SCENE_WRITING_SYSTEM_MESSAGE,
    continuityRules: [
      'Continue from exact endpoint',
      'Maintain narrative flow',
      'Preserve momentum',
      'Honor unresolved elements'
    ],
    voiceConsistencyRules: [
      'Match existing voice exactly',
      'Preserve established patterns',
      'Maintain character voices',
      'Keep consistent sophistication'
    ],
    temperature: 0.7
  },
  compile: {
    id: 'scene-compile',
    name: 'Compile Scene',
    description: 'Compile multiple scene elements',
    writingMode: 'compile',
    systemMessage: SCENE_WRITING_SYSTEM_MESSAGE,
    continuityRules: [
      'Seamless integration',
      'Smooth transitions',
      'Consistent progression',
      'Unified narrative arc'
    ],
    voiceConsistencyRules: [
      'Uniform voice throughout',
      'Consistent style markers',
      'Balanced pacing',
      'Cohesive sophistication'
    ],
    temperature: 0.6
  },
  revise: {
    id: 'scene-revise',
    name: 'Revise Scene',
    description: 'Revise specific scene content',
    writingMode: 'revise',
    systemMessage: SCENE_REVISION_SYSTEM_MESSAGE,
    continuityRules: [
      'Preserve story context',
      'Maintain character consistency',
      'Honor narrative flow',
      'Keep plot elements intact'
    ],
    voiceConsistencyRules: [
      'Match surrounding voice',
      'Preserve style patterns',
      'Maintain sophistication',
      'Keep tense and POV'
    ],
    temperature: 0.7
  }
}

// Enhanced scene context builder with continuity awareness
export function buildEnhancedSceneContext(project: any, scene: any): string {
  const context: string[] = []

  // Project context
  if (project.phaseDeliverables?.ideation?.synthesizedIdea) {
    const ideation = project.phaseDeliverables.ideation.synthesizedIdea
    context.push(`STORY PREMISE: ${ideation.corePremise}`)
    context.push(`CENTRAL CONFLICT: ${ideation.centralConflict}`)
  }

  // Chapter context and scene progression
  const chapter = project.outline.chapters.find((ch: any) =>
    ch.scenes.some((s: any) => s.id === scene.id)
  )
  
  if (chapter) {
    context.push(`\nCHAPTER CONTEXT:`)
    context.push(`Chapter ${chapter.number}: ${chapter.title}`)
    context.push(`Chapter Purpose: ${chapter.purpose || chapter.summary}`)
    
    const sceneIndex = chapter.scenes.findIndex((s: any) => s.id === scene.id)
    const totalScenes = chapter.scenes.length
    
    context.push(`\nSCENE POSITION: Scene ${scene.number} of ${totalScenes} in this chapter`)
    
    // PREVIOUS SCENE - Enhanced context
    if (sceneIndex > 0) {
      const previousScene = chapter.scenes[sceneIndex - 1]
      context.push(`\nPREVIOUS SCENE ENDING:`)
      context.push(`- Title: ${previousScene.title}`)
      context.push(`- Purpose: ${previousScene.purpose}`)
      context.push(`- Setting: ${previousScene.setting}`)
      context.push(`- Outcome: ${previousScene.outcome || 'Not specified'}`)
      
      // Include content from previous scene if available
      if (previousScene.content && previousScene.content.length > 0) {
        const lastParagraph = previousScene.content.slice(-200) // Last 200 chars
        context.push(`- How it ended: "${lastParagraph.trim()}..."`)
      }
      
      // Include emotional state/mood from previous scene
      if (previousScene.mood) {
        context.push(`- Ending mood: ${previousScene.mood}`)
      }
    } else {
      context.push(`\nFIRST SCENE: This is the opening scene of the chapter`)
    }
    
    // NEXT SCENE - What needs to be set up
    if (sceneIndex < totalScenes - 1) {
      const nextScene = chapter.scenes[sceneIndex + 1]
      context.push(`\nNEXT SCENE SETUP NEEDED:`)
      context.push(`- Title: ${nextScene.title}`)
      context.push(`- Purpose: ${nextScene.purpose}`)
      context.push(`- Setting: ${nextScene.setting}`)
      context.push(`- Characters needed: ${nextScene.characters.join(', ')}`)
      
      // What this scene needs to establish for the next
      context.push(`- TRANSITION GOALS: This scene should lead toward the next scene's setup`)
      if (nextScene.setting !== scene.setting) {
        context.push(`  * Scene location will change from ${scene.setting} to ${nextScene.setting}`)
      }
      
      const nextSceneChars = nextScene.characters
      const currentSceneChars = scene.characters
      const newCharacters = nextSceneChars.filter((c: string) => !currentSceneChars.includes(c))
      if (newCharacters.length > 0) {
        context.push(`  * New characters appearing next: ${newCharacters.join(', ')}`)
      }
    } else {
      context.push(`\nFINAL SCENE: This scene should conclude the chapter effectively`)
      context.push(`- Should wrap up chapter arc and transition to next chapter`)
    }
  }

  // Character context - Enhanced with relationships
  if (project.outline.characters) {
    const sceneCharacters = project.outline.characters.filter((c: any) =>
      scene.characters.includes(c.id)
    )
    if (sceneCharacters.length > 0) {
      context.push(`\nSCENE CHARACTERS & DYNAMICS:`)
      sceneCharacters.forEach((char: any) => {
        context.push(`- ${char.name} (${char.role}): ${char.description}`)
        if (char.motivation) context.push(`  Current motivation: ${char.motivation}`)
        if (char.arc) context.push(`  Character arc: ${char.arc}`)
        
        // Character relationships within this scene
        const otherSceneChars = sceneCharacters.filter((c: any) => c.id !== char.id)
        if (otherSceneChars.length > 0) {
          context.push(`  Interacting with: ${otherSceneChars.map((c: any) => c.name).join(', ')}`)
        }
      })
    }
  }

  // Current scene elements
  context.push(`\nCURRENT SCENE DETAILS:`)
  context.push(`- Purpose: ${scene.purpose}`)
  context.push(`- Setting: ${scene.setting}`)
  context.push(`- Mood: ${scene.mood || 'Not specified'}`)
  
  if (scene.beats && scene.beats.length > 0) {
    context.push(`\nEXISTING STORY BEATS:`)
    scene.beats.forEach((beat: any, index: number) => {
      context.push(`${index + 1}. ${beat.description} (${beat.type})`)
    })
  } else {
    context.push(`\nSTORY BEATS: None planned yet - needs development`)
  }

  // Scene-specific writing guidance
  context.push(`\nSCENE DEVELOPMENT FOCUS:`)
  context.push(`- Ensure smooth transition from previous scene`)
  context.push(`- Advance the chapter's purpose and story arc`) 
  context.push(`- Set up necessary elements for the next scene`)
  context.push(`- Maintain character consistency and development`)

  return context.join('\n')
}

