import {
  Badge,
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core"
import { useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { api } from "@/frontend/api"
import { useJikanCharacters } from "@/frontend/hooks/useJikanCharacters"
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

  const selectedSeriesName = useMemo(
    () =>
      seriesId
        ? ((series ?? []).find((s) => String(s.id) === seriesId)?.name ?? null)
        : null,
    [series, seriesId],
  )
  const { names: jikanNames, isLoading: jikanLoading } =
    useJikanCharacters(selectedSeriesName)
  const suggestedNames = useMemo(() => {
    if (!selectedSeriesName || jikanNames.length === 0) return []
    const query = name.toLowerCase().trim()
    return jikanNames
      .filter((n) => query.length === 0 || n.toLowerCase().includes(query))
      .slice(0, 10)
  }, [jikanNames, selectedSeriesName, name])

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
      {suggestedNames.length > 0 && (
        <Stack gap={4}>
          <Text size="xs" c="dimmed" fw={500}>
            Characters from {selectedSeriesName} on MyAnimeList
          </Text>
          <Group gap="xs">
            {suggestedNames.map((charName) => (
              <Badge
                key={charName}
                variant="outline"
                style={{ cursor: "pointer" }}
                onClick={() => setName(charName)}
              >
                {charName}
              </Badge>
            ))}
          </Group>
        </Stack>
      )}
      {jikanLoading && suggestedNames.length === 0 && selectedSeriesName && (
        <Text size="xs" c="dimmed">
          Loading suggestions…
        </Text>
      )}
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
