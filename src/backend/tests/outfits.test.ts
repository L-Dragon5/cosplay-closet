import { beforeEach, describe, expect, mock, test } from "bun:test"
import { Elysia } from "elysia"
import { clearAll, createTestDb } from "./testDb"

const { sqlite, db } = createTestDb()
mock.module("@/backend/db", () => ({ db }))

const { outfitsController } = await import("../outfits")
const app = new Elysia().use(outfitsController)

function seedItem(name: string, type = "Accessories") {
  const { lastInsertRowid } = sqlite.run(
    "INSERT INTO items (name, type) VALUES (?, ?)",
    [name, type],
  )
  return Number(lastInsertRowid)
}

function seedOutfit(name: string, characterId: number | null = null) {
  const { lastInsertRowid } = sqlite.run(
    "INSERT INTO outfits (name, character_id) VALUES (?, ?)",
    [name, characterId],
  )
  return Number(lastInsertRowid)
}

function linkItem(outfitId: number, itemId: number) {
  sqlite.run("INSERT INTO outfit_items (outfit_id, item_id) VALUES (?, ?)", [
    outfitId,
    itemId,
  ])
}

describe("Outfits Controller", () => {
  beforeEach(() => clearAll(sqlite))

  test("GET /outfits returns all outfits with embedded items", async () => {
    const itemId = seedItem("Blindfold")
    const outfitId = seedOutfit("Gojo Costume")
    linkItem(outfitId, itemId)

    const res = await app.handle(new Request("http://localhost/outfits"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].name).toBe("Gojo Costume")
    expect(data[0].items).toHaveLength(1)
    expect(data[0].items[0].name).toBe("Blindfold")
  })

  test("GET /outfits returns empty items array when outfit has no items", async () => {
    seedOutfit("Empty Outfit")
    const res = await app.handle(new Request("http://localhost/outfits"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data[0].items).toEqual([])
  })

  test("GET /outfits/:id returns one outfit with items", async () => {
    const itemId = seedItem("White Wig", "Wig")
    const outfitId = seedOutfit("Gojo Costume")
    linkItem(outfitId, itemId)

    const res = await app.handle(
      new Request(`http://localhost/outfits/${outfitId}`),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe("Gojo Costume")
    expect(data.items).toHaveLength(1)
    expect(data.items[0].name).toBe("White Wig")
  })

  test("GET /outfits/:id returns 404 when not found", async () => {
    const res = await app.handle(new Request("http://localhost/outfits/999"))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Not found" })
  })

  test("POST /outfits creates outfit with items", async () => {
    const itemId = seedItem("Blindfold")
    const res = await app.handle(
      new Request("http://localhost/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Gojo Costume",
          item_ids: [itemId],
        }),
      }),
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toBe("Gojo Costume")
    expect(data.items).toHaveLength(1)
    expect(data.items[0].name).toBe("Blindfold")
  })

  test("POST /outfits allows omitting character and items", async () => {
    const res = await app.handle(
      new Request("http://localhost/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Bare Outfit" }),
      }),
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toBe("Bare Outfit")
    expect(data.character_id).toBeNull()
    expect(data.items).toEqual([])
  })

  test("PUT /outfits/:id updates name and resyncs items", async () => {
    const item1 = seedItem("Blindfold")
    const item2 = seedItem("White Wig", "Wig")
    const outfitId = seedOutfit("Gojo Costume")
    linkItem(outfitId, item1)

    const res = await app.handle(
      new Request(`http://localhost/outfits/${outfitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Full Gojo",
          character_id: null,
          item_ids: [item1, item2],
        }),
      }),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe("Full Gojo")
    expect(data.items).toHaveLength(2)
  })

  test("PUT /outfits/:id returns 404 when not found", async () => {
    const res = await app.handle(
      new Request("http://localhost/outfits/999", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "X",
          character_id: null,
          item_ids: [],
        }),
      }),
    )
    expect(res.status).toBe(404)
  })

  test("DELETE /outfits/:id deletes outfit and cascades outfit_items", async () => {
    const itemId = seedItem("Blindfold")
    const outfitId = seedOutfit("Gojo Costume")
    linkItem(outfitId, itemId)

    const res = await app.handle(
      new Request(`http://localhost/outfits/${outfitId}`, {
        method: "DELETE",
      }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })

    const links = sqlite
      .query("SELECT * FROM outfit_items WHERE outfit_id = ?")
      .all(outfitId)
    expect(links).toHaveLength(0)
  })

  test("DELETE /outfits/:id returns 404 when not found", async () => {
    const res = await app.handle(
      new Request("http://localhost/outfits/999", { method: "DELETE" }),
    )
    expect(res.status).toBe(404)
  })
})
