import { Elysia } from "elysia"
import indexHtml from "../../public/index.html"

const api = new Elysia({ prefix: '/api' })
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

