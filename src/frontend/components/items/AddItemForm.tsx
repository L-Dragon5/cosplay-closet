import { Button, Select, Stack, Textarea, TextInput } from "@mantine/core"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { api } from "@/frontend/api"
import {
  useCharactersQuery,
  useLocationsQuery,
  useSeriesQuery,
} from "@/frontend/queries"

const ITEM_TYPES = [
  "Clothes",
  "Wig",
  "Shoes",
  "Accessories",
  "Prop",
  "Materials",
]

export function AddItemForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const { data: series } = useSeriesQuery()
  const { data: characters } = useCharactersQuery()
  const { data: locations } = useLocationsQuery()

  const [name, setName] = useState("")
  const [type, setType] = useState<string | null>(null)
  const [seriesId, setSeriesId] = useState<string | null>(null)
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [notes, setNotes] = useState("")

  const seriesOptions = (series ?? []).map((s) => ({
    value: String(s.id),
    label: s.name,
  }))

  const characterOptions = (characters ?? [])
    .filter((c) => !seriesId || String(c.series_id) === seriesId)
    .map((c) => ({ value: String(c.id), label: c.name }))

  const locationOptions = (locations ?? []).map((l) => ({
    value: String(l.id),
    label: l.name,
  }))

  function handleSeriesChange(val: string | null) {
    setSeriesId(val)
    setCharacterId(null)
  }

  async function handleSubmit() {
    if (!name.trim() || !type) return
    await api.items.post({
      name: name.trim(),
      type: type as any,
      series_id: seriesId ? Number(seriesId) : null,
      character_id: characterId ? Number(characterId) : null,
      location_id: locationId ? Number(locationId) : null,
      notes: notes.trim() || null,
    })
    await queryClient.invalidateQueries({ queryKey: ["items"] })
    onSuccess()
  }

  return (
    <Stack>
      <TextInput
        label="Name"
        placeholder="Item name"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        autoFocus
        required
      />
      <Select
        label="Type"
        placeholder="Select type"
        data={ITEM_TYPES}
        value={type}
        onChange={setType}
        required
      />
      <Select
        label="Series"
        placeholder="Select series"
        data={seriesOptions}
        value={seriesId}
        onChange={handleSeriesChange}
        clearable
        searchable
      />
      <Select
        label="Character"
        placeholder="Select character"
        data={characterOptions}
        value={characterId}
        onChange={setCharacterId}
        clearable
        searchable
        disabled={characterOptions.length === 0}
      />
      <Select
        label="Location"
        placeholder="Select location"
        data={locationOptions}
        value={locationId}
        onChange={setLocationId}
        clearable
        searchable
      />
      <Textarea
        label="Notes"
        placeholder="Optional notes"
        value={notes}
        onChange={(e) => setNotes(e.currentTarget.value)}
        rows={3}
      />
      <Button onClick={handleSubmit} disabled={!name.trim() || !type}>
        Add Item
      </Button>
    </Stack>
  )
}
