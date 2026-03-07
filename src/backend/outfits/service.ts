import { db } from "@/backend/db"

async function getItemsForOutfit(outfitId: number) {
	return db`SELECT i.* FROM items i
		INNER JOIN outfit_items oi ON i.id = oi.item_id
		WHERE oi.outfit_id = ${outfitId}`
}

export async function getAllOutfits() {
	const outfits = await db`SELECT * FROM outfits ORDER BY id`
	return Promise.all(
		outfits.map(async (outfit: Record<string, unknown>) => ({
			...outfit,
			items: await getItemsForOutfit(outfit.id as number),
		})),
	)
}

export async function getOutfitById(id: number) {
	const rows = await db`SELECT * FROM outfits WHERE id = ${id}`
	if (rows.length === 0) return null
	return { ...rows[0], items: await getItemsForOutfit(id) }
}

export async function createOutfit(
	name: string,
	character_id: number | null,
	item_ids: number[],
) {
	const result =
		await db`INSERT INTO outfits (name, character_id) VALUES (${name}, ${character_id})`
	const outfitId = result.lastInsertRowid as number
	for (const itemId of item_ids) {
		await db`INSERT INTO outfit_items (outfit_id, item_id) VALUES (${outfitId}, ${itemId})`
	}
	return getOutfitById(outfitId)
}

export async function updateOutfit(
	id: number,
	name: string,
	character_id: number | null,
	item_ids: number[],
) {
	const result =
		await db`UPDATE outfits SET name = ${name}, character_id = ${character_id} WHERE id = ${id}`
	if (result.affectedRows === 0) return null
	await db`DELETE FROM outfit_items WHERE outfit_id = ${id}`
	for (const itemId of item_ids) {
		await db`INSERT INTO outfit_items (outfit_id, item_id) VALUES (${id}, ${itemId})`
	}
	return getOutfitById(id)
}

export async function deleteOutfit(id: number) {
	const result = await db`DELETE FROM outfits WHERE id = ${id}`
	return result.affectedRows > 0
}
