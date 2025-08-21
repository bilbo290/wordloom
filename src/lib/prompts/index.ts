// Centralized Prompt Management System
// Single source of truth for all AI system prompts and configurations

// Types
export * from './types'

// Core Editor Prompts
export {
  CORE_SYSTEM_MESSAGE,
  TASK_INSTRUCTIONS,
  CORE_TASK_PROMPTS,
  DEFAULT_PROMPT_TEMPLATES,
  TEST_CONNECTION_SYSTEM_MESSAGE,
  getTaskInstruction,
  getCoreSystemMessage,
  getCoreTaskPrompt
} from './core-prompts'

// Story Writer Prompts  
export {
  STORY_WRITER_BASE_MESSAGE,
  STORY_PHASE_CONFIGS,
  buildStorySystemMessage,
  buildPreviousPhaseContextForChat,
  getStoryPhaseSystemMessage,
  getStoryPhaseTemperature
} from './story-prompts'

// Scene Writing Prompts
export {
  SCENE_WRITING_SYSTEM_MESSAGE,
  SCENE_CHAT_SYSTEM_MESSAGE,
  SCENE_REVISION_SYSTEM_MESSAGE,
  SCENE_PARAGRAPH_SYSTEM_MESSAGE,
  SCENE_CONTEXT_DESCRIPTIONS,
  SCENE_CONTEXT_ACTIONS,
  SCENE_WRITING_CONFIGS,
  buildSceneContext,
  getContextDescription,
  getActionForContext,
  buildSceneWritingSystemMessage,
  buildSceneChatSystemMessage,
  buildSceneRevisionPrompt,
  buildSceneGenerationPrompt
} from './scene-prompts'

// Synthesis Prompts
export {
  SYNTHESIS_SYSTEM_MESSAGE,
  SCENE_SYNTHESIS_SYSTEM_MESSAGE,
  SYNTHESIS_CONFIGS,
  buildSynthesisPrompt,
  buildSceneSynthesisPrompt,
  buildPreviousPhaseContext,
  getSynthesisConfig,
  getSynthesisSystemMessage,
  getSynthesisTemperature
} from './synthesis-prompts'

// Context Builders
export {
  CONTEXT_BUILDERS,
  buildProjectInstructions,
  buildProjectContextSection,
  buildDocumentContextSection,
  buildSessionContextSection,
  buildImmediateContextSection,
  buildEnhancedUserPrompt,
  buildEnhancedSystemMessage,
  buildLegacyUserPrompt,
  buildWritingContext,
  buildProjectGuidelines,
  enhanceSystemMessage,
  buildContextualPrompt
} from './context-builders'

// Note: Convenience functions and quick access objects removed to prevent import issues
// All functionality is available through direct imports of the specific modules