import { beforeEach, describe, expect, mock, test } from "bun:test"
import { Elysia } from "elysia"

const mockDb = mock()
mock.module("@/backend/db", () => ({ db: mockDb }))

const { outfitsController } = await import("../outfits")
const app = new Elysia().use(outfitsController)

const mockItem = { id: 1, name: "Gojo Blindfold", type: "Accessories" }
const mockOutfit = { id: 1, name: "Gojo Costume", character_id: 1 }
const mockOutfitWithItems = { ...mockOutfit, items: [mockItem] }

describe("Outfits Controller", () => {
	beforeEach(() => mockDb.mockReset())

	test("GET /outfits returns all outfits with items", async () => {
		mockDb
			.mockResolvedValueOnce([mockOutfit])
			.mockResolvedValueOnce([mockItem])
		const res = await app.handle(new Request("http://localhost/outfits"))
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual([mockOutfitWithItems])
	})

	test("GET /outfits/:id returns one outfit with items", async () => {
		mockDb
			.mockResolvedValueOnce([mockOutfit])
			.mockResolvedValueOnce([mockItem])
		const res = await app.handle(new Request("http://localhost/outfits/1"))
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual(mockOutfitWithItems)
	})

	test("GET /outfits/:id returns 404 when not found", async () => {
		mockDb.mockResolvedValue([])
		const res = await app.handle(
			new Request("http://localhost/outfits/999"),
		)
		expect(res.status).toBe(404)
		expect(await res.json()).toEqual({ error: "Not found" })
	})

	test("POST /outfits creates an outfit with items", async () => {
		mockDb
			.mockResolvedValueOnce({ lastInsertRowid: 1 }) // INSERT outfit
			.mockResolvedValueOnce({}) // INSERT outfit_items row
			.mockResolvedValueOnce([mockOutfit]) // SELECT outfit
			.mockResolvedValueOnce([mockItem]) // SELECT items
		const res = await app.handle(
			new Request("http://localhost/outfits", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Gojo Costume",
					character_id: 1,
					item_ids: [1],
				}),
			}),
		)
		expect(res.status).toBe(201)
		expect(await res.json()).toEqual(mockOutfitWithItems)
	})

	test("POST /outfits allows omitting optional fields", async () => {
		const bare = { id: 2, name: "Bare Outfit", character_id: null }
		mockDb
			.mockResolvedValueOnce({ lastInsertRowid: 2 })
			.mockResolvedValueOnce([bare])
			.mockResolvedValueOnce([])
		const res = await app.handle(
			new Request("http://localhost/outfits", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Bare Outfit" }),
			}),
		)
		expect(res.status).toBe(201)
		expect(await res.json()).toEqual({ ...bare, items: [] })
	})

	test("PUT /outfits/:id updates an outfit", async () => {
		mockDb
			.mockResolvedValueOnce({ affectedRows: 1 }) // UPDATE
			.mockResolvedValueOnce({}) // DELETE outfit_items
			.mockResolvedValueOnce({}) // INSERT outfit_items
			.mockResolvedValueOnce([mockOutfit]) // SELECT outfit
			.mockResolvedValueOnce([mockItem]) // SELECT items
		const res = await app.handle(
			new Request("http://localhost/outfits/1", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Gojo Costume",
					character_id: 1,
					item_ids: [1],
				}),
			}),
		)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual(mockOutfitWithItems)
	})

	test("PUT /outfits/:id returns 404 when not found", async () => {
		mockDb.mockResolvedValue({ affectedRows: 0 })
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

	test("DELETE /outfits/:id deletes an outfit", async () => {
		mockDb.mockResolvedValue({ affectedRows: 1 })
		const res = await app.handle(
			new Request("http://localhost/outfits/1", { method: "DELETE" }),
		)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ success: true })
	})

	test("DELETE /outfits/:id returns 404 when not found", async () => {
		mockDb.mockResolvedValue({ affectedRows: 0 })
		const res = await app.handle(
			new Request("http://localhost/outfits/999", { method: "DELETE" }),
		)
		expect(res.status).toBe(404)
	})
})
