import { Elysia, t } from "elysia"
import { ItemTypeSchema as itemType } from "./model"
import {
  createItem,
  deleteItem,
  getAllItems,
  getItemById,
  updateItem,
} from "./service"

export const itemsController = new Elysia({ prefix: "/items" })
  .get("/", () => getAllItems())
  .get(
    "/:id",
    async ({ params, set }) => {
      const item = await getItemById(params.id)
      if (!item) {
        set.status = 404
        return { error: "Not found" }
      }
      return item
    },
    { params: t.Object({ id: t.Numeric() }) },
  )
  .post(
    "/",
    async ({ body, set }) => {
      set.status = 201
      return createItem(
        body.name,
        body.type,
        body.series_id ?? null,
        body.character_id ?? null,
        body.location_id ?? null,
        body.notes ?? null,
      )
    },
    {
      body: t.Object({
        name: t.String(),
        type: itemType,
        series_id: t.Optional(t.Nullable(t.Number())),
        character_id: t.Optional(t.Nullable(t.Number())),
        location_id: t.Optional(t.Nullable(t.Number())),
        notes: t.Optional(t.Nullable(t.String())),
      }),
    },
  )
  .put(
    "/:id",
    async ({ params, body, set }) => {
      const item = await updateItem(
        params.id,
        body.name,
        body.type,
        body.series_id,
        body.character_id,
        body.location_id,
        body.notes,
      )
      if (!item) {
        set.status = 404
        return { error: "Not found" }
      }
      return item
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({
        name: t.String(),
        type: itemType,
        series_id: t.Nullable(t.Number()),
        character_id: t.Nullable(t.Number()),
        location_id: t.Nullable(t.Number()),
        notes: t.Nullable(t.String()),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      const deleted = await deleteItem(params.id)
      if (!deleted) {
        set.status = 404
        return { error: "Not found" }
      }
      return { success: true }
    },
    { params: t.Object({ id: t.Numeric() }) },
  )
