import { openapi } from "@elysiajs/openapi"
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
  .use(openapi({
    path: '/docs',
  }))
  .use(seriesController)
  .use(charactersController)
  .use(itemsController)
  .use(locationsController)
  .use(outfitsController)

const server = Bun.serve({
  routes: {
    "/": indexHtml,
  },
  async fetch(req) {
    const { pathname } = new URL(req.url)
    if (pathname.startsWith("/uploads/")) {
      const file = Bun.file(`public${pathname}`)
      if (await file.exists()) return new Response(file)
      return new Response("Not found", { status: 404 })
    }
    return api.handle(req)
  },
  development: {
    hmr: true,
    console: true,
  },
})

export type App = typeof api

console.log(`🦊 Server running at ${server.url}`)
