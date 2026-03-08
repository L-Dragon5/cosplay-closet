import { t } from "elysia"

export const CharacterSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  series_id: t.Nullable(t.Number()),
})

export type Character = (typeof CharacterSchema)["static"]
