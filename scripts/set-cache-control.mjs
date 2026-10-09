// Nastaví všetkým fotkám a videám v Storage dlhú cache (1 rok) — súbory
// nahraté pred touto zmenou majú iba 1 hodinu, takže ich prehliadač po hodine
// sťahuje znova (egress). Storage cache-control nevie zmeniť bez nového
// nahratia, preto sa každý súbor nahrá znova na tú istú cestu.
//
//   TARGET_SUPABASE_URL=https://<ref>.supabase.co \
//   TARGET_SERVICE_ROLE_KEY=<service_role kľúč> \
//   npm run set-cache-control -- [~/nasa-cesta-zaloha/<dátum_čas>]
//
// So zálohou (scripts/backup.mjs) sa súbory berú z disku a nič sa nesťahuje;
// čo v zálohe nie je, stiahne sa z projektu. Nemaže nič, dá sa spustiť znova.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { client } from './content-lib.mjs'

const backupDir = process.argv[2]
const { TARGET_SUPABASE_URL: url, TARGET_SERVICE_ROLE_KEY: key } = process.env
if (!url || !key) {
  console.error(
    'Použitie: TARGET_SUPABASE_URL=… TARGET_SERVICE_ROLE_KEY=… npm run set-cache-control -- [záloha]',
  )
  process.exit(1)
}

const target = client(url.replace(/\/$/, ''), key)
const files = await target.listFiles()
let fromBackup = 0
let downloaded = 0

for (const file of files) {
  const local = backupDir && join(backupDir, 'storage', file.path)
  let data
  if (local && existsSync(local)) {
    data = readFileSync(local)
    fromBackup++
  } else {
    data = await target.download(file.path)
    downloaded++
  }
  await target.upload(file.path, data, file.mimetype ?? 'application/octet-stream')
  console.log(`✓ ${file.path}`)
}

console.log(
  `Hotovo: ${files.length} súborov (${fromBackup} zo zálohy, ${downloaded} stiahnutých).`,
)
