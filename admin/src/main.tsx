import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { supabaseConfigError } from './lib/supabase'

const root = createRoot(document.getElementById('root')!)

root.render(
  <StrictMode>
    {supabaseConfigError ? (
      <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', lineHeight: 1.5 }}>
        <h1>PixieKat Admin configuration required</h1>
        <p>{supabaseConfigError}</p>
      </main>
    ) : (
      <App />
    )}
  </StrictMode>,
)
