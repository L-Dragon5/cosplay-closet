import { openapi } from "@elysiajs/openapi"
import { Elysia, t } from "elysia"
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
  .get("/proxy-image", async ({ query }) => {
    const res = await fetch(query.url)
    if (!res.ok) return new Response("Failed to fetch image", { status: 502 })
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    })
  }, {
    query: t.Object({ url: t.String() }),
  })
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
