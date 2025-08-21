import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { EditorWithSidebar } from '@/routes/EditorWithSidebar'
import { Settings } from '@/routes/Settings'
import { StoryWriterMode } from '@/routes/StoryWriterMode'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Settings as SettingsIcon, Sparkles, BookOpen, FileText } from 'lucide-react'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col">
      <header className="relative border-b bg-gradient-to-r from-background via-background to-muted/30 backdrop-blur-sm px-6 py-4 shadow-elegant animate-fade-in flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-blue-500/5 to-cyan-500/5"></div>
        <div className="relative flex items-center justify-between">
          <Link to="/" className="group flex items-center gap-3 transition-all duration-300 hover:scale-105">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 shadow-glow group-hover:shadow-lg transition-all duration-300">
              <Sparkles className="h-5 w-5 text-gradient" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gradient tracking-tight">
                Wordloom
              </span>
              <span className="text-xs text-muted-foreground -mt-1">
                AI-Powered Writing
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/editor">
              <Button variant="ghost" size="sm" className="hover:bg-accent/50 transition-all duration-200 hover:scale-105">
                <FileText className="h-4 w-4 mr-2" />
                Editor
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="hover:bg-accent/50 transition-all duration-200 hover:scale-105">
                <SettingsIcon className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden animate-slide-up min-h-0">
        {children}
      </main>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<StoryWriterMode />} />
          <Route path="/editor" element={<EditorWithSidebar />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App