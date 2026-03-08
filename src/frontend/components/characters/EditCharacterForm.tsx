import { Button, Select, Stack, TextInput } from "@mantine/core"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { api } from "@/frontend/api"
import type { Character } from "@/frontend/queries"
import { useSeriesQuery } from "@/frontend/queries"

export function EditCharacterForm({
  character,
  onSuccess,
}: {
  character: Character
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const { data: series } = useSeriesQuery()
  const [name, setName] = useState(character.name)
  const [seriesId, setSeriesId] = useState<string | null>(
    character.series_id ? String(character.series_id) : null,
  )

  const seriesOptions = (series ?? []).map((s) => ({
    value: String(s.id),
    label: s.name,
  }))

  async function handleSubmit() {
    if (!name.trim()) return
    await api.characters({ id: character.id }).put({
      name: name.trim(),
      series_id: seriesId ? Number(seriesId) : null,
    })
    await queryClient.invalidateQueries({ queryKey: ["characters"] })
    onSuccess()
  }

  return (
    <Stack>
      <TextInput
        label="Name"
        placeholder="Character name"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit()
        }}
        autoFocus
        required
      />
      <Select
        label="Series"
        placeholder="Select series"
        data={seriesOptions}
        value={seriesId}
        onChange={setSeriesId}
        clearable
        searchable
      />
      <Button onClick={handleSubmit} disabled={!name.trim()}>
        Save
      </Button>
    </Stack>
  )
}
