import { db } from "@/backend/db"

// Words that are NOT character names — generic descriptors, type words, colors, etc.
const STOP_WORDS = new Set([
	// Articles / prepositions
	"a",
	"an",
	"the",
	"and",
	"or",
	"for",
	"of",
	"in",
	"on",
	"at",
	"to",
	"with",
	"without",
	"from",
	"by",
	"no",
	"not",
	// Item type words
	"outfit",
	"wig",
	"shoes",
	"shoe",
	"accessories",
	"accessory",
	"prop",
	"props",
	"boots",
	"boot",
	"sandal",
	"sandals",
	"heels",
	"pumps",
	"sneakers",
	"flats",
	"wedges",
	"dress",
	"uniform",
	"suit",
	"jacket",
	"skirt",
	"shirt",
	"swimsuit",
	"bikini",
	"costume",
	"gown",
	"glasses",
	"headset",
	"headband",
	"crown",
	"tiara",
	"earrings",
	"bracelets",
	"bow",
	"tail",
	"ears",
	"wings",
	"horns",
	"mask",
	"gloves",
	"belt",
	"purse",
	"bag",
	"ponytail",
	"braid",
	"shorts",
	"pants",
	"socks",
	"stockings",
	"cape",
	"armor",
	"sword",
	"staff",
	"wand",
	"fan",
	"umbrella",
	"plushie",
	"plushies",
	"gun",
	"megaphone",
	"petticoat",
	"ribbon",
	"necklace",
	"ring",
	"hoodie",
	"coat",
	"vest",
	"tutu",
	"lingerie",
	"kimono",
	"cellophane",
	"pendant",
	"hair",
	"piece",
	"maid",
	"swimwear",
	"leotard",
	"bodice",
	"corset",
	"apron",
	"blouse",
	"cardigan",
	"blazer",
	"tights",
	// Colors
	"black",
	"white",
	"blue",
	"red",
	"pink",
	"green",
	"gold",
	"silver",
	"purple",
	"grey",
	"gray",
	"yellow",
	"orange",
	"brown",
	"dark",
	"light",
	"bright",
	"navy",
	"teal",
	"crimson",
	"magenta",
	"lavender",
	"ivory",
	"beige",
	// Costume variant descriptors
	"racing",
	"wedding",
	"winter",
	"summer",
	"christmas",
	"halloween",
	"bunny",
	"fanart",
	"new",
	"old",
	"cat",
	"clear",
	"card",
	"platinum",
	"snow",
	"santa",
	"pilot",
	"idol",
	"magical",
	"angel",
	"young",
	"dream",
	"moon",
	"ninja",
	"cheer",
	"ghost",
	"story",
	"autumn",
	"arabian",
	"flower",
	"festival",
	"fox",
	"cyber",
	"original",
	"main",
	"panda",
	"china",
	"qipao",
	"regular",
	"casual",
	"default",
	"spring",
	"bride",
	"bridal",
	"princess",
	"final",
	"ultimate",
	"limited",
	"event",
	"holiday",
	"birthday",
	"anniversary",
	"school",
	"battle",
	"star",
	"super",
	"mega",
	"mini",
	"big",
	"tiny",
	"small",
	"large",
	"medium",
	"full",
	"half",
	"fun",
	"official",
	"art",
	"dazzling",
	"succubus",
	"holographic",
	"deluxe",
	"premium",
	"classic",
	"retro",
	"alternate",
	"alt",
	"version",
	"ver",
	"vol",
	"style",
	"type",
	"mode",
	"form",
	"themed",
	"special",
	"extra",
	"bonus",
	"anti-spiral",
	"swim",
	"swimming",
	"little",
	"gem",
	"cross",
	"swim",
	"bunny",
	"racing",
	// Costume style words (never character names)
	"twintail",
	"bunnysuit",
	"peachy",
	"pirate",
	"gothic",
	"lolita",
	// Numbers
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"1st",
	"2nd",
	"3rd",
	"4th",
	"5th",
])

function parseCSVRow(line: string): string[] {
	const result: string[] = []
	let current = ""
	let inQuotes = false
	for (const ch of line) {
		if (ch === '"') {
			inQuotes = !inQuotes
		} else if (ch === "," && !inQuotes) {
			result.push(current)
			current = ""
		} else {
			current += ch
		}
	}
	result.push(current)
	return result
}

const TYPE_MAP: Record<string, string> = {
	outfit: "Clothes",
	clothes: "Clothes",
	wig: "Wig",
	shoes: "Shoes",
	shoe: "Shoes",
	accessories: "Accessories",
	accessory: "Accessories",
	prop: "Prop",
	props: "Prop",
}

function normalizeType(type: string): string {
	const first = type.split(",")[0].trim().toLowerCase()
	return TYPE_MAP[first] ?? "Materials"
}

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.split(/[\s()]+/)
		.map((t) => t.replace(/[^a-z0-9'-]/g, ""))
		.filter((t) => t.length >= 2)
}

function isStopToken(token: string): boolean {
	return STOP_WORDS.has(token) || /^\d+$/.test(token) || token.length <= 1
}

/**
 * Within a series, find character names by looking for n-grams (1–3 words)
 * that appear in 2+ item names and aren't purely stop words.
 *
 * When a shorter n-gram appears inside a longer one with the same frequency,
 * we prefer the longer one (e.g. "Yae Sakura" over just "Yae").
 * When the shorter appears in MORE items than the longer, we prefer the shorter
 * (e.g. "Umi" over "Umi Angelic Angel").
 */
function findCharacters(itemNames: string[]): string[] {
	if (itemNames.length < 2) return []

	const frequency = new Map<string, number>()

	for (const name of itemNames) {
		if (name.includes(" / ")) continue // skip multi-character items
		const tokens = tokenize(name)
		const seen = new Set<string>()

		for (let n = 1; n <= 3; n++) {
			for (let i = 0; i <= tokens.length - n; i++) {
				const slice = tokens.slice(i, i + n)
				if (slice.every((t) => isStopToken(t))) continue
				const ngram = slice.join(" ")
				if (!seen.has(ngram)) {
					seen.add(ngram)
					frequency.set(ngram, (frequency.get(ngram) ?? 0) + 1)
				}
			}
		}
	}

	// Keep candidates appearing in 2+ items
	const candidates = new Map<string, number>()
	for (const [ngram, count] of frequency) {
		if (count >= 2) candidates.set(ngram, count)
	}

	// Resolve ambiguity between shorter and longer candidates that share a word:
	//   count(shorter) == count(longer) → prefer longer  (e.g. "Yae" → "Yae Sakura")
	//   count(shorter)  > count(longer) → prefer shorter (e.g. "Umi" over "Cheer Umi")
	const toRemove = new Set<string>()
	for (const [shorter, sc] of candidates) {
		for (const [longer, lc] of candidates) {
			if (shorter === longer) continue
			if (longer.split(" ").length <= shorter.split(" ").length) continue
			if (!longer.includes(shorter)) continue

			if (lc === sc) {
				toRemove.add(shorter) // longer is the full name
			} else if (sc > lc) {
				toRemove.add(longer) // shorter is the base character, longer is a costume variant
			}
		}
	}

	const finalCandidates = [...candidates.keys()].filter((c) => !toRemove.has(c))

	// Recover original casing from first matching item name
	const result: string[] = []
	for (const candidate of finalCandidates) {
		for (const name of itemNames) {
			const idx = name.toLowerCase().indexOf(candidate)
			if (idx >= 0) {
				const original = name
					.substring(idx, idx + candidate.length)
					.split(" ")
					.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
					.join(" ")
				result.push(original)
				break
			}
		}
	}

	return [...new Set(result)]
}

function assignCharacter(
	itemName: string,
	characters: string[],
): string | null {
	if (!characters.length || itemName.includes(" / ")) return null
	const lower = itemName.toLowerCase()
	let best: string | null = null
	let bestLen = 0
	for (const char of characters) {
		const lc = char.toLowerCase()
		if (lower.includes(lc) && lc.length > bestLen) {
			best = char
			bestLen = lc.length
		}
	}
	return best
}

async function main() {
	// Read CSV first — Bun 1.3.10 MySQL driver loses connection sync if file
	// I/O follows a sequence of DB ops on the same connection.
	const content = await Bun.file(`${import.meta.dir}/../seedData.csv`).text()

	await db`SET FOREIGN_KEY_CHECKS = 0`
	await db`TRUNCATE TABLE outfit_items`
	await db`TRUNCATE TABLE outfits`
	await db`TRUNCATE TABLE items`
	await db`TRUNCATE TABLE characters`
	await db`TRUNCATE TABLE series`
	await db`SET FOREIGN_KEY_CHECKS = 1`
	console.log("Truncated all tables")
	const lines = content.trim().split("\n")

	const rows: Array<{
		name: string
		series: string
		type: string
		location: string
		notes: string
	}> = []

	for (let i = 1; i < lines.length; i++) {
		const cols = parseCSVRow(lines[i])
		rows.push({
			name: cols[0]?.trim() ?? "",
			series: cols[1]?.trim() ?? "",
			type: cols[2]?.trim() ?? "",
			location: cols[3]?.trim() ?? "",
			notes: cols[4]?.trim() ?? "",
		})
	}

	console.log(`Parsed ${rows.length} rows`)

	// Group by series
	const bySeries = new Map<string, typeof rows>()
	for (const row of rows) {
		if (!bySeries.has(row.series)) bySeries.set(row.series, [])
		bySeries.get(row.series)!.push(row)
	}

	// Insert series
	const seriesIds = new Map<string, number>()
	for (const name of bySeries.keys()) {
		if (!name) continue
		await db`INSERT IGNORE INTO series (name) VALUES (${name})`
		const [s] = await db`SELECT id FROM series WHERE name = ${name}`
		seriesIds.set(name, s.id)
	}
	console.log(`Series: ${seriesIds.size}`)

	// Find characters per series and insert them
	const characterIds = new Map<string, number>() // "seriesId:name" -> id
	const seriesCharacters = new Map<string, string[]>()

	for (const [seriesName, items] of bySeries) {
		if (!seriesName) continue
		const seriesId = seriesIds.get(seriesName)!
		const characters = findCharacters(items.map((i) => i.name))
		seriesCharacters.set(seriesName, characters)

		for (const name of characters) {
			await db`INSERT IGNORE INTO characters (name, series_id) VALUES (${name}, ${seriesId})`
			const [c] =
				await db`SELECT id FROM characters WHERE name = ${name} AND series_id = ${seriesId}`
			characterIds.set(`${seriesId}:${name}`, c.id)
		}

		if (characters.length > 0) {
			console.log(`  ${seriesName}: ${characters.join(", ")}`)
		}
	}
	console.log(`Characters: ${characterIds.size}`)

	// Insert items
	let inserted = 0

	for (const row of rows) {
		if (!row.name) continue

		const type = normalizeType(row.type)

		const seriesId = row.series ? (seriesIds.get(row.series) ?? null) : null

		let characterId: number | null = null
		if (seriesId && row.series) {
			const characters = seriesCharacters.get(row.series) ?? []
			const charName = assignCharacter(row.name, characters)
			if (charName) {
				characterId = characterIds.get(`${seriesId}:${charName}`) ?? null
			}
		}

		await db`
			INSERT INTO items (name, type, series_id, character_id, location, notes)
			VALUES (
				${row.name},
				${type},
				${seriesId},
				${characterId},
				${row.location || null},
				${row.notes || null}
			)
		`
		inserted++
	}

	console.log(`Items inserted: ${inserted}`)
	process.exit(0)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
