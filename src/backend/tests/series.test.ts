import { beforeEach, describe, expect, mock, test } from "bun:test"
import { Elysia } from "elysia"
import { clearAll, createTestDb } from "./testDb"

const { sqlite, db } = createTestDb()
mock.module("@/backend/db", () => ({ db }))

const { seriesController } = await import("../series")
const app = new Elysia().use(seriesController)

describe("Series Controller", () => {
	beforeEach(() => clearAll(sqlite))

	test("GET /series returns empty array", async () => {
		const res = await app.handle(new Request("http://localhost/series"))
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual([])
	})

	test("GET /series returns all series", async () => {
		sqlite.run("INSERT INTO series (name) VALUES (?)", ["Jujutsu Kaisen"])
		sqlite.run("INSERT INTO series (name) VALUES (?)", ["Chainsaw Man"])
		const res = await app.handle(new Request("http://localhost/series"))
		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data).toHaveLength(2)
		expect(data.map((s: { name: string }) => s.name)).toEqual([
			"Jujutsu Kaisen",
			"Chainsaw Man",
		])
	})

	test("GET /series/:id returns one series", async () => {
		const { lastInsertRowid: id } = sqlite.run(
			"INSERT INTO series (name) VALUES (?)",
			["Jujutsu Kaisen"],
		)
		const res = await app.handle(new Request(`http://localhost/series/${id}`))
		expect(res.status).toBe(200)
		expect((await res.json()).name).toBe("Jujutsu Kaisen")
	})

	test("GET /series/:id returns 404 when not found", async () => {
		const res = await app.handle(new Request("http://localhost/series/999"))
		expect(res.status).toBe(404)
		expect(await res.json()).toEqual({ error: "Not found" })
	})

	test("POST /series creates a series", async () => {
		const res = await app.handle(
			new Request("http://localhost/series", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Jujutsu Kaisen" }),
			}),
		)
		expect(res.status).toBe(201)
		const data = await res.json()
		expect(data.name).toBe("Jujutsu Kaisen")
		expect(typeof data.id).toBe("number")
	})

	test("PUT /series/:id updates a series", async () => {
		const { lastInsertRowid: id } = sqlite.run(
			"INSERT INTO series (name) VALUES (?)",
			["Jujutsu Kaisen"],
		)
		const res = await app.handle(
			new Request(`http://localhost/series/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "JJK" }),
			}),
		)
		expect(res.status).toBe(200)
		expect((await res.json()).name).toBe("JJK")
	})

	test("PUT /series/:id returns 404 when not found", async () => {
		const res = await app.handle(
			new Request("http://localhost/series/999", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "X" }),
			}),
		)
		expect(res.status).toBe(404)
	})

	test("DELETE /series/:id deletes a series", async () => {
		const { lastInsertRowid: id } = sqlite.run(
			"INSERT INTO series (name) VALUES (?)",
			["Jujutsu Kaisen"],
		)
		const res = await app.handle(
			new Request(`http://localhost/series/${id}`, { method: "DELETE" }),
		)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ success: true })
		const remaining = sqlite.query("SELECT * FROM series").all()
		expect(remaining).toHaveLength(0)
	})

	test("DELETE /series/:id returns 404 when not found", async () => {
		const res = await app.handle(
			new Request("http://localhost/series/999", { method: "DELETE" }),
		)
		expect(res.status).toBe(404)
	})
})
