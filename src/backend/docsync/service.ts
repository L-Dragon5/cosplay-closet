import { basename } from "node:path"
import { backupAndPrune } from "@/backend/backup/service"
import { db } from "@/backend/db"
import type { ApplyBody } from "./model"
import { parseBinList } from "./parse"
import { type Add, planSync, type State, type SyncPlan } from "./plan"

export class MissingDocId extends Error {}
export class DocUnavailable extends Error {}
export class PlanChanged extends Error {}

export const exportUrl = (docId: string) =>
  `https://docs.google.com/document/d/${docId}/export?format=md`

export async function fetchDoc(docId = process.env.BIN_LIST_DOC_ID) {
  if (!docId) throw new MissingDocId("BIN_LIST_DOC_ID is not set")
  const res = await fetch(exportUrl(docId))
  // A doc that stopped being link-shared answers 200 with a Google login page.
  const type = res.headers.get("content-type") ?? ""
  if (!res.ok || !type.includes("markdown")) {
    throw new DocUnavailable(
      `Could not read the Bin List doc (HTTP ${res.status}, ${type || "no content type"}). It must be shared as "Anyone with the link can view".`,
    )
  }
  return res.text()
}

async function loadState(): Promise<State> {
  return {
    items:
      (await db`SELECT id, name, location_id FROM items ORDER BY id`) as State["items"],
    locations:
      (await db`SELECT id, name FROM locations ORDER BY id`) as State["locations"],
    series:
      (await db`SELECT id, name FROM series ORDER BY id`) as State["series"],
    characters:
      (await db`SELECT id, name, series_id FROM characters ORDER BY id`) as State["characters"],
  }
}

async function load() {
  const md = await fetchDoc()
  const state = await loadState()
  return { plan: planSync(parseBinList(md), state), state }
}

export async function preview(): Promise<SyncPlan> {
  return (await load()).plan
}

export type ApplyResult = {
  moved: number
  renamed: number
  added: number
  newLocations: number
  newSeries: number
  newCharacters: number
  skipped: number
  notInDoc: number
  backup: string
}

export class BadSelection extends Error {}

/** Checks the picks against the plan and state before anything is written. */
function choose(plan: SyncPlan, state: State, pick: Omit<ApplyBody, "hash">) {
  const only = <T>(all: T[], key: (x: T) => number, ids?: number[]) => {
    if (!ids) return all
    const known = new Set(all.map(key))
    const bad = ids.filter((id) => !known.has(id))
    if (bad.length)
      throw new BadSelection(`Not in the plan: item ${bad.join(", ")}`)
    const keep = new Set(ids)
    return all.filter((x) => keep.has(key(x)))
  }
  const moves = only(plan.moves, (m) => m.itemId, pick.moves)
  const renames = only(plan.renames, (r) => r.itemId, pick.renames)

  const seriesIds = new Set(state.series.map((s) => s.id))
  const characterIds = new Set(state.characters.map((c) => c.id))
  const adds: Add[] = pick.adds
    ? pick.adds.map((c) => {
        const base = plan.adds[c.i]
        if (!base) throw new BadSelection(`No add #${c.i} in the plan`)
        if (c.seriesId !== null && !seriesIds.has(c.seriesId))
          throw new BadSelection(`Unknown series ${c.seriesId}`)
        if (c.characterId !== null && !characterIds.has(c.characterId))
          throw new BadSelection(`Unknown character ${c.characterId}`)
        return { ...base, ...c }
      })
    : plan.adds
  const skipped =
    plan.moves.length +
    plan.renames.length +
    plan.adds.length -
    moves.length -
    renames.length -
    adds.length
  return { moves, renames, adds, skipped }
}

/**
 * Recomputes the plan and applies the picked parts of it, only if it is the
 * plan that was previewed. Takes a backup first. New locations, series and
 * characters are created on first use, so skipped rows leave none behind.
 *
 * ponytail: no transaction. Every step is idempotent against the doc, so a
 * failure part way leaves a state the next preview finishes; the backup
 * covers anything worse.
 */
export async function apply(
  { hash, ...pick }: ApplyBody,
  backup: () => Promise<{ path: string }> = backupAndPrune,
): Promise<ApplyResult> {
  const { plan, state } = await load()
  if (plan.hash !== hash) {
    throw new PlanChanged(
      "The doc or the data changed since the preview. Preview again.",
    )
  }
  const { moves, renames, adds, skipped } = choose(plan, state, pick)
  const { path } = await backup()

  const created = { locations: 0, series: 0, characters: 0 }
  const cache = new Map<string, number>()
  const once = async (
    key: string,
    insert: () => Promise<{ lastInsertRowid: unknown }>,
  ) => {
    let id = cache.get(key)
    if (id === undefined) {
      id = Number((await insert()).lastInsertRowid)
      cache.set(key, id)
    }
    return id
  }
  const loc = (id: number | null, name: string) =>
    id ??
    once(`l:${name}`, () => {
      created.locations++
      return db`INSERT INTO locations (name) VALUES (${name})`
    })
  const series = (id: number | null, name: string | null) =>
    id ??
    (name === null
      ? null
      : once(`s:${name}`, () => {
          created.series++
          return db`INSERT INTO series (name) VALUES (${name})`
        }))
  const character = (
    id: number | null,
    name: string | null,
    seriesId: number | null,
  ) =>
    id ??
    (name === null
      ? null
      : once(`c:${seriesId}:${name}`, () => {
          created.characters++
          return db`INSERT INTO characters (name, series_id) VALUES (${name}, ${seriesId})`
        }))

  for (const m of moves) {
    await db`UPDATE items SET location_id = ${await loc(m.locationId, m.to)} WHERE id = ${m.itemId}`
  }
  for (const r of renames) {
    await db`UPDATE items SET name = ${r.to} WHERE id = ${r.itemId}`
  }
  for (const a of adds) {
    const seriesId = await series(a.seriesId, a.series)
    const characterId = await character(a.characterId, a.character, seriesId)
    await db`INSERT INTO items (name, type, series_id, character_id, location_id, notes)
      VALUES (${a.name}, ${a.type}, ${seriesId}, ${characterId}, ${await loc(a.locationId, a.location)}, ${a.notes})`
  }

  const result: ApplyResult = {
    moved: moves.length,
    renamed: renames.length,
    added: adds.length,
    newLocations: created.locations,
    newSeries: created.series,
    newCharacters: created.characters,
    skipped,
    notInDoc: plan.notInDoc.length,
    backup: basename(path),
  }
  console.log(
    `[docsync] moved=${result.moved} renamed=${result.renamed} added=${result.added} skipped=${result.skipped} newLocations=${result.newLocations} newSeries=${result.newSeries} newCharacters=${result.newCharacters} notInDoc=${result.notInDoc} backup=${result.backup}`,
  )
  return result
}
