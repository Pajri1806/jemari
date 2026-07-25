import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getQueryClient } from './integrations/tanstack-query/root-provider'
import { getRouter } from './router'

const rootElement = document.getElementById('root')!
const root = createRoot(rootElement)

// Pre-load the query client so it's available in router context
getQueryClient()

root.render(
  <StrictMode>
    <RouterProvider router={getRouter()} />
  </StrictMode>
)
