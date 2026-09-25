import { t } from "elysia"
import { ItemTypeSchema } from "@/backend/items/model"

/**
 * One add the user kept, by its index in `plan.adds`, with their edits.
 * An id picks an existing row; a name with a null id creates it on apply.
 */
export const AddChoiceSchema = t.Object({
  i: t.Integer({ minimum: 0 }),
  type: ItemTypeSchema,
  seriesId: t.Nullable(t.Integer()),
  series: t.Nullable(t.String({ minLength: 1 })),
  characterId: t.Nullable(t.Integer()),
  character: t.Nullable(t.String({ minLength: 1 })),
})

/** Omitted lists mean "all of them", as previewed. */
export const ApplyBodySchema = t.Object({
  hash: t.String(),
  moves: t.Optional(t.Array(t.Integer())),
  renames: t.Optional(t.Array(t.Integer())),
  adds: t.Optional(t.Array(AddChoiceSchema)),
})

export type AddChoice = (typeof AddChoiceSchema)["static"]
export type ApplyBody = (typeof ApplyBodySchema)["static"]
