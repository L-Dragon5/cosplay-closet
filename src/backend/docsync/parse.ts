// Parses the Markdown export of the "Cosplay Bin List" Google Doc: every bold
// heading is a storage location, every bullet under it an item.

export type DocEntry = {
  location: string
  /** Heading category, e.g. "OUTFITS", "SHOES", "Props and Misc." */
  category: string | null
  name: string
  series: string | null
  notes: string | null
}

const unescapeMd = (s: string) =>
  s
    .replace(/\\([#!=\-*_[\]()])/g, "$1")
    .replace(/[’‘]/g, "'")
    .trim()

/** `Cosplay Bin #1: OUTFITS` -> `Bin #01`, the name the seed gave it. */
export function normalizeLocation(heading: string): {
  location: string
  category: string | null
} {
  const bin = heading.match(/^Cosplay Bin #\s*(\d+)\s*:\s*(.*)$/i)
  if (bin) {
    return {
      location: `Bin #${bin[1]!.padStart(2, "0")}`,
      category: bin[2] || null,
    }
  }
  const cat = heading.match(/:\s*(.+)$/)
  return { location: heading, category: cat ? cat[1]! : null }
}

// `(L)`, `(3 parts)`, `(Vida's)`, `(Throw away?)` are not series names.
const notSeries = (s: string) => s.length <= 3 || /\bparts?\b|\?|'s$/i.test(s)

export function parseItem(raw: string): {
  name: string
  series: string | null
  notes: string | null
} {
  let line = unescapeMd(raw)
  const notes: string[] = []

  // The whole bullet in bold (`**Purple Mary Jane Shoes?**`): just unwrap it.
  const whole = line.match(/^\*\*(.+)\*\*$/)
  if (whole) line = whole[1]!.replace(/^\*\*|\*\*$/g, "").trim()

  // Trailing bold note: `... (Love Live) **- Shoot with ...**`
  const bold = line.match(/\s*\*\*\s*(.*?)\s*\*\*\s*$/)
  if (bold) {
    const note = bold[1]!.replace(/^-\s*/, "").trim()
    if (note) notes.push(note)
    line = line.slice(0, bold.index).trim()
  }
  line = line.replace(/\*\*/g, "").trim()

  // Trailing italic note: `... (Cardcaptor Sakura) *Use This`
  const italic = line.match(/\s+\*([^*]+)\*?$/)
  if (italic) {
    notes.unshift(italic[1]!.trim())
    line = line.slice(0, italic.index).trim()
  }

  // Trailing shouted note: `... (Re: Zero) - CURRENTLY IN BEDROOM SHELF`
  const shout = line.match(/\s+-\s+([A-Z]{2,}\b[^a-z]*)$/)
  if (shout) {
    notes.unshift(shout[1]!.trim())
    line = line.slice(0, shout.index).trim()
  }

  let series: string | null = null
  const paren = line.match(/\s*\(([^()]+)\)$/)
  if (paren && !notSeries(paren[1]!.trim())) {
    series = paren[1]!.trim()
    line = line.slice(0, paren.index).trim()
  }

  return { name: line, series, notes: notes.length ? notes.join("; ") : null }
}

export function parseBinList(md: string): DocEntry[] {
  const entries: DocEntry[] = []
  let current: { location: string; category: string | null } | null = null

  for (const rawLine of md.split("\n")) {
    const line = rawLine.trim()
    const heading = line.match(/^\*\*(.+?)\*\*$/)
    if (heading && !line.startsWith("* ")) {
      const text = unescapeMd(heading[1]!)
      // Everything under SOLD has left the house; it is not a location.
      if (/^SOLD\b/i.test(text)) break
      current = normalizeLocation(text)
      continue
    }
    const bullet = line.match(/^\*\s+(.*)$/)
    if (!bullet || !current) continue
    const item = parseItem(bullet[1]!)
    if (!item.name) continue
    entries.push({ ...current, ...item })
  }
  return entries
}
