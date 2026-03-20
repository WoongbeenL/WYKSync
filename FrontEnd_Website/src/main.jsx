// This is the main entry file that mounts the whole React app to the page.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// We render App inside StrictMode so React can warn us about bad patterns while developing.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
