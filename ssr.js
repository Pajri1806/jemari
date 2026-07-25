import { createServer } from 'node:http'

// This is the TanStack Start server entry point
// It serves the SSR app
const handler = await import('../dist/server/server.js').then((m) => m.default || m.fetch || m.handler)

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    
    // Try static files first
    const staticResponse = await fetch(
      new URL(url.pathname, 'http://localhost').href
    ).catch(() => null)
    
    if (staticResponse && staticResponse.ok) {
      // Let Vercel handle static files
      res.statusCode = 200
      res.end()
      return
    }

    // SSR rendering
    if (typeof handler === 'function') {
      const response = await handler(req)
      // handle response
    }
  } catch (e) {
    res.statusCode = 500
    res.end('Internal Server Error')
  }
})

export default server
