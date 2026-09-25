import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test"
import { Elysia } from "elysia"
import { normalizeLocation, parseBinList, parseItem } from "../docsync/parse"
import {
  guessCharacter,
  guessType,
  planSync,
  type State,
} from "../docsync/plan"
import { clearAll, createTestDb } from "./testDb"

const { sqlite, db } = createTestDb()
mock.module("@/backend/db", () => ({ db }))

const { docsyncController } = await import("../docsync")
const { apply, preview } = await import("../docsync/service")
const app = new Elysia().use(docsyncController)

const md = await Bun.file(`${import.meta.dir}/fixtures/binList.md`).text()

describe("parseItem", () => {
  test("splits the series off the end", () => {
    expect(parseItem("Anby Shoes (Zenless Zone Zero)")).toEqual({
      name: "Anby Shoes",
      series: "Zenless Zone Zero",
      notes: null,
    })
  })

  test("sizes, part counts and possessives are not series", () => {
    expect(parseItem("Cyber Kotori Outfit (M)").series).toBeNull()
    expect(parseItem("Kamichama Karin Staff Prop (3 parts)").series).toBeNull()
    expect(
      parseItem("Cyber Honoka Outfit (L) and Bracelets (Vida’s)").series,
    ).toBeNull()
  })

  test("bold, italic and shouted notes move to notes", () => {
    expect(
      parseItem(
        "Cherry Blossom Maki Outfit (Love Live) **\\- Shoot with Buffalo cherry blossoms**",
      ),
    ).toEqual({
      name: "Cherry Blossom Maki Outfit",
      series: "Love Live",
      notes: "Shoot with Buffalo cherry blossoms",
    })
    expect(
      parseItem(
        "Bunny Suit Rem Outfit (Re: Zero) \\- CURRENTLY IN BEDROOM SHELF",
      ),
    ).toEqual({
      name: "Bunny Suit Rem Outfit",
      series: "Re: Zero",
      notes: "CURRENTLY IN BEDROOM SHELF",
    })
    expect(
      parseItem(
        "Platinum Sakura Short Hoop Petticoat Skirt (Cardcaptor Sakura) \\*on garment bags shelf\\*",
      ),
    ).toEqual({
      name: "Platinum Sakura Short Hoop Petticoat Skirt",
      series: "Cardcaptor Sakura",
      notes: "on garment bags shelf",
    })
    expect(parseItem("Saaya Shoes (Bang Dream) **(NEED TO FIX)**")).toEqual({
      name: "Saaya Shoes",
      series: "Bang Dream",
      notes: "(NEED TO FIX)",
    })
  })

  test("a fully bold bullet is just unwrapped", () => {
    expect(parseItem("**Purple Mary Jane Shoes?**").name).toBe(
      "Purple Mary Jane Shoes?",
    )
  })
})

describe("normalizeLocation", () => {
  test("numbered bins take the seeded name", () => {
    expect(normalizeLocation("Cosplay Bin #1: OUTFITS")).toEqual({
      location: "Bin #01",
      category: "OUTFITS",
    })
    expect(normalizeLocation("Cosplay Bin #37: SHOES AND WIGS").location).toBe(
      "Bin #37",
    )
  })

  test("a bin with no number keeps its heading", () => {
    expect(normalizeLocation("Cosplay Bin #  : SHOES")).toEqual({
      location: "Cosplay Bin #  : SHOES",
      category: "SHOES",
    })
  })
})

describe("parseBinList", () => {
  const entries = parseBinList(md)

  test("reads every item up to SOLD, skipping the intro and empty bullets", () => {
    expect(entries).toHaveLength(19)
    expect(entries.some((e) => e.name.startsWith("Valentine"))).toBe(false)
    expect(
      entries.some((e) => e.location === "Black Duffel Bag for Shoes"),
    ).toBe(false)
  })

  test("FOR SALE bins are locations", () => {
    expect(entries.at(-1)).toMatchObject({
      location: "FOR SALE BIN: WIGS",
      name: "Sayuri Wig",
    })
  })
})

describe("guessType", () => {
  test("name keywords win over the bin heading", () => {
    expect(guessType("Mei Wig with Glasses", "OUTFITS")).toBe("Wig")
    expect(guessType("Watermelon Fan", "OUTFITS")).toBe("Prop")
    expect(guessType("Rem Outfit", "SHOES")).toBe("Clothes")
  })

  test("the last type word names the thing, before any with/and clause", () => {
    expect(guessType("Summer Uniform Syo Shoes", "SHOES")).toBe("Shoes")
    expect(guessType("September Yukata All Character Fans", null)).toBe("Prop")
    expect(guessType("Qipao PA-15 Outfit with Fan Prop", null)).toBe("Clothes")
    expect(guessType("Tsubasa Sakura Outfit and Petticoat", null)).toBe(
      "Clothes",
    )
    expect(guessType("Arda Shorts Wefts in Light Blonde", "WIGS")).toBe("Wig")
  })

  test("the heading decides when the name says nothing", () => {
    expect(guessType("Shoe Cushions", "SHOES")).toBe("Shoes")
    expect(guessType("Houseki Jade Transparent Green Sheets", null)).toBe(
      "Materials",
    )
  })
})

describe("guessCharacter", () => {
  const chars = [
    { id: 1, name: "Umi Sonoda", series_id: 1 },
    { id: 2, name: "Maki Nishikino", series_id: 1 },
    { id: 3, name: "Sakura Kinomoto", series_id: 2 },
    { id: 4, name: "Sakura Haruno", series_id: 2 },
  ]
  test("a first-name token is enough when it is unique", () => {
    expect(guessCharacter("Cherry Blossom Maki Outfit", chars)?.id).toBe(2)
  })
  test("ambiguous tokens leave it unset", () => {
    expect(guessCharacter("Sakura Wig", chars)).toBeNull()
  })
  test("a full name beats a shared token", () => {
    expect(guessCharacter("Sakura Kinomoto Dress", chars)?.id).toBe(3)
  })
})

describe("planSync", () => {
  const entries = parseBinList(md)
  const base: State = {
    locations: [
      { id: 1, name: "Large Wide Cardboard Box" },
      { id: 2, name: "Small Black Suitcase" },
      { id: 3, name: "Cosplay Hangers" },
      { id: 4, name: "Bin #01" },
      { id: 5, name: "Bin #10" },
    ],
    series: [
      { id: 1, name: "Love Live!" },
      { id: 2, name: "Cardcaptor Sakura" },
      { id: 3, name: "Zenless Zone Zero" },
    ],
    characters: [
      { id: 1, name: "Umi Sonoda", series_id: 1 },
      { id: 2, name: "Anby Demara", series_id: 3 },
    ],
    items: [
      { id: 1, name: "Kamichama Karin Staff Prop (3 parts)", location_id: 1 },
      { id: 2, name: "Hikari Sword Prop", location_id: 1 },
      { id: 3, name: "Cyber Honoka Outfit and Bracelets", location_id: 2 },
      { id: 4, name: "Cyber Kotori Outfit", location_id: 2 },
      { id: 5, name: "Cherry Blossom Maki Outfit", location_id: 3 },
      { id: 6, name: "Bubble Umi Outfit", location_id: 4 },
      { id: 7, name: "Kotone / Mabel Wig", location_id: 4 },
      { id: 8, name: "White Sandals", location_id: 5 },
      { id: 9, name: "White Sandals", location_id: 5 },
      { id: 10, name: "Black Pumps 3", location_id: 5 },
      { id: 11, name: "Sold Long Ago Outfit", location_id: 4 },
    ],
  }
  const plan = planSync(entries, base)

  test("word-contained location names match; a longer name does not steal one", () => {
    // `Small Black Travel Suitcase` is the seeded `Small Black Suitcase`...
    expect(plan.newLocations).not.toContain("Small Black Travel Suitcase")
    // ...but `My Room Cosplay Hangers` is not `Cosplay Hangers`.
    expect(plan.newLocations).toContain("My Room Cosplay Hangers")
    expect(plan.newLocations).toContain("Bin #40")
  })

  test("items that changed bins are moves", () => {
    expect(plan.moves).toContainEqual({
      itemId: 5,
      name: "Cherry Blossom Maki Outfit",
      from: "Cosplay Hangers",
      to: "Bin #01",
      locationId: 4,
    })
    // Two White Sandals rows: the one already in #10 stays, the other moves.
    const sandals = plan.moves.filter((m) => m.name === "White Sandals")
    expect(sandals).toHaveLength(1)
    expect(sandals[0]).toMatchObject({ to: "Bin #40", locationId: null })
  })

  test("sizes and nested series do not break a match", () => {
    const matched = new Set([
      ...plan.moves.map((m) => m.itemId),
      ...plan.renames.map((r) => r.itemId),
    ])
    const untouched = [1, 3, 4, 7]
    for (const id of untouched) expect(matched.has(id)).toBe(false)
    expect(plan.adds.map((a) => a.name)).not.toContain("Cyber Kotori Outfit")
  })

  test("a typo in the doc matches but does not rename", () => {
    expect(plan.adds.map((a) => a.name)).not.toContain("Bubble Umi Outift")
    expect(plan.renames.map((r) => r.itemId)).not.toContain(6)
  })

  test("a reworded item is renamed to the doc's wording", () => {
    expect(plan.renames).toEqual([
      {
        itemId: 2,
        from: "Hikari Sword Prop",
        to: "Revue Starlight Hikari Sword Prop",
      },
    ])
  })

  test("digits must agree: Black Pumps 2 is not Black Pumps 3", () => {
    expect(plan.adds.map((a) => a.name)).toContain("Black Pumps 2")
    expect(plan.notInDoc.map((n) => n.itemId)).toContain(10)
  })

  test("new items get series, type, character and notes", () => {
    const anby = plan.adds.find((a) => a.name === "Anby Shoes")
    expect(anby).toMatchObject({
      series: "Zenless Zone Zero",
      seriesId: 3,
      type: "Shoes",
      character: "Anby Demara",
      characterId: 2,
      location: "Bin #40",
      locationId: null,
    })
    const saaya = plan.adds.find((a) => a.name === "Saaya Shoes")
    expect(saaya?.notes).toBe("(NEED TO FIX)")
    expect(plan.newSeries).toContain("Kpop Demon Hunters")
    expect(plan.newSeries).not.toContain("Love Live")
  })

  test("items missing from the doc are reported, never planned for removal", () => {
    expect(plan.notInDoc).toContainEqual({
      itemId: 11,
      name: "Sold Long Ago Outfit",
      location: "Bin #01",
    })
  })

  test("the hash is stable and tracks the plan", () => {
    expect(planSync(entries, base).hash).toBe(plan.hash)
    const moved = {
      ...base,
      items: base.items.map((i) => (i.id === 5 ? { ...i, location_id: 4 } : i)),
    }
    expect(planSync(entries, moved).hash).not.toBe(plan.hash)
  })
})

describe("docsync against the database", () => {
  const realFetch = globalThis.fetch
  let body = md
  let contentType = "text/x-markdown; charset=utf-8"
  globalThis.fetch = (async () =>
    new Response(body, {
      headers: { "Content-Type": contentType },
    })) as unknown as typeof fetch

  afterAll(() => {
    globalThis.fetch = realFetch
  })

  beforeEach(() => {
    clearAll(sqlite)
    body = md
    contentType = "text/x-markdown; charset=utf-8"
    process.env.BIN_LIST_DOC_ID = "doc123"
    sqlite.run("INSERT INTO locations (id, name) VALUES (4, 'Bin #01')")
    sqlite.run("INSERT INTO locations (id, name) VALUES (3, 'Cosplay Hangers')")
    sqlite.run("INSERT INTO series (id, name) VALUES (1, 'Love Live!')")
    sqlite.run(
      "INSERT INTO items (id, name, type, location_id) VALUES (5, 'Cherry Blossom Maki Outfit', 'Clothes', 3)",
    )
    sqlite.run(
      "INSERT INTO items (id, name, type, location_id) VALUES (2, 'Hikari Sword Prop', 'Prop', 4)",
    )
  })

  test("GET /docsync previews", async () => {
    const res = await app.handle(new Request("http://localhost/docsync"))
    expect(res.status).toBe(200)
    const plan = await res.json()
    expect(plan.entries).toBe(19)
    expect(plan.moves.map((m: { itemId: number }) => m.itemId)).toContain(5)
  })

  test("apply writes the plan, and a second preview has nothing left to do", async () => {
    const plan = await preview()
    let backedUp = 0
    const result = await apply(plan.hash, async () => {
      backedUp++
      return { path: "/backups/cosplay-closet-test.tar.gz" }
    })
    expect(backedUp).toBe(1)
    expect(result).toMatchObject({
      moved: plan.moves.length,
      renamed: 1,
      added: plan.adds.length,
      backup: "cosplay-closet-test.tar.gz",
    })

    const maki = sqlite
      .query(
        "SELECT l.name AS loc FROM items i JOIN locations l ON l.id = i.location_id WHERE i.id = 5",
      )
      .get() as { loc: string }
    expect(maki.loc).toBe("Bin #01")
    const hikari = sqlite
      .query("SELECT name, location_id FROM items WHERE id = 2")
      .get()
    expect(hikari).toEqual({
      name: "Revue Starlight Hikari Sword Prop",
      location_id: expect.any(Number),
    })
    const zoey = sqlite
      .query(
        "SELECT i.type, s.name AS series, l.name AS loc FROM items i JOIN series s ON s.id = i.series_id JOIN locations l ON l.id = i.location_id WHERE i.name = 'Zoey Shoes'",
      )
      .get()
    expect(zoey).toEqual({
      type: "Shoes",
      series: "Kpop Demon Hunters",
      loc: "Bin #40",
    })

    const again = await preview()
    expect(again.moves).toEqual([])
    expect(again.adds).toEqual([])
    expect(again.renames).toEqual([])
    expect(again.newLocations).toEqual([])
    expect(again.newSeries).toEqual([])
  })

  test("a stale hash is refused with 409 before anything is written", async () => {
    const res = await app.handle(
      new Request("http://localhost/docsync/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: "stale" }),
      }),
    )
    expect(res.status).toBe(409)
    const count = sqlite.query("SELECT COUNT(*) AS n FROM items").get() as {
      n: number
    }
    expect(count.n).toBe(2)
  })

  test("no doc id configured is a 400", async () => {
    delete process.env.BIN_LIST_DOC_ID
    const res = await app.handle(new Request("http://localhost/docsync"))
    expect(res.status).toBe(400)
  })

  test("a doc that is no longer link-shared is a 502, not an empty plan", async () => {
    body = "<html>Sign in</html>"
    contentType = "text/html; charset=utf-8"
    const res = await app.handle(new Request("http://localhost/docsync"))
    expect(res.status).toBe(502)
    expect((await res.json()).error).toContain("Anyone with the link")
  })
})
