import { createOpenAI } from '@ai-sdk/openai'

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

export function buildUserPrompt(
  documentContext: string,
  leftContext: string,
  selectedText: string,
  rightContext: string,
  mode: 'revise' | 'append'
) {
  const taskInstruction = mode === 'revise'
    ? 'Revise the SELECTED passage for clarity, rhythm, and precision. Preserve meaning, names, tone, POV, and tense. Output the revised passage ONLY.'
    : 'Continue the SELECTED passage with 80–180 words that flow naturally. Maintain voice, POV, and tense. Output continuation ONLY.'

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