// Context builder utilities for constructing AI prompts with hierarchical context

import type { ContextBuilderConfig } from './types'

// Helper functions for building context sections
export function buildProjectInstructions(projectContext: any): string {
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

export function buildProjectContextSection(projectContext: any): string {
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

export function buildDocumentContextSection(documentContext?: any): string {
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

export function buildSessionContextSection(sessionContext: string): string {
  return sessionContext.trim() ? `SESSION NOTES:\n${sessionContext.trim()}\n\n` : ''
}

export function buildImmediateContextSection(
  leftContext: string,
  selectedText: string,
  rightContext: string
): string {
  const sections = [
    leftContext ? `LEFT CONTEXT:\n${leftContext}` : '',
    `SELECTED:\n${selectedText}`,
    rightContext ? `RIGHT CONTEXT:\n${rightContext}` : ''
  ].filter(section => section.trim() !== '')
  
  return sections.join('\n\n')
}

// Enhanced prompt building with hierarchical context
export function buildEnhancedUserPrompt(
  projectContext: any,
  documentContext: any | undefined,
  sessionContext: string,
  leftContext: string,
  selectedText: string,
  rightContext: string,
  taskInstruction: string
): string {
  // Build user prompt with layered context
  const sections = [
    buildProjectContextSection(projectContext),
    buildDocumentContextSection(documentContext),
    buildSessionContextSection(sessionContext),
    `LEFT CONTEXT:\n${leftContext}`,
    `SELECTED:\n${selectedText}`,
    `RIGHT CONTEXT:\n${rightContext}`,
    `TASK:\n${taskInstruction}`
  ].filter(section => section.trim() !== '')
  
  return sections.join('\n')
}

// Build enhanced system message with project guidelines
export function buildEnhancedSystemMessage(
  baseSystemMessage: string,
  projectContext: any
): string {
  const projectInstructions = buildProjectInstructions(projectContext)
  return projectInstructions 
    ? `${baseSystemMessage}\n\nPROJECT GUIDELINES:\n${projectInstructions}`
    : baseSystemMessage
}

// Legacy function for backwards compatibility
export function buildLegacyUserPrompt(
  documentContext: string,
  leftContext: string,
  selectedText: string,
  rightContext: string,
  taskInstruction: string
): string {
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

// Build writing context for scene writing
export function buildWritingContext(
  project: any,
  scene: any,
  chapter?: any
): string {
  const contextSections = []

  // Story-level context
  if (project?.phaseDeliverables?.ideation?.synthesizedIdea) {
    const ideation = project.phaseDeliverables.ideation.synthesizedIdea
    contextSections.push(`STORY PREMISE: ${ideation.corePremise || 'No premise defined'}`)
    contextSections.push(`CENTRAL CONFLICT: ${ideation.centralConflict || 'No central conflict defined'}`)
    
    if (ideation.keyThemes && ideation.keyThemes.length > 0) {
      contextSections.push(`KEY THEMES: ${ideation.keyThemes.join(', ')}`)
    }
  }

  // World context
  if (project?.phaseDeliverables?.worldbuilding?.synthesizedIdea) {
    const world = project.phaseDeliverables.worldbuilding.synthesizedIdea
    contextSections.push(`WORLD OVERVIEW: ${world.worldOverview || 'No world overview'}`)
    
    if (world.worldRules && world.worldRules.length > 0) {
      contextSections.push(`WORLD RULES: ${world.worldRules.join('; ')}`)
    }
  }

  // Character context - get characters involved in this scene
  if (project?.outline?.characters && scene?.characters && scene.characters.length > 0) {
    const relevantCharacters = project.outline.characters
      .filter((char: any) => scene.characters.includes(char.id))
      .map((char: any) => `${char.name} (${char.role || 'unknown'}): ${char.description || 'No description'}${char.motivation ? ` | Motivation: ${char.motivation}` : ''}`)
    
    if (relevantCharacters.length > 0) {
      contextSections.push(`SCENE CHARACTERS:\n${relevantCharacters.join('\n')}`)
    }
  }

  // Chapter context
  if (chapter) {
    contextSections.push(`CHAPTER: ${chapter.title || 'Untitled Chapter'}`)
    if (chapter.summary) {
      contextSections.push(`CHAPTER SUMMARY: ${chapter.summary}`)
    }
    if (chapter.purpose) {
      contextSections.push(`CHAPTER PURPOSE: ${chapter.purpose}`)
    }
  }

  // Scene context
  if (scene) {
    contextSections.push(`SCENE: ${scene.title || 'Untitled Scene'}`)
    if (scene.summary) {
      contextSections.push(`SCENE SUMMARY: ${scene.summary}`)
    }
    if (scene.purpose) {
      contextSections.push(`SCENE PURPOSE: ${scene.purpose}`)
    }
    if (scene.setting) {
      contextSections.push(`SETTING: ${scene.setting}`)
    }
    if (scene.mood) {
      contextSections.push(`MOOD: ${scene.mood}`)
    }

    // Previous scenes for continuity
    if (chapter && chapter.scenes) {
      const sceneIndex = chapter.scenes.findIndex((s: any) => s.id === scene.id)
      if (sceneIndex > 0) {
        const previousScene = chapter.scenes[sceneIndex - 1]
        if (previousScene && previousScene.content) {
          // Take last few paragraphs from previous scene for continuity
          const paragraphs = previousScene.content.split('\n\n')
          const lastParagraphs = paragraphs.slice(-2).join('\n\n')
          if (lastParagraphs.trim()) {
            contextSections.push(`PREVIOUS SCENE ENDING:\n${lastParagraphs}`)
          }
        }
      }
    }
  }

  return contextSections.join('\n\n')
}

// Context builders configuration
export const CONTEXT_BUILDERS: ContextBuilderConfig = {
  projectContext: buildProjectContextSection,
  documentContext: buildDocumentContextSection,
  sessionContext: buildSessionContextSection,
  immediateContext: buildImmediateContextSection
}

// Export utility functions for easy importing
export {
  buildProjectInstructions as buildProjectGuidelines,
  buildEnhancedSystemMessage as enhanceSystemMessage,
  buildEnhancedUserPrompt as buildContextualPrompt
}