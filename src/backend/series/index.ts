import { Elysia, t } from "elysia"
import {
  createSeries,
  deleteSeries,
  getAllSeries,
  getSeriesById,
  updateSeries,
} from "./service"

export const seriesController = new Elysia({ prefix: "/series" })
  .get("/", () => getAllSeries())
  .get(
    "/:id",
    async ({ params, set }) => {
      const series = await getSeriesById(params.id)
      if (!series) {
        set.status = 404
        return { error: "Not found" }
      }
      return series
    },
    { params: t.Object({ id: t.Numeric() }) },
  )
  .post(
    "/",
    async ({ body, set }) => {
      set.status = 201
      return createSeries(body.name)
    },
    { body: t.Object({ name: t.String() }) },
  )
  .put(
    "/:id",
    async ({ params, body, set }) => {
      const series = await updateSeries(params.id, body.name)
      if (!series) {
        set.status = 404
        return { error: "Not found" }
      }
      return series
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({ name: t.String() }),
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      const deleted = await deleteSeries(params.id)
      if (!deleted) {
        set.status = 404
        return { error: "Not found" }
      }
      return { success: true }
    },
    { params: t.Object({ id: t.Numeric() }) },
  )
