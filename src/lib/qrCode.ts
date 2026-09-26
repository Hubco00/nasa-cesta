import QRCode from 'qrcode'

/** Náhodný token do QR kódu — nič nehovorí o kapitole ani obsahu. */
export function randomQrToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `quest_${hex}`
}

export function qrCodeDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, { margin: 2, width: 640 })
}

/** Otvorí okno iba s QR kódom a spustí tlač. Vráti false, ak prehliadač okno zablokoval. */
export function printQrCode(dataUrl: string, title: string): boolean {
  const win = window.open('', '_blank', 'width=480,height=600')
  if (!win) return false
  const doc = win.document
  doc.title = title
  doc.body.style.cssText =
    'margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center'
  const img = doc.createElement('img')
  img.style.cssText = 'width:8cm;height:8cm'
  img.onload = () => {
    win.focus()
    win.print()
  }
  img.src = dataUrl
  doc.body.append(img)
  return true
}
