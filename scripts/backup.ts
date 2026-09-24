#!/usr/bin/env bun
/**
 * Everything the app owns, in one file: a mysqldump of the database plus the
 * uploaded images, as a .tar.gz that scripts/restore.ts puts back.
 *
 *   bun run backup            -> backups/cosplay-closet-<stamp>.tar.gz, then prune
 *   bun run backup out.tar.gz -> that path instead, and nothing is pruned
 *
 * Archive layout: `db.sql` (no CREATE DATABASE, so it restores into whatever
 * DB_DATABASE the target uses) and `uploads/` (the contents of UPLOADS_DIR).
 *
 * Reads the same DB_* env as src/backend/db.ts. UPLOADS_DIR defaults to
 * public/uploads, which is where the app writes; point it elsewhere when the
 * app runs from another directory than this one.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"

export type DbEnv = {
  DB_HOST?: string
  DB_PORT?: string
  DB_USER?: string
  DB_PASS?: string
  DB_DATABASE?: string
  UPLOADS_DIR?: string
}

const PREFIX = "cosplay-closet"

export function dbName(env: DbEnv): string {
  const db = env.DB_DATABASE ?? ""
  // Passed as an argv entry, never through a shell, but a name that is not an
  // identifier is a typo in .env, and refusing it beats dumping the wrong thing.
  if (!/^[\w-]+$/.test(db)) throw new Error(`bad database name: ${db}`)
  return db
}

/** Connection flags shared by mysqldump and mysql. */
export function connArgs(env: DbEnv): string[] {
  return [
    `--host=${env.DB_HOST || "127.0.0.1"}`,
    `--port=${env.DB_PORT || "3306"}`,
    `--user=${env.DB_USER || "root"}`,
    // Only when there is one: an empty --password= means "the empty password",
    // not "no password", and would break a passwordless local root.
    ...(env.DB_PASS ? [`--password=${env.DB_PASS}`] : []),
  ]
}

export function dumpArgs(env: DbEnv): string[] {
  // --single-transaction: a consistent snapshot without locking the app out.
  // The bare name, not --databases: no CREATE DATABASE / USE in the dump, so
  // it restores into the target's DB_DATABASE even if the name changed.
  return [...connArgs(env), "--single-transaction", dbName(env)]
}

/**
 * mysqldump signs off with "Dump completed"; without it the file is not a
 * backup, whatever its size or exit code.
 */
export const looksComplete = (tail: string): boolean =>
  /Dump completed/i.test(tail)

export const defaultPath = (now = new Date()): string =>
  join(
    "backups",
    `${PREFIX}-${now.toISOString().slice(0, 19).replace(/:/g, "-")}.tar.gz`,
  )

/**
 * Which of `names` to delete: kept while younger than `maxAgeDays`, and the
 * newest `keepAtLeast` are kept whatever their age. Age, not count, so a burst
 * of pre-deploy dumps (Komodo retrying a failed deploy) never pushes out
 * history. Only names defaultPath writes are candidates, and the age comes from
 * the name, because a copy resets mtime.
 */
export function toPrune(
  names: string[],
  now: Date,
  maxAgeDays = 30,
  keepAtLeast = 7,
): string[] {
  const shape = new RegExp(
    `^${PREFIX}-(\\d{4}-\\d{2}-\\d{2})T(\\d{2})-(\\d{2})-(\\d{2})\\.tar\\.gz$`,
  )
  const dated = names.flatMap((name) => {
    const m = shape.exec(name)
    const at = m && Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`)
    return at ? [{ name, at }] : []
  })
  // Names sort chronologically, so newest-first is a string sort.
  dated.sort((a, b) => (a.name < b.name ? 1 : -1))
  const cutoff = now.getTime() - maxAgeDays * 86_400_000
  return dated
    .slice(keepAtLeast)
    .filter((d) => d.at < cutoff)
    .map((d) => d.name)
}

/** Last `n` bytes of a file as text. */
export async function tail(path: string, n = 200): Promise<string> {
  const size = Bun.file(path).size
  // Explicit offsets: BunFile.slice(-n) has returned nothing in some Bun versions.
  return Bun.file(path)
    .slice(Math.max(0, size - n), size)
    .text()
}

export async function backup(out: string, env: DbEnv = process.env) {
  const uploads = resolve(env.UPLOADS_DIR ?? "public/uploads")
  const work = mkdtempSync(join(tmpdir(), "cc-backup-"))
  try {
    const sql = join(work, "db.sql")
    let proc: ReturnType<typeof Bun.spawn>
    try {
      // Straight into the file: writing the raw stream stringifies it.
      proc = Bun.spawn(["mysqldump", ...dumpArgs(env)], {
        stdout: Bun.file(sql),
        stderr: "pipe",
      })
    } catch {
      throw new Error(
        "mysqldump not found. Install the MariaDB client tools (apt install mariadb-client, brew install mariadb)",
      )
    }
    const code = await proc.exited
    const err = await new Response(proc.stderr as ReadableStream).text()
    if (code !== 0 || !looksComplete(await tail(sql)))
      throw new Error(err.trim() || `mysqldump exited ${code}`)

    // `uploads` in the archive whatever UPLOADS_DIR is called: a symlink that
    // tar -h follows (same flag on GNU and BSD tar). No uploads yet is an
    // empty folder, not an error: a fresh install has none.
    if (existsSync(uploads)) symlinkSync(uploads, join(work, "uploads"))
    else mkdirSync(join(work, "uploads"))

    mkdirSync(dirname(resolve(out)), { recursive: true })
    const tar = Bun.spawn(
      ["tar", "-czhf", resolve(out), "-C", work, "db.sql", "uploads"],
      // macOS tar otherwise adds ._ AppleDouble files for extended attributes.
      { env: { ...process.env, COPYFILE_DISABLE: "1" }, stderr: "pipe" },
    )
    if ((await tar.exited) !== 0)
      throw new Error(await new Response(tar.stderr).text())
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

if (import.meta.main) {
  const named = process.argv[2]
  const out = named ?? defaultPath()
  try {
    await backup(out)
  } catch (e) {
    rmSync(out, { force: true })
    console.error((e as Error).message)
    console.error(`\nbackup failed, nothing written to ${out}`)
    process.exit(1)
  }
  const mb = (Bun.file(out).size / 1_000_000).toFixed(2)
  console.log(`backed up -> ${out} (${mb} MB)`)

  if (!named) {
    const dir = dirname(out)
    const gone = toPrune(readdirSync(dir), new Date())
    for (const name of gone) unlinkSync(join(dir, name))
    if (gone.length)
      console.log(`pruned ${gone.length} backup(s) older than 30 days`)
  }
  console.log(`restore with:\n  bun run restore ${out}`)
}
