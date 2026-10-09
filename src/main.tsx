import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
// Čo najskôr — Chrome ponuku inštalácie posiela hneď pri načítaní.
import './lib/installPrompt'
import './styles/index.css'

// Po novom deployi bežiaca stará verzia appky odkazuje na súbory, ktoré už na
// serveri nie sú (napr. AdminPage-<starý hash>.js). Načítame znova celú
// stránku, aby prišla nová verzia — najviac raz za 30 s, nech sa nezacyklí.
const RELOAD_KEY = 'chunk-reload-at'
window.addEventListener('vite:preloadError', (event) => {
  let last = 0
  try {
    last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0
  } catch {
    // bez sessionStorage skúsime obnoviť aj tak
  }
  if (Date.now() - last < 30_000) return // chyba ide ďalej (errorElement)
  event.preventDefault()
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // nevadí
  }
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
