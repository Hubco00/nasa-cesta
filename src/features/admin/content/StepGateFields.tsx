import { PlaceField } from './PlaceField'
import type { StepGateState } from './useStepGate'

const RADIUS_OPTIONS = [100, 200, 300, 500, 1000, 2000, 5000]

export function StepGateFields({ state }: { state: StepGateState }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--paper-border)] p-3">
      <legend className="px-1 text-sm font-medium">Ako pokračuje ďalej</legend>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {(
          [
            ['next', 'Tlačidlo „Ďalej“'],
            ['location', 'Až keď príde na miesto'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => state.setGate(value)}
            className={`rounded-lg border px-2 py-2 leading-tight ${
              state.gate === value
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                : 'border-[var(--paper-border)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {state.gate === 'location' && (
        <PlaceField
          label="Kam má prísť"
          value={state.place}
          onChange={state.setPlace}
          radiusOptions={RADIUS_OPTIONS}
          defaultRadius={300}
          loading={state.loading}
          help="Pod príbehom uvidí tlačidlo „Skontrolovať polohu“. Stačí byť v tolerancii (a nepresnosť GPS sa ešte pripočíta). Kam má ísť, jej napíš v texte."
        />
      )}
    </fieldset>
  )
}
