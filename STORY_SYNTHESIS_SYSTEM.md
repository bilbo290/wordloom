# Story Writer Mode: Phase-Based Synthesis System

## Overview

The Story Writer Mode implements a sophisticated phase-based story development system that guides users through structured conversations with AI to build comprehensive story foundations. Each phase synthesizes user discussions into structured data that informs subsequent phases, creating a coherent story development pipeline.

## System Architecture

### Phase Progression Flow
```
Ideation → World Building → Character Development → Story Outline → Chapter Writing → Scene Writing → Revision
```

### Core Components

1. **Chat Interface** (`StoryChat.tsx`) - Conversational AI interface
2. **Phase Deliverables** (`PhaseDeliverables.tsx`) - Synthesis UI and output display  
3. **Phase Sidebar** (`PhaseSidebar.tsx`) - Previous phase context display
4. **Story Writer Mode** (`StoryWriterMode.tsx`) - Main orchestration and state management

## Phase-Based Synthesis Process

### 1. Story Foundation (Ideation Phase)

#### Conversation Requirements
- **Threshold**: 2+ user messages tagged with `phase: 'ideation'`
- **Purpose**: Establish core story elements and themes
- **AI Guidance**: Asks focused questions about premise, themes, conflict

#### Synthesis Output Structure
```typescript
interface IdeationOutput {
  synthesizedIdea: {
    corePremise: string           // Main story concept
    themes: string[]              // Core themes explored
    keyMessages: string[]         // Message/meaning of story
    centralConflict: string       // Primary conflict driving narrative
    targetAudience: string        // Intended readership
    genreConventions: string[]    // Genre elements to include
    uniqueElements: string[]      // What makes this story distinctive
  }
  recommendations: Array<{
    area: string                  // Aspect needing development
    suggestion: string            // Specific improvement advice
    score: number                 // Development level (1-10)
    priority: 'low'|'medium'|'high'
  }>
  synthesizedAt: number
}
```

#### Synthesis Prompt Template
```
Analyze this story ideation conversation and synthesize the key elements.
Return ONLY valid JSON with this exact structure: [structure above]

CONVERSATION:
[user/assistant message pairs from ideation phase]

Analyze the conversation and extract the core story elements. 
Provide 3-5 specific recommendations for areas that need development. 
Rate each area from 1-10 based on how well-developed it is.
```

### 2. World Building Phase

#### Conversation Requirements  
- **Threshold**: 2+ user messages tagged with `phase: 'worldbuilding'`
- **Purpose**: Develop setting, rules, and environmental context
- **AI Guidance**: Explores setting details, magic systems, cultural elements

#### Synthesis Output Structure
```typescript
interface WorldBuildingOutput {
  synthesizedIdea: {
    worldOverview: string         // High-level world description
    settingDetails: string[]      // Specific environmental details
    worldRules: string[]          // Magic systems, physics, etc.
    keyLocations: Location[]      // Important places in the world
    culturalElements: string[]    // Social/cultural aspects
    historicalContext: string     // World's history and background
  }
  recommendations: Array<{
    area: string
    suggestion: string
    score: number
    priority: 'low'|'medium'|'high'
  }>
  synthesizedAt: number
}
```

#### Context Integration
The world building synthesis includes **previous phase context**:

```typescript
const buildPreviousPhaseContext = (currentPhase: StoryPhase): string => {
  // For worldbuilding phase, includes:
  // - Core Premise from ideation
  // - Central Conflict from ideation  
  // - Themes from ideation
  // - Unique Elements from ideation
}
```

#### Enhanced Synthesis Prompt
```
Analyze this world building conversation and synthesize the key elements. 
Consider the story foundation from previous phases to ensure consistency.

PREVIOUS PHASE CONTEXT:
=== IDEATION PHASE OUTPUT ===
Core Premise: [from ideation synthesis]
Central Conflict: [from ideation synthesis]
Themes: [from ideation synthesis]
Unique Elements: [from ideation synthesis]

CONVERSATION:
[user/assistant message pairs from worldbuilding phase]

Ensure the world supports the core premise and themes from the ideation phase.
Evaluate how well the world building serves the central conflict.
```

### 3. Character Development Phase

#### Conversation Requirements
- **Threshold**: 2+ user messages tagged with `phase: 'characters'`
- **Purpose**: Develop protagonists, antagonists, and supporting characters
- **AI Guidance**: Character personalities, motivations, relationships, arcs

#### Synthesis Output Structure
```typescript
interface CharacterDevelopmentOutput {
  mainCharacters: CharacterProfile[]  // Detailed character information
  relationshipDynamics: string[]      // How characters interact
  characterArcs: string[]             // Character growth trajectories
  voiceNotes: string[]               // Writing voice considerations
  recommendations: Array<{
    area: string
    suggestion: string
    score: number
    priority: 'low'|'medium'|'high'
  }>
  synthesizedAt: number
}

interface CharacterProfile {
  id: string
  name: string
  role: 'protagonist'|'antagonist'|'supporting'|'minor'
  description: string
  motivation: string
  arc: string
  traits: string[]
  backstory: string
  relationships: CharacterRelationship[]
}
```

#### Context Integration
Characters synthesis includes context from **both previous phases**:

```typescript
// Includes ideation AND worldbuilding context
PREVIOUS PHASE CONTEXT:
=== IDEATION PHASE OUTPUT ===
Core Premise: [...]
Central Conflict: [...]
Themes: [...]

=== WORLDBUILDING PHASE OUTPUT ===
World Overview: [...]
World Rules: [...]
Key Locations: [...]
```

## Technical Implementation

### Message Tagging System

Every chat message is tagged with the current phase:

```typescript
const userChatMessage: ChatMessage = {
  id: crypto.randomUUID(),
  role: 'user',
  content: userMessage.content,
  timestamp: Date.now(),
  phase,  // Current active phase
  metadata: {
    chapterId: activeChapterId || undefined,
    sceneId: activeSceneId || undefined
  }
}
```

### Real-Time Synthesis Detection

The system uses React state to detect when synthesis is possible:

```typescript
const canSynthesizeCurrentPhase = useMemo(() => {
  const chatHistory = project.chatHistory || []
  const phaseMessages = chatHistory.filter(msg => 
    msg.phase === currentPhase && msg.role === 'user'
  )
  return phaseMessages.length >= 2
}, [project.chatHistory, project.id, currentPhase])
```

### State Race Condition Prevention

Uses functional state updates to prevent user messages from being overwritten:

```typescript
const addChatMessage = (message: ChatMessage) => {
  setState(prevState => {
    if (!prevState.activeProject) return prevState
    
    const updatedChatHistory = [...prevState.activeProject.chatHistory, message]
    const updatedProject = {
      ...prevState.activeProject,
      chatHistory: updatedChatHistory,
      updatedAt: Date.now()
    }

    return {
      ...prevState,
      activeProject: updatedProject
    }
  })
}
```

### Data Persistence

Phase deliverables are stored in the project structure:

```typescript
interface StoryProject {
  // ... other fields
  phaseDeliverables: {
    ideation?: IdeationOutput
    worldbuilding?: WorldBuildingOutput  
    characters?: CharacterDevelopmentOutput
    outline?: OutlineOutput
  }
}
```

## UI/UX Flow

### 1. Discussion Phase
- User and AI have natural conversation about current phase topic
- System tracks message count per phase in real-time
- UI shows "Keep Discussing" state until threshold reached

### 2. Synthesis Ready
- When 2+ user messages reached: UI shows "Ready to Synthesize"
- "Synthesize Discussion" button becomes available
- Button click triggers AI analysis of conversation

### 3. Synthesis Processing  
- Button shows "Synthesizing..." with spinner
- AI analyzes conversation using phase-specific prompts
- Previous phase context automatically included in prompts

### 4. Results Display
- Structured output displayed in organized sections
- Recommendations highlight areas needing development
- "Continue to [Next Phase]" button enables progression

### 5. Phase Context Integration
- Previous phase outputs visible in sidebar
- Collapsible sections show summaries of completed phases
- Context automatically feeds into subsequent phase prompts

## Phase Sidebar Implementation

### Visual Context Display

The `PhaseSidebar.tsx` component provides visual representation of phase progress:

```typescript
const getPhaseStatus = (phase: StoryPhase): 'complete' | 'current' | 'upcoming' => {
  if (project.phaseDeliverables?.[phase]) return 'complete'
  if (phase === currentPhase) return 'current'  
  return 'upcoming'
}
```

### Collapsible Content
- **Complete phases**: Show expandable summaries with key points
- **Current phase**: Highlighted with "in progress" indicator
- **Future phases**: Show "Not started" state

### Context Summaries
Each completed phase shows condensed information:
- **Ideation**: Core premise, themes, central conflict, top recommendation
- **World Building**: World overview, key locations, top recommendation  
- **Characters**: Main characters, relationship dynamics, top recommendation

## Error Handling & Edge Cases

### Message Validation
- Ensures messages have proper phase tagging
- Validates JSON structure in synthesis outputs
- Handles malformed AI responses gracefully

### State Consistency
- Prevents race conditions with functional state updates
- Maintains chat history integrity across phase switches
- Preserves synthesis outputs when switching between phases

### Fallback Behaviors
- Shows helpful prompts when insufficient messages for synthesis
- Provides clear error messages for synthesis failures
- Allows manual retry of failed synthesis attempts

## Best Practices

### Conversation Guidance
- AI asks **one focused question at a time** during discussions
- Responses kept to 1-2 sentences to maintain conversation flow
- Questions build naturally on previous user responses

### Synthesis Quality
- Prompts emphasize **consistency** with previous phases
- Recommendations prioritized by importance and development level
- JSON structure strictly enforced for reliable parsing

### User Experience
- **Immediate feedback** when synthesis becomes available
- **Progressive disclosure** of complexity through phases
- **Visual progress tracking** via phase sidebar and status indicators

## Future Enhancements

### Potential Improvements
1. **Custom synthesis prompts** - Allow users to modify AI instructions
2. **Synthesis regeneration** - Re-run synthesis with different parameters
3. **Phase branching** - Allow non-linear progression through phases
4. **Export integration** - Direct export of synthesized story elements
5. **Collaborative features** - Multi-user story development sessions

### Technical Optimizations
1. **Incremental synthesis** - Update outputs as conversation continues
2. **Smart context truncation** - Manage prompt size for long conversations  
3. **Synthesis caching** - Store and reuse synthesis results
4. **Real-time collaboration** - WebSocket-based multi-user editing

---

This synthesis system creates a guided, structured approach to story development that leverages AI assistance while maintaining user creative control and ensuring narrative coherence across all phases of the writing process.