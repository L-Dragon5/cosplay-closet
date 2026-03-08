import { db } from "@/backend/db"
import { COMPOUND_STOP_EXCEPTIONS, STOP_WORDS } from "./stopWords"

function parseCSVRow(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

const TYPE_MAP: Record<string, string> = {
  outfit: "Clothes",
  clothes: "Clothes",
  wig: "Wig",
  shoes: "Shoes",
  shoe: "Shoes",
  accessories: "Accessories",
  accessory: "Accessories",
  prop: "Prop",
  props: "Prop",
}

function normalizeType(type: string): string {
  const first = type.split(",")[0].trim().toLowerCase()
  return TYPE_MAP[first] ?? "Materials"
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s()]+/)
    .map((t) => t.replace(/[^a-z0-9'-]/g, ""))
    .filter((t) => t.length >= 2)
}

function isStopToken(token: string): boolean {
  return STOP_WORDS.has(token) || /^\d+$/.test(token) || token.length <= 1
}

function isCompoundBlocker(token: string): boolean {
  return isStopToken(token) && !COMPOUND_STOP_EXCEPTIONS.has(token)
}

/**
 * Within a series, find character names by looking for n-grams (1–3 words)
 * that appear in 2+ item names and aren't purely stop words.
 *
 * When a shorter n-gram appears inside a longer one with the same frequency,
 * we prefer the longer one (e.g. "Yae Sakura" over just "Yae").
 * When the shorter appears in MORE items than the longer, we prefer the shorter
 * (e.g. "Umi" over "Umi Angelic Angel").
 */
function findCharacters(itemNames: string[]): string[] {
  if (itemNames.length < 2) return []

  const frequency = new Map<string, number>()

  for (const name of itemNames) {
    if (name.includes(" / ")) continue // skip multi-character items
    const tokens = tokenize(name)
    const seen = new Set<string>()

    for (let n = 1; n <= 3; n++) {
      for (let i = 0; i <= tokens.length - n; i++) {
        const slice = tokens.slice(i, i + n)
        if (slice.every((t) => isStopToken(t))) continue
        const ngram = slice.join(" ")
        if (!seen.has(ngram)) {
          seen.add(ngram)
          frequency.set(ngram, (frequency.get(ngram) ?? 0) + 1)
        }
      }
    }
  }

  // Keep candidates appearing in 2+ items, dropping multi-word n-grams that
  // contain a stop-word token (e.g. "Fubuki Wig", "Young Ram", "Song For You").
  // This must happen BEFORE the shorter/longer resolution so that filtered
  // longer candidates don't cause their shorter base name to be dropped.
  const candidates = new Map<string, number>()
  for (const [ngram, count] of frequency) {
    if (count < 2) continue
    const words = ngram.split(" ")
    if (words.length > 1 && words.some((w) => isCompoundBlocker(w))) continue
    candidates.set(ngram, count)
  }

  // Resolve ambiguity between shorter and longer candidates that share a word:
  //   count(shorter) == count(longer) → prefer longer  (e.g. "Yae" → "Yae Sakura")
  //   count(shorter)  > count(longer) → prefer shorter (e.g. "Umi" over "Cheer Umi")
  const toRemove = new Set<string>()
  for (const [shorter, sc] of candidates) {
    for (const [longer, lc] of candidates) {
      if (shorter === longer) continue
      if (longer.split(" ").length <= shorter.split(" ").length) continue
      if (!longer.includes(shorter)) continue

      if (lc === sc) {
        toRemove.add(shorter) // longer is the full name
      } else if (sc > lc) {
        toRemove.add(longer) // shorter is the base character, longer is a costume variant
      }
    }
  }

  const finalCandidates = [...candidates.keys()].filter((c) => !toRemove.has(c))

  // Recover original casing from first matching item name
  const result: string[] = []
  for (const candidate of finalCandidates) {
    for (const name of itemNames) {
      const idx = name.toLowerCase().indexOf(candidate)
      if (idx >= 0) {
        const original = name
          .substring(idx, idx + candidate.length)
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
        result.push(original)
        break
      }
    }
  }

  return [...new Set(result)]
}

function assignCharacter(
  itemName: string,
  characters: string[],
): string | null {
  if (!characters.length || itemName.includes(" / ")) return null
  const lower = itemName.toLowerCase()
  let best: string | null = null
  let bestLen = 0
  for (const char of characters) {
    const lc = char.toLowerCase()
    if (lower.includes(lc) && lc.length > bestLen) {
      best = char
      bestLen = lc.length
    }
  }
  return best
}

function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * Given a series name and the list of already-canonical names, returns the
 * canonical name if the new name is within edit-distance 2 (catches typos
 * like "Leauge of Legends" → "League of Legends").
 */
function findCanonicalSeries(
  name: string,
  canonicals: string[],
): string | null {
  const lower = name.toLowerCase()
  for (const c of canonicals) {
    if (levenshtein(lower, c.toLowerCase()) <= 2) return c
  }
  return null
}

async function main() {
  // Read CSV first — Bun 1.3.10 MySQL driver loses connection sync if file
  // I/O follows a sequence of DB ops on the same connection.
  const content = await Bun.file(`${import.meta.dir}/../seedData.csv`).text()

  await db`SET FOREIGN_KEY_CHECKS = 0`
  await db`TRUNCATE TABLE outfit_items`
  await db`TRUNCATE TABLE outfits`
  await db`TRUNCATE TABLE items`
  await db`TRUNCATE TABLE locations`
  await db`TRUNCATE TABLE characters`
  await db`TRUNCATE TABLE series`
  await db`SET FOREIGN_KEY_CHECKS = 1`
  console.log("Truncated all tables")
  const lines = content.trim().split("\n")

  const rows: Array<{
    name: string
    series: string
    type: string
    location: string
    notes: string
  }> = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i])
    rows.push({
      name: cols[0]?.trim() ?? "",
      series: cols[1]?.trim() ?? "",
      type: cols[2]?.trim() ?? "",
      location: cols[3]?.trim() ?? "",
      notes: cols[4]?.trim() ?? "",
    })
  }

  console.log(`Parsed ${rows.length} rows`)

  // Normalize series names: merge typo variants into the first-seen canonical name
  const canonicalSeries: string[] = []
  const seriesNorm = new Map<string, string>()
  for (const row of rows) {
    if (!row.series || seriesNorm.has(row.series)) continue
    const canonical = findCanonicalSeries(row.series, canonicalSeries)
    if (canonical) {
      seriesNorm.set(row.series, canonical)
    } else {
      canonicalSeries.push(row.series)
      seriesNorm.set(row.series, row.series)
    }
  }
  for (const row of rows) {
    if (row.series) row.series = seriesNorm.get(row.series) ?? row.series
  }

  // Group by series
  const bySeries = new Map<string, typeof rows>()
  for (const row of rows) {
    if (!bySeries.has(row.series)) bySeries.set(row.series, [])
    bySeries.get(row.series)!.push(row)
  }

  // Insert series
  const seriesIds = new Map<string, number>()
  for (const name of bySeries.keys()) {
    if (!name) continue
    await db`INSERT IGNORE INTO series (name) VALUES (${name})`
    const [s] = await db`SELECT id FROM series WHERE name = ${name}`
    seriesIds.set(name, s.id)
  }
  console.log(`Series: ${seriesIds.size}`)

  // Find characters per series and insert them
  const characterIds = new Map<string, number>() // "seriesId:name" -> id
  const seriesCharacters = new Map<string, string[]>()

  for (const [seriesName, items] of bySeries) {
    if (!seriesName) continue
    const seriesId = seriesIds.get(seriesName)!
    const characters = findCharacters(items.map((i) => i.name))
    seriesCharacters.set(seriesName, characters)

    for (const name of characters) {
      await db`INSERT IGNORE INTO characters (name, series_id) VALUES (${name}, ${seriesId})`
      const [c] =
        await db`SELECT id FROM characters WHERE name = ${name} AND series_id = ${seriesId}`
      characterIds.set(`${seriesId}:${name}`, c.id)
    }

    if (characters.length > 0) {
      console.log(`  ${seriesName}: ${characters.join(", ")}`)
    }
  }
  console.log(`Characters: ${characterIds.size}`)

  // Insert locations
  const locationIds = new Map<string, number>()
  const uniqueLocations = [
    ...new Set(rows.map((r) => r.location).filter(Boolean)),
  ]
  for (const name of uniqueLocations) {
    await db`INSERT IGNORE INTO locations (name) VALUES (${name})`
    const [l] = await db`SELECT id FROM locations WHERE name = ${name}`
    locationIds.set(name, l.id)
  }
  console.log(`Locations: ${locationIds.size}`)

  // Insert items
  let inserted = 0

  for (const row of rows) {
    if (!row.name) continue

    const type = normalizeType(row.type)

    const seriesId = row.series ? (seriesIds.get(row.series) ?? null) : null

    let characterId: number | null = null
    if (seriesId && row.series) {
      const characters = seriesCharacters.get(row.series) ?? []
      const charName = assignCharacter(row.name, characters)
      if (charName) {
        characterId = characterIds.get(`${seriesId}:${charName}`) ?? null
      }
    }

    const locationId = row.location
      ? (locationIds.get(row.location) ?? null)
      : null

    await db`
			INSERT INTO items (name, type, series_id, character_id, location_id, notes)
			VALUES (
				${row.name},
				${type},
				${seriesId},
				${characterId},
				${locationId},
				${row.notes || null}
			)
		`
    inserted++
  }

  console.log(`Items inserted: ${inserted}`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
