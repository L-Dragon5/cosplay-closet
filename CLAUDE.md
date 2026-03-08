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

| Resource   | Controller                        | Prefix        | Notable extra routes                     |
|------------|-----------------------------------|---------------|------------------------------------------|
| series     | `src/backend/series/index.ts`     | `/series`     | `POST /:id/image` (upload)               |
| characters | `src/backend/characters/index.ts` | `/characters` | `POST /:id/image` (upload)               |
| items      | `src/backend/items/index.ts`      | `/items`      |                                          |
| locations  | `src/backend/locations/index.ts`  | `/locations`  |                                          |
| outfits    | `src/backend/outfits/index.ts`    | `/outfits`    | `POST /:id/image` (upload)               |
| —          | `src/backend/index.ts`            | —             | `GET /api/proxy-image?url=` (CORS proxy) |

All controllers are registered in `src/backend/index.ts` under a shared `/api` prefix Elysia instance. The `App` type is exported from there for Eden Treaty inference. OpenAPI docs available at `/api/docs`.

Each resource folder also has a `model.ts` exporting a TypeBox schema and TypeScript type (e.g. `SeriesSchema`, `Series`). These are imported by `src/frontend/queries.ts` for type-safe cast of API responses.

**Database** (`src/backend/db.ts`):

- Connection via `Bun.sql` with `mysql://` URL built from env vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_DATABASE`
- `initDb()` creates all tables on startup with `CREATE TABLE IF NOT EXISTS`, then runs `ALTER TABLE` migrations (wrapped in try/catch) for columns added after initial deploy
- Schema (FK order matters for truncation):
  ```
  series       (image_path VARCHAR(255) NULL)
  characters   (series_id → series)
  locations
  items        (series_id → series, character_id → characters, location_id → locations)
  outfits      (character_id → characters)
  outfit_items (outfit_id → outfits, item_id → items)
  ```
- Item type enum: `Clothes | Wig | Shoes | Accessories | Prop | Materials`

**Static file serving & proxy** (`src/backend/index.ts`):

- `/uploads/*` requests are served from `public/uploads/` via `Bun.file()` in the `fetch` handler before passing to Elysia
- Uploaded images are stored at `public/uploads/{resource}/{id}.jpg` (series, characters, outfits)
- `GET /api/proxy-image?url=` — server-side proxy for external images (e.g. Jikan/MAL CDN) to avoid browser CORS restrictions; returns `new Response(res.body, { headers: { "Content-Type": ... } })` directly to bypass Elysia serialization

### Frontend — `src/frontend/`

Built with **React 19**, **Mantine v8**, **TanStack Router**, **TanStack Query v5**, and **Jotai**.

**Key files:**

- `src/frontend/api.ts` — Eden Treaty client (`treaty<App>(...)`) for type-safe API calls
- `src/frontend/queries.ts` — Per-resource React Query hooks: `useSeriesQuery`, `useCharactersQuery`, `useItemsQuery`, `useLocationsQuery`, `useOutfitsQuery`. Each uses a single-element cache key matching the resource name (e.g. `["items"]`).
- `src/frontend/atoms.ts` — Jotai `activeSectionAtom` (persisted to localStorage). `Section` type: `"series" | "characters" | "items" | "locations" | "outfits"`
- `src/frontend/routes/__root.tsx` — App shell with nav buttons that set `activeSectionAtom`
- `src/frontend/routes/index.tsx` — Switches on `activeSectionAtom` to render the active section component
- `src/frontend/hooks/useJikanCharacters.ts` — Jikan (MyAnimeList) API hooks:
  - `useJikanCharacters(seriesName)` — fetches character names for a series (two chained queries: anime search → character list); normalizes "Last, First" names; used in Add/Edit Character forms for name suggestions
  - `useJikanSeriesImages(seriesName)` — fetches up to 3 anime poster images for a series name
  - `useJikanCharacterImages(characterName)` — fetches up to 3 character images by name
  - All hooks: 400ms debounce, 10-min staleTime; image URLs must be routed through `/api/proxy-image` due to MAL CDN CORS restrictions

**Section components** (`src/frontend/components/<resource>/`):

Each section has:
- `<Resource>Section.tsx` — calls the relevant query hook(s), joins related data in `useMemo`, renders cards via `VirtualCardGrid` or rows via `VirtualTable`
- `<Resource>Card.tsx` — display card using Mantine `Card`, `Badge`, `Title`, etc. with inline edit/delete actions
- `Edit<Resource>Form.tsx` — pre-populated edit modal form (Characters, Items, and Outfits); opened from card and table pencil actions

`SectionShell` (`src/frontend/components/SectionShell.tsx`) is a shared wrapper handling loading, error, sticky header with search + view toggle + Filters panel. Accepts an optional `filterSlot?: React.ReactNode` rendered inside the Filters collapse (used by ItemsSection for its MultiSelect filters).

`VirtualCardGrid` (`src/frontend/components/VirtualCardGrid.tsx`) — `useWindowVirtualizer` with ResizeObserver for responsive column count (1/2/3/4 at 576/768/1200px). ResizeObserver callback is wrapped in `requestAnimationFrame` to prevent loop errors.

`VirtualTable` (`src/frontend/components/VirtualTable.tsx`) — virtualized `<Table>` with sticky header, paddingTop/Bottom spacer rows, fixed column widths via `<colgroup>`, `table-layout: fixed`, and `striped`.

`ImageCropper` (`src/frontend/components/ImageCropper.tsx`) — shared image upload component used by Series, Character, and Outfit cards. Features: Dropzone, URL paste, optional Jikan image suggestions (`jikanSearchName` for series posters, `jikanCharacterName` for character portraits), react-cropper with `viewMode={1}` (crop box stays within image bounds), uploads as JPEG via FormData POST.

**Per-section view preference** is persisted via `sectionViewAtom` (Jotai `atomWithStorage`, key `"sectionView"`) in `src/frontend/atoms.ts` — stores `"card" | "table"` per section.

**Items section filters** — MultiSelect filters for Series, Characters, Type, and Location. Uses inclusive (OR) logic across categories: an item matches if it satisfies any active filter. Search applies independently on top.

**UPDATE service pattern** — MySQL `affectedRows=0` when an UPDATE changes no values (same data), causing false 404s. Always check existence with `SELECT id` first, then unconditionally run UPDATE. Applied to characters, items, and outfits services.

**Outfits** — `OutfitItemsDrawer` shows items table (name + location) when an outfit is clicked; integrated into `CharacterOutfitsDrawer` and `SeriesSection` via `Drawer.Stack`. `EditOutfitForm` includes suggested items based on selected character + outfit name match. Characters are grouped by series in the character Select.

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
