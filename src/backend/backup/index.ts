import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { Elysia, t } from "elysia"
import { tryLock, unlock } from "./lock"
import { backupAndPrune, NotABackup, restore } from "./service"

export const backupController = new Elysia({ prefix: "/backup" })
  // A plain link in the UI: the browser downloads the fresh archive, and a
  // copy stays in backups/ on the server like any other backup.
  .get("/", async ({ set }) => {
    if (!tryLock()) {
      set.status = 409
      return { error: "A backup, restore or sync is already running" }
    }
    try {
      const { path } = await backupAndPrune()
      return new Response(Bun.file(path), {
        headers: {
          "Content-Type": "application/gzip",
          "Content-Disposition": `attachment; filename="${basename(path)}"`,
        },
      })
    } catch (e) {
      set.status = 500
      return { error: (e as Error).message }
    } finally {
      unlock()
    }
  })
  .post(
    "/restore",
    async ({ body, set }) => {
      if (!tryLock()) {
        set.status = 409
        return { error: "A backup, restore or sync is already running" }
      }
      const work = mkdtempSync(join(tmpdir(), "cc-upload-"))
      try {
        const archive = join(work, "backup.tar.gz")
        await Bun.write(archive, body.file)
        return await restore(archive)
      } catch (e) {
        set.status = e instanceof NotABackup ? 400 : 500
        return { error: (e as Error).message }
      } finally {
        rmSync(work, { recursive: true, force: true })
        unlock()
      }
    },
    { body: t.Object({ file: t.File() }) },
  )
