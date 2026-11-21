import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const routes = new Set(['analyze', 'transactions', 'ask', 'tts', 'report-bug', 'registry'])
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['GROQ_API_KEY', 'ETHERSCAN_API_KEY', 'APP_ORIGIN'])
    if (env[key]) process.env[key] = env[key]
  return {
    plugins: [
      react(),
      {
        name: 'local-serverless-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = new URL(req.url, 'http://localhost')
            const name = url.pathname.match(/^\/api\/([a-z-]+)$/)?.[1]
            if (!name || !routes.has(name)) return next()
            const reply = {
              status(code) {
                res.statusCode = code
                return this
              },
              setHeader(name, value) {
                res.setHeader(name, value)
                return this
              },
              json(value) {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(value))
                return this
              },
              send(value) {
                res.end(value)
                return this
              },
              end(value) {
                res.end(value)
                return this
              },
            }
            try {
              req.query = Object.fromEntries(url.searchParams)
              if (req.method === 'POST') {
                let body = ''
                for await (const chunk of req) {
                  body += chunk
                  if (Buffer.byteLength(body) > 8192)
                    return reply.status(413).json({ error: 'Request too large.' })
                }
                try {
                  req.body = body ? JSON.parse(body) : null
                } catch {
                  return reply.status(400).json({ error: 'Malformed JSON.' })
                }
              }
              const handlerUrl = pathToFileURL(resolve(process.cwd(), 'api', `${name}.js`)).href
              const { default: handler } = await import(handlerUrl)
              await handler(req, reply)
            } catch {
              if (!res.writableEnded)
                reply.status(500).json({ error: 'Service unavailable. Please retry.' })
            }
          })
        },
      },
    ],
  }
})
