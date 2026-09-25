/* eslint-disable react-refresh/only-export-components -- súbor zámerne
   zoskupuje viacero drobných ikon komponentov + jednu dispatch funkciu */
type IconProps = { className?: string }

export function LockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="5"
        y="11"
        width="14"
        height="9"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 12.5 9.5 18 20 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 20.5s-7.5-4.6-10-9.6C.4 7.1 2.8 3.5 6.5 3.5c2 0 3.7 1 4.8 2.7a1 1 0 0 0 1.4 0c1.1-1.7 2.8-2.7 4.8-2.7 3.7 0 6.1 3.6 4.5 7.4-2.5 5-10 9.6-10 9.6Z" />
    </svg>
  )
}

export function QuestionIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 9a3 3 0 1 1 4.8 2.4c-.9.7-1.8 1.2-1.8 2.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.5" r="1.3" fill="currentColor" />
    </svg>
  )
}

export function QrIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect x="15" y="15" width="2.2" height="2.2" fill="currentColor" />
      <rect x="19" y="15" width="1.6" height="1.6" fill="currentColor" />
      <rect x="15" y="19" width="1.6" height="1.6" fill="currentColor" />
      <rect x="18.5" y="18.5" width="2" height="2" fill="currentColor" />
    </svg>
  )
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 21s-6.5-6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5-6.5 11-6.5 11Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export function LinkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9.5 14.5 14.5 9.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M11 7.5 12.6 5.9a3 3 0 0 1 4.2 4.2L15.2 11.7M13 16.5l-1.6 1.6a3 3 0 0 1-4.2-4.2l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ScrollIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 4h9a2 2 0 0 1 2 2v13a1.5 1.5 0 0 1-3 0V6.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 4a2 2 0 0 0-2 2v11a2.5 2.5 0 0 0 2.5 2.5H14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M9 9h5M9 12.5h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// --- Dekoratívne prvky fantasy mapy (ChapterMapPath) — iba ambientná grafika ---

export function CastleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 58V30h6v-6h5v6h4v-9h6v-6h4v6h6v9h4v-6h5v6h6v28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M10 58h44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M24 58V44a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M32 12v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function DragonIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 40c6-2 10-7 11-13 1 5 4 8 8 8 1-6 5-10 11-11-2 4-2 8 1 11 4 4 10 4 14-1-3 8-11 13-19 12-3 5-9 8-15 6 3-2 5-5 5-9-6 2-12 0-16-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="47" cy="26" r="1.4" fill="currentColor" />
    </svg>
  )
}

export function WavesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 24c5-4 9-4 14 0s9 4 14 0 9-4 14 0 9 4 14 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 34c5-4 9-4 14 0s9 4 14 0 9-4 14 0 9 4 14 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 44c5-4 9-4 14 0s9 4 14 0 9-4 14 0 9 4 14 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MountainIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 50 20 22l9 12 5-7 26 23Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M20 22 24 28 17 36"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M34 27 40 35 30 40"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TreesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path
        d="M16 40 24 24l8 16h-5l7 12H14l7-12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M38 44 45 30l7 14h-4l5.5 8H36.5l5.5-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CompassIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M32 4v6M32 54v6M4 32h6M54 32h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M32 20 38 32 32 44 26 32Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function unlockTypeIcon(unlockType: string, className?: string) {
  switch (unlockType) {
    case 'question':
      return <QuestionIcon className={className} />
    case 'qr_code':
      return <QrIcon className={className} />
    case 'location':
      return <PinIcon className={className} />
    case 'combined':
      return <LinkIcon className={className} />
    default:
      return <ScrollIcon className={className} />
  }
}
