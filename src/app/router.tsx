/* eslint-disable react-refresh/only-export-components -- súbor je routovacia
   konfigurácia (exportuje aj `router`), nie znovupoužiteľný komponent */
import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireAdmin } from '../features/auth/RequireAdmin'
import { RequireAuth } from '../features/auth/RequireAuth'
import { ChapterDetailPage } from '../pages/ChapterDetailPage'
import { ChaptersPage } from '../pages/ChaptersPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'

// Admin rozhranie sa bežnej hráčke nikdy nenačíta — samostatný chunk, aby
// nezväčšovalo úvodný bundle jej časti appky.
const AdminPage = lazy(() =>
  import('../pages/AdminPage').then((m) => ({ default: m.AdminPage })),
)
const ChapterEditorPage = lazy(() =>
  import('../pages/admin/ChapterEditorPage').then((m) => ({
    default: m.ChapterEditorPage,
  })),
)
const PlayersPage = lazy(() =>
  import('../pages/admin/PlayersPage').then((m) => ({ default: m.PlayersPage })),
)

function adminFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-[var(--color-muted)]">
      Načítavam admin rozhranie…
    </div>
  )
}

function adminRoute(element: ReactNode) {
  return (
    <RequireAuth>
      <RequireAdmin>
        <Suspense fallback={adminFallback()}>{element}</Suspense>
      </RequireAdmin>
    </RequireAuth>
  )
}

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
  {
    path: '/chapters/:slug',
    element: (
      <RequireAuth>
        <ChapterDetailPage />
      </RequireAuth>
    ),
  },
  { path: '/admin', element: adminRoute(<AdminPage />) },
  { path: '/admin/players', element: adminRoute(<PlayersPage />) },
  { path: '/admin/chapters/new', element: adminRoute(<ChapterEditorPage />) },
  { path: '/admin/chapters/:id', element: adminRoute(<ChapterEditorPage />) },
  { path: '*', element: <NotFoundPage /> },
])
