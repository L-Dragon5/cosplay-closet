import { db } from "@/backend/db"

export async function getAllCharacters() {
  return db`SELECT * FROM characters ORDER BY name`
}

export async function getCharacterById(id: number) {
  const rows = await db`SELECT * FROM characters WHERE id = ${id}`
  return rows[0] ?? null
}

export async function createCharacter(name: string, series_id: number | null) {
  const result =
    await db`INSERT INTO characters (name, series_id) VALUES (${name}, ${series_id})`
  const rows =
    await db`SELECT * FROM characters WHERE id = ${result.lastInsertRowid}`
  return rows[0]
}

export async function updateCharacter(
  id: number,
  name: string,
  series_id: number | null,
) {
  const result =
    await db`UPDATE characters SET name = ${name}, series_id = ${series_id} WHERE id = ${id}`
  if (result.affectedRows === 0) return null
  const rows = await db`SELECT * FROM characters WHERE id = ${id}`
  return rows[0]
}

export async function deleteCharacter(id: number) {
  const result = await db`DELETE FROM characters WHERE id = ${id}`
  return result.affectedRows > 0
}

export async function updateCharacterImage(
  id: number,
  imagePath: string | null,
) {
  const result =
    await db`UPDATE characters SET image_path = ${imagePath} WHERE id = ${id}`
  if (result.affectedRows === 0) return null
  const rows = await db`SELECT * FROM characters WHERE id = ${id}`
  return rows[0]
}
