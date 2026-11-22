import { renderToString } from 'react-dom/server'
import App from './App.jsx'

// Build-time public markup only. Effects, local device data and API requests never run here.
export function renderPublicPage() {
  return renderToString(<App />)
}
