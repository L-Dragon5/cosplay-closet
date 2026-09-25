import type { ItemType } from "@/backend/items/model"
import { levenshtein } from "./levenshtein"
import type { DocEntry } from "./parse"

export type State = {
  items: { id: number; name: string; location_id: number | null }[]
  locations: { id: number; name: string }[]
  series: { id: number; name: string }[]
  characters: { id: number; name: string; series_id: number | null }[]
}

export type Move = {
  itemId: number
  name: string
  from: string | null
  to: string
  /** null: `to` is in newLocations and gets created on apply. */
  locationId: number | null
}

export type Rename = { itemId: number; from: string; to: string }

export type Add = {
  name: string
  type: ItemType
  series: string | null
  /** null with a series name: it is in newSeries and gets created on apply. */
  seriesId: number | null
  character: string | null
  characterId: number | null
  location: string
  locationId: number | null
  notes: string | null
}

export type SyncPlan = {
  entries: number
  moves: Move[]
  renames: Rename[]
  adds: Add[]
  notInDoc: { itemId: number; name: string; location: string | null }[]
  newLocations: string[]
  newSeries: string[]
  /** Apply refuses unless the plan it recomputes has the same hash. */
  hash: string
}

/** Loose key for series and locations: `Love Live!` == `love live`. */
export const looseKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

/**
 * Item key. The seed CSV was cleaned by hand from this doc, which dropped
 * sizes and nested series (`Kotone (Keijo) / Mabel (Animal Crossing) Wig` is
 * `Kotone / Mabel Wig`), so every `(…)` and `*…*` is ignored.
 */
export const itemKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\*[^*]*\*?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  )

const digits = (s: string) => (s.match(/\d+/g) ?? []).join(",")

// The type word nearest the end of the name, before any `with`/`and` clause,
// names the thing (`Summer Uniform Syo Shoes`, `Outfit with Fan Prop`). The
// bin heading is the fallback.
const TYPE_RULES: [RegExp, ItemType][] = [
  [
    /\b(outfits?|swimsuits?|dress|uniforms?|kimono|yukata|qipao|lingerie|gown|hoodie|jacket|bikini|kigu|skirt)\b/g,
    "Clothes",
  ],
  [/\b(wigs?|wefts)\b/g, "Wig"],
  [
    /\b(shoes?|boots?|sandals?|flats|pumps|heels|geta|sneakers|wedges|loafers?|booties)\b/g,
    "Shoes",
  ],
  [
    /\b(props?|wand|sword|staff|fans?|guns?|trident|pompoms|umbrella|mic|megaphone|bouquet)\b/g,
    "Prop",
  ],
  [
    /\b(headset|headband|headpiece|ears|crown|tiara|accessor(y|ies)|horns|tails?|wings|glasses|bracelets|hat|mask|armor|earrings|petticoats?|gloves|socks|clips)\b/g,
    "Accessories",
  ],
]

export function guessType(name: string, category: string | null): ItemType {
  const lower = name.toLowerCase()
  const head = lower.split(/\s+(?:with|and)\s+|,/)[0]!
  for (const text of [head, lower]) {
    let best: { at: number; type: ItemType } | null = null
    for (const [re, type] of TYPE_RULES) {
      for (const m of text.matchAll(re)) {
        if (!best || m.index > best.at) best = { at: m.index, type }
      }
    }
    if (best) return best.type
  }
  const cat = (category ?? "").toUpperCase()
  if (cat.includes("OUTFIT")) return "Clothes"
  if (cat.includes("SHOE")) return "Shoes"
  if (cat.includes("WIG")) return "Wig"
  if (cat.includes("PROP")) return "Prop"
  return "Materials"
}

/** A character of that series whose name, or one name token, is in the item name. */
export function guessCharacter(
  itemName: string,
  candidates: State["characters"],
): State["characters"][number] | null {
  const itemWords = words(itemName)
  const full = candidates.filter((c) =>
    [...words(c.name)].every((w) => itemWords.has(w)),
  )
  if (full.length === 1) return full[0]!
  if (full.length > 1) return null
  const partial = candidates.filter((c) =>
    [...words(c.name)].some((w) => w.length >= 3 && itemWords.has(w)),
  )
  // ponytail: two characters share a token (two "Sakura"s) -> leave it unset.
  return partial.length === 1 ? partial[0]! : null
}

export function planSync(entries: DocEntry[], state: State): SyncPlan {
  // --- Locations: exact loose match, then word containment one-to-one, so
  // `Small Black Travel Suitcase` finds the seeded `Small Black Suitcase` but
  // `My Room Cosplay Hangers` does not steal `Cosplay Hangers`.
  const docLocations = [...new Set(entries.map((e) => e.location))]
  const locById = new Map(state.locations.map((l) => [l.id, l.name]))
  const locFor = new Map<string, number | null>()
  const claimedLoc = new Set<number>()
  for (const name of docLocations) {
    const hit = state.locations.find(
      (l) => !claimedLoc.has(l.id) && looseKey(l.name) === looseKey(name),
    )
    if (hit) {
      locFor.set(name, hit.id)
      claimedLoc.add(hit.id)
    }
  }
  for (const name of docLocations) {
    if (locFor.has(name)) continue
    const docWords = words(name)
    const hits = state.locations.filter((l) => {
      if (claimedLoc.has(l.id)) return false
      const w = words(l.name)
      return w.size >= 2 && [...w].every((x) => docWords.has(x))
    })
    if (hits.length === 1) {
      locFor.set(name, hits[0]!.id)
      claimedLoc.add(hits[0]!.id)
    } else {
      locFor.set(name, null)
    }
  }
  const newLocations = docLocations.filter((n) => locFor.get(n) === null)

  // --- Items: same key at the same location, then same key anywhere, then a
  // typo-level fuzzy match. Each DB item is claimed once: `White Sandals`
  // really is in two bins.
  const keyed = entries.map((e) => ({ entry: e, key: itemKey(e.name) }))
  const byKey = new Map<string, State["items"]>()
  for (const item of state.items) {
    const k = itemKey(item.name)
    byKey.set(k, [...(byKey.get(k) ?? []), item])
  }
  const claimed = new Set<number>()
  const match: (State["items"][number] | null)[] = keyed.map(() => null)
  const claim = (i: number, item: State["items"][number] | undefined) => {
    if (!item) return
    match[i] = item
    claimed.add(item.id)
  }
  keyed.forEach(({ entry, key }, i) => {
    const loc = locFor.get(entry.location)
    claim(
      i,
      (byKey.get(key) ?? []).find(
        (it) => !claimed.has(it.id) && loc != null && it.location_id === loc,
      ),
    )
  })
  keyed.forEach(({ key }, i) => {
    if (match[i]) return
    claim(
      i,
      (byKey.get(key) ?? []).find((it) => !claimed.has(it.id)),
    )
  })
  keyed.forEach(({ key }, i) => {
    // ponytail: O(unmatched x unclaimed) Levenshtein; both are small after
    // the exact passes. Digits must agree so `Wig #1` never becomes `Wig #2`.
    if (match[i] || key.length < 8) return
    let best: State["items"][number] | undefined
    let bestDist = 3
    for (const it of state.items) {
      if (claimed.has(it.id)) continue
      const k = itemKey(it.name)
      if (Math.abs(k.length - key.length) > 2 || digits(k) !== digits(key))
        continue
      const d = levenshtein(k, key)
      if (d < bestDist) {
        best = it
        bestDist = d
      }
    }
    claim(i, best)
  })
  // Reworded in the doc since the seed: one name's words all appear in the
  // other (`Hikari Sword Prop` -> `Revue Starlight Hikari Sword Prop`). Only a
  // single candidate counts, and those items take the doc's wording.
  const renamed = new Set<number>()
  keyed.forEach(({ entry, key }, i) => {
    if (match[i]) return
    const a = new Set(key.split(" "))
    const hits = state.items.filter((it) => {
      if (claimed.has(it.id)) return false
      const b = new Set(itemKey(it.name).split(" "))
      const [small, big] = a.size <= b.size ? [a, b] : [b, a]
      return small.size >= 2 && [...small].every((w) => big.has(w))
    })
    const loc = locFor.get(entry.location)
    const here = hits.filter((it) => loc != null && it.location_id === loc)
    const pick =
      hits.length === 1 ? hits[0] : here.length === 1 ? here[0] : null
    if (!pick) return
    claim(i, pick)
    renamed.add(i)
  })

  // --- Series for new items: loose match with typo tolerance, like seed.ts.
  const newSeries: string[] = []
  const resolveSeries = (name: string): { id: number | null; name: string } => {
    const k = looseKey(name)
    const close = (other: string) => {
      const o = looseKey(other)
      return o === k || (k.length >= 5 && levenshtein(o, k) <= 2)
    }
    const hit = state.series.find((s) => close(s.name))
    if (hit) return { id: hit.id, name: hit.name }
    const pending = newSeries.find(close)
    if (pending) return { id: null, name: pending }
    newSeries.push(name)
    return { id: null, name }
  }

  const moves: Move[] = []
  const renames: Rename[] = []
  const adds: Add[] = []
  keyed.forEach(({ entry }, i) => {
    const locationId = locFor.get(entry.location) ?? null
    const item = match[i]
    if (item) {
      if (renamed.has(i) && item.name !== entry.name) {
        renames.push({ itemId: item.id, from: item.name, to: entry.name })
      }
      if (locationId === null || item.location_id !== locationId) {
        moves.push({
          itemId: item.id,
          name: item.name,
          from:
            item.location_id === null
              ? null
              : (locById.get(item.location_id) ?? null),
          to: entry.location,
          locationId,
        })
      }
      return
    }
    const series = entry.series ? resolveSeries(entry.series) : null
    const seriesId = series?.id ?? null
    const character =
      seriesId === null
        ? null
        : guessCharacter(
            entry.name,
            state.characters.filter((c) => c.series_id === seriesId),
          )
    adds.push({
      name: entry.name,
      type: guessType(entry.name, entry.category),
      series: series?.name ?? null,
      seriesId,
      character: character?.name ?? null,
      characterId: character?.id ?? null,
      location: entry.location,
      locationId,
      notes: entry.notes,
    })
  })

  const notInDoc = state.items
    .filter((it) => !claimed.has(it.id))
    .map((it) => ({
      itemId: it.id,
      name: it.name,
      location:
        it.location_id === null ? null : (locById.get(it.location_id) ?? null),
    }))

  const hash = new Bun.CryptoHasher("sha256")
    .update(JSON.stringify({ moves, renames, adds, newLocations, newSeries }))
    .digest("hex")

  return {
    entries: entries.length,
    moves,
    renames,
    adds,
    notInDoc,
    newLocations,
    newSeries,
    hash,
  }
}
