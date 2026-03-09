import { Button, Select, Stack } from "@mantine/core"
import { useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { api } from "@/frontend/api"
import { useCharactersQuery, useOutfitsQuery } from "@/frontend/queries"

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

  const [outfitId, setOutfitId] = useState<string | null>(null)

  const characterMap = useMemo(
    () => Object.fromEntries((characters ?? []).map((c) => [c.id, c.name])),
    [characters],
  )

  const outfitOptions = useMemo(() => {
    const grouped: Record<string, { value: string; label: string }[]> = {}
    for (const o of outfits ?? []) {
      const group = o.character_id ? (characterMap[o.character_id] ?? "No Character") : "No Character"
      if (!grouped[group]) grouped[group] = []
      grouped[group].push({ value: String(o.id), label: o.name })
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => (a === "No Character" ? 1 : b === "No Character" ? -1 : a.localeCompare(b)))
      .map(([group, items]) => ({ group, items }))
  }, [outfits, characterMap])

  async function handleSubmit() {
    if (!outfitId) return
    const outfit = (outfits ?? []).find((o) => o.id === Number(outfitId))
    if (!outfit) return
    const existingIds = outfit.items.map((i) => i.id)
    if (existingIds.includes(itemId)) {
      onSuccess()
      return
    }
    await api.outfits({ id: outfit.id }).put({
      name: outfit.name,
      character_id: outfit.character_id,
      item_ids: [...existingIds, itemId],
    })
    await queryClient.invalidateQueries({ queryKey: ["outfits"] })
    onSuccess()
  }

  return (
    <Stack>
      <Select
        label="Outfit Version"
        placeholder="Select outfit version"
        data={outfitOptions}
        value={outfitId}
        onChange={setOutfitId}
        searchable
      />
      <Button onClick={handleSubmit} disabled={!outfitId}>
        Add to Outfit Version
      </Button>
    </Stack>
  )
}
