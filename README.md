# Wordloom

A local-first AI-powered text editor with block selection and streaming AI assistance.

## Features

- **Session Management**: Organize files in folders/projects with a sidebar
- **Multi-file support**: Create, rename, and delete files and folders
- **Block-based text selection**: Select entire lines/blocks with line numbers
- **AI-powered editing**: Revise or append to selected text using LM Studio or Ollama
- **Live preview**: See AI output stream in real-time
- **Dark/Light theme**: Persistent theme toggle
- **Auto-save**: All files and folders automatically saved to localStorage
- **Keyboard shortcuts**: Cmd/Ctrl + Enter to run AI

## Tech Stack

- **Runtime**: Bun
- **Framework**: React + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Vercel AI SDK with LM Studio or Ollama (OpenAI-compatible)
- **Routing**: React Router

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure AI Provider

Create a `.env.local` file in the project root. Choose **either** LM Studio **or** Ollama:

#### Option A: LM Studio Configuration
```env
VITE_OPENAI_BASE_URL=http://127.0.0.1:1234/v1
VITE_OPENAI_API_KEY=lm-studio
VITE_OPENAI_MODEL=lmstudio
```

#### Option B: Ollama Configuration
```env
VITE_OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
VITE_OLLAMA_API_KEY=ollama
VITE_OLLAMA_MODEL=llama3.2
```

### 3. Start Your AI Provider

#### For LM Studio:
1. Open LM Studio application
2. Load your preferred model
3. Go to the "Local Server" tab
4. Click "Start Server" (default port is 1234)
5. Ensure "Enable CORS" is checked

#### For Ollama:
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama3.2`
3. Ollama runs automatically on port 11434
4. Test with: `curl http://localhost:11434/api/tags`

### 4. Run the development server

```bash
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

## Usage

### File Management
1. **Create folders** using the folder+ button in the sidebar
2. **Create files** using the file+ button next to each folder
3. **Rename** files/folders using the context menu (⋮ button)
4. **Delete** files/folders from the context menu
5. **Switch files** by clicking on them in the sidebar

### Text Editing
1. **Write or paste text** in the main editor
2. **Select blocks** by clicking line numbers (Shift+Click to extend, Ctrl/Cmd+Click to toggle)
3. **Choose AI provider**: LM Studio or Ollama (in bottom toolbar)
4. **Choose mode**: "Revise Selection" or "Append to Selection"
5. **Adjust temperature** (0-2, default 0.7)
6. **Run AI** (or press Cmd/Ctrl + Enter)
7. **Preview output** in the right panel
8. **Insert** the generated text when satisfied

## Build for Production

```bash
bun run build
bun run preview
```

## Troubleshooting

### LM Studio Issues
- **Connection refused**: Ensure LM Studio's local server is running on port 1234
- **CORS errors**: Enable CORS in LM Studio's server settings, or uncomment the proxy in `vite.config.ts`
- **No response**: Make sure a model is loaded in LM Studio before starting the server

### Ollama Issues
- **Connection refused**: Make sure Ollama is running: `ollama serve`
- **Model not found**: Pull the model first: `ollama pull llama3.2`
- **CORS errors**: Ollama usually handles CORS automatically, but you can set `OLLAMA_ORIGINS=*`

### General
- Use the **Settings page** to test your connection and see configuration help
- Switch between providers in the bottom toolbar or Settings page

## Project Structure

```
src/
├── components/
│   ├── editor/           # Block editor components
│   ├── ui/              # shadcn/ui components
│   └── theme-toggle.tsx # Theme switcher
├── lib/
│   ├── ai.ts           # AI configuration
│   └── utils.ts        # Utilities
├── routes/
│   ├── Editor.tsx      # Main editor page
│   └── Settings.tsx    # Settings page
└── main.tsx           # App entry point
```