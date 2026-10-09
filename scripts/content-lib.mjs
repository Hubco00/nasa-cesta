// Spoločné pre zálohu a prenos obsahu (scripts/backup.mjs, scripts/restore.mjs).
// Bežia v Node 22 mimo prehliadača a používajú service_role kľúč — ten patrí
// iba sem na lokálny počítač, nikdy do frontendu ani do gitu.

export const BUCKET = 'chapter-photos'

// Obsah, ktorý admin vytvára — v poradí, v akom sa dá vložiť (cudzie kľúče).
// Postup hráčky (player_*), profily a účty sa neprenášajú.
export const CONTENT_TABLES = [
  'chapters',
  'chapter_map_pins',
  'chapter_blocks',
  'chapter_answers',
  'chapter_block_qr_tokens',
  'chapter_map_segments',
  'chapter_unlock_conditions',
]

export function client(url, serviceKey) {
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  }

  async function request(path, init = {}) {
    const res = await fetch(`${url}${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers ?? {}) },
    })
    if (!res.ok) {
      throw new Error(
        `${init.method ?? 'GET'} ${path} → ${res.status} ${await res.text()}`,
      )
    }
    return res
  }

  return {
    url,
    request,

    async selectAll(table) {
      const rows = []
      for (let offset = 0; ; offset += 1000) {
        const res = await request(
          `/rest/v1/${table}?select=*&order=created_at.asc&limit=1000&offset=${offset}`,
        )
        const page = await res.json()
        rows.push(...page)
        if (page.length < 1000) return rows
      }
    },

    /** Vloží alebo prepíše riadky podľa primárneho kľúča — nikdy nič nemaže. */
    async upsert(table, rows, onConflict = 'id') {
      for (let i = 0; i < rows.length; i += 200) {
        await request(`/rest/v1/${table}?on_conflict=${onConflict}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(rows.slice(i, i + 200)),
        })
      }
    },

    async patch(table, filter, values) {
      await request(`/rest/v1/${table}?${filter}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(values),
      })
    },

    async listFiles(prefix = '') {
      const files = []
      for (let offset = 0; ; offset += 1000) {
        const res = await request(`/storage/v1/object/list/${BUCKET}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix, limit: 1000, offset }),
        })
        const page = await res.json()
        for (const item of page) {
          const path = prefix ? `${prefix}/${item.name}` : item.name
          // Priečinok nemá id ani metadata.
          if (item.id === null) files.push(...(await this.listFiles(path)))
          else files.push({ path, mimetype: item.metadata?.mimetype ?? null })
        }
        if (page.length < 1000) return files
      }
    },

    async download(path) {
      const res = await request(`/storage/v1/object/${BUCKET}/${encodePath(path)}`)
      return Buffer.from(await res.arrayBuffer())
    },

    async upload(path, data, contentType, cacheSeconds = 31536000) {
      await request(`/storage/v1/object/${BUCKET}/${encodePath(path)}`, {
        method: 'POST',
        // Cesty sú UUID a súbor sa nemení — dlhá cache šetrí egress.
        headers: {
          'Content-Type': contentType,
          'x-upsert': 'true',
          'cache-control': `max-age=${cacheSeconds}`,
        },
        body: data,
      })
    },
  }
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/')
}
