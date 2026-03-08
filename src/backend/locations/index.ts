import { Elysia, t } from "elysia"
import {
  createLocation,
  deleteLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
} from "./service"

export const locationsController = new Elysia({ prefix: "/locations" })
  .get("/", () => getAllLocations())
  .get(
    "/:id",
    async ({ params, set }) => {
      const location = await getLocationById(params.id)
      if (!location) {
        set.status = 404
        return { error: "Not found" }
      }
      return location
    },
    { params: t.Object({ id: t.Numeric() }) },
  )
  .post(
    "/",
    async ({ body, set }) => {
      set.status = 201
      return createLocation(body.name)
    },
    { body: t.Object({ name: t.String() }) },
  )
  .put(
    "/:id",
    async ({ params, body, set }) => {
      const location = await updateLocation(params.id, body.name)
      if (!location) {
        set.status = 404
        return { error: "Not found" }
      }
      return location
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({ name: t.String() }),
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      const deleted = await deleteLocation(params.id)
      if (!deleted) {
        set.status = 404
        return { error: "Not found" }
      }
      return { success: true }
    },
    { params: t.Object({ id: t.Numeric() }) },
  )
