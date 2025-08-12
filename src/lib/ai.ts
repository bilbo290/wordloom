import { createOpenAI } from '@ai-sdk/openai'
import { ProjectContext, DocumentContext, AIMode, PromptTemplate } from './types'
import { 
  RefreshCw, 
  Plus, 
  BookOpen, 
  Lightbulb, 
  FileText, 
  Target, 
  Sparkles, 
  Zap 
} from 'lucide-react'

export type AIProvider = 'lmstudio' | 'ollama'

export function createAIProvider(provider: AIProvider = 'lmstudio') {
  if (provider === 'ollama') {
    return createOpenAI({
      baseURL: import.meta.env.VITE_OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
      apiKey: import.meta.env.VITE_OLLAMA_API_KEY || 'ollama',
    })
  }
  
  return createOpenAI({
    baseURL: import.meta.env.VITE_OPENAI_BASE_URL || 'http://127.0.0.1:1234/v1',
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'lm-studio',
  })
}

export function getModel(provider: AIProvider = 'lmstudio') {
  if (provider === 'ollama') {
    return import.meta.env.VITE_OLLAMA_MODEL || 'gemma3:4b'
  }
  
  return import.meta.env.VITE_OPENAI_MODEL || 'lmstudio'
}

// Legacy exports for backward compatibility
export const openai = createAIProvider('lmstudio')
export const MODEL = getModel('lmstudio')

export const SYSTEM_MESSAGE = `You are a precise writing/editor assistant for any document (blogs, docs, notes, fiction).
Respect the author's style, POV, tense, and constraints.
Output ONLY the prose requested — no explanations.`

// Helper functions for building context sections
function buildProjectInstructions(projectContext: ProjectContext): string {
  const instructions = []
  
  if (projectContext.genre && projectContext.genre !== 'other') {
    instructions.push(`Genre: ${projectContext.genre}`)
  }
  
  if (projectContext.style) {
    instructions.push(`Style: ${projectContext.style}`)
  }
  
  if (projectContext.audience) {
    instructions.push(`Target audience: ${projectContext.audience}`)
  }
  
  if (projectContext.constraints) {
    instructions.push(`Constraints: ${projectContext.constraints}`)
  }
  
  return instructions.length > 0 ? instructions.join('\n') : ''
}

function buildProjectContextSection(projectContext: ProjectContext): string {
  const sections = []
  
  if (projectContext.description) {
    sections.push(`PROJECT: ${projectContext.name}\n${projectContext.description}`)
  } else if (projectContext.name !== 'My Project') {
    sections.push(`PROJECT: ${projectContext.name}`)
  }
  
  // Add custom fields if any
  if (projectContext.customFields && Object.keys(projectContext.customFields).length > 0) {
    const customFields = Object.entries(projectContext.customFields)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')
    sections.push(`PROJECT DETAILS:\n${customFields}`)
  }
  
  return sections.length > 0 ? sections.join('\n\n') + '\n\n' : ''
}

function buildDocumentContextSection(documentContext?: DocumentContext): string {
  if (!documentContext) return ''
  
  const sections = []
  
  if (documentContext.purpose) {
    sections.push(`DOCUMENT PURPOSE: ${documentContext.purpose}`)
  }
  
  if (documentContext.status && documentContext.status !== 'draft') {
    sections.push(`STATUS: ${documentContext.status}`)
  }
  
  if (documentContext.documentNotes) {
    sections.push(`DOCUMENT NOTES:\n${documentContext.documentNotes}`)
  }
  
  // Add custom fields if any
  if (documentContext.customFields && Object.keys(documentContext.customFields).length > 0) {
    const customFields = Object.entries(documentContext.customFields)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')
    sections.push(`DOCUMENT DETAILS:\n${customFields}`)
  }
  
  return sections.length > 0 ? sections.join('\n\n') + '\n\n' : ''
}

function buildSessionContextSection(sessionContext: string): string {
  return sessionContext.trim() ? `SESSION NOTES:\n${sessionContext.trim()}\n\n` : ''
}

// Enhanced prompt building with hierarchical context
export function buildEnhancedPrompt(
  projectContext: ProjectContext,
  documentContext: DocumentContext | undefined,
  sessionContext: string,
  leftContext: string,
  selectedText: string,
  rightContext: string,
  mode: AIMode,
  customPrompt?: string
): { systemMessage: string; userPrompt: string } {
  
  // Build enhanced system message
  const baseSystem = projectContext.systemPrompt || SYSTEM_MESSAGE
  const projectInstructions = buildProjectInstructions(projectContext)
  const systemMessage = projectInstructions 
    ? `${baseSystem}\n\nPROJECT GUIDELINES:\n${projectInstructions}`
    : baseSystem
  
  // Build user prompt with layered context
  const sections = [
    buildProjectContextSection(projectContext),
    buildDocumentContextSection(documentContext),
    buildSessionContextSection(sessionContext),
    `LEFT CONTEXT:\n${leftContext}`,
    `SELECTED:\n${selectedText}`,
    `RIGHT CONTEXT:\n${rightContext}`,
    `TASK:\n${getTaskInstruction(mode, customPrompt)}`
  ].filter(section => section.trim() !== '')
  
  const userPrompt = sections.join('\n')
  
  return { systemMessage, userPrompt }
}

function getTaskInstruction(mode: AIMode, customPrompt?: string): string {
  if (mode === 'custom' && customPrompt) {
    return customPrompt
  }
  
  switch (mode) {
    case 'revise':
      return 'Revise the SELECTED passage for clarity, rhythm, and precision. Preserve meaning, names, tone, POV, and tense. Output the revised passage ONLY.'
    case 'append':
      return 'Continue the SELECTED passage with 80–180 words that flow naturally. Maintain voice, POV, and tense. Output continuation ONLY.'
    case 'continue':
      return 'Continue the story naturally from the SELECTED passage. Write 100-200 words that advance the plot, develop characters, or enhance the narrative. Maintain consistent voice, POV, and tense. Output continuation ONLY.'
    case 'ideas':
      return 'Based on the SELECTED passage, generate 3-5 creative ideas for how the story/content could develop next. Include specific suggestions for plot developments, character arcs, themes, or directions. Be creative but consistent with the established tone and context.'
    case 'summarize':
      return 'Create a concise summary of the SELECTED passage. Capture the key points, main ideas, and essential information. Keep the summary clear and well-organized.'
    case 'focus':
      return 'Tighten and clarify the SELECTED passage. Remove unnecessary words, improve sentence structure, and make the writing more precise and impactful. Preserve the original meaning and tone. Output the focused passage ONLY.'
    case 'enhance':
      return 'Enhance the SELECTED passage by adding vivid details, sensory descriptions, and rich imagery. Make the writing more engaging and immersive while maintaining the original structure and meaning. Output the enhanced passage ONLY.'
    default:
      return 'Improve the SELECTED passage while preserving its original meaning and tone.'
  }
}

// Legacy function for backwards compatibility
export function buildUserPrompt(
  documentContext: string,
  leftContext: string,
  selectedText: string,
  rightContext: string,
  mode: 'revise' | 'append'
) {
  const taskInstruction = getTaskInstruction(mode)

  return `DOCUMENT CONTEXT:
${documentContext || '[No additional context provided]'}

LEFT CONTEXT:
${leftContext}

SELECTED:
${selectedText}

RIGHT CONTEXT:
${rightContext}

TASK:
${taskInstruction}`
}

// Predefined prompt templates
export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'brainstorm-ideas',
    name: 'Brainstorm Ideas',
    description: 'Generate creative ideas for your content',
    mode: 'ideas',
    promptText: 'Based on this document, generate 5 creative ideas for how the content could be expanded, improved, or continued. Consider different angles, themes, and approaches.',
    requiresSelection: false,
    category: 'brainstorming'
  },
  {
    id: 'character-development',
    name: 'Develop Characters',
    description: 'Create character profiles and development ideas',
    mode: 'custom',
    promptText: 'Based on the characters mentioned in this text, create detailed character profiles including personality traits, motivations, backstory, and potential character arcs.',
    requiresSelection: false,
    category: 'writing'
  },
  {
    id: 'plot-outline',
    name: 'Create Plot Outline',
    description: 'Generate a plot structure or outline',
    mode: 'custom',
    promptText: 'Create a detailed plot outline based on this content. Include major plot points, character arcs, conflicts, and resolution. Structure it with clear acts or sections.',
    requiresSelection: false,
    category: 'writing'
  },
  {
    id: 'tone-analysis',
    name: 'Analyze Tone & Style',
    description: 'Analyze the writing style and tone',
    mode: 'custom',
    promptText: 'Analyze the tone, writing style, and voice in this text. Identify key stylistic elements, mood, and provide suggestions for maintaining consistency.',
    requiresSelection: false,
    category: 'analysis'
  },
  {
    id: 'dialogue-improve',
    name: 'Improve Dialogue',
    description: 'Enhance dialogue to sound more natural',
    mode: 'custom',
    promptText: 'Improve the dialogue in the SELECTED passage to make it more natural, engaging, and character-specific. Maintain the original meaning while enhancing the conversational flow.',
    requiresSelection: true,
    category: 'editing'
  },
  {
    id: 'show-dont-tell',
    name: 'Show, Don\'t Tell',
    description: 'Transform exposition into action and dialogue',
    mode: 'custom',
    promptText: 'Rewrite the SELECTED passage to show the information through actions, dialogue, and scenes rather than telling it directly. Make it more engaging and immersive.',
    requiresSelection: true,
    category: 'writing'
  },
  {
    id: 'add-conflict',
    name: 'Add Tension',
    description: 'Increase tension and conflict',
    mode: 'custom',
    promptText: 'Enhance the SELECTED passage by adding tension, conflict, or suspense. Create obstacles, complications, or emotional stakes that drive the narrative forward.',
    requiresSelection: true,
    category: 'writing'
  },
  {
    id: 'technical-simplify',
    name: 'Simplify Technical Content',
    description: 'Make complex content more accessible',
    mode: 'custom',
    promptText: 'Simplify the SELECTED technical content to make it more accessible to a general audience. Use clear explanations, analogies, and examples while maintaining accuracy.',
    requiresSelection: true,
    category: 'editing'
  }
]

// Function for document-level AI assistance (no selection required)
export function buildDocumentLevelPrompt(
  projectContext: ProjectContext,
  documentContext: DocumentContext | undefined,
  sessionContext: string,
  fullDocumentContent: string,
  mode: AIMode,
  customPrompt?: string
): { systemMessage: string; userPrompt: string } {
  
  // Build enhanced system message
  const baseSystem = projectContext.systemPrompt || SYSTEM_MESSAGE
  const projectInstructions = buildProjectInstructions(projectContext)
  const systemMessage = projectInstructions 
    ? `${baseSystem}\n\nPROJECT GUIDELINES:\n${projectInstructions}`
    : baseSystem
  
  // For document-level tasks, we include the full content as context
  const sections = [
    buildProjectContextSection(projectContext),
    buildDocumentContextSection(documentContext),
    buildSessionContextSection(sessionContext),
    `DOCUMENT CONTENT:\n${fullDocumentContent}`,
    `TASK:\n${getTaskInstruction(mode, customPrompt)}`
  ].filter(section => section.trim() !== '')
  
  const userPrompt = sections.join('\n')
  
  return { systemMessage, userPrompt }
}

// Helper function to get mode display info
export function getModeInfo(mode: AIMode) {
  const modes = {
    revise: { label: 'Revise Selection', icon: RefreshCw, description: 'Improve clarity and flow' },
    append: { label: 'Append to Selection', icon: Plus, description: 'Continue the text' },
    continue: { label: 'Continue Story', icon: BookOpen, description: 'Advance the narrative' },
    ideas: { label: 'Generate Ideas', icon: Lightbulb, description: 'Brainstorm possibilities' },
    summarize: { label: 'Summarize', icon: FileText, description: 'Create a summary' },
    focus: { label: 'Focus & Clarify', icon: Target, description: 'Tighten the writing' },
    enhance: { label: 'Add Details', icon: Sparkles, description: 'Enrich with descriptions' },
    custom: { label: 'Custom Prompt', icon: Zap, description: 'Your own instructions' }
  }
  
  return modes[mode] || modes.revise
}