import { beforeEach, describe, expect, mock, test } from "bun:test"
import { Elysia } from "elysia"

const mockDb = mock()
mock.module("@/backend/db", () => ({ db: mockDb }))

const { charactersController } = await import("../characters")
const app = new Elysia().use(charactersController)

const mockCharacter = { id: 1, name: "Gojo Satoru", series_id: 1 }

describe("Characters Controller", () => {
	beforeEach(() => mockDb.mockReset())

	test("GET /characters returns all characters", async () => {
		mockDb.mockResolvedValue([mockCharacter])
		const res = await app.handle(new Request("http://localhost/characters"))
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual([mockCharacter])
	})

	test("GET /characters/:id returns one character", async () => {
		mockDb.mockResolvedValue([mockCharacter])
		const res = await app.handle(
			new Request("http://localhost/characters/1"),
		)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual(mockCharacter)
	})

	test("GET /characters/:id returns 404 when not found", async () => {
		mockDb.mockResolvedValue([])
		const res = await app.handle(
			new Request("http://localhost/characters/999"),
		)
		expect(res.status).toBe(404)
	})

	test("POST /characters creates a character", async () => {
		mockDb
			.mockResolvedValueOnce({ lastInsertRowid: 1 })
			.mockResolvedValueOnce([mockCharacter])
		const res = await app.handle(
			new Request("http://localhost/characters", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Gojo Satoru", series_id: 1 }),
			}),
		)
		expect(res.status).toBe(201)
		expect(await res.json()).toEqual(mockCharacter)
	})

	test("POST /characters allows null series_id", async () => {
		mockDb
			.mockResolvedValueOnce({ lastInsertRowid: 2 })
			.mockResolvedValueOnce([{ id: 2, name: "Unknown", series_id: null }])
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

	test("PUT /characters/:id updates a character", async () => {
		mockDb
			.mockResolvedValueOnce({ affectedRows: 1 })
			.mockResolvedValueOnce([{ id: 1, name: "Updated", series_id: null }])
		const res = await app.handle(
			new Request("http://localhost/characters/1", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated", series_id: null }),
			}),
		)
		expect(res.status).toBe(200)
	})

	test("PUT /characters/:id returns 404 when not found", async () => {
		mockDb.mockResolvedValue({ affectedRows: 0 })
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
		mockDb.mockResolvedValue({ affectedRows: 1 })
		const res = await app.handle(
			new Request("http://localhost/characters/1", { method: "DELETE" }),
		)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ success: true })
	})

	test("DELETE /characters/:id returns 404 when not found", async () => {
		mockDb.mockResolvedValue({ affectedRows: 0 })
		const res = await app.handle(
			new Request("http://localhost/characters/999", { method: "DELETE" }),
		)
		expect(res.status).toBe(404)
	})
})
