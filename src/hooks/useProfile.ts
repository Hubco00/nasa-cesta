import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  role: 'player' | 'admin'
  created_at: string
}

interface ProfileState {
  profile: Profile | null
  loading: boolean
  error: string | null
}

// Profil posledného načítaného používateľa — aby hlavička a admin guard pri
// každom prechode stránkou neblikali, kým sa rola znova načíta.
let cachedProfile: Profile | null = null

export function useProfile() {
  const { user } = useAuth()
  const [state, setState] = useState<ProfileState>(() => {
    const cached = user && cachedProfile?.id === user.id ? cachedProfile : null
    return { profile: cached, loading: !cached, error: null }
  })

  useEffect(() => {
    let active = true

    async function load() {
      if (!user) {
        cachedProfile = null
        if (active) setState({ profile: null, loading: false, error: null })
        return
      }

      const cached = cachedProfile?.id === user.id ? cachedProfile : null
      if (active) setState({ profile: cached, loading: !cached, error: null })

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, role, created_at')
        .eq('id', user.id)
        .single()

      if (!active) return
      if (error) {
        setState({ profile: null, loading: false, error: error.message })
        return
      }
      cachedProfile = data as Profile
      setState({ profile: cachedProfile, loading: false, error: null })
    }

    void load()

    return () => {
      active = false
    }
  }, [user])

  return state
}
