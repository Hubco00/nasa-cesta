import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '../features/auth/AuthProvider'
import { isMobile, isStandalone } from '../lib/installPrompt'
import { InstallPage } from '../pages/InstallPage'
import { router } from './router'

// V mobilnom prehliadači iba inštalácia, hrá sa v nainštalovanej appke.
// Na počítači web funguje celý (admin rozhranie).
const installOnly = isMobile() && !isStandalone()

export function App() {
  if (installOnly) return <InstallPage />
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
