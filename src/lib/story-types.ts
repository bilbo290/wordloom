// Story Writer Mode Types and Interfaces

export interface StoryProject {
  id: string
  title: string
  premise: string  // Initial story idea/concept
  genre: 'fantasy' | 'sci-fi' | 'mystery' | 'romance' | 'thriller' | 'literary' | 'horror' | 'historical' | 'other'
  targetLength: 'short' | 'novella' | 'novel'
  targetWordCount?: number
  currentWordCount: number
  outline: StoryOutline
  chatHistory: ChatMessage[]
  settings: StorySettings
  phaseDeliverables: PhaseDeliverables
  createdAt: number
  updatedAt: number
}

// Phase Deliverables - Structured outputs from each phase
export interface PhaseDeliverables {
  ideation?: IdeationOutput
  worldbuilding?: WorldBuildingOutput
  characters?: CharacterDevelopmentOutput
  outline?: OutlineOutput
}

export interface IdeationOutput {
  corePremise: string
  themes: string[]
  keyMessages: string[]
  centralConflict: string
  targetAudience: string
  genreConventions: string[]
  uniqueElements: string[]
  synthesizedAt: number
}

export interface WorldBuildingOutput {
  worldOverview: string
  settingDetails: string[]
  worldRules: string[]
  keyLocations: Location[]
  culturalElements: string[]
  historicalContext: string
  synthesizedAt: number
}

export interface CharacterDevelopmentOutput {
  mainCharacters: CharacterProfile[]
  relationshipDynamics: string[]
  characterArcs: string[]
  voiceNotes: string[]
  synthesizedAt: number
}

export interface OutlineOutput {
  plotStructure: PlotStructure
  chapterSummaries: string[]
  keyPlotPoints: string[]
  pacingNotes: string[]
  synthesizedAt: number
}

export interface StorySettings {
  tone: 'dark' | 'light' | 'serious' | 'humorous' | 'mixed'
  perspective: 'first' | 'third-limited' | 'third-omniscient' | 'second'
  tense: 'past' | 'present' | 'mixed'
  targetAudience: 'children' | 'young-adult' | 'adult' | 'general'
  themes: string[]
}

export interface StoryOutline {
  id: string
  title: string
  summary: string
  synopsis?: string  // Longer form summary
  chapters: ChapterOutline[]
  worldBuilding?: WorldBuilding
  characters?: CharacterProfile[]
  themes?: string[]
  plotStructure?: PlotStructure
}

export interface PlotStructure {
  exposition?: string
  incitingIncident?: string
  risingAction?: string[]
  climax?: string
  fallingAction?: string[]
  resolution?: string
}

export interface WorldBuilding {
  setting: string
  timePeriod: string
  locations: Location[]
  rules?: string[]  // Magic systems, technology, etc.
  culture?: string
  history?: string
}

export interface Location {
  id: string
  name: string
  description: string
  significance: string
}

export interface CharacterProfile {
  id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor'
  description: string
  backstory?: string
  motivation?: string
  arc?: string  // Character development arc
  relationships?: CharacterRelationship[]
  traits: string[]
  firstAppearance?: string  // Chapter/scene ID
}

export interface CharacterRelationship {
  characterId: string
  relationshipType: string  // friend, enemy, lover, family, etc.
  description: string
}

export interface ChapterOutline {
  id: string
  number: number
  title: string
  summary: string
  purpose: string  // What this chapter achieves in the story
  scenes: SceneOutline[]
  characters: string[]  // Character IDs present in this chapter
  targetWordCount?: number
  currentWordCount: number
  status: 'planned' | 'drafting' | 'complete' | 'revised'
  fileId?: string  // Links to actual file in the file system
  notes?: string
}

export interface SceneOutline {
  id: string
  number: number
  title: string
  summary: string
  purpose: string  // What this scene achieves
  setting: string
  characters: string[]  // Character IDs in this scene
  beats: StoryBeat[]  // Key story beats/moments
  mood?: string
  conflict?: string
  outcome?: string
  status: 'planned' | 'written' | 'revised'
  wordCount?: number
  content?: string  // Actual written content
}

export interface StoryBeat {
  id: string
  description: string
  type: 'action' | 'dialogue' | 'description' | 'revelation' | 'emotion'
  impact: 'minor' | 'moderate' | 'major'  // Impact on story
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  phase: StoryPhase
  metadata?: ChatMetadata
}

export type StoryPhase = 
  | 'ideation'      // Initial story concept discussion
  | 'worldbuilding' // Developing the world/setting
  | 'characters'    // Character development
  | 'outline'       // Creating/refining outline
  | 'chapter'       // Chapter-level work
  | 'scene'         // Scene-level work
  | 'revision'      // Editing/revision phase

export interface ChatMetadata {
  chapterId?: string
  sceneId?: string
  characterId?: string
  action?: StoryAction
  context?: string
}

export type StoryAction = 
  | 'discuss_premise'
  | 'develop_character'
  | 'generate_outline'
  | 'refine_outline'
  | 'write_chapter'
  | 'write_scene'
  | 'revise_content'
  | 'brainstorm_ideas'
  | 'expand_worldbuilding'
  | 'analyze_pacing'
  | 'check_consistency'

export interface StoryWriterState {
  activeProject: StoryProject | null
  activePhase: StoryPhase
  activeChapterId: string | null
  activeSceneId: string | null
  isGenerating: boolean
  chatPanelOpen: boolean
  outlinePanelOpen: boolean
  sidebarCollapsed: boolean
}

// Progress tracking
export interface StoryProgress {
  totalChapters: number
  completedChapters: number
  totalScenes: number
  completedScenes: number
  totalWordCount: number
  targetWordCount: number
  percentComplete: number
  lastUpdated: number
}

// Export/Import formats
export interface StoryExport {
  version: string
  project: StoryProject
  files: Array<{
    chapterId: string
    content: string
  }>
  exportDate: number
}

// Story templates
export interface StoryTemplate {
  id: string
  name: string
  description: string
  genre: string
  structure: PlotStructure
  chapterCount: number
  scenesPerChapter: number
  targetWordCount: number
}

// AI Context for story generation
export interface StoryContext {
  project: StoryProject
  currentChapter?: ChapterOutline
  currentScene?: SceneOutline
  previousChapters?: ChapterOutline[]
  nextChapters?: ChapterOutline[]
  relevantCharacters?: CharacterProfile[]
  worldContext?: WorldBuilding
  recentChat?: ChatMessage[]
}

// Revision suggestions
export interface RevisionSuggestion {
  id: string
  type: 'consistency' | 'pacing' | 'character' | 'plot' | 'style'
  severity: 'minor' | 'moderate' | 'major'
  location: {
    chapterId?: string
    sceneId?: string
    characterId?: string
  }
  description: string
  suggestion: string
  example?: string
}

// Story Project Management Functions
export interface StoryProjectManager {
  projects: StoryProject[]
  activeProjectId: string | null
}

export function createEmptyStoryProject(title: string): StoryProject {
  const id = `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  return {
    id,
    title,
    premise: '',
    genre: 'other',
    targetLength: 'novel',
    currentWordCount: 0,
    outline: {
      id: `outline-${id}`,
      title,
      summary: '',
      chapters: []
    },
    chatHistory: [],
    settings: {
      tone: 'mixed',
      perspective: 'third-limited',
      tense: 'past',
      targetAudience: 'adult',
      themes: []
    },
    phaseDeliverables: {},
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

export function getStoryProjects(): StoryProjectManager {
  const saved = localStorage.getItem('wordloom-story-projects')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {
      console.warn('Failed to parse story projects:', e)
    }
  }
  
  return {
    projects: [],
    activeProjectId: null
  }
}

export function saveStoryProjects(manager: StoryProjectManager): void {
  localStorage.setItem('wordloom-story-projects', JSON.stringify(manager))
}

export function deleteStoryProject(projectId: string): void {
  const manager = getStoryProjects()
  manager.projects = manager.projects.filter(p => p.id !== projectId)
  if (manager.activeProjectId === projectId) {
    manager.activeProjectId = null
  }
  saveStoryProjects(manager)
}