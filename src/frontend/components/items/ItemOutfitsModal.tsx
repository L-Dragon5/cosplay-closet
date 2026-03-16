import { ActionIcon, Stack, Table, Text } from "@mantine/core"
import { IconUnlink } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { api } from "@/frontend/api"
import { useCharactersQuery, useOutfitsQuery, useSeriesQuery } from "@/frontend/queries"

export function ItemOutfitsModal({
  itemId,
  itemName,
}: {
  itemId: number
  itemName: string
}) {
  const queryClient = useQueryClient()
  const { data: outfits } = useOutfitsQuery()
  const { data: characters } = useCharactersQuery()
  const { data: series } = useSeriesQuery()

  const characterMap = useMemo(
    () => Object.fromEntries((characters ?? []).map((c) => [c.id, c])),
    [characters],
  )
  const seriesMap = useMemo(
    () => Object.fromEntries((series ?? []).map((s) => [s.id, s.name])),
    [series],
  )

  const assignedOutfits = useMemo(
    () => (outfits ?? []).filter((o) => o.items.some((i) => i.id === itemId)),
    [outfits, itemId],
  )

  async function handleUnassign(outfitId: number) {
    const outfit = (outfits ?? []).find((o) => o.id === outfitId)
    if (!outfit) return
    await api.outfits({ id: outfit.id }).put({
      name: outfit.name,
      character_id: outfit.character_id,
      item_ids: outfit.items.filter((i) => i.id !== itemId).map((i) => i.id),
    })
    await queryClient.invalidateQueries({ queryKey: ["outfits"] })
  }

  if (assignedOutfits.length === 0) {
    return <Text c="dimmed">Not assigned to any outfit version.</Text>
  }

  return (
    <Stack gap="xs">
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Outfit Version</Table.Th>
            <Table.Th>Character</Table.Th>
            <Table.Th style={{ width: 48 }} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {assignedOutfits.map((o) => {
            const char = o.character_id ? characterMap[o.character_id] : null
            const seriesName = char?.series_id ? (seriesMap[char.series_id] ?? null) : null
            const charLabel = char
              ? (seriesName ? `${seriesName} - ${char.name}` : char.name)
              : "—"
            return (
              <Table.Tr key={o.id}>
                <Table.Td>{o.name}</Table.Td>
                <Table.Td>{charLabel}</Table.Td>
                <Table.Td>
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => handleUnassign(o.id)}
                    aria-label="Unassign"
                  >
                    <IconUnlink size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}
