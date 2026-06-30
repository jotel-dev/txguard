import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from the current directory, including non-VITE prefixed keys
  const env = loadEnv(mode, process.cwd(), '')
  process.env.GROQ_API_KEY = env.GROQ_API_KEY || process.env.GROQ_API_KEY
  process.env.ETHERSCAN_API_KEY = env.ETHERSCAN_API_KEY || process.env.ETHERSCAN_API_KEY

  return {
    plugins: [
      react(),
      {
        name: 'serverless-dev-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Intercept /api/analyze endpoint
            if (req.url.startsWith('/api/analyze')) {
              let body = ''
              req.on('data', chunk => { body += chunk })
              req.on('end', async () => {
                try {
                  req.body = body ? JSON.parse(body) : {}
                } catch (e) {
                  req.body = {}
                }

                // Mock Vercel response helper
                const mockRes = {
                  status(code) {
                    res.statusCode = code
                    return this
                  },
                  json(data) {
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify(data))
                    return this
                  },
                  setHeader(name, value) {
                    res.setHeader(name, value)
                    return this
                  },
                  end(data) {
                    res.end(data)
                    return this
                  }
                }

                try {
                  const analyzeHandler = (await import('./api/analyze.js')).default
                  await analyzeHandler(req, mockRes)
                } catch (err) {
                  console.error('Local dev serverless handler error:', err)
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
            } 
            // Intercept /api/transactions endpoint
            else if (req.url.startsWith('/api/transactions')) {
              (async () => {
                const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
                req.query = Object.fromEntries(urlObj.searchParams.entries())

                const mockRes = {
                  status(code) {
                    res.statusCode = code
                    return this
                  },
                  json(data) {
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify(data))
                    return this
                  },
                  setHeader(name, value) {
                    res.setHeader(name, value)
                    return this
                  },
                  end(data) {
                    res.end(data)
                    return this
                  }
                }

                try {
                  const transactionsHandler = (await import('./api/transactions.js')).default
                  await transactionsHandler(req, mockRes)
                } catch (err) {
                  console.error('Local dev serverless handler error:', err)
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: err.message }))
                }
              })()
            }
            // Intercept /api/ask endpoint
            else if (req.url.startsWith('/api/ask')) {
              let body = ''
              req.on('data', chunk => { body += chunk })
              req.on('end', async () => {
                try {
                  req.body = body ? JSON.parse(body) : {}
                } catch (e) {
                  req.body = {}
                }

                const mockRes = {
                  status(code) {
                    res.statusCode = code
                    return this
                  },
                  json(data) {
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify(data))
                    return this
                  },
                  setHeader(name, value) {
                    res.setHeader(name, value)
                    return this
                  },
                  end(data) {
                    res.end(data)
                    return this
                  }
                }

                try {
                  const askHandler = (await import('./api/ask.js')).default
                  await askHandler(req, mockRes)
                } catch (err) {
                  console.error('Local dev serverless handler error:', err)
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
            } 
            // Intercept /api/report-bug endpoint
            else if (req.url.startsWith('/api/report-bug')) {
              let body = ''
              req.on('data', chunk => { body += chunk })
              req.on('end', async () => {
                try {
                  req.body = body ? JSON.parse(body) : {}
                } catch (e) {
                  req.body = {}
                }

                const mockRes = {
                  status(code) {
                    res.statusCode = code
                    return this
                  },
                  json(data) {
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify(data))
                    return this
                  },
                  setHeader(name, value) {
                    res.setHeader(name, value)
                    return this
                  },
                  end(data) {
                    res.end(data)
                    return this
                  }
                }

                try {
                  const reportBugHandler = (await import('./api/report-bug.js')).default
                  await reportBugHandler(req, mockRes)
                } catch (err) {
                  console.error('Local dev serverless handler error:', err)
                  res.statusCode = 500
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
            }
            // Intercept /api/tts endpoint
            else if (req.url.startsWith('/api/tts')) {
              let body = ''
              req.on('data', chunk => { body += chunk })
              req.on('end', async () => {
                try {
                  req.body = body ? JSON.parse(body) : {}
                } catch (e) {
                  req.body = {}
                }

                const mockRes = {
                  status(code) { res.statusCode = code; return this; },
                  json(data) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); return this; },
                  setHeader(name, value) { res.setHeader(name, value); return this; },
                  end(data) { res.end(data); return this; }
                }

                try {
                  const ttsHandler = (await import('./api/tts.js')).default
                  await ttsHandler(req, mockRes)
                } catch (err) {
                  console.error('Local dev serverless handler error:', err)
                  res.statusCode = 500
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
            }
            else {
              next()
            }
          })
        }
      }
    ]
  }
})
