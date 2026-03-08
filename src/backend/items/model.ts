import { t } from "elysia"

export const ItemTypeSchema = t.Union([
  t.Literal("Clothes"),
  t.Literal("Wig"),
  t.Literal("Shoes"),
  t.Literal("Accessories"),
  t.Literal("Prop"),
  t.Literal("Materials"),
])

export const ItemSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  series_id: t.Nullable(t.Number()),
  character_id: t.Nullable(t.Number()),
  location_id: t.Nullable(t.Number()),
  type: ItemTypeSchema,
  notes: t.Nullable(t.String()),
})

export type ItemType = (typeof ItemTypeSchema)["static"]
export type Item = (typeof ItemSchema)["static"]
