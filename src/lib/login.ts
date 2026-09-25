// Supabase Auth sa prihlasuje e-mailom — hráčka však zadáva iba meno (napr.
// "viki"), ktoré sa tu doplní na interný e-mail. Plný e-mail funguje tiež.
export const LOGIN_EMAIL_DOMAIN = 'nasa-cesta.local'

export function toLoginEmail(nameOrEmail: string): string {
  const value = nameOrEmail.trim().toLowerCase()
  return value.includes('@') ? value : `${value}@${LOGIN_EMAIL_DOMAIN}`
}
