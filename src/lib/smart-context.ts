import {
  ProjectContext,
  DocumentContext,
  DocumentSummary,
  ContextConfig,
  SmartContextResult,
  ContentType,
  ContextCacheEntry
} from './types'

// Default configuration for context management
const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  maxTokens: 3000,
  immediateContextRatio: 0.4, // 40% for immediate context around selection
  summaryRatio: 0.35, // 35% for document summary
  semanticRatio: 0.25, // 25% for semantic chunks
  adaptiveWindowSize: true
}

// Cache duration and size limits
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes
const MAX_CACHE_SIZE = 100
const CACHE_KEY = 'wordloom-context-cache'

class SmartContextManager {
  private config: ContextConfig
  private cache: Map<string, ContextCacheEntry> = new Map()

  constructor(config: Partial<ContextConfig> = {}) {
    this.config = { ...DEFAULT_CONTEXT_CONFIG, ...config }
    this.loadCache()
  }

  /**
   * Main method to build smart context for AI prompts
   */
  async buildSmartContext(
    projectContext: ProjectContext,
    documentContext: DocumentContext | undefined,
    sessionContext: string,
    fullContent: string,
    selectedText?: string,
    selectionStart?: number,
    selectionEnd?: number
  ): Promise<SmartContextResult> {
    const contentType = this.inferContentType(projectContext, documentContext, fullContent)
    const strategy = this.determineStrategy(fullContent.length)
    const fileId = documentContext?.fileId || 'unknown'

    // Get or create document summary
    const summary = await this.getDocumentSummary(fileId, fullContent, contentType)
    
    // Build context sections
    const projectCtx = this.buildProjectContextSection(projectContext)
    const docCtx = this.buildDocumentContextSection(documentContext)
    const sessionCtx = this.buildSessionContextSection(sessionContext)

    // Calculate immediate context if we have selection
    let immediateContext = {
      before: '',
      after: '',
      tokens: 0
    }

    if (selectedText && selectionStart !== undefined && selectionEnd !== undefined) {
      immediateContext = this.calculateImmediateContext(
        fullContent,
        selectionStart,
        selectionEnd,
        strategy
      )
    }

    // Get semantic chunks (for future implementation)
    const semanticChunks: string[] = []

    // Calculate total tokens used
    const totalTokens = this.estimateTokens([
      projectCtx,
      docCtx,
      sessionCtx,
      summary.structural + summary.content + summary.entities,
      immediateContext.before,
      immediateContext.after
    ].join('\n'))

    return {
      projectContext: projectCtx,
      documentContext: docCtx,
      sessionContext: sessionCtx,
      documentSummary: this.formatDocumentSummary(summary),
      immediateContext,
      semanticChunks,
      totalTokens,
      strategy,
      contentType
    }
  }

  /**
   * Get or generate document summary with caching
   */
  private async getDocumentSummary(
    fileId: string,
    content: string,
    contentType: ContentType
  ): Promise<DocumentSummary> {
    const contentHash = this.generateContentHash(content)
    const cacheKey = `summary-${fileId}-${contentHash}`

    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.summary
    }

    // Generate new summary
    const summary = await this.generateDocumentSummary(fileId, content, contentType, contentHash)
    
    // Cache the result
    this.cache.set(cacheKey, {
      key: cacheKey,
      summary,
      chunks: [], // Will be populated when semantic chunking is implemented
      timestamp: Date.now()
    })

    this.saveCache()
    return summary
  }

  /**
   * Generate document summary based on content type
   */
  private async generateDocumentSummary(
    fileId: string,
    content: string,
    contentType: ContentType,
    version: string
  ): Promise<DocumentSummary> {
    const structural = this.extractStructuralInfo(content)
    const contentSummary = this.generateContentSummary(content, contentType)
    const entities = this.extractEntities(content, contentType)

    const fullSummary = [structural, contentSummary, entities].join('\n\n')
    const tokenCount = this.estimateTokens(fullSummary)

    return {
      fileId,
      version,
      structural,
      content: contentSummary,
      entities,
      contentType,
      tokenCount,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }

  /**
   * Extract structural information (headers, sections, etc.)
   */
  private extractStructuralInfo(content: string): string {
    const lines = content.split('\n')
    const structure: string[] = []

    // Look for markdown headers
    const headers = lines
      .filter(line => line.match(/^#{1,6}\s/))
      .slice(0, 10) // Limit to first 10 headers
      .map(header => header.trim())

    if (headers.length > 0) {
      structure.push('STRUCTURE:')
      structure.push(...headers)
    }

    // Look for numbered lists or bullet points that might indicate structure
    const listItems = lines
      .filter(line => line.match(/^\s*(\d+\.|[•\-*])\s/))
      .slice(0, 8) // Limit to first 8 items
      .map(item => item.trim())

    if (listItems.length > 0 && structure.length === 0) {
      structure.push('KEY POINTS:')
      structure.push(...listItems)
    }

    return structure.length > 0 ? structure.join('\n') : 'No clear structure detected'
  }

  /**
   * Generate content-specific summary
   */
  private generateContentSummary(content: string, contentType: ContentType): string {
    const words = content.split(/\s+/).length
    const paragraphs = content.split('\n\n').filter(p => p.trim()).length

    // Get first and last paragraphs for context
    const allParagraphs = content.split('\n\n').filter(p => p.trim())
    const firstParagraph = allParagraphs[0]?.substring(0, 200) || ''
    const lastParagraph = allParagraphs[allParagraphs.length - 1]?.substring(0, 200) || ''

    const summary = [`CONTENT OVERVIEW (${contentType}): ${words} words, ${paragraphs} sections`]

    if (firstParagraph) {
      summary.push(`OPENING: ${firstParagraph}${firstParagraph.length >= 200 ? '...' : ''}`)
    }

    if (lastParagraph && allParagraphs.length > 1) {
      summary.push(`CURRENT END: ${lastParagraph}${lastParagraph.length >= 200 ? '...' : ''}`)
    }

    return summary.join('\n')
  }

  /**
   * Extract entities based on content type
   */
  private extractEntities(content: string, contentType: ContentType): string {
    const entities: string[] = []

    switch (contentType) {
      case 'fiction':
        entities.push(...this.extractFictionEntities(content))
        break
      case 'technical':
        entities.push(...this.extractTechnicalEntities(content))
        break
      case 'blog':
      case 'non-fiction':
        entities.push(...this.extractKeyTerms(content))
        break
      default:
        entities.push(...this.extractKeyTerms(content))
    }

    return entities.length > 0 ? entities.join('\n') : 'No key entities identified'
  }

  /**
   * Extract fiction-specific entities (characters, places, etc.)
   */
  private extractFictionEntities(content: string): string[] {
    const entities: string[] = []
    
    // Look for quoted dialogue to identify speakers
    const dialoguePattern = /"[^"]*"/g
    const dialogues = content.match(dialoguePattern) || []
    
    if (dialogues.length > 0) {
      entities.push(`DIALOGUE: ${Math.min(dialogues.length, 5)} exchanges found`)
    }

    // Look for capitalized words that might be character names or places
    const properNouns = content.match(/\b[A-Z][a-z]+\b/g) || []
    const uniqueNouns = [...new Set(properNouns)]
      .filter(noun => noun.length > 2 && !['The', 'And', 'But', 'For', 'Yet', 'So', 'Or', 'Nor', 'I'].includes(noun))
      .slice(0, 10)

    if (uniqueNouns.length > 0) {
      entities.push(`KEY NAMES: ${uniqueNouns.join(', ')}`)
    }

    return entities
  }

  /**
   * Extract technical entities (concepts, APIs, etc.)
   */
  private extractTechnicalEntities(content: string): string[] {
    const entities: string[] = []
    
    // Look for code blocks or inline code
    const codeBlocks = content.match(/```[\s\S]*?```/g) || []
    const inlineCode = content.match(/`[^`]+`/g) || []
    
    if (codeBlocks.length > 0) {
      entities.push(`CODE BLOCKS: ${codeBlocks.length} examples`)
    }
    
    if (inlineCode.length > 0) {
      const uniqueCode = [...new Set(inlineCode.map(code => code.replace(/`/g, '')))]
        .slice(0, 8)
      entities.push(`TECHNICAL TERMS: ${uniqueCode.join(', ')}`)
    }

    return entities
  }

  /**
   * Extract general key terms
   */
  private extractKeyTerms(content: string): string[] {
    // Simple keyword extraction - in a real implementation, you might use TF-IDF
    const words = content.toLowerCase().match(/\b[a-z]{3,}\b/g) || []
    const frequency = new Map<string, number>()
    
    words.forEach(word => {
      if (!this.isStopWord(word)) {
        frequency.set(word, (frequency.get(word) || 0) + 1)
      }
    })

    const keyTerms = [...frequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => `${word} (${count})`)

    return keyTerms.length > 0 ? [`KEY TERMS: ${keyTerms.join(', ')}`] : []
  }

  /**
   * Calculate immediate context around selection
   */
  private calculateImmediateContext(
    content: string,
    selectionStart: number,
    selectionEnd: number,
    strategy: 'short-doc' | 'medium-doc' | 'long-doc'
  ) {
    const maxTokens = this.config.maxTokens * this.config.immediateContextRatio
    const maxChars = maxTokens * 4 // Rough estimate: 4 chars per token

    // Adaptive window sizes based on strategy
    let windowSize: number
    switch (strategy) {
      case 'short-doc':
        windowSize = maxChars * 0.8 // Use more context for short docs
        break
      case 'medium-doc':
        windowSize = maxChars * 0.6
        break
      case 'long-doc':
        windowSize = maxChars * 0.4 // Use less immediate context for long docs
        break
    }

    const halfWindow = Math.floor(windowSize / 2)
    
    // Extract context before selection
    const beforeStart = Math.max(0, selectionStart - halfWindow)
    const before = content.substring(beforeStart, selectionStart)
    
    // Extract context after selection
    const afterEnd = Math.min(content.length, selectionEnd + halfWindow)
    const after = content.substring(selectionEnd, afterEnd)

    const totalContext = before + after
    const tokens = this.estimateTokens(totalContext)

    return {
      before: before.trim(),
      after: after.trim(),
      tokens
    }
  }

  /**
   * Build formatted sections
   */
  private buildProjectContextSection(projectContext: ProjectContext): string {
    const sections = []
    
    if (projectContext.description) {
      sections.push(`PROJECT: ${projectContext.name}\n${projectContext.description}`)
    } else if (projectContext.name !== 'My Project') {
      sections.push(`PROJECT: ${projectContext.name}`)
    }

    if (projectContext.customFields && Object.keys(projectContext.customFields).length > 0) {
      const customFields = Object.entries(projectContext.customFields)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')
      sections.push(`PROJECT DETAILS:\n${customFields}`)
    }

    return sections.length > 0 ? sections.join('\n\n') : ''
  }

  private buildDocumentContextSection(documentContext?: DocumentContext): string {
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

    if (documentContext.customFields && Object.keys(documentContext.customFields).length > 0) {
      const customFields = Object.entries(documentContext.customFields)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')
      sections.push(`DOCUMENT DETAILS:\n${customFields}`)
    }

    return sections.length > 0 ? sections.join('\n\n') : ''
  }

  private buildSessionContextSection(sessionContext: string): string {
    return sessionContext.trim() ? `SESSION NOTES:\n${sessionContext.trim()}` : ''
  }

  private formatDocumentSummary(summary: DocumentSummary): string {
    const sections = [summary.structural, summary.content, summary.entities]
      .filter(section => section && section !== 'No clear structure detected' && section !== 'No key entities identified')
    
    return sections.join('\n\n')
  }

  /**
   * Utility methods
   */
  private determineStrategy(contentLength: number): 'short-doc' | 'medium-doc' | 'long-doc' {
    const words = contentLength / 5 // Rough estimate of word count
    
    if (words < 1000) return 'short-doc'
    if (words < 5000) return 'medium-doc'
    return 'long-doc'
  }

  private inferContentType(
    projectContext: ProjectContext,
    documentContext: DocumentContext | undefined,
    content: string
  ): ContentType {
    // Use project context genre if available
    if (projectContext.genre && projectContext.genre !== 'other') {
      return projectContext.genre as ContentType
    }

    // Check document context for hints
    if (documentContext?.purpose) {
      const purpose = documentContext.purpose.toLowerCase()
      if (purpose.includes('technical') || purpose.includes('documentation')) {
        return 'technical'
      }
      if (purpose.includes('story') || purpose.includes('novel') || purpose.includes('fiction')) {
        return 'fiction'
      }
      if (purpose.includes('blog') || purpose.includes('article')) {
        return 'blog'
      }
    }

    // Analyze content for clues
    if (content.includes('```') || content.includes('function') || content.includes('class ')) {
      return 'technical'
    }

    if (content.includes('"') && content.split('"').length > 10) {
      return 'fiction' // Lots of dialogue
    }

    return 'other'
  }

  private generateContentHash(content: string): string {
    // Simple hash for content versioning
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4)
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'must',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their'
    ])
    return stopWords.has(word)
  }

  /**
   * Cache management
   */
  private loadCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const entries = JSON.parse(cached) as ContextCacheEntry[]
        const now = Date.now()
        
        // Filter out expired entries
        const validEntries = entries.filter(entry => 
          now - entry.timestamp < CACHE_DURATION
        )
        
        validEntries.forEach(entry => {
          this.cache.set(entry.key, entry)
        })
      }
    } catch (error) {
      console.error('Failed to load context cache:', error)
    }
  }

  private saveCache() {
    try {
      const entries = Array.from(this.cache.values())
      
      // Keep only the most recent entries
      if (entries.length > MAX_CACHE_SIZE) {
        entries.sort((a, b) => b.timestamp - a.timestamp)
        entries.splice(MAX_CACHE_SIZE)
        
        // Update the cache map
        this.cache.clear()
        entries.forEach(entry => {
          this.cache.set(entry.key, entry)
        })
      }
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(entries))
    } catch (error) {
      console.error('Failed to save context cache:', error)
    }
  }

  /**
   * Public methods for cache management
   */
  clearCache() {
    this.cache.clear()
    localStorage.removeItem(CACHE_KEY)
  }

  updateConfig(config: Partial<ContextConfig>) {
    this.config = { ...this.config, ...config }
  }

  getConfig(): ContextConfig {
    return { ...this.config }
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: MAX_CACHE_SIZE,
      totalTokens: Array.from(this.cache.values())
        .reduce((sum, entry) => sum + entry.summary.tokenCount, 0)
    }
  }
}

// Singleton instance
let smartContextManager: SmartContextManager | null = null

export function getSmartContextManager(config?: Partial<ContextConfig>): SmartContextManager {
  if (!smartContextManager) {
    smartContextManager = new SmartContextManager(config)
  } else if (config) {
    smartContextManager.updateConfig(config)
  }
  return smartContextManager
}

export function resetSmartContextManager() {
  if (smartContextManager) {
    smartContextManager.clearCache()
  }
  smartContextManager = null
}

export { SmartContextManager }