import { t } from "elysia"

export const SeriesSchema = t.Object({
  id: t.Number(),
  name: t.String(),
})

export type Series = (typeof SeriesSchema)["static"]
