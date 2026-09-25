// PostgREST odmietne token, ktorého čas vydania (iat) je podľa jeho hodín
// „v budúcnosti“ (PGRST303 „JWT issued at future“). Stáva sa to tesne po
// prihlásení, keď sú hodiny databázy o zlomok sekundy pozadu — požiadavka
// vtedy zlyhá, hoci o chvíľu by prešla. Jedno zopakovanie po sekunde to rieši.
const RETRY_DELAY_MS = 1100

export async function fetchWithClockSkewRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init)
  if (response.status !== 401) return response

  const body = await response.clone().text()
  if (!body.includes('JWT issued at future')) return response

  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
  return fetch(input, init)
}
