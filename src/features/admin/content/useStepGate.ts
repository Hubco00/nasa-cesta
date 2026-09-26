import { useEffect, useState } from 'react'
import {
  adminDeleteBlockAnswer,
  adminGetBlockAnswer,
  adminSetBlockPlaceAnswer,
  adminUpdateBlock,
  type ChapterBlockRow,
} from '../api'
import type { PlaceValue } from './PlaceField'

export type StepGate = 'next' | 'location'

/**
 * Ako hráčka pokračuje za príbehom/fotkou v hlavnom liste kapitoly —
 * tlačidlom „Ďalej“, alebo až keď príde na miesto.
 */
export function useStepGate(block?: ChapterBlockRow) {
  const [gate, setGate] = useState<StepGate>(
    block?.gate === 'location' ? 'location' : 'next',
  )
  const [place, setPlace] = useState<PlaceValue | null>(null)
  const [loading, setLoading] = useState(block?.gate === 'location')

  useEffect(() => {
    if (!block || block.gate !== 'location') return
    let active = true
    adminGetBlockAnswer(block.id)
      .then((answer) => {
        if (active && answer?.place) setPlace(answer.place)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // Načítať iba raz pri otvorení formulára.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block?.id])

  function validate(): string | null {
    return gate === 'location' && !place ? 'Vyber na mape miesto, kam má prísť.' : null
  }

  async function save(blockId: string) {
    await adminUpdateBlock(blockId, { gate })
    if (gate === 'location') await adminSetBlockPlaceAnswer(blockId, place!)
    else if (block?.gate === 'location') await adminDeleteBlockAnswer(blockId)
  }

  return { gate, setGate, place, setPlace, loading, validate, save }
}

export type StepGateState = ReturnType<typeof useStepGate>
