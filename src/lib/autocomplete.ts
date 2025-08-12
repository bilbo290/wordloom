import { streamText } from 'ai'
import { createAIProvider, getModel, type AIProvider } from './ai'

export interface AutocompleteOptions {
  enabled: boolean
  triggerDelay: number // milliseconds
  completionLength: 'short' | 'medium' | 'long'
  temperature: number
  provider: AIProvider
  model: string
}

export interface CompletionCache {
  context: string
  completion: string
  timestamp: number
}

const DEFAULT_OPTIONS: AutocompleteOptions = {
  enabled: true,
  triggerDelay: 500,
  completionLength: 'medium',
  temperature: 0.7, // Higher temperature for more creative completions
  provider: 'ollama',
  model: ''
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 50

class AutocompleteService {
  private options: AutocompleteOptions
  private cache: CompletionCache[] = []
  private currentAbortController: AbortController | null = null
  private lastContext: string = ''
  private debugMode: boolean = true // Enable debug logging

  constructor(options: Partial<AutocompleteOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.loadCache()
    
    if (this.debugMode) {
      console.log('[Autocomplete] Service initialized with options:', this.options)
      
      // Monkey patch fetch to log all network requests
      const originalFetch = window.fetch
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        
        if (url.includes('ollama') || url.includes('1234') || url.includes('11434')) {
          console.log('[Autocomplete] 🌐 FETCH REQUEST to:', url)
          console.log('[Autocomplete] 🌐 Method:', init?.method || 'GET')
          if (init?.body) {
            try {
              const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body
              console.log('[Autocomplete] 🌐 Request body:', body)
            } catch (e) {
              console.log('[Autocomplete] 🌐 Request body (raw):', init.body)
            }
          }
        }
        
        try {
          const response = await originalFetch(input, init)
          
          if (url.includes('ollama') || url.includes('1234') || url.includes('11434')) {
            console.log('[Autocomplete] 🌐 FETCH RESPONSE:', response.status, response.statusText)
            if (!response.ok) {
              console.error('[Autocomplete] 🌐 Response error:', await response.text())
            }
          }
          
          return response
        } catch (error) {
          if (url.includes('ollama') || url.includes('1234') || url.includes('11434')) {
            console.error('[Autocomplete] 🌐 FETCH ERROR:', error)
          }
          throw error
        }
      }
    }
  }

  private loadCache() {
    try {
      const savedCache = localStorage.getItem('wordloom-autocomplete-cache')
      if (savedCache) {
        this.cache = JSON.parse(savedCache)
        // Remove expired entries
        const now = Date.now()
        this.cache = this.cache.filter(entry => 
          now - entry.timestamp < CACHE_DURATION
        )
      }
    } catch (error) {
      console.error('Failed to load autocomplete cache:', error)
    }
  }

  private saveCache() {
    try {
      // Keep only the most recent entries
      if (this.cache.length > MAX_CACHE_SIZE) {
        this.cache = this.cache.slice(-MAX_CACHE_SIZE)
      }
      localStorage.setItem('wordloom-autocomplete-cache', JSON.stringify(this.cache))
    } catch (error) {
      console.error('Failed to save autocomplete cache:', error)
    }
  }

  private getCachedCompletion(context: string): string | null {
    const now = Date.now()
    const cached = this.cache.find(entry => 
      entry.context === context && 
      now - entry.timestamp < CACHE_DURATION
    )
    return cached?.completion || null
  }

  private addToCache(context: string, completion: string) {
    this.cache.push({
      context,
      completion,
      timestamp: Date.now()
    })
    this.saveCache()
  }

  updateOptions(options: Partial<AutocompleteOptions>) {
    this.options = { ...this.options, ...options }
    
    if (this.debugMode) {
      console.log('[Autocomplete] Options updated:', this.options)
    }
  }

  isEnabled(): boolean {
    return this.options.enabled
  }

  getTriggerDelay(): number {
    return this.options.triggerDelay
  }

  clearCache() {
    this.cache = []
    localStorage.removeItem('wordloom-autocomplete-cache')
  }

  private getCompletionLength(): number {
    switch (this.options.completionLength) {
      case 'short':
        return 10
      case 'long':
        return 40
      default:
        return 20
    }
  }

  private buildAutocompletePrompt(
    textBefore: string,
    textAfter: string,
    documentContext?: string
  ): { systemMessage: string; userPrompt: string } {
    const systemMessage = `You are an AI code completion assistant like GitHub Copilot.
Your task is to predict what the user wants to write next.
Rules:
- Continue the text naturally and logically
- Match the existing writing style and tone
- Output ONLY the continuation text - no explanations, quotes, or meta-commentary
- Keep completions focused and relevant
- If the text seems incomplete, complete the thought
- For code, follow proper syntax and conventions
- For prose, maintain narrative flow and voice`

    const contextWindow = 300 // Shorter context for better focus
    const recentText = textBefore.slice(-contextWindow)
    const upcomingText = textAfter.slice(0, Math.min(50, textAfter.length))
    
    const completionWords = this.getCompletionLength()

    // Simpler, more direct prompt format
    let userPrompt = ''
    
    if (documentContext && documentContext.trim()) {
      userPrompt += `Context: ${documentContext.trim()}\n\n`
    }
    
    userPrompt += recentText
    
    // Add a cursor marker to make it clear where to continue
    userPrompt += '<|cursor|>'
    
    if (upcomingText.trim()) {
      userPrompt += upcomingText
    }
    
    // Add instruction at the end
    userPrompt += `\n\nContinue from <|cursor|> with ${completionWords} words:`

    return { systemMessage, userPrompt }
  }

  async getCompletion(
    textBefore: string,
    textAfter: string,
    documentContext?: string,
    signal?: AbortSignal
  ): Promise<string | null> {
    if (this.debugMode) {
      console.log('[Autocomplete] getCompletion called')
      console.log('[Autocomplete] Text before length:', textBefore.length)
      console.log('[Autocomplete] Text after length:', textAfter.length)
      console.log('[Autocomplete] Enabled:', this.options.enabled)
    }

    // Cancel any existing request
    if (this.currentAbortController) {
      this.currentAbortController.abort()
      if (this.debugMode) console.log('[Autocomplete] Cancelled previous request')
    }

    // Don't trigger on very short text
    if (textBefore.length < 10) {
      if (this.debugMode) console.log('[Autocomplete] Text too short, skipping')
      return null
    }

    // Create context key for caching
    const contextKey = textBefore.slice(-200) + '|' + textAfter.slice(0, 50)
    
    // Check cache first
    const cached = this.getCachedCompletion(contextKey)
    if (cached) {
      if (this.debugMode) console.log('[Autocomplete] Using cached completion')
      return cached
    }

    // Avoid redundant API calls for the same context
    if (contextKey === this.lastContext) {
      if (this.debugMode) console.log('[Autocomplete] Same context as last request, skipping')
      return null
    }
    this.lastContext = contextKey

    try {
      if (this.debugMode) console.log('[Autocomplete] Starting API request')
      
      this.currentAbortController = new AbortController()
      const combinedSignal = signal 
        ? AbortSignal.any([signal, this.currentAbortController.signal])
        : this.currentAbortController.signal

      const provider = createAIProvider(this.options.provider)
      const model = this.options.model || getModel(this.options.provider)
      
      if (this.debugMode) {
        console.log('[Autocomplete] Using model from options:', this.options.model)
        console.log('[Autocomplete] Fallback model would be:', getModel(this.options.provider))
        console.log('[Autocomplete] Final model being used:', model)
      }
      
      if (this.debugMode) {
        console.log('[Autocomplete] Provider:', this.options.provider)
        console.log('[Autocomplete] Model:', model)
      }
      
      const { systemMessage, userPrompt } = this.buildAutocompletePrompt(
        textBefore,
        textAfter,
        documentContext
      )
      
      if (this.debugMode) {
        console.log('[Autocomplete] System message:', systemMessage)
        console.log('[Autocomplete] User prompt (truncated):', userPrompt.slice(0, 200) + '...')
        console.log('[Autocomplete] Making network request to:', this.options.provider)
        console.log('[Autocomplete] Model:', model)
        console.log('[Autocomplete] Temperature:', this.options.temperature)
      }

      // Log the actual network request
      const requestData = {
        model: model,
        temperature: this.options.temperature,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 100
      }
      
      if (this.debugMode) {
        console.log('[Autocomplete] 🌐 Network Request Data:', JSON.stringify(requestData, null, 2))
      }

      const startTime = Date.now()
      const { textStream } = await streamText({
        model: provider.chat(model),
        temperature: this.options.temperature,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userPrompt }
        ],
        abortSignal: combinedSignal,
        maxTokens: 100 // Limit tokens for faster response
      })
      
      if (this.debugMode) {
        const requestTime = Date.now() - startTime
        console.log('[Autocomplete] 🌐 Network request took:', requestTime + 'ms')
      }

      let completion = ''
      let chunkCount = 0
      
      if (this.debugMode) {
        console.log('[Autocomplete] 🌊 Starting to read text stream...')
      }
      
      for await (const chunk of textStream) {
        chunkCount++
        completion += chunk
        
        if (this.debugMode && chunkCount <= 5) {
          console.log(`[Autocomplete] 🌊 Chunk ${chunkCount}:`, JSON.stringify(chunk))
        }
        
        // Stop at natural completion points
        if (completion.includes('\n\n') || completion.length > 150) {
          if (this.debugMode) {
            console.log('[Autocomplete] 🌊 Stopping stream early (natural break or length limit)')
          }
          break
        }
      }

      // Clean up the completion
      completion = completion.trim()
      
      // Remove any cursor markers or instructions that might have leaked through
      completion = completion.replace(/\<\|cursor\|\>/g, '').trim()
      completion = completion.replace(/^Continue from.*?:/gm, '').trim()
      completion = completion.replace(/^(Here's|Here is|The continuation|Next:).*/gm, '').trim()
      
      // If it starts with quotes, remove them
      if ((completion.startsWith('"') && completion.endsWith('"')) || 
          (completion.startsWith("'") && completion.endsWith("'"))) {
        completion = completion.slice(1, -1).trim()
      }
      
      if (this.debugMode) {
        console.log('[Autocomplete] 🌊 Stream complete! Total chunks:', chunkCount)
        console.log('[Autocomplete] 🎯 Raw completion:', JSON.stringify(completion))
        console.log('[Autocomplete] 🎯 Completion length:', completion.length)
      }
      
      // Only return if we got meaningful content (reduced threshold)
      if (completion.length > 2) {
        // Add to cache
        this.addToCache(contextKey, completion)
        
        if (this.debugMode) {
          console.log('[Autocomplete] ✅ Returning completion:', JSON.stringify(completion))
        }
        
        return completion
      }

      if (this.debugMode) console.log('[Autocomplete] ❌ Completion too short, returning null')
      return null
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Request was cancelled, this is expected
        if (this.debugMode) console.log('[Autocomplete] Request aborted')
        return null
      }
      console.error('[Autocomplete] Error:', error)
      return null
    } finally {
      this.currentAbortController = null
    }
  }

  cancelCurrentRequest() {
    if (this.currentAbortController) {
      this.currentAbortController.abort()
      this.currentAbortController = null
    }
    this.lastContext = ''
  }
}

// Singleton instance
let autocompleteService: AutocompleteService | null = null

export function getAutocompleteService(options?: Partial<AutocompleteOptions>): AutocompleteService {
  if (!autocompleteService) {
    autocompleteService = new AutocompleteService(options)
  } else if (options) {
    autocompleteService.updateOptions(options)
  }
  return autocompleteService
}

export function resetAutocompleteService() {
  if (autocompleteService) {
    autocompleteService.cancelCurrentRequest()
  }
  autocompleteService = null
}