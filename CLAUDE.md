Project: Wordloom
Local-first text editor for any document (blogs, docs, notes, fiction) with select → ask AI → replace or append.
Stack: Bun + Vite + React + TypeScript + Tailwind + shadcn/ui + Vercel AI SDK (OpenAI-compatible to LM Studio & Ollama).
Default theme: Dark, with Light/Dark toggle (persistent).

Goals (What to build)
A working web app with:

**Session Management Sidebar (left panel)**: Folder/file hierarchy for organizing documents. Users can create folders, create files within folders, rename/delete both. All session data persists to localStorage.

**Block-based Editor (center)**: Line-numbered editor with textarea for natural text input. Users click line numbers to select lines/blocks (single click, shift-extend, ctrl-toggle). Visual highlighting shows selected lines.

**Selection workflow**: user selects lines → chooses AI provider (LM Studio/Ollama) → chooses Revise or Append → streams AI output → apply to selection (replace or append) with caret reposition.

**Right panel** for Document Context and Live Preview (streaming).

**Header** with app title, theme toggle, and Settings link.

Settings page with:

Instructions for .env.local (LM Studio or Ollama base URL/model).

AI provider selection dropdown to switch between LM Studio and Ollama.

"Test Connection" button to call the model and show a short success reply.

Dark theme default with a persistent light/dark toggle (localStorage).

Entire project runnable via Bun:

bun install

bun run dev

Tech & Libraries
Package manager/runtime: Bun (no npm).

Build: Vite.

UI: React + TypeScript.

Styling: Tailwind CSS (dark mode via class).

Components: shadcn/ui (Radix + Tailwind; local components).

Icons: lucide-react.

AI: Vercel AI SDK → ai, @ai-sdk/openai.

Model host: LM Studio or Ollama (OpenAI-compatible local servers).

Environment & Model
Use .env.local with support for both providers:

**LM Studio Configuration:**
```ini
VITE_OPENAI_BASE_URL=http://127.0.0.1:1234/v1
VITE_OPENAI_API_KEY=lm-studio
VITE_OPENAI_MODEL=lmstudio
```

**Ollama Configuration:**
```ini
VITE_OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
VITE_OLLAMA_API_KEY=ollama
VITE_OLLAMA_MODEL=gemma3:4b
```

Notes:

Both providers can be configured simultaneously.

Base URLs may differ depending on provider config; allow override.

API keys can be dummy strings (both providers typically don't enforce).

Model strings should be user-editable and match available models.

File Structure (implemented)
```
/
├─ index.html
├─ package.json
├─ bun.lock
├─ tsconfig.json
├─ tsconfig.node.json
├─ vite.config.ts
├─ postcss.config.js
├─ tailwind.config.ts
├─ .env.example
├─ .env.local
├─ src/
│  ├─ main.tsx
│  ├─ index.css
│  ├─ lib/
│  │  ├─ ai.ts          (AI integration)
│  │  ├─ session.ts     (session management utilities)
│  │  ├─ types.ts       (TypeScript interfaces)
│  │  └─ utils.ts       (utilities)
│  ├─ components/
│  │  ├─ Sidebar.tsx    (file/folder management)
│  │  ├─ theme-toggle.tsx
│  │  ├─ editor/
│  │  │  ├─ MonacoEditor.tsx    (main editor with Monaco)
│  │  │  ├─ BlockEditor.tsx      (textarea editor for forms)
│  │  │  ├─ LineNumber.tsx       (clickable line numbers for BlockEditor)
│  │  │  ├─ EditorLine.tsx       (deprecated - kept for reference)
│  │  │  └─ SelectionToolbar.tsx (bottom toolbar)
│  │  └─ ui/ (shadcn components: button, card, textarea, input, select, badge, separator, dropdown-menu, tooltip, use-toast, etc.)
│  └─ routes/
│     ├─ EditorWithSidebar.tsx   (main editor page)
│     ├─ Editor.tsx              (legacy - single file version)
│     └─ Settings.tsx
└─ README.md
```

## Session Management System

**Data Structure**: Use TypeScript interfaces for type safety:

```typescript
interface FileItem {
  id: string
  name: string
  content: string
  createdAt: number
  updatedAt: number
}

interface FolderItem {
  id: string
  name: string
  files: FileItem[]
  createdAt: number
  isExpanded?: boolean
}

interface SessionState {
  folders: FolderItem[]
  activeFileId: string | null
  activeFolderId: string | null
}
```

**Storage**: 
- **Primary**: File System Access API (when supported) saves directly to user's Documents folder
- **Fallback**: localStorage key `wordloom-session` for browser storage
- **Hybrid**: Automatic sync between file system and localStorage
- **Auto-save**: Every 500ms after changes

**OS-Specific Default Paths**:
- Windows: `C:\Users\<username>\Documents\Wordloom\`
- macOS: `~/Documents/Wordloom/`
- Linux: `~/Documents/Wordloom/`

**Sidebar Interactions**:
- Click folder chevron: expand/collapse
- Click file name: switch to that file
- Folder+ button: create new folder with default file
- File+ button: create new file in folder
- ⋮ menu: rename/delete operations
- Inline editing: Enter to save, Escape to cancel

**Default Session**: App starts with "My Project" folder containing "Untitled.txt"

## Hierarchical Context Management System

**Architecture**: 3-tier context inheritance system for enhanced AI prompts and consistent writing guidance.

**Context Hierarchy**:
```
Project Context (Global)
    ↓ inherits
Document Context (Per File) 
    ↓ inherits
Session Context (Current UI)
```

**Data Structures**:
```typescript
interface ProjectContext {
  id: string
  name: string
  description?: string
  genre?: 'fiction' | 'non-fiction' | 'technical' | 'blog' | 'academic' | 'business' | 'other'
  style?: 'formal' | 'casual' | 'technical' | 'creative' | 'journalistic' | 'conversational'
  audience?: string
  systemPrompt?: string
  constraints?: string
  customFields?: Record<string, string>
  createdAt: number
  updatedAt: number
}

interface DocumentContext {
  fileId: string
  purpose?: string
  status?: 'draft' | 'review' | 'final' | 'archived'
  documentNotes?: string
  customFields?: Record<string, string>
  createdAt: number
  updatedAt: number
}

interface SessionState {
  folders: FolderItem[]
  activeFileId: string | null
  activeFolderId: string | null
  projectContext: ProjectContext
  documentContexts: Record<string, DocumentContext>
}
```

**UI Components**:
- **ProjectSettingsModal**: Full project configuration with genre, style, audience, constraints, custom system prompts, and extensible custom fields
- **ContextTabs**: Enhanced right panel with Context and Preview tabs
- **DocumentContextForm**: File-specific context editing (purpose, status, notes, custom fields)
- **ContextHierarchy**: Visual representation of context inheritance flow

**Context Merging Algorithm**:
- **System Message**: Base system prompt + project guidelines (genre, style, audience, constraints)
- **User Prompt**: Layered sections in order:
  1. Project context (name, description, custom fields)
  2. Document context (purpose, status, notes, custom fields)  
  3. Session notes (current textarea input)
  4. Left context (±800 chars before selection)
  5. Selected text
  6. Right context (±800 chars after selection)
  7. Task instruction (revise/append)

**Migration & Compatibility**:
- **Automatic Migration**: Existing sessions upgrade seamlessly on load
- **Backwards Compatible**: Legacy sessions create default project context
- **Data Preservation**: All existing content and file structures maintained
- **Graceful Fallbacks**: Works without project/document context configured

**Usage Workflows**:
1. **Project Setup**: Configure writing guidelines once via "Project Settings" modal
2. **Document Customization**: Set file-specific context via document form
3. **Session Notes**: Add temporary context for current editing session
4. **AI Integration**: Enhanced prompts automatically merge all context layers
5. **Inheritance**: Document inherits project settings, session inherits both

**Benefits**:
- **Consistency**: Project-wide guidelines maintain voice across files
- **Flexibility**: File-specific customization when needed
- **Clarity**: Visual hierarchy shows exactly what context AI receives
- **Quality**: Richer context improves AI output relevance and accuracy

Theming Requirements
Tailwind config: darkMode: 'class'.

Default to dark. On first load, set document.documentElement.classList.add('dark') unless localStorage sets theme=light.

Add a ThemeToggle component (shadcn/ui + DropdownMenu or simple toggle) that:

Toggles dark class on document.documentElement.

Saves choice to localStorage.setItem('theme', 'dark'|'light').

Reads choice on init.

## Block-Based Selection System

**Editor Architecture**: 
- **Main Column**: Use Monaco Editor (@monaco-editor/react) for professional text editing with built-in line numbers, syntax highlighting, and advanced features
- **Form Inputs**: Use BlockEditor (textarea-based) for smaller text inputs like context forms, session notes, and other UI components

**Line Selection Methods** (Monaco Editor):
- **Single click**: Select one line via line number gutter
- **Shift+click**: Extend selection to range
- **Ctrl/Cmd+click**: Toggle line in selection
- **Cursor position**: Auto-highlight current line

**Visual Feedback**: 
- Selected lines get custom decorations with `bg-accent/20` background
- Line numbers show selection state in gutter
- Cursor position automatically updates line selection

**Technical Implementation**: 
- Monaco Editor for main text editing with custom theme integration
- BlockEditor (textarea) for form inputs and smaller text areas
- Custom line decorations for selection highlighting
- Theme synchronization between light/dark modes

Core UX Flow
User types/pastes into the Monaco Editor (main column).

User selects text blocks by clicking line numbers (or natural text selection).

User triggers Run AI with:

Mode = Revise or Append.

Temperature input (0–2, default 0.7).

Build prompt using:

Document Context (right panel textarea).

±800 chars left/right context around the selection.

The selected block itself.

Mode-specific task:

Revise: “Improve clarity/flow/precision while preserving meaning & voice. Output revised passage ONLY.”

Append: “Continue the selected passage with 80–180 words in same style. Output continuation ONLY.”

Use AI SDK streamText to stream output into Live Preview.

On completion:

Revise → replace selected text with AI output.

Append → append AI output to the selected text.

Move caret to end of inserted content.

Provide Insert Preview button to commit current stream mid-way if desired.

Auto-save each file's content to session storage (debounced).

## Technical Lessons Learned

**ContentEditable Issues**: 
- `contentEditable` with `dangerouslySetInnerHTML` causes cursor positioning problems
- Characters can appear in wrong positions or at the beginning instead of cursor location
- Solution: Use native `<textarea>` element for text input

**Cursor Synchronization**:
- Listen to `onClick`, `onKeyUp`, `onChange` events to track cursor position
- Calculate current line from `selectionStart` position
- Auto-update line selection based on cursor location
- Prevent infinite loops by checking if selection actually changed

**Line Number Overlay**:
- Position line numbers as separate clickable elements
- Use fixed line height (`1.5rem`) to align with textarea text
- Handle keyboard modifiers (Shift, Ctrl/Cmd) for selection modes
- Use `setTimeout` for cursor position updates after DOM changes

**Multi-file Storage**:
- Migrate from single `wordloom-doc` key to `wordloom-session` structure
- Each file maintains independent content, timestamps
- Session includes active file/folder IDs for state restoration

**File System Integration**:
- Use File System Access API when available (Chrome 86+, Edge 86+)
- Direct file system access provides native-app experience
- Files saved as individual text files in folder structure
- Metadata stored alongside files (.meta.json files)
- Graceful fallback to localStorage when API unavailable
- Import/export functionality for session backup/restore

**Scrollbar & UI Responsiveness Patterns**:
- **Dark Theme Scrollbar Issues**: Default browser scrollbars become invisible in dark themes
- **Solution Pattern**: Always implement custom scrollbar styling for theme compatibility
- **Cross-browser Support**: Use both `scrollbar-width: thin` (Firefox) and `-webkit-scrollbar` (Chrome/Safari)
- **Enhanced Scrollbar Class**:
```css
.enhanced-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.4) hsl(var(--background) / 0.2);
  scroll-behavior: smooth;
}
.enhanced-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
.enhanced-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, hsl(var(--muted-foreground) / 0.4), hsl(var(--muted-foreground) / 0.6));
  border-radius: 6px;
  transition: all 0.3s ease;
}
.enhanced-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, hsl(var(--primary) / 0.6), hsl(var(--primary) / 0.8));
  box-shadow: 0 0 8px hsl(var(--primary) / 0.3);
}
```

**Resizable UI Components**:
- **Height Constraints**: Avoid `max-height` when implementing resize - use `min-height` with `resize: vertical`
- **Textarea Resize**: Apply `resizable` class, remove rigid height constraints, maintain `min-height` for usability
- **Container Resize**: Use `resizable-both` for editors/previews that benefit from width/height adjustment
- **Custom Resize Handles**: Style `::-webkit-resizer` with gradients to match app aesthetics
- **Component-Specific Strategy**:
  - Textareas: `resize: vertical` only
  - Editor containers: `resize: both` for maximum flexibility  
  - Preview areas: `resize: both` for content readability
  - Line-numbered editors: Apply resize to container, not textarea itself

Prompts (use these exact shapes)
System message:

sql
Copy
Edit
You are a precise writing/editor assistant for any document (blogs, docs, notes, fiction).
Respect the author’s style, POV, tense, and constraints.
Output ONLY the prose requested — no explanations.
User content template:

css
Copy
Edit
DOCUMENT CONTEXT:
{documentContextOrPlaceholder}

LEFT CONTEXT:
{leftContextUpTo800Chars}

SELECTED:
{selectedText}

RIGHT CONTEXT:
{rightContextUpTo800Chars}

TASK:
{taskInstructionBasedOnMode}
Where:

taskInstructionBasedOnMode is one of:

Revise: Revise the SELECTED passage for clarity, rhythm, and precision. Preserve meaning, names, tone, POV, and tense. Output the revised passage ONLY.

Append: Continue the SELECTED passage with 80–180 words that flow naturally. Maintain voice, POV, and tense. Output continuation ONLY.

AI SDK Integration
File: src/lib/ai.ts

**Multi-Provider System:**

```typescript
import { createOpenAI } from '@ai-sdk/openai';

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
```

**Usage:**

```typescript
import { streamText } from 'ai';
import { createAIProvider, getModel } from '../lib/ai';

const provider = createAIProvider('ollama') // or 'lmstudio'
const model = getModel('ollama') // or 'lmstudio'

const { textStream } = streamText({
  model: provider.chat(model),
  temperature, // number
  messages: [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userPayload },
  ],
});
```
Stream handling: accumulate tokens into a preview state, render live.

Settings Page Behavior
Show current env values (mask API key).

Instructions to edit .env.local.

Test Connection button:

Sends a tiny request (messages with “Say a one-sentence hello.”).

Shows success or error toast.

LM Studio note: ensure Local Server is enabled and a model is loaded.

CORS & Dev Notes
Prefer direct calls to VITE_OPENAI_BASE_URL.

If CORS issues arise, include a commented example in vite.config.ts showing how to proxy /v1 to http://127.0.0.1:1234.

Keyboard & Context Menu
Cmd/Ctrl + Enter → run AI for current selection.

Optional: right-click context menu with “Revise with AI” / “Append with AI”.

Error Handling
Use shadcn/ui toast for errors.

Surface:

LM Studio unreachable / bad base URL.

Missing selection.

Empty AI output.

Performance & Limits
Trim contexts to ±800 chars (configurable).

Debounce localStorage saves (e.g., 300–600ms).

Avoid sending huge documents to the model.

Acceptance Criteria (for Claude)
bun install then bun run dev starts the app with no TypeScript errors.

At /:

Typing works, content persists.

Selecting text + Run AI streams output to preview and applies correctly.

Mode switch changes behavior (Revise vs Append).

Theme toggle persists across reload.

At /settings:

Shows env info, LM Studio instructions.

Test Connection returns a sentence when LM Studio is running.

Code quality:

Clear React components, typed props, basic accessibility.

No extraneous console noise.

shadcn/ui components included locally.

Commands (Bun)
Install deps: bun install

Dev server: bun run dev

Build: bun run build

Preview: bun run preview

Dependencies (expected)
react, react-dom, react-router-dom

typescript, vite

tailwindcss, postcss, autoprefixer

ai, @ai-sdk/openai

clsx, class-variance-authority, tailwind-merge

lucide-react

@radix-ui/react-* (for the shadcn/ui components used)

Tailwind & shadcn Setup (instructions to include in README)
Initialize Tailwind: config + index.css with @tailwind base; @tailwind components; @tailwind utilities;.

darkMode: 'class' in tailwind.config.ts.

Add shadcn/ui with required components (button, card, textarea, input, select, dropdown-menu, tooltip, badge, separator, use-toast).

Provide a ThemeToggle component.

UI Details (implemented)
**Header**: App title "Wordloom", Settings link, ThemeToggle.

**Layout**: Three columns (sidebar | editor | right panel).

**Left Sidebar**: File management with folder/file tree, create/rename/delete operations, expandable folders.

**Center Editor**: 
- File breadcrumb path at top
- Line-numbered textarea with block selection
- Natural text input with cursor-based line highlighting

**Right Panel**: Document Context textarea; Live Preview card (streaming); buttons for Insert Preview + Clear.

**Bottom Toolbar**: AI Provider selector (LM Studio/Ollama), Mode select (Revise/Append), Temperature slider, Run AI button. Only visible when text is selected.

Do & Don’t
Do

Stream output smoothly.

Keep UI minimal, modern, and keyboard-friendly.

Persist theme and document content.

Don’t

Output explanatory text from the model (prose only).

Hard-code Windows/Mac-specific paths.

Rely on external CDNs for shadcn/ui.

Features Implemented
✅ **Multi-document management**: Folder/file hierarchy with file system persistence  
✅ **Block-based selection**: Line-number clicking with visual highlighting  
✅ **Session management**: Create, rename, delete files and folders  
✅ **Natural text editing**: Fixed cursor positioning issues with textarea approach  
✅ **Auto-save per file**: Individual file content persistence to file system + localStorage
✅ **File switching**: Maintain state across different documents  
✅ **File System Access**: Direct save to OS Documents folder with fallback to browser storage
✅ **Import/Export**: Backup and restore entire document collections
✅ **OS Integration**: Platform-specific default paths and native file experience  
✅ **Dual AI Provider Support**: Switch between LM Studio and Ollama with provider selection UI
✅ **Dynamic Configuration**: Environment variables for both providers with real-time switching
✅ **Modern UI/UX Enhancement**: Complete visual transformation from basic to premium design

## UI/UX Enhancement System (December 2024)

**Visual Design Language**: Modern, glass morphism aesthetic with gradient accents and smooth animations throughout the interface.

**Animation System**: Custom Tailwind utilities for consistent micro-interactions:
```css
@layer utilities {
  .animate-fade-in { animation: fade-in 0.3s ease-out; }
  .animate-slide-up { animation: slide-up 0.2s ease-out; }
  .animate-pulse-subtle { animation: pulse-subtle 2s infinite; }
  .animate-writing { animation: writing-pulse 1.5s infinite; }
}
```

**Glass Morphism Effects**: Backdrop blur with transparency for modern depth:
```css
.glass { @apply backdrop-blur-md bg-background/80 border border-white/10; }
.glass-strong { @apply backdrop-blur-lg bg-background/90 border border-white/20; }
```

**Enhanced Component Styling**:
- **Header**: Gradient brand identity with Sparkles icon and "AI-Powered Writing" tagline
- **Sidebar**: Colored file/folder icons (amber folders, blue files) with smooth hover effects
- **Editor**: Animated line selection with gradient backgrounds and border accents
- **Right Panel**: Glass morphism cards with gradient headers and enhanced preview area
- **Toolbar**: Visual grouping with gradient buttons and improved state indicators

**Loading States**: Professional loading screens with branded spinners and smooth transitions.

**Visual Feedback**: Enhanced selection highlighting, hover effects, and status indicators throughout.

**Implementation Notes**:
- All animations work in both light and dark modes
- Consistent use of CSS custom properties for theme compatibility
- Performance-optimized transitions (GPU-accelerated transforms)
- Semantic color usage (green for success, blue for info, amber for warnings)

Nice-to-Have (future enhancements)
Context menu actions on text selection.

Autosummarize very long docs into a "Context Summary" field.

File import/export functionality.

Collaborative editing features.

You are an expert full-stack engineer.

Build a working app called **Wordloom** with the stack and features below. Output ALL files with correct paths so I can paste them into a new repo and run immediately.

TECH STACK
- Bun as package manager/runtime (no npm)
- Vite + React + TypeScript
- React Router (routes: `/` and `/settings`)
- Tailwind CSS
- shadcn/ui (Radix + Tailwind components; install locally, not CDN)
- Vercel AI SDK (`ai` + `@ai-sdk/openai`) configured to talk to **LM Studio** (OpenAI-compatible)
- Dark theme as default, with option to switch to light mode (persistent via localStorage or similar)

AI BACKEND
- Use LM Studio’s local server (OpenAI-compatible). Default: `http://127.0.0.1:1234/v1`
- Read from `.env.local`:
  - `VITE_OPENAI_BASE_URL` (default above)
  - `VITE_OPENAI_API_KEY` (dummy “lm-studio” if needed)
  - `VITE_OPENAI_MODEL` (e.g., “lmstudio” or actual model string)
- Implement provider with `createOpenAI({ baseURL, apiKey })`
- Use `streamText()` to stream completions

CORE IDEA
**Select → Ask AI → Replace or Append** for any text (blogs, docs, notes, stories).

REQUIREMENTS
1) **App Structure**
   - `vite.config.ts` configured normally; no proxy needed (but include commented example to proxy `/v1` to LM Studio if needed)
   - `src/lib/ai.ts` creates OpenAI provider and `MODEL` constant
   - Routes:
     - `/` = Editor
     - `/settings` = API config/help

2) **Styling + Theming**
   - Tailwind `dark` mode set to `class`
   - Dark mode default
   - Theme toggle button (light/dark) in header using shadcn/ui’s `DropdownMenu` or `Toggle` component
   - Persist theme choice in localStorage (`theme` key)
   - Global dark/light colors in Tailwind config

3) **Editor Page (`/`) - Updated Architecture**
   - Layout: **3-column** (sidebar | editor | right panel)
   - Components (use shadcn/ui):
     - Header: app title "Wordloom", link to Settings, theme toggle
     - **Left Sidebar**: File/folder management (Sidebar.tsx)
       - Expandable folder tree with files
       - Create/rename/delete operations via context menus
       - Click to switch between files
     - **Main editor**: Monaco Editor (MonacoEditor.tsx)
       - Professional code editor with built-in line numbers
       - Clickable line number gutter for block selection
       - File breadcrumb showing current folder/file path
       - Theme synchronization and custom decorations
     - **Bottom toolbar** (SelectionToolbar.tsx):
       - Mode: "Revise Selection" / "Append to Selection"
       - Temperature input (0-2)
       - "Run AI" button (only active when lines selected)
     - **Right panel**:
       - Document Context textarea (guides AI output)
       - Live Preview card with streaming output
       - "Insert Preview" & "Clear" buttons

   - Behavior:
     - Multi-file session management with localStorage persistence
     - Line-based text selection via clicking line numbers
     - Build prompt with Document Context, ±800 chars around selected lines
     - Stream into preview, apply to selected lines on completion
     - Auto-save per file with timestamps

4) **Settings Page (`/settings`)**
   - Show current `.env.local` values (mask API key)
   - Explain LM Studio setup
   - Button: “Test Connection” → 1–2 sentence reply from AI

5) **State & UX - Updated**
   - React hooks for session state management (folders, files, active file)
   - Multi-file persistence via `localStorage` key `wordloom-session`
   - Auto-save individual file content every 500ms after changes
   - Keyboard shortcut: `Cmd/Ctrl + Enter` = run AI on selected lines
   - Line selection via mouse interactions with line numbers
   - File switching preserves selection state per file

6) **Deliverables**
   - ALL files:
     - `index.html`
     - `package.json` (Bun-compatible)
     - Tailwind + shadcn/ui configs
     - shadcn/ui components under `src/components/ui/*`
     - `src/lib/ai.ts`, `src/main.tsx`, `src/routes/Editor.tsx` (or `App.tsx`), `src/routes/Settings.tsx`, `src/index.css`
   - README section:
     - Setup with Bun (`bun install`, `bun run dev`)
     - Tailwind + shadcn/ui init commands
     - `.env.local` sample
     - LM Studio instructions
     - CORS troubleshooting

IMPLEMENTATION NOTES
- Use `streamText({ model: openai.chat(MODEL), temperature, messages: [...] })`
- `system` message: “You are a precise text assistant for any document type. Respect style and constraints. Output ONLY the prose requested.”
- Code clean, typed, complete
- Light/dark toggle must persist between sessions

GOAL
After pasting files, running `bun install` and `bun run dev`, I should open `http://localhost:5173`, write text, select a block, run AI, see streaming output, and apply it to my selection—while being able to switch between dark and light mode anytime.
