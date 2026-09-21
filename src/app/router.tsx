import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireAuth } from '../features/auth/RequireAuth'
import { ChaptersPage } from '../pages/ChaptersPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/chapters" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/chapters',
    element: (
      <RequireAuth>
        <ChaptersPage />
      </RequireAuth>
    ),
  },
  { path: '*', element: <NotFoundPage /> },
])
