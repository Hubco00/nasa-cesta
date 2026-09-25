import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Profile } from '../../hooks/useProfile'
import { RequireAdmin } from './RequireAdmin'

const { useProfileMock } = vi.hoisted(() => ({ useProfileMock: vi.fn() }))

vi.mock('../../hooks/useProfile', () => ({
  useProfile: useProfileMock,
}))

function renderWithProfile(state: {
  profile: Profile | null
  loading: boolean
  error: string | null
}) {
  useProfileMock.mockReturnValue(state)

  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/chapters" element={<div>Timeline hráčky</div>} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <div>Admin obsah</div>
            </RequireAdmin>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAdmin', () => {
  it('presmeruje hráčku bez admin role na /chapters', () => {
    renderWithProfile({
      profile: {
        id: '1',
        email: 'a@b.sk',
        display_name: null,
        role: 'player',
        created_at: '',
      },
      loading: false,
      error: null,
    })

    expect(screen.getByText('Timeline hráčky')).toBeInTheDocument()
    expect(screen.queryByText('Admin obsah')).not.toBeInTheDocument()
  })

  it('zobrazí admin obsah pre používateľa s rolou admin', () => {
    renderWithProfile({
      profile: {
        id: '1',
        email: 'a@b.sk',
        display_name: null,
        role: 'admin',
        created_at: '',
      },
      loading: false,
      error: null,
    })

    expect(screen.getByText('Admin obsah')).toBeInTheDocument()
  })

  it('presmeruje preč, ak sa profil nepodarilo načítať', () => {
    renderWithProfile({ profile: null, loading: false, error: 'boom' })

    expect(screen.getByText('Timeline hráčky')).toBeInTheDocument()
  })
})
