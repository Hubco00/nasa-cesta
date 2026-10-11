import { supabase } from '../../lib/supabase'

// Ktoré miesta na mape už hráčka otvorila — v databáze, aby ich reset postupu
// vynuloval a platili na každom zariadení. Slúži iba na notifikačné guličky.

export async function fetchSeenPins(pinIds: string[]): Promise<Set<string>> {
  const { data: auth } = await supabase.auth.getSession()
  const playerId = auth.session?.user.id
  if (pinIds.length === 0 || !playerId) return new Set()
  // Admin číta (RLS) aj záznamy hráčky — preto iba vlastné.
  const { data, error } = await supabase
    .from('player_map_pin_views')
    .select('pin_id')
    .eq('player_id', playerId)
    .in('pin_id', pinIds)
  if (error) throw error
  return new Set((data ?? []).map((row) => row.pin_id))
}

export async function markPinSeen(pinId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_map_pin_seen', { p_pin_id: pinId })
  if (error) throw error
}
