import { beforeEach, describe, expect, mock, test } from "bun:test"
import { Elysia } from "elysia"
import { clearAll, createTestDb } from "./testDb"

const { sqlite, db } = createTestDb()
mock.module("@/backend/db", () => ({ db }))

const { charactersController } = await import("../characters")
const app = new Elysia().use(charactersController)

describe("Characters Controller", () => {
  beforeEach(() => clearAll(sqlite))

  test("GET /characters returns all characters", async () => {
    const { lastInsertRowid: seriesId } = sqlite.run(
      "INSERT INTO series (name) VALUES (?)",
      ["Jujutsu Kaisen"],
    )
    sqlite.run("INSERT INTO characters (name, series_id) VALUES (?, ?)", [
      "Gojo Satoru",
      seriesId,
    ])
    sqlite.run("INSERT INTO characters (name, series_id) VALUES (?, ?)", [
      "Yuji Itadori",
      seriesId,
    ])
    const res = await app.handle(new Request("http://localhost/characters"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(2)
  })

  test("GET /characters/:id returns one character", async () => {
    const { lastInsertRowid: id } = sqlite.run(
      "INSERT INTO characters (name, series_id) VALUES (?, ?)",
      ["Gojo Satoru", null],
    )
    const res = await app.handle(
      new Request(`http://localhost/characters/${id}`),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).name).toBe("Gojo Satoru")
  })

  test("GET /characters/:id returns 404 when not found", async () => {
    const res = await app.handle(new Request("http://localhost/characters/999"))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Not found" })
  })

  test("POST /characters creates with series", async () => {
    const { lastInsertRowid: seriesId } = sqlite.run(
      "INSERT INTO series (name) VALUES (?)",
      ["Jujutsu Kaisen"],
    )
    const res = await app.handle(
      new Request("http://localhost/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Gojo Satoru", series_id: seriesId }),
      }),
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toBe("Gojo Satoru")
    expect(data.series_id).toBe(seriesId)
  })

  test("POST /characters allows null series_id", async () => {
    const res = await app.handle(
      new Request("http://localhost/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Unknown" }),
      }),
    )
    expect(res.status).toBe(201)
    expect((await res.json()).series_id).toBeNull()
  })

  test("PUT /characters/:id updates name and series", async () => {
    const { lastInsertRowid: seriesId } = sqlite.run(
      "INSERT INTO series (name) VALUES (?)",
      ["Jujutsu Kaisen"],
    )
    const { lastInsertRowid: id } = sqlite.run(
      "INSERT INTO characters (name, series_id) VALUES (?, ?)",
      ["Gojo", null],
    )
    const res = await app.handle(
      new Request(`http://localhost/characters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Gojo Satoru", series_id: seriesId }),
      }),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe("Gojo Satoru")
    expect(data.series_id).toBe(seriesId)
  })

  test("PUT /characters/:id returns 404 when not found", async () => {
    const res = await app.handle(
      new Request("http://localhost/characters/999", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "X", series_id: null }),
      }),
    )
    expect(res.status).toBe(404)
  })

  test("DELETE /characters/:id deletes a character", async () => {
    const { lastInsertRowid: id } = sqlite.run(
      "INSERT INTO characters (name, series_id) VALUES (?, ?)",
      ["Gojo Satoru", null],
    )
    const res = await app.handle(
      new Request(`http://localhost/characters/${id}`, { method: "DELETE" }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  test("DELETE /characters/:id returns 404 when not found", async () => {
    const res = await app.handle(
      new Request("http://localhost/characters/999", { method: "DELETE" }),
    )
    expect(res.status).toBe(404)
  })
})
