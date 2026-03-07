import { db } from "@/backend/db"

export async function getAllSeries() {
	return db`SELECT * FROM series ORDER BY id`
}

export async function getSeriesById(id: number) {
	const rows = await db`SELECT * FROM series WHERE id = ${id}`
	return rows[0] ?? null
}

export async function createSeries(name: string) {
	const result = await db`INSERT INTO series (name) VALUES (${name})`
	const rows =
		await db`SELECT * FROM series WHERE id = ${result.lastInsertRowid}`
	return rows[0]
}

export async function updateSeries(id: number, name: string) {
	const result =
		await db`UPDATE series SET name = ${name} WHERE id = ${id}`
	if (result.affectedRows === 0) return null
	const rows = await db`SELECT * FROM series WHERE id = ${id}`
	return rows[0]
}

export async function deleteSeries(id: number) {
	const result = await db`DELETE FROM series WHERE id = ${id}`
	return result.affectedRows > 0
}
