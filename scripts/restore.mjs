// Prenesie zálohu (scripts/backup.mjs) do cieľového Supabase projektu —
// napr. ostrého pri nasadení. Iba pridáva alebo prepisuje rovnaké záznamy
// podľa id, nič nemaže. Dá sa spustiť opakovane.
//
//   TARGET_SUPABASE_URL=https://<ref>.supabase.co \
//   TARGET_SERVICE_ROLE_KEY=<service_role kľúč> \
//   HUBCO_PASSWORD=… VIKI_PASSWORD=… \
//   npm run restore -- ~/nasa-cesta-zaloha/<dátum_čas>
//
// HUBCO_PASSWORD / VIKI_PASSWORD sú voliteľné — ak sú zadané, vytvorí (alebo
// nastaví heslo) účtom hubco (admin) a viki (hráčka).
import { readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { client } from './content-lib.mjs'

const dir = process.argv[2]
const { TARGET_SUPABASE_URL: url, TARGET_SERVICE_ROLE_KEY: key } = process.env
if (!dir || !url || !key) {
  console.error(
    'Použitie: TARGET_SUPABASE_URL=… TARGET_SERVICE_ROLE_KEY=… npm run restore -- <záloha>',
  )
  process.exit(1)
}

const target = client(url.replace(/\/$/, ''), key)
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
const read = (table) =>
  JSON.parse(readFileSync(join(dir, 'data', `${table}.json`), 'utf8'))

const TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
}

// 1) Fotky a videá (rovnaké cesty, na ne odkazuje chapter_blocks.storage_path).
for (const [i, file] of manifest.files.entries()) {
  const data = readFileSync(join(dir, 'storage', file.path))
  const type =
    file.mimetype ?? TYPES[extname(file.path).toLowerCase()] ?? 'application/octet-stream'
  await target.upload(file.path, data, type)
  process.stdout.write(`\rsúbory: ${i + 1}/${manifest.files.length}`)
}
console.log()

// 2) Kapitoly najprv bez podmienok (odkazujú na kapitoly a otázky, ktoré
//    ešte nemusia existovať) — doplnia sa na konci.
const chapters = read('chapters')
await target.upsert(
  'chapters',
  chapters.map((c) => ({ ...c, required_chapter_id: null, required_block_id: null })),
)
await target.upsert('chapter_map_pins', read('chapter_map_pins'))

// 3) Bloky po úrovniach — rodič (príbeh, otázka, QR kód) pred deťmi.
const blocks = read('chapter_blocks')
const byId = new Map(blocks.map((b) => [b.id, b]))
const depth = (b) =>
  b.parent_block_id && byId.has(b.parent_block_id)
    ? 1 + depth(byId.get(b.parent_block_id))
    : 0
const maxDepth = Math.max(0, ...blocks.map(depth))
for (let level = 0; level <= maxDepth; level++) {
  await target.upsert(
    'chapter_blocks',
    blocks.filter((b) => depth(b) === level),
  )
}

await target.upsert('chapter_unlock_conditions', read('chapter_unlock_conditions'))
await target.upsert('chapter_answers', read('chapter_answers'))
await target.upsert(
  'chapter_block_qr_tokens',
  read('chapter_block_qr_tokens'),
  'block_id',
)
await target.upsert('chapter_map_segments', read('chapter_map_segments'))

for (const c of chapters) {
  if (c.required_chapter_id || c.required_block_id) {
    await target.patch('chapters', `id=eq.${c.id}`, {
      required_chapter_id: c.required_chapter_id,
      required_block_id: c.required_block_id,
    })
  }
}

// 4) Účty (voliteľné).
async function ensureUser(name, password, role) {
  const email = `${name}@nasa-cesta.local`
  const res = await fetch(`${target.url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    }),
  })
  if (!res.ok) {
    // Účet už existuje — iba nastaví heslo.
    const list = await (await target.request('/auth/v1/admin/users?per_page=1000')).json()
    const user = list.users.find((u) => u.email === email)
    if (!user)
      throw new Error(`Účet ${email} sa nepodarilo vytvoriť: ${await res.text()}`)
    await target.request(`/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
  }
  await target.patch('profiles', `email=eq.${encodeURIComponent(email)}`, { role })
  console.log(`účet ${name}: ${role}`)
}
if (process.env.HUBCO_PASSWORD)
  await ensureUser('hubco', process.env.HUBCO_PASSWORD, 'admin')
if (process.env.VIKI_PASSWORD)
  await ensureUser('viki', process.env.VIKI_PASSWORD, 'player')

// 5) Kontrola: v cieli musí byť aspoň všetko zo zálohy.
let ok = true
for (const [table, count] of Object.entries(manifest.tables)) {
  const have = (await target.selectAll(table)).length
  const mark = have >= count ? 'ok' : 'CHÝBA'
  if (have < count) ok = false
  console.log(`${table}: záloha ${count}, cieľ ${have} — ${mark}`)
}
const files = await target.listFiles()
const filesOk = manifest.files.every((f) => files.some((t) => t.path === f.path))
console.log(
  `súbory: záloha ${manifest.files.length}, cieľ ${files.length} — ${filesOk ? 'ok' : 'CHÝBA'}`,
)
if (!ok || !filesOk) process.exit(2)
console.log('Hotovo.')
