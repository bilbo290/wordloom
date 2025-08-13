# Wordloom

Local-first text editor with AI assistance. Select text → ask AI → get suggestions.

## Core Features

- **Multi-document editing** with folder organization
- **AI integration** with Ollama and LM Studio support  
- **Block selection** - click line numbers to select text blocks
- **Live preview** of AI suggestions before applying
- **Local storage** with file system access when available

## Setup

### 1. Install
```bash
bun install
```

### 2. Configure AI Provider
Create `.env.local`:

```env
# Ollama (Recommended)
VITE_OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
VITE_OLLAMA_API_KEY=ollama  
VITE_OLLAMA_MODEL=llama3.2

# LM Studio (Alternative)
VITE_OPENAI_BASE_URL=http://127.0.0.1:1234/v1
VITE_OPENAI_API_KEY=lm-studio
VITE_OPENAI_MODEL=lmstudio
```

### 3. Start AI Provider

**Ollama:**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.2

# Ollama starts automatically on port 11434
```

**LM Studio:**
1. Download [LM Studio](https://lmstudio.ai)
2. Load a model 
3. Start local server on port 1234

### 4. Run
```bash
bun run dev
```

Open http://localhost:5173

## Usage

1. Create folders and files in the sidebar
2. Write text in the editor
3. Select text by clicking line numbers
4. Choose AI action from the toolbar:
   - **Revise** - improve selected text
   - **Append** - continue from selection
   - **Continue Story** - extend narrative
5. Preview AI output and apply changes

## Arch Linux

If you get esbuild errors on Arch Linux, the configuration has been updated to fix common compatibility issues. See `ARCH_LINUX_SETUP.md` for details.

## Tech Stack

- Bun + Vite + React + TypeScript
- Monaco Editor for text editing
- Vercel AI SDK for AI integration  
- Tailwind CSS + shadcn/ui for UI
- File System Access API for local file operations