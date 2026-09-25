#!/usr/bin/env sh
# Nahrá ukážkovú fotku zo seed.sql do lokálneho Storage (db reset ho vymaže).
# Iba pre lokálny vývoj — používa lokálny service_role kľúč zo `supabase status`.
set -e
cd "$(dirname "$0")/.."
KEY=$(npx supabase status 2>&1 | grep -o '"SERVICE_ROLE_KEY":"[^"]*"' | cut -d'"' -f4)
for name in placeholder reward; do
  curl -sf -X POST "http://127.0.0.1:54321/storage/v1/object/chapter-photos/seed/$name.png" \
    -H "Authorization: Bearer $KEY" -H "Content-Type: image/png" -H "x-upsert: true" \
    --data-binary @supabase/seed-assets/placeholder.png > /dev/null
done
echo "Seed fotky nahrané."
