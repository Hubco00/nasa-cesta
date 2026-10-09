// Záloha obsahu z lokálneho Supabase: kapitoly, príbehy, otázky, odpovede,
// miesta, cesta na mape, QR kódy (iba hashe) a všetky fotky a videá.
//
//   npm run backup                 → ~/nasa-cesta-zaloha/<dátum_čas>/
//   npm run backup -- /iny/priecinok
//
// Z ostrého projektu (navyše postup hráčky a profily ako JSON, bez pg_dump):
//
//   SOURCE_SUPABASE_URL=https://<ref>.supabase.co \
//   SOURCE_SERVICE_ROLE_KEY=<service_role kľúč> \
//   npm run backup
//
// Záloha ide mimo repozitára — je verejný a príbehy ani odpovede doň nepatria.
// Nič nemaže ani nemení, iba číta.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { client, CONTENT_TABLES } from './content-lib.mjs'

const stamp = new Date().toISOString().slice(0, 19).replace('T', '_').replaceAll(':', '-')
const target = process.argv[2] ?? join(homedir(), 'nasa-cesta-zaloha', stamp)

const { SOURCE_SUPABASE_URL: remoteUrl, SOURCE_SERVICE_ROLE_KEY: remoteKey } = process.env
const remote = Boolean(remoteUrl && remoteKey)
const status = remote
  ? { API_URL: remoteUrl.replace(/\/$/, ''), SERVICE_ROLE_KEY: remoteKey }
  : JSON.parse(
      execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
    )
const local = client(status.API_URL, status.SERVICE_ROLE_KEY)

mkdirSync(join(target, 'data'), { recursive: true })
const manifest = {
  createdAt: new Date().toISOString(),
  source: status.API_URL,
  tables: {},
  files: [],
}

for (const table of CONTENT_TABLES) {
  const rows = await local.selectAll(table)
  writeFileSync(join(target, 'data', `${table}.json`), JSON.stringify(rows, null, 2))
  manifest.tables[table] = rows.length
  console.log(`${table}: ${rows.length}`)
}

for (const file of await local.listFiles()) {
  const data = await local.download(file.path)
  const out = join(target, 'storage', file.path)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, data)
  manifest.files.push({
    path: file.path,
    mimetype: file.mimetype,
    size: data.length,
    sha256: createHash('sha256').update(data).digest('hex'),
  })
}
const totalMb = manifest.files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024
console.log(`súbory: ${manifest.files.length} (${totalMb.toFixed(1)} MB)`)

// Navyše postup hráčky a profily pre krajnú núdzu — z ostrého projektu cez
// REST (pg_dump k nemu nemáme), z lokálneho celé dáta DB.
if (remote) {
  mkdirSync(join(target, 'extra'), { recursive: true })
  for (const table of [
    'profiles',
    'player_progress',
    'player_block_progress',
    'player_condition_progress',
  ]) {
    const res = await local.request(`/rest/v1/${table}?select=*`)
    writeFileSync(join(target, 'extra', `${table}.json`), await res.text())
  }
  writeFileSync(join(target, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`Záloha je v ${target}`)
  process.exit(0)
}

const dump = execFileSync(
  'docker',
  [
    'exec',
    'supabase_db_nasa-cesta',
    'pg_dump',
    '-U',
    'postgres',
    '--data-only',
    '--disable-triggers',
    '--schema=public',
  ],
  { maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
)
writeFileSync(join(target, 'public-data.sql'), dump)

writeFileSync(join(target, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`Záloha je v ${target}`)
