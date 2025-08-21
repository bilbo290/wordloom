import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { ProjectContext, DocumentContext, AIMode, PromptTemplate, SmartContextResult } from './types'
import { getSmartContextManager } from './smart-context'
// Import centralized prompts
import {
  CORE_SYSTEM_MESSAGE,
  getTaskInstruction,
  buildEnhancedSystemMessage,
  buildEnhancedUserPrompt,
  buildLegacyUserPrompt,
  DEFAULT_PROMPT_TEMPLATES,
  TEST_CONNECTION_SYSTEM_MESSAGE
} from './prompts'
import { 
  RefreshCw, 
  Plus, 
  BookOpen, 
  Lightbulb, 
  FileText, 
  Target, 
  Sparkles, 
  Zap,
  MessageSquare,
  PenTool,
  Users,
  Globe
} from 'lucide-react'

export type AIProvider = 'lmstudio' | 'ollama'

export function createAIProvider(provider: AIProvider = 'lmstudio') {
  // In development, use proxy to avoid CORS issues
  const isDev = import.meta.env.DEV
  
  if (provider === 'ollama') {
    const baseURL = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1'
    
    return createOpenAICompatible({
      name: 'ollama',
      baseURL,
      apiKey: import.meta.env.VITE_OLLAMA_API_KEY || 'ollama',
    })
  }
  
  // LM Studio provider (default)
  const baseURL = import.meta.env.VITE_OPENAI_BASE_URL || 'http://127.0.0.1:1234/v1'
  
  return createOpenAICompatible({
    name: 'lmstudio',
    baseURL,
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

// Use centralized system message
export const SYSTEM_MESSAGE = CORE_SYSTEM_MESSAGE

// Ollama model interface
export interface OllamaModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details: {
    parameter_size: string
    quantization_level: string
  }
}

// Fetch available Ollama models
export async function fetchOllamaModels(): Promise<OllamaModel[]> {
  try {
    const isDev = import.meta.env.DEV
    const baseURL = isDev 
      ? '/ollama'  // Use proxy in development
      : import.meta.env.VITE_OLLAMA_BASE_URL?.replace('/v1', '') || 'http://127.0.0.1:11434'
    
    const response = await fetch(`${baseURL}/api/tags`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data.models || []
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error)
    throw error
  }
}

// Get model display name and size info
export function getModelDisplayInfo(model: OllamaModel) {
  const name = model.name || model.model
  const sizeGB = (model.size / (1024 * 1024 * 1024)).toFixed(1)
  const parameterSize = model.details?.parameter_size || 'Unknown'
  
  // Extract base model name and variant
  const [baseName, variant] = name.split(':')
  const displayName = baseName.charAt(0).toUpperCase() + baseName.slice(1)
  
  return {
    name,
    displayName,
    variant: variant || 'latest',
    sizeGB: `${sizeGB}GB`,
    parameterSize,
    fullSize: model.size
  }
}

// All context building functions are now imported from centralized prompts

// Enhanced prompt building with hierarchical context (now uses centralized functions)
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
  
  // Build enhanced system message using centralized function
  const baseSystem = projectContext.systemPrompt || SYSTEM_MESSAGE
  const systemMessage = buildEnhancedSystemMessage(baseSystem, projectContext)
  
  // Build user prompt with layered context using centralized function
  const taskInstruction = getTaskInstruction(mode, customPrompt)
  const userPrompt = buildEnhancedUserPrompt(
    projectContext,
    documentContext,
    sessionContext,
    leftContext,
    selectedText,
    rightContext,
    taskInstruction
  )
  
  return { systemMessage, userPrompt }
}

// New smart prompt building for selection-based tasks
export async function buildSmartEnhancedPrompt(
  projectContext: ProjectContext,
  documentContext: DocumentContext | undefined,
  sessionContext: string,
  fullContent: string,
  selectedText: string,
  selectionStart: number,
  selectionEnd: number,
  mode: AIMode,
  customPrompt?: string
): Promise<{ systemMessage: string; userPrompt: string; contextInfo: SmartContextResult }> {
  
  // Get smart context
  const contextManager = getSmartContextManager()
  const smartContext = await contextManager.buildSmartContext(
    projectContext,
    documentContext,
    sessionContext,
    fullContent,
    selectedText,
    selectionStart,
    selectionEnd
  )

  // Build enhanced system message
  const baseSystem = projectContext.systemPrompt || SYSTEM_MESSAGE
  const projectInstructions = buildProjectInstructions(projectContext)
  const systemMessage = projectInstructions 
    ? `${baseSystem}\n\nPROJECT GUIDELINES:\n${projectInstructions}`
    : baseSystem
  
  // Build user prompt with smart context
  const sections = [
    smartContext.projectContext,
    smartContext.documentContext,
    smartContext.sessionContext,
    smartContext.documentSummary,
    smartContext.immediateContext.before ? `LEFT CONTEXT:\n${smartContext.immediateContext.before}` : '',
    `SELECTED:\n${selectedText}`,
    smartContext.immediateContext.after ? `RIGHT CONTEXT:\n${smartContext.immediateContext.after}` : '',
    ...smartContext.semanticChunks.map(chunk => `RELATED CONTEXT:\n${chunk}`),
    `TASK:\n${getTaskInstruction(mode, customPrompt)}`
  ].filter(section => section.trim() !== '')
  
  const userPrompt = sections.join('\n\n')
  
  return { 
    systemMessage, 
    userPrompt,
    contextInfo: smartContext
  }
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
      return 'Write the NEXT part of the story that comes after the SELECTED passage. Do NOT rewrite or repeat the selected text. Write 100-200 words of new content that advances the plot, develops characters, or enhances the narrative. Maintain consistent voice, POV, and tense. Output only the new continuation.'
    case 'ideas':
      return 'Based on the SELECTED passage, generate 3-5 creative ideas for how the story/content could develop next. Include specific suggestions for plot developments, character arcs, themes, or directions. Be creative but consistent with the established tone and context.'
    case 'summarize':
      return 'Create a concise summary of the SELECTED passage. Capture the key points, main ideas, and essential information. Keep the summary clear and well-organized.'
    case 'focus':
      return 'Tighten and clarify the SELECTED passage. Remove unnecessary words, improve sentence structure, and make the writing more precise and impactful. Preserve the original meaning and tone. Output the focused passage ONLY.'
    case 'enhance':
      return 'Enhance the SELECTED passage by adding vivid details, sensory descriptions, and rich imagery. Make the writing more engaging and immersive while maintaining the original structure and meaning. Output the enhanced passage ONLY.'
    // Story Writer Mode specific
    case 'discuss-story':
      return 'Act as a friendly story collaborator and interviewer. Ask ONE focused question at a time to help develop the story. Keep responses to 1-2 sentences max. Focus on one specific aspect: either plot, character, setting, or theme. Be conversational and encouraging.'
    case 'generate-outline':
      return 'Create a detailed story outline with chapters and scenes. Include plot structure, character arcs, and key story beats. Format as a clear, organized outline.'
    case 'write-chapter':
      return 'Write a full chapter based on the provided outline and context. Include vivid descriptions, compelling dialogue, and advance the plot according to the chapter summary.'
    case 'write-scene':
      return 'Write a complete scene based on the scene outline. Focus on the specific story beats, character interactions, and mood described in the scene summary.'
    case 'develop-character':
      return 'Develop detailed character profiles including personality, backstory, motivations, and character arc. Provide rich, compelling character details that serve the story.'
    case 'build-world':
      return 'Expand the world-building with rich details about setting, culture, history, and atmosphere. Create an immersive world that supports the story themes and plot.'
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

// Template definitions are now centralized (re-exported for backward compatibility)
export { DEFAULT_PROMPT_TEMPLATES } from './prompts'

// Function for document-level AI assistance (no selection required) - updated to use centralized functions
export function buildDocumentLevelPrompt(
  projectContext: ProjectContext,
  documentContext: DocumentContext | undefined,
  sessionContext: string,
  fullDocumentContent: string,
  mode: AIMode,
  customPrompt?: string
): { systemMessage: string; userPrompt: string } {
  
  // Build enhanced system message using centralized function
  const baseSystem = projectContext.systemPrompt || SYSTEM_MESSAGE
  const systemMessage = buildEnhancedSystemMessage(baseSystem, projectContext)
  
  // For document-level tasks, we include the full content as context
  const taskInstruction = getTaskInstruction(mode, customPrompt)
  const userPrompt = buildEnhancedUserPrompt(
    projectContext,
    documentContext,
    sessionContext,
    '', // no left context
    fullDocumentContent, // treat full document as "selected"
    '', // no right context
    taskInstruction
  )
  
  return { systemMessage, userPrompt }
}

// New smart document-level prompt building (updated to use centralized functions)
export async function buildSmartDocumentLevelPrompt(
  projectContext: ProjectContext,
  documentContext: DocumentContext | undefined,
  sessionContext: string,
  fullDocumentContent: string,
  mode: AIMode,
  customPrompt?: string
): Promise<{ systemMessage: string; userPrompt: string; contextInfo: SmartContextResult }> {
  
  // Get smart context (no selection for document-level tasks)
  const contextManager = getSmartContextManager()
  const smartContext = await contextManager.buildSmartContext(
    projectContext,
    documentContext,
    sessionContext,
    fullDocumentContent
  )

  // Build enhanced system message using centralized function
  const baseSystem = projectContext.systemPrompt || SYSTEM_MESSAGE
  const systemMessage = buildEnhancedSystemMessage(baseSystem, projectContext)
  
  // Build user prompt with smart context (using summary instead of full content)
  const sections = [
    smartContext.projectContext,
    smartContext.documentContext,
    smartContext.sessionContext,
    smartContext.documentSummary,
    ...smartContext.semanticChunks.map(chunk => `DOCUMENT SECTION:\n${chunk}`),
    `TASK:\n${getTaskInstruction(mode, customPrompt)}`
  ].filter(section => section.trim() !== '')
  
  const userPrompt = sections.join('\n\n')
  
  return { 
    systemMessage, 
    userPrompt,
    contextInfo: smartContext
  }
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
    custom: { label: 'Custom Prompt', icon: Zap, description: 'Your own instructions' },
    // Story Writer Mode specific
    'discuss-story': { label: 'Discuss Story', icon: MessageSquare, description: 'Collaborate on story concepts' },
    'generate-outline': { label: 'Generate Outline', icon: FileText, description: 'Create story structure' },
    'write-chapter': { label: 'Write Chapter', icon: BookOpen, description: 'Write full chapter content' },
    'write-scene': { label: 'Write Scene', icon: PenTool, description: 'Craft specific scenes' },
    'develop-character': { label: 'Develop Character', icon: Users, description: 'Build character profiles' },
    'build-world': { label: 'Build World', icon: Globe, description: 'Expand world-building' }
  }
  
  return modes[mode] || modes.revise
}