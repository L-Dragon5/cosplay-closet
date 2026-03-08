import { db } from "@/backend/db"

export type ItemType =
	| "Clothes"
	| "Wig"
	| "Shoes"
	| "Accessories"
	| "Prop"
	| "Materials"

export async function getAllItems() {
	return db`SELECT * FROM items ORDER BY id`
}

export async function getItemById(id: number) {
	const rows = await db`SELECT * FROM items WHERE id = ${id}`
	return rows[0] ?? null
}

export async function createItem(
	name: string,
	type: ItemType,
	series_id: number | null,
	character_id: number | null,
	location: string | null,
	notes: string | null,
) {
	const result =
		await db`INSERT INTO items (name, type, series_id, character_id, location, notes)
		VALUES (${name}, ${type}, ${series_id}, ${character_id}, ${location}, ${notes})`
	const rows =
		await db`SELECT * FROM items WHERE id = ${result.lastInsertRowid}`
	return rows[0]
}

export async function updateItem(
	id: number,
	name: string,
	type: ItemType,
	series_id: number | null,
	character_id: number | null,
	location: string | null,
	notes: string | null,
) {
	const result = await db`UPDATE items
		SET name = ${name}, type = ${type}, series_id = ${series_id},
		    character_id = ${character_id}, location = ${location}, notes = ${notes}
		WHERE id = ${id}`
	if (result.affectedRows === 0) return null
	const rows = await db`SELECT * FROM items WHERE id = ${id}`
	return rows[0]
}

export async function deleteItem(id: number) {
	const result = await db`DELETE FROM items WHERE id = ${id}`
	return result.affectedRows > 0
}
