import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithClockSkewRetry } from './fetchWithClockSkewRetry'

const futureJwt = () =>
  new Response(JSON.stringify({ code: 'PGRST303', message: 'JWT issued at future' }), {
    status: 401,
  })

describe('fetchWithClockSkewRetry', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('zopakuje požiadavku po „JWT issued at future“', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(futureJwt())
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const pending = fetchWithClockSkewRetry('https://x/rest/v1/a')
    await vi.runAllTimersAsync()
    const response = await pending

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(response.status).toBe(200)
  })

  it('inú 401 (napr. zlé prihlásenie) neopakuje', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"message":"Invalid login"}', { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await fetchWithClockSkewRetry('https://x/auth/v1/token')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(401)
  })
})
