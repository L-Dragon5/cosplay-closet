import { SQL } from "bun"

const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_DATABASE } = process.env

export const db = new SQL(
  `mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`,
)

export async function initDb() {
  await db`CREATE TABLE IF NOT EXISTS series (
		id INT AUTO_INCREMENT PRIMARY KEY,
		name VARCHAR(255) NOT NULL
	)`

  await db`CREATE TABLE IF NOT EXISTS characters (
		id INT AUTO_INCREMENT PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		series_id INT NULL,
		CONSTRAINT fk_characters_series FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL
	)`

  await db`CREATE TABLE IF NOT EXISTS locations (
		id INT AUTO_INCREMENT PRIMARY KEY,
		name VARCHAR(255) NOT NULL
	)`

  await db`CREATE TABLE IF NOT EXISTS items (
		id INT AUTO_INCREMENT PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		series_id INT NULL,
		character_id INT NULL,
		location_id INT NULL,
		type ENUM('Clothes','Wig','Shoes','Accessories','Prop','Materials') NOT NULL,
		notes TEXT NULL,
		CONSTRAINT fk_items_series FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL,
		CONSTRAINT fk_items_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
		CONSTRAINT fk_items_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
	)`

  await db`CREATE TABLE IF NOT EXISTS outfits (
		id INT AUTO_INCREMENT PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		character_id INT NULL,
		CONSTRAINT fk_outfits_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL
	)`

  await db`CREATE TABLE IF NOT EXISTS outfit_items (
		outfit_id INT NOT NULL,
		item_id INT NOT NULL,
		PRIMARY KEY (outfit_id, item_id),
		CONSTRAINT fk_outfit_items_outfit FOREIGN KEY (outfit_id) REFERENCES outfits(id) ON DELETE CASCADE,
		CONSTRAINT fk_outfit_items_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
	)`
}
