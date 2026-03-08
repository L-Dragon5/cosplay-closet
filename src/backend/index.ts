import { Elysia } from "elysia"
import { charactersController } from "@/backend/characters"
import { initDb } from "@/backend/db"
import { itemsController } from "@/backend/items"
import { locationsController } from "@/backend/locations"
import { outfitsController } from "@/backend/outfits"
import { seriesController } from "@/backend/series"
import indexHtml from "../../public/index.html"

await initDb()

const api = new Elysia({ prefix: "/api" })
  .use(seriesController)
  .use(charactersController)
  .use(itemsController)
  .use(locationsController)
  .use(outfitsController)
  .get("/", () => "Hello World")

const server = Bun.serve({
  routes: {
    "/": indexHtml,
  },
  fetch(req) {
    return api.handle(req)
  },
  development: {
    hmr: true,
    console: true,
  },
})

export type App = typeof api

console.log(`🦊 Server running at ${server.url}`)
