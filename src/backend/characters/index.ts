import { Elysia, t } from "elysia"
import {
  createCharacter,
  deleteCharacter,
  getAllCharacters,
  getCharacterById,
  updateCharacter,
  updateCharacterImage,
} from "./service"

export const charactersController = new Elysia({ prefix: "/characters" })
  .get("/", () => getAllCharacters())
  .get(
    "/:id",
    async ({ params, set }) => {
      const character = await getCharacterById(params.id)
      if (!character) {
        set.status = 404
        return { error: "Not found" }
      }
      return character
    },
    { params: t.Object({ id: t.Numeric() }) },
  )
  .post(
    "/",
    async ({ body, set }) => {
      set.status = 201
      return createCharacter(body.name, body.series_id ?? null)
    },
    {
      body: t.Object({
        name: t.String(),
        series_id: t.Optional(t.Nullable(t.Number())),
      }),
    },
  )
  .put(
    "/:id",
    async ({ params, body, set }) => {
      const character = await updateCharacter(
        params.id,
        body.name,
        body.series_id,
      )
      if (!character) {
        set.status = 404
        return { error: "Not found" }
      }
      return character
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({
        name: t.String(),
        series_id: t.Nullable(t.Number()),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      const deleted = await deleteCharacter(params.id)
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
      const uploadDir = "public/uploads/characters"
      await Bun.$`mkdir -p ${uploadDir}`
      const filename = `${params.id}.jpg`
      await Bun.write(`${uploadDir}/${filename}`, body.image)
      const imagePath = `/uploads/characters/${filename}`
      const character = await updateCharacterImage(params.id, imagePath)
      if (!character) {
        set.status = 404
        return { error: "Not found" }
      }
      return character
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({ image: t.File() }),
    },
  )
