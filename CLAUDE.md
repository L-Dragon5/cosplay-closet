# Cosplay Closet — Claude Instructions

## Project Overview

Cosplay Closet is a personal inventory app for tracking cosplay items, organized by series, character, and storage location. It uses a full-stack TypeScript setup with Bun, ElysiaJS, MySQL, React, and Mantine.

## Code Style

- Use **2-space indentation** throughout all files (TypeScript, TSX, JSON, etc.)
- No semicolons where avoidable (follow existing Biome config)

## Bun

Default to Bun instead of Node.js:

- `bun <file>` instead of `node <file>` or `ts-node <file>`
- `bun test` instead of jest or vitest
- `bun build` instead of webpack or esbuild
- `bun install` instead of npm/yarn/pnpm install
- `bun run <script>` instead of npm/yarn/pnpm run
- `bunx <package>` instead of npx
- Bun automatically loads `.env` — don't use dotenv
- `Bun.file` instead of `node:fs` readFile/writeFile
- `Bun.sql` for MySQL (configured in `src/backend/db.ts`) — don't use `mysql2` or `pg`
- `bun:sqlite` for SQLite if needed — don't use `better-sqlite3`
- `Bun.$\`cmd\`` instead of execa

## Scripts

```sh
bun run dev           # Generate routes + start backend with HMR
bun run build         # Generate routes + compile to single binary
bun run seed          # Run scripts/seed.ts against the DB
bun test              # Run all tests
bun run lint          # Biome check + auto-fix
bun run generate-routes  # One-shot TanStack Router route generation
bun run watch-routes  # Watch mode for route generation
```

## Architecture

### Backend — `src/backend/`

Built with **ElysiaJS** (v1.4.27). Each resource has its own folder with two files:

- `index.ts` — Elysia controller, defines routes with typed body/param schemas using `t` from `elysia`
- `service.ts` — DB query functions using the `db` tagged template from `src/backend/db.ts`

**Resources and API prefix `/api`:**

| Resource   | Controller                        | Prefix        |
|------------|-----------------------------------|---------------|
| series     | `src/backend/series/index.ts`     | `/series`     |
| characters | `src/backend/characters/index.ts` | `/characters` |
| items      | `src/backend/items/index.ts`      | `/items`      |
| locations  | `src/backend/locations/index.ts`  | `/locations`  |
| outfits    | `src/backend/outfits/index.ts`    | `/outfits`    |

All controllers are registered in `src/backend/index.ts` under a shared `/api` prefix Elysia instance. The `App` type is exported from there for Eden Treaty inference.

**Database** (`src/backend/db.ts`):

- Connection via `Bun.sql` with `mysql://` URL built from env vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_DATABASE`
- `initDb()` creates all tables on startup with `CREATE TABLE IF NOT EXISTS`
- Schema (FK order matters for truncation):
  ```
  series
  characters  (series_id → series)
  locations
  items       (series_id → series, character_id → characters, location_id → locations)
  outfits     (character_id → characters)
  outfit_items (outfit_id → outfits, item_id → items)
  ```
- Item type enum: `Clothes | Wig | Shoes | Accessories | Prop | Materials`

### Frontend — `src/frontend/`

Built with **React 19**, **Mantine v8**, **TanStack Router**, **TanStack Query v5**, and **Jotai**.

**Key files:**

- `src/frontend/api.ts` — Eden Treaty client (`treaty<App>(...)`) for type-safe API calls
- `src/frontend/queries.ts` — Per-resource React Query hooks: `useSeriesQuery`, `useCharactersQuery`, `useItemsQuery`, `useLocationsQuery`, `useOutfitsQuery`. Each uses a single-element cache key matching the resource name (e.g. `["items"]`).
- `src/frontend/atoms.ts` — Jotai `activeSectionAtom` (persisted to localStorage). `Section` type: `"series" | "characters" | "items" | "locations" | "outfits"`
- `src/frontend/routes/__root.tsx` — App shell with nav buttons that set `activeSectionAtom`
- `src/frontend/routes/index.tsx` — Switches on `activeSectionAtom` to render the active section component

**Section components** (`src/frontend/components/<resource>/`):

Each section has:
- `<Resource>Section.tsx` — calls the relevant query hook(s), joins related data in `useMemo`, renders `<Resource>Card>` in a `SimpleGrid`
- `<Resource>Card.tsx` — pure display card using Mantine `Card`, `Badge`, `Title`, etc.

`SectionShell` (`src/frontend/components/SectionShell.tsx`) is a shared wrapper that handles loading, error, and Container/Title layout — all section components use it.

**Nav sections (in order):** Series → Characters → Items → Locations → Outfits

### Seed Script — `scripts/seed.ts`

Reads `seedData.csv` (columns: name, series, type, location, notes) and populates all tables.

**Important:** Read the CSV file with `Bun.file(...).text()` **before** any DB operations. The Bun 1.3.10 MySQL driver loses connection sync if file I/O follows sequential DB ops on the same connection.

Truncation order (with `SET FOREIGN_KEY_CHECKS = 0/1`):
```
outfit_items → outfits → items → locations → characters → series
```

The script:
1. Normalizes series names using Levenshtein distance (≤2 edits merges typos)
2. Detects characters via n-gram frequency analysis (`scripts/stopWords.ts` defines `STOP_WORDS` and `COMPOUND_STOP_EXCEPTIONS`)
3. Inserts unique locations, builds a `locationIds` map
4. Inserts items with `location_id` FK (not a text field)

Stop word logic uses a two-tier system: `STOP_WORDS` blocks solo token candidates; `COMPOUND_STOP_EXCEPTIONS` allows those tokens to appear inside multi-word character names (e.g. "Jack the Ripper", "Jeanne Alter").

## Testing

```sh
bun test
```

Test files live in `src/backend/tests/`. Uses `bun:test`.
