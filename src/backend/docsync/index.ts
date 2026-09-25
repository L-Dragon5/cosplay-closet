import { Elysia } from "elysia"
import { tryLock, unlock } from "@/backend/backup/lock"
import { ApplyBodySchema } from "./model"
import {
  apply,
  BadSelection,
  DocUnavailable,
  MissingDocId,
  PlanChanged,
  preview,
} from "./service"

function statusFor(e: unknown): number {
  if (e instanceof MissingDocId || e instanceof BadSelection) return 400
  if (e instanceof PlanChanged) return 409
  if (e instanceof DocUnavailable) return 502
  return 500
}

// Pulls the "Cosplay Bin List" Google Doc: GET shows what would change,
// POST /apply makes it so (after a backup).
export const docsyncController = new Elysia({ prefix: "/docsync" })
  .get("/", async ({ set }) => {
    try {
      return await preview()
    } catch (e) {
      set.status = statusFor(e)
      return { error: (e as Error).message }
    }
  })
  .post(
    "/apply",
    async ({ body, set }) => {
      if (!tryLock()) {
        set.status = 409
        return { error: "A backup, restore or sync is already running" }
      }
      try {
        return await apply(body)
      } catch (e) {
        set.status = statusFor(e)
        return { error: (e as Error).message }
      } finally {
        unlock()
      }
    },
    { body: ApplyBodySchema },
  )
