import { t } from "elysia"
import { ItemSchema } from "@/backend/items/model"

export const OutfitSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  character_id: t.Nullable(t.Number()),
  items: t.Array(ItemSchema),
})

export type Outfit = (typeof OutfitSchema)["static"]
