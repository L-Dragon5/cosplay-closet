import { db } from "@/backend/db"

export async function getAllLocations() {
	return db`SELECT * FROM locations ORDER BY name`
}

export async function getLocationById(id: number) {
	const rows = await db`SELECT * FROM locations WHERE id = ${id}`
	return rows[0] ?? null
}

export async function createLocation(name: string) {
	const result = await db`INSERT INTO locations (name) VALUES (${name})`
	const rows =
		await db`SELECT * FROM locations WHERE id = ${result.lastInsertRowid}`
	return rows[0]
}

export async function updateLocation(id: number, name: string) {
	const result = await db`UPDATE locations SET name = ${name} WHERE id = ${id}`
	if (result.affectedRows === 0) return null
	const rows = await db`SELECT * FROM locations WHERE id = ${id}`
	return rows[0]
}

export async function deleteLocation(id: number) {
	const result = await db`DELETE FROM locations WHERE id = ${id}`
	return result.affectedRows > 0
}
