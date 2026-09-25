import {
  Accordion,
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
} from "@mantine/core"
import { useQueryClient } from "@tanstack/react-query"
import { type ReactNode, useCallback, useEffect, useState } from "react"
import type { AddChoice, ApplyBody } from "@/backend/docsync/model"
import type { SyncPlan } from "@/backend/docsync/plan"
import type { ApplyResult } from "@/backend/docsync/service"
import type { ItemType } from "@/backend/items/model"
import { AppModal } from "@/frontend/components/AppModal"
import { useCharactersQuery, useSeriesQuery } from "@/frontend/queries"

const ITEM_TYPES: ItemType[] = [
  "Clothes",
  "Wig",
  "Shoes",
  "Accessories",
  "Prop",
  "Materials",
]

type AddEdit = AddChoice & { on: boolean }

// Select values: `id:3` is an existing row, `new:Name` is created on apply.
const toValue = (id: number | null, name: string | null) =>
  id !== null ? `id:${id}` : name ? `new:${name}` : null
const fromValue = (v: string | null) =>
  v?.startsWith("id:")
    ? { id: Number(v.slice(3)), name: null }
    : { id: null, name: v?.slice(4) || null }

const toggled = (set: Set<number>, id: number) => {
  const next = new Set(set)
  next.has(id) ? next.delete(id) : next.add(id)
  return next
}

// Preview what the Bin List doc would change, then apply exactly that plan.
// The server refuses (409) if the doc or the data moved in between.
export function DocSyncModal({
  opened,
  onClose,
}: {
  opened: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [plan, setPlan] = useState<SyncPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApplyResult | null>(null)
  // Moves and renames are keyed by item id; unchecked ones are skipped.
  const [offMoves, setOffMoves] = useState<Set<number>>(new Set())
  const [offRenames, setOffRenames] = useState<Set<number>>(new Set())
  const [adds, setAdds] = useState<AddEdit[]>([])
  const { data: allSeries } = useSeriesQuery()
  const { data: allCharacters } = useCharactersQuery()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPlan(null)
    try {
      const res = await fetch("/api/docsync")
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      const p = body as SyncPlan
      setPlan(p)
      setOffMoves(new Set())
      setOffRenames(new Set())
      setAdds(
        p.adds.map((a, i) => ({
          i,
          on: true,
          type: a.type,
          seriesId: a.seriesId,
          series: a.seriesId === null ? a.series : null,
          characterId: a.characterId,
          character: null,
        })),
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (opened) load()
  }, [opened, load])

  function close() {
    if (applying) return
    setPlan(null)
    setError(null)
    setResult(null)
    onClose()
  }

  async function handleApply() {
    if (!plan) return
    setApplying(true)
    setError(null)
    try {
      const res = await fetch("/api/docsync/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hash: plan.hash,
          moves: plan.moves
            .map((m) => m.itemId)
            .filter((id) => !offMoves.has(id)),
          renames: plan.renames
            .map((r) => r.itemId)
            .filter((id) => !offRenames.has(id)),
          adds: adds.filter((a) => a.on).map(({ on, ...a }) => a),
        } satisfies ApplyBody),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      setResult(body)
      await queryClient.invalidateQueries()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setApplying(false)
    }
  }

  const changes = plan
    ? plan.moves.length + plan.renames.length + plan.adds.length
    : 0
  const picked = plan
    ? plan.moves.length -
      offMoves.size +
      plan.renames.length -
      offRenames.size +
      adds.filter((a) => a.on).length
    : 0
  const editAdd = (i: number, patch: Partial<AddEdit>) =>
    setAdds((prev) => prev.map((a) => (a.i === i ? { ...a, ...patch } : a)))

  const seriesOptions = [
    ...(allSeries ?? []).map((s) => ({ value: `id:${s.id}`, label: s.name })),
    ...(plan?.newSeries ?? []).map((n) => ({
      value: `new:${n}`,
      label: `${n} (new)`,
    })),
  ]
  function characterOptions(a: AddEdit) {
    return (allCharacters ?? [])
      .filter((c) =>
        a.seriesId === null ? a.series === null : c.series_id === a.seriesId,
      )
      .map((c) => ({ value: `id:${c.id}`, label: c.name }))
  }
  function setSeries(a: AddEdit, v: string | null) {
    const { id, name } = fromValue(v)
    const char = (allCharacters ?? []).find((c) => c.id === a.characterId)
    editAdd(a.i, {
      seriesId: id,
      series: name,
      // An existing character stays only if it belongs to the new series.
      ...(char && (id === null || char.series_id !== id)
        ? { characterId: null }
        : {}),
    })
  }
  function setCharacter(a: AddEdit, v: string | null) {
    const { id, name } = fromValue(v)
    const char = (allCharacters ?? []).find((c) => c.id === id)
    editAdd(a.i, {
      characterId: id,
      character: name,
      // Picking a character with no series set takes the character's series.
      ...(char?.series_id && a.seriesId === null && a.series === null
        ? { seriesId: char.series_id }
        : {}),
    })
  }

  return (
    <AppModal
      opened={opened}
      onClose={close}
      title="Sync from Bin List"
      size={1100}
      centered
    >
      {result ? (
        <Stack>
          <Alert color="green" title="Synced">
            {result.moved} moved, {result.renamed} renamed, {result.added} added
            ({result.newLocations} new locations, {result.newSeries} new series,{" "}
            {result.newCharacters} new characters), {result.skipped} skipped.
            The data from before is saved on the server as{" "}
            <code>{result.backup}</code>.
          </Alert>
          <Group justify="flex-end">
            <Button onClick={close}>Done</Button>
          </Group>
        </Stack>
      ) : (
        <Stack>
          {loading && (
            <Group>
              <Loader size="sm" />
              <Text size="sm">Reading the doc…</Text>
            </Group>
          )}
          {error && (
            <Alert color="red" title="Sync failed">
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {error}
              </Text>
            </Alert>
          )}
          {plan && (
            <>
              <Text size="sm" c="dimmed">
                {plan.entries} lines in the doc. Items that are only in the app
                are listed, never deleted.
              </Text>
              <Accordion multiple variant="separated">
                <Section
                  value="moves"
                  label="Move"
                  count={plan.moves.length}
                  selected={plan.moves.map((m) => !offMoves.has(m.itemId))}
                  onToggle={(i) =>
                    setOffMoves((s) => toggled(s, plan.moves[i]!.itemId))
                  }
                  onToggleAll={(on) =>
                    setOffMoves(
                      new Set(on ? [] : plan.moves.map((m) => m.itemId)),
                    )
                  }
                  head={["Item", "From", "To"]}
                  rows={plan.moves.map((m) => [
                    m.name,
                    m.from ?? "—",
                    <NewTag
                      key="to"
                      text={m.to}
                      isNew={m.locationId === null}
                    />,
                  ])}
                />
                <Section
                  value="renames"
                  label="Rename"
                  count={plan.renames.length}
                  selected={plan.renames.map((r) => !offRenames.has(r.itemId))}
                  onToggle={(i) =>
                    setOffRenames((s) => toggled(s, plan.renames[i]!.itemId))
                  }
                  onToggleAll={(on) =>
                    setOffRenames(
                      new Set(on ? [] : plan.renames.map((r) => r.itemId)),
                    )
                  }
                  head={["In the app", "In the doc"]}
                  rows={plan.renames.map((r) => [r.from, r.to])}
                />
                <Section
                  value="adds"
                  label="Add"
                  count={plan.adds.length}
                  selected={adds.map((a) => a.on)}
                  onToggle={(i) => editAdd(i, { on: !adds[i]!.on })}
                  onToggleAll={(on) =>
                    setAdds((prev) => prev.map((a) => ({ ...a, on })))
                  }
                  head={["Item", "Series", "Character", "Type", "Location"]}
                  rows={adds.map((a) => {
                    const doc = plan.adds[a.i]!
                    return [
                      doc.name,
                      <PickOrCreate
                        key="s"
                        placeholder="No series"
                        data={seriesOptions}
                        value={toValue(a.seriesId, a.series)}
                        onChange={(v) => setSeries(a, v)}
                      />,
                      <PickOrCreate
                        key="c"
                        placeholder="No character"
                        data={characterOptions(a)}
                        value={toValue(a.characterId, a.character)}
                        onChange={(v) => setCharacter(a, v)}
                      />,
                      <Select
                        key="t"
                        size="xs"
                        data={ITEM_TYPES}
                        value={a.type}
                        onChange={(v) =>
                          v && editAdd(a.i, { type: v as ItemType })
                        }
                        allowDeselect={false}
                      />,
                      <NewTag
                        key="l"
                        text={doc.location}
                        isNew={doc.locationId === null}
                      />,
                    ]
                  })}
                />
                <Section
                  value="notInDoc"
                  label="Only in the app (left alone)"
                  count={plan.notInDoc.length}
                  head={["Item", "Location"]}
                  rows={plan.notInDoc.map((n) => [n.name, n.location ?? "—"])}
                />
              </Accordion>
            </>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close} disabled={applying}>
              Cancel
            </Button>
            {error && !loading && (
              <Button variant="light" onClick={load} disabled={applying}>
                Preview again
              </Button>
            )}
            <Button
              onClick={handleApply}
              disabled={!plan || picked === 0}
              loading={applying}
            >
              {plan && changes === 0
                ? "Already in sync"
                : `Apply ${picked} of ${changes}`}
            </Button>
          </Group>
        </Stack>
      )}
    </AppModal>
  )
}

function NewTag({ text, isNew }: { text: string; isNew: boolean }) {
  return (
    <Group gap={4} wrap="nowrap">
      <span>{text}</span>
      {isNew && (
        <Badge size="xs" variant="light">
          new
        </Badge>
      )}
    </Group>
  )
}

function Section({
  value,
  label,
  count,
  head,
  rows,
  selected,
  onToggle,
  onToggleAll,
}: {
  value: string
  label: string
  count: number
  head: string[]
  rows: ReactNode[][]
  /** With these, each row gets a checkbox and the header a select-all. */
  selected?: boolean[]
  onToggle?: (i: number) => void
  onToggleAll?: (on: boolean) => void
}) {
  const on = selected?.filter(Boolean).length ?? count
  return (
    <Accordion.Item value={value}>
      <Accordion.Control disabled={count === 0}>
        <Group gap="xs">
          <Text fw={500}>{label}</Text>
          <Badge variant="light" color={on ? "indigo" : "gray"}>
            {selected && on !== count ? `${on} of ${count}` : count}
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Table striped fz="sm">
          <Table.Thead>
            <Table.Tr>
              {selected && (
                <Table.Th w={32}>
                  <Checkbox
                    aria-label={`All ${label}`}
                    checked={on === count}
                    indeterminate={on > 0 && on < count}
                    onChange={() => onToggleAll?.(on < count)}
                  />
                </Table.Th>
              )}
              {head.map((h) => (
                <Table.Th key={h}>{h}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((cells, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are static per plan
              <Table.Tr key={i} opacity={selected?.[i] === false ? 0.5 : 1}>
                {selected && (
                  <Table.Td>
                    <Checkbox
                      aria-label="Apply this row"
                      checked={selected[i]}
                      onChange={() => onToggle?.(i)}
                    />
                  </Table.Td>
                )}
                {cells.map((c, j) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed columns
                  <Table.Td key={j}>{c}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Accordion.Panel>
    </Accordion.Item>
  )
}

// Searchable select over `id:`/`new:` values; typing a name that is not an
// option offers to create it on apply.
function PickOrCreate({
  data,
  value,
  onChange,
  placeholder,
}: {
  data: { value: string; label: string }[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder: string
}) {
  const [search, setSearch] = useState("")
  const typed = search.trim()
  const options = new Map(data.map((o) => [o.value, o]))
  if (value?.startsWith("new:") && !options.has(value)) {
    options.set(value, { value, label: `${value.slice(4)} (new)` })
  }
  const exists = [...options.values()].some(
    (o) => o.label.toLowerCase() === typed.toLowerCase(),
  )
  if (typed && !exists) {
    options.set(`new:${typed}`, {
      value: `new:${typed}`,
      label: `Create "${typed}"`,
    })
  }
  return (
    <Select
      size="xs"
      placeholder={placeholder}
      data={[...options.values()]}
      value={value}
      onChange={(v) => {
        onChange(v)
        if (v?.startsWith("new:")) setSearch(`${v.slice(4)} (new)`)
      }}
      searchValue={search}
      onSearchChange={setSearch}
      searchable
      clearable
    />
  )
}
