import type { TaskPromptConfig, PromptTemplate, AIMode } from './types'

// Base system message for all editor tasks
export const CORE_SYSTEM_MESSAGE = `You are a precise writing/editor assistant for any document (blogs, docs, notes, fiction).
Respect the author's style, POV, tense, and constraints.
Output ONLY the prose requested — no explanations.
When asked to continue or write the "next part", write NEW content that comes after the given text. Never repeat or rewrite existing content.`

// Task-specific instructions for each AI mode
export const TASK_INSTRUCTIONS: Record<AIMode, string> = {
  revise: 'Revise the SELECTED passage for clarity, rhythm, and precision. Preserve meaning, names, tone, POV, and tense. Output the revised passage ONLY.',
  append: 'Continue the SELECTED passage with 80–180 words that flow naturally. Maintain voice, POV, and tense. Output continuation ONLY.',
  continue: 'Write the NEXT part of the story that comes after the SELECTED passage. Do NOT rewrite or repeat the selected text. Write 100-200 words of new content that advances the plot, develops characters, or enhances the narrative. Maintain consistent voice, POV, and tense. Output only the new continuation.',
  ideas: 'Based on the SELECTED passage, generate 3-5 creative ideas for how the story/content could develop next. Include specific suggestions for plot developments, character arcs, themes, or directions. Be creative but consistent with the established tone and context.',
  summarize: 'Create a concise summary of the SELECTED passage. Capture the key points, main ideas, and essential information. Keep the summary clear and well-organized.',
  focus: 'Tighten and clarify the SELECTED passage. Remove unnecessary words, improve sentence structure, and make the writing more precise and impactful. Preserve the original meaning and tone. Output the focused passage ONLY.',
  enhance: 'Enhance the SELECTED passage by adding vivid details, sensory descriptions, and rich imagery. Make the writing more engaging and immersive while maintaining the original structure and meaning. Output the enhanced passage ONLY.',
  custom: 'Improve the SELECTED passage while preserving its original meaning and tone.',
  
  // Story Writer Mode specific
  'discuss-story': 'Act as a friendly story collaborator and interviewer. Ask ONE focused question at a time to help develop the story. Keep responses to 1-2 sentences max. Focus on one specific aspect: either plot, character, setting, or theme. Be conversational and encouraging.',
  'generate-outline': 'Create a detailed story outline with chapters and scenes. Include plot structure, character arcs, and key story beats. Format as a clear, organized outline.',
  'write-chapter': 'Write a full chapter based on the provided outline and context. Include vivid descriptions, compelling dialogue, and advance the plot according to the chapter summary.',
  'write-scene': 'Write a complete scene based on the scene outline. Focus on the specific story beats, character interactions, and mood described in the scene summary.',
  'develop-character': 'Develop detailed character profiles including personality, backstory, motivations, and character arc. Provide rich, compelling character details that serve the story.',
  'build-world': 'Expand the world-building with rich details about setting, culture, history, and atmosphere. Create an immersive world that supports the story themes and plot.'
}

// Core editor task configurations
export const CORE_TASK_PROMPTS: Record<string, TaskPromptConfig> = {
  revise: {
    id: 'revise',
    name: 'Revise Selection',
    description: 'Improve clarity, rhythm, and precision while preserving meaning',
    systemMessage: CORE_SYSTEM_MESSAGE,
    taskInstruction: TASK_INSTRUCTIONS.revise,
    requiresSelection: true,
    mode: 'revise',
    temperature: 0.7
  },
  append: {
    id: 'append',
    name: 'Append to Selection',
    description: 'Continue the selected text naturally',
    systemMessage: CORE_SYSTEM_MESSAGE,
    taskInstruction: TASK_INSTRUCTIONS.append,
    requiresSelection: true,
    mode: 'append',
    temperature: 0.7
  },
  continue: {
    id: 'continue',
    name: 'Continue Story',
    description: 'Write the next part that comes after the selection',
    systemMessage: CORE_SYSTEM_MESSAGE,
    taskInstruction: TASK_INSTRUCTIONS.continue,
    requiresSelection: true,
    mode: 'continue',
    temperature: 0.7
  },
  ideas: {
    id: 'ideas',
    name: 'Generate Ideas',
    description: 'Brainstorm creative directions for the content',
    systemMessage: CORE_SYSTEM_MESSAGE,
    taskInstruction: TASK_INSTRUCTIONS.ideas,
    requiresSelection: true,
    mode: 'ideas',
    temperature: 0.8
  },
  summarize: {
    id: 'summarize',
    name: 'Summarize',
    description: 'Create a concise summary of the selection',
    systemMessage: CORE_SYSTEM_MESSAGE,
    taskInstruction: TASK_INSTRUCTIONS.summarize,
    requiresSelection: true,
    mode: 'summarize',
    temperature: 0.5
  },
  focus: {
    id: 'focus',
    name: 'Focus & Tighten',
    description: 'Make writing more precise and impactful',
    systemMessage: CORE_SYSTEM_MESSAGE,
    taskInstruction: TASK_INSTRUCTIONS.focus,
    requiresSelection: true,
    mode: 'focus',
    temperature: 0.6
  },
  enhance: {
    id: 'enhance',
    name: 'Enhance Details',
    description: 'Add vivid details and rich imagery',
    systemMessage: CORE_SYSTEM_MESSAGE,
    taskInstruction: TASK_INSTRUCTIONS.enhance,
    requiresSelection: true,
    mode: 'enhance',
    temperature: 0.8
  }
}

// Predefined prompt templates for common tasks
export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'continue-story-document',
    name: 'Continue Story',
    description: 'Continue the narrative from where the document ends',
    mode: 'continue',
    promptText: 'Write the next part of this story that comes after where it currently ends. Do NOT rewrite existing content. Write 150-250 words of new content that advances the plot, develops characters, or enhances the narrative. Maintain consistent voice, POV, and tense.',
    requiresSelection: false,
    category: 'writing'
  },
  {
    id: 'improve-dialogue',
    name: 'Improve Dialogue',
    description: 'Make dialogue more natural and character-specific',
    mode: 'custom',
    promptText: 'Improve the dialogue in the SELECTED passage to make it more natural, engaging, and character-specific. Maintain the original meaning while enhancing the conversational flow.',
    requiresSelection: true,
    category: 'editing'
  },
  {
    id: 'show-dont-tell',
    name: 'Show Don\'t Tell',
    description: 'Convert telling into showing through actions and scenes',
    mode: 'custom',
    promptText: 'Rewrite the SELECTED passage to show the information through actions, dialogue, and scenes rather than telling it directly. Make it more engaging and immersive.',
    requiresSelection: true,
    category: 'creative'
  },
  {
    id: 'add-tension',
    name: 'Add Tension',
    description: 'Increase conflict and suspense in the passage',
    mode: 'custom',
    promptText: 'Enhance the SELECTED passage by adding tension, conflict, or suspense. Create obstacles, complications, or emotional stakes that drive the narrative forward.',
    requiresSelection: true,
    category: 'creative'
  },
  {
    id: 'simplify-technical',
    name: 'Simplify Technical Content',
    description: 'Make complex content more accessible',
    mode: 'custom',
    promptText: 'Simplify the SELECTED technical content to make it more accessible to a general audience. Use clear explanations, analogies, and examples while maintaining accuracy.',
    requiresSelection: true,
    category: 'editing'
  },
  {
    id: 'expand-scene',
    name: 'Expand Scene',
    description: 'Add more detail and depth to a scene',
    mode: 'enhance',
    promptText: 'Expand the SELECTED scene with more vivid details, character thoughts, sensory descriptions, and atmospheric elements. Make the reader feel present in the scene.',
    requiresSelection: true,
    category: 'creative'
  },
  {
    id: 'polish-prose',
    name: 'Polish Prose',
    description: 'Refine writing style and flow',
    mode: 'revise',
    promptText: 'Polish the SELECTED passage for better prose style, sentence flow, and word choice. Maintain the author\'s voice while improving clarity and elegance.',
    requiresSelection: true,
    category: 'editing'
  },
  {
    id: 'add-conflict',
    name: 'Add Character Conflict',
    description: 'Introduce interpersonal tension',
    mode: 'custom',
    promptText: 'Enhance the SELECTED passage by adding subtle character conflict, tension, or disagreement that reveals personality and advances relationships.',
    requiresSelection: true,
    category: 'creative'
  }
]

// Helper function to get task instruction for any mode
export function getTaskInstruction(mode: AIMode, customPrompt?: string): string {
  if (mode === 'custom' && customPrompt) {
    return customPrompt
  }
  
  return TASK_INSTRUCTIONS[mode] || TASK_INSTRUCTIONS.custom
}

// Helper function to get the appropriate system message for a mode
export function getCoreSystemMessage(mode?: AIMode): string {
  return CORE_SYSTEM_MESSAGE
}

// Helper function to get a complete task prompt configuration
export function getCoreTaskPrompt(mode: AIMode): TaskPromptConfig | undefined {
  return CORE_TASK_PROMPTS[mode]
}

// Test connection system message for settings page
export const TEST_CONNECTION_SYSTEM_MESSAGE = CORE_SYSTEM_MESSAGE