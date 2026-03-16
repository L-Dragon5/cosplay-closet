import { Button, MultiSelect, Stack } from "@mantine/core"
import { useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { api } from "@/frontend/api"
import {
  useCharactersQuery,
  useOutfitsQuery,
  useSeriesQuery,
} from "@/frontend/queries"

export function AddItemToOutfitForm({
  itemId,
  onSuccess,
}: {
  itemId: number
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const { data: outfits } = useOutfitsQuery()
  const { data: characters } = useCharactersQuery()
  const { data: series } = useSeriesQuery()

  const [outfitIds, setOutfitIds] = useState<string[]>([])

  const characterMap = useMemo(
    () =>
      Object.fromEntries(
        (characters ?? []).map((c) => [
          c.id,
          { name: c.name, series_id: c.series_id },
        ]),
      ),
    [characters],
  )

  const seriesMap = useMemo(
    () => Object.fromEntries((series ?? []).map((s) => [s.id, s.name])),
    [series],
  )

  const outfitOptions = useMemo(() => {
    const grouped: Record<string, { value: string; label: string }[]> = {}
    for (const o of outfits ?? []) {
      const char = o.character_id ? characterMap[o.character_id] : null
      const seriesName = char?.series_id
        ? (seriesMap[char.series_id] ?? null)
        : null
      const group = char
        ? seriesName
          ? `${seriesName} - ${char.name}`
          : char.name
        : "No Character"
      if (!grouped[group]) grouped[group] = []
      grouped[group].push({ value: String(o.id), label: o.name })
    }
    return Object.entries(grouped)
      .sort(([a], [b]) =>
        a === "No Character"
          ? 1
          : b === "No Character"
            ? -1
            : a.localeCompare(b),
      )
      .map(([group, items]) => ({ group, items }))
  }, [outfits, characterMap, seriesMap])

  async function handleSubmit() {
    if (!outfitIds.length) return
    await Promise.all(
      outfitIds.map(async (id) => {
        const outfit = (outfits ?? []).find((o) => o.id === Number(id))
        if (!outfit) return
        const existingIds = outfit.items.map((i) => i.id)
        if (existingIds.includes(itemId)) return
        await api.outfits({ id: outfit.id }).put({
          name: outfit.name,
          character_id: outfit.character_id,
          item_ids: [...existingIds, itemId],
        })
      }),
    )
    await queryClient.invalidateQueries({ queryKey: ["outfits"] })
    onSuccess()
  }

  return (
    <Stack>
      <MultiSelect
        label="Outfit Version"
        placeholder="Select outfit version(s)"
        data={outfitOptions}
        value={outfitIds}
        onChange={setOutfitIds}
        searchable
        clearable
      />
      <Button onClick={handleSubmit} disabled={!outfitIds.length}>
        Add to Outfit Version{outfitIds.length > 1 ? "s" : ""}
      </Button>
    </Stack>
  )
}
