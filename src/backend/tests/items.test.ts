import { beforeEach, describe, expect, mock, test } from "bun:test"
import { Elysia } from "elysia"
import { clearAll, createTestDb } from "./testDb"

const { sqlite, db } = createTestDb()
mock.module("@/backend/db", () => ({ db }))

const { itemsController } = await import("../items")
const app = new Elysia().use(itemsController)

describe("Items Controller", () => {
  beforeEach(() => clearAll(sqlite))

  test("GET /items returns all items", async () => {
    sqlite.run("INSERT INTO items (name, type) VALUES (?, ?)", [
      "Blindfold",
      "Accessories",
    ])
    sqlite.run("INSERT INTO items (name, type) VALUES (?, ?)", [
      "White Wig",
      "Wig",
    ])
    const res = await app.handle(new Request("http://localhost/items"))
    expect(res.status).toBe(200)
    expect(await res.json()).toHaveLength(2)
  })

  test("GET /items/:id returns one item", async () => {
    const { lastInsertRowid: id } = sqlite.run(
      "INSERT INTO items (name, type) VALUES (?, ?)",
      ["Blindfold", "Accessories"],
    )
    const res = await app.handle(new Request(`http://localhost/items/${id}`))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe("Blindfold")
    expect(data.type).toBe("Accessories")
  })

  test("GET /items/:id returns 404 when not found", async () => {
    const res = await app.handle(new Request("http://localhost/items/999"))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Not found" })
  })

  test("POST /items creates with all fields", async () => {
    const { lastInsertRowid: seriesId } = sqlite.run(
      "INSERT INTO series (name) VALUES (?)",
      ["Jujutsu Kaisen"],
    )
    const { lastInsertRowid: charId } = sqlite.run(
      "INSERT INTO characters (name, series_id) VALUES (?, ?)",
      ["Gojo Satoru", seriesId],
    )
    const res = await app.handle(
      new Request("http://localhost/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Blindfold",
          type: "Accessories",
          series_id: seriesId,
          character_id: charId,
          location: "Box A",
          notes: "Keep clean",
        }),
      }),
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toBe("Blindfold")
    expect(data.type).toBe("Accessories")
    expect(data.series_id).toBe(seriesId)
    expect(data.character_id).toBe(charId)
    expect(data.location).toBe("Box A")
    expect(data.notes).toBe("Keep clean")
  })

  test("POST /items allows omitting optional fields", async () => {
    const res = await app.handle(
      new Request("http://localhost/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Generic Wig", type: "Wig" }),
      }),
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toBe("Generic Wig")
    expect(data.series_id).toBeNull()
    expect(data.character_id).toBeNull()
    expect(data.location).toBeNull()
    expect(data.notes).toBeNull()
  })

  test("PUT /items/:id updates item", async () => {
    const { lastInsertRowid: id } = sqlite.run(
      "INSERT INTO items (name, type) VALUES (?, ?)",
      ["Old Name", "Wig"],
    )
    const res = await app.handle(
      new Request(`http://localhost/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Name",
          type: "Prop",
          series_id: null,
          character_id: null,
          location: "Shelf B",
          notes: null,
        }),
      }),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe("New Name")
    expect(data.type).toBe("Prop")
    expect(data.location).toBe("Shelf B")
  })

  test("PUT /items/:id returns 404 when not found", async () => {
    const res = await app.handle(
      new Request("http://localhost/items/999", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "X",
          type: "Prop",
          series_id: null,
          character_id: null,
          location: null,
          notes: null,
        }),
      }),
    )
    expect(res.status).toBe(404)
  })

  test("DELETE /items/:id deletes an item", async () => {
    const { lastInsertRowid: id } = sqlite.run(
      "INSERT INTO items (name, type) VALUES (?, ?)",
      ["Blindfold", "Accessories"],
    )
    const res = await app.handle(
      new Request(`http://localhost/items/${id}`, { method: "DELETE" }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  test("DELETE /items/:id returns 404 when not found", async () => {
    const res = await app.handle(
      new Request("http://localhost/items/999", { method: "DELETE" }),
    )
    expect(res.status).toBe(404)
  })
})
