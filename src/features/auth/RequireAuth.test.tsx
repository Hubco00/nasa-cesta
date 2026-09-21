import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from './auth-context'
import { RequireAuth } from './RequireAuth'

function renderWithAuth(authValue: AuthContextValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/chapters']}>
        <Routes>
          <Route path="/login" element={<div>Prihlásenie</div>} />
          <Route
            path="/chapters"
            element={
              <RequireAuth>
                <div>Tajný obsah</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireAuth', () => {
  it('presmeruje neprihláseného používateľa na /login', () => {
    renderWithAuth({ session: null, user: null, loading: false, signOut: async () => {} })

    expect(screen.getByText('Prihlásenie')).toBeInTheDocument()
    expect(screen.queryByText('Tajný obsah')).not.toBeInTheDocument()
  })

  it('zobrazí obsah pre prihláseného používateľa', () => {
    renderWithAuth({
      // @ts-expect-error – v teste stačí minimálny tvar session
      session: { user: { id: '1' } },
      user: null,
      loading: false,
      signOut: async () => {},
    })

    expect(screen.getByText('Tajný obsah')).toBeInTheDocument()
  })

  it('počas načítavania nepresmeruje ani nezobrazí obsah', () => {
    renderWithAuth({ session: null, user: null, loading: true, signOut: async () => {} })

    expect(screen.queryByText('Prihlásenie')).not.toBeInTheDocument()
    expect(screen.queryByText('Tajný obsah')).not.toBeInTheDocument()
  })
})
