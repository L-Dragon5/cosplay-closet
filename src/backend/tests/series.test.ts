import { beforeEach, describe, expect, mock, test } from "bun:test"
import { Elysia } from "elysia"

const mockDb = mock()
mock.module("@/backend/db", () => ({ db: mockDb }))

const { seriesController } = await import("../series")
const app = new Elysia().use(seriesController)

describe("Series Controller", () => {
	beforeEach(() => mockDb.mockReset())

	test("GET /series returns all series", async () => {
		mockDb.mockResolvedValue([{ id: 1, name: "Jujutsu Kaisen" }])
		const res = await app.handle(new Request("http://localhost/series"))
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual([{ id: 1, name: "Jujutsu Kaisen" }])
	})

	test("GET /series/:id returns one series", async () => {
		mockDb.mockResolvedValue([{ id: 1, name: "Jujutsu Kaisen" }])
		const res = await app.handle(new Request("http://localhost/series/1"))
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ id: 1, name: "Jujutsu Kaisen" })
	})

	test("GET /series/:id returns 404 when not found", async () => {
		mockDb.mockResolvedValue([])
		const res = await app.handle(new Request("http://localhost/series/999"))
		expect(res.status).toBe(404)
		expect(await res.json()).toEqual({ error: "Not found" })
	})

	test("POST /series creates a series", async () => {
		mockDb
			.mockResolvedValueOnce({ lastInsertRowid: 1 })
			.mockResolvedValueOnce([{ id: 1, name: "Jujutsu Kaisen" }])
		const res = await app.handle(
			new Request("http://localhost/series", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Jujutsu Kaisen" }),
			}),
		)
		expect(res.status).toBe(201)
		expect(await res.json()).toEqual({ id: 1, name: "Jujutsu Kaisen" })
	})

	test("PUT /series/:id updates a series", async () => {
		mockDb
			.mockResolvedValueOnce({ affectedRows: 1 })
			.mockResolvedValueOnce([{ id: 1, name: "Updated" }])
		const res = await app.handle(
			new Request("http://localhost/series/1", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			}),
		)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ id: 1, name: "Updated" })
	})

	test("PUT /series/:id returns 404 when not found", async () => {
		mockDb.mockResolvedValue({ affectedRows: 0 })
		const res = await app.handle(
			new Request("http://localhost/series/999", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			}),
		)
		expect(res.status).toBe(404)
	})

	test("DELETE /series/:id deletes a series", async () => {
		mockDb.mockResolvedValue({ affectedRows: 1 })
		const res = await app.handle(
			new Request("http://localhost/series/1", { method: "DELETE" }),
		)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ success: true })
	})

	test("DELETE /series/:id returns 404 when not found", async () => {
		mockDb.mockResolvedValue({ affectedRows: 0 })
		const res = await app.handle(
			new Request("http://localhost/series/999", { method: "DELETE" }),
		)
		expect(res.status).toBe(404)
	})
})
