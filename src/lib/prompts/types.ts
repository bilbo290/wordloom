// TypeScript interfaces for the centralized prompt management system

export interface BasePromptConfig {
  id: string
  name: string
  description: string
  systemMessage: string
  temperature?: number
}

export interface TaskPromptConfig extends BasePromptConfig {
  taskInstruction: string
  requiresSelection?: boolean
  mode: 'revise' | 'append' | 'continue' | 'ideas' | 'summarize' | 'focus' | 'enhance' | 'custom'
}

export interface StoryPromptConfig extends BasePromptConfig {
  phase: 'ideation' | 'worldbuilding' | 'characters' | 'outline' | 'chapter' | 'scene' | 'revision'
  contextBuilder?: (project: any, phase?: any, activeElement?: any) => string
}

export interface SynthesisPromptConfig {
  phase: StoryPhase
  systemMessage: string
  promptTemplate: string
  jsonStructure: any
  temperature: number
}

export interface SceneWritingConfig extends BasePromptConfig {
  writingMode: 'fresh' | 'continue' | 'compile' | 'revise'
  continuityRules: string[]
  voiceConsistencyRules: string[]
}

export interface ContextBuilderConfig {
  projectContext: (project: any) => string
  documentContext: (document: any) => string
  sessionContext: (session: string) => string
  immediateContext: (left: string, selected: string, right: string) => string
}

// Core AI modes used throughout the application
export type AIMode = 
  | 'revise' | 'append' | 'continue' | 'ideas' | 'summarize' | 'focus' | 'enhance' | 'custom'
  | 'discuss-story' | 'generate-outline' | 'write-chapter' | 'write-scene' 
  | 'develop-character' | 'build-world'

// Story phases for the Story Writer Mode
export type StoryPhase = 'ideation' | 'worldbuilding' | 'characters' | 'outline' | 'chapter' | 'scene' | 'revision' | 'compilation'

// Scene context types for scene development
export type SceneContext = 'plot' | 'character' | 'setting' | 'dialogue' | 'action' | 'emotion'

// Prompt template interface for reusable prompts
export interface PromptTemplate {
  id: string
  name: string
  description: string
  mode: AIMode
  promptText: string
  requiresSelection: boolean
  category: 'writing' | 'editing' | 'analysis' | 'creative' | 'brainstorming'
}