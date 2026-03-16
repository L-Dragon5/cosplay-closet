import { openapi } from "@elysiajs/openapi"
import { Elysia, t } from "elysia"
import { charactersController } from "@/backend/characters"
import { initDb } from "@/backend/db"
import { itemsController } from "@/backend/items"
import { locationsController } from "@/backend/locations"
import { outfitsController } from "@/backend/outfits"
import { seriesController } from "@/backend/series"
import indexHtml from "../../public/index.html"

interface SchoolIdoluCard {
  idol?: { name: string }
  card_image: string | null
  card_idolized_image: string | null
  clean_ur: string | null
  clean_ur_idolized: string | null
  transparent_image: string | null
  transparent_idolized_image: string | null
}

interface IdolStoryCard {
  idol_name: string
  art: string | null
  art_idolized: string | null
  transparent: string | null
  transparent_idolized: string | null
}

await initDb()

const api = new Elysia({ prefix: "/api" })
  .use(
    openapi({
      path: "/docs",
    }),
  )
  .get(
    "/proxy-image",
    async ({ query }) => {
      const res = await fetch(query.url)
      if (!res.ok) return new Response("Failed to fetch image", { status: 502 })
      return new Response(res.body, {
        headers: {
          "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
          "Cache-Control": "public, max-age=3600",
        },
      })
    },
    {
      query: t.Object({ url: t.String() }),
    },
  )
  .get(
    "/schoolidolu",
    async ({ query }) => {
      const name = query.name?.trim()
      const search = query.search?.trim()
      if (!name && !search) return { images: [] }
      const reversedName = name
        ? name.split(/\s+/).reverse().join(" ")
        : undefined
      const params = new URLSearchParams({ ordering: "-id", page_size: "10" })
      if (reversedName) params.set("name", reversedName)
      if (search) params.set("search", search)
      const url = `https://schoolido.lu/api/cards/?${params}`
      const res = await fetch(url, { headers: { Accept: "application/json" } })
      if (!res.ok) return { images: [] }
      const data = (await res.json()) as { results: SchoolIdoluCard[] }
      const images = data.results
        .flatMap((card) => {
          const label = card.idol?.name ?? name ?? search ?? ""
          const urls: { label: string; imageUrl: string }[] = []
          const img = card.clean_ur ?? card.transparent_image ?? card.card_image
          const imgIdolized =
            card.clean_ur_idolized ??
            card.transparent_idolized_image ??
            card.card_idolized_image
          if (img)
            urls.push({
              label,
              imageUrl: img.startsWith("//") ? `https:${img}` : img,
            })
          if (imgIdolized)
            urls.push({
              label,
              imageUrl: imgIdolized.startsWith("//")
                ? `https:${imgIdolized}`
                : imgIdolized,
            })
          return urls
        })
        .slice(0, 9)
      return { images }
    },
    {
      query: t.Object({
        name: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/idolstory",
    async ({ query }) => {
      const name = query.name?.trim()
      if (!name) return { images: [] }
      const params = new URLSearchParams({ page_size: "10", search: name })
      const url = `https://idol.st/api/allstars/cards/?${params}`
      const res = await fetch(url, { headers: { Accept: "application/json" } })
      if (!res.ok) return { images: [] }
      const data = (await res.json()) as { results: IdolStoryCard[] }
      const images = data.results
        .flatMap((card) => {
          const label = card.idol_name
          const urls: { label: string; imageUrl: string }[] = []
          const img = card.transparent ?? card.art
          const imgIdolized = card.transparent_idolized ?? card.art_idolized
          if (img) urls.push({ label, imageUrl: img })
          if (imgIdolized) urls.push({ label, imageUrl: imgIdolized })
          return urls
        })
        .slice(0, 9)
      return { images }
    },
    {
      query: t.Object({ name: t.Optional(t.String()) }),
    },
  )
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
