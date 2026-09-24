#!/usr/bin/env bun
/**
 * Puts a scripts/backup.ts archive back: the database, then the uploads.
 * Replaces, does not merge: every table in the dump and every file under
 * UPLOADS_DIR becomes what the archive holds.
 *
 *   bun run restore backups/cosplay-closet-<stamp>.tar.gz
 *
 * Takes a backup of what is here first and stops if that fails, so a restore
 * of the wrong file is itself undoable.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import {
  backup,
  connArgs,
  dbName,
  defaultPath,
  looksComplete,
  tail,
} from "./backup"

const TABLES = [
  "series",
  "characters",
  "locations",
  "items",
  "outfits",
  "outfit_items",
]

async function run(cmd: string[], stdin?: string): Promise<string> {
  const proc = Bun.spawn(cmd, {
    stdin: stdin ? Bun.file(stdin) : "ignore",
    stdout: "pipe",
    stderr: "pipe",
  })
  const [code, out, err] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  if (code !== 0) throw new Error(err.trim() || `${cmd[0]} exited ${code}`)
  return out
}

const fail = (msg: string): never => {
  console.error(msg)
  process.exit(1)
}

const archive = process.argv[2]
if (!archive || !existsSync(archive))
  fail("usage: bun run restore <backup.tar.gz>")

const env = process.env
const db = dbName(env)
const uploads = resolve(env.UPLOADS_DIR ?? "public/uploads")

const safety = defaultPath()
try {
  await backup(safety)
  console.log(`saved what was here first -> ${safety}`)
} catch (e) {
  fail(`safety backup failed, nothing restored:\n${(e as Error).message}`)
}

const work = mkdtempSync(join(tmpdir(), "cc-restore-"))
try {
  await run(["tar", "-xzf", resolve(archive), "-C", work])
  const sql = join(work, "db.sql")
  if (!existsSync(sql) || !looksComplete(await tail(sql)))
    throw new Error(`${archive} has no complete db.sql, nothing restored`)

  // Database first: if it fails, the uploads are still the ones that match it.
  await run(["mysql", ...connArgs(env), db], sql)
  console.log(`restored database ${db}`)

  // UPLOADS_DIR is a volume mount in the container, so empty it, never remove it.
  mkdirSync(uploads, { recursive: true })
  for (const entry of readdirSync(uploads))
    rmSync(join(uploads, entry), { recursive: true, force: true })
  if (existsSync(join(work, "uploads")))
    await run(["cp", "-R", `${join(work, "uploads")}/.`, `${uploads}/`])
  const files = readdirSync(uploads, { recursive: true, withFileTypes: true })
  console.log(
    `restored ${files.filter((f) => f.isFile()).length} upload(s) -> ${uploads}`,
  )

  // Through the client, not Bun.sql: one connection, no driver in the loop.
  const counts = await run([
    "mysql",
    ...connArgs(env),
    "-N",
    "-B",
    "-e",
    TABLES.map((t) => `select '${t}', count(*) from ${t}`).join(" union all "),
    db,
  ])
  console.log(`\nrows now:\n${counts.trim()}`)
} catch (e) {
  // exitCode, not exit(): the finally below still removes the temp dir.
  console.error(`restore failed: ${(e as Error).message}`)
  console.error(`undo with: bun run restore ${safety}`)
  process.exitCode = 1
} finally {
  rmSync(work, { recursive: true, force: true })
}
