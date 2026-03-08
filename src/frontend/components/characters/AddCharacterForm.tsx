import { Button, Select, Stack, TextInput } from "@mantine/core"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { api } from "@/frontend/api"
import { useSeriesQuery } from "@/frontend/queries"

export function AddCharacterForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const { data: series } = useSeriesQuery()
  const [name, setName] = useState("")
  const [seriesId, setSeriesId] = useState<string | null>(null)

  const seriesOptions = (series ?? []).map((s) => ({
    value: String(s.id),
    label: s.name,
  }))

  async function handleSubmit() {
    if (!name.trim()) return
    await api.characters.post({
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
        Add Character
      </Button>
    </Stack>
  )
}
