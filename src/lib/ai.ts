import { createOpenAI } from '@ai-sdk/openai'
import { ProjectContext, DocumentContext } from './types'

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
  mode: 'revise' | 'append'
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
    `TASK:\n${getTaskInstruction(mode)}`
  ].filter(section => section.trim() !== '')
  
  const userPrompt = sections.join('\n')
  
  return { systemMessage, userPrompt }
}

function getTaskInstruction(mode: 'revise' | 'append'): string {
  return mode === 'revise'
    ? 'Revise the SELECTED passage for clarity, rhythm, and precision. Preserve meaning, names, tone, POV, and tense. Output the revised passage ONLY.'
    : 'Continue the SELECTED passage with 80–180 words that flow naturally. Maintain voice, POV, and tense. Output continuation ONLY.'
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