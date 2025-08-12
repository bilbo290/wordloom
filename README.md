# Wordloom

A local-first AI-powered text editor for any document (blogs, docs, notes, fiction) with intelligent context management and streaming AI assistance.

## ✨ Features

### 📁 Session Management & File System
- **Hierarchical Organization**: Create folders and files with a professional sidebar interface
- **Multi-document Support**: Switch between files with persistent individual content
- **File System Integration**: Direct save to OS Documents folder with localStorage fallback
- **Auto-save**: Real-time saving every 500ms with timestamps
- **Import/Export**: Backup and restore entire document collections
- **Platform Integration**: OS-specific default paths (Windows, macOS, Linux)

### ✍️ Professional Text Editing
- **Monaco Editor**: Professional code editor with syntax highlighting and advanced features
- **Block-based Selection**: Click line numbers for precise text selection (single click, Shift-extend, Ctrl-toggle)
- **Natural Text Input**: Cursor-based line highlighting with visual feedback
- **Keyboard Shortcuts**: Cmd/Ctrl + Enter to run AI, ESC to stop generation
- **Enhanced Scrollbars**: Custom styled scrollbars with theme-aware colors

### 🤖 AI-Powered Writing Assistant
- **Multi-Provider Support**: Switch between Ollama and LM Studio seamlessly
- **Advanced AI Modes**:
  - **Continue Story**: Generate natural story continuation
  - **Continue with Direction**: Guide story development with custom instructions
  - **Revise Selection**: Improve clarity, flow, and precision
  - **Custom Revision**: Apply specific editing directions
  - **Append Content**: Extend selected text naturally
- **Smart Context Management**: Token-optimized context with 70-90% reduction in usage
- **Document Summarization**: Intelligent content summarization with caching
- **Live Preview**: Real-time streaming output with split-pane interface
- **Content Analysis**: Automatic content-type detection (fiction, technical, blog, etc.)

### 🎯 Context Management System
- **3-Tier Context Hierarchy**: Project → Document → Session inheritance
- **Smart Token Budgeting**: Adaptive context windows (3000 token budget)
- **Project Context**: Global writing guidelines (genre, style, audience, constraints)
- **Document Context**: File-specific notes (purpose, status, custom fields)
- **Session Notes**: Temporary context for current editing session
- **Context Preview**: Transparent view of token usage and context strategy

### 🎨 Modern UI/UX
- **Glass Morphism Design**: Modern backdrop blur with gradient accents
- **Smooth Animations**: Consistent micro-interactions throughout the interface
- **Dark/Light Theme**: Persistent theme toggle with system preference detection
- **Split-Pane Interface**: Resizable editor and preview areas
- **Floating Toolbars**: Context-sensitive AI action buttons
- **Enhanced Visual Feedback**: Selection highlighting, loading states, and progress indicators

### 🔧 Advanced Features
- **Autocomplete Integration**: AI-powered text completion with Monaco Editor
- **Prompt Templates**: Pre-built prompts for common writing tasks
- **History Management**: Track and reuse prompt history and favorites
- **Model Selection**: Dynamic model switching per provider
- **Connection Testing**: Built-in AI provider connection validation
- **Debug Tools**: Comprehensive logging and development aids

## 🛠️ Tech Stack

- **Runtime**: Bun (package manager & development server)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS + shadcn/ui components
- **Editor**: Monaco Editor with custom integrations
- **AI**: Vercel AI SDK with OpenAI-compatible providers
- **Routing**: React Router DOM
- **Storage**: File System Access API + localStorage fallback

## 🚀 Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure AI Provider

Create a `.env.local` file in the project root. Configure **both providers** for maximum flexibility:

```env
# Ollama Configuration (Recommended)
VITE_OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
VITE_OLLAMA_API_KEY=ollama
VITE_OLLAMA_MODEL=llama3.2

# LM Studio Configuration (Alternative)
VITE_OPENAI_BASE_URL=http://127.0.0.1:1234/v1
VITE_OPENAI_API_KEY=lm-studio
VITE_OPENAI_MODEL=lmstudio
```

### 3. Set Up Your AI Provider

#### Option A: Ollama (Recommended)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model (choose one)
ollama pull llama3.2        # Fast, good quality
ollama pull gemma2:9b       # Larger, better quality  
ollama pull mistral         # Alternative option

# Ollama runs automatically on port 11434
```

#### Option B: LM Studio (Alternative)
1. Download and install [LM Studio](https://lmstudio.ai)
2. Load your preferred model through the UI
3. Navigate to "Local Server" tab
4. Click "Start Server" (runs on port 1234)
5. Ensure "Enable CORS" is checked

### 4. Start Development Server
```bash
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) to start writing!

## 📖 Usage Guide

### Getting Started
1. **Create Your First Project**: Use the folder+ button to create a new project
2. **Add Documents**: Click file+ to add documents to your project  
3. **Configure Context**: Set up project-wide writing guidelines in Project Settings
4. **Start Writing**: Click on a file and begin writing in the Monaco editor

### Writing with AI
1. **Select Text**: Click line numbers to select blocks (Shift/Ctrl for multi-line)
2. **Choose AI Action**: Use the floating toolbar that appears on selection
   - **Continue Story**: Natural story progression
   - **Continue with Direction**: Guide the story ("add more tension", "introduce romance")
   - **Revise**: Improve clarity and flow
   - **Custom Revise**: Apply specific directions ("make more formal", "add emotion")
   - **Append**: Extend the selected text
3. **Preview & Apply**: Review the AI output in the split preview pane
4. **Insert or Regenerate**: Apply the content or try again with different parameters

### Advanced Context Management
- **Project Context**: Set genre, style, audience, and writing constraints
- **Document Context**: Add file-specific purpose, status, and notes
- **Session Notes**: Provide temporary guidance for your current editing session
- **Smart Context**: Enable token optimization for large documents (🧠 Smart toggle)

### Model Management
- **Switch Providers**: Choose between Ollama and LM Studio in Settings or toolbar
- **Model Selection**: Pick specific models for different writing tasks
- **Test Connection**: Verify your AI setup works correctly
- **Monitor Usage**: View token consumption with context preview

## 🏗️ Build for Production

```bash
# Build the application
bun run build

# Preview the production build
bun run preview
```

## 🔧 Troubleshooting

### Ollama Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama service
ollama serve

# List available models
ollama list

# Pull a model if missing
ollama pull llama3.2
```

### LM Studio Issues
- **Server not starting**: Ensure a model is loaded before starting the server
- **Connection refused**: Verify the server is running on port 1234
- **No response**: Check that the model is fully loaded (not just downloaded)

### General Issues
- **CORS Errors**: ✅ Automatically handled with development proxy
- **File System Access**: Some browsers limit file system access - use localStorage fallback
- **Performance**: Enable Smart Context (🧠) for large documents
- **Context Too Large**: Use document summarization or reduce context scope

### Debug Tools
- **Console Logging**: Check browser console for detailed AI request/response logs
- **Autocomplete Debug**: Use the debug panel to troubleshoot AI completions
- **Network Tab**: Monitor AI API calls and responses
- **Settings Page**: Test connections and verify configurations

## 📁 Project Structure

```
wordloom/
├── src/
│   ├── components/
│   │   ├── editor/
│   │   │   ├── MonacoEditor.tsx      # Professional text editor
│   │   │   └── BlockEditor.tsx       # Simple textarea editor
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── AIPreviewPane.tsx         # Live AI output preview
│   │   ├── ContextTabs.tsx           # Context management UI
│   │   ├── ProjectSettingsModal.tsx  # Project configuration
│   │   └── Sidebar.tsx               # File/folder management
│   ├── lib/
│   │   ├── ai.ts                     # AI provider configuration
│   │   ├── smart-context.ts          # Intelligent context management  
│   │   ├── session.ts                # File system & localStorage
│   │   ├── types.ts                  # TypeScript interfaces
│   │   └── autocomplete.ts           # AI text completion
│   ├── routes/
│   │   ├── EditorWithSidebar.tsx     # Main application interface
│   │   └── Settings.tsx              # Configuration & testing
│   └── main.tsx                      # Application entry point
├── .env.local                        # AI provider configuration
└── README.md                         # This file
```

## 🎨 Key Improvements

### Smart Context Management
- **70-90% token reduction** on large documents
- **Intelligent summarization** with content-aware chunking
- **Adaptive context windows** based on document size
- **Content-type optimization** for fiction vs technical writing

### Enhanced User Experience
- **Glass morphism UI** with smooth animations
- **Professional Monaco Editor** with advanced features
- **Real-time collaboration** between editor and AI
- **Context-aware toolbars** that appear when needed

### File System Integration
- **Direct OS integration** with Documents folder access
- **Automatic backup** to localStorage for reliability
- **Session persistence** across browser restarts
- **Import/export functionality** for data portability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with both Ollama and LM Studio
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Happy Writing with Wordloom!** ✨📝🤖