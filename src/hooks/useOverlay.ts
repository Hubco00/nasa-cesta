import { useEffect, useRef } from 'react'

// Otvorené prekrývacie okná (mapa → mesto → fotka) tvoria zásobník: Esc zavrie
// iba to najvrchnejšie a zamknutý scroll stránky sa vráti až po zavretí všetkých.
const stack: Array<() => void> = []
let overflowBeforeOverlays = ''

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') stack[stack.length - 1]?.()
}

export function useOverlay(onClose: () => void) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const close = () => onCloseRef.current()
    if (stack.length === 0) {
      overflowBeforeOverlays = document.body.style.overflow
      window.addEventListener('keydown', onKeyDown)
    }
    stack.push(close)
    document.body.style.overflow = 'hidden'

    // Obnovuje sa až po zavretí posledného okna — pri zavretí rodiča aj dieťaťa
    // naraz (✕ v meste zavrie aj mapu) React spúšťa cleanupy od rodiča, takže
    // ukladanie stavu po jednotlivých oknách by scroll nechalo zamknutý.
    return () => {
      stack.splice(stack.indexOf(close), 1)
      if (stack.length === 0) {
        window.removeEventListener('keydown', onKeyDown)
        document.body.style.overflow = overflowBeforeOverlays
      }
    }
  }, [])
}
