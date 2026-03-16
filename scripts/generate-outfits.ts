import { db } from "@/backend/db"

// Words at the start of a base name that indicate "Default", not a real outfit
const MODIFIER_PREFIXES = new Set([
  "new",
  "old",
  "alt",
  "alternate",
  "classic",
  "original",
])

// Words that on their own don't constitute a meaningful outfit name.
// Used to determine whether what follows a character name prefix is a real outfit.
const FILLER_WORDS = new Set([
  // Item type words
  "outfit",
  "wig",
  "shoes",
  "shoe",
  "dress",
  "costume",
  "prop",
  "hat",
  "gloves",
  "accessories",
  "accessory",
  "armor",
  "jacket",
  "coat",
  "pants",
  "skirt",
  "top",
  "shirt",
  "cape",
  "cloak",
  "scarf",
  "belt",
  "boots",
  "heels",
  "sandals",
  "stockings",
  "socks",
  "tights",
  "bag",
  "purse",
  // Weapon/prop type words
  "gun",
  "guns",
  "airsoft",
  "rifle",
  "pistol",
  "sword",
  "swords",
  "blade",
  "blades",
  "wand",
  "wands",
  "staff",
  "shield",
  "shields",
  "bow",
  "bows",
  "spear",
  "spears",
  "lance",
  "lances",
  "axe",
  "axes",
  "hammer",
  "hammers",
  "cannon",
  "cannons",
  "knife",
  "knives",
  "dagger",
  "daggers",
  // Body part descriptors (singular and plural)
  "shoulder",
  "shoulders",
  "chest",
  "head",
  "arm",
  "arms",
  "leg",
  "legs",
  "foot",
  "feet",
  "hand",
  "hands",
  "neck",
  "back",
  "waist",
  "ear",
  "ears",
  "eye",
  "eyes",
  "face",
  "hair",
  "tail",
  "tails",
  "wing",
  "wings",
  "horn",
  "horns",
  "paw",
  "paws",
  "fang",
  "fangs",
  "claw",
  "claws",
  // Connectors
  "with",
  "and",
  "or",
  "the",
  "a",
  "an",
  "for",
  "of",
  "in",
  "at",
  "by",
  "from",
  "to",
  "as",
  // Default indicators
  "regular",
  "default",
  "normal",
  "standard",
  "basic",
])

// If the base starts with the character's name, extract what follows.
// Returns the outfit name (possibly "Default") or null if char name not at start.
function extractAfterCharName(
  base: string,
  charFull: string,
  charFirst: string,
): string | null {
  const lower = base.toLowerCase()
  const prefix = lower.startsWith(`${charFull} `)
    ? charFull
    : lower.startsWith(`${charFirst} `)
      ? charFirst
      : null
  if (!prefix) return null

  const remaining = base.slice(prefix.length + 1).trim()
  if (!remaining) return "Default"

  // If every word in the remaining is a filler word, it's Default
  const remainingWords = remaining.toLowerCase().split(/\s+/)
  const hasRealWord = remainingWords.some((w) => !FILLER_WORDS.has(w))
  if (!hasRealWord) return "Default"

  // Strip trailing filler words (e.g. dangling "and", "with")
  const trimmedWords = remaining.split(/\s+/)
  while (
    trimmedWords.length > 0 &&
    FILLER_WORDS.has(trimmedWords[trimmedWords.length - 1].toLowerCase())
  ) {
    trimmedWords.pop()
  }
  return trimmedWords.join(" ") || "Default"
}

function getOutfitName(
  itemName: string,
  itemType: string,
  characterName: string,
  seriesName: string | null,
): string {
  // Strip trailing parentheticals e.g. "(3 parts)", "(ver. 2)"
  const trimmed = itemName
    .trim()
    .replace(/\s*\(.*$/, "")
    .trim()

  // Strip trailing variant markers: #1, #2, "#1 and #2", "#1 & #2", "#1, #2", etc.
  const normalized = trimmed.replace(/\s+#\d+.*$/, "").trim()
  const words = normalized.split(/\s+/)
  if (words.length <= 1) return "Default"

  // Prop/Accessories items often have a descriptor before the type word (e.g. "Tambourine Prop")
  // Strip 2 words for those when the name is long enough, otherwise 1
  const stripCount =
    (itemType === "Prop" || itemType === "Accessories") && words.length >= 4
      ? 2
      : 1
  const base = words.slice(0, -stripCount).join(" ")

  const baseLower = base.toLowerCase()
  const charParts = characterName.trim().toLowerCase().split(/\s+/)
  const charFull = charParts.join(" ")
  const charFirst = charParts[0]
  const charLast = charParts.length > 1 ? charParts[charParts.length - 1] : null

  // Exact match: full name, first name, or last name → Default
  if (
    baseLower === charFull ||
    baseLower === charFirst ||
    (charLast && baseLower === charLast)
  ) {
    return "Default"
  }

  // Char name appears at end of normalized name (e.g. "White Sneakers for Kiyoko") → Default
  const normalizedLower = normalized.toLowerCase()
  if (
    normalizedLower.endsWith(` ${charFull}`) ||
    (charFirst !== charFull && normalizedLower.endsWith(` ${charFirst}`)) ||
    (charLast && normalizedLower.endsWith(` ${charLast}`))
  ) {
    return "Default"
  }

  // Starts with char name → extract what follows; may be a real outfit name or Default
  const fromPrefix = extractAfterCharName(base, charFull, charFirst)
  if (fromPrefix !== null) return fromPrefix

  // Char name mid-string with filler suffix: "Cyber Rin Outfit and" → "Cyber Rin"
  for (const cn of charFull === charFirst
    ? [charFull]
    : [charFull, charFirst]) {
    const re = new RegExp(`\\b${cn}\\b`, "i")
    const match = base.match(re)
    if (!match || match.index === undefined) continue
    const afterIdx = match.index + cn.length
    const afterChar = base.slice(afterIdx).trim()
    if (!afterChar) continue
    if (
      afterChar
        .toLowerCase()
        .split(/\s+/)
        .every((w) => FILLER_WORDS.has(w))
    ) {
      return base.slice(0, afterIdx).trim() || "Default"
    }
  }

  // Contains "Regular"
  if (/\bregular\b/i.test(base)) return "Default"

  // Modifier prefix word (e.g. "New", "Old", "Alt")
  if (MODIFIER_PREFIXES.has(baseLower.split(" ")[0])) return "Default"

  // Exact match with series name
  if (seriesName && baseLower === seriesName.trim().toLowerCase())
    return "Default"

  // Starts with series name → e.g. "Kamichama Karin Staff"
  if (seriesName && baseLower.startsWith(seriesName.trim().toLowerCase()))
    return "Default"

  // Strip any remaining character name tokens from the result
  let result = base
  for (const token of charFull === charFirst
    ? [charFull]
    : [charFull, charFirst, ...(charLast ? [charLast] : [])]) {
    result = result.replace(new RegExp(`\\b${token}\\b`, "gi"), "").trim()
  }
  result = result.replace(/\s{2,}/g, " ").trim()

  return result || "Default"
}

// Fetch items that have a character and are not Materials
const items = await db`
  SELECT i.id, i.name, i.type, i.character_id, c.name AS character_name, s.name AS series_name
  FROM items i
  JOIN characters c ON i.character_id = c.id
  LEFT JOIN series s ON c.series_id = s.id
  WHERE i.character_id IS NOT NULL
    AND i.type != 'Materials'
  ORDER BY c.id, i.name
`

// Group items by character
const byCharacter = new Map<number, typeof items>()
for (const item of items) {
  const cid = item.character_id as number
  if (!byCharacter.has(cid)) byCharacter.set(cid, [])
  byCharacter.get(cid)!.push(item)
}

let outfitsCreated = 0
let outfitsSkipped = 0

for (const [characterId, characterItems] of byCharacter) {
  const characterName = characterItems[0].character_name as string
  const seriesName = (characterItems[0].series_name as string) ?? null

  // Map each item to an outfit name and group them
  const outfitGroups = new Map<string, number[]>()
  for (const item of characterItems) {
    const outfitName = getOutfitName(
      item.name as string,
      item.type as string,
      characterName,
      seriesName,
    )
    if (!outfitGroups.has(outfitName)) outfitGroups.set(outfitName, [])
    outfitGroups.get(outfitName)!.push(item.id as number)
  }

  // If Default only contains Wig items and other outfits exist, move them there
  const defaultIds = outfitGroups.get("Default") ?? []
  const defaultItems = characterItems.filter((i) =>
    defaultIds.includes(i.id as number),
  )
  const defaultIsOnlyWigs =
    defaultIds.length > 0 && defaultItems.every((i) => i.type === "Wig")
  const otherOutfits = [...outfitGroups.keys()].filter((k) => k !== "Default")

  if (defaultIsOnlyWigs && otherOutfits.length > 0) {
    for (const outfitName of otherOutfits) {
      outfitGroups.set(outfitName, [
        ...outfitGroups.get(outfitName)!,
        ...defaultIds,
      ])
    }
    outfitGroups.delete("Default")
  }

  console.log(`\n${characterName} (${seriesName ?? "No Series"})`)

  for (const [outfitName, itemIds] of outfitGroups) {
    const existing =
      await db`SELECT id FROM outfits WHERE name = ${outfitName} AND character_id = ${characterId}`
    if (existing.length > 0) {
      console.log(`  [skip] "${outfitName}" already exists`)
      outfitsSkipped++
      continue
    }

    const result =
      await db`INSERT INTO outfits (name, character_id) VALUES (${outfitName}, ${characterId})`
    const outfitId = result.lastInsertRowid

    for (const itemId of itemIds) {
      await db`INSERT INTO outfit_items (outfit_id, item_id) VALUES (${outfitId}, ${itemId})`
    }

    const itemNames = characterItems
      .filter((i) => itemIds.includes(i.id as number))
      .map((i) => i.name)
    console.log(`  [create] "${outfitName}" — ${itemIds.length} item(s)`)
    for (const n of itemNames) console.log(`    • ${n}`)
    outfitsCreated++
  }
}

console.log(
  `\nDone. Created ${outfitsCreated} outfit(s), skipped ${outfitsSkipped} existing.`,
)
process.exit(0)
