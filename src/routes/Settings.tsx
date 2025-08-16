import { useState, useEffect } from 'react'
import { streamText } from 'ai'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/components/ui/use-toast'
import { createAIProvider, getModel, SYSTEM_MESSAGE, type AIProvider } from '@/lib/ai'
import { getAutocompleteService, type AutocompleteOptions } from '@/lib/autocomplete'
import { fileSystemManager, isFileSystemSupported, getDefaultDocumentPath, getOS } from '@/lib/filesystem'
import { FolderOpen, Download, Upload, HardDrive, Cloud, Sparkles, Trash2 } from 'lucide-react'

export function Settings() {
  const [isTesting, setIsTesting] = useState(false)
  const [isInitializingFS, setIsInitializingFS] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [currentPath, setCurrentPath] = useState('')
  const [fsSupported, setFsSupported] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('lmstudio')
  const [hasLoaded, setHasLoaded] = useState(false)
  const [autocompleteSettings, setAutocompleteSettings] = useState<Partial<AutocompleteOptions>>({
    enabled: true,
    triggerDelay: 500,
    completionLength: 'medium'
  })
  const { toast } = useToast()

  useEffect(() => {
    setFsSupported(isFileSystemSupported())
    setCurrentPath(fileSystemManager.getCurrentPath())
    
    // Load saved AI provider
    const savedProvider = localStorage.getItem('wordloom-ai-provider') as AIProvider
    if (savedProvider && (savedProvider === 'ollama' || savedProvider === 'lmstudio')) {
      setSelectedProvider(savedProvider)
    }
    
    // Load autocomplete settings
    const savedAutocomplete = localStorage.getItem('wordloom-autocomplete-settings')
    if (savedAutocomplete) {
      try {
        const settings = JSON.parse(savedAutocomplete)
        setAutocompleteSettings(settings)
        getAutocompleteService(settings)
      } catch (error) {
        console.error('Failed to load autocomplete settings:', error)
      }
    }
    
    setHasLoaded(true)
  }, [])

  // Save AI provider when it changes
  useEffect(() => {
    if (!hasLoaded) return // Don't trigger on initial load
    
    localStorage.setItem('wordloom-ai-provider', selectedProvider)
    toast({
      title: 'AI Provider Updated',
      description: `Switched to ${selectedProvider === 'ollama' ? 'Ollama' : 'LM Studio'}. Refresh the editor to apply changes.`
    })
  }, [selectedProvider, hasLoaded, toast])

  const initializeFileSystem = async () => {
    setIsInitializingFS(true)
    try {
      const success = await fileSystemManager.initializeDirectory()
      if (success) {
        setCurrentPath(fileSystemManager.getCurrentPath())
        toast({
          title: 'Document folder selected',
          description: 'Your files will now be saved to the selected folder'
        })
      } else {
        toast({
          title: 'Using browser storage',
          description: 'File system access unavailable, using localStorage'
        })
      }
    } catch (error) {
      toast({
        title: 'Failed to select folder',
        description: 'Please try again or use browser storage',
        variant: 'destructive'
      })
    } finally {
      setIsInitializingFS(false)
    }
  }

  const exportSession = async () => {
    setIsExporting(true)
    try {
      // Get current session from localStorage
      const session = localStorage.getItem('wordloom-session')
      if (!session) {
        throw new Error('No session to export')
      }
      
      await fileSystemManager.exportSession(JSON.parse(session))
      toast({
        title: 'Export successful',
        description: 'Your documents have been exported'
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Unable to export documents',
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const importSession = async () => {
    setIsImporting(true)
    try {
      const session = await fileSystemManager.importSession()
      if (session) {
        localStorage.setItem('wordloom-session', JSON.stringify(session))
        toast({
          title: 'Import successful',
          description: 'Documents imported. Please refresh the page.'
        })
      }
    } catch (error) {
      toast({
        title: 'Import failed',
        description: 'Unable to import documents',
        variant: 'destructive'
      })
    } finally {
      setIsImporting(false)
    }
  }

  const updateAutocompleteSettings = (update: Partial<AutocompleteOptions>) => {
    const newSettings = { ...autocompleteSettings, ...update }
    setAutocompleteSettings(newSettings)
    localStorage.setItem('wordloom-autocomplete-settings', JSON.stringify(newSettings))
    getAutocompleteService(newSettings)
    
    toast({
      title: 'Autocomplete settings updated',
      description: 'Your changes have been saved'
    })
  }

  const clearAutocompleteCache = () => {
    const service = getAutocompleteService()
    service.clearCache()
    toast({
      title: 'Cache cleared',
      description: 'Autocomplete cache has been cleared'
    })
  }

  const testConnection = async () => {
    setIsTesting(true)
    
    try {
      const aiProvider = createAIProvider(selectedProvider)
      const model = getModel(selectedProvider)
      
      const { textStream } = await streamText({
        model: aiProvider(model),
        temperature: 0.7,
        messages: [
          { role: 'system', content: SYSTEM_MESSAGE },
          { role: 'user', content: 'Say a one-sentence hello to confirm you are working.' }
        ]
      })

      let response = ''
      for await (const chunk of textStream) {
        response += chunk
      }

      toast({
        title: 'Connection successful!',
        description: response
      })
    } catch (error) {
      console.error('Connection test failed:', error)
      toast({
        title: 'Connection failed',
        description: `Unable to connect to ${selectedProvider === 'ollama' ? 'Ollama' : 'LM Studio'}. Please check that the server is running.`,
        variant: 'destructive'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const testFileSystemAPI = async () => {
    console.log('=== File System API Test ===')
    console.log('Browser:', navigator.userAgent)
    console.log('Location:', window.location.href)
    console.log('Secure Context:', window.isSecureContext)
    console.log('APIs available:', {
      showDirectoryPicker: 'showDirectoryPicker' in window,
      showOpenFilePicker: 'showOpenFilePicker' in window,  
      showSaveFilePicker: 'showSaveFilePicker' in window
    })
    
    try {
      if ('showDirectoryPicker' in window) {
        console.log('Trying to call showDirectoryPicker...')
        const dirHandle = await (window as any).showDirectoryPicker()
        console.log('Success! Directory selected:', dirHandle.name)
        
        toast({
          title: 'File System API Test Success!',
          description: `Selected directory: ${dirHandle.name}`
        })
      } else {
        throw new Error('showDirectoryPicker not available')
      }
    } catch (error: any) {
      console.error('File System API Test Failed:', error)
      toast({
        title: 'File System API Test Failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const getCurrentConfig = () => {
    if (selectedProvider === 'ollama') {
      return {
        baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
        apiKey: import.meta.env.VITE_OLLAMA_API_KEY || 'ollama',
        model: import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2'
      }
    }
    return {
      baseUrl: import.meta.env.VITE_OPENAI_BASE_URL || 'http://127.0.0.1:1234/v1',
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'lm-studio',
      model: import.meta.env.VITE_OPENAI_MODEL || 'lmstudio'
    }
  }
  
  const { baseUrl, apiKey, model } = getCurrentConfig()

  return (
    <div className="h-full overflow-y-auto">
      <div className="container max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Document Storage
          </CardTitle>
          <CardDescription>
            Choose where to store your documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {fsSupported ? (
                <HardDrive className="h-4 w-4 text-green-600" />
              ) : (
                <Cloud className="h-4 w-4 text-blue-600" />
              )}
              <div>
                <p className="font-medium">Current Storage</p>
                <p className="text-sm text-muted-foreground">{currentPath}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {fsSupported && (
                <Button
                  variant="outline"
                  onClick={initializeFileSystem}
                  disabled={isInitializingFS}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {isInitializingFS ? 'Selecting...' : 'Select Folder'}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium mb-1">Default Locations</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Recommended folder for {getOS()} systems:
              </p>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {getDefaultDocumentPath()}
              </code>
            </div>

            <div className="p-3 border rounded-lg">
              <h4 className="font-medium mb-1">Storage Options</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• File System: Direct access to your documents</p>
                <p>• Browser Storage: Backup in localStorage</p>
                <p>• Automatic sync between both</p>
              </div>
            </div>
          </div>

          {!fsSupported && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>File System Access not supported</strong><br />
                    Your browser doesn't support direct file system access. Documents will be stored in browser storage only.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={testFileSystemAPI}
                  className="ml-3"
                >
                  Test API
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Import & Export</CardTitle>
          <CardDescription>
            Backup or restore your documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={exportSession}
              disabled={isExporting || !fsSupported}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Documents'}
            </Button>
            
            <Button
              variant="outline"
              onClick={importSession}
              disabled={isImporting || !fsSupported}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Importing...' : 'Import Documents'}
            </Button>
          </div>
          
          {!fsSupported && (
            <p className="text-sm text-muted-foreground">
              Import/Export requires file system access support
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Autocomplete
          </CardTitle>
          <CardDescription>
            Configure AI-powered inline suggestions while you type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autocomplete-enabled">Enable Autocomplete</Label>
              <p className="text-sm text-muted-foreground">
                Get AI suggestions as you type (like GitHub Copilot)
              </p>
            </div>
            <Switch
              id="autocomplete-enabled"
              checked={autocompleteSettings.enabled}
              onCheckedChange={(enabled) => updateAutocompleteSettings({ enabled })}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Trigger Delay</Label>
            <p className="text-sm text-muted-foreground mb-2">
              How long to wait after typing stops before suggesting ({autocompleteSettings.triggerDelay}ms)
            </p>
            <Slider
              value={[autocompleteSettings.triggerDelay || 500]}
              onValueChange={([value]) => updateAutocompleteSettings({ triggerDelay: value })}
              min={100}
              max={2000}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Fast (100ms)</span>
              <span>Slow (2000ms)</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Completion Length</Label>
            <Select 
              value={autocompleteSettings.completionLength || 'medium'} 
              onValueChange={(value: 'short' | 'medium' | 'long') => 
                updateAutocompleteSettings({ completionLength: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short (~10 words)</SelectItem>
                <SelectItem value="medium">Medium (~20 words)</SelectItem>
                <SelectItem value="long">Long (~40 words)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Keyboard Shortcuts</Label>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>• <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Tab</kbd> - Accept suggestion</p>
              <p>• <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Esc</kbd> - Dismiss suggestion</p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearAutocompleteCache}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Autocomplete Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>AI Provider Configuration</CardTitle>
          <CardDescription>
            Select and configure your AI provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">AI Provider</Label>
            <Select value={selectedProvider} onValueChange={(value: AIProvider) => setSelectedProvider(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select AI provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lmstudio">LM Studio</SelectItem>
                <SelectItem value="ollama">Ollama</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Separator />
          
          <div>
            <Label className="text-muted-foreground">Base URL</Label>
            <p className="font-mono text-sm mt-1">{baseUrl}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">API Key</Label>
            <p className="font-mono text-sm mt-1">{'•'.repeat(apiKey.length)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Model</Label>
            <p className="font-mono text-sm mt-1">{model}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Configuration Instructions</CardTitle>
          <CardDescription>
            How to configure Wordloom to work with {selectedProvider === 'ollama' ? 'Ollama' : 'LM Studio'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Create a .env.local file</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Create a file named <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> in your project root with:
            </p>
            <pre className="bg-muted p-3 rounded text-sm">
{selectedProvider === 'ollama' ? 
`VITE_OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
VITE_OLLAMA_API_KEY=ollama
VITE_OLLAMA_MODEL=llama3.2` :
`VITE_OPENAI_BASE_URL=http://127.0.0.1:1234/v1
VITE_OPENAI_API_KEY=lm-studio
VITE_OPENAI_MODEL=lmstudio`}
            </pre>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">2. Start {selectedProvider === 'ollama' ? 'Ollama' : 'LM Studio'}</h3>
            {selectedProvider === 'ollama' ? (
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Install Ollama from <a href="https://ollama.ai" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">ollama.ai</a></li>
                <li>Pull a model: <code className="bg-muted px-1 py-0.5 rounded">ollama pull llama3.2</code></li>
                <li>Ollama automatically runs on port 11434</li>
                <li>Test with: <code className="bg-muted px-1 py-0.5 rounded">curl http://localhost:11434/api/tags</code></li>
              </ul>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Open LM Studio application</li>
                <li>Load your preferred model</li>
                <li>Go to the "Local Server" tab</li>
                <li>Click "Start Server" (default port is 1234)</li>
                <li>Ensure "Enable CORS" is checked</li>
              </ul>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">3. Test Connection</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Click the button below to test your connection to {selectedProvider === 'ollama' ? 'Ollama' : 'LM Studio'}:
            </p>
            <Button onClick={testConnection} disabled={isTesting}>
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
          <CardDescription>
            Common issues and solutions for {selectedProvider === 'ollama' ? 'Ollama' : 'LM Studio'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedProvider === 'ollama' ? (
            <>
              <div>
                <h4 className="font-medium mb-1">Connection refused</h4>
                <p className="text-sm text-muted-foreground">
                  Make sure Ollama is running: <code className="bg-muted px-1 py-0.5 rounded">ollama serve</code>
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Model not found</h4>
                <p className="text-sm text-muted-foreground">
                  Pull the model first: <code className="bg-muted px-1 py-0.5 rounded">ollama pull llama3.2</code>
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">CORS errors</h4>
                <p className="text-sm text-muted-foreground">
                  Ollama usually handles CORS automatically, but you can set <code className="bg-muted px-1 py-0.5 rounded">OLLAMA_ORIGINS=*</code>
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h4 className="font-medium mb-1">Connection refused</h4>
                <p className="text-sm text-muted-foreground">
                  Make sure LM Studio's local server is running on port 1234
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">CORS errors</h4>
                <p className="text-sm text-muted-foreground">
                  Enable CORS in LM Studio's server settings, or uncomment the proxy configuration in vite.config.ts
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">No response</h4>
                <p className="text-sm text-muted-foreground">
                  Ensure a model is loaded in LM Studio before starting the server
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}