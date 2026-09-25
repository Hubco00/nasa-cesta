import { Link } from 'react-router-dom'

/** Odkaz o úroveň späť na stránkach (napr. „← Admin panel“). */
export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="mb-3 inline-flex items-center gap-1 rounded-lg py-1 pr-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
    >
      <span aria-hidden="true">←</span> {children}
    </Link>
  )
}

/** Tlačidlo o úroveň späť v prekrývacích oknách (mapa, mesto, fotka). */
export function BackButton({
  onClick,
  children,
  light = false,
}: {
  onClick: () => void
  children: string
  light?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium hover:underline ${
        light ? 'text-white' : 'text-[var(--color-accent)]'
      }`}
    >
      <span aria-hidden="true">←</span> {children}
    </button>
  )
}

/** Okrúhle ✕ na zatvorenie prekrývacieho okna. */
export function CloseButton({
  onClick,
  label = 'Zavrieť',
  light = false,
}: {
  onClick: () => void
  label?: string
  light?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none transition ${
        light
          ? 'bg-white/15 text-white hover:bg-white/25'
          : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20'
      }`}
    >
      ✕
    </button>
  )
}
