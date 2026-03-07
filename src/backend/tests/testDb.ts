import { Database } from "bun:sqlite"

export function createTestDb() {
	const sqlite = new Database(":memory:")

	sqlite.run("PRAGMA foreign_keys = ON")

	sqlite.run(`CREATE TABLE series (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL
	)`)

	sqlite.run(`CREATE TABLE characters (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		series_id INTEGER NULL REFERENCES series(id) ON DELETE SET NULL
	)`)

	sqlite.run(`CREATE TABLE items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		series_id INTEGER NULL REFERENCES series(id) ON DELETE SET NULL,
		character_id INTEGER NULL REFERENCES characters(id) ON DELETE SET NULL,
		type TEXT NOT NULL CHECK(type IN ('Clothes','Wig','Shoes','Accessories','Prop')),
		location TEXT NULL,
		notes TEXT NULL
	)`)

	sqlite.run(`CREATE TABLE outfits (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		character_id INTEGER NULL REFERENCES characters(id) ON DELETE SET NULL
	)`)

	sqlite.run(`CREATE TABLE outfit_items (
		outfit_id INTEGER NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
		item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
		PRIMARY KEY (outfit_id, item_id)
	)`)

	return { sqlite, db: makeDb(sqlite) }
}

export function clearAll(sqlite: Database) {
	sqlite.run("DELETE FROM outfit_items")
	sqlite.run("DELETE FROM outfits")
	sqlite.run("DELETE FROM items")
	sqlite.run("DELETE FROM characters")
	sqlite.run("DELETE FROM series")
}

function makeDb(sqlite: Database) {
	return (strings: TemplateStringsArray, ...values: unknown[]) => {
		let sql = strings[0] ?? ""
		const params: unknown[] = []
		for (let i = 0; i < values.length; i++) {
			params.push(values[i])
			sql += `?${strings[i + 1] ?? ""}`
		}

		if (sql.trim().toUpperCase().startsWith("SELECT")) {
			return Promise.resolve(sqlite.query(sql).all(...params))
		}

		const result = sqlite.run(sql, params)
		return Promise.resolve({
			lastInsertRowid: Number(result.lastInsertRowid),
			affectedRows: result.changes,
		})
	}
}
