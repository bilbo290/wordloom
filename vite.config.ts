import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to handle chat API
    {
      name: 'story-chat-api',
      configureServer(server) {
        server.middlewares.use('/api/chat', async (req, res, next) => {
          if (req.method === 'POST') {
            try {
              // Import required modules
              const { streamText } = await import('ai')
              const { createAIProvider, getModel } = await import('./src/lib/ai.ts')

              // Parse request body
              let body = ''
              req.on('data', chunk => body += chunk)
              req.on('end', async () => {
                try {
                  const { messages, data } = JSON.parse(body)
                  const { provider = 'lmstudio', temperature = 0.8, systemMessage } = data || {}
                  
                  const aiProvider = createAIProvider(provider)
                  const model = getModel(provider)
                  
                  const result = await streamText({
                    model: aiProvider(model),
                    messages: [
                      ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
                      ...messages
                    ],
                    temperature,
                  })

                  // Set headers for streaming
                  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
                  res.setHeader('Cache-Control', 'no-cache')
                  res.setHeader('Connection', 'keep-alive')

                  // Pipe the stream
                  const stream = result.toAIStreamResponse()
                  if (stream.body) {
                    const reader = stream.body.getReader()
                    const pump = async () => {
                      try {
                        const { done, value } = await reader.read()
                        if (done) {
                          res.end()
                          return
                        }
                        res.write(value)
                        pump()
                      } catch (error) {
                        console.error('Stream error:', error)
                        res.end()
                      }
                    }
                    pump()
                  } else {
                    res.end()
                  }
                } catch (error) {
                  console.error('Chat API processing error:', error)
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: 'Failed to process chat request' }))
                }
              })
            } catch (error) {
              console.error('Chat API error:', error)
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Internal server error' }))
            }
          } else {
            next()
          }
        })
      }
    }
  ],
  optimizeDeps: {
    include: ['monaco-editor'],
    esbuildOptions: {
      target: 'es2020',
    }
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor', '@monaco-editor/react']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    target: 'es2020'
  },
  // Proxy for LM Studio to avoid CORS issues
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: {
      // Use polling for file watching on Linux systems
      usePolling: true,
      interval: 1000,
      port: 5174
    },
    watch: {
      usePolling: true,
      interval: 1000
    },
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:1234',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/v1/, '/v1'),
      },
      // Proxy for Ollama (default)
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
    },
  },
})