/**
 * Text chyby na zobrazenie. Chyby zo Supabase (PostgrestError, StorageError)
 * nie sú inštancie Error, ale obyčajné objekty s `message` — String(err) by
 * z nich spravil „[object Object]“.
 */
export function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return String(err)
}
