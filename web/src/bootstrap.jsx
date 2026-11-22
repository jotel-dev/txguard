import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.jsx'

const root = document.getElementById('root')
const application = (
  <StrictMode>
    <App />
  </StrictMode>
)
if (root.dataset.prerendered === 'true') hydrateRoot(root, application)
else createRoot(root).render(application)
