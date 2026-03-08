import { Badge, Button, Group, MultiSelect, Select, Stack, Text, TextInput } from "@mantine/core"
import { useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { api } from "@/frontend/api"
import { useCharactersQuery, useItemsQuery, useSeriesQuery } from "@/frontend/queries"

export function AddOutfitForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const { data: characters } = useCharactersQuery()
  const { data: items } = useItemsQuery()
  const { data: series } = useSeriesQuery()

  const [name, setName] = useState("")
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [itemIds, setItemIds] = useState<string[]>([])

  const seriesMap = Object.fromEntries((series ?? []).map((s) => [s.id, s.name]))

  const grouped = (characters ?? []).reduce<Record<string, { value: string; label: string }[]>>(
    (acc, c) => {
      const group = c.series_id ? (seriesMap[c.series_id] ?? "No Series") : "No Series"
      if (!acc[group]) acc[group] = []
      acc[group].push({ value: String(c.id), label: c.name })
      return acc
    },
    {},
  )

  const characterOptions = Object.entries(grouped)
    .sort(([a], [b]) => (a === "No Series" ? 1 : b === "No Series" ? -1 : a.localeCompare(b)))
    .map(([group, items]) => ({ group, items }))

  const itemOptions = (items ?? []).map((i) => ({
    value: String(i.id),
    label: i.name,
  }))

  const suggestedItems = useMemo(() => {
    if (!characterId) return []
    const query = name.toLowerCase().trim()
    return (items ?? [])
      .filter(
        (i) =>
          String(i.character_id) === characterId &&
          !itemIds.includes(String(i.id)) &&
          (query.length === 0 || i.name.toLowerCase().includes(query)),
      )
      .slice(0, 10)
  }, [items, characterId, itemIds, name])

  async function handleSubmit() {
    if (!name.trim()) return
    await api.outfits.post({
      name: name.trim(),
      character_id: characterId ? Number(characterId) : null,
      item_ids: itemIds.map(Number),
    })
    await queryClient.invalidateQueries({ queryKey: ["outfits"] })
    onSuccess()
  }

  return (
    <Stack>
      <TextInput
        label="Name"
        placeholder="Outfit name"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        autoFocus
        required
      />
      <Select
        label="Character"
        placeholder="Select character"
        data={characterOptions}
        value={characterId}
        onChange={setCharacterId}
        clearable
        searchable
      />
      {suggestedItems.length > 0 && (
        <Stack gap={4}>
          <Text size="xs" c="dimmed" fw={500}>
            Suggested items for this character
          </Text>
          <Group gap="xs">
            {suggestedItems.map((item) => (
              <Badge
                key={item.id}
                variant="outline"
                style={{ cursor: "pointer" }}
                onClick={() => setItemIds((prev) => [...prev, String(item.id)])}
              >
                + {item.name}
              </Badge>
            ))}
          </Group>
        </Stack>
      )}
      <MultiSelect
        label="Items"
        placeholder="Select items"
        data={itemOptions}
        value={itemIds}
        onChange={setItemIds}
        searchable
      />
      <Button onClick={handleSubmit} disabled={!name.trim()}>
        Add Outfit
      </Button>
    </Stack>
  )
}
