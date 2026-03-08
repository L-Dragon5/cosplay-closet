import { Elysia, t } from "elysia"
import {
  createOutfit,
  deleteOutfit,
  getAllOutfits,
  getOutfitById,
  updateOutfit,
  updateOutfitImage,
} from "./service"

export const outfitsController = new Elysia({ prefix: "/outfits" })
  .get("/", () => getAllOutfits())
  .get(
    "/:id",
    async ({ params, set }) => {
      const outfit = await getOutfitById(params.id)
      if (!outfit) {
        set.status = 404
        return { error: "Not found" }
      }
      return outfit
    },
    { params: t.Object({ id: t.Numeric() }) },
  )
  .post(
    "/",
    async ({ body, set }) => {
      set.status = 201
      return createOutfit(
        body.name,
        body.character_id ?? null,
        body.item_ids ?? [],
      )
    },
    {
      body: t.Object({
        name: t.String(),
        character_id: t.Optional(t.Nullable(t.Number())),
        item_ids: t.Optional(t.Array(t.Number())),
      }),
    },
  )
  .put(
    "/:id",
    async ({ params, body, set }) => {
      const outfit = await updateOutfit(
        params.id,
        body.name,
        body.character_id,
        body.item_ids,
      )
      if (!outfit) {
        set.status = 404
        return { error: "Not found" }
      }
      return outfit
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({
        name: t.String(),
        character_id: t.Nullable(t.Number()),
        item_ids: t.Array(t.Number()),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      const deleted = await deleteOutfit(params.id)
      if (!deleted) {
        set.status = 404
        return { error: "Not found" }
      }
      return { success: true }
    },
    { params: t.Object({ id: t.Numeric() }) },
  )
  .post(
    "/:id/image",
    async ({ params, body, set }) => {
      const uploadDir = "public/uploads/outfits"
      await Bun.$`mkdir -p ${uploadDir}`
      const filename = `${params.id}.jpg`
      await Bun.write(`${uploadDir}/${filename}`, body.image)
      const imagePath = `/uploads/outfits/${filename}`
      const outfit = await updateOutfitImage(params.id, imagePath)
      if (!outfit) {
        set.status = 404
        return { error: "Not found" }
      }
      return outfit
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({ image: t.File() }),
    },
  )
