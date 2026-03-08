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

const CREATE_SERIES = "__create_series__"
const CREATE_CHARACTER = "__create_character__"

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
  const [seriesSearch, setSeriesSearch] = useState("")
  const [characterSearch, setCharacterSearch] = useState("")

  const exactSeriesMatch = (series ?? []).some(
    (s) => s.name.toLowerCase() === seriesSearch.toLowerCase(),
  )
  const seriesOptions = [
    ...(series ?? []).map((s) => ({ value: String(s.id), label: s.name })),
    ...(!exactSeriesMatch && seriesSearch.trim()
      ? [{ value: CREATE_SERIES, label: `Create "${seriesSearch.trim()}"` }]
      : []),
  ]

  const filteredCharacters = (characters ?? []).filter(
    (c) => !seriesId || String(c.series_id) === seriesId,
  )
  const exactCharacterMatch = filteredCharacters.some(
    (c) => c.name.toLowerCase() === characterSearch.toLowerCase(),
  )
  const characterOptions = [
    ...filteredCharacters.map((c) => ({ value: String(c.id), label: c.name })),
    ...(!exactCharacterMatch && characterSearch.trim()
      ? [{ value: CREATE_CHARACTER, label: `Create "${characterSearch.trim()}"` }]
      : []),
  ]

  const locationOptions = (locations ?? []).map((l) => ({
    value: String(l.id),
    label: l.name,
  }))

  async function handleSeriesChange(val: string | null) {
    if (val === CREATE_SERIES) {
      const { data: created } = await api.series.post({ name: seriesSearch.trim() })
      if (created) {
        await queryClient.invalidateQueries({ queryKey: ["series"] })
        setSeriesId(String(created.id))
        setSeriesSearch("")
        setCharacterId(null)
      }
      return
    }
    setSeriesId(val)
    setCharacterId(null)
  }

  async function handleCharacterChange(val: string | null) {
    if (val === CREATE_CHARACTER) {
      const { data: created } = await api.characters.post({
        name: characterSearch.trim(),
        series_id: seriesId ? Number(seriesId) : null,
      })
      if (created) {
        await queryClient.invalidateQueries({ queryKey: ["characters"] })
        setCharacterId(String(created.id))
        setCharacterSearch("")
        if (created.series_id && !seriesId) {
          setSeriesId(String(created.series_id))
        }
      }
      return
    }
    if (val) {
      const char = (characters ?? []).find((c) => String(c.id) === val)
      if (char?.series_id) setSeriesId(String(char.series_id))
    }
    setCharacterId(val)
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
        placeholder="Select or create series"
        data={seriesOptions}
        value={seriesId}
        onChange={handleSeriesChange}
        searchValue={seriesSearch}
        onSearchChange={setSeriesSearch}
        clearable
        searchable
      />
      <Select
        label="Character"
        placeholder="Select or create character"
        data={characterOptions}
        value={characterId}
        onChange={handleCharacterChange}
        searchValue={characterSearch}
        onSearchChange={setCharacterSearch}
        clearable
        searchable
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
