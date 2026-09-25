import { basename } from "node:path"
import { backupAndPrune } from "@/backend/backup/service"
import { db } from "@/backend/db"
import { parseBinList } from "./parse"
import { planSync, type State, type SyncPlan } from "./plan"

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

export async function preview(): Promise<SyncPlan> {
  const md = await fetchDoc()
  return planSync(parseBinList(md), await loadState())
}

export type ApplyResult = {
  moved: number
  renamed: number
  added: number
  newLocations: number
  newSeries: number
  notInDoc: number
  backup: string
}

/**
 * Recomputes the plan and applies it only if it is the one that was
 * previewed. Takes a backup first.
 *
 * ponytail: no transaction. Every step is idempotent against the doc, so a
 * failure part way leaves a state the next preview finishes; the backup
 * covers anything worse.
 */
export async function apply(
  hash: string,
  backup: () => Promise<{ path: string }> = backupAndPrune,
): Promise<ApplyResult> {
  const plan = await preview()
  if (plan.hash !== hash) {
    throw new PlanChanged(
      "The doc or the data changed since the preview. Preview again.",
    )
  }
  const { path } = await backup()

  const locationIds = new Map<string, number>()
  for (const name of plan.newLocations) {
    const r = await db`INSERT INTO locations (name) VALUES (${name})`
    locationIds.set(name, Number(r.lastInsertRowid))
  }
  const seriesIds = new Map<string, number>()
  for (const name of plan.newSeries) {
    const r = await db`INSERT INTO series (name) VALUES (${name})`
    seriesIds.set(name, Number(r.lastInsertRowid))
  }
  const loc = (id: number | null, name: string) =>
    id ?? locationIds.get(name) ?? null

  for (const m of plan.moves) {
    await db`UPDATE items SET location_id = ${loc(m.locationId, m.to)} WHERE id = ${m.itemId}`
  }
  for (const r of plan.renames) {
    await db`UPDATE items SET name = ${r.to} WHERE id = ${r.itemId}`
  }
  for (const a of plan.adds) {
    const seriesId =
      a.seriesId ?? (a.series ? (seriesIds.get(a.series) ?? null) : null)
    await db`INSERT INTO items (name, type, series_id, character_id, location_id, notes)
      VALUES (${a.name}, ${a.type}, ${seriesId}, ${a.characterId}, ${loc(a.locationId, a.location)}, ${a.notes})`
  }

  const result: ApplyResult = {
    moved: plan.moves.length,
    renamed: plan.renames.length,
    added: plan.adds.length,
    newLocations: plan.newLocations.length,
    newSeries: plan.newSeries.length,
    notInDoc: plan.notInDoc.length,
    backup: basename(path),
  }
  console.log(
    `[docsync] moved=${result.moved} renamed=${result.renamed} added=${result.added} newLocations=${result.newLocations} newSeries=${result.newSeries} notInDoc=${result.notInDoc} backup=${result.backup}`,
  )
  return result
}
