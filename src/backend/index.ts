import { Elysia } from "elysia"
import indexHtml from "../../public/index.html"
import { initDb } from "@/backend/db"
import { seriesController } from "@/backend/series"
import { charactersController } from "@/backend/characters"
import { itemsController } from "@/backend/items"
import { outfitsController } from "@/backend/outfits"

await initDb()

const api = new Elysia({ prefix: "/api" })
	.use(seriesController)
	.use(charactersController)
	.use(itemsController)
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
