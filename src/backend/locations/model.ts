import { t } from "elysia"

export const LocationSchema = t.Object({
  id: t.Number(),
  name: t.String(),
})

export type Location = (typeof LocationSchema)["static"]
