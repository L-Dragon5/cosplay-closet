import { beforeEach, describe, expect, mock, test } from "bun:test"
import { Elysia } from "elysia"

const mockDb = mock()
mock.module("@/backend/db", () => ({ db: mockDb }))

const { itemsController } = await import("../items")
const app = new Elysia().use(itemsController)

const mockItem = {
	id: 1,
	name: "Gojo Blindfold",
	type: "Accessories",
	series_id: 1,
	character_id: 1,
	location: "Box A",
	notes: null,
}

describe("Items Controller", () => {
	beforeEach(() => mockDb.mockReset())

	test("GET /items returns all items", async () => {
		mockDb.mockResolvedValue([mockItem])
		const res = await app.handle(new Request("http://localhost/items"))
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual([mockItem])
	})

	test("GET /items/:id returns one item", async () => {
		mockDb.mockResolvedValue([mockItem])
		const res = await app.handle(new Request("http://localhost/items/1"))
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual(mockItem)
	})

	test("GET /items/:id returns 404 when not found", async () => {
		mockDb.mockResolvedValue([])
		const res = await app.handle(new Request("http://localhost/items/999"))
		expect(res.status).toBe(404)
	})

	test("POST /items creates an item", async () => {
		mockDb
			.mockResolvedValueOnce({ lastInsertRowid: 1 })
			.mockResolvedValueOnce([mockItem])
		const res = await app.handle(
			new Request("http://localhost/items", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Gojo Blindfold",
					type: "Accessories",
					series_id: 1,
					character_id: 1,
					location: "Box A",
				}),
			}),
		)
		expect(res.status).toBe(201)
		expect(await res.json()).toEqual(mockItem)
	})

	test("POST /items allows all nullable fields omitted", async () => {
		const minimalItem = { id: 2, name: "Generic Wig", type: "Wig", series_id: null, character_id: null, location: null, notes: null }
		mockDb
			.mockResolvedValueOnce({ lastInsertRowid: 2 })
			.mockResolvedValueOnce([minimalItem])
		const res = await app.handle(
			new Request("http://localhost/items", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Generic Wig", type: "Wig" }),
			}),
		)
		expect(res.status).toBe(201)
		expect(await res.json()).toEqual(minimalItem)
	})

	test("PUT /items/:id updates an item", async () => {
		mockDb
			.mockResolvedValueOnce({ affectedRows: 1 })
			.mockResolvedValueOnce([{ ...mockItem, name: "Updated" }])
		const res = await app.handle(
			new Request("http://localhost/items/1", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated",
					type: "Accessories",
					series_id: 1,
					character_id: 1,
					location: "Box A",
					notes: null,
				}),
			}),
		)
		expect(res.status).toBe(200)
	})

	test("PUT /items/:id returns 404 when not found", async () => {
		mockDb.mockResolvedValue({ affectedRows: 0 })
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
		mockDb.mockResolvedValue({ affectedRows: 1 })
		const res = await app.handle(
			new Request("http://localhost/items/1", { method: "DELETE" }),
		)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ success: true })
	})

	test("DELETE /items/:id returns 404 when not found", async () => {
		mockDb.mockResolvedValue({ affectedRows: 0 })
		const res = await app.handle(
			new Request("http://localhost/items/999", { method: "DELETE" }),
		)
		expect(res.status).toBe(404)
	})
})
