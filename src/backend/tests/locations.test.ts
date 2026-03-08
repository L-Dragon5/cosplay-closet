import { beforeEach, describe, expect, mock, test } from "bun:test"
import { Elysia } from "elysia"
import { clearAll, createTestDb } from "./testDb"

const { sqlite, db } = createTestDb()
mock.module("@/backend/db", () => ({ db }))

const { locationsController } = await import("../locations")
const app = new Elysia().use(locationsController)

describe("Locations Controller", () => {
  beforeEach(() => clearAll(sqlite))

  test("GET /locations returns empty array", async () => {
    const res = await app.handle(new Request("http://localhost/locations"))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  test("GET /locations returns all locations", async () => {
    sqlite.run("INSERT INTO locations (name) VALUES (?)", ["Box A"])
    sqlite.run("INSERT INTO locations (name) VALUES (?)", ["Shelf B"])
    const res = await app.handle(new Request("http://localhost/locations"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(2)
    expect(data.map((l: { name: string }) => l.name)).toEqual(["Box A", "Shelf B"])
  })

  test("GET /locations/:id returns one location", async () => {
    const { lastInsertRowid: id } = sqlite.run(
      "INSERT INTO locations (name) VALUES (?)",
      ["Box A"],
    )
    const res = await app.handle(new Request(`http://localhost/locations/${id}`))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe("Box A")
    expect(typeof data.id).toBe("number")
  })

  test("GET /locations/:id returns 404 when not found", async () => {
    const res = await app.handle(new Request("http://localhost/locations/999"))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Not found" })
  })

  test("POST /locations creates a location", async () => {
    const res = await app.handle(
      new Request("http://localhost/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Box A" }),
      }),
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toBe("Box A")
    expect(typeof data.id).toBe("number")
  })

  test("PUT /locations/:id updates a location", async () => {
    const { lastInsertRowid: id } = sqlite.run(
      "INSERT INTO locations (name) VALUES (?)",
      ["Box A"],
    )
    const res = await app.handle(
      new Request(`http://localhost/locations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Box B" }),
      }),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).name).toBe("Box B")
  })

  test("PUT /locations/:id returns 404 when not found", async () => {
    const res = await app.handle(
      new Request("http://localhost/locations/999", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "X" }),
      }),
    )
    expect(res.status).toBe(404)
  })

  test("DELETE /locations/:id deletes a location", async () => {
    const { lastInsertRowid: id } = sqlite.run(
      "INSERT INTO locations (name) VALUES (?)",
      ["Box A"],
    )
    const res = await app.handle(
      new Request(`http://localhost/locations/${id}`, { method: "DELETE" }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    const remaining = sqlite.query("SELECT * FROM locations").all()
    expect(remaining).toHaveLength(0)
  })

  test("DELETE /locations/:id returns 404 when not found", async () => {
    const res = await app.handle(
      new Request("http://localhost/locations/999", { method: "DELETE" }),
    )
    expect(res.status).toBe(404)
  })

  test("DELETE /locations/:id nullifies location_id on items", async () => {
    const { lastInsertRowid: locationId } = sqlite.run(
      "INSERT INTO locations (name) VALUES (?)",
      ["Box A"],
    )
    const { lastInsertRowid: itemId } = sqlite.run(
      "INSERT INTO items (name, type, location_id) VALUES (?, ?, ?)",
      ["Blindfold", "Accessories", locationId],
    )
    await app.handle(
      new Request(`http://localhost/locations/${locationId}`, { method: "DELETE" }),
    )
    const item = sqlite.query("SELECT * FROM items WHERE id = ?").get(itemId) as {
      location_id: number | null
    }
    expect(item.location_id).toBeNull()
  })
})
