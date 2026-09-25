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

export function useProfile() {
  const { user } = useAuth()
  const [state, setState] = useState<ProfileState>({
    profile: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true

    async function load() {
      if (!user) {
        if (active) setState({ profile: null, loading: false, error: null })
        return
      }

      if (active) setState((prev) => ({ ...prev, loading: true, error: null }))

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
      setState({ profile: data as Profile, loading: false, error: null })
    }

    void load()

    return () => {
      active = false
    }
  }, [user])

  return state
}
